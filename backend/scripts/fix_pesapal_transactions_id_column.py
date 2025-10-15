#!/usr/bin/env python3
"""
Fix Pesapal Transactions Table ID Column Schema
===============================================

This script fixes the pesapal_transactions table ID column to use UUID/String type
instead of INTEGER to support UUID-based transaction IDs.

The error was:
invalid input syntax for type integer: "e470afa2-550d-47be-8e43-18bbc3fb08ce"

This happens because the backend generates UUID strings for transaction IDs,
but the database column is defined as INTEGER.
"""

import os
import sys
import logging
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app import create_app
    from app.configuration.extensions import db
    from sqlalchemy import text, inspect
    from sqlalchemy.exc import SQLAlchemyError
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        return table_name in tables
    except Exception as e:
        logger.error(f"Error checking if table {table_name} exists: {e}")
        return False

def get_column_info(table_name, column_name):
    """Get information about a specific column"""
    try:
        inspector = inspect(db.engine)
        columns = inspector.get_columns(table_name)
        for col in columns:
            if col['name'] == column_name:
                return col
        return None
    except Exception as e:
        logger.error(f"Error getting column info for {table_name}.{column_name}: {e}")
        return None

def fix_pesapal_transactions_schema():
    """Fix the pesapal_transactions table schema"""

    logger.info("🔧 FIXING PESAPAL TRANSACTIONS TABLE SCHEMA")
    logger.info("=" * 50)

    try:
        # Check if table exists
        if not check_table_exists('pesapal_transactions'):
            logger.info("✅ pesapal_transactions table doesn't exist - will be created with correct schema")
            return True

        # Check current ID column type
        id_column = get_column_info('pesapal_transactions', 'id')
        if not id_column:
            logger.error("❌ Could not find 'id' column in pesapal_transactions table")
            return False

        logger.info(f"📊 Current ID column type: {id_column['type']}")

        # Check if it's already the correct type
        column_type_str = str(id_column['type']).upper()
        if 'VARCHAR' in column_type_str or 'TEXT' in column_type_str or 'UUID' in column_type_str:
            logger.info("✅ ID column is already string/UUID type - no changes needed")
            return True

        # If it's INTEGER, we need to fix it
        if 'INTEGER' in column_type_str or 'INT' in column_type_str:
            logger.info("🔄 ID column is INTEGER type - needs to be changed to VARCHAR")

            # Check if there are any existing records
            result = db.session.execute(text("SELECT COUNT(*) FROM pesapal_transactions"))
            record_count = result.scalar()

            if record_count > 0:
                logger.warning(f"⚠️  Found {record_count} existing records in pesapal_transactions")
                logger.info("🗑️  Backing up and clearing existing records...")

                # Create backup table
                db.session.execute(text("""
                    CREATE TABLE IF NOT EXISTS pesapal_transactions_backup AS
                    SELECT * FROM pesapal_transactions
                """))

                # Clear the table
                db.session.execute(text("DELETE FROM pesapal_transactions"))
                db.session.commit()
                logger.info("✅ Existing records backed up and cleared")

            # Drop and recreate the table with correct schema
            logger.info("🔄 Recreating pesapal_transactions table with correct schema...")

            db.session.execute(text("DROP TABLE IF EXISTS pesapal_transactions CASCADE"))

            # Create table with correct schema
            create_table_sql = """
            CREATE TABLE pesapal_transactions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER,
                order_id INTEGER,
                amount DECIMAL(10,2),
                currency VARCHAR(3) DEFAULT 'KES',
                email VARCHAR(255),
                phone_number VARCHAR(20),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                description TEXT,
                pesapal_tracking_id VARCHAR(255),
                merchant_reference VARCHAR(255) UNIQUE,
                payment_url TEXT,
                callback_url TEXT,
                notification_id VARCHAR(255),
                payment_method VARCHAR(50),
                card_type VARCHAR(50),
                last_four_digits VARCHAR(4),
                pesapal_receipt_number VARCHAR(255),
                status VARCHAR(50) DEFAULT 'initiated',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                transaction_date TIMESTAMP WITH TIME ZONE,
                callback_received_at TIMESTAMP WITH TIME ZONE,
                expires_at TIMESTAMP WITH TIME ZONE,
                cancelled_at TIMESTAMP WITH TIME ZONE,
                last_status_check TIMESTAMP WITH TIME ZONE,
                idempotency_key VARCHAR(255),
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                pesapal_response JSONB,
                callback_response JSONB,
                status_response JSONB
            )
            """

            db.session.execute(text(create_table_sql))

            # Create indexes for better performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_user_id ON pesapal_transactions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_order_id ON pesapal_transactions(order_id)",
                "CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_status ON pesapal_transactions(status)",
                "CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_created_at ON pesapal_transactions(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_merchant_ref ON pesapal_transactions(merchant_reference)"
            ]

            for index_sql in indexes:
                db.session.execute(text(index_sql))

            db.session.commit()
            logger.info("✅ pesapal_transactions table recreated with VARCHAR(255) ID column")

        else:
            logger.info(f"ℹ️  Unknown column type: {column_type_str}")
            return False

        return True

    except SQLAlchemyError as e:
        logger.error(f"❌ Database error: {e}")
        db.session.rollback()
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        db.session.rollback()
        return False

def verify_schema_fix():
    """Verify that the schema fix was successful"""
    logger.info("\n🔍 VERIFYING SCHEMA FIX")
    logger.info("=" * 30)

    try:
        # Check table exists
        if not check_table_exists('pesapal_transactions'):
            logger.error("❌ pesapal_transactions table not found")
            return False

        # Check ID column type
        id_column = get_column_info('pesapal_transactions', 'id')
        if not id_column:
            logger.error("❌ ID column not found")
            return False

        column_type_str = str(id_column['type']).upper()
        logger.info(f"📊 ID column type: {column_type_str}")

        if 'VARCHAR' in column_type_str or 'TEXT' in column_type_str:
            logger.info("✅ ID column is now string type - schema fix successful!")

            # Test inserting a UUID
            test_uuid = "test-uuid-12345"
            test_sql = """
                INSERT INTO pesapal_transactions (id, user_id, order_id, amount, status)
                VALUES (:id, 1, 1, 100.00, 'test')
            """
            db.session.execute(text(test_sql), {'id': test_uuid})

            # Clean up test record
            db.session.execute(text("DELETE FROM pesapal_transactions WHERE id = :id"), {'id': test_uuid})
            db.session.commit()

            logger.info("✅ UUID insertion test successful!")
            return True
        else:
            logger.error(f"❌ ID column is still wrong type: {column_type_str}")
            return False

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        db.session.rollback()
        return False

def main():
    """Main function"""
    logger.info("🚀 PESAPAL TRANSACTIONS SCHEMA FIX")
    logger.info("=" * 50)
    logger.info(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Create Flask app
    app = create_app()

    with app.app_context():
        try:
            # Test database connection
            db.session.execute(text('SELECT 1'))
            logger.info("✅ Database connection successful")

            # Fix the schema
            if fix_pesapal_transactions_schema():
                logger.info("✅ Schema fix completed successfully")

                # Verify the fix
                if verify_schema_fix():
                    logger.info("🎉 SCHEMA FIX SUCCESSFUL!")
                    logger.info("💳 Pesapal payments should now work correctly")
                else:
                    logger.error("❌ Schema verification failed")
                    return False
            else:
                logger.error("❌ Schema fix failed")
                return False

        except Exception as e:
            logger.error(f"❌ Fatal error: {e}")
            return False
        finally:
            db.session.close()

    logger.info("=" * 50)
    logger.info(f"⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
