#!/usr/bin/env python3

import os
import sys
import traceback
import subprocess
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def check_postgresql_service():
    """Check if PostgreSQL service is running"""
    print("=== Checking PostgreSQL Service ===")

    try:
        # Check if PostgreSQL is running (Linux/Mac)
        result = subprocess.run(['pg_isready'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ PostgreSQL service is running")
            return True
        else:
            print("❌ PostgreSQL service is not running")
            print("   Try: sudo systemctl start postgresql")
            return False
    except FileNotFoundError:
        print("❌ pg_isready command not found")
        print("   PostgreSQL might not be installed")
        return False

def test_database_connections():
    """Test various database connection strings"""
    print("\n=== Testing Database Connections ===")

    # Different connection strings to try
    connection_strings = [
        # Current configuration
        'postgresql://mizizzi:junior2020@localhost:5432/mizizzi',
        # Alternative PostgreSQL formats
        'postgresql://postgres:junior2020@localhost:5432/mizizzi',
        'postgresql://mizizzi:junior2020@localhost:5432/postgres',
        'postgresql://postgres:postgres@localhost:5432/mizizzi',
        # SQLite fallback
        'sqlite:///mizizzi.db',
        'sqlite:///app.db'
    ]

    for i, conn_str in enumerate(connection_strings, 1):
        print(f"\n{i}. Testing: {conn_str}")

        try:
            engine = create_engine(conn_str)
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                row = result.fetchone()
                if row and row[0] == 1:
                    print(f"   ✅ SUCCESS!")

                    # Test if we can create a simple table
                    try:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS test_connection (
                                id SERIAL PRIMARY KEY,
                                test_value VARCHAR(50)
                            )
                        """))
                        conn.execute(text("INSERT INTO test_connection (test_value) VALUES ('test')"))
                        conn.execute(text("DROP TABLE test_connection"))
                        conn.commit()
                        print(f"   ✅ Can create/drop tables")
                        return conn_str
                    except Exception as e:
                        print(f"   ⚠️  Connection works but can't create tables: {e}")
                        return conn_str

        except SQLAlchemyError as e:
            print(f"   ❌ Failed: {str(e)}")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")

    return None

def create_database_if_not_exists():
    """Try to create the mizizzi database if it doesn't exist"""
    print("\n=== Creating Database ===")

    try:
        # Connect to postgres database to create mizizzi database
        engine = create_engine('postgresql://postgres:junior2020@localhost:5432/postgres')

        with engine.connect() as conn:
            # Set autocommit mode
            conn.execute(text("COMMIT"))

            # Check if database exists
            result = conn.execute(text("""
                SELECT 1 FROM pg_database WHERE datname = 'mizizzi'
            """))

            if result.fetchone():
                print("✅ Database 'mizizzi' already exists")
            else:
                # Create database
                conn.execute(text("CREATE DATABASE mizizzi"))
                print("✅ Created database 'mizizzi'")

            return True

    except Exception as e:
        print(f"❌ Failed to create database: {e}")

        # Try with different credentials
        try:
            engine = create_engine('postgresql://mizizzi:junior2020@localhost:5432/postgres')
            with engine.connect() as conn:
                conn.execute(text("COMMIT"))
                result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = 'mizizzi'"))
                if result.fetchone():
                    print("✅ Database 'mizizzi' exists (using mizizzi user)")
                    return True
        except Exception as e2:
            print(f"❌ Also failed with mizizzi user: {e2}")

        return False

def create_user_if_not_exists():
    """Try to create the mizizzi user if it doesn't exist"""
    print("\n=== Creating Database User ===")

    try:
        # Connect as postgres superuser
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

        with engine.connect() as conn:
            conn.execute(text("COMMIT"))

            # Check if user exists
            result = conn.execute(text("""
                SELECT 1 FROM pg_user WHERE usename = 'mizizzi'
            """))

            if result.fetchone():
                print("✅ User 'mizizzi' already exists")
            else:
                # Create user
                conn.execute(text("""
                    CREATE USER mizizzi WITH PASSWORD 'junior2020'
                """))
                print("✅ Created user 'mizizzi'")

            # Grant privileges
            conn.execute(text("GRANT ALL PRIVILEGES ON DATABASE mizizzi TO mizizzi"))
            print("✅ Granted privileges to mizizzi user")

            return True

    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        return False

def fix_flask_app_database():
    """Fix the Flask app database configuration"""
    print("\n=== Fixing Flask App Database ===")

    # Find working connection string
    working_conn = test_database_connections()

    if not working_conn:
        print("❌ No working database connection found")
        return False

    print(f"\n✅ Working connection: {working_conn}")

    # Update environment variable
    os.environ['DATABASE_URL'] = working_conn

    # Test Flask app with new connection
    try:
        # Add backend to path
        backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)

        from backend import create_app
        from backend.configuration.extensions import db

        app = create_app()

        with app.app_context():
            # Test connection
            db.engine.execute(text("SELECT 1"))
            print("✅ Flask app database connection working!")

            # Create all tables
            db.create_all()
            print("✅ Database tables created!")

            return True

    except Exception as e:
        print(f"❌ Flask app database error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    print("🔧 Database Connection Fixer")
    print("=" * 50)

    # Step 1: Check PostgreSQL service
    pg_running = check_postgresql_service()

    if not pg_running:
        print("\n🚨 PostgreSQL is not running!")
        print("Please start PostgreSQL service first:")
        print("   sudo systemctl start postgresql")
        print("   # or")
        print("   brew services start postgresql")
        return

    # Step 2: Try to create user and database
    create_user_if_not_exists()
    create_database_if_not_exists()

    # Step 3: Test connections and fix Flask app
    success = fix_flask_app_database()

    if success:
        print("\n🎉 Database connection fixed!")
        print("You can now restart your Flask app")
    else:
        print("\n❌ Could not fix database connection")
        print("Manual steps needed:")
        print("1. Ensure PostgreSQL is running")
        print("2. Create database: createdb mizizzi")
        print("3. Create user: createuser -P mizizzi")
        print("4. Grant privileges: GRANT ALL ON DATABASE mizizzi TO mizizzi;")

if __name__ == "__main__":
    main()
