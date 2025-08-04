#!/usr/bin/env python3
"""
Test script for Pesapal Configuration
Tests the Pesapal configuration setup for MIZIZZI
"""

import os
import sys
import logging
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
    print("🔧 Pesapal Configuration Test - MIZIZZI")
    print("=" * 45)

    try:
        # Import after path setup
        import app
        from backend.app.config.pesapal_config import (
            get_pesapal_config,
            validate_pesapal_config,
            validate_pesapal_setup
        )

        logger.info("✅ Successfully imported Pesapal configuration modules")

        # Test 1: Configuration loading
        print(f"\n📋 Testing configuration loading...")
        config = get_pesapal_config()

        if config:
            print("✅ Configuration loaded successfully")
            print(f"   Environment: {config.environment}")
            print(f"   Base URL: {config.base_url}")
            print(f"   Consumer Key: {config.consumer_key[:8]}...{config.consumer_key[-4:]}")
            print(f"   Consumer Secret Length: {len(config.consumer_secret)}")
        else:
            print("❌ Failed to load configuration")
            return

        # Test 2: Configuration summary
        print(f"\n📊 Configuration Summary:")
        summary = config.get_config_summary()

        for key, value in summary.items():
            formatted_key = key.replace('_', ' ').title()
            if isinstance(value, list):
                value = ', '.join(value)
            print(f"   {formatted_key}: {value}")

        # Test 3: Configuration validation
        print(f"\n🔍 Testing configuration validation...")
        validation = validate_pesapal_config()

        if validation['valid']:
            print("✅ Configuration validation passed")
            if validation['warnings']:
                print("⚠️  Warnings:")
                for warning in validation['warnings']:
                    print(f"    - {warning}")
        else:
            print("❌ Configuration validation failed")
            print("   Errors:")
            for error in validation['errors']:
                print(f"    - {error}")
            if validation['warnings']:
                print("   Warnings:")
                for warning in validation['warnings']:
                    print(f"    - {warning}")

        # Test 4: Complete setup validation
        print(f"\n🔧 Testing complete Pesapal setup...")
        setup_validation = validate_pesapal_setup()

        if setup_validation['valid']:
            print("✅ Complete setup validation passed")

            setup_checks = setup_validation['setup_checks']
            print("   Setup Checks:")
            for check, status in setup_checks.items():
                status_icon = "✅" if status else "❌"
                formatted_check = check.replace('_', ' ').title()
                print(f"     {status_icon} {formatted_check}: {status}")

            if setup_validation['warnings']:
                print("   Warnings:")
                for warning in setup_validation['warnings']:
                    print(f"     - {warning}")
        else:
            print("❌ Complete setup validation failed")
            print("   Errors:")
            for error in setup_validation['errors']:
                print(f"     - {error}")

        # Test 5: URL configuration
        print(f"\n🌐 Testing URL configuration...")
        urls = {
            'Auth URL': config.auth_url,
            'Register IPN URL': config.register_ipn_url,
            'Submit Order URL': config.submit_order_url,
            'Transaction Status URL': config.transaction_status_url,
            'Callback URL': config.callback_url,
            'IPN URL': config.ipn_url
        }

        for name, url in urls.items():
            if url.startswith('https://'):
                print(f"   ✅ {name}: {url}")
            elif url.startswith('http://'):
                print(f"   ⚠️  {name}: {url} (HTTP - not secure)")
            else:
                print(f"   ❌ {name}: {url} (Invalid URL)")

        # Test 6: Amount formatting
        print(f"\n💰 Testing amount formatting...")
        try:
            formatted = config.format_amount(100.50, 'KES')
            print(f"✅ Amount formatting works")
            print(f"   Input: 100.50 KES")
            print(f"   Output: {formatted}")

            # Test invalid currency
            try:
                config.format_amount(100, 'INVALID')
                print("❌ Should have failed with invalid currency")
            except ValueError as e:
                print(f"✅ Correctly rejected invalid currency: {e}")

        except Exception as e:
            print(f"❌ Amount formatting failed: {e}")

        # Test 7: Reference generation
        print(f"\n🔖 Testing reference generation...")
        try:
            ref1 = config.generate_reference()
            ref2 = config.generate_reference('TEST')

            print(f"✅ Reference generation works")
            print(f"   Default: {ref1}")
            print(f"   Custom prefix: {ref2}")

        except Exception as e:
            print(f"❌ Reference generation failed: {e}")

        print(f"\n🎉 Configuration Test Complete!")
        print("   🚀 MIZIZZI Pesapal configuration is ready!")

    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"   1. Make sure you're running from the correct directory")
        print(f"   2. Check if the pesapal_config.py file exists")
        print(f"   3. Verify the backend app structure")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
