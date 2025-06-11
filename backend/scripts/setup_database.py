#!/usr/bin/env python
"""
Database setup script for Mizizzi E-commerce platform.
This script creates the database and tables if they don't exist.
"""
import os
import sys
import logging
from pathlib import Path

# Add the parent directory to the path so we can import the application
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_database():
    """Set up the database and create tables."""
    try:
        # Import the application and database
        from backend import create_app
        from backend.configuration.extensions import db

        # Create the application
        app = create_app()

        # Log the database URI (with password masked)
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', 'Not configured')
        if db_uri != 'Not configured':
            # Mask password in connection string if present
            parts = db_uri.split('@')
            if len(parts) > 1:
                auth_parts = parts[0].split(':')
                if len(auth_parts) > 2:
                    # Format: dialect+driver://username:password@host:port/database
                    masked_uri = f"{auth_parts[0]}:{auth_parts[1]}:****@{parts[1]}"
                    db_uri = masked_uri

        logger.info(f"Using database: {db_uri}")

        # Create the database tables
        with app.app_context():
            db.create_all()
            logger.info("Database tables created successfully")

            # Test the connection
            result = db.session.execute('SELECT 1').scalar()
            logger.info(f"Database connection test: {result}")

        return True
    except Exception as e:
        logger.error(f"Error setting up database: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting database setup...")
    success = setup_database()
    if success:
        logger.info("Database setup completed successfully")
        sys.exit(0)
    else:
        logger.error("Database setup failed")
        sys.exit(1)
