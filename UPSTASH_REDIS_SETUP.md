# Upstash Redis Setup Guide for UI Batch System

## Overview

Your Mizizzi E-commerce platform is now configured to use **Upstash Redis** for caching UI component data in the unified batch system. This guide explains the setup and how to configure it with your credentials.

## What Was Changed

### 1. Environment Variables (`backend/.env.local`)
Added three environment variable options for maximum compatibility:

```env
# Primary: Upstash REST API
KV_REST_API_URL=https://fancy-mammal-63500.upstash.io
KV_REST_API_TOKEN=your_upstash_api_token_here

# Alternative: Upstash naming convention
UPSTASH_REDIS_REST_URL=https://fancy-mammal-63500.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_api_token_here

# Fallback: Standard Redis (for local Redis)
REDIS_URL=redis://localhost:6379/0
```

### 2. Redis Cache Helper (`backend/app/utils/redis_cache_helper.py`)
Enhanced to support both:
- **Upstash REST API** - Recommended for serverless environments
- **Standard Redis** - For direct TCP connections or local Redis

The helper automatically detects which type to use based on your environment variables and token presence.

### 3. Flask Configuration (`backend/app/configuration/config.py`)
Already configured to:
- Check for all three environment variable options
- Automatically select the appropriate cache backend
- Fall back to simple in-memory caching if Redis is unavailable

### 4. Flask Extensions (`backend/app/configuration/extensions.py`)
Already configured to:
- Initialize cache with proper timeout settings
- Log cache connection status
- Handle missing Redis gracefully

## How to Configure Your Redis

### From Your Upstash Console

From the image you provided, you have:
- **Redis URL**: `https://fancy-mammal-63500.upstash.io`
- **Port**: `6379` (for TCP connections)
- **Token**: Available in your Upstash console

### Step 1: Add Your Credentials

Edit `backend/.env.local` and add your actual Upstash token:

```env
KV_REST_API_URL=https://fancy-mammal-63500.upstash.io
KV_REST_API_TOKEN=AXRhc3RfdG9rZW5fZXhhbXBsZV8=  # Replace with your actual token
```

### Step 2: Verify Setup

Run the Redis connection test:

```bash
cd backend
python scripts/test_redis_connection.py
```

Expected output when successful:
```
============================================================
🌐 Testing Environment Variables
============================================================
✅ REDIS_URL not set (using REST API instead)
✅ KV_REST_API_URL configured: https://fancy-mammal-63500.upstash.io
✅ KV_REST_API_TOKEN configured: AXRhc3R...

============================================================
💾 Testing Flask Cache Configuration
============================================================
✅ Cache Type: redis
✅ Redis URL configured: https://fancy-mammal-63500.upstash.io

✅ Cache connected: Redis cache is available
...
```

## UI Batch Endpoints

The system provides three main endpoints for batch loading and caching:

### 1. Status Check
```bash
GET /api/ui/batch/status
```

Response:
```json
{
  "status": "healthy",
  "cache": "connected",
  "cache_type": "redis",
  "database": {
    "carousel": "connected",
    "categories": "connected",
    "side_panels": "connected",
    "topbar": "connected"
  },
  "cache_stats": {
    "connected": true,
    "type": "redis",
    "url": "https://fancy-mammal-63500..."
  },
  "timestamp": "2024-03-05T10:30:00Z"
}
```

### 2. Batch Data Load
```bash
GET /api/ui/batch/data?sections=carousel,categories,topbar,side_panels
```

Supports filtering by sections:
- `carousel` - Homepage carousel slides
- `categories` - Product categories
- `topbar` - Navigation topbar
- `side_panels` - Sidebar navigation

### 3. Cache Invalidation
```bash
POST /api/ui/batch/cache/invalidate
```

Clears all cached UI component data. Useful after making admin changes.

## Cache TTLs (Time-To-Live)

The system automatically caches with these timeouts:

| Component | TTL (seconds) | Duration |
|-----------|--------------|----------|
| Carousel | 60 | 1 minute |
| Categories | 300 | 5 minutes |
| Topbar | 120 | 2 minutes |
| Side Panels | 300 | 5 minutes |

## Upstash REST API vs Standard Redis

### When to Use REST API (Recommended for your setup)
- ✅ Serverless environments (Vercel, AWS Lambda)
- ✅ No persistent TCP connections needed
- ✅ Better for cost (pay per request)
- ✅ No infrastructure management required
- ✅ Works behind HTTP firewalls

**Configuration:**
```env
KV_REST_API_URL=https://fancy-mammal-63500.upstash.io
KV_REST_API_TOKEN=your_token_here
```

### When to Use Standard Redis
- ✅ Self-hosted Redis server
- ✅ Local development with Redis running
- ✅ Need persistent TCP connections
- ✅ Lower latency for high-frequency operations

**Configuration:**
```env
REDIS_URL=redis://localhost:6379/0
```

## Dependencies

The system automatically handles:
- `redis` library - For standard Redis connections (optional, uses requests fallback)
- `requests` library - For Upstash REST API calls
- `flask-caching` - For Flask cache integration

All are already included in your project dependencies.

## Troubleshooting

### Issue: Cache shows "disconnected"

**Solution 1: Check token**
```bash
# Verify token is correctly set
echo $KV_REST_API_TOKEN
```

**Solution 2: Test connection**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://fancy-mammal-63500.upstash.io/ping
```

**Solution 3: Check logs**
```bash
# Look for connection errors
grep "Cache connected\|Failed to connect" backend/app.log
```

### Issue: Batch endpoint returns "cache": "disconnected"

Check:
1. Environment variables are set correctly
2. Token has not expired (tokens typically have ~90 day expiration in Upstash)
3. Upstash Redis instance is still active (check Upstash console)

### Issue: Getting "requests" module not found

Install it:
```bash
pip install requests
```

## Performance Monitoring

To check cache hit/miss rates, the batch endpoints return stats:

```json
"cache_stats": {
  "connected": true,
  "type": "redis",
  "url": "https://fancy-mammal-63500..."
}
```

Monitor in Upstash console:
- Dashboard shows bandwidth usage
- Key memory usage
- Commands per second
- Connected clients

## Security Notes

1. **Never commit tokens** - Use environment variables only
2. **Rotate tokens** - Change your Upstash token regularly
3. **Monitor usage** - Check Upstash console for unusual activity
4. **Use HTTPS** - REST API uses HTTPS by default (secure)

## Next Steps

1. Add your actual Upstash token to `backend/.env.local`
2. Run the test script to verify connectivity
3. Test the batch endpoints in your application
4. Monitor cache performance in the Upstash console

For more info: [Upstash Redis Documentation](https://upstash.com/docs)
