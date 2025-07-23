"""
Comprehensive test suite for admin category routes.
Tests all CRUD operations, authentication, authorization, validation, and edge cases.
"""

import pytest
import json
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock
from flask import url_for
from app.models.models import Category, Product, User, db


class TestAdminCategoriesAuthentication:
    """Test authentication and authorization for admin category routes."""

    def test_admin_categories_requires_authentication(self, client):
        """Test that admin category routes require authentication."""
        # Test GET /api/admin/categories
        response = client.get('/api/admin/categories')
        assert response.status_code == 401
        assert 'authorization_required' in response.get_json()['code']

        # Test POST /api/admin/categories
        response = client.post('/api/admin/categories', json={'name': 'Test'})
        assert response.status_code == 401

        # Test PUT /api/admin/categories/1
        response = client.put('/api/admin/categories/1', json={'name': 'Test'})
        assert response.status_code == 401

        # Test DELETE /api/admin/categories/1
        response = client.delete('/api/admin/categories/1')
        assert response.status_code == 401

    def test_admin_categories_requires_admin_role(self, client, user_auth_headers):
        """Test that admin category routes require admin role."""
        # Test with regular user token
        response = client.get('/api/admin/categories', headers=user_auth_headers)
        assert response.status_code == 403

        response = client.post('/api/admin/categories',
                             headers=user_auth_headers,
                             json={'name': 'Test'})
        assert response.status_code == 403

    def test_admin_categories_allows_admin_access(self, client, auth_headers):
        """Test that admin users can access admin category routes."""
        response = client.get('/api/admin/categories', headers=auth_headers)
        assert response.status_code == 200

        data = response.get_json()
        assert 'categories' in data
        assert 'pagination' in data


class TestAdminCategoryCreate:
    """Test category creation functionality."""

    def test_create_category_success(self, client, auth_headers, category_data):
        """Test successful category creation."""
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=category_data)

        assert response.status_code == 201
        data = response.get_json()

        assert data['success'] is True
        assert data['category']['name'] == category_data['name']
        assert data['category']['description'] == category_data['description']
        assert data['category']['is_active'] == category_data['is_active']
        assert data['category']['slug'] is not None
        assert 'id' in data['category']
        assert 'created_at' in data['category']

    def test_create_category_auto_slug_generation(self, client, auth_headers):
        """Test automatic slug generation."""
        category_data = {
            'name': 'Test Category With Spaces & Special!',
            'description': 'Test description'
        }

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=category_data)

        assert response.status_code == 201
        data = response.get_json()

        # Slug should be sanitized
        assert data['category']['slug'] == 'test-category-with-spaces-special'

    def test_create_category_with_parent(self, client, auth_headers, sample_category):
        """Test creating category with parent relationship."""
        category_data = {
            'name': f'Child Category {uuid.uuid4().hex[:8]}',
            'description': 'Child category description',
            'parent_id': sample_category.id
        }

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=category_data)

        assert response.status_code == 201
        data = response.get_json()

        assert data['category']['parent_id'] == sample_category.id
        assert data['category']['parent_name'] == sample_category.name

    def test_create_category_validation_errors(self, client, auth_headers):
        """Test category creation validation."""
        # Test empty name
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={'name': ''})
        assert response.status_code == 400
        assert 'validation_error' in response.get_json()['code']

        # Test duplicate name
        existing_name = f'Existing Category {uuid.uuid4().hex[:8]}'
        Category(name=existing_name, slug=existing_name.lower().replace(' ', '-')).save()

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={'name': existing_name})
        assert response.status_code == 400
        assert 'duplicate' in response.get_json()['message'].lower()

    def test_create_category_invalid_parent(self, client, auth_headers):
        """Test creating category with invalid parent ID."""
        category_data = {
            'name': f'Test Category {uuid.uuid4().hex[:8]}',
            'parent_id': 99999  # Non-existent parent
        }

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=category_data)

        assert response.status_code == 400
        assert 'parent' in response.get_json()['message'].lower()

    def test_create_category_circular_reference_prevention(self, client, auth_headers, sample_category):
        """Test prevention of circular parent references."""
        # This test would be more complex with nested categories
        # For now, test that a category can't be its own parent
        category_data = {
            'name': f'Test Category {uuid.uuid4().hex[:8]}',
            'parent_id': sample_category.id
        }

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=category_data)

        assert response.status_code == 201  # Should succeed

        # Now try to make the parent a child of the child (circular reference)
        child_id = response.get_json()['category']['id']

        update_response = client.put(f'/api/admin/categories/{sample_category.id}',
                                   headers=auth_headers,
                                   json={'parent_id': child_id})

        assert update_response.status_code == 400
        assert 'circular' in update_response.get_json()['message'].lower()


