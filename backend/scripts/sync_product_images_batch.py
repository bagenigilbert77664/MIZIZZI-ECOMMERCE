#!/usr/bin/env python3
"""
Batch script to sync all product images from ProductImage table to Product.image_urls field.
This ensures the frontend displays the correct Cloudinary images uploaded via admin.

Usage:
    python scripts/sync_product_images_batch.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.configuration.extensions import db
from app.models.models import Product, ProductImage
from sqlalchemy import func
from app import create_app
import json

app = create_app()

def sync_all_product_images():
    """
    Sync all product images from ProductImage table to Product.image_urls field.
    This ensures consistency between admin uploads and frontend display.
    """
    print("🔄 Starting product image synchronization...")
    print("=" * 60)
    
    try:
        with app.app_context():
            # Get all products
            products = Product.query.all()
            total_products = len(products)
            updated_count = 0
            skipped_count = 0
            error_count = 0
            
            print(f"📦 Found {total_products} products to process\n")
            
            for i, product in enumerate(products, 1):
                try:
                    # Get all images for this product from ProductImage table
                    product_images = ProductImage.query.filter_by(
                        product_id=product.id
                    ).order_by(
                        ProductImage.is_primary.desc(),
                        ProductImage.sort_order.asc(),
                        ProductImage.created_at.desc()
                    ).all()
                    
                    # Extract Cloudinary URLs
                    cloudinary_urls = [img.url for img in product_images if img.url]
                    
                    # Get current image_urls from Product
                    current_urls = product.get_image_urls() or []
                    
                    # Check if update is needed
                    if set(cloudinary_urls) != set(current_urls):
                        # Update Product.image_urls
                        product.set_image_urls(cloudinary_urls)
                        
                        # Update thumbnail_url to primary image or first image
                        if product_images:
                            primary_image = next((img for img in product_images if img.is_primary), None)
                            product.thumbnail_url = primary_image.url if primary_image else (cloudinary_urls[0] if cloudinary_urls else None)
                        else:
                            product.thumbnail_url = None
                        
                        updated_count += 1
                        print(f"✅ [{i}/{total_products}] Product #{product.id} ({product.name})")
                        print(f"   Old URLs: {len(current_urls)} images")
                        print(f"   New URLs: {len(cloudinary_urls)} images from Cloudinary")
                        if product.thumbnail_url:
                            print(f"   Primary image: {product.thumbnail_url[:50]}...")
                    else:
                        skipped_count += 1
                        if i % 10 == 0:  # Print progress every 10 products
                            print(f"⏭️  [{i}/{total_products}] Skipped {skipped_count} products (already synced)")
                    
                except Exception as e:
                    error_count += 1
                    print(f"❌ [{i}/{total_products}] Error processing product #{product.id}: {str(e)}")
                    continue
            
            # Commit all changes
            db.session.commit()
            
            print("\n" + "=" * 60)
            print("✨ Synchronization complete!")
            print(f"📊 Summary:")
            print(f"   Total products: {total_products}")
            print(f"   Updated: {updated_count}")
            print(f"   Skipped (already synced): {skipped_count}")
            print(f"   Errors: {error_count}")
            print("=" * 60)
            
            return True
    except Exception as e:
        # Ensure rollback is also inside app context
        with app.app_context():
            db.session.rollback()
        print(f"\n❌ Fatal error during synchronization: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🚀 Product Image Synchronization Tool")
    print("This will sync all product images from admin uploads to the frontend\n")
    
    # Run synchronization
    success = sync_all_product_images()
    
    if success:
        print("\n✅ All done! Your frontend will now display the correct admin-uploaded images.")
        sys.exit(0)
    else:
        print("\n❌ Synchronization failed. Please check the errors above.")
        sys.exit(1)
