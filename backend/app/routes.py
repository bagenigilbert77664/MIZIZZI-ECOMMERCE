"""
routes.py
---------
This module defines the API endpoints for the eCommerce project. It covers endpoints
for authentication, user profile, products, categories, brands, cart, wishlist,
orders, reviews, payments, and admin operations. Marshmallow schemas are used for
request validation and response serialization. YAML docstrings are provided for
Swagger/OpenAPI documentation.
"""

from functools import wraps
from flask import Blueprint, jsonify, request, abort, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, set_access_cookies, unset_jwt_cookies
)
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from datetime import datetime
import os, uuid, stripe, json
from PIL import Image

# Import models and enums
from .models import (
    db, User, Product, Category, Brand, Order, OrderItem, CartItem,
    WishlistItem, Review, Coupon, Payment, ProductVariant,
    UserRole, OrderStatus, PaymentStatus, CouponType
)
# Import Marshmallow schemas
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

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user = User.query.get(get_jwt_identity())
        if not current_user or current_user.role != UserRole.ADMIN:
            abort(403, description="Admin access required")
        return fn(*args, **kwargs)
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

# ----------------------------------------------------------------------------
# Error Handlers
# ----------------------------------------------------------------------------

@routes_app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': error.description or 'Bad Request'}), 400

@routes_app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': error.description or 'Unauthorized'}), 401

@routes_app.errorhandler(403)
def forbidden(error):
    return jsonify({'error': error.description or 'Forbidden'}), 403

@routes_app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not Found'}), 404

@routes_app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal Server Error'}), 500

# ----------------------------------------------------------------------------
# AUTH ROUTES
# ----------------------------------------------------------------------------

