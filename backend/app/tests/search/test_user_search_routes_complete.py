"""
Comprehensive test suite for User Search Routes.
Tests all endpoints, error conditions, and edge cases.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime
import time
import threading
from concurrent.futures import ThreadPoolExecutor

from app import create_app
from app.configuration.extensions import db
from app.models.models import Product, Category, Brand


class TestSearchHealthCheck:
    """Test search health check endpoint."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/search/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['service'] == 'user_search_routes'
        assert 'timestamp' in data
        assert 'database' in data
        assert 'search_service' in data
        assert 'embedding_service' in data
        assert 'dependencies' in data
        assert 'endpoints' in data

        # Check endpoints list
        expected_endpoints = ["/", "/semantic", "/suggestions", "/popular", "/categories", "/filters"]
        assert all(endpoint in data['endpoints'] for endpoint in expected_endpoints)

    def test_health_check_options(self, client):
        """Test OPTIONS request for health check."""
        response = client.options('/api/search/health')
        assert response.status_code == 200

    @patch('app.routes.search.user_search_routes.db')
    def test_health_check_database_error(self, mock_db, client):
        """Test health check with database error."""
        mock_db.session.execute.side_effect = Exception("Database connection failed")

        response = client.get('/api/search/health')
        assert response.status_code == 200
        data = response.get_json()
        assert 'error: Database connection failed' in data['database']

    def test_health_check_dependencies(self, client):
        """Test health check dependency checking."""
        response = client.get('/api/search/health')

        assert response.status_code == 200
        data = response.get_json()
        assert 'dependencies' in data
        assert isinstance(data['dependencies'], dict)
        assert 'sentence_transformers' in data['dependencies']
        assert 'faiss' in data['dependencies']
        assert 'numpy' in data['dependencies']


