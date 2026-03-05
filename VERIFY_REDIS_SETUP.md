# Redis & UI Cache Setup Verification Checklist

## Step 1: Check Environment Variables ✅

In Vercel Dashboard → Project Settings → Vars, verify you have:

```
REDIS_URL=redis://:...@...upstash.io:...
```

OR

```
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

**Status**: You have all required environment variables set ✅

---

## Step 2: Restart Backend

```bash
# Kill current process
ps aux | grep python3 | grep run.py
kill <PID>

# Restart
cd backend
python3 run.py
```

Look for startup messages:
```
✅ Cache System: ✅ (redis)
✅ UI Batch System: ✅
```

---

## Step 3: Test Status Endpoint

```bash
curl http://localhost:5000/api/ui/batch/status
```

**Expected Response:**
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
    "url": "redis://..."
  }
}
```

**Check**: ✅ Cache is "connected" and type is "redis"

---

## Step 4: Test Data Endpoint

```bash
curl http://localhost:5000/api/ui/batch/data
```

**Expected Response:**
```json
{
  "status": "success",
  "carousel": {
    "featured": [...],
    "flash_sales": [...],
    "new_arrivals": [...]
  },
  "categories": {
    "featured": [...],
    "parents": [...]
  },
  "topbar": {...},
  "side_panels": {...},
  "cache_stats": {
    "connected": true,
    "type": "redis"
  }
}
```

**Check**: ✅ All sections return data

---

## Step 5: Check Logs for Cache Operations

```bash
# In separate terminal
tail -f backend/logs/app.log | grep "\[v0\]"
```

You should see:
```
[v0] Cache MISS: ui:carousel:data
[v0] Cache SET: ui:carousel:data (TTL: 60s)
[v0] Cache HIT: ui:carousel:data
[v0] Redis cache initialized successfully
```

**Check**: ✅ Cache operations are being logged

---

## Step 6: Test Cache Hit

Make the same request twice and check logs:

```bash
# First request - should be MISS
curl http://localhost:5000/api/ui/batch/data?sections=carousel

# Check logs - should show: Cache MISS

# Second request - should be HIT
curl http://localhost:5000/api/ui/batch/data?sections=carousel

# Check logs - should show: Cache HIT
```

**Check**: ✅ First request is MISS, second is HIT

---

## Step 7: Test Cache Invalidation

```bash
curl -X POST http://localhost:5000/api/ui/cache/invalidate
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Invalidated 4 cache keys",
  "timestamp": "..."
}
```

**Check**: ✅ Successfully invalidated 4 cache keys

---

## Step 8: Test Health Endpoint

```bash
curl http://localhost:5000/api/ui/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "ui_batch",
  "redis_available": true,
  "cache": {
    "connected": true,
    "type": "redis"
  }
}
```

**Check**: ✅ Service is healthy and Redis is available

---

## Complete Checklist

- [ ] Step 1: Environment variables verified
- [ ] Step 2: Backend restarted successfully
- [ ] Step 3: Status endpoint shows "cache": "connected"
- [ ] Step 4: Data endpoint returns all sections
- [ ] Step 5: Cache operations logged with [v0] prefix
- [ ] Step 6: Cache HIT/MISS working correctly
- [ ] Step 7: Cache invalidation working
- [ ] Step 8: Health endpoint shows healthy status

---

## Performance Verification

### Measure Response Times

```bash
# Measure first request (cold cache)
time curl http://localhost:5000/api/ui/batch/data > /dev/null

# Should take: 100-500ms

# Measure second request (warm cache)
time curl http://localhost:5000/api/ui/batch/data > /dev/null

# Should take: 10-50ms
```

**Expected Speed Improvement**: 5-50x faster on cache hit

---

## Troubleshooting

### Issue: Cache shows "disconnected"

**Solution 1**: Check Redis URL
```bash
# Verify in Vercel
echo $REDIS_URL
# Should show: redis://:auth@host.upstash.io:port
```

**Solution 2**: Run diagnostic script
```bash
cd backend
python3 scripts/test_redis_connection.py
```

**Solution 3**: Check logs
```bash
tail -f backend/logs/app.log | grep -i "redis\|cache"
```

### Issue: Database shows "disconnected"

**Solution**: Check database URL
```bash
echo $DATABASE_URL
# Should be set and valid
```

### Issue: All caches show "disconnected"

**Solution**: Make sure you have at least one product and category in the database:

```bash
# In Python shell
python3
from backend.app.models.models import Product, Category
from backend.app.configuration.extensions import db
from backend.app import create_app

app = create_app()
with app.app_context():
    print(f"Products: {Product.query.count()}")
    print(f"Categories: {Category.query.count()}")
    print(f"Featured Products: {Product.query.filter_by(is_featured=True).count()}")
```

---

## Success Indicators

When everything is working correctly, you should see:

✅ **Status Endpoint**
- `"cache": "connected"`
- `"cache_type": "redis"`
- All database sections: `"connected"`

✅ **Data Endpoint**
- All sections (carousel, categories, topbar, side_panels) with data
- `"cache_stats": {"connected": true, "type": "redis"}`

✅ **Logs**
- Cache operations with [v0] prefix
- No error messages about Redis connection

✅ **Performance**
- First request: 100-500ms
- Subsequent requests: 10-50ms
- 5-50x speed improvement

---

## Next Steps

1. **Add to Admin Dashboard** (Optional)
   - Display cache stats
   - Show invalidation button
   - Monitor hit/miss ratio

2. **Set Up Monitoring** (Optional)
   - Alert on cache disconnection
   - Track response time metrics
   - Monitor database query count

3. **Load Test** (Optional)
   ```bash
   # Use Apache Bench or similar
   ab -n 1000 -c 10 http://localhost:5000/api/ui/batch/data
   ```

---

**Status**: Implementation complete and ready for verification ✅

If all steps pass, your Redis caching is fully operational and production-ready!
