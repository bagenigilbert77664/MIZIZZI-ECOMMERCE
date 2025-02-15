from flask import Blueprint, jsonify, request, abort, current_app, send_file
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, set_access_cookies, unset_jwt_cookies
)
from werkzeug.utils import secure_filename
from flask_cors import cross_origin
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
import os
import uuid
import stripe
import json
from PIL import Image
import io

from .models import (
    db, User, Product, Category, Brand, Order, OrderItem, CartItem,
    WishlistItem, Review, Coupon, Newsletter, Payment, ProductVariant
)

routes_app = Blueprint('routes_app', __name__)

# CORS Configuration
@routes_app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# Helper Functions
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

    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Process image if size is specified
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

# ---------- AUTH ROUTES ----------

@routes_app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    if not all([data.get('name'), data.get('email'), data.get('password')]):
        return abort(400, description="Name, email, and password are required.")

    if User.query.filter_by(email=data['email']).first():
        return abort(400, description="Email already registered.")

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

    response = jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': new_user.to_dict()
    })
    set_access_cookies(response, access_token)
    return response, 201

@routes_app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return abort(400, description="Email and password are required.")

    user = User.query.filter_by(email=data['email']).first()

    if user and user.verify_password(data['password']):
        if not user.is_active:
            return abort(403, description="Account is deactivated.")

        user.last_login = datetime.utcnow()
        db.session.commit()

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        response = jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        })
        set_access_cookies(response, access_token)
        return response, 200
    else:
        return abort(401, description="Invalid email or password.")

@routes_app.route('/auth/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)
    return response, 200

@routes_app.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)

    return jsonify({
        'access_token': access_token
    }), 200

# ---------- USER ROUTES ----------

@routes_app.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = User.query.get_or_404(get_jwt_identity())
    return jsonify(user.to_dict()), 200

@routes_app.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
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
            return abort(400, description="Invalid address format")

    if 'avatar' in request.files:
        avatar_url = save_image(
            request.files['avatar'],
            'avatars',
            size=(200, 200)
        )
        if avatar_url:
            user.avatar_url = avatar_url

    if 'current_password' in data and 'new_password' in data:
        if not user.verify_password(data['current_password']):
            return abort(400, description="Current password is incorrect")
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify(user.to_dict()), 200

# ---------- PRODUCT ROUTES ----------

@routes_app.route('/products', methods=['GET'])
def get_products():
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

    # Apply filters
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

    # Apply sorting
    if order == 'desc':
        query = query.order_by(getattr(Product, sort).desc())
    else:
        query = query.order_by(getattr(Product, sort).asc())

    # Paginate results
    pagination = query.paginate(page=page, per_page=per_page)

    return jsonify({
        'items': [item.to_dict() for item in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    }), 200

@routes_app.route('/products/<string:slug>', methods=['GET'])
def get_product(slug):
    product = Product.query.filter_by(slug=slug).first_or_404()
    return jsonify(product.to_dict()), 200

# ---------- CATEGORY ROUTES ----------

@routes_app.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.filter_by(parent_id=None).all()
    return jsonify([{
        **category.to_dict(),
        'subcategories': [sub.to_dict() for sub in category.subcategories]
    } for category in categories]), 200

@routes_app.route('/categories/<string:slug>', methods=['GET'])
def get_category(slug):
    category = Category.query.filter_by(slug=slug).first_or_404()
    return jsonify({
        **category.to_dict(),
        'subcategories': [sub.to_dict() for sub in category.subcategories]
    }), 200

# ---------- BRAND ROUTES ----------

@routes_app.route('/brands', methods=['GET'])
def get_brands():
    brands = Brand.query.all()
    return jsonify([brand.to_dict() for brand in brands]), 200

@routes_app.route('/brands/<string:slug>', methods=['GET'])
def get_brand(slug):
    brand = Brand.query.filter_by(slug=slug).first_or_404()
    return jsonify(brand.to_dict()), 200

# ---------- CART ROUTES ----------

@routes_app.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
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
            **item.to_dict(),
            'product': product.to_dict(),
            'variant': variant.to_dict() if variant else None,
            'price': price,
            'item_total': item_total
        })

    return jsonify({
        'items': items,
        'total': total
    }), 200

