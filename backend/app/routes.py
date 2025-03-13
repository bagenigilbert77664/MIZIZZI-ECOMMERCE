from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt, set_access_cookies, set_refresh_cookies,
    unset_jwt_cookies, get_csrf_token
)
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, desc, func
from datetime import datetime, timedelta
import uuid
import json
import os
from .extensions import db, cache
from flask_cors import cross_origin
from .models import (
    User, UserRole, Category, Product, ProductVariant, Brand, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, Newsletter, CouponType
)
from flask_wtf.csrf import generate_csrf
from functools import wraps
from .schemas import (
    user_schema, users_schema, category_schema, categories_schema,
    product_schema, products_schema, brand_schema, brands_schema,
    review_schema, reviews_schema, cart_item_schema, cart_items_schema,
    order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
    coupon_schema, coupons_schema, payment_schema, payments_schema,
    product_variant_schema, product_variants_schema
)

routes_app = Blueprint('routes_app', __name__)

# Helper Functions
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role != UserRole.ADMIN:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

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

# CSRF Token Fetch Route (POST required)@routes_app.route("/api/csrf", methods=["POST", "OPTIONS"])
@routes_app.route("/api/csrf", methods=["POST", "OPTIONS"])
@jwt_required(locations=["cookies"])
def get_csrf():
    return jsonify({"csrf_token": get_csrf_token()}), 200


@routes_app.route('/auth/register', methods=['POST', 'OPTIONS'])
@cross_origin()
def register():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}", "field": field}), 400

        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                "error": "Email already registered",
                "code": "auth/email-already-exists"
            }), 409

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

        # Generate CSRF token by passing the access token to get_csrf_token()
        csrf_token = get_csrf_token(access_token)

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

@routes_app.route('/auth/login', methods=['POST'])
@cross_origin()
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data['email']).first()
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

    # Generate CSRF token by passing the access token to get_csrf_token()
    csrf_token = get_csrf_token(access_token)

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

@routes_app.route('/auth/refresh', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required(refresh=True)
def refresh_token():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    csrf_token = get_csrf_token(access_token)

    resp = jsonify({"access_token": access_token, "csrf_token": csrf_token})
    set_access_cookies(resp, access_token)
    resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=True, samesite="Lax")
    return resp, 200

@routes_app.route('/auth/logout', methods=['POST', 'OPTIONS'])
@cross_origin()
def logout():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    resp = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(resp)
    resp.set_cookie("csrf_access_token", "", expires=0)
    resp.set_cookie("csrf_refresh_token", "", expires=0)
    return resp, 200

@routes_app.route('/auth/me', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_current_user():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_schema.dump(user)), 200

@routes_app.route('/auth/me', methods=['PUT'])
@jwt_required()
def update_current_user():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    allowed_fields = ['name', 'phone', 'address', 'avatar_url']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])

    if 'current_password' in data and 'new_password' in data:
        if not user.verify_password(data['current_password']):
            return jsonify({"error": "Current password is incorrect"}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({
        "message": "User updated successfully",
        "user": user_schema.dump(user)
    }), 200


#=====================================================================================
# CATEGORY ROUTES
#=====================================================================================
@routes_app.route('/categories', methods=['GET'])
def get_categories():
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

@routes_app.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    return jsonify(category_schema.dump(category)), 200

@routes_app.route('/categories/<string:slug>', methods=['GET'])
def get_category_by_slug(slug):
    category = Category.query.filter_by(slug=slug).first_or_404()
    return jsonify(category_schema.dump(category)), 200

@routes_app.route('/categories', methods=['POST'])
@admin_required
def create_category():
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

@routes_app.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
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

@routes_app.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
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





#=====================================================================================
# BRAND ROUTES
#=====================================================================================

@routes_app.route('/brands', methods=['GET'])
def get_brands():
    page, per_page = get_pagination_params()

    # Check if we should return featured brands only
    featured_only = request.args.get('featured', '').lower() == 'true'

    query = Brand.query

    if featured_only:
        query = query.filter_by(is_featured=True)

    # Order by name
    query = query.order_by(Brand.name)

    return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

@routes_app.route('/brands/<int:brand_id>', methods=['GET'])
def get_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    return jsonify(brand_schema.dump(brand)), 200

@routes_app.route('/brands/<string:slug>', methods=['GET'])
def get_brand_by_slug(slug):
    brand = Brand.query.filter_by(slug=slug).first_or_404()
    return jsonify(brand_schema.dump(brand)), 200

@routes_app.route('/brands', methods=['POST'])
@admin_required
def create_brand():
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

@routes_app.route('/brands/<int:brand_id>', methods=['PUT'])
@admin_required
def update_brand(brand_id):
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

@routes_app.route('/brands/<int:brand_id>', methods=['DELETE'])
@admin_required
def delete_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)

    # Check if brand has products
    if brand.products:
        return jsonify({"error": "Cannot delete brand with associated products"}), 400

    db.session.delete(brand)
    db.session.commit()

    return jsonify({"message": "Brand deleted successfully"}), 200





