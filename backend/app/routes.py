"""
routes.py
---------
This module defines all API endpoints for both user and admin operations.
It uses SQLAlchemy models and Marshmallow schemas for data validation and serialization.
YAML docstrings are included for Swagger/OpenAPI documentation.
"""

from flask import Blueprint, jsonify, request, abort, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, set_access_cookies, unset_jwt_cookies
)
from werkzeug.utils import secure_filename
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
import os, uuid, stripe, json, base64
from PIL import Image

# Import models and schemas
from .models import (
    db, User, Product, Category, Brand, Order, OrderItem, CartItem,
    WishlistItem, Review, Coupon, Newsletter, Payment, ProductVariant
)
from .schemas import (
    user_schema, users_schema,
    category_schema, categories_schema,
    product_schema, products_schema,
    review_schema, reviews_schema,
    cart_item_schema, cart_items_schema,
    order_schema, orders_schema,
    coupon_schema, coupons_schema,
    payment_schema, payments_schema
)

routes_app = Blueprint('routes_app', __name__)

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user = User.query.get(get_jwt_identity())
        if not current_user or current_user.role != 'admin':
            return abort(403, description="Admin access required")
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file, folder='uploads', size=None):
    if not file or not allowed_file(file.filename):
        return None
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder, unique_filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    if size:
        image = Image.open(file)
        image.thumbnail(size)
        image.save(file_path, optimize=True, quality=85)
    else:
        file.save(file_path)
    return f"/static/{folder}/{unique_filename}"

def generate_order_number():
    prefix = datetime.utcnow().strftime('%Y%m')
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"ORD-{prefix}-{random_suffix}"

# ---------------------------------------------------------------------------
# AUTH ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        # Validate required fields
        if not all([data.get('name'), data.get('email'), data.get('password')]):
            return jsonify({"error": "Name, email, and password are required."}), 400

        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email already registered."}), 400

        # Create new user
        new_user = User(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            address=data.get('address'),
            role='user'  # Set default role
        )
        new_user.set_password(data['password'])

        try:
            db.session.add(new_user)
            db.session.commit()

            # Create tokens with string ID
            access_token = create_access_token(identity=str(new_user.id))
            refresh_token = create_refresh_token(identity=str(new_user.id))

            result = {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user_schema.dump(new_user)
            }

            response = jsonify(result)
            set_access_cookies(response, access_token)
            return response, 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@routes_app.route('/auth/login', methods=['POST'])
def login():
    """
    User Login
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              example: "john@example.com"
            password:
              type: string
              example: "test123"
    responses:
      200:
        description: Login successful
      401:
        description: Invalid credentials
      422:
        description: Validation error
    """
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password are required"}), 400

        user = User.query.filter_by(email=data['email']).first()

        if not user or not user.verify_password(data['password']):
            return jsonify({"error": "Invalid email or password"}), 401

        if not user.is_active:
            return jsonify({"error": "Account is deactivated"}), 403

        # Update last login timestamp
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Create tokens with string conversion
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        result = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_schema.dump(user)
        }

        response = jsonify(result)
        set_access_cookies(response, access_token)
        return response, 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@routes_app.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    User Logout
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Logout successful
    """
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)
    return response, 200

@routes_app.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh Access Token
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: New access token created
        schema:
          type: object
          properties:
            access_token:
              type: string
    """
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    return jsonify({'access_token': access_token}), 200

