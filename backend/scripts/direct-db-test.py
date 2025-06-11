#!/usr/bin/env python3

import os
import sys
import psycopg2
from sqlalchemy import create_engine, text

def test_direct_connection():
    """Test direct connection to PostgreSQL database"""
    print("=== Testing Direct Database Connection ===")

    # Connection string from your config
    conn_str = 'postgresql://mizizzi:junior2020@localhost:5432/mizizzi'

    try:
        # Try direct psycopg2 connection first
        print("\nTesting with psycopg2:")
        conn = psycopg2.connect(
            dbname="mizizzi",
            user="mizizzi",
            password="junior2020",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"✅ Connected to PostgreSQL: {version[0]}")

        # Test creating a table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS connection_test (
                id SERIAL PRIMARY KEY,
                test_data VARCHAR(100)
            )
        """)
        conn.commit()
        print("✅ Created test table")

        # Insert data
        cur.execute("INSERT INTO connection_test (test_data) VALUES (%s)", ("Test successful",))
        conn.commit()
        print("✅ Inserted test data")

        # Query data
        cur.execute("SELECT * FROM connection_test")
        rows = cur.fetchall()
        print(f"✅ Query result: {rows}")

        # Clean up
        cur.execute("DROP TABLE connection_test")
        conn.commit()
        print("✅ Dropped test table")

        cur.close()
        conn.close()

        # Now test with SQLAlchemy
        print("\nTesting with SQLAlchemy:")
        engine = create_engine(conn_str)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print(f"✅ SQLAlchemy connection successful: {result.fetchone()}")

        return True

    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def create_env_file():
    """Create .env file with correct database URL"""
    print("\n=== Creating .env File ===")

    # Path to backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, '.env')

    # Create .env file
    with open(env_path, 'w') as f:
        f.write('DATABASE_URL=postgresql://mizizzi:junior2020@localhost:5432/mizizzi\n')
        f.write('FLASK_APP=backend\n')
        f.write('FLASK_ENV=development\n')

    print(f"✅ Created .env file at {env_path}")

def main():
    print("🔍 Direct Database Connection Test")
    print("=" * 50)

    # Test direct connection
    success = test_direct_connection()

    if success:
        print("\n🎉 Database connection is working!")
        create_env_file()
        print("\n📋 Next steps:")
        print("1. Make sure you're in the correct directory when running Flask")
        print("2. Try running Flask with: FLASK_APP=backend flask run")
        print("3. Or use: python -m backend.run")
    else:
        print("\n❌ Database connection failed")
        print("Please check your PostgreSQL installation and credentials")

if __name__ == "__main__":
    main()