@routes_app.route('/auth/register', methods=['POST'])
def register():
    """
    User Registration
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        description: User registration data
        required: true
        schema:
          type: object
          required:
            - name
            - email
            - password
          properties:
            name:
              type: string
              example: "John Doe"
            email:
              type: string
              example: "john@example.com"
            password:
              type: string
              example: "test123"
            phone:
              type: string
              example: "1234567890"
            address:
              type: object
              properties:
                street:
                  type: string
                  example: "123 Main St"
                city:
                  type: string
                  example: "Nairobi"
    responses:
      201:
        description: User registered successfully
        schema:
          type: object
          properties:
            access_token:
              type: string
            refresh_token:
              type: string
            user:
              type: object
      400:
        description: Bad request
    """
    data = request.get_json()
    if not all([data.get('name'), data.get('email'), data.get('password')]):
        abort(400, description="Name, email, and password are required.")
    if User.query.filter_by(email=data['email']).first():
        abort(400, description="Email already registered.")
    new_user = User(
        name=data['name'],
        email=data['email'],
        phone=data.get('phone'),
        address=data.get('address')
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    access_token = create_access_token(identity=new_user.id)
    refresh_token = create_refresh_token(identity=new_user.id)
    result = {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_schema.dump(new_user)
    }
    response = jsonify(result)
    set_access_cookies(response, access_token)
    return response, 201

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
        schema:
          type: object
          properties:
            access_token:
              type: string
            refresh_token:
              type: string
            user:
              type: object
      401:
        description: Invalid credentials
    """
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        abort(400, description="Email and password are required.")
    user = User.query.filter_by(email=data['email']).first()
    if user and user.verify_password(data['password']):
        if not user.is_active:
            abort(403, description="Account is deactivated.")
        user.last_login = datetime.utcnow()
        db.session.commit()
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        result = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_schema.dump(user)
        }
        response = jsonify(result)
        set_access_cookies(response, access_token)
        return response, 200
    else:
        abort(401, description="Invalid email or password.")

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

# ----------------------------------------------------------------------------
# USER PROFILE ROUTES
# ----------------------------------------------------------------------------

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
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: name
        type: string
      - in: formData
        name: phone
        type: string
      - in: formData
        name: address
        type: string
        description: JSON string representing the address
      - in: formData
        name: avatar
        type: file
        description: User profile image
      - in: formData
        name: current_password
        type: string
      - in: formData
        name: new_password
        type: string
    responses:
      200:
        description: Profile updated successfully
    """
    user = User.query.get_or_404(get_jwt_identity())
    data = request.form.to_dict()
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'address' in data:
        try:
            user.address = json.loads(data['address'])
        except json.JSONDecodeError:
            abort(400, description="Invalid address format")
    if 'avatar' in request.files:
        avatar_url = save_image(request.files['avatar'], 'avatars', size=(200, 200))
        if avatar_url:
            user.avatar_url = avatar_url
    if 'current_password' in data and 'new_password' in data:
        if not user.verify_password(data['current_password']):
            abort(400, description="Current password is incorrect")
        user.set_password(data['new_password'])
    db.session.commit()
    return jsonify(user_schema.dump(user)), 200

# ----------------------------------------------------------------------------
# PRODUCT ROUTES
# ----------------------------------------------------------------------------

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
    if not hasattr(Product, sort):
        sort = 'created_at'
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

@routes_app.route('/products/<int:product_id>/related', methods=['GET'])
def get_related_products(product_id):
    """
    Get Related Products
    ---
    tags:
      - Products
    parameters:
      - in: path
        name: product_id
        type: integer
        required: true
    responses:
      200:
        description: Returns related products based on category
    """
    product = Product.query.get_or_404(product_id)
    related = Product.query.filter(
        Product.category_id == product.category_id,
        Product.id != product.id
    ).limit(4).all()
    return jsonify(products_schema.dump(related)), 200

@routes_app.route('/flash-sales', methods=['GET'])
def get_flash_sales():
    """
    Get Flash Sale Products
    ---
    tags:
      - Products
    responses:
      200:
        description: Returns list of flash sale products
    """
    products = Product.query.filter_by(is_sale=True).all()
    return jsonify(products_schema.dump(products)), 200

@routes_app.route('/trending', methods=['GET'])
def get_trending_products():
    """
    Get Trending Products
    ---
    tags:
      - Products
    responses:
      200:
        description: Returns list of trending products sorted by rating
    """
    products = Product.query.order_by(Product.rating.desc()).limit(10).all()
    return jsonify(products_schema.dump(products)), 200

# ----------------------------------------------------------------------------
# CATEGORY ROUTES
# ----------------------------------------------------------------------------

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
    Get Single Category Details
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

# ----------------------------------------------------------------------------
# BRAND ROUTES
# ----------------------------------------------------------------------------

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

# ----------------------------------------------------------------------------
# CART ROUTES
# ----------------------------------------------------------------------------

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
        description: Returns cart items with calculated totals
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
        required: true
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
        abort(400, description="Product ID is required.")
    product = Product.query.get_or_404(data['product_id'])
    variant = None
    if data.get('variant_id'):
        variant = ProductVariant.query.get_or_404(data['variant_id'])
        if variant.stock < data.get('quantity', 1):
            abort(400, description="Not enough stock available.")
    elif product.stock < data.get('quantity', 1):
        abort(400, description="Not enough stock available.")
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
    Update Cart Item
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
        if variant and variant.stock < data['quantity']:
            abort(400, description="Not enough stock available.")
        elif not variant and product.stock < data['quantity']:
            abort(400, description="Not enough stock available.")
        cart_item.quantity = data['quantity']
    db.session.commit()
    return jsonify(cart_item_schema.dump(cart_item)), 200

@routes_app.route('/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """
    Remove Item from Cart
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

# ----------------------------------------------------------------------------
# WISHLIST ROUTES
# ----------------------------------------------------------------------------

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
        abort(400, description="Product ID is required.")
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

# ----------------------------------------------------------------------------
# ORDER ROUTES
# ----------------------------------------------------------------------------

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
    consumes:
      - application/json
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
        abort(400, description="Items and shipping address are required.")

    subtotal = 0
    order_items = []
    for item in data['items']:
        product = Product.query.get_or_404(item['product_id'])
        variant = ProductVariant.query.get(item.get('variant_id')) if item.get('variant_id') else None
        if variant:
            if variant.stock < item['quantity']:
                abort(400, description=f"Not enough stock for {product.name} variant")
            variant.stock -= item['quantity']
        elif product.stock < item['quantity']:
            abort(400, description=f"Not enough stock for {product.name}")
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
    tax = subtotal * 0.16
    discount = 0
    if data.get('coupon_code'):
        coupon = Coupon.query.filter_by(code=data['coupon_code']).first()
        if coupon and coupon.is_active and coupon.start_date <= datetime.utcnow() <= coupon.end_date:
            if subtotal >= coupon.min_purchase:
                discount = coupon.value if coupon.type == CouponType.FIXED else subtotal * (coupon.value / 100)
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
    # Clear user's cart after order creation
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify(order_schema.dump(new_order)), 201

# ----------------------------------------------------------------------------
# REVIEW ROUTES
# ----------------------------------------------------------------------------

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
        abort(400, description="Rating and comment are required.")
    existing_review = Review.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing_review:
        abort(400, description="You have already reviewed this product")
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

# ----------------------------------------------------------------------------
# PAYMENT ROUTES
# ----------------------------------------------------------------------------

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
    consumes:
      - application/json
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
            abort(400, description="Amount and order_id are required.")
        order = Order.query.get_or_404(order_id)
        if order.user_id != get_jwt_identity():
            abort(403, description="Unauthorized")
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency='usd',
            metadata={'order_id': order_id}
        )
        if hasattr(order, 'payment_intent_id'):
            order.payment_intent_id = intent.id
        db.session.commit()
        return jsonify({'clientSecret': intent.client_secret}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@routes_app.route('/payment/webhook', methods=['POST'])
def stripe_webhook():
    """
    Stripe Webhook Endpoint
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
                    status=PaymentStatus.COMPLETED,
                    completed_at=datetime.utcnow()
                )
                db.session.add(payment)
                order.payment_status = PaymentStatus.COMPLETED
                order.status = OrderStatus.PROCESSING
                db.session.commit()
    return jsonify({'received': True}), 200

# ----------------------------------------------------------------------------
# ADMIN ROUTES
# ----------------------------------------------------------------------------

@routes_app.route('/admin/products', methods=['POST'])
@admin_required
def create_product():
    """
    Create Product (Admin Only)
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
        abort(400, description="Name, price, and category_id are required.")
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

# ----------------------------------------------------------------------------
# Blueprint Registration
# ----------------------------------------------------------------------------
# To register these routes in your application factory:
#   from routes import routes_app
#   app.register_blueprint(routes_app, url_prefix='/api')
