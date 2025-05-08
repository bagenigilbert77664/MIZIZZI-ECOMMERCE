"""
Initialization module for Mizizzi E-commerce platform.
Sets up the Flask application and registers all routes with proper cart integration.
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

from .configuration.extensions import db, ma, mail, cache, cors
from .configuration.config import config
from .websocket import socketio  # Import the socketio instance

# Set up logger
logger = logging.getLogger(__name__)

def create_app(config_name=None):
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

    # Initialize SocketIO with the app
    socketio.init_app(app,
                     cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'),
                     async_mode='eventlet')  # Use eventlet for better performance

    # Set up database migrations
    Migrate(app, db)

    # Configure CORS properly for all routes
    CORS(app,
         resources={r"/*": {"origins": ["http://localhost:3000", "https://localhost:3000", "*"]}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # Add CORS headers to all responses - but only if they're not already set
    @app.after_request
    def add_cors_headers(response):
        # Only add headers if they don't exist already
        if 'Access-Control-Allow-Origin' not in response.headers:
            origin = request.headers.get('Origin', '*')
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    # Handle OPTIONS requests explicitly
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(_):
        response = app.make_default_options_response()
        origin = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    # Special handler for cart validation endpoint to ensure CORS works
    @app.route('/api/cart/validate', methods=['OPTIONS'])
    def cart_validate_options():
        response = app.make_default_options_response()
        origin = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    # Initialize JWT
    jwt = JWTManager(app)

    # JWT token callbacks
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_, jwt_payload):
        _ = jwt_payload["jti"]
        # Here you would check if the token is in a blocklist
        # For simplicity, we're not implementing the actual blocklist storage
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
            # Check if the post request has the file part
            if 'file' not in request.files:
                return jsonify({"error": "No file part in the request"}), 400

            file = request.files['file']

            # If user does not select file, browser also
            # submit an empty part without filename
            if file.filename == '':
                return jsonify({"error": "No selected file"}), 400

            # Check file size (5MB limit)
            if len(file.read()) > 5 * 1024 * 1024:  # 5MB in bytes
                return jsonify({"error": "File too large (max 5MB)"}), 400

            # Reset file pointer after reading for size check
            file.seek(0)

            # Check if the file is an allowed image type
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({"error": "File type not allowed. Only images are permitted."}), 400

            # Create a secure filename with UUID to avoid collisions
            original_filename = werkzeug.utils.secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

            # Save the file
            file_path = os.path.join(product_images_dir, unique_filename)
            file.save(file_path)

            # Get the current user from JWT token
            current_user_id = get_jwt_identity()

            # Log the upload
            app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")

            # Generate URL for the uploaded file
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

    # Guest cart middleware
    def get_or_create_guest_cart():
        """
        Get or create a guest cart based on the guest_cart_id cookie.
        This function is used for non-authenticated users.
        """
        from .models.models import Cart, CartItem

        # Get guest_cart_id from cookie
        guest_cart_id = request.cookies.get('guest_cart_id')

        if guest_cart_id:
            # Try to find existing guest cart
            cart = Cart.query.filter_by(guest_id=guest_cart_id, is_active=True).first()
            if cart:
                return cart

        # Create new guest cart with a unique ID
        guest_id = str(uuid.uuid4())
        cart = Cart(guest_id=guest_id, is_active=True)
        db.session.add(cart)
        db.session.commit()

        return cart

    # JWT Optional decorator for routes that work with both authenticated and guest users
    def jwt_optional(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    # User is authenticated
                    g.user_id = user_id
                    g.is_authenticated = True
                else:
                    # User is not authenticated (guest)
                    g.is_authenticated = False
                    g.guest_cart = get_or_create_guest_cart()
            except Exception as e:
                # Handle any JWT errors
                app.logger.error(f"JWT error: {str(e)}")
                g.is_authenticated = False
                g.guest_cart = get_or_create_guest_cart()

            return fn(*args, **kwargs)
        return wrapper


    # Register blueprints
    with app.app_context():
        # Import and register the user routes blueprint (without cart routes)
        from .routes.user.user import validation_routes
        app.register_blueprint(validation_routes, url_prefix='/api')
        app.logger.info("Registered user routes blueprint")

        # Import and register the cart routes blueprint directly
        # IMPORTANT: Remove the cart routes from validation_routes to avoid duplication
        from .routes.cart.cart_routes import cart_routes
        app.register_blueprint(cart_routes, url_prefix='/api/cart')
        app.logger.info("Registered cart routes blueprint")

        # Import and register the admin routes blueprint
        from .routes.admin.admin import admin_routes
        app.register_blueprint(admin_routes, url_prefix='/api/admin')
        app.logger.info("Registered admin routes blueprint")

        # Import and register the inventory routes blueprint
        from .routes.inventory.inventory_routes import inventory_routes
        app.register_blueprint(inventory_routes, url_prefix='/api/inventory')
        app.logger.info("Registered inventory routes blueprint")

        # Create database tables if not already created (for development only)
        db.create_all()
        app.logger.info("Database tables created (if they didn't exist)")

    # Global error handlers
    @app.errorhandler(404)
    def not_found_error(_):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(_):
        db.session.rollback()
        return jsonify({"error": "Internal Server Error"}), 500

    # Make jwt_optional available to the app
    app.jwt_optional = jwt_optional

    # Log that the app has been created successfully
    app.logger.info(f"Application created with config: {config_name}")

    return app

if __name__ == "__main__":
    app = create_app()
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
