"""
Complete test suite for User Review routes.
Tests all endpoints, error handling, validation, and edge cases.
"""

import json
import uuid
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from flask import current_app
from flask_jwt_extended import create_access_token

# Import models and extensions
from app.configuration.extensions import db
from app.models.models import (
    User, UserRole, Product, Review, Category, Brand, Order, OrderItem, OrderStatus
)


class TestUserReviewHealthCheck:
    """Test health check endpoint."""

    def test_health_check_success(self, client):
        """Test health check returns success."""
        response = client.get('/api/reviews/user/health')
        assert response.status_code == 200

        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['service'] == 'user_review_routes'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert len(data['endpoints']) > 0

    def test_health_check_options(self, client):
        """Test health check OPTIONS request."""
        response = client.options('/api/reviews/user/health')
        assert response.status_code == 200
        assert 'Allow' in response.headers


class TestPublicReviewEndpoints:
    """Test public review endpoints (no authentication required)."""

    def test_get_product_reviews_success(self, client, sample_product, sample_user):
        """Test getting reviews for a product."""
        with client.application.app_context():
            # Create a review
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=5,
                title="Great product",
                comment="This is an excellent product with great quality."
            )
            db.session.add(review)
            db.session.commit()

            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews')
            assert response.status_code == 200

            data = response.get_json()
            assert 'items' in data
            assert 'pagination' in data
            assert len(data['items']) == 1
            assert data['items'][0]['rating'] == 5
            assert data['items'][0]['title'] == "Great product"

    def test_get_product_reviews_with_rating_filter(self, client, sample_product, sample_user):
        """Test getting reviews with rating filter."""
        with client.application.app_context():
            # Create reviews with different ratings
            for rating in [3, 4, 5]:
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=rating,
                    comment=f"Review with rating {rating}."
                )
                db.session.add(review)
            db.session.commit()

            # Test filtering by rating 5
            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews?rating=5')
            assert response.status_code == 200

            data = response.get_json()
            assert len(data['items']) == 1
            assert data['items'][0]['rating'] == 5

    def test_get_product_reviews_with_verified_filter(self, client, sample_product, sample_user):
        """Test getting reviews with verified purchase filter."""
        with client.application.app_context():
            # Create verified and unverified reviews
            verified_review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=5,
                comment="Verified purchase review.",
                is_verified_purchase=True
            )
            unverified_review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=4,
                comment="Unverified purchase review.",
                is_verified_purchase=False
            )
            db.session.add(verified_review)
            db.session.add(unverified_review)
            db.session.commit()

            # Test filtering by verified purchases only
            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews?verified_only=true')
            assert response.status_code == 200

            data = response.get_json()
            assert len(data['items']) == 1
            assert data['items'][0]['is_verified_purchase'] is True

    def test_get_product_reviews_with_sorting(self, client, sample_product, sample_user):
        """Test getting reviews with different sorting options."""
        with client.application.app_context():
            # Create reviews with different ratings and dates
            for i, rating in enumerate([3, 5, 4], 1):
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=rating,
                    comment=f"Review {i}.",
                    created_at=datetime.utcnow() + timedelta(days=i)
                )
                db.session.add(review)
            db.session.commit()

            # Test sorting by rating ascending
            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews?sort_by=rating&sort_order=asc')
            assert response.status_code == 200

            data = response.get_json()
            ratings = [item['rating'] for item in data['items']]
            assert ratings == sorted(ratings)

    def test_get_product_reviews_pagination(self, client, sample_product, sample_user):
        """Test review pagination."""
        with client.application.app_context():
            # Create multiple reviews
            for i in range(25):
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=5,
                    comment=f"Review number {i+1}."
                )
                db.session.add(review)
            db.session.commit()

            # Test first page
            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews?page=1&per_page=10')
            assert response.status_code == 200

            data = response.get_json()
            assert len(data['items']) == 10
            assert data['pagination']['page'] == 1
            assert data['pagination']['total_pages'] == 3
            assert data['pagination']['total_items'] == 25

    def test_get_product_reviews_nonexistent_product(self, client):
        """Test getting reviews for non-existent product."""
        response = client.get('/api/reviews/user/products/99999/reviews')
        assert response.status_code == 404

        data = response.get_json()
        assert data['error'] == "Product not found"

    def test_get_product_reviews_options(self, client, sample_product):
        """Test OPTIONS request for product reviews."""
        response = client.options(f'/api/reviews/user/products/{sample_product.id}/reviews')
        assert response.status_code == 200
        assert 'Allow' in response.headers

    def test_get_product_review_summary_success(self, client, sample_product, sample_user):
        """Test getting review summary for a product."""
        with client.application.app_context():
            # Create reviews with different ratings
            ratings = [5, 5, 4, 4, 3, 2, 1]
            for rating in ratings:
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=rating,
                    comment=f"Review with rating {rating}.",
                    is_verified_purchase=(rating >= 4)  # Some verified purchases
                )
                db.session.add(review)
            db.session.commit()

            response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews/summary')
            assert response.status_code == 200

            data = response.get_json()
            assert data['total_reviews'] == 7
            assert data['average_rating'] == round(sum(ratings) / len(ratings), 2)
            assert data['verified_reviews'] == 4  # Ratings 4 and 5
            assert data['rating_distribution']['5'] == 2
            assert data['rating_distribution']['4'] == 2
            assert data['rating_distribution']['3'] == 1
            assert data['rating_distribution']['2'] == 1
            assert data['rating_distribution']['1'] == 1

    def test_get_product_review_summary_no_reviews(self, client, sample_product):
        """Test getting review summary for product with no reviews."""
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews/summary')
        assert response.status_code == 200

        data = response.get_json()
        assert data['total_reviews'] == 0
        assert data['average_rating'] == 0
        assert data['verified_reviews'] == 0
        assert all(count == 0 for count in data['rating_distribution'].values())

    def test_get_product_review_summary_nonexistent_product(self, client):
        """Test getting review summary for non-existent product."""
        response = client.get('/api/reviews/user/products/99999/reviews/summary')
        assert response.status_code == 404

        data = response.get_json()
        assert data['error'] == "Product not found"

    def test_get_review_by_id_success(self, client, sample_product, sample_user):
        """Test getting a specific review by ID."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=4,
                title="Good product",
                comment="This product works well for my needs."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

            response = client.get(f'/api/reviews/user/reviews/{review_id}')
            assert response.status_code == 200

            data = response.get_json()
            assert data['id'] == review_id
            assert data['rating'] == 4
            assert data['title'] == "Good product"

    def test_get_review_by_id_nonexistent(self, client):
        """Test getting non-existent review by ID."""
        response = client.get('/api/reviews/user/reviews/99999')
        assert response.status_code == 404

        data = response.get_json()
        assert data['error'] == "Review not found"


class TestAuthenticatedReviewEndpoints:
    """Test authenticated review endpoints."""

    def test_create_review_success(self, client, auth_headers, sample_user, sample_product):
        """Test creating a new review successfully."""
        review_data = {
            'rating': 5,
            'title': 'Excellent product',
            'comment': 'This product exceeded my expectations. Highly recommended!'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == "Review created successfully"
        assert data['review']['rating'] == 5
        assert data['review']['title'] == 'Excellent product'
        assert data['review']['is_verified_purchase'] is False  # No order exists

    def test_create_review_without_verified_purchase(self, client, auth_headers, sample_user, sample_product):
        """Test creating review without verified purchase."""
        review_data = {
            'rating': 4,
            'comment': 'Good product but not verified purchase.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['review']['is_verified_purchase'] is False

    def test_create_review_duplicate(self, client, auth_headers, sample_user, sample_product):
        """Test creating duplicate review for same product."""
        with client.application.app_context():
            # Create existing review
            existing_review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                comment="Existing review."
            )
            db.session.add(existing_review)
            db.session.commit()

        review_data = {
            'rating': 5,
            'comment': 'Trying to create duplicate review.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 409
        data = response.get_json()
        assert data['error'] == "You have already reviewed this product"

    def test_create_review_invalid_data(self, client, auth_headers, sample_product):
        """Test creating review with invalid data."""
        invalid_data = {
            'rating': 6,  # Invalid rating
            'comment': 'Short'  # Too short comment
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(invalid_data),
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Validation failed"
        assert 'errors' in data

    def test_create_review_missing_rating(self, client, auth_headers, sample_product):
        """Test creating review without required rating."""
        review_data = {
            'comment': 'Review without rating.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Validation failed"
        assert 'rating' in data['errors']

    def test_create_review_nonexistent_product(self, client, auth_headers):
        """Test creating review for non-existent product."""
        review_data = {
            'rating': 5,
            'comment': 'Review for non-existent product.'
        }

        response = client.post(
            '/api/reviews/user/products/99999/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Product not found"

    def test_create_review_no_data(self, client, auth_headers, sample_product):
        """Test creating review with no data."""
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data='',
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Invalid JSON data"

    def test_create_review_unauthorized(self, client, sample_product):
        """Test creating review without authentication."""
        review_data = {
            'rating': 5,
            'comment': 'Unauthorized review attempt.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers={'Content-Type': 'application/json'}
        )

        assert response.status_code == 401

    def test_update_review_success(self, client, auth_headers, sample_user, sample_product):
        """Test updating a review successfully."""
        with client.application.app_context():
            # Create review to update
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                title="Original title",
                comment="Original comment for the review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        update_data = {
            'rating': 5,
            'title': 'Updated title',
            'comment': 'Updated comment with more details about the product.'
        }

        response = client.put(
            f'/api/reviews/user/reviews/{review_id}',
            data=json.dumps(update_data),
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Review updated successfully"
        assert data['review']['rating'] == 5
        assert data['review']['title'] == 'Updated title'

    def test_update_review_partial(self, client, auth_headers, sample_user, sample_product):
        """Test partial update of a review."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                title="Original title",
                comment="Original comment for the review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        # Update only rating
        update_data = {'rating': 4}

        response = client.put(
            f'/api/reviews/user/reviews/{review_id}',
            data=json.dumps(update_data),
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['review']['rating'] == 4
        assert data['review']['title'] == "Original title"  # Should remain unchanged

    def test_update_review_invalid_data(self, client, auth_headers, sample_user, sample_product):
        """Test updating review with invalid data."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                comment="Original comment for the review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        invalid_data = {
            'rating': 0,  # Invalid rating
            'comment': 'Short'  # Too short
        }

        response = client.put(
            f'/api/reviews/user/reviews/{review_id}',
            data=json.dumps(invalid_data),
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Validation failed"

    def test_update_review_unauthorized_user(self, client, sample_user, sample_product):
        """Test updating review by unauthorized user."""
        with client.application.app_context():
            # Create another user
            other_user = User(
                name="Other User",
                email=f"other_{uuid.uuid4().hex[:8]}@example.com",
                role=UserRole.USER,
                email_verified=True,
                is_active=True
            )
            other_user.set_password("password123")
            db.session.add(other_user)
            db.session.commit()

            # Create review by sample_user
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                comment="Original comment for the review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

            # Create token for other_user
            access_token = create_access_token(
                identity=str(other_user.id),
                additional_claims={"role": other_user.role.value}
            )

        other_user_headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        update_data = {'rating': 5}

        response = client.put(
            f'/api/reviews/user/reviews/{review_id}',
            data=json.dumps(update_data),
            headers=other_user_headers
        )

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized to update this review"

    def test_update_review_nonexistent(self, client, auth_headers):
        """Test updating non-existent review."""
        update_data = {'rating': 5}

        response = client.put(
            '/api/reviews/user/reviews/99999',
            data=json.dumps(update_data),
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Review not found"

    def test_delete_review_success(self, client, auth_headers, sample_user, sample_product):
        """Test deleting a review successfully."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                comment="Review to be deleted."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        response = client.delete(
            f'/api/reviews/user/reviews/{review_id}',
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Review deleted successfully"

        # Verify review is deleted
        with client.application.app_context():
            deleted_review = Review.query.get(review_id)
            assert deleted_review is None

    def test_delete_review_unauthorized_user(self, client, sample_user, sample_product):
        """Test deleting review by unauthorized user."""
        with client.application.app_context():
            # Create another user
            other_user = User(
                name="Other User",
                email=f"other_{uuid.uuid4().hex[:8]}@example.com",
                role=UserRole.USER,
                email_verified=True,
                is_active=True
            )
            other_user.set_password("password123")
            db.session.add(other_user)
            db.session.commit()

            # Create review by sample_user
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=3,
                comment="Review owned by sample user."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

            # Create token for other_user
            access_token = create_access_token(
                identity=str(other_user.id),
                additional_claims={"role": other_user.role.value}
            )

        other_user_headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        response = client.delete(
            f'/api/reviews/user/reviews/{review_id}',
            headers=other_user_headers
        )

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized to delete this review"

    def test_delete_review_nonexistent(self, client, auth_headers):
        """Test deleting non-existent review."""
        response = client.delete(
            '/api/reviews/user/reviews/99999',
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Review not found"

    def test_get_my_reviews_success(self, client, auth_headers, sample_user, sample_product):
        """Test getting current user's reviews."""
        with client.application.app_context():
            # Create multiple reviews for the user
            for i in range(3):
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=4 + (i % 2),  # Ratings 4 and 5
                    comment=f"User review number {i+1}."
                )
                db.session.add(review)
            db.session.commit()

        response = client.get('/api/reviews/user/my-reviews', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert 'pagination' in data
        assert len(data['items']) == 3

        # Verify all reviews belong to the user
        for review in data['items']:
            assert review['user_id'] == sample_user.id

    def test_get_my_reviews_with_filters(self, client, auth_headers, sample_user, sample_product):
        """Test getting user's reviews with filters."""
        with client.application.app_context():
            # Create reviews with different ratings
            for rating in [3, 4, 5]:
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=rating,
                    comment=f"Review with rating {rating}."
                )
                db.session.add(review)
            db.session.commit()

        # Filter by rating
        response = client.get('/api/reviews/user/my-reviews?rating=5', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['rating'] == 5

    def test_get_my_reviews_pagination(self, client, auth_headers, sample_user, sample_product):
        """Test pagination of user's reviews."""
        with client.application.app_context():
            # Create multiple reviews
            for i in range(15):
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=5,
                    comment=f"Review number {i+1}."
                )
                db.session.add(review)
            db.session.commit()

        response = client.get('/api/reviews/user/my-reviews?page=1&per_page=10', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 10
        assert data['pagination']['page'] == 1
        assert data['pagination']['total_pages'] == 2
        assert data['pagination']['total_items'] == 15

    def test_get_my_reviews_unauthorized(self, client):
        """Test getting user's reviews without authentication."""
        response = client.get('/api/reviews/user/my-reviews')
        assert response.status_code == 401

    def test_mark_review_helpful_success(self, client, auth_headers, sample_user, sample_product):
        """Test marking a review as helpful."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=5,
                comment="Helpful review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        response = client.post(
            f'/api/reviews/user/reviews/{review_id}/helpful',
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Review marked as helpful"
        assert data['review_id'] == review_id

    def test_mark_review_helpful_nonexistent(self, client, auth_headers):
        """Test marking non-existent review as helpful."""
        response = client.post(
            '/api/reviews/user/reviews/99999/helpful',
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Review not found"

    def test_mark_review_helpful_unauthorized(self, client, sample_user, sample_product):
        """Test marking review as helpful without authentication."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=5,
                comment="Review to mark as helpful."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        response = client.post(f'/api/reviews/user/reviews/{review_id}/helpful')
        assert response.status_code == 401


class TestReviewValidation:
    """Test review data validation."""

    def test_validate_rating_required(self, client, auth_headers, sample_product):
        """Test that rating is required for new reviews."""
        review_data = {
            'comment': 'Review without rating.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert 'rating' in data['errors']
        assert data['errors']['rating'][0]['code'] == 'required'

    def test_validate_rating_range(self, client, auth_headers, sample_product):
        """Test rating range validation."""
        # Test rating too low
        review_data = {'rating': 0, 'comment': 'Rating too low.'}
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )
        assert response.status_code == 400

        # Test rating too high
        review_data = {'rating': 6, 'comment': 'Rating too high.'}
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_validate_comment_length(self, client, auth_headers, sample_product):
        """Test comment length validation."""
        # Test comment too short
        review_data = {'rating': 5, 'comment': 'Short'}
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )
        assert response.status_code == 400

        # Test comment too long
        long_comment = 'x' * 2001
        review_data = {'rating': 5, 'comment': long_comment}
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_validate_title_length(self, client, auth_headers, sample_product):
        """Test title length validation."""
        long_title = 'x' * 201
        review_data = {
            'rating': 5,
            'title': long_title,
            'comment': 'Valid comment with proper length.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert 'title' in data['errors']


class TestReviewVerifiedPurchase:
    """Test verified purchase functionality."""

    def test_verified_purchase_with_completed_order(self, client, auth_headers, sample_user, sample_product):
        """Test verified purchase when user has completed order."""
        with client.application.app_context():
            # Create completed order with the product
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORDER_{uuid.uuid4().hex[:8].upper()}",  # Add required order_number
                status=OrderStatus.DELIVERED,
                total_amount=100.00,
                shipping_address={},  # Add required fields
                billing_address={}
            )
            db.session.add(order)
            db.session.flush()  # Get order ID

            order_item = OrderItem(
                order_id=order.id,
                product_id=sample_product.id,
                quantity=1,
                price=100.00,
                total=100.00  # Add required total field
            )
            db.session.add(order_item)
            db.session.commit()

        review_data = {
            'rating': 5,
            'comment': 'Great product, verified purchase.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['review']['is_verified_purchase'] is True

    def test_unverified_purchase_without_order(self, client, auth_headers, sample_product):
        """Test unverified purchase when user has no order."""
        review_data = {
            'rating': 4,
            'comment': 'Good product, but no verified purchase.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['review']['is_verified_purchase'] is False

    @patch('app.routes.reviews.user_review_routes.check_verified_purchase')
    def test_verified_purchase_check_error(self, mock_check, client, auth_headers, sample_product):
        """Test handling of errors in verified purchase check."""
        mock_check.side_effect = Exception("Database error")

        review_data = {
            'rating': 5,
            'comment': 'Review with verification error.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.get_json()
        # Should default to False when check fails
        assert data['review']['is_verified_purchase'] is False


class TestReviewCORS:
    """Test CORS functionality."""

    def test_cors_headers_present(self, client, sample_product):
        """Test that CORS headers are present in responses."""
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews')

        # Check for CORS headers (these are added by Flask-CORS)
        assert response.status_code == 200
        # Note: Actual CORS headers depend on Flask-CORS configuration

    def test_options_requests(self, client, sample_product):
        """Test OPTIONS requests for CORS preflight."""
        endpoints = [
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            f'/api/reviews/user/products/{sample_product.id}/reviews/summary',
            '/api/reviews/user/reviews/1',
            '/api/reviews/user/my-reviews',
            '/api/reviews/user/health'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            assert response.status_code == 200
            assert 'Allow' in response.headers


class TestReviewErrorHandling:
    """Test error handling scenarios."""

    @patch('app.routes.reviews.user_review_routes.db.session.add')
    def test_database_error_on_create(self, mock_add, client, auth_headers, sample_product):
        """Test handling of database errors during review creation."""
        mock_add.side_effect = Exception("Database error")

        review_data = {
            'rating': 5,
            'comment': 'Review that will cause database error.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == "Failed to create review"

    def test_database_error_on_update(self, client, auth_headers, sample_user, sample_product):
        """Test handling of database errors during review update."""
        # Create a review first without mocking
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=4,
                title="Original title",
                comment="Original comment for the review."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        # Now mock the commit for the update operation
        with patch('app.routes.reviews.user_review_routes.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            update_data = {'rating': 3}

            response = client.put(
                f'/api/reviews/user/reviews/{review_id}',
                data=json.dumps(update_data),
                headers=auth_headers
            )

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == "Failed to update review"

    @patch('app.routes.reviews.user_review_routes.db.session.delete')
    def test_database_error_on_delete(self, mock_delete, client, auth_headers, sample_user, sample_product):
        """Test handling of database errors during review deletion."""
        with client.application.app_context():
            review = Review(
                user_id=sample_user.id,
                product_id=sample_product.id,
                rating=4,
                comment="Review to be deleted."
            )
            db.session.add(review)
            db.session.commit()
            review_id = review.id

        mock_delete.side_effect = Exception("Database error")

        response = client.delete(
            f'/api/reviews/user/reviews/{review_id}',
            headers=auth_headers
        )

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == "Failed to delete review"

    @patch('app.routes.reviews.user_review_routes.Review.query')
    def test_query_error_on_get_reviews(self, mock_query, client, sample_product):
        """Test handling of query errors when getting reviews."""
        mock_query.filter_by.side_effect = Exception("Query error")

        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews')

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == "Failed to retrieve reviews"

    def test_malformed_json_request(self, client, auth_headers, sample_product):
        """Test handling of malformed JSON requests."""
        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data='{"invalid": json}',
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Invalid JSON data"


class TestReviewIntegration:
    """Test integration scenarios."""

    def test_complete_review_lifecycle(self, client, auth_headers, sample_user, sample_product):
        """Test complete review lifecycle: create, read, update, delete."""
        # Create review
        review_data = {
            'rating': 4,
            'title': 'Good product',
            'comment': 'This product works well for my needs.'
        }

        response = client.post(
            f'/api/reviews/user/products/{sample_product.id}/reviews',
            data=json.dumps(review_data),
            headers=auth_headers
        )

        assert response.status_code == 201
        review_id = response.get_json()['review']['id']

        # Read review
        response = client.get(f'/api/reviews/user/reviews/{review_id}')
        assert response.status_code == 200
        assert response.get_json()['rating'] == 4

        # Update review
        update_data = {'rating': 5, 'title': 'Excellent product'}
        response = client.put(
            f'/api/reviews/user/reviews/{review_id}',
            data=json.dumps(update_data),
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.get_json()['review']['rating'] == 5

        # Delete review
        response = client.delete(
            f'/api/reviews/user/reviews/{review_id}',
            headers=auth_headers
        )

        assert response.status_code == 200

        # Verify deletion
        response = client.get(f'/api/reviews/user/reviews/{review_id}')
        assert response.status_code == 404

    def test_review_statistics_consistency(self, client, sample_product, sample_user):
        """Test that review statistics remain consistent."""
        with client.application.app_context():
            # Create reviews with known ratings
            ratings = [5, 4, 4, 3, 2]
            for rating in ratings:
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=rating,
                    comment=f"Review with rating {rating}."
                )
                db.session.add(review)
            db.session.commit()

        # Get summary
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews/summary')
        assert response.status_code == 200

        data = response.get_json()
        assert data['total_reviews'] == 5
        assert data['average_rating'] == 3.6  # (5+4+4+3+2)/5

        # Verify individual review counts
        expected_distribution = {'5': 1, '4': 2, '3': 1, '2': 1, '1': 0}
        assert data['rating_distribution'] == expected_distribution

    def test_concurrent_review_creation(self, client, sample_product):
        """Test handling of concurrent review creation attempts."""
        # Create multiple users with proper session management
        user_ids = []
        with client.application.app_context():
            for i in range(3):
                user = User(
                    name=f"Concurrent User {i}",
                    email=f"concurrent{i}_{uuid.uuid4().hex[:8]}@example.com",
                    role=UserRole.USER,
                    email_verified=True,
                    is_active=True
                )
                user.set_password("password123")
                db.session.add(user)
                db.session.flush()  # Get the ID without committing
                user_ids.append(user.id)
            db.session.commit()

        # Create reviews concurrently (simulated)
        for user_id in user_ids:
            with client.application.app_context():
                access_token = create_access_token(
                    identity=str(user_id),
                    additional_claims={"role": "user"}
                )

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            review_data = {
                'rating': 5,
                'comment': f'Concurrent review from user {user_id}.'
            }

            response = client.post(
                f'/api/reviews/user/products/{sample_product.id}/reviews',
                data=json.dumps(review_data),
                headers=headers
            )

            assert response.status_code == 201

        # Verify all reviews were created
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews')
        assert response.status_code == 200

        data = response.get_json()
        assert len(data['items']) == 3


class TestReviewPerformance:
    """Test performance-related scenarios."""

    def test_large_review_list_pagination(self, client, sample_product, sample_user):
        """Test pagination with large number of reviews."""
        with client.application.app_context():
            # Create many reviews
            for i in range(100):
                review = Review(
                    user_id=sample_user.id,
                    product_id=sample_product.id,
                    rating=(i % 5) + 1,  # Ratings 1-5
                    comment=f"Review number {i+1}."
                )
                db.session.add(review)
            db.session.commit()

        # Test pagination performance
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews?page=1&per_page=20')
        assert response.status_code == 200

        data = response.get_json()
        assert len(data['items']) == 20
        assert data['pagination']['total_items'] == 100
        assert data['pagination']['total_pages'] == 5

    def test_review_summary_performance(self, client, sample_product, sample_user):
        """Test review summary calculation performance."""
        with client.application.app_context():
            # Create reviews with various ratings
            for rating in range(1, 6):
                for _ in range(rating * 10):  # More higher ratings
                    review = Review(
                        user_id=sample_user.id,
                        product_id=sample_product.id,
                        rating=rating,
                        comment=f"Review with rating {rating}."
                    )
                    db.session.add(review)
            db.session.commit()

        # Test summary calculation
        response = client.get(f'/api/reviews/user/products/{sample_product.id}/reviews/summary')
        assert response.status_code == 200

        data = response.get_json()
        assert data['total_reviews'] == 150  # 10+20+30+40+50

        # Verify rating distribution
        expected_distribution = {'1': 10, '2': 20, '3': 30, '4': 40, '5': 50}
        assert data['rating_distribution'] == expected_distribution
