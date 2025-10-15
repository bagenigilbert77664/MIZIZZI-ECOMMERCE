#!/usr/bin/env python3
"""
Definitive fix for pesapal_transactions missing columns issue.
This script will forcefully add the missing first_name and last_name columns
and handle any database connection or caching issues.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.models.models import db, PesapalTransaction
from sqlalchemy import text, inspect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

def check_table_structure():
    """Check current table structure"""
    try:
        inspector = inspect(db.engine)
        columns = inspector.get_columns('pesapal_transactions')
        column_names = [col['name'] for col in columns]

        logger.info(f"🔍 Current pesapal_transactions table has {len(columns)} columns:")
        for col in columns:
            logger.info(f"   - {col['name']} ({col['type']})")

        return column_names
    except Exception as e:
        logger.error(f"❌ Error checking table structure: {e}")
        return []

def add_missing_columns():
    """Add missing first_name and last_name columns"""
    try:
        # Check current columns
        current_columns = check_table_structure()

        missing_columns = []
        if 'first_name' not in current_columns:
            missing_columns.append('first_name')
        if 'last_name' not in current_columns:
            missing_columns.append('last_name')

        if not missing_columns:
            logger.info("✅ All required columns already exist!")
            return True

        logger.info(f"🔧 Adding missing columns: {missing_columns}")

        # Add missing columns with explicit SQL
        for column in missing_columns:
            try:
                sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {column} VARCHAR(100)"
                db.session.execute(text(sql))
                logger.info(f"✅ Added column: {column}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"ℹ️  Column {column} already exists, skipping")
                else:
                    logger.error(f"❌ Error adding column {column}: {e}")
                    return False

        # Commit changes
        db.session.commit()
        logger.info("✅ All missing columns added successfully!")

        return True

    except Exception as e:
        logger.error(f"❌ Error adding missing columns: {e}")
        db.session.rollback()
        return False

def verify_schema():
    """Verify the schema is now correct"""
    try:
        # Force refresh database connection
        db.session.close()
        db.engine.dispose()

        # Check columns again
        current_columns = check_table_structure()

        required_columns = ['first_name', 'last_name']
        missing = [col for col in required_columns if col not in current_columns]

        if missing:
            logger.error(f"❌ Still missing columns: {missing}")
            return False

        # Test query to ensure columns work
        test_query = """
        SELECT id, user_id, order_id, first_name, last_name, status
        FROM pesapal_transactions
        LIMIT 1
        """

        result = db.session.execute(text(test_query))
        logger.info("✅ Test query executed successfully!")

        return True

    except Exception as e:
        logger.error(f"❌ Schema verification failed: {e}")
        return False

def restart_application_connections():
    """Restart database connections to clear any caching"""
    try:
        logger.info("🔄 Restarting database connections...")

        # Close all sessions
        db.session.close()

        # Dispose engine to force new connections
        db.engine.dispose()

        # Create new session
        db.session.commit()

        logger.info("✅ Database connections restarted!")
        return True

    except Exception as e:
        logger.error(f"❌ Error restarting connections: {e}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 STARTING DEFINITIVE PESAPAL SCHEMA FIX")
    logger.info("=" * 60)

    # Create Flask app context
    app = create_app()

    with app.app_context():
        try:
            # Step 1: Check current structure
            logger.info("📋 Step 1: Checking current table structure...")
            current_columns = check_table_structure()

            # Step 2: Add missing columns
            logger.info("🔧 Step 2: Adding missing columns...")
            if not add_missing_columns():
                logger.error("❌ Failed to add missing columns!")
                return False

            # Step 3: Restart connections
            logger.info("🔄 Step 3: Restarting database connections...")
            if not restart_application_connections():
                logger.error("❌ Failed to restart connections!")
                return False

            # Step 4: Verify schema
            logger.info("✅ Step 4: Verifying schema...")
            if not verify_schema():
                logger.error("❌ Schema verification failed!")
                return False

            logger.info("=" * 60)
            logger.info("🎉 DEFINITIVE PESAPAL SCHEMA FIX COMPLETED SUCCESSFULLY!")
            logger.info("✅ The pesapal_transactions table now has all required columns")
            logger.info("✅ Database connections have been refreshed")
            logger.info("✅ Pesapal payments should now work without column errors")

            return True

        except Exception as e:
            logger.error(f"❌ CRITICAL ERROR: {e}")
            logger.error("💡 Please check your database connection and try again")
            return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
