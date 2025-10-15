#!/usr/bin/env python3

import sys
import os
# Fix sys.path to point to the backend directory (not backend/backend)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models.models import db, Order, PaymentStatus, OrderStatus

def fix_enum_data():
    """Fix lowercase enum values in the database to match uppercase enum definitions"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Starting enum data fix...")
            
            # Fix payment_status values
            print("Fixing payment_status values...")
            
            # Update lowercase 'pending' to uppercase 'PENDING'
            result = db.session.execute(
                "UPDATE orders SET payment_status = 'PENDING' WHERE payment_status = 'pending'"
            )
            print(f"Updated {result.rowcount} payment_status records from 'pending' to 'PENDING'")
            
            # Update other common lowercase values
            lowercase_mappings = {
                'paid': 'PAID',
                'completed': 'COMPLETED', 
                'failed': 'FAILED',
                'cancelled': 'CANCELLED',
                'refunded': 'REFUNDED'
            }
            
            for lowercase, uppercase in lowercase_mappings.items():
                result = db.session.execute(
                    f"UPDATE orders SET payment_status = '{uppercase}' WHERE payment_status = '{lowercase}'"
                )
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} payment_status records from '{lowercase}' to '{uppercase}'")
            
            # Fix order status values
            print("Fixing order status values...")
            
            order_mappings = {
                'pending': 'PENDING',
                'confirmed': 'CONFIRMED',
                'processing': 'PROCESSING',
                'shipped': 'SHIPPED',
                'delivered': 'DELIVERED',
                'cancelled': 'CANCELLED'
            }
            
            for lowercase, uppercase in order_mappings.items():
                result = db.session.execute(
                    f"UPDATE orders SET status = '{uppercase}' WHERE status = '{lowercase}'"
                )
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} status records from '{lowercase}' to '{uppercase}'")
            
            # Commit all changes
            db.session.commit()
            print("Successfully fixed all enum data!")
            
            # Verify the fix
            print("\nVerifying fix...")
            orders_with_issues = db.session.execute(
                "SELECT id, payment_status, status FROM orders WHERE payment_status NOT IN ('PENDING', 'PAID', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED') OR status NOT IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')"
            ).fetchall()
            
            if orders_with_issues:
                print(f"Warning: Found {len(orders_with_issues)} orders with invalid enum values:")
                for order in orders_with_issues:
                    print(f"  Order ID {order[0]}: payment_status='{order[1]}', status='{order[2]}'")
            else:
                print("All enum values are now valid!")
                
        except Exception as e:
            print(f"Error fixing enum data: {str(e)}")
            db.session.rollback()
            return False
            
    return True

if __name__ == "__main__":
    success = fix_enum_data()
    if success:
        print("Enum data fix completed successfully!")
    else:
        print("Enum data fix failed!")
        sys.exit(1)
