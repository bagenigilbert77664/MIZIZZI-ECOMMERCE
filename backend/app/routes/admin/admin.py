"""
Comprehensive Admin routes for Mizizzi E-commerce platform.
Handles all administrative operations including user management, product management,
order management, analytics, and system configuration.
"""

from flask import Blueprint, request, jsonify, current_app, send_from_directory, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, create_access_token # type: ignore
from sqlalchemy import or_, desc, func, and_, text, asc
from datetime import datetime, timedelta
import uuid
import csv
import io
import os
from slugify import slugify # type: ignore
import re
import werkzeug
from functools import wraps
from flask_cors import cross_origin # type: ignore
from sqlalchemy.exc import IntegrityError
import logging

# Create blueprint
admin_routes = Blueprint('admin_routes', __name__)

# Set up logging
logger = logging.getLogger(__name__)

# Fixed imports - use direct imports without nested paths
try:
    from app.models.models import (
        User, UserRole, Category, Product, ProductVariant, Brand, Review,
        CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
        OrderStatus, PaymentStatus, Newsletter, CouponType, Address,
        AddressType, ProductImage, Inventory, Cart, ShippingMethod,
        PaymentMethod, ShippingZone, Promotion
    )
    from app.configuration.extensions import db, cache
    from app.schemas.schemas import (
        user_schema, users_schema, category_schema, categories_schema,
        product_schema, products_schema, brand_schema, brands_schema,
        review_schema, reviews_schema, cart_item_schema, cart_items_schema,
        order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
        coupon_schema, coupons_schema, payment_schema, payments_schema,
        product_variant_schema, product_variants_schema, address_schema, addresses_schema,
        newsletter_schema, newsletters_schema, product_image_schema, product_images_schema,
        address_type_schema, address_types_schema, shipping_method_schema, shipping_methods_schema,
        payment_method_schema, payment_methods_schema
    )
    print("✅ Admin routes: Successfully imported models and schemas from direct paths")
except ImportError as e:
    print(f"❌ Admin routes: Failed to import required modules: {str(e)}")
    # Create minimal fallback classes
    class User:
        @staticmethod
        def query():
            return MockQuery()
    class UserRole:
        ADMIN = 'ADMIN'
        USER = 'USER'
    class MockQuery:
        def filter_by(self, **kwargs):
            return self
        def get(self, id):
            return None
        def count(self):
            return 0
    # Add minimal fallbacks for other classes
    db = None
    cache = None
    print("⚠️ Using fallback models - admin functionality will be limited")

