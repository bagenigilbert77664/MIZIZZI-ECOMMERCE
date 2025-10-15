#!/usr/bin/env python3
"""
Script to check orders for user 2156 and debug the orders endpoint issue.
"""

import sys
import os
# Fix sys.path so 'app' can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.configuration.extensions import db
from app.models.models import Order, OrderItem, User, Product
from sqlalchemy import text

def check_user_orders():
    """Check orders for user 2156."""
    app = create_app()

    with app.app_context():
        print("=== Checking User 2156 Orders ===")

        # Check if user exists
        user = User.query.get(2156)
        if user:
            print(f"✅ User found: ID {user.id}, Name: {user.name}, Email: {user.email}")
        else:
            print("❌ User 2156 not found")
            return

        # Print all distinct status values for this user's orders
        print("\n=== Distinct Status Values for User 2156 Orders ===")
        status_query = text("""
            SELECT DISTINCT status FROM orders WHERE user_id = 2156
        """)
        result = db.session.execute(status_query)
        statuses = [row[0] for row in result]
        print(f"Statuses found: {statuses}")

        # Try to fetch orders, but skip those with invalid status values
        print("\n📦 Attempting to fetch orders for user 2156 (skipping invalid status rows):")
        valid_orders = []
        for status in statuses:
            try:
                # Normalize status to uppercase for enum matching
                normalized_status = status.upper() if isinstance(status, str) else status
                orders = Order.query.filter_by(user_id=2156, status=normalized_status).all()
                valid_orders.extend(orders)
            except (LookupError, ValueError) as e:
                print(f"⚠️  Skipping orders with status '{status}': {e}")

        print(f"\n📦 Found {len(valid_orders)} orders for user 2156 (with valid status):")

        for order in valid_orders:
            print(f"  - Order #{order.order_number} (ID: {order.id})")
            print(f"    Status: {order.status}")
            print(f"    Payment Status: {order.payment_status}")
            print(f"    Total: KSh {order.total_amount:,.2f}")
            print(f"    Created: {order.created_at}")
            print(f"    Items: {len(order.items)}")

            # Check order items
            for item in order.items:
                product = Product.query.get(item.product_id)
                product_name = product.name if product else f"Product ID {item.product_id}"
                print(f"      • {product_name} x{item.quantity} @ KSh {item.price:,.2f}")
            print()

        # Test the to_dict() method
        if valid_orders:
            print("=== Testing to_dict() method ===")
            try:
                order = valid_orders[0]
                print(f"Order.to_dict method: {getattr(order, 'to_dict', None)}")
                order_dict = order.to_dict()
                print("✅ Order to_dict() works")

                # Test items to_dict()
                for item in order.items:
                    print(f"OrderItem.to_dict method: {getattr(item, 'to_dict', None)}")
                    item_dict = item.to_dict()
                    print("✅ OrderItem to_dict() works")
                    break

            except Exception as e:
                print(f"❌ to_dict() error: {str(e)}")
                print(f"Error type: {type(e).__name__}")
                print(f"Order object type: {type(order)}")
                # Print a cleaned dict for debugging
                clean_dict = {k: v for k, v in order.__dict__.items() if not k.startswith('_sa_')}
                print("Order (cleaned __dict__):")
                for k, v in clean_dict.items():
                    # Avoid printing large or unserializable objects
                    if isinstance(v, list):
                        print(f"  {k}: [list of {len(v)} items]")
                    elif isinstance(v, dict):
                        print(f"  {k}: {{...dict...}}")
                    else:
                        print(f"  {k}: {v}")
                print("# Review your Order.to_dict() implementation: do not use SQLAlchemy internals like loaded_attrs.")

        # Check order statuses in database
        print("\n=== Order Status Distribution ===")
        status_query = text("""
            SELECT status, COUNT(*) as count
            FROM orders
            WHERE user_id = 2156
            GROUP BY status
        """)

        result = db.session.execute(status_query)
        for row in result:
            print(f"  {row[0]}: {row[1]} orders")

        # --- Product Summary Section ---
        print("\n=== Product Summary for User 2156 Orders ===")
        product_summary = {}
        for order in valid_orders:
            for item in order.items:
                product = Product.query.get(item.product_id)
                product_name = product.name if product else f"Product ID {item.product_id}"
                if product_name not in product_summary:
                    product_summary[product_name] = {"quantity": 0, "total_value": 0.0}
                product_summary[product_name]["quantity"] += item.quantity
                product_summary[product_name]["total_value"] += item.price * item.quantity

        print(f"{'Product':40} {'Qty':>5} {'Total Value (KSh)':>20}")
        print("-" * 70)
        for name, stats in sorted(product_summary.items(), key=lambda x: x[1]["total_value"], reverse=True):
            print(f"{name:40} {stats['quantity']:>5} {stats['total_value']:>20,.2f}")

if __name__ == "__main__":
    check_user_orders()
