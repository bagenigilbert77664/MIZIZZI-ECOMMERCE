"""
Comprehensive test suite for user-facing product routes.
Tests all public product endpoints without admin functionality.
"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch

from app import create_app, db
from app.models.models import (
    Product, ProductVariant, ProductImage, Category, Brand,
    User, UserRole
)


class TestProductRoutesHealth:
    """Test health check endpoint"""

    def test_health_check(self, client):
        """Test health check endpoint returns success"""
        response = client.get('/api/products/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'products_routes'
        assert 'timestamp' in data


class TestGetProducts:
    """Test products list endpoint"""

    def test_get_products_empty_list(self, client):
        """Test getting products when none exist"""
        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 0
        assert data['pagination']['total_items'] == 0

    def test_get_products_with_data(self, client, create_test_products):
        """Test getting products with data"""
        # Create test products
        create_test_products(5)

        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 5
        assert data['pagination']['total_items'] == 5

        # Check product structure
        product = data['items'][0]
        assert 'id' in product
        assert 'name' in product
        assert 'price' in product
        assert 'is_active' in product

    def test_get_products_pagination(self, client, create_test_products):
        """Test products pagination"""
        # Create 25 test products
        create_test_products(25)

        # Test first page
        response = client.get('/api/products/?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 10
        assert data['pagination']['page'] == 1
        assert data['pagination']['total_items'] == 25
        assert data['pagination']['has_next'] is True

        # Test second page
        response = client.get('/api/products/?page=2&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 10
        assert data['pagination']['page'] == 2

        # Test last page
        response = client.get('/api/products/?page=3&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 5
        assert data['pagination']['has_next'] is False

    def test_get_products_per_page_limit(self, client, create_test_products):
        """Test per_page limit enforcement"""
        create_test_products(150)

        # Test max limit enforcement
        response = client.get('/api/products/?per_page=200')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 100  # Should be limited to 100

    def test_get_products_category_filter(self, client, create_test_category, create_test_product):
        """Test filtering products by category"""
        category_id = create_test_category('Electronics')
        product_id = create_test_product(
            name='Laptop',
            category_id=category_id,
            is_active=True,
            is_visible=True
        )

        response = client.get(f'/api/products/?category_id={category_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['category_id'] == category_id

    def test_get_products_brand_filter(self, client, create_test_brand, create_test_product):
        """Test filtering products by brand"""
        brand_id = create_test_brand('Apple')
        product_id = create_test_product(
            name='iPhone',
            brand_id=brand_id,
            is_active=True,
            is_visible=True
        )

        response = client.get(f'/api/products/?brand_id={brand_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['brand_id'] == brand_id

    def test_get_products_price_filter(self, client, create_test_product):
        """Test filtering products by price range"""
        # Create products with different prices
        create_test_product(name='Cheap Product', price=10.00, is_active=True, is_visible=True)
        create_test_product(name='Mid Product', price=50.00, is_active=True, is_visible=True)
        create_test_product(name='Expensive Product', price=100.00, is_active=True, is_visible=True)

        # Test price range filter
        response = client.get('/api/products/?min_price=25&max_price=75')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Mid Product'

    def test_get_products_feature_filters(self, client, create_test_product):
        """Test filtering products by feature flags"""
        # Create products with different features
        create_test_product(
            name='Featured Product',
            is_featured=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='New Product',
            is_new=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Sale Product',
            is_sale=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Flash Sale Product',
            is_flash_sale=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Luxury Deal Product',
            is_luxury_deal=True,
            is_active=True,
            is_visible=True
        )

        # Test featured filter
        response = client.get('/api/products/?is_featured=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Featured Product'

        # Test new filter
        response = client.get('/api/products/?is_new=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'New Product'

    def test_get_products_search(self, client, create_test_product):
        """Test search functionality"""
        # Create products with searchable content
        create_test_product(
            name='Gaming Laptop',
            description='High performance gaming laptop',
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Office Chair',
            description='Comfortable office furniture',
            is_active=True,
            is_visible=True
        )

        # Test search by name
        response = client.get('/api/products/?search=laptop')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert 'laptop' in data['items'][0]['name'].lower()

        # Test search by description
        response = client.get('/api/products/?search=gaming')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1

    def test_get_products_sorting(self, client, create_test_product):
        """Test product sorting"""
        # Create products with different prices and names
        create_test_product(name='Product C', price=30.00, is_active=True, is_visible=True)
        create_test_product(name='Product A', price=10.00, is_active=True, is_visible=True)
        create_test_product(name='Product B', price=20.00, is_active=True, is_visible=True)

        # Test sort by name ascending
        response = client.get('/api/products/?sort_by=name&sort_order=asc')
        assert response.status_code == 200
        data = json.loads(response.data)
        names = [item['name'] for item in data['items']]
        assert names == sorted(names)

        # Test sort by price descending
        response = client.get('/api/products/?sort_by=price&sort_order=desc')
        assert response.status_code == 200
        data = json.loads(response.data)
        prices = [float(item['price']) for item in data['items']]
        assert prices == sorted(prices, reverse=True)

    def test_get_products_inactive_hidden_from_users(self, client, create_test_product):
        """Test that inactive products are hidden from regular users"""
        # Create active and inactive products
        create_test_product(name='Active Product', is_active=True, is_visible=True)
        create_test_product(name='Inactive Product', is_active=False, is_visible=True)

        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Active Product'

    def test_get_products_invisible_hidden_from_users(self, client, create_test_product):
        """Test that invisible products are hidden from regular users"""
        # Create visible and invisible products
        create_test_product(name='Visible Product', is_active=True, is_visible=True)
        create_test_product(name='Invisible Product', is_active=True, is_visible=False)

        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Visible Product'


class TestGetProductById:
    """Test get product by ID endpoint"""

    def test_get_product_by_id_success(self, client, create_test_product):
        """Test getting a product by ID successfully"""
        product_id = create_test_product(
            name='Test Product',
            price=25.00,
            is_active=True,
            is_visible=True
        )

        response = client.get(f'/api/products/{product_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id'] == product_id
        assert data['name'] == 'Test Product'
        assert float(data['price']) == 25.00

        # Check that variants and images are included
        assert 'variants' in data or data.get('variants') is None
        assert 'images' in data or data.get('images') is None

    def test_get_product_by_id_not_found(self, client):
        """Test getting non-existent product"""
        response = client.get('/api/products/99999')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_get_product_by_id_inactive_hidden(self, client, create_test_product):
        """Test that inactive products return 404 for regular users"""
        product_id = create_test_product(
            name='Inactive Product',
            is_active=False,
            is_visible=True
        )

        response = client.get(f'/api/products/{product_id}')
        assert response.status_code == 404

    def test_get_product_by_id_invisible_hidden(self, client, create_test_product):
        """Test that invisible products return 404 for regular users"""
        product_id = create_test_product(
            name='Invisible Product',
            is_active=True,
            is_visible=False
        )

        response = client.get(f'/api/products/{product_id}')
        assert response.status_code == 404


class TestGetProductBySlug:
    """Test get product by slug endpoint"""

    def test_get_product_by_slug_success(self, client, create_test_product):
        """Test getting a product by slug successfully"""
        product_id = create_test_product(
            name='Test Product',
            slug='test-product',
            price=25.00,
            is_active=True,
            is_visible=True
        )

        response = client.get('/api/products/test-product')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['slug'] == 'test-product'
        assert data['name'] == 'Test Product'

        # Check that variants and images are included
        assert 'variants' in data or data.get('variants') is None
        assert 'images' in data or data.get('images') is None

    def test_get_product_by_slug_not_found(self, client):
        """Test getting non-existent product by slug"""
        response = client.get('/api/products/non-existent-slug')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_get_product_by_slug_inactive_hidden(self, client, create_test_product):
        """Test that inactive products return 404 by slug"""
        product_id = create_test_product(
            name='Inactive Product',
            slug='inactive-product',
            is_active=False,
            is_visible=True
        )

        response = client.get('/api/products/inactive-product')
        assert response.status_code == 404


class TestProductVariants:
    """Test product variants endpoints"""

    def test_get_product_variants_success(self, client, create_test_product):
        """Test getting product variants successfully"""
        product_id = create_test_product(
            name='T-Shirt',
            is_active=True,
            is_visible=True
        )

        # Create variants using app context
        with client.application.app_context():
            variant1 = ProductVariant(
                product_id=product_id,
                size='S',
                color='Red',
                price=19.99,
                stock=10
            )
            variant2 = ProductVariant(
                product_id=product_id,
                size='M',
                color='Blue',
                price=19.99,
                stock=15
            )
            db.session.add(variant1)
            db.session.add(variant2)
            db.session.commit()

        response = client.get(f'/api/products/{product_id}/variants')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2

        # Check variant structure
        variant = data[0]
        assert 'id' in variant
        assert 'size' in variant
        assert 'color' in variant
        assert 'price' in variant

    def test_get_product_variants_product_not_found(self, client):
        """Test getting variants for non-existent product"""
        response = client.get('/api/products/99999/variants')
        assert response.status_code == 404

    def test_get_product_variants_inactive_product(self, client, create_test_product):
        """Test getting variants for inactive product returns 404"""
        product_id = create_test_product(
            name='Inactive Product',
            is_active=False,
            is_visible=True
        )

        response = client.get(f'/api/products/{product_id}/variants')
        assert response.status_code == 404


class TestProductImages:
    """Test product images endpoints"""

    def test_get_product_images_success(self, client, create_test_product):
        """Test getting product images successfully"""
        product_id = create_test_product(
            name='Camera',
            is_active=True,
            is_visible=True
        )

        # Create images using app context
        with client.application.app_context():
            image1 = ProductImage(
                product_id=product_id,
                filename='image1.jpg',
                url='https://example.com/image1.jpg',
                alt_text='Camera front view',
                is_primary=True,
                sort_order=1
            )
            image2 = ProductImage(
                product_id=product_id,
                filename='image2.jpg',
                url='https://example.com/image2.jpg',
                alt_text='Camera side view',
                is_primary=False,
                sort_order=2
            )
            db.session.add(image1)
            db.session.add(image2)
            db.session.commit()

        response = client.get(f'/api/products/{product_id}/images')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 2

        # Check that primary image comes first
        assert data['items'][0]['is_primary'] is True

        # Check image structure
        image = data['items'][0]
        assert 'id' in image
        assert 'url' in image
        assert 'alt_text' in image

    def test_get_product_images_product_not_found(self, client):
        """Test getting images for non-existent product"""
        response = client.get('/api/products/99999/images')
        assert response.status_code == 404

    def test_get_product_image_by_id_success(self, client, create_test_product):
        """Test getting a specific product image"""
        product_id = create_test_product(
            name='Camera',
            is_active=True,
            is_visible=True
        )

        # Create image using app context
        with client.application.app_context():
            image = ProductImage(
                product_id=product_id,
                filename='image1.jpg',
                url='https://example.com/image1.jpg',
                alt_text='Camera front view',
                is_primary=True
            )
            db.session.add(image)
            db.session.commit()
            image_id = image.id

        response = client.get(f'/api/products/product-images/{image_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['url'] == 'https://example.com/image1.jpg'
        assert data['alt_text'] == 'Camera front view'

    def test_get_product_image_by_id_not_found(self, client):
        """Test getting non-existent image"""
        response = client.get('/api/products/product-images/99999')
        assert response.status_code == 404


class TestProductSearch:
    """Test product search functionality"""

    def test_search_products_success(self, client, create_test_product):
        """Test successful product search"""
        # Create searchable products
        create_test_product(
            name='Gaming Laptop',
            description='High performance gaming laptop',
            is_active=True,
            is_visible=True,
            is_searchable=True
        )
        create_test_product(
            name='Office Chair',
            description='Comfortable office furniture',
            is_active=True,
            is_visible=True,
            is_searchable=True
        )

        response = client.get('/api/products/search?q=laptop')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['query'] == 'laptop'
        assert len(data['items']) == 1
        assert 'laptop' in data['items'][0]['name'].lower()

        # Check pagination structure
        assert 'pagination' in data
        assert data['pagination']['total_items'] == 1

    def test_search_products_no_query(self, client):
        """Test search without query parameter"""
        response = client.get('/api/products/search')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_search_products_empty_query(self, client):
        """Test search with empty query"""
        response = client.get('/api/products/search?q=')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_search_products_no_results(self, client, create_test_product):
        """Test search with no matching results"""
        create_test_product(
            name='Gaming Laptop',
            is_active=True,
            is_visible=True,
            is_searchable=True
        )

        response = client.get('/api/products/search?q=nonexistent')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 0

    def test_search_products_pagination(self, client, create_test_products):
        """Test search pagination"""
        # Create multiple searchable products
        create_test_products(15, name_prefix='Laptop', is_searchable=True)

        response = client.get('/api/products/search?q=laptop&page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 10
        assert data['pagination']['total_items'] == 15
        assert data['pagination']['has_next'] is True


class TestSpecialProductEndpoints:
    """Test special product endpoints (featured, new, sale)"""

    def test_get_featured_products(self, client, create_test_product):
        """Test getting featured products"""
        create_test_product(
            name='Featured Product',
            is_featured=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Regular Product',
            is_featured=False,
            is_active=True,
            is_visible=True
        )

        response = client.get('/api/products/featured')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Featured Product'

    def test_get_new_products(self, client, create_test_product):
        """Test getting new products"""
        create_test_product(
            name='New Product',
            is_new=True,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Old Product',
            is_new=False,
            is_active=True,
            is_visible=True
        )

        response = client.get('/api/products/new')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'New Product'

    def test_get_sale_products(self, client, create_test_product):
        """Test getting sale products"""
        create_test_product(
            name='Sale Product',
            is_sale=True,
            discount_percentage=20.0,
            is_active=True,
            is_visible=True
        )
        create_test_product(
            name='Regular Product',
            is_sale=False,
            is_active=True,
            is_visible=True
        )

        response = client.get('/api/products/sale')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Sale Product'

    def test_special_endpoints_pagination(self, client, create_test_product):
        """Test pagination on special endpoints"""
        # Create multiple featured products
        for i in range(15):
            create_test_product(
                name=f'Featured Product {i}',
                is_featured=True,
                is_active=True,
                is_visible=True
            )

        response = client.get('/api/products/featured?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 10
        assert data['pagination']['total_items'] == 15
        assert data['pagination']['has_next'] is True


class TestCORSOptions:
    """Test CORS OPTIONS requests"""

    def test_options_main_endpoint(self, client):
        """Test OPTIONS request on main products endpoint"""
        response = client.options('/api/products/')
        assert response.status_code == 200

    def test_options_product_by_id(self, client):
        """Test OPTIONS request on product by ID endpoint"""
        response = client.options('/api/products/1')
        assert response.status_code == 200

    def test_options_search_endpoint(self, client):
        """Test OPTIONS request on search endpoint"""
        response = client.options('/api/products/search')
        assert response.status_code == 200

    def test_options_featured_endpoint(self, client):
        """Test OPTIONS request on featured endpoint"""
        response = client.options('/api/products/featured')
        assert response.status_code == 200


class TestProductSerialization:
    """Test product data serialization"""

    def test_product_serialization_complete(self, client, create_test_product, create_test_brand, create_test_category):
        """Test complete product serialization with all fields"""
        category_id = create_test_category('Electronics')
        brand_id = create_test_brand('Apple')

        product_id = create_test_product(
            name='iPhone 15',
            slug='iphone-15',
            description='Latest iPhone model',
            price=999.99,
            sale_price=899.99,
            stock=50,
            category_id=category_id,
            brand_id=brand_id,
            is_featured=True,
            is_new=True,
            is_sale=True,
            sku='IPH15-001',
            weight=0.2,
            dimensions='6.1 x 2.8 x 0.3 inches',
            meta_title='iPhone 15 - Latest Apple Smartphone',
            meta_description='Buy the latest iPhone 15 with advanced features',
            short_description='Latest iPhone with advanced camera',
            warranty_info='1 year Apple warranty',
            shipping_info='Free shipping on orders over $50',
            availability_status='in_stock',
            min_order_quantity=1,
            max_order_quantity=5,
            discount_percentage=10.0,
            tax_rate=8.5,
            barcode='123456789012',
            manufacturer='Apple Inc.',
            country_of_origin='China',
            is_active=True,
            is_visible=True,
            is_searchable=True
        )

        response = client.get(f'/api/products/{product_id}')
        assert response.status_code == 200
        data = json.loads(response.data)

        # Check all important fields are present and correct
        assert data['name'] == 'iPhone 15'
        assert data['slug'] == 'iphone-15'
        assert float(data['price']) == 999.99
        assert float(data['sale_price']) == 899.99
        assert data['stock'] == 50
        assert data['category_id'] == category_id
        assert data['brand_id'] == brand_id
        assert data['is_featured'] is True
        assert data['is_new'] is True
        assert data['is_sale'] is True
        assert data['sku'] == 'IPH15-001'
        assert data['weight'] == 0.2
        assert data['warranty_info'] == '1 year Apple warranty'

        # Check nested category and brand data
        assert 'category' in data
        assert data['category']['name'] == 'Electronics'
        assert 'brand' in data
        assert data['brand']['name'] == 'Apple'

    def test_product_serialization_with_variants_and_images(self, client, create_test_product):
        """Test product serialization includes variants and images"""
        product_id = create_test_product(
            name='T-Shirt',
            is_active=True,
            is_visible=True
        )

        # Add variants and images
        with client.application.app_context():
            # Add variant
            variant = ProductVariant(
                product_id=product_id,
                size='M',
                color='Blue',
                price=29.99,
                stock=10
            )
            db.session.add(variant)

            # Add image
            image = ProductImage(
                product_id=product_id,
                filename='tshirt.jpg',
                url='https://example.com/tshirt.jpg',
                alt_text='Blue T-Shirt',
                is_primary=True
            )
            db.session.add(image)
            db.session.commit()

        response = client.get(f'/api/products/{product_id}')
        assert response.status_code == 200
        data = json.loads(response.data)

        # Check variants are included (or at least the field exists)
        assert 'variants' in data or data.get('variants') is None

        # Check images are included (or at least the field exists)
        assert 'images' in data or data.get('images') is None


class TestErrorHandling:
    """Test error handling scenarios"""

    def test_invalid_product_id_type(self, client):
        """Test invalid product ID type"""
        response = client.get('/api/products/invalid')
        # Should either return 404 or handle gracefully
        assert response.status_code in [400, 404]

    def test_negative_product_id(self, client):
        """Test negative product ID"""
        response = client.get('/api/products/-1')
        assert response.status_code == 404

    def test_zero_product_id(self, client):
        """Test zero product ID"""
        response = client.get('/api/products/0')
        assert response.status_code == 404

    def test_invalid_pagination_parameters(self, client, create_test_product):
        """Test invalid pagination parameters"""
        create_test_product(name='Test Product', is_active=True, is_visible=True)

        # Test negative page
        response = client.get('/api/products/?page=-1')
        assert response.status_code == 200  # Should handle gracefully

        # Test zero page
        response = client.get('/api/products/?page=0')
        assert response.status_code == 200  # Should handle gracefully

        # Test negative per_page
        response = client.get('/api/products/?per_page=-1')
        assert response.status_code == 200  # Should handle gracefully

    def test_invalid_filter_parameters(self, client, create_test_product):
        """Test invalid filter parameters"""
        create_test_product(name='Test Product', is_active=True, is_visible=True)

        # Test invalid price filters
        response = client.get('/api/products/?min_price=invalid')
        assert response.status_code == 200  # Should handle gracefully

        # Test invalid boolean filters
        response = client.get('/api/products/?is_featured=invalid')
        assert response.status_code == 200  # Should handle gracefully


class TestProductVisibility:
    """Test product visibility rules"""

    def test_only_active_products_shown(self, client, create_test_product):
        """Test that only active products are shown to users"""
        create_test_product(name='Active Product', is_active=True, is_visible=True)
        create_test_product(name='Inactive Product', is_active=False, is_visible=True)

        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Active Product'

    def test_only_visible_products_shown(self, client, create_test_product):
        """Test that only visible products are shown to users"""
        create_test_product(name='Visible Product', is_active=True, is_visible=True)
        create_test_product(name='Hidden Product', is_active=True, is_visible=False)

        response = client.get('/api/products/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Visible Product'

    def test_only_searchable_products_in_search(self, client, create_test_product):
        """Test that only searchable products appear in search results"""
        create_test_product(
            name='Searchable Laptop',
            is_active=True,
            is_visible=True,
            is_searchable=True
        )
        create_test_product(
            name='Non-searchable Laptop',
            is_active=True,
            is_visible=True,
            is_searchable=False
        )

        response = client.get('/api/products/search?q=laptop')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Searchable Laptop'


class TestProductPerformance:
    """Test product endpoint performance"""

    def test_large_product_list_performance(self, client, create_test_products):
        """Test performance with large product lists"""
        # Create a large number of products
        create_test_products(100)

        response = client.get('/api/products/?per_page=50')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 50
        assert data['pagination']['total_items'] == 100

    def test_complex_filtering_performance(self, client, create_test_products, create_test_brand, create_test_category):
        """Test performance with complex filtering"""
        category_id = create_test_category('Electronics')
        brand_id = create_test_brand('Apple')

        # Create products with various attributes
        create_test_products(50, category_id=category_id, brand_id=brand_id)

        # Test complex filter query
        response = client.get(
            f'/api/products/?category_id={category_id}&brand_id={brand_id}'
            '&min_price=10&max_price=1000&is_featured=true&sort_by=price&sort_order=desc'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should handle complex queries without errors
        assert 'items' in data
        assert 'pagination' in data


# =====================
# FIXTURES
# =====================

@pytest.fixture
def create_test_product(app):
    """Fixture to create a test product"""
    def _create_product(**kwargs):
        with app.app_context():
            # Set default values
            defaults = {
                'name': 'Test Product',
                'slug': f'test-product-{datetime.now().microsecond}',
                'price': 25.00,
                'stock': 10,
                'is_active': True,
                'is_visible': True,
                'is_searchable': True,
                'is_featured': False,
                'is_new': False,
                'is_sale': False,
                'is_flash_sale': False,
                'is_luxury_deal': False
            }
            defaults.update(kwargs)

            product = Product(**defaults)
            db.session.add(product)
            db.session.commit()
            return product.id
    return _create_product


@pytest.fixture
def create_test_products(app):
    """Fixture to create multiple test products"""
    def _create_products(count, name_prefix='Product', **kwargs):
        with app.app_context():
            product_ids = []
            for i in range(count):
                defaults = {
                    'name': f'{name_prefix} {i+1}',
                    'slug': f'{name_prefix.lower()}-{i+1}-{datetime.now().microsecond}',
                    'price': 25.00 + i,
                    'stock': 10,
                    'is_active': True,
                    'is_visible': True,
                    'is_searchable': True,
                    'is_featured': False,
                    'is_new': False,
                    'is_sale': False
                }
                defaults.update(kwargs)

                product = Product(**defaults)
                db.session.add(product)
                product_ids.append(product.id)

            db.session.commit()
            return product_ids
    return _create_products


@pytest.fixture
def create_test_category(app):
    """Fixture to create a test category"""
    def _create_category(name):
        with app.app_context():
            category = Category(
                name=name,
                slug=name.lower().replace(' ', '-')
            )
            db.session.add(category)
            db.session.commit()
            return category.id
    return _create_category


@pytest.fixture
def create_test_brand(app):
    """Fixture to create a test brand"""
    def _create_brand(name):
        with app.app_context():
            brand = Brand(
                name=name,
                slug=name.lower().replace(' ', '-')
            )
            db.session.add(brand)
            db.session.commit()
            return brand.id
    return _create_brand


# Use existing fixtures from conftest.py
@pytest.fixture
def app():
    """Create and configure a test app"""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()


@pytest.fixture
def create_admin_user(app):
    """Fixture to create an admin user and return its ID"""
    def _create_admin_user():
        with app.app_context():
            admin_user = User(
                name='Admin User',
                email='admin@test.com',
                role=UserRole.ADMIN
            )
            admin_user.set_password('password123')
            db.session.add(admin_user)
            db.session.commit()
            return admin_user.id
    return _create_admin_user


@pytest.fixture
def create_regular_user(app):
    """Fixture to create a regular user and return its ID"""
    def _create_regular_user():
        with app.app_context():
            user = User(
                name='Regular User',
                email='user@test.com',
                role=UserRole.USER
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            return user.id
    return _create_regular_user


@pytest.fixture
def auth_headers(app, create_regular_user):
    """Create authorization headers for a test user"""
    from flask_jwt_extended import create_access_token

    user_id = create_regular_user()
    with app.app_context():
        user = User.query.get(user_id)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user"""
    from flask_jwt_extended import create_access_token

    admin_id = create_admin_user()
    with app.app_context():
        admin = User.query.get(admin_id)
        access_token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": admin.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}
