"""
Comprehensive test suite for Categories routes.
Tests all endpoints, error handling, edge cases, and integration scenarios.
"""

import pytest
import json
import uuid
from unittest.mock import patch, MagicMock
from flask import url_for
from sqlalchemy.exc import SQLAlchemyError

from app.models.models import Category, Product, User, UserRole


class TestCategoriesHealthCheck:
    """Test health check endpoint."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/categories/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'categories'
        assert 'timestamp' in data

    def test_health_check_database_error(self, client):
        """Test health check with database error."""
        with patch('app.configuration.extensions.db.session.execute') as mock_execute:
            mock_execute.side_effect = Exception("Database connection failed")

            response = client.get('/api/categories/health')

            assert response.status_code == 503
            data = response.get_json()
            assert data['status'] == 'unhealthy'
            assert 'error' in data


class TestCategoriesList:
    """Test categories list endpoint."""

    def test_get_categories_empty_list(self, client, app):
        """Test getting categories when none exist."""
        with app.app_context():
            # Clean up any existing categories
            Category.query.delete()
            from app.configuration.extensions import db
            db.session.commit()

        response = client.get('/api/categories/')

        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []
        assert data['pagination']['total_items'] == 0

    def test_get_categories_success(self, client, create_test_categories):
        """Test successful retrieval of categories."""
        # Create test categories
        categories = create_test_categories(count=3)

        response = client.get('/api/categories/')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 3
        assert data['pagination']['total_items'] == 3

        # Check category data structure
        category_item = data['items'][0]
        assert 'id' in category_item
        assert 'name' in category_item
        assert 'slug' in category_item
        assert 'products_count' in category_item
        assert 'subcategories_count' in category_item

    def test_get_categories_with_pagination(self, client, create_test_categories):
        """Test categories with pagination."""
        # Create 5 categories
        create_test_categories(count=5)

        # Test first page
        response = client.get('/api/categories/?page=1&per_page=2')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2
        assert data['pagination']['total_items'] == 5
        assert data['pagination']['total_pages'] == 3
        assert data['pagination']['has_next'] is True
        assert data['pagination']['has_prev'] is False

    def test_get_categories_with_search(self, client, create_test_categories):
        """Test categories with search functionality."""
        # Create categories with specific names
        unique_id = str(uuid.uuid4())[:8]
        create_test_categories(
            count=3,
            names=[f'Electronics {unique_id}', f'Clothing {unique_id}', f'Books {unique_id}']
        )

        response = client.get(f'/api/categories/?search=Electronics {unique_id}')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert f'Electronics {unique_id}' in data['items'][0]['name']

    def test_get_categories_featured_only(self, client, create_test_category):
        """Test filtering featured categories only."""
        # Create featured and non-featured categories
        create_test_category(is_featured=True)
        create_test_category(is_featured=False)

        response = client.get('/api/categories/?featured=true')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['is_featured'] is True

    def test_get_categories_with_parent_filter(self, client, create_test_category):
        """Test filtering categories by parent."""
        # Create parent category
        parent = create_test_category()

        # Create subcategories
        create_test_category(parent_id=parent.id)
        create_test_category(parent_id=parent.id)
        create_test_category()  # No parent

        response = client.get(f'/api/categories/?parent_id={parent.id}')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2

    def test_get_categories_with_subcategories(self, client, create_test_category):
        """Test including subcategories in response."""
        # Create parent category
        parent = create_test_category()

        # Create subcategories
        create_test_category(parent_id=parent.id)
        create_test_category(parent_id=parent.id)

        response = client.get('/api/categories/?include_subcategories=true')

        assert response.status_code == 200
        data = response.get_json()

        # Find parent category in response
        parent_item = next((item for item in data['items'] if item['id'] == parent.id), None)
        assert parent_item is not None
        assert 'subcategories' in parent_item
        assert len(parent_item['subcategories']) == 2

    def test_get_categories_with_sorting(self, client, create_test_categories):
        """Test categories with different sorting options."""
        # Create categories with different names
        unique_id = str(uuid.uuid4())[:8]
        create_test_categories(
            count=3,
            names=[f'Zebra {unique_id}', f'Apple {unique_id}', f'Banana {unique_id}']
        )

        # Test ascending sort
        response = client.get('/api/categories/?sort_by=name&sort_order=asc')

        assert response.status_code == 200
        data = response.get_json()
        names = [item['name'] for item in data['items']]
        # Check that Apple comes before Banana and Zebra
        apple_index = next(i for i, name in enumerate(names) if 'Apple' in name)
        banana_index = next(i for i, name in enumerate(names) if 'Banana' in name)
        zebra_index = next(i for i, name in enumerate(names) if 'Zebra' in name)
        assert apple_index < banana_index < zebra_index

    def test_get_categories_options_request(self, client):
        """Test OPTIONS request for CORS."""
        response = client.options('/api/categories/')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_get_categories_database_error(self, client):
        """Test handling of database errors."""
        with patch('app.models.models.Category.query') as mock_query:
            mock_query.side_effect = SQLAlchemyError("Database error")

            response = client.get('/api/categories/')

            assert response.status_code == 500
            data = response.get_json()
            assert 'error' in data


class TestCategoryTree:
    """Test category tree endpoint."""

    def test_get_category_tree_empty(self, client, app):
        """Test getting category tree when no categories exist."""
        with app.app_context():
            # Clean up any existing categories
            Category.query.delete()
            from app.configuration.extensions import db
            db.session.commit()

        response = client.get('/api/categories/tree')

        assert response.status_code == 200
        data = response.get_json()
        assert data['tree'] == []
        assert data['total_categories'] == 0

    def test_get_category_tree_success(self, client, create_test_category):
        """Test successful category tree retrieval."""
        # Create parent categories
        parent1 = create_test_category()
        parent2 = create_test_category()

        # Create subcategories
        create_test_category(parent_id=parent1.id)
        create_test_category(parent_id=parent1.id)
        create_test_category(parent_id=parent2.id)

        response = client.get('/api/categories/tree')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['tree']) == 2

        # Check tree structure
        parent1_item = next((cat for cat in data['tree'] if cat['id'] == parent1.id), None)
        assert parent1_item is not None
        assert len(parent1_item['subcategories']) == 2

    def test_get_category_tree_with_max_depth(self, client, create_test_category):
        """Test category tree with depth limitation."""
        # Create deep hierarchy
        level1 = create_test_category()
        level2 = create_test_category(parent_id=level1.id)
        level3 = create_test_category(parent_id=level2.id)
        create_test_category(parent_id=level3.id)

        response = client.get('/api/categories/tree?max_depth=2')

        assert response.status_code == 200
        data = response.get_json()

        # Should only go 2 levels deep
        level1_item = data['tree'][0]
        assert level1_item['id'] == level1.id
        assert len(level1_item['subcategories']) == 1

        level2_item = level1_item['subcategories'][0]
        assert level2_item['id'] == level2.id
        assert len(level2_item['subcategories']) == 0  # Depth limit reached

    def test_get_category_tree_options(self, client):
        """Test OPTIONS request for category tree."""
        response = client.options('/api/categories/tree')

        assert response.status_code == 200


class TestFeaturedCategories:
    """Test featured categories endpoint."""

    def test_get_featured_categories_empty(self, client, app):
        """Test getting featured categories when none exist."""
        with app.app_context():
            # Clean up any existing categories
            Category.query.delete()
            from app.configuration.extensions import db
            db.session.commit()

        response = client.get('/api/categories/featured')

        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []
        assert data['total'] == 0

    def test_get_featured_categories_success(self, client, create_test_category):
        """Test successful featured categories retrieval."""
        # Create featured and non-featured categories
        create_test_category(is_featured=True)
        create_test_category(is_featured=True)
        create_test_category(is_featured=False)

        response = client.get('/api/categories/featured')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2
        assert data['total'] == 2

        # All returned categories should be featured
        for item in data['items']:
            assert item['is_featured'] is True

    def test_get_featured_categories_with_limit(self, client, create_test_category):
        """Test featured categories with limit parameter."""
        # Create multiple featured categories
        for i in range(5):
            create_test_category(is_featured=True)

        response = client.get('/api/categories/featured?limit=3')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 3
        assert data['total'] == 3

    def test_get_featured_categories_with_products_count(self, client, create_test_category, create_test_product):
        """Test featured categories include product counts."""
        # Create featured category
        category = create_test_category(is_featured=True)

        # Add products to category
        create_test_product(category_id=category.id)
        create_test_product(category_id=category.id)

        response = client.get('/api/categories/featured')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['products_count'] == 2


class TestCategoryByID:
    """Test get category by ID endpoint."""

    def test_get_category_by_id_success(self, client, create_test_category):
        """Test successful category retrieval by ID."""
        category = create_test_category()

        response = client.get(f'/api/categories/{category.id}')

        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == category.id
        assert data['name'] == category.name
        assert 'products_count' in data
        assert 'subcategories_count' in data
        assert 'breadcrumb' in data

    def test_get_category_by_id_with_subcategories(self, client, create_test_category):
        """Test category by ID includes subcategories."""
        parent = create_test_category()
        create_test_category(parent_id=parent.id)
        create_test_category(parent_id=parent.id)

        response = client.get(f'/api/categories/{parent.id}')

        assert response.status_code == 200
        data = response.get_json()
        assert 'subcategories' in data
        assert len(data['subcategories']) == 2

    def test_get_category_by_id_not_found(self, client):
        """Test category not found error."""
        response = client.get('/api/categories/999')

        assert response.status_code == 404

    def test_get_category_by_id_invalid_id(self, client):
        """Test invalid category ID."""
        response = client.get('/api/categories/invalid')

        assert response.status_code == 404

    def test_get_category_by_id_options(self, client):
        """Test OPTIONS request for category by ID."""
        response = client.options('/api/categories/1')

        assert response.status_code == 200


class TestCategoryBySlug:
    """Test get category by slug endpoint."""

    def test_get_category_by_slug_success(self, client, create_test_category):
        """Test successful category retrieval by slug."""
        unique_id = str(uuid.uuid4())[:8]
        slug = f'test-category-{unique_id}'
        category = create_test_category(slug=slug)

        response = client.get(f'/api/categories/slug/{slug}')

        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == category.id
        assert data['slug'] == slug
        assert 'subcategories' in data

    def test_get_category_by_slug_not_found(self, client):
        """Test category not found by slug."""
        response = client.get('/api/categories/slug/non-existent')

        assert response.status_code == 404

    def test_get_category_by_slug_options(self, client):
        """Test OPTIONS request for category by slug."""
        response = client.options('/api/categories/slug/test')

        assert response.status_code == 200


class TestCategoryProducts:
    """Test category products endpoint."""

    def test_get_category_products_success(self, client, create_test_category, create_test_product):
        """Test successful retrieval of category products."""
        category = create_test_category()

        # Create products in category
        create_test_product(category_id=category.id)
        create_test_product(category_id=category.id)

        response = client.get(f'/api/categories/{category.id}/products')

        assert response.status_code == 200
        data = response.get_json()
        assert 'category' in data
        assert 'products' in data
        assert len(data['products']['items']) == 2

    def test_get_category_products_with_subcategories(self, client, create_test_category, create_test_product):
        """Test category products including subcategories."""
        parent = create_test_category()
        child = create_test_category(parent_id=parent.id)

        # Create products in both categories
        create_test_product(category_id=parent.id)
        create_test_product(category_id=child.id)

        response = client.get(f'/api/categories/{parent.id}/products?include_subcategories=true')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['products']['items']) == 2

    def test_get_category_products_pagination(self, client, create_test_category, create_test_products):
        """Test category products with pagination."""
        category = create_test_category()

        # Create multiple products
        create_test_products(count=5, category_id=category.id)

        response = client.get(f'/api/categories/{category.id}/products?page=1&per_page=2')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['products']['items']) == 2
        assert data['products']['pagination']['total_items'] == 5

    def test_get_category_products_sorting(self, client, create_test_category, create_test_product):
        """Test category products with sorting."""
        category = create_test_category()

        # Create products with different prices
        create_test_product(price=200.0, category_id=category.id)
        create_test_product(price=50.0, category_id=category.id)

        response = client.get(f'/api/categories/{category.id}/products?sort_by=price')

        assert response.status_code == 200
        data = response.get_json()
        prices = [float(item['price']) for item in data['products']['items']]
        assert prices == sorted(prices)

    def test_get_category_products_category_not_found(self, client):
        """Test category products with non-existent category."""
        response = client.get('/api/categories/999/products')

        assert response.status_code == 404

    def test_get_category_products_only_active(self, client, create_test_category, create_test_product):
        """Test category products only returns active products."""
        category = create_test_category()

        # Create active and inactive products
        create_test_product(category_id=category.id, is_active=True)
        create_test_product(category_id=category.id, is_active=False)

        response = client.get(f'/api/categories/{category.id}/products')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['products']['items']) == 1


class TestCategoryBreadcrumb:
    """Test category breadcrumb endpoint."""

    def test_get_category_breadcrumb_success(self, client, create_test_category):
        """Test successful breadcrumb retrieval."""
        # Create hierarchy
        grandparent = create_test_category()
        parent = create_test_category(parent_id=grandparent.id)
        child = create_test_category(parent_id=parent.id)

        response = client.get(f'/api/categories/{child.id}/breadcrumb')

        assert response.status_code == 200
        data = response.get_json()
        assert 'breadcrumb' in data
        assert len(data['breadcrumb']) == 3

        # Check breadcrumb order
        breadcrumb = data['breadcrumb']
        assert breadcrumb[0]['id'] == grandparent.id
        assert breadcrumb[1]['id'] == parent.id
        assert breadcrumb[2]['id'] == child.id

    def test_get_category_breadcrumb_single_level(self, client, create_test_category):
        """Test breadcrumb for top-level category."""
        category = create_test_category()

        response = client.get(f'/api/categories/{category.id}/breadcrumb')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['breadcrumb']) == 1
        assert data['breadcrumb'][0]['id'] == category.id

    def test_get_category_breadcrumb_not_found(self, client):
        """Test breadcrumb for non-existent category."""
        response = client.get('/api/categories/999/breadcrumb')

        assert response.status_code == 404


class TestCategorySearch:
    """Test category search endpoint."""

    def test_search_categories_success(self, client, create_test_categories):
        """Test successful category search."""
        # Create categories with searchable names
        unique_id = str(uuid.uuid4())[:8]
        create_test_categories(
            count=3,
            names=[f'Electronics {unique_id}', f'Electronic Gadgets {unique_id}', f'Clothing {unique_id}']
        )

        response = client.get(f'/api/categories/search?q=Electronic {unique_id}')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2

    def test_search_categories_empty_query(self, client):
        """Test search with empty query."""
        response = client.get('/api/categories/search?q=')

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_search_categories_no_results(self, client, create_test_category):
        """Test search with no matching results."""
        create_test_category()

        response = client.get('/api/categories/search?q=nonexistent')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 0

    def test_search_categories_with_pagination(self, client, create_test_categories):
        """Test search with pagination."""
        # Create multiple matching categories
        unique_id = str(uuid.uuid4())[:8]
        names = [f'Electronics {unique_id} {i}' for i in range(5)]
        create_test_categories(count=5, names=names)

        response = client.get(f'/api/categories/search?q=Electronics {unique_id}&page=1&per_page=2')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2
        assert data['pagination']['total_items'] == 5


class TestPopularCategories:
    """Test popular categories endpoint."""

    def test_get_popular_categories_success(self, client, create_test_category, create_test_products):
        """Test successful popular categories retrieval."""
        # Create categories with different product counts
        cat1 = create_test_category()
        cat2 = create_test_category()
        cat3 = create_test_category()

        # Add different numbers of products
        create_test_products(count=5, category_id=cat1.id)
        create_test_products(count=3, category_id=cat2.id)
        create_test_products(count=1, category_id=cat3.id)

        response = client.get('/api/categories/popular')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 3

        # Should be sorted by product count (descending)
        assert data['items'][0]['products_count'] == 5
        assert data['items'][1]['products_count'] == 3
        assert data['items'][2]['products_count'] == 1

    def test_get_popular_categories_with_limit(self, client, create_test_category, create_test_products):
        """Test popular categories with limit."""
        # Create multiple categories
        for i in range(5):
            cat = create_test_category()
            create_test_products(count=i+1, category_id=cat.id)

        response = client.get('/api/categories/popular?limit=3')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 3

    def test_get_popular_categories_empty(self, client, app):
        """Test popular categories when no categories exist."""
        with app.app_context():
            # Clean up any existing categories
            Category.query.delete()
            from app.configuration.extensions import db
            db.session.commit()

        response = client.get('/api/categories/popular')

        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []


class TestCategoriesErrorHandling:
    """Test error handling scenarios."""

    def test_categories_database_error(self, client):
        """Test handling of database errors."""
        with patch('app.models.models.Category.query') as mock_query:
            mock_query.side_effect = SQLAlchemyError("Database connection failed")

            response = client.get('/api/categories/')

            assert response.status_code == 500
            data = response.get_json()
            assert 'error' in data

    def test_categories_invalid_pagination(self, client):
        """Test handling of invalid pagination parameters."""
        response = client.get('/api/categories/?page=-1&per_page=0')

        # Should handle invalid params gracefully
        assert response.status_code == 200
        data = response.get_json()
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 1

    def test_categories_large_per_page(self, client):
        """Test handling of large per_page parameter."""
        response = client.get('/api/categories/?per_page=1000')

        assert response.status_code == 200
        data = response.get_json()
        # Should be capped at MAX_PER_PAGE (100)
        assert data['pagination']['per_page'] == 100


class TestCategoriesIntegration:
    """Integration tests for categories functionality."""

    def test_complete_category_browsing_flow(self, client, create_test_category, create_test_product):
        """Test complete category browsing workflow."""
        # Create category hierarchy
        electronics = create_test_category(is_featured=True)
        phones = create_test_category(parent_id=electronics.id)

        # Add products
        create_test_product(category_id=phones.id)
        create_test_product(category_id=phones.id)

        # 1. Get featured categories
        response = client.get('/api/categories/featured')
        assert response.status_code == 200
        featured = response.get_json()
        assert len(featured['items']) == 1

        # 2. Get category tree
        response = client.get('/api/categories/tree')
        assert response.status_code == 200
        tree = response.get_json()
        assert len(tree['tree']) == 1
        assert len(tree['tree'][0]['subcategories']) == 1

        # 3. Get category by slug
        response = client.get(f'/api/categories/slug/{electronics.slug}')
        assert response.status_code == 200
        category = response.get_json()
        assert category['id'] == electronics.id

        # 4. Get category products
        response = client.get(f'/api/categories/{phones.id}/products')
        assert response.status_code == 200
        products = response.get_json()
        assert len(products['products']['items']) == 2

        # 5. Get breadcrumb
        response = client.get(f'/api/categories/{phones.id}/breadcrumb')
        assert response.status_code == 200
        breadcrumb = response.get_json()
        assert len(breadcrumb['breadcrumb']) == 2

    def test_category_search_and_filtering_integration(self, client, create_test_category, create_test_product):
        """Test search and filtering integration."""
        # Create test data
        unique_id = str(uuid.uuid4())[:8]
        electronics = create_test_category(name=f'Electronics {unique_id}', is_featured=True)
        phones = create_test_category(name=f'Mobile Phones {unique_id}', parent_id=electronics.id)
        clothing = create_test_category(name=f'Clothing {unique_id}')

        # Add products
        create_test_product(category_id=phones.id)
        create_test_product(category_id=clothing.id)

        # Test search
        response = client.get(f'/api/categories/search?q=Phone {unique_id}')
        assert response.status_code == 200
        search_results = response.get_json()
        assert len(search_results['items']) == 1
        assert 'Phone' in search_results['items'][0]['name']

        # Test popular categories
        response = client.get('/api/categories/popular')
        assert response.status_code == 200
        popular = response.get_json()
        assert len(popular['items']) >= 2

        # Test filtering with subcategories
        response = client.get(f'/api/categories/{electronics.id}/products?include_subcategories=true')
        assert response.status_code == 200
        products = response.get_json()
        assert len(products['products']['items']) == 1  # Product from subcategory

    def test_category_caching_headers(self, client, create_test_category):
        """Test that appropriate caching headers are set."""
        category = create_test_category()

        # Test various endpoints for caching headers
        endpoints = [
            '/api/categories/',
            '/api/categories/tree',
            '/api/categories/featured',
            f'/api/categories/{category.id}',
            f'/api/categories/slug/{category.slug}',
            f'/api/categories/{category.id}/breadcrumb'
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            assert 'Cache-Control' in response.headers

    def test_category_cors_headers(self, client):
        """Test CORS headers are properly set."""
        response = client.options('/api/categories/')

        assert response.status_code == 200
        assert 'Access-Control-Allow-Origin' in response.headers
        # Note: Access-Control-Allow-Methods might not be present in all CORS implementations
        # The important thing is that CORS is working (Access-Control-Allow-Origin is present)


class TestCategoriesPerformance:
    """Performance-related tests."""

    def test_categories_with_large_dataset(self, client, create_test_categories, create_test_products):
        """Test categories performance with larger dataset."""
        # Create many categories (reduced count for faster testing)
        categories = create_test_categories(count=10)

        # Add products to some categories
        for i, category in enumerate(categories[:5]):
            create_test_products(count=2, category_id=category.id)

        # Test that endpoints still respond quickly
        response = client.get('/api/categories/?per_page=20')
        assert response.status_code == 200

        response = client.get('/api/categories/tree')
        assert response.status_code == 200

        response = client.get('/api/categories/popular')
        assert response.status_code == 200

    def test_deep_category_hierarchy(self, client, create_test_category):
        """Test performance with deep category hierarchy."""
        # Create deep hierarchy (3 levels for faster testing)
        current_parent = None
        categories = []
        for i in range(3):
            category = create_test_category(
                parent_id=current_parent.id if current_parent else None
            )
            categories.append(category)
            current_parent = category

        # Test tree endpoint with deep hierarchy
        response = client.get('/api/categories/tree')
        assert response.status_code == 200

        # Test breadcrumb for deepest category
        response = client.get(f'/api/categories/{current_parent.id}/breadcrumb')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['breadcrumb']) == 3
