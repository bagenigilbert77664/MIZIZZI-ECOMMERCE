"""
Pytest fixtures for admin cart routes testing.
Provides all necessary test data with proper session management.
"""

import pytest
from datetime import datetime, timedelta
from app import create_app, db
from app.models.models import (
    User, Cart, CartItem, Product, ProductVariant, Category, Brand,
    Coupon, ShippingZone, ShippingMethod, PaymentMethod, Address,
    UserRole, CouponType, AddressType
)
from flask_jwt_extended import create_access_token


@pytest.fixture(scope='function')
def app():
    """Create application for testing"""
    app = create_app('testing')

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def admin_user(app):
    """Create admin user with proper session management"""
    with app.app_context():
        admin = User(
            name='Admin User',
            email='admin@test.com',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        admin.set_password('admin123')

        db.session.add(admin)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(admin)
        return admin


@pytest.fixture(scope='function')
def regular_user(app):
    """Create regular user with proper session management"""
    with app.app_context():
        user = User(
            name='Regular User',
            email='user@test.com',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        user.set_password('user123')

        db.session.add(user)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def another_user(app):
    """Create another regular user"""
    with app.app_context():
        user = User(
            name='Another User',
            email='another@test.com',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        user.set_password('user123')

        db.session.add(user)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def admin_token(app, admin_user):
    """Create admin JWT token"""
    with app.app_context():
        return create_access_token(identity=admin_user.id)


@pytest.fixture(scope='function')
def user_token(app, regular_user):
    """Create user JWT token"""
    with app.app_context():
        return create_access_token(identity=regular_user.id)


@pytest.fixture(scope='function')
def admin_headers(admin_token):
    """Create admin authorization headers"""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture(scope='function')
def user_headers(user_token):
    """Create user authorization headers"""
    return {
        'Authorization': f'Bearer {user_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture(scope='function')
def category(app):
    """Create test category"""
    with app.app_context():
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description'
        )

        db.session.add(category)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(category)
        return category


@pytest.fixture(scope='function')
def brand(app):
    """Create test brand"""
    with app.app_context():
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description',
            is_active=True
        )

        db.session.add(brand)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(brand)
        return brand


@pytest.fixture(scope='function')
def product(app, category, brand):
    """Create test product"""
    with app.app_context():
        product = Product(
            name='Test Product',
            slug='test-product',
            description='Test product description',
            price=100.00,
            sale_price=80.00,
            stock=50,
            category_id=category.id,
            brand_id=brand.id,
            is_active=True,
            is_visible=True
        )

        db.session.add(product)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(product)
        return product


@pytest.fixture(scope='function')
def product_variant(app, product):
    """Create test product variant"""
    with app.app_context():
        variant = ProductVariant(
            product_id=product.id,
            color='Red',
            size='M',
            price=90.00,
            stock=20
        )

        db.session.add(variant)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(variant)
        return variant


@pytest.fixture(scope='function')
def shipping_zone(app):
    """Create test shipping zone"""
    with app.app_context():
        zone = ShippingZone(
            name='Test Zone',
            country='Kenya',
            all_regions=True,
            is_active=True
        )

        db.session.add(zone)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(zone)
        return zone


@pytest.fixture(scope='function')
def shipping_method(app, shipping_zone):
    """Create test shipping method"""
    with app.app_context():
        method = ShippingMethod(
            shipping_zone_id=shipping_zone.id,
            name='Standard Shipping',
            description='Standard shipping method',
            cost=10.00,
            estimated_days='3-5 days',
            is_active=True
        )

        db.session.add(method)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(method)
        return method


@pytest.fixture(scope='function')
def payment_method(app):
    """Create test payment method"""
    with app.app_context():
        method = PaymentMethod(
            name='M-PESA',
            code='mpesa',
            description='Mobile money payment',
            is_active=True
        )

        db.session.add(method)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(method)
        return method


@pytest.fixture(scope='function')
def address(app, regular_user):
    """Create test address"""
    with app.app_context():
        address = Address(
            user_id=regular_user.id,
            first_name='John',
            last_name='Doe',
            address_line1='123 Test Street',
            city='Nairobi',
            state='Nairobi',
            postal_code='00100',
            country='Kenya',
            phone='+254700000000',
            address_type=AddressType.BOTH,
            is_default=True
        )

        db.session.add(address)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(address)
        return address


@pytest.fixture(scope='function')
def coupon(app):
    """Create test coupon"""
    with app.app_context():
        coupon = Coupon(
            code='TEST10',
            type=CouponType.PERCENTAGE,
            value=10.0,
            min_purchase=50.0,
            max_discount=20.0,
            start_date=datetime.utcnow() - timedelta(days=1),
            end_date=datetime.utcnow() + timedelta(days=30),
            usage_limit=100,
            used_count=0,
            is_active=True
        )

        db.session.add(coupon)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(coupon)
        return coupon


@pytest.fixture(scope='function')
def expired_coupon(app):
    """Create expired test coupon"""
    with app.app_context():
        coupon = Coupon(
            code='EXPIRED10',
            type=CouponType.PERCENTAGE,
            value=10.0,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow() - timedelta(days=1),
            is_active=True
        )

        db.session.add(coupon)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(coupon)
        return coupon


@pytest.fixture(scope='function')
def empty_cart(app, regular_user):
    """Create empty cart"""
    with app.app_context():
        cart = Cart(
            user_id=regular_user.id,
            is_active=True,
            subtotal=0.0,
            tax=0.0,
            shipping=0.0,
            discount=0.0,
            total=0.0
        )

        db.session.add(cart)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(cart)
        return cart


@pytest.fixture(scope='function')
def user_cart(app, regular_user, product):
    """Create cart with items for regular user"""
    with app.app_context():
        cart = Cart(
            user_id=regular_user.id,
            is_active=True,
            subtotal=80.0,
            tax=0.0,
            shipping=0.0,
            discount=0.0,
            total=80.0
        )

        db.session.add(cart)
        db.session.commit()

        # Add cart item
        cart_item = CartItem(
            cart_id=cart.id,
            user_id=regular_user.id,
            product_id=product.id,
            quantity=1,
            price=80.00
        )

        db.session.add(cart_item)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(cart)
        return cart


@pytest.fixture(scope='function')
def another_user_cart(app, another_user, product):
    """Create cart for another user"""
    with app.app_context():
        cart = Cart(
            user_id=another_user.id,
            is_active=True,
            subtotal=80.0,
            tax=0.0,
            shipping=0.0,
            discount=0.0,
            total=80.0
        )

        db.session.add(cart)
        db.session.commit()

        # Add cart item
        cart_item = CartItem(
            cart_id=cart.id,
            user_id=another_user.id,
            product_id=product.id,
            quantity=1,
            price=80.00
        )

        db.session.add(cart_item)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(cart)
        return cart


@pytest.fixture(scope='function')
def guest_cart(app):
    """Create guest cart"""
    with app.app_context():
        cart = Cart(
            guest_id='guest-123',
            is_active=True,
            subtotal=0.0,
            tax=0.0,
            shipping=0.0,
            discount=0.0,
            total=0.0
        )

        db.session.add(cart)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(cart)
        return cart


@pytest.fixture(scope='function')
def inactive_cart(app, regular_user):
    """Create inactive cart"""
    with app.app_context():
        cart = Cart(
            user_id=regular_user.id,
            is_active=False,
            subtotal=0.0,
            tax=0.0,
            shipping=0.0,
            discount=0.0,
            total=0.0
        )

        db.session.add(cart)
        db.session.commit()

        # Refresh to ensure it's bound to session
        db.session.refresh(cart)
        return cart
