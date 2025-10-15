"""
User Review routes for Mizizzi E-commerce platform.
Handles user-facing review functionality including creating, updating, and viewing reviews.
"""
# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response
from flask_cors import cross_origin
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt
)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func, and_, text

try:
    from app.configuration.extensions import db, ma, mail, cache, cors
except ImportError:
    try:
        from app.configuration.extensions import db, ma, mail, cache, cors
    except ImportError:
        # Fallback imports
        from flask_sqlalchemy import SQLAlchemy
        from flask_marshmallow import Marshmallow
        from flask_mail import Mail
        from flask_caching import Cache
        from flask_cors import CORS

        db = SQLAlchemy()
        ma = Marshmallow()
        mail = Mail()
        cache = Cache()
        cors = CORS()

# Models
try:
    from app.models.models import (
        User, UserRole, Category, Product, ProductVariant, Brand, Review,
        CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
        OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
        ProductImage
    )
except ImportError:
    try:
        from app.models.models import (
            User, UserRole, Category, Product, ProductVariant, Brand, Review,
            CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
            OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
            ProductImage
        )
    except ImportError:
        # Create minimal model classes for fallback
        class User:
            pass
        class UserRole:
            ADMIN = 'admin'
            USER = 'user'
        class Review:
            pass
        class Product:
            pass
        class Order:
            pass
        class OrderItem:
            pass

# Schemas
try:
    from app.schemas.schemas import (
        user_schema, users_schema, category_schema, categories_schema,
        product_schema, products_schema, brand_schema, brands_schema,
        review_schema, reviews_schema, cart_item_schema, cart_items_schema,
        order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
        coupon_schema, coupons_schema, payment_schema, payments_schema,
        product_variant_schema, product_variants_schema,
        address_schema, addresses_schema,
        product_images_schema, product_image_schema
    )
except ImportError:
    try:
        from app.schemas.schemas import (
            user_schema, users_schema, category_schema, categories_schema,
            product_schema, products_schema, brand_schema, brands_schema,
            review_schema, reviews_schema, cart_item_schema, cart_items_schema,
            order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
            coupon_schema, coupons_schema, payment_schema, payments_schema,
            product_variant_schema, product_variants_schema,
            address_schema, addresses_schema,
            product_images_schema, product_image_schema
        )
    except ImportError:
        # Create minimal schema classes for fallback
        class Schema:
            def dump(self, obj):
                return {}
            def dumps(self, obj):
                return []

        review_schema = Schema()
        reviews_schema = Schema()

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
user_review_routes = Blueprint('user_review_routes', __name__)

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 items per page
    return page, per_page

def serialize_review(review, include_user=True, include_product=True):
    """Serialize a review object to a JSON-safe dictionary."""
    try:
        # Get the basic review data
        data = {
            'id': review.id,
            'user_id': review.user_id,
            'product_id': review.product_id,
            'rating': review.rating,
            'comment': review.comment if hasattr(review, 'comment') else '',
            'title': review.title if hasattr(review, 'title') else '',
            'is_verified_purchase': review.is_verified_purchase if hasattr(review, 'is_verified_purchase') else False,
            'created_at': review.created_at.isoformat() if hasattr(review, 'created_at') and review.created_at else None,
            'updated_at': review.updated_at.isoformat() if hasattr(review, 'updated_at') and review.updated_at else None
        }

        # Add user information if available and requested
        if include_user and hasattr(review, 'user') and review.user:
            data['user'] = {
                'id': review.user.id,
                'name': review.user.name if hasattr(review.user, 'name') else '',
                'role': review.user.role.value if hasattr(review.user, 'role') and hasattr(review.user.role, 'value') else str(review.user.role) if hasattr(review.user, 'role') else 'user'
            }

        # Add product information if available and requested
        if include_product and hasattr(review, 'product') and review.product:
            data['product'] = {
                'id': review.product.id,
                'name': review.product.name if hasattr(review.product, 'name') else '',
                'slug': review.product.slug if hasattr(review.product, 'slug') else ''
            }

        return data
    except Exception as e:
        logger.error(f"Error serializing review: {str(e)}")
        # Return minimal data if serialization fails
        return {
            'id': getattr(review, 'id', None),
            'rating': getattr(review, 'rating', 0),
            'comment': getattr(review, 'comment', ''),
            'created_at': getattr(review, 'created_at', datetime.utcnow()).isoformat()
        }

def serialize_reviews(reviews, include_user=True, include_product=True):
    """Serialize a list of review objects."""
    return [serialize_review(review, include_user, include_product) for review in reviews]

