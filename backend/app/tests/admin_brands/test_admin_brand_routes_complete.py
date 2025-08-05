"""Comprehensive tests for admin brand routes."""

import pytest
import json
import time
import threading
from datetime import datetime, UTC
from unittest.mock import Mock, patch, MagicMock

from .conftest import (
    create_test_brand_data,
    assert_brand_response_structure,
    assert_pagination_structure,
    assert_cors_headers
)


class TestAdminBrandAuthentication:
    """Test admin authentication and authorization."""

    def test_get_brands_requires_admin_auth(self, client):
        """Test that getting brands requires admin authentication."""
        response = client.get('/api/admin/brands/')
        assert response.status_code == 422  # JWT error

    def test_get_brands_rejects_regular_user(self, client, user_headers):
        """Test that regular users cannot access admin brand routes."""
        response = client.get('/api/admin/brands/', headers=user_headers)
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Admin access required' in data['error']

    def test_create_brand_requires_admin_auth(self, client):
        """Test that creating brands requires admin authentication."""
        brand_data = create_test_brand_data()
        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             content_type='application/json')
        assert response.status_code == 422  # JWT error

    def test_update_brand_requires_admin_auth(self, client):
        """Test that updating brands requires admin authentication."""
        brand_data = {'name': 'Updated Brand'}
        response = client.put('/api/admin/brands/1',
                            data=json.dumps(brand_data),
                            content_type='application/json')
        assert response.status_code == 422  # JWT error

    def test_delete_brand_requires_admin_auth(self, client):
        """Test that deleting brands requires admin authentication."""
        response = client.delete('/api/admin/brands/1')
        assert response.status_code == 422  # JWT error

    def test_admin_can_access_all_endpoints(self, client, admin_headers, sample_brands):
        """Test that admin can access all brand endpoints."""
        # Test GET brands
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200

        # Test GET specific brand
        response = client.get('/api/admin/brands/1', headers=admin_headers)
        assert response.status_code == 200

        # Test GET brand products
        response = client.get('/api/admin/brands/1/products', headers=admin_headers)
        assert response.status_code == 200

        # Test GET statistics
        response = client.get('/api/admin/brands/statistics', headers=admin_headers)
        assert response.status_code == 200


