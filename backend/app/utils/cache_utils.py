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
    """Get or create a Redis connection."""
    try:
        redis_url = os.environ.get('REDIS_URL')
        if not redis_url:
            logger.warning("REDIS_URL environment variable not set")
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
    """Test the cache connection status."""
    try:
        # Try to get from cache
        cache_type = current_app.config.get('CACHE_TYPE', 'simple')
        
        if cache_type == 'redis':
            redis_url = current_app.config.get('CACHE_REDIS_URL') or os.environ.get('REDIS_URL')
            if not redis_url:
                return False, "Redis URL not configured"
            
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
    """Verify that all required Redis environment variables are set."""
    required_vars = ['REDIS_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        logger.warning(f"Missing Redis environment variables: {', '.join(missing_vars)}")
        return False
    
    logger.info("✅ All Redis environment variables present")
    return True


def initialize_redis_for_upstash():
    """Initialize Redis with Upstash configuration."""
    try:
        redis_url = os.environ.get('REDIS_URL')
        
        if not redis_url:
            logger.warning("REDIS_URL not set - cache will use simple backend")
            return False
        
        # Test connection
        r = redis.from_url(redis_url, decode_responses=True, socket_keepalive=True, socket_keepalive_options={1: 1})
        r.ping()
        logger.info("✅ Upstash Redis initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Upstash Redis: {str(e)}")
        return False
