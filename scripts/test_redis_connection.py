#!/usr/bin/env python3
"""
Redis connection test script for Mizizzi E-commerce platform.
Tests Upstash Redis connectivity and configuration.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

def test_environment_variables():
    """Test if all required Redis environment variables are set."""
    print("=" * 60)
    print("🔍 Testing Environment Variables")
    print("=" * 60)
    
    required_vars = ['REDIS_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']
    missing = []
    
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            # Mask the actual value for security
            masked = value[:10] + "..." if len(value) > 10 else value
            print(f"✅ {var}: {masked}")
        else:
            print(f"❌ {var}: NOT SET")
            missing.append(var)
    
    if missing:
        print(f"\n⚠️  Missing variables: {', '.join(missing)}")
        return False
    
    print("\n✅ All environment variables present")
    return True


def test_redis_connection():
    """Test direct Redis connection."""
    print("\n" + "=" * 60)
    print("🔗 Testing Redis Connection")
    print("=" * 60)
    
    try:
        import redis
        
        redis_url = os.environ.get('REDIS_URL')
        if not redis_url:
            print("❌ REDIS_URL not set")
            return False
        
        print(f"Attempting to connect to Redis...")
        r = redis.from_url(redis_url, decode_responses=True, socket_keepalive=True)
        r.ping()
        print("✅ Redis connection successful")
        
        # Test basic operations
        print("\nTesting basic Redis operations...")
        r.set('test_key', 'test_value')
        value = r.get('test_key')
        
        if value == 'test_value':
            print("✅ SET/GET operations successful")
            r.delete('test_key')
            print("✅ DELETE operation successful")
        else:
            print(f"❌ SET/GET failed: expected 'test_value', got '{value}'")
            return False
        
        # Get info
        info = r.info()
        print(f"\n📊 Redis Info:")
        print(f"  Server: {info.get('redis_version', 'Unknown')}")
        print(f"  Used Memory: {info.get('used_memory_human', 'Unknown')}")
        
        return True
        
    except ImportError:
        print("❌ redis package not installed")
        print("   Install with: pip install redis")
        return False
    except redis.ConnectionError as e:
        print(f"❌ Connection failed: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_flask_cache():
    """Test Flask cache configuration."""
    print("\n" + "=" * 60)
    print("💾 Testing Flask Cache Configuration")
    print("=" * 60)
    
    try:
        from app import create_app
        from app.utils.cache_utils import get_cache_status, test_cache_connection
        
        # Create Flask app
        print("Creating Flask app...")
        app = create_app(config_name='development', enable_socketio=False)
        
        with app.app_context():
            # Check configuration
            cache_type = app.config.get('CACHE_TYPE', 'unknown')
            print(f"✅ Cache Type: {cache_type}")
            
            if cache_type == 'redis':
                cache_url = app.config.get('CACHE_REDIS_URL')
                if cache_url:
                    masked_url = cache_url[:20] + "..." if len(cache_url) > 20 else cache_url
                    print(f"✅ Redis URL configured: {masked_url}")
                else:
                    print("⚠️  Redis URL not configured in Flask")
            
            # Test cache connection
            print("\nTesting cache connection...")
            is_connected, message = test_cache_connection()
            
            if is_connected:
                print(f"✅ Cache connected: {message}")
            else:
                print(f"❌ Cache error: {message}")
            
            # Get detailed status
            status = get_cache_status()
            print(f"\n📊 Cache Status:")
            for key, value in status.items():
                if key != 'timestamp':
                    print(f"  {key}: {value}")
            
            return is_connected
            
    except Exception as e:
        print(f"❌ Error testing Flask cache: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_ui_batch_endpoint():
    """Test the UI batch endpoint."""
    print("\n" + "=" * 60)
    print("🌐 Testing UI Batch Endpoint")
    print("=" * 60)
    
    try:
        from app import create_app
        
        print("Creating Flask test client...")
        app = create_app(config_name='development', enable_socketio=False)
        
        with app.test_client() as client:
            print("Testing /api/ui/batch/status endpoint...")
            response = client.get('/api/ui/batch/status')
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Endpoint accessible")
                
                data = response.get_json()
                print(f"\nResponse Data:")
                print(f"  Status: {data.get('status', 'unknown')}")
                print(f"  Cache: {data.get('cache', 'unknown')}")
                print(f"  Database: {data.get('database', {}).get('carousel', 'unknown')}")
                
                if data.get('cache') == 'connected':
                    print("\n✅ Cache reported as CONNECTED")
                else:
                    print("\n⚠️  Cache reported as DISCONNECTED")
                
                return True
            else:
                print(f"❌ Endpoint returned status {response.status_code}")
                print(f"Response: {response.data}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n")
    print("🧪 MIZIZZI E-COMMERCE REDIS CONNECTION TEST")
    print("=" * 60)
    
    results = {}
    
    # Test environment variables
    results['Environment Variables'] = test_environment_variables()
    
    # Test Redis connection
    results['Redis Connection'] = test_redis_connection()
    
    # Test Flask cache
    results['Flask Cache'] = test_flask_cache()
    
    # Test UI batch endpoint
    results['UI Batch Endpoint'] = test_ui_batch_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED - Redis is properly configured!")
    else:
        print("❌ SOME TESTS FAILED - Check configuration")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
