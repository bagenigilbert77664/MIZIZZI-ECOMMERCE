"""
Initialization module for Mizizzi E-commerce platform.
Sets up the Flask application and registers all routes with proper order integration.
"""

from flask import Flask, jsonify, request, send_from_directory, g
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity, create_access_token, jwt_required, verify_jwt_in_request
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import werkzeug.utils
from pathlib import Path
from functools import wraps

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

# Set up logger
logger = logging.getLogger(__name__)

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

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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
            socketio.init_app(app,
                             cors_allowed_origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
                             async_mode='eventlet')  # Use eventlet for better performance
            app.logger.info("SocketIO initialized successfully")
        except Exception as e:
            app.logger.warning(f"SocketIO initialization failed: {str(e)}")
    else:
        app.logger.info("SocketIO disabled")

    # Set up database migrations
    Migrate(app, db)

    # Configure CORS properly - SINGLE CONFIGURATION ONLY
    CORS(app,
         origins=['http://localhost:3000'],  # Specific origin only
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Cache-Control", "Pragma", "Expires"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # Initialize JWT
    jwt = JWTManager(app)

    # JWT token callbacks
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_, jwt_payload):
        jti = jwt_payload["jti"]
        return False

    @jwt.expired_token_loader
    def expired_token_callback(_, __):
        return jsonify({
            "error": "Token has expired",
            "code": "token_expired"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(_):
        return jsonify({
            "error": "Invalid token",
            "code": "invalid_token"
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(_):
        return jsonify({
            "error": "Authorization required",
            "code": "authorization_required"
        }), 401

    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(_, __):
        return jsonify({
            "error": "Fresh token required",
            "code": "fresh_token_required"
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(_, __):
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

    # Import and register blueprints with better error handling
    from flask import Blueprint

    # Create fallback blueprints
    fallback_blueprints = {
        'validation_routes': Blueprint('validation_routes', __name__),
        'cart_routes': Blueprint('cart_routes', __name__),
        'admin_routes': Blueprint('admin_routes', __name__),
        'dashboard_routes': Blueprint('dashboard_routes', __name__),
        'inventory_routes': Blueprint('inventory_routes', __name__),
        'order_routes': Blueprint('order_routes', __name__),
        'admin_cart_routes': Blueprint('admin_cart_routes', __name__),
        'admin_cloudinary_routes': Blueprint('admin_cloudinary_routes', __name__),
        'product_images_batch_bp': Blueprint('product_images_batch_bp', __name__),
        'search_routes': Blueprint('search_routes', __name__),
        'mpesa_routes': Blueprint('mpesa_routes', __name__)
    }

    # Add basic routes to fallback blueprints
    @fallback_blueprints['admin_routes'].route('/dashboard', methods=['GET'])
    def fallback_dashboard():
        return jsonify({"message": "Admin dashboard - routes loading from fallback"}), 200

    @fallback_blueprints['dashboard_routes'].route('/dashboard', methods=['GET'])
    def fallback_dashboard_main():
        return jsonify({"message": "Dashboard routes - fallback active", "status": "ok"}), 200

    @fallback_blueprints['validation_routes'].route('/health', methods=['GET'])
    def fallback_health():
        return jsonify({"status": "ok", "message": "Fallback routes active"}), 200

    # Try to import real blueprints with proper error handling
    imported_blueprints = {}

    # Define blueprint import mappings
    blueprint_imports = {
        'validation_routes': [
            ('routes.user.user', 'validation_routes'),
            ('app.routes.user.user', 'validation_routes')
        ],
        'cart_routes': [
            ('routes.cart.cart_routes', 'cart_routes'),
            ('app.routes.cart.cart_routes', 'cart_routes')
        ],
        'admin_routes': [
            ('routes.admin.admin', 'admin_routes'),
            ('app.routes.admin.admin', 'admin_routes')
        ],
        'dashboard_routes': [
            ('routes.admin.dashboard', 'dashboard_routes'),
            ('app.routes.admin.dashboard', 'dashboard_routes')
        ],
        'inventory_routes': [
            ('routes.inventory.inventory_routes', 'inventory_routes'),
            ('app.routes.inventory.inventory_routes', 'inventory_routes')
        ],
        'order_routes': [
            ('routes.order.order_routes', 'order_routes'),
            ('app.routes.order.order_routes', 'order_routes')
        ],
        'admin_cart_routes': [
            ('routes.admin.admin_cart_routes', 'admin_cart_routes'),
            ('app.routes.admin.admin_cart_routes', 'admin_cart_routes')
        ],
        'admin_cloudinary_routes': [
            ('routes.admin.admin_cloudinary_routes', 'admin_cloudinary_routes'),
            ('app.routes.admin.admin_cloudinary_routes', 'admin_cloudinary_routes')
        ],
        'product_images_batch_bp': [
            ('routes.product.product_images_batch', 'product_images_batch_bp'),
            ('app.routes.product.product_images_batch', 'product_images_batch_bp')
        ],
        'search_routes': [
            ('routes.search.search_routes', 'search_routes'),
            ('app.routes.search.search_routes', 'search_routes')
        ],
        'mpesa_routes': [
            ('mpesa.mpesa_routes', 'mpesa_routes'),
            ('app.mpesa.mpesa_routes', 'mpesa_routes')
        ]
    }

    # Try importing each blueprint
    for blueprint_name, import_attempts in blueprint_imports.items():
        for module_path, attr_name in import_attempts:
            try:
                module = __import__(module_path, fromlist=[attr_name])
                blueprint = getattr(module, attr_name)
                imported_blueprints[blueprint_name] = blueprint
                app.logger.info(f"Successfully imported {blueprint_name} from {module_path}")
                break
            except (ImportError, AttributeError) as e:
                app.logger.debug(f"Could not import {blueprint_name} from {module_path}: {str(e)}")
                continue

    # Use imported blueprints or fallbacks
    final_blueprints = {}
    for blueprint_name in fallback_blueprints:
        if blueprint_name in imported_blueprints:
            final_blueprints[blueprint_name] = imported_blueprints[blueprint_name]
        else:
            final_blueprints[blueprint_name] = fallback_blueprints[blueprint_name]
            app.logger.warning(f"Using fallback for {blueprint_name}")

    # Register blueprints
    try:
        app.register_blueprint(final_blueprints['validation_routes'], url_prefix='/api')
        app.register_blueprint(final_blueprints['cart_routes'], url_prefix='/api/cart')
        app.register_blueprint(final_blueprints['admin_routes'], url_prefix='/api/admin')
        app.register_blueprint(final_blueprints['dashboard_routes'], url_prefix='/api/admin/dashboard')
        app.register_blueprint(final_blueprints['inventory_routes'], url_prefix='/api/inventory')
        app.register_blueprint(final_blueprints['order_routes'], url_prefix='/api/order')
        app.register_blueprint(final_blueprints['admin_cart_routes'], url_prefix='/api/admin/cart')
        app.register_blueprint(final_blueprints['admin_cloudinary_routes'], url_prefix='/api/admin/cloudinary')
        app.register_blueprint(final_blueprints['product_images_batch_bp'])
        app.register_blueprint(final_blueprints['search_routes'], url_prefix='/api/search')
        app.register_blueprint(final_blueprints['mpesa_routes'], url_prefix='/api/mpesa')
        app.logger.info("All blueprints registered successfully")

        # Log all registered blueprints with their actual URL prefixes
        # Log detailed blueprint registration information
        registered_blueprints = []
        for blueprint_name, blueprint in app.blueprints.items():
            url_prefix = getattr(blueprint, 'url_prefix', None) or 'No prefix'
            registered_blueprints.append(f"{blueprint_name}: {url_prefix}")
            app.logger.info(f"✅ Blueprint '{blueprint_name}' registered with prefix: {url_prefix}")

        # Log all available endpoints
        app.logger.info("📍 Available API endpoints:")
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                app.logger.info(f"   {rule.methods} {rule.rule} -> {rule.endpoint}")

        app.logger.info(f"📊 Total blueprints registered: {len(app.blueprints)}")
    except Exception as e:
        app.logger.error(f"Error registering blueprints: {str(e)}")

    # Create database tables
    try:
        with app.app_context():
            db.create_all()
            app.logger.info("Database tables created successfully")
    except Exception as e:
        app.logger.error(f"Error creating database tables: {str(e)}")

    # Set up order completion hooks for automatic inventory reduction
    try:
        from .routes.order.order_completion_handler import setup_order_completion_hooks
        setup_order_completion_hooks(app)
        app.logger.info("Order completion hooks set up successfully")
    except Exception as e:
        app.logger.error(f"Error setting up order completion hooks: {str(e)}")

    # Add inventory sync endpoint for manual fixes
    @app.route('/api/admin/inventory/sync', methods=['POST'])
    @jwt_required()
    def sync_inventory():
        try:
            from .routes.order.order_completion_handler import manual_inventory_sync
            result = manual_inventory_sync()
            return jsonify(result), 200 if result['success'] else 500
        except Exception as e:
            app.logger.error(f"Error in inventory sync endpoint: {str(e)}")
            return jsonify({"error": str(e)}), 500

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
            "dashboard_system": "active"
        }), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(_):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(_):
        if db:
            try:
                db.session.rollback()
            except:
                pass
        return jsonify({"error": "Internal Server Error"}), 500

    @app.before_request
    def before_request():
        app.logger.debug(f"Processing request: {request.method} {request.path}")

    app.logger.info(f"Application created successfully with config: {config_name}")
    return app

if __name__ == "__main__":
    app = create_app()
    # Use socketio.run instead of app.run for WebSocket support
    try:
        socketio.run(app, host="0.0.0.0", port=5000, debug=True)
    except:
        # Fallback to regular Flask if SocketIO fails
        app.run(host="0.0.0.0", port=5000, debug=True)
