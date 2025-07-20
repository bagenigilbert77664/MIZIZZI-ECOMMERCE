"""
Review routes for Mizizzi E-commerce platform.
Handles product reviews and ratings.
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
from flask import Blueprint, request, jsonify, g, current_app, make_response, render_template_string, url_for, redirect
from flask_cors import cross_origin
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies
)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func

try:
    from ...configuration.extensions import db, ma, mail, cache, cors
except ImportError:
    try:
        from ...configuration.extensions import db, ma, mail, cache, cors
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
    from ...models.models import (
        User, UserRole, Category, Product, ProductVariant, Brand, Review,
        CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
        OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
        ProductImage
    )
except ImportError:
    try:
        from ...models.models import (
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
        class Review:
            pass
        class Product:
            pass

# Schemas
try:
    from ...schemas.schemas import (
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
        from ...schemas.schemas import (
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

# Validations & Decorators
try:
    from ...validations.validation import (
        validate_user_registration, validate_user_login, validate_user_update,
        validate_address_creation, validate_address_update,
        validate_product_creation, validate_product_update,
        validate_product_variant_creation, validate_product_variant_update,
        validate_cart_item_addition, validate_cart_item_update,
        validate_order_creation, validate_order_status_update,
        validate_payment_creation, validate_mpesa_payment,
        validate_review_creation, validate_review_update,
        admin_required
    )
except ImportError:
    # Create minimal decorator for fallback
    def admin_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            return f(*args, **kwargs)
        return decorated_function

    def validate_review_creation(data):
        return True, None

    def validate_review_update(data):
        return True, None

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
review_routes = Blueprint('review_routes', __name__)

# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    try:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": schema.dump(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }
    except Exception as e:
        logger.error(f"Pagination error: {str(e)}")
        return {
            "items": [],
            "pagination": {
                "page": 1,
                "per_page": per_page,
                "total_pages": 0,
                "total_items": 0
            }
        }

def serialize_review(review):
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

        # Add user information if available
        if hasattr(review, 'user') and review.user:
            data['user'] = {
                'id': review.user.id,
                'name': review.user.name if hasattr(review.user, 'name') else '',
                'email': review.user.email if hasattr(review.user, 'email') else '',
                'role': review.user.role.value if hasattr(review.user, 'role') and hasattr(review.user.role, 'value') else str(review.user.role) if hasattr(review.user, 'role') else 'user'
            }

        # Add product information if available
        if hasattr(review, 'product') and review.product:
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

def serialize_reviews(reviews):
    """Serialize a list of review objects."""
    return [serialize_review(review) for review in reviews]

# ----------------------
# Review Routes
# ----------------------

@review_routes.route('/', methods=['GET', 'OPTIONS'])
@review_routes.route('', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_reviews():
    """Get all reviews with pagination and filtering."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        rating = request.args.get('rating', type=int)

        query = Review.query

        if product_id:
            query = query.filter_by(product_id=product_id)

        if user_id:
            query = query.filter_by(user_id=user_id)

        if rating:
            query = query.filter_by(rating=rating)

        # Order by creation date
        query = query.order_by(desc(Review.id))

        # Get paginated results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "items": serialize_reviews(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting reviews: {str(e)}")
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@review_routes.route('/<int:review_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_review(review_id):
    """Get review by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.get_or_404(review_id)
        return jsonify(serialize_review(review)), 200

    except Exception as e:
        logger.error(f"Error getting review: {str(e)}")
        return jsonify({"error": "Failed to retrieve review", "details": str(e)}), 500

@review_routes.route('/products/<int:product_id>/reviews', methods=['POST', 'OPTIONS'])
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
        data = request.get_json()
        user_id = get_jwt_identity()

        # Validate required fields
        required_fields = ['rating']
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "error": "Validation failed",
                    "errors": {field: [{"message": f"{field.title()} is required", "code": "required"}]}
                }), 400

        # Validate rating range
        if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({
                "error": "Validation failed",
                "errors": {"rating": [{"message": "Rating must be between 1 and 5", "code": "invalid_value"}]}
            }), 400

        # Check if user already reviewed this product
        existing_review = Review.query.filter_by(
            user_id=user_id,
            product_id=product_id
        ).first()

        if existing_review:
            return jsonify({"error": "You have already reviewed this product"}), 409

        # Verify product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        new_review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=data['rating'],
            comment=data.get('comment', ''),
            title=data.get('title', ''),
            is_verified_purchase=data.get('is_verified_purchase', False)
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

@review_routes.route('/<int:review_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_review(review_id):
    """Update a review."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.get_or_404(review_id)
        user_id = get_jwt_identity()
        data = request.get_json()

        # Check if user owns this review or is admin
        user = User.query.get(user_id)
        if review.user_id != user_id and (not user or user.role != UserRole.ADMIN):
            return jsonify({"error": "Unauthorized to update this review"}), 403

        # Update fields
        if 'rating' in data:
            if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
                return jsonify({
                    "error": "Validation failed",
                    "errors": {"rating": [{"message": "Rating must be between 1 and 5", "code": "invalid_value"}]}
                }), 400
            review.rating = data['rating']

        if 'comment' in data:
            review.comment = data['comment']

        if 'title' in data:
            review.title = data['title']

        if 'is_verified_purchase' in data and user.role == UserRole.ADMIN:
            review.is_verified_purchase = data['is_verified_purchase']

        review.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Review updated successfully",
            "review": serialize_review(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating review: {str(e)}")
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@review_routes.route('/<int:review_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_review(review_id):
    """Delete a review."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        review = Review.query.get_or_404(review_id)
        user_id = get_jwt_identity()

        # Check if user owns this review or is admin
        user = User.query.get(user_id)
        if review.user_id != user_id and (not user or user.role != UserRole.ADMIN):
            return jsonify({"error": "Unauthorized to delete this review"}), 403

        db.session.delete(review)
        db.session.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting review: {str(e)}")
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

@review_routes.route('/products/<int:product_id>/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_reviews(product_id):
    """Get all reviews for a specific product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Verify product exists
        product = Product.query.get_or_404(product_id)

        page, per_page = get_pagination_params()

        # Filter parameters
        rating = request.args.get('rating', type=int)
        sort_by = request.args.get('sort_by', 'id')
        sort_order = request.args.get('sort_order', 'desc')

        query = Review.query.filter_by(product_id=product_id)

        if rating:
            query = query.filter_by(rating=rating)

        # Order by specified field
        if sort_order.lower() == 'desc':
            query = query.order_by(desc(getattr(Review, sort_by, Review.id)))
        else:
            query = query.order_by(getattr(Review, sort_by, Review.id))

        # Get paginated results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "items": serialize_reviews(paginated.items),
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

@review_routes.route('/products/<int:product_id>/reviews/summary', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_review_summary(product_id):
    """Get review summary for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Verify product exists
        product = Product.query.get_or_404(product_id)

        # Get review statistics
        reviews = Review.query.filter_by(product_id=product_id).all()

        if not reviews:
            return jsonify({
                "total_reviews": 0,
                "average_rating": 0,
                "rating_distribution": {
                    "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
                }
            }), 200

        total_reviews = len(reviews)
        total_rating = sum(review.rating for review in reviews)
        average_rating = round(total_rating / total_reviews, 2)

        # Rating distribution
        rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in reviews:
            rating_distribution[str(review.rating)] += 1

        return jsonify({
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "rating_distribution": rating_distribution
        }), 200

    except Exception as e:
        logger.error(f"Error getting review summary: {str(e)}")
        return jsonify({"error": "Failed to retrieve review summary", "details": str(e)}), 500

@review_routes.route('/<int:review_id>/helpful', methods=['POST', 'OPTIONS'])
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
        review = Review.query.get_or_404(review_id)
        user_id = get_jwt_identity()

        # For now, just return success - you can implement helpful votes later
        return jsonify({
            "message": "Review marked as helpful",
            "review_id": review_id
        }), 200

    except Exception as e:
        logger.error(f"Error marking review as helpful: {str(e)}")
        return jsonify({"error": "Failed to mark review as helpful", "details": str(e)}), 500

# Export the blueprint with the correct name for import
validation_routes = review_routes  # Alias for backward compatibility

# Health check endpoint
@review_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def review_health_check():
    """Health check for review routes."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    return jsonify({
        "status": "ok",
        "service": "review_routes",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/products/<int:product_id>/reviews",
            "/<int:review_id>",
            "/<int:review_id>/helpful",
            "/products/<int:product_id>/reviews/summary"
        ]
    }), 200
