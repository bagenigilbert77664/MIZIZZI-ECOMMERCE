# Redis/Upstash Environment Variable Setup

## Overview

The Mizizzi E-commerce platform now supports Redis caching with flexible environment variable naming. This allows seamless integration with Vercel's Upstash Redis service.

## Supported Environment Variables

The system supports multiple naming conventions to work with different Redis providers:

### Primary Configuration

| Variable Name | Description | Example |
|---|---|---|
| `REDIS_URL` | Standard Redis connection URL | `redis://default:password@host:port` |
| `UPSTASH_REDIS_REST_URL` | Upstash REST API endpoint | `https://XXXX.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST API token | `AaBbCcDdEeFfGgHh...` |
| `KV_REST_API_URL` | Alternative REST API endpoint | `https://XXXX.upstash.io` |
| `KV_REST_API_TOKEN` | Alternative REST API token | `AaBbCcDdEeFfGgHh...` |

## Setting Up with Vercel/Upstash

### Step 1: Enable Upstash Redis Integration

1. Go to your Vercel project settings
2. Navigate to the "Integrations" or "Storage" section
3. Select "Upstash for Redis"
4. Authorize and connect your Upstash account
5. Create a new Redis instance or select an existing one

### Step 2: Verify Environment Variables

Once connected, Vercel automatically sets these environment variables:

```
REDIS_URL=redis://default:password@host:port
UPSTASH_REDIS_REST_URL=https://XXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=AaBbCcDdEeFfGgHh...
```

Check that they appear in your project's "Settings" → "Vars" section.

### Step 3: Restart Your Backend

Once environment variables are set, restart the Flask backend:

```bash
# Kill the current process
# Then restart
python3 run.py
```

## Checking Redis Connection Status

### Option 1: Check Startup Logs

When the backend starts, look for this line:

```
Cache System: ✅ (redis)
```

This indicates Redis is properly configured and connected.

### Option 2: Test the Health Endpoint

```bash
curl http://localhost:5000/api/ui/batch/status
```

Expected response with Redis connected:

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
  "timestamp": "2026-03-05T12:51:27.000000Z",
  "cache_details": {
    "connected": true,
    "type": "redis",
    "message": "Redis connected",
    "timestamp": "2026-03-05T12:51:27.000000Z",
    "default_timeout": 300
  }
}
```

### Option 3: Run the Test Script

```bash
python3 scripts/test_redis_connection.py
```

## Troubleshooting

### Issue: "Cache System: ⚙️ (simple)"

**Cause**: Redis environment variables are not set.

**Solution**:
1. Check Vercel project settings → "Vars" section
2. Verify `REDIS_URL` or `UPSTASH_REDIS_REST_URL` is present
3. Restart the backend

### Issue: Redis Connection Error

**Cause**: Network or credential issue.

**Solution**:
1. Verify the Redis URL is correct
2. Check that Upstash Redis instance is running
3. Ensure no firewall blocks the connection
4. Check `UPSTASH_REDIS_REST_TOKEN` is valid

### Issue: "Working outside of application context"

**Cause**: Code trying to access `current_app` outside Flask context.

**Solution**: This has been fixed in the latest code. The cache utilities now handle this gracefully.

## How the System Works

1. **Configuration Priority**:
   ```python
   if REDIS_URL:
       Use Redis
   elif UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
       Use REST API
   elif KV_REST_API_URL and KV_REST_API_TOKEN:
       Use KV endpoint
   else:
       Fallback to simple cache
   ```

2. **Graceful Degradation**:
   - If Redis is unavailable, the system falls back to simple in-memory cache
   - Application continues to work without Redis
   - `/api/ui/batch/status` shows `"cache": "disconnected"` with `"status": "degraded"`

3. **Automatic Detection**:
   - Config file automatically detects which environment variable is set
   - No manual configuration needed if using Vercel integration

## API Endpoints

### Cache Status Endpoint

**GET** `/api/ui/batch/status`

Returns current cache and database connectivity status.

### Batch Data Endpoint

**GET** `/api/ui/batch/data`

Returns cached UI component data (carousel, categories, topbar, side_panels).

### Health Check

**GET** `/api/health-check`

Returns overall system health including cache status.

## Environment Variable Precedence

The system checks variables in this order:

1. `REDIS_URL` (standard Redis connection string)
2. `UPSTASH_REDIS_REST_URL` (Vercel Upstash integration)
3. `KV_REST_API_URL` (alternative REST API)

Only the first found variable is used.

## Local Development

For local development without Upstash:

```bash
# Option 1: Install Redis locally
brew install redis
redis-server

# Option 2: Use Docker
docker run -d -p 6379:6379 redis

# Option 3: Set environment variable
export REDIS_URL="redis://localhost:6379"

# Start backend
python3 run.py
```

## Production Considerations

- **Always use HTTPS**: Upstash provides HTTPS endpoints for security
- **Use Strong Tokens**: Verify `UPSTASH_REDIS_REST_TOKEN` is protected
- **Monitor Cache**: Check `/api/ui/batch/status` regularly
- **Set Cache TTLs**: Different sections have different TTLs (see endpoint response)

## References

- [Vercel Upstash Integration](https://vercel.com/docs/integrations/upstash)
- [Upstash Redis Documentation](https://upstash.dev/docs/redis/overall/getstarted)
- [Flask-Caching Documentation](https://flask-caching.readthedocs.io/)
