#!/usr/bin/env python3
"""
Fix PesapalTransaction schema by adding missing order_id column
and ensuring proper foreign key relationships.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.configuration.extensions import db
from sqlalchemy import text, inspect
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
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

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    try:
        inspector = inspect(db.engine)
        columns = inspector.get_columns(table_name)
        column_names = [col['name'] for col in columns]
        return column_name in column_names
    except Exception as e:
        logger.error(f"Error checking column {column_name} in table {table_name}: {e}")
        return False

def check_columns_exist(table_name, column_names):
    """Check if all columns exist in a table"""
    try:
        inspector = inspect(db.engine)
        columns = inspector.get_columns(table_name)
        existing_column_names = {col['name'] for col in columns}
        return all(col in existing_column_names for col in column_names)
    except Exception as e:
        logger.error(f"Error checking columns {column_names} in table {table_name}: {e}")
        return False

def fix_pesapal_transactions_schema():
    """Fix the pesapal_transactions table schema"""

    logger.info("=== FIXING PESAPAL TRANSACTIONS SCHEMA ===")

    try:
        # Check if pesapal_transactions table exists
        if not check_table_exists('pesapal_transactions'):
            logger.info("Creating pesapal_transactions table...")

            # Create the table with all required columns
            create_table_sql = """
            CREATE TABLE pesapal_transactions (
                id VARCHAR(36) PRIMARY KEY,
                user_id INTEGER NOT NULL,
                order_id INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'KES',
                email VARCHAR(100) NOT NULL,
                phone_number VARCHAR(15),
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                description VARCHAR(100),
                pesapal_tracking_id VARCHAR(100) UNIQUE,
                merchant_reference VARCHAR(100) UNIQUE,
                payment_url VARCHAR(500),
                callback_url VARCHAR(500),
                notification_id VARCHAR(100),
                payment_method VARCHAR(50),
                card_type VARCHAR(50),
                last_four_digits VARCHAR(4),
                pesapal_receipt_number VARCHAR(50),
                status VARCHAR(20) NOT NULL DEFAULT 'initiated',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                transaction_date TIMESTAMP,
                callback_received_at TIMESTAMP,
                expires_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                last_status_check TIMESTAMP,
                idempotency_key VARCHAR(64) UNIQUE,
                retry_count INTEGER DEFAULT 0,
                error_message VARCHAR(500),
                pesapal_response TEXT,
                callback_response TEXT,
                status_response TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );
            """

            try:
                db.session.execute(text(create_table_sql))
                db.session.commit()
                logger.info("✅ Created pesapal_transactions table")
            except Exception as e:
                logger.error(f"❌ Failed to create pesapal_transactions table: {e}")
                db.session.rollback()
                return False

        else:
            logger.info("pesapal_transactions table exists, checking columns...")

            # Check if order_id column exists
            if not check_column_exists('pesapal_transactions', 'order_id'):
                logger.info("Adding missing order_id column...")

                # Add the order_id column
                add_column_sql = """
                ALTER TABLE pesapal_transactions
                ADD COLUMN order_id INTEGER NOT NULL DEFAULT 0;
                """
                try:
                    db.session.execute(text(add_column_sql))
                    db.session.commit()
                    logger.info("✅ Added order_id column")
                except Exception as e:
                    logger.error(f"❌ Failed to add order_id column: {e}")
                    db.session.rollback()
                    return False

                # Add foreign key constraint
                try:
                    add_fk_sql = """
                    ALTER TABLE pesapal_transactions
                    ADD CONSTRAINT fk_pesapal_order_id
                    FOREIGN KEY (order_id) REFERENCES orders(id);
                    """
                    db.session.execute(text(add_fk_sql))
                    db.session.commit()
                    logger.info("✅ Added foreign key constraint for order_id")
                except Exception as e:
                    logger.warning(f"Could not add foreign key constraint: {e}")
                    db.session.rollback()
                    # Not fatal, continue

            else:
                logger.info("✅ order_id column already exists")

        # Only proceed to create indexes if schema changes succeeded
        logger.info("Creating indexes...")

        index_definitions = [
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_user_status ON pesapal_transactions(user_id, status);",
                "columns": ["user_id", "status"]
            },
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_order_status ON pesapal_transactions(order_id, status);",
                "columns": ["order_id", "status"]
            },
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_tracking_id ON pesapal_transactions(pesapal_tracking_id);",
                "columns": ["pesapal_tracking_id"]
            },
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_merchant_ref ON pesapal_transactions(merchant_reference);",
                "columns": ["merchant_reference"]
            },
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_created_at ON pesapal_transactions(created_at);",
                "columns": ["created_at"]
            },
            {
                "sql": "CREATE INDEX IF NOT EXISTS idx_pesapal_email ON pesapal_transactions(email);",
                "columns": ["email"]
            }
        ]

        for index_def in index_definitions:
            if check_columns_exist('pesapal_transactions', index_def["columns"]):
                try:
                    db.session.execute(text(index_def["sql"]))
                    db.session.commit()
                except Exception as e:
                    logger.warning(f"Could not create index: {e}\n\n[SQL: {index_def['sql']}]")
                    db.session.rollback()
            else:
                logger.warning(f"Skipping index creation: columns {index_def['columns']} do not exist in pesapal_transactions")

        logger.info("✅ Created performance indexes")

        # Verify the fix
        logger.info("Verifying schema fix...")
        if check_column_exists('pesapal_transactions', 'order_id'):
            logger.info("✅ SCHEMA FIX SUCCESSFUL - order_id column exists")
            return True
        else:
            logger.error("❌ SCHEMA FIX FAILED - order_id column still missing")
            return False

    except Exception as e:
        logger.error(f"❌ Error fixing pesapal_transactions schema: {e}")
        db.session.rollback()
        return False

def main():
    """Main function to run the schema fix"""

    # Create Flask app context
    app = create_app()

    with app.app_context():
        logger.info("Starting Pesapal transactions schema fix...")

        success = fix_pesapal_transactions_schema()

        if success:
            logger.info("🎉 PESAPAL TRANSACTIONS SCHEMA FIX COMPLETED SUCCESSFULLY!")
            logger.info("The order_id column has been added and the foreign key relationship is established.")
            logger.info("You can now process Pesapal payments without database errors.")
        else:
            logger.error("💥 SCHEMA FIX FAILED!")
            logger.error("Please check the error messages above and try again.")
            sys.exit(1)

if __name__ == "__main__":
    main()
