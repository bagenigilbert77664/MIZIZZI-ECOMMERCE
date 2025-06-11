#!/usr/bin/env python3

import os
import subprocess
import sys

def setup_postgresql():
    """Quick PostgreSQL setup for development"""
    print("🚀 Quick PostgreSQL Setup")
    print("=" * 30)

    commands = [
        # Start PostgreSQL service
        "sudo systemctl start postgresql",

        # Create database
        "sudo -u postgres createdb mizizzi",

        # Create user with password
        "sudo -u postgres psql -c \"CREATE USER mizizzi WITH PASSWORD 'junior2020';\"",

        # Grant privileges
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE mizizzi TO mizizzi;\"",

        # Alternative: Grant superuser (for development)
        "sudo -u postgres psql -c \"ALTER USER mizizzi CREATEDB;\""
    ]

    for cmd in commands:
        print(f"\nRunning: {cmd}")
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ Success")
            else:
                print(f"⚠️  Warning: {result.stderr}")
        except Exception as e:
            print(f"❌ Error: {e}")

    print("\n✅ PostgreSQL setup complete!")
    print("Database URL: postgresql://mizizzi:junior2020@localhost:5432/mizizzi")

def setup_sqlite_fallback():
    """Setup SQLite as fallback"""
    print("\n🔄 Setting up SQLite fallback")

    # Set environment variable
    os.environ['DATABASE_URL'] = 'sqlite:///mizizzi.db'

    try:
        # Add backend to path
        backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)

        from backend import create_app
        from backend.configuration.extensions import db

        app = create_app()

        with app.app_context():
            db.create_all()
            print("✅ SQLite database created!")

        return True

    except Exception as e:
        print(f"❌ SQLite setup failed: {e}")
        return False

if __name__ == "__main__":
    choice = input("Choose setup:\n1. PostgreSQL\n2. SQLite (fallback)\nEnter choice (1 or 2): ")

    if choice == "1":
        setup_postgresql()
    elif choice == "2":
        setup_sqlite_fallback()
    else:
        print("Invalid choice")
