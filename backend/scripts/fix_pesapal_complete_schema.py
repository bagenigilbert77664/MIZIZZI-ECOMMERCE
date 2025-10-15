#!/usr/bin/env python3
"""
Complete Pesapal Transactions Schema Fix
Adds all missing columns to match the model definition including card_type and last_four_digits
"""

import sys
import os
import logging
from datetime import datetime

# Add the backend directory to Python path (not backend/app)
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.abspath(backend_path))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info("Starting complete Pesapal transactions schema fix...")
        logger.info("=== FIXING COMPLETE PESAPAL TRANSACTIONS SCHEMA ===")

        # Import after path setup
        from app import create_app, db
        from sqlalchemy import text, inspect

        # Create app and get database connection
        app = create_app()

        with app.app_context():
            # Check if table exists
            inspector = inspect(db.engine)
            if 'pesapal_transactions' not in inspector.get_table_names():
                logger.error("❌ pesapal_transactions table does not exist!")
                return False

            logger.info("pesapal_transactions table exists, checking all columns...")

            # Get current columns
            current_columns = {col['name']: col for col in inspector.get_columns('pesapal_transactions')}
            logger.info(f"Current columns: {list(current_columns.keys())}")

            # Define required columns based on the model
            required_columns = {
                'id': 'VARCHAR(36) PRIMARY KEY',
                'user_id': 'INTEGER NOT NULL',
                'order_id': 'VARCHAR(50) NOT NULL',  # Changed to VARCHAR to match model
                'amount': 'DECIMAL(10,2) NOT NULL',
                'currency': 'VARCHAR(3) NOT NULL DEFAULT "KES"',
                'email': 'VARCHAR(100) NOT NULL',
                'phone_number': 'VARCHAR(15)',
                'first_name': 'VARCHAR(50)',
                'last_name': 'VARCHAR(50)',
                'description': 'VARCHAR(100)',
                'pesapal_tracking_id': 'VARCHAR(100)',
                'merchant_reference': 'VARCHAR(100)',
                'payment_url': 'VARCHAR(500)',
                'callback_url': 'VARCHAR(500)',
                'notification_id': 'VARCHAR(100)',
                'payment_method': 'VARCHAR(50)',
                'card_type': 'VARCHAR(50)',  # Added missing column
                'last_four_digits': 'VARCHAR(4)',  # Added missing column
                'pesapal_receipt_number': 'VARCHAR(50)',
                'status': 'VARCHAR(20) NOT NULL DEFAULT "initiated"',
                'created_at': 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
                'transaction_date': 'TIMESTAMP',
                'callback_received_at': 'TIMESTAMP',
                'expires_at': 'TIMESTAMP',
                'cancelled_at': 'TIMESTAMP',
                'last_status_check': 'TIMESTAMP',
                'idempotency_key': 'VARCHAR(64)',
                'retry_count': 'INTEGER DEFAULT 0',
                'error_message': 'VARCHAR(500)',
                'pesapal_response': 'TEXT',
                'callback_response': 'TEXT',
                'status_response': 'TEXT'
            }

            # Add missing columns
            missing_columns = []
            for col_name, col_def in required_columns.items():
                if col_name not in current_columns:
                    missing_columns.append((col_name, col_def))

            if missing_columns:
                logger.info(f"Adding {len(missing_columns)} missing columns...")
                for col_name, col_def in missing_columns:
                    try:
                        # Handle different column types appropriately
                        if col_name == 'id':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} VARCHAR(36)"
                        elif col_name == 'user_id':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} INTEGER NOT NULL DEFAULT 0"
                        elif col_name == 'order_id':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} VARCHAR(50) NOT NULL DEFAULT ''"
                        elif col_name == 'amount':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} DECIMAL(10,2) NOT NULL DEFAULT 0.00"
                        elif col_name == 'email':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} VARCHAR(100) NOT NULL DEFAULT ''"
                        elif col_name == 'status':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} VARCHAR(20) NOT NULL DEFAULT 'initiated'"
                        elif col_name == 'currency':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} VARCHAR(3) NOT NULL DEFAULT 'KES'"
                        elif col_name == 'created_at':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
                        elif col_name in ['transaction_date', 'callback_received_at', 'expires_at', 'cancelled_at', 'last_status_check']:
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} TIMESTAMP"
                        elif col_name == 'retry_count':
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} INTEGER DEFAULT 0"
                        elif col_name in ['card_type', 'last_four_digits']:  # Handle new card columns
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} {col_def.split(' DEFAULT')[0]}"
                        elif 'VARCHAR' in col_def:
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} {col_def.split(' DEFAULT')[0]}"
                        elif 'TEXT' in col_def:
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} TEXT"
                        elif 'DECIMAL' in col_def:
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} {col_def}"
                        else:
                            sql = f"ALTER TABLE pesapal_transactions ADD COLUMN {col_name} {col_def}"

                        db.session.execute(text(sql))
                        logger.info(f"✅ Added column: {col_name}")
                    except Exception as e:
                        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                            logger.info(f"✅ Column {col_name} already exists")
                        else:
                            logger.error(f"❌ Failed to add column {col_name}: {e}")

                db.session.commit()
                logger.info("✅ All missing columns added")
            else:
                logger.info("✅ All required columns already exist")

            # Add foreign key constraints
            logger.info("Adding foreign key constraints...")
            try:
                # Check if foreign keys exist
                foreign_keys = inspector.get_foreign_keys('pesapal_transactions')
                fk_names = [fk['name'] for fk in foreign_keys if fk['name']]

                if not any('order_id' in str(fk) for fk in foreign_keys):
                    try:
                        db.session.execute(text("""
                            ALTER TABLE pesapal_transactions
                            ADD CONSTRAINT fk_pesapal_order_id
                            FOREIGN KEY (order_id) REFERENCES orders(id)
                        """))
                        logger.info("✅ Added order_id foreign key")
                    except Exception as e:
                        logger.warning(f"Could not add order_id foreign key: {e}")
                else:
                    logger.info("✅ order_id foreign key already exists")

                if not any('user_id' in str(fk) for fk in foreign_keys):
                    try:
                        db.session.execute(text("""
                            ALTER TABLE pesapal_transactions
                            ADD CONSTRAINT fk_pesapal_user_id
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        """))
                        logger.info("✅ Added user_id foreign key")
                    except Exception as e:
                        logger.warning(f"Could not add user_id foreign key: {e}")
                else:
                    logger.info("✅ user_id foreign key already exists")

                db.session.commit()
            except Exception as e:
                logger.warning(f"Foreign key constraint warning: {e}")

            # Create performance indexes
            logger.info("Creating performance indexes...")
            indexes_to_create = [
                ("idx_pesapal_user_status", "user_id, status"),
                ("idx_pesapal_order_status", "order_id, status"),
                ("idx_pesapal_tracking_id", "pesapal_tracking_id"),
                ("idx_pesapal_merchant_ref", "merchant_reference"),
                ("idx_pesapal_email", "email"),
                ("idx_pesapal_status", "status"),
                ("idx_pesapal_created_at", "created_at")
            ]

            for index_name, columns in indexes_to_create:
                try:
                    db.session.execute(text(f"""
                        CREATE INDEX IF NOT EXISTS {index_name}
                        ON pesapal_transactions ({columns})
                    """))
                    logger.info(f"✅ Created index: {index_name}")
                except Exception as e:
                    logger.warning(f"Index creation warning for {index_name}: {e}")

            db.session.commit()
            logger.info("✅ Created performance indexes")

            # Final verification
            logger.info("Verifying complete schema fix...")
            # Re-instantiate inspector to get updated columns
            inspector = inspect(db.engine)
            updated_columns = {col['name']: col for col in inspector.get_columns('pesapal_transactions')}

            missing_after_fix = []
            for required_col in required_columns.keys():
                if required_col not in updated_columns:
                    missing_after_fix.append(required_col)

            if missing_after_fix:
                logger.error(f"❌ Still missing columns: {missing_after_fix}")
                return False
            else:
                logger.info("✅ COMPLETE SCHEMA FIX SUCCESSFUL - All columns exist")
                logger.info(f"Total columns: {len(updated_columns)}")
                logger.info(f"Column names: {list(updated_columns.keys())}")

                # Verify the problematic columns that were causing errors
                critical_columns = ['card_type', 'last_four_digits', 'order_id', 'pesapal_tracking_id']
                for col in critical_columns:
                    if col in updated_columns:
                        logger.info(f"✅ Critical column '{col}' is present")
                    else:
                        logger.error(f"❌ Critical column '{col}' is missing")

        logger.info("🎉 PESAPAL TRANSACTIONS COMPLETE SCHEMA FIX COMPLETED SUCCESSFULLY!")
        logger.info("All required columns including card_type and last_four_digits have been added.")
        logger.info("The database is now ready for Pesapal payments without schema errors.")
        return True

    except Exception as e:
        logger.error(f"❌ Schema fix failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
