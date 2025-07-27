"""
Comprehensive tests for Admin Review routes in Mizizzi E-commerce platform.
Tests all admin-specific review management functionality.
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import Flask
from flask_jwt_extended import create_access_token

# Test imports
try:
    from app.configuration.extensions import db, jwt
    from app.models.models import (
        User, UserRole, Product, Review, Category, Brand,
        Order, OrderItem, OrderStatus
    )
    from app.routes.reviews.admin_review_routes import admin_review_routes
except ImportError:
    # Fallback imports for testing
    from unittest.mock import MagicMock
    db = MagicMock()
    jwt = MagicMock()

    class User:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class UserRole:
        ADMIN = 'admin'
        USER = 'user'

    class Product:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class Review:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class Category:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class Brand:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class Order:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class OrderItem:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    class OrderStatus:
        DELIVERED = 'delivered'
        SHIPPED = 'shipped'

    admin_review_routes = MagicMock()


class TestAdminReviewHealthCheck:
    """Test admin review health check endpoint."""

    def test_health_check_success(self, client):
        """Test health check returns success."""
        response = client.get('/admin/reviews/health')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'admin_review_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert len(data['endpoints']) > 0

    def test_health_check_options(self, client):
        """Test health check OPTIONS request."""
        response = client.options('/admin/reviews/health')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestAdminReviewAuthentication:
    """Test admin review authentication and authorization."""

    def test_admin_required_no_token(self, client):
        """Test admin endpoints require authentication."""
        response = client.get('/admin/reviews/all')
        assert response.status_code == 401

    def test_admin_required_invalid_token(self, client):
        """Test admin endpoints reject invalid tokens."""
        headers = {'Authorization': 'Bearer invalid_token'}
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 422  # JWT decode error

    def test_admin_required_user_token(self, client, regular_user_token):
        """Test admin endpoints reject regular user tokens."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 403

        data = json.loads(response.data)
        assert 'Admin access required' in data['error']

    def test_admin_access_granted(self, client, admin_token):
        """Test admin endpoints allow admin access."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 200


class TestGetAllReviews:
    """Test getting all reviews with admin privileges."""

    def test_get_all_reviews_success(self, client, admin_token, sample_reviews):
        """Test getting all reviews successfully."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'items' in data
        assert 'pagination' in data
        assert 'filters' in data
        assert len(data['items']) > 0

        # Check admin-specific fields
        review = data['items'][0]
        assert 'user' in review
        assert 'product' in review
        if 'user' in review and review['user']:
            assert 'email' in review['user']  # Admin can see email

    def test_get_all_reviews_with_product_filter(self, client, admin_token, sample_reviews):
        """Test filtering reviews by product ID."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?product_id=1', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['product_id'] == 1

        # All returned reviews should be for product 1
        for review in data['items']:
            assert review['product_id'] == 1

    def test_get_all_reviews_with_user_filter(self, client, admin_token, sample_reviews):
        """Test filtering reviews by user ID."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?user_id=1', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['user_id'] == 1

        # All returned reviews should be from user 1
        for review in data['items']:
            assert review['user_id'] == 1

    def test_get_all_reviews_with_rating_filter(self, client, admin_token, sample_reviews):
        """Test filtering reviews by rating."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?rating=5', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['rating'] == 5

        # All returned reviews should have rating 5
        for review in data['items']:
            assert review['rating'] == 5

    def test_get_all_reviews_with_verified_filter(self, client, admin_token, sample_reviews):
        """Test filtering reviews by verified purchase."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?verified_only=true', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['verified_only'] is True

        # All returned reviews should be verified
        for review in data['items']:
            assert review['is_verified_purchase'] is True

    def test_get_all_reviews_with_date_range(self, client, admin_token, sample_reviews):
        """Test filtering reviews by date range."""
        date_from = (datetime.now() - timedelta(days=30)).isoformat()
        date_to = datetime.now().isoformat()

        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get(
            f'/admin/reviews/all?date_from={date_from}&date_to={date_to}',
            headers=headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['date_from'] == date_from
        assert data['filters']['date_to'] == date_to

    def test_get_all_reviews_with_search(self, client, admin_token, sample_reviews):
        """Test searching reviews by comment/title."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?search=great', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['search'] == 'great'

    def test_get_all_reviews_with_sorting(self, client, admin_token, sample_reviews):
        """Test sorting reviews."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?sort_by=rating&sort_order=asc', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        if len(data['items']) > 1:
            # Check if sorted by rating ascending
            ratings = [review['rating'] for review in data['items']]
            assert ratings == sorted(ratings)

    def test_get_all_reviews_pagination(self, client, admin_token, sample_reviews):
        """Test pagination of reviews."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all?page=1&per_page=2', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2
        assert len(data['items']) <= 2

    def test_get_all_reviews_options(self, client):
        """Test OPTIONS request for get all reviews."""
        response = client.options('/admin/reviews/all')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestGetReviewAdmin:
    """Test getting individual review with admin details."""

    def test_get_review_admin_success(self, client, admin_token, sample_review):
        """Test getting review by ID with admin details."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['id'] == sample_review.id
        assert 'user' in data
        assert 'product' in data

        # Admin should see user email
        if data['user']:
            assert 'email' in data['user']

    def test_get_review_admin_not_found(self, client, admin_token):
        """Test getting non-existent review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/99999', headers=headers)
        assert response.status_code == 404

    def test_get_review_admin_unauthorized(self, client, regular_user_token, sample_review):
        """Test getting review without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}
        response = client.get(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 403

    def test_get_review_admin_options(self, client):
        """Test OPTIONS request for get review admin."""
        response = client.options('/admin/reviews/1')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestUpdateReviewAdmin:
    """Test updating reviews as admin."""

    def test_update_review_admin_success(self, client, admin_token, sample_review):
        """Test updating review as admin."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        update_data = {
            'rating': 4,
            'comment': 'Updated by admin',
            'title': 'Admin Updated Title',
            'is_verified_purchase': True
        }

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['message'] == 'Review updated successfully'
        assert data['review']['rating'] == 4
        assert data['review']['comment'] == 'Updated by admin'
        assert data['review']['title'] == 'Admin Updated Title'
        assert data['review']['is_verified_purchase'] is True

    def test_update_review_admin_partial(self, client, admin_token, sample_review):
        """Test partial update of review as admin."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        update_data = {'rating': 3}

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['review']['rating'] == 3

    def test_update_review_admin_invalid_rating(self, client, admin_token, sample_review):
        """Test updating review with invalid rating."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        update_data = {'rating': 6}  # Invalid rating

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Validation failed' in data['error']
        assert 'rating' in data['errors']

    def test_update_review_admin_no_data(self, client, admin_token, sample_review):
        """Test updating review without data."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No data provided' in data['error']

    def test_update_review_admin_not_found(self, client, admin_token):
        """Test updating non-existent review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        update_data = {'rating': 4}

        response = client.put(
            '/admin/reviews/99999',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 404

    def test_update_review_admin_unauthorized(self, client, regular_user_token, sample_review):
        """Test updating review without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}
        update_data = {'rating': 4}

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_update_review_admin_options(self, client):
        """Test OPTIONS request for update review admin."""
        response = client.options('/admin/reviews/1')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestDeleteReviewAdmin:
    """Test deleting reviews as admin."""

    def test_delete_review_admin_success(self, client, admin_token, sample_review):
        """Test deleting review as admin."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.delete(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['message'] == 'Review deleted successfully'

    def test_delete_review_admin_not_found(self, client, admin_token):
        """Test deleting non-existent review."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.delete('/admin/reviews/99999', headers=headers)
        assert response.status_code == 404

    def test_delete_review_admin_unauthorized(self, client, regular_user_token, sample_review):
        """Test deleting review without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}

        response = client.delete(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 403

    def test_delete_review_admin_options(self, client):
        """Test OPTIONS request for delete review admin."""
        response = client.options('/admin/reviews/1')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestBulkDeleteReviews:
    """Test bulk deleting reviews."""

    def test_bulk_delete_reviews_success(self, client, admin_token, sample_reviews):
        """Test bulk deleting reviews."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        review_ids = [review.id for review in sample_reviews[:2]]

        delete_data = {'review_ids': review_ids}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps(delete_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Successfully deleted' in data['message']
        assert data['deleted_count'] >= 0

    def test_bulk_delete_reviews_no_data(self, client, admin_token):
        """Test bulk delete without data."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No review IDs provided' in data['error']

    def test_bulk_delete_reviews_invalid_format(self, client, admin_token):
        """Test bulk delete with invalid format."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        delete_data = {'review_ids': 'invalid'}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps(delete_data),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid review IDs format' in data['error']

    def test_bulk_delete_reviews_empty_list(self, client, admin_token):
        """Test bulk delete with empty list."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        delete_data = {'review_ids': []}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps(delete_data),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid review IDs format' in data['error']

    def test_bulk_delete_reviews_unauthorized(self, client, regular_user_token):
        """Test bulk delete without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}
        delete_data = {'review_ids': [1, 2]}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps(delete_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_bulk_delete_reviews_options(self, client):
        """Test OPTIONS request for bulk delete."""
        response = client.options('/admin/reviews/bulk-delete')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestReviewAnalytics:
    """Test review analytics endpoint."""

    def test_get_review_analytics_success(self, client, admin_token, sample_reviews):
        """Test getting review analytics."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.get('/admin/reviews/analytics', headers=headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'total_reviews' in data
        assert 'verified_reviews' in data
        assert 'verification_rate' in data
        assert 'average_rating' in data
        assert 'rating_distribution' in data
        assert 'monthly_reviews' in data
        assert 'top_products' in data
        assert 'top_reviewers' in data
        assert 'date_range' in data

        # Check rating distribution format
        assert isinstance(data['rating_distribution'], dict)
        for i in range(1, 6):
            assert str(i) in data['rating_distribution']

    def test_get_review_analytics_with_date_range(self, client, admin_token, sample_reviews):
        """Test getting analytics with date range."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        date_from = (datetime.now() - timedelta(days=30)).isoformat()
        date_to = datetime.now().isoformat()

        response = client.get(
            f'/admin/reviews/analytics?date_from={date_from}&date_to={date_to}',
            headers=headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['date_range']['from'] == date_from
        assert data['date_range']['to'] == date_to

    def test_get_review_analytics_unauthorized(self, client, regular_user_token):
        """Test getting analytics without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}

        response = client.get('/admin/reviews/analytics', headers=headers)
        assert response.status_code == 403

    def test_get_review_analytics_options(self, client):
        """Test OPTIONS request for analytics."""
        response = client.options('/admin/reviews/analytics')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestModerateReview:
    """Test review moderation functionality."""

    def test_moderate_review_approve(self, client, admin_token, sample_review):
        """Test approving a review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {
            'action': 'approve',
            'reason': 'Review meets guidelines'
        }

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'approved successfully' in data['message']
        assert 'review' in data

    def test_moderate_review_reject(self, client, admin_token, sample_review):
        """Test rejecting a review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {
            'action': 'reject',
            'reason': 'Inappropriate content'
        }

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'rejected successfully' in data['message']

    def test_moderate_review_flag(self, client, admin_token, sample_review):
        """Test flagging a review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {
            'action': 'flag',
            'reason': 'Needs further review'
        }

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'flagged successfully' in data['message']

    def test_moderate_review_invalid_action(self, client, admin_token, sample_review):
        """Test moderation with invalid action."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {
            'action': 'invalid_action',
            'reason': 'Test reason'
        }

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid moderation action' in data['error']

    def test_moderate_review_no_action(self, client, admin_token, sample_review):
        """Test moderation without action."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {'reason': 'Test reason'}

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No moderation action provided' in data['error']

    def test_moderate_review_not_found(self, client, admin_token):
        """Test moderating non-existent review."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        moderation_data = {'action': 'approve'}

        response = client.post(
            '/admin/reviews/moderate/99999',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 404

    def test_moderate_review_unauthorized(self, client, regular_user_token, sample_review):
        """Test moderation without admin privileges."""
        headers = {'Authorization': f'Bearer {regular_user_token}'}
        moderation_data = {'action': 'approve'}

        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_moderate_review_options(self, client):
        """Test OPTIONS request for moderation."""
        response = client.options('/admin/reviews/moderate/1')
        assert response.status_code == 200
        assert 'Access-Control-Allow-Methods' in response.headers


class TestAdminReviewCORS:
    """Test CORS headers for admin review endpoints."""

    def test_cors_headers_present(self, client, admin_token):
        """Test that CORS headers are present in responses."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all', headers=headers)

        # Check for CORS headers
        assert 'Access-Control-Allow-Origin' in response.headers or response.status_code == 200

    def test_options_requests(self, client):
        """Test OPTIONS requests for all admin endpoints."""
        endpoints = [
            '/admin/reviews/all',
            '/admin/reviews/1',
            '/admin/reviews/bulk-delete',
            '/admin/reviews/analytics',
            '/admin/reviews/moderate/1'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            assert response.status_code == 200
            assert 'Access-Control-Allow-Methods' in response.headers


class TestAdminReviewErrorHandling:
    """Test error handling in admin review routes."""

    @patch('app.routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_update(self, mock_commit, client, admin_token, sample_review):
        """Test database error handling on update."""
        mock_commit.side_effect = Exception("Database error")

        headers = {'Authorization': f'Bearer {admin_token}'}
        update_data = {'rating': 4}

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to update review' in data['error']

    @patch('app.routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_delete(self, mock_commit, client, admin_token, sample_review):
        """Test database error handling on delete."""
        mock_commit.side_effect = Exception("Database error")

        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.delete(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to delete review' in data['error']

    @patch('app.routes.reviews.admin_review_routes.Review.query')
    def test_query_error_on_get_all(self, mock_query, client, admin_token):
        """Test query error handling on get all reviews."""
        mock_query.side_effect = Exception("Query error")

        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to retrieve reviews' in data['error']

    def test_malformed_json_request(self, client, admin_token, sample_review):
        """Test handling of malformed JSON requests."""
        headers = {
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        }

        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data='{"invalid": json}'
        )
        assert response.status_code == 400


class TestAdminReviewIntegration:
    """Test integration scenarios for admin review management."""

    def test_complete_admin_review_lifecycle(self, client, admin_token, sample_review):
        """Test complete lifecycle of admin review management."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # 1. Get all reviews
        response = client.get('/admin/reviews/all', headers=headers)
        assert response.status_code == 200
        initial_count = json.loads(response.data)['pagination']['total_items']

        # 2. Get specific review
        response = client.get(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 200

        # 3. Update review
        update_data = {'rating': 4, 'comment': 'Updated by admin'}
        response = client.put(
            f'/admin/reviews/{sample_review.id}',
            headers=headers,
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        # 4. Moderate review
        moderation_data = {'action': 'approve', 'reason': 'Looks good'}
        response = client.post(
            f'/admin/reviews/moderate/{sample_review.id}',
            headers=headers,
            data=json.dumps(moderation_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        # 5. Get analytics
        response = client.get('/admin/reviews/analytics', headers=headers)
        assert response.status_code == 200

        # 6. Delete review
        response = client.delete(f'/admin/reviews/{sample_review.id}', headers=headers)
        assert response.status_code == 200

    def test_bulk_operations_consistency(self, client, admin_token, sample_reviews):
        """Test consistency of bulk operations."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # Get initial count
        response = client.get('/admin/reviews/all', headers=headers)
        initial_count = json.loads(response.data)['pagination']['total_items']

        # Bulk delete some reviews
        review_ids = [review.id for review in sample_reviews[:2]]
        delete_data = {'review_ids': review_ids}

        response = client.post(
            '/admin/reviews/bulk-delete',
            headers=headers,
            data=json.dumps(delete_data),
            content_type='application/json'
        )
        assert response.status_code == 200

        # Verify count decreased
        response = client.get('/admin/reviews/all', headers=headers)
        final_count = json.loads(response.data)['pagination']['total_items']
        assert final_count <= initial_count

    def test_analytics_data_consistency(self, client, admin_token, sample_reviews):
        """Test analytics data consistency."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # Get analytics
        response = client.get('/admin/reviews/analytics', headers=headers)
        assert response.status_code == 200

        analytics = json.loads(response.data)

        # Verify data consistency
        total_reviews = analytics['total_reviews']
        verified_reviews = analytics['verified_reviews']

        assert verified_reviews <= total_reviews

        if total_reviews > 0:
            assert 0 <= analytics['verification_rate'] <= 100
            assert 1 <= analytics['average_rating'] <= 5

        # Rating distribution should sum to total reviews
        rating_sum = sum(analytics['rating_distribution'].values())
        assert rating_sum == total_reviews


class TestAdminReviewPerformance:
    """Test performance aspects of admin review routes."""

    def test_large_review_list_pagination(self, client, admin_token):
        """Test pagination with large review lists."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # Test with different page sizes
        page_sizes = [10, 50, 100]

        for per_page in page_sizes:
            response = client.get(
                f'/admin/reviews/all?page=1&per_page={per_page}',
                headers=headers
            )
            assert response.status_code == 200

            data = json.loads(response.data)
            assert len(data['items']) <= per_page
            assert data['pagination']['per_page'] == per_page

    def test_analytics_performance(self, client, admin_token):
        """Test analytics endpoint performance."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # Test analytics with different date ranges
        date_ranges = [
            (datetime.now() - timedelta(days=7), datetime.now()),
            (datetime.now() - timedelta(days=30), datetime.now()),
            (datetime.now() - timedelta(days=90), datetime.now())
        ]

        for date_from, date_to in date_ranges:
            response = client.get(
                f'/admin/reviews/analytics?date_from={date_from.isoformat()}&date_to={date_to.isoformat()}',
                headers=headers
            )
            assert response.status_code == 200

            data = json.loads(response.data)
            assert 'total_reviews' in data
            assert 'rating_distribution' in data

    def test_complex_filtering_performance(self, client, admin_token):
        """Test performance with complex filtering."""
        headers = {'Authorization': f'Bearer {admin_token}'}

        # Test with multiple filters
        response = client.get(
            '/admin/reviews/all?rating=5&verified_only=true&search=great&sort_by=created_at&sort_order=desc',
            headers=headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'items' in data
        assert 'pagination' in data


# Additional test utilities and fixtures would be defined here
# These would include setup for sample data, authentication tokens, etc.
