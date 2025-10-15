import pytest
import uuid
from datetime import datetime, timedelta
from app import create_app, db
from app.models.models import (
    User, Product, Cart, CartItem, Category, Brand, Address,
    ShippingZone, ShippingMethod, PaymentMethod, Coupon,
    ProductVariant, CouponType, AddressType, UserRole
)
from flask_jwt_extended import create_access_token

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def create_user(app):
    """Factory to create test users"""
    def _create_user(email=None, name=None, role=UserRole.USER):
        with app.app_context():
            unique_id = str(uuid.uuid4())[:8]
            user = User(
                name=name or f'Test User {unique_id}',
                email=email or f'test{unique_id}@example.com',
                role=role,
                email_verified=True,
                is_active=True
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            return user.id
    return _create_user

@pytest.fixture
def create_product(app):
    """Factory to create test products"""
    def _create_product(data=None):
        with app.app_context():
            unique_id = str(uuid.uuid4())[:8]
            default_data = {
                'name': f'Test Product {unique_id}',
                'slug': f'test-product-{unique_id}',
                'description': 'Test product description',
                'price': 19.99,
                'stock': 10,
                'is_active': True,
                'is_visible': True  # Add this for product visibility
            }
            if data:
                default_data.update(data)

            product = Product(**default_data)
            db.session.add(product)
            db.session.commit()
            return product.id
    return _create_product

@pytest.fixture
def create_product_variant(app):
    """Factory to create test product variants"""
    def _create_variant(product_id, data=None):
        with app.app_context():
            default_data = {
                'product_id': product_id,
                'color': 'Red',
                'size': 'M',
                'price': 19.99,
                'stock': 5
            }
            if data:
                default_data.update(data)

            variant = ProductVariant(**default_data)
            db.session.add(variant)
            db.session.commit()
            return variant.id
    return _create_variant

@pytest.fixture
def create_cart(app):
    """Factory to create test carts"""
    def _create_cart(user_id=None, guest_id=None):
        with app.app_context():
            cart = Cart(
                user_id=user_id,
                guest_id=guest_id,
                is_active=True,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.session.add(cart)
            db.session.commit()
            return cart.id
    return _create_cart

@pytest.fixture
def create_cart_item(app):
    """Factory to create test cart items"""
    def _create_item(cart_id, product_id, variant_id=None, quantity=1):
        with app.app_context():
            # Get product to get price and user_id from cart
            product = db.session.get(Product, product_id)
            cart = db.session.get(Cart, cart_id)
            price = float(product.price) if product else 19.99

            cart_item = CartItem(
                cart_id=cart_id,
                user_id=cart.user_id,  # Set user_id from cart
                product_id=product_id,
                variant_id=variant_id,
                quantity=quantity,
                price=price,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.session.add(cart_item)
            db.session.commit()
            return cart_item.id
    return _create_item

@pytest.fixture
def create_address(app):
    """Factory to create test addresses"""
    def _create_address(user_id):
        with app.app_context():
            address = Address(
                user_id=user_id,
                first_name='John',
                last_name='Doe',
                address_line1='123 Test Street',
                city='Test City',
                state='Test State',
                postal_code='12345',
                country='Test Country',
                phone='+1234567890',
                address_type=AddressType.BOTH,
                is_default=True
            )
            db.session.add(address)
            db.session.commit()
            return address.id
    return _create_address

@pytest.fixture
def create_shipping_zone(app):
    """Factory to create test shipping zones"""
    def _create_zone():
        with app.app_context():
            zone = ShippingZone(
                name='Test Zone',
                country='Test Country',
                all_regions=True,
                is_active=True
            )
            db.session.add(zone)
            db.session.commit()
            return zone.id
    return _create_zone

@pytest.fixture
def create_shipping_method(app):
    """Factory to create test shipping methods"""
    def _create_method(zone_id):
        with app.app_context():
            method = ShippingMethod(
                shipping_zone_id=zone_id,
                name='Standard Shipping',
                description='Standard shipping method',
                cost=5.99,
                estimated_days='3-5 days',
                is_active=True
            )
            db.session.add(method)
            db.session.commit()
            return method.id
    return _create_method

@pytest.fixture
def create_payment_method(app):
    """Factory to create test payment methods"""
    def _create_method():
        with app.app_context():
            method = PaymentMethod(
                name='Test Payment',
                code='test_payment',
                description='Test payment method',
                is_active=True
            )
            db.session.add(method)
            db.session.commit()
            return method.id
    return _create_method

@pytest.fixture
def create_coupon(app):
    """Factory to create test coupons"""
    def _create_coupon():
        with app.app_context():
            unique_id = str(uuid.uuid4())[:8]
            coupon = Coupon(
                code=f'TEST{unique_id}',
                type=CouponType.PERCENTAGE,
                value=10.0,
                is_active=True,
                start_date=datetime.now() - timedelta(days=1),
                end_date=datetime.now() + timedelta(days=30)
            )
            db.session.add(coupon)
            db.session.commit()
            return coupon.code
    return _create_coupon

@pytest.fixture
def auth_headers(app, create_user):
    """Create authentication headers for testing"""
    with app.app_context():
        user_id = create_user()
        user = db.session.get(User, user_id)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}, user_id  # Return both headers and user_id

@pytest.fixture
def setup_complete_cart_environment(app, create_user, create_product, create_address,
                                   create_shipping_zone, create_shipping_method,
                                   create_payment_method):
    """Setup complete environment for cart testing"""
    def _setup():
        with app.app_context():
            user_id = create_user()
            product_id = create_product()
            address_id = create_address(user_id)
            zone_id = create_shipping_zone()
            shipping_method_id = create_shipping_method(zone_id)
            payment_method_id = create_payment_method()

            return {
                'user_id': user_id,
                'product_id': product_id,
                'address_id': address_id,
                'shipping_method_id': shipping_method_id,
                'payment_method_id': payment_method_id
            }
    return _setup
