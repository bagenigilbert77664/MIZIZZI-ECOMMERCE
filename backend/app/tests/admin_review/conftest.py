"""
Pytest configuration and fixtures for admin review tests.
"""
import pytest
import json
import uuid
import os
import sys
from datetime import datetime, timedelta
from flask import Flask
from flask_jwt_extended import create_access_token

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Try to import the app and models
try:
    from app import create_app, db
    from app.models.models import (
        User, UserRole, Product, Category, Brand, Review, Order, OrderItem, OrderStatus
    )
except ImportError:
    # Fallback imports for testing
    import tempfile
    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    from flask_jwt_extended import JWTManager
    from enum import Enum

    # Create minimal app for testing
    def create_app(config_name='testing'):
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['WTF_CSRF_ENABLED'] = False

        # Initialize extensions
        db.init_app(app)
        jwt = JWTManager(app)

        return app

    # Create minimal models for testing
    db = SQLAlchemy()

    class UserRole(Enum):
        ADMIN = 'admin'
        USER = 'user'

    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(100), nullable=False)
        email = db.Column(db.String(120), unique=True, nullable=False)
        password_hash = db.Column(db.String(255))
        role = db.Column(db.Enum(UserRole), default=UserRole.USER)
        email_verified = db.Column(db.Boolean, default=False)
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)

        def set_password(self, password):
            from werkzeug.security import generate_password_hash
            self.password_hash = generate_password_hash(password)

    class Category(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(100), nullable=False)
        slug = db.Column(db.String(120), unique=True, nullable=False)
        description = db.Column(db.Text)

    class Brand(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(100), nullable=False)
        slug = db.Column(db.String(120), unique=True, nullable=False)
        description = db.Column(db.Text)

    class Product(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(200), nullable=False)
        slug = db.Column(db.String(220), unique=True, nullable=False)
        description = db.Column(db.Text)
        price = db.Column(db.Numeric(10, 2), nullable=False)
        stock = db.Column(db.Integer, default=0)
        category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
        brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'))
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)

    class Review(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
        rating = db.Column(db.Integer, nullable=False)
        title = db.Column(db.String(200))
        comment = db.Column(db.Text)
        is_verified_purchase = db.Column(db.Boolean, default=False)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow)

        # Relationships
        user = db.relationship('User', backref='reviews')
        product = db.relationship('Product', backref='reviews')

@pytest.fixture(scope='session')
def app():
    """Create and configure a test app."""
    # Set test configuration
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    app = create_app('testing')

    # Override configuration for testing
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key'
    })

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Clean up
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()

@pytest.fixture(scope='function')
def admin_user(app):
    """Create an admin user and return the user object."""
    with app.app_context():
        admin = User(
            name="Admin User",
            email=f"admin_{uuid.uuid4().hex[:8]}@example.com",
            role=UserRole.ADMIN,
            email_verified=True,
            is_active=True
        )
        admin.set_password("adminpassword123")
        db.session.add(admin)
        db.session.commit()

        db.session.refresh(admin)
        return admin

@pytest.fixture(scope='function')
def regular_user(app):
    """Create a regular user and return the user object."""
    with app.app_context():
        user = User(
            name="Regular User",
            email=f"user_{uuid.uuid4().hex[:8]}@example.com",
            role=UserRole.USER,
            email_verified=True,
            is_active=True
        )
        user.set_password("userpassword123")
        db.session.add(user)
        db.session.commit()

        db.session.refresh(user)
        return user

@pytest.fixture(scope='function')
def sample_category(app):
    """Create a sample category and return the category object."""
    with app.app_context():
        category = Category(
            name="Electronics",
            slug=f"electronics_{uuid.uuid4().hex[:8]}",
            description="Electronic products"
        )
        db.session.add(category)
        db.session.commit()

        db.session.refresh(category)
        return category

@pytest.fixture(scope='function')
def sample_brand(app):
    """Create a sample brand and return the brand object."""
    with app.app_context():
        brand = Brand(
            name="TechBrand",
            slug=f"techbrand_{uuid.uuid4().hex[:8]}",
            description="Technology brand"
        )
        db.session.add(brand)
        db.session.commit()

        db.session.refresh(brand)
        return brand

@pytest.fixture(scope='function')
def sample_product(app, sample_category, sample_brand):
    """Create a sample product and return the product object."""
    with app.app_context():
        product = Product(
            name="Test Product",
            slug=f"test-product_{uuid.uuid4().hex[:8]}",
            description="A test product for reviews",
            price=99.99,
            stock=10,
            category_id=sample_category.id,
            brand_id=sample_brand.id,
            is_active=True
        )
        db.session.add(product)
        db.session.commit()

        db.session.refresh(product)
        return product

