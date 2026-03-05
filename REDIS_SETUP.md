# Redis and Caching Setup for Mizizzi E-commerce

## Overview

This document explains how Redis caching is configured and how to verify the connection works properly in the Mizizzi E-commerce platform.

## Environment Variables

The following environment variables are required for Redis to work:

```
REDIS_URL=redis://[user]:[password]@[host]:[port]/[db]
KV_REST_API_URL=[Upstash REST API URL]
KV_REST_API_TOKEN=[Upstash API Token]
```

If using Upstash Redis:
- `REDIS_URL`: Your Upstash Redis connection string
- `KV_REST_API_URL`: Upstash REST API endpoint
- `KV_REST_API_TOKEN`: Upstash REST API token

All three are provided by the Upstash integration in Vercel.

## Configuration

The caching system is configured in two places:

### 1. Flask Configuration (`backend/app/configuration/config.py`)

```python
if REDIS_URL:
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = REDIS_URL
else:
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple')
```

**Features:**
- Automatically uses Redis if `REDIS_URL` is set
- Falls back to simple in-memory cache if Redis is unavailable
- Configurable default timeout (default: 300 seconds)

### 2. Cache Extension (`backend/app/configuration/extensions.py`)

```python
cache_type = app.config.get('CACHE_TYPE', 'simple')
cache_config = {
    'CACHE_TYPE': cache_type,
    'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
}

if cache_type == 'redis':
    cache_config['CACHE_REDIS_URL'] = app.config.get('CACHE_REDIS_URL')
    logger.info(f"Initializing Redis cache...")

cache.init_app(app, config=cache_config)
```

## Cache Utilities

A utility module (`backend/app/utils/cache_utils.py`) provides helper functions:

### `test_cache_connection()`
Tests if the cache backend is connected and returns a tuple:
```python
is_connected, message = test_cache_connection()
# Returns: (True, "Redis connected") or (False, "Redis error: ...")
```

### `get_cache_status()`
Returns detailed cache status information:
```python
{
    "connected": True,
    "type": "redis",
    "message": "Redis connected",
    "timestamp": "2026-03-05T10:30:45.123456",
    "default_timeout": 300
}
```

### `verify_redis_variables()`
Checks that all required Redis environment variables are set:
```python
is_configured = verify_redis_variables()
# Returns: True if all vars present, False if any missing
```

### `initialize_redis_for_upstash()`
Initializes Redis with Upstash-specific configuration:
```python
success = initialize_redis_for_upstash()
```

## UI Batch Endpoints

The system includes batch endpoints for UI component loading with cache status:

### `/api/ui/batch/status`
Returns the current status of cache and database connectivity:

**Request:**
```bash
curl http://localhost:5000/api/ui/batch/status
```

**Response:**
```json
{
  "status": "healthy",
  "cache": "connected",
  "database": {
    "carousel": "connected",
    "categories": "connected",
    "side_panels": "connected",
    "topbar": "connected"
  },
  "endpoint": "/api/ui/batch",
  "sections_available": ["carousel", "topbar", "categories", "side_panels"],
  "cache_ttls": {
    "carousel": 60,
    "categories": 300,
    "combined": 60,
    "side_panels": 300,
    "topbar": 120
  },
  "timestamp": "2026-03-05T10:30:45.123456Z",
  "cache_details": {
    "connected": true,
    "type": "redis",
    "message": "Redis connected",
    "default_timeout": 300
  }
}
```

**Possible `status` values:**
- `healthy`: Both cache and database connected
- `degraded`: Cache disconnected but database available
- `error`: Critical error occurred

### `/api/ui/batch/data`
Returns batch data for UI components:

```bash
curl http://localhost:5000/api/ui/batch/data
```

### `/api/ui/health`
Health check endpoint for UI batch service:

```bash
curl http://localhost:5000/api/ui/health
```

## Testing Redis Connection

### Run the Test Script

```bash
cd /vercel/share/v0-project
python scripts/test_redis_connection.py
```

This script tests:
1. ✅ Environment variables are set
2. ✅ Redis connection works
3. ✅ Flask cache is configured correctly
4. ✅ UI batch endpoint responds properly

