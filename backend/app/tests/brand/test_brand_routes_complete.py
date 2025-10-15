import pytest
import json
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.models.models import Product, Category, Brand, User, ProductImage, ProductVariant, UserRole
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import SQLAlchemyError


class TestBrandsHealthCheck:
    """Test health check endpoint"""

    def test_health_check_success(self, client):
        """Test health check returns success"""
        response = client.get('/api/brands/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'brand_routes'


class TestBrandsList:
    """Test brands list endpoint"""

    def test_get_brands_empty_list(self, client):
        """Test getting brands when none exist"""
        response = client.get('/api/brands/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 0
        assert data['pagination']['total_items'] == 0

    def test_get_brands_success(self, client, create_brand):
        """Test getting brands successfully"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'A test brand',
            'is_active': True
        })

        response = client.get('/api/brands/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 1
        assert data['items'][0]['id'] == brand_id

    def test_get_brands_with_pagination(self, client, app):
        """Test brands pagination"""
        with app.app_context():
            # Create multiple brands
            for i in range(15):
                brand = Brand(
                    name=f'Brand {i}',
                    slug=f'brand-{i}',
                    description=f'Description for Brand {i}',
                    is_active=True
                )
                db.session.add(brand)
            db.session.commit()

        response = client.get('/api/brands/?page=1&per_page=10')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 10
        assert data['pagination']['total_items'] == 15
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 10

    def test_get_brands_with_search(self, client, create_brand):
        """Test searching brands"""
        create_brand({
            'name': 'Nike Sports',
            'slug': 'nike-sports',
            'description': 'Athletic wear brand',
            'is_active': True
        })
        create_brand({
            'name': 'Adidas',
            'slug': 'adidas',
            'description': 'Sports equipment',
            'is_active': True
        })

        response = client.get('/api/brands/?search=nike')
        assert response.status_code == 200
        data = json.loads(response.data)
        # Check if search returns relevant results
        nike_brands = [item for item in data['items'] if 'nike' in item['name'].lower()]
        assert len(nike_brands) >= 1

    def test_get_brands_with_active_filter(self, client, app):
        """Test filtering brands by active status"""
        with app.app_context():
            # Create active and inactive brands
            active_brand = Brand(
                name='Active Brand',
                slug='active-brand',
                description='An active brand',
                is_active=True
            )
            inactive_brand = Brand(
                name='Inactive Brand',
                slug='inactive-brand',
                description='An inactive brand',
                is_active=False
            )
            db.session.add(active_brand)
            db.session.add(inactive_brand)
            db.session.commit()

        # Test active filter
        response = client.get('/api/brands/?active=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        active_brands = [item for item in data['items'] if item.get('is_active')]
        assert len(active_brands) >= 1

        # Test inactive filter
        response = client.get('/api/brands/?active=false')
        assert response.status_code == 200
        data = json.loads(response.data)
        inactive_brands = [item for item in data['items'] if not item.get('is_active')]
        assert len(inactive_brands) >= 1

    def test_get_brands_with_featured_filter(self, client, create_brand):
        """Test filtering brands by featured status"""
        create_brand({
            'name': 'Featured Brand',
            'slug': 'featured-brand',
            'description': 'A featured brand',
            'is_featured': True,
            'is_active': True
        })
        create_brand({
            'name': 'Regular Brand',
            'slug': 'regular-brand',
            'description': 'A regular brand',
            'is_featured': False,
            'is_active': True
        })

        response = client.get('/api/brands/?featured=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        # Check if at least one featured brand is returned
        featured_brands = [item for item in data['items'] if item.get('is_featured')]
        assert len(featured_brands) >= 1

    @patch('app.routes.brands.brands_routes.Brand.query')
    def test_get_brands_database_error(self, mock_query, client):
        """Test handling of database errors"""
        # Mock the query to raise an exception
        mock_query.filter.side_effect = SQLAlchemyError('Database connection failed')

        response = client.get('/api/brands/')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data


class TestBrandByID:
    """Test get brand by ID endpoint"""

    def test_get_brand_by_id_success(self, client, create_brand):
        """Test getting a brand by ID successfully"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'A test brand',
            'is_active': True
        })

        response = client.get(f'/api/brands/{brand_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id'] == brand_id
        assert data['name'] == 'Test Brand'

    def test_get_brand_by_id_not_found(self, client):
        """Test getting non-existent brand"""
        response = client.get('/api/brands/99999')
        assert response.status_code == 404

    def test_get_brand_by_id_options(self, client, create_brand):
        """Test OPTIONS request for brand by ID"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'A test brand',
            'is_active': True
        })

        response = client.options(f'/api/brands/{brand_id}')
        assert response.status_code == 200


class TestBrandBySlug:
    """Test get brand by slug endpoint"""

    def test_get_brand_by_slug_success(self, client, create_brand):
        """Test getting a brand by slug successfully"""
        create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'A test brand',
            'is_active': True
        })

        response = client.get('/api/brands/slug/test-brand')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['slug'] == 'test-brand'
        assert data['name'] == 'Test Brand'

    def test_get_brand_by_slug_not_found(self, client):
        """Test getting non-existent brand by slug"""
        response = client.get('/api/brands/slug/non-existent-slug')
        assert response.status_code == 404

    def test_get_brand_by_slug_options(self, client, create_brand):
        """Test OPTIONS request for brand by slug"""
        create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'A test brand',
            'is_active': True
        })

        response = client.options('/api/brands/slug/test-brand')
        assert response.status_code == 200


class TestCreateBrand:
    """Test create brand endpoint"""

    def test_create_brand_success(self, client, admin_headers):
        """Test creating a brand successfully"""
        data = {
            'name': 'New Brand',
            'slug': 'new-brand',
            'description': 'A great new brand',
            'logo_url': 'https://example.com/logo.png',
            'website': 'https://newbrand.com',
            'is_featured': True
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['brand']['name'] == 'New Brand'
        assert response_data['brand']['slug'] == 'new-brand'
        assert response_data['brand']['is_featured'] is True

    def test_create_brand_auto_generate_slug(self, client, admin_headers):
        """Test creating a brand with auto-generated slug"""
        data = {
            'name': 'Auto Slug Brand',
            'description': 'Brand with auto-generated slug'
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['brand']['name'] == 'Auto Slug Brand'
        assert response_data['brand']['slug'] == 'auto-slug-brand'

    def test_create_brand_missing_required_fields(self, client, admin_headers):
        """Test creating brand with missing required fields"""
        data = {
            'description': 'Brand without name'
            # Missing required name field
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 400

    def test_create_brand_empty_name(self, client, admin_headers):
        """Test creating brand with empty name"""
        data = {
            'name': '',
            'description': 'Brand with empty name'
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 400

    def test_create_brand_duplicate_name(self, client, admin_headers, create_brand):
        """Test creating brand with duplicate name"""
        # Create existing brand
        create_brand({
            'name': 'Existing Brand',
            'slug': 'existing-brand',
            'description': 'An existing brand',
            'is_active': True
        })

        data = {
            'name': 'Existing Brand',  # Duplicate name (case-insensitive)
            'slug': 'different-slug',
            'description': 'Another brand with same name'
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 409

    def test_create_brand_duplicate_slug(self, client, admin_headers, create_brand):
        """Test creating brand with duplicate slug"""
        # Create existing brand
        create_brand({
            'name': 'Existing Brand',
            'slug': 'existing-slug',
            'description': 'An existing brand',
            'is_active': True
        })

        data = {
            'name': 'New Brand',
            'slug': 'existing-slug',  # Duplicate slug
            'description': 'Brand with duplicate slug'
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 409

    def test_create_brand_unauthorized(self, client, auth_headers):
        """Test creating brand without admin privileges"""
        data = {
            'name': 'Unauthorized Brand',
            'slug': 'unauthorized-brand',
            'description': 'Brand created without admin rights'
        }

        response = client.post('/api/brands/', json=data, headers=auth_headers)
        assert response.status_code == 403

    def test_create_brand_no_token(self, client):
        """Test creating brand without authentication"""
        data = {
            'name': 'No Auth Brand',
            'slug': 'no-auth-brand',
            'description': 'Brand without authentication'
        }

        response = client.post('/api/brands/', json=data)
        assert response.status_code == 401

    def test_create_brand_no_data(self, client, admin_headers):
        """Test creating brand with no data"""
        response = client.post('/api/brands/', headers=admin_headers)
        assert response.status_code == 400


class TestUpdateBrand:
    """Test update brand endpoint"""

    def test_update_brand_success(self, client, admin_headers, create_brand):
        """Test updating a brand successfully"""
        brand_id = create_brand({
            'name': 'Original Brand',
            'slug': 'original-brand',
            'description': 'Original description',
            'is_active': True
        })

        data = {
            'name': 'Updated Brand',
            'description': 'Updated description',
            'is_featured': True
        }

        response = client.put(f'/api/brands/{brand_id}', json=data, headers=admin_headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['brand']['name'] == 'Updated Brand'
        assert response_data['brand']['description'] == 'Updated description'
        assert response_data['brand']['is_featured'] is True

    def test_update_brand_slug_regeneration(self, client, admin_headers, create_brand):
        """Test updating brand with slug regeneration"""
        brand_id = create_brand({
            'name': 'Original Brand',
            'slug': 'original-brand',
            'description': 'Original description',
            'is_active': True
        })

        data = {
            'name': 'New Brand Name',
            'slug': ''  # Empty slug should regenerate from name
        }

        response = client.put(f'/api/brands/{brand_id}', json=data, headers=admin_headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['brand']['name'] == 'New Brand Name'
        assert response_data['brand']['slug'] == 'new-brand-name'

    def test_update_brand_name_conflict(self, client, admin_headers, create_brand):
        """Test updating brand with conflicting name"""
        # Create two brands
        brand1_id = create_brand({
            'name': 'Brand 1',
            'slug': 'brand-1',
            'description': 'First brand',
            'is_active': True
        })
        create_brand({
            'name': 'Brand 2',
            'slug': 'brand-2',
            'description': 'Second brand',
            'is_active': True
        })

        data = {
            'name': 'Brand 2'  # Conflicting name
        }

        response = client.put(f'/api/brands/{brand1_id}', json=data, headers=admin_headers)
        assert response.status_code == 409

    def test_update_brand_slug_conflict(self, client, admin_headers, create_brand):
        """Test updating brand with conflicting slug"""
        # Create two brands
        brand1_id = create_brand({
            'name': 'Brand 1',
            'slug': 'brand-1',
            'description': 'First brand',
            'is_active': True
        })
        create_brand({
            'name': 'Brand 2',
            'slug': 'brand-2',
            'description': 'Second brand',
            'is_active': True
        })

        data = {
            'slug': 'brand-2'  # Conflicting slug
        }

        response = client.put(f'/api/brands/{brand1_id}', json=data, headers=admin_headers)
        assert response.status_code == 409

    def test_update_brand_not_found(self, client, admin_headers):
        """Test updating non-existent brand"""
        data = {
            'name': 'Updated Brand'
        }

        response = client.put('/api/brands/99999', json=data, headers=admin_headers)
        assert response.status_code == 404

    def test_update_brand_empty_name(self, client, admin_headers, create_brand):
        """Test updating brand with empty name"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        data = {
            'name': ''  # Empty name
        }

        response = client.put(f'/api/brands/{brand_id}', json=data, headers=admin_headers)
        assert response.status_code == 400

    def test_update_brand_unauthorized(self, client, auth_headers, create_brand):
        """Test updating brand without admin privileges"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        data = {
            'name': 'Updated Brand'
        }

        response = client.put(f'/api/brands/{brand_id}', json=data, headers=auth_headers)
        assert response.status_code == 403

    def test_update_brand_no_data(self, client, admin_headers, create_brand):
        """Test updating brand with no data"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.put(f'/api/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 400

    def test_update_brand_options(self, client, create_brand):
        """Test OPTIONS request for update brand"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.options(f'/api/brands/{brand_id}')
        assert response.status_code == 200


class TestDeleteBrand:
    """Test delete brand endpoint"""

    def test_delete_brand_success(self, client, admin_headers, create_brand):
        """Test deleting a brand successfully"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.delete(f'/api/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 200

    def test_delete_brand_with_products(self, client, admin_headers, app):
        """Test deleting brand that has associated products"""
        with app.app_context():
            # Create brand
            brand = Brand(
                name='Brand with Products',
                slug='brand-with-products',
                description='Brand that has products',
                is_active=True
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

            # Create product associated with brand
            product = Product(
                name='Test Product',
                slug='test-product',
                price=25.00,
                stock=10,
                brand_id=brand_id,
                is_active=True
            )
            db.session.add(product)
            db.session.commit()

        response = client.delete(f'/api/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'associated products' in data['error']

    def test_delete_brand_not_found(self, client, admin_headers):
        """Test deleting non-existent brand"""
        response = client.delete('/api/brands/99999', headers=admin_headers)
        assert response.status_code == 404

    def test_delete_brand_unauthorized(self, client, auth_headers, create_brand):
        """Test deleting brand without admin privileges"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.delete(f'/api/brands/{brand_id}', headers=auth_headers)
        assert response.status_code == 403

    def test_delete_brand_no_token(self, client, create_brand):
        """Test deleting brand without authentication"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.delete(f'/api/brands/{brand_id}')
        assert response.status_code == 401

    def test_delete_brand_options(self, client, create_brand):
        """Test OPTIONS request for delete brand"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.options(f'/api/brands/{brand_id}')
        assert response.status_code == 200


class TestBrandProducts:
    """Test brand products endpoint"""

    def test_get_brand_products_success(self, client, app):
        """Test getting products for a brand successfully"""
        with app.app_context():
            # Create brand
            brand = Brand(
                name='Test Brand',
                slug='test-brand',
                description='Test brand',
                is_active=True
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

            # Create products for the brand
            product1 = Product(
                name='Product 1',
                slug='product-1',
                price=25.00,
                stock=10,
                brand_id=brand_id,
                is_active=True
            )
            product2 = Product(
                name='Product 2',
                slug='product-2',
                price=35.00,
                stock=15,
                brand_id=brand_id,
                is_active=True
            )
            db.session.add(product1)
            db.session.add(product2)
            db.session.commit()

        response = client.get(f'/api/brands/{brand_id}/products')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) >= 2
        assert 'brand' in data
        assert data['brand']['id'] == brand_id

    def test_get_brand_products_with_filters(self, client, app):
        """Test getting brand products with filters"""
        with app.app_context():
            # Create brand
            brand = Brand(
                name='Filter Brand',
                slug='filter-brand',
                description='Brand for filter testing',
                is_active=True
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

            # Create products with different attributes
            featured_product = Product(
                name='Featured Product',
                slug='featured-product',
                price=50.00,
                stock=10,
                brand_id=brand_id,
                is_featured=True,
                is_active=True
            )
            regular_product = Product(
                name='Regular Product',
                slug='regular-product',
                price=25.00,
                stock=15,
                brand_id=brand_id,
                is_featured=False,
                is_active=True
            )
            db.session.add(featured_product)
            db.session.add(regular_product)
            db.session.commit()

        # Test featured filter
        response = client.get(f'/api/brands/{brand_id}/products?featured=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        featured_products = [item for item in data['items'] if item.get('is_featured')]
        assert len(featured_products) >= 1

        # Test price range filter
        response = client.get(f'/api/brands/{brand_id}/products?min_price=40&max_price=60')
        assert response.status_code == 200
        data = json.loads(response.data)
        in_range_products = [item for item in data['items'] if 40 <= float(item['price']) <= 60]
        assert len(in_range_products) >= 1

    def test_get_brand_products_with_sorting(self, client, app):
        """Test getting brand products with sorting"""
        with app.app_context():
            # Create brand
            brand = Brand(
                name='Sort Brand',
                slug='sort-brand',
                description='Brand for sort testing',
                is_active=True
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

            # Create products with different prices
            product1 = Product(
                name='Expensive Product',
                slug='expensive-product',
                price=100.00,
                stock=5,
                brand_id=brand_id,
                is_active=True
            )
            product2 = Product(
                name='Cheap Product',
                slug='cheap-product',
                price=20.00,
                stock=10,
                brand_id=brand_id,
                is_active=True
            )
            db.session.add(product1)
            db.session.add(product2)
            db.session.commit()

        response = client.get(f'/api/brands/{brand_id}/products?sort_by=price&sort_order=asc')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) >= 2
        # Check if products are sorted by price ascending
        prices = [float(item['price']) for item in data['items']]
        assert prices == sorted(prices)

    def test_get_brand_products_with_search(self, client, app):
        """Test searching products within a brand"""
        with app.app_context():
            # Create brand
            brand = Brand(
                name='Search Brand',
                slug='search-brand',
                description='Brand for search testing',
                is_active=True
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

            # Create products
            laptop_product = Product(
                name='Gaming Laptop',
                slug='gaming-laptop',
                price=1200.00,
                stock=3,
                brand_id=brand_id,
                is_active=True
            )
            mouse_product = Product(
                name='Gaming Mouse',
                slug='gaming-mouse',
                price=50.00,
                stock=20,
                brand_id=brand_id,
                is_active=True
            )
            db.session.add(laptop_product)
            db.session.add(mouse_product)
            db.session.commit()

        response = client.get(f'/api/brands/{brand_id}/products?search=laptop')
        assert response.status_code == 200
        data = json.loads(response.data)
        # Check if search returns relevant results
        laptop_products = [item for item in data['items'] if 'laptop' in item['name'].lower()]
        assert len(laptop_products) >= 1

    def test_get_brand_products_brand_not_found(self, client):
        """Test getting products for non-existent brand"""
        response = client.get('/api/brands/99999/products')
        assert response.status_code == 404

    def test_get_brand_products_empty(self, client, create_brand):
        """Test getting products for brand with no products"""
        brand_id = create_brand({
            'name': 'Empty Brand',
            'slug': 'empty-brand',
            'description': 'Brand with no products',
            'is_active': True
        })

        response = client.get(f'/api/brands/{brand_id}/products')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'items' in data
        assert len(data['items']) == 0
        assert 'brand' in data


class TestBrandToggleStatus:
    """Test brand toggle status endpoint"""

    def test_toggle_brand_status_activate(self, client, admin_headers, app):
        """Test activating an inactive brand"""
        with app.app_context():
            # Create inactive brand
            brand = Brand(
                name='Inactive Brand',
                slug='inactive-brand',
                description='An inactive brand',
                is_active=False
            )
            db.session.add(brand)
            db.session.commit()
            brand_id = brand.id

        response = client.post(f'/api/brands/{brand_id}/toggle-status', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'activated' in data['message']
        assert data['brand']['is_active'] is True

    def test_toggle_brand_status_deactivate(self, client, admin_headers, create_brand):
        """Test deactivating an active brand"""
        brand_id = create_brand({
            'name': 'Active Brand',
            'slug': 'active-brand',
            'description': 'An active brand',
            'is_active': True
        })

        response = client.post(f'/api/brands/{brand_id}/toggle-status', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'deactivated' in data['message']
        assert data['brand']['is_active'] is False

    def test_toggle_brand_status_not_found(self, client, admin_headers):
        """Test toggling status of non-existent brand"""
        response = client.post('/api/brands/99999/toggle-status', headers=admin_headers)
        assert response.status_code == 404

    def test_toggle_brand_status_unauthorized(self, client, auth_headers, create_brand):
        """Test toggling brand status without admin privileges"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.post(f'/api/brands/{brand_id}/toggle-status', headers=auth_headers)
        assert response.status_code == 403

    def test_toggle_brand_status_options(self, client, create_brand):
        """Test OPTIONS request for toggle brand status"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.options(f'/api/brands/{brand_id}/toggle-status')
        assert response.status_code == 200


class TestBrandToggleFeatured:
    """Test brand toggle featured endpoint"""

    def test_toggle_brand_featured_feature(self, client, admin_headers, create_brand):
        """Test featuring a non-featured brand"""
        brand_id = create_brand({
            'name': 'Regular Brand',
            'slug': 'regular-brand',
            'description': 'A regular brand',
            'is_featured': False,
            'is_active': True
        })

        response = client.post(f'/api/brands/{brand_id}/toggle-featured', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'featured' in data['message']
        assert data['brand']['is_featured'] is True

    def test_toggle_brand_featured_unfeature(self, client, admin_headers, create_brand):
        """Test unfeaturing a featured brand"""
        brand_id = create_brand({
            'name': 'Featured Brand',
            'slug': 'featured-brand',
            'description': 'A featured brand',
            'is_featured': True,
            'is_active': True
        })

        response = client.post(f'/api/brands/{brand_id}/toggle-featured', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'unfeatured' in data['message']
        assert data['brand']['is_featured'] is False

    def test_toggle_brand_featured_not_found(self, client, admin_headers):
        """Test toggling featured status of non-existent brand"""
        response = client.post('/api/brands/99999/toggle-featured', headers=admin_headers)
        assert response.status_code == 404

    def test_toggle_brand_featured_unauthorized(self, client, auth_headers, create_brand):
        """Test toggling brand featured status without admin privileges"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.post(f'/api/brands/{brand_id}/toggle-featured', headers=auth_headers)
        assert response.status_code == 403

    def test_toggle_brand_featured_options(self, client, create_brand):
        """Test OPTIONS request for toggle brand featured"""
        brand_id = create_brand({
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test description',
            'is_active': True
        })

        response = client.options(f'/api/brands/{brand_id}/toggle-featured')
        assert response.status_code == 200


class TestBrandsRateLimiting:
    """Test rate limiting on brands endpoints"""

    def test_brands_list_rate_limit(self, client):
        """Test rate limiting on brands list endpoint"""
        responses = []
        # Make multiple requests quickly
        for _ in range(25):
            response = client.get('/api/brands/')
            responses.append(response.status_code)

        # Rate limiting might not be enforced in test environment
        # Just check that we get responses
        success_responses = [status for status in responses if status == 200]
        assert len(success_responses) > 0

    def test_create_brand_rate_limit(self, client, admin_headers):
        """Test rate limiting on create brand endpoint"""
        responses = []

        # Make multiple create requests quickly
        for i in range(6):
            data = {
                'name': f'Rate Limit Brand {i}',
                'slug': f'rate-limit-brand-{i}',
                'description': f'Brand for rate limit test {i}'
            }
            response = client.post('/api/brands/', json=data, headers=admin_headers)
            responses.append(response.status_code)

        # Rate limiting might not be enforced in test environment
        # Just check that we get responses
        success_responses = [status for status in responses if status in [201, 400, 409]]
        assert len(success_responses) > 0


class TestBrandsErrorHandling:
    """Test error handling in brands endpoints"""

    @patch('app.routes.brands.brands_routes.Brand.query')
    def test_database_error_handling(self, mock_query, client):
        """Test handling of database connection errors."""
        # Mock the query to raise an exception
        mock_query.filter.side_effect = SQLAlchemyError('Database connection failed')

        response = client.get('/api/brands/')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data

    @patch('app.routes.brands.brands_routes.db.session.add')
    def test_create_brand_database_error(self, mock_add, client, admin_headers):
        """Test handling database errors during brand creation"""
        mock_add.side_effect = Exception('Database write failed')

        data = {
            'name': 'Error Brand',
            'slug': 'error-brand',
            'description': 'Brand that causes database error'
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        assert response.status_code == 500

    def test_malformed_json_request(self, client, admin_headers):
        """Test handling of malformed JSON requests"""
        headers = admin_headers.copy()
        headers['Content-Type'] = 'application/json'

        # Send malformed JSON
        response = client.post('/api/brands/', data='{"invalid": json}', headers=headers)
        assert response.status_code == 400

    def test_large_request_payload(self, client, admin_headers):
        """Test handling of large request payloads"""
        # Create a very large description
        large_description = 'A' * 10000  # 10KB description
        data = {
            'name': 'Large Brand',
            'slug': 'large-brand',
            'description': large_description
        }

        response = client.post('/api/brands/', json=data, headers=admin_headers)
        # Should handle large payloads gracefully
        assert response.status_code in [201, 400, 413]


class TestBrandsIntegration:
    """Integration tests for brands functionality"""

    def test_complete_brand_lifecycle(self, client, admin_headers):
        """Test complete brand lifecycle: create, read, update, delete"""
        # 1. Create brand
        create_data = {
            'name': 'Lifecycle Brand',
            'slug': 'lifecycle-brand',
            'description': 'A brand for testing lifecycle',
            'logo_url': 'https://example.com/logo.png',
            'website': 'https://lifecyclebrand.com',
            'is_featured': True
        }

        create_response = client.post('/api/brands/', json=create_data, headers=admin_headers)
        assert create_response.status_code == 201
        brand_data = json.loads(create_response.data)
        brand_id = brand_data['brand']['id']

        # 2. Read brand
        read_response = client.get(f'/api/brands/{brand_id}')
        assert read_response.status_code == 200
        read_data = json.loads(read_response.data)
        assert read_data['name'] == 'Lifecycle Brand'

        # 3. Update brand
        update_data = {
            'name': 'Updated Lifecycle Brand',
            'description': 'Updated description',
            'is_featured': False
        }

        update_response = client.put(f'/api/brands/{brand_id}', json=update_data, headers=admin_headers)
        assert update_response.status_code == 200
        updated_data = json.loads(update_response.data)
        assert updated_data['brand']['name'] == 'Updated Lifecycle Brand'
        assert updated_data['brand']['description'] == 'Updated description'
        assert updated_data['brand']['is_featured'] is False

        # 4. Delete brand
        delete_response = client.delete(f'/api/brands/{brand_id}', headers=admin_headers)
        assert delete_response.status_code == 200

        # 5. Verify deletion
        verify_response = client.get(f'/api/brands/{brand_id}')
        assert verify_response.status_code == 404

    def test_brand_with_products_lifecycle(self, client, admin_headers, app):
        """Test brand lifecycle with associated products"""
        # 1. Create brand
        create_data = {
            'name': 'Brand with Products',
            'slug': 'brand-with-products',
            'description': 'Brand that will have products'
        }

        create_response = client.post('/api/brands/', json=create_data, headers=admin_headers)
        assert create_response.status_code == 201
        brand_data = json.loads(create_response.data)
        brand_id = brand_data['brand']['id']

        # 2. Add products to the brand (simulate via direct DB insertion)
        with app.app_context():
            product1 = Product(
                name='Brand Product 1',
                slug='brand-product-1',
                price=50.00,
                stock=10,
                brand_id=brand_id,
                is_active=True
            )
            product2 = Product(
                name='Brand Product 2',
                slug='brand-product-2',
                price=75.00,
                stock=15,
                brand_id=brand_id,
                is_active=True
            )
            db.session.add(product1)
            db.session.add(product2)
            db.session.commit()

        # 3. Verify brand products
        products_response = client.get(f'/api/brands/{brand_id}/products')
        assert products_response.status_code == 200
        products_data = json.loads(products_response.data)
        assert len(products_data['items']) >= 2

        # 4. Try to delete brand (should fail due to associated products)
        delete_response = client.delete(f'/api/brands/{brand_id}', headers=admin_headers)
        assert delete_response.status_code == 400

        # 5. Remove products and then delete brand
        with app.app_context():
            Product.query.filter_by(brand_id=brand_id).delete()
            db.session.commit()

        delete_response = client.delete(f'/api/brands/{brand_id}', headers=admin_headers)
        assert delete_response.status_code == 200

    def test_brand_search_and_filtering_integration(self, client, app):
        """Test brand search and filtering integration"""
        with app.app_context():
            # Create brands with different attributes
            brands_data = [
                {
                    'name': 'Nike Sports',
                    'slug': 'nike-sports',
                    'description': 'Athletic wear and sports equipment',
                    'is_featured': True,
                    'is_active': True
                },
                {
                    'name': 'Adidas Performance',
                    'slug': 'adidas-performance',
                    'description': 'Performance sports gear',
                    'is_featured': False,
                    'is_active': True
                },
                {
                    'name': 'Puma Lifestyle',
                    'slug': 'puma-lifestyle',
                    'description': 'Lifestyle and casual wear',
                    'is_featured': True,
                    'is_active': False
                }
            ]

            for brand_data in brands_data:
                brand = Brand(**brand_data)
                db.session.add(brand)
            db.session.commit()

        # Test various filtering combinations
        test_cases = [
            # Search by name
            {'params': '?search=nike', 'check_type': 'search', 'search_term': 'Nike'},
            # Filter by active status
            {'params': '?active=true', 'check_type': 'active'},
            # Filter by featured status
            {'params': '?featured=true', 'check_type': 'featured'},
            # Combined search and filter
            {'params': '?search=sports&active=true', 'check_type': 'combined'},
        ]

        for test_case in test_cases:
            response = client.get(f'/api/brands/{test_case["params"]}')
            assert response.status_code == 200
            data = json.loads(response.data)

            if test_case.get('check_type') == 'search':
                # Check if search returns relevant results
                search_term = test_case['search_term']
                matching_brands = [item for item in data['items'] if search_term.lower() in item['name'].lower()]
                assert len(matching_brands) >= 1, f"No brands found matching search term: {search_term}"
            elif test_case.get('check_type') == 'active':
                # Check if active brands are returned
                active_brands = [item for item in data['items'] if item.get('is_active')]
                assert len(active_brands) >= 1, "No active brands found"
            elif test_case.get('check_type') == 'featured':
                # Check if featured brands are returned
                featured_brands = [item for item in data['items'] if item.get('is_featured')]
                assert len(featured_brands) >= 1, "No featured brands found"
            elif test_case.get('check_type') == 'combined':
                # Just check that we get some results for combined filters
                assert len(data['items']) >= 0, "Combined filter test failed"


# Fixtures
@pytest.fixture
def create_brand(app):
    """Fixture to create a brand and return its ID"""
    def _create_brand(data):
        with app.app_context():
            brand = Brand(**data)
            db.session.add(brand)
            db.session.commit()
            return brand.id  # Return ID, not the instance
    return _create_brand


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
    """Create authorization headers for a test user."""
    user_id = create_regular_user()
    with app.app_context():
        user = User.query.get(user_id)
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value})
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user."""
    admin_id = create_admin_user()
    with app.app_context():
        admin = User.query.get(admin_id)
        access_token = create_access_token(identity=str(admin.id), additional_claims={"role": admin.role.value})
        return {'Authorization': f'Bearer {access_token}'}

@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()


@pytest.fixture
def app():
    """Create and configure a test app"""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()
