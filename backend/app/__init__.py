from flask import Flask, abort, jsonify, current_app
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, set_access_cookies, unset_jwt_cookies
from flask_mail import Mail
from flask_caching import Cache
from .config import Config
from .extensions import db  # use the single db instance from extensions

# Initialize extensions (they will be bound to the app later)
jwt = JWTManager()
mail = Mail()
cache = Cache()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS
    CORS(app, resources={r"/*": {"origins": config_class.CORS_ORIGINS}})

    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)

    # Initialize database migrations
    Migrate(app, db)

    # Import models and create tables (in production, use migrations instead)
    with app.app_context():
        from . import models  # ensure models use the same `db`
        db.create_all()

    # Configure Swagger for API documentation

    # Register blueprints – all routes under /api
    from .routes import routes_app
    app.register_blueprint(routes_app, url_prefix='/api')

    # Global error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal Server Error"}), 500

    return app
