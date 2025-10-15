"""
Fix PesapalTransaction order_id field to support pay-first approach
"""
import sys
import os

# Ensure the parent directory is in sys.path for relative imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.configuration.extensions import db
from sqlalchemy import text

def fix_pesapal_order_id_schema():
    """Fix the order_id field in pesapal_transactions to support string values for pay-first approach"""

    app = create_app()

    with app.app_context():
        try:
            print("=== FIXING PESAPAL TRANSACTION ORDER_ID SCHEMA ===")

            # Check current schema
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'pesapal_transactions'
                AND column_name = 'order_id'
            """)).fetchone()

            if result:
                print(f"Current order_id field: {result.column_name} - {result.data_type} - nullable: {result.is_nullable}")

            # Make order_id nullable and change to text type to support both integers and strings
            print("Making order_id nullable and changing to text type...")
            db.session.execute(text("""
                ALTER TABLE pesapal_transactions
                ALTER COLUMN order_id DROP NOT NULL
            """))

            db.session.execute(text("""
                ALTER TABLE pesapal_transactions
                ALTER COLUMN order_id TYPE TEXT
            """))

            # Add a new field for temporary order references if it doesn't exist
            print("Adding temp_order_reference field if it doesn't exist...")
            try:
                db.session.execute(text("""
                    ALTER TABLE pesapal_transactions
                    ADD COLUMN temp_order_reference TEXT
                """))
                print("Added temp_order_reference field")
            except Exception as e:
                if "already exists" in str(e):
                    print("temp_order_reference field already exists")
                else:
                    print(f"Error adding temp_order_reference: {e}")

            db.session.commit()

            # Verify the changes
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'pesapal_transactions'
                AND column_name IN ('order_id', 'temp_order_reference')
                ORDER BY column_name
            """)).fetchall()

            print("\nUpdated schema:")
            for row in result:
                print(f"  {row.column_name}: {row.data_type} - nullable: {row.is_nullable}")

            print("\n✅ Successfully fixed PesapalTransaction schema for pay-first approach")

        except Exception as e:
            print(f"❌ Error fixing schema: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    fix_pesapal_order_id_schema()
