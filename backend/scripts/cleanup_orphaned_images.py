"""
Database cleanup script to remove orphaned product images.
This script identifies and removes image records from the database
that no longer exist in Cloudinary or are marked as deleted.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Database connection parameters
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

if not DATABASE_URL:
    print("Error: DATABASE_URL or POSTGRES_URL environment variable not set")
    sys.exit(1)

def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def cleanup_orphaned_images():
    """Remove orphaned images from the database"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        print("=" * 60)
        print("PRODUCT IMAGES CLEANUP SCRIPT")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Get all product images
        cursor.execute("""
            SELECT id, product_id, filename, url, created_at
            FROM product_images
            ORDER BY product_id, created_at
        """)
        
        all_images = cursor.fetchall()
        print(f"Total images in database: {len(all_images)}")
        print()
        
        # Group images by product
        products_with_images = {}
        for img in all_images:
            product_id = img['product_id']
            if product_id not in products_with_images:
                products_with_images[product_id] = []
            products_with_images[product_id].append(img)
        
        print(f"Products with images: {len(products_with_images)}")
        print()
        
        # Display current state
        print("CURRENT STATE:")
        print("-" * 60)
        for product_id, images in products_with_images.items():
            print(f"\nProduct ID: {product_id}")
            print(f"  Number of images: {len(images)}")
            for idx, img in enumerate(images, 1):
                print(f"  {idx}. ID: {img['id']}, File: {img['filename']}")
        
        print()
        print("=" * 60)
        print("CLEANUP OPTIONS:")
        print("=" * 60)
        print("1. Remove ALL images for a specific product")
        print("2. Remove specific image by ID")
        print("3. Show products with no images")
        print("4. Exit")
        print()
        
        choice = input("Enter your choice (1-4): ").strip()
        
        if choice == "1":
            product_id = input("Enter product ID to remove all images: ").strip()
            if product_id.isdigit():
                product_id = int(product_id)
                
                # Get images for this product
                cursor.execute("""
                    SELECT id, filename FROM product_images
                    WHERE product_id = %s
                """, (product_id,))
                
                images_to_delete = cursor.fetchall()
                
                if not images_to_delete:
                    print(f"No images found for product ID {product_id}")
                else:
                    print(f"\nFound {len(images_to_delete)} images for product {product_id}:")
                    for img in images_to_delete:
                        print(f"  - ID: {img['id']}, File: {img['filename']}")
                    
                    confirm = input(f"\nAre you sure you want to delete these {len(images_to_delete)} images? (yes/no): ").strip().lower()
                    
                    if confirm == 'yes':
                        cursor.execute("""
                            DELETE FROM product_images
                            WHERE product_id = %s
                        """, (product_id,))
                        
                        conn.commit()
                        print(f"\n✓ Successfully deleted {len(images_to_delete)} images for product {product_id}")
                    else:
                        print("Deletion cancelled")
            else:
                print("Invalid product ID")
        
        elif choice == "2":
            image_id = input("Enter image ID to remove: ").strip()
            if image_id.isdigit():
                image_id = int(image_id)
                
                # Get image details
                cursor.execute("""
                    SELECT id, product_id, filename FROM product_images
                    WHERE id = %s
                """, (image_id,))
                
                image = cursor.fetchone()
                
                if not image:
                    print(f"No image found with ID {image_id}")
                else:
                    print(f"\nImage details:")
                    print(f"  ID: {image['id']}")
                    print(f"  Product ID: {image['product_id']}")
                    print(f"  Filename: {image['filename']}")
                    
                    confirm = input(f"\nAre you sure you want to delete this image? (yes/no): ").strip().lower()
                    
                    if confirm == 'yes':
                        cursor.execute("""
                            DELETE FROM product_images
                            WHERE id = %s
                        """, (image_id,))
                        
                        conn.commit()
                        print(f"\n✓ Successfully deleted image {image_id}")
                    else:
                        print("Deletion cancelled")
            else:
                print("Invalid image ID")
        
        elif choice == "3":
            # Find products with no images
            cursor.execute("""
                SELECT p.id, p.name, p.sku
                FROM products p
                LEFT JOIN product_images pi ON p.id = pi.product_id
                WHERE pi.id IS NULL
                ORDER BY p.id
            """)
            
            products_no_images = cursor.fetchall()
            
            if not products_no_images:
                print("All products have at least one image")
            else:
                print(f"\nProducts with NO images: {len(products_no_images)}")
                print("-" * 60)
                for product in products_no_images:
                    print(f"ID: {product['id']}, Name: {product['name']}, SKU: {product['sku']}")
        
        elif choice == "4":
            print("Exiting...")
        
        else:
            print("Invalid choice")
        
        print()
        print("=" * 60)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
    except Exception as e:
        conn.rollback()
        print(f"Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    cleanup_orphaned_images()
