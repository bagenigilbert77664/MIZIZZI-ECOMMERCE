import os
import sys

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask_migrate import Migrate, init, migrate, upgrade
from backend import create_app
from app.configuration.extensions import db

# Create the Flask app
app = create_app()

# Configure the app context
with app.app_context():
    # Initialize migrations
    migrate_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'migrations')
    migrate_instance = Migrate(app, db)

    # Check if migrations directory exists
    if not os.path.exists(migrate_dir):
        print("Initializing migrations directory...")
        init(migrate_dir)

    # Create a migration
    print("Creating migration...")
    migrate(message="Initial migration")

    # Apply the migration
    print("Applying migration...")
    upgrade()

    # Create all tables directly as a fallback
    print("Creating all tables directly...")
    db.create_all()

    print("Database initialization complete!")
