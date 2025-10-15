#!/usr/bin/env python3
"""
Fix M-PESA Transactions Table Schema
Adds missing columns to match the MpesaTransaction model definition
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_database_url():
    """Get database URL from environment variables"""
    # Try different environment variable names
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_url = os.getenv('BACKEND_URL')
    if not db_url:
        # Construct from individual components
        host = os.getenv('DB_HOST', 'localhost')
        port = os.getenv('DB_PORT', '5432')
        name = os.getenv('DB_NAME', 'mizizzi_db')
        user = os.getenv('DB_USER', 'postgres')
        password = os.getenv('DB_PASSWORD', '')
        db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"

    return db_url

def fix_mpesa_transactions_schema():
    """Add missing columns to mpesa_transactions table"""

    db_url = get_database_url()
    print(f"[v0] Connecting to database...")

    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("[v0] Connected successfully!")

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'mpesa_transactions'
            );
        """)

        table_exists = cursor.fetchone()[0]

        if not table_exists:
            print("[v0] Creating mpesa_transactions table...")
            cursor.execute("""
                CREATE TABLE mpesa_transactions (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    user_id INTEGER REFERENCES users(id),
                    order_id VARCHAR(100),
                    transaction_type VARCHAR(50) NOT NULL,
                    checkout_request_id VARCHAR(100),
                    merchant_request_id VARCHAR(100),
                    mpesa_receipt_number VARCHAR(50),
                    transaction_id VARCHAR(100),
                    amount NUMERIC(10, 2),
                    phone_number VARCHAR(20),
                    account_reference VARCHAR(100),
                    transaction_desc VARCHAR(255),
                    description VARCHAR(255),
                    result_code VARCHAR(10),
                    result_desc VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'pending',
                    request_data JSONB,
                    response_data JSONB,
                    processed_data JSONB,
                    transaction_metadata JSONB,
                    idempotency_key VARCHAR(100) UNIQUE,
                    retry_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    mpesa_response JSONB,
                    callback_response JSONB,
                    transaction_date TIMESTAMP WITH TIME ZONE,
                    callback_received_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            print("[v0] ✅ Created mpesa_transactions table")
        else:
            print("[v0] Table exists, checking for missing columns...")

            # Get existing columns
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'mpesa_transactions'
            """)

            existing_columns = {row[0] for row in cursor.fetchall()}
            print(f"[v0] Found {len(existing_columns)} existing columns")

            # Define all required columns with their definitions
            required_columns = {
                'id': 'VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text',
                'user_id': 'INTEGER REFERENCES users(id)',
                'order_id': 'VARCHAR(100)',
                'transaction_type': 'VARCHAR(50) NOT NULL',
                'checkout_request_id': 'VARCHAR(100)',
                'merchant_request_id': 'VARCHAR(100)',
                'mpesa_receipt_number': 'VARCHAR(50)',
                'transaction_id': 'VARCHAR(100)',
                'amount': 'NUMERIC(10, 2)',
                'phone_number': 'VARCHAR(20)',
                'account_reference': 'VARCHAR(100)',
                'transaction_desc': 'VARCHAR(255)',
                'description': 'VARCHAR(255)',
                'result_code': 'VARCHAR(10)',
                'result_desc': 'VARCHAR(255)',
                'status': 'VARCHAR(50) DEFAULT \'pending\'',
                'request_data': 'JSONB',
                'response_data': 'JSONB',
                'processed_data': 'JSONB',
                'transaction_metadata': 'JSONB',
                'idempotency_key': 'VARCHAR(100) UNIQUE',
                'retry_count': 'INTEGER DEFAULT 0',
                'error_message': 'TEXT',
                'mpesa_response': 'JSONB',
                'callback_response': 'JSONB',
                'transaction_date': 'TIMESTAMP WITH TIME ZONE',
                'callback_received_at': 'TIMESTAMP WITH TIME ZONE',
                'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
                'updated_at': 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
            }

            # Add missing columns
            missing_columns = set(required_columns.keys()) - existing_columns

            if missing_columns:
                print(f"[v0] Adding {len(missing_columns)} missing columns...")

                for column in missing_columns:
                    try:
                        # Skip primary key if table already has data
                        if column == 'id' and existing_columns:
                            print(f"[v0] ⚠️  Skipping primary key column 'id' - table has existing structure")
                            continue

                        column_def = required_columns[column]
                        # Remove constraints for ALTER TABLE ADD COLUMN
                        if 'PRIMARY KEY' in column_def:
                            column_def = column_def.replace(' PRIMARY KEY DEFAULT gen_random_uuid()::text', ' DEFAULT gen_random_uuid()::text')
                        if 'UNIQUE' in column_def and 'DEFAULT' not in column_def:
                            column_def = column_def.replace(' UNIQUE', '')

                        cursor.execute(f"ALTER TABLE mpesa_transactions ADD COLUMN {column} {column_def};")
                        print(f"[v0] ✅ Added column: {column}")

                    except psycopg2.Error as e:
                        print(f"[v0] ⚠️  Column {column} might already exist or constraint failed: {e}")
                        continue
            else:
                print("[v0] ✅ All required columns already exist!")

        # Create indexes for performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_mpesa_order_id ON mpesa_transactions(order_id);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_request_id ON mpesa_transactions(checkout_request_id);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_merchant_request_id ON mpesa_transactions(merchant_request_id);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_receipt_number ON mpesa_transactions(mpesa_receipt_number);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_id ON mpesa_transactions(transaction_id);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_account_reference ON mpesa_transactions(account_reference);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_idempotency_key ON mpesa_transactions(idempotency_key);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_status ON mpesa_transactions(status);",
            "CREATE INDEX IF NOT EXISTS idx_mpesa_created_at ON mpesa_transactions(created_at);"
        ]

        print("[v0] Creating performance indexes...")
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"[v0] ✅ Created index")
            except psycopg2.Error as e:
                print(f"[v0] ⚠️  Index might already exist: {e}")

        # Verify final schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'mpesa_transactions'
            ORDER BY ordinal_position
        """)

        final_columns = cursor.fetchall()
        print(f"\n[v0] ✅ Final schema verification:")
        print(f"[v0] Total columns in mpesa_transactions: {len(final_columns)}")

        for col_name, data_type, nullable, default in final_columns:
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            default_str = f" DEFAULT {default}" if default else ""
            print(f"[v0]   - {col_name}: {data_type} {nullable_str}{default_str}")

        print(f"\n[v0] ✅ M-PESA transactions schema fix completed successfully!")
        print(f"[v0] The database now matches the MpesaTransaction model definition.")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[v0] ❌ Error fixing M-PESA schema: {e}")
        return False

    return True

if __name__ == "__main__":
    print("[v0] Starting M-PESA transactions schema fix...")
    success = fix_mpesa_transactions_schema()

    if success:
        print("[v0] ✅ Schema fix completed successfully!")
        sys.exit(0)
    else:
        print("[v0] ❌ Schema fix failed!")
        sys.exit(1)
