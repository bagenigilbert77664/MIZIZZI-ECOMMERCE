"""
Enhanced Redis caching helper for Upstash Redis integration.
Provides functions for caching UI component data with automatic expiration.
Supports both standard Redis and Upstash REST API.
"""
import os
import json
import logging
from typing import Any, Optional
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
        self.rest_token = (
            os.environ.get('UPSTASH_REDIS_REST_TOKEN') or
            os.environ.get('KV_REST_API_TOKEN')
        )
        self.connected = False
        self.client = None
        self.is_rest_api = False
        
        if self.redis_url:
            try:
                # Check if using REST API (has token) or standard Redis
                if self.rest_token and 'upstash.io' in self.redis_url:
                    self._init_rest_client()
                else:
                    self._init_standard_redis()
            except Exception as e:
                logger.warning(f"[v0] Failed to initialize Redis cache: {str(e)}")
                self.connected = False
    
    def _init_standard_redis(self):
        """Initialize standard Redis client."""
        try:
            import redis
            self.client = redis.from_url(self.redis_url, decode_responses=True)
            self.client.ping()
            self.connected = True
            self.is_rest_api = False
            logger.info("[v0] Standard Redis cache initialized successfully")
        except ImportError:
            logger.warning("[v0] redis package not available, switching to REST API")
            self._init_rest_client()
        except Exception as e:
            logger.warning(f"[v0] Failed to connect to standard Redis: {str(e)}")
            self.connected = False
    
    def _init_rest_client(self):
        """Initialize Upstash REST API client."""
        try:
            import requests
            # Test connection to Upstash REST API
            headers = {
                'Authorization': f'Bearer {self.rest_token}',
                'Content-Type': 'application/json'
            }
            response = requests.post(
                f"{self.redis_url}/ping",
                headers=headers,
                timeout=5
            )
            if response.status_code == 200:
                self.client = requests
                self.connected = True
                self.is_rest_api = True
                logger.info("[v0] Upstash REST API cache initialized successfully")
            else:
                logger.warning(f"[v0] Upstash REST API returned status {response.status_code}")
                self.connected = False
        except ImportError:
            logger.warning("[v0] requests package not available for Upstash REST API")
            self.connected = False
        except Exception as e:
            logger.warning(f"[v0] Failed to connect to Upstash REST API: {str(e)}")
            self.connected = False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        if not self.connected or not self.client:
            return None
        
        try:
            if self.is_rest_api:
                return self._rest_get(key)
            else:
                return self._standard_get(key)
        except Exception as e:
            logger.warning(f"[v0] Cache get error for {key}: {str(e)}")
            return None
    
    def _standard_get(self, key: str) -> Optional[Any]:
        """Get from standard Redis."""
        value = self.client.get(key)
        if value:
            logger.info(f"[v0] Cache HIT: {key}")
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        logger.info(f"[v0] Cache MISS: {key}")
        return None
    
    def _rest_get(self, key: str) -> Optional[Any]:
        """Get from Upstash REST API."""
        import requests
        headers = {
            'Authorization': f'Bearer {self.rest_token}',
            'Content-Type': 'application/json'
        }
        response = requests.post(
            f"{self.redis_url}/get/{key}",
            headers=headers,
            timeout=5
        )
        if response.status_code == 200 and response.json().get('result'):
            value = response.json()['result']
            logger.info(f"[v0] Cache HIT: {key}")
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        logger.info(f"[v0] Cache MISS: {key}")
        return None
    
    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in Redis cache with TTL in seconds."""
        if not self.connected or not self.client:
            return False
        
        try:
            if self.is_rest_api:
                return self._rest_set(key, value, ttl)
            else:
                return self._standard_set(key, value, ttl)
        except Exception as e:
            logger.warning(f"[v0] Cache set error for {key}: {str(e)}")
            return False
    
    def _standard_set(self, key: str, value: Any, ttl: int) -> bool:
        """Set in standard Redis."""
        json_value = json.dumps(value) if not isinstance(value, str) else value
        self.client.setex(key, ttl, json_value)
        logger.info(f"[v0] Cache SET: {key} (TTL: {ttl}s)")
        return True
    
    def _rest_set(self, key: str, value: Any, ttl: int) -> bool:
        """Set in Upstash REST API."""
        import requests
        json_value = json.dumps(value) if not isinstance(value, str) else value
        headers = {
            'Authorization': f'Bearer {self.rest_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'key': key,
            'value': json_value,
            'ex': ttl
        }
        response = requests.post(
            f"{self.redis_url}/set",
            headers=headers,
            json=payload,
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"[v0] Cache SET: {key} (TTL: {ttl}s)")
            return True
        logger.warning(f"[v0] Cache set failed for {key}: {response.status_code}")
        return False
    
    def delete(self, key: str) -> bool:
        """Delete value from Redis cache."""
        if not self.connected or not self.client:
            return False
        
        try:
            if self.is_rest_api:
                return self._rest_delete(key)
            else:
                return self._standard_delete(key)
        except Exception as e:
            logger.warning(f"[v0] Cache delete error for {key}: {str(e)}")
            return False
    
    def _standard_delete(self, key: str) -> bool:
        """Delete from standard Redis."""
        self.client.delete(key)
        logger.info(f"[v0] Cache DELETE: {key}")
        return True
    
    def _rest_delete(self, key: str) -> bool:
        """Delete from Upstash REST API."""
        import requests
        headers = {
            'Authorization': f'Bearer {self.rest_token}',
            'Content-Type': 'application/json'
        }
        response = requests.post(
            f"{self.redis_url}/del/{key}",
            headers=headers,
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"[v0] Cache DELETE: {key}")
            return True
        return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern."""
        if not self.connected or not self.client:
            return 0
        
        try:
            if self.is_rest_api:
                return self._rest_clear_pattern(pattern)
            else:
                return self._standard_clear_pattern(pattern)
        except Exception as e:
            logger.warning(f"[v0] Cache clear pattern error: {str(e)}")
            return 0
    
    def _standard_clear_pattern(self, pattern: str) -> int:
        """Clear pattern from standard Redis."""
        keys = self.client.keys(pattern)
        if keys:
            count = self.client.delete(*keys)
            logger.info(f"[v0] Cache CLEAR PATTERN: {pattern} ({count} keys deleted)")
            return count
        return 0
    
    def _rest_clear_pattern(self, pattern: str) -> int:
        """Clear pattern from Upstash REST API."""
        # REST API doesn't support pattern matching, so we'll delete individually
        # For now, return 0 as a limitation
        logger.warning("[v0] Pattern clearing not fully supported in Upstash REST API")
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
