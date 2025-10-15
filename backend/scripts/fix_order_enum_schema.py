#!/usr/bin/env python3
"""
Database migration script to fix PostgreSQL enum types for order status fields.
This script will drop the existing enum types and recreate the columns as VARCHAR
to match the application's string-based enum handling.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, backend_dir)

def get_database_url():
    """Get database URL from environment variables"""
    # Try different possible environment variable names
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_url = os.getenv('POSTGRES_URL')
    if not db_url:
        db_url = os.getenv('DB_URL')

    if not db_url:
        # Construct from individual components
        host = os.getenv('DB_HOST', 'localhost')
        port = os.getenv('DB_PORT', '5432')
        name = os.getenv('DB_NAME', 'mizizzi')
        user = os.getenv('DB_USER', 'mizizzi')
        password = os.getenv('DB_PASSWORD', 'junior2020')

        db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"

    return db_url

def fix_order_enum_schema():
    """Fix the order status enum schema to use VARCHAR instead of PostgreSQL enums"""

    db_url = get_database_url()
    print(f"[v0] Connecting to database...")

    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("[v0] Connected successfully!")

        # Check if orders table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'orders'
            );
        """)

        table_exists = cursor.fetchone()[0]
        if not table_exists:
            print("[v0] Orders table does not exist. Nothing to fix.")
            return

        print("[v0] Orders table found. Checking current schema...")

        # Get current column information
        cursor.execute("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'orders'
            AND column_name IN ('status', 'payment_status');
        """)

        columns = cursor.fetchall()
        print(f"[v0] Current column types: {columns}")

        # Check if we need to fix the schema
        needs_fix = False
        for column_name, data_type, udt_name in columns:
            if data_type == 'USER-DEFINED' or 'enum' in udt_name.lower():
                needs_fix = True
                print(f"[v0] Column {column_name} uses enum type {udt_name}, needs fixing")

        if not needs_fix:
            print("[v0] Schema is already correct (using VARCHAR). No changes needed.")
            return

        print("[v0] Starting schema migration...")

        # Step 1: Add temporary columns
        print("[v0] Step 1: Adding temporary VARCHAR columns...")
        cursor.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS status_temp VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_status_temp VARCHAR(50);
        """)

        # Step 2: Copy data to temporary columns
        print("[v0] Step 2: Copying data to temporary columns...")
        cursor.execute("""
            UPDATE orders
            SET status_temp = status::text,
                payment_status_temp = payment_status::text;
        """)

        # Step 3: Drop original columns
        print("[v0] Step 3: Dropping original enum columns...")
        cursor.execute("""
            ALTER TABLE orders
            DROP COLUMN IF EXISTS status CASCADE,
            DROP COLUMN IF EXISTS payment_status CASCADE;
        """)

        # Step 4: Rename temporary columns
        print("[v0] Step 4: Renaming temporary columns...")
        cursor.execute("""
            ALTER TABLE orders
            RENAME COLUMN status_temp TO status;

            ALTER TABLE orders
            RENAME COLUMN payment_status_temp TO payment_status;
        """)

        # Step 5: Add constraints and defaults
        print("[v0] Step 5: Adding constraints and defaults...")
        cursor.execute("""
            ALTER TABLE orders
            ALTER COLUMN status SET NOT NULL,
            ALTER COLUMN status SET DEFAULT 'pending',
            ALTER COLUMN payment_status SET NOT NULL,
            ALTER COLUMN payment_status SET DEFAULT 'pending';
        """)

        # Step 6: Add check constraints for valid values
        print("[v0] Step 6: Validating data before adding check constraints...")

        valid_status = ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
        valid_payment_status = ('pending', 'paid', 'failed', 'refunded', 'cancelled')

        # Check for invalid status values
        cursor.execute(f"""
            SELECT id, status FROM orders
            WHERE status IS NOT NULL AND status NOT IN {valid_status};
        """)
        invalid_status_rows = cursor.fetchall()
        if invalid_status_rows:
            print("[v0] ❌ Error: Found orders with invalid status values:")
            for row in invalid_status_rows:
                print(f"    id={row[0]}, status={row[1]}")
            print("[v0] Aborting migration. Please fix these rows before retrying.")
            return

        # Check for invalid payment_status values
        cursor.execute(f"""
            SELECT id, payment_status FROM orders
            WHERE payment_status IS NOT NULL AND payment_status NOT IN {valid_payment_status};
        """)
        invalid_payment_status_rows = cursor.fetchall()
        if invalid_payment_status_rows:
            print("[v0] ❌ Error: Found orders with invalid payment_status values:")
            for row in invalid_payment_status_rows:
                print(f"    id={row[0]}, payment_status={row[1]}")
            print("[v0] Aborting migration. Please fix these rows before retrying.")
            return

        print("[v0] No invalid status or payment_status values found. Adding check constraints...")

        cursor.execute("""
            ALTER TABLE orders
            ADD CONSTRAINT check_order_status
            CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));

            ALTER TABLE orders
            ADD CONSTRAINT check_payment_status
            CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
        """)

        # Step 7: Clean up any remaining enum types
        print("[v0] Step 7: Cleaning up enum types...")
        try:
            cursor.execute("DROP TYPE IF EXISTS orderstatus CASCADE;")
            cursor.execute("DROP TYPE IF EXISTS paymentstatus CASCADE;")
            print("[v0] Dropped enum types successfully")
        except Exception as e:
            print(f"[v0] Note: Could not drop enum types (they may not exist): {e}")

        # Verify the changes
        print("[v0] Verifying schema changes...")
        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'orders'
            AND column_name IN ('status', 'payment_status')
            ORDER BY column_name;
        """)

        result = cursor.fetchall()
        print("[v0] New schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (default: {row[2]}, nullable: {row[3]})")

        print("[v0] ✅ Schema migration completed successfully!")
        print("[v0] Orders table now uses VARCHAR columns for status fields")
        print("[v0] This should resolve the enum type mismatch errors")

    except psycopg2.OperationalError as e:
        if "no password supplied" in str(e):
            print("[v0] ❌ Error: No password supplied for PostgreSQL connection.")
            print("[v0] Hint: Set the DB_PASSWORD environment variable (or DATABASE_URL/POSTGRES_URL/DB_URL with password) and try again.")
            return  # Exit gracefully, do not raise
        else:
            print(f"[v0] ❌ Error during migration: {e}")
            raise
    except Exception as e:
        print(f"[v0] ❌ Error during migration: {e}")
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("[v0] Starting PostgreSQL enum schema migration...")
    fix_order_enum_schema()
    print("[v0] Migration completed!")
