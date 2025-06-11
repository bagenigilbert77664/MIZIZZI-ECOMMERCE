"""
Script to fix model conflicts and reinitialize the database
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from .app.configuration.config import Config

# Create a simple Flask app for database operations
app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLAlchemy
db = SQLAlchemy(app)

def fix_model_conflicts():
    """Fix model conflicts by clearing the registry and recreating tables"""

    with app.app_context():
        try:
            print("Clearing SQLAlchemy registry...")

            # Clear the registry to remove conflicts
            db.Model.registry._class_registry.clear()

            # Import all models to register them properly
            print("Importing models...")
            from .app.models.models import (
                User, Address, Cart, CartItem, Category, Product,
                ProductVariant, ProductImage, Brand, Order, OrderItem,
                WishlistItem, Review, Coupon, Promotion, Newsletter,
                Payment, PaymentTransaction, ShippingZone, ShippingMethod,
                PaymentMethod, Inventory, ProductCompatibility
            )

            from .app.models.search_analytics import (
                SearchQuery, SearchClick, SearchConversion,
                SearchSuggestion, SearchPerformanceMetric
            )

            print("Dropping all existing tables...")
            db.drop_all()

            print("Creating all tables...")
            db.create_all()

            print("Database tables created successfully!")

            # Verify tables were created
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"Created {len(tables)} tables: {', '.join(tables)}")

        except Exception as e:
            print(f"Error fixing model conflicts: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    fix_model_conflicts()
