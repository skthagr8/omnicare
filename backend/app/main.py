from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging
from app.core.monitoring import setup_monitoring
from app.modules.emergency.relay import emergency_relay_loop
from app.ws.redis_listener import redis_listener_task

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    
    logger.info("Starting OmniCare application")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Setup monitoring
    if settings.prometheus_enabled:
        setup_monitoring(app)
        logger.info("Monitoring enabled")
    
    # Start background tasks
    relay_task = asyncio.create_task(emergency_relay_loop())
    ws_task = asyncio.create_task(redis_listener_task())
    
    logger.info("Background tasks started")
    
    yield
    
    # Cleanup
    logger.info("Shutting down OmniCare application")
    
    relay_task.cancel()
    ws_task.cancel()
    
    try:
        await asyncio.gather(relay_task, ws_task)
    except asyncio.CancelledError:
        pass
    
    await close_db()
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="OmniCare API",
    description="Elderly Care Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.is_development else None,
    redoc_url="/api/redoc" if settings.is_development else None
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount Prometheus metrics
if settings.prometheus_enabled:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

# Include routers
from app.modules.auth.router import router as auth_router
from app.modules.clients.router import router as clients_router
from app.modules.caregivers.router import router as caregivers_router
from app.modules.family.router import router as family_router
from app.modules.scheduling.router import router as scheduling_router
from app.modules.assessments.router import router as assessments_router
from app.modules.medications.router import router as medications_router
from app.modules.emergency.router import router as emergency_router
from app.modules.ai.router import router as ai_router
from app.modules.notifications.router import router as notifications_router
from app.modules.reports.router import router as reports_router
from app.modules.audit.router import router as audit_router

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients_router, prefix="/api/clients", tags=["Clients"])
app.include_router(caregivers_router, prefix="/api/caregivers", tags=["Caregivers"])
app.include_router(family_router, prefix="/api/family", tags=["Family"])
app.include_router(scheduling_router, prefix="/api/scheduling", tags=["Scheduling"])
app.include_router(assessments_router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(medications_router, prefix="/api/medications", tags=["Medications"])
app.include_router(emergency_router, prefix="/api/emergency", tags=["Emergency"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(audit_router, prefix="/api/audit", tags=["Audit"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "OmniCare API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }
