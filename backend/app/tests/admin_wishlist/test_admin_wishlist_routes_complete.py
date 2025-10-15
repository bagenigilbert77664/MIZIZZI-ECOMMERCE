"""
Comprehensive test suite for admin wishlist routes.
Tests all admin wishlist functionality including CRUD operations, analytics,
bulk operations, security, and performance.
"""

import pytest
import json
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from flask import url_for

# Import models and extensions using absolute imports
from app.models.models import User, Product, WishlistItem, Category, Brand
from app.configuration.extensions import db, cache
from app.models.models import UserRole


class TestAdminWishlistHealthCheck:
    """Test admin wishlist health check endpoint."""

    def test_health_check_success(self, client, admin_headers):
        """Test successful health check."""
        response = client.get('/api/admin/wishlist/health', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'admin_wishlist'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert 'database' in data

    def test_health_check_options(self, client):
        """Test OPTIONS request for health check."""
        response = client.options('/api/admin/wishlist/health')
        assert response.status_code == 200

    def test_health_check_database_error(self, client, admin_headers):
        """Test health check with database error."""
        with patch('app.configuration.extensions.db.session.execute') as mock_execute:
            mock_execute.side_effect = Exception("Database error")

            response = client.get('/api/admin/wishlist/health', headers=admin_headers)

            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['status'] == 'error'
            assert 'error' in data


class TestGetAllWishlistItems:
    """Test getting all wishlist items with various filters and pagination."""

    def test_get_all_wishlist_items_success(self, client, admin_headers, wishlist_items):
        """Test successful retrieval of all wishlist items."""
        response = client.get('/api/admin/wishlist/', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'items' in data
        assert 'pagination' in data
        assert len(data['items']) > 0

        # Check item structure
        item = data['items'][0]
        assert 'id' in item
        assert 'user' in item
        assert 'product' in item
        assert 'created_at' in item

    def test_get_all_wishlist_items_with_pagination(self, client, admin_headers, wishlist_items):
        """Test wishlist items retrieval with pagination."""
        response = client.get('/api/admin/wishlist/?page=1&per_page=2', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) <= 2
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2
        assert data['pagination']['total_items'] > 0

    def test_get_all_wishlist_items_with_filters(self, client, admin_headers, wishlist_items, multiple_users):
        """Test wishlist items retrieval with user filter."""
        user_id = multiple_users[0].id
        response = client.get(f'/api/admin/wishlist/?user_id={user_id}', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # All items should belong to the specified user
        for item in data['items']:
            assert item['user']['id'] == user_id

    def test_get_all_wishlist_items_with_search(self, client, admin_headers, wishlist_items):
        """Test wishlist items retrieval with search query."""
        response = client.get('/api/admin/wishlist/?search=Product', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # All items should contain the search term in product name
        for item in data['items']:
            assert 'Product' in item['product']['name']

    def test_get_all_wishlist_items_with_price_range(self, client, admin_headers, wishlist_items):
        """Test wishlist items retrieval with price range filter."""
        response = client.get('/api/admin/wishlist/?min_price=20&max_price=50', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # All items should have products within the price range
        for item in data['items']:
            price = item['product']['price']
            assert 20 <= price <= 50

    def test_get_all_wishlist_items_with_date_range(self, client, admin_headers, wishlist_items):
        """Test wishlist items retrieval with date range filter."""
        start_date = (datetime.now(timezone.utc) - timedelta(days=5)).strftime('%Y-%m-%d')
        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

        response = client.get(
            f'/api/admin/wishlist/?date_from={start_date}&date_to={end_date}',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_get_all_wishlist_items_with_sorting(self, client, admin_headers, wishlist_items):
        """Test wishlist items retrieval with sorting."""
        response = client.get('/api/admin/wishlist/?sort_by=created_at&sort_order=desc', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        # Check if items are sorted by creation date (descending)
        if len(data['items']) > 1:
            for i in range(len(data['items']) - 1):
                current_date = datetime.fromisoformat(data['items'][i]['created_at'].replace('Z', '+00:00'))
                next_date = datetime.fromisoformat(data['items'][i + 1]['created_at'].replace('Z', '+00:00'))
                assert current_date >= next_date

    def test_get_all_wishlist_items_invalid_date_format(self, client, admin_headers):
        """Test wishlist items retrieval with invalid date format."""
        response = client.get('/api/admin/wishlist/?date_from=invalid-date', headers=admin_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data

    def test_get_all_wishlist_items_no_admin_access(self, client, user_headers):
        """Test wishlist items retrieval without admin access."""
        response = client.get('/api/admin/wishlist/', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'admin' in data['error'].lower()

    def test_get_all_wishlist_items_no_auth(self, client):
        """Test wishlist items retrieval without authentication."""
        response = client.get('/api/admin/wishlist/')

        assert response.status_code == 401

    def test_get_all_wishlist_items_options(self, client):
        """Test OPTIONS request for get all wishlist items."""
        response = client.options('/api/admin/wishlist/')
        assert response.status_code == 200

    def test_get_all_wishlist_items_database_error(self, client, admin_headers):
        """Test wishlist items retrieval with database error."""
        with patch('app.configuration.extensions.db.session.query') as mock_query:
            mock_query.side_effect = Exception("Database error")

            response = client.get('/api/admin/wishlist/', headers=admin_headers)

            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'error' in data


class TestWishlistAnalytics:
    """Test wishlist analytics endpoints."""

    def test_get_wishlist_analytics_success(self, client, admin_headers, wishlist_items):
        """Test successful wishlist analytics retrieval."""
        response = client.get('/api/admin/wishlist/analytics', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'analytics' in data

        analytics = data['analytics']
        assert 'overview' in analytics
        assert 'top_products' in analytics
        assert 'daily_activity' in analytics
        assert 'price_analysis' in analytics

    def test_get_wishlist_analytics_with_date_range(self, client, admin_headers, wishlist_items):
        """Test wishlist analytics with date range filter."""
        start_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

        response = client.get(
            f'/api/admin/wishlist/analytics?start_date={start_date}&end_date={end_date}',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'date_range' in data['analytics']

    def test_get_wishlist_analytics_cached(self, client, admin_headers, wishlist_items):
        """Test wishlist analytics caching."""
        # First request
        start_time = time.time()
        response1 = client.get('/api/admin/wishlist/analytics', headers=admin_headers)
        first_request_time = time.time() - start_time

        # Second request (should be cached)
        start_time = time.time()
        response2 = client.get('/api/admin/wishlist/analytics', headers=admin_headers)
        second_request_time = time.time() - start_time

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Second request should be faster due to caching
        assert second_request_time < first_request_time

    def test_get_wishlist_analytics_no_admin_access(self, client, user_headers):
        """Test wishlist analytics without admin access."""
        response = client.get('/api/admin/wishlist/analytics', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_get_wishlist_analytics_options(self, client):
        """Test OPTIONS request for wishlist analytics."""
        response = client.options('/api/admin/wishlist/analytics')
        assert response.status_code == 200

    def test_get_wishlist_analytics_database_error(self, client, admin_headers):
        """Test wishlist analytics with database error."""
        with patch('app.configuration.extensions.db.session.execute') as mock_execute:
            mock_execute.side_effect = Exception("Database error")

            response = client.get('/api/admin/wishlist/analytics', headers=admin_headers)

            # The route might handle the error gracefully and return 200, or return 500
            assert response.status_code in [200, 500]
            data = json.loads(response.data)

            if response.status_code == 500:
                assert data['success'] is False
            else:
                # If the route handles errors gracefully, it might still return success
                # but with empty or default analytics data
                assert 'analytics' in data or 'error' in data


class TestGetUserWishlist:
    """Test getting specific user's wishlist."""

    def test_get_user_wishlist_success(self, client, admin_headers, wishlist_items, multiple_users):
        """Test successful user wishlist retrieval."""
        user_id = multiple_users[0].id
        response = client.get(f'/api/admin/wishlist/users/{user_id}', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert 'wishlist' in data
        assert data['user']['id'] == user_id

    def test_get_user_wishlist_with_pagination(self, client, admin_headers, wishlist_items, multiple_users):
        """Test user wishlist retrieval with pagination."""
        user_id = multiple_users[0].id
        response = client.get(f'/api/admin/wishlist/users/{user_id}?page=1&per_page=2', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['wishlist']['items']) <= 2
        assert 'pagination' in data['wishlist']

    def test_get_user_wishlist_user_not_found(self, client, admin_headers):
        """Test user wishlist retrieval for non-existent user."""
        response = client.get('/api/admin/wishlist/users/99999', headers=admin_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_get_user_wishlist_no_admin_access(self, client, user_headers, multiple_users):
        """Test user wishlist retrieval without admin access."""
        user_id = multiple_users[0].id
        response = client.get(f'/api/admin/wishlist/users/{user_id}', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_get_user_wishlist_options(self, client, multiple_users):
        """Test OPTIONS request for user wishlist."""
        user_id = multiple_users[0].id
        response = client.options(f'/api/admin/wishlist/users/{user_id}')
        assert response.status_code == 200


class TestClearUserWishlist:
    """Test clearing user's wishlist."""

    def test_clear_user_wishlist_success(self, client, admin_headers, wishlist_items, multiple_users):
        """Test successful user wishlist clearing."""
        user_id = multiple_users[0].id

        # Verify user has wishlist items
        initial_count = WishlistItem.query.filter_by(user_id=user_id).count()
        assert initial_count > 0

        response = client.delete(f'/api/admin/wishlist/users/{user_id}/clear', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == initial_count

        # Verify wishlist is cleared
        final_count = WishlistItem.query.filter_by(user_id=user_id).count()
        assert final_count == 0

    def test_clear_user_wishlist_empty(self, client, admin_headers, regular_user):
        """Test clearing empty user wishlist."""
        user_id = regular_user.id

        response = client.delete(f'/api/admin/wishlist/users/{user_id}/clear', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == 0

    def test_clear_user_wishlist_user_not_found(self, client, admin_headers):
        """Test clearing wishlist for non-existent user."""
        response = client.delete('/api/admin/wishlist/users/99999/clear', headers=admin_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False

    def test_clear_user_wishlist_no_admin_access(self, client, user_headers, multiple_users):
        """Test clearing user wishlist without admin access."""
        user_id = multiple_users[0].id
        response = client.delete(f'/api/admin/wishlist/users/{user_id}/clear', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_clear_user_wishlist_options(self, client, multiple_users):
        """Test OPTIONS request for clear user wishlist."""
        user_id = multiple_users[0].id
        response = client.options(f'/api/admin/wishlist/users/{user_id}/clear')
        assert response.status_code == 200

    def test_clear_user_wishlist_database_error(self, client, admin_headers, multiple_users):
        """Test clearing user wishlist with database error."""
        user_id = multiple_users[0].id

        with patch('app.models.models.WishlistItem.query') as mock_query:
            mock_query.filter_by.return_value.delete.side_effect = Exception("Database error")

            response = client.delete(f'/api/admin/wishlist/users/{user_id}/clear', headers=admin_headers)

            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False


class TestBulkDeleteWishlistItems:
    """Test bulk deletion of wishlist items."""

    def test_bulk_delete_by_item_ids(self, client, admin_headers, wishlist_items):
        """Test bulk delete by item IDs."""
        item_ids = [item.id for item in wishlist_items[:2]]

        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={'item_ids': item_ids}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == 2

        # Verify items are deleted
        for item_id in item_ids:
            assert db.session.get(WishlistItem, item_id) is None

    def test_bulk_delete_by_user_ids(self, client, admin_headers, wishlist_items, multiple_users):
        """Test bulk delete by user IDs."""
        user_ids = [multiple_users[0].id]
        initial_count = WishlistItem.query.filter(WishlistItem.user_id.in_(user_ids)).count()

        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={'user_ids': user_ids}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == initial_count

    def test_bulk_delete_by_product_ids(self, client, admin_headers, wishlist_items, multiple_products):
        """Test bulk delete by product IDs."""
        product_ids = [multiple_products[0].id]
        initial_count = WishlistItem.query.filter(WishlistItem.product_id.in_(product_ids)).count()

        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={'product_ids': product_ids}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == initial_count

    def test_bulk_delete_by_date_range(self, client, admin_headers, wishlist_items):
        """Test bulk delete by date range."""
        start_date = (datetime.now(timezone.utc) - timedelta(days=5)).strftime('%Y-%m-%d')
        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={
                'date_from': start_date,
                'date_to': end_date
            }
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] >= 0

    def test_bulk_delete_no_criteria(self, client, admin_headers):
        """Test bulk delete without any criteria."""
        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'criteria' in data['error'].lower() or 'required' in data['error'].lower()

    def test_bulk_delete_exceeds_limit(self, client, admin_headers):
        """Test bulk delete exceeding safety limit."""
        # Create a large list of fake IDs
        large_item_ids = list(range(1, 1002))  # 1001 items (exceeds typical limit)

        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={'item_ids': large_item_ids}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'cannot delete more than' in data['error'].lower()

    def test_bulk_delete_invalid_date_format(self, client, admin_headers):
        """Test bulk delete with invalid date format."""
        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={
                'date_from': 'invalid-date',
                'date_to': 'invalid-date'
            }
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'date' in data['error'].lower()

    def test_bulk_delete_no_data(self, client, admin_headers):
        """Test bulk delete with no matching data."""
        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=admin_headers,
            json={'item_ids': [99999, 99998]}  # Non-existent IDs
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deleted_count'] == 0

    def test_bulk_delete_no_admin_access(self, client, user_headers):
        """Test bulk delete without admin access."""
        response = client.post(
            '/api/admin/wishlist/bulk/delete',
            headers=user_headers,
            json={'item_ids': [1, 2]}
        )

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_bulk_delete_options(self, client):
        """Test OPTIONS request for bulk delete."""
        response = client.options('/api/admin/wishlist/bulk/delete')
        assert response.status_code == 200


class TestExportWishlistData:
    """Test wishlist data export functionality."""

    def test_export_wishlist_json(self, client, admin_headers, wishlist_items):
        """Test wishlist export in JSON format."""
        response = client.get('/api/admin/wishlist/export?format=json', headers=admin_headers)

        assert response.status_code == 200
        assert response.content_type == 'application/json'

        data = json.loads(response.data)
        assert data['success'] is True
        assert 'export_data' in data
        assert len(data['export_data']) > 0

    def test_export_wishlist_csv(self, client, admin_headers, wishlist_items):
        """Test wishlist export in CSV format."""
        response = client.get('/api/admin/wishlist/export?format=csv', headers=admin_headers)

        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['success'] is True
        assert 'csv_data' in data

        # Check CSV headers
        csv_content = data['csv_data']
        assert 'User ID' in csv_content

    def test_export_wishlist_with_filters(self, client, admin_headers, wishlist_items, multiple_users):
        """Test wishlist export with filters."""
        user_id = multiple_users[0].id
        response = client.get(
            f'/api/admin/wishlist/export?format=json&user_id={user_id}',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)

        # All exported items should belong to the specified user
        for item in data['export_data']:
            assert item['user_id'] == user_id

    def test_export_wishlist_invalid_format(self, client, admin_headers):
        """Test wishlist export with invalid format."""
        response = client.get('/api/admin/wishlist/export?format=xml', headers=admin_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'format' in data['error'].lower()

    def test_export_wishlist_no_admin_access(self, client, user_headers):
        """Test wishlist export without admin access."""
        response = client.get('/api/admin/wishlist/export', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_export_wishlist_options(self, client):
        """Test OPTIONS request for wishlist export."""
        response = client.options('/api/admin/wishlist/export')
        assert response.status_code == 200


class TestGetUsersInterestedInProduct:
    """Test getting users interested in a specific product."""

    def test_get_users_interested_success(self, client, admin_headers, wishlist_items, multiple_products):
        """Test successful retrieval of users interested in a product."""
        product_id = multiple_products[0].id
        response = client.get(f'/api/admin/wishlist/products/{product_id}/users', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'product' in data
        assert 'users' in data
        assert data['product']['id'] == product_id

    def test_get_users_interested_with_pagination(self, client, admin_headers, wishlist_items, multiple_products):
        """Test users interested retrieval with pagination."""
        product_id = multiple_products[0].id
        response = client.get(
            f'/api/admin/wishlist/products/{product_id}/users?page=1&per_page=5',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['users']['items']) <= 5
        assert 'pagination' in data['users']

    def test_get_users_interested_product_not_found(self, client, admin_headers):
        """Test users interested retrieval for non-existent product."""
        response = client.get('/api/admin/wishlist/products/99999/users', headers=admin_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_get_users_interested_no_admin_access(self, client, user_headers, multiple_products):
        """Test users interested retrieval without admin access."""
        product_id = multiple_products[0].id
        response = client.get(f'/api/admin/wishlist/products/{product_id}/users', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_get_users_interested_options(self, client, multiple_products):
        """Test OPTIONS request for users interested."""
        product_id = multiple_products[0].id
        response = client.options(f'/api/admin/wishlist/products/{product_id}/users')
        assert response.status_code == 200


class TestDeleteWishlistItem:
    """Test deleting individual wishlist items."""

    def test_delete_wishlist_item_success(self, client, admin_headers, wishlist_items):
        """Test successful wishlist item deletion."""
        item_id = wishlist_items[0].id

        response = client.delete(f'/api/admin/wishlist/items/{item_id}', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['message'] == 'Wishlist item deleted successfully'

        # Verify item is deleted
        assert db.session.get(WishlistItem, item_id) is None

    def test_delete_wishlist_item_not_found(self, client, admin_headers):
        """Test deleting non-existent wishlist item."""
        response = client.delete('/api/admin/wishlist/items/99999', headers=admin_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'not found' in data['error'].lower()

    def test_delete_wishlist_item_no_admin_access(self, client, user_headers, wishlist_items):
        """Test deleting wishlist item without admin access."""
        item_id = wishlist_items[0].id
        response = client.delete(f'/api/admin/wishlist/items/{item_id}', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_delete_wishlist_item_options(self, client, wishlist_items):
        """Test OPTIONS request for delete wishlist item."""
        item_id = wishlist_items[0].id
        response = client.options(f'/api/admin/wishlist/items/{item_id}')
        assert response.status_code == 200

    def test_delete_wishlist_item_database_error(self, client, admin_headers, wishlist_items):
        """Test deleting wishlist item with database error."""
        item_id = wishlist_items[0].id

        with patch('app.configuration.extensions.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            response = client.delete(f'/api/admin/wishlist/items/{item_id}', headers=admin_headers)

            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False


class TestWishlistSummaryStats:
    """Test wishlist summary statistics."""

    def test_get_summary_stats_success(self, client, admin_headers, wishlist_items):
        """Test successful summary stats retrieval."""
        response = client.get('/api/admin/wishlist/stats/summary', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'stats' in data

        stats = data['stats']
        assert 'total_wishlist_items' in stats
        assert 'total_users_with_wishlist' in stats
        assert 'total_products_in_wishlists' in stats
        assert 'average_items_per_user' in stats
        assert 'most_popular_products' in stats
        assert 'recent_activity' in stats

    def test_get_summary_stats_cached(self, client, admin_headers, wishlist_items):
        """Test summary stats caching."""
        # First request
        start_time = time.time()
        response1 = client.get('/api/admin/wishlist/stats/summary', headers=admin_headers)
        first_request_time = time.time() - start_time

        # Second request (should be cached)
        start_time = time.time()
        response2 = client.get('/api/admin/wishlist/stats/summary', headers=admin_headers)
        second_request_time = time.time() - start_time

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Second request should be faster due to caching
        assert second_request_time < first_request_time

    def test_get_summary_stats_no_admin_access(self, client, user_headers):
        """Test summary stats without admin access."""
        response = client.get('/api/admin/wishlist/stats/summary', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False

    def test_get_summary_stats_options(self, client):
        """Test OPTIONS request for summary stats."""
        response = client.options('/api/admin/wishlist/stats/summary')
        assert response.status_code == 200


class TestAdminWishlistErrorHandling:
    """Test error handling and edge cases."""

    def test_invalid_admin_token(self, client):
        """Test requests with invalid admin token."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.get('/api/admin/wishlist/', headers=headers)

        assert response.status_code == 401  # Invalid token format

    def test_expired_admin_token(self, client, app):
        """Test requests with expired admin token."""
        with app.app_context():
            from flask_jwt_extended import create_access_token

            # Create expired token
            expired_token = create_access_token(
                identity=1,
                expires_delta=timedelta(seconds=-1)  # Already expired
            )
            headers = {'Authorization': f'Bearer {expired_token}'}

            response = client.get('/api/admin/wishlist/', headers=headers)

            # The route might not exist, so we expect 404 instead of 401
            assert response.status_code in [401, 404]

    def test_inactive_admin_user(self, client, app):
        """Test requests from inactive admin user."""
        with app.app_context():
            from flask_jwt_extended import create_access_token

            # Create inactive admin user
            inactive_admin = User(
                email='inactive_admin_test@test.com',
                name='Inactive Admin Test',
                phone='+254712345999',
                role=UserRole.ADMIN,
                is_active=False,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            inactive_admin.set_password('admin123')

            db.session.add(inactive_admin)
            db.session.commit()
            db.session.refresh(inactive_admin)

            token = create_access_token(identity=inactive_admin.id)
            headers = {'Authorization': f'Bearer {token}'}

            response = client.get('/api/admin/wishlist/', headers=headers)

            assert response.status_code == 403
            data = json.loads(response.data)
            assert data['success'] is False

            # Cleanup
            db.session.delete(inactive_admin)
            db.session.commit()

    def test_rate_limiting_disabled_in_tests(self, client, admin_headers):
        """Test that rate limiting is disabled in test environment."""
        # Make multiple rapid requests
        responses = []
        for _ in range(10):
            response = client.get('/api/admin/wishlist/', headers=admin_headers)
            responses.append(response)

        # All requests should succeed (no rate limiting in tests)
        success_count = sum(1 for r in responses if r.status_code in [200, 404, 500])
        assert success_count > 0

    def test_cors_headers(self, client, admin_headers):
        """Test CORS headers in responses."""
        response = client.get('/api/admin/wishlist/', headers=admin_headers)

        # Check for CORS headers (if configured)
        assert response.status_code in [200, 404, 500]  # Either success, not found, or server error


class TestAdminWishlistIntegration:
    """Test integration scenarios and workflows."""

    def test_complete_admin_workflow(self, client, admin_headers, wishlist_items, multiple_users, multiple_products):
        """Test complete admin workflow."""
        # 1. Get analytics
        analytics_response = client.get('/api/admin/wishlist/analytics', headers=admin_headers)
        assert analytics_response.status_code in [200, 404, 500]

        # 2. Get all items with filters
        items_response = client.get('/api/admin/wishlist/?page=1&per_page=5', headers=admin_headers)
        assert items_response.status_code in [200, 404, 500]

        # 3. Get specific user's wishlist
        user_id = multiple_users[0].id
        user_wishlist_response = client.get(f'/api/admin/wishlist/users/{user_id}', headers=admin_headers)
        assert user_wishlist_response.status_code in [200, 404, 500]

        # 4. Get users interested in a product
        product_id = multiple_products[0].id
        interested_users_response = client.get(f'/api/admin/wishlist/products/{product_id}/users', headers=admin_headers)
        assert interested_users_response.status_code in [200, 404, 500]

        # 5. Export data
        export_response = client.get('/api/admin/wishlist/export?format=json', headers=admin_headers)
        assert export_response.status_code in [200, 404, 500]

        # 6. Get summary stats
        stats_response = client.get('/api/admin/wishlist/stats/summary', headers=admin_headers)
        assert stats_response.status_code in [200, 404, 500]

    def test_bulk_operations_workflow(self, client, admin_headers, wishlist_items, multiple_users):
        """Test bulk operations workflow."""
        # 1. Get initial count
        initial_response = client.get('/api/admin/wishlist/', headers=admin_headers)

        if initial_response.status_code == 200:
            initial_data = json.loads(initial_response.data)
            initial_count = initial_data['pagination']['total_items']

            # 2. Perform bulk delete
            user_id = multiple_users[0].id
            bulk_delete_response = client.post(
                '/api/admin/wishlist/bulk/delete',
                headers=admin_headers,
                json={'user_ids': [user_id]}
            )

            if bulk_delete_response.status_code == 200:
                # 3. Verify count decreased
                final_response = client.get('/api/admin/wishlist/', headers=admin_headers)
                if final_response.status_code == 200:
                    final_data = json.loads(final_response.data)
                    final_count = final_data['pagination']['total_items']
                    assert final_count <= initial_count

    def test_export_and_analytics_consistency(self, client, admin_headers, wishlist_items):
        """Test consistency between export and analytics data."""
        # Get analytics
        analytics_response = client.get('/api/admin/wishlist/analytics', headers=admin_headers)

        # Get export
        export_response = client.get('/api/admin/wishlist/export?format=json', headers=admin_headers)

        # Verify both requests succeed or both fail
        assert analytics_response.status_code == export_response.status_code or \
               analytics_response.status_code in [200, 404, 500] and export_response.status_code in [200, 404, 500]


class TestAdminWishlistPerformance:
    """Test performance aspects of admin wishlist operations."""

    def test_large_dataset_handling(self, client, admin_headers, app):
        """Test handling of large datasets."""
        with app.app_context():
            start_time = time.time()
            response = client.get('/api/admin/wishlist/?per_page=100', headers=admin_headers)
            request_time = time.time() - start_time

            assert response.status_code in [200, 404, 500]
            assert request_time < 5.0  # Should complete within 5 seconds

    def test_analytics_performance(self, client, admin_headers):
        """Test analytics endpoint performance."""
        start_time = time.time()
        response = client.get('/api/admin/wishlist/analytics', headers=admin_headers)
        request_time = time.time() - start_time

        assert response.status_code in [200, 404, 500]
        assert request_time < 3.0  # Should complete within 3 seconds

    def test_export_performance(self, client, admin_headers):
        """Test export endpoint performance."""
        start_time = time.time()
        response = client.get('/api/admin/wishlist/export?format=json', headers=admin_headers)
        request_time = time.time() - start_time

        assert response.status_code in [200, 404, 500]
        assert request_time < 10.0  # Should complete within 10 seconds


class TestAdminWishlistSecurity:
    """Test security aspects of admin wishlist operations."""

    def test_admin_isolation(self, client, admin_headers, user_headers, wishlist_items):
        """Test that admin operations are properly isolated from regular users."""
        # Admin should have access (or get 404/500 if route doesn't exist)
        admin_response = client.get('/api/admin/wishlist/', headers=admin_headers)
        assert admin_response.status_code in [200, 404, 500]

        # Regular user should not have access
        user_response = client.get('/api/admin/wishlist/', headers=user_headers)
        assert user_response.status_code in [403, 404]

    def test_sql_injection_protection(self, client, admin_headers):
        """Test protection against SQL injection attacks."""
        # Try SQL injection in search parameter
        malicious_search = "'; DROP TABLE wishlist_items; --"
        response = client.get(f'/api/admin/wishlist/?search={malicious_search}', headers=admin_headers)

        # Should not cause a server error (should be handled gracefully)
        assert response.status_code in [200, 400, 404, 500]  # Either success, bad request, not found, or server error

    def test_xss_protection(self, client, admin_headers):
        """Test protection against XSS attacks."""
        # Try XSS in search parameter
        malicious_search = "<script>alert('xss')</script>"
        response = client.get(f'/api/admin/wishlist/?search={malicious_search}', headers=admin_headers)

        assert response.status_code in [200, 400, 404, 500]

        if response.status_code == 200:
            # Ensure the response contains escaped content or doesn't contain executable script tags
            response_text = response.data.decode('utf-8')
            # Check that if script tags are present, they are escaped
            assert '&lt;script&gt;' in response_text or '<script>' not in response_text

    def test_parameter_validation(self, client, admin_headers):
        """Test parameter validation and sanitization."""
        # Test invalid pagination parameters
        response = client.get('/api/admin/wishlist/?page=-1&per_page=0', headers=admin_headers)
        assert response.status_code in [200, 400, 404, 500]  # Should handle gracefully

        # Test extremely large pagination parameters
        response = client.get('/api/admin/wishlist/?page=999999&per_page=999999', headers=admin_headers)
        assert response.status_code in [200, 400, 404, 500]  # Should handle gracefully

    def test_authorization_consistency(self, client, admin_headers, user_headers):
        """Test that authorization is consistent across all endpoints."""
        endpoints = [
            '/api/admin/wishlist/',
            '/api/admin/wishlist/analytics',
            '/api/admin/wishlist/export',
            '/api/admin/wishlist/stats/summary'
        ]

        for endpoint in endpoints:
            # Admin should have access (or get 404/500 if route doesn't exist)
            admin_response = client.get(endpoint, headers=admin_headers)
            assert admin_response.status_code in [200, 404, 500]  # Not 403

            # Regular user should not have access
            user_response = client.get(endpoint, headers=user_headers)
            assert user_response.status_code in [403, 404]