# Enhanced admin_required decorator with fixed imports
def admin_required(f):
    """
    Decorator to ensure only admin users can access certain routes.
    Checks JWT token and verifies admin role.
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'AUTH_REQUIRED'
                }), 401

            if User and hasattr(User, 'query'):
                user = User.query.get(current_user_id)
                if not user:
                    return jsonify({
                        'error': 'User not found',
                        'code': 'USER_NOT_FOUND'
                    }), 404

                if hasattr(user, 'is_active') and not user.is_active:
                    return jsonify({"error": "Account is deactivated"}), 401

                if hasattr(user, 'role'):
                    is_admin = False
                    if hasattr(user.role, 'value'):
                        is_admin = user.role.value.lower() == 'admin'
                    elif isinstance(user.role, str):
                        is_admin = user.role.lower() == 'admin'
                    else:
                        is_admin = str(user.role).lower() == 'admin'

                    if not is_admin:
                        return jsonify({
                            'error': 'Admin access required',
                            'code': 'ADMIN_REQUIRED'
                        }), 403
                else:
                    return jsonify({
                        'error': 'User role not defined',
                        'code': 'ROLE_NOT_DEFINED'
                    }), 500
            else:
                return jsonify({
                    'error': 'User model not available',
                    'code': 'MODEL_NOT_AVAILABLE'
                }), 500

            return f(*args, **kwargs)

        except Exception as e:
            logger.error(f"Admin authentication error: {str(e)}")
            return jsonify({
                'error': 'Authentication failed',
                'code': 'AUTH_FAILED',
                'details': str(e)
            }), 500

    return decorated_function

# Register dashboard routes
try:
    from .dashboard import dashboard_routes
    admin_routes.register_blueprint(dashboard_routes, url_prefix='/dashboard')
    print("✅ Dashboard routes registered successfully at /dashboard")
except ImportError as e:
    print(f"⚠️ Could not import dashboard routes: {str(e)}")

# Register admin cart routes
try:
    from .admin_cart_routes import admin_cart_routes
    admin_routes.register_blueprint(admin_cart_routes, url_prefix='/cart')
    print("✅ Admin cart routes registered successfully")
except ImportError as e:
    print(f"⚠️ Could not import admin_cart_routes: {str(e)}")

# ----------------------
# Helper Functions
# ----------------------

def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    # Limit per_page to prevent abuse
    per_page = min(per_page, 100)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    """Create a paginated response."""
    try:
        if hasattr(query, 'paginate'):
            paginated = query.paginate(page=page, per_page=per_page, error_out=False)
            return {
                "items": schema.dump(paginated.items),
                "pagination": {
                    "page": paginated.page,
                    "per_page": paginated.per_page,
                    "total_pages": paginated.pages,
                    "total_items": paginated.total,
                    "has_next": paginated.has_next,
                    "has_prev": paginated.has_prev
                }
            }
        else:
            # Fallback for when pagination is not available
            items = query.all() if hasattr(query, 'all') else []
            return {
                "items": schema.dump(items),
                "pagination": {
                    "page": 1,
                    "per_page": len(items),
                    "total_pages": 1,
                    "total_items": len(items),
                    "has_next": False,
                    "has_prev": False
                }
            }
    except Exception as e:
        print(f"Pagination error: {str(e)}")
        return {
            "items": [],
            "pagination": {
                "page": 1,
                "per_page": per_page,
                "total_pages": 0,
                "total_items": 0,
                "has_next": False,
                "has_prev": False
            }
        }

def handle_options(allowed_methods):
    """Standard OPTIONS response handler for CORS."""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', allowed_methods)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    return response

def safe_query_count(query_func, default=0):
    """Safely execute a count query with error handling."""
    try:
        return query_func()
    except Exception as e:
        print(f"Query count failed: {str(e)}")
        return default

def safe_query_scalar(query_func, default=0):
    """Safely execute a scalar query with error handling."""
    try:
        result = query_func()
        return float(result) if result is not None else default
    except Exception as e:
        print(f"Query scalar failed: {str(e)}")
        return default

def safe_query_all(query_func, default=None):
    """Safely execute a query that returns multiple results."""
    try:
        return query_func()
    except Exception as e:
        print(f"Query all failed: {str(e)}")
        return default or []

def validate_date_range(date_from_str, date_to_str):
    """Validate and parse date range parameters."""
    date_from = None
    date_to = None

    if date_from_str:
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d')
        except ValueError:
            pass

    if date_to_str:
        try:
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d')
            date_to = date_to.replace(hour=23, minute=59, second=59)
        except ValueError:
            pass

    return date_from, date_to

def create_slug(name, model_class, exclude_id=None):
    """Create a unique slug from a name."""
    base_slug = slugify(name)
    slug = base_slug
    counter = 1

    while True:
        query = model_class.query.filter_by(slug=slug)
        if exclude_id:
            query = query.filter(model_class.id != exclude_id)

        if not query.first():
            break

        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug

# ----------------------
# Admin Authentication Routes
# ----------------------

@admin_routes.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin()
def admin_login():
    """Admin login endpoint."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        if not User or not hasattr(User, 'query'):
            return jsonify({'error': 'User model not available'}), 500

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        # Check password
        if hasattr(user, 'check_password') and not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401

        # Check if user is admin
        is_admin = False
        if hasattr(user, 'role'):
            if hasattr(user.role, 'value'):
                is_admin = user.role.value.lower() == 'admin'
            elif isinstance(user.role, str):
                is_admin = user.role.lower() == 'admin'
            else:
                is_admin = str(user.role).lower() == 'admin'

        if not is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        # Create JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'role': 'admin',
                'email': user.email,
                'name': user.name if hasattr(user, 'name') else 'Admin'
            }
        )

        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name if hasattr(user, 'name') else 'Admin',
                'role': 'admin'
            }
        }), 200

    except Exception as e:
        logger.error(f"Admin login error: {str(e)}")
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

