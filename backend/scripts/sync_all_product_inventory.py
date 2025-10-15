#!/usr/bin/env python3
"""
Script to sync all product inventory records with product stock quantities
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models.models import db, Product, Inventory
from sqlalchemy import text

def sync_all_inventory():
    """Sync all product inventory records"""
    app = create_app()

    with app.app_context():
        try:
            print("🔄 SYNCING ALL PRODUCT INVENTORY")
            print("=" * 50)

            # Get all active products
            products = Product.query.filter_by(is_active=True).all()
            print(f"Found {len(products)} active products")

            created_count = 0
            updated_count = 0

            for product in products:
                # Check if inventory record exists
                inventory = Inventory.query.filter_by(product_id=product.id, variant_id=None).first()

                if inventory:
                    # Update existing inventory
                    if inventory.stock_level != product.stock_quantity:
                        print(f"📦 Updating {product.name} (ID: {product.id}): {inventory.stock_level} → {product.stock_quantity}")
                        inventory.stock_level = product.stock_quantity
                        inventory.update_status()
                        updated_count += 1
                else:
                    # Create new inventory record
                    print(f"📦 Creating inventory for {product.name} (ID: {product.id}): {product.stock_quantity} units")
                    inventory = Inventory(
                        product_id=product.id,
                        variant_id=None,
                        stock_level=product.stock_quantity,
                        reserved_quantity=0,
                        reorder_level=5,
                        low_stock_threshold=5,
                        sku=product.sku,
                        status='active' if product.stock_quantity > 0 else 'out_of_stock'
                    )
                    db.session.add(inventory)
                    created_count += 1

            # Commit all changes
            db.session.commit()

            print(f"\n✅ SYNC COMPLETED:")
            print(f"   Created: {created_count} inventory records")
            print(f"   Updated: {updated_count} inventory records")
            print(f"   Total processed: {len(products)} products")

            # Verify herman shoes specifically
            herman_inventory = Inventory.query.filter_by(product_id=1274, variant_id=None).first()
            if herman_inventory:
                print(f"\n🔍 Herman Shoes Verification:")
                print(f"   Stock Level: {herman_inventory.stock_level}")
                print(f"   Available: {herman_inventory.available_quantity}")
                print(f"   Status: {herman_inventory.status}")
                print(f"   In Stock: {herman_inventory.is_in_stock()}")

        except Exception as e:
            print(f"❌ Error syncing inventory: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    sync_all_inventory()
