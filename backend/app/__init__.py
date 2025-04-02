from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity, create_access_token
from datetime import datetime, timezone, timedelta
import os
import logging

from .configuration.extensions import db, ma, mail, cache, cors
from .configuration.config import config
from .websocket import socketio  # Import the socketio instance

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
         resources={r"/*": {
             "origins": app.config.get('CORS_ORIGINS', '*'),
             "methods": app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
             "allow_headers": app.config.get('CORS_ALLOW_HEADERS', ['Content-Type', 'Authorization']),
             "expose_headers": app.config.get('CORS_EXPOSE_HEADERS', []),
             "supports_credentials": app.config.get('CORS_SUPPORTS_CREDENTIALS', True),
             "max_age": app.config.get('CORS_MAX_AGE', 600)
         }},
         supports_credentials=True
    )

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

    # Register blueprints
    try:
        from .routes.user.user import validation_routes
        app.register_blueprint(validation_routes, url_prefix='/api/')
    except ImportError as e:
        app.logger.error(f"Error importing user routes: {str(e)}")
        raise ImportError("The 'user' module or 'validation_routes' is missing. Ensure it exists and is correctly defined.")

    try:
        from .routes.admin.admin import admin_routes
        app.register_blueprint(admin_routes, url_prefix='/api/admin')
    except ImportError as e:
        app.logger.error(f"Error importing admin routes: {str(e)}")
        raise ImportError("The 'admin' module or 'admin_routes' is missing. Ensure it exists and is correctly defined.")

    # Create database tables if not already created (for development only)
    with app.app_context():
        db.create_all()

    # Global error handlers
    @app.errorhandler(404)
    def not_found_error(_):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(_):
        db.session.rollback()
        return jsonify({"error": "Internal Server Error"}), 500

    # Add OPTIONS method handler for all routes to handle preflight requests
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(_):
        return '', 200

    return app

if __name__ == "__main__":
    app = create_app()
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

