from app.modules import registry 
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.modules.ai.dependencies import init_ai_services
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging

from app.core.monitoring import setup_monitoring
from datetime import datetime, timezone
from app.modules.ai.dependencies import init_ai_services


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    
    logger.info("Starting OmniCare application")
    await init_ai_services()   
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    
 

    
    logger.info("Background tasks started")
    
    yield
    
    # Cleanup
    logger.info("Shutting down OmniCare application")

    await close_db()
    logger.info("Shutdown complete")




# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Setup monitoring
# Create FastAPI application
app = FastAPI(
    title="OmniCare API",
    description="Elderly Care Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.is_development else None,
    redoc_url="/api/redoc" if settings.is_development else None
)



app.add_middleware(GZipMiddleware, minimum_size=1000)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup monitoring
if settings.prometheus_enabled:
    setup_monitoring(app)
    logger.info("Monitoring enabled")







# Mount Prometheus metrics
if settings.prometheus_enabled:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

# Include routers
from app.modules.auth.router import router as auth_router
from app.modules.clients.router import router as clients_router
from app.modules.caregivers.router import router as caregivers_router
from app.modules.family.router import router as family_router
from app.modules.scheduling.router import scheduling_router
from app.modules.scheduling.router import list_sessions
from app.modules.scheduling.schemas import SessionResponse
from app.modules.assessments.router import router as assessments_router
from app.modules.medications.router import router as medications_router
from app.modules.tasks.router import router as tasks_router
from app.modules.tasks.router import completions_router
from fastapi import Depends
from app.core.deps import require_role, require_roles
from app.modules.ai.router import router as ai_router
'''
from app.modules.notifications.router import router as notifications_router
from app.modules.reports.router import router as reports_router
from app.modules.audit.router import router as audit_router
'''
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])

app.include_router(
    clients_router, 
    prefix="/api/clients", 
    dependencies=[Depends(require_roles(["caregiver", "admin"]))],
    tags=["Clients"]
)

app.include_router(
   caregivers_router, 
   prefix="/api/caregivers", 
   tags=["Caregivers"]
)

app.include_router(
    family_router, 
    prefix="/api/family", 
    dependencies=[Depends(require_roles(["family", "admin"]))],
    tags=["Family"]
)

app.include_router(
    scheduling_router, 
    prefix="/api/scheduling", 
    dependencies=[Depends(require_roles(["caregiver", "admin"]))],
    tags=["Scheduling"]
)

app.include_router(
    assessments_router, 
    prefix="/api/assessments", 
    dependencies=[Depends(require_roles(["caregiver", "admin"]))],
    tags=["Assessments"]
)

app.include_router(
    medications_router,
      prefix="/api/medications", 
      dependencies=[Depends(require_roles(["caregiver", "admin"]))],
      tags=["Medications"]
      )

# Emergency router is not implemented yet (modules/emergency/router.py is empty).
# app.include_router(
#     emergency_router,
#     dependencies=[Depends(require_roles(["caregiver", "family", "admin"]))],
#     prefix="/api/emergency", tags=["Emergency"]
# )

# Completions first: otherwise /api/tasks/{task_id} would capture /api/tasks/completions
app.include_router(
    completions_router,
    prefix="/api/tasks/completions",
    dependencies=[Depends(require_roles(["caregiver", "admin"]))],
    tags=["Task Completions"]
)

app.include_router(
    tasks_router,
    prefix="/api/tasks",
    dependencies=[Depends(require_roles(["caregiver", "admin"]))],
    tags=["Tasks"]
)

# ai_router already carries prefix="/ai"; per-client authorization is done by get_current_client.
app.include_router(ai_router, prefix="/api", tags=["AI"])
# app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
# app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
# app.include_router(audit_router, prefix="/api/audit", tags=["Audit"])


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
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }