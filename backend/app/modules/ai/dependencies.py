# app/modules/ai/dependencies.py
"""
Dependency providers for the AI module.

Loaded exactly once per process (at FastAPI lifespan startup), then served
to every request as a shared singleton. `get_predictor` is the override
hook for tests via `app.dependency_overrides`.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional


from app.modules.ai.service import ModelRegistry, CognitiveDeclinePredictor 
logger = logging.getLogger(__name__)

# The two singletons. Populated by `init_ai_services()` during lifespan startup.
_registry: Optional[ModelRegistry] = None
_predictor: Optional[CognitiveDeclinePredictor] = None
_init_lock = asyncio.Lock()


async def init_ai_services() -> None:
    """
    Called from FastAPI lifespan. Loads the checkpoint + prior once and
    constructs the shared predictor. Idempotent.
    """
    global _registry, _predictor
    async with _init_lock:
        if _registry is not None:
            return
        logger.info("Loading cognitive decline model artifacts...")
        _registry  = await asyncio.to_thread(ModelRegistry.load)  # I/O-bound, don't block loop
        _predictor = CognitiveDeclinePredictor(_registry)
        logger.info("Cognitive decline model ready.")


def get_predictor() -> CognitiveDeclinePredictor:
    """FastAPI dependency. Returns the process-wide predictor."""
    if _predictor is None:
        raise RuntimeError(
            "AI services not initialised. Call init_ai_services() during lifespan startup."
        )
    return _predictor


def get_model_registry() -> ModelRegistry:
    """FastAPI dependency. Returns the shared model registry (rarely needed directly)."""
    if _registry is None:
        raise RuntimeError("AI services not initialised.")
    return _registry


def reset_ai_services() -> None:
    """Test hook — clears the singletons so the next init call reloads."""
    global _registry, _predictor
    _registry  = None
    _predictor = None