def validate_review_data(data, is_update=False):
    """Validate review data."""
    errors = {}

    # Rating validation (required for creation, optional for update)
    if not is_update or 'rating' in data:
        if 'rating' not in data or data['rating'] is None:
            if not is_update:
                errors['rating'] = [{"message": "Rating is required", "code": "required"}]
        else:
            if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
                errors['rating'] = [{"message": "Rating must be between 1 and 5", "code": "invalid_value"}]

    # Comment validation (optional)
    if 'comment' in data and data['comment']:
        if len(data['comment']) > 2000:
            errors['comment'] = [{"message": "Comment must be less than 2000 characters", "code": "max_length"}]
        if len(data['comment']) < 10:
            errors['comment'] = [{"message": "Comment must be at least 10 characters", "code": "min_length"}]

    # Title validation (optional)
    if 'title' in data and data['title']:
        if len(data['title']) > 200:
            errors['title'] = [{"message": "Title must be less than 200 characters", "code": "max_length"}]

    return errors

def check_verified_purchase(user_id, product_id):
    """Check if user has purchased the product."""
    try:
        # Check if user has completed order with this product
        order_item = db.session.query(OrderItem).join(Order).filter(
            Order.user_id == user_id,
            OrderItem.product_id == product_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.SHIPPED])
        ).first()

        return order_item is not None
    except Exception as e:
        logger.error(f"Error checking verified purchase: {str(e)}")
        return False

# ----------------------
# Public Review Routes (No Authentication Required)
# ----------------------

