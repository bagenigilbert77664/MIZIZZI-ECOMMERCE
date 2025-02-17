# __init__.py or app.py
from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_caching import Cache
from flasgger import Swagger
from .config import Config
from .extensions import db  # import your single db instance

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

    # Import models AFTER initializing the app
    with app.app_context():
        from . import models  # ensure models use the same `db`
        db.create_all()

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
        'security': [{'Bearer': []}]
    }

    Swagger(app)

    # Register blueprints
    from .routes import routes_app
    app.register_blueprint(routes_app)

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return {"error": "Not Found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {"error": "Internal Server Error"}, 500

    return app
