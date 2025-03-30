"""
Route validation integration for Mizizzi E-commerce platform.
Applies validation to routes.
"""
from flask import Blueprint, request, jsonify, g, current_app, make_response
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, create_access_token, create_refresh_token,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies, get_jwt, get_csrf_token
)
from flask_cors import cross_origin
from sqlalchemy import or_, desc, func
from datetime import datetime, timedelta
import uuid
import json

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
from ...models.models import (
    User, UserRole, Category, Product, ProductVariant, Brand, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType
)
from ...configuration.extensions import db, cache
from ...schemas.schemas import (
    user_schema, users_schema, category_schema, categories_schema,
    product_schema, products_schema, brand_schema, brands_schema,
    review_schema, reviews_schema, cart_item_schema, cart_items_schema,
    order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
    coupon_schema, coupons_schema, payment_schema, payments_schema,
    product_variant_schema, product_variants_schema, address_schema, addresses_schema
)
import secrets

validation_routes = Blueprint('validation_routes', __name__)

# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
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


# ----------------------
# Authentication Routes with Validation
# ----------------------

# Fixed CSRF token generation function
def get_csrf_token(encoded_token=None):
    """
    Generate a CSRF token.

    Args:
        encoded_token: Optional JWT token to extract user info from

    Returns:
        A CSRF token string
    """
    # Generate a random token regardless of whether encoded_token is provided
    return secrets.token_hex(16)

@validation_routes.route('/auth/csrf', methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required(locations=["cookies"], optional=True)
def get_csrf():
    """Get CSRF token."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Generate a CSRF token using the fixed function
        csrf_token = get_csrf_token()

        return jsonify({"csrf_token": csrf_token}), 200
    except Exception as e:
        current_app.logger.error(f"Error generating CSRF token: {str(e)}")
        return jsonify({"error": "Failed to generate CSRF token", "details": str(e)}), 500

@validation_routes.route('/auth/register', methods=['POST', 'OPTIONS'])
@cross_origin()
@validate_user_registration()
def register():
    """Register a new user with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Create new user
        new_user = User(
            name=data['name'],
            email=data['email'],
            role=UserRole.USER,
            phone=data.get('phone'),
            is_active=True
        )
        new_user.set_password(data['password'])

        db.session.add(new_user)
        db.session.commit()

        # Generate tokens
        access_token = create_access_token(identity=str(new_user.id))
        refresh_token = create_refresh_token(identity=str(new_user.id))

        # Generate CSRF token using the fixed function
        csrf_token = get_csrf_token()

        # Create response with user data and tokens
        resp = jsonify({
            "message": "User registered successfully",
            "user": user_schema.dump(new_user),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "csrf_token": csrf_token
        })

        # Set secure cookies for the tokens
        set_access_cookies(resp, access_token)
        set_refresh_cookies(resp, refresh_token)
        resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=True, samesite="Lax")

        return resp, 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Registration failed. Please try again.", "details": str(e)}), 500

@validation_routes.route('/auth/login', methods=['POST', 'OPTIONS'])
@cross_origin()
@validate_user_login()
def login():
    """Login user with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Find user by email
        user = User.query.filter_by(email=data['email']).first()

        # Verify password
        if not user or not user.verify_password(data['password']):
            return jsonify({"error": "Invalid email or password"}), 401

        if not user.is_active:
            return jsonify({"error": "Account is deactivated"}), 403

        # Update the last login timestamp
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Generate tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        # Generate CSRF token using the fixed function
        csrf_token = get_csrf_token()

        # Create response with user data and tokens
        resp = jsonify({
            "message": "Login successful",
            "user": user_schema.dump(user),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "csrf_token": csrf_token
        })

        set_access_cookies(resp, access_token)
        set_refresh_cookies(resp, refresh_token)
        resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=True, samesite="Lax")

        return resp, 200

    except Exception as e:
        return jsonify({"error": "Login failed. Please try again.", "details": str(e)}), 500

@validation_routes.route('/auth/refresh', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        access_token = create_access_token(identity=current_user_id)

        # Generate CSRF token using the fixed function
        csrf_token = get_csrf_token()

        resp = jsonify({"access_token": access_token, "csrf_token": csrf_token})
        set_access_cookies(resp, access_token)
        resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=True, samesite="Lax")
        return resp, 200

    except Exception as e:
        return jsonify({"error": "Token refresh failed", "details": str(e)}), 500

@validation_routes.route('/auth/logout', methods=['POST', 'OPTIONS'])
@cross_origin()
def logout():
    """Logout user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    resp = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(resp)
    resp.set_cookie("csrf_access_token", "", expires=0)
    resp.set_cookie("csrf_refresh_token", "", expires=0)
    return resp, 200

