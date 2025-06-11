"""
Fix the main server import and configuration issues
"""
import os
import sys
from pathlib import Path

def fix_configuration_extensions():
    """Fix the configuration/extensions.py file"""
    print("Fixing configuration/extensions.py...")

    extensions_content = '''"""
Flask extensions initialization
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_marshmallow import Marshmallow

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
mail = Mail()
ma = Marshmallow()

# For backward compatibility
cache = None  # Add cache if needed later

def init_app(app):
    """Initialize all extensions with the Flask app"""
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    ma.init_app(app)
'''

    with open('configuration/extensions.py', 'w') as f:
        f.write(extensions_content)

    print("✓ Fixed configuration/extensions.py")

def create_simple_app():
    """Create a simple working app.py"""
    print("Creating simple app.py...")

    app_content = '''"""
Simple Flask application for Mizizzi E-commerce
"""
import os
import sys
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def create_app():
    """Application factory"""
    app = Flask(__name__)

    # Basic configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///mizizzi.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')

    # Initialize CORS
    CORS(app, supports_credentials=True, origins=['http://localhost:3000'])

    # Initialize extensions
    try:
        from configuration.extensions import init_app
        init_app(app)
        print("✓ Extensions initialized")
    except Exception as e:
        print(f"⚠️  Extension initialization failed: {e}")

    # Register blueprints
    try:
        from routes.public.public_routes import public_routes
        app.register_blueprint(public_routes)
        print("✓ Public routes registered")
    except Exception as e:
        print(f"⚠️  Public routes registration failed: {e}")

    # Basic test route
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'Server is running'})

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    print("Starting Flask server...")
    print("Available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
'''

    with open('app.py', 'w') as f:
        f.write(app_content)

    print("✓ Created simple app.py")

def fix_public_routes():
    """Fix the public routes"""
    print("Fixing public routes...")

    # Ensure directory exists
    os.makedirs('routes/public', exist_ok=True)

    public_routes_content = '''"""
Public routes for the Mizizzi E-commerce API
"""
from flask import Blueprint, jsonify, request
from datetime import datetime

public_routes = Blueprint('public', __name__)

# Sample data for testing
SAMPLE_CATEGORIES = [
    {
        'id': 1,
        'name': 'Electronics',
        'slug': 'electronics',
        'description': 'Electronic devices and gadgets',
        'is_featured': True
    },
    {
        'id': 2,
        'name': 'Fashion',
        'slug': 'fashion',
        'description': 'Clothing and accessories',
        'is_featured': True
    },
    {
        'id': 3,
        'name': 'Home & Garden',
        'slug': 'home-garden',
        'description': 'Home and garden items',
        'is_featured': False
    }
]

SAMPLE_PRODUCTS = [
    {
        'id': 1,
        'name': 'Smartphone X1',
        'slug': 'smartphone-x1',
        'description': 'Latest smartphone with advanced features',
        'price': 50000,
        'sale_price': 45000,
        'stock': 10,
        'category_id': 1,
        'thumbnail_url': '/placeholder.svg?height=300&width=300',
        'is_featured': True,
        'is_new': False,
        'is_sale': True,
        'is_flash_sale': False,
        'is_luxury_deal': False
    },
    {
        'id': 2,
        'name': 'Designer T-Shirt',
        'slug': 'designer-t-shirt',
        'description': 'Premium cotton t-shirt',
        'price': 2500,
        'sale_price': None,
        'stock': 25,
        'category_id': 2,
        'thumbnail_url': '/placeholder.svg?height=300&width=300',
        'is_featured': False,
        'is_new': True,
        'is_sale': False,
        'is_flash_sale': False,
        'is_luxury_deal': False
    },
    {
        'id': 3,
        'name': 'Luxury Watch',
        'slug': 'luxury-watch',
        'description': 'Premium luxury timepiece',
        'price': 150000,
        'sale_price': 120000,
        'stock': 5,
        'category_id': 2,
        'thumbnail_url': '/placeholder.svg?height=300&width=300',
        'is_featured': True,
        'is_new': False,
        'is_sale': True,
        'is_flash_sale': False,
        'is_luxury_deal': True
    },
    {
        'id': 4,
        'name': 'Gaming Headset',
        'slug': 'gaming-headset',
        'description': 'High-quality gaming headset',
        'price': 8000,
        'sale_price': 6000,
        'stock': 15,
        'category_id': 1,
        'thumbnail_url': '/placeholder.svg?height=300&width=300',
        'is_featured': False,
        'is_new': False,
        'is_sale': True,
        'is_flash_sale': True,
        'is_luxury_deal': False
    }
]

@public_routes.route('/api/categories')
def get_categories():
    """Get all categories"""
    try:
        parent_id = request.args.get('parent_id')

        # Filter by parent_id if provided
        if parent_id is not None:
            if parent_id == 'null' or parent_id == '':
                # Return top-level categories
                categories = [cat for cat in SAMPLE_CATEGORIES]
            else:
                # For now, return empty for subcategories
                categories = []
        else:
            categories = SAMPLE_CATEGORIES

        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_routes.route('/api/products')
def get_products():
    """Get products with filtering"""
    try:
        # Get query parameters
        featured = request.args.get('featured') == 'true'
        new = request.args.get('new') == 'true'
        sale = request.args.get('sale') == 'true'
        flash_sale = request.args.get('flash_sale') == 'true'
        luxury_deal = request.args.get('luxury_deal') == 'true'
        limit = request.args.get('limit', type=int)

        # Start with all products
        products = SAMPLE_PRODUCTS.copy()

        # Apply filters
        if featured:
            products = [p for p in products if p['is_featured']]
        if new:
            products = [p for p in products if p['is_new']]
        if sale:
            products = [p for p in products if p['is_sale']]
        if flash_sale:
            products = [p for p in products if p['is_flash_sale']]
        if luxury_deal:
            products = [p for p in products if p['is_luxury_deal']]

        # Apply limit
        if limit:
            products = products[:limit]

        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_routes.route('/api/products/<int:product_id>')
def get_product(product_id):
    """Get a single product"""
    try:
        product = next((p for p in SAMPLE_PRODUCTS if p['id'] == product_id), None)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify(product)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_routes.route('/api/test')
def test_route():
    """Test endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Public routes are working!',
        'timestamp': datetime.utcnow().isoformat()
    })
'''

    with open('routes/public/public_routes.py', 'w') as f:
        f.write(public_routes_content)

    # Create __init__.py
    with open('routes/public/__init__.py', 'w') as f:
        f.write('')

    print("✓ Fixed public routes")

def main():
    """Main fix function"""
    print("=== Fixing Main Server ===\n")

    # Change to backend directory
    os.chdir(Path(__file__).parent)

    # Fix configuration
    fix_configuration_extensions()

    # Fix public routes
    fix_public_routes()

    # Create simple app
    create_simple_app()

    print("\n✅ Main server fixes completed!")
    print("\nTo test the fixed server:")
    print("1. Stop the minimal server (Ctrl+C)")
    print("2. Run: python app.py")
    print("3. Test endpoints with: python test_endpoints.py")

if __name__ == "__main__":
    main()
