from flask import Flask, redirect
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flasgger import Swagger
from flask_mail import Mail
from flask_caching import Cache
from .config import Config

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
cache = Cache()

def create_app(config_class=Config):
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config_class)

    # Initialize CORS with the allowed origins from config
    CORS(app, resources={r"/*": {"origins": config_class.CORS_ORIGINS}})

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)

    # Initialize database migrations
    migrate = Migrate(app, db)

    # Configure Swagger
    app.config['SWAGGER'] = {
        'title': 'E-commerce API',
        'uiversion': 3,
        'specs_route': '/',
        'info': {
            'title': 'E-commerce API Documentation',
            'description': 'API Documentation for E-commerce Platform',
            'version': '1.0.0',
            'contact': {
                'email': 'support@example.com'
            }
        },
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': 'JWT Authorization header using the Bearer scheme.'
            }
        },
        'security': [
            {
                'Bearer': []
            }
        ]
    }

    # Initialize Swagger
    Swagger(app)

    # Register blueprints
    from .routes import routes_app
    app.register_blueprint(routes_app)

    # Register error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return {"error": "Not Found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {"error": "Internal Server Error"}, 500

    # Register CLI commands
    @app.cli.command("init-db")
    def init_db():
        """Initialize the database."""
        db.create_all()
        print("Initialized the database.")

    return app