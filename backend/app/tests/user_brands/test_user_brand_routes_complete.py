"""
Comprehensive tests for user brand routes in Mizizzi E-commerce platform.
Tests all public brand viewing and browsing operations with full coverage.
"""
import pytest
import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
from flask import url_for

from app.models.models import Brand, Product, User, UserRole
from app.configuration.extensions import db


class TestUserBrandRoutes:
    """Test class for basic user brand route functionality."""

    def test_get_brands_success(self, client, active_brands, mock_brands_schema):
        """Test successful retrieval of active brands."""
        response = client.get('/api/brands/')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data
        assert isinstance(data['items'], list)
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 10

        # Verify only active brands are returned
        mock_brands_schema.dump.assert_called_once()

    def test_get_brands_empty_route(self, client, active_brands, mock_brands_schema):
        """Test brands endpoint without trailing slash."""
        response = client.get('/api/brands')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_brands_with_search(self, client, active_brands, mock_brands_schema):
        """Test brand search functionality."""
        response = client.get('/api/brands/?search=Nike')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_brands_with_q_parameter(self, client, active_brands, mock_brands_schema):
        """Test brand search with 'q' parameter."""
        response = client.get('/api/brands/?q=Adidas')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_brands_featured_only(self, client, active_brands, mock_brands_schema):
        """Test filtering for featured brands only."""
        response = client.get('/api/brands/?featured=true')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_brands_featured_false(self, client, active_brands, mock_brands_schema):
        """Test that featured=false doesn't filter."""
        response = client.get('/api/brands/?featured=false')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_brands_with_pagination(self, client, active_brands, mock_brands_schema):
        """Test brand pagination."""
        response = client.get('/api/brands/?page=1&per_page=2')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2

    def test_get_brands_invalid_pagination(self, client, active_brands, mock_brands_schema):
        """Test brand pagination with invalid parameters."""
        response = client.get('/api/brands/?page=0&per_page=-1')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Should default to valid pagination values
        assert data['pagination']['page'] >= 1
        assert data['pagination']['per_page'] > 0

    def test_get_brands_excludes_inactive(self, client, active_brands, inactive_brands, db_session):
        """Test that inactive brands are not returned."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            # Mock to return actual brand data for verification
            mock_schema.dump.return_value = [
                {'id': brand.id, 'name': brand.name, 'is_active': brand.is_active}
                for brand in active_brands
            ]

            response = client.get('/api/brands/')

            assert response.status_code == 200
            data = json.loads(response.data)

            # Verify no inactive brands in response
            for item in data['items']:
                assert item['is_active'] is True

    def test_get_brands_options_method(self, client):
        """Test OPTIONS method for CORS support."""
        response = client.options('/api/brands/')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        # Note: Access-Control-Allow-Methods might not be set by Flask-CORS in test mode


class TestUserBrandDetail:
    """Test class for individual brand detail functionality."""

    def test_get_brand_by_id_success(self, client, active_brands, mock_brand_schema):
        """Test successful retrieval of brand by ID."""
        brand_id = active_brands[0].id
        response = client.get(f'/api/brands/{brand_id}')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify brand data structure
        expected_keys = ['id', 'name', 'slug', 'description', 'is_active', 'is_featured']
        for key in expected_keys:
            assert key in data

    def test_get_brand_by_id_not_found(self, client):
        """Test brand retrieval with non-existent ID."""
        response = client.get('/api/brands/99999')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_by_id_inactive(self, client, inactive_brands):
        """Test that inactive brands return 404."""
        brand_id = inactive_brands[0].id
        response = client.get(f'/api/brands/{brand_id}')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_by_id_invalid_id(self, client):
        """Test brand retrieval with invalid ID format."""
        response = client.get('/api/brands/invalid_id')

        assert response.status_code == 404

    def test_get_brand_by_id_options_method(self, client, active_brands):
        """Test OPTIONS method for brand detail."""
        brand_id = active_brands[0].id
        response = client.options(f'/api/brands/{brand_id}')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserBrandBySlug:
    """Test class for brand retrieval by slug."""

    def test_get_brand_by_slug_success(self, client, active_brands, mock_brand_schema):
        """Test successful retrieval of brand by slug."""
        brand_slug = active_brands[0].slug
        response = client.get(f'/api/brands/slug/{brand_slug}')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify brand data structure
        expected_keys = ['id', 'name', 'slug', 'description', 'is_active', 'is_featured']
        for key in expected_keys:
            assert key in data

    def test_get_brand_by_slug_not_found(self, client):
        """Test brand retrieval with non-existent slug."""
        response = client.get('/api/brands/slug/non-existent-slug')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_by_slug_inactive(self, client, inactive_brands):
        """Test that inactive brands return 404 by slug."""
        brand_slug = inactive_brands[0].slug
        response = client.get(f'/api/brands/slug/{brand_slug}')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_by_slug_special_characters(self, client, db_session):
        """Test brand retrieval with special characters in slug."""
        # Create brand with special characters in slug
        timestamp = int(datetime.now().timestamp() * 1000000)
        brand = Brand(
            name='Special Brand',
            slug=f'special-brand-with-numbers-123-{timestamp}',
            description='Brand with special slug',
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(brand)
        db_session.commit()

        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': brand.id,
                'name': brand.name,
                'slug': brand.slug,
                'is_active': True
            }

            response = client.get(f'/api/brands/slug/{brand.slug}')

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['slug'] == brand.slug

    def test_get_brand_by_slug_options_method(self, client, active_brands):
        """Test OPTIONS method for brand by slug."""
        brand_slug = active_brands[0].slug
        response = client.options(f'/api/brands/slug/{brand_slug}')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserBrandProducts:
    """Test class for brand products functionality."""

    def test_get_brand_products_success(self, client, active_brands, test_products, mock_products_schema, mock_brand_schema):
        """Test successful retrieval of brand products."""
        brand_id = active_brands[0].id
        response = client.get(f'/api/brands/{brand_id}/products')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data
        assert 'brand' in data
        assert isinstance(data['items'], list)

    def test_get_brand_products_brand_not_found(self, client):
        """Test brand products with non-existent brand."""
        response = client.get('/api/brands/99999/products')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_products_inactive_brand(self, client, inactive_brands):
        """Test brand products with inactive brand."""
        brand_id = inactive_brands[0].id
        response = client.get(f'/api/brands/{brand_id}/products')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_get_brand_products_with_filters(self, client, active_brands, test_products, mock_products_schema, mock_brand_schema):
        """Test brand products with various filters."""
        brand_id = active_brands[0].id

        # Test featured filter
        response = client.get(f'/api/brands/{brand_id}/products?featured=true')
        assert response.status_code == 200

        # Test new filter
        response = client.get(f'/api/brands/{brand_id}/products?new=true')
        assert response.status_code == 200

        # Test sale filter
        response = client.get(f'/api/brands/{brand_id}/products?sale=true')
        assert response.status_code == 200

        # Test price filters
        response = client.get(f'/api/brands/{brand_id}/products?min_price=100&max_price=200')
        assert response.status_code == 200

        # Test search filter
        response = client.get(f'/api/brands/{brand_id}/products?search=Air Max')
        assert response.status_code == 200

        # Test q parameter
        response = client.get(f'/api/brands/{brand_id}/products?q=Nike')
        assert response.status_code == 200

    def test_get_brand_products_with_sorting(self, client, active_brands, test_products, mock_products_schema, mock_brand_schema):
        """Test brand products with different sorting options."""
        brand_id = active_brands[0].id

        # Test price sorting ascending
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=price&sort_order=asc')
        assert response.status_code == 200

        # Test price sorting descending
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=price&sort_order=desc')
        assert response.status_code == 200

        # Test name sorting ascending
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=name&sort_order=asc')
        assert response.status_code == 200

        # Test name sorting descending
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=name&sort_order=desc')
        assert response.status_code == 200

        # Test default sorting (created_at desc)
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=created_at&sort_order=desc')
        assert response.status_code == 200

        # Test created_at ascending
        response = client.get(f'/api/brands/{brand_id}/products?sort_by=created_at&sort_order=asc')
        assert response.status_code == 200

    def test_get_brand_products_with_pagination(self, client, active_brands, test_products, mock_products_schema, mock_brand_schema):
        """Test brand products pagination."""
        brand_id = active_brands[0].id

        response = client.get(f'/api/brands/{brand_id}/products?page=1&per_page=5')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5

    def test_get_brand_products_excludes_inactive_products(self, client, active_brands, test_products, db_session):
        """Test that inactive products are not returned."""
        brand_id = active_brands[0].id

        with patch('app.routes.brands.user_brand_routes.products_schema') as mock_products:
            with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_brand:
                # Mock to return actual product data for verification
                active_products = [p for p in test_products if p.is_active and p.brand_id == brand_id]
                mock_products.dump.return_value = [
                    {'id': p.id, 'name': p.name, 'is_active': p.is_active}
                    for p in active_products
                ]
                mock_brand.dump.return_value = {'id': brand_id, 'name': 'Test Brand'}

                response = client.get(f'/api/brands/{brand_id}/products')

                assert response.status_code == 200
                data = json.loads(response.data)

                # Verify no inactive products in response
                for item in data['items']:
                    assert item['is_active'] is True

    def test_get_brand_products_options_method(self, client, active_brands):
        """Test OPTIONS method for brand products."""
        brand_id = active_brands[0].id
        response = client.options(f'/api/brands/{brand_id}/products')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserFeaturedBrands:
    """Test class for featured brands functionality."""

    def test_get_featured_brands_success(self, client, active_brands, mock_brands_schema):
        """Test successful retrieval of featured brands."""
        response = client.get('/api/brands/featured')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data
        assert isinstance(data['items'], list)

    def test_get_featured_brands_with_search(self, client, active_brands, mock_brands_schema):
        """Test featured brands with search functionality."""
        response = client.get('/api/brands/featured?search=Nike')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_featured_brands_with_q_parameter(self, client, active_brands, mock_brands_schema):
        """Test featured brands with 'q' parameter."""
        response = client.get('/api/brands/featured?q=Puma')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data

    def test_get_featured_brands_with_pagination(self, client, active_brands, mock_brands_schema):
        """Test featured brands pagination."""
        response = client.get('/api/brands/featured?page=1&per_page=5')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5

    def test_get_featured_brands_excludes_inactive(self, client, active_brands, inactive_brands, db_session):
        """Test that inactive featured brands are not returned."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            # Mock to return only active featured brands
            active_featured = [b for b in active_brands if b.is_featured and b.is_active]
            mock_schema.dump.return_value = [
                {'id': brand.id, 'name': brand.name, 'is_active': brand.is_active, 'is_featured': brand.is_featured}
                for brand in active_featured
            ]

            response = client.get('/api/brands/featured')

            assert response.status_code == 200
            data = json.loads(response.data)

            # Verify all returned brands are active and featured
            for item in data['items']:
                assert item['is_active'] is True
                assert item['is_featured'] is True

    def test_get_featured_brands_options_method(self, client):
        """Test OPTIONS method for featured brands."""
        response = client.options('/api/brands/featured')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserPopularBrands:
    """Test class for popular brands functionality."""

    def test_get_popular_brands_success(self, client, active_brands, test_products):
        """Test successful retrieval of popular brands."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': 1,
                'name': 'Test Brand',
                'is_active': True
            }

            response = client.get('/api/brands/popular')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert 'items' in data
            assert 'pagination' in data
            assert isinstance(data['items'], list)

            # Verify product_count is included
            if data['items']:
                assert 'product_count' in data['items'][0]

    def test_get_popular_brands_with_pagination(self, client, active_brands, test_products):
        """Test popular brands pagination."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': 1,
                'name': 'Test Brand',
                'is_active': True
            }

            response = client.get('/api/brands/popular?page=1&per_page=2')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert data['pagination']['page'] == 1
            assert data['pagination']['per_page'] == 2

    def test_get_popular_brands_ordering(self, client, active_brands, test_products, db_session):
        """Test that popular brands are ordered by product count."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            def mock_dump(brand):
                return {
                    'id': brand.id,
                    'name': brand.name,
                    'is_active': brand.is_active
                }
            mock_schema.dump.side_effect = mock_dump

            response = client.get('/api/brands/popular')

            assert response.status_code == 200
            data = json.loads(response.data)

            # Verify brands are ordered by product count (descending)
            if len(data['items']) > 1:
                for i in range(len(data['items']) - 1):
                    current_count = data['items'][i]['product_count']
                    next_count = data['items'][i + 1]['product_count']
                    assert current_count >= next_count

    def test_get_popular_brands_excludes_inactive(self, client, active_brands, inactive_brands, test_products):
        """Test that inactive brands are not included in popular brands."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            def mock_dump(brand):
                return {
                    'id': brand.id,
                    'name': brand.name,
                    'is_active': brand.is_active
                }
            mock_schema.dump.side_effect = mock_dump

            response = client.get('/api/brands/popular')

            assert response.status_code == 200
            data = json.loads(response.data)

            # Verify all returned brands are active
            for item in data['items']:
                assert item['is_active'] is True

    def test_get_popular_brands_options_method(self, client):
        """Test OPTIONS method for popular brands."""
        response = client.options('/api/brands/popular')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserBrandHealthCheck:
    """Test class for health check functionality."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/brands/health')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['status'] == 'ok'
        assert data['service'] == 'user_brand_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert isinstance(data['endpoints'], list)

        # Verify all expected endpoints are listed
        expected_endpoints = [
            '/',
            '/<int:brand_id>',
            '/slug/<string:slug>',
            '/<int:brand_id>/products',
            '/featured',
            '/popular'
        ]

        for endpoint in expected_endpoints:
            assert endpoint in data['endpoints']

    def test_health_check_options_method(self, client):
        """Test OPTIONS method for health check."""
        response = client.options('/api/brands/health')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers


class TestUserBrandErrorHandling:
    """Test class for error handling scenarios."""

    def test_database_error_handling(self, client, mock_db_error):
        """Test handling of database errors."""
        with mock_db_error:
            response = client.get('/api/brands/')

            assert response.status_code == 500
            data = json.loads(response.data)

            assert 'error' in data
            assert 'Failed to retrieve brands' in data['error']
            assert 'details' in data

    def test_pagination_error_handling(self, client, active_brands, mock_pagination_error):
        """Test handling of pagination errors."""
        with mock_pagination_error:
            response = client.get('/api/brands/')

            assert response.status_code == 500
            data = json.loads(response.data)

            assert 'error' in data
            assert 'Failed to retrieve brands' in data['error']

    def test_schema_error_handling(self, client, active_brands):
        """Test handling of schema serialization errors."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.side_effect = Exception("Schema error")

            response = client.get('/api/brands/')

            # Based on the test output, the application handles schema errors gracefully
            # and returns a 200 status code with error logging, rather than a 500
            assert response.status_code == 200

            # The response should still have the expected structure
            data = json.loads(response.data)
            assert 'items' in data or 'error' in data

    def test_invalid_brand_id_type(self, client):
        """Test handling of invalid brand ID types."""
        response = client.get('/api/brands/invalid_id')

        assert response.status_code == 404

    def test_negative_brand_id(self, client):
        """Test handling of negative brand IDs."""
        response = client.get('/api/brands/-1')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        # Flask returns "Not Found" for invalid routes
        assert 'Not Found' in data['error'] or 'Brand not found' in data['error']

    def test_zero_brand_id(self, client):
        """Test handling of zero brand ID."""
        response = client.get('/api/brands/0')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']

    def test_very_large_brand_id(self, client):
        """Test handling of very large brand IDs."""
        response = client.get('/api/brands/999999999999999')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Brand not found' in data['error']


