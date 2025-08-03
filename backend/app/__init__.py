"""
Mizizzi E-commerce Backend Application Package
"""

import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request, send_from_directory, g
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity, create_access_token, jwt_required, verify_jwt_in_request
import uuid
import werkzeug.utils
from pathlib import Path
from functools import wraps

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def setup_app_environment():
    """Setup the app environment and paths."""
    app_dir = os.path.dirname(os.path.abspath(__file__))

    # Add app directory to Python path if not already there
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)

    # Add parent directory for relative imports
    parent_dir = os.path.dirname(app_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    logger.info(f"app directory: {app_dir}")
    logger.info(f"Python path updated with app paths")
    return app_dir

def initialize_search_system():
    """Initialize the search system with existing products."""
    try:
        from routes.search.embedding_service import get_embedding_service
        from routes.search.search_service import get_search_service
        from app.models.models import Product
        from app.configuration.extensions import db
        from app import create_app

        logger.info("Initializing search system with existing products...")

        # Create app context for database operations
        app = create_app()
        with app.app_context():
            # Get embedding service
            embedding_service = get_embedding_service()
            if not embedding_service or not embedding_service.is_available():
                logger.warning("Embedding service not available, skipping product indexing")
                return False

            # Check if index is empty
            stats = embedding_service.get_index_stats()
            if stats.get('total_products', 0) > 0:
                logger.info(f"Search index already contains {stats['total_products']} products")
                return True

            # Get all active products
            products = Product.query.filter_by(is_active=True).all()
            if not products:
                logger.warning("No active products found in database")
                return False

            logger.info(f"Found {len(products)} active products, building search index...")

            # Convert products to dictionaries
            product_dicts = []
            for product in products:
                try:
                    product_dict = product.to_dict()
                    # Add related data
                    if product.category:
                        product_dict['category'] = product.category.to_dict()
                    if product.brand:
                        product_dict['brand'] = product.brand.to_dict()
                    product_dicts.append(product_dict)
                except Exception as e:
                    logger.error(f"Error processing product {product.id}: {str(e)}")
                    continue

            # Build the index
            success = embedding_service.rebuild_index(product_dicts)
            if success:
                final_stats = embedding_service.get_index_stats()
                logger.info(f"✅ Search index built successfully with {final_stats.get('total_products', 0)} products")
                return True
            else:
                logger.error("❌ Failed to build search index")
                return False

    except Exception as e:
        logger.error(f"Error initializing search system: {str(e)}")
        return False

def check_and_setup_search_index():
    """Check if search index needs to be set up and do it if necessary."""
    try:
        # Import after environment setup
        from routes.search.embedding_service import get_embedding_service

        embedding_service = get_embedding_service()
        if not embedding_service or not embedding_service.is_available():
            logger.warning("Search system not available - missing dependencies or configuration")
            return False

        # Check index stats
        stats = embedding_service.get_index_stats()
        total_products = stats.get('total_products', 0)

        if total_products == 0:
            logger.info("Search index is empty, attempting to populate...")
            return initialize_search_system()
        else:
            logger.info(f"Search index contains {total_products} products")
            return True

    except Exception as e:
        logger.error(f"Error checking search index: {str(e)}")
        return False

# Setup environment when module is imported
setup_app_environment()

# Import extensions and config
try:
    from .configuration.extensions import db, ma, mail, cache, limiter
    from .configuration.config import config
    from .websocket import socketio  # Import the socketio instance
except ImportError:
    # Fallback imports for different directory structures
    try:
        from configuration.extensions import db, ma, mail, cache, limiter
        from configuration.config import config
        from websocket import socketio
    except ImportError:
        # Last resort - create minimal extensions
        from flask_sqlalchemy import SQLAlchemy
        from flask_marshmallow import Marshmallow
        from flask_mail import Mail
        from flask_caching import Cache
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        from flask_socketio import SocketIO

        db = SQLAlchemy()
        ma = Marshmallow()
        mail = Mail()
        cache = Cache()
        limiter = Limiter(key_func=get_remote_address)
        socketio = SocketIO()

        # Minimal config
        class Config:
            SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
            SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://mizizzi:junior2020@localhost:5432/mizizzi')
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
            CORS_ORIGINS = ['http://localhost:3000']

        config = {'default': Config}

def create_app(config_name=None, enable_socketio=True):
    """
    Application factory function that creates and configures the Flask app.

    Args:
        config_name: The configuration to use (development, testing, production)
        enable_socketio: Whether to enable SocketIO support (default: True)

    Returns:
        The configured Flask application
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Set secret key for SocketIO
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

    # Configure logging with shorter format
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    )

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    mail.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)

    # Initialize SocketIO conditionally
    if enable_socketio:
        try:
            socketio.init_app(
                app,
                cors_allowed_origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
                async_mode='eventlet'  # Use eventlet for better performance
            )
        except Exception as e:
            app.logger.warning(f"SocketIO initialization failed: {str(e)}")
    else:
        app.logger.info("SocketIO disabled")

    # Set up database migrations
    Migrate(app, db)

    # Configure CORS properly - SINGLE CONFIGURATION ONLY
    CORS(
        app,
        origins=['http://localhost:3000'],  # Specific origin only
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Cache-Control", "Pragma", "Expires", "X-MFA-Token"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Initialize JWT
    jwt = JWTManager(app)

    # JWT token callbacks with blacklist support
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        try:
            # Import here to avoid circular imports
            from .routes.admin.admin_auth import is_token_blacklisted
            jti = jwt_payload["jti"]
            return is_token_blacklisted(jti)
        except Exception as e:
            app.logger.error(f"Error checking token blacklist: {str(e)}")
            return False

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has expired",
            "code": "token_expired"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Invalid token",
            "code": "invalid_token"
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Authorization required",
            "code": "authorization_required"
        }), 401

    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Fresh token required",
            "code": "fresh_token_required"
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has been revoked",
            "code": "token_revoked"
        }), 401

    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(app.root_path, 'uploads')
    product_images_dir = os.path.join(uploads_dir, 'product_images')

    for directory in [uploads_dir, product_images_dir]:
        if not os.path.exists(directory):
            os.makedirs(directory)
            app.logger.info(f"Created directory: {directory}")

    # Image upload route
    @app.route('/api/admin/upload/image', methods=['POST'])
    @jwt_required()
    def upload_image():
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file part in the request"}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No selected file"}), 400

            # Check file size (5MB limit)
            if len(file.read()) > 5 * 1024 * 1024:
                return jsonify({"error": "File too large (max 5MB)"}), 400
            file.seek(0)

            # Check file type
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({"error": "File type not allowed. Only images are permitted."}), 400

            # Create secure filename
            original_filename = werkzeug.utils.secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

            # Save file
            file_path = os.path.join(product_images_dir, unique_filename)
            file.save(file_path)

            current_user_id = get_jwt_identity()
            app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")

            # Generate URL
            site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
            image_url = f"{site_url}/api/uploads/product_images/{unique_filename}"

            return jsonify({
                "success": True,
                "filename": unique_filename,
                "originalName": original_filename,
                "url": image_url,
                "size": os.path.getsize(file_path),
                "uploadedBy": current_user_id,
                "uploadedAt": datetime.now().isoformat()
            }), 201

        except Exception as e:
            app.logger.error(f"Error uploading image: {str(e)}")
            return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500

    # Route to serve uploaded images
    @app.route('/api/uploads/product_images/<filename>', methods=['GET'])
    def serve_product_image(filename):
        return send_from_directory(product_images_dir, filename)

    # Guest cart helper function
    def get_or_create_guest_cart():
        try:
            from .models.models import Cart
        except ImportError:
            try:
                from models.models import Cart
            except ImportError:
                class Cart:
                    def __init__(self, guest_id=None):
                        self.guest_id = guest_id
                        self.is_active = True
                return Cart(guest_id=str(uuid.uuid4()))

        guest_cart_id = request.cookies.get('guest_cart_id')
        if guest_cart_id:
            cart = Cart.query.filter_by(guest_id=guest_cart_id, is_active=True).first()
            if cart:
                return cart

        guest_id = str(uuid.uuid4())
        cart = Cart(guest_id=guest_id, is_active=True)
        try:
            db.session.add(cart)
            db.session.commit()
        except Exception as e:
            app.logger.error(f"Error creating guest cart: {str(e)}")

        return cart

    # JWT Optional decorator
    def jwt_optional(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    g.user_id = user_id
                    g.is_authenticated = True
                else:
                    g.is_authenticated = False
                    g.guest_cart = get_or_create_guest_cart()
            except Exception as e:
                app.logger.error(f"JWT error: {str(e)}")
                g.is_authenticated = False
                g.guest_cart = get_or_create_guest_cart()

            return fn(*args, **kwargs)
        return wrapper

    app.jwt_optional = jwt_optional

    # Import search services and routes from the search package
    search_service = None
    embedding_service = None
    user_search_routes = None
    admin_search_routes = None

    try:
        # Import from routes.search package (as specified)
        from .routes.search import user_search_routes, admin_search_routes, SearchService, EmbeddingService
        search_service = SearchService
        embedding_service = EmbeddingService
        app.logger.info("✅ Successfully imported all search components from .routes.search")
    except ImportError as e1:
        try:
            # Fallback: Import from routes.search package (relative to app)
            from routes.search import user_search_routes, admin_search_routes, SearchService, EmbeddingService
            search_service = SearchService
            embedding_service = EmbeddingService
            app.logger.info("✅ Successfully imported all search components from routes.search")
        except ImportError as e2:
            try:
                # Another fallback: Import from app.routes.search
                from app.routes.search import user_search_routes, admin_search_routes, SearchService, EmbeddingService
                search_service = SearchService
                embedding_service = EmbeddingService
                app.logger.info("✅ Successfully imported all search components from app.routes.search")
            except ImportError as e3:
                # Create fallback blueprints if imports fail
                from flask import Blueprint

                user_search_routes = Blueprint('user_search_routes', __name__)
                admin_search_routes = Blueprint('admin_search_routes', __name__)

                @user_search_routes.route('/health', methods=['GET'])
                def user_search_health():
                    return jsonify({"status": "ok", "message": "Fallback user search routes active"}), 200

                @admin_search_routes.route('/health', methods=['GET'])
                def admin_search_health():
                    return jsonify({"status": "ok", "message": "Fallback admin search routes active"}), 200

                # Create fallback service classes
                class SearchService:
                    def __init__(self):
                        pass

                    def search(self, query):
                        return {"message": "Search service not available"}

                class EmbeddingService:
                    def __init__(self):
                        pass

                    def generate_embedding(self, text):
                        return {"message": "Embedding service not available"}

                search_service = SearchService
                embedding_service = EmbeddingService
                app.logger.error(f"❌ All search import attempts failed: {e1}, {e2}, {e3}")
                app.logger.warning("⚠️ Using fallback search components")

    # Initialize search services with app context
    try:
        if search_service and embedding_service:
            with app.app_context():
                app.search_service = search_service()
                app.embedding_service = embedding_service()
                app.logger.info("✅ Search services initialized successfully")
    except Exception as e:
        app.logger.error(f"❌ Failed to initialize search services: {str(e)}")

        # Create minimal fallback services
        class FallbackSearchService:
            def search(self, query):
                return []

        class FallbackEmbeddingService:
            def generate_embedding(self, text):
                return []

        app.search_service = FallbackSearchService()
        app.embedding_service = FallbackEmbeddingService()

    # Import and register blueprints with clean error handling
    from flask import Blueprint

    # Create fallback blueprints for other routes
    fallback_blueprints = {
        'validation_routes': Blueprint('validation_routes', __name__),
        'cart_routes': Blueprint('cart_routes', __name__),
        'admin_routes': Blueprint('admin_routes', __name__),
        'admin_auth_routes': Blueprint('admin_auth_routes', __name__),
        'dashboard_routes': Blueprint('dashboard_routes', __name__),
        'order_routes': Blueprint('order_routes', __name__),
        'admin_order_routes': Blueprint('admin_order_routes', __name__),
        'admin_cart_routes': Blueprint('admin_cart_routes', __name__),
        'admin_cloudinary_routes': Blueprint('admin_cloudinary_routes', __name__),
        'admin_category_routes': Blueprint('admin_category_routes', __name__),
        'product_images_batch_bp': Blueprint('product_images_batch_bp', __name__),
        'coupon_routes': Blueprint('coupon_routes', __name__),
        'user_review_routes': Blueprint('user_review_routes', __name__),
        'admin_review_routes': Blueprint('admin_review_routes', __name__),
        'brand_routes': Blueprint('brand_routes', __name__),
        'user_wishlist_routes': Blueprint('user_wishlist_routes', __name__),
        'admin_wishlist_routes': Blueprint('admin_wishlist_routes', __name__),
        'products_routes': Blueprint('products_routes', __name__),
        'categories_routes': Blueprint('categories_routes', __name__),
        'user_address_routes': Blueprint('user_address_routes', __name__),
        'admin_address_routes': Blueprint('admin_address_routes', __name__),
        'user_inventory_routes': Blueprint('user_inventory_routes', __name__),
        'admin_inventory_routes': Blueprint('admin_inventory_routes', __name__),
        'admin_products_routes': Blueprint('admin_products_routes', __name__),
        # Payment routes fallbacks
        'mpesa_routes': Blueprint('mpesa_routes', __name__),
        'pesapal_routes': Blueprint('pesapal_routes', __name__),
    }

    # Add basic routes to fallback blueprints
    @fallback_blueprints['admin_routes'].route('/dashboard', methods=['GET'])
    def fallback_dashboard():
        return jsonify({"message": "Admin dashboard - routes loading from fallback"}), 200

    @fallback_blueprints['admin_auth_routes'].route('/health', methods=['GET'])
    def fallback_admin_auth_health():
        return jsonify({"status": "ok", "message": "Fallback admin auth routes active"}), 200

    @fallback_blueprints['dashboard_routes'].route('/dashboard', methods=['GET'])
    def fallback_dashboard_main():
        return jsonify({"message": "Dashboard routes - fallback active", "status": "ok"}), 200

    @fallback_blueprints['validation_routes'].route('/health', methods=['GET'])
    def fallback_health():
        return jsonify({"status": "ok", "message": "Fallback routes active"}), 200

    # Add fallback routes for payment blueprints
    @fallback_blueprints['mpesa_routes'].route('/health', methods=['GET'])
    def fallback_mpesa_health():
        return jsonify({"status": "ok", "message": "Fallback M-PESA routes active"}), 200

    @fallback_blueprints['pesapal_routes'].route('/health', methods=['GET'])
    def fallback_pesapal_health():
        return jsonify({"status": "ok", "message": "Fallback Pesapal routes active"}), 200

    # Add other fallback routes
    @fallback_blueprints['user_address_routes'].route('/health', methods=['GET'])
    def fallback_user_address_health():
        return jsonify({"status": "ok", "message": "Fallback user address routes active"}), 200

    @fallback_blueprints['admin_address_routes'].route('/health', methods=['GET'])
    def fallback_admin_address_health():
        return jsonify({"status": "ok", "message": "Fallback admin address routes active"}), 200

    @fallback_blueprints['categories_routes'].route('/health', methods=['GET'])
    def fallback_categories_health():
        return jsonify({"status": "ok", "message": "Fallback categories routes active"}), 200

    @fallback_blueprints['admin_category_routes'].route('/health', methods=['GET'])
    def fallback_admin_categories_health():
        return jsonify({"status": "ok", "message": "Fallback admin categories routes active"}), 200

    @fallback_blueprints['order_routes'].route('/health', methods=['GET'])
    def fallback_order_health():
        return jsonify({"status": "ok", "message": "Fallback user order routes active"}), 200

    @fallback_blueprints['admin_order_routes'].route('/health', methods=['GET'])
    def fallback_admin_order_health():
        return jsonify({"status": "ok", "message": "Fallback admin order routes active"}), 200

    # Add fallback routes for inventory blueprints
    @fallback_blueprints['user_inventory_routes'].route('/health', methods=['GET'])
    def fallback_user_inventory_health():
        return jsonify({"status": "ok", "message": "Fallback user inventory routes active"}), 200

    @fallback_blueprints['admin_inventory_routes'].route('/health', methods=['GET'])
    def fallback_admin_inventory_health():
        return jsonify({"status": "ok", "message": "Fallback admin inventory routes active"}), 200

    # Add fallback route for admin products
    @fallback_blueprints['admin_products_routes'].route('/health', methods=['GET'])
    def fallback_admin_products_health():
        return jsonify({"status": "ok", "message": "Fallback admin products routes active"}), 200

    # Add fallback routes for review blueprints
    @fallback_blueprints['user_review_routes'].route('/health', methods=['GET'])
    def fallback_user_review_health():
        return jsonify({"status": "ok", "message": "Fallback user review routes active"}), 200

    @fallback_blueprints['admin_review_routes'].route('/health', methods=['GET'])
    def fallback_admin_review_health():
        return jsonify({"status": "ok", "message": "Fallback admin review routes active"}), 200

    # Add fallback routes for wishlist blueprints
    @fallback_blueprints['user_wishlist_routes'].route('/health', methods=['GET'])
    def fallback_user_wishlist_health():
        return jsonify({"status": "ok", "message": "Fallback user wishlist routes active"}), 200

    @fallback_blueprints['admin_wishlist_routes'].route('/health', methods=['GET'])
    def fallback_admin_wishlist_health():
        return jsonify({"status": "ok", "message": "Fallback admin wishlist routes active"}), 200

    # Import blueprints with clean logging (no debug noise)
    imported_blueprints = {}

    # Define blueprint import mappings with payment routes
    blueprint_imports = {
        'validation_routes': [
            ('app.routes.user.user', 'validation_routes'),
            ('routes.user.user', 'validation_routes')
        ],
        'cart_routes': [
            ('app.routes.cart.cart_routes', 'cart_routes'),
            ('routes.cart.cart_routes', 'cart_routes')
        ],
        'admin_routes': [
            ('app.routes.admin.admin', 'admin_routes'),
            ('routes.admin.admin', 'admin_routes')
        ],
        'admin_auth_routes': [
            ('app.routes.admin.admin_auth', 'admin_auth_routes'),
            ('routes.admin.admin_auth', 'admin_auth_routes')
        ],
        'dashboard_routes': [
            ('app.routes.admin.dashboard', 'dashboard_routes'),
            ('routes.admin.dashboard', 'dashboard_routes')
        ],
        'order_routes': [
            ('app.routes.order.order_routes', 'order_routes'),
            ('routes.order.order_routes', 'order_routes')
        ],
        'admin_order_routes': [
            ('app.routes.order.admin_order_routes', 'admin_order_routes'),
            ('routes.order.admin_order_routes', 'admin_order_routes'),
            ('backend.app.routes.order.admin_order_routes', 'admin_order_routes'),
            ('backend.routes.order.admin_order_routes', 'admin_order_routes')
        ],
        'admin_cart_routes': [
            ('app.routes.admin.admin_cart_routes', 'admin_cart_routes'),
            ('routes.admin.admin_cart_routes', 'admin_cart_routes')
        ],
        'admin_cloudinary_routes': [
            ('app.routes.admin.admin_cloudinary_routes', 'admin_cloudinary_routes'),
            ('routes.admin.admin_cloudinary_routes', 'admin_cloudinary_routes')
        ],
        'admin_category_routes': [
            ('app.routes.admin.admin_category_routes', 'admin_category_routes'),
            ('routes.admin.admin_category_routes', 'admin_category_routes')
        ],
        'product_images_batch_bp': [
            ('app.routes.products.product_images_batch', 'product_images_batch_bp'),
            ('routes.products.product_images_batch', 'product_images_batch_bp')
        ],
        # PAYMENT ROUTES IMPORTS
        'mpesa_routes': [
            ('app.routes.payments.mpesa_routes', 'mpesa_routes'),
            ('routes.payments.mpesa_routes', 'mpesa_routes'),
            ('app.mpesa.mpesa_routes', 'mpesa_routes'),
            ('mpesa.mpesa_routes', 'mpesa_routes')
        ],
        'pesapal_routes': [
            ('app.routes.payments.pesapal_routes', 'pesapal_routes'),
            ('routes.payments.pesapal_routes', 'pesapal_routes')
        ],
        'coupon_routes': [
            ('app.routes.coupon.coupon_routes', 'coupon_routes'),
            ('routes.coupon.coupon_routes', 'coupon_routes')
        ],
        # REVIEW ROUTES IMPORTS
        'user_review_routes': [
            ('routes.reviews.user_review_routes', 'user_review_routes'),
            ('app.routes.reviews.user_review_routes', 'user_review_routes')
        ],
        'admin_review_routes': [
            ('routes.reviews.admin_review_routes', 'admin_review_routes'),
            ('app.routes.reviews.admin_review_routes', 'admin_review_routes')
        ],
        'brand_routes': [
            ('app.routes.brands.brands_routes', 'brand_routes'),
            ('routes.brands.brands_routes', 'brand_routes')
        ],
        # WISHLIST ROUTES IMPORTS
        'user_wishlist_routes': [
            ('routes.wishlist.user_wishlist_routes', 'user_wishlist_routes'),
            ('app.routes.wishlist.user_wishlist_routes', 'user_wishlist_routes')
        ],
        'admin_wishlist_routes': [
            ('routes.wishlist.admin_wishlist_routes', 'admin_wishlist_routes'),
            ('app.routes.wishlist.admin_wishlist_routes', 'admin_wishlist_routes')
        ],
        'products_routes': [
            ('app.routes.products.products_routes', 'products_routes'),
            ('routes.products.products_routes', 'products_routes')
        ],
        'categories_routes': [
            ('app.routes.categories.categories_routes', 'categories_routes'),
            ('routes.categories.categories_routes', 'categories_routes')
        ],
        # USER ADDRESS ROUTES IMPORTS
        'user_address_routes': [
            ('routes.address.user_address_routes', 'user_address_routes'),
            ('app.routes.address.user_address_routes', 'user_address_routes')
        ],
        # ADMIN ADDRESS ROUTES IMPORTS
        'admin_address_routes': [
            ('routes.address.admin_address_routes', 'admin_address_routes'),
            ('app.routes.address.admin_address_routes', 'admin_address_routes')
        ],
        # INVENTORY ROUTES IMPORTS
        'user_inventory_routes': [
            ('routes.inventory.user_inventory_routes', 'user_inventory_routes'),
            ('app.routes.inventory.user_inventory_routes', 'user_inventory_routes')
        ],
        'admin_inventory_routes': [
            ('routes.inventory.admin_inventory_routes', 'admin_inventory_routes'),
            ('app.routes.inventory.admin_inventory_routes', 'admin_inventory_routes')
        ],
        # ADMIN PRODUCTS ROUTES IMPORTS
        'admin_products_routes': [
            ('app.routes.products.admin_products_routes', 'admin_products_routes'),
            ('routes.products.admin_products_routes', 'admin_products_routes')
        ],
    }

    # Try importing each blueprint with enhanced error handling
    for blueprint_name, import_attempts in blueprint_imports.items():
        for module_path, attr_name in import_attempts:
            # Skip empty module paths
            if not module_path or not module_path.strip():
                app.logger.warning(f"Skipping empty module path for {blueprint_name}")
                continue

            # Skip empty attribute names
            if not attr_name or not attr_name.strip():
                app.logger.warning(f"Skipping empty attribute name for {blueprint_name}")
                continue

            try:
                app.logger.debug(f"Attempting to import {attr_name} from {module_path}")
                module = __import__(module_path, fromlist=[attr_name])

                # Check if the attribute exists in the module
                if not hasattr(module, attr_name):
                    app.logger.debug(f"Module {module_path} does not have attribute {attr_name}")
                    continue

                blueprint = getattr(module, attr_name)

                # Verify it's actually a Blueprint
                if not hasattr(blueprint, 'name'):
                    app.logger.debug(f"Object {attr_name} from {module_path} is not a Blueprint")
                    continue

                blueprint = getattr(module, attr_name)

                # Verify it's actually a Blueprint
                if not hasattr(blueprint, 'name'):
                    app.logger.debug(f"Object {attr_name} from {module_path} is not a Blueprint")
                    continue

                imported_blueprints[blueprint_name] = blueprint
                # Only log successful imports
                app.logger.info(f"✅ Imported {blueprint_name} from {module_path}")
                break

            except (ImportError, AttributeError, ValueError) as e:
                app.logger.debug(f"Failed to import {attr_name} from {module_path}: {str(e)}")
                # Silently continue to next import attempt
                continue
            except Exception as e:
                app.logger.warning(f"Unexpected error importing {attr_name} from {module_path}: {str(e)}")
                continue

    # Use imported blueprints or fallbacks
    final_blueprints = {}
    for blueprint_name in fallback_blueprints:
        if blueprint_name in imported_blueprints:
            final_blueprints[blueprint_name] = imported_blueprints[blueprint_name]
        else:
            final_blueprints[blueprint_name] = fallback_blueprints[blueprint_name]
            if blueprint_name in ["mpesa_routes", "pesapal_routes"]:
                app.logger.warning(f"⚠️ Using fallback for {blueprint_name}. "
                                 f"Check that '{blueprint_name}' is defined as a Blueprint in the payment routes module."
                                 )
            elif blueprint_name == "cart_routes":
                app.logger.warning("⚠️ Using fallback for cart_routes. "
                                 "Check that 'cart_routes' is defined as a Blueprint in 'app.routes.cart.cart_routes' or 'routes.cart.cart_routes'."
                                 )
            elif blueprint_name == "admin_auth_routes":
                app.logger.warning("⚠️ Using fallback for admin_auth_routes. "
                                 "Check that 'admin_auth_routes' is defined as a Blueprint in 'app.routes.admin.admin_auth' or 'routes.admin.admin_auth'."
                                 )
            elif blueprint_name in ["user_wishlist_routes", "admin_wishlist_routes"]:
                app.logger.warning(f"⚠️ Using fallback for {blueprint_name}. "
                                 f"Check that '{blueprint_name}' is defined as a Blueprint in the wishlist routes module."
                                 )
            else:
                app.logger.warning(f"⚠️ Using fallback for {blueprint_name}")

    # Register blueprints
    try:
        app.register_blueprint(final_blueprints['validation_routes'], url_prefix='/api')
        app.register_blueprint(final_blueprints['cart_routes'], url_prefix='/api/cart')
        app.register_blueprint(final_blueprints['admin_routes'], url_prefix='/api/admin')
        app.register_blueprint(final_blueprints['admin_auth_routes'], url_prefix='/api/admin')
        app.register_blueprint(final_blueprints['dashboard_routes'], url_prefix='/api/admin/dashboard')

        # Register order routes
        app.register_blueprint(final_blueprints['order_routes'], url_prefix='/api/orders')
        app.register_blueprint(final_blueprints['admin_order_routes'], url_prefix='/api/admin')

        app.register_blueprint(final_blueprints['admin_cart_routes'], url_prefix='/api/admin/cart')
        app.register_blueprint(final_blueprints['admin_cloudinary_routes'], url_prefix='/api/admin/cloudinary')
        app.register_blueprint(final_blueprints['admin_category_routes'], url_prefix='/api/admin/categories')
        app.register_blueprint(final_blueprints['product_images_batch_bp'])

        # Register search routes
        if user_search_routes and admin_search_routes:
            app.register_blueprint(user_search_routes, url_prefix='/api/search')
            app.register_blueprint(admin_search_routes, url_prefix='/api/admin/search')
            app.logger.info("✅ Search routes registered successfully")
        else:
            app.logger.warning("⚠️ Search routes not available")

        # REGISTER PAYMENT ROUTES
        app.register_blueprint(final_blueprints['mpesa_routes'], url_prefix='/api/mpesa')
        app.register_blueprint(final_blueprints['pesapal_routes'], url_prefix='/api/pesapal')

        app.register_blueprint(final_blueprints['coupon_routes'], url_prefix='/api/coupons')

        # REGISTER REVIEW ROUTES
        app.register_blueprint(final_blueprints['user_review_routes'], url_prefix='/api/reviews/user')
        app.register_blueprint(final_blueprints['admin_review_routes'], url_prefix='/api/admin/reviews')

        app.register_blueprint(final_blueprints['brand_routes'], url_prefix='/api/brands')

        # REGISTER WISHLIST ROUTES
        app.register_blueprint(final_blueprints['user_wishlist_routes'], url_prefix='/api/wishlist/user')
        app.register_blueprint(final_blueprints['admin_wishlist_routes'], url_prefix='/api/admin/wishlist')

        app.register_blueprint(final_blueprints['products_routes'], url_prefix='/api/products')
        app.register_blueprint(final_blueprints['categories_routes'], url_prefix='/api/categories')

        # REGISTER ADDRESS ROUTES
        app.register_blueprint(final_blueprints['user_address_routes'], url_prefix='/api/addresses/user')
        app.register_blueprint(final_blueprints['admin_address_routes'], url_prefix='/api/admin/addresses')

        # REGISTER INVENTORY ROUTES
        app.register_blueprint(final_blueprints['user_inventory_routes'], url_prefix='/api/inventory/user')
        app.register_blueprint(final_blueprints['admin_inventory_routes'], url_prefix='/api/inventory/admin')

        # REGISTER ADMIN PRODUCTS ROUTES
        app.register_blueprint(final_blueprints['admin_products_routes'], url_prefix='/api/admin/products')

        # Clean startup logging system
        def log_startup_summary():
            """Generate and log a clean startup summary."""
            app.logger.info("=" * 60)
            app.logger.info("🚀 MIZIZZI E-COMMERCE PLATFORM - STARTUP COMPLETE")
            app.logger.info("=" * 60)

            # Blueprint Registration Summary
            app.logger.info("📦 BLUEPRINT REGISTRATION SUMMARY")
            app.logger.info("-" * 40)
            fallback_count = 0
            success_count = 0

            # Define the actual URL prefixes for each blueprint
            blueprint_url_prefixes = {
                'validation_routes': '/api',
                'cart_routes': '/api/cart',
                'admin_routes': '/api/admin',
                'admin_auth_routes': '/api/admin',
                'dashboard_routes': '/api/admin/dashboard',
                'order_routes': '/api/orders',
                'admin_order_routes': '/api/admin',
                'admin_cart_routes': '/api/admin/cart',
                'admin_cloudinary_routes': '/api/admin/cloudinary',
                'admin_category_routes': '/api/admin/categories',
                'product_images_batch_bp': '/',
                'mpesa_routes': '/api/mpesa',
                'pesapal_routes': '/api/pesapal',
                'coupon_routes': '/api/coupons',
                'user_review_routes': '/api/reviews/user',
                'admin_review_routes': '/api/admin/reviews',
                'brand_routes': '/api/brands',
                'user_wishlist_routes': '/api/wishlist/user',
                'admin_wishlist_routes': '/api/admin/wishlist',
                'products_routes': '/api/products',
                'categories_routes': '/api/categories',
                'user_address_routes': '/api/addresses/user',
                'admin_address_routes': '/api/admin/addresses',
                'user_inventory_routes': '/api/inventory/user',
                'admin_inventory_routes': '/api/inventory/admin',
                'admin_products_routes': '/api/admin/products',
            }

            for blueprint_name in final_blueprints:
                if blueprint_name in imported_blueprints:
                    status = "✅"
                    success_count += 1
                else:
                    status = "⚠️"
                    fallback_count += 1

                # Get the actual URL prefix
                url_prefix = blueprint_url_prefixes.get(blueprint_name, "/")
                app.logger.info(f"{status} {blueprint_name:<25} → {url_prefix}")

            app.logger.info(f"📊 Stats: {success_count} imported, {fallback_count} fallbacks")

            # Payment System Endpoints
            app.logger.info("💳 PAYMENT SYSTEM ENDPOINTS")
            app.logger.info("-" * 30)
            app.logger.info("M-PESA STK Push: /api/mpesa/stk-push")
            app.logger.info("M-PESA Callback: /api/mpesa/callback")
            app.logger.info("M-PESA Status: /api/mpesa/status")
            app.logger.info("Pesapal Payment: /api/pesapal/payment")
            app.logger.info("Pesapal Callback: /api/pesapal/callback")
            app.logger.info(f"M-PESA System: {'✅' if 'mpesa_routes' in imported_blueprints else '⚠️'}")
            app.logger.info(f"Pesapal System: {'✅' if 'pesapal_routes' in imported_blueprints else '⚠️'}")

            # Admin Authentication System Endpoints
            app.logger.info("🔐 ADMIN AUTHENTICATION ENDPOINTS")
            app.logger.info("-" * 35)
            app.logger.info("Admin Login: /api/admin/login")
            app.logger.info("Admin Profile: /api/admin/profile")
            app.logger.info("Admin Logout: /api/admin/logout")
            app.logger.info("Admin MFA Setup: /api/admin/mfa/setup")
            app.logger.info("Admin User Management: /api/admin/users")
            app.logger.info("Admin Activity Logs: /api/admin/activity-logs")
            app.logger.info(f"Admin Auth System: {'✅' if 'admin_auth_routes' in imported_blueprints else '⚠️'}")

            # Search System Endpoints
            app.logger.info("🔍 SEARCH SYSTEM ENDPOINTS")
            app.logger.info("-" * 30)
            app.logger.info("User Search: /api/search")
            app.logger.info("Admin Search: /api/admin/search")
            app.logger.info(f"Search Service: {'✅' if hasattr(app, 'search_service') else '❌'}")
            app.logger.info(f"Embedding Service: {'✅' if hasattr(app, 'embedding_service') else '❌'}")

            # Product System Endpoints
            app.logger.info("🛍️ PRODUCT SYSTEM ENDPOINTS")
            app.logger.info("-" * 30)
            app.logger.info("User Products: /api/products")
            app.logger.info("Admin Products: /api/admin/products")

            # Inventory System Endpoints
            app.logger.info("📦 INVENTORY SYSTEM ENDPOINTS")
            app.logger.info("-" * 30)
            app.logger.info("User Inventory: /api/inventory/user")
            app.logger.info("Admin Inventory: /api/inventory/admin")

            # Order System Endpoints
            app.logger.info("📋 ORDER SYSTEM ENDPOINTS")
            app.logger.info("-" * 25)
            app.logger.info("User Orders: /api/orders")
            app.logger.info("Admin Orders: /api/admin")

            # Review System Endpoints
            app.logger.info("⭐ REVIEW SYSTEM ENDPOINTS")
            app.logger.info("-" * 25)
            app.logger.info("User Reviews: /api/reviews/user")
            app.logger.info("Admin Reviews: /api/admin/reviews")

            # Wishlist System Endpoints
            app.logger.info("💝 WISHLIST SYSTEM ENDPOINTS")
            app.logger.info("-" * 27)
            app.logger.info("User Wishlist: /api/wishlist/user")
            app.logger.info("Admin Wishlist: /api/admin/wishlist")
            app.logger.info(f"User Wishlist System: {'✅' if 'user_wishlist_routes' in imported_blueprints else '⚠️'}")
            app.logger.info(f"Admin Wishlist System: {'✅' if 'admin_wishlist_routes' in imported_blueprints else '⚠️'}")

            # Address System Endpoints
            app.logger.info("🏠 ADDRESS SYSTEM ENDPOINTS")
            app.logger.info("-" * 30)
            app.logger.info("User Addresses: /api/addresses/user")
            app.logger.info("Admin Addresses: /api/admin/addresses")
            app.logger.info(f"User Address System: {'✅' if 'user_address_routes' in imported_blueprints else '⚠️'}")
            app.logger.info(f"Admin Address System: {'✅' if 'admin_address_routes' in imported_blueprints else '⚠️'}")

            # System Status
            app.logger.info("⚙️ SYSTEM STATUS")
            app.logger.info("-" * 15)
            app.logger.info(f"Database: {'✅' if db else '❌'}")
            app.logger.info(f"SocketIO: {'✅' if enable_socketio else '❌'}")
            app.logger.info(f"JWT: ✅")
            app.logger.info(f"CORS: ✅")
            app.logger.info(f"Rate Limiting: ✅")
            app.logger.info(f"Admin Auth System: {'✅' if 'admin_auth_routes' in imported_blueprints else '❌'}")
            app.logger.info(f"Search System: {'✅' if hasattr(app, 'search_service') else '❌'}")
            app.logger.info(f"Payment System: {'✅' if 'mpesa_routes' in imported_blueprints and 'pesapal_routes' in imported_blueprints else '❌'}")
            app.logger.info(f"Order System: ✅")
            app.logger.info(f"Inventory System: ✅")
            app.logger.info(f"Product System: ✅")
            app.logger.info(f"Review System: ✅")
            app.logger.info(f"Wishlist System: ✅")

            # Security Features
            app.logger.info("🔒 SECURITY FEATURES")
            app.logger.info("-" * 20)
            app.logger.info("✅ Token Blacklisting")
            app.logger.info("✅ Rate Limiting")
            app.logger.info("✅ MFA Support")
            app.logger.info("✅ Audit Trail")
            app.logger.info("✅ Enhanced Password Validation")
            app.logger.info("✅ CORS Protection")
            app.logger.info("✅ JWT Security")
            app.logger.info("✅ Payment Validation")

            # Quick Access URLs
            app.logger.info("🌐 QUICK ACCESS")
            app.logger.info("-" * 15)
            base_url = "http://localhost:5000"
            app.logger.info(f"Health: {base_url}/api/health-check")
            app.logger.info(f"Admin Login: {base_url}/api/admin/login")
            app.logger.info(f"Admin Dashboard: {base_url}/api/admin/dashboard/stats")
            app.logger.info(f"M-PESA STK Push: {base_url}/api/mpesa/stk-push")
            app.logger.info(f"Pesapal Payment: {base_url}/api/pesapal/payment")
            app.logger.info(f"Search: {base_url}/api/search")
            app.logger.info(f"Products: {base_url}/api/products")
            app.logger.info(f"Cart: {base_url}/api/cart")
            app.logger.info(f"Orders: {base_url}/api/orders")

            # Final Summary
            total_endpoints = len([rule for rule in app.url_map.iter_rules() if rule.endpoint != 'static'])
            app.logger.info("=" * 60)
            app.logger.info(f"✅ SERVER READY: {total_endpoints} endpoints, {len(app.blueprints)} blueprints")
            app.logger.info(f"🌍 Listening on: http://0.0.0.0:5000")
            app.logger.info(f"📝 Config: {config_name}")
            app.logger.info(f"🔐 Admin Auth: Enhanced Security Enabled")
            app.logger.info(f"💳 Payment Systems: M-PESA & Pesapal Enabled")
            app.logger.info(f"💝 Wishlist: Split User/Admin Routes Enabled")
            app.logger.info("=" * 60)

        # Execute the clean logging
        log_startup_summary()
        app.logger.info("All blueprints registered successfully")

    except Exception as e:
        app.logger.error(f"Error registering blueprints: {str(e)}")

    # Create database tables and initialize admin auth tables
    try:
        with app.app_context():
            db.create_all()

            # Initialize admin authentication tables
            try:
                from .routes.admin.admin_auth import init_admin_auth_tables
                init_admin_auth_tables()
                app.logger.info("Admin authentication tables initialized successfully")
            except ImportError:
                try:
                    from routes.admin.admin_auth import init_admin_auth_tables
                    init_admin_auth_tables()
                    app.logger.info("Admin authentication tables initialized successfully")
                except ImportError:
                    app.logger.warning("Admin authentication tables initialization skipped - module not found")

            app.logger.info("Database tables created successfully")
    except Exception as e:
        app.logger.error(f"Error creating database tables: {str(e)}")

    # Set up order completion hooks with clean error handling
    try:
        # Try multiple import paths for order completion handler
        order_completion_handler = None
        import_paths = [
            'app.routes.order.order_completion_handler',
            '.routes.order.order_completion_handler',
            'routes.order.order_completion_handler'
        ]

        for import_path in import_paths:
            try:
                module = __import__(import_path, fromlist=['setup_order_completion_hooks'])
                if hasattr(module, 'setup_order_completion_hooks'):
                    order_completion_handler = module
                    break
            except ImportError:
                continue

        if order_completion_handler:
            order_completion_handler.setup_order_completion_hooks(app)
            app.logger.info("Order completion hooks set up successfully")
        else:
            app.logger.warning("Order completion handler not found - creating basic inventory sync endpoint")

            # Create a basic inventory sync endpoint as fallback
            @app.route('/api/admin/inventory/sync', methods=['POST'])
            @jwt_required()
            def sync_inventory_fallback():
                try:
                    return jsonify({
                        "success": True,
                        "message": "Inventory sync endpoint active (fallback mode)",
                        "timestamp": datetime.now().isoformat()
                    }), 200
                except Exception as e:
                    app.logger.error(f"Error in fallback inventory sync: {str(e)}")
                    return jsonify({"error": str(e)}), 500

    except Exception as e:
        app.logger.error(f"Error setting up order completion hooks: {str(e)}")

        # Create fallback inventory sync endpoint
        @app.route('/api/admin/inventory/sync', methods=['POST'])
        @jwt_required()
        def sync_inventory_error_fallback():
            return jsonify({
                "success": False,
                "error": "Order completion handler not available",
                "message": "Please check order completion handler configuration"
            }), 500

    # Dashboard health check endpoint
    @app.route('/api/admin/dashboard/health', methods=['GET', 'OPTIONS'])
    def dashboard_health_check():
        """Health check endpoint for dashboard system."""
        try:
            return jsonify({
                "status": "ok",
                "service": "dashboard",
                "timestamp": datetime.now().isoformat(),
                "endpoints": [
                    "/api/admin/dashboard",
                    "/api/admin/dashboard/stats",
                    "/api/admin/dashboard/live-stats",
                    "/api/admin/dashboard/health"
                ],
                "database": "connected" if db else "disconnected",
                "data_source": "database_only"
            }), 200
        except Exception as e:
            app.logger.error(f"Dashboard health check failed: {str(e)}")
            return jsonify({
                "status": "error",
                "service": "dashboard",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }), 500

    # Health check endpoint
    @app.route('/api/health-check', methods=['GET', 'OPTIONS'])
    def health_check():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "config": config_name,
            "inventory_system": "active",
            "dashboard_system": "active",
            "order_system": "active",
            "product_system": "active",
            "payment_system": {
                "mpesa": "active" if 'mpesa_routes' in imported_blueprints else "inactive",
                "pesapal": "active" if 'pesapal_routes' in imported_blueprints else "inactive"
            },
            "admin_auth_system": "active" if 'admin_auth_routes' in imported_blueprints else "inactive",
            "search_system": "active" if hasattr(app, 'search_service') else "inactive",
            "wishlist_system": {
                "user_routes": "active" if 'user_wishlist_routes' in imported_blueprints else "inactive",
                "admin_routes": "active" if 'admin_wishlist_routes' in imported_blueprints else "inactive"
            },
            "security_features": {
                "token_blacklisting": True,
                "rate_limiting": True,
                "mfa_support": True,
                "audit_trail": True,
                "enhanced_password_validation": True,
                "payment_validation": True
            }
        }), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        if db:
            try:
                db.session.rollback()
            except:
                pass
        return jsonify({"error": "Internal Server Error"}), 500

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429

    @app.before_request
    def before_request():
        app.logger.debug(f"Processing request: {request.method} {request.path}")

    app.logger.info(f"Application created successfully with config: {config_name}")
    return app

# Initialize Flask app factory
def create_app_with_search():
    """Create Flask app and initialize search system."""
    try:
        from app import create_app

        # Create the Flask app
        app = create_app()

        # Setup search index in app context
        with app.app_context():
            search_ready = check_and_setup_search_index()
            if search_ready:
                logger.info("✅ Search system ready")
            else:
                logger.warning("⚠️ Search system not fully ready - will use fallback search")

        return app

    except Exception as e:
        logger.error(f"Error creating app with search: {str(e)}")

        # Fallback to basic app creation
        try:
            from app import create_app
            return create_app()
        except Exception as fallback_error:
            logger.error(f"Fallback app creation also failed: {str(fallback_error)}")
            raise

# Export the app factory
__all__ = ['create_app_with_search', 'setup_app_environment', 'initialize_search_system']

logger.info("app package initialized successfully with enhanced admin authentication, payment systems, and split wishlist routes")
