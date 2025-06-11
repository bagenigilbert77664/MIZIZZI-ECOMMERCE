"""
Script to fix common server issues
"""
import os
import sys
import subprocess
from pathlib import Path

def setup_environment():
    """Setup environment variables"""
    print("Setting up environment variables...")

    env_file = Path('.env')
    if not env_file.exists():
        print("Creating .env file...")
        env_content = """
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production

# Database Configuration
DATABASE_URL=sqlite:///mizizzi.db

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email Configuration (optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Brevo API (optional)
BREVO_API_KEY=your-brevo-api-key

# Other Configuration
ITEMS_PER_PAGE=12
LOW_STOCK_THRESHOLD=5
"""
        with open('.env', 'w') as f:
            f.write(env_content.strip())
        print("✓ .env file created")
    else:
        print("✓ .env file already exists")

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")

    requirements = [
        'flask',
        'flask-sqlalchemy',
        'flask-migrate',
        'flask-cors',
        'flask-jwt-extended',
        'flask-mail',
        'marshmallow',
        'flask-marshmallow',
        'marshmallow-sqlalchemy',
        'python-dotenv',
        'email-validator',
        'werkzeug',
        'python-slugify',
        'requests'
    ]

    for req in requirements:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', req])
            print(f"✓ Installed {req}")
        except subprocess.CalledProcessError:
            print(f"✗ Failed to install {req}")

def create_database():
    """Create database tables"""
    print("Creating database tables...")

    try:
        # Import after dependencies are installed
        from flask import Flask
        from .app.configuration.extensions import db
        from .app.models import models  # Import the models module

        app = Flask(__name__)
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///mizizzi.db')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        db.init_app(app)

        with app.app_context():
            db.create_all()
            print("✓ Database tables created")

    except Exception as e:
        print(f"✗ Database creation failed: {e}")

def fix_imports():
    """Fix common import issues"""
    print("Fixing import issues...")

    # Create __init__.py files if missing
    init_files = [
        'backend/__init__.py',
        'backend/routes/__init__.py',
        'backend/routes/user/__init__.py',
        'backend/routes/admin/__init__.py',
        'backend/models/__init__.py',
        'backend/configuration/__init__.py',
        'backend/schemas/__init__.py',
        'backend/validations/__init__.py'
    ]

    for init_file in init_files:
        init_path = Path(init_file)
        if not init_path.exists():
            init_path.parent.mkdir(parents=True, exist_ok=True)
            init_path.touch()
            print(f"✓ Created {init_file}")

def main():
    """Main fix function"""
    print("=== MIZIZZI Backend Fix Script ===\n")

    # Change to backend directory
    os.chdir(Path(__file__).parent)

    # Setup environment
    setup_environment()

    # Fix imports
    fix_imports()

    # Install dependencies
    install_dependencies()

    # Create database
    create_database()

    print("\n✅ Backend fix completed!")
    print("\nNext steps:")
    print("1. Update the .env file with your actual configuration")
    print("2. Run: python debug_server.py to test")
    print("3. Run: python app.py to start the server")

if __name__ == "__main__":
    main()
