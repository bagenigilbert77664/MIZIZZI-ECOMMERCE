from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_caching import Cache
from app.config import Config
from app.extensions import db  # Shared db instance

# Initialize extensions
jwt = JWTManager()
mail = Mail()
cache = Cache(config={'CACHE_TYPE': 'simple'})  # Configure caching

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)

    # Set up database migrations
    Migrate(app, db)

    # Configure CORS properly for all routes
    CORS(app,
         resources={r"/*": {  # Changed from r"/api/*" to r"/*" to cover all routes
             "origins": app.config['CORS_ORIGINS'],
             "methods": app.config['CORS_METHODS'],
             "allow_headers": app.config['CORS_ALLOW_HEADERS'],
             "expose_headers": app.config['CORS_EXPOSE_HEADERS'],
             "supports_credentials": app.config['CORS_SUPPORTS_CREDENTIALS']
         }},
         supports_credentials=True
    )

    # Register blueprints
    from app.routes import routes_app
    app.register_blueprint(routes_app, url_prefix='/api')

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
    def handle_options(path):
        return '', 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)

