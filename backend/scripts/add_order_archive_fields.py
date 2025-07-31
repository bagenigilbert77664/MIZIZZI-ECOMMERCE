"""
Migration script to add archive fields to Order model
Run this script to add is_archived and archived_at fields to existing orders table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.configuration.extensions import db
from sqlalchemy import text

def add_archive_fields():
    """Add archive fields to orders table"""
    app = create_app()

    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text("PRAGMA table_info(orders)"))
            columns = [row[1] for row in result.fetchall()]

            # Add is_archived column if it doesn't exist
            if 'is_archived' not in columns:
                db.session.execute(text("ALTER TABLE orders ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
                print("Added is_archived column to orders table")
            else:
                print("is_archived column already exists")

            # Add archived_at column if it doesn't exist
            if 'archived_at' not in columns:
                db.session.execute(text("ALTER TABLE orders ADD COLUMN archived_at DATETIME"))
                print("Added archived_at column to orders table")
            else:
                print("archived_at column already exists")

            db.session.commit()
            print("Migration completed successfully!")

        except Exception as e:
            print(f"Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    add_archive_fields()
