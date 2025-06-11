"""
Debug script to identify and fix server issues
"""
import os
import sys
import traceback
from flask import Flask
from flask_cors import CORS

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test all critical imports"""
    print("Testing imports...")

    try:
        from .app.configuration.extensions import db, ma, mail, cache, cors
        print("✓ Extensions imported successfully")
    except Exception as e:
        print(f"✗ Extensions import failed: {e}")
        traceback.print_exc()
        return False

    try:
        from .app.models.models import User, Product, Category, Brand
        print("✓ Models imported successfully")
    except Exception as e:
        print(f"✗ Models import failed: {e}")
        traceback.print_exc()
        return False

    try:
        from .app.routes.user.user import validation_routes
        print("✓ User routes imported successfully")
    except Exception as e:
        print(f"✗ User routes import failed: {e}")
        traceback.print_exc()
        return False

    try:
        from .app.routes.admin.admin import admin_routes
        print("✓ Admin routes imported successfully")
    except Exception as e:
        print(f"✗ Admin routes import failed: {e}")
        traceback.print_exc()
        return False

    return True

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")

    try:
        from .app.configuration.extensions import db
        from .app.models.models import User

        # Try to query the database
        user_count = User.query.count()
        print(f"✓ Database connected successfully. User count: {user_count}")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        traceback.print_exc()
        return False

def create_test_app():
    """Create a minimal test app"""
    print("\nCreating test Flask app...")

    try:
        app = Flask(__name__)

        # Basic configuration
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///test.db')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        # Enable CORS
        CORS(app, supports_credentials=True)

        # Test route
        @app.route('/api/test')
        def test_route():
            return {'status': 'success', 'message': 'Test route working'}

        print("✓ Test Flask app created successfully")
        return app
    except Exception as e:
        print(f"✗ Test Flask app creation failed: {e}")
        traceback.print_exc()
        return None

def main():
    """Main debug function"""
    print("=== MIZIZZI Backend Debug Script ===\n")

    # Check environment variables
    print("Environment variables:")
    important_vars = [
        'DATABASE_URL', 'SECRET_KEY', 'JWT_SECRET_KEY',
        'FLASK_ENV', 'FLASK_APP', 'CORS_ORIGINS'
    ]

    for var in important_vars:
        value = os.environ.get(var, 'NOT SET')
        if var in ['SECRET_KEY', 'JWT_SECRET_KEY'] and value != 'NOT SET':
            value = f"{value[:10]}..." if len(value) > 10 else "***"
        print(f"  {var}: {value}")

    print()

    # Test imports
    if not test_imports():
        print("\n❌ Import test failed. Fix import issues before proceeding.")
        return

    # Test database
    if not test_database_connection():
        print("\n❌ Database test failed. Check database configuration.")
        return

    # Create test app
    test_app = create_test_app()
    if not test_app:
        print("\n❌ Test app creation failed.")
        return

    print("\n✅ All tests passed! Backend should be working.")
    print("\nTo run the test server:")
    print("python debug_server.py --run")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Run the test server
        test_app = create_test_app()
        if test_app:
            print("Starting test server on http://localhost:5000")
            test_app.run(debug=True, port=5000)
    else:
        main()