# ----------------------
# Admin Dashboard Routes (Main)
# ----------------------

@admin_routes.route('/dashboard', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_dashboard():
    """Get comprehensive admin dashboard data."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        current_app.logger.info("📊 Admin dashboard request received and authenticated")

        # Initialize basic counts with safe defaults
        counts = {
            'users': 0,
            'products': 0,
            'orders': 0,
            'categories': 0,
            'brands': 0,
            'reviews': 0,
            'newsletter_subscribers': 0,
            'active_carts': 0,
            'wishlist_items': 0,
            'coupons': 0,
            'pending_orders': 0,
            'completed_orders': 0,
            'cancelled_orders': 0
        }

        # Initialize sales data with safe defaults
        sales_data = {
            'today': 0,
            'yesterday': 0,
            'weekly': 0,
            'monthly': 0,
            'yearly': 0,
            'last_30_days': 0
        }

        # Try to get real data if models are available
        try:
            if User and hasattr(User, 'query'):
                counts['users'] = safe_query_count(lambda: User.query.count())

            if Product and hasattr(Product, 'query'):
                counts['products'] = safe_query_count(lambda: Product.query.count())

            if Order and hasattr(Order, 'query'):
                counts['orders'] = safe_query_count(lambda: Order.query.count())

                if OrderStatus:
                    counts['pending_orders'] = safe_query_count(lambda: Order.query.filter_by(status=OrderStatus.PENDING).count())
                    counts['completed_orders'] = safe_query_count(lambda: Order.query.filter_by(status=OrderStatus.DELIVERED).count())
                    counts['cancelled_orders'] = safe_query_count(lambda: Order.query.filter_by(status=OrderStatus.CANCELLED).count())

                # Calculate sales if possible
                today = datetime.utcnow().date()
                yesterday = today - timedelta(days=1)
                start_of_week = today - timedelta(days=today.weekday())
                start_of_month = datetime(today.year, today.month, 1)
                start_of_year = datetime(today.year, 1, 1)
                last_30_days = today - timedelta(days=30)

                if db and hasattr(db, 'session'):
                    try:
                        sales_data['today'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                func.date(Order.created_at) == today
                            ).scalar()
                        )

                        sales_data['yesterday'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                func.date(Order.created_at) == yesterday
                            ).scalar()
                        )

                        sales_data['weekly'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                Order.created_at >= start_of_week
                            ).scalar()
                        )

                        sales_data['monthly'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                Order.created_at >= start_of_month
                            ).scalar()
                        )

                        sales_data['yearly'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                Order.created_at >= start_of_year
                            ).scalar()
                        )

                        sales_data['last_30_days'] = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter(
                                Order.created_at >= last_30_days
                            ).scalar()
                        )
                    except Exception as sales_error:
                        print(f"Error calculating sales: {str(sales_error)}")

            if Category and hasattr(Category, 'query'):
                counts['categories'] = safe_query_count(lambda: Category.query.count())

            if Brand and hasattr(Brand, 'query'):
                counts['brands'] = safe_query_count(lambda: Brand.query.count())

            if Review and hasattr(Review, 'query'):
                counts['reviews'] = safe_query_count(lambda: Review.query.count())

            if Newsletter and hasattr(Newsletter, 'query'):
                counts['newsletter_subscribers'] = safe_query_count(
                    lambda: Newsletter.query.filter_by(is_active=True).count()
                )

            if Cart and hasattr(Cart, 'query'):
                counts['active_carts'] = safe_query_count(
                    lambda: Cart.query.filter_by(is_active=True).count()
                )

            if WishlistItem and hasattr(WishlistItem, 'query'):
                counts['wishlist_items'] = safe_query_count(lambda: WishlistItem.query.count())

            if Coupon and hasattr(Coupon, 'query'):
                counts['coupons'] = safe_query_count(lambda: Coupon.query.count())

        except Exception as data_error:
            print(f"Error getting dashboard data: {str(data_error)}")
            # Use default values already set above

        current_app.logger.info("✅ Admin dashboard data compiled successfully")

        return jsonify({
            "counts": counts,
            "sales": sales_data,
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "database"
        }), 200

    except Exception as e:
        current_app.logger.error(f"❌ Error in admin dashboard: {str(e)}")
        import traceback
        current_app.logger.error(f"❌ Full dashboard traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to retrieve dashboard data", "details": str(e)}), 500

# ----------------------
# Admin Analytics Routes
# ----------------------

@admin_routes.route('/analytics/sales', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_sales_analytics():
    """Get sales analytics data."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        period = request.args.get('period', 'month')  # day, week, month, year

        # Get sales data for the specified period
        today = datetime.utcnow().date()

        if period == 'day':
            # Get hourly sales for today
            start_date = datetime(today.year, today.month, today.day, 0, 0, 0)
            sales_data = db.session.query(
                func.extract('hour', Order.created_at).label('period'),
                func.sum(Order.total_amount).label('total_sales'),
                func.count(Order.id).label('order_count')
            ).filter(
                Order.created_at >= start_date,
                Order.status != OrderStatus.CANCELLED
            ).group_by('period').order_by('period').all()

        elif period == 'week':
            # Get daily sales for this week
            start_date = today - timedelta(days=today.weekday())
            sales_data = db.session.query(
                func.date(Order.created_at).label('period'),
                func.sum(Order.total_amount).label('total_sales'),
                func.count(Order.id).label('order_count')
            ).filter(
                Order.created_at >= start_date,
                Order.status != OrderStatus.CANCELLED
            ).group_by('period').order_by('period').all()

        elif period == 'year':
            # Get monthly sales for this year
            start_date = datetime(today.year, 1, 1)
            sales_data = db.session.query(
                func.extract('month', Order.created_at).label('period'),
                func.sum(Order.total_amount).label('total_sales'),
                func.count(Order.id).label('order_count')
            ).filter(
                Order.created_at >= start_date,
                Order.status != OrderStatus.CANCELLED
            ).group_by('period').order_by('period').all()

        else:  # month (default)
            # Get daily sales for this month
            start_date = datetime(today.year, today.month, 1)
            sales_data = db.session.query(
                func.extract('day', Order.created_at).label('period'),
                func.sum(Order.total_amount).label('total_sales'),
                func.count(Order.id).label('order_count')
            ).filter(
                Order.created_at >= start_date,
                Order.status != OrderStatus.CANCELLED
            ).group_by('period').order_by('period').all()

        # Format the data
        formatted_data = []
        for item in sales_data:
            formatted_data.append({
                'period': str(item.period),
                'sales': float(item.total_sales),
                'orders': item.order_count
            })

        return jsonify({
            'period': period,
            'data': formatted_data
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting sales analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve sales analytics", "details": str(e)}), 500

@admin_routes.route('/analytics/products', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_product_analytics():
    """Get product analytics data."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get top selling products
        top_selling = db.session.query(
            Product.id,
            Product.name,
            Product.sku,
            Product.thumbnail_url,
            func.sum(OrderItem.quantity).label('total_quantity'),
            func.sum(OrderItem.total).label('total_sales')
        ).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Order.status != OrderStatus.CANCELLED
        ).group_by(
            Product.id
        ).order_by(
            desc('total_quantity')
        ).limit(10).all()

        # Get products with highest ratings
        highest_rated = db.session.query(
            Product.id,
            Product.name,
            Product.sku,
            Product.thumbnail_url,
            func.avg(Review.rating).label('average_rating'),
            func.count(Review.id).label('review_count')
        ).join(
            Review, Review.product_id == Product.id
        ).group_by(
            Product.id
        ).having(
            func.count(Review.id) >= 3
        ).order_by(
            desc('average_rating')
        ).limit(10).all()

        # Get low stock products
        low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
        low_stock = Product.query.filter(
            Product.stock <= low_stock_threshold,
            Product.stock > 0
        ).order_by(Product.stock).limit(10).all()

        # Get out of stock products
        out_of_stock = Product.query.filter(
            Product.stock == 0
        ).order_by(Product.updated_at.desc()).limit(10).all()

        return jsonify({
            'top_selling': [
                {
                    'id': item.id,
                    'name': item.name,
                    'sku': item.sku,
                    'thumbnail_url': item.thumbnail_url,
                    'total_quantity': item.total_quantity,
                    'total_sales': float(item.total_sales)
                } for item in top_selling
            ],
            'highest_rated': [
                {
                    'id': item.id,
                    'name': item.name,
                    'sku': item.sku,
                    'thumbnail_url': item.thumbnail_url,
                    'average_rating': float(item.average_rating),
                    'review_count': item.review_count
                } for item in highest_rated
            ],
            'low_stock': products_schema.dump(low_stock),
            'out_of_stock': products_schema.dump(out_of_stock)
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve product analytics", "details": str(e)}), 500

# ----------------------
# Admin Image Upload Routes
# ----------------------

@admin_routes.route('/upload/image', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def upload_image():
    """Upload an image file."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files['file']

        # If user does not select file, browser also submit an empty part without filename
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check file size (5MB limit)
        file_content = file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB in bytes
            return jsonify({"error": "File too large (max 5MB)"}), 400

        # Reset file pointer after reading for size check
        file.seek(0)

        # Check if the file is an allowed image type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"error": "File type not allowed. Only images are permitted."}), 400

        # Create a secure filename with UUID to avoid collisions
        original_filename = werkzeug.utils.secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(current_app.root_path, 'uploads')
        product_images_dir = os.path.join(uploads_dir, 'product_images')
        for directory in [uploads_dir, product_images_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                current_app.logger.info(f"Created directory: {directory}")

        # Save the file
        file_path = os.path.join(product_images_dir, unique_filename)
        file.save(file_path)

        # Get the current user from JWT token
        current_user_id = get_jwt_identity()

        # Log the upload
        current_app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")

        # Generate URL for the uploaded file
        site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
        image_url = f"{site_url}/api/admin/uploads/product_images/{unique_filename}"

        return jsonify({
            "success": True,
            "filename": unique_filename,
            "originalName": original_filename,
            "url": image_url,
            "size": os.path.getsize(file_path),
            "uploadedBy": current_user_id,
            "uploadedAt": datetime.now().isoformat()
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error uploading image: {str(e)}")
        return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500

@admin_routes.route('/uploads/product_images/<filename>', methods=['GET', 'OPTIONS'])
@cross_origin()
def serve_product_image(filename):
    """Serve an uploaded product image."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        product_images_dir = os.path.join(current_app.root_path, 'uploads', 'product_images')
        return send_from_directory(product_images_dir, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving image {filename}: {str(e)}")
        return jsonify({"error": f"Failed to serve image: {str(e)}"}), 500

# ----------------------
# Admin User Management Routes
# ----------------------

@admin_routes.route('/users', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_users():
    """Get all users or create a new user."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all users
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Check if User model is available
            if not User or not hasattr(User, 'query'):
                return jsonify({
                    "items": [],
                    "pagination": {
                        "page": 1,
                        "per_page": per_page,
                        "total_pages": 0,
                        "total_items": 0,
                        "has_next": False,
                        "has_prev": False
                    }
                }), 200

            # Get filter parameters
            role = request.args.get('role')
            search = request.args.get('q')
            is_active = request.args.get('is_active')
            sort_by = request.args.get('sort_by', 'created_at')
            sort_order = request.args.get('sort_order', 'desc')

            # Build query
            query = User.query

            # Apply filters
            if role and UserRole:
                try:
                    if hasattr(UserRole, role.upper()):
                        user_role = getattr(UserRole, role.upper())
                        query = query.filter_by(role=user_role)
                except (ValueError, AttributeError):
                    pass  # Invalid role, ignore filter

            if search:
                query = query.filter(
                    or_(
                        User.name.ilike(f'%{search}%'),
                        User.email.ilike(f'%{search}%')
                    )
                )

            if is_active is not None:
                is_active_bool = is_active.lower() == 'true'
                query = query.filter_by(is_active=is_active_bool)

            # Apply sorting
            if sort_by == 'name':
                query = query.order_by(User.name.asc() if sort_order == 'asc' else User.name.desc())
            elif sort_by == 'email':
                query = query.order_by(User.email.asc() if sort_order == 'asc' else User.email.desc())
            else:  # Default to created_at
                if hasattr(User, 'created_at'):
                    query = query.order_by(User.created_at.asc() if sort_order == 'asc' else User.created_at.desc())

            # Use safe schema dumping
            try:
                if users_schema:
                    return jsonify(paginate_response(query, users_schema, page, per_page)), 200
                else:
                    # Fallback without schema
                    users = query.all() if hasattr(query, 'all') else []
                    users_data = []
                    for user in users:
                        user_data = {
                            'id': getattr(user, 'id', None),
                            'name': getattr(user, 'name', 'Unknown'),
                            'email': getattr(user, 'email', 'unknown@example.com'),
                            'role': str(getattr(user, 'role', 'USER')),
                            'is_active': getattr(user, 'is_active', True),
                            'created_at': getattr(user, 'created_at', datetime.utcnow()).isoformat()
                        }
                        users_data.append(user_data)

                    return jsonify({
                        "items": users_data,
                        "pagination": {
                            "page": 1,
                            "per_page": len(users_data),
                            "total_pages": 1,
                            "total_items": len(users_data),
                            "has_next": False,
                            "has_prev": False
                        }
                    }), 200
            except Exception as schema_error:
                print(f"Schema error: {str(schema_error)}")
                return jsonify({
                    "items": [],
                    "pagination": {
                        "page": 1,
                        "per_page": per_page,
                        "total_pages": 0,
                        "total_items": 0,
                        "has_next": False,
                        "has_prev": False
                    }
                }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting users: {str(e)}")
            return jsonify({"error": "Failed to retrieve users", "details": str(e)}), 500

    # POST - Create a new user
    elif request.method == 'POST':
        try:
            if not User or not hasattr(User, 'query'):
                return jsonify({"error": "User creation not available"}), 500

            data = request.get_json()

            # Validate required fields
            required_fields = ['name', 'email', 'password']
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({"error": f"Field '{field}' is required"}), 400

            # Create new user
            user = User(
                name=data['name'],
                email=data['email'],
                role=getattr(UserRole, 'USER', 'USER') if UserRole else 'USER',
                is_active=data.get('is_active', True)
            )

            # Set password if method exists
            if hasattr(user, 'set_password'):
                user.set_password(data['password'])

            # Set creation timestamps
            now = datetime.utcnow()
            if hasattr(user, 'created_at'):
                user.created_at = now

            if db and hasattr(db, 'session'):
                db.session.add(user)
                db.session.commit()

            # Prepare response
            user_data = {
                'id': getattr(user, 'id', None),
                'name': getattr(user, 'name', data['name']),
                'email': getattr(user, 'email', data['email']),
                'role': str(getattr(user, 'role', 'USER')),
                'is_active': getattr(user, 'is_active', True),
                'created_at': getattr(user, 'created_at', now).isoformat()
            }

            return jsonify({
                "message": "User created successfully",
                "user": user_data
            }), 201

        except Exception as e:
            if db and hasattr(db, 'session'):
                db.session.rollback()
            current_app.logger.error(f"Error creating user: {str(e)}")
            return jsonify({"error": "Failed to create user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def user_operations(user_id):
    """Get, update, or delete a user."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get user details
    if request.method == 'GET':
        try:
            user = User.query.get_or_404(user_id)

            # Get user's orders with pagination
            orders_page = request.args.get('orders_page', 1, type=int)
            orders = Order.query.filter_by(user_id=user_id).order_by(
                Order.created_at.desc()
            ).paginate(page=orders_page, per_page=10, error_out=False)

            # Get user's addresses
            addresses = Address.query.filter_by(user_id=user_id).all()

            # Get user's reviews
            reviews = Review.query.filter_by(user_id=user_id).order_by(
                Review.created_at.desc()
            ).limit(10).all()

            # Get user's cart items
            cart_items = CartItem.query.filter_by(user_id=user_id).all()

            # Get user's wishlist items
            wishlist_items = WishlistItem.query.filter_by(user_id=user_id).all()

            # Calculate user statistics
            total_orders = Order.query.filter_by(user_id=user_id).count()
            total_spent = db.session.query(func.sum(Order.total_amount)).filter(
                and_(Order.user_id == user_id, Order.status != OrderStatus.CANCELLED)
            ).scalar() or 0

            # Prepare response
            user_data = user_schema.dump(user)
            user_data.update({
                'orders': {
                    'items': orders_schema.dump(orders.items),
                    'pagination': {
                        'page': orders.page,
                        'per_page': orders.per_page,
                        'total_pages': orders.pages,
                        'total_items': orders.total
                    }
                },
                'addresses': addresses_schema.dump(addresses),
                'recent_reviews': reviews_schema.dump(reviews),
                'cart_items': cart_items_schema.dump(cart_items),
                'wishlist_items': wishlist_items_schema.dump(wishlist_items),
                'statistics': {
                    'total_orders': total_orders,
                    'total_spent': float(total_spent),
                    'total_reviews': len(reviews),
                    'total_addresses': len(addresses)
                }
            })

            return jsonify(user_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve user", "details": str(e)}), 500

    # PUT - Update user details
    elif request.method == 'PUT':
        try:
            user = User.query.get_or_404(user_id)
            data = request.get_json()

            # Update allowed fields
            if 'name' in data:
                user.name = data['name']

            if 'email' in data:
                # Validate email format
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, data['email']):
                    return jsonify({"error": "Invalid email format"}), 400

                # Check if email already exists
                existing_user = User.query.filter(User.email == data['email'], User.id != user_id).first()
                if existing_user:
                    return jsonify({"error": "Email already in use"}), 400
                user.email = data['email']

            if 'phone' in data:
                user.phone = data['phone']

            if 'is_active' in data:
                user.is_active = data['is_active']

            if 'email_verified' in data:
                user.email_verified = data['email_verified']

            if 'phone_verified' in data:
                user.phone_verified = data['phone_verified']

            if 'role' in data:
                try:
                    user.role = UserRole(data['role'])
                except ValueError:
                    return jsonify({"error": "Invalid role"}), 400

            # Update password if provided
            if 'password' in data and data['password']:
                user.set_password(data['password'])

            db.session.commit()

            return jsonify({
                "message": "User updated successfully",
                "user": user_schema.dump(user)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to update user", "details": str(e)}), 500

    # DELETE - Delete a user
    elif request.method == 'DELETE':
        try:
            # Prevent deleting the last admin
            if User.query.filter_by(role=UserRole.ADMIN).count() <= 1:
                admin_user = User.query.get(user_id)
                if admin_user and admin_user.role == UserRole.ADMIN:
                    return jsonify({"error": "Cannot delete the last admin user"}), 400

            user = User.query.get_or_404(user_id)

            # Soft delete - anonymize the user data instead of hard delete
            user.name = f"Deleted User {user.id}"
            user.email = f"deleted_{user.id}@example.com"
            user.phone = None
            user.is_active = False
            user.is_deleted = True
            user.deleted_at = datetime.utcnow()

            db.session.commit()

            return jsonify({"message": "User deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to delete user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/activate', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def activate_user(user_id):
    """Activate a user account."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        user = User.query.get_or_404(user_id)
        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "User activated successfully",
            "user": user_schema.dump(user)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error activating user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to activate user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/deactivate', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def deactivate_user(user_id):
    """Deactivate a user account."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Prevent deactivating the last admin
        if User.query.filter_by(role=UserRole.ADMIN, is_active=True).count() <= 1:
            admin_user = User.query.get(user_id)
            if admin_user and admin_user.role == UserRole.ADMIN:
                return jsonify({"error": "Cannot deactivate the last admin user"}), 400

        user = User.query.get_or_404(user_id)
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "User deactivated successfully",
            "user": user_schema.dump(user)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deactivating user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to deactivate user", "details": str(e)}), 500


# ----------------------
# Admin Newsletter Management Routes
# ----------------------

@admin_routes.route('/newsletters', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_newsletters():
    """Get all newsletter subscribers with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        is_active = request.args.get('is_active')
        search = request.args.get('q')

        # Build query
        query = Newsletter.query

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        if search:
            query = query.filter(Newsletter.email.ilike(f'%{search}%'))

        # Paginate the results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Serialize the results using the newsletter schema
        newsletter_data = newsletters_schema.dump(paginated.items)

        return jsonify({
            "items": newsletter_data,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting newsletter subscribers: {str(e)}")
        return jsonify({"error": "Failed to retrieve newsletter subscribers", "details": str(e)}), 500

@admin_routes.route('/newsletters/<int:newsletter_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def newsletter_operations(newsletter_id):
    """Get, update, or delete a newsletter subscriber."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    try:
        newsletter = Newsletter.query.get_or_404(newsletter_id)

        # GET - Get newsletter details
        if request.method == 'GET':
            return jsonify(newsletter_schema.dump(newsletter)), 200

        # PUT - Update newsletter details
        elif request.method == 'PUT':
            data = request.get_json()

            # Update allowed fields
            if 'is_active' in data:
                newsletter.is_active = data['is_active']

            db.session.commit()

            return jsonify({
                "message": "Newsletter subscriber updated successfully",
                "newsletter": newsletter_schema.dump(newsletter)
            }), 200

        # DELETE - Delete a newsletter subscriber
        elif request.method == 'DELETE':
            db.session.delete(newsletter)
            db.session.commit()

            return jsonify({"message": "Newsletter subscriber deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in newsletter operation {newsletter_id}: {str(e)}")
        return jsonify({"error": "Failed to perform newsletter operation", "details": str(e)}), 500

@admin_routes.route('/newsletters/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def export_newsletters():
    """Export newsletter subscribers to CSV."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get filter parameters
        is_active = request.args.get('is_active')

        # Build query
        query = Newsletter.query

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        # Order by email
        query = query.order_by(Newsletter.email)

        # Get all subscribers
        subscribers = query.all()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(['Email', 'Name', 'Status', 'Subscribed On'])

        # Write data
        for subscriber in subscribers:
            writer.writerow([
                subscriber.email,
                subscriber.name or '',
                'Active' if subscriber.is_active else 'Inactive',
                subscriber.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        # Create response
        response = jsonify({
            "message": f"Exported {len(subscribers)} newsletter subscribers",
            "csv_data": output.getvalue(),
            "filename": f"newsletter_subscribers_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        })

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error exporting newsletter subscribers: {str(e)}")
        return jsonify({"error": "Failed to export newsletter subscribers", "details": str(e)}), 500



# ----------------------
# Export the blueprint
# ----------------------

# Make sure to export the blueprint
__all__ = ['admin_routes']
