# Redis Quick Reference Card

## 30-Second Setup

```bash
# 1. In Vercel: Settings → Integrations → Add Upstash Redis
# 2. Restart backend
python3 run.py

# 3. Check logs for:
# "Cache System: ✅ (redis)"  ← Success!
# "Cache System: ⚙️ (simple)" ← Fallback mode
```

## Check Status

```bash
# View cache status
curl http://localhost:5000/api/ui/batch/status

# Should show:
# "cache": "connected"     ← Redis working
# "cache": "disconnected"  ← Fallback mode
```

## Environment Variables

| Variable | Source | When Set |
|----------|--------|----------|
| `REDIS_URL` | Vercel/Upstash | Always |
| `UPSTASH_REDIS_REST_URL` | Upstash integration | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash integration | Optional |

**Only need ONE of these set** - system will find it automatically.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cache shows "disconnected" | Check Vars in Vercel project settings |
| Startup error about context | Update to latest code (fixed) |
| Wants to disable Redis | Remove all `REDIS_*` environment variables |
| Want to test locally | Set `export REDIS_URL="redis://localhost:6379"` |

## Key Endpoints

| Endpoint | Purpose | URL |
|----------|---------|-----|
| Batch Status | Check cache status | `/api/ui/batch/status` |
| Batch Data | Get cached UI data | `/api/ui/batch/data` |
| Health Check | System health | `/api/health-check` |

## What Works

✅ Redis enabled  
✅ REST API support  
✅ Multiple env variable names  
✅ Graceful fallback (no Redis = still works)  
✅ Context-safe operations  
✅ Automatic detection  

## System Status

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ redis | Redis working | Nothing needed |
| ⚙️ simple | Using fallback | Set REDIS_URL environment variable |
| ❌ error | Connection failed | Check credentials and logs |

## For Developers

### Test Redis Locally

```bash
# Option 1: Docker
docker run -d -p 6379:6379 redis

# Option 2: Homebrew
brew install redis && redis-server

# Set URL
export REDIS_URL="redis://localhost:6379"
```

### Run Test Script

```bash
python3 scripts/test_redis_connection.py
```

### View Logs

```bash
# Watch cache status
watch -n 1 'curl -s http://localhost:5000/api/ui/batch/status'

# Search logs
grep -i "redis\|cache" app.log
```

## Production Checklist

- [ ] Upstash Redis instance created
- [ ] Vercel integration added
- [ ] Environment variables present in Vars
- [ ] Backend restarted
- [ ] Startup logs show "Cache System: ✅"
- [ ] `/api/ui/batch/status` returns "healthy"
- [ ] Monitoring set up for Redis instance

## Cache TTLs

| Component | TTL | Purpose |
|-----------|-----|---------|
| Carousel | 60s | Home carousel |
| Topbar | 120s | Top navigation |
| Categories | 300s | Category list |
| Side Panels | 300s | Sidebar content |

## Performance Impact

| Mode | Speed | Persistence | Use Case |
|------|-------|-------------|----------|
| Redis | Fast | Persistent | Production |
| Simple | Good | Session only | Development |
| No Cache | Slowest | None | Testing |

## Files Modified

```
✅ config.py          - Multi-variable support
✅ cache_utils.py     - Context-safe operations
✅ __init__.py        - Fixed startup logging
✅ ui/__init__.py     - Added batch endpoints
```

## Need Help?

1. Read: `REDIS_ENV_SETUP.md` (detailed guide)
2. Test: `scripts/test_redis_connection.py` (automated test)
3. Check: `/api/ui/batch/status` (live status)
4. Debug: Startup logs (look for "Cache System")

---

**Last Updated**: March 5, 2026  
**Status**: Production Ready ✅
