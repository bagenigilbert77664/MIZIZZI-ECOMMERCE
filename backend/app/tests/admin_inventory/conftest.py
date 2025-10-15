"""
Pytest configuration and fixtures for admin inventory tests.
"""
import pytest
from datetime import datetime, timedelta
from flask import Flask
from flask_jwt_extended import create_access_token
from app.models.models import User, UserRole, Product, ProductVariant, Inventory, Category, Brand, db
from app import create_app


@pytest.fixture(scope='function')
def app():
    """Create and configure a new app instance for each test."""
    app = create_app('testing')

    with app.app_context():
        # Create all tables
        db.create_all()

        yield app

        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        # Create admin user with ADMIN role enum
        admin = User(
            name='Admin User',
            email='admin@test.com',
            role=UserRole.ADMIN,  # Use the enum directly
            phone='1234567890',
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        admin.set_password('admin_password')
        db.session.add(admin)
        db.session.commit()

        yield admin

        # Cleanup is handled by app fixture


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        user = User(
            name='Regular User',
            email='user@test.com',
            role=UserRole.USER,  # Use the enum directly
            phone='0987654321',
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        user.set_password('user_password')
        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup is handled by app fixture


@pytest.fixture
def admin_token(app, admin_user):
    """Create admin JWT token."""
    with app.app_context():
        token = create_access_token(identity=admin_user.id)
        return token


@pytest.fixture
def user_token(app, regular_user):
    """Create regular user JWT token."""
    with app.app_context():
        token = create_access_token(identity=regular_user.id)
        return token


@pytest.fixture
def test_category(app):
    """Create a test category."""
    with app.app_context():
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description',
            is_featured=False  # Use is_featured instead of is_active
        )
        db.session.add(category)
        db.session.commit()

        yield category


@pytest.fixture
def test_brand(app):
    """Create a test brand."""
    with app.app_context():
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description',
            is_active=True
        )
        db.session.add(brand)
        db.session.commit()

        yield brand


