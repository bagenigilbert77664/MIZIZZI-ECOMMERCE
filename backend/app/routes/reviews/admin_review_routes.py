"""Admin Review routes for Mizizzi E-commerce platform.
Handles admin-specific review management functionality."""

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
    jwt_required, get_jwt_identity, get_jwt)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

# Database & ORM
from sqlalchemy import or_, desc, func, and_, text, extract

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

# Validations & Decorators
try:
    from app.validations.validation import (
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
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                user = db.session.get(User, current_user_id)
                if not user or user.role != UserRole.ADMIN:
                    return jsonify({"error": "Admin access required"}), 403
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({"error": "Unauthorized", "details": str(e)}), 401
        return decorated_function

    def validate_review_creation(data):
        return True, None

    def validate_review_update(data):
        return True, None

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_review_routes = Blueprint('admin_review_routes', __name__)

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 items per page
    return page, per_page

def serialize_review_admin(review, include_user=True, include_product=True):
    """Serialize a review object to a JSON-safe dictionary with admin details."""
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

        # Add user information if available and requested (with admin details)
        if include_user and hasattr(review, 'user') and review.user:
            # Fix: Convert UserRole enum to string properly
            user_role = review.user.role
            if hasattr(user_role, 'value'):
                role_str = user_role.value
            elif hasattr(user_role, 'name'):
                role_str = user_role.name
            else:
                role_str = str(user_role)

            data['user'] = {
                'id': review.user.id,
                'name': review.user.name if hasattr(review.user, 'name') else '',
                'email': review.user.email if hasattr(review.user, 'email') else '',
                'role': role_str,
                'created_at': review.user.created_at.isoformat() if hasattr(review.user, 'created_at') and review.user.created_at else None
            }

        # Add product information if available and requested (with admin details)
        if include_product and hasattr(review, 'product') and review.product:
            data['product'] = {
                'id': review.product.id,
                'name': review.product.name if hasattr(review.product, 'name') else '',
                'slug': review.product.slug if hasattr(review.product, 'slug') else '',
                'price': float(review.product.price) if hasattr(review.product, 'price') and review.product.price else None,
                'is_active': review.product.is_active if hasattr(review.product, 'is_active') else None
            }

        return data

    except Exception as e:
        logger.error(f"Error serializing review for admin: {str(e)}")
        # Return minimal data if serialization fails
        return {
            'id': getattr(review, 'id', None),
            'rating': getattr(review, 'rating', 0),
            'comment': getattr(review, 'comment', ''),
            'created_at': getattr(review, 'created_at', datetime.utcnow()).isoformat()
        }

def serialize_reviews_admin(reviews, include_user=True, include_product=True):
    """Serialize a list of review objects for admin."""
    return [serialize_review_admin(review, include_user, include_product) for review in reviews]

def handle_options(allowed_methods):
    """Handle OPTIONS requests with proper CORS headers."""
    response = make_response()
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = allowed_methods
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

def get_sqlite_date_format(period, date_field):
    """Get SQLite-compatible date formatting for different periods."""
    if period == 'month':
        return func.strftime('%Y-%m', date_field)
    elif period == 'day':
        return func.strftime('%Y-%m-%d', date_field)
    elif period == 'year':
        return func.strftime('%Y', date_field)
    else:
        return func.strftime('%Y-%m', date_field)

# ----------------------
# Admin Review Management Routes
# ----------------------

@admin_review_routes.route('/all', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_all_reviews():
    """Get all reviews with advanced filtering (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        page, per_page = get_pagination_params()

        # Advanced filter parameters
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        rating = request.args.get('rating', type=int)
        verified_only = request.args.get('verified_only', 'false').lower() == 'true'
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        query = Review.query

        # Apply filters
        if product_id:
            query = query.filter_by(product_id=product_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        if rating and 1 <= rating <= 5:
            query = query.filter_by(rating=rating)
        if verified_only:
            query = query.filter_by(is_verified_purchase=True)

        # Date range filter
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(Review.created_at >= date_from_obj)
            except ValueError:
                pass

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(Review.created_at <= date_to_obj)
            except ValueError:
                pass

        # Search in comment and title
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Review.comment.ilike(search_term),
                    Review.title.ilike(search_term)
                )
            )

        # Sorting
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
            "items": serialize_reviews_admin(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            },
            "filters": {
                "product_id": product_id,
                "user_id": user_id,
                "rating": rating,
                "verified_only": verified_only,
                "date_from": date_from,
                "date_to": date_to,
                "search": search
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting all reviews: {str(e)}")
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@admin_review_routes.route('/<int:review_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_review_admin(review_id):
    """Get review by ID with admin details."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        try:
            review = db.session.get(Review, review_id)
            if not review:
                return jsonify({"error": "Review not found"}), 404
        except SQLAlchemyError as db_error:
            logger.error(f"Database error getting review {review_id}: {str(db_error)}")
            return jsonify({"error": f"Database error: {str(db_error)}"}), 500

        return jsonify(serialize_review_admin(review)), 200

    except Exception as e:
        logger.error(f"Error getting review: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@admin_review_routes.route('/<int:review_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
def update_review_admin(review_id):
    """Update any review (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        review = db.session.get(Review, review_id)
        if not review:
            return jsonify({"error": "Review not found"}), 404

        try:
            data = request.get_json()
        except Exception as json_error:
            return jsonify({"error": "Invalid JSON format", "details": str(json_error)}), 400

        # Validate request data
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields (admin can update any field)
        if 'rating' in data:
            if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
                return jsonify({
                    "error": "Validation failed",
                    "errors": {
                        "rating": [{
                            "message": "Rating must be between 1 and 5",
                            "code": "invalid_value"
                        }]
                    }
                }), 400
            review.rating = data['rating']

        if 'comment' in data:
            review.comment = data['comment']

        if 'title' in data:
            review.title = data['title']

        if 'is_verified_purchase' in data:
            review.is_verified_purchase = data['is_verified_purchase']

        review.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Review updated successfully",
            "review": serialize_review_admin(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating review: {str(e)}")
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@admin_review_routes.route('/<int:review_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
def delete_review_admin(review_id):
    """Delete any review (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        review = db.session.get(Review, review_id)
        if not review:
            return jsonify({"error": "Review not found"}), 404

        db.session.delete(review)
        db.session.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting review: {str(e)}")
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

@admin_review_routes.route('/bulk-delete', methods=['POST', 'OPTIONS'])
@cross_origin()
def bulk_delete_reviews():
    """Bulk delete reviews (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        data = request.get_json()
        if not data or 'review_ids' not in data:
            return jsonify({"error": "No review IDs provided"}), 400

        review_ids = data['review_ids']
        if not isinstance(review_ids, list) or not review_ids:
            return jsonify({"error": "Invalid review IDs format"}), 400

        # Delete reviews
        deleted_count = Review.query.filter(Review.id.in_(review_ids)).delete(synchronize_session=False)
        db.session.commit()

        return jsonify({
            "message": f"Successfully deleted {deleted_count} reviews",
            "deleted_count": deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error bulk deleting reviews: {str(e)}")
        return jsonify({"error": "Failed to delete reviews", "details": str(e)}), 500

@admin_review_routes.route('/analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_review_analytics():
    """Get review analytics (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        # Date range parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        base_query = Review.query

        # Apply date filters if provided
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                base_query = base_query.filter(Review.created_at >= date_from_obj)
            except ValueError:
                pass

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                base_query = base_query.filter(Review.created_at <= date_to_obj)
            except ValueError:
                pass

        # Get filtered review IDs for consistent filtering across all queries
        filtered_reviews = base_query.all()
        filtered_review_ids = [r.id for r in filtered_reviews]

        # Overall statistics
        total_reviews = len(filtered_review_ids)
        verified_reviews = sum(1 for r in filtered_reviews if r.is_verified_purchase) if filtered_reviews else 0

        # Rating distribution
        rating_stats = db.session.query(
            Review.rating,
            func.count(Review.id).label('count')
        ).filter(Review.id.in_(filtered_review_ids)).group_by(Review.rating).all() if filtered_review_ids else []

        rating_distribution = {str(i): 0 for i in range(1, 6)}
        total_rating_sum = 0
        for rating, count in rating_stats:
            rating_distribution[str(rating)] = count
            total_rating_sum += rating * count

        average_rating = round(total_rating_sum / total_reviews, 2) if total_reviews > 0 else 0

        # Reviews per month (last 12 months) - SQLite compatible
        monthly_stats = db.session.query(
            get_sqlite_date_format('month', Review.created_at).label('month'),
            func.count(Review.id).label('count')
        ).filter(
            Review.created_at >= datetime.now() - timedelta(days=365)
        ).group_by(get_sqlite_date_format('month', Review.created_at)).order_by('month').all()

        monthly_reviews = []
        for month, count in monthly_stats:
            monthly_reviews.append({
                'month': month if month else '',
                'count': count
            })

        # Top reviewed products
        top_products = db.session.query(
            Product.id,
            Product.name,
            func.count(Review.id).label('review_count'),
            func.avg(Review.rating).label('avg_rating')
        ).join(Review).filter(
            Review.id.in_(filtered_review_ids) if filtered_review_ids else False
        ).group_by(Product.id, Product.name).order_by(
            func.count(Review.id).desc()
        ).limit(10).all() if filtered_review_ids else []

        top_products_data = []
        for product_id, product_name, review_count, avg_rating in top_products:
            top_products_data.append({
                'product_id': product_id,
                'product_name': product_name,
                'review_count': review_count,
                'average_rating': round(float(avg_rating), 2) if avg_rating else 0
            })

        # Most active reviewers
        top_reviewers = db.session.query(
            User.id,
            User.name,
            User.email,
            func.count(Review.id).label('review_count'),
            func.avg(Review.rating).label('avg_rating')
        ).join(Review).filter(
            Review.id.in_(filtered_review_ids) if filtered_review_ids else False
        ).group_by(User.id, User.name, User.email).order_by(
            func.count(Review.id).desc()
        ).limit(10).all() if filtered_review_ids else []

        top_reviewers_data = []
        for user_id, user_name, user_email, review_count, avg_rating in top_reviewers:
            top_reviewers_data.append({
                'user_id': user_id,
                'user_name': user_name,
                'user_email': user_email,
                'review_count': review_count,
                'average_rating': round(float(avg_rating), 2) if avg_rating else 0
            })

        return jsonify({
            "total_reviews": total_reviews,
            "verified_reviews": verified_reviews,
            "verification_rate": round((verified_reviews / total_reviews * 100), 2) if total_reviews > 0 else 0,
            "average_rating": average_rating,
            "rating_distribution": rating_distribution,
            "monthly_reviews": monthly_reviews,
            "top_products": top_products_data,
            "top_reviewers": top_reviewers_data,
            "date_range": {
                "from": date_from,
                "to": date_to
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting review analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve analytics", "details": str(e)}), 500

@admin_review_routes.route('/moderate/<int:review_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
def moderate_review(review_id):
    """Moderate a review (admin only)."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Check admin authentication
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        try:
            verify_jwt_in_request()
        except Exception as jwt_error:
            return jsonify({"error": "Unauthorized", "details": str(jwt_error)}), 401

        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)

        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403

        review = db.session.get(Review, review_id)
        if not review:
            return jsonify({"error": "Review not found"}), 404

        try:
            data = request.get_json()
        except Exception as json_error:
            return jsonify({"error": "Invalid JSON format", "details": str(json_error)}), 400

        if not data or 'action' not in data:
            return jsonify({"error": "No moderation action provided"}), 400

        action = data['action']
        reason = data.get('reason', '')

        if action == 'approve':
            # Add approval logic here if you have a status field
            message = "Review approved successfully"
        elif action == 'reject':
            # Add rejection logic here
            message = "Review rejected successfully"
        elif action == 'flag':
            # Add flagging logic here
            message = "Review flagged successfully"
        else:
            return jsonify({"error": "Invalid moderation action"}), 400

        # Log moderation action
        logger.info(f"Review {review_id} moderated by admin: {action} - {reason}")
        db.session.commit()

        return jsonify({
            "message": message,
            "review": serialize_review_admin(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error moderating review: {str(e)}")
        return jsonify({"error": "Failed to moderate review", "details": str(e)}), 500

# ----------------------
# Health Check
# ----------------------

@admin_review_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def admin_review_health_check():
    """Health check for admin review routes."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    return jsonify({
        "status": "ok",
        "service": "admin_review_routes",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "GET /all",
            "GET /<int:review_id>",
            "PUT /<int:review_id>",
            "DELETE /<int:review_id>",
            "POST /bulk-delete",
            "GET /analytics",
            "POST /moderate/<int:review_id>"
        ]
    }), 200
