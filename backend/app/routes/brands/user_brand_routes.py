"""User brand routes for Mizizzi E-commerce platform.
Handles public brand viewing and browsing operations.
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
from datetime import datetime, timedelta, UTC
from functools import wraps
from json.decoder import JSONDecodeError

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
from werkzeug.exceptions import NotFound, BadRequest

# Database & ORM
from sqlalchemy import or_, desc, func

try:
    from ...configuration.extensions import db, ma, mail, cache, cors
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
    from ...models.models import (
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
        class Brand:
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

        brand_schema = Schema()
        brands_schema = Schema()
        products_schema = Schema()

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
user_brand_routes = Blueprint('user_brand_routes', __name__)

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

def create_cors_response(data=None, status_code=200):
    """Create a response with proper CORS headers."""
    if data is None:
        data = {'status': 'ok'}
    response = make_response(jsonify(data), status_code)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    return response

# ----------------------
# User Brand Routes (Public)
# ----------------------

@user_brand_routes.route('/', methods=['GET', 'OPTIONS'])
@user_brand_routes.route('', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brands():
    """Get all active brands with pagination and filtering."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        search = request.args.get('search') or request.args.get('q')
        featured_only = request.args.get('featured', '').lower() == 'true'

        # Only show active brands for public users
        query = Brand.query.filter_by(is_active=True)

        if search:
            query = query.filter(
                or_(
                    Brand.name.ilike(f'%{search}%'),
                    Brand.description.ilike(f'%{search}%')
                )
            )

        if featured_only:
            query = query.filter_by(is_featured=True)

        # Order by featured first, then by name
        query = query.order_by(Brand.is_featured.desc(), Brand.name.asc())

        return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

    except Exception as e:
        logger.error(f"Error getting brands: {str(e)}")
        return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

@user_brand_routes.route('/<int:brand_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand(brand_id):
    """Get active brand by ID."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        # Only show active brands for public users
        brand = Brand.query.filter_by(id=brand_id, is_active=True).first()
        if not brand:
            return jsonify({"error": "Brand not found"}), 404
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        logger.error(f"Error getting brand: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@user_brand_routes.route('/slug/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_by_slug(slug):
    """Get active brand by slug."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        # Only show active brands for public users
        brand = Brand.query.filter_by(slug=slug, is_active=True).first()
        if not brand:
            return jsonify({"error": "Brand not found"}), 404
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        logger.error(f"Error getting brand by slug: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@user_brand_routes.route('/<int:brand_id>/products', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_products(brand_id):
    """Get active products for a specific active brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        # Verify brand exists and is active
        brand = Brand.query.filter_by(id=brand_id, is_active=True).first()
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        page, per_page = get_pagination_params()

        # Filter parameters
        featured_only = request.args.get('featured', '').lower() == 'true'
        new_only = request.args.get('new', '').lower() == 'true'
        sale_only = request.args.get('sale', '').lower() == 'true'
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('q') or request.args.get('search')

        # Sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Only show active products for public users
        query = Product.query.filter_by(brand_id=brand_id, is_active=True)

        if featured_only:
            query = query.filter_by(is_featured=True)

        if new_only:
            query = query.filter_by(is_new=True)

        if sale_only:
            query = query.filter_by(is_sale=True)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )

        # Apply sorting
        if sort_by == 'price':
            if sort_order == 'asc':
                query = query.order_by(Product.price.asc())
            else:
                query = query.order_by(Product.price.desc())
        elif sort_by == 'name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        else:  # Default to created_at
            if sort_order == 'asc':
                query = query.order_by(Product.created_at.asc())
            else:
                query = query.order_by(Product.created_at.desc())

        result = paginate_response(query, products_schema, page, per_page)
        result['brand'] = brand_schema.dump(brand)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting brand products: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand products", "details": str(e)}), 500

@user_brand_routes.route('/featured', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_featured_brands():
    """Get all featured active brands."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        page, per_page = get_pagination_params()

        # Only show active and featured brands
        query = Brand.query.filter_by(is_active=True, is_featured=True)

        # Search functionality
        search = request.args.get('search') or request.args.get('q')
        if search:
            query = query.filter(
                or_(
                    Brand.name.ilike(f'%{search}%'),
                    Brand.description.ilike(f'%{search}%')
                )
            )

        # Order by name
        query = query.order_by(Brand.name.asc())

        return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

    except Exception as e:
        logger.error(f"Error getting featured brands: {str(e)}")
        return jsonify({"error": "Failed to retrieve featured brands", "details": str(e)}), 500

@user_brand_routes.route('/popular', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_popular_brands():
    """Get popular brands based on product count."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        page, per_page = get_pagination_params()

        # Get brands with product counts, only active brands and products
        query = db.session.query(Brand, func.count(Product.id).label('product_count'))\
            .outerjoin(Product, (Product.brand_id == Brand.id) & (Product.is_active == True))\
            .filter(Brand.is_active == True)\
            .group_by(Brand.id)\
            .order_by(func.count(Product.id).desc(), Brand.name.asc())

        # Apply pagination manually since we're using a custom query
        offset = (page - 1) * per_page
        total_query = db.session.query(Brand).filter(Brand.is_active == True)
        total_items = total_query.count()
        total_pages = (total_items + per_page - 1) // per_page

        results = query.offset(offset).limit(per_page).all()

        # Format the results
        brands_data = []
        for brand, product_count in results:
            brand_data = brand_schema.dump(brand)
            brand_data['product_count'] = product_count
            brands_data.append(brand_data)

        return jsonify({
            "items": brands_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_items": total_items
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting popular brands: {str(e)}")
        return jsonify({"error": "Failed to retrieve popular brands", "details": str(e)}), 500

# Health check endpoint
@user_brand_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def user_brand_health_check():
    """Health check for user brand routes."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    return jsonify({
        "status": "ok",
        "service": "user_brand_routes",
        "timestamp": datetime.now(UTC).isoformat(),
        "endpoints": [
            "/",
            "/<int:brand_id>",
            "/slug/<string:slug>",
            "/<int:brand_id>/products",
            "/featured",
            "/popular"
        ]
    }), 200
