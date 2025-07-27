"""
Pytest configuration and fixtures for review tests.
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
# From backend/app/tests/reviews/conftest.py, go up 3 levels to reach backend/
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the app factory and models - using the same pattern as working products conftest
from app import create_app, db
from app.models.models import (
    User, UserRole, Product, Category, Brand, Review, Order, OrderItem, OrderStatus
)

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
def sample_user(app):
    """Create a sample user and return the user object."""
    with app.app_context():
        # Always create a fresh user for each test
        user = User(
            name="Test User",
            email=f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            role=UserRole.USER,
            email_verified=True,
            is_active=True
        )
        user.set_password("testpassword123")
        db.session.add(user)
        db.session.commit()

        # Refresh the user to ensure it's attached to the session
        db.session.refresh(user)
        return user

@pytest.fixture(scope='function')
def admin_user(app):
    """Create an admin user and return the user object."""
    with app.app_context():
        # Always create a fresh admin for each test
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

        # Refresh the admin to ensure it's attached to the session
        db.session.refresh(admin)
        return admin

@pytest.fixture(scope='function')
def sample_category(app):
    """Create a sample category and return the category object."""
    with app.app_context():
        # Always create a fresh category for each test
        category = Category(
            name="Electronics",
            slug=f"electronics_{uuid.uuid4().hex[:8]}",
            description="Electronic products"
        )
        db.session.add(category)
        db.session.commit()

        # Refresh the category to ensure it's attached to the session
        db.session.refresh(category)
        return category

@pytest.fixture(scope='function')
def sample_brand(app):
    """Create a sample brand and return the brand object."""
    with app.app_context():
        # Always create a fresh brand for each test
        brand = Brand(
            name="TechBrand",
            slug=f"techbrand_{uuid.uuid4().hex[:8]}",
            description="Technology brand"
        )
        db.session.add(brand)
        db.session.commit()

        # Refresh the brand to ensure it's attached to the session
        db.session.refresh(brand)
        return brand

@pytest.fixture(scope='function')
def sample_product(app, sample_category, sample_brand):
    """Create a sample product and return the product object."""
    with app.app_context():
        # Always create a fresh product for each test
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

        # Refresh the product to ensure it's attached to the session
        db.session.refresh(product)
        return product

@pytest.fixture(scope='function')
def sample_review(app, sample_user, sample_product):
    """Create a sample review and return the review object."""
    with app.app_context():
        # Always create a fresh review for each test
        review = Review(
            user_id=sample_user.id,
            product_id=sample_product.id,
            rating=5,
            title="Great product!",
            comment="This product exceeded my expectations. Highly recommended!",
            is_verified_purchase=True
        )
        db.session.add(review)
        db.session.commit()

        # Refresh the review to ensure it's attached to the session
        db.session.refresh(review)
        return review

@pytest.fixture(scope='function')
def multiple_reviews(app, sample_product):
    """Create multiple reviews for testing."""
    with app.app_context():
        reviews = []

        # Create additional users for reviews
        for i in range(5):
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

            review = Review(
                user_id=user.id,
                product_id=sample_product.id,
                rating=(i % 5) + 1,  # Ratings from 1 to 5
                title=f"Review {i+1}",
                comment=f"This is review number {i+1} for the product.",
                is_verified_purchase=(i % 2 == 0)  # Alternate verified purchases
            )
            db.session.add(review)
            reviews.append(review)

        db.session.commit()

        # Refresh all reviews to ensure they're attached to the session
        for review in reviews:
            db.session.refresh(review)

        return reviews

@pytest.fixture(scope='function')
def sample_order_with_product(app, sample_user, sample_product):
    """Create a sample order with the product for verified purchase testing."""
    with app.app_context():
        # Always create a fresh order for each test
        order = Order(
            user_id=sample_user.id,
            order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
            status=OrderStatus.DELIVERED,
            total_amount=99.99,
            shipping_address={"address": "123 Test St", "city": "Test City"},
            billing_address={"address": "123 Test St", "city": "Test City"}
        )
        db.session.add(order)
        db.session.flush()

        order_item = OrderItem(
            order_id=order.id,
            product_id=sample_product.id,
            quantity=1,
            price=99.99,
            total=99.99
        )
        db.session.add(order_item)
        db.session.commit()

        # Refresh the order to ensure it's attached to the session
        db.session.refresh(order)
        return order

@pytest.fixture
def auth_headers(app, sample_user):
    """Create authorization headers for a test user."""
    with app.app_context():
        access_token = create_access_token(
            identity=str(sample_user.id),
            additional_claims={"role": sample_user.role.value}
        )

    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

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
def review_data():
    """Sample review data for testing."""
    return {
        'rating': 4,
        'title': 'Good product',
        'comment': 'This product is quite good. I would recommend it to others.'
    }

@pytest.fixture
def invalid_review_data():
    """Invalid review data for testing validation."""
    return {
        'rating': 6,  # Invalid rating (should be 1-5)
        'title': 'A' * 201,  # Too long title
        'comment': 'Short'  # Too short comment
    }

@pytest.fixture
def update_review_data():
    """Sample data for updating a review."""
    return {
        'rating': 3,
        'title': 'Updated review title',
        'comment': 'This is an updated review comment with more details about the product.'
    }

@pytest.fixture
def review_with_images_data():
    """Sample review data with images for testing."""
    return {
        'rating': 5,
        'title': 'Excellent product with photos',
        'comment': 'This product is amazing! I have attached some photos to show its quality.',
        'images': [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
        ]
    }

# Legacy fixture names for backward compatibility
@pytest.fixture
def create_sample_user(sample_user):
    """Legacy fixture name - returns a function that returns user ID."""
    def _create_sample_user():
        return sample_user.id
    return _create_sample_user

@pytest.fixture
def create_admin_user(admin_user):
    """Legacy fixture name - returns a function that returns admin ID."""
    def _create_admin_user():
        return admin_user.id
    return _create_admin_user

@pytest.fixture
def create_sample_category(sample_category):
    """Legacy fixture name - returns a function that returns category ID."""
    def _create_sample_category():
        return sample_category.id
    return _create_sample_category

@pytest.fixture
def create_sample_brand(sample_brand):
    """Legacy fixture name - returns a function that returns brand ID."""
    def _create_sample_brand():
        return sample_brand.id
    return _create_sample_brand

@pytest.fixture
def create_sample_product(sample_product):
    """Legacy fixture name - returns a function that returns product ID."""
    def _create_sample_product():
        return sample_product.id
    return _create_sample_product

@pytest.fixture
def create_sample_review(sample_review):
    """Legacy fixture name - returns a function that returns review ID."""
    def _create_sample_review():
        return sample_review.id
    return _create_sample_review

@pytest.fixture
def create_multiple_reviews(multiple_reviews):
    """Legacy fixture name - returns a function that returns review IDs."""
    def _create_multiple_reviews():
        return [review.id for review in multiple_reviews]
    return _create_multiple_reviews

@pytest.fixture
def create_sample_order_with_product(sample_order_with_product):
    """Legacy fixture name - returns a function that returns order ID."""
    def _create_sample_order():
        return sample_order_with_product.id
    return _create_sample_order
