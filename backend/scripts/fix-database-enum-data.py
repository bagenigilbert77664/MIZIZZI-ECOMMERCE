#!/usr/bin/env python3
"""
Fix database enum inconsistency - Update lowercase status values to uppercase
"""

import sys
import os
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent  # <-- Fix: use parent of scripts directory
sys.path.insert(0, str(backend_dir))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def fix_enum_values_raw_sql():
    """
    Run raw SQL to update lowercase enum values to uppercase before ORM queries.
    """
    import sqlite3
    db_path = backend_dir / "app" / "database.db"
    if not db_path.exists():
        print(f"❌ Database file not found at: {db_path}")
        return False

    print(f"🔧 Running raw SQL to fix enum values in: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Order status mapping
    status_mapping = {
        'pending': 'PENDING',
        'confirmed': 'CONFIRMED',
        'processing': 'PROCESSING',
        'shipped': 'SHIPPED',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'refunded': 'REFUNDED',
        'returned': 'RETURNED'
    }
    for old_status, new_status in status_mapping.items():
        cursor.execute("UPDATE orders SET status = ? WHERE status = ?", (new_status, old_status))

    # Payment status mapping
    payment_status_mapping = {
        'pending': 'PENDING',
        'paid': 'PAID',
        'completed': 'COMPLETED',
        'failed': 'FAILED',
        'refunded': 'REFUNDED'
    }
    for old_status, new_status in payment_status_mapping.items():
        cursor.execute("UPDATE orders SET payment_status = ? WHERE payment_status = ?", (new_status, old_status))

    conn.commit()
    conn.close()
    print("✅ Raw SQL enum fix complete.")
    return True

# Run raw SQL fix BEFORE importing models and querying with SQLAlchemy
fix_enum_values_raw_sql()

try:
    # Import Flask app and database
    from app import create_app, db
    from app.models.models import Order, OrderStatus, PaymentStatus

    print("✅ Successfully imported Flask app and models")

    # Create Flask app context
    app = create_app()

    with app.app_context():
        print("\n🔍 Checking current database state...")

        # Check current order status distribution
        orders = db.session.query(Order).all()
        status_counts = {}
        payment_status_counts = {}

        for order in orders:
            status = order.status
            payment_status = order.payment_status

            if hasattr(status, 'value'):
                status_key = f"{status.name} (enum)"
            else:
                status_key = f"{status} (string)"

            if hasattr(payment_status, 'value'):
                payment_key = f"{payment_status.name} (enum)"
            else:
                payment_key = f"{payment_status} (string)"

            status_counts[status_key] = status_counts.get(status_key, 0) + 1
            payment_status_counts[payment_key] = payment_status_counts.get(payment_key, 0) + 1

        print(f"📊 Total orders: {len(orders)}")
        print("📊 Order status distribution:")
        for status, count in status_counts.items():
            print(f"   - {status}: {count} orders")

        print("📊 Payment status distribution:")
        for status, count in payment_status_counts.items():
            print(f"   - {status}: {count} orders")

        # Find orders with problematic status values
        print("\n🔧 Identifying problematic records...")

        problematic_orders = []
        for order in orders:
            # Check if status is a string instead of enum
            if isinstance(order.status, str):
                problematic_orders.append({
                    'id': order.id,
                    'current_status': order.status,
                    'current_payment_status': order.payment_status,
                    'issue': 'status_is_string'
                })
            elif isinstance(order.payment_status, str):
                problematic_orders.append({
                    'id': order.id,
                    'current_status': order.status,
                    'current_payment_status': order.payment_status,
                    'issue': 'payment_status_is_string'
                })

        if problematic_orders:
            print(f"❌ Found {len(problematic_orders)} problematic orders:")
            for order_info in problematic_orders:
                print(f"   - Order {order_info['id']}: {order_info['issue']}")
                print(f"     Status: {order_info['current_status']}")
                print(f"     Payment Status: {order_info['current_payment_status']}")

            print("\n🔧 Fixing problematic records...")

            fixed_count = 0
            for order_info in problematic_orders:
                order = db.session.query(Order).get(order_info['id'])

                # Fix status if it's a string
                if isinstance(order.status, str):
                    status_str = order.status.upper()
                    try:
                        # Try to convert to enum
                        if hasattr(OrderStatus, status_str):
                            order.status = getattr(OrderStatus, status_str)
                            print(f"   ✅ Fixed Order {order.id} status: '{order_info['current_status']}' → OrderStatus.{status_str}")
                        else:
                            # Default to PENDING if unknown status
                            order.status = OrderStatus.PENDING
                            print(f"   ⚠️  Fixed Order {order.id} status: '{order_info['current_status']}' → OrderStatus.PENDING (default)")
                    except Exception as e:
                        order.status = OrderStatus.PENDING
                        print(f"   ⚠️  Fixed Order {order.id} status: '{order_info['current_status']}' → OrderStatus.PENDING (fallback)")

                # Fix payment status if it's a string
                if isinstance(order.payment_status, str):
                    payment_status_str = order.payment_status.upper()
                    try:
                        # Try to convert to enum
                        if hasattr(PaymentStatus, payment_status_str):
                            order.payment_status = getattr(PaymentStatus, payment_status_str)
                            print(f"   ✅ Fixed Order {order.id} payment_status: '{order_info['current_payment_status']}' → PaymentStatus.{payment_status_str}")
                        else:
                            # Default to PENDING if unknown status
                            order.payment_status = PaymentStatus.PENDING
                            print(f"   ⚠️  Fixed Order {order.id} payment_status: '{order_info['current_payment_status']}' → PaymentStatus.PENDING (default)")
                    except Exception as e:
                        order.payment_status = PaymentStatus.PENDING
                        print(f"   ⚠️  Fixed Order {order.id} payment_status: '{order_info['current_payment_status']}' → PaymentStatus.PENDING (fallback)")

                fixed_count += 1

            # Commit the changes
            try:
                db.session.commit()
                print(f"\n✅ Successfully fixed {fixed_count} orders and committed changes to database")
            except Exception as e:
                db.session.rollback()
                print(f"\n❌ Error committing changes: {e}")
                raise

        else:
            print("✅ No problematic records found - all orders have proper enum values")

        # Verify the fix
        print("\n🔍 Verifying the fix...")

        # Test querying all orders
        try:
            all_orders = db.session.query(Order).all()
            print(f"✅ Successfully queried all {len(all_orders)} orders")

            # Test pagination (this was failing before)
            from sqlalchemy import desc
            paginated_orders = db.session.query(Order).order_by(desc(Order.created_at)).limit(10).all()
            print(f"✅ Successfully queried paginated orders: {len(paginated_orders)} orders")

        except Exception as e:
            print(f"❌ Error querying orders after fix: {e}")
            raise

        print("\n✅ Database enum consistency fix completed successfully!")
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. Test the /api/orders endpoint")
        print("3. Check that orders are now displayed in the frontend")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
