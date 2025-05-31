"""
Debug script to check ProductImage model and find 'position' references
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.models import ProductImage, db
import traceback

app = create_app()

with app.app_context():
    try:
        # Check ProductImage model attributes
        print("=== ProductImage Model Attributes ===")
        image_instance = ProductImage()
        attrs = [attr for attr in dir(image_instance) if not attr.startswith('_')]
        print("Available attributes:", attrs)

        # Check if 'position' exists
        has_position = hasattr(ProductImage, 'position')
        has_sort_order = hasattr(ProductImage, 'sort_order')

        print(f"Has 'position' attribute: {has_position}")
        print(f"Has 'sort_order' attribute: {has_sort_order}")

        # Try to query ProductImage table
        print("\n=== Querying ProductImage table ===")
        try:
            count = ProductImage.query.count()
            print(f"Total ProductImage records: {count}")

            if count > 0:
                first_image = ProductImage.query.first()
                print(f"First image attributes: {first_image.__dict__}")
        except Exception as e:
            print(f"Error querying ProductImage table: {e}")
            traceback.print_exc()

        # Check table schema
        print("\n=== ProductImage Table Schema ===")
        try:
            inspector = db.inspect(db.engine)
            columns = inspector.get_columns('product_images')
            print("Columns in product_images table:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
        except Exception as e:
            print(f"Error inspecting table schema: {e}")

    except Exception as e:
        print(f"Error in debug script: {e}")
        traceback.print_exc()