#=====================================================================================
# PRODUCTS ROUTES
#=====================================================================================
@routes_app.route('/products', methods=['GET'])
def get_products():
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

@routes_app.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product_schema.dump(product)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes_app.route('/products/<string:slug>', methods=['GET'])
def get_product_by_slug(slug):
    product = Product.query.filter_by(slug=slug).first_or_404()
    return jsonify(product_schema.dump(product)), 200

@routes_app.route('/products', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()

    # Validate required fields
    required_fields = ['name', 'slug', 'price', 'category_id']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    # Check if slug already exists
    if Product.query.filter_by(slug=data['slug']).first():
        return jsonify({"error": "Slug already exists"}), 409

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

@routes_app.route('/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()

    # Update fields
    if 'name' in data:
        product.name = data['name']
    if 'slug' in data:
        # Check if slug already exists and is not this product
        existing = Product.query.filter_by(slug=data['slug']).first()
        if existing and existing.id != product_id:
            return jsonify({"error": "Slug already exists"}), 409
        product.slug = data['slug']
    if 'description' in data:
        product.description = data['description']
    if 'price' in data:
        product.price = data['price']
    if 'sale_price' in data:
        product.sale_price = data['sale_price']
    if 'stock' in data:
        product.stock = data['stock']
    if 'category_id' in data:
        product.category_id = data['category_id']
    if 'brand_id' in data:
        product.brand_id = data['brand_id']
    if 'image_urls' in data:
        product.image_urls = data['image_urls']
    if 'thumbnail_url' in data:
        product.thumbnail_url = data['thumbnail_url']
    if 'sku' in data:
        product.sku = data['sku']
    if 'weight' in data:
        product.weight = data['weight']
    if 'dimensions' in data:
        product.dimensions = data['dimensions']
    if 'is_featured' in data:
        product.is_featured = data['is_featured']
    if 'is_new' in data:
        product.is_new = data['is_new']
    if 'is_sale' in data:
        product.is_sale = data['is_sale']
    if 'is_flash_sale' in data:
        product.is_flash_sale = data['is_flash_sale']
    if 'is_luxury_deal' in data:
        product.is_luxury_deal = data['is_luxury_deal']
    if 'meta_title' in data:
        product.meta_title = data['meta_title']
    if 'meta_description' in data:
        product.meta_description = data['meta_description']

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

@routes_app.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)

    # Delete product and all related entities (variants, reviews, etc.)
    db.session.delete(product)
    db.session.commit()

    return jsonify({"message": "Product deleted successfully"}), 200






#=====================================================================================
# PRODUCT VARIANT ROUTES
#=====================================================================================
@routes_app.route('/products/<int:product_id>/variants', methods=['GET'])
def get_product_variants(product_id):
    Product.query.get_or_404(product_id)  # Ensure product exists

    variants = ProductVariant.query.filter_by(product_id=product_id).all()
    return jsonify(product_variants_schema.dump(variants)), 200

@routes_app.route('/products/<int:product_id>/variants', methods=['POST'])
@admin_required
def create_product_variant(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()

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

@routes_app.route('/variants/<int:variant_id>', methods=['PUT'])
@admin_required
def update_product_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)
    data = request.get_json()

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

@routes_app.route('/variants/<int:variant_id>', methods=['DELETE'])
@admin_required
def delete_product_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)

    db.session.delete(variant)
    db.session.commit()

    return jsonify({"message": "Product variant deleted successfully"}), 200



# ================================
# ✅ Get Cart Items
# ================================
# ================================
# CART ROUTES - FIXED
# ================================