# ---------------------------------------------------------------------------
# USER PROFILE ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get User Profile
    ---
    tags:
      - User
    security:
      - Bearer: []
    responses:
      200:
        description: Returns user profile data
    """
    user = User.query.get_or_404(get_jwt_identity())
    return jsonify(user_schema.dump(user)), 200

@routes_app.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Update User Profile
    ---
    tags:
      - User
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            phone:
              type: string
            address:
              type: object
              properties:
                street:
                  type: string
                city:
                  type: string
    responses:
      200:
        description: Profile updated successfully
      400:
        description: Bad request
    """
    try:
        user = User.query.get_or_404(get_jwt_identity())
        data = request.get_json()

        if data.get('name'):
            user.name = data['name']
        if data.get('phone'):
            user.phone = data['phone']
        if data.get('address'):
            user.address = data['address']

        db.session.commit()
        return jsonify(user_schema.dump(user)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
# ---------------------------------------------------------------------------
# PRODUCT & CATEGORY ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/products', methods=['GET'])
def get_products():
    """
    Get Products with Filtering and Pagination
    ---
    tags:
      - Products
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 12
      - in: query
        name: category_id
        type: integer
      - in: query
        name: brand_id
        type: integer
      - in: query
        name: search
        type: string
      - in: query
        name: sort
        type: string
        enum: [created_at, price, name]
      - in: query
        name: order
        type: string
        enum: [asc, desc]
      - in: query
        name: min_price
        type: number
      - in: query
        name: max_price
        type: number
      - in: query
        name: is_featured
        type: boolean
      - in: query
        name: is_sale
        type: boolean
    responses:
      200:
        description: Returns paginated list of products
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category_id = request.args.get('category_id', type=int)
    brand_id = request.args.get('brand_id', type=int)
    search = request.args.get('search', '')
    sort = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    is_featured = request.args.get('is_featured', type=bool)
    is_sale = request.args.get('is_sale', type=bool)

    query = Product.query
    if category_id:
        query = query.filter_by(category_id=category_id)
    if brand_id:
        query = query.filter_by(brand_id=brand_id)
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f'%{search}%'),
                Product.description.ilike(f'%{search}%')
            )
        )
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if is_featured is not None:
        query = query.filter_by(is_featured=is_featured)
    if is_sale is not None:
        query = query.filter_by(is_sale=is_sale)
    if order == 'desc':
        query = query.order_by(getattr(Product, sort).desc())
    else:
        query = query.order_by(getattr(Product, sort).asc())
    pagination = query.paginate(page=page, per_page=per_page)
    result = {
        'items': products_schema.dump(pagination.items),
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    }
    return jsonify(result), 200

@routes_app.route('/products/<string:slug>', methods=['GET'])
def get_product(slug):
    """
    Get Single Product
    ---
    tags:
      - Products
    parameters:
      - in: path
        name: slug
        type: string
        required: true
    responses:
      200:
        description: Returns product details
      404:
        description: Product not found
    """
    product = Product.query.filter_by(slug=slug).first_or_404()
    return jsonify(product_schema.dump(product)), 200

@routes_app.route('/categories', methods=['GET'])
def get_categories():
    """
    Get Categories with Subcategories
    ---
    tags:
      - Categories
    responses:
      200:
        description: Returns list of categories with subcategories
    """
    categories = Category.query.filter_by(parent_id=None).all()
    result = []
    for category in categories:
        cat_dict = category_schema.dump(category)
        cat_dict['subcategories'] = categories_schema.dump(category.subcategories)
        result.append(cat_dict)
    return jsonify(result), 200

@routes_app.route('/categories/<string:slug>', methods=['GET'])
def get_category(slug):
    """
    Get Category Details
    ---
    tags:
      - Categories
    parameters:
      - in: path
        name: slug
        type: string
        required: true
    responses:
      200:
        description: Returns category details with subcategories
      404:
        description: Category not found
    """
    category = Category.query.filter_by(slug=slug).first_or_404()
    cat_dict = category_schema.dump(category)
    cat_dict['subcategories'] = categories_schema.dump(category.subcategories)
    return jsonify(cat_dict), 200

@routes_app.route('/brands', methods=['GET'])
def get_brands():
    """
    Get All Brands
    ---
    tags:
      - Brands
    responses:
      200:
        description: Returns list of brands
    """
    brands = Brand.query.all()
    return jsonify([brand.to_dict() for brand in brands]), 200

@routes_app.route('/brands/<string:slug>', methods=['GET'])
def get_brand(slug):
    """
    Get Single Brand
    ---
    tags:
      - Brands
    parameters:
      - in: path
        name: slug
        type: string
        required: true
    responses:
      200:
        description: Returns brand details
      404:
        description: Brand not found
    """
    brand = Brand.query.filter_by(slug=slug).first_or_404()
    return jsonify(brand.to_dict()), 200

# ---------------------------------------------------------------------------
# CART ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """
    Get User's Cart
    ---
    tags:
      - Cart
    security:
      - Bearer: []
    responses:
      200:
        description: Returns cart items and total amount
    """
    user_id = get_jwt_identity()
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    items = []
    total = 0
    for item in cart_items:
        product = Product.query.get(item.product_id)
        variant = ProductVariant.query.get(item.variant_id) if item.variant_id else None
        price = variant.price if variant and variant.price else product.price
        if product.is_sale and product.sale_price:
            price = product.sale_price
        item_total = price * item.quantity
        total += item_total
        items.append({
            **cart_item_schema.dump(item),
            'product': product.to_dict(),
            'variant': variant.to_dict() if variant else None,
            'price': price,
            'item_total': item_total
        })
    return jsonify({'items': items, 'total': total}), 200

@routes_app.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    """
    Add Item to Cart
    ---
    tags:
      - Cart
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - product_id
          properties:
            product_id:
              type: integer
            variant_id:
              type: integer
              nullable: true
            quantity:
              type: integer
              default: 1
    responses:
      200:
        description: Item added to cart successfully
      400:
        description: Bad request or insufficient stock
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data.get('product_id'):
        return abort(400, description="Product ID is required.")
    product = Product.query.get_or_404(data['product_id'])
    variant = None
    if data.get('variant_id'):
        variant = ProductVariant.query.get_or_404(data['variant_id'])
        if variant.stock < data.get('quantity', 1):
            return abort(400, description="Not enough stock available.")
    elif product.stock < data.get('quantity', 1):
        return abort(400, description="Not enough stock available.")
    existing_item = CartItem.query.filter_by(
        user_id=user_id,
        product_id=data['product_id'],
        variant_id=data.get('variant_id')
    ).first()
    if existing_item:
        existing_item.quantity += data.get('quantity', 1)
    else:
        new_item = CartItem(
            user_id=user_id,
            product_id=data['product_id'],
            variant_id=data.get('variant_id'),
            quantity=data.get('quantity', 1)
        )
        db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': 'Item added to cart successfully'}), 200

@routes_app.route('/cart/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    """
    Update Cart Item Quantity
    ---
    tags:
      - Cart
    security:
      - Bearer: []
    parameters:
      - in: path
        name: item_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            quantity:
              type: integer
              minimum: 1
    responses:
      200:
        description: Cart item updated successfully
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    if 'quantity' in data:
        product = Product.query.get(cart_item.product_id)
        variant = ProductVariant.query.get(cart_item.variant_id) if cart_item.variant_id else None
        if variant:
            if variant.stock < data['quantity']:
                return abort(400, description="Not enough stock available.")
        elif product.stock < data['quantity']:
            return abort(400, description="Not enough stock available.")
        cart_item.quantity = data['quantity']
    db.session.commit()
    return jsonify(cart_item_schema.dump(cart_item)), 200

@routes_app.route('/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """
    Remove Cart Item
    ---
    tags:
      - Cart
    security:
      - Bearer: []
    parameters:
      - in: path
        name: item_id
        type: integer
        required: true
    responses:
      200:
        description: Item removed from cart successfully
    """
    user_id = get_jwt_identity()
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Item removed from cart successfully'}), 200

# ---------------------------------------------------------------------------
# WISHLIST ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
    """
    Get User Wishlist
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    responses:
      200:
        description: Returns wishlist items with product details
    """
    user_id = get_jwt_identity()
    wishlist_items = WishlistItem.query.filter_by(user_id=user_id).all()
    items = []
    for item in wishlist_items:
        product = Product.query.get(item.product_id)
        items.append({
            **item.to_dict(),
            'product': product.to_dict()
        })
    return jsonify(items), 200

@routes_app.route('/wishlist', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    """
    Add Item to Wishlist
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - product_id
          properties:
            product_id:
              type: integer
    responses:
      200:
        description: Item added to wishlist successfully or already exists
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data.get('product_id'):
        return abort(400, description="Product ID is required.")
    existing_item = WishlistItem.query.filter_by(
        user_id=user_id,
        product_id=data['product_id']
    ).first()
    if existing_item:
        return jsonify({'message': 'Item already in wishlist'}), 200
    new_item = WishlistItem(user_id=user_id, product_id=data['product_id'])
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': 'Item added to wishlist successfully'}), 200

@routes_app.route('/wishlist/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(item_id):
    """
    Remove Item from Wishlist
    ---
    tags:
      - Wishlist
    security:
      - Bearer: []
    parameters:
      - in: path
        name: item_id
        type: integer
        required: true
    responses:
      200:
        description: Item removed from wishlist successfully
    """
    user_id = get_jwt_identity()
    wishlist_item = WishlistItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    db.session.delete(wishlist_item)
    db.session.commit()
    return jsonify({'message': 'Item removed from wishlist successfully'}), 200

# ---------------------------------------------------------------------------
# ORDER ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    """
    Get User Orders
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 10
    responses:
      200:
        description: Returns paginated orders for the user
    """
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    orders = Order.query.filter_by(user_id=user_id)\
        .order_by(Order.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    result = {
        'items': orders_schema.dump(orders.items),
        'total': orders.total,
        'pages': orders.pages,
        'current_page': orders.page
    }
    return jsonify(result), 200

@routes_app.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    """
    Create Order
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - items
            - shipping_address
          properties:
            items:
              type: array
              items:
                type: object
                properties:
                  product_id:
                    type: integer
                  variant_id:
                    type: integer
                    nullable: true
                  quantity:
                    type: integer
            shipping_address:
              type: object
            billing_address:
              type: object
            payment_method:
              type: string
            shipping_method:
              type: string
            shipping_fee:
              type: number
            coupon_code:
              type: string
            notes:
              type: string
    responses:
      201:
        description: Order created successfully
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    if not all([data.get('items'), data.get('shipping_address')]):
        return abort(400, description="Items and shipping address are required.")
    subtotal = 0
    order_items = []
    for item in data['items']:
        product = Product.query.get_or_404(item['product_id'])
        variant = ProductVariant.query.get(item.get('variant_id')) if item.get('variant_id') else None
        if variant:
            if variant.stock < item['quantity']:
                return abort(400, description=f"Not enough stock for {product.name} variant")
            variant.stock -= item['quantity']
        elif product.stock < item['quantity']:
            return abort(400, description=f"Not enough stock for {product.name}")
        price = variant.price if variant and variant.price else product.price
        if product.is_sale and product.sale_price:
            price = product.sale_price
        total = price * item['quantity']
        subtotal += total
        order_items.append({
            'product_id': product.id,
            'variant_id': variant.id if variant else None,
            'quantity': item['quantity'],
            'price': price,
            'total': total
        })
    shipping_fee = data.get('shipping_fee', 0)
    tax = subtotal * 0.16  # 16% VAT
    discount = 0
    if data.get('coupon_code'):
        coupon = Coupon.query.filter_by(code=data['coupon_code']).first()
        if coupon and coupon.is_active and coupon.start_date <= datetime.utcnow() <= coupon.end_date:
            if subtotal >= coupon.min_purchase:
                discount = (coupon.value if coupon.type == 'fixed'
                          else subtotal * (coupon.value / 100))
                if coupon.max_discount:
                    discount = min(discount, coupon.max_discount)
                coupon.used_count += 1
                if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
                    coupon.is_active = False
    total_amount = subtotal + shipping_fee + tax - discount
    new_order = Order(
        user_id=user_id,
        order_number=generate_order_number(),
        total_amount=total_amount,
        shipping_address=data['shipping_address'],
        billing_address=data.get('billing_address', data['shipping_address']),
        payment_method=data.get('payment_method'),
        shipping_method=data.get('shipping_method'),
        shipping_cost=shipping_fee,
        notes=data.get('notes')
    )
    db.session.add(new_order)
    db.session.commit()
    for item in order_items:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item['product_id'],
            variant_id=item['variant_id'],
            quantity=item['quantity'],
            price=item['price'],
            total=item['total']
        )
        db.session.add(order_item)
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify(order_schema.dump(new_order)), 201

# ---------------------------------------------------------------------------
# REVIEW ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/products/<int:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    """
    Get Reviews for a Product
    ---
    tags:
      - Reviews
    parameters:
      - in: path
        name: product_id
        type: integer
        required: true
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 10
    responses:
      200:
        description: Returns paginated reviews for the product
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    reviews = Review.query.filter_by(product_id=product_id)\
        .order_by(Review.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    result = {
        'items': reviews_schema.dump(reviews.items),
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': reviews.page
    }
    return jsonify(result), 200

@routes_app.route('/products/<int:product_id>/reviews', methods=['POST'])
@jwt_required()
def create_review(product_id):
    """
    Create a Review for a Product
    ---
    tags:
      - Reviews
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: path
        name: product_id
        type: integer
        required: true
      - in: formData
        name: rating
        type: integer
      - in: formData
        name: title
        type: string
      - in: formData
        name: comment
        type: string
      - in: formData
        name: images
        type: file
        description: One or more images (optional)
    responses:
      201:
        description: Review created successfully
      400:
        description: Bad request or review already exists
    """
    user_id = get_jwt_identity()
    data = request.form.to_dict()
    if not all([data.get('rating'), data.get('comment')]):
        return abort(400, description="Rating and comment are required.")
    existing_review = Review.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing_review:
        return abort(400, description="You have already reviewed this product")
    new_review = Review(
        user_id=user_id,
        product_id=product_id,
        rating=int(data['rating']),
        title=data.get('title'),
        comment=data['comment'],
        is_verified_purchase=False
    )
    if 'images' in request.files:
        images = request.files.getlist('images')
        image_urls = []
        for image in images:
            image_url = save_image(image, f'reviews/{product_id}')
            if image_url:
                image_urls.append(image_url)
        new_review.images = image_urls
    db.session.add(new_review)
    db.session.commit()
    return jsonify(review_schema.dump(new_review)), 201

# ---------------------------------------------------------------------------
# PAYMENT ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/payment/create-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
    """
    Create Payment Intent
    ---
    tags:
      - Payment
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - amount
            - order_id
          properties:
            amount:
              type: number
            order_id:
              type: integer
    responses:
      200:
        description: Returns payment intent client secret
        schema:
          type: object
          properties:
            clientSecret:
              type: string
      400:
        description: Bad request
    """
    try:
        data = request.get_json()
        amount = data.get('amount')
        order_id = data.get('order_id')
        if not all([amount, order_id]):
            return abort(400, description="Amount and order_id are required.")
        order = Order.query.get_or_404(order_id)
        if order.user_id != get_jwt_identity():
            return abort(403, description="Unauthorized")
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency='usd',
            metadata={'order_id': order_id}
        )
        order.payment_intent_id = intent.id
        db.session.commit()
        return jsonify({'clientSecret': intent.client_secret}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Removed duplicate payment_webhook route

# ---------------------------------------------------------------------------
# ADMIN ROUTES
# ---------------------------------------------------------------------------
@routes_app.route('/admin/products', methods=['POST'])
@admin_required
def create_product():
    """
    Create Product (Admin)
    ---
    tags:
      - Admin
      - Products
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: name
        type: string
        required: true
      - in: formData
        name: price
        type: number
        required: true
      - in: formData
        name: category_id
        type: integer
        required: true
      - in: formData
        name: description
        type: string
      - in: formData
        name: images
        type: file
        description: Multiple images allowed
      - in: formData
        name: thumbnail
        type: file
        description: Product thumbnail
      - in: formData
        name: variants
        type: string
        description: JSON string representing product variants (optional)
    responses:
      201:
        description: Product created successfully
      400:
        description: Bad request
    """
    data = request.form.to_dict()
    if not all([data.get('name'), data.get('price'), data.get('category_id')]):
        return abort(400, description="Name, price, and category_id are required.")
    image_urls = []
    if 'images' in request.files:
        images = request.files.getlist('images')
        for image in images:
            image_url = save_image(image, 'products')
            if image_url:
                image_urls.append(image_url)
    thumbnail_url = None
    if 'thumbnail' in request.files:
        thumbnail_url = save_image(request.files['thumbnail'], 'products/thumbnails', size=(300, 300))
    new_product = Product(
        name=data['name'],
        slug=data.get('slug'),
        description=data.get('description'),
        price=float(data['price']),
        sale_price=float(data['sale_price']) if data.get('sale_price') else None,
        stock=int(data.get('stock', 0)),
        category_id=int(data['category_id']),
        brand_id=int(data['brand_id']) if data.get('brand_id') else None,
        image_urls=image_urls,
        thumbnail_url=thumbnail_url,
        sku=data.get('sku'),
        weight=float(data['weight']) if data.get('weight') else None,
        dimensions=json.loads(data['dimensions']) if data.get('dimensions') else None,
        is_featured=data.get('is_featured', '').lower() == 'true',
        is_new=data.get('is_new', '').lower() == 'true',
        is_sale=data.get('is_sale', '').lower() == 'true',
        meta_title=data.get('meta_title'),
        meta_description=data.get('meta_description')
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify(product_schema.dump(new_product)), 201

@routes_app.route('/admin/products/<int:id>', methods=['PUT'])
@admin_required
def update_product(id):
    """
    Update Product (Admin)
    ---
    tags:
      - Admin
      - Products
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: formData
        name: name
        type: string
      - in: formData
        name: price
        type: number
      - in: formData
        name: description
        type: string
      - in: formData
        name: category_id
        type: integer
      - in: formData
        name: images
        type: file
        description: Multiple images allowed
      - in: formData
        name: thumbnail
        type: file
        description: Product thumbnail
    responses:
      200:
        description: Product updated successfully
    """
    product = Product.query.get_or_404(id)
    data = request.form.to_dict()
    if 'name' in data:
        product.name = data['name']
    if 'slug' in data:
        product.slug = data['slug']
    if 'description' in data:
        product.description = data['description']
    if 'price' in data:
        product.price = float(data['price'])
    if 'sale_price' in data:
        product.sale_price = float(data['sale_price']) if data['sale_price'] else None
    if 'stock' in data:
        product.stock = int(data['stock'])
    if 'category_id' in data:
        product.category_id = int(data['category_id'])
    if 'brand_id' in data:
        product.brand_id = int(data['brand_id']) if data['brand_id'] else None
    if 'images' in request.files:
        images = request.files.getlist('images')
        new_image_urls = []
        for image in images:
            image_url = save_image(image, 'products')
            if image_url:
                new_image_urls.append(image_url)
        if new_image_urls:
            product.image_urls = new_image_urls
    if 'thumbnail' in request.files:
        thumbnail_url = save_image(request.files['thumbnail'], 'products/thumbnails', size=(300, 300))
        if thumbnail_url:
            product.thumbnail_url = thumbnail_url
    db.session.commit()
    return jsonify(product_schema.dump(product)), 200

@routes_app.route('/admin/products/<int:id>', methods=['DELETE'])
@admin_required
def delete_product(id):
    """
    Delete Product (Admin)
    ---
    tags:
      - Admin
      - Products
    security:
      - Bearer: []
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200:
        description: Product deleted successfully
    """
    product = Product.query.get_or_404(id)
    CartItem.query.filter_by(product_id=id).delete()
    WishlistItem.query.filter_by(product_id=id).delete()
    Review.query.filter_by(product_id=id).delete()
    ProductVariant.query.filter_by(product_id=id).delete()
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted successfully'}), 200

@routes_app.route('/admin/orders', methods=['GET'])
@admin_required
def get_all_orders():
    """
    Get All Orders (Admin)
    ---
    tags:
      - Admin
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 20
      - in: query
        name: status
        type: string
    responses:
      200:
        description: Returns list of all orders
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    query = Order.query
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page)
    result = {
        'items': orders_schema.dump(orders.items),
        'total': orders.total,
        'pages': orders.pages,
        'current_page': orders.page
    }
    return jsonify(result), 200

@routes_app.route('/admin/orders/<int:id>', methods=['PUT'])
@admin_required
def update_order_status(id):
    """
    Update Order Status (Admin)
    ---
    tags:
      - Admin
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            status:
              type: string
            tracking_number:
              type: string
            notes:
              type: string
    responses:
      200:
        description: Order updated successfully
    """
    order = Order.query.get_or_404(id)
    data = request.get_json()
    if 'status' in data:
        order.status = data['status']
    if 'tracking_number' in data:
        order.tracking_number = data['tracking_number']
    if 'notes' in data:
        order.notes = data['notes']
    db.session.commit()
    return jsonify(order_schema.dump(order)), 200

@routes_app.route('/admin/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """
    Get Dashboard Statistics (Admin)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Returns dashboard statistics including totals and revenue
    """
    total_users = User.query.count()
    total_orders = Order.query.count()
    total_products = Product.query.count()
    today = datetime.utcnow().date()
    start_of_month = today.replace(day=1)
    revenue_today = db.session.query(db.func.sum(Order.total_amount))\
        .filter(db.func.date(Order.created_at) == today).scalar() or 0
    revenue_month = db.session.query(db.func.sum(Order.total_amount))\
        .filter(db.func.date(Order.created_at) >= start_of_month).scalar() or 0
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    low_stock_products = Product.query.filter(Product.stock < 10).limit(5).all()
    stats = {
        'total_users': total_users,
        'total_orders': total_orders,
        'total_products': total_products,
        'revenue_today': revenue_today,
        'revenue_month': revenue_month,
        'recent_orders': orders_schema.dump(recent_orders),
        'low_stock_products': products_schema.dump(low_stock_products)
    }
    return jsonify(stats), 200

# ---------------------------------------------------------------------------
# PAYMENT WEBHOOK
# ---------------------------------------------------------------------------
@routes_app.route('/payment/webhook', methods=['POST'])
def payment_webhook():
    """
    Stripe Webhook
    ---
    tags:
      - Payment
    consumes:
      - application/json
    responses:
      200:
        description: Webhook processed successfully
      400:
        description: Invalid payload or signature
    """
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
        )
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        order_id = payment_intent['metadata'].get('order_id')
        if order_id:
            order = Order.query.get(order_id)
            if order:
                payment = Payment(
                    order_id=order.id,
                    amount=payment_intent['amount'] / 100,
                    payment_method='stripe',
                    transaction_id=payment_intent['id'],
                    transaction_data=payment_intent,
                    status='completed',
                    completed_at=datetime.utcnow()
                )
                db.session.add(payment)
                order.payment_status = 'paid'
                order.status = 'processing'
                db.session.commit()
    return jsonify({'received': True}), 200

# ---------------------------------------------------------------------------
# End of routes.py