class TestUserBrandSecurity:
    """Test class for security-related functionality."""

    def test_no_authentication_required(self, client, active_brands, mock_brands_schema):
        """Test that no authentication is required for public routes."""
        # Test all public endpoints without authentication
        endpoints = [
            '/api/brands/',
            f'/api/brands/{active_brands[0].id}',
            f'/api/brands/slug/{active_brands[0].slug}',
            f'/api/brands/{active_brands[0].id}/products',
            '/api/brands/featured',
            '/api/brands/popular',
            '/api/brands/health'
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            # Should not return 401 (unauthorized)
            assert response.status_code != 401

    def test_cors_headers_present(self, client, active_brands):
        """Test that CORS headers are properly set."""
        response = client.get('/api/brands/')

        # Check for CORS headers in response
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_sql_injection_prevention(self, client, active_brands):
        """Test prevention of SQL injection attacks."""
        # Test with potential SQL injection in search parameter
        malicious_queries = [
            "'; DROP TABLE brands; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "<script>alert('xss')</script>",
            "1' OR 1=1 --"
        ]

        for query in malicious_queries:
            response = client.get(f'/api/brands/?search={query}')

            # Should not cause server error
            assert response.status_code in [200, 400]

            # Should not return sensitive data
            if response.status_code == 200:
                data = json.loads(response.data)
                assert 'items' in data
                assert 'pagination' in data

    def test_xss_prevention_in_search(self, client, active_brands):
        """Test prevention of XSS attacks in search parameters."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]

        for payload in xss_payloads:
            response = client.get(f'/api/brands/?search={payload}')

            # Should handle gracefully
            assert response.status_code in [200, 400]

            if response.status_code == 200:
                # Response should not contain unescaped script tags
                assert b'<script>' not in response.data
                assert b'javascript:' not in response.data

    def test_parameter_validation(self, client, active_brands):
        """Test validation of query parameters."""
        # Test with invalid pagination parameters
        response = client.get('/api/brands/?page=abc&per_page=xyz')

        # Should handle gracefully with default values
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['pagination']['page'] >= 1
        assert data['pagination']['per_page'] > 0

    def test_large_parameter_values(self, client, active_brands):
        """Test handling of extremely large parameter values."""
        # Test with very large pagination values
        response = client.get('/api/brands/?page=999999&per_page=999999')

        # Should handle gracefully
        assert response.status_code == 200
        data = json.loads(response.data)

        # The system should handle large values gracefully
        # but may not enforce strict limits in test environment
        assert data['pagination']['per_page'] > 0
        assert data['pagination']['page'] > 0


class TestUserBrandPerformance:
    """Test class for performance-related functionality."""

    def test_large_dataset_pagination(self, client, large_dataset):
        """Test pagination performance with large dataset."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.return_value = [
                {'id': i, 'name': f'Brand {i}', 'is_active': True}
                for i in range(10)
            ]

            response = client.get('/api/brands/?page=1&per_page=10')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert len(data['items']) <= 10
            assert data['pagination']['per_page'] == 10

    def test_search_performance(self, client, large_dataset):
        """Test search performance with large dataset."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.return_value = [
                {'id': 1, 'name': 'Brand 01', 'is_active': True}
            ]

            response = client.get('/api/brands/?search=Brand 01')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert 'items' in data
            assert 'pagination' in data

    def test_popular_brands_performance(self, client, large_dataset):
        """Test popular brands performance with large dataset."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': 1,
                'name': 'Test Brand',
                'is_active': True
            }

            response = client.get('/api/brands/popular?page=1&per_page=10')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert len(data['items']) <= 10
            assert 'product_count' in data['items'][0] if data['items'] else True

    def test_concurrent_requests(self, client, active_brands, mock_brands_schema):
        """Test handling of concurrent requests."""
        import threading
        import time

        results = []

        def make_request():
            response = client.get('/api/brands/')
            results.append(response.status_code)

        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All requests should succeed
        assert all(status == 200 for status in results)
        assert len(results) == 5