### Manual Testing

**Test Redis directly:**
```python
import redis
r = redis.from_url(os.environ['REDIS_URL'], decode_responses=True)
r.ping()  # Should return True
r.set('test', 'value')
r.get('test')  # Should return 'value'
```

**Test Flask cache:**
```python
from app import create_app
from app.utils.cache_utils import get_cache_status

app = create_app()
with app.app_context():
    status = get_cache_status()
    print(status)  # Should show connected: True
```

**Test endpoint:**
```bash
curl http://localhost:5000/api/ui/batch/status | jq
```

## Troubleshooting

### Cache shows "disconnected"

**Check 1: Environment Variables**
```bash
# Verify variables are set
echo $REDIS_URL
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN
```

**Check 2: Redis Connection**
```bash
# Test connection directly
python -c "import redis; r = redis.from_url(os.environ['REDIS_URL']); r.ping()"
```

**Check 3: Flask Configuration**
```python
from app import create_app
app = create_app()
print(f"Cache Type: {app.config.get('CACHE_TYPE')}")
print(f"Redis URL: {app.config.get('CACHE_REDIS_URL')}")
```

### Connection timeouts

The Redis connection may timeout if:
1. Redis server is down or unreachable
2. Credentials are incorrect
3. Network firewall is blocking the connection

**Solutions:**
- Verify Redis server is running and accessible
- Check credentials in `REDIS_URL`
- Check network/firewall settings
- Use Upstash console to verify server status

### Wrong credentials

If you see "WRONGPASS" errors:
1. Verify the password in `REDIS_URL` is correct
2. Check that credentials haven't changed in Upstash
3. Restart the Flask app with new credentials

## Cache TTLs (Time To Live)

Default cache timeouts for different UI components:
- **Carousel**: 60 seconds
- **Categories**: 300 seconds (5 minutes)
- **Side Panels**: 300 seconds (5 minutes)
- **Topbar**: 120 seconds (2 minutes)
- **Combined**: 60 seconds

These can be configured in the `cache_ttls` dictionary returned by `/api/ui/batch/status`.

## Performance Monitoring

### Monitor Cache Hit Rate

```python
from app import create_app
from app.configuration.extensions import cache

app = create_app()
with app.app_context():
    # Get cache statistics
    info = cache.cache._redis.info()
    hit_rate = info.get('keyspace_hits', 0) / (info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
    print(f"Cache Hit Rate: {hit_rate * 100:.2f}%")
```

### Monitor Memory Usage

```python
info = cache.cache._redis.info()
used_memory = info.get('used_memory_human', 'Unknown')
print(f"Used Memory: {used_memory}")
```

## Integration with Upstash

When using Vercel's Upstash for Redis integration:

1. The system automatically detects `REDIS_URL` from environment
2. Fallback to simple cache if Redis is unavailable
3. All cache operations use the REST API via `@upstash/redis` if needed
4. Rate limiting and backoff handled automatically

### Upstash Console

Monitor and manage Redis via Upstash console at https://console.upstash.com:
- View commands executed
- Monitor memory usage
- Check connection statistics
- Manage keys and data

## Best Practices

1. **Always test after deployment**: Run `test_redis_connection.py` after deploying
2. **Monitor cache hit rates**: Adjust TTLs based on usage patterns
3. **Set appropriate timeouts**: Balance between freshness and performance
4. **Clean up old data**: Implement eviction policies in Redis
5. **Use separate databases**: Different environments can use different Redis DBs
6. **Log cache operations**: Enable logging for debugging

## References

- [Redis Python Client](https://redis-py.readthedocs.io/)
- [Flask-Caching Documentation](https://flask-caching.readthedocs.io/)
- [Upstash Documentation](https://upstash.com/docs)
- [Vercel Redis Integration](https://vercel.com/docs/storage/vercel-kv)

## Support

For issues with Redis setup:
1. Check environment variables are correctly set
2. Run the test script: `python scripts/test_redis_connection.py`
3. Review logs in `/api/ui/batch/status` endpoint
4. Check Upstash console for connection issues
5. Verify network connectivity to Redis server
