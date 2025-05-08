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

    # CORS - Configure with appropriate settings
    cors_config = {
        'resources': r'/*',
        'origins': app.config.get('CORS_ORIGINS', '*'),
        'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allow_headers': ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        'expose_headers': ['Content-Type', 'X-CSRF-Token'],
        'supports_credentials': True,
        'max_age': 600
    }
    cors.init_app(app, **cors_config)

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