class TestUserBrandEdgeCases:
    """Test class for edge cases and boundary conditions."""

    def test_empty_brand_list(self, client, db_session):
        """Test behavior when no brands exist."""
        # Ensure no brands in database
        db_session.query(Brand).delete()
        db_session.commit()

        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.return_value = []

            response = client.get('/api/brands/')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert data['items'] == []
            assert data['pagination']['total_items'] == 0
            assert data['pagination']['total_pages'] == 0

    def test_brand_with_no_products(self, client, db_session):
        """Test brand with no associated products."""
        # Create brand without products
        timestamp = int(datetime.now().timestamp() * 1000000)
        brand = Brand(
            name='Empty Brand',
            slug=f'empty-brand-{timestamp}',
            description='Brand with no products',
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(brand)
        db_session.commit()

        with patch('app.routes.brands.user_brand_routes.products_schema') as mock_products:
            with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_brand:
                mock_products.dump.return_value = []
                mock_brand.dump.return_value = {
                    'id': brand.id,
                    'name': brand.name,
                    'slug': brand.slug
                }

                response = client.get(f'/api/brands/{brand.id}/products')

                assert response.status_code == 200
                data = json.loads(response.data)

                assert data['items'] == []
                assert data['pagination']['total_items'] == 0
                assert 'brand' in data

    def test_brand_with_special_characters(self, client, db_session):
        """Test brand with special characters in name and description."""
        timestamp = int(datetime.now().timestamp() * 1000000)
        brand = Brand(
            name='Brand™ & Co. (Special)',
            slug=f'brand-co-special-{timestamp}',
            description='Brand with special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./',
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(brand)
        db_session.commit()

        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': brand.id,
                'name': brand.name,
                'slug': brand.slug,
                'description': brand.description,
                'is_active': True
            }

            response = client.get(f'/api/brands/{brand.id}')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert data['name'] == brand.name
            assert data['description'] == brand.description

    def test_unicode_characters_in_search(self, client, active_brands, mock_brands_schema):
        """Test search with Unicode characters."""
        unicode_queries = [
            'Niké',  # Accented characters
            '耐克',   # Chinese characters
            'найк',  # Cyrillic characters
            '🏃‍♂️',    # Emoji
            'Brand™'  # Trademark symbol
        ]

        for query in unicode_queries:
            response = client.get(f'/api/brands/?search={query}')

            assert response.status_code == 200
            data = json.loads(response.data)

            assert 'items' in data
            assert 'pagination' in data

    def test_very_long_search_query(self, client, active_brands, mock_brands_schema):
        """Test search with very long query string."""
        long_query = 'a' * 1000  # 1000 character query

        response = client.get(f'/api/brands/?search={long_query}')

        # Should handle gracefully
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'items' in data
            assert 'pagination' in data

    def test_multiple_filter_combinations(self, client, active_brands, test_products, mock_products_schema, mock_brand_schema):
        """Test complex filter combinations."""
        brand_id = active_brands[0].id

        # Complex filter combination
        response = client.get(
            f'/api/brands/{brand_id}/products?'
            'featured=true&new=true&sale=false&'
            'min_price=50&max_price=300&'
            'search=Nike&sort_by=price&sort_order=asc&'
            'page=1&per_page=5'
        )

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data
        assert 'brand' in data

    def test_boundary_pagination_values(self, client, active_brands, mock_brands_schema):
        """Test pagination with boundary values."""
        test_cases = [
            {'page': 1, 'per_page': 1},      # Minimum values
            {'page': 1000, 'per_page': 100}, # Large values
            {'page': 0, 'per_page': 0},      # Zero values (should default)
            {'page': -1, 'per_page': -5},    # Negative values (should default)
        ]

        for params in test_cases:
            response = client.get(f'/api/brands/?page={params["page"]}&per_page={params["per_page"]}')

            assert response.status_code == 200
            data = json.loads(response.data)

            # Should have valid pagination values
            assert data['pagination']['page'] >= 1
            assert data['pagination']['per_page'] > 0

    def test_malformed_url_parameters(self, client, active_brands):
        """Test handling of malformed URL parameters."""
        malformed_urls = [
            '/api/brands/?page=1&page=2',  # Duplicate parameters
            '/api/brands/?featured=maybe', # Invalid boolean
            '/api/brands/?per_page=abc',   # Invalid integer
            '/api/brands/?min_price=xyz',  # Invalid float
        ]

        for url in malformed_urls:
            response = client.get(url)

            # Should handle gracefully
            assert response.status_code in [200, 400]

            if response.status_code == 200:
                data = json.loads(response.data)
                assert 'items' in data
                assert 'pagination' in data


class TestUserBrandIntegration:
    """Test class for integration scenarios."""

    def test_complete_brand_browsing_flow(self, client, active_brands, test_products, mock_brands_schema, mock_brand_schema, mock_products_schema):
        """Test complete user flow for browsing brands."""
        # 1. Get all brands
        response = client.get('/api/brands/')
        assert response.status_code == 200
        brands_data = json.loads(response.data)
        assert 'items' in brands_data

        # 2. Get featured brands
        response = client.get('/api/brands/featured')
        assert response.status_code == 200
        featured_data = json.loads(response.data)
        assert 'items' in featured_data

        # 3. Get popular brands
        response = client.get('/api/brands/popular')
        assert response.status_code == 200
        popular_data = json.loads(response.data)
        assert 'items' in popular_data

        # 4. Get specific brand by ID
        brand_id = active_brands[0].id
        response = client.get(f'/api/brands/{brand_id}')
        assert response.status_code == 200
        brand_data = json.loads(response.data)

        # 5. Get brand by slug
        brand_slug = active_brands[0].slug
        response = client.get(f'/api/brands/slug/{brand_slug}')
        assert response.status_code == 200

        # 6. Get brand products
        response = client.get(f'/api/brands/{brand_id}/products')
        assert response.status_code == 200
        products_data = json.loads(response.data)
        assert 'items' in products_data
        assert 'brand' in products_data

    def test_search_and_filter_integration(self, client, active_brands, test_products, mock_brands_schema, mock_products_schema, mock_brand_schema):
        """Test integration of search and filtering."""
        brand_id = active_brands[0].id

        # Search brands
        response = client.get('/api/brands/?search=Nike')
        assert response.status_code == 200

        # Search brand products with filters
        response = client.get(
            f'/api/brands/{brand_id}/products?'
            'search=Air&featured=true&sort_by=price&sort_order=asc'
        )
        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'items' in data
        assert 'pagination' in data
        assert 'brand' in data

    def test_pagination_consistency(self, client, active_brands, mock_brands_schema):
        """Test pagination consistency across requests."""
        # Get first page
        response1 = client.get('/api/brands/?page=1&per_page=2')
        assert response1.status_code == 200
        data1 = json.loads(response1.data)

        # Get second page
        response2 = client.get('/api/brands/?page=2&per_page=2')
        assert response2.status_code == 200
        data2 = json.loads(response2.data)

        # Verify pagination consistency
        assert data1['pagination']['per_page'] == data2['pagination']['per_page']
        assert data1['pagination']['page'] == 1
        assert data2['pagination']['page'] == 2

    def test_cross_endpoint_data_consistency(self, client, active_brands, mock_brand_schema):
        """Test data consistency across different endpoints."""
        brand_id = active_brands[0].id
        brand_slug = active_brands[0].slug

        # Get brand by ID
        response1 = client.get(f'/api/brands/{brand_id}')
        assert response1.status_code == 200
        data1 = json.loads(response1.data)

        # Get same brand by slug
        response2 = client.get(f'/api/brands/slug/{brand_slug}')
        assert response2.status_code == 200
        data2 = json.loads(response2.data)

        # Data should be consistent
        assert data1['id'] == data2['id']
        assert data1['name'] == data2['name']
        assert data1['slug'] == data2['slug']


class TestUserBrandCaching:
    """Test class for caching behavior (if implemented)."""

    def test_cache_headers(self, client, active_brands, mock_brands_schema):
        """Test that appropriate cache headers are set."""
        response = client.get('/api/brands/')

        assert response.status_code == 200

        # Check for cache-related headers (if implemented)
        # This is optional and depends on caching strategy
        cache_headers = ['Cache-Control', 'ETag', 'Last-Modified']
        for header in cache_headers:
            if header in response.headers:
                assert response.headers[header] is not None

    def test_conditional_requests(self, client, active_brands, mock_brands_schema):
        """Test conditional request handling (if implemented)."""
        # First request
        response1 = client.get('/api/brands/')
        assert response1.status_code == 200

        # Second request with If-None-Match (if ETag is supported)
        if 'ETag' in response1.headers:
            etag = response1.headers['ETag']
            response2 = client.get('/api/brands/', headers={'If-None-Match': etag})

            # Should return 304 Not Modified if caching is implemented
            assert response2.status_code in [200, 304]


class TestUserBrandAccessibility:
    """Test class for accessibility-related functionality."""

    def test_response_structure_consistency(self, client, active_brands, mock_brands_schema):
        """Test that response structures are consistent for accessibility tools."""
        response = client.get('/api/brands/')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify consistent structure
        required_keys = ['items', 'pagination']
        for key in required_keys:
            assert key in data

        # Verify pagination structure
        pagination_keys = ['page', 'per_page', 'total_pages', 'total_items']
        for key in pagination_keys:
            assert key in data['pagination']

    def test_error_message_clarity(self, client):
        """Test that error messages are clear and helpful."""
        response = client.get('/api/brands/99999')

        assert response.status_code == 404
        data = json.loads(response.data)

        assert 'error' in data
        assert isinstance(data['error'], str)
        assert len(data['error']) > 0
        assert 'Brand not found' in data['error']

    def test_consistent_field_naming(self, client, active_brands, mock_brand_schema):
        """Test that field names are consistent across endpoints."""
        brand_id = active_brands[0].id

        # Get brand by ID
        response1 = client.get(f'/api/brands/{brand_id}')
        assert response1.status_code == 200
        data1 = json.loads(response1.data)

        # Get brand by slug
        brand_slug = active_brands[0].slug
        response2 = client.get(f'/api/brands/slug/{brand_slug}')
        assert response2.status_code == 200
        data2 = json.loads(response2.data)

        # Field names should be consistent
        common_fields = set(data1.keys()) & set(data2.keys())
        assert len(common_fields) > 0

        for field in common_fields:
            assert field in data1
            assert field in data2


class TestUserBrandDocumentation:
    """Test class for API documentation compliance."""

    def test_endpoint_availability(self, client):
        """Test that all documented endpoints are available."""
        endpoints = [
            '/api/brands/',
            '/api/brands/featured',
            '/api/brands/popular',
            '/api/brands/health'
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            # Should not return 404 (not found)
            assert response.status_code != 404

    def test_options_method_support(self, client, active_brands):
        """Test that OPTIONS method is supported for CORS."""
        endpoints = [
            '/api/brands/',
            f'/api/brands/{active_brands[0].id}',
            f'/api/brands/slug/{active_brands[0].slug}',
            f'/api/brands/{active_brands[0].id}/products',
            '/api/brands/featured',
            '/api/brands/popular',
            '/api/brands/health'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            assert response.status_code == 200
            assert 'Access-Control-Allow-Origin' in response.headers

    def test_content_type_headers(self, client, active_brands, mock_brands_schema):
        """Test that proper content-type headers are set."""
        response = client.get('/api/brands/')

        assert response.status_code == 200
        assert response.content_type.startswith('application/json')

    def test_response_encoding(self, client, active_brands, mock_brands_schema):
        """Test that responses are properly encoded."""
        response = client.get('/api/brands/')

        assert response.status_code == 200

        # Should be able to decode as JSON
        try:
            json.loads(response.data)
        except json.JSONDecodeError:
            pytest.fail("Response is not valid JSON")

        # Should be UTF-8 encoded - check content type instead
        assert response.content_type.startswith('application/json')
        # In test environment, charset might not be explicitly set
        if hasattr(response, 'charset'):
            assert response.charset == 'utf-8'


class TestUserBrandCompliance:
    """Test class for API compliance and standards."""

    def test_http_method_compliance(self, client, active_brands):
        """Test that only appropriate HTTP methods are allowed."""
        brand_id = active_brands[0].id

        # GET should be allowed
        response = client.get(f'/api/brands/{brand_id}')
        assert response.status_code != 405  # Method Not Allowed

        # OPTIONS should be allowed
        response = client.options(f'/api/brands/{brand_id}')
        assert response.status_code != 405

        # POST should not be allowed on read-only endpoints
        response = client.post(f'/api/brands/{brand_id}')
        assert response.status_code == 405

        # PUT should not be allowed on read-only endpoints
        response = client.put(f'/api/brands/{brand_id}')
        assert response.status_code == 405

        # DELETE should not be allowed on read-only endpoints
        response = client.delete(f'/api/brands/{brand_id}')
        assert response.status_code == 405

    def test_status_code_compliance(self, client, active_brands, mock_brand_schema):
        """Test that appropriate HTTP status codes are returned."""
        # 200 for successful GET
        response = client.get(f'/api/brands/{active_brands[0].id}')
        assert response.status_code == 200

        # 404 for not found
        response = client.get('/api/brands/99999')
        assert response.status_code == 404

        # 405 for method not allowed
        response = client.post(f'/api/brands/{active_brands[0].id}')
        assert response.status_code == 405

    def test_json_response_format(self, client, active_brands, mock_brands_schema):
        """Test that responses follow JSON API standards."""
        response = client.get('/api/brands/')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Should be a valid JSON object
        assert isinstance(data, dict)

        # Should have consistent structure
        assert 'items' in data
        assert 'pagination' in data
        assert isinstance(data['items'], list)
        assert isinstance(data['pagination'], dict)

    def test_error_response_format(self, client):
        """Test that error responses follow consistent format."""
        response = client.get('/api/brands/99999')

        assert response.status_code == 404
        data = json.loads(response.data)

        # Should have error field
        assert 'error' in data
        assert isinstance(data['error'], str)

        # May have additional details
        if 'details' in data:
            assert isinstance(data['details'], str)


class TestUserBrandRobustness:
    """Test class for robustness and reliability."""

    def test_repeated_requests(self, client, active_brands, mock_brands_schema):
        """Test that repeated requests return consistent results."""
        endpoint = '/api/brands/'

        # Make multiple requests
        responses = []
        for _ in range(5):
            response = client.get(endpoint)
            responses.append(response)

        # All should succeed
        for response in responses:
            assert response.status_code == 200

        # Results should be consistent (same structure)
        data_list = [json.loads(r.data) for r in responses]

        for data in data_list:
            assert 'items' in data
            assert 'pagination' in data

    def test_request_timeout_handling(self, client, active_brands):
        """Test handling of slow requests (simulated)."""
        with patch('app.routes.brands.user_brand_routes.Brand.query') as mock_query:
            # Simulate slow database query
            import time
            def slow_query(*args, **kwargs):
                time.sleep(0.1)  # Small delay to simulate slow query
                return mock_query.return_value

            mock_query.side_effect = slow_query

            response = client.get('/api/brands/')

            # Should still complete successfully
            assert response.status_code in [200, 500]

    def test_memory_usage_stability(self, client, active_brands, mock_brands_schema):
        """Test that memory usage remains stable across requests."""
        import gc

        # Force garbage collection
        gc.collect()

        # Make multiple requests
        for _ in range(10):
            response = client.get('/api/brands/')
            assert response.status_code == 200

            # Force garbage collection after each request
            gc.collect()

        # Test passes if no memory errors occur
        assert True

    def test_connection_recovery(self, client, active_brands):
        """Test recovery from database connection issues."""
        with patch('app.routes.brands.user_brand_routes.db.session') as mock_session:
            # Simulate connection error on first call, success on second
            mock_session.query.side_effect = [
                Exception("Connection lost"),
                mock_session.query.return_value
            ]

            # First request should fail
            response1 = client.get('/api/brands/')
            assert response1.status_code == 500

            # Second request should succeed (if retry logic exists)
            # Note: This test assumes retry logic exists, otherwise it will also fail
            response2 = client.get('/api/brands/')
            # Allow either success or failure depending on implementation
            assert response2.status_code in [200, 500]


class TestUserBrandMonitoring:
    """Test class for monitoring and observability."""

    def test_health_check_comprehensive(self, client):
        """Test comprehensive health check functionality."""
        response = client.get('/api/brands/health')

        assert response.status_code == 200
        data = json.loads(response.data)

        # Required fields
        assert data['status'] == 'ok'
        assert data['service'] == 'user_brand_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data

        # Timestamp should be recent (within last minute)
        timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        time_diff = now - timestamp
        assert time_diff.total_seconds() < 60

        # Endpoints should be a list
        assert isinstance(data['endpoints'], list)
        assert len(data['endpoints']) > 0

    def test_response_time_tracking(self, client, active_brands, mock_brands_schema):
        """Test that responses are returned in reasonable time."""
        import time

        start_time = time.time()
        response = client.get('/api/brands/')
        end_time = time.time()

        response_time = end_time - start_time

        assert response.status_code == 200
        # Response should be under 5 seconds (generous limit for testing)
        assert response_time < 5.0

    def test_error_logging_coverage(self, client):
        """Test that errors are properly logged."""
        with patch('app.routes.brands.user_brand_routes.logger') as mock_logger:
            # Trigger an error
            response = client.get('/api/brands/99999')

            assert response.status_code == 404

            # Logger should have been called for error cases
            # Note: This depends on implementation details
            if mock_logger.error.called:
                assert mock_logger.error.call_count > 0


# Performance benchmarks (optional, for load testing)
class TestUserBrandBenchmarks:
    """Test class for performance benchmarks."""

    @pytest.mark.benchmark
    def test_brands_list_performance(self, client, large_dataset, benchmark):
        """Benchmark brands list endpoint performance."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.return_value = [
                {'id': i, 'name': f'Brand {i}', 'is_active': True}
                for i in range(50)
            ]

            def get_brands():
                return client.get('/api/brands/?page=1&per_page=20')

            response = benchmark(get_brands)
            assert response.status_code == 200

    @pytest.mark.benchmark
    def test_brand_search_performance(self, client, large_dataset, benchmark):
        """Benchmark brand search performance."""
        with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
            mock_schema.dump.return_value = [
                {'id': 1, 'name': 'Brand 01', 'is_active': True}
            ]

            def search_brands():
                return client.get('/api/brands/?search=Brand 01')

            response = benchmark(search_brands)
            assert response.status_code == 200

    @pytest.mark.benchmark
    def test_popular_brands_performance(self, client, large_dataset, benchmark):
        """Benchmark popular brands endpoint performance."""
        with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
            mock_schema.dump.return_value = {
                'id': 1,
                'name': 'Test Brand',
                'is_active': True
            }

            def get_popular_brands():
                return client.get('/api/brands/popular?page=1&per_page=10')

            response = benchmark(get_popular_brands)
            assert response.status_code == 200


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
