# app/core/redis.py
import redis.asyncio as aioredis
from app.core.config import settings

# Initialize the async Redis client using your settings configuration
redis_client = aioredis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)