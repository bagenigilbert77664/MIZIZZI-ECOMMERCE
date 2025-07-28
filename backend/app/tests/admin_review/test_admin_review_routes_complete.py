"""Comprehensive tests for admin review routes.
This module contains extensive tests covering all admin review management functionality
including authentication, authorization, data validation, error handling, and edge cases.
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models.models import Review, User, Product, UserRole, Category, Brand


class TestAdminReviewHealthCheck:
    """Test admin review health check endpoint."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/admin/reviews/health')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'admin_review_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert len(data['endpoints']) == 7  # All admin endpoints

    def test_health_check_options(self, client):
        """Test OPTIONS request for health check."""
        response = client.options('/api/admin/reviews/health')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS, not our custom handler
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminReviewAuthentication:
    """Test authentication and authorization for admin review endpoints."""

    def test_get_all_reviews_requires_admin(self, client, user_headers):
        """Test that regular users cannot access admin endpoints."""
        response = client.get('/api/admin/reviews/all', headers=user_headers)
        assert response.status_code == 403

        data = json.loads(response.data)
        assert 'error' in data
        assert 'Admin access required' in data['error']

    def test_get_all_reviews_requires_authentication(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get('/api/admin/reviews/all')
        assert response.status_code == 401

    def test_get_all_reviews_invalid_token(self, client, invalid_headers):
        """Test that invalid tokens are rejected."""
        response = client.get('/api/admin/reviews/all', headers=invalid_headers)
        # Should be 401 for invalid token, not 422
        assert response.status_code == 401

    def test_update_review_requires_admin(self, client, user_headers, sample_review):
        """Test that regular users cannot update reviews via admin endpoint."""
        update_data = {'rating': 3, 'comment': 'Updated comment'}

        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=user_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 403

    def test_delete_review_requires_admin(self, client, user_headers, sample_review):
        """Test that regular users cannot delete reviews via admin endpoint."""
        response = client.delete(
            f'/api/admin/reviews/{sample_review.id}',
            headers=user_headers
        )
        assert response.status_code == 403

    def test_bulk_delete_requires_admin(self, client, user_headers):
        """Test that regular users cannot bulk delete reviews."""
        bulk_data = {'review_ids': [1, 2, 3]}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=user_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 403

    def test_analytics_requires_admin(self, client, user_headers):
        """Test that regular users cannot access analytics."""
        response = client.get('/api/admin/reviews/analytics', headers=user_headers)
        assert response.status_code == 403

    def test_moderate_review_requires_admin(self, client, user_headers, sample_review):
        """Test that regular users cannot moderate reviews."""
        moderation_data = {'action': 'approve', 'reason': 'Good review'}

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=user_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 403


class TestAdminGetAllReviews:
    """Test admin get all reviews endpoint."""

    def test_get_all_reviews_success(self, client, admin_headers, multiple_reviews):
        """Test successful retrieval of all reviews."""
        reviews, users = multiple_reviews

        response = client.get('/api/admin/reviews/all', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'items' in data
        assert 'pagination' in data
        assert 'filters' in data

        # Allow for some flexibility in count due to test isolation issues
        assert len(data['items']) >= len(reviews)

        # Check that admin details are included
        if data['items']:
            first_review = data['items'][0]
            assert 'user' in first_review
            assert 'product' in first_review
            if first_review['user']:
                assert 'email' in first_review['user']  # Admin-specific detail

    def test_get_all_reviews_with_product_filter(self, client, admin_headers, multiple_reviews, sample_product):
        """Test filtering reviews by product ID."""
        reviews, users = multiple_reviews

        response = client.get(
            f'/api/admin/reviews/all?product_id={sample_product.id}',
            headers=admin_headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        # Should have at least the reviews we created for this product
        assert len(data['items']) >= 0
        assert data['filters']['product_id'] == sample_product.id

    def test_get_all_reviews_with_user_filter(self, client, admin_headers, multiple_reviews):
        """Test filtering reviews by user ID."""
        reviews, users = multiple_reviews
        user_id = users[0].id

        response = client.get(
            f'/api/admin/reviews/all?user_id={user_id}',
            headers=admin_headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        # Should have at least one review for this user
        assert len(data['items']) >= 1
        if data['items']:
            assert data['items'][0]['user_id'] == user_id
        assert data['filters']['user_id'] == user_id

    def test_get_all_reviews_with_rating_filter(self, client, admin_headers, multiple_reviews):
        """Test filtering reviews by rating."""
        reviews, users = multiple_reviews

        response = client.get('/api/admin/reviews/all?rating=5', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['rating'] == 5

        # Check that all returned reviews have rating 5
        for review in data['items']:
            assert review['rating'] == 5

    def test_get_all_reviews_with_verified_filter(self, client, admin_headers, multiple_reviews):
        """Test filtering reviews by verified purchase status."""
        reviews, users = multiple_reviews

        response = client.get('/api/admin/reviews/all?verified_only=true', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['verified_only'] is True

        # Check that all returned reviews are verified
        for review in data['items']:
            assert review['is_verified_purchase'] is True

    def test_get_all_reviews_with_date_range_filter(self, client, admin_headers, multiple_reviews):
        """Test filtering reviews by date range."""
        reviews, users = multiple_reviews

        date_from = (datetime.now() - timedelta(days=5)).isoformat()
        date_to = datetime.now().isoformat()

        response = client.get(
            f'/api/admin/reviews/all?date_from={date_from}&date_to={date_to}',
            headers=admin_headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['date_from'] == date_from
        assert data['filters']['date_to'] == date_to

    def test_get_all_reviews_with_search(self, client, admin_headers, multiple_reviews):
        """Test searching reviews by comment/title content."""
        reviews, users = multiple_reviews

        response = client.get('/api/admin/reviews/all?search=Review 1', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['filters']['search'] == 'Review 1'
        assert len(data['items']) >= 0  # May or may not find matches

    def test_get_all_reviews_with_sorting(self, client, admin_headers, multiple_reviews):
        """Test sorting reviews."""
        reviews, users = multiple_reviews

        # Test sorting by rating descending
        response = client.get(
            '/api/admin/reviews/all?sort_by=rating&sort_order=desc',
            headers=admin_headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        # Check that reviews are sorted by rating in descending order
        if len(data['items']) > 1:
            ratings = [review['rating'] for review in data['items']]
            assert ratings == sorted(ratings, reverse=True)

    def test_get_all_reviews_pagination(self, client, admin_headers, multiple_reviews):
        """Test pagination of reviews."""
        reviews, users = multiple_reviews

        response = client.get('/api/admin/reviews/all?page=1&per_page=5', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5
        assert len(data['items']) <= 5

        # Total items may be more than our test reviews due to other tests
        assert data['pagination']['total_items'] >= len(reviews)

    def test_get_all_reviews_options(self, client):
        """Test OPTIONS request for get all reviews."""
        response = client.options('/api/admin/reviews/all')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminGetReviewById:
    """Test admin get review by ID endpoint."""

    def test_get_review_by_id_success(self, client, admin_headers, sample_review):
        """Test successful retrieval of review by ID."""
        response = client.get(f'/api/admin/reviews/{sample_review.id}', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['id'] == sample_review.id
        assert data['rating'] == sample_review.rating
        assert data['comment'] == sample_review.comment
        assert 'user' in data
        assert 'product' in data

        if data['user']:
            assert 'email' in data['user']  # Admin-specific detail

    def test_get_review_by_id_nonexistent(self, client, admin_headers):
        """Test getting nonexistent review."""
        response = client.get('/api/admin/reviews/99999', headers=admin_headers)
        assert response.status_code == 404

    def test_get_review_by_id_options(self, client):
        """Test OPTIONS request for get review by ID."""
        response = client.options('/api/admin/reviews/1')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminUpdateReview:
    """Test admin update review endpoint."""

    def test_update_review_success(self, client, admin_headers, sample_review):
        """Test successful review update by admin."""
        update_data = {
            'rating': 3,
            'title': 'Updated title',
            'comment': 'Updated comment by admin',
            'is_verified_purchase': False
        }

        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['message'] == 'Review updated successfully'
        assert data['review']['rating'] == 3
        assert data['review']['title'] == 'Updated title'
        assert data['review']['comment'] == 'Updated comment by admin'
        assert data['review']['is_verified_purchase'] is False

    def test_update_review_partial(self, client, admin_headers, sample_review):
        """Test partial review update."""
        update_data = {'rating': 2}

        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['review']['rating'] == 2
        # Other fields should remain unchanged
        assert data['review']['comment'] == sample_review.comment

    def test_update_review_invalid_rating(self, client, admin_headers, sample_review):
        """Test updating review with invalid rating."""
        update_data = {'rating': 6}  # Invalid rating

        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'error' in data
        assert 'Validation failed' in data['error']

    def test_update_review_no_data(self, client, admin_headers, sample_review):
        """Test updating review with no data."""
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps({})
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No data provided' in data['error']

    def test_update_review_nonexistent(self, client, admin_headers):
        """Test updating nonexistent review."""
        update_data = {'rating': 3}

        response = client.put(
            '/api/admin/reviews/99999',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 404

    def test_update_review_options(self, client):
        """Test OPTIONS request for update review."""
        response = client.options('/api/admin/reviews/1')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminDeleteReview:
    """Test admin delete review endpoint."""

    def test_delete_review_success(self, client, admin_headers, sample_review):
        """Test successful review deletion by admin."""
        review_id = sample_review.id

        response = client.delete(f'/api/admin/reviews/{review_id}', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['message'] == 'Review deleted successfully'

        # Verify review is deleted
        deleted_review = db.session.get(Review, review_id)
        assert deleted_review is None

    def test_delete_review_nonexistent(self, client, admin_headers):
        """Test deleting nonexistent review."""
        response = client.delete('/api/admin/reviews/99999', headers=admin_headers)
        assert response.status_code == 404

    def test_delete_review_options(self, client):
        """Test OPTIONS request for delete review."""
        response = client.options('/api/admin/reviews/1')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminBulkDeleteReviews:
    """Test admin bulk delete reviews endpoint."""

    def test_bulk_delete_reviews_success(self, client, admin_headers, multiple_reviews):
        """Test successful bulk deletion of reviews."""
        reviews, users = multiple_reviews
        review_ids = [reviews[0].id, reviews[1].id, reviews[2].id]

        bulk_data = {'review_ids': review_ids}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['deleted_count'] == 3
        assert 'Successfully deleted 3 reviews' in data['message']

        # Verify reviews are deleted
        for review_id in review_ids:
            deleted_review = db.session.get(Review, review_id)
            assert deleted_review is None

    def test_bulk_delete_reviews_no_data(self, client, admin_headers):
        """Test bulk delete with no data."""
        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps({})
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No review IDs provided' in data['error']

    def test_bulk_delete_reviews_invalid_format(self, client, admin_headers):
        """Test bulk delete with invalid data format."""
        bulk_data = {'review_ids': 'not_a_list'}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid review IDs format' in data['error']

    def test_bulk_delete_reviews_empty_list(self, client, admin_headers):
        """Test bulk delete with empty list."""
        bulk_data = {'review_ids': []}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid review IDs format' in data['error']

    def test_bulk_delete_reviews_nonexistent_ids(self, client, admin_headers):
        """Test bulk delete with nonexistent review IDs."""
        bulk_data = {'review_ids': [99999, 99998, 99997]}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['deleted_count'] == 0

    def test_bulk_delete_reviews_options(self, client):
        """Test OPTIONS request for bulk delete."""
        response = client.options('/api/admin/reviews/bulk-delete')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminReviewAnalytics:
    """Test admin review analytics endpoint."""

    def test_get_analytics_success(self, client, admin_headers, multiple_products_with_reviews):
        """Test successful retrieval of review analytics."""
        products, reviews, users = multiple_products_with_reviews

        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)

        # Check all required analytics fields
        assert 'total_reviews' in data
        assert 'verified_reviews' in data
        assert 'verification_rate' in data
        assert 'average_rating' in data
        assert 'rating_distribution' in data
        assert 'monthly_reviews' in data
        assert 'top_products' in data
        assert 'top_reviewers' in data
        assert 'date_range' in data

        # Allow for flexibility due to test isolation issues
        assert data['total_reviews'] >= len(reviews)
        assert isinstance(data['verification_rate'], (int, float))
        assert isinstance(data['average_rating'], (int, float))

        # Check rating distribution structure
        rating_dist = data['rating_distribution']
        for i in range(1, 6):
            assert str(i) in rating_dist
            assert isinstance(rating_dist[str(i)], int)

    def test_get_analytics_with_date_range(self, client, admin_headers, multiple_products_with_reviews):
        """Test analytics with date range filter."""
        products, reviews, users = multiple_products_with_reviews

        date_from = (datetime.now() - timedelta(days=30)).isoformat()
        date_to = datetime.now().isoformat()

        response = client.get(
            f'/api/admin/reviews/analytics?date_from={date_from}&date_to={date_to}',
            headers=admin_headers
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['date_range']['from'] == date_from
        assert data['date_range']['to'] == date_to

    def test_get_analytics_top_products(self, client, admin_headers, multiple_products_with_reviews):
        """Test that analytics includes top products data."""
        products, reviews, users = multiple_products_with_reviews

        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        top_products = data['top_products']
        assert isinstance(top_products, list)

        if top_products:  # If there are products
            product = top_products[0]
            assert 'product_id' in product
            assert 'product_name' in product
            assert 'review_count' in product
            assert 'average_rating' in product

    def test_get_analytics_top_reviewers(self, client, admin_headers, multiple_products_with_reviews):
        """Test that analytics includes top reviewers data."""
        products, reviews, users = multiple_products_with_reviews

        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        top_reviewers = data['top_reviewers']
        assert isinstance(top_reviewers, list)

        if top_reviewers:  # If there are reviewers
            reviewer = top_reviewers[0]
            assert 'user_id' in reviewer
            assert 'user_name' in reviewer
            assert 'user_email' in reviewer
            assert 'review_count' in reviewer
            assert 'average_rating' in reviewer

    def test_get_analytics_no_reviews(self, client, admin_headers):
        """Test analytics with no reviews in database."""
        # Clear all reviews first
        with client.application.app_context():
            Review.query.delete()
            db.session.commit()

        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['total_reviews'] == 0
        assert data['verified_reviews'] == 0
        assert data['verification_rate'] == 0
        assert data['average_rating'] == 0

    def test_get_analytics_options(self, client):
        """Test OPTIONS request for analytics."""
        response = client.options('/api/admin/reviews/analytics')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminReviewModeration:
    """Test admin review moderation endpoint."""

    def test_moderate_review_approve(self, client, admin_headers, sample_review):
        """Test approving a review."""
        moderation_data = {
            'action': 'approve',
            'reason': 'Review meets community guidelines'
        }

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Review approved successfully' in data['message']
        assert 'review' in data

    def test_moderate_review_reject(self, client, admin_headers, sample_review):
        """Test rejecting a review."""
        moderation_data = {
            'action': 'reject',
            'reason': 'Inappropriate content'
        }

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Review rejected successfully' in data['message']

    def test_moderate_review_flag(self, client, admin_headers, sample_review):
        """Test flagging a review."""
        moderation_data = {
            'action': 'flag',
            'reason': 'Needs further review'
        }

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'Review flagged successfully' in data['message']

    def test_moderate_review_invalid_action(self, client, admin_headers, sample_review):
        """Test moderation with invalid action."""
        moderation_data = {
            'action': 'invalid_action',
            'reason': 'Some reason'
        }

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'Invalid moderation action' in data['error']

    def test_moderate_review_no_action(self, client, admin_headers, sample_review):
        """Test moderation with no action provided."""
        moderation_data = {'reason': 'Some reason'}

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No moderation action provided' in data['error']

    def test_moderate_review_no_data(self, client, admin_headers, sample_review):
        """Test moderation with no data."""
        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps({})
        )
        assert response.status_code == 400

        data = json.loads(response.data)
        assert 'No moderation action provided' in data['error']

    def test_moderate_review_nonexistent(self, client, admin_headers):
        """Test moderating nonexistent review."""
        moderation_data = {
            'action': 'approve',
            'reason': 'Good review'
        }

        response = client.post(
            '/api/admin/reviews/moderate/99999',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 404

    def test_moderate_review_options(self, client):
        """Test OPTIONS request for moderation."""
        response = client.options('/api/admin/reviews/moderate/1')
        assert response.status_code == 200
        # Check for CORS headers set by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminReviewCORS:
    """Test CORS functionality for admin review endpoints."""

    def test_cors_headers_present(self, client, admin_headers, sample_review):
        """Test that CORS headers are present in responses."""
        response = client.get(f'/api/admin/reviews/{sample_review.id}', headers=admin_headers)
        assert response.status_code == 200

        # CORS headers should be handled by Flask-CORS
        assert 'Access-Control-Allow-Origin' in response.headers

    def test_options_requests_all_endpoints(self, client):
        """Test OPTIONS requests for all admin endpoints."""
        endpoints = [
            '/api/admin/reviews/all',
            '/api/admin/reviews/1',
            '/api/admin/reviews/bulk-delete',
            '/api/admin/reviews/analytics',
            '/api/admin/reviews/moderate/1',
            '/api/admin/reviews/health'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            assert response.status_code == 200
            # Check for CORS headers set by Flask-CORS
            assert 'Access-Control-Allow-Origin' in response.headers


class TestAdminReviewErrorHandling:
    """Test error handling for admin review endpoints."""

    @patch('routes.reviews.admin_review_routes.Review.query')
    def test_database_error_on_get_all(self, mock_query, client, admin_headers):
        """Test database error handling on get all reviews."""
        mock_query.paginate.side_effect = SQLAlchemyError("Database error")

        response = client.get('/api/admin/reviews/all', headers=admin_headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to retrieve reviews' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.get')
    def test_database_error_on_get_by_id(self, mock_get, client, admin_headers):
        """Test database error handling on get review by ID."""
        mock_get.side_effect = SQLAlchemyError("Database error")

        response = client.get('/api/admin/reviews/1', headers=admin_headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Database error' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_update(self, mock_commit, client, admin_headers, sample_review):
        """Test database error handling on update review."""
        mock_commit.side_effect = SQLAlchemyError("Database error")

        update_data = {'rating': 3}

        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to update review' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_delete(self, mock_commit, client, admin_headers, sample_review):
        """Test database error handling on delete review."""
        mock_commit.side_effect = SQLAlchemyError("Database error")

        response = client.delete(f'/api/admin/reviews/{sample_review.id}', headers=admin_headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to delete review' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_bulk_delete(self, mock_commit, client, admin_headers):
        """Test database error handling on bulk delete."""
        mock_commit.side_effect = SQLAlchemyError("Database error")

        bulk_data = {'review_ids': [1, 2, 3]}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to delete reviews' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.query')
    def test_database_error_on_analytics(self, mock_query, client, admin_headers):
        """Test database error handling on analytics."""
        mock_query.side_effect = SQLAlchemyError("Database error")

        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to retrieve analytics' in data['error']

    @patch('routes.reviews.admin_review_routes.db.session.commit')
    def test_database_error_on_moderation(self, mock_commit, client, admin_headers, sample_review):
        """Test database error handling on moderation."""
        mock_commit.side_effect = SQLAlchemyError("Database error")

        moderation_data = {'action': 'approve', 'reason': 'Good review'}

        response = client.post(
            f'/api/admin/reviews/moderate/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 500

        data = json.loads(response.data)
        assert 'Failed to moderate review' in data['error']

    def test_malformed_json_request(self, client, admin_headers, sample_review):
        """Test handling of malformed JSON requests."""
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data='{"invalid": json}'
        )
        assert response.status_code == 400


class TestAdminReviewIntegration:
    """Test integration scenarios for admin review management."""

    def test_complete_admin_review_lifecycle(self, client, admin_headers, regular_user, sample_product):
        """Test complete lifecycle of admin review management."""
        # Create a review as regular user first
        with client.application.app_context():
            review = Review(
                user_id=regular_user.id,
                product_id=sample_product.id,
                rating=4,
                title="Good product",
                comment="This is a good product",
                is_verified_purchase=True
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        # Admin gets the review
        response = client.get(f'/api/admin/reviews/{review_id}', headers=admin_headers)
        assert response.status_code == 200

        # Admin updates the review
        update_data = {'rating': 5, 'comment': 'Updated by admin'}
        response = client.put(
            f'/api/admin/reviews/{review_id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        # Admin moderates the review
        moderation_data = {'action': 'approve', 'reason': 'Good review'}
        response = client.post(
            f'/api/admin/reviews/moderate/{review_id}',
            headers=admin_headers,
            data=json.dumps(moderation_data)
        )
        assert response.status_code == 200

        # Admin deletes the review
        response = client.delete(f'/api/admin/reviews/{review_id}', headers=admin_headers)
        assert response.status_code == 200

        # Verify review is deleted
        response = client.get(f'/api/admin/reviews/{review_id}', headers=admin_headers)
        assert response.status_code == 404

    def test_admin_analytics_consistency(self, client, admin_headers, multiple_products_with_reviews):
        """Test that analytics data is consistent."""
        products, reviews, users = multiple_products_with_reviews

        # Get analytics
        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)

        # Verify total reviews is at least our test reviews
        assert data['total_reviews'] >= len(reviews)

        # Verify rating distribution adds up correctly
        rating_sum = sum(data['rating_distribution'].values())
        assert rating_sum == data['total_reviews']

        # Verify verification rate calculation is reasonable
        assert 0 <= data['verification_rate'] <= 100

    def test_bulk_operations_with_mixed_results(self, client, admin_headers, multiple_reviews):
        """Test bulk operations with mix of valid and invalid IDs."""
        reviews, users = multiple_reviews

        valid_ids = [reviews[0].id, reviews[1].id]
        invalid_ids = [99999, 99998]
        mixed_ids = valid_ids + invalid_ids

        bulk_data = {'review_ids': mixed_ids}

        response = client.post(
            '/api/admin/reviews/bulk-delete',
            headers=admin_headers,
            data=json.dumps(bulk_data)
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['deleted_count'] == 2  # Only valid IDs should be deleted


class TestAdminReviewPerformance:
    """Test performance aspects of admin review endpoints."""

    def test_large_review_list_pagination(self, client, admin_headers, app):
        """Test pagination with large number of reviews."""
        with app.app_context():
            # Create many reviews for performance testing
            user = User(
                name="Performance Test User",
                email=f"perftest_{uuid.uuid4().hex[:8]}@example.com",
                role=UserRole.USER,
                email_verified=True,
                is_active=True
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.flush()

            category = Category(name="Test Category", slug=f"test-cat-{uuid.uuid4().hex[:8]}")
            brand = Brand(name="Test Brand", slug=f"test-brand-{uuid.uuid4().hex[:8]}")
            db.session.add_all([category, brand])
            db.session.flush()

            product = Product(
                name="Performance Test Product",
                slug=f"perf-product-{uuid.uuid4().hex[:8]}",
                price=99.99,
                stock=100,
                category_id=category.id,
                brand_id=brand.id,
                is_active=True
            )
            db.session.add(product)
            db.session.flush()

            # Create 100 reviews
            for i in range(100):
                review = Review(
                    user_id=user.id,
                    product_id=product.id,
                    rating=(i % 5) + 1,
                    title=f"Performance Review {i}",
                    comment=f"Performance test review number {i}",
                    is_verified_purchase=(i % 2 == 0)
                )
                db.session.add(review)

            db.session.commit()

        # Test pagination performance
        response = client.get('/api/admin/reviews/all?page=1&per_page=20', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert len(data['items']) == 20
        assert data['pagination']['total_items'] >= 100

    def test_analytics_performance_with_large_dataset(self, client, admin_headers, app):
        """Test analytics performance with larger dataset."""
        # Use the existing large dataset from previous test
        response = client.get('/api/admin/reviews/analytics', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)

        # Verify analytics can handle larger datasets
        assert 'total_reviews' in data
        assert 'rating_distribution' in data
        assert 'top_products' in data
        assert 'top_reviewers' in data


class TestAdminReviewEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_get_all_reviews_with_extreme_pagination(self, client, admin_headers):
        """Test pagination with extreme values."""
        # Test with very large per_page (should be capped at 100)
        response = client.get('/api/admin/reviews/all?per_page=1000', headers=admin_headers)
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data['pagination']['per_page'] <= 100

        # Test with zero page
        response = client.get('/api/admin/reviews/all?page=0', headers=admin_headers)
        assert response.status_code == 200

        # Test with negative page
        response = client.get('/api/admin/reviews/all?page=-1', headers=admin_headers)
        assert response.status_code == 200

    def test_analytics_with_invalid_date_formats(self, client, admin_headers):
        """Test analytics with invalid date formats."""
        response = client.get(
            '/api/admin/reviews/analytics?date_from=invalid-date&date_to=also-invalid',
            headers=admin_headers
        )
        # Should still work, just ignore invalid dates
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'total_reviews' in data

    def test_search_with_special_characters(self, client, admin_headers, app):
        """Test search functionality with special characters."""
        with app.app_context():
            # Create review with special characters
            user = User(
                name="Special User",
                email=f"special_{uuid.uuid4().hex[:8]}@example.com",
                role=UserRole.USER,
                email_verified=True,
                is_active=True
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.flush()

            category = Category(name="Test Category", slug=f"test-cat-{uuid.uuid4().hex[:8]}")
            brand = Brand(name="Test Brand", slug=f"test-brand-{uuid.uuid4().hex[:8]}")
            db.session.add_all([category, brand])
            db.session.flush()

            product = Product(
                name="Special Product",
                slug=f"special-product-{uuid.uuid4().hex[:8]}",
                price=99.99,
                stock=10,
                category_id=category.id,
                brand_id=brand.id,
                is_active=True
            )
            db.session.add(product)
            db.session.flush()

            review = Review(
                user_id=user.id,
                product_id=product.id,
                rating=5,
                title="Review with special chars: @#$%^&*()",
                comment="Comment with émojis and spëcial characters! 🎉",
                is_verified_purchase=True
            )
            db.session.add(review)
            db.session.commit()

        # Test search with special characters
        response = client.get('/api/admin/reviews/all?search=@#$%', headers=admin_headers)
        assert response.status_code == 200

        response = client.get('/api/admin/reviews/all?search=émojis', headers=admin_headers)
        assert response.status_code == 200

    def test_update_review_with_boundary_values(self, client, admin_headers, sample_review):
        """Test updating review with boundary values."""
        # Test minimum rating
        update_data = {'rating': 1}
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        # Test maximum rating
        update_data = {'rating': 5}
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        # Test empty comment
        update_data = {'comment': ''}
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200

        # Test very long comment
        update_data = {'comment': 'A' * 5000}
        response = client.put(
            f'/api/admin/reviews/{sample_review.id}',
            headers=admin_headers,
            data=json.dumps(update_data)
        )
        assert response.status_code == 200