@pytest.fixture(scope='function')
def sample_review(app, regular_user, sample_product):
    """Create a sample review and return the review object."""
    with app.app_context():
        review = Review(
            user_id=regular_user.id,
            product_id=sample_product.id,
            rating=5,
            title="Great product!",
            comment="This product exceeded my expectations. Highly recommended!",
            is_verified_purchase=True
        )
        db.session.add(review)
        db.session.commit()

        db.session.refresh(review)
        return review

@pytest.fixture(scope='function')
def multiple_reviews(app, sample_product):
    """Create multiple reviews for testing."""
    with app.app_context():
        reviews = []
        users = []

        # Create multiple users and reviews
        for i in range(10):
            user = User(
                name=f"User {i+1}",
                email=f"user{i+1}_{uuid.uuid4().hex[:8]}@example.com",
                role=UserRole.USER,
                email_verified=True,
                is_active=True
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.flush()
            users.append(user)

            review = Review(
                user_id=user.id,
                product_id=sample_product.id,
                rating=(i % 5) + 1,  # Ratings from 1 to 5
                title=f"Review {i+1}",
                comment=f"This is review number {i+1} for the product. " + "A" * (50 + i * 10),
                is_verified_purchase=(i % 2 == 0),  # Alternate verified purchases
                created_at=datetime.utcnow() - timedelta(days=i)  # Different creation dates
            )
            db.session.add(review)
            reviews.append(review)

        db.session.commit()

        # Refresh all reviews and users
        for review in reviews:
            db.session.refresh(review)
        for user in users:
            db.session.refresh(user)

        return reviews, users

@pytest.fixture(scope='function')
def multiple_products_with_reviews(app, sample_category, sample_brand):
    """Create multiple products with reviews for analytics testing."""
    with app.app_context():
        products = []
        reviews = []
        users = []

        # Create multiple products
        for i in range(3):
            product = Product(
                name=f"Product {i+1}",
                slug=f"product-{i+1}_{uuid.uuid4().hex[:8]}",
                description=f"Description for product {i+1}",
                price=50.0 + (i * 25.0),
                stock=20,
                category_id=sample_category.id,
                brand_id=sample_brand.id,
                is_active=True
            )
            db.session.add(product)
            db.session.flush()
            products.append(product)

            # Create users and reviews for each product
            for j in range(5):
                user = User(
                    name=f"User {i}-{j}",
                    email=f"user{i}{j}_{uuid.uuid4().hex[:8]}@example.com",
                    role=UserRole.USER,
                    email_verified=True,
                    is_active=True
                )
                user.set_password("password123")
                db.session.add(user)
                db.session.flush()
                users.append(user)

                review = Review(
                    user_id=user.id,
                    product_id=product.id,
                    rating=((i + j) % 5) + 1,
                    title=f"Review for Product {i+1} by User {j+1}",
                    comment=f"Review comment for product {i+1} by user {j+1}",
                    is_verified_purchase=(j % 2 == 0),
                    created_at=datetime.utcnow() - timedelta(days=(i*5 + j))
                )
                db.session.add(review)
                reviews.append(review)

        db.session.commit()

        # Refresh all objects
        for product in products:
            db.session.refresh(product)
        for review in reviews:
            db.session.refresh(review)
        for user in users:
            db.session.refresh(user)

        return products, reviews, users

@pytest.fixture
def admin_headers(app, admin_user):
    """Create authorization headers for an admin user."""
    with app.app_context():
        access_token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={"role": admin_user.role.value}
        )

    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def user_headers(app, regular_user):
    """Create authorization headers for a regular user."""
    with app.app_context():
        access_token = create_access_token(
            identity=str(regular_user.id),
            additional_claims={"role": regular_user.role.value}
        )

    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def invalid_headers():
    """Create invalid authorization headers."""
    return {
        'Authorization': 'Bearer invalid_token',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def review_update_data():
    """Sample data for updating a review."""
    return {
        'rating': 3,
        'title': 'Updated review title',
        'comment': 'This is an updated review comment with more details.',
        'is_verified_purchase': False
    }

@pytest.fixture
def bulk_delete_data():
    """Sample data for bulk delete operations."""
    return {
        'review_ids': []  # Will be populated in tests
    }

@pytest.fixture
def moderation_data():
    """Sample data for review moderation."""
    return {
        'action': 'approve',
        'reason': 'Review meets community guidelines'
    }

@pytest.fixture
def invalid_moderation_data():
    """Invalid data for review moderation."""
    return {
        'action': 'invalid_action',
        'reason': 'Some reason'
    }
