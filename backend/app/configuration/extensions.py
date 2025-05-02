"""
Flask extensions for the Mizizzi E-commerce platform.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_mail import Mail
from flask_caching import Cache
from flask_cors import CORS
from flask_socketio import SocketIO

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()
mail = Mail()
cache = Cache()
cors = CORS()

# Initialize SocketIO with message queue support
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)