@validation_routes.route('/auth/me', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_current_user():
    """Get current user profile."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user_schema.dump(user)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve user profile", "details": str(e)}), 500

@validation_routes.route('/auth/me', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_current_user():
    """Update current user with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    current_user_id = get_jwt_identity()

    @validate_user_update(current_user_id)
    def perform_update():
        try:
            # Data is already validated by the decorator
            data = g.validated_data

            user = User.query.get(current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Update allowed fields
            allowed_fields = ['name', 'phone', 'address', 'avatar_url']
            for field in allowed_fields:
                if field in data:
                    setattr(user, field, data[field])

            # Update password if provided
            if 'current_password' in data and 'new_password' in data:
                if not user.verify_password(data['current_password']):
                    return jsonify({"error": "Current password is incorrect"}), 400
                user.set_password(data['new_password'])

            db.session.commit()

            return jsonify({
                "message": "User updated successfully",
                "user": user_schema.dump(user)
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update user", "details": str(e)}), 500

    return perform_update()

# ----------------------
# Category Routes with Validation
# ----------------------

@validation_routes.route('/categories', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_categories():
    """Get all categories with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()

        # Check if we should return featured categories only
        featured_only = request.args.get('featured', '').lower() == 'true'
        parent_id = request.args.get('parent_id', type=int)

        query = Category.query

        if featured_only:
            query = query.filter_by(is_featured=True)

        if parent_id is not None:
            query = query.filter_by(parent_id=parent_id)
        else:
            # If no parent_id is specified, return top-level categories
            query = query.filter_by(parent_id=None)

        # Order by name
        query = query.order_by(Category.name)

        return jsonify(paginate_response(query, categories_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve categories", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category(category_id):
    """Get category by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.get_or_404(category_id)
        return jsonify(category_schema.dump(category)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

@validation_routes.route('/categories/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_by_slug(slug):
    """Get category by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.filter_by(slug=slug).first_or_404()
        return jsonify(category_schema.dump(category)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

@validation_routes.route('/categories', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_category():
    """Create a new category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('name') or not data.get('slug'):
            return jsonify({"error": "Name and slug are required"}), 400

        # Check if slug already exists
        if Category.query.filter_by(slug=data['slug']).first():
            return jsonify({"error": "Slug already exists"}), 409

        new_category = Category(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            image_url=data.get('image_url'),
            banner_url=data.get('banner_url'),
            parent_id=data.get('parent_id'),
            is_featured=data.get('is_featured', False)
        )

        db.session.add(new_category)
        db.session.commit()

        return jsonify({
            "message": "Category created successfully",
            "category": category_schema.dump(new_category)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create category", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_category(category_id):
    """Update a category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()

        # Update fields
        if 'name' in data:
            category.name = data['name']
        if 'slug' in data:
            # Check if slug already exists and is not this category
            existing = Category.query.filter_by(slug=data['slug']).first()
            if existing and existing.id != category_id:
                return jsonify({"error": "Slug already exists"}), 409
            category.slug = data['slug']
        if 'description' in data:
            category.description = data['description']
        if 'image_url' in data:
            category.image_url = data['image_url']
        if 'banner_url' in data:
            category.banner_url = data['banner_url']
        if 'parent_id' in data:
            category.parent_id = data['parent_id']
        if 'is_featured' in data:
            category.is_featured = data['is_featured']

        category.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Category updated successfully",
            "category": category_schema.dump(category)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update category", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_category(category_id):
    """Delete a category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.get_or_404(category_id)

        # Check if category has products
        if category.products:
            return jsonify({"error": "Cannot delete category with associated products"}), 400

        # Check if category has subcategories
        if category.subcategories:
            return jsonify({"error": "Cannot delete category with subcategories"}), 400

        db.session.delete(category)
        db.session.commit()

        return jsonify({"message": "Category deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete category", "details": str(e)}), 500

# ----------------------
# Brand Routes with Validation
# ----------------------

@validation_routes.route('/brands', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brands():
    """Get all brands with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()

        # Check if we should return featured brands only
        featured_only = request.args.get('featured', '').lower() == 'true'

        query = Brand.query

        if featured_only:
            query = query.filter_by(is_featured=True)

        # Order by name
        query = query.order_by(Brand.name)

        return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand(brand_id):
    """Get brand by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@validation_routes.route('/brands/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_by_slug(slug):
    """Get brand by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        brand = Brand.query.filter_by(slug=slug).first_or_404()
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@validation_routes.route('/brands', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_brand():
    """Create a new brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('name') or not data.get('slug'):
            return jsonify({"error": "Name and slug are required"}), 400

        # Check if slug already exists
        if Brand.query.filter_by(slug=data['slug']).first():
            return jsonify({"error": "Slug already exists"}), 409

        new_brand = Brand(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            is_featured=data.get('is_featured', False)
        )

        db.session.add(new_brand)
        db.session.commit()

        return jsonify({
            "message": "Brand created successfully",
            "brand": brand_schema.dump(new_brand)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create brand", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_brand(brand_id):
    """Update a brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)
        data = request.get_json()

        # Update fields
        if 'name' in data:
            brand.name = data['name']
        if 'slug' in data:
            # Check if slug already exists and is not this brand
            existing = Brand.query.filter_by(slug=data['slug']).first()
            if existing and existing.id != brand_id:
                return jsonify({"error": "Slug already exists"}), 409
            brand.slug = data['slug']
        if 'description' in data:
            brand.description = data['description']
        if 'logo_url' in data:
            brand.logo_url = data['logo_url']
        if 'website' in data:
            brand.website = data['website']
        if 'is_featured' in data:
            brand.is_featured = data['is_featured']

        db.session.commit()

        return jsonify({
            "message": "Brand updated successfully",
            "brand": brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update brand", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_brand(brand_id):
    """Delete a brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)

        # Check if brand has products
        if brand.products:
            return jsonify({"error": "Cannot delete brand with associated products"}), 400

        db.session.delete(brand)
        db.session.commit()

        return jsonify({"message": "Brand deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete brand", "details": str(e)}), 500

# ----------------------
# Product Routes with Validation
# ----------------------

@validation_routes.route('/products', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_products():
    """Get all products with pagination and filtering."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        category_id = request.args.get('category_id', type=int)
        category_slug = request.args.get('category_slug')
        brand_id = request.args.get('brand_id', type=int)
        brand_slug = request.args.get('brand_slug')
        featured_only = request.args.get('featured', '').lower() == 'true'
        new_only = request.args.get('new', '').lower() == 'true'
        sale_only = request.args.get('sale', '').lower() == 'true'
        flash_sale_only = request.args.get('flash_sale', '').lower() == 'true'
        luxury_deal_only = request.args.get('luxury_deal', '').lower() == 'true'
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('q')

        # Sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        query = Product.query

        # Apply filters
        if category_id:
            query = query.filter_by(category_id=category_id)

        if category_slug:
            category = Category.query.filter_by(slug=category_slug).first()
            if category:
                query = query.filter_by(category_id=category.id)

        if brand_id:
            query = query.filter_by(brand_id=brand_id)

        if brand_slug:
            brand = Brand.query.filter_by(slug=brand_slug).first()
            if brand:
                query = query.filter_by(brand_id=brand.id)

        if featured_only:
            query = query.filter_by(is_featured=True)

        if new_only:
            query = query.filter_by(is_new=True)

        if sale_only:
            query = query.filter_by(is_sale=True)

        if flash_sale_only:
            query = query.filter_by(is_flash_sale=True)

        if luxury_deal_only:
            query = query.filter_by(is_luxury_deal=True)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.meta_title.ilike(search_term),
                    Product.meta_description.ilike(search_term)
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

        return jsonify(paginate_response(query, products_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve products", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product(product_id):
    """Get product by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@validation_routes.route('/products/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_by_slug(slug):
    """Get product by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        product = Product.query.filter_by(slug=slug).first_or_404()
        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@validation_routes.route('/products', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_creation()
def create_product():
    """Create a new product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Create new product
        new_product = Product(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            price=data['price'],
            sale_price=data.get('sale_price'),
            stock=data.get('stock', 0),
            category_id=data['category_id'],
            brand_id=data.get('brand_id'),
            image_urls=data.get('image_urls', []),
            thumbnail_url=data.get('thumbnail_url'),
            sku=data.get('sku'),
            weight=data.get('weight'),
            dimensions=data.get('dimensions'),
            is_featured=data.get('is_featured', False),
            is_new=data.get('is_new', True),
            is_sale=data.get('is_sale', False),
            is_flash_sale=data.get('is_flash_sale', False),
            is_luxury_deal=data.get('is_luxury_deal', False),
            meta_title=data.get('meta_title'),
            meta_description=data.get('meta_description')
        )

        db.session.add(new_product)
        db.session.commit()

        # Handle variants if provided
        variants = data.get('variants', [])
        for variant_data in variants:
            variant = ProductVariant(
                product_id=new_product.id,
                sku=variant_data.get('sku'),
                color=variant_data.get('color'),
                size=variant_data.get('size'),
                stock=variant_data.get('stock', 0),
                price=variant_data.get('price', new_product.price),
                image_urls=variant_data.get('image_urls', [])
            )
            db.session.add(variant)

        db.session.commit()

        return jsonify({
            "message": "Product created successfully",
            "product": product_schema.dump(new_product)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create product", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_product(product_id):
    """Update a product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    @validate_product_update(product_id)
    def perform_update():
        try:
            # Data is already validated by the decorator
            data = g.validated_data

            product = Product.query.get_or_404(product_id)

            # Update fields
            fields = [
                'name', 'slug', 'description', 'price', 'sale_price', 'stock',
                'category_id', 'brand_id', 'image_urls', 'thumbnail_url', 'sku',
                'weight', 'dimensions', 'is_featured', 'is_new', 'is_sale',
                'is_flash_sale', 'is_luxury_deal', 'meta_title', 'meta_description'
            ]

            for field in fields:
                if field in data:
                    setattr(product, field, data[field])

            product.updated_at = datetime.utcnow()

            # Handle variants if provided
            if 'variants' in data:
                # Delete existing variants
                ProductVariant.query.filter_by(product_id=product_id).delete()

                # Add new variants
                for variant_data in data['variants']:
                    variant = ProductVariant(
                        product_id=product_id,
                        sku=variant_data.get('sku'),
                        color=variant_data.get('color'),
                        size=variant_data.get('size'),
                        stock=variant_data.get('stock', 0),
                        price=variant_data.get('price', product.price),
                        image_urls=variant_data.get('image_urls', [])
                    )
                    db.session.add(variant)

            db.session.commit()

            return jsonify({
                "message": "Product updated successfully",
                "product": product_schema.dump(product)
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update product", "details": str(e)}), 500

    return perform_update()

@validation_routes.route('/products/<int:product_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_product(product_id):
    """Delete a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        product = Product.query.get_or_404(product_id)

        # Delete product and all related entities (variants, reviews, etc.)
        db.session.delete(product)
        db.session.commit()

        return jsonify({"message": "Product deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

# ----------------------
# Product Variant Routes with Validation
# ----------------------

@validation_routes.route('/products/<int:product_id>/variants', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_variants(product_id):
    """Get all variants for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        Product.query.get_or_404(product_id)  # Ensure product exists

        variants = ProductVariant.query.filter_by(product_id=product_id).all()
        return jsonify(product_variants_schema.dump(variants)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product variants", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/variants', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_variant_creation(lambda: request.view_args.get('product_id'))
def create_product_variant(product_id):
    """Create a new product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        product = Product.query.get_or_404(product_id)

        new_variant = ProductVariant(
            product_id=product_id,
            sku=data.get('sku'),
            color=data.get('color'),
            size=data.get('size'),
            stock=data.get('stock', 0),
            price=data.get('price', product.price),
            image_urls=data.get('image_urls', [])
        )

        db.session.add(new_variant)
        db.session.commit()

        return jsonify({
            "message": "Product variant created successfully",
            "variant": product_variant_schema.dump(new_variant)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create product variant", "details": str(e)}), 500

@validation_routes.route('/variants/<int:variant_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_variant_update(lambda: request.view_args.get('variant_id'))
def update_product_variant(variant_id):
    """Update a product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        variant = ProductVariant.query.get_or_404(variant_id)

        if 'sku' in data:
            variant.sku = data['sku']
        if 'color' in data:
            variant.color = data['color']
        if 'size' in data:
            variant.size = data['size']
        if 'stock' in data:
            variant.stock = data['stock']
        if 'price' in data:
            variant.price = data['price']
        if 'image_urls' in data:
            variant.image_urls = data['image_urls']

        db.session.commit()

        return jsonify({
            "message": "Product variant updated successfully",
            "variant": product_variant_schema.dump(variant)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update product variant", "details": str(e)}), 500

@validation_routes.route('/variants/<int:variant_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_product_variant(variant_id):
    """Delete a product variant."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        variant = ProductVariant.query.get_or_404(variant_id)

        db.session.delete(variant)
        db.session.commit()

        return jsonify({"message": "Product variant deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete product variant", "details": str(e)}), 500



@validation_routes.route('/cart/validate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def validate_cart():
    """
    Validates cart items to ensure:
    1. Products exist in the database
    2. Products are in stock
    3. Prices match current prices
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # If no cart items provided, validate all items in the user's cart
        if not data or not data.get('items'):
            cart_items = CartItem.query.filter_by(user_id=current_user_id).all()
            items_to_validate = [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'variant_id': item.variant_id,
                    'quantity': item.quantity
                } for item in cart_items
            ]
        else:
            items_to_validate = data.get('items', [])

        validation_results = []
        invalid_items = []
        stock_issues = []
        price_changes = []
        is_valid = True
        total = 0

        for item in items_to_validate:
            product_id = item.get('product_id')
            variant_id = item.get('variant_id')
            quantity = item.get('quantity', 1)

            # Validate product exists
            product = Product.query.get(product_id)
            if not product:
                invalid_item = {
                    'item_id': item.get('id'),
                    'product_id': product_id,
                    'valid': False,
                    'error': 'Product not found',
                    'code': 'PRODUCT_NOT_FOUND'
                }
                validation_results.append(invalid_item)
                invalid_items.append(invalid_item)
                is_valid = False
                continue

            # Validate variant if provided
            variant = None
            if variant_id:
                variant = ProductVariant.query.get(variant_id)
                if not variant or variant.product_id != product.id:
                    invalid_item = {
                        'item_id': item.get('id'),
                        'product_id': product_id,
                        'variant_id': variant_id,
                        'valid': False,
                        'error': 'Invalid variant',
                        'code': 'INVALID_VARIANT'
                    }
                    validation_results.append(invalid_item)
                    invalid_items.append(invalid_item)
                    is_valid = False
                    continue

            # Check stock
            stock = variant.stock if variant else product.stock
            if stock < quantity:
                stock_issue = {
                    'item_id': item.get('id'),
                    'product_id': product_id,
                    'variant_id': variant_id,
                    'valid': False,
                    'error': f'Insufficient stock. Available: {stock}',
                    'code': 'INSUFFICIENT_STOCK',
                    'available_stock': stock
                }
                validation_results.append(stock_issue)
                stock_issues.append(stock_issue)
                is_valid = False
                continue

            # Get current price
            current_price = variant.price if variant and variant.price else (product.sale_price or product.price)

            # Check if price matches (if provided)
            if 'price' in item and abs(float(item['price']) - float(current_price)) > 0.01:
                price_change = {
                    'item_id': item.get('id'),
                    'product_id': product_id,
                    'variant_id': variant_id,
                    'valid': False,
                    'error': 'Price has changed',
                    'code': 'PRICE_CHANGED',
                    'current_price': current_price,
                    'provided_price': item['price']
                }
                validation_results.append(price_change)
                price_changes.append(price_change)
                is_valid = False
                continue

            # Item is valid
            item_total = current_price * quantity
            total += item_total

            validation_results.append({
                'item_id': item.get('id'),
                'product_id': product_id,
                'variant_id': variant_id,
                'valid': True,
                'price': current_price,
                'quantity': quantity,
                'total': item_total,
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'slug': product.slug,
                    'thumbnail_url': product.thumbnail_url
                }
            })

        return jsonify({
            'valid': is_valid,
            'items': validation_results,
            'invalidItems': invalid_items,
            'stockIssues': stock_issues,
            'priceChanges': price_changes,
            'total': total,
            'item_count': len(validation_results)
        }), 200

    except Exception as e:
        print("Cart validation error:", str(e))
        # Return a more graceful error response
        return jsonify({
            "valid": False,
            "error": "Failed to validate cart",
            "details": str(e),
            "items": [],
            "invalidItems": [],
            "stockIssues": [],
            "priceChanges": []
        }), 200  # Return 200 instead of 500 to prevent frontend loops

# ----------------------
# Cart Routes with Validation
# ----------------------

@validation_routes.route('/cart', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_cart():
    """Get user's cart items."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()

        cart_data = []
        total = 0

        for item in cart_items:
            product = Product.query.get(item.product_id)
            if not product:
                continue

            variant = ProductVariant.query.get(item.variant_id) if item.variant_id else None
            price = variant.price if variant and variant.price else (product.sale_price or product.price)
            item_total = price * item.quantity
            total += item_total

            cart_data.append({
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "price": price,
                "total": item_total,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "thumbnail_url": product.thumbnail_url,
                    "image_urls": product.image_urls
                }
            })

        return jsonify({
            "items": cart_data,
            "total": total,
            "item_count": len(cart_data)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve cart", "details": str(e)}), 500

@validation_routes.route('/cart', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_cart_item_addition(lambda: get_jwt_identity())
def add_to_cart():
    """Add item to cart with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        product_id = int(data.get('product_id'))
        product = Product.query.get(product_id)

        quantity = max(1, int(data.get('quantity', 1)))
        variant_id = data.get('variant_id')

        if variant_id:
            variant_id = int(variant_id)

        # Check if item already exists in cart
        existing_item = CartItem.query.filter_by(
            user_id=current_user_id,
            product_id=product.id,
            variant_id=variant_id
        ).first()

        if existing_item:
            existing_item.quantity += quantity
            existing_item.updated_at = datetime.utcnow()
            db.session.commit()
        else:
            new_item = CartItem(
                user_id=current_user_id,
                product_id=product.id,
                variant_id=variant_id,
                quantity=quantity
            )
            db.session.add(new_item)
            db.session.commit()
            existing_item = new_item

        # Calculate price and total for response
        variant = ProductVariant.query.get(variant_id) if variant_id else None
        price = variant.price if variant and variant.price else (product.sale_price or product.price)
        total = price * existing_item.quantity

        response_data = {
            "id": existing_item.id,
            "product_id": existing_item.product_id,
            "variant_id": existing_item.variant_id,
            "quantity": existing_item.quantity,
            "price": price,
            "total": total,
            "product": {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "thumbnail_url": product.thumbnail_url
            }
        }

        return jsonify({
            "message": "Item added to cart",
            "item": response_data
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to add item to cart", "details": str(e)}), 500

@validation_routes.route('/cart/<int:item_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_cart_item(item_id):
    """Update cart item with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    current_user_id = get_jwt_identity()
    item = CartItem.query.get_or_404(item_id)

    # Ensure item belongs to current user
    if str(item.user_id) != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Apply validation
    @validate_cart_item_update(current_user_id, item_id)
    def perform_update():
        try:
            data = g.validated_data

            if 'quantity' in data:
                quantity = int(data['quantity'])
                if quantity <= 0:
                    db.session.delete(item)
                    db.session.commit()
                    return jsonify({"message": "Item removed from cart"}), 200
                else:
                    item.quantity = quantity
                    item.updated_at = datetime.utcnow()
                    db.session.commit()

            # Calculate price and total for response
            product = Product.query.get(item.product_id)
            variant = ProductVariant.query.get(item.variant_id) if item.variant_id else None
            price = variant.price if variant and variant.price else (product.sale_price or product.price)
            total = price * item.quantity

            response_data = {
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "price": price,
                "total": total,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "thumbnail_url": product.thumbnail_url
                }
            }

            return jsonify({
                "message": "Cart updated successfully",
                "item": response_data
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update cart", "details": str(e)}), 500

    return perform_update()

@validation_routes.route('/cart/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_cart(item_id):
    """Remove item from cart."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        item = CartItem.query.get_or_404(item_id)

        if str(item.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(item)
        db.session.commit()

        return jsonify({"message": "Item removed from cart"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to remove item from cart", "details": str(e)}), 500

@validation_routes.route('/cart/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_cart():
    """Clear entire cart."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        CartItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()

        return jsonify({"message": "Cart cleared successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to clear cart", "details": str(e)}), 500

# ----------------------
# Address Routes with Validation
# ----------------------

@validation_routes.route('/addresses', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_addresses():
    """Get user's addresses."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Get filter parameters
        address_type = request.args.get('type')

        # Build query
        query = Address.query.filter_by(user_id=current_user_id)

        # Apply filters
        if address_type:
            try:
                address_type_enum = AddressType(address_type)
                query = query.filter_by(address_type=address_type_enum)
            except ValueError:
                pass  # Invalid address type, ignore filter

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Order by creation date, with default addresses first
        query = query.order_by(
            Address.is_default.desc(),
            Address.created_at.desc()
        )

        return jsonify(paginate_response(query, addresses_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve addresses", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_address(address_id):
    """Get address by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve address", "details": str(e)}), 500

@validation_routes.route('/addresses', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_address_creation(lambda: get_jwt_identity())
def create_address():
    """Create a new address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Parse address type
        address_type = AddressType.BOTH
        if 'address_type' in data:
            try:
                address_type = AddressType(data['address_type'])
            except ValueError:
                return jsonify({"error": "Invalid address type"}), 400

        # Create new address
        new_address = Address(
            user_id=current_user_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            address_line1=data['address_line1'],
            address_line2=data.get('address_line2', ''),
            city=data['city'],
            state=data['state'],
            postal_code=data['postal_code'],
            country=data['country'],
            phone=data.get('phone', ''),
            alternative_phone=data.get('alternative_phone', ''),
            address_type=address_type,
            is_default=data.get('is_default', False)
        )

        # Handle default address settings
        if new_address.is_default:
            # Remove default flag from other addresses
            Address.query.filter_by(
                user_id=current_user_id,
                is_default=True
            ).update({'is_default': False})

        db.session.add(new_address)
        db.session.commit()

        return jsonify({
            "message": "Address created successfully",
            "address": address_schema.dump(new_address)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create address", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@cross_origin()
@jwt_required()
def update_address(address_id):
    """Update an address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    current_user_id = get_jwt_identity()
    address = Address.query.get_or_404(address_id)

    # Ensure address belongs to current user
    if str(address.user_id) != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Apply validation
    @validate_address_update(current_user_id, address_id)
    def perform_update():
        try:
            data = g.validated_data

            # Update fields
            if 'first_name' in data:
                address.first_name = data['first_name']
            if 'last_name' in data:
                address.last_name = data['last_name']
            if 'address_line1' in data:
                address.address_line1 = data['address_line1']
            if 'address_line2' in data:
                address.address_line2 = data['address_line2']
            if 'city' in data:
                address.city = data['city']
            if 'state' in data:
                address.state = data['state']
            if 'postal_code' in data:
                address.postal_code = data['postal_code']
            if 'country' in data:
                address.country = data['country']
            if 'phone' in data:
                address.phone = data['phone']
            if 'alternative_phone' in data:
                address.alternative_phone = data['alternative_phone']

            # Handle address type
            if 'address_type' in data:
                try:
                    address.address_type = AddressType(data['address_type'])
                except ValueError:
                    return jsonify({"error": "Invalid address type"}), 400

            # Handle default flag
            if 'is_default' in data and data['is_default'] and not address.is_default:
                # Remove default flag from other addresses
                Address.query.filter_by(
                    user_id=current_user_id,
                    is_default=True
                ).update({'is_default': False})
                address.is_default = True
            elif 'is_default' in data:
                address.is_default = data['is_default']

            address.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Address updated successfully",
                "address": address_schema.dump(address)
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update address", "details": str(e)}), 500

    return perform_update()

@validation_routes.route('/addresses/<int:address_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_address(address_id):
    """Delete an address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Check if this is the only address
        address_count = Address.query.filter_by(user_id=current_user_id).count()

        # Delete the address
        db.session.delete(address)

        # If this was a default address and there are other addresses, set a new default
        if address.is_default and address_count > 1:
            # Find another address to make default
            another_address = Address.query.filter_by(user_id=current_user_id).first()
            if another_address:
                another_address.is_default = True

        db.session.commit()

        return jsonify({"message": "Address deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete address", "details": str(e)}), 500

@validation_routes.route('/addresses/default', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_default_address():
    """Get user's default address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Find default address
        address = Address.query.filter_by(
            user_id=current_user_id,
            is_default=True
        ).first()

        if not address:
            # If no default address, get the first address
            address = Address.query.filter_by(user_id=current_user_id).first()

        if not address:
            return jsonify({"message": "No address found"}), 404

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve default address", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>/set-default', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def set_default_address(address_id):
    """Set an address as default."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Remove default flag from other addresses
        Address.query.filter_by(
            user_id=current_user_id,
            is_default=True
        ).update({'is_default': False})

        # Set this address as default
        address.is_default = True
        db.session.commit()

        return jsonify({
            "message": "Default address set successfully",
            "address": address_schema.dump(address)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to set default address", "details": str(e)}), 500

# ----------------------
# Order Routes with Validation
# ----------------------

@validation_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_user_orders():
    """Get user's orders with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        page, per_page = get_pagination_params()

        # Get filter parameters
        status = request.args.get('status')
        include_items = request.args.get('include_items', 'false').lower() == 'true'

        # Build query
        query = Order.query.filter_by(user_id=current_user_id)

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass  # Invalid status, ignore filter

        # Order by creation date, newest first
        query = query.order_by(Order.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        orders = []
        for order in paginated.items:
            order_dict = {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value,
                'total_amount': order.total_amount,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status.value,
                'shipping_method': order.shipping_method,
                'shipping_cost': order.shipping_cost,
                'tracking_number': order.tracking_number,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items_count': len(order.items),
                'items': []  # Initialize items array
            }

            # Include order items with product details if requested
            if include_items:
                for item in order.items:
                    item_dict = {
                        'id': item.id,
                        'product_id': item.product_id,
                        'variant_id': item.variant_id,
                        'quantity': item.quantity,
                        'price': item.price,
                        'total': item.total,
                        'product': None,
                        'variant': None
                    }

                    # Add product details
                    product = Product.query.get(item.product_id)
                    if product:
                        item_dict['product'] = {
                            'id': product.id,
                            'name': product.name,
                            'slug': product.slug,
                            'thumbnail_url': product.thumbnail_url
                        }

                    # Add variant details if applicable
                    if item.variant_id:
                        variant = ProductVariant.query.get(item.variant_id)
                        if variant:
                            item_dict['variant'] = {
                                'id': variant.id,
                                'color': variant.color,
                                'size': variant.size
                            }

                    order_dict['items'].append(item_dict)

            orders.append(order_dict)

        return jsonify({
            "items": orders,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order(order_id):
    """Get order by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user or user is admin
        user = User.query.get(current_user_id)
        if str(order.user_id) != current_user_id and user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        # Get order details with items and product information
        order_dict = {
            'id': order.id,
            'user_id': order.user_id,
            'order_number': order.order_number,
            'status': order.status.value,
            'total_amount': order.total_amount,
            'shipping_address': order.shipping_address,
            'billing_address': order.billing_address,
            'payment_method': order.payment_method,
            'payment_status': order.payment_status.value,
            'shipping_method': order.shipping_method,
            'shipping_cost': order.shipping_cost,
            'tracking_number': order.tracking_number,
            'notes': order.notes,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
            'items': []
        }

        # Add items with product details
        for item in order.items:
            item_dict = {
                'id': item.id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity,
                'price': item.price,
                'total': item.total,
                'product': None,
                'variant': None
            }

            # Add product details
            product = Product.query.get(item.product_id)
            if product:
                item_dict['product'] = {
                    'id': product.id,
                    'name': product.name,
                    'slug': product.slug,
                    'thumbnail_url': product.thumbnail_url
                }

            # Add variant details if applicable
            if item.variant_id:
                variant = ProductVariant.query.get(item.variant_id)
                if variant:
                    item_dict['variant'] = {
                        'id': variant.id,
                        'color': variant.color,
                        'size': variant.size
                    }

            order_dict['items'].append(item_dict)

        return jsonify(order_dict), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@validation_routes.route('/orders', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_order_creation(lambda: get_jwt_identity())
def create_order():
    """Create a new order with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Process shipping and billing addresses
        shipping_address = None
        billing_address = None

        # Get shipping address
        if 'shipping_address_id' in data:
            address = Address.query.get(data['shipping_address_id'])
            shipping_address = address.to_dict()
        elif 'shipping_address' in data:
            shipping_address = data['shipping_address']

        # Get billing address
        if data.get('same_as_shipping', False):
            billing_address = shipping_address
        elif 'billing_address_id' in data:
            address = Address.query.get(data['billing_address_id'])
            billing_address = address.to_dict()
        elif 'billing_address' in data:
            billing_address = data['billing_address']

        # Get cart items
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()

        if not cart_items:
            return jsonify({"error": "Cart is empty"}), 400

        # Calculate total amount
        total_amount = 0
        order_items = []

        for cart_item in cart_items:
            product = Product.query.get(cart_item.product_id)
            if not product:
                continue

            variant = None
            if cart_item.variant_id:
                variant = ProductVariant.query.get(cart_item.variant_id)

            price = variant.price if variant and variant.price else (product.sale_price or product.price)
            item_total = price * cart_item.quantity
            total_amount += item_total

            order_items.append({
                "product_id": cart_item.product_id,
                "variant_id": cart_item.variant_id,
                "quantity": cart_item.quantity,
                "price": price,
                "total": item_total
            })

        # Apply shipping cost
        shipping_cost = data.get('shipping_cost', 0)
        total_amount += shipping_cost

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0

        if coupon_code:
            coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()
            if coupon:
                # Check if coupon is valid
                now = datetime.utcnow()
                if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
                    return jsonify({"error": "Coupon is not valid at this time"}), 400

                # Check if coupon has reached usage limit
                if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
                    return jsonify({"error": "Coupon usage limit reached"}), 400

                # Apply discount
                if coupon.type == CouponType.PERCENTAGE:
                    discount = total_amount * (coupon.value / 100)
                    if coupon.max_discount and discount > coupon.max_discount:
                        discount = coupon.max_discount
                else:  # Fixed amount
                    discount = coupon.value

                total_amount -= discount

                # Increment coupon usage
                coupon.used_count += 1

        # Generate order number
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        # Create order
        new_order = Order(
            user_id=current_user_id,
            order_number=order_number,
            status=OrderStatus.PENDING,
            total_amount=total_amount,
            shipping_address=shipping_address,
            billing_address=billing_address,
            payment_method=data['payment_method'],
            payment_status=PaymentStatus.PENDING,
            shipping_method=data.get('shipping_method'),
            shipping_cost=shipping_cost,
            notes=data.get('notes')
        )

        db.session.add(new_order)
        db.session.flush()  # Get the order ID

        # Create order items
        for item_data in order_items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item_data['product_id'],
                variant_id=item_data['variant_id'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                total=item_data['total']
            )
            db.session.add(order_item)

        # Clear cart
        CartItem.query.filter_by(user_id=current_user_id).delete()

        db.session.commit()

        return jsonify({
            "message": "Order created successfully",
            "order": {
                'id': new_order.id,
                'order_number': new_order.order_number,
                'status': new_order.status.value,
                'total_amount': new_order.total_amount,
                'created_at': new_order.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create order", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>/cancel', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def cancel_order(order_id):
    """Cancel an order."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user
        if str(order.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Check if order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            return jsonify({"error": "Order cannot be cancelled at this stage"}), 400

        # Update order status
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()

        # Add cancellation reason if provided
        data = request.get_json()
        if data and 'reason' in data:
            order.notes = f"Cancellation reason: {data['reason']}"

        db.session.commit()

        return jsonify({
            "message": "Order cancelled successfully",
            "order": {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to cancel order", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_order_status_update(lambda: request.view_args.get('order_id'))
def update_order_status(order_id):
    """Update order status with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        order = Order.query.get_or_404(order_id)

        # Validate status transition
        try:
            new_status = OrderStatus(data['status'])

            if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return jsonify({"error": "Cannot change status of a cancelled order"}), 400

            if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return jsonify({"error": "Cannot change status of a delivered order"}), 400

            # Update order status
            order.status = new_status
            order.updated_at = datetime.utcnow()

            # Add tracking number if provided
            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            # Add notes if provided
            if 'notes' in data:
                order.notes = data['notes']

            db.session.commit()

            return jsonify({
                "message": "Order status updated successfully",
                "order": {
                    'id': order.id,
                    'order_number': order.order_number,
                    'status': order.status.value
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

# Removed duplicate definition of get_order_stats to avoid conflicts.

@validation_routes.route('/orders/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order_stats():
    """Get order statistics for the current user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Get all orders for the user
        orders = Order.query.filter_by(user_id=current_user_id).all()

        # Initialize stats
        stats = {
            'total': len(orders),
            'pending': 0,
            'processing': 0,
            'shipped': 0,
            'delivered': 0,
            'cancelled': 0,
            'returned': 0
        }

        # Count orders by status
        for order in orders:
            status = order.status.value.lower()
            if status in stats:
                stats[status] += 1
            # Handle "canceled" vs "cancelled" inconsistency
            elif status == 'canceled' and 'cancelled' in stats:
                stats['cancelled'] += 1

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve order statistics", "details": str(e)}), 500
# ----------------------
# Payment Routes with Validation
# ----------------------

@validation_routes.route('/orders/<int:order_id>/payments', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_payment_creation(lambda: get_jwt_identity(), lambda: request.view_args.get('order_id'))
def create_payment(order_id):
    """Create a payment with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user
        if str(order.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Create payment
        new_payment = Payment(
            order_id=order_id,
            amount=data['amount'],
            payment_method=data['payment_method'],
            transaction_id=data['transaction_id'],
            transaction_data=data.get('transaction_data'),
            status=PaymentStatus.COMPLETED,
            completed_at=datetime.utcnow()
        )

        db.session.add(new_payment)

        # Update order payment status
        order.payment_status = PaymentStatus.COMPLETED

        db.session.commit()

        return jsonify({
            "message": "Payment processed successfully",
            "payment": payment_schema.dump(new_payment)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to process payment", "details": str(e)}), 500

@validation_routes.route('/mpesa/initiate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_mpesa_payment()
def initiate_mpesa_payment():
    """Initiate M-Pesa payment with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Here you would integrate with the M-Pesa API
        # This is a placeholder for the actual implementation

        return jsonify({
            "message": "M-Pesa payment initiated",
            "checkout_request_id": "sample-request-id",
            "phone": data['phone'],
            "amount": data['amount']
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to initiate M-Pesa payment", "details": str(e)}), 500

# ----------------------
# Review Routes with Validation
# ----------------------

@validation_routes.route('/products/<int:product_id>/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_reviews(product_id):
    """Get reviews for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        Product.query.get_or_404(product_id)  # Ensure product exists
        page, per_page = get_pagination_params()

        query = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc())

        return jsonify(paginate_response(query, reviews_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/reviews', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_review_creation(lambda: get_jwt_identity(), lambda: request.view_args.get('product_id'))
def create_review(product_id):
    """Create a review with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Create new review
        new_review = Review(
            user_id=current_user_id,
            product_id=product_id,
            rating=data['rating'],
            title=data.get('title'),
            comment=data.get('comment'),
            images=data.get('images', []),
            is_verified_purchase=False  # This would be set based on order history
        )

        # Check if user has purchased this product
        has_purchased = Order.query.join(OrderItem).filter(
            Order.user_id == current_user_id,
            OrderItem.product_id == product_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.SHIPPED])
        ).first() is not None

        if has_purchased:
            new_review.is_verified_purchase = True

        db.session.add(new_review)
        db.session.commit()

        return jsonify({
            "message": "Review submitted successfully",
            "review": review_schema.dump(new_review)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create review", "details": str(e)}), 500

@validation_routes.route('/reviews/<int:review_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_review_update(lambda: get_jwt_identity(), lambda: request.view_args.get('review_id'))
def update_review(review_id):
    """Update a review with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        review = Review.query.get_or_404(review_id)

        # Ensure review belongs to current user
        if str(review.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        if 'rating' in data:
            review.rating = data['rating']
        if 'title' in data:
            review.title = data['title']
        if 'comment' in data:
            review.comment = data['comment']
        if 'images' in data:
            review.images = data['images']

        review.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Review updated successfully",
            "review": review_schema.dump(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@validation_routes.route('/reviews/<int:review_id>', methods=['DELETE', 'OPTIONS'])
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
        current_user_id = get_jwt_identity()
        review = Review.query.get_or_404(review_id)

        # Ensure review belongs to current user or user is admin
        user = User.query.get(current_user_id)
        if str(review.user_id) != current_user_id and user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(review)
        db.session.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

# ----------------------
# Wishlist Routes with Validation
# ----------------------

@validation_routes.route('/wishlist', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_wishlist():
    """Get user's wishlist items."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        wishlist_items = WishlistItem.query.filter_by(user_id=current_user_id).all()

        # Enhance wishlist items with product details
        wishlist_data = []

        for item in wishlist_items:
            product = Product.query.get(item.product_id)
            if not product:
                continue

            wishlist_data.append({
                "id": item.id,
                "product_id": item.product_id,
                "created_at": item.created_at.isoformat(),
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "price": product.price,
                    "sale_price": product.sale_price,
                    "thumbnail_url": product.thumbnail_url,
                    "image_urls": product.image_urls
                }
            })

        return jsonify({
            "items": wishlist_data,
            "item_count": len(wishlist_data)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def add_to_wishlist():
    """Add item to wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Validate required fields
        if not data or not data.get('product_id'):
            return jsonify({"error": "Product ID is required"}), 400

        product_id = int(data.get('product_id'))
        product = Product.query.get_or_404(product_id)

        # Check if item already exists in wishlist
        existing_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product.id
        ).first()

        if existing_item:
            return jsonify({
                "message": "Item already in wishlist",
                "item": wishlist_item_schema.dump(existing_item)
            }), 200
        else:
            # Create new wishlist item
            new_item = WishlistItem(
                user_id=current_user_id,
                product_id=product.id
            )

            db.session.add(new_item)
            db.session.commit()

            return jsonify({
                "message": "Item added to wishlist",
                "item": wishlist_item_schema.dump(new_item)
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to add item to wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_wishlist(item_id):
    """Remove item from wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        item = WishlistItem.query.get_or_404(item_id)

        # Ensure item belongs to current user
        if int(current_user_id) != item.user_id:
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(item)
        db.session.commit()

        return jsonify({"message": "Item removed from wishlist"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to remove item from wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_wishlist():
    """Clear entire wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        WishlistItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()

        return jsonify({"message": "Wishlist cleared successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to clear wishlist", "details": str(e)}), 500

# ----------------------
# Coupon Routes with Validation
# ----------------------

@validation_routes.route('/coupons/validate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def validate_coupon():
    """Validate a coupon code."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json()

        if not data.get('code'):
            return jsonify({"error": "Coupon code is required"}), 400

        coupon = Coupon.query.filter_by(code=data['code'], is_active=True).first()

        if not coupon:
            return jsonify({"error": "Invalid coupon code"}), 404

        # Check if coupon is valid
        now = datetime.utcnow()
        if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
            return jsonify({"error": "Coupon is not valid at this time"}), 400

        # Check if coupon has reached usage limit
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            return jsonify({"error": "Coupon usage limit reached"}), 400

        return jsonify({
            "valid": True,
            "coupon": coupon_schema.dump(coupon)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to validate coupon", "details": str(e)}), 500


# Error handlers
@validation_routes.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@validation_routes.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

@validation_routes.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "Unauthorized"}), 401

@validation_routes.errorhandler(403)
def forbidden(error):
    return jsonify({"error": "Forbidden"}), 403

@validation_routes.errorhandler(500)
def internal_server_error(error):
    db.session.rollback()
    return jsonify({"error": "Internal server error"}), 500
