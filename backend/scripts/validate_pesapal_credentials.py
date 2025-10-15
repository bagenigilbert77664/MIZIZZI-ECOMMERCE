#!/usr/bin/env python3
"""
Validate Pesapal Credentials
Quick validation script for MIZIZZI Pesapal credentials
"""

import os
import sys
import requests
import json
import logging

# Add backend paths to Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
app_dir = os.path.join(backend_dir, 'app')

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_credentials_direct():
    """Validate credentials directly with Pesapal API"""

    # MIZIZZI Production Credentials
    consumer_key = "MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh"
    consumer_secret = "Iy98/30kmlhg3/pjG1Wsneay9/Y="

    # Production URL
    auth_url = "https://pay.pesapal.com/v3/api/Auth/RequestToken"

    print("🔐 Validating MIZIZZI Pesapal Credentials")
    print("=" * 50)
    print(f"Consumer Key: {consumer_key[:10]}...")
    print(f"Consumer Secret: {consumer_secret[:5]}...")
    print(f"Auth URL: {auth_url}")
    print()

    try:
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        data = {
            'consumer_key': consumer_key,
            'consumer_secret': consumer_secret
        }

        print("📡 Making authentication request...")
        response = requests.post(auth_url, headers=headers, json=data, timeout=30)

        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        print()

        if response.status_code == 200:
            try:
                response_data = response.json()

                if 'token' in response_data or 'access_token' in response_data:
                    token = response_data.get('token') or response_data.get('access_token')
                    print("✅ SUCCESS: Credentials are valid!")
                    print(f"Access Token: {token[:20]}...")

                    if 'expiryDate' in response_data:
                        print(f"Expires: {response_data['expiryDate']}")

                    return True
                else:
                    print("❌ FAILED: No token in response")
                    print(f"Response: {response_data}")
                    return False

            except json.JSONDecodeError:
                print("❌ FAILED: Invalid JSON response")
                return False
        else:
            print("❌ FAILED: Authentication request failed")

            try:
                error_data = response.json()
                if 'error' in error_data:
                    print(f"Error: {error_data['error']}")
            except:
                pass

            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Network error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error - {e}")
        return False

def main():
    """Main function"""
    print("🚀 MIZIZZI Pesapal Credential Validator")
    print("=" * 60)
    print("Validating production credentials...")
    print()

    success = validate_credentials_direct()

    print("\n" + "=" * 60)
    if success:
        print("🎉 CREDENTIALS ARE VALID!")
        print("✅ Your Pesapal integration is ready to use.")
        print("✅ You can now process real payments.")
    else:
        print("❌ CREDENTIALS ARE INVALID!")
        print("⚠️  Please check your consumer key and secret.")
        print("⚠️  Make sure you're using production credentials.")

    print("=" * 60)
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
