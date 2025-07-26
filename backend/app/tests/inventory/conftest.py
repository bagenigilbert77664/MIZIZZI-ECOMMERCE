"""
Pytest configuration and fixtures for inventory tests.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
import json
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.models import (
    User, Product, ProductVariant, Category, Brand,
    Inventory, Cart, CartItem, Order, OrderItem,
    UserRole, OrderStatus, PaymentStatus
)
from app.configuration.extensions import db


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Import the create_app function
    from app import create_app

    # Create the app with testing configuration
    app = create_app('testing')

    # Override some settings for testing
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'SECRET_KEY': 'test-secret-key',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False
    })

    return app


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture(autouse=True)
def setup_database(app):
    """Set up and tear down the database for each test."""
    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


@pytest.fixture
def sample_user(app):
    """Create a sample user for testing."""
    with app.app_context():
        user = User(
            name="Test User",
            email="testuser@example.com",
            role=UserRole.USER,
            phone="+254700000000",
            is_active=True,
            email_verified=True
        )
        user.set_password("testpassword123")
        db.session.add(user)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        admin = User(
            name="Admin User",
            email="admin@example.com",
            role=UserRole.ADMIN,
            phone="+254700000001",
            is_active=True,
            email_verified=True
        )
        admin.set_password("adminpassword123")
        db.session.add(admin)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(admin)
        return admin


@pytest.fixture
def sample_category(app):
    """Create a sample category for testing."""
    with app.app_context():
        category = Category(
            name="Electronics",
            slug="electronics",
            description="Electronic devices and accessories",
            is_featured=True
        )
        db.session.add(category)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(category)
        return category


@pytest.fixture
def sample_brand(app):
    """Create a sample brand for testing."""
    with app.app_context():
        brand = Brand(
            name="TechBrand",
            slug="techbrand",
            description="Leading technology brand",
            is_featured=True,
            is_active=True
        )
        db.session.add(brand)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(brand)
        return brand


@pytest.fixture
def sample_products(app, sample_category, sample_brand):
    """Create sample products for testing."""
    with app.app_context():
        products = []

        # Product 1: Smartphone
        product1 = Product(
            name="Smartphone Pro",
            slug="smartphone-pro",
            description="Latest smartphone with advanced features",
            price=Decimal('599.99'),
            sale_price=Decimal('549.99'),
            stock=50,
            stock_quantity=50,
            category_id=sample_category.id,
            brand_id=sample_brand.id,
            sku="PHONE-001",
            is_active=True,
            is_featured=True,
            weight=0.2,
            availability_status="in_stock"
        )
        product1.set_image_urls([
            "https://example.com/phone1.jpg",
            "https://example.com/phone2.jpg"
        ])

        # Product 2: Laptop
        product2 = Product(
            name="Gaming Laptop",
            slug="gaming-laptop",
            description="High-performance gaming laptop",
            price=Decimal('1299.99'),
            stock=25,
            stock_quantity=25,
            category_id=sample_category.id,
            brand_id=sample_brand.id,
            sku="LAPTOP-001",
            is_active=True,
            weight=2.5,
            availability_status="in_stock"
        )
        product2.set_image_urls([
            "https://example.com/laptop1.jpg"
        ])

        # Product 3: Out of stock product
        product3 = Product(
            name="Wireless Headphones",
            slug="wireless-headphones",
            description="Premium wireless headphones",
            price=Decimal('199.99'),
            stock=0,
            stock_quantity=0,
            category_id=sample_category.id,
            brand_id=sample_brand.id,
            sku="HEADPHONES-001",
            is_active=True,
            weight=0.3,
            availability_status="out_of_stock"
        )

        products.extend([product1, product2, product3])

        for product in products:
            db.session.add(product)

        db.session.commit()

        # Refresh all products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        return products


@pytest.fixture
def sample_variants(app, sample_products):
    """Create sample product variants for testing."""
    with app.app_context():
        variants = []

        # Variants for smartphone (different colors)
        smartphone = sample_products[0]
        variant1 = ProductVariant(
            product_id=smartphone.id,
            color="Black",
            size="128GB",
            price=Decimal('549.99'),
            stock=20,
            sku="PHONE-001-BLK-128"
        )
        variant2 = ProductVariant(
            product_id=smartphone.id,
            color="White",
            size="256GB",
            price=Decimal('649.99'),
            stock=15,
            sku="PHONE-001-WHT-256"
        )

        # Variant for laptop
        laptop = sample_products[1]
        variant3 = ProductVariant(
            product_id=laptop.id,
            color="Black",
            size="16GB RAM",
            price=Decimal('1299.99'),
            stock=10,
            sku="LAPTOP-001-BLK-16GB"
        )

        variants.extend([variant1, variant2, variant3])

        for variant in variants:
            db.session.add(variant)

        db.session.commit()

        # Refresh all variants to ensure they're attached to the session
        for variant in variants:
            db.session.refresh(variant)

        return variants


@pytest.fixture
def sample_inventory(app, sample_products, sample_variants):
    """Create sample inventory records for testing."""
    with app.app_context():
        inventory_records = []

        # Inventory for products without variants
        for i, product in enumerate(sample_products):
            inventory = Inventory(
                product_id=product.id,
                variant_id=None,
                stock_level=product.stock_quantity,
                reserved_quantity=0,
                reorder_level=5,
                low_stock_threshold=10,
                sku=product.sku,
                location=f"Warehouse-A-{i+1}",
                status='active' if product.stock_quantity > 0 else 'out_of_stock'
            )
            inventory_records.append(inventory)

        # Inventory for variants
        for variant in sample_variants:
            inventory = Inventory(
                product_id=variant.product_id,
                variant_id=variant.id,
                stock_level=variant.stock,
                reserved_quantity=0,
                reorder_level=3,
                low_stock_threshold=5,
                sku=variant.sku,
                location="Warehouse-B",
                status='active' if variant.stock > 0 else 'out_of_stock'
            )
            inventory_records.append(inventory)

        for inventory in inventory_records:
            db.session.add(inventory)

        db.session.commit()

        # Refresh all inventory records to ensure they're attached to the session
        for inventory in inventory_records:
            db.session.refresh(inventory)

        return inventory_records


@pytest.fixture
def sample_cart(app, sample_user, sample_products):
    """Create a sample cart with items for testing."""
    with app.app_context():
        cart = Cart(
            user_id=sample_user.id,
            is_active=True,
            subtotal=0.0,
            total=0.0
        )
        db.session.add(cart)
        db.session.commit()

        # Add items to cart
        cart_items = []

        # Add smartphone to cart
        item1 = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        cart_items.append(item1)

        # Add laptop to cart
        item2 = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[1].id,
            quantity=1,
            price=float(sample_products[1].price)
        )
        cart_items.append(item2)

        for item in cart_items:
            db.session.add(item)

        # Update cart totals
        cart.update_totals()
        db.session.commit()

        # Refresh cart to ensure it's attached to the session
        db.session.refresh(cart)

        return cart


@pytest.fixture
def sample_order(app, sample_user, sample_products):
    """Create a sample order for testing."""
    with app.app_context():
        order = Order(
            user_id=sample_user.id,
            order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-0001",
            status=OrderStatus.PENDING,
            total_amount=1849.97,  # 2 * 549.99 + 1299.99
            subtotal=1849.97,
            tax_amount=0.0,
            shipping_address={
                "first_name": "Test",
                "last_name": "User",
                "address_line1": "123 Test Street",
                "city": "Nairobi",
                "country": "Kenya",
                "phone": "+254700000000"
            },
            billing_address={
                "first_name": "Test",
                "last_name": "User",
                "address_line1": "123 Test Street",
                "city": "Nairobi",
                "country": "Kenya",
                "phone": "+254700000000"
            },
            payment_method="mpesa",
            payment_status=PaymentStatus.PENDING,
            shipping_method="standard",
            shipping_cost=0.0
        )
        db.session.add(order)
        db.session.commit()

        # Add order items
        order_items = []

        # Smartphone order item
        item1 = OrderItem(
            order_id=order.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=549.99,
            total=1099.98
        )
        order_items.append(item1)

        # Laptop order item
        item2 = OrderItem(
            order_id=order.id,
            product_id=sample_products[1].id,
            quantity=1,
            price=1299.99,
            total=1299.99
        )
        order_items.append(item2)

        for item in order_items:
            db.session.add(item)

        db.session.commit()

        # Refresh order to ensure it's attached to the session
        db.session.refresh(order)

        return order


@pytest.fixture
def auth_headers(client, sample_user):
    """Get authentication headers for a regular user."""
    # Create a simple mock login endpoint for testing
    with client.application.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=str(sample_user.id))
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_auth_headers(client, admin_user):
    """Get authentication headers for an admin user."""
    # Create a simple mock login endpoint for testing
    with client.application.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=str(admin_user.id))
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def guest_cart_id():
    """Generate a guest cart ID for testing."""
    import uuid
    return str(uuid.uuid4())


@pytest.fixture
def mock_inventory_data():
    """Mock inventory data for testing."""
    return {
        'products': [
            {
                'id': 1,
                'name': 'Test Product 1',
                'sku': 'TEST-001',
                'stock_level': 100,
                'reserved_quantity': 10,
                'available_quantity': 90
            },
            {
                'id': 2,
                'name': 'Test Product 2',
                'sku': 'TEST-002',
                'stock_level': 50,
                'reserved_quantity': 5,
                'available_quantity': 45
            }
        ]
    }


@pytest.fixture
def low_stock_products(app, sample_category, sample_brand):
    """Create products with low stock for testing."""
    with app.app_context():
        products = []

        for i in range(3):
            product = Product(
                name=f"Low Stock Product {i+1}",
                slug=f"low-stock-product-{i+1}",
                description=f"Product with low stock level {i+1}",
                price=Decimal('99.99'),
                stock=2,  # Low stock
                stock_quantity=2,
                category_id=sample_category.id,
                brand_id=sample_brand.id,
                sku=f"LOW-STOCK-{i+1:03d}",
                is_active=True,
                availability_status="low_stock"
            )
            products.append(product)
            db.session.add(product)

        db.session.commit()

        # Create inventory records
        for product in products:
            inventory = Inventory(
                product_id=product.id,
                stock_level=product.stock_quantity,
                reserved_quantity=0,
                reorder_level=5,
                low_stock_threshold=5,
                sku=product.sku,
                location="Warehouse-C",
                status='active'
            )
            db.session.add(inventory)

        db.session.commit()

        # Refresh all products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        return products


@pytest.fixture
def reserved_inventory(app, sample_products):
    """Create inventory with reserved quantities for testing."""
    with app.app_context():
        product = sample_products[0]  # Use first product

        inventory = Inventory.query.filter_by(
            product_id=product.id,
            variant_id=None
        ).first()

        if inventory:
            # Reserve some stock
            inventory.reserved_quantity = 10
            db.session.commit()
            db.session.refresh(inventory)

        return inventory
