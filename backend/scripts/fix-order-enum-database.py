#!/usr/bin/env python3
"""
Fix Order Status Enum Database Issue

This script fixes the enum mismatch issue where SQLAlchemy native_enum=True
is causing validation errors with OrderStatus enum values.
"""

import sys
import os

# Add the backend directory to Python path (so 'app' is importable)
backend_dir = os.path.dirname(os.path.dirname(__file__))  # /backend
sys.path.insert(0, backend_dir)

try:
    from app import create_app, db
    from app.models.models import Order, OrderStatus, PaymentStatus
    from sqlalchemy import text

    print("✅ Successfully imported Flask app and models")

    # Create app context
    app = create_app()

    with app.app_context():
        print("\n🔍 Checking database connection...")

        try:
            # Test database connection
            result = db.session.execute(text("SELECT 1")).fetchone()
            print("✅ Database connection successful")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            sys.exit(1)

        print("\n🔍 Checking Order table structure...")

        try:
            # Check if orders table exists
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'orders' AND column_name IN ('status', 'payment_status')
                ORDER BY column_name
            """)).fetchall()

            if result:
                print("✅ Orders table structure:")
                for row in result:
                    print(f"   - {row[0]}: {row[1]} (nullable: {row[2]})")
            else:
                print("❌ Orders table not found or status columns missing")
                sys.exit(1)

        except Exception as e:
            print(f"❌ Error checking table structure: {e}")
            sys.exit(1)

        print("\n🔍 Checking existing order data...")

        try:
            # Count total orders
            total_orders = db.session.query(Order).count()
            print(f"📊 Total orders in database: {total_orders}")

            if total_orders > 0:
                # Check status distribution
                status_counts = db.session.execute(text("""
                    SELECT status, COUNT(*) as count
                    FROM orders
                    GROUP BY status
                    ORDER BY count DESC
                """)).fetchall()

                print("📊 Order status distribution:")
                for status, count in status_counts:
                    print(f"   - {status}: {count} orders")

                # Check payment status distribution
                payment_status_counts = db.session.execute(text("""
                    SELECT payment_status, COUNT(*) as count
                    FROM orders
                    GROUP BY payment_status
                    ORDER BY count DESC
                """)).fetchall()

                print("📊 Payment status distribution:")
                for status, count in payment_status_counts:
                    print(f"   - {status}: {count} orders")

        except Exception as e:
            print(f"❌ Error checking order data: {e}")
            print(f"   This might be the enum validation issue we're trying to fix")

        print("\n🔧 Testing enum values...")

        # Test enum definitions
        print("✅ OrderStatus enum values:")
        for status in OrderStatus:
            print(f"   - {status.name} = '{status.value}'")

        print("✅ PaymentStatus enum values:")
        for status in PaymentStatus:
            print(f"   - {status.name} = '{status.value}'")

        print("\n🔧 Attempting to fix enum issues...")

        try:
            # Try to create a test order to see if enum works
            print("🧪 Testing enum creation...")
            test_status = OrderStatus.PENDING
            test_payment_status = PaymentStatus.PENDING
            print(f"✅ Successfully created enum instances: {test_status}, {test_payment_status}")

            # Try to query orders with explicit enum conversion
            print("🧪 Testing database query with enum filtering...")
            pending_orders = db.session.query(Order).filter(
                Order.status == OrderStatus.PENDING
            ).limit(5).all()
            print(f"✅ Successfully queried {len(pending_orders)} pending orders")

        except Exception as e:
            print(f"❌ Enum test failed: {e}")
            print("🔧 This confirms the enum validation issue")

            # Suggest fix
            print("\n💡 Suggested fixes:")
            print("1. Remove native_enum=True from Order model")
            print("2. Update existing data to use correct enum values")
            print("3. Recreate the database schema")

        print("\n✅ Diagnosis complete!")
        print("\nNext steps:")
        print("1. Update the Order model to remove native_enum=True")
        print("2. Run database migration if needed")
        print("3. Test the orders API endpoint")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the correct directory")
    print("and that all dependencies are installed")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
    sys.exit(1)
