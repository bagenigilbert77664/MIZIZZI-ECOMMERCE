#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models.models import db
from sqlalchemy import text

def fix_enum_data():
    """Fix lowercase enum values in the database to match uppercase enum definitions"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("=" * 60)
            print("Starting enum data fix (v2)...")
            print("=" * 60)
            
            # First, check what values exist
            print("\n1. Checking current payment_status values...")
            current_payment_statuses = db.session.execute(
                text("SELECT DISTINCT payment_status, COUNT(*) FROM orders GROUP BY payment_status")
            ).fetchall()
            
            print("Current payment_status distribution:")
            for status, count in current_payment_statuses:
                print(f"  '{status}': {count} orders")
            
            print("\n2. Checking current order status values...")
            current_order_statuses = db.session.execute(
                text("SELECT DISTINCT status, COUNT(*) FROM orders GROUP BY status")
            ).fetchall()
            
            print("Current order status distribution:")
            for status, count in current_order_statuses:
                print(f"  '{status}': {count} orders")
            
            # Fix payment_status values
            print("\n3. Fixing payment_status values...")
            
            lowercase_payment_mappings = {
                'pending': 'PENDING',
                'paid': 'PAID',
                'completed': 'COMPLETED', 
                'failed': 'FAILED',
                'cancelled': 'CANCELLED',
                'refunded': 'REFUNDED'
            }
            
            total_payment_updates = 0
            for lowercase, uppercase in lowercase_payment_mappings.items():
                result = db.session.execute(
                    text(f"UPDATE orders SET payment_status = '{uppercase}' WHERE payment_status = '{lowercase}'")
                )
                if result.rowcount > 0:
                    print(f"  ✓ Updated {result.rowcount} records: '{lowercase}' → '{uppercase}'")
                    total_payment_updates += result.rowcount
            
            # Fix order status values
            print("\n4. Fixing order status values...")
            
            lowercase_order_mappings = {
                'pending': 'PENDING',
                'confirmed': 'CONFIRMED',
                'processing': 'PROCESSING',
                'shipped': 'SHIPPED',
                'delivered': 'DELIVERED',
                'cancelled': 'CANCELLED',
                'returned': 'RETURNED'
            }
            
            total_order_updates = 0
            for lowercase, uppercase in lowercase_order_mappings.items():
                result = db.session.execute(
                    text(f"UPDATE orders SET status = '{uppercase}' WHERE status = '{lowercase}'")
                )
                if result.rowcount > 0:
                    print(f"  ✓ Updated {result.rowcount} records: '{lowercase}' → '{uppercase}'")
                    total_order_updates += result.rowcount
            
            # Commit all changes
            db.session.commit()
            
            print("\n5. Verifying the fix...")
            
            # Check payment_status after fix
            final_payment_statuses = db.session.execute(
                text("SELECT DISTINCT payment_status, COUNT(*) FROM orders GROUP BY payment_status")
            ).fetchall()
            
            print("Final payment_status distribution:")
            for status, count in final_payment_statuses:
                print(f"  '{status}': {count} orders")
            
            # Check order status after fix
            final_order_statuses = db.session.execute(
                text("SELECT DISTINCT status, COUNT(*) FROM orders GROUP BY status")
            ).fetchall()
            
            print("Final order status distribution:")
            for status, count in final_order_statuses:
                print(f"  '{status}': {count} orders")
            
            # Check for any remaining invalid values
            invalid_payment = db.session.execute(
                text("SELECT id, payment_status FROM orders WHERE payment_status NOT IN ('PENDING', 'PAID', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')")
            ).fetchall()
            
            invalid_order = db.session.execute(
                text("SELECT id, status FROM orders WHERE status NOT IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')")
            ).fetchall()
            
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print(f"Total payment_status updates: {total_payment_updates}")
            print(f"Total order status updates: {total_order_updates}")
            
            if invalid_payment:
                print(f"\n⚠️  WARNING: {len(invalid_payment)} orders still have invalid payment_status:")
                for order_id, status in invalid_payment[:10]:  # Show first 10
                    print(f"  Order {order_id}: '{status}'")
            else:
                print("\n✓ All payment_status values are now valid!")
            
            if invalid_order:
                print(f"\n⚠️  WARNING: {len(invalid_order)} orders still have invalid status:")
                for order_id, status in invalid_order[:10]:  # Show first 10
                    print(f"  Order {order_id}: '{status}'")
            else:
                print("✓ All order status values are now valid!")
            
            print("=" * 60)
            
            return not (invalid_payment or invalid_order)
                
        except Exception as e:
            print(f"\n❌ Error fixing enum data: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False
    
    return True

if __name__ == "__main__":
    success = fix_enum_data()
    if success:
        print("\n✅ Enum data fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Enum data fix failed!")
        sys.exit(1)
