"""
Script to sync product images from ProductImage table to Product.image_urls field.
This ensures that images uploaded via admin Cloudinary interface are displayed on the frontend.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.configuration.extensions import db
from app.models.models import Product, ProductImage
from app import create_app

import json

app = create_app()

def sync_all_product_images():
    """Sync all product images from ProductImage table to Product.image_urls"""
    with app.app_context():
        print("🔄 Starting product image synchronization...")
        print("=" * 60)
        
        # Get all products
        products = Product.query.all()
        total_products = len(products)
        synced_count = 0
        error_count = 0
        
        print(f"📦 Found {total_products} products to process\n")
        
        for product in products:
            try:
                # Get all images for this product from ProductImage table
                product_images = ProductImage.query.filter_by(
                    product_id=product.id
                ).order_by(
                    ProductImage.is_primary.desc(),
                    ProductImage.sort_order.asc(),
                    ProductImage.created_at.desc()
                ).all()
                
                if not product_images:
                    print(f"⚠️  Product #{product.id} ({product.name}): No images in ProductImage table")
                    continue
                
                # Extract URLs from ProductImage records
                cloudinary_urls = [img.url for img in product_images if img.url]
                
                # Get current image_urls from Product
                current_urls = product.get_image_urls() if hasattr(product, 'get_image_urls') else []
                
                # Check if sync is needed
                if set(cloudinary_urls) == set(current_urls):
                    print(f"✅ Product #{product.id} ({product.name}): Already in sync ({len(cloudinary_urls)} images)")
                    continue
                
                # Update Product.image_urls with Cloudinary URLs
                if hasattr(product, 'set_image_urls'):
                    product.set_image_urls(cloudinary_urls)
                else:
                    product.image_urls = json.dumps(cloudinary_urls)
                
                # Update thumbnail_url with primary image
                primary_image = next((img for img in product_images if img.is_primary), None)
                if primary_image:
                    product.thumbnail_url = primary_image.url
                elif cloudinary_urls:
                    product.thumbnail_url = cloudinary_urls[0]
                
                db.session.add(product)
                synced_count += 1
                
                print(f"🔄 Product #{product.id} ({product.name}):")
                print(f"   - Old URLs: {len(current_urls)} images")
                print(f"   - New URLs: {len(cloudinary_urls)} images from Cloudinary")
                print(f"   - Primary: {product.thumbnail_url}")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Error syncing product #{product.id}: {str(e)}")
                continue
        
        # Commit all changes
        try:
            db.session.commit()
            print("\n" + "=" * 60)
            print(f"✅ Synchronization complete!")
            print(f"   - Total products: {total_products}")
            print(f"   - Synced: {synced_count}")
            print(f"   - Errors: {error_count}")
            print(f"   - Skipped (already in sync): {total_products - synced_count - error_count}")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Failed to commit changes: {str(e)}")
            return False
        
if __name__ == "__main__":
    success = sync_all_product_images()
    sys.exit(0 if success else 1)
if __name__ == "__main__":
    success = sync_all_product_images()
    sys.exit(0 if success else 1)
