#!/usr/bin/env python3
"""
Fix missing first_name and last_name columns in pesapal_transactions table
"""

import sys
import os
import logging
from datetime import datetime

# Add the backend/app directory to Python path
backend_app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', 'app')
if backend_app_path not in sys.path:
    sys.path.insert(0, backend_app_path)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

def fix_pesapal_name_columns():
    """Add missing first_name and last_name columns to pesapal_transactions table"""
    try:
        # Import Flask app and database
        from app import create_app
        from app.models.models import db
        from sqlalchemy import text

        logger.info("🔧 STARTING PESAPAL NAME COLUMNS FIX")
        logger.info("=" * 60)

        # Create Flask app
        app = create_app()

        with app.app_context():
            logger.info("📊 Checking pesapal_transactions table structure...")

            # Check current table structure
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'pesapal_transactions'
                ORDER BY ordinal_position;
            """))

            existing_columns = [row[0] for row in result]
            logger.info(f"📋 Found {len(existing_columns)} existing columns")

            # Check if name columns exist
            has_first_name = 'first_name' in existing_columns
            has_last_name = 'last_name' in existing_columns

            logger.info(f"🔍 first_name column exists: {has_first_name}")
            logger.info(f"🔍 last_name column exists: {has_last_name}")

            columns_to_add = []

            # Add first_name column if missing
            if not has_first_name:
                columns_to_add.append(('first_name', 'VARCHAR(100)'))
                logger.info("➕ Will add first_name column")

            # Add last_name column if missing
            if not has_last_name:
                columns_to_add.append(('last_name', 'VARCHAR(100)'))
                logger.info("➕ Will add last_name column")

            if not columns_to_add:
                logger.info("✅ All name columns already exist!")
                return True

            # Add missing columns
            logger.info(f"🔨 Adding {len(columns_to_add)} missing columns...")

            for column_name, column_type in columns_to_add:
                try:
                    sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {column_name} {column_type};"
                    logger.info(f"📝 Executing: {sql}")
                    db.session.execute(text(sql))
                    logger.info(f"✅ Added {column_name} column successfully")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"ℹ️  Column {column_name} already exists, skipping")
                    else:
                        logger.error(f"❌ Error adding {column_name} column: {e}")
                        raise

            # Verify the additions
            logger.info("🔍 Verifying column additions...")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'pesapal_transactions'
                AND column_name IN ('first_name', 'last_name')
                ORDER BY column_name;
            """))

            verified_columns = list(result)
            logger.info(f"✅ Verified {len(verified_columns)} name columns:")
            for col in verified_columns:
                logger.info(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

            # Test a simple query to ensure everything works
            logger.info("🧪 Testing query with name columns...")
            test_result = db.session.execute(text("""
                SELECT COUNT(*) as total_count,
                       COUNT(first_name) as first_name_count,
                       COUNT(last_name) as last_name_count
                FROM pesapal_transactions;
            """))

            test_row = test_result.fetchone()
            logger.info(f"📊 Query test results:")
            logger.info(f"   - Total transactions: {test_row[0]}")
            logger.info(f"   - With first_name: {test_row[1]}")
            logger.info(f"   - With last_name: {test_row[2]}")

            logger.info("=" * 60)
            logger.info("🎉 PESAPAL NAME COLUMNS FIX COMPLETED SUCCESSFULLY!")
            logger.info("💳 Pesapal payments should now work without column errors")
            logger.info("=" * 60)

            return True

    except Exception as e:
        logger.error("=" * 60)
        logger.error("❌ PESAPAL NAME COLUMNS FIX FAILED!")
        logger.error(f"Error: {e}")
        logger.error("=" * 60)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_pesapal_name_columns()
    sys.exit(0 if success else 1)
