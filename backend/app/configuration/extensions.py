from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from flask_caching import Cache
# from twilio.rest import Client  # Import Twilio client

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
mail = Mail()
cors = CORS()
cache = Cache()
# twilio = Client()  # Initialize Twilio client
