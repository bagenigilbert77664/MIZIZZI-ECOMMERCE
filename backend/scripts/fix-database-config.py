#!/usr/bin/env python3
"""
Fix database configuration for the Flask app
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create or update .env file with correct database configuration"""

    backend_dir = Path(__file__).parent.parent / 'backend'
    env_file = backend_dir / '.env'

    # Database configuration - using the mizizzi database you're connected to
    env_content = """# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/mizizzi
SQLALCHEMY_DATABASE_URI=postgresql://postgres:password@localhost:5432/mizizzi

# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=development
FLASK_DEBUG=True

# Security Keys
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=jwt-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES=3600

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email Configuration (optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Other Configuration
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
"""

    print(f"📝 Creating .env file at: {env_file}")

    with open(env_file, 'w') as f:
        f.write(env_content)

    print("✅ .env file created successfully!")
    print("\n⚠️  IMPORTANT: Update the database password in .env file")
    print("   Change 'password' to your actual PostgreSQL password")

    return str(env_file)

def test_database_connection():
    """Test database connection with the new configuration"""

    try:
        # Add backend to path
        backend_path = Path(__file__).parent.parent / 'backend'
        sys.path.insert(0, str(backend_path))

        from backend import create_app
        from app.configuration.extensions import db
        from sqlalchemy import text

        print("🔍 Testing database connection...")

        app = create_app()

        with app.app_context():
            # Test basic connection
            result = db.session.execute(text("SELECT 1"))
            row = result.fetchone()

            if row and row[0] == 1:
                print("✅ Database connection successful!")

                # Check if tables exist
                try:
                    from app.models.models import User
                    user_count = User.query.count()
                    print(f"📊 Found {user_count} users in database")

                    # Check admin user
                    admin_user = User.query.filter_by(email='REDACTED-SENDER-EMAIL').first()
                    if admin_user:
                        print(f"✅ Admin user found: {admin_user.name} (Role: {admin_user.role})")
                        return True
                    else:
                        print("⚠️  Admin user not found in database")
                        return False

                except Exception as e:
                    print(f"⚠️  Error checking tables: {e}")
                    print("💡 You may need to run database migrations")
                    return False
            else:
                print("❌ Database connection test failed")
                return False

    except Exception as e:
        print(f"❌ Error testing database connection: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Fixing database configuration...\n")

    # Create .env file
    env_file = create_env_file()

    print(f"\n📋 Next steps:")
    print(f"1. Edit {env_file}")
    print("2. Update the PostgreSQL password")
    print("3. Run the database connection test")

    # Test connection
    print("\n" + "="*50)
    test_success = test_database_connection()

    if not test_success:
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure PostgreSQL password is correct in .env")
        print("2. Check if database tables exist")
        print("3. Run database migrations if needed")

    print("\n🏁 Configuration complete!")
