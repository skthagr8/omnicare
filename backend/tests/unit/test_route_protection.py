from fastapi.routing import APIRoute

from app.core.deps import get_current_user
from app.main import app

PUBLIC = {
    "/api/auth/login", "/api/auth/register", "/api/auth/refresh",
    "/metrics", "/health", "/healthz",
}


def _uses_auth(dependant) -> bool:
    return dependant.call is get_current_user or any(
        _uses_auth(d) for d in dependant.dependencies
    )


def test_every_non_public_route_requires_auth():
    unguarded = [
        f"{sorted(r.methods)} {r.path}"
        for r in app.routes
        if isinstance(r, APIRoute) and r.path not in PUBLIC and not _uses_auth(r.dependant)
    ]
    assert not unguarded, f"Routes without authentication: {unguarded}"