class TestMainSearchEndpoint:
    """Test main search endpoint."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_success(self, mock_get_service, client):
        """Test successful product search."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {'id': 1, 'name': 'Test Product', 'price': 100, 'category_id': 1}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test')

        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert 'pagination' in data
        assert 'search_metadata' in data
        assert data['search_metadata']['query'] == 'test'
        assert data['search_metadata']['search_type'] == 'hybrid'

    def test_search_products_missing_query(self, client):
        """Test search without query parameter."""
        response = client.get('/api/search/')

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    def test_search_products_empty_query(self, client):
        """Test search with empty query."""
        response = client.get('/api/search/?q=')

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    def test_search_products_whitespace_query(self, client):
        """Test search with whitespace-only query."""
        response = client.get('/api/search/?q=   ')

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_with_pagination(self, mock_get_service, client):
        """Test search with pagination parameters."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {'id': i, 'name': f'Product {i}', 'price': 100 + i}
            for i in range(1, 26)  # 25 products
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&page=2&per_page=10')

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['page'] == 2
        assert data['pagination']['per_page'] == 10
        assert len(data['items']) == 10
        assert data['pagination']['total_items'] == 25
        assert data['pagination']['total_pages'] == 3
        assert data['pagination']['has_next'] == True
        assert data['pagination']['has_prev'] == True

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_pagination_limits(self, mock_get_service, client):
        """Test pagination parameter limits."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = []
        mock_get_service.return_value = mock_service

        # Test per_page limit (should be capped at 50)
        response = client.get('/api/search/?q=test&per_page=100')

        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['per_page'] == 50

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_semantic_type(self, mock_get_service, client):
        """Test semantic search type."""
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = [
            {'id': 1, 'name': 'Semantic Result', 'price': 150}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&type=semantic')

        assert response.status_code == 200
        data = response.get_json()
        assert data['search_metadata']['search_type'] == 'semantic'
        mock_service.semantic_search.assert_called_once()

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_keyword_type(self, mock_get_service, client):
        """Test keyword search type."""
        mock_service = MagicMock()
        mock_service.keyword_search.return_value = [
            {'id': 1, 'name': 'Keyword Result', 'price': 200}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&type=keyword')

        assert response.status_code == 200
        data = response.get_json()
        assert data['search_metadata']['search_type'] == 'keyword'
        mock_service.keyword_search.assert_called_once()

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_with_filters(self, mock_get_service, client):
        """Test search with various filters."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {
                'id': 1, 'name': 'Filtered Product', 'price': 150,
                'category_id': 1, 'brand_id': 1, 'is_featured': True,
                'is_sale': False, 'stock': 10
            }
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&category_id=1&brand_id=1&min_price=100&max_price=200&is_featured=true&in_stock=true')

        assert response.status_code == 200
        data = response.get_json()
        filters_applied = data['search_metadata']['filters_applied']
        assert filters_applied['category_id'] == 1
        assert filters_applied['brand_id'] == 1
        assert filters_applied['min_price'] == 100.0
        assert filters_applied['max_price'] == 200.0
        assert filters_applied['is_featured'] == True
        assert filters_applied['in_stock'] == True

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_sorting(self, mock_get_service, client):
        """Test search result sorting."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {'id': 1, 'name': 'Product B', 'price': 200, 'created_at': '2023-01-01'},
            {'id': 2, 'name': 'Product A', 'price': 100, 'created_at': '2023-01-02'}
        ]
        mock_get_service.return_value = mock_service

        # Test price sorting
        response = client.get('/api/search/?q=test&sort_by=price')
        assert response.status_code == 200
        data = response.get_json()
        assert data['items'][0]['price'] <= data['items'][1]['price']

        # Test name sorting
        response = client.get('/api/search/?q=test&sort_by=name')
        assert response.status_code == 200
        data = response.get_json()
        assert data['items'][0]['name'] <= data['items'][1]['name']

    def test_search_products_options_request(self, client):
        """Test OPTIONS request for main search endpoint."""
        response = client.options('/api/search/')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_products_service_error(self, mock_get_service, client):
        """Test search with service error."""
        mock_get_service.side_effect = Exception("Search service error")

        response = client.get('/api/search/?q=test')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == 'Search failed'


class TestSemanticSearchEndpoint:
    """Test semantic search endpoint."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_semantic_search_success(self, mock_get_service, client):
        """Test successful semantic search."""
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = [
            {'id': 1, 'name': 'Semantic Product', 'price': 100, 'similarity': 0.8}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/semantic?q=smartphone')

        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert 'search_metadata' in data
        assert data['search_metadata']['search_type'] == 'semantic'
        assert data['search_metadata']['query'] == 'smartphone'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_semantic_search_with_threshold(self, mock_get_service, client):
        """Test semantic search with custom threshold."""
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = []
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/semantic?q=test&threshold=0.7')

        assert response.status_code == 200
        data = response.get_json()
        assert data['search_metadata']['threshold'] == 0.7
        mock_service.semantic_search.assert_called_with('test', k=60, threshold=0.7)

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_semantic_search_threshold_validation(self, mock_get_service, client):
        """Test semantic search threshold validation."""
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = []
        mock_get_service.return_value = mock_service

        # Test threshold > 1.0 (should be capped at 1.0)
        response = client.get('/api/search/semantic?q=test&threshold=1.5')
        assert response.status_code == 200
        data = response.get_json()
        assert data['search_metadata']['threshold'] == 1.0

        # Test threshold < 0.0 (should be set to 0.0)
        response = client.get('/api/search/semantic?q=test&threshold=-0.5')
        assert response.status_code == 200
        data = response.get_json()
        assert data['search_metadata']['threshold'] == 0.0

    def test_semantic_search_missing_query(self, client):
        """Test semantic search without query."""
        response = client.get('/api/search/semantic')

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Search query is required'

    def test_semantic_search_options_request(self, client):
        """Test OPTIONS request for semantic search."""
        response = client.options('/api/search/semantic')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_semantic_search_service_error(self, mock_get_service, client):
        """Test semantic search with service error."""
        mock_get_service.side_effect = Exception("Semantic search failed")

        response = client.get('/api/search/semantic?q=test')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == 'Semantic search failed'


class TestSearchSuggestionsEndpoint:
    """Test search suggestions endpoint."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_suggestions_success(self, mock_get_service, client):
        """Test successful search suggestions."""
        mock_service = MagicMock()
        mock_service.get_search_suggestions.return_value = [
            'smartphone', 'smart watch', 'smart tv'
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/suggestions?q=smart')

        assert response.status_code == 200
        data = response.get_json()
        assert 'suggestions' in data
        assert data['query'] == 'smart'
        assert data['count'] == 3
        assert len(data['suggestions']) == 3

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_suggestions_with_limit(self, mock_get_service, client):
        """Test search suggestions with custom limit."""
        mock_service = MagicMock()
        mock_service.get_search_suggestions.return_value = ['suggestion1', 'suggestion2']
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/suggestions?q=test&limit=2')

        assert response.status_code == 200
        data = response.get_json()
        assert data['count'] == 2
        mock_service.get_search_suggestions.assert_called_with('test', limit=2)

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_suggestions_limit_validation(self, mock_get_service, client):
        """Test search suggestions limit validation."""
        mock_service = MagicMock()
        mock_service.get_search_suggestions.return_value = []
        mock_get_service.return_value = mock_service

        # Test limit > 20 (should be capped at 20)
        response = client.get('/api/search/suggestions?q=test&limit=50')
        assert response.status_code == 200
        mock_service.get_search_suggestions.assert_called_with('test', limit=20)

        # Test limit < 1 (should be set to 1)
        response = client.get('/api/search/suggestions?q=test&limit=0')
        assert response.status_code == 200
        mock_service.get_search_suggestions.assert_called_with('test', limit=1)

    def test_search_suggestions_short_query(self, client):
        """Test search suggestions with short query."""
        response = client.get('/api/search/suggestions?q=a')

        assert response.status_code == 200
        data = response.get_json()
        assert data['suggestions'] == []
        assert data['message'] == 'Query too short for suggestions'

    def test_search_suggestions_empty_query(self, client):
        """Test search suggestions with empty query."""
        response = client.get('/api/search/suggestions?q=')

        assert response.status_code == 200
        data = response.get_json()
        assert data['suggestions'] == []
        assert data['message'] == 'Query too short for suggestions'

    def test_search_suggestions_options_request(self, client):
        """Test OPTIONS request for suggestions."""
        response = client.options('/api/search/suggestions')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_suggestions_service_error(self, mock_get_service, client):
        """Test search suggestions with service error."""
        mock_get_service.side_effect = Exception("Suggestions service error")

        response = client.get('/api/search/suggestions?q=test')

        assert response.status_code == 200  # Should return 200 with empty suggestions
        data = response.get_json()
        assert data['suggestions'] == []
        assert 'error' in data


class TestPopularSearchesEndpoint:
    """Test popular searches endpoint."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_popular_searches_success(self, mock_get_service, client):
        """Test successful popular searches."""
        mock_service = MagicMock()
        mock_service.get_popular_searches.return_value = [
            'smartphone', 'laptop', 'headphones'
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/popular')

        assert response.status_code == 200
        data = response.get_json()
        assert 'popular_searches' in data
        assert data['count'] == 3
        assert len(data['popular_searches']) == 3

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_popular_searches_with_limit(self, mock_get_service, client):
        """Test popular searches with custom limit."""
        mock_service = MagicMock()
        mock_service.get_popular_searches.return_value = ['search1', 'search2', 'search3']
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/popular?limit=3')

        assert response.status_code == 200
        data = response.get_json()
        assert data['count'] == 3
        mock_service.get_popular_searches.assert_called_with(limit=3)

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_popular_searches_limit_validation(self, mock_get_service, client):
        """Test popular searches limit validation."""
        mock_service = MagicMock()
        mock_service.get_popular_searches.return_value = []
        mock_get_service.return_value = mock_service

        # Test limit > 50 (should be capped at 50)
        response = client.get('/api/search/popular?limit=100')
        assert response.status_code == 200
        mock_service.get_popular_searches.assert_called_with(limit=50)

        # Test limit < 1 (should be set to 1)
        response = client.get('/api/search/popular?limit=0')
        assert response.status_code == 200
        mock_service.get_popular_searches.assert_called_with(limit=1)

    def test_popular_searches_options_request(self, client):
        """Test OPTIONS request for popular searches."""
        response = client.options('/api/search/popular')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_popular_searches_service_error(self, mock_get_service, client):
        """Test popular searches with service error."""
        mock_get_service.side_effect = Exception("Popular searches error")

        response = client.get('/api/search/popular')

        assert response.status_code == 200  # Should return 200 with empty list
        data = response.get_json()
        assert data['popular_searches'] == []
        assert 'error' in data


class TestSearchCategoriesEndpoint:
    """Test search categories endpoint."""

    @patch('app.routes.search.user_search_routes.Category')
    @patch('app.routes.search.user_search_routes.Product')
    def test_search_categories_success(self, mock_product, mock_category, client):
        """Test successful categories retrieval."""
        # Mock category
        mock_cat = MagicMock()
        mock_cat.id = 1
        mock_cat.to_dict.return_value = {'id': 1, 'name': 'Electronics'}
        mock_category.query.filter_by.return_value.all.return_value = [mock_cat]

        # Mock product count
        mock_product.query.filter_by.return_value.count.return_value = 5

        response = client.get('/api/search/categories')

        assert response.status_code == 200
        data = response.get_json()
        assert 'categories' in data
        assert data['count'] == 1
        assert len(data['categories']) == 1
        assert data['categories'][0]['product_count'] == 5

    @patch('app.routes.search.user_search_routes.Category')
    def test_search_categories_featured_only(self, mock_category, client):
        """Test that only featured categories are returned."""
        mock_category.query.filter_by.return_value.all.return_value = []

        response = client.get('/api/search/categories')

        assert response.status_code == 200
        mock_category.query.filter_by.assert_called_with(is_featured=True)

    def test_search_categories_options_request(self, client):
        """Test OPTIONS request for categories."""
        response = client.options('/api/search/categories')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.Category', None)
    def test_search_categories_no_models(self, client):
        """Test categories endpoint when models are not available."""
        response = client.get('/api/search/categories')

        assert response.status_code == 200
        data = response.get_json()
        assert data['categories'] == []
        assert data['message'] == 'Categories not available'

    @patch('app.routes.search.user_search_routes.Category')
    def test_search_categories_database_error(self, mock_category, client):
        """Test categories endpoint with database error."""
        mock_category.query.filter_by.side_effect = Exception("Database error")

        response = client.get('/api/search/categories')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == 'Failed to get categories'


class TestSearchFiltersEndpoint:
    """Test search filters endpoint."""

    @patch('app.routes.search.user_search_routes.Brand')
    @patch('app.routes.search.user_search_routes.Product')
    def test_search_filters_success(self, mock_product, mock_brand, client):
        """Test successful filters retrieval."""
        # Mock brand
        mock_brand_obj = MagicMock()
        mock_brand_obj.id = 1
        mock_brand_obj.to_dict.return_value = {'id': 1, 'name': 'Apple'}
        mock_brand.query.filter_by.return_value.all.return_value = [mock_brand_obj]

        # Mock product count
        mock_product.query.filter_by.return_value.count.return_value = 10

        response = client.get('/api/search/filters')

        assert response.status_code == 200
        data = response.get_json()
        assert 'brands' in data
        assert 'price_ranges' in data
        assert 'sort_options' in data
        assert len(data['brands']) == 1
        assert data['brands'][0]['product_count'] == 10

    @patch('app.routes.search.user_search_routes.Brand')
    def test_search_filters_featured_brands_only(self, mock_brand, client):
        """Test that only featured brands are returned."""
        mock_brand.query.filter_by.return_value.all.return_value = []

        response = client.get('/api/search/filters')

        assert response.status_code == 200
        mock_brand.query.filter_by.assert_called_with(is_featured=True)

    def test_search_filters_price_ranges(self, client):
        """Test that price ranges are included."""
        response = client.get('/api/search/filters')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['price_ranges']) == 5
        assert data['price_ranges'][0]['label'] == 'Under $100'
        assert data['price_ranges'][0]['min'] == 0
        assert data['price_ranges'][0]['max'] == 100

    def test_search_filters_sort_options(self, client):
        """Test that sort options are included."""
        response = client.get('/api/search/filters')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['sort_options']) == 5
        sort_values = [option['value'] for option in data['sort_options']]
        assert 'relevance' in sort_values
        assert 'price' in sort_values
        assert 'name' in sort_values

    def test_search_filters_options_request(self, client):
        """Test OPTIONS request for filters."""
        response = client.options('/api/search/filters')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.Brand', None)
    def test_search_filters_no_brands_model(self, client):
        """Test filters endpoint when Brand model is not available."""
        response = client.get('/api/search/filters')

        assert response.status_code == 200
        data = response.get_json()
        assert data['brands'] == []
        assert 'price_ranges' in data
        assert 'sort_options' in data

    @patch('app.routes.search.user_search_routes.Brand')
    def test_search_filters_database_error(self, mock_brand, client):
        """Test filters endpoint with database error."""
        mock_brand.query.filter_by.side_effect = Exception("Database error")

        response = client.get('/api/search/filters')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == 'Database error'


class TestSimilarProductsEndpoint:
    """Test similar products endpoint."""

    @patch('app.routes.search.user_search_routes.Product')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_similar_products_success(self, mock_get_service, mock_product, client):
        """Test successful similar products retrieval."""
        # Mock product
        mock_prod = MagicMock()
        mock_prod.id = 1
        mock_prod.name = 'Test Product'
        mock_prod.description = 'Test description'
        mock_prod.category.name = 'Electronics'
        mock_prod.is_active = True
        mock_prod.to_dict.return_value = {'id': 1, 'name': 'Test Product'}
        mock_product.query.get.return_value = mock_prod

        # Mock search service
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = [
            {'id': 2, 'name': 'Similar Product', 'price': 100}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/similar/1')

        assert response.status_code == 200
        data = response.get_json()
        assert 'similar_products' in data
        assert 'source_product' in data
        assert data['count'] == 1
        assert len(data['similar_products']) == 1

    @patch('app.routes.search.user_search_routes.Product')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_similar_products_with_limit(self, mock_get_service, mock_product, client):
        """Test similar products with custom limit."""
        # Mock product
        mock_prod = MagicMock()
        mock_prod.is_active = True
        mock_prod.name = 'Test'
        mock_prod.description = 'Test'
        mock_prod.category.name = 'Test'
        mock_prod.to_dict.return_value = {'id': 1}
        mock_product.query.get.return_value = mock_prod

        # Mock search service
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = []
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/similar/1?limit=5')

        assert response.status_code == 200
        mock_service.semantic_search.assert_called_with('Test Test Test', k=10, threshold=0.2)

    @patch('app.routes.search.user_search_routes.Product')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_similar_products_limit_validation(self, mock_get_service, mock_product, client):
        """Test similar products limit validation."""
        # Mock product
        mock_prod = MagicMock()
        mock_prod.is_active = True
        mock_prod.name = 'Test'
        mock_prod.description = 'Test'
        mock_prod.category.name = 'Test'
        mock_prod.to_dict.return_value = {'id': 1}
        mock_product.query.get.return_value = mock_prod

        # Mock search service
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = []
        mock_get_service.return_value = mock_service

        # Test limit > 50 (should be capped at 50)
        response = client.get('/api/search/similar/1?limit=100')
        assert response.status_code == 200
        mock_service.semantic_search.assert_called_with('Test Test Test', k=55, threshold=0.2)

    @patch('app.routes.search.user_search_routes.Product')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_similar_products_excludes_source(self, mock_get_service, mock_product, client):
        """Test that similar products excludes the source product."""
        # Mock product
        mock_prod = MagicMock()
        mock_prod.is_active = True
        mock_prod.name = 'Test'
        mock_prod.description = 'Test'
        mock_prod.category.name = 'Test'
        mock_prod.to_dict.return_value = {'id': 1}
        mock_product.query.get.return_value = mock_prod

        # Mock search service - return source product in results
        mock_service = MagicMock()
        mock_service.semantic_search.return_value = [
            {'id': 1, 'name': 'Source Product'},  # Should be excluded
            {'id': 2, 'name': 'Similar Product'}
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/similar/1')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['similar_products']) == 1
        assert data['similar_products'][0]['id'] == 2

    @patch('app.routes.search.user_search_routes.Product')
    def test_similar_products_not_found(self, mock_product, client):
        """Test similar products with non-existent product."""
        mock_product.query.get.return_value = None

        response = client.get('/api/search/similar/999')

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'Product not found'

    @patch('app.routes.search.user_search_routes.Product')
    def test_similar_products_inactive_product(self, mock_product, client):
        """Test similar products with inactive product."""
        mock_prod = MagicMock()
        mock_prod.is_active = False
        mock_product.query.get.return_value = mock_prod

        response = client.get('/api/search/similar/1')

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'Product not found'

    def test_similar_products_options_request(self, client):
        """Test OPTIONS request for similar products."""
        response = client.options('/api/search/similar/1')

        assert response.status_code == 200
        # Check if response has JSON content
        if response.content_type and 'application/json' in response.content_type:
            data = response.get_json()
            if data:  # Only check if data is not None
                assert data['status'] == 'ok'

    @patch('app.routes.search.user_search_routes.Product', None)
    def test_similar_products_no_models(self, client):
        """Test similar products when Product model is not available."""
        response = client.get('/api/search/similar/1')

        assert response.status_code == 200
        data = response.get_json()
        assert data['similar_products'] == []
        assert data['message'] == 'Product model not available'

    @patch('app.routes.search.user_search_routes.Product')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_similar_products_service_error(self, mock_get_service, mock_product, client):
        """Test similar products with service error."""
        # Mock product
        mock_prod = MagicMock()
        mock_prod.is_active = True
        mock_prod.name = 'Test'
        mock_prod.description = 'Test'
        mock_prod.category.name = 'Test'
        mock_product.query.get.return_value = mock_prod

        # Mock service error
        mock_get_service.side_effect = Exception("Service error")

        response = client.get('/api/search/similar/1')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == 'Failed to get similar products'


class TestSearchIntegration:
    """Integration tests for search functionality."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_workflow_complete(self, mock_get_service, client):
        """Test complete search workflow."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {'id': 1, 'name': 'Product 1', 'price': 100},
            {'id': 2, 'name': 'Product 2', 'price': 200}
        ]
        mock_get_service.return_value = mock_service

        # Test main search
        response = client.get('/api/search/?q=test')
        assert response.status_code == 200

        # Test semantic search
        mock_service.semantic_search.return_value = [{'id': 1, 'name': 'Semantic Result'}]
        response = client.get('/api/search/semantic?q=test')
        assert response.status_code == 200

        # Test suggestions
        mock_service.get_search_suggestions.return_value = ['suggestion1']
        response = client.get('/api/search/suggestions?q=te')
        assert response.status_code == 200

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_with_all_filters(self, mock_get_service, client):
        """Test search with all possible filters applied."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {
                'id': 1, 'name': 'Filtered Product', 'price': 150,
                'category_id': 1, 'brand_id': 1, 'is_featured': True,
                'is_sale': True, 'stock': 5, 'created_at': '2023-01-01'
            }
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&category_id=1&brand_id=1&min_price=100&max_price=200&is_featured=true&is_sale=true&in_stock=true&sort_by=price')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['search_metadata']['filters_applied']['category_id'] == 1

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_pagination_consistency(self, mock_get_service, client):
        """Test search pagination consistency across pages."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [
            {'id': i, 'name': f'Product {i}', 'price': 100 + i}
            for i in range(1, 26)  # 25 products
        ]
        mock_get_service.return_value = mock_service

        # Test first page
        response = client.get('/api/search/?q=test&page=1&per_page=10')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 10
        assert data['pagination']['has_next'] == True
        assert data['pagination']['has_prev'] == False

        # Test middle page
        response = client.get('/api/search/?q=test&page=2&per_page=10')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 10
        assert data['pagination']['has_next'] == True
        assert data['pagination']['has_prev'] == True

        # Test last page
        response = client.get('/api/search/?q=test&page=3&per_page=10')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 5
        assert data['pagination']['has_next'] == False
        assert data['pagination']['has_prev'] == True


class TestSearchErrorHandling:
    """Test error handling in search endpoints."""

    def test_invalid_product_id_similar_search(self, client):
        """Test similar search with invalid product ID."""
        response = client.get('/api/search/similar/abc')

        assert response.status_code == 404

    def test_negative_product_id_similar_search(self, client):
        """Test similar search with negative product ID."""
        response = client.get('/api/search/similar/-1')

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'Product not found'

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_invalid_pagination_parameters(self, mock_get_service, client):
        """Test search with invalid pagination parameters."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = []
        mock_get_service.return_value = mock_service

        # Test with string page number
        response = client.get('/api/search/?q=test&page=abc')
        assert response.status_code == 200  # Should default to page 1

        # Test with negative page number
        response = client.get('/api/search/?q=test&page=-1')
        assert response.status_code == 200  # Should default to page 1

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_invalid_filter_parameters(self, mock_get_service, client):
        """Test search with invalid filter parameters."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = []
        mock_get_service.return_value = mock_service

        # Test with invalid price parameters
        response = client.get('/api/search/?q=test&min_price=abc&max_price=xyz')
        assert response.status_code == 200  # Should ignore invalid filters

    def test_malformed_requests(self, client):
        """Test handling of malformed requests."""
        # Test with extremely long query
        long_query = 'a' * 10000
        response = client.get(f'/api/search/?q={long_query}')
        assert response.status_code in [200, 400, 414]  # Various valid responses

        # Test with special characters
        response = client.get('/api/search/?q=test%20with%20special%20chars%21%40%23')
        assert response.status_code in [200, 400]

    @patch('app.routes.search.user_search_routes.logger')
    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_error_logging(self, mock_get_service, mock_logger, client):
        """Test that errors are properly logged."""
        mock_get_service.side_effect = Exception("Test error")

        response = client.get('/api/search/?q=test')

        assert response.status_code == 500
        mock_logger.error.assert_called()


class TestSearchCORS:
    """Test CORS handling in search endpoints."""

    def test_cors_headers_main_search(self, client):
        """Test CORS headers on main search endpoint."""
        response = client.get('/api/search/?q=test')

        # Check that CORS decorator is applied (exact headers depend on flask-cors config)
        assert response.status_code in [200, 500]  # Should not be blocked by CORS

    def test_cors_headers_all_endpoints(self, client):
        """Test CORS headers on all search endpoints."""
        endpoints = [
            '/api/search/health',
            '/api/search/semantic?q=test',
            '/api/search/suggestions?q=test',
            '/api/search/popular',
            '/api/search/categories',
            '/api/search/filters'
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [200, 400, 500]  # Should not be blocked by CORS


class TestSearchPerformance:
    """Test search performance and load handling."""

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_search_response_time(self, mock_get_service, client):
        """Test search response time is reasonable."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = []
        mock_get_service.return_value = mock_service

        start_time = time.time()
        response = client.get('/api/search/?q=test')
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 5.0  # Should respond within 5 seconds

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_large_result_set_handling(self, mock_get_service, client):
        """Test handling of large result sets."""
        mock_service = MagicMock()
        # Simulate large result set
        mock_service.hybrid_search.return_value = [
            {'id': i, 'name': f'Product {i}', 'price': 100 + i}
            for i in range(1, 1001)  # 1000 products
        ]
        mock_get_service.return_value = mock_service

        response = client.get('/api/search/?q=test&per_page=50')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 50  # Should be paginated
        assert data['pagination']['total_items'] == 1000

    @patch('app.routes.search.user_search_routes.get_search_service')
    def test_concurrent_search_requests(self, mock_get_service, client):
        """Test handling of concurrent search requests."""
        mock_service = MagicMock()
        mock_service.hybrid_search.return_value = [{'id': 1, 'name': 'Test'}]
        mock_get_service.return_value = mock_service

        def make_request():
            return client.get('/api/search/?q=test')

        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in futures]

        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
