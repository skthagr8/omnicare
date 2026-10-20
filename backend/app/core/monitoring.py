from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from typing import Iterator

from fastapi import FastAPI, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    Info,
    generate_latest,
)
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

logger = logging.getLogger("omnicare.monitoring")

# --------------------------------------------------------------------------
# Tunables
# --------------------------------------------------------------------------
EXCLUDED_PATHS = {"/metrics", "/health", "/healthz", "/docs", "/redoc", "/openapi.json"}
SLOW_REQUEST_SECONDS = 1.0

HTTP_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
DB_BUCKETS = (0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 5.0)
ML_BUCKETS = (0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)

# --------------------------------------------------------------------------
# App info
# --------------------------------------------------------------------------
APP_INFO = Info("omnicare_app", "Static application information")

# --------------------------------------------------------------------------
# HTTP metrics
# --------------------------------------------------------------------------
HTTP_REQUESTS = Counter(
    "omnicare_http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status"],
)
HTTP_DURATION = Histogram(
    "omnicare_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "route"],
    buckets=HTTP_BUCKETS,
)
HTTP_IN_PROGRESS = Gauge(
    "omnicare_http_requests_in_progress",
    "HTTP requests currently being handled",
    ["method"],
)

# --------------------------------------------------------------------------
# Database metrics
# --------------------------------------------------------------------------
DB_QUERY_DURATION = Histogram(
    "omnicare_db_query_duration_seconds",
    "Database query duration by SQL operation",
    ["operation"],
    buckets=DB_BUCKETS,
)
DB_ERRORS = Counter(
    "omnicare_db_errors_total",
    "Database errors by exception type",
    ["error"],
)

# --------------------------------------------------------------------------
# Auth metrics (labels are bounded sets only: never emails or user IDs)
# --------------------------------------------------------------------------
AUTH_LOGINS = Counter(
    "omnicare_auth_logins_total",
    "Login attempts",
    ["result"],  # success | invalid_credentials | disabled
)
AUTH_REGISTRATIONS = Counter(
    "omnicare_auth_registrations_total",
    "Registration attempts",
    ["role", "result"],  # role: caregiver|family, result: success|conflict
)
AUTH_REFRESHES = Counter(
    "omnicare_auth_token_refreshes_total",
    "Token refresh attempts",
    ["result"],  # success | failed
)

# --------------------------------------------------------------------------
# Domain / ML metrics (adapt label values to your enums)
# --------------------------------------------------------------------------
EMERGENCY_ALERTS = Counter(
    "omnicare_emergency_alerts_total",
    "Emergency alerts raised",
    ["severity"],
)
CHECKINS = Counter(
    "omnicare_checkins_total",
    "Caregiver check-in attempts",
    ["result"],  # accepted | outside_geofence
)
ML_INFERENCE_DURATION = Histogram(
    "omnicare_ml_inference_duration_seconds",
    "ML inference latency",
    ["model"],
    buckets=ML_BUCKETS,
)
ML_INFERENCE_ERRORS = Counter(
    "omnicare_ml_inference_errors_total",
    "ML inference failures",
    ["model"],
)
ML_RISK_SCORE = Histogram(
    "omnicare_ml_risk_score",
    "Distribution of predicted risk scores",
    ["model"],
    buckets=(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0),
)


@contextmanager
def track_ml_inference(model: str) -> Iterator[None]:
    """Time an inference call and count failures.

    with track_ml_inference("fall_risk"):
        score = model.predict(features)
    """
    start = time.perf_counter()
    try:
        yield
    except Exception:
        ML_INFERENCE_ERRORS.labels(model).inc()
        raise
    finally:
        ML_INFERENCE_DURATION.labels(model).observe(time.perf_counter() - start)


# --------------------------------------------------------------------------
# HTTP middleware (pure ASGI: safe with background tasks and streaming)
# --------------------------------------------------------------------------
def _route_template(scope: Scope) -> str:
    """Use the matched route template; unmatched paths collapse into one label."""
    route = scope.get("route")
    return getattr(route, "path", None) or "unmatched"


class MetricsMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] in EXCLUDED_PATHS:
            await self.app(scope, receive, send)
            return

        method = scope["method"]
        request_id = uuid.uuid4().hex
        status_code = 500  # stays 500 if an unhandled exception escapes
        start = time.perf_counter()
        HTTP_IN_PROGRESS.labels(method).inc()

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            elapsed = time.perf_counter() - start
            route = _route_template(scope)
            HTTP_IN_PROGRESS.labels(method).dec()
            HTTP_REQUESTS.labels(method, route, str(status_code)).inc()
            HTTP_DURATION.labels(method, route).observe(elapsed)

            if status_code >= 500:
                logger.error(
                    "5xx response request_id=%s method=%s route=%s status=%s duration=%.3fs",
                    request_id, method, route, status_code, elapsed,
                )
            elif elapsed > SLOW_REQUEST_SECONDS:
                logger.warning(
                    "Slow request request_id=%s method=%s route=%s status=%s duration=%.3fs",
                    request_id, method, route, status_code, elapsed,
                )


# --------------------------------------------------------------------------
# SQLAlchemy instrumentation
# --------------------------------------------------------------------------
_SQL_OPERATIONS = {"SELECT", "INSERT", "UPDATE", "DELETE", "WITH", "BEGIN", "COMMIT", "ROLLBACK"}
_QUERY_START_KEY = "_omnicare_query_start"


def _sql_operation(statement: str) -> str:
    stripped = statement.lstrip()
    if not stripped:
        return "OTHER"
    word = stripped.split(None, 1)[0].upper()
    return word if word in _SQL_OPERATIONS else "OTHER"


def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault(_QUERY_START_KEY, []).append(time.perf_counter())


def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    starts = conn.info.get(_QUERY_START_KEY)
    if starts:
        DB_QUERY_DURATION.labels(_sql_operation(statement)).observe(
            time.perf_counter() - starts.pop()
        )


def _handle_error(exception_context):
    conn = exception_context.connection
    if conn is not None:
        starts = conn.info.get(_QUERY_START_KEY)
        if starts:
            starts.pop()
    err = exception_context.original_exception or exception_context.sqlalchemy_exception
    DB_ERRORS.labels(type(err).__name__).inc()


def _instrument_engine(engine: AsyncEngine) -> None:
    sync_engine = engine.sync_engine

    if not event.contains(sync_engine, "before_cursor_execute", _before_cursor_execute):
        event.listen(sync_engine, "before_cursor_execute", _before_cursor_execute)
        event.listen(sync_engine, "after_cursor_execute", _after_cursor_execute)
        event.listen(sync_engine, "handle_error", _handle_error)

    # Pool gauges exist only for pooled engines (NullPool, used in dev, has none)
    pool = sync_engine.pool
    if hasattr(pool, "checkedout") and hasattr(pool, "size"):
        Gauge(
            "omnicare_db_pool_checked_out",
            "Connections currently checked out of the pool",
        ).set_function(lambda: pool.checkedout())
        Gauge(
            "omnicare_db_pool_size",
            "Configured pool size",
        ).set_function(lambda: pool.size())


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------
def setup_monitoring(app: FastAPI) -> None:
    if not settings.prometheus_enabled:
        logger.info("Prometheus monitoring is disabled (PROMETHEUS_ENABLED=false)")
        return

    from app.core.database import engine  # local import avoids import-order surprises

    _instrument_engine(engine)

    APP_INFO.info(
        {
            "environment": settings.environment,
            "model_version": settings.model_version,
        }
    )

    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    logger.info("Prometheus monitoring enabled: scrape /metrics")