@pytest.fixture
def test_product(app, test_category, test_brand):
    """Create a test product."""
    with app.app_context():
        product = Product(
            name='Test Product',
            slug='test-product',
            description='Test Description',
            price=99.99,
            sku='TEST-001',
            stock_quantity=100,  # Use stock_quantity instead of stock
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(product)
        db.session.commit()

        # Refresh the product to ensure it's attached to the session
        db.session.refresh(product)

        yield product

        # Cleanup is handled by app fixture


@pytest.fixture
def test_product_variant(app, test_product):
    """Create a test product variant."""
    with app.app_context():
        variant = ProductVariant(
            product_id=test_product.id,
            color='Red',
            size='M',
            sku='TEST-001-RED-M',
            stock=50,
            price=99.99  # Use price instead of price_adjustment
        )
        db.session.add(variant)
        db.session.commit()

        # Refresh the variant to ensure it's attached to the session
        db.session.refresh(variant)

        yield variant

        # Cleanup is handled by app fixture


@pytest.fixture
def test_inventory(app, test_product):
    """Create a test inventory item with minimal reserved quantity."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=100,
            reserved_quantity=0,  # Start with 0 reserved quantity
            reorder_level=20,
            low_stock_threshold=15,
            sku='TEST-INV-001',
            location='Warehouse A',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to get the latest state
        db.session.refresh(inventory)
        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def test_inventory_variant(app, test_product, test_product_variant):
    """Create a test inventory item for a product variant."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            variant_id=test_product_variant.id,
            stock_level=50,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='TEST-VAR-INV-001',
            location='Warehouse B',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to get the latest state
        db.session.refresh(inventory)
        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def low_stock_inventory(app, test_category, test_brand):
    """Create a low stock inventory item."""
    with app.app_context():
        # Create another product for low stock testing
        low_stock_product = Product(
            name='Low Stock Product',
            slug='low-stock-product',
            description='Low Stock Description',
            price=49.99,
            sku='LOW-001',
            stock_quantity=5,  # Use stock_quantity
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(low_stock_product)
        db.session.commit()

        inventory = Inventory(
            product_id=low_stock_product.id,
            stock_level=3,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='LOW-INV-001',
            location='Warehouse C',
            status='active'  # Use 'active' instead of 'low_stock'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh objects to ensure they're attached to the session
        db.session.refresh(low_stock_product)
        db.session.refresh(inventory)

        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def multiple_inventory_items(app, test_category, test_brand):
    """Create multiple inventory items for testing."""
    with app.app_context():
        products = []
        inventories = []

        # Create multiple products and inventory items
        for i in range(5):
            product = Product(
                name=f'Product {i+1}',
                slug=f'product-{i+1}',
                description=f'Description {i+1}',
                price=10.0 * (i+1),
                sku=f'PROD-{i+1:03d}',
                stock_quantity=50 * (i+1),  # Use stock_quantity
                category_id=test_category.id,
                brand_id=test_brand.id,
                is_active=True
            )
            db.session.add(product)
            products.append(product)

        db.session.commit()

        # Refresh products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        for i, product in enumerate(products):
            inventory = Inventory(
                product_id=product.id,
                stock_level=50 * (i+1),
                reserved_quantity=5 * (i+1),
                reorder_level=10 * (i+1),
                low_stock_threshold=8 * (i+1),
                sku=f'INV-{i+1:03d}',
                location=f'Warehouse {chr(65+i)}',
                status='active'
            )
            db.session.add(inventory)
            inventories.append(inventory)

        db.session.commit()

        # Refresh inventories to ensure they're attached to the session
        for inventory in inventories:
            db.session.refresh(inventory)

        yield {'products': products, 'inventories': inventories}

        # Cleanup is handled by app fixture


@pytest.fixture
def out_of_stock_inventory(app, test_category, test_brand):
    """Create an out of stock inventory item."""
    with app.app_context():
        # Create product for out of stock testing
        out_of_stock_product = Product(
            name='Out of Stock Product',
            slug='out-of-stock-product',
            description='Out of Stock Description',
            price=39.99,
            sku='OUT-001',
            stock_quantity=0,
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(out_of_stock_product)
        db.session.commit()

        inventory = Inventory(
            product_id=out_of_stock_product.id,
            stock_level=0,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='OUT-INV-001',
            location='Warehouse D',
            status='out_of_stock'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh objects to ensure they're attached to the session
        db.session.refresh(out_of_stock_product)
        db.session.refresh(inventory)

        yield inventory

        # Cleanup is handled by app fixture


# Additional fixtures for specific test scenarios
@pytest.fixture
def inventory_with_no_reserved_stock(app, test_product):
    """Create inventory with no reserved stock for deletion tests."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=50,
            reserved_quantity=0,  # No reserved stock
            reorder_level=10,
            low_stock_threshold=5,
            sku='DELETE-TEST-001',
            location='Test Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh the inventory to ensure it's attached to the session
        db.session.refresh(inventory)

        yield inventory


@pytest.fixture
def inventory_with_reserved_stock(app, test_product):
    """Create inventory with reserved stock for deletion tests."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=50,
            reserved_quantity=10,  # Has reserved stock
            reorder_level=10,
            low_stock_threshold=5,
            sku='RESERVED-TEST-001',
            location='Test Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh the inventory to ensure it's attached to the session
        db.session.refresh(inventory)

        yield inventory


@pytest.fixture
def isolated_inventory(app, test_product):
    """Create an isolated inventory item for tests that need clean state."""
    with app.app_context():
        # Create a completely fresh inventory item
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=100,
            reserved_quantity=0,
            reorder_level=20,
            low_stock_threshold=15,
            sku=f'ISOLATED-INV-{datetime.now().microsecond}',
            location='Isolated Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to ensure we have the latest state
        db.session.refresh(inventory)

        yield inventory

        # Cleanup
        try:
            db.session.delete(inventory)
            db.session.commit()
        except:
            db.session.rollback()


@pytest.fixture(autouse=True)
def setup_and_teardown(app):
    """Setup and teardown for each test."""
    with app.app_context():
        # Setup - ensure clean state
        try:
            # Clear existing data in proper order (respecting foreign keys)
            db.session.query(Inventory).delete()
            db.session.query(ProductVariant).delete()
            db.session.query(Product).delete()
            db.session.query(Brand).delete()
            db.session.query(Category).delete()
            db.session.query(User).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()

        yield

        # Teardown - clean up after test
        try:
            db.session.query(Inventory).delete()
            db.session.query(ProductVariant).delete()
            db.session.query(Product).delete()
            db.session.query(Brand).delete()
            db.session.query(Category).delete()
            db.session.query(User).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
"""
Pytest configuration and fixtures for admin inventory tests.
"""
import pytest
from datetime import datetime, timedelta
from flask import Flask
from flask_jwt_extended import create_access_token
from app.models.models import User, UserRole, Product, ProductVariant, Inventory, Category, Brand, db
from app import create_app


@pytest.fixture(scope='function')
def app():
    """Create and configure a new app instance for each test."""
    app = create_app('testing')

    with app.app_context():
        # Create all tables
        db.create_all()

        yield app

        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        # Create admin user with ADMIN role enum
        admin = User(
            name='Admin User',
            email='admin@test.com',
            role=UserRole.ADMIN,  # Use the enum directly
            phone='1234567890',
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        admin.set_password('admin_password')
        db.session.add(admin)
        db.session.commit()

        yield admin

        # Cleanup is handled by app fixture


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        user = User(
            name='Regular User',
            email='user@test.com',
            role=UserRole.USER,  # Use the enum directly
            phone='0987654321',
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        user.set_password('user_password')
        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup is handled by app fixture


@pytest.fixture
def admin_token(app, admin_user):
    """Create admin JWT token."""
    with app.app_context():
        token = create_access_token(identity=admin_user.id)
        return token


@pytest.fixture
def user_token(app, regular_user):
    """Create regular user JWT token."""
    with app.app_context():
        token = create_access_token(identity=regular_user.id)
        return token


@pytest.fixture
def test_category(app):
    """Create a test category."""
    with app.app_context():
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description',
            is_featured=False  # Use is_featured instead of is_active
        )
        db.session.add(category)
        db.session.commit()

        yield category


@pytest.fixture
def test_brand(app):
    """Create a test brand."""
    with app.app_context():
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description',
            is_active=True
        )
        db.session.add(brand)
        db.session.commit()

        yield brand


@pytest.fixture
def test_product(app, test_category, test_brand):
    """Create a test product."""
    with app.app_context():
        product = Product(
            name='Test Product',
            slug='test-product',
            description='Test Description',
            price=99.99,
            sku='TEST-001',
            stock_quantity=100,  # Use stock_quantity instead of stock
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(product)
        db.session.commit()

        # Refresh the product to ensure it's attached to the session
        db.session.refresh(product)

        yield product

        # Cleanup is handled by app fixture


@pytest.fixture
def test_product_variant(app, test_product):
    """Create a test product variant."""
    with app.app_context():
        variant = ProductVariant(
            product_id=test_product.id,
            color='Red',
            size='M',
            sku='TEST-001-RED-M',
            stock=50,
            price=99.99  # Use price instead of price_adjustment
        )
        db.session.add(variant)
        db.session.commit()

        # Refresh the variant to ensure it's attached to the session
        db.session.refresh(variant)

        yield variant

        # Cleanup is handled by app fixture


@pytest.fixture
def test_inventory(app, test_product):
    """Create a test inventory item with minimal reserved quantity."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=100,
            reserved_quantity=0,  # Start with 0 reserved quantity
            reorder_level=20,
            low_stock_threshold=15,
            sku='TEST-INV-001',
            location='Warehouse A',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to get the latest state
        db.session.refresh(inventory)
        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def test_inventory_variant(app, test_product, test_product_variant):
    """Create a test inventory item for a product variant."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            variant_id=test_product_variant.id,
            stock_level=50,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='TEST-VAR-INV-001',
            location='Warehouse B',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to get the latest state
        db.session.refresh(inventory)
        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def low_stock_inventory(app, test_category, test_brand):
    """Create a low stock inventory item."""
    with app.app_context():
        # Create another product for low stock testing
        low_stock_product = Product(
            name='Low Stock Product',
            slug='low-stock-product',
            description='Low Stock Description',
            price=49.99,
            sku='LOW-001',
            stock_quantity=5,  # Use stock_quantity
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(low_stock_product)
        db.session.commit()

        inventory = Inventory(
            product_id=low_stock_product.id,
            stock_level=3,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='LOW-INV-001',
            location='Warehouse C',
            status='active'  # Use 'active' instead of 'low_stock'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh objects to ensure they're attached to the session
        db.session.refresh(low_stock_product)
        db.session.refresh(inventory)

        yield inventory

        # Cleanup is handled by app fixture


@pytest.fixture
def multiple_inventory_items(app, test_category, test_brand):
    """Create multiple inventory items for testing."""
    with app.app_context():
        products = []
        inventories = []

        # Create multiple products and inventory items
        for i in range(5):
            product = Product(
                name=f'Product {i+1}',
                slug=f'product-{i+1}',
                description=f'Description {i+1}',
                price=10.0 * (i+1),
                sku=f'PROD-{i+1:03d}',
                stock_quantity=50 * (i+1),  # Use stock_quantity
                category_id=test_category.id,
                brand_id=test_brand.id,
                is_active=True
            )
            db.session.add(product)
            products.append(product)

        db.session.commit()

        # Refresh products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        for i, product in enumerate(products):
            inventory = Inventory(
                product_id=product.id,
                stock_level=50 * (i+1),
                reserved_quantity=5 * (i+1),
                reorder_level=10 * (i+1),
                low_stock_threshold=8 * (i+1),
                sku=f'INV-{i+1:03d}',
                location=f'Warehouse {chr(65+i)}',
                status='active'
            )
            db.session.add(inventory)
            inventories.append(inventory)

        db.session.commit()

        # Refresh inventories to ensure they're attached to the session
        for inventory in inventories:
            db.session.refresh(inventory)

        yield {'products': products, 'inventories': inventories}

        # Cleanup is handled by app fixture


@pytest.fixture
def out_of_stock_inventory(app, test_category, test_brand):
    """Create an out of stock inventory item."""
    with app.app_context():
        # Create product for out of stock testing
        out_of_stock_product = Product(
            name='Out of Stock Product',
            slug='out-of-stock-product',
            description='Out of Stock Description',
            price=39.99,
            sku='OUT-001',
            stock_quantity=0,
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True
        )
        db.session.add(out_of_stock_product)
        db.session.commit()

        inventory = Inventory(
            product_id=out_of_stock_product.id,
            stock_level=0,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            sku='OUT-INV-001',
            location='Warehouse D',
            status='out_of_stock'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh objects to ensure they're attached to the session
        db.session.refresh(out_of_stock_product)
        db.session.refresh(inventory)

        yield inventory

        # Cleanup is handled by app fixture


# Additional fixtures for specific test scenarios
@pytest.fixture
def inventory_with_no_reserved_stock(app, test_product):
    """Create inventory with no reserved stock for deletion tests."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=50,
            reserved_quantity=0,  # No reserved stock
            reorder_level=10,
            low_stock_threshold=5,
            sku='DELETE-TEST-001',
            location='Test Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh the inventory to ensure it's attached to the session
        db.session.refresh(inventory)

        yield inventory


@pytest.fixture
def inventory_with_reserved_stock(app, test_product):
    """Create inventory with reserved stock for deletion tests."""
    with app.app_context():
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=50,
            reserved_quantity=10,  # Has reserved stock
            reorder_level=10,
            low_stock_threshold=5,
            sku='RESERVED-TEST-001',
            location='Test Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh the inventory to ensure it's attached to the session
        db.session.refresh(inventory)

        yield inventory


@pytest.fixture
def isolated_inventory(app, test_product):
    """Create an isolated inventory item for tests that need clean state."""
    with app.app_context():
        # Create a completely fresh inventory item
        inventory = Inventory(
            product_id=test_product.id,
            stock_level=100,
            reserved_quantity=0,
            reorder_level=20,
            low_stock_threshold=15,
            sku=f'ISOLATED-INV-{datetime.now().microsecond}',
            location='Isolated Warehouse',
            status='active'
        )
        db.session.add(inventory)
        db.session.commit()

        # Refresh to ensure we have the latest state
        db.session.refresh(inventory)

        yield inventory

        # Cleanup
        try:
            db.session.delete(inventory)
            db.session.commit()
        except:
            db.session.rollback()


@pytest.fixture(autouse=True)
def setup_and_teardown(app):
    """Setup and teardown for each test."""
    with app.app_context():
        # Setup - ensure clean state
        try:
            # Clear existing data in proper order (respecting foreign keys)
            db.session.query(Inventory).delete()
            db.session.query(ProductVariant).delete()
            db.session.query(Product).delete()
            db.session.query(Brand).delete()
            db.session.query(Category).delete()
            db.session.query(User).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()

        yield

        # Teardown - clean up after test
        try:
            db.session.query(Inventory).delete()
            db.session.query(ProductVariant).delete()
            db.session.query(Product).delete()
            db.session.query(Brand).delete()
            db.session.query(Category).delete()
            db.session.query(User).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
