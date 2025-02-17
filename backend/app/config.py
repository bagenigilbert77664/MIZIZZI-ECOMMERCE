import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class."""

    # Basic Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DEBUG = False
    TESTING = False

    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DB_POOL_SIZE', 10)),
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 3600)),
        'pool_pre_ping': True
    }

    # JWT configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 30)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 7)))
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_CSRF_CHECK_FORM = True

    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization']

    # File upload configuration
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_FILE_SIZE', 16 * 1024 * 1024))  # Default 16MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads'))
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    # Stripe configuration
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
    STRIPE_CURRENCY = os.environ.get('STRIPE_CURRENCY', 'usd')

    # Email configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # Cache configuration
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple')
    CACHE_REDIS_URL = os.environ.get('REDIS_URL')
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get('CACHE_TIMEOUT', 300))

    # Session configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=int(os.environ.get('SESSION_LIFETIME_DAYS', 7)))

    # Security configuration
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT')

    # Application configuration
    APP_NAME = os.environ.get('APP_NAME', 'MIZIZZI')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
    ITEMS_PER_PAGE = int(os.environ.get('ITEMS_PER_PAGE', 12))

    # Google Analytics
    GA_TRACKING_ID = os.environ.get('GA_TRACKING_ID')

    # AWS S3 configuration
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_BUCKET_NAME = os.environ.get('AWS_BUCKET_NAME')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

    # Logging configuration
    LOG_TO_STDOUT = os.environ.get('LOG_TO_STDOUT', 'false').lower() == 'true'
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    DEVELOPMENT = True
    JWT_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    SQLALCHEMY_TRACK_MODIFICATIONS = True
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    MAIL_DEBUG = True
    MAIL_SUPPRESS_SEND = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads_dev')

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    MAIL_SUPPRESS_SEND = True
    JWT_COOKIE_SECURE = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads_test')

class ProductionConfig(Config):
    """Production configuration."""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    LOG_TO_STDOUT = True
    MAIL_DEBUG = False
    MAIL_SUPPRESS_SEND = False
    USE_S3 = True
    SECURE_HEADERS = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
    }

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}