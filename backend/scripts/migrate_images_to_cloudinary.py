"""
Migration script to move existing images to Cloudinary
"""
import os
import sys
import logging
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from models.models import Product, db
from models.product_image_model import ProductImage
from services.cloudinary_service import cloudinary_service
from app import create_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_product_images():
    """Migrate existing product images to Cloudinary"""

    app = create_app()

    with app.app_context():
        try:
            # Get all products with existing image_urls
            products = Product.query.filter(Product.image_urls.isnot(None)).all()

            logger.info(f"Found {len(products)} products with images to migrate")

            migrated_count = 0
            error_count = 0

            for product in products:
                try:
                    logger.info(f"Migrating images for product {product.id}: {product.name}")

                    # Parse existing image URLs
                    if isinstance(product.image_urls, str):
                        import json
                        try:
                            image_urls = json.loads(product.image_urls)
                        except json.JSONDecodeError:
                            image_urls = [product.image_urls] if product.image_urls else []
                    elif isinstance(product.image_urls, list):
                        image_urls = product.image_urls
                    else:
                        image_urls = []

                    if not image_urls:
                        logger.info(f"No images found for product {product.id}")
                        continue

                    # Check if already migrated
                    existing_cloudinary_images = ProductImage.query.filter_by(product_id=product.id).count()
                    if existing_cloudinary_images > 0:
                        logger.info(f"Product {product.id} already has Cloudinary images, skipping")
                        continue

                    new_image_urls = []

                    for index, image_url in enumerate(image_urls):
                        try:
                            # Skip if already a Cloudinary URL
                            if 'cloudinary.com' in image_url:
                                logger.info(f"Image {image_url} is already on Cloudinary")
                                new_image_urls.append(image_url)
                                continue

                            # Determine if it's a local file or external URL
                            if image_url.startswith(('http://', 'https://')):
                                # External URL - upload to Cloudinary
                                upload_source = image_url
                            else:
                                # Local file path
                                local_path = os.path.join(app.config.get('UPLOAD_FOLDER', 'uploads'), image_url.lstrip('/'))

                                if not os.path.exists(local_path):
                                    logger.warning(f"Local file not found: {local_path}")
                                    continue

                                upload_source = local_path

                            # Upload to Cloudinary
                            is_primary = index == 0
                            cloudinary_result = cloudinary_service.upload_product_image(
                                file=upload_source,
                                product_id=product.id,
                                is_primary=is_primary,
                                alt_text=f"{product.name} - Image {index + 1}"
                            )

                            if cloudinary_result['success']:
                                # Create database record
                                product_image = ProductImage.create_from_cloudinary_result(
                                    product_id=product.id,
                                    cloudinary_result=cloudinary_result,
                                    is_primary=is_primary,
                                    sort_order=index
                                )

                                db.session.add(product_image)
                                new_image_urls.append(cloudinary_result['secure_url'])

                                # Update product thumbnail if this is the primary image
                                if is_primary:
                                    product.thumbnail_url = cloudinary_result['secure_url']

                                logger.info(f"Successfully uploaded image {index + 1} for product {product.id}")

                            else:
                                logger.error(f"Failed to upload image {image_url}: {cloudinary_result.get('error')}")
                                error_count += 1

                        except Exception as e:
                            logger.error(f"Error processing image {image_url} for product {product.id}: {str(e)}")
                            error_count += 1

                    # Update product with new Cloudinary URLs
                    if new_image_urls:
                        product.image_urls = new_image_urls
                        db.session.commit()
                        migrated_count += 1
                        logger.info(f"Successfully migrated {len(new_image_urls)} images for product {product.id}")

                except Exception as e:
                    logger.error(f"Error migrating product {product.id}: {str(e)}")
                    db.session.rollback()
                    error_count += 1

            logger.info(f"Migration completed. Migrated: {migrated_count} products, Errors: {error_count}")

        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            db.session.rollback()

def cleanup_local_images():
    """Clean up local image files after successful migration"""

    app = create_app()

    with app.app_context():
        try:
            upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')

            if not os.path.exists(upload_folder):
                logger.info("Upload folder doesn't exist, nothing to clean up")
                return

            # Get all products that have been migrated to Cloudinary
            migrated_products = db.session.query(Product.id).join(ProductImage).distinct().all()
            migrated_product_ids = [p.id for p in migrated_products]

            logger.info(f"Found {len(migrated_product_ids)} products with Cloudinary images")

            # TODO: Implement cleanup logic based on your file naming convention
            # This is a placeholder - implement based on your specific needs

            logger.info("Local image cleanup completed")

        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Migrate images to Cloudinary')
    parser.add_argument('--migrate', action='store_true', help='Migrate images to Cloudinary')
    parser.add_argument('--cleanup', action='store_true', help='Clean up local images after migration')

    args = parser.parse_args()

    if args.migrate:
        migrate_product_images()
    elif args.cleanup:
        cleanup_local_images()
    else:
        print("Please specify --migrate or --cleanup")