class TestAdminCategoryRead:
    """Test category reading/listing functionality."""

    def test_get_admin_categories_success(self, client, auth_headers, sample_categories):
        """Test successful category listing."""
        response = client.get('/api/admin/categories', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'categories' in data
        assert 'pagination' in data
        assert len(data['categories']) >= len(sample_categories)

        # Check category structure
        category = data['categories'][0]
        required_fields = ['id', 'name', 'slug', 'description', 'is_active',
                          'is_featured', 'sort_order', 'created_at', 'updated_at']
        for field in required_fields:
            assert field in category

    def test_get_admin_categories_with_pagination(self, client, auth_headers, performance_categories):
        """Test category listing with pagination."""
        response = client.get('/api/admin/categories?page=1&per_page=10',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert len(data['categories']) <= 10
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 10
        assert data['pagination']['total'] >= 100
        assert data['pagination']['pages'] >= 10

    def test_get_admin_categories_with_search(self, client, auth_headers, sample_categories):
        """Test category listing with search."""
        search_term = sample_categories[0].name.split()[0]  # First word of category name

        response = client.get(f'/api/admin/categories?search={search_term}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        # Should find at least one category
        assert len(data['categories']) >= 1

        # All returned categories should match search term
        for category in data['categories']:
            assert search_term.lower() in category['name'].lower()

    def test_get_admin_categories_with_filters(self, client, auth_headers, sample_categories):
        """Test category listing with various filters."""
        # Test active filter
        response = client.get('/api/admin/categories?is_active=true',
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        for category in data['categories']:
            assert category['is_active'] is True

        # Test featured filter
        response = client.get('/api/admin/categories?is_featured=true',
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        for category in data['categories']:
            assert category['is_featured'] is True

        # Test parent filter
        parent_id = sample_categories[0].id
        response = client.get(f'/api/admin/categories?parent_id={parent_id}',
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        for category in data['categories']:
            assert category['parent_id'] == parent_id

    def test_get_admin_categories_with_sorting(self, client, auth_headers, sample_categories):
        """Test category listing with sorting."""
        # Test sort by name ascending
        response = client.get('/api/admin/categories?sort=name&order=asc',
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        names = [cat['name'] for cat in data['categories']]
        assert names == sorted(names)

        # Test sort by created_at descending
        response = client.get('/api/admin/categories?sort=created_at&order=desc',
                            headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        dates = [cat['created_at'] for cat in data['categories']]
        assert dates == sorted(dates, reverse=True)

    def test_get_single_admin_category_success(self, client, auth_headers, sample_category):
        """Test getting single category by ID."""
        response = client.get(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['category']['id'] == sample_category.id
        assert data['category']['name'] == sample_category.name
        assert data['category']['slug'] == sample_category.slug

    def test_get_single_admin_category_not_found(self, client, auth_headers):
        """Test getting non-existent category."""
        response = client.get('/api/admin/categories/99999', headers=auth_headers)

        assert response.status_code == 404
        assert 'not_found' in response.get_json()['code']

    def test_get_single_admin_category_with_subcategories(self, client, auth_headers, sample_categories):
        """Test getting category with subcategories."""
        parent_category = sample_categories[0]  # First is parent

        response = client.get(f'/api/admin/categories/{parent_category.id}?include_subcategories=true',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'subcategories' in data['category']
        assert len(data['category']['subcategories']) >= 3  # We created 3 children


class TestAdminCategoryUpdate:
    """Test category update functionality."""

    def test_update_category_success(self, client, auth_headers, sample_category):
        """Test successful category update."""
        update_data = {
            'name': f'Updated Category {uuid.uuid4().hex[:8]}',
            'description': 'Updated description',
            'is_featured': True
        }

        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json=update_data)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['category']['name'] == update_data['name']
        assert data['category']['description'] == update_data['description']
        assert data['category']['is_featured'] == update_data['is_featured']
        assert 'updated_at' in data['category']

    def test_update_category_partial(self, client, auth_headers, sample_category):
        """Test partial category update."""
        original_name = sample_category.name
        update_data = {'is_featured': True}

        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json=update_data)

        assert response.status_code == 200
        data = response.get_json()

        # Only is_featured should change
        assert data['category']['name'] == original_name
        assert data['category']['is_featured'] is True

    def test_update_category_not_found(self, client, auth_headers):
        """Test updating non-existent category."""
        response = client.put('/api/admin/categories/99999',
                            headers=auth_headers,
                            json={'name': 'Updated'})

        assert response.status_code == 404
        assert 'not_found' in response.get_json()['code']

    def test_update_category_validation_errors(self, client, auth_headers, sample_category):
        """Test category update validation."""
        # Test empty name
        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json={'name': ''})
        assert response.status_code == 400

        # Test invalid sort order
        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json={'sort_order': -1})
        assert response.status_code == 400

    def test_update_category_parent_change(self, client, auth_headers, sample_categories):
        """Test changing category parent."""
        child_category = sample_categories[1]  # One of the children
        new_parent = sample_categories[2]  # Another child to become parent

        response = client.put(f'/api/admin/categories/{child_category.id}',
                            headers=auth_headers,
                            json={'parent_id': new_parent.id})

        assert response.status_code == 200
        data = response.get_json()

        assert data['category']['parent_id'] == new_parent.id

    def test_update_category_slug_regeneration(self, client, auth_headers, sample_category):
        """Test slug regeneration when name changes."""
        new_name = f'New Category Name {uuid.uuid4().hex[:8]}'

        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json={'name': new_name})

        assert response.status_code == 200
        data = response.get_json()

        expected_slug = new_name.lower().replace(' ', '-')
        assert data['category']['slug'] == expected_slug


class TestAdminCategoryDelete:
    """Test category deletion functionality."""

    def test_delete_category_success(self, client, auth_headers, sample_category):
        """Test successful category deletion."""
        category_id = sample_category.id

        response = client.delete(f'/api/admin/categories/{category_id}',
                               headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'deleted' in data['message'].lower()

        # Verify category is deleted
        verify_response = client.get(f'/api/admin/categories/{category_id}',
                                   headers=auth_headers)
        assert verify_response.status_code == 404

    def test_delete_category_not_found(self, client, auth_headers):
        """Test deleting non-existent category."""
        response = client.delete('/api/admin/categories/99999', headers=auth_headers)

        assert response.status_code == 404
        assert 'not_found' in response.get_json()['code']

    def test_delete_category_with_products_prevention(self, client, auth_headers, category_with_products):
        """Test prevention of deleting category with products."""
        category, products = category_with_products

        response = client.delete(f'/api/admin/categories/{category.id}',
                               headers=auth_headers)

        assert response.status_code == 400
        assert 'products' in response.get_json()['message'].lower()

    def test_delete_category_with_products_force(self, client, auth_headers, category_with_products):
        """Test force deletion of category with products."""
        category, products = category_with_products

        response = client.delete(f'/api/admin/categories/{category.id}?force=true',
                               headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'force' in data['message'].lower()

    def test_delete_category_with_subcategories_prevention(self, client, auth_headers, sample_categories):
        """Test prevention of deleting category with subcategories."""
        parent_category = sample_categories[0]  # Has children

        response = client.delete(f'/api/admin/categories/{parent_category.id}',
                               headers=auth_headers)

        assert response.status_code == 400
        assert 'subcategories' in response.get_json()['message'].lower()

    def test_delete_category_cascade_subcategories(self, client, auth_headers, sample_categories):
        """Test cascade deletion of subcategories."""
        parent_category = sample_categories[0]

        response = client.delete(f'/api/admin/categories/{parent_category.id}?cascade=true',
                               headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'cascade' in data['message'].lower()


class TestAdminCategorySpecialOperations:
    """Test special category operations."""

    def test_toggle_category_featured(self, client, auth_headers, sample_category):
        """Test toggling category featured status."""
        original_featured = sample_category.is_featured

        response = client.post(f'/api/admin/categories/{sample_category.id}/toggle-featured',
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['category']['is_featured'] != original_featured

    def test_toggle_category_featured_not_found(self, client, auth_headers):
        """Test toggling featured status for non-existent category."""
        response = client.post('/api/admin/categories/99999/toggle-featured',
                             headers=auth_headers)

        assert response.status_code == 404

    def test_get_admin_category_tree(self, client, auth_headers, sample_categories):
        """Test getting category tree structure."""
        response = client.get('/api/admin/categories/tree', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'tree' in data
        assert isinstance(data['tree'], list)

        # Check tree structure
        for node in data['tree']:
            assert 'id' in node
            assert 'name' in node
            assert 'children' in node

    def test_get_admin_category_tree_with_depth_limit(self, client, auth_headers, sample_categories):
        """Test category tree with depth limit."""
        response = client.get('/api/admin/categories/tree?max_depth=2',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'tree' in data
        # Verify depth limit is respected
        def check_depth(nodes, current_depth=0, max_depth=2):
            for node in nodes:
                if current_depth < max_depth:
                    assert 'children' in node
                    if node['children']:
                        check_depth(node['children'], current_depth + 1, max_depth)
                else:
                    # At max depth, children should be empty or not included
                    assert not node.get('children', [])

        check_depth(data['tree'])

    def test_reorder_categories(self, client, auth_headers, sample_categories):
        """Test reordering categories."""
        category_ids = [cat.id for cat in sample_categories[:3]]
        reorder_data = {
            'category_orders': [
                {'id': category_ids[0], 'sort_order': 3},
                {'id': category_ids[1], 'sort_order': 1},
                {'id': category_ids[2], 'sort_order': 2}
            ]
        }

        response = client.post('/api/admin/categories/reorder',
                             headers=auth_headers,
                             json=reorder_data)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert 'reordered' in data['message'].lower()

    def test_duplicate_category(self, client, auth_headers, sample_category):
        """Test duplicating a category."""
        response = client.post(f'/api/admin/categories/{sample_category.id}/duplicate',
                             headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()

        assert data['success'] is True
        assert data['category']['name'].startswith(f"Copy of {sample_category.name}")
        assert data['category']['id'] != sample_category.id
        assert data['category']['slug'] != sample_category.slug


class TestAdminCategoryBulkOperations:
    """Test bulk operations on categories."""

    def test_bulk_create_categories(self, client, auth_headers, bulk_category_data):
        """Test bulk category creation."""
        response = client.post('/api/admin/categories/bulk',
                             headers=auth_headers,
                             json={'categories': bulk_category_data})

        assert response.status_code == 201
        data = response.get_json()

        assert data['success'] is True
        assert len(data['created_categories']) == len(bulk_category_data)
        assert data['created_count'] == len(bulk_category_data)
        assert data['failed_count'] == 0

    def test_bulk_update_categories(self, client, auth_headers, sample_categories):
        """Test bulk category updates."""
        category_ids = [cat.id for cat in sample_categories[:2]]
        update_data = {
            'category_ids': category_ids,
            'updates': {
                'is_featured': True,
                'is_active': True
            }
        }

        response = client.put('/api/admin/categories/bulk',
                            headers=auth_headers,
                            json=update_data)

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['updated_count'] == len(category_ids)

        # Verify updates
        for category_id in category_ids:
            verify_response = client.get(f'/api/admin/categories/{category_id}',
                                       headers=auth_headers)
            category_data = verify_response.get_json()['category']
            assert category_data['is_featured'] is True
            assert category_data['is_active'] is True

    def test_bulk_delete_categories(self, client, auth_headers, sample_categories):
        """Test bulk category deletion."""
        # Use only child categories (no subcategories)
        category_ids = [cat.id for cat in sample_categories[1:3]]  # Skip parent

        response = client.delete('/api/admin/categories/bulk',
                               headers=auth_headers,
                               json={'category_ids': category_ids})

        assert response.status_code == 200
        data = response.get_json()

        assert data['success'] is True
        assert data['deleted_count'] == len(category_ids)

        # Verify deletions
        for category_id in category_ids:
            verify_response = client.get(f'/api/admin/categories/{category_id}',
                                       headers=auth_headers)
            assert verify_response.status_code == 404

    def test_bulk_operations_partial_success(self, client, auth_headers, sample_categories):
        """Test bulk operations with partial success."""
        # Mix valid and invalid category IDs
        valid_ids = [sample_categories[1].id, sample_categories[2].id]
        invalid_ids = [99999, 99998]
        all_ids = valid_ids + invalid_ids

        update_data = {
            'category_ids': all_ids,
            'updates': {'is_featured': True}
        }

        response = client.put('/api/admin/categories/bulk',
                            headers=auth_headers,
                            json=update_data)

        assert response.status_code == 207  # Multi-status
        data = response.get_json()

        assert data['updated_count'] == len(valid_ids)
        assert data['failed_count'] == len(invalid_ids)
        assert len(data['errors']) == len(invalid_ids)


class TestAdminCategoryValidation:
    """Test category validation and error handling."""

    def test_category_name_validation(self, client, auth_headers):
        """Test category name validation rules."""
        # Test empty name
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={'name': ''})
        assert response.status_code == 400

        # Test name too long
        long_name = 'x' * 256
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={'name': long_name})
        assert response.status_code == 400

        # Test name with only whitespace
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={'name': '   '})
        assert response.status_code == 400

    def test_category_description_validation(self, client, auth_headers):
        """Test category description validation."""
        # Test description too long
        long_description = 'x' * 1001
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={
                                 'name': f'Test Category {uuid.uuid4().hex[:8]}',
                                 'description': long_description
                             })
        assert response.status_code == 400

    def test_category_sort_order_validation(self, client, auth_headers):
        """Test sort order validation."""
        # Test negative sort order
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={
                                 'name': f'Test Category {uuid.uuid4().hex[:8]}',
                                 'sort_order': -1
                             })
        assert response.status_code == 400

        # Test non-integer sort order
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={
                                 'name': f'Test Category {uuid.uuid4().hex[:8]}',
                                 'sort_order': 'invalid'
                             })
        assert response.status_code == 400

    def test_category_slug_uniqueness(self, client, auth_headers, sample_category):
        """Test slug uniqueness validation."""
        # Try to create category with same slug
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={
                                 'name': sample_category.name,  # Same name = same slug
                                 'description': 'Different description'
                             })
        assert response.status_code == 400
        assert 'duplicate' in response.get_json()['message'].lower()

    def test_category_parent_validation(self, client, auth_headers, sample_category):
        """Test parent category validation."""
        # Test self as parent
        response = client.put(f'/api/admin/categories/{sample_category.id}',
                            headers=auth_headers,
                            json={'parent_id': sample_category.id})
        assert response.status_code == 400
        assert 'itself' in response.get_json()['message'].lower()

        # Test non-existent parent
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json={
                                 'name': f'Test Category {uuid.uuid4().hex[:8]}',
                                 'parent_id': 99999
                             })
        assert response.status_code == 400


class TestAdminCategorySearch:
    """Test advanced search functionality."""

    def test_advanced_search_with_filters(self, client, auth_headers, sample_categories):
        """Test advanced search with multiple filters."""
        search_params = {
            'search': 'Category',
            'is_active': 'true',
            'is_featured': 'true',
            'sort': 'name',
            'order': 'asc'
        }

        query_string = '&'.join([f'{k}={v}' for k, v in search_params.items()])
        response = client.get(f'/api/admin/categories/search?{query_string}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'categories' in data
        assert 'search_meta' in data

        # Verify search results match criteria
        for category in data['categories']:
            assert 'category' in category['name'].lower()
            assert category['is_active'] is True
            assert category['is_featured'] is True

    def test_search_with_date_range(self, client, auth_headers, sample_categories):
        """Test search with date range filters."""
        from datetime import datetime, timedelta

        # Search for categories created in the last day
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()

        response = client.get(f'/api/admin/categories/search?created_after={yesterday}&created_before={tomorrow}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        # Should find our test categories
        assert len(data['categories']) >= len(sample_categories)

    def test_search_autocomplete(self, client, auth_headers, sample_categories):
        """Test search autocomplete functionality."""
        # Use first few characters of a category name
        search_term = sample_categories[0].name[:3]

        response = client.get(f'/api/admin/categories/autocomplete?q={search_term}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'suggestions' in data
        assert len(data['suggestions']) <= 10  # Default limit

        # All suggestions should contain the search term
        for suggestion in data['suggestions']:
            assert search_term.lower() in suggestion['name'].lower()


class TestAdminCategoryExportImport:
    """Test category export and import functionality."""

    def test_export_categories_csv(self, client, auth_headers, sample_categories):
        """Test exporting categories to CSV."""
        response = client.get('/api/admin/categories/export?format=csv',
                            headers=auth_headers)

        assert response.status_code == 200
        assert response.content_type == 'text/csv; charset=utf-8'

        # Check CSV headers
        csv_content = response.data.decode('utf-8')
        assert 'name,slug,description,is_active,is_featured' in csv_content

    def test_export_categories_json(self, client, auth_headers, sample_categories):
        """Test exporting categories to JSON."""
        response = client.get('/api/admin/categories/export?format=json',
                            headers=auth_headers)

        assert response.status_code == 200
        assert response.content_type == 'application/json'

        data = response.get_json()
        assert 'categories' in data
        assert 'export_meta' in data
        assert len(data['categories']) >= len(sample_categories)

    def test_export_categories_with_filters(self, client, auth_headers, sample_categories):
        """Test exporting categories with filters."""
        response = client.get('/api/admin/categories/export?format=json&is_featured=true',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        # All exported categories should be featured
        for category in data['categories']:
            assert category['is_featured'] is True

    def test_import_categories_csv(self, client, auth_headers, mock_file_upload):
        """Test importing categories from CSV."""
        # Create CSV content
        csv_content = """name,description,is_active,is_featured
Import Category 1,Description 1,true,false
Import Category 2,Description 2,true,true
Import Category 3,Description 3,false,false"""

        from io import BytesIO
        from werkzeug.datastructures import FileStorage

        csv_file = FileStorage(
            stream=BytesIO(csv_content.encode('utf-8')),
            filename='categories.csv',
            content_type='text/csv'
        )

        response = client.post('/api/admin/categories/import',
                             headers={'Authorization': auth_headers['Authorization']},
                             data={'file': csv_file})

        assert response.status_code == 201
        data = response.get_json()

        assert data['success'] is True
        assert data['imported_count'] == 3
        assert data['failed_count'] == 0

    def test_import_categories_validation_errors(self, client, auth_headers):
        """Test import with validation errors."""
        # CSV with invalid data
        csv_content = """name,description,is_active,is_featured
,Description 1,true,false
Valid Category,Description 2,invalid_boolean,true"""

        from io import BytesIO
        from werkzeug.datastructures import FileStorage

        csv_file = FileStorage(
            stream=BytesIO(csv_content.encode('utf-8')),
            filename='invalid_categories.csv',
            content_type='text/csv'
        )

        response = client.post('/api/admin/categories/import',
                             headers={'Authorization': auth_headers['Authorization']},
                             data={'file': csv_file})

        assert response.status_code == 207  # Multi-status
        data = response.get_json()

        assert data['imported_count'] == 0  # No valid rows
        assert data['failed_count'] == 2
        assert len(data['errors']) == 2


class TestAdminCategoryErrorHandling:
    """Test error handling and edge cases."""

    def test_database_error_handling(self, client, auth_headers):
        """Test handling of database errors."""
        with patch('app.models.models.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            response = client.post('/api/admin/categories',
                                 headers=auth_headers,
                                 json={'name': f'Test Category {uuid.uuid4().hex[:8]}'})

            assert response.status_code == 500
            assert 'database_error' in response.get_json()['code']

    def test_concurrent_modification_handling(self, client, auth_headers, sample_category):
        """Test handling of concurrent modifications."""
        # Simulate concurrent modification by updating the category externally
        with patch('app.models.models.Category.query') as mock_query:
            mock_category = MagicMock()
            mock_category.id = sample_category.id
            mock_category.updated_at = datetime.now()  # Different from original
            mock_query.get.return_value = mock_category

            response = client.put(f'/api/admin/categories/{sample_category.id}',
                                headers=auth_headers,
                                json={'name': 'Updated Name'})

            # Should handle gracefully
            assert response.status_code in [200, 409]  # Success or conflict

    def test_invalid_json_handling(self, client, auth_headers):
        """Test handling of invalid JSON data."""
        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             data='invalid json')

        assert response.status_code == 400
        assert 'invalid_json' in response.get_json()['code']

    def test_missing_content_type_handling(self, client, auth_headers):
        """Test handling of missing content type."""
        headers = auth_headers.copy()
        del headers['Content-Type']

        response = client.post('/api/admin/categories',
                             headers=headers,
                             json={'name': 'Test'})

        # Should still work with JSON data
        assert response.status_code in [201, 400]

    def test_large_payload_handling(self, client, auth_headers):
        """Test handling of large payloads."""
        # Create a very large description
        large_data = {
            'name': f'Test Category {uuid.uuid4().hex[:8]}',
            'description': 'x' * 10000  # Very large description
        }

        response = client.post('/api/admin/categories',
                             headers=auth_headers,
                             json=large_data)

        assert response.status_code == 400
        assert 'validation_error' in response.get_json()['code']


class TestAdminCategoryIntegration:
    """Test integration scenarios and workflows."""

    def test_complete_category_management_workflow(self, client, auth_headers):
        """Test complete category management workflow."""
        unique_id = uuid.uuid4().hex[:8]

        # 1. Create parent category
        parent_data = {
            'name': f'Parent Category {unique_id}',
            'description': 'Parent category for workflow test',
            'is_featured': True
        }

        create_response = client.post('/api/admin/categories',
                                    headers=auth_headers,
                                    json=parent_data)
        assert create_response.status_code == 201
        parent_id = create_response.get_json()['category']['id']

        # 2. Create child category
        child_data = {
            'name': f'Child Category {unique_id}',
            'description': 'Child category for workflow test',
            'parent_id': parent_id
        }

        child_response = client.post('/api/admin/categories',
                                   headers=auth_headers,
                                   json=child_data)
        assert child_response.status_code == 201
        child_id = child_response.get_json()['category']['id']

        # 3. Update child category
        update_response = client.put(f'/api/admin/categories/{child_id}',
                                   headers=auth_headers,
                                   json={'is_featured': True})
        assert update_response.status_code == 200

        # 4. Get category tree
        tree_response = client.get('/api/admin/categories/tree',
                                 headers=auth_headers)
        assert tree_response.status_code == 200

        # 5. Search categories
        search_response = client.get(f'/api/admin/categories/search?search={unique_id}',
                                   headers=auth_headers)
        assert search_response.status_code == 200
        assert len(search_response.get_json()['categories']) >= 2

        # 6. Toggle featured status
        toggle_response = client.post(f'/api/admin/categories/{parent_id}/toggle-featured',
                                    headers=auth_headers)
        assert toggle_response.status_code == 200

        # 7. Export categories
        export_response = client.get('/api/admin/categories/export?format=json',
                                   headers=auth_headers)
        assert export_response.status_code == 200

        # 8. Delete child first, then parent
        delete_child_response = client.delete(f'/api/admin/categories/{child_id}',
                                            headers=auth_headers)
        assert delete_child_response.status_code == 200

        delete_parent_response = client.delete(f'/api/admin/categories/{parent_id}',
                                             headers=auth_headers)
        assert delete_parent_response.status_code == 200

    def test_category_hierarchy_management(self, client, auth_headers):
        """Test complex category hierarchy management."""
        unique_id = uuid.uuid4().hex[:8]
        created_categories = []

        # Create 3-level hierarchy
        # Level 1: Root
        root_data = {'name': f'Root Category {unique_id}'}
        root_response = client.post('/api/admin/categories',
                                  headers=auth_headers,
                                  json=root_data)
        assert root_response.status_code == 201
        root_id = root_response.get_json()['category']['id']
        created_categories.append(root_id)

        # Level 2: Children
        child_ids = []
        for i in range(2):
            child_data = {
                'name': f'Child {i+1} Category {unique_id}',
                'parent_id': root_id
            }
            child_response = client.post('/api/admin/categories',
                                       headers=auth_headers,
                                       json=child_data)
            assert child_response.status_code == 201
            child_id = child_response.get_json()['category']['id']
            child_ids.append(child_id)
            created_categories.append(child_id)

        # Level 3: Grandchildren
        for child_id in child_ids:
            grandchild_data = {
                'name': f'Grandchild of {child_id} {unique_id}',
                'parent_id': child_id
            }
            grandchild_response = client.post('/api/admin/categories',
                                            headers=auth_headers,
                                            json=grandchild_data)
            assert grandchild_response.status_code == 201
            created_categories.append(grandchild_response.get_json()['category']['id'])

        # Test tree structure
        tree_response = client.get('/api/admin/categories/tree',
                                 headers=auth_headers)
        assert tree_response.status_code == 200

        # Cleanup
        for category_id in reversed(created_categories):
            client.delete(f'/api/admin/categories/{category_id}',
                        headers=auth_headers)

    def test_category_product_relationship_handling(self, client, auth_headers, category_with_products):
        """Test category-product relationship handling."""
        category, products = category_with_products

        # Test getting category with product count
        response = client.get(f'/api/admin/categories/{category.id}?include_product_count=true',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert 'product_count' in data['category']
        assert data['category']['product_count'] == len(products)

        # Test category deletion prevention
        delete_response = client.delete(f'/api/admin/categories/{category.id}',
                                      headers=auth_headers)
        assert delete_response.status_code == 400
        assert 'products' in delete_response.get_json()['message'].lower()


class TestAdminCategoryPerformance:
    """Test performance-related scenarios."""

    def test_large_category_list_performance(self, client, auth_headers, performance_categories):
        """Test performance with large category lists."""
        import time

        start_time = time.time()
        response = client.get('/api/admin/categories?per_page=50',
                            headers=auth_headers)
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds

        data = response.get_json()
        assert len(data['categories']) <= 50

    def test_deep_category_hierarchy_performance(self, client, auth_headers):
        """Test performance with deep category hierarchies."""
        unique_id = uuid.uuid4().hex[:8]
        created_categories = []

        # Create deep hierarchy (10 levels)
        parent_id = None
        for level in range(10):
            category_data = {
                'name': f'Level {level+1} Category {unique_id}',
                'parent_id': parent_id
            }

            response = client.post('/api/admin/categories',
                                 headers=auth_headers,
                                 json=category_data)
            assert response.status_code == 201

            category_id = response.get_json()['category']['id']
            created_categories.append(category_id)
            parent_id = category_id

        # Test tree generation performance
        import time
        start_time = time.time()
        tree_response = client.get('/api/admin/categories/tree',
                                 headers=auth_headers)
        end_time = time.time()

        assert tree_response.status_code == 200
        assert (end_time - start_time) < 3.0  # Should complete within 3 seconds

        # Cleanup
        for category_id in reversed(created_categories):
            client.delete(f'/api/admin/categories/{category_id}',
                        headers=auth_headers)

    def test_bulk_operations_performance(self, client, auth_headers):
        """Test performance of bulk operations."""
        unique_id = uuid.uuid4().hex[:8]

        # Create 50 categories for bulk testing
        bulk_data = []
        for i in range(50):
            bulk_data.append({
                'name': f'Bulk Category {i+1} {unique_id}',
                'description': f'Bulk category {i+1} description'
            })

        import time
        start_time = time.time()
        response = client.post('/api/admin/categories/bulk',
                             headers=auth_headers,
                             json={'categories': bulk_data})
        end_time = time.time()

        assert response.status_code == 201
        assert (end_time - start_time) < 5.0  # Should complete within 5 seconds

        data = response.get_json()
        assert data['created_count'] == 50

        # Cleanup - bulk delete
        category_ids = [cat['id'] for cat in data['created_categories']]
        delete_response = client.delete('/api/admin/categories/bulk',
                                      headers=auth_headers,
                                      json={'category_ids': category_ids})
        assert delete_response.status_code == 200


class TestAdminCategoryHealthCheck:
    """Test health check and system status."""

    def test_admin_categories_health_check(self, client, auth_headers):
        """Test admin categories health check endpoint."""
        response = client.get('/api/admin/categories/health', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        assert data['status'] == 'ok'
        assert 'service' in data
        assert 'timestamp' in data
        assert 'database' in data
        assert 'endpoints' in data

    def test_admin_categories_health_check_database_error(self, client, auth_headers):
        """Test health check with database error."""
        with patch('app.models.models.db.session.execute') as mock_execute:
            mock_execute.side_effect = Exception("Database connection failed")

            response = client.get('/api/admin/categories/health', headers=auth_headers)

            assert response.status_code == 500
            data = response.get_json()

            assert data['status'] == 'error'
            assert 'database' in data['error'].lower()