@routes_app.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
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
    return jsonify(cart_item.to_dict()), 200

@routes_app.route('/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    user_id = get_jwt_identity()
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()

    db.session.delete(cart_item)
    db.session.commit()

    return jsonify({'message': 'Item removed from cart successfully'}), 200

# ---------- WISHLIST ROUTES ----------

@routes_app.route('/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
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

    new_item = WishlistItem(
        user_id=user_id,
        product_id=data['product_id']
    )
    db.session.add(new_item)
    db.session.commit()

    return jsonify({'message': 'Item added to wishlist successfully'}), 200

@routes_app.route('/wishlist/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(item_id):
    user_id = get_jwt_identity()
    wishlist_item = WishlistItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()

    db.session.delete(wishlist_item)
    db.session.commit()

    return jsonify({'message': 'Item removed from wishlist successfully'}), 200

# ---------- ORDER ROUTES ----------

@routes_app.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    orders = Order.query.filter_by(user_id=user_id)\
        .order_by(Order.created_at.desc())\
        .paginate(page=page, per_page=per_page)

    return jsonify({
        'items': [order.to_dict() for order in orders.items],
        'total': orders.total,
        'pages': orders.pages,
        'current_page': orders.page
    }), 200

@routes_app.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not all([data.get('items'), data.get('shipping_address')]):
        return abort(400, description="Items and shipping address are required.")

    # Calculate totals
    subtotal = 0
    order_items = []

    for item in data['items']:
        product = Product.query.get_or_404(item['product_id'])
        variant = ProductVariant.query.get(item.get('variant_id')) if item.get('variant_id') else None

        # Check stock
        if variant:
            if variant.stock < item['quantity']:
                return abort(400, description=f"Not enough stock for {product.name} variant")
            variant.stock -= item['quantity']
        else:
            if product.stock < item['quantity']:
                return abort(400, description=f"Not enough stock for {product.name}")
            product.stock -= item['quantity']

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

    # Apply shipping fee and tax
    shipping_fee = data.get('shipping_fee', 0)
    tax = subtotal * 0.16  # 16% VAT

    # Apply discount if coupon is provided
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

    # Create order
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

    # Create order items
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

    # Clear cart
    CartItem.query.filter_by(user_id=user_id).delete()

    db.session.commit()

    return jsonify(new_order.to_dict()), 201

# ---------- REVIEW ROUTES ----------

@routes_app.route('/products/<int:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    reviews = Review.query.filter_by(product_id=product_id)\
        .order_by(Review.created_at.desc())\
        .paginate(page=page, per_page=per_page)

    return jsonify({
        'items': [review.to_dict() for review in reviews.items],
        'total': reviews.total,
        'pages': reviews.pages,
        'current_page': reviews.page
    }), 200

@routes_app.route('/products/<int:product_id>/reviews', methods=['POST'])
@jwt_required()
def create_review(product_id):
    user_id = get_jwt_identity()
    data = request.form.to_dict()

    if not all([data.get('rating'), data.get('comment')]):
        return abort(400, description="Rating and comment are required.")

    # Check if user has purchased the product
    orders = Order.query.filter_by(user_id=user_id).all()
    has_purchased = False
    for order in orders:
        if any(item.product_id == product_id for item in order.items):
            has_purchased = True
            break

    # Check if user has already reviewed
    existing_review = Review.query.filter_by(
        user_id=user_id,
        product_id=product_id
    ).first()

    if existing_review:
        return abort(400, description="You have already reviewed this product")

    new_review = Review(
        user_id=user_id,
        product_id=product_id,
        rating=int(data['rating']),
        title=data.get('title'),
        comment=data['comment'],
        is_verified_purchase=has_purchased
    )

    # Handle image uploads
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

    return jsonify(new_review.to_dict()), 201

# ---------- PAYMENT ROUTES ----------

@routes_app.route('/payment/create-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
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
            amount=int(amount * 100),  # Convert to cents
            currency='usd',
            metadata={'order_id': order_id}
        )

        # Update order with payment intent
        order.payment_intent_id = intent.id
        db.session.commit()

        return jsonify({
            'clientSecret': intent.client_secret
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@routes_app.route('/payment/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
        )
    except ValueError as e:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400

    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        order_id = payment_intent['metadata'].get('order_id')

        if order_id:
            order = Order.query.get(order_id)
            if order:
                # Create payment record
                payment = Payment(
                    order_id=order.id,
                    amount=payment_intent['amount'] / 100,  # Convert from cents
                    payment_method='stripe',
                    transaction_id=payment_intent['id'],
                    transaction_data=payment_intent,
                    status='completed',
                    completed_at=datetime.utcnow()
                )
                db.session.add(payment)

                # Update order status
                order.payment_status = 'paid'
                order.status = 'processing'
                db.session.commit()

    return jsonify({'received': True}), 200

# ---------- ADMIN ROUTES ----------

@routes_app.route('/admin/products', methods=['POST'])
@admin_required
def create_product():
    data = request.form.to_dict()

    if not all([data.get('name'), data.get('price'), data.get('category_id')]):
        return abort(400, description="Name, price, and category_id are required.")

    # Handle image uploads
    image_urls = []
    if 'images' in request.files:
        images = request.files.getlist('images')
        for image in images:
            image_url = save_image(image, 'products')
            if image_url:
                image_urls.append(image_url)

    thumbnail_url = None
    if 'thumbnail' in request.files:
        thumbnail_url = save_image(
            request.files['thumbnail'],
            'products/thumbnails',
            size=(300, 300)
        )

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

    # Create variants if provided
    variants_data = json.loads(data.get('variants', '[]'))
    for variant_data in variants_data:
        variant = ProductVariant(
            product_id=new_product.id,
            sku=variant_data.get('sku'),
            color=variant_data.get('color'),
            size=variant_data.get('size'),
            stock=variant_data.get('stock', 0),
            price=variant_data.get('price')
        )

        # Handle variant images
        if 'images' in variant_data and variant_data['images']:
            variant_image_urls = []
            for image_data in variant_data['images']:
                if image_data.startswith('data:'):
                    # Handle base64 images
                    try:
                        format = image_data.split(';')[0].split('/')[1]
                        imgdata = base64.b64decode(image_data.split(',')[1])
                        filename = f"{uuid.uuid4()}.{format}"
                        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],
                                             'products/variants', filename)

                        with open(filepath, 'wb') as f:
                            f.write(imgdata)

                        variant_image_urls.append(f"/static/products/variants/{filename}")
                    except Exception as e:
                        current_app.logger.error(f"Error saving variant image: {e}")
                else:
                    variant_image_urls.append(image_data)

            variant.image_urls = variant_image_urls

        db.session.add(variant)

    db.session.commit()

    return jsonify(new_product.to_dict()), 201

@routes_app.route('/admin/products/<int:id>', methods=['PUT'])
@admin_required
def update_product(id):
    product = Product.query.get_or_404(id)
    data = request.form.to_dict()

    # Update basic fields
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
    if 'sku' in data:
        product.sku = data['sku']
    if 'weight' in data:
        product.weight = float(data['weight'])
    if 'dimensions' in data:
        product.dimensions = json.loads(data['dimensions'])
    if 'is_featured' in data:
        product.is_featured = data['is_featured'].lower() == 'true'
    if 'is_new' in data:
        product.is_new = data['is_new'].lower() == 'true'
    if 'is_sale' in data:
        product.is_sale = data['is_sale'].lower() == 'true'
    if 'meta_title' in data:
        product.meta_title = data['meta_title']
    if 'meta_description' in data:
        product.meta_description = data['meta_description']

    # Handle image uploads
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
        thumbnail_url = save_image(
            request.files['thumbnail'],
            'products/thumbnails',
            size=(300, 300)
        )
        if thumbnail_url:
            product.thumbnail_url = thumbnail_url

    # Update variants
    if 'variants' in data:
        variants_data = json.loads(data['variants'])
        # Delete removed variants
        existing_variant_ids = [v['id'] for v in variants_data if 'id' in v]
        ProductVariant.query.filter(
            and_(
                ProductVariant.product_id == product.id,
                ~ProductVariant.id.in_(existing_variant_ids)
            )
        ).delete(synchronize_session=False)

        # Update or create variants
        for variant_data in variants_data:
            if 'id' in variant_data:
                variant = ProductVariant.query.get(variant_data['id'])
                if variant:
                    variant.sku = variant_data.get('sku', variant.sku)
                    variant.color = variant_data.get('color', variant.color)
                    variant.size = variant_data.get('size', variant.size)
                    variant.stock = variant_data.get('stock', variant.stock)
                    variant.price = variant_data.get('price', variant.price)
            else:
                new_variant = ProductVariant(
                    product_id=product.id,
                    sku=variant_data.get('sku'),
                    color=variant_data.get('color'),
                    size=variant_data.get('size'),
                    stock=variant_data.get('stock', 0),
                    price=variant_data.get('price')
                )
                db.session.add(new_variant)

    db.session.commit()
    return jsonify(product.to_dict()), 200

@routes_app.route('/admin/products/<int:id>', methods=['DELETE'])
@admin_required
def delete_product(id):
    product = Product.query.get_or_404(id)

    # Delete related records
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
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')

    query = Order.query

    if status:
        query = query.filter_by(status=status)

    orders = query.order_by(Order.created_at.desc())\
        .paginate(page=page, per_page=per_page)

    return jsonify({
        'items': [order.to_dict() for order in orders.items],
        'total': orders.total,
        'pages': orders.pages,
        'current_page': orders.page
    }), 200

@routes_app.route('/admin/orders/<int:id>', methods=['PUT'])
@admin_required
def update_order_status(id):
    order = Order.query.get_or_404(id)
    data = request.get_json()

    if 'status' in data:
        order.status = data['status']
    if 'tracking_number' in data:
        order.tracking_number = data['tracking_number']
    if 'notes' in data:
        order.notes = data['notes']

    db.session.commit()
    return jsonify(order.to_dict()), 200

@routes_app.route('/admin/users', methods=['GET'])
@admin_required
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    role = request.args.get('role')

    query = User.query

    if search:
        query = query.filter(
            or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    if role:
        query = query.filter_by(role=role)

    users = query.paginate(page=page, per_page=per_page)

    return jsonify({
        'items': [user.to_dict() for user in users.items],
        'total': users.total,
        'pages': users.pages,
        'current_page': users.page
    }), 200

@routes_app.route('/admin/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    # Get basic stats
    total_users = User.query.count()
    total_orders = Order.query.count()
    total_products = Product.query.count()

    # Get revenue stats
    today = datetime.utcnow().date()
    start_of_month = today.replace(day=1)

    revenue_today = db.session.query(db.func.sum(Order.total_amount))\
        .filter(db.func.date(Order.created_at) == today)\
        .scalar() or 0

    revenue_month = db.session.query(db.func.sum(Order.total_amount))\
        .filter(db.func.date(Order.created_at) >= start_of_month)\
        .scalar() or 0

    # Get recent orders
    recent_orders = Order.query\
        .order_by(Order.created_at.desc())\
        .limit(5)\
        .all()

    # Get low stock products
    low_stock_products = Product.query\
        .filter(Product.stock < 10)\
        .limit(5)\
        .all()

    return jsonify({
        'total_users': total_users,
        'total_orders': total_orders,
        'total_products': total_products,
        'revenue_today': revenue_today,
        'revenue_month': revenue_month,
        'recent_orders': [order.to_dict() for order in recent_orders],
        'low_stock_products': [product.to_dict() for product in low_stock_products]
    }), 200

