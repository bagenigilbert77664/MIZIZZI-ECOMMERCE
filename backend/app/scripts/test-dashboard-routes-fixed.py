#!/usr/bin/env python3
"""
Test script for admin dashboard routes - FIXED VERSION
Tests all dashboard endpoints with proper authentication.
"""

import requests
import json
import sys
import os
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:5000/api"
ADMIN_EMAIL = "REDACTED-SENDER-EMAIL"
ADMIN_PASSWORD = "junior2020"

def get_admin_token():
    """Get admin authentication token."""
    print("🔐 Getting admin authentication token...")

    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/admin/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Admin token obtained successfully")
            return token
        else:
            print(f"❌ Failed to get admin token: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Error getting admin token: {str(e)}")
        return None

def test_dashboard_endpoint(endpoint, token, description):
    """Test a specific dashboard endpoint."""
    print(f"\n📊 Testing {description}...")
    print(f"Endpoint: {endpoint}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(endpoint, headers=headers)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ {description} - SUCCESS")

            # Print some key data points
            if 'counts' in data:
                print(f"   📈 Total Users: {data['counts'].get('users', 0)}")
                print(f"   📦 Total Products: {data['counts'].get('products', 0)}")
                print(f"   🛒 Total Orders: {data['counts'].get('orders', 0)}")

            if 'sales' in data:
                print(f"   💰 Today's Sales: ${data['sales'].get('today', 0)}")
                print(f"   💰 Total Sales: ${data['sales'].get('total_sales', 0)}")

            if 'chart_data' in data:
                print(f"   📊 Chart Data Points: {len(data['chart_data'])}")

            if 'category_sales' in data:
                print(f"   🏷️ Categories with Sales: {len(data['category_sales'])}")

            if 'activities' in data:
                print(f"   🔄 Recent Activities: {len(data['activities'])}")

            return True
        else:
            print(f"❌ {description} - FAILED")
            print(f"   Error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ {description} - ERROR: {str(e)}")
        return False

def main():
    """Main test function."""
    print("🚀 Starting Admin Dashboard Routes Test")
    print("=" * 50)

    # Get admin token
    token = get_admin_token()
    if not token:
        print("❌ Cannot proceed without admin token")
        sys.exit(1)

    # Test endpoints
    endpoints = [
        (f"{API_BASE_URL}/admin/dashboard", "Main Dashboard"),
        (f"{API_BASE_URL}/admin/dashboard/sales-chart", "Sales Chart Data"),
        (f"{API_BASE_URL}/admin/dashboard/sales-chart?days=7", "Sales Chart (7 days)"),
        (f"{API_BASE_URL}/admin/dashboard/category-sales", "Category Sales Data"),
        (f"{API_BASE_URL}/admin/dashboard/recent-activity", "Recent Activity"),
        (f"{API_BASE_URL}/admin/dashboard/health", "Dashboard Health Check")
    ]

    results = []

    for endpoint, description in endpoints:
        success = test_dashboard_endpoint(endpoint, token, description)
        results.append((description, success))

    # Summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)

    passed = 0
    failed = 0

    for description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {description}")
        if success:
            passed += 1
        else:
            failed += 1

    print(f"\n📊 Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All dashboard tests passed!")
        sys.exit(0)
    else:
        print("⚠️ Some dashboard tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