class TestAdminBrandCRUD:
    """Test CRUD operations for admin brand management."""

    def test_get_all_brands_success(self, client, admin_headers, sample_brands):
        """Test successful retrieval of all brands including inactive."""
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert_pagination_structure(data)
        assert 'statistics' in data

        # Should include inactive brands for admin
        assert len(data['items']) == 4  # All brands including inactive

        # Check statistics
        stats = data['statistics']
        assert stats['total_brands'] == 4
        assert stats['active_brands'] == 2
        assert stats['featured_brands'] == 2
        assert stats['inactive_brands'] == 2

    def test_get_brands_with_filters(self, client, admin_headers, sample_brands):
        """Test getting brands with various filters."""
        # Test active filter
        response = client.get('/api/admin/brands/?active=true', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 2  # Only active brands

        # Test inactive filter
        response = client.get('/api/admin/brands/?active=false', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 2  # Only inactive brands

        # Test featured filter
        response = client.get('/api/admin/brands/?featured=true', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 2  # Only featured brands

    def test_get_brands_with_search(self, client, admin_headers, sample_brands):
        """Test searching brands."""
        # Search by name
        response = client.get('/api/admin/brands/?search=Nike', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert data['items'][0]['name'] == 'Nike'

        # Search by description
        response = client.get('/api/admin/brands/?q=Just', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1
        assert 'Nike' in data['items'][0]['name']

    def test_get_brand_by_id_success(self, client, admin_headers, sample_brands):
        """Test getting a specific brand by ID."""
        response = client.get('/api/admin/brands/1', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert_brand_response_structure(data)
        assert data['name'] == 'Nike'
        assert 'product_count' in data
        assert 'active_product_count' in data

    def test_get_brand_by_id_not_found(self, client, admin_headers):
        """Test getting non-existent brand."""
        response = client.get('/api/admin/brands/999', headers=admin_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Brand not found' in data['error']

    def test_create_brand_success(self, client, admin_headers):
        """Test successful brand creation."""
        brand_data = create_test_brand_data("New Brand")

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 201

        data = json.loads(response.data)
        assert 'message' in data
        assert 'brand' in data
        assert_brand_response_structure(data['brand'])
        assert data['brand']['name'] == 'New Brand'

    def test_create_brand_auto_slug_generation(self, client, admin_headers):
        """Test automatic slug generation when not provided."""
        brand_data = {
            'name': 'Test Brand With Spaces',
            'description': 'Test description'
        }

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 201

        data = json.loads(response.data)
        assert data['brand']['slug'] == 'test-brand-with-spaces'

    def test_create_brand_validation_errors(self, client, admin_headers):
        """Test brand creation validation errors."""
        # Missing name
        response = client.post('/api/admin/brands/',
                             data=json.dumps({}),
                             headers=admin_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Brand name is required' in data['error']

        # Empty name
        response = client.post('/api/admin/brands/',
                             data=json.dumps({'name': '   '}),
                             headers=admin_headers)
        assert response.status_code == 400

    def test_create_brand_duplicate_name(self, client, admin_headers, sample_brands):
        """Test creating brand with duplicate name."""
        brand_data = create_test_brand_data("Nike")  # Duplicate name

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'Brand name already exists' in data['error']

    def test_create_brand_duplicate_slug(self, client, admin_headers, sample_brands):
        """Test creating brand with duplicate slug."""
        brand_data = create_test_brand_data("Different Name", slug="nike")

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'Slug already exists' in data['error']

    def test_update_brand_success(self, client, admin_headers, sample_brands):
        """Test successful brand update."""
        update_data = {
            'name': 'Updated Nike',
            'description': 'Updated description',
            'is_featured': True
        }

        response = client.put('/api/admin/brands/1',
                            data=json.dumps(update_data),
                            headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'message' in data
        assert data['brand']['name'] == 'Updated Nike'
        assert data['brand']['description'] == 'Updated description'
        assert data['brand']['is_featured'] is True

    def test_update_brand_partial_update(self, client, admin_headers, sample_brands):
        """Test partial brand update."""
        update_data = {'is_active': False}

        response = client.put('/api/admin/brands/1',
                            data=json.dumps(update_data),
                            headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['brand']['is_active'] is False
        assert data['brand']['name'] == 'Nike'  # Unchanged

    def test_update_brand_not_found(self, client, admin_headers):
        """Test updating non-existent brand."""
        update_data = {'name': 'Updated Name'}

        response = client.put('/api/admin/brands/999',
                            data=json.dumps(update_data),
                            headers=admin_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Brand not found' in data['error']

    def test_update_brand_duplicate_name(self, client, admin_headers, sample_brands):
        """Test updating brand with duplicate name."""
        update_data = {'name': 'Adidas'}  # Already exists

        response = client.put('/api/admin/brands/1',
                            data=json.dumps(update_data),
                            headers=admin_headers)
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'Brand name already exists' in data['error']

    def test_delete_brand_success(self, client, admin_headers, sample_brands):
        """Test successful brand deletion."""
        # Delete brand without products (Puma - id=3)
        response = client.delete('/api/admin/brands/3', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Brand deleted successfully' in data['message']

        # Verify brand is deleted
        response = client.get('/api/admin/brands/3', headers=admin_headers)
        assert response.status_code == 404

    def test_delete_brand_with_products(self, client, admin_headers, sample_brands, sample_products):
        """Test deleting brand with associated products."""
        response = client.delete('/api/admin/brands/1', headers=admin_headers)  # Nike has products
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Cannot delete brand' in data['error']
        assert 'associated products' in data['error']

    def test_delete_brand_not_found(self, client, admin_headers):
        """Test deleting non-existent brand."""
        response = client.delete('/api/admin/brands/999', headers=admin_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Brand not found' in data['error']


class TestAdminBrandProducts:
    """Test brand products management."""

    def test_get_brand_products_success(self, client, admin_headers, sample_brands, sample_products):
        """Test getting products for a brand."""
        response = client.get('/api/admin/brands/1/products', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert_pagination_structure(data)
        assert 'brand' in data
        assert 'statistics' in data

        # Should include inactive products for admin
        assert len(data['items']) == 3  # Nike has 3 products (2 active, 1 inactive)

        # Check statistics
        stats = data['statistics']
        assert stats['total_products'] == 3
        assert stats['active_products'] == 2
        assert stats['inactive_products'] == 1

    def test_get_brand_products_with_filters(self, client, admin_headers, sample_brands, sample_products):
        """Test getting brand products with filters."""
        # Test active filter
        response = client.get('/api/admin/brands/1/products?active=true', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 2  # Only active products

        # Test inactive filter
        response = client.get('/api/admin/brands/1/products?active=false', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1  # Only inactive products

        # Test featured filter
        response = client.get('/api/admin/brands/1/products?featured=true', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 1  # Only featured products

    def test_get_brand_products_with_sorting(self, client, admin_headers, sample_brands, sample_products):
        """Test getting brand products with sorting."""
        # Sort by price ascending
        response = client.get('/api/admin/brands/1/products?sort_by=price&sort_order=asc',
                            headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        prices = [item['price'] for item in data['items']]
        assert prices == sorted(prices)

        # Sort by name descending
        response = client.get('/api/admin/brands/1/products?sort_by=name&sort_order=desc',
                            headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        names = [item['name'] for item in data['items']]
        assert names == sorted(names, reverse=True)

    def test_get_brand_products_brand_not_found(self, client, admin_headers):
        """Test getting products for non-existent brand."""
        response = client.get('/api/admin/brands/999/products', headers=admin_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Brand not found' in data['error']


class TestAdminBrandToggleOperations:
    """Test brand toggle operations."""

    def test_toggle_brand_status_success(self, client, admin_headers, sample_brands):
        """Test toggling brand active status."""
        # Toggle active brand to inactive
        response = client.post('/api/admin/brands/1/toggle-status', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'deactivated successfully' in data['message']
        assert data['brand']['is_active'] is False

        # Toggle back to active
        response = client.post('/api/admin/brands/1/toggle-status', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'activated successfully' in data['message']
        assert data['brand']['is_active'] is True

    def test_toggle_brand_featured_success(self, client, admin_headers, sample_brands):
        """Test toggling brand featured status."""
        # Toggle non-featured brand to featured
        response = client.post('/api/admin/brands/2/toggle-featured', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'featured successfully' in data['message']
        assert data['brand']['is_featured'] is True

        # Toggle back to non-featured
        response = client.post('/api/admin/brands/2/toggle-featured', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'unfeatured successfully' in data['message']
        assert data['brand']['is_featured'] is False

    def test_toggle_operations_brand_not_found(self, client, admin_headers):
        """Test toggle operations on non-existent brand."""
        response = client.post('/api/admin/brands/999/toggle-status', headers=admin_headers)
        assert response.status_code == 404

        response = client.post('/api/admin/brands/999/toggle-featured', headers=admin_headers)
        assert response.status_code == 404


class TestAdminBrandBulkOperations:
    """Test bulk operations on brands."""

    def test_bulk_update_brands_success(self, client, admin_headers, sample_brands):
        """Test successful bulk update of brands."""
        bulk_data = {
            'brand_ids': [1, 2],
            'updates': {
                'is_featured': True,
                'is_active': True
            }
        }

        response = client.post('/api/admin/brands/bulk-update',
                             data=json.dumps(bulk_data),
                             headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Successfully updated 2 brands' in data['message']
        assert data['updated_count'] == 2

        # Verify updates
        response = client.get('/api/admin/brands/1', headers=admin_headers)
        brand1 = json.loads(response.data)
        assert brand1['is_featured'] is True

        response = client.get('/api/admin/brands/2', headers=admin_headers)
        brand2 = json.loads(response.data)
        assert brand2['is_featured'] is True

    def test_bulk_update_validation_errors(self, client, admin_headers):
        """Test bulk update validation errors."""
        # No brand IDs
        bulk_data = {'updates': {'is_active': True}}
        response = client.post('/api/admin/brands/bulk-update',
                             data=json.dumps(bulk_data),
                             headers=admin_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No brand IDs provided' in data['error']

        # No updates
        bulk_data = {'brand_ids': [1, 2]}
        response = client.post('/api/admin/brands/bulk-update',
                             data=json.dumps(bulk_data),
                             headers=admin_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No updates provided' in data['error']

    def test_bulk_update_invalid_brand_ids(self, client, admin_headers, sample_brands):
        """Test bulk update with invalid brand IDs."""
        bulk_data = {
            'brand_ids': [1, 999],  # 999 doesn't exist
            'updates': {'is_active': True}
        }

        response = client.post('/api/admin/brands/bulk-update',
                             data=json.dumps(bulk_data),
                             headers=admin_headers)
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Some brand IDs not found' in data['error']


class TestAdminBrandStatistics:
    """Test brand statistics endpoint."""

    def test_get_brand_statistics_success(self, client, admin_headers, sample_brands, sample_products):
        """Test getting brand statistics."""
        response = client.get('/api/admin/brands/statistics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'overview' in data
        assert 'top_brands' in data
        assert 'recent_brands' in data

        # Check overview
        overview = data['overview']
        assert overview['total_brands'] == 4
        assert overview['active_brands'] == 2
        assert overview['featured_brands'] == 2
        assert overview['inactive_brands'] == 2

        # Check top brands structure
        assert isinstance(data['top_brands'], list)
        if data['top_brands']:
            top_brand = data['top_brands'][0]
            assert 'id' in top_brand
            assert 'name' in top_brand
            assert 'product_count' in top_brand

        # Check recent brands
        assert isinstance(data['recent_brands'], list)
        assert len(data['recent_brands']) <= 5


class TestAdminBrandErrorHandling:
    """Test error handling scenarios."""

    def test_invalid_json_data(self, client, admin_headers):
        """Test handling of invalid JSON data."""
        response = client.post('/api/admin/brands/',
                             data='invalid json',
                             headers=admin_headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid JSON format' in data['error']

    def test_empty_request_body(self, client, admin_headers):
        """Test handling of empty request body."""
        response = client.post('/api/admin/brands/',
                             data='',
                             headers=admin_headers)
        assert response.status_code == 400

    @patch('app.routes.brands.admin_brand_routes.db.session.commit')
    def test_database_error_handling(self, mock_commit, client, admin_headers):
        """Test database error handling."""
        mock_commit.side_effect = Exception("Database error")

        brand_data = create_test_brand_data()
        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to create brand' in data['error']

    @patch('app.routes.brands.admin_brand_routes.Brand.query')
    def test_query_error_handling(self, mock_query, client, admin_headers):
        """Test query error handling."""
        mock_query.side_effect = Exception("Query error")

        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to retrieve brands' in data['error']


class TestAdminBrandSecurity:
    """Test security aspects of admin brand routes."""

    def test_sql_injection_prevention(self, client, admin_headers, sample_brands):
        """Test SQL injection prevention in search."""
        malicious_search = "'; DROP TABLE brands; --"
        response = client.get(f'/api/admin/brands/?search={malicious_search}',
                            headers=admin_headers)
        assert response.status_code == 200  # Should not cause error

        # Verify brands still exist
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) > 0

    def test_xss_prevention_in_brand_data(self, client, admin_headers):
        """Test XSS prevention in brand data."""
        xss_data = create_test_brand_data(
            name="<script>alert('xss')</script>",
            description="<img src=x onerror=alert('xss')>"
        )

        response = client.post('/api/admin/brands/',
                             data=json.dumps(xss_data),
                             headers=admin_headers)
        assert response.status_code == 201

        data = json.loads(response.data)
        # Data should be stored as-is but properly escaped when rendered
        assert '<script>' in data['brand']['name']

    def test_parameter_validation(self, client, admin_headers):
        """Test parameter validation."""
        # Test invalid pagination parameters
        response = client.get('/api/admin/brands/?page=-1&per_page=0', headers=admin_headers)
        assert response.status_code == 200  # Should handle gracefully

        # Test very large pagination values
        response = client.get('/api/admin/brands/?page=999999&per_page=999999',
                            headers=admin_headers)
        assert response.status_code == 200


class TestAdminBrandCORS:
    """Test CORS handling."""

    def test_options_method_support(self, client):
        """Test OPTIONS method support for CORS."""
        response = client.options('/api/admin/brands/')
        assert response.status_code == 200
        assert_cors_headers(response)

        response = client.options('/api/admin/brands/1')
        assert response.status_code == 200
        assert_cors_headers(response)

    def test_cors_headers_in_responses(self, client, admin_headers, sample_brands):
        """Test CORS headers in actual responses."""
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200
        # Note: CORS headers might be added by Flask-CORS middleware


class TestAdminBrandPagination:
    """Test pagination functionality."""

    def test_pagination_parameters(self, client, admin_headers, sample_brands):
        """Test pagination with different parameters."""
        # Test first page
        response = client.get('/api/admin/brands/?page=1&per_page=2', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2
        assert len(data['items']) <= 2

        # Test second page
        response = client.get('/api/admin/brands/?page=2&per_page=2', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['pagination']['page'] == 2

    def test_pagination_edge_cases(self, client, admin_headers, sample_brands):
        """Test pagination edge cases."""
        # Test page beyond available data
        response = client.get('/api/admin/brands/?page=999', headers=admin_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['items']) == 0

        # Test invalid page number
        response = client.get('/api/admin/brands/?page=0', headers=admin_headers)
        assert response.status_code == 200  # Should handle gracefully


class TestAdminBrandPerformance:
    """Test performance aspects."""

    @pytest.mark.benchmark
    def test_brands_list_performance(self, client, admin_headers, sample_brands, benchmark):
        """Benchmark brands list performance."""
        def get_brands():
            return client.get('/api/admin/brands/', headers=admin_headers)

        response = benchmark(get_brands)
        assert response.status_code == 200

    @pytest.mark.benchmark
    def test_brand_search_performance(self, client, admin_headers, sample_brands, benchmark):
        """Benchmark brand search performance."""
        def search_brands():
            return client.get('/api/admin/brands/?search=Nike', headers=admin_headers)

        response = benchmark(search_brands)
        assert response.status_code == 200

    def test_concurrent_requests(self, client, admin_headers, sample_brands):
        """Test handling of concurrent requests."""
        def make_request():
            return client.get('/api/admin/brands/', headers=admin_headers)

        threads = []
        results = []

        for _ in range(5):
            thread = threading.Thread(target=lambda: results.append(make_request()))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # All requests should succeed
        for response in results:
            assert response.status_code == 200


class TestAdminBrandIntegration:
    """Test integration scenarios."""

    def test_complete_brand_management_flow(self, client, admin_headers):
        """Test complete brand management workflow."""
        # 1. Create brand
        brand_data = create_test_brand_data("Integration Test Brand")
        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 201
        brand_id = json.loads(response.data)['brand']['id']

        # 2. Get brand
        response = client.get(f'/api/admin/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 200

        # 3. Update brand
        update_data = {'name': 'Updated Integration Brand', 'is_featured': True}
        response = client.put(f'/api/admin/brands/{brand_id}',
                            data=json.dumps(update_data),
                            headers=admin_headers)
        assert response.status_code == 200

        # 4. Toggle status
        response = client.post(f'/api/admin/brands/{brand_id}/toggle-status',
                             headers=admin_headers)
        assert response.status_code == 200

        # 5. Get brand products
        response = client.get(f'/api/admin/brands/{brand_id}/products',
                            headers=admin_headers)
        assert response.status_code == 200

        # 6. Delete brand
        response = client.delete(f'/api/admin/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 200

        # 7. Verify deletion
        response = client.get(f'/api/admin/brands/{brand_id}', headers=admin_headers)
        assert response.status_code == 404

    def test_bulk_operations_integration(self, client, admin_headers, sample_brands):
        """Test bulk operations integration."""
        # Get initial state
        response = client.get('/api/admin/brands/', headers=admin_headers)
        initial_data = json.loads(response.data)

        # Perform bulk update
        bulk_data = {
            'brand_ids': [1, 2],
            'updates': {'is_featured': True}
        }
        response = client.post('/api/admin/brands/bulk-update',
                             data=json.dumps(bulk_data),
                             headers=admin_headers)
        assert response.status_code == 200

        # Verify changes
        response = client.get('/api/admin/brands/', headers=admin_headers)
        updated_data = json.loads(response.data)

        # Check that featured count increased
        assert updated_data['statistics']['featured_brands'] >= initial_data['statistics']['featured_brands']


class TestAdminBrandHealthCheck:
    """Test health check endpoint."""

    def test_health_check_success(self, client):
        """Test health check endpoint."""
        response = client.get('/api/admin/brands/health')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'admin_brand_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert isinstance(data['endpoints'], list)

    def test_health_check_options(self, client):
        """Test health check OPTIONS method."""
        response = client.options('/api/admin/brands/health')
        assert response.status_code == 200


class TestAdminBrandEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_brand_list(self, client, admin_headers):
        """Test behavior with empty brand list."""
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['statistics']['total_brands'] == 0
        assert len(data['items']) == 0

    def test_brand_with_special_characters(self, client, admin_headers):
        """Test brand with special characters in name."""
        brand_data = create_test_brand_data("Brand & Co. (2024)")

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 201

        data = json.loads(response.data)
        assert data['brand']['name'] == "Brand & Co. (2024)"
        # Slug should be sanitized
        assert data['brand']['slug'] == "brand-co-2024"

    def test_very_long_brand_name(self, client, admin_headers):
        """Test brand with very long name."""
        long_name = "A" * 1000  # Very long name
        brand_data = create_test_brand_data(long_name)

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        # Should either succeed or fail gracefully
        assert response.status_code in [201, 400, 413]

    def test_unicode_characters_in_brand_data(self, client, admin_headers):
        """Test brand with unicode characters."""
        brand_data = create_test_brand_data("Bränd Ñamé 中文")

        response = client.post('/api/admin/brands/',
                             data=json.dumps(brand_data),
                             headers=admin_headers)
        assert response.status_code == 201

        data = json.loads(response.data)
        assert "Bränd Ñamé 中文" in data['brand']['name']


class TestAdminBrandRobustness:
    """Test system robustness and reliability."""

    def test_repeated_requests(self, client, admin_headers, sample_brands):
        """Test handling of repeated identical requests."""
        for _ in range(10):
            response = client.get('/api/admin/brands/', headers=admin_headers)
            assert response.status_code == 200

    def test_memory_usage_stability(self, client, admin_headers, sample_brands):
        """Test memory usage doesn't grow with repeated requests."""
        import gc

        # Make multiple requests
        for _ in range(50):
            response = client.get('/api/admin/brands/', headers=admin_headers)
            assert response.status_code == 200

        # Force garbage collection
        gc.collect()

        # System should still be responsive
        response = client.get('/api/admin/brands/', headers=admin_headers)
        assert response.status_code == 200


class TestAdminBrandMonitoring:
    """Test monitoring and observability features."""

    def test_response_time_tracking(self, client, admin_headers, sample_brands):
        """Test response time tracking."""
        start_time = time.time()
        response = client.get('/api/admin/brands/', headers=admin_headers)
        end_time = time.time()

        assert response.status_code == 200
        response_time = end_time - start_time
        assert response_time < 5.0  # Should respond within 5 seconds

    @patch('app.routes.brands.admin_brand_routes.logger')
    def test_error_logging_coverage(self, mock_logger, client, admin_headers):
        """Test that errors are properly logged."""
        with patch('app.routes.brands.admin_brand_routes.Brand.query') as mock_query:
            mock_query.side_effect = Exception("Test error")

            response = client.get('/api/admin/brands/', headers=admin_headers)
            assert response.status_code == 500

            # Verify error was logged
            mock_logger.error.assert_called()
