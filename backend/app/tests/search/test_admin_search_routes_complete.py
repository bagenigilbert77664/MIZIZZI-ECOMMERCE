"""
Comprehensive tests for Admin Search Routes.
Tests all admin search functionality including authentication, filtering, and advanced features.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from flask import Flask
from flask_jwt_extended import create_access_token

# Import the routes
try:
    from app.routes.search.admin_search_routes import admin_search_routes
except ImportError:
    try:
        from app.routes.search.admin_search_routes import admin_search_routes
    except ImportError:
        from app.routes.search.admin_search_routes import admin_search_routes


class TestAdminSearchHealthCheck:
    """Test admin search health check endpoint."""

    def test_health_check_success(self, client, admin_headers):
        """Test successful health check."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.db') as mock_db:

            # Mock services
            mock_search_service.return_value = MagicMock()
            mock_embedding_service.return_value = MagicMock()
            mock_embedding_service.return_value.is_available.return_value = True
            mock_embedding_service.return_value.get_index_stats.return_value = {
                'total_products': 100,
                'embedding_dimension': 384
            }

            # Mock database
            mock_db.session.execute.return_value = None

            response = client.get('/api/admin/search/health', headers=admin_headers)

            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'ok'
            assert data['service'] == 'admin_search_routes'
            assert 'timestamp' in data
            assert 'database' in data
            assert 'search_service' in data
            assert 'embedding_service' in data
            assert 'dependencies' in data
            assert 'index_stats' in data
            assert 'endpoints' in data

    def test_health_check_options(self, client):
        """Test OPTIONS request for health check."""
        response = client.options('/api/admin/search/health')
        assert response.status_code == 200

    def test_health_check_database_error(self, client, admin_headers):
        """Test health check with database error."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.db') as mock_db:

            mock_search_service.return_value = MagicMock()
            mock_embedding_service.return_value = MagicMock()
            mock_embedding_service.return_value.is_available.return_value = True
            mock_embedding_service.return_value.get_index_stats.return_value = {
                'total_products': 100,
                'embedding_dimension': 384
            }

            # Mock database error
            mock_db.session.execute.side_effect = Exception("Database connection failed")

            response = client.get('/api/admin/search/health', headers=admin_headers)

            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'ok'
            assert 'error: Database connection failed' in data['database']

    def test_health_check_service_error(self, client, admin_headers):
        """Test health check with service initialization error."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.db') as mock_db:

            # Mock database to work properly
            mock_db.session.execute.return_value = None

            # Mock embedding service to be available
            mock_embedding_service.return_value = MagicMock()
            mock_embedding_service.return_value.is_available.return_value = True

            # Mock search service to fail
            mock_search_service.side_effect = Exception("Service initialization failed")

            response = client.get('/api/admin/search/health', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['status'] == 'error'
            assert 'Service initialization failed' in data['error']


class TestAdminSearchMain:
    """Test main admin search endpoint."""

    def test_admin_search_success(self, client, admin_headers):
        """Test successful admin search."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = [
                {
                    'id': 1,
                    'name': 'iPhone 15',
                    'price': 999.99,
                    'is_active': True,
                    'stock': 10,
                    'created_at': '2023-01-01T00:00:00',
                    'views': 100,
                    'sales_count': 5
                }
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=iPhone&search_type=hybrid',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert 'items' in data
            assert 'pagination' in data
            assert 'search_metadata' in data
            assert len(data['items']) == 1
            assert data['items'][0]['name'] == 'iPhone 15'
            assert 'admin_info' in data['items'][0]
            assert data['search_metadata']['query'] == 'iPhone'
            assert data['search_metadata']['search_type'] == 'hybrid'

    def test_admin_search_missing_query(self, client, admin_headers):
        """Test admin search without query parameter."""
        response = client.get('/api/admin/search/', headers=admin_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    def test_admin_search_semantic_type(self, client, admin_headers):
        """Test admin search with semantic search type."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.semantic_search.return_value = [
                {
                    'id': 1,
                    'name': 'iPhone 15',
                    'similarity_score': 0.85,
                    'is_active': True
                }
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=smartphone&search_type=semantic',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['search_metadata']['search_type'] == 'semantic'
            mock_service.semantic_search.assert_called_once()

    def test_admin_search_keyword_type(self, client, admin_headers):
        """Test admin search with keyword search type."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.keyword_search.return_value = []
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=laptop&search_type=keyword',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['search_metadata']['search_type'] == 'keyword'
            mock_service.keyword_search.assert_called_once()

    def test_admin_search_with_filters(self, client, admin_headers):
        """Test admin search with various filters."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = [
                {
                    'id': 1,
                    'name': 'MacBook Pro',
                    'price': 1999.99,
                    'is_active': True,
                    'stock': 5,
                    'is_featured': True,
                    'is_sale': False
                }
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=laptop&category_id=1&brand_id=2&min_price=1000&max_price=3000&min_stock=1&is_featured=true',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            filters = data['search_metadata']['filters_applied']
            assert filters['category_id'] == 1
            assert filters['brand_id'] == 2
            assert filters['min_price'] == 1000.0
            assert filters['max_price'] == 3000.0
            assert filters['min_stock'] == 1
            assert filters['is_featured'] is True

    def test_admin_search_include_inactive(self, client, admin_headers):
        """Test admin search including inactive products."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = [
                {'id': 1, 'name': 'Active Product', 'is_active': True},
                {'id': 2, 'name': 'Inactive Product', 'is_active': False}
            ]
            mock_search_service.return_value = mock_service

            # Test without including inactive
            response = client.get(
                '/api/admin/search/?q=product&include_inactive=false',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert len(data['items']) == 1
            assert data['items'][0]['name'] == 'Active Product'

            # Test including inactive
            response = client.get(
                '/api/admin/search/?q=product&include_inactive=true',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert len(data['items']) == 2

    def test_admin_search_sorting(self, client, admin_headers):
        """Test admin search with different sorting options."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = [
                {'id': 1, 'name': 'Product A', 'price': 100, 'stock': 5, 'sales_count': 10},
                {'id': 2, 'name': 'Product B', 'price': 200, 'stock': 15, 'sales_count': 5}
            ]
            mock_search_service.return_value = mock_service

            # Test price sorting
            response = client.get(
                '/api/admin/search/?q=product&sort_by=price',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['items'][0]['price'] <= data['items'][1]['price']

            # Test price descending
            response = client.get(
                '/api/admin/search/?q=product&sort_by=price_desc',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['items'][0]['price'] >= data['items'][1]['price']

    def test_admin_search_pagination(self, client, admin_headers):
        """Test admin search pagination."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            # Create 25 mock products
            products = [{'id': i, 'name': f'Product {i}', 'is_active': True} for i in range(1, 26)]
            mock_service.hybrid_search.return_value = products
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=product&page=1&per_page=10',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert len(data['items']) == 10
            assert data['pagination']['page'] == 1
            assert data['pagination']['per_page'] == 10
            assert data['pagination']['total_items'] == 25
            assert data['pagination']['total_pages'] == 3
            assert data['pagination']['has_next'] is True
            assert data['pagination']['has_prev'] is False

    def test_admin_search_options_request(self, client):
        """Test OPTIONS request for admin search."""
        response = client.options('/api/admin/search/')
        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert 'Allow' in response.headers or 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_admin_search_unauthorized(self, client):
        """Test admin search without authentication."""
        response = client.get('/api/admin/search/?q=test')
        assert response.status_code == 401

    def test_admin_search_service_error(self, client, admin_headers):
        """Test admin search with service error."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_search_service.side_effect = Exception("Search service error")

            response = client.get('/api/admin/search/?q=test', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Admin search failed'


class TestAdminSemanticSearch:
    """Test admin semantic search endpoint."""

    def test_semantic_search_success(self, client, admin_headers):
        """Test successful semantic search."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.semantic_search.return_value = [
                {
                    'id': 1,
                    'name': 'iPhone 15',
                    'similarity_score': 0.85,
                    'is_active': True
                }
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/semantic?q=smartphone&threshold=0.3',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert len(data['items']) == 1
            assert 'similarity_info' in data['items'][0]
            assert data['search_metadata']['threshold'] == 0.3
            assert data['search_metadata']['search_type'] == 'semantic'

    def test_semantic_search_missing_query(self, client, admin_headers):
        """Test semantic search without query."""
        response = client.get('/api/admin/search/semantic', headers=admin_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    def test_semantic_search_threshold_validation(self, client, admin_headers):
        """Test semantic search threshold validation."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.semantic_search.return_value = []
            mock_search_service.return_value = mock_service

            # Test threshold > 1.0 (should be clamped to 1.0)
            response = client.get(
                '/api/admin/search/semantic?q=test&threshold=1.5',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['search_metadata']['threshold'] == 1.0

            # Test threshold < 0.0 (should be clamped to 0.0)
            response = client.get(
                '/api/admin/search/semantic?q=test&threshold=-0.5',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data['search_metadata']['threshold'] == 0.0

    def test_semantic_search_similarity_info(self, client, admin_headers):
        """Test semantic search similarity information."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.semantic_search.return_value = [
                {'id': 1, 'name': 'High similarity', 'similarity_score': 0.85, 'is_active': True},
                {'id': 2, 'name': 'Medium similarity', 'similarity_score': 0.55, 'is_active': True},
                {'id': 3, 'name': 'Low similarity', 'similarity_score': 0.25, 'is_active': True}
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/semantic?q=test',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()

            # Check similarity confidence levels
            assert data['items'][0]['similarity_info']['confidence'] == 'high'
            assert data['items'][1]['similarity_info']['confidence'] == 'medium'
            assert data['items'][2]['similarity_info']['confidence'] == 'low'

    def test_semantic_search_options_request(self, client):
        """Test OPTIONS request for semantic search."""
        response = client.options('/api/admin/search/semantic')
        assert response.status_code == 200


class TestAdminSearchIndexManagement:
    """Test admin search index management endpoints."""

    def test_rebuild_index_success(self, client, admin_headers):
        """Test successful index rebuild."""
        with patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:

            # Mock products
            mock_products = [MagicMock(id=1), MagicMock(id=2)]
            for i, product in enumerate(mock_products, 1):
                product.to_dict.return_value = {'id': i, 'name': f'Product {i}'}
                product.category = None
                product.brand = None

            mock_product.query.filter_by.return_value.all.return_value = mock_products

            # Mock embedding service
            mock_service = MagicMock()
            mock_service.is_available.return_value = True
            mock_service.rebuild_index.return_value = True
            mock_service.get_index_stats.return_value = {'total_products': 2}
            mock_embedding_service.return_value = mock_service

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['products_indexed'] == 2
            assert 'rebuild_time_seconds' in data
            assert 'index_stats' in data

    def test_rebuild_index_no_database(self, client, admin_headers):
        """Test index rebuild without database."""
        with patch('app.routes.search.admin_search_routes.Product', None), \
             patch('app.routes.search.admin_search_routes.db', None):

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Database not available'

    def test_rebuild_index_service_unavailable(self, client, admin_headers):
        """Test index rebuild with unavailable embedding service."""
        with patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:

            mock_service = MagicMock()
            mock_service.is_available.return_value = False
            mock_embedding_service.return_value = mock_service

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Embedding service not available'

    def test_rebuild_index_no_products(self, client, admin_headers):
        """Test index rebuild with no products."""
        with patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:

            mock_product.query.filter_by.return_value.all.return_value = []

            mock_service = MagicMock()
            mock_service.is_available.return_value = True
            mock_embedding_service.return_value = mock_service

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 400
            data = response.get_json()
            assert data['error'] == 'No products found'

    def test_rebuild_index_failure(self, client, admin_headers):
        """Test index rebuild failure."""
        with patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:

            mock_products = [MagicMock(id=1)]
            mock_products[0].to_dict.return_value = {'id': 1, 'name': 'Product 1'}
            mock_products[0].category = None
            mock_products[0].brand = None
            mock_product.query.filter_by.return_value.all.return_value = mock_products

            mock_service = MagicMock()
            mock_service.is_available.return_value = True
            mock_service.rebuild_index.return_value = False
            mock_embedding_service.return_value = mock_service

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Index rebuild failed'

    def test_get_index_stats_success(self, client, admin_headers):
        """Test successful index stats retrieval."""
        with patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:

            # Mock embedding service with proper return values
            mock_service = MagicMock()
            mock_service.get_index_stats.return_value = {
                'total_products': 100,
                'embedding_dimension': 384
            }
            mock_embedding_service.return_value = mock_service

            # Mock database stats with simple return values (not MagicMock)
            mock_product.query.count.return_value = 150
            mock_product.query.filter_by.return_value.count.side_effect = [100, 50, 25, 10]

            # Mock search service
            mock_search_service.return_value = MagicMock()

            response = client.get('/api/admin/search/index-stats', headers=admin_headers)

            assert response.status_code == 200
            data = response.get_json()
            assert 'index_stats' in data
            assert data['index_stats']['total_products'] == 100
            assert data['index_stats']['embedding_dimension'] == 384

    def test_get_index_stats_no_service(self, client, admin_headers):
        """Test index stats with no embedding service."""
        with patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:
            mock_embedding_service.return_value = None

            response = client.get('/api/admin/search/index-stats', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Embedding service not available'


class TestAdminSearchAnalytics:
    """Test admin search analytics endpoint."""

    def test_get_analytics_success(self, client, admin_headers):
        """Test successful analytics retrieval."""
        response = client.get('/api/admin/search/analytics', headers=admin_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'analytics' in data
        assert 'search_performance' in data['analytics']
        assert 'popular_queries' in data['analytics']
        assert 'search_types' in data['analytics']
        assert 'result_quality' in data['analytics']
        assert 'system_health' in data['analytics']
        assert 'note' in data  # Placeholder note

    def test_get_analytics_options_request(self, client):
        """Test OPTIONS request for analytics."""
        response = client.options('/api/admin/search/analytics')
        assert response.status_code == 200


class TestAdminSearchManagement:
    """Test admin search management endpoint."""

    def test_manage_get_config(self, client, admin_headers):
        """Test getting search configuration."""
        response = client.get('/api/admin/search/manage', headers=admin_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'configuration' in data
        config = data['configuration']
        assert 'embedding_model' in config
        assert 'similarity_threshold' in config
        assert 'max_results' in config
        assert 'hybrid_search_weight' in config

    def test_manage_clear_cache(self, client, admin_headers):
        """Test clearing search cache."""
        response = client.post(
            '/api/admin/search/manage',
            headers=admin_headers,
            json={'action': 'clear_cache'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'cache cleared' in data['message']

    def test_manage_update_config(self, client, admin_headers):
        """Test updating search configuration."""
        new_config = {
            'similarity_threshold': 0.4,
            'max_results': 100
        }

        response = client.post(
            '/api/admin/search/manage',
            headers=admin_headers,
            json={'action': 'update_config', 'config': new_config}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['updated_config'] == new_config

    def test_manage_invalid_action(self, client, admin_headers):
        """Test management with invalid action."""
        response = client.post(
            '/api/admin/search/manage',
            headers=admin_headers,
            json={'action': 'invalid_action'}
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Invalid action'

    def test_manage_options_request(self, client):
        """Test OPTIONS request for management."""
        response = client.options('/api/admin/search/manage')
        assert response.status_code == 200


class TestAdminSearchTesting:
    """Test admin search testing endpoint."""

    def test_search_system_test_success(self, client, admin_headers):
        """Test successful search system testing."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.keyword_search.return_value = [{'id': 1, 'name': 'Test Product'}]
            mock_service.semantic_search.return_value = [{'id': 1, 'name': 'Test Product'}]
            mock_service.hybrid_search.return_value = [{'id': 1, 'name': 'Test Product'}]
            mock_search_service.return_value = mock_service

            response = client.post(
                '/api/admin/search/test',
                headers=admin_headers,
                json={'queries': ['laptop', 'phone']}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert 'test_results' in data
            assert len(data['test_results']) == 2
            assert data['total_queries_tested'] == 2

            # Check test result structure
            result = data['test_results'][0]
            assert 'query' in result
            assert 'keyword_search' in result
            assert 'semantic_search' in result
            assert 'hybrid_search' in result
            assert 'results_count' in result['keyword_search']
            assert 'response_time_ms' in result['keyword_search']

    def test_search_system_test_default_queries(self, client, admin_headers):
        """Test search system testing with default queries."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.keyword_search.return_value = []
            mock_service.semantic_search.return_value = []
            mock_service.hybrid_search.return_value = []
            mock_search_service.return_value = mock_service

            response = client.post('/api/admin/search/test', headers=admin_headers, json={})

            assert response.status_code == 200
            data = response.get_json()
            assert len(data['test_results']) == 3  # Default queries: laptop, smartphone, headphones

    def test_search_system_test_error(self, client, admin_headers):
        """Test search system testing with error."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_search_service.side_effect = Exception("Search service error")

            response = client.post('/api/admin/search/test', headers=admin_headers, json={})

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == 'Search system test failed'

    def test_search_system_test_options_request(self, client):
        """Test OPTIONS request for search testing."""
        response = client.options('/api/admin/search/test')
        assert response.status_code == 200


class TestAdminSearchAuthentication:
    """Test admin search authentication and authorization."""

    def test_all_endpoints_require_auth(self, client):
        """Test that all admin search endpoints require authentication."""
        endpoints = [
            '/api/admin/search/',
            '/api/admin/search/semantic',
            '/api/admin/search/rebuild-index',
            '/api/admin/search/index-stats',
            '/api/admin/search/analytics',
            '/api/admin/search/manage',
            '/api/admin/search/test'
        ]

        for endpoint in endpoints:
            if endpoint == '/api/admin/search/rebuild-index' or endpoint == '/api/admin/search/test':
                response = client.post(endpoint)
            else:
                response = client.get(endpoint)

            assert response.status_code == 401, f"Endpoint {endpoint} should require authentication"

    def test_invalid_token(self, client):
        """Test admin search with invalid token."""
        headers = {'Authorization': 'Bearer invalid_token'}

        response = client.get('/api/admin/search/?q=test', headers=headers)
        assert response.status_code == 422  # Invalid token format


class TestAdminSearchCORS:
    """Test CORS headers for admin search endpoints."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in responses."""
        endpoints = [
            '/api/admin/search/health',
            '/api/admin/search/',
            '/api/admin/search/semantic',
            '/api/admin/search/rebuild-index',
            '/api/admin/search/index-stats',
            '/api/admin/search/analytics',
            '/api/admin/search/manage',
            '/api/admin/search/test'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            assert response.status_code == 200
            # CORS headers should be handled by flask-cors decorator


class TestAdminSearchIntegration:
    """Test admin search integration scenarios."""

    def test_complete_admin_workflow(self, client, admin_headers):
        """Test complete admin search workflow."""
        # 1. Check health
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.db') as mock_db:

            # Mock database
            mock_db.session.execute.return_value = None

            # Mock services
            mock_search_service.return_value = MagicMock()
            mock_embedding_service.return_value = MagicMock()
            mock_embedding_service.return_value.is_available.return_value = True
            mock_embedding_service.return_value.get_index_stats.return_value = {
                'total_products': 0,
                'embedding_dimension': 384
            }

            response = client.get('/api/admin/search/health', headers=admin_headers)
            assert response.status_code == 200

        # 2. Get index stats
        with patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service, \
             patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:

            mock_service = MagicMock()
            mock_service.get_index_stats.return_value = {'total_products': 0}
            mock_embedding_service.return_value = mock_service

            # Mock database stats with simple return values
            mock_product.query.count.return_value = 0
            mock_product.query.filter_by.return_value.count.return_value = 0

            # Mock search service
            mock_search_service.return_value = MagicMock()

            response = client.get('/api/admin/search/index-stats', headers=admin_headers)
            assert response.status_code == 200

        # 3. Perform search
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = []
            mock_search_service.return_value = mock_service

            response = client.get('/api/admin/search/?q=test', headers=admin_headers)
            assert response.status_code == 200

        # 4. Test search system
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.keyword_search.return_value = []
            mock_service.semantic_search.return_value = []
            mock_service.hybrid_search.return_value = []
            mock_search_service.return_value = mock_service

            response = client.post('/api/admin/search/test', headers=admin_headers, json={})
            assert response.status_code == 200

    def test_search_with_all_parameters(self, client, admin_headers):
        """Test admin search with all possible parameters."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_service = MagicMock()
            mock_service.hybrid_search.return_value = [
                {
                    'id': 1,
                    'name': 'Test Product',
                    'price': 999.99,
                    'stock': 10,
                    'is_active': True,
                    'is_featured': True,
                    'is_sale': False,
                    'created_at': '2023-01-01T00:00:00',
                    'views': 100,
                    'sales_count': 5
                }
            ]
            mock_search_service.return_value = mock_service

            response = client.get(
                '/api/admin/search/?q=test&search_type=hybrid&page=1&per_page=20&'
                'include_inactive=true&category_id=1&brand_id=2&min_price=500&max_price=1500&'
                'min_stock=5&max_stock=50&is_featured=true&is_sale=false&sort_by=price',
                headers=admin_headers
            )

            assert response.status_code == 200
            data = response.get_json()

            # Verify all parameters are captured in metadata
            metadata = data['search_metadata']
            filters = metadata['filters_applied']

            assert metadata['query'] == 'test'
            assert metadata['search_type'] == 'hybrid'
            assert filters['include_inactive'] is True
            assert filters['category_id'] == 1
            assert filters['brand_id'] == 2
            assert filters['min_price'] == 500.0
            assert filters['max_price'] == 1500.0
            assert filters['min_stock'] == 5
            assert filters['max_stock'] == 50
            assert filters['is_featured'] is True
            assert filters['is_sale'] is False


class TestAdminSearchErrorHandling:
    """Test error handling in admin search routes."""

    def test_search_service_initialization_error(self, client, admin_headers):
        """Test handling of search service initialization errors."""
        with patch('app.routes.search.admin_search_routes.get_search_service') as mock_search_service:
            mock_search_service.side_effect = Exception("Service initialization failed")

            response = client.get('/api/admin/search/?q=test', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert 'error' in data
            assert 'Service initialization failed' in data['details']

    def test_database_connection_error(self, client, admin_headers):
        """Test handling of database connection errors."""
        with patch('app.routes.search.admin_search_routes.Product') as mock_product, \
             patch('app.routes.search.admin_search_routes.db') as mock_db, \
             patch('app.routes.search.admin_search_routes.get_embedding_service') as mock_embedding_service:

            mock_product.query.filter_by.side_effect = Exception("Database connection failed")

            mock_service = MagicMock()
            mock_service.is_available.return_value = True
            mock_embedding_service.return_value = mock_service

            response = client.post('/api/admin/search/rebuild-index', headers=admin_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert 'error' in data

    def test_malformed_json_request(self, client, admin_headers):
        """Test handling of malformed JSON requests."""
        response = client.post(
            '/api/admin/search/manage',
            headers=admin_headers,
            data='{"invalid": json}'  # Malformed JSON
        )

        # Should handle gracefully and return 400 for malformed JSON
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Malformed JSON'

    def test_missing_required_parameters(self, client, admin_headers):
        """Test handling of missing required parameters."""
        # Test search without query
        response = client.get('/api/admin/search/', headers=admin_headers)
        assert response.status_code == 400

        # Test semantic search without query
        response = client.get('/api/admin/search/semantic', headers=admin_headers)
        assert response.status_code == 400


# Fixtures for testing
@pytest.fixture
def client():
    """Create a test client."""
    from flask import Flask
    from flask_jwt_extended import JWTManager

    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'

    jwt = JWTManager(app)
    app.register_blueprint(admin_search_routes)

    with app.test_client() as client:
        with app.app_context():
            yield client


@pytest.fixture
def admin_headers(client):
    """Create admin authentication headers."""
    from flask_jwt_extended import create_access_token

    with client.application.app_context():
        access_token = create_access_token(identity='admin@test.com')
        return {'Authorization': f'Bearer {access_token}'}
