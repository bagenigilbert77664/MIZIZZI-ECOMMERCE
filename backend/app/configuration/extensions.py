"""
Flask extensions for Mizizzi E-commerce platform.
Initializes and configures all required extensions.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_caching import Cache
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request
import logging

# Setup logger
logger = logging.getLogger(__name__)

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
mail = Mail()
cache = Cache()
cors = CORS()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)

def init_extensions(app):
    """Initialize all Flask extensions."""
    # Database
    db.init_app(app)

    # Marshmallow
    ma.init_app(app)

    # JWT
    jwt.init_app(app)

    # Mail
    mail.init_app(app)

    # Cache
    cache_config = {
        'CACHE_TYPE': app.config.get('CACHE_TYPE', 'simple'),
        'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
    }
    cache.init_app(app, config=cache_config)

    cors_config = {
        'resources': {
            r'/*': {
                'origins': ['http://localhost:3000', 'http://127.0.0.1:3000'],
                'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
                'allow_headers': [
                    'Content-Type', 'Authorization', 'Accept',
                    'Origin', 'Cache-Control'
                ],
                'expose_headers': ['Content-Type', 'Authorization'],
                'supports_credentials': True,
                'max_age': 86400,
                'send_wildcard': False,
                'always_send': True
            }
        }
    }
    cors.init_app(app, **cors_config)

    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        allowed_origins = ['http://localhost:3000', 'http://127.0.0.1:3000']

        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'

        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept,Origin,Cache-Control'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH,HEAD'
        response.headers['Access-Control-Max-Age'] = '86400'

        return response

    # Migrations
    migrate.init_app(app, db)

    # Rate limiting
    limiter_config = {
        'default_limits': app.config.get('RATE_LIMIT_DEFAULT', ["200 per day", "50 per hour"]),
        'storage_uri': app.config.get('RATE_LIMIT_STORAGE_URL', None),
        'strategy': app.config.get('RATE_LIMIT_STRATEGY', 'fixed-window')
    }
    limiter.init_app(app)

    logger.info("All extensions initialized successfully")

    return app
