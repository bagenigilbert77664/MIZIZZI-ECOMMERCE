#!/usr/bin/env python3
"""
Test script for Pesapal Authentication Manager
Tests authentication with MIZIZZI production credentials
"""

import os
import sys
import logging
import time
from datetime import datetime

# Add backend paths to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
app_dir = os.path.join(backend_dir, 'app')

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main test function"""
    print("🔐 Pesapal Authentication Manager Test - MIZIZZI Production")
    print("=" * 60)

    try:
        # Import after path setup
        import app
        from backend.app.config.pesapal_config import get_pesapal_config, validate_pesapal_setup
        from app.utils.pesapal_auth import PesapalAuthManager, get_auth_manager

        logger.info("✅ Successfully imported Pesapal authentication modules")

        # Test 1: Configuration check
        print(f"\n🔧 Configuration:")
        config = get_pesapal_config()
        print(f"   Environment: {config.environment}")
        print(f"   Base URL: {config.base_url}")
        print(f"   Consumer Key: {config.consumer_key[:8]}...{config.consumer_key[-4:]}")
        print(f"   Consumer Secret Length: {len(config.consumer_secret)}")
        print(f"   Auth URL: {config.auth_url}")

        # Test 2: Setup validation
        print(f"\n🔍 Testing complete Pesapal setup...")
        setup_validation = validate_pesapal_setup()

        if setup_validation['valid']:
            print("✅ Complete setup validation passed")
        else:
            print("❌ Complete setup validation failed")
            for error in setup_validation['errors']:
                print(f"   Error: {error}")
            return

        if setup_validation['warnings']:
            print("⚠️  Warnings:")
            for warning in setup_validation['warnings']:
                print(f"   - {warning}")

        setup_checks = setup_validation['setup_checks']
        for check, status in setup_checks.items():
            status_icon = "✅" if status else "❌"
            print(f"   {status_icon} {check.replace('_', ' ').title()}: {status}")

        # Test 3: Create authentication manager
        print(f"\n🔍 Testing credential validation...")
        auth_manager = PesapalAuthManager(config)

        print("✅ Credentials validation passed")
        print(f"   Environment: {config.environment}")
        print(f"   Consumer Key Length: {len(config.consumer_key)}")
        print(f"   Consumer Secret Length: {len(config.consumer_secret)}")
        print(f"   Auth URL: {config.auth_url}")

        # Test 4: Authentication
        print(f"\n🔐 Testing authentication with Pesapal API...")
        print(f"   This will make a real API call to Pesapal...")

        start_time = time.time()
        token = auth_manager.get_access_token()
        end_time = time.time()

        duration = end_time - start_time

        if token:
            print(f"✅ Authentication test PASSED")
            print(f"   Token: {token[:20]}...{token[-10:] if len(token) > 30 else token}")
            print(f"   Duration: {duration:.2f}s")

            # Test 5: Token info
            print(f"\n📊 Token information...")
            token_info = auth_manager.get_token_info()

            print(f"✅ Token info retrieved")
            print(f"   Has Token: {token_info['has_token']}")
            print(f"   Is Valid: {token_info['is_valid']}")
            print(f"   Expires At: {token_info['expires_at']}")
            print(f"   Time Until Expiry: {token_info['time_until_expiry']} seconds")

            # Test 6: Token caching
            print(f"\n💾 Testing token caching...")
            start_time = time.time()
            cached_token = auth_manager.get_access_token()  # Should use cache
            end_time = time.time()

            cache_duration = end_time - start_time

            if cached_token == token:
                print(f"✅ Token caching works")
                print(f"   Cached call duration: {cache_duration:.3f}s")
                print(f"   Speed improvement: {((duration - cache_duration) / duration * 100):.1f}%")
            else:
                print(f"⚠️  Token caching might not be working as expected")

            # Test 7: Token refresh
            print(f"\n🔄 Testing token refresh...")
            start_time = time.time()
            refreshed_token = auth_manager.get_access_token(force_refresh=True)
            end_time = time.time()

            refresh_duration = end_time - start_time

            if refreshed_token:
                print(f"✅ Token refresh works")
                print(f"   New Token: {refreshed_token[:20]}...{refreshed_token[-10:] if len(refreshed_token) > 30 else refreshed_token}")
                print(f"   Refresh Duration: {refresh_duration:.2f}s")

                if refreshed_token != token:
                    print(f"✅ New token is different from cached token")
                else:
                    print(f"⚠️  New token is same as cached token (might be expected)")
            else:
                print(f"❌ Token refresh failed")

            # Test 8: Global auth manager
            print(f"\n🌐 Testing global auth manager...")
            global_auth_manager = get_auth_manager()
            global_token = global_auth_manager.get_access_token()

            if global_token:
                print(f"✅ Global auth manager works")
                print(f"   Token: {global_token[:20]}...{global_token[-10:] if len(global_token) > 30 else global_token}")
            else:
                print(f"❌ Global auth manager failed")

        else:
            print(f"❌ Authentication test FAILED")
            print(f"   Message: Failed to obtain access token")
            print(f"   Duration: {duration:.2f}s")

            # Show token info even on failure
            print(f"\n📊 Token information...")
            token_info = auth_manager.get_token_info()

            if token_info['has_token']:
                print(f"⚠️  Has cached token but authentication failed")
                for key, value in token_info.items():
                    print(f"   {key.replace('_', ' ').title()}: {value}")
            else:
                print(f"❌ No token info available")

        print(f"\n🏁 Authentication Manager Test Complete")

    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"   1. Make sure you're running from the correct directory")
        print(f"   2. Check if all required modules are available")
        print(f"   3. Verify the backend app structure")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
