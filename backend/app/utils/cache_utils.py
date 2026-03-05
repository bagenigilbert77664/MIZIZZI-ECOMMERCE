"""
Cache and Redis utility module for Mizizzi E-commerce platform.
Handles Redis connection testing and cache status checking.
"""

import os
import logging
from datetime import datetime
import redis
from flask import current_app

logger = logging.getLogger(__name__)


def get_redis_connection():
    """Get or create a Redis connection with support for multiple naming conventions."""
    try:
        # Try different environment variable names for Redis URL
        redis_url = (
            os.environ.get('REDIS_URL') or
            os.environ.get('UPSTASH_REDIS_REST_URL') or
            os.environ.get('KV_REST_API_URL')
        )
        
        if not redis_url:
            logger.warning("No Redis URL found in environment variables (REDIS_URL, UPSTASH_REDIS_REST_URL, KV_REST_API_URL)")
            return None
        
        # Create connection with retry
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()  # Test connection
        logger.info("✅ Redis connection successful")
        return r
    except redis.ConnectionError as e:
        logger.error(f"❌ Redis connection failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Error connecting to Redis: {str(e)}")
        return None


def test_cache_connection():
    """Test the cache connection status. Works with or without application context."""
    try:
        # Try to get cache type from app context if available
        try:
            cache_type = current_app.config.get('CACHE_TYPE', 'simple')
            redis_url = current_app.config.get('CACHE_REDIS_URL')
        except RuntimeError:
            # No application context, fall back to environment variables
            redis_url = (
                os.environ.get('REDIS_URL') or
                os.environ.get('UPSTASH_REDIS_REST_URL') or
                os.environ.get('KV_REST_API_URL')
            )
            cache_type = 'redis' if redis_url else 'simple'
        
        if cache_type == 'redis' and redis_url:
            try:
                r = redis.from_url(redis_url, decode_responses=True)
                r.ping()
                return True, "Redis connected"
            except Exception as e:
                logger.error(f"Redis connection error: {str(e)}")
                return False, f"Redis error: {str(e)}"
        else:
            # Simple cache is always available
            return True, "Simple cache active"
    except Exception as e:
        logger.error(f"Error testing cache: {str(e)}")
        return False, f"Cache test error: {str(e)}"


def get_cache_status():
    """Get comprehensive cache status information."""
    is_connected, message = test_cache_connection()
    
    return {
        "connected": is_connected,
        "type": current_app.config.get('CACHE_TYPE', 'unknown'),
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "default_timeout": current_app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
    }


def verify_redis_variables():
    """Verify that Redis environment variables are set. Supports multiple naming conventions."""
    # Check for at least one Redis URL
    has_redis_url = (
        os.environ.get('REDIS_URL') or
        os.environ.get('UPSTASH_REDIS_REST_URL') or
        os.environ.get('KV_REST_API_URL')
    )
    
    if not has_redis_url:
        logger.warning("No Redis URL found. Set one of: REDIS_URL, UPSTASH_REDIS_REST_URL, or KV_REST_API_URL")
        return False
    
    logger.info("✅ Redis environment variables present")
    return True


def initialize_redis_for_upstash():
    """Initialize Redis with Upstash configuration. Supports multiple naming conventions."""
    try:
        # Try different environment variable names
        redis_url = (
            os.environ.get('REDIS_URL') or
            os.environ.get('UPSTASH_REDIS_REST_URL') or
            os.environ.get('KV_REST_API_URL')
        )
        
        if not redis_url:
            logger.warning("No Redis URL set - cache will use simple backend")
            return False
        
        # Test connection
        r = redis.from_url(redis_url, decode_responses=True, socket_keepalive=True, socket_keepalive_options={1: 1})
        r.ping()
        logger.info("✅ Upstash Redis initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Upstash Redis: {str(e)}")
        return False
