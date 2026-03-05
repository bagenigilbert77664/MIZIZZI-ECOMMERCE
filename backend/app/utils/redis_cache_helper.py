"""
Enhanced Redis caching helper for Upstash Redis integration.
Provides functions for caching UI component data with automatic expiration.
"""
import os
import json
import logging
from typing import Any, Optional
import redis
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis cache wrapper with Upstash support."""
    
    def __init__(self):
        self.redis_url = (
            os.environ.get('REDIS_URL') or
            os.environ.get('UPSTASH_REDIS_REST_URL') or
            os.environ.get('KV_REST_API_URL')
        )
        self.connected = False
        self.client = None
        
        if self.redis_url:
            try:
                self.client = redis.from_url(self.redis_url, decode_responses=True)
                self.client.ping()
                self.connected = True
                logger.info("[v0] Redis cache initialized successfully")
            except Exception as e:
                logger.warning(f"[v0] Failed to connect to Redis: {str(e)}")
                self.connected = False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        if not self.connected or not self.client:
            return None
        
        try:
            value = self.client.get(key)
            if value:
                logger.info(f"[v0] Cache HIT: {key}")
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            logger.info(f"[v0] Cache MISS: {key}")
            return None
        except Exception as e:
            logger.warning(f"[v0] Cache get error for {key}: {str(e)}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in Redis cache with TTL in seconds."""
        if not self.connected or not self.client:
            return False
        
        try:
            json_value = json.dumps(value) if not isinstance(value, str) else value
            self.client.setex(key, ttl, json_value)
            logger.info(f"[v0] Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"[v0] Cache set error for {key}: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from Redis cache."""
        if not self.connected or not self.client:
            return False
        
        try:
            self.client.delete(key)
            logger.info(f"[v0] Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.warning(f"[v0] Cache delete error for {key}: {str(e)}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern."""
        if not self.connected or not self.client:
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                count = self.client.delete(*keys)
                logger.info(f"[v0] Cache CLEAR PATTERN: {pattern} ({count} keys deleted)")
                return count
            return 0
        except Exception as e:
            logger.warning(f"[v0] Cache clear pattern error: {str(e)}")
            return 0
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self.connected


# Singleton instance
redis_cache = RedisCache()


def cache_ui_data(cache_key: str, ttl: int = 60):
    """Decorator for caching UI component data."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Try to get from cache
            cached = redis_cache.get(cache_key)
            if cached is not None:
                logger.info(f"[v0] Using cached data for {cache_key}")
                return cached
            
            # Fetch fresh data
            logger.info(f"[v0] Fetching fresh data for {cache_key}")
            result = func(*args, **kwargs)
            
            # Cache the result
            if result is not None:
                redis_cache.set(cache_key, result, ttl=ttl)
            
            return result
        
        return wrapper
    return decorator


def get_carousel_cache_key() -> str:
    """Get cache key for carousel data."""
    return "ui:carousel:data"


def get_categories_cache_key() -> str:
    """Get cache key for categories data."""
    return "ui:categories:data"


def get_topbar_cache_key() -> str:
    """Get cache key for topbar data."""
    return "ui:topbar:data"


def get_side_panels_cache_key() -> str:
    """Get cache key for side panels data."""
    return "ui:side_panels:data"


def invalidate_ui_cache():
    """Invalidate all UI component caches."""
    keys = [
        get_carousel_cache_key(),
        get_categories_cache_key(),
        get_topbar_cache_key(),
        get_side_panels_cache_key(),
    ]
    
    count = 0
    for key in keys:
        if redis_cache.delete(key):
            count += 1
    
    logger.info(f"[v0] Invalidated {count} UI cache keys")
    return count


def get_cache_stats() -> dict:
    """Get Redis cache statistics."""
    return {
        "connected": redis_cache.is_available(),
        "type": "redis" if redis_cache.is_available() else "none",
        "url": redis_cache.redis_url[:30] + "..." if redis_cache.redis_url else None,
    }
