"""
Add missing payment_url column to pesapal_transactions table
"""
import os
import sys
import psycopg2
from psycopg2 import sql

def add_payment_url_column():
    """Add payment_url column to pesapal_transactions table"""

    # Database connection parameters
    db_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'database': os.getenv('DB_NAME', 'mizizzi_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': os.getenv('DB_PORT', '5432')
    }

    conn = None
    cursor = None

    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()

        # Check if column already exists
        print("Checking if payment_url column exists...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'pesapal_transactions'
            AND column_name = 'payment_url'
        """)

        if cursor.fetchone():
            print("✅ payment_url column already exists!")
            return

        # Add the payment_url column
        print("Adding payment_url column to pesapal_transactions table...")
        cursor.execute("""
            ALTER TABLE pesapal_transactions
            ADD COLUMN payment_url VARCHAR(500)
        """)

        # Commit the changes
        conn.commit()
        print("✅ Successfully added payment_url column!")

        # Verify the column was added
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'pesapal_transactions'
            AND column_name = 'payment_url'
        """)

        result = cursor.fetchone()
        if result:
            print(f"✅ Verified: payment_url column added with type {result[1]}({result[2]})")
        else:
            print("❌ Error: Column was not added successfully")

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        if conn is not None:
            conn.rollback()
        sys.exit(1)

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    print("=== Adding payment_url column to pesapal_transactions table ===")
    add_payment_url_column()
    print("=== Migration completed ===")
