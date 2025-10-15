import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_db_connection():
    """Get database connection from environment variables"""
    try:
        # Try to get from environment variables
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            return psycopg2.connect(db_url)

        # Fallback to individual components
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'mizizzi'),  # Fixed: removed leading space
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'junior2020'),
            port=os.getenv('DB_PORT', '5432')
        )
        return conn
    except Exception as e:
        print(f"[v0] Database connection error: {e}")
        return None

def fix_mpesa_id_column():
    """Fix the M-PESA transactions table ID column type from integer to UUID string"""
    print("[v0] Starting M-PESA ID column type fix...")

    conn = get_db_connection()
    if not conn:
        print("[v0] ❌ Failed to connect to database")
        return False

    try:
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("[v0] Connected to database successfully!")

        # Check current ID column type
        cursor.execute("""
            SELECT data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'mpesa_transactions' AND column_name = 'id'
        """)

        result = cursor.fetchone()
        if result:
            current_type, current_default = result
            print(f"[v0] Current ID column type: {current_type}, default: {current_default}")

            if current_type == 'integer':
                print("[v0] ID column is integer, converting to VARCHAR(36) for UUID...")

                # Step 1: Check if there are any existing records
                cursor.execute("SELECT COUNT(*) FROM mpesa_transactions")
                record_count = cursor.fetchone()[0]
                print(f"[v0] Found {record_count} existing records")

                if record_count > 0:
                    print("[v0] ⚠️  Warning: Existing records found. This will clear the table.")
                    print("[v0] Backing up existing data...")

                    # Create backup table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS mpesa_transactions_backup AS
                        SELECT * FROM mpesa_transactions
                    """)
                    print("[v0] ✅ Backup created as mpesa_transactions_backup")

                    # Clear the table
                    cursor.execute("DELETE FROM mpesa_transactions")
                    print("[v0] ✅ Cleared existing records")

                # Step 2: Drop the sequence and default
                cursor.execute("ALTER TABLE mpesa_transactions ALTER COLUMN id DROP DEFAULT")
                cursor.execute("DROP SEQUENCE IF EXISTS mpesa_transactions_id_seq CASCADE")
                print("[v0] ✅ Dropped sequence and default")

                # Step 3: Change column type to VARCHAR(36)
                cursor.execute("ALTER TABLE mpesa_transactions ALTER COLUMN id TYPE VARCHAR(36)")
                print("[v0] ✅ Changed ID column type to VARCHAR(36)")

                # Step 4: Set new default for UUID generation
                cursor.execute("""
                    ALTER TABLE mpesa_transactions
                    ALTER COLUMN id SET DEFAULT gen_random_uuid()::text
                """)
                print("[v0] ✅ Set UUID default for ID column")

                print("[v0] ✅ M-PESA ID column type fix completed successfully!")

            else:
                print(f"[v0] ID column is already {current_type}, no changes needed")

        else:
            print("[v0] ❌ mpesa_transactions table or id column not found")
            return False

        # Verify the final schema
        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'mpesa_transactions' AND column_name = 'id'
            ORDER BY ordinal_position
        """)

        print("[v0] ✅ Final ID column schema:")
        for row in cursor.fetchall():
            column_name, data_type, column_default, is_nullable = row
            print(f"[v0]   - {column_name}: {data_type} {column_default or ''} {'NULL' if is_nullable == 'YES' else 'NOT NULL'}")

        cursor.close()
        conn.close()

        print("[v0] ✅ Schema fix completed successfully!")
        return True

    except Exception as e:
        print(f"[v0] ❌ Error during schema fix: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    success = fix_mpesa_id_column()
    if not success:
        sys.exit(1)
    print("[v0] M-PESA ID column type fix completed!")