@user_review_routes.route('/products/<int:product_id>/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_reviews(product_id):
    """Get all reviews for a specific product (public endpoint)."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Verify product exists
        product = Product.query.filter_by(id=product_id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404

        page, per_page = get_pagination_params()

        # Filter parameters
        rating = request.args.get('rating', type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        verified_only = request.args.get('verified_only', 'false').lower() == 'true'

        query = Review.query.filter_by(product_id=product_id)

        # Filter by rating if specified
        if rating and 1 <= rating <= 5:
            query = query.filter_by(rating=rating)

        # Filter by verified purchases only
        if verified_only:
            query = query.filter_by(is_verified_purchase=True)

        # Order by specified field
        valid_sort_fields = ['created_at', 'updated_at', 'rating', 'id']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'

        if sort_order.lower() == 'desc':
            query = query.order_by(desc(getattr(Review, sort_by)))
        else:
            query = query.order_by(getattr(Review, sort_by))

        # Get paginated results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "items": serialize_reviews(paginated.items, include_user=True, include_product=False),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting product reviews: {str(e)}")
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@user_review_routes.route('/products/<int:product_id>/reviews/summary', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_review_summary(product_id):
    """Get review summary for a product (public endpoint)."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Verify product exists
        product = Product.query.filter_by(id=product_id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Get review statistics using simpler queries for better compatibility
        reviews = Review.query.filter_by(product_id=product_id).all()

        if not reviews:
            return jsonify({
                "total_reviews": 0,
                "average_rating": 0,
                "verified_reviews": 0,
                "rating_distribution": {
                    "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
                }
            }), 200

        total_reviews = len(reviews)
        average_rating = sum(review.rating for review in reviews) / total_reviews if total_reviews > 0 else 0
        verified_reviews = sum(1 for review in reviews if review.is_verified_purchase)

        # Calculate rating distribution
        rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in reviews:
            rating_distribution[str(review.rating)] += 1

        return jsonify({
            "total_reviews": total_reviews,
            "average_rating": round(average_rating, 2),
            "verified_reviews": verified_reviews,
            "rating_distribution": rating_distribution
        }), 200

    except Exception as e:
        logger.error(f"Error getting review summary: {str(e)}")
        return jsonify({"error": "Failed to retrieve review summary", "details": str(e)}), 500

@user_review_routes.route('/reviews/<int:review_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_review(review_id):
    """Get review by ID (public endpoint)."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.filter_by(id=review_id).first()
        if not review:
            return jsonify({"error": "Review not found"}), 404
        return jsonify(serialize_review(review)), 200

    except Exception as e:
        logger.error(f"Error getting review: {str(e)}")
        return jsonify({"error": "Failed to retrieve review", "details": str(e)}), 500

# ----------------------
# Authenticated User Review Routes
# ----------------------

@user_review_routes.route('/products/<int:product_id>/reviews', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_review(product_id):
    """Create a new review for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        user_id = int(get_jwt_identity())

        # Handle empty request body
        try:
            data = request.get_json()
            if data is None:  # Changed from 'not data' to 'data is None'
                return jsonify({"error": "No data provided"}), 400
        except Exception as e:
            return jsonify({"error": "Invalid JSON data"}), 400

        # Validate review data
        validation_errors = validate_review_data(data, is_update=False)
        if validation_errors:
            return jsonify({
                "error": "Validation failed",
                "errors": validation_errors
            }), 400

        # Check if user already reviewed this product
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()

        if existing_review:
            return jsonify({"error": "You have already reviewed this product"}), 409

        # Verify product exists
        product = Product.query.filter_by(id=product_id).first()
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Check if this is a verified purchase
        is_verified_purchase = check_verified_purchase(user_id, product_id)

        # Create new review
        new_review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=data['rating'],
            comment=data.get('comment', ''),
            title=data.get('title', ''),
            is_verified_purchase=is_verified_purchase
        )

        db.session.add(new_review)
        db.session.commit()

        return jsonify({
            "message": "Review created successfully",
            "review": serialize_review(new_review)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating review: {str(e)}")
        return jsonify({"error": "Failed to create review", "details": str(e)}), 500

@user_review_routes.route('/reviews/<int:review_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_review(review_id):
    """Update user's own review."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # First check if review exists
        review = Review.query.filter_by(id=review_id).first()
        if not review:
            return jsonify({"error": "Review not found"}), 404

        user_id = int(get_jwt_identity())

        # Check if user owns this review
        if review.user_id != user_id:
            return jsonify({"error": "Unauthorized to update this review"}), 403

        # Handle empty request body
        try:
            data = request.get_json()
            if data is None:  # Changed from 'not data' to 'data is None'
                return jsonify({"error": "No data provided"}), 400
        except Exception as e:
            return jsonify({"error": "Invalid JSON data"}), 400

        # Validate review data
        validation_errors = validate_review_data(data, is_update=True)
        if validation_errors:
            return jsonify({
                "error": "Validation failed",
                "errors": validation_errors
            }), 400

        # Update fields
        if 'rating' in data:
            review.rating = data['rating']

        if 'comment' in data:
            review.comment = data['comment']

        if 'title' in data:
            review.title = data['title']

        review.updated_at = datetime.utcnow()

        # Commit the changes - this is where database errors might occur
        db.session.commit()

        return jsonify({
            "message": "Review updated successfully",
            "review": serialize_review(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating review: {str(e)}")
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@user_review_routes.route('/reviews/<int:review_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_review(review_id):
    """Delete user's own review."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.filter_by(id=review_id).first()
        if not review:
            return jsonify({"error": "Review not found"}), 404

        user_id = int(get_jwt_identity())

        # Check if user owns this review
        if review.user_id != user_id:
            return jsonify({"error": "Unauthorized to delete this review"}), 403

        db.session.delete(review)
        db.session.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting review: {str(e)}")
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

@user_review_routes.route('/my-reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_my_reviews():
    """Get current user's reviews."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        user_id = int(get_jwt_identity())
        page, per_page = get_pagination_params()

        # Filter parameters
        product_id = request.args.get('product_id', type=int)
        rating = request.args.get('rating', type=int)

        query = Review.query.filter_by(user_id=user_id)

        if product_id:
            query = query.filter_by(product_id=product_id)

        if rating and 1 <= rating <= 5:
            query = query.filter_by(rating=rating)

        # Order by creation date (newest first)
        query = query.order_by(desc(Review.created_at))

        # Get paginated results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "items": serialize_reviews(paginated.items, include_user=False, include_product=True),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting user reviews: {str(e)}")
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@user_review_routes.route('/reviews/<int:review_id>/helpful', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def mark_review_helpful(review_id):
    """Mark a review as helpful."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.filter_by(id=review_id).first()
        if not review:
            return jsonify({"error": "Review not found"}), 404

        user_id = int(get_jwt_identity())

        # For now, just return success - you can implement helpful votes later
        return jsonify({
            "message": "Review marked as helpful",
            "review_id": review_id
        }), 200

    except Exception as e:
        logger.error(f"Error marking review as helpful: {str(e)}")
        return jsonify({"error": "Failed to mark review as helpful", "details": str(e)}), 500

# ----------------------
# Health Check
# ----------------------

@user_review_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def user_review_health_check():
    """Health check for user review routes."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    return jsonify({
        "status": "ok",
        "service": "user_review_routes",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "GET /products/<int:product_id>/reviews",
            "POST /products/<int:product_id>/reviews",
            "GET /products/<int:product_id>/reviews/summary",
            "GET /reviews/<int:review_id>",
            "PUT /reviews/<int:review_id>",
            "DELETE /reviews/<int:review_id>",
            "GET /my-reviews",
            "POST /reviews/<int:review_id>/helpful"
        ]
    }), 200
