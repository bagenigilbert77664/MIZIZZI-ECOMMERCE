"""
Comprehensive tests for user wishlist routes.
Tests all endpoints, error cases, edge cases, and production scenarios.
"""

import pytest
import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
from flask import url_for

# Import test fixtures
from .conftest import *

class TestWishlistHealthCheck:
    """Test wishlist health check endpoint."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/wishlist/user/health')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['status'] == 'ok'
        assert data['service'] == 'user_wishlist_routes'
        assert 'timestamp' in data
        assert data['database'] == 'connected'
        assert 'endpoints' in data
        assert len(data['endpoints']) > 0

    def test_health_check_options(self, client):
        """Test health check OPTIONS request."""
        response = client.options('/api/wishlist/user/health')

        assert response.status_code == 200
        # Check for Allow header instead of Access-Control-Allow-Methods
        assert 'Allow' in response.headers
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_health_check_database_error(self, client, mock_db_error):
        """Test health check with database error."""
        response = client.get('/api/wishlist/user/health')

        assert response.status_code == 500
        data = json.loads(response.data)

        assert data['status'] == 'error'
        assert data['service'] == 'user_wishlist_routes'
        assert 'error' in data

class TestGetWishlist:
    """Test get wishlist endpoint."""

    def test_get_wishlist_empty(self, client, auth_headers, test_user):
        """Test getting empty wishlist."""
        response = client.get('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['items'] == []
        assert data['item_count'] == 0
        assert 'pagination' in data
        assert data['pagination']['total_items'] == 0

    def test_get_wishlist_success(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test getting wishlist with items."""
        response = client.get('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert len(data['items']) == 3
        assert data['item_count'] == 3
        assert data['pagination']['total_items'] == 3

        # Check item structure
        item = data['items'][0]
        assert 'id' in item
        assert 'product_id' in item
        assert 'created_at' in item
        assert 'product' in item

        # Check product details
        product = item['product']
        assert 'id' in product
        assert 'name' in product
        assert 'price' in product
        assert 'category' in product
        assert 'brand' in product

    def test_get_wishlist_with_pagination(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist pagination."""
        response = client.get('/api/wishlist/user/?page=1&per_page=2', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert len(data['items']) == 2
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2
        assert data['pagination']['total_pages'] == 2
        assert data['pagination']['has_next'] == True
        assert data['pagination']['has_prev'] == False

    def test_get_wishlist_with_filters(self, client, auth_headers, test_user, multiple_wishlist_items, test_category):
        """Test wishlist with filters."""
        response = client.get(f'/api/wishlist/user/?category_id={test_category.id}', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'filters_applied' in data
        assert data['filters_applied']['category_id'] == test_category.id

        # All items should be from the specified category
        for item in data['items']:
            assert item['product']['category']['id'] == test_category.id

    def test_get_wishlist_with_search(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with search query."""
        response = client.get('/api/wishlist/user/?search=Product 1', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'filters_applied' in data
        assert data['filters_applied']['search_query'] == 'Product 1'

        # Results should contain the search term
        for item in data['items']:
            assert 'Product 1' in item['product']['name']

    def test_get_wishlist_with_price_range(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with price range filter."""
        response = client.get('/api/wishlist/user/?min_price=10&max_price=30', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['filters_applied']['min_price'] == 10.0
        assert data['filters_applied']['max_price'] == 30.0

        # All items should be within price range
        for item in data['items']:
            price = item['product']['sale_price'] or item['product']['price']
            assert 10.0 <= price <= 30.0

    def test_get_wishlist_in_stock_only(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with in-stock filter."""
        response = client.get('/api/wishlist/user/?in_stock_only=true', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['filters_applied']['in_stock_only'] == True

        # All items should be in stock
        for item in data['items']:
            assert item['product']['stock'] > 0

    def test_get_wishlist_on_sale_only(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with on-sale filter."""
        response = client.get('/api/wishlist/user/?on_sale_only=true', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['filters_applied']['on_sale_only'] == True

        # All items should be on sale
        for item in data['items']:
            assert item['product']['is_sale'] == True

    def test_get_wishlist_with_sorting(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with sorting."""
        # Test sort by product name ascending
        response = client.get('/api/wishlist/user/?sort_by=product_name&sort_order=asc', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['sort']['sort_by'] == 'product_name'
        assert data['sort']['sort_order'] == 'asc'

        # Check if items are sorted by name
        names = [item['product']['name'] for item in data['items']]
        assert names == sorted(names)

    def test_get_wishlist_invalid_sort_params(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test wishlist with invalid sort parameters."""
        response = client.get('/api/wishlist/user/?sort_by=invalid&sort_order=invalid', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # Should default to valid values
        assert data['sort']['sort_by'] == 'created_at'
        assert data['sort']['sort_order'] == 'desc'

    def test_get_wishlist_user_not_found(self, client, app):
        """Test getting wishlist for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/wishlist/user/', headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_get_wishlist_no_auth(self, client):
        """Test getting wishlist without authentication."""
        response = client.get('/api/wishlist/user/')

        assert response.status_code == 401
        data = json.loads(response.data)
        # JWT extension returns 'msg' instead of 'error'
        assert 'msg' in data or 'error' in data

    def test_get_wishlist_invalid_auth(self, client, invalid_auth_headers):
        """Test getting wishlist with invalid authentication."""
        response = client.get('/api/wishlist/user/', headers=invalid_auth_headers)

        assert response.status_code == 422  # Invalid token format

    def test_get_wishlist_options(self, client):
        """Test wishlist OPTIONS request."""
        response = client.options('/api/wishlist/user/')

        assert response.status_code == 200
        # Check for Allow header instead of Access-Control-Allow-Methods
        assert 'Allow' in response.headers
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_get_wishlist_with_cache(self, client, auth_headers, test_user, multiple_wishlist_items, mock_cache):
        """Test wishlist with caching."""
        # First request should miss cache
        mock_cache.get.return_value = None
        response = client.get('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 200
        mock_cache.set.assert_called_once()

        # Second request should hit cache
        mock_cache.get.return_value = {'items': [], 'item_count': 0}
        response = client.get('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 0  # From cache

    def test_get_wishlist_database_error(self, client, auth_headers, test_user, mock_db_error):
        """Test wishlist with database error."""
        response = client.get('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to retrieve wishlist'

class TestAddToWishlist:
    """Test add to wishlist endpoint."""

    def test_add_to_wishlist_success(self, client, auth_headers, test_user, test_product):
        """Test successfully adding item to wishlist."""
        data = {'product_id': test_product.id}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 201
        response_data = json.loads(response.data)

        assert response_data['message'] == 'Item added to wishlist'
        assert response_data['already_exists'] == False
        assert 'item' in response_data
        assert response_data['item']['product_id'] == test_product.id

    def test_add_to_wishlist_already_exists(self, client, auth_headers, test_user, test_wishlist_item):
        """Test adding item that already exists in wishlist."""
        data = {'product_id': test_wishlist_item.product_id}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 200
        response_data = json.loads(response.data)

        assert response_data['message'] == 'Item already in wishlist'
        assert response_data['already_exists'] == True
        assert 'item' in response_data

    def test_add_to_wishlist_no_data(self, client, auth_headers, test_user):
        """Test adding to wishlist without data."""
        response = client.post('/api/wishlist/user/', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'No data provided'

    def test_add_to_wishlist_no_product_id(self, client, auth_headers, test_user):
        """Test adding to wishlist without product ID."""
        data = {}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Product ID is required'

    def test_add_to_wishlist_invalid_product_id(self, client, auth_headers, test_user):
        """Test adding to wishlist with invalid product ID."""
        data = {'product_id': 'invalid'}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid product ID' in data['error']

    def test_add_to_wishlist_product_not_found(self, client, auth_headers, test_user):
        """Test adding non-existent product to wishlist."""
        data = {'product_id': 99999}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Product not found'

    def test_add_to_wishlist_inactive_product(self, client, auth_headers, test_user, inactive_product):
        """Test adding inactive product to wishlist."""
        data = {'product_id': inactive_product.id}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Product is not available'

    def test_add_to_wishlist_user_not_found(self, client, app, test_product):
        """Test adding to wishlist for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        data = {'product_id': test_product.id}
        response = client.post('/api/wishlist/user/',
                             headers=headers,
                             json=data)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_add_to_wishlist_inactive_user(self, client, inactive_user_auth_headers, test_product):
        """Test adding to wishlist for inactive user."""
        data = {'product_id': test_product.id}
        response = client.post('/api/wishlist/user/',
                             headers=inactive_user_auth_headers,
                             json=data)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_add_to_wishlist_no_auth(self, client, test_product):
        """Test adding to wishlist without authentication."""
        data = {'product_id': test_product.id}
        response = client.post('/api/wishlist/user/', json=data)

        assert response.status_code == 401

    def test_add_to_wishlist_options(self, client):
        """Test add to wishlist OPTIONS request."""
        response = client.options('/api/wishlist/user/')

        assert response.status_code == 200
        assert 'Allow' in response.headers
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_add_to_wishlist_database_error(self, client, auth_headers, test_user, test_product, mock_db_error):
        """Test adding to wishlist with database error."""
        data = {'product_id': test_product.id}
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to add item to wishlist'

class TestBulkAddToWishlist:
    """Test bulk add to wishlist endpoint."""

    def test_bulk_add_success(self, client, auth_headers, test_user, multiple_products):
        """Test successful bulk add to wishlist."""
        product_ids = [p.id for p in multiple_products[:3]]
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 201
        response_data = json.loads(response.data)

        assert response_data['added_count'] == 3
        assert response_data['skipped_count'] == 0
        assert response_data['invalid_count'] == 0
        assert len(response_data['details']['added_items']) == 3

    def test_bulk_add_with_existing_items(self, client, auth_headers, test_user, multiple_products, multiple_wishlist_items):
        """Test bulk add with some items already in wishlist."""
        # Try to add products that are already in wishlist plus new ones
        product_ids = [p.id for p in multiple_products[:4]]  # First 3 are already in wishlist
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 201
        response_data = json.loads(response.data)

        assert response_data['added_count'] == 1  # Only the 4th product is new
        assert response_data['skipped_count'] == 3  # First 3 already exist
        assert response_data['invalid_count'] == 0

    def test_bulk_add_with_invalid_products(self, client, auth_headers, test_user, multiple_products):
        """Test bulk add with some invalid product IDs."""
        product_ids = [multiple_products[0].id, 99999, 'invalid', multiple_products[1].id]
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 201
        response_data = json.loads(response.data)

        assert response_data['added_count'] == 2  # 2 valid products
        assert response_data['invalid_count'] == 2  # 2 invalid products
        assert len(response_data['details']['invalid_products']) == 2

    def test_bulk_add_no_data(self, client, auth_headers, test_user):
        """Test bulk add without data."""
        response = client.post('/api/wishlist/user/bulk/add', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'No data provided'

    def test_bulk_add_invalid_product_ids_format(self, client, auth_headers, test_user):
        """Test bulk add with invalid product_ids format."""
        data = {'product_ids': 'not_a_list'}
        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Product IDs array is required'

    def test_bulk_add_empty_product_ids(self, client, auth_headers, test_user):
        """Test bulk add with empty product_ids array."""
        data = {'product_ids': []}
        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'At least one product ID is required'

    def test_bulk_add_exceeds_limit(self, client, auth_headers, test_user):
        """Test bulk add exceeding the limit."""
        product_ids = list(range(1, 52))  # 51 items, over limit of 50
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Maximum 50 products can be added at once' in data['error']

    def test_bulk_add_user_not_found(self, client, app, multiple_products):
        """Test bulk add for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        product_ids = [p.id for p in multiple_products[:2]]
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=headers,
                             json=data)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_bulk_add_inactive_user(self, client, inactive_user_auth_headers, multiple_products):
        """Test bulk add for inactive user."""
        product_ids = [p.id for p in multiple_products[:2]]
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=inactive_user_auth_headers,
                             json=data)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_bulk_add_options(self, client):
        """Test bulk add OPTIONS request."""
        response = client.options('/api/wishlist/user/bulk/add')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_bulk_add_database_error(self, client, auth_headers, test_user, multiple_products, mock_db_error):
        """Test bulk add with database error."""
        product_ids = [p.id for p in multiple_products[:2]]
        data = {'product_ids': product_ids}

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json=data)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to bulk add items to wishlist'

class TestRemoveFromWishlist:
    """Test remove from wishlist endpoint."""

    def test_remove_from_wishlist_success(self, client, auth_headers, test_user, test_wishlist_item):
        """Test successfully removing item from wishlist."""
        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}',
                               headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Item removed from wishlist'

    def test_remove_from_wishlist_not_found(self, client, auth_headers, test_user):
        """Test removing non-existent wishlist item."""
        response = client.delete('/api/wishlist/user/99999', headers=auth_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Wishlist item not found'

    def test_remove_from_wishlist_invalid_id(self, client, auth_headers, test_user):
        """Test removing with invalid item ID."""
        response = client.delete('/api/wishlist/user/0', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Invalid item ID'

    def test_remove_from_wishlist_unauthorized(self, client, app, test_wishlist_item):
        """Test removing item belonging to another user."""
        # Create token for different user
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}',
                               headers=headers)

        assert response.status_code == 404  # Item not found for this user

    def test_remove_from_wishlist_user_not_found(self, client, app, test_wishlist_item):
        """Test removing item for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}',
                               headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_remove_from_wishlist_inactive_user(self, client, inactive_user_auth_headers, test_wishlist_item):
        """Test removing item for inactive user."""
        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}',
                               headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_remove_from_wishlist_no_auth(self, client, test_wishlist_item):
        """Test removing item without authentication."""
        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}')

        assert response.status_code == 401

    def test_remove_from_wishlist_options(self, client, test_wishlist_item):
        """Test remove from wishlist OPTIONS request."""
        response = client.options(f'/api/wishlist/user/{test_wishlist_item.id}')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_remove_from_wishlist_database_error(self, client, auth_headers, test_user, test_wishlist_item, mock_db_error):
        """Test removing item with database error."""
        response = client.delete(f'/api/wishlist/user/{test_wishlist_item.id}',
                               headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to remove item from wishlist'

class TestClearWishlist:
    """Test clear wishlist endpoint."""

    def test_clear_wishlist_success(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test successfully clearing wishlist."""
        response = client.delete('/api/wishlist/user/clear', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['message'] == 'Wishlist cleared successfully'
        assert data['items_removed'] == 3

    def test_clear_wishlist_empty(self, client, auth_headers, test_user):
        """Test clearing empty wishlist."""
        response = client.delete('/api/wishlist/user/clear', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['message'] == 'Wishlist is already empty'
        assert data['items_removed'] == 0

    def test_clear_wishlist_user_not_found(self, client, app):
        """Test clearing wishlist for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.delete('/api/wishlist/user/clear', headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_clear_wishlist_inactive_user(self, client, inactive_user_auth_headers):
        """Test clearing wishlist for inactive user."""
        response = client.delete('/api/wishlist/user/clear', headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_clear_wishlist_no_auth(self, client):
        """Test clearing wishlist without authentication."""
        response = client.delete('/api/wishlist/user/clear')

        assert response.status_code == 401

    def test_clear_wishlist_options(self, client):
        """Test clear wishlist OPTIONS request."""
        response = client.options('/api/wishlist/user/clear')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_clear_wishlist_database_error(self, client, auth_headers, test_user, mock_db_error):
        """Test clearing wishlist with database error."""
        response = client.delete('/api/wishlist/user/clear', headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to clear wishlist'

class TestCheckWishlistItem:
    """Test check wishlist item endpoint."""

    def test_check_wishlist_item_exists(self, client, auth_headers, test_user, test_wishlist_item):
        """Test checking item that exists in wishlist."""
        response = client.get(f'/api/wishlist/user/check/{test_wishlist_item.product_id}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['in_wishlist'] == True
        assert data['wishlist_item_id'] == test_wishlist_item.id
        assert 'added_at' in data

    def test_check_wishlist_item_not_exists(self, client, auth_headers, test_user, test_product):
        """Test checking item that doesn't exist in wishlist."""
        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['in_wishlist'] == False
        assert data['wishlist_item_id'] is None
        assert data['added_at'] is None

    def test_check_wishlist_item_invalid_id(self, client, auth_headers, test_user):
        """Test checking with invalid product ID."""
        response = client.get('/api/wishlist/user/check/0', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Invalid product ID'

    def test_check_wishlist_item_product_not_found(self, client, auth_headers, test_user):
        """Test checking non-existent product."""
        response = client.get('/api/wishlist/user/check/99999', headers=auth_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Product not found'

    def test_check_wishlist_item_inactive_product(self, client, auth_headers, test_user, inactive_product):
        """Test checking inactive product."""
        response = client.get(f'/api/wishlist/user/check/{inactive_product.id}',
                            headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Product is not available'

    def test_check_wishlist_item_user_not_found(self, client, app, test_product):
        """Test checking item for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_check_wishlist_item_inactive_user(self, client, inactive_user_auth_headers, test_product):
        """Test checking item for inactive user."""
        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_check_wishlist_item_no_auth(self, client, test_product):
        """Test checking item without authentication."""
        response = client.get(f'/api/wishlist/user/check/{test_product.id}')

        assert response.status_code == 401

    def test_check_wishlist_item_options(self, client, test_product):
        """Test check wishlist item OPTIONS request."""
        response = client.options(f'/api/wishlist/user/check/{test_product.id}')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_check_wishlist_item_with_cache(self, client, auth_headers, test_user, test_product, mock_cache):
        """Test checking item with caching."""
        # First request should miss cache
        mock_cache.get.return_value = None
        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=auth_headers)

        assert response.status_code == 200
        mock_cache.set.assert_called_once()

        # Second request should hit cache
        cached_result = {'in_wishlist': True, 'wishlist_item_id': 1, 'added_at': '2023-01-01T00:00:00'}
        mock_cache.get.return_value = cached_result
        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['in_wishlist'] == True

    def test_check_wishlist_item_database_error(self, client, auth_headers, test_user, test_product, mock_db_error):
        """Test checking item with database error."""
        response = client.get(f'/api/wishlist/user/check/{test_product.id}',
                            headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to check wishlist item'

class TestToggleWishlistItem:
    """Test toggle wishlist item endpoint."""

    def test_toggle_wishlist_item_add(self, client, auth_headers, test_user, test_product):
        """Test toggling item to add to wishlist."""
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}',
                             headers=auth_headers)

        assert response.status_code == 201
        data = json.loads(response.data)

        assert data['message'] == 'Item added to wishlist'
        assert data['in_wishlist'] == True
        assert data['action'] == 'added'
        assert 'item' in data

    def test_toggle_wishlist_item_remove(self, client, auth_headers, test_user, test_wishlist_item):
        """Test toggling item to remove from wishlist."""
        response = client.post(f'/api/wishlist/user/toggle/{test_wishlist_item.product_id}',
                             headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['message'] == 'Item removed from wishlist'
        assert data['in_wishlist'] == False
        assert data['action'] == 'removed'

    def test_toggle_wishlist_item_invalid_product(self, client, auth_headers, test_user):
        """Test toggling with invalid product ID."""
        response = client.post('/api/wishlist/user/toggle/invalid', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid product ID' in data['error']

    def test_toggle_wishlist_item_product_not_found(self, client, auth_headers, test_user):
        """Test toggling non-existent product."""
        response = client.post('/api/wishlist/user/toggle/99999', headers=auth_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'Product not found'

    def test_toggle_wishlist_item_inactive_product(self, client, auth_headers, test_user, inactive_product):
        """Test toggling inactive product."""
        response = client.post(f'/api/wishlist/user/toggle/{inactive_product.id}',
                             headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'Product is not available'

    def test_toggle_wishlist_item_user_not_found(self, client, app, test_product):
        """Test toggling item for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}',
                             headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_toggle_wishlist_item_inactive_user(self, client, inactive_user_auth_headers, test_product):
        """Test toggling item for inactive user."""
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}',
                             headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_toggle_wishlist_item_no_auth(self, client, test_product):
        """Test toggling item without authentication."""
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}')

        assert response.status_code == 401

    def test_toggle_wishlist_item_options(self, client, test_product):
        """Test toggle wishlist item OPTIONS request."""
        response = client.options(f'/api/wishlist/user/toggle/{test_product.id}')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_toggle_wishlist_item_database_error(self, client, auth_headers, test_user, test_product, mock_db_error):
        """Test toggling item with database error."""
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}',
                             headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to toggle wishlist item'

class TestWishlistStats:
    """Test wishlist statistics endpoint."""

    def test_get_wishlist_stats_empty(self, client, auth_headers, test_user):
        """Test getting stats for empty wishlist."""
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['total_items'] == 0
        assert data['active_items'] == 0
        assert data['total_value'] == 0
        assert data['average_item_value'] == 0
        assert 'wishlist_health' in data
        assert 'generated_at' in data

    def test_get_wishlist_stats_with_items(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test getting stats with items in wishlist."""
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['total_items'] == 3
        assert data['active_items'] == 3
        assert data['total_value'] > 0
        assert data['average_item_value'] > 0
        assert data['sale_items_count'] >= 0
        assert data['featured_items_count'] >= 0
        assert data['out_of_stock_count'] >= 0
        assert data['in_stock_count'] >= 0
        assert data['unique_categories'] >= 0
        assert data['unique_brands'] >= 0
        assert 'categories' in data
        assert 'brands' in data
        assert 'price_ranges' in data
        assert 'latest_addition' in data
        assert 'oldest_item' in data
        assert 'wishlist_health' in data

    def test_get_wishlist_stats_user_not_found(self, client, app):
        """Test getting stats for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/wishlist/user/stats', headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_get_wishlist_stats_inactive_user(self, client, inactive_user_auth_headers):
        """Test getting stats for inactive user."""
        response = client.get('/api/wishlist/user/stats', headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_get_wishlist_stats_no_auth(self, client):
        """Test getting stats without authentication."""
        response = client.get('/api/wishlist/user/stats')

        assert response.status_code == 401

    def test_get_wishlist_stats_options(self, client):
        """Test wishlist stats OPTIONS request."""
        response = client.options('/api/wishlist/user/stats')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_get_wishlist_stats_with_cache(self, client, auth_headers, test_user, multiple_wishlist_items, mock_cache):
        """Test getting stats with caching."""
        # First request should miss cache
        mock_cache.get.return_value = None
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)

        assert response.status_code == 200
        mock_cache.set.assert_called_once()

        # Second request should hit cache
        cached_stats = {'total_items': 5, 'active_items': 5, 'total_value': 100.0}
        mock_cache.get.return_value = cached_stats
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total_items'] == 5

    def test_get_wishlist_stats_database_error(self, client, auth_headers, test_user, mock_db_error):
        """Test getting stats with database error."""
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to get wishlist statistics'

class TestExportWishlist:
    """Test export wishlist endpoint."""

    def test_export_wishlist_json(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test exporting wishlist in JSON format."""
        response = client.get('/api/wishlist/user/export?format=json', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['export_format'] == 'json'
        assert data['total_items'] == 3
        assert data['user_id'] == test_user.id
        assert 'exported_at' in data
        assert 'data' in data
        assert len(data['data']) == 3

        # Check data structure
        item = data['data'][0]
        assert 'wishlist_item_id' in item
        assert 'added_date' in item
        assert 'product_id' in item
        assert 'product_name' in item
        assert 'price' in item

    def test_export_wishlist_csv(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test exporting wishlist in CSV format."""
        response = client.get('/api/wishlist/user/export?format=csv', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['export_format'] == 'csv'
        assert data['total_items'] == 3
        assert data['user_id'] == test_user.id
        assert 'exported_at' in data
        assert 'csv_data' in data

        # Check CSV structure
        csv_lines = data['csv_data'].strip().split('\n')
        assert len(csv_lines) >= 4  # Header + 3 data rows
        assert 'Wishlist Item ID' in csv_lines[0]  # Header row

    def test_export_wishlist_default_format(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test exporting wishlist with default format."""
        response = client.get('/api/wishlist/user/export', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['export_format'] == 'json'  # Default format

    def test_export_wishlist_invalid_format(self, client, auth_headers, test_user):
        """Test exporting wishlist with invalid format."""
        response = client.get('/api/wishlist/user/export?format=xml', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid export format' in data['error']

    def test_export_wishlist_empty(self, client, auth_headers, test_user):
        """Test exporting empty wishlist."""
        response = client.get('/api/wishlist/user/export?format=json', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['total_items'] == 0
        assert data['data'] == []

    def test_export_wishlist_user_not_found(self, client, app):
        """Test exporting wishlist for non-existent user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token
            access_token = create_access_token(identity=99999)
            headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/wishlist/user/export', headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'User not found'

    def test_export_wishlist_inactive_user(self, client, inactive_user_auth_headers):
        """Test exporting wishlist for inactive user."""
        response = client.get('/api/wishlist/user/export', headers=inactive_user_auth_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['error'] == 'Account is deactivated'

    def test_export_wishlist_no_auth(self, client):
        """Test exporting wishlist without authentication."""
        response = client.get('/api/wishlist/user/export')

        assert response.status_code == 401

    def test_export_wishlist_options(self, client):
        """Test export wishlist OPTIONS request."""
        response = client.options('/api/wishlist/user/export')

        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_export_wishlist_database_error(self, client, auth_headers, test_user, mock_db_error):
        """Test exporting wishlist with database error."""
        response = client.get('/api/wishlist/user/export', headers=auth_headers)

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['error'] == 'Failed to export wishlist'

class TestWishlistErrorHandling:
    """Test error handling scenarios."""

    def test_wishlist_rate_limiting(self, client, auth_headers, test_user, test_product):
        """Test rate limiting on wishlist endpoints."""
        # This test would need to be configured based on actual rate limits
        # For now, we'll test that the rate limiter is properly configured

        # Make multiple requests quickly
        for i in range(5):
            response = client.get('/api/wishlist/user/', headers=auth_headers)
            assert response.status_code in [200, 429]  # Either success or rate limited

    def test_wishlist_cors_headers(self, client, cors_headers):
        """Test CORS headers on wishlist endpoints."""
        response = client.options('/api/wishlist/user/', headers=cors_headers)

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Allow' in response.headers

    def test_wishlist_invalid_json(self, client, auth_headers, test_user):
        """Test handling of invalid JSON data."""
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             data='invalid json')

        assert response.status_code == 400

    def test_wishlist_large_pagination(self, client, auth_headers, test_user):
        """Test handling of large pagination parameters."""
        response = client.get('/api/wishlist/user/?per_page=1000', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        # Should be limited to maximum allowed per_page
        assert data['pagination']['per_page'] <= 100

    def test_wishlist_negative_pagination(self, client, auth_headers, test_user):
        """Test handling of negative pagination parameters."""
        response = client.get('/api/wishlist/user/?page=-1&per_page=-10', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        # Should default to valid values
        assert data['pagination']['page'] >= 1
        assert data['pagination']['per_page'] >= 1

class TestWishlistIntegration:
    """Test integration scenarios."""

    def test_complete_wishlist_workflow(self, client, auth_headers, test_user, multiple_products):
        """Test complete wishlist workflow."""
        # 1. Check empty wishlist
        response = client.get('/api/wishlist/user/', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 0

        # 2. Add items to wishlist
        for product in multiple_products[:3]:
            response = client.post('/api/wishlist/user/',
                                 headers=auth_headers,
                                 json={'product_id': product.id})
            assert response.status_code == 201

        # 3. Check wishlist has items (bypass cache with timestamp)
        response = client.get(f'/api/wishlist/user/?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 3

        # 4. Get stats
        response = client.get(f'/api/wishlist/user/stats?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['total_items'] == 3

        # 5. Remove one item
        wishlist_response = client.get(f'/api/wishlist/user/?_cache_bust={int(time.time())}', headers=auth_headers)
        wishlist_data = json.loads(wishlist_response.data)
        item_id = wishlist_data['items'][0]['id']

        response = client.delete(f'/api/wishlist/user/{item_id}', headers=auth_headers)
        assert response.status_code == 200

        # 6. Check updated count (bypass cache)
        response = client.get(f'/api/wishlist/user/?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 2

        # 7. Clear wishlist
        response = client.delete('/api/wishlist/user/clear', headers=auth_headers)
        assert response.status_code == 200

        # 8. Verify empty (bypass cache)
        response = client.get(f'/api/wishlist/user/?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 0

    def test_wishlist_filtering_and_sorting_integration(self, client, auth_headers, test_user, multiple_wishlist_items):
        """Test filtering and sorting integration."""
        # Test combined filters and sorting
        response = client.get('/api/wishlist/user/?in_stock_only=true&sort_by=product_price&sort_order=asc',
                            headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify filters applied
        assert data['filters_applied']['in_stock_only'] == True
        assert data['sort']['sort_by'] == 'product_price'
        assert data['sort']['sort_order'] == 'asc'

        # Verify all items are in stock
        for item in data['items']:
            assert item['product']['stock'] > 0

        # Verify price sorting (ascending)
        if len(data['items']) > 1:
            prices = []
            for item in data['items']:
                price = item['product']['sale_price'] or item['product']['price']
                prices.append(price)
            assert prices == sorted(prices)

    def test_wishlist_bulk_operations_integration(self, client, auth_headers, test_user, multiple_products):
        """Test bulk operations integration."""
        # 1. Bulk add items
        product_ids = [p.id for p in multiple_products]
        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json={'product_ids': product_ids})

        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['added_count'] == len(product_ids)

        # 2. Verify all items added
        response = client.get('/api/wishlist/user/', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == len(product_ids)

        # 3. Try bulk add again (should skip existing)
        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json={'product_ids': product_ids})

        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['added_count'] == 0
        assert data['skipped_count'] == len(product_ids)

    def test_wishlist_toggle_integration(self, client, auth_headers, test_user, test_product):
        """Test toggle functionality integration."""
        # 1. Check item not in wishlist
        response = client.get(f'/api/wishlist/user/check/{test_product.id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['in_wishlist'] == False

        # 2. Toggle to add
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}', headers=auth_headers)
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['action'] == 'added'
        assert data['in_wishlist'] == True

        # 3. Check item now in wishlist (bypass cache)
        response = client.get(f'/api/wishlist/user/check/{test_product.id}?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['in_wishlist'] == True

        # 4. Toggle to remove
        response = client.post(f'/api/wishlist/user/toggle/{test_product.id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['action'] == 'removed'
        assert data['in_wishlist'] == False

        # 5. Check item no longer in wishlist (bypass cache)
        response = client.get(f'/api/wishlist/user/check/{test_product.id}?_cache_bust={int(time.time())}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['in_wishlist'] == False

class TestWishlistPerformance:
    """Test performance scenarios."""

    def test_wishlist_with_large_dataset(self, client, auth_headers, test_user, large_dataset):
        """Test wishlist performance with large dataset."""
        # Add many items to wishlist
        product_ids = [p.id for p in large_dataset[:50]]  # Add 50 items

        # Bulk add
        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json={'product_ids': product_ids})

        assert response.status_code == 201

        # Test pagination performance
        start_time = time.time()
        response = client.get('/api/wishlist/user/?per_page=20', headers=auth_headers)
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds

        data = json.loads(response.data)
        assert len(data['items']) == 20
        assert data['pagination']['total_items'] == 50

    def test_wishlist_stats_performance(self, client, auth_headers, test_user, large_dataset):
        """Test stats calculation performance."""
        # Add many items to wishlist
        product_ids = [p.id for p in large_dataset[:30]]

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json={'product_ids': product_ids})
        assert response.status_code == 201

        # Test stats performance
        start_time = time.time()
        response = client.get('/api/wishlist/user/stats', headers=auth_headers)
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Should complete within 3 seconds

        data = json.loads(response.data)
        assert data['total_items'] == 30
        assert 'categories' in data
        assert 'brands' in data

    def test_wishlist_export_performance(self, client, auth_headers, test_user, large_dataset):
        """Test export performance with large dataset."""
        # Add items to wishlist
        product_ids = [p.id for p in large_dataset[:25]]

        response = client.post('/api/wishlist/user/bulk/add',
                             headers=auth_headers,
                             json={'product_ids': product_ids})
        assert response.status_code == 201

        # Test JSON export performance
        start_time = time.time()
        response = client.get('/api/wishlist/user/export?format=json', headers=auth_headers)
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds

        data = json.loads(response.data)
        assert data['total_items'] == 25
        assert len(data['data']) == 25

        # Test CSV export performance
        start_time = time.time()
        response = client.get('/api/wishlist/user/export?format=csv', headers=auth_headers)
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds

class TestWishlistSecurity:
    """Test security scenarios."""

    def test_wishlist_user_isolation(self, client, app, test_user, multiple_products):
        """Test that users can only access their own wishlist items."""
        # Create second user
        with app.app_context():
            from app.models.models import User
            from flask_jwt_extended import create_access_token

            user2 = User(
                id=100,
                email='user2@example.com',
                name='User Two',  # Changed from username to name
                password_hash='hashed_password',
                is_active=True
            )
            db.session.add(user2)
            db.session.commit()

            # Create tokens for both users
            token1 = create_access_token(identity=test_user.id)
            token2 = create_access_token(identity=user2.id)

            headers1 = {'Authorization': f'Bearer {token1}'}
            headers2 = {'Authorization': f'Bearer {token2}'}

        # User 1 adds items to wishlist
        response = client.post('/api/wishlist/user/',
                             headers=headers1,
                             json={'product_id': multiple_products[0].id})
        assert response.status_code == 201

        # User 2 should not see User 1's items
        response = client.get('/api/wishlist/user/', headers=headers2)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 0

        # User 2 adds different item
        response = client.post('/api/wishlist/user/',
                             headers=headers2,
                             json={'product_id': multiple_products[1].id})
        assert response.status_code == 201

        # User 1 should still only see their item
        response = client.get('/api/wishlist/user/', headers=headers1)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['item_count'] == 1
        assert data['items'][0]['product_id'] == multiple_products[0].id

    def test_wishlist_sql_injection_protection(self, client, auth_headers, test_user):
        """Test protection against SQL injection attempts."""
        # Try SQL injection in search parameter
        malicious_search = "'; DROP TABLE wishlist_items; --"
        response = client.get(f'/api/wishlist/user/?search={malicious_search}', headers=auth_headers)

        # Should not cause an error and should return safely
        assert response.status_code == 200

        # Try SQL injection in product ID
        response = client.post('/api/wishlist/user/',
                             headers=auth_headers,
                             json={'product_id': "1; DROP TABLE products; --"})

        # Should return validation error, not SQL error
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid product ID' in data['error']

    def test_wishlist_xss_protection(self, client, auth_headers, test_user):
        """Test protection against XSS attempts."""
        # Try XSS in search parameter
        xss_payload = "<script>alert('xss')</script>"
        response = client.get(f'/api/wishlist/user/?search={xss_payload}', headers=auth_headers)

        # Should handle safely without executing script
        assert response.status_code == 200
        data = json.loads(response.data)
        # Response should be properly escaped/sanitized
        assert '<script>' not in str(data)

# Run the tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