# Get Cart Items
@routes_app.route('/cart', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_cart():
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
        print("Get cart error:", str(e))
        return jsonify({"error": "Failed to retrieve cart", "details": str(e)}), 500

# Add Item to Cart
@routes_app.route('/cart', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def add_to_cart():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        print("Add to cart data:", data)  # Debug log

        # Validate required fields
        if not data or not data.get('product_id'):
            return jsonify({"error": "Product ID is required"}), 400

        product_id = int(data.get('product_id'))
        product = Product.query.get(product_id)

        if not product:
            return jsonify({"error": f"Product not found with ID: {product_id}"}), 404

        quantity = max(1, int(data.get('quantity', 1)))
        variant_id = data.get('variant_id')

        if variant_id:
            variant_id = int(variant_id)

        # Validate variant if provided
        if variant_id:
            variant = ProductVariant.query.get(variant_id)
            if not variant or variant.product_id != product.id:
                return jsonify({"error": "Invalid variant"}), 400

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
        print("Add to cart error:", str(e))
        return jsonify({"error": "Failed to add item to cart", "details": str(e)}), 500

# Update Cart Item Quantity
@routes_app.route('/cart/<int:item_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_cart_item(item_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        item = CartItem.query.get_or_404(item_id)

        if str(item.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        print("Update cart data:", data)  # Debug log

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
        print("Update cart error:", str(e))
        return jsonify({"error": "Failed to update cart", "details": str(e)}), 500

# Remove Item from Cart
@routes_app.route('/cart/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_cart(item_id):
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
        print("Remove from cart error:", str(e))
        return jsonify({"error": "Failed to remove item from cart", "details": str(e)}), 500

# Clear Entire Cart
@routes_app.route('/cart/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_cart():
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
        print("Clear cart error:", str(e))
        return jsonify({"error": "Failed to clear cart", "details": str(e)}), 500

# ================================
# WISHLIST ROUTES - FIXED
# ================================

@routes_app.route('/wishlist', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_wishlist():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
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
        print("Get wishlist error:", str(e))
        return jsonify({"error": "Failed to retrieve wishlist", "details": str(e)}), 500

@routes_app.route('/wishlist', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def add_to_wishlist():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        print("Add to wishlist data:", data)  # Debug log

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
        print("Add to wishlist error:", str(e))
        return jsonify({"error": "Failed to add item to wishlist", "details": str(e)}), 500

@routes_app.route('/wishlist/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_wishlist(item_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
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
        print("Remove from wishlist error:", str(e))
        return jsonify({"error": "Failed to remove item from wishlist", "details": str(e)}), 500

@routes_app.route('/wishlist/product/<int:product_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_product_from_wishlist(product_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first_or_404()

        db.session.delete(item)
        db.session.commit()

        return jsonify({"message": "Item removed from wishlist"}), 200

    except Exception as e:
        db.session.rollback()
        print("Remove product from wishlist error:", str(e))
        return jsonify({"error": "Failed to remove item from wishlist", "details": str(e)}), 500

@routes_app.route('/wishlist/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_wishlist():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        WishlistItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()

        return jsonify({"message": "Wishlist cleared successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print("Clear wishlist error:", str(e))
        return jsonify({"error": "Failed to clear wishlist", "details": str(e)}), 500





# ================================
# REVIEW ROUTES - FIXED
# ================================
@routes_app.route('/products/<int:product_id>/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_reviews(product_id):
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
        print("Get product reviews error:", str(e))
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@routes_app.route('/products/<int:product_id>/reviews', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_review(product_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        print("Create review data:", data)  # Debug log

        # Validate required fields
        if 'rating' not in data:
            return jsonify({"error": "Rating is required"}), 400

        # Check if user already reviewed this product
        existing_review = Review.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()

        if existing_review:
            return jsonify({"error": "You have already reviewed this product"}), 409

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
        print("Create review error:", str(e))
        return jsonify({"error": "Failed to create review", "details": str(e)}), 500

@routes_app.route('/reviews/<int:review_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_review(review_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        review = Review.query.get_or_404(review_id)

        # Ensure review belongs to current user
        if str(review.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        print("Update review data:", data)  # Debug log

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
        print("Update review error:", str(e))
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@routes_app.route('/reviews/<int:review_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_review(review_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
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
        print("Delete review error:", str(e))
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

# ================================
# ORDER ROUTES - FIXED
# ================================
@routes_app.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_user_orders():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        page, per_page = get_pagination_params()

        query = Order.query.filter_by(user_id=current_user_id).order_by(Order.created_at.desc())

        return jsonify(paginate_response(query, orders_schema, page, per_page)), 200
    except Exception as e:
        print("Get user orders error:", str(e))
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@routes_app.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order(order_id):
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

        return jsonify(order_schema.dump(order)), 200
    except Exception as e:
        print("Get order error:", str(e))
        return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@routes_app.route('/orders', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_order():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        print("Create order data:", data)  # Debug log

        # Validate required fields
        required_fields = ['shipping_address', 'billing_address', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

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

            price = variant.price if variant else product.sale_price or product.price
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

                # Check minimum purchase requirement
                if coupon.min_purchase and total_amount < coupon.min_purchase:
                    return jsonify({"error": f"Minimum purchase of {coupon.min_purchase} required for this coupon"}), 400

                # Apply discount
                discount = 0
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
            shipping_address=data['shipping_address'],
            billing_address=data['billing_address'],
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
            "order": order_schema.dump(new_order)
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Create order error:", str(e))
        return jsonify({"error": "Failed to create order", "details": str(e)}), 500

@routes_app.route('/orders/<int:order_id>/cancel', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def cancel_order(order_id):
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

        order.status = OrderStatus.CANCELLED
        db.session.commit()

        return jsonify({
            "message": "Order cancelled successfully",
            "order": order_schema.dump(order)
        }), 200
    except Exception as e:
        db.session.rollback()
        print("Cancel order error:", str(e))
        return jsonify({"error": "Failed to cancel order", "details": str(e)}), 500

@routes_app.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_order_status(order_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        order = Order.query.get_or_404(order_id)
        data = request.get_json()
        print("Update order status data:", data)  # Debug log

        if 'status' not in data:
            return jsonify({"error": "Status is required"}), 400

        try:
            new_status = OrderStatus(data['status'])
            order.status = new_status
            db.session.commit()

            return jsonify({
                "message": "Order status updated successfully",
                "order": order_schema.dump(order)
            }), 200
        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400
    except Exception as e:
        db.session.rollback()
        print("Update order status error:", str(e))
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

# ================================
# PAYMENT ROUTES - FIXED
# ================================
@routes_app.route('/orders/<int:order_id>/payments', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_payment(order_id):
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

        data = request.get_json()
        print("Create payment data:", data)  # Debug log

        # Validate required fields
        required_fields = ['amount', 'payment_method', 'transaction_id']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

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
        print("Create payment error:", str(e))
        return jsonify({"error": "Failed to process payment", "details": str(e)}), 500

# ================================
# COUPON ROUTES - FIXED
# ================================
@routes_app.route('/coupons/validate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def validate_coupon():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()
        print("Validate coupon data:", data)  # Debug log

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
        print("Validate coupon error:", str(e))
        return jsonify({"error": "Failed to validate coupon", "details": str(e)}), 500

@routes_app.route('/coupons', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_coupons():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()
        query = Coupon.query.order_by(Coupon.created_at.desc())

        return jsonify(paginate_response(query, coupons_schema, page, per_page)), 200
    except Exception as e:
        print("Get coupons error:", str(e))
        return jsonify({"error": "Failed to retrieve coupons", "details": str(e)}), 500

@routes_app.route('/coupons', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_coupon():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()
        print("Create coupon data:", data)  # Debug log

        # Validate required fields
        required_fields = ['code', 'type', 'value']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Check if coupon code already exists
        if Coupon.query.filter_by(code=data['code']).first():
            return jsonify({"error": "Coupon code already exists"}), 409

        try:
            coupon_type = CouponType(data['type'])
        except ValueError:
            return jsonify({"error": "Invalid coupon type"}), 400

        # Create coupon
        new_coupon = Coupon(
            code=data['code'],
            type=coupon_type,
            value=data['value'],
            min_purchase=data.get('min_purchase'),
            max_discount=data.get('max_discount'),
            start_date=datetime.fromisoformat(data['start_date']) if 'start_date' in data else None,
            end_date=datetime.fromisoformat(data['end_date']) if 'end_date' in data else None,
            usage_limit=data.get('usage_limit'),
            is_active=data.get('is_active', True)
        )

        db.session.add(new_coupon)
        db.session.commit()

        return jsonify({
            "message": "Coupon created successfully",
            "coupon": coupon_schema.dump(new_coupon)
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Create coupon error:", str(e))
        return jsonify({"error": "Failed to create coupon", "details": str(e)}), 500

# ================================
# NEWSLETTER ROUTES - FIXED
# ================================
@routes_app.route('/newsletter/subscribe', methods=['POST', 'OPTIONS'])
@cross_origin()
def subscribe_newsletter():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()
        print("Subscribe newsletter data:", data)  # Debug log

        if not data.get('email'):
            return jsonify({"error": "Email is required"}), 400

        # Check if email already subscribed
        existing = Newsletter.query.filter_by(email=data['email']).first()

        if existing:
            if existing.is_subscribed:
                return jsonify({"message": "Email already subscribed"}), 200
            else:
                existing.is_subscribed = True
                db.session.commit()
                return jsonify({"message": "Subscription renewed successfully"}), 200

        # Create new subscription
        new_subscription = Newsletter(
            email=data['email'],
            is_subscribed=True
        )

        db.session.add(new_subscription)
        db.session.commit()

        return jsonify({"message": "Subscribed successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("Subscribe newsletter error:", str(e))
        return jsonify({"error": "Failed to subscribe to newsletter", "details": str(e)}), 500

@routes_app.route('/newsletter/unsubscribe', methods=['POST', 'OPTIONS'])
@cross_origin()
def unsubscribe_newsletter():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()
        print("Unsubscribe newsletter data:", data)  # Debug log

        if not data.get('email'):
            return jsonify({"error": "Email is required"}), 400

        subscription = Newsletter.query.filter_by(email=data['email']).first()

        if not subscription:
            return jsonify({"error": "Email not found in subscription list"}), 404

        subscription.is_subscribed = False
        db.session.commit()

        return jsonify({"message": "Unsubscribed successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print("Unsubscribe newsletter error:", str(e))
        return jsonify({"error": "Failed to unsubscribe from newsletter", "details": str(e)}), 500

# ================================
# ADMIN DASHBOARD ROUTES - FIXED
# ================================
@routes_app.route('/admin/dashboard', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_dashboard():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Get counts
        user_count = User.query.count()
        product_count = Product.query.count()
        order_count = Order.query.count()

        # Get recent orders
        recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()

        # Get sales data
        today = datetime.utcnow().date()
        start_of_month = datetime(today.year, today.month, 1)

        # Today's sales
        today_sales = db.session.query(func.sum(Order.total_amount)).filter(
            func.date(Order.created_at) == today,
            Order.status != OrderStatus.CANCELLED
        ).scalar() or 0

        # Monthly sales
        monthly_sales = db.session.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= start_of_month,
            Order.status != OrderStatus.CANCELLED
        ).scalar() or 0

        # Get order status counts
        status_counts = {}
        for status in OrderStatus:
            count = Order.query.filter_by(status=status).count()
            status_counts[status.value] = count

        return jsonify({
            "counts": {
                "users": user_count,
                "products": product_count,
                "orders": order_count
            },
            "sales": {
                "today": today_sales,
                "monthly": monthly_sales
            },
            "order_status": status_counts,
            "recent_orders": orders_schema.dump(recent_orders)
        }), 200
    except Exception as e:
        print("Admin dashboard error:", str(e))
        return jsonify({"error": "Failed to retrieve dashboard data", "details": str(e)}), 500

@routes_app.route('/admin/users', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_get_users():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()
        query = User.query.order_by(User.created_at.desc())

        # Filter by role if provided
        role = request.args.get('role')
        if role:
            try:
                user_role = UserRole(role)
                query = query.filter_by(role=user_role)
            except ValueError:
                pass

        return jsonify(paginate_response(query, users_schema, page, per_page)), 200
    except Exception as e:
        print("Admin get users error:", str(e))
        return jsonify({"error": "Failed to retrieve users", "details": str(e)}), 500

@routes_app.route('/admin/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_get_orders():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()
        query = Order.query.order_by(Order.created_at.desc())

        # Filter by status if provided
        status = request.args.get('status')
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass

        return jsonify(paginate_response(query, orders_schema, page, per_page)), 200
    except Exception as e:
        print("Admin get orders error:", str(e))
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

# Error handlers
@routes_app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@routes_app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

@routes_app.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "Unauthorized"}), 401

@routes_app.errorhandler(403)
def forbidden(error):
    return jsonify({"error": "Forbidden"}), 403

@routes_app.errorhandler(500)
def internal_server_error(error):
    db.session.rollback()
    return jsonify({"error": "Internal server error"}), 500
