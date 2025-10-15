import sys
import os
from pathlib import Path

# Fix: Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.models.models import db, Order, OrderStatus
from sqlalchemy import text

def fix_lowercase_pending():
    """Remove lowercase 'pending' status and replace with proper PENDING enum"""

    app = create_app()

    with app.app_context():
        try:
            print("🔍 Checking for orders with lowercase 'pending' status...")

            # Find orders with lowercase 'pending' status using raw SQL
            result = db.session.execute(text("SELECT id, status FROM orders WHERE status = 'pending'"))
            problematic_orders = result.fetchall()

            if not problematic_orders:
                print("✅ No orders found with lowercase 'pending' status")
                return

            print(f"❌ Found {len(problematic_orders)} orders with lowercase 'pending' status:")
            for order in problematic_orders:
                print(f"   - Order ID: {order.id}, Status: '{order.status}'")

            # Update the problematic orders to use proper enum value
            print("\n🔧 Updating orders to use proper PENDING enum...")

            update_result = db.session.execute(
                text("UPDATE orders SET status = 'PENDING' WHERE status = 'pending'")
            )

            db.session.commit()

            print(f"✅ Updated {update_result.rowcount} orders successfully")

            # Verify the fix
            print("\n🔍 Verifying fix...")
            verification = db.session.execute(text("SELECT id, status FROM orders WHERE status = 'pending'"))
            remaining_problematic = verification.fetchall()

            if not remaining_problematic:
                print("✅ All lowercase 'pending' statuses have been fixed!")
            else:
                print(f"❌ Still found {len(remaining_problematic)} problematic orders")

            # Show current status distribution
            print("\n📊 Current order status distribution:")
            status_counts = db.session.execute(text("""
                SELECT status, COUNT(*) as count
                FROM orders
                GROUP BY status
                ORDER BY count DESC
            """)).fetchall()

            for status, count in status_counts:
                print(f"   - {status}: {count} orders")

            # Test loading orders with SQLAlchemy
            print("\n🧪 Testing SQLAlchemy order loading...")
            try:
                orders = Order.query.limit(5).all()
                print(f"✅ Successfully loaded {len(orders)} orders with SQLAlchemy")
                for order in orders:
                    print(f"   - Order {order.id}: {order.status}")
            except Exception as e:
                print(f"❌ SQLAlchemy loading failed: {str(e)}")

        except Exception as e:
            print(f"❌ Error fixing lowercase pending: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    fix_lowercase_pending()
