from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from .extensions import db, jwt
from .models import Product, User, Order, Category, Review
from .routes import routes_app
from .config import Config

def create_app():
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # Initialize CORS
    CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})

    # Initialize database and migration support
    db.init_app(app)
    migrate = Migrate(app, db)

    # Initialize JWT
    jwt.init_app(app)

    # Register blueprints
    app.register_blueprint(routes_app)

    return app