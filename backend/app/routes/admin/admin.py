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
# Admin Category Management Routes
# ----------------------

@admin_routes.route('/categories', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_categories():
    """Get all categories or create a new category."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all categories
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            search = request.args.get('q')
            parent_id = request.args.get('parent_id', type=int)
            is_featured = request.args.get('is_featured')
            sort_by = request.args.get('sort_by', 'name')
            sort_order = request.args.get('sort_order', 'asc')

            # Build query
            query = Category.query

            # Apply filters
            if search:
                query = query.filter(
                    or_(
                        Category.name.ilike(f'%{search}%'),
                        Category.description.ilike(f'%{search}%'),
                        Category.slug.ilike(f'%{search}%')
                    )
                )

            if parent_id is not None:
                query = query.filter_by(parent_id=parent_id)

            if is_featured is not None:
                is_featured_bool = is_featured.lower() == 'true'
                query = query.filter_by(is_featured=is_featured_bool)

            # Apply sorting
            if sort_by == 'name':
                query = query.order_by(Category.name.asc() if sort_order == 'asc' else Category.name.desc())
            elif sort_by == 'created_at':
                query = query.order_by(Category.created_at.asc() if sort_order == 'asc' else Category.created_at.desc())
            else:  # Default to name
                query = query.order_by(Category.name.asc())

            return jsonify(paginate_response(query, categories_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting categories: {str(e)}")
            return jsonify({"error": "Failed to retrieve categories", "details": str(e)}), 500

    # POST - Create a new category
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'name' not in data or not data['name']:
                return jsonify({"error": "Category name is required"}), 400

            # Create slug if not provided
            if 'slug' not in data or not data['slug']:
                slug = create_slug(data['name'], Category)
            else:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_category = Category.query.filter_by(slug=data['slug']).first()
                if existing_category:
                    return jsonify({"error": "Slug already in use"}), 400

                slug = data['slug']

            # Validate parent_id if provided
            parent_id = data.get('parent_id')
            if parent_id:
                parent_category = Category.query.get(parent_id)
                if not parent_category:
                    return jsonify({"error": "Parent category not found"}), 400

            # Create new category
            category = Category(
                name=data['name'],
                slug=slug,
                description=data.get('description', ''),
                parent_id=parent_id,
                is_featured=data.get('is_featured', False),
                image_url=data.get('image_url'),
                banner_url=data.get('banner_url')
            )

            # Set creation timestamps
            now = datetime.utcnow()
            category.created_at = now
            category.updated_at = now

            db.session.add(category)
            db.session.commit()

            return jsonify({
                "message": "Category created successfully",
                "category": category_schema.dump(category)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating category: {str(e)}")
            return jsonify({"error": "Failed to create category", "details": str(e)}), 500

@admin_routes.route('/categories/<int:category_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def category_operations(category_id):
    """Get, update, or delete a category."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get category details
    if request.method == 'GET':
        try:
            category = Category.query.get_or_404(category_id)

            # Get products in this category
            products_count = Product.query.filter_by(category_id=category_id).count()

            # Get subcategories
            subcategories = Category.query.filter_by(parent_id=category_id).all()

            # Get category statistics
            total_sales = db.session.query(func.sum(OrderItem.total)).join(
                Product, Product.category_id == category_id
            ).join(
                OrderItem, OrderItem.product_id == Product.id
            ).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                Order.status != OrderStatus.CANCELLED
            ).scalar() or 0

            # Prepare response
            category_data = category_schema.dump(category)
            category_data.update({
                'products_count': products_count,
                'subcategories': categories_schema.dump(subcategories),
                'statistics': {
                    'total_sales': float(total_sales),
                    'products_count': products_count,
                    'subcategories_count': len(subcategories)
                }
            })

            # Get parent category if exists
            if category.parent_id:
                parent_category = Category.query.get(category.parent_id)
                if parent_category:
                    category_data['parent_category'] = category_schema.dump(parent_category)

            return jsonify(category_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

    # PUT - Update category details
    elif request.method == 'PUT':
        try:
            category = Category.query.get_or_404(category_id)
            data = request.get_json()

            # Update name if provided
            if 'name' in data and data['name']:
                category.name = data['name']

                # Update slug if not provided in the request
                if 'slug' not in data:
                    category.slug = create_slug(data['name'], Category, category_id)

            # Update slug if provided
            if 'slug' in data and data['slug']:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_category = Category.query.filter(
                    Category.slug == data['slug'],
                    Category.id != category_id
                ).first()

                if existing_category:
                    return jsonify({"error": "Slug already in use"}), 400

                category.slug = data['slug']

            # Update other fields
            if 'description' in data:
                category.description = data['description']

            if 'parent_id' in data:
                # Cannot set itself as parent
                if data['parent_id'] == category_id:
                    return jsonify({"error": "Category cannot be its own parent"}), 400

                # Validate parent_id if not None
                if data['parent_id'] is not None:
                    parent_category = Category.query.get(data['parent_id'])
                    if not parent_category:
                        return jsonify({"error": "Parent category not found"}), 400

                category.parent_id = data['parent_id']

            if 'is_featured' in data:
                category.is_featured = data['is_featured']

            if 'image_url' in data:
                category.image_url = data['image_url']

            if 'banner_url' in data:
                category.banner_url = data['banner_url']

            category.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Category updated successfully",
                "category": category_schema.dump(category)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to update category", "details": str(e)}), 500

    # DELETE - Delete a category
    elif request.method == 'DELETE':
        try:
            category = Category.query.get_or_404(category_id)

            # Check if category has products
            products_count = Product.query.filter_by(category_id=category_id).count()
            if products_count > 0:
                return jsonify({
                    "error": "Cannot delete category with associated products",
                    "products_count": products_count
                }), 400

            # Check if category has subcategories
            subcategories_count = Category.query.filter_by(parent_id=category_id).count()
            if subcategories_count > 0:
                return jsonify({
                    "error": "Cannot delete category with subcategories",
                    "subcategories_count": subcategories_count
                }), 400

            db.session.delete(category)
            db.session.commit()

            return jsonify({"message": "Category deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to delete category", "details": str(e)}), 500

@admin_routes.route('/categories/<int:category_id>/toggle-featured', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def toggle_category_featured(category_id):
    """Toggle category featured status."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        category = Category.query.get_or_404(category_id)
        category.is_featured = not category.is_featured
        category.updated_at = datetime.utcnow()
        db.session.commit()

        status = "featured" if category.is_featured else "unfeatured"

        return jsonify({
            "message": f"Category {status} successfully",
            "category": category_schema.dump(category)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling category featured status {category_id}: {str(e)}")
        return jsonify({"error": "Failed to toggle category featured status", "details": str(e)}), 500

@admin_routes.route('/categories/tree', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def categories_tree():
    """Get categories in tree structure."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Get all categories
        categories = Category.query.order_by(Category.name).all()

        # Build tree structure
        def build_tree(parent_id=None):
            tree = []
            for category in categories:
                if category.parent_id == parent_id:
                    category_data = category_schema.dump(category)
                    category_data['children'] = build_tree(category.id)
                    tree.append(category_data)
            return tree

        tree = build_tree()

        return jsonify({
            "categories": tree,
            "total_count": len(categories)
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting categories tree: {str(e)}")
        return jsonify({"error": "Failed to retrieve categories tree", "details": str(e)}), 500

# ----------------------
# Admin Product Management Routes
# ----------------------

@admin_routes.route('/products', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_products():
    """Get all products or create a new product."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all products
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            category_id = request.args.get('category_id', type=int)
            brand_id = request.args.get('brand_id', type=int)
            search = request.args.get('q')
            min_price = request.args.get('min_price', type=float)
            max_price = request.args.get('max_price', type=float)
            stock_status = request.args.get('stock_status')
            is_active = request.args.get('is_active')
            is_featured = request.args.get('is_featured')
            is_sale = request.args.get('is_sale')
            date_from_str = request.args.get('date_from')
            date_to_str = request.args.get('date_to')
            sort_by = request.args.get('sort_by', 'created_at')
            sort_order = request.args.get('sort_order', 'desc')

            # Build query
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
                        Product.description.ilike(f'%{search}%'),
                        Product.sku.ilike(f'%{search}%')
                    )
                )

            if min_price is not None:
                query = query.filter(Product.price >= min_price)

            if max_price is not None:
                query = query.filter(Product.price <= max_price)

            if is_active is not None:
                is_active_bool = is_active.lower() == 'true'
                query = query.filter_by(is_active=is_active_bool)

            if is_featured is not None:
                is_featured_bool = is_featured.lower() == 'true'
                query = query.filter_by(is_featured=is_featured_bool)

            if is_sale is not None:
                is_sale_bool = is_sale.lower() == 'true'
                query = query.filter_by(is_sale=is_sale_bool)

            # Stock status filter
            if stock_status:
                low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
                try:
                    # Try to use Inventory table first
                    if stock_status == 'in_stock':
                        inventory_subquery = db.session.query(Inventory.product_id).filter(
                            Inventory.stock_level > 0
                        ).subquery()
                        query = query.filter(Product.id.in_(inventory_subquery))
                    elif stock_status == 'out_of_stock':
                        inventory_subquery = db.session.query(Inventory.product_id).filter(
                            Inventory.stock_level == 0
                        ).subquery()
                        query = query.filter(Product.id.in_(inventory_subquery))
                    elif stock_status == 'low_stock':
                        inventory_subquery = db.session.query(Inventory.product_id).filter(
                            and_(Inventory.stock_level > 0, Inventory.stock_level <= low_stock_threshold)
                        ).subquery()
                        query = query.filter(Product.id.in_(inventory_subquery))
                except Exception:
                    # Fallback to Product table if Inventory doesn't exist
                    if stock_status == 'in_stock':
                        query = query.filter(Product.stock > 0)
                    elif stock_status == 'out_of_stock':
                        query = query.filter(Product.stock == 0)
                    elif stock_status == 'low_stock':
                        query = query.filter(Product.stock > 0, Product.stock <= low_stock_threshold)

            # Apply date range filter
            date_from, date_to = validate_date_range(date_from_str, date_to_str)
            if date_from:
                query = query.filter(Product.created_at >= date_from)
            if date_to:
                query = query.filter(Product.created_at <= date_to)

            # Apply sorting
            if sort_by == 'price':
                query = query.order_by(Product.price.asc() if sort_order == 'asc' else Product.price.desc())
            elif sort_by == 'name':
                query = query.order_by(Product.name.asc() if sort_order == 'asc' else Product.name.desc())
            elif sort_by == 'stock':
                query = query.order_by(Product.stock.asc() if sort_order == 'asc' else Product.stock.desc())
            else:  # Default to created_at
                query = query.order_by(Product.created_at.asc() if sort_order == 'asc' else Product.created_at.desc())

            return jsonify(paginate_response(query, products_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting products: {str(e)}")
            return jsonify({"error": "Failed to retrieve products", "details": str(e)}), 500

    # POST - Create a new product
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            required_fields = ['name', 'price', 'category_id']
            for field in required_fields:
                if field not in data or data[field] is None:
                    return jsonify({"error": f"Field '{field}' is required"}), 400

            # Validate numeric fields
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({"error": "Price cannot be negative"}), 400

                if 'sale_price' in data and data['sale_price'] is not None:
                    sale_price = float(data['sale_price'])
                    if sale_price < 0:
                        return jsonify({"error": "Sale price cannot be negative"}), 400
                    if sale_price >= price:
                        return jsonify({"error": "Sale price must be less than regular price"}), 400

                if 'stock' in data and data['stock'] is not None:
                    stock = int(data['stock'])
                    if stock < 0:
                        return jsonify({"error": "Stock cannot be negative"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid numeric value"}), 400

            # Validate category_id
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({"error": "Category not found"}), 400

            # Validate brand_id if provided
            if 'brand_id' in data and data['brand_id'] is not None:
                brand = Brand.query.get(data['brand_id'])
                if not brand:
                    return jsonify({"error": "Brand not found"}), 400

            # Create slug if not provided
            if 'slug' not in data or not data['slug']:
                slug = create_slug(data['name'], Product)
            else:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_product = Product.query.filter_by(slug=data['slug']).first()
                if existing_product:
                    return jsonify({"error": "Slug already in use"}), 400

                slug = data['slug']

            # Generate SKU if not provided
            if 'sku' not in data or not data['sku']:
                timestamp = int(datetime.utcnow().timestamp())
                category_prefix = category.name[:3].upper()
                sku = f"{category_prefix}-{timestamp}"
            else:
                # Check if SKU already exists
                existing_product = Product.query.filter_by(sku=data['sku']).first()
                if existing_product:
                    return jsonify({"error": "SKU already in use"}), 400
                sku = data['sku']

            # Create new product
            product = Product(
                name=data['name'],
                slug=slug,
                description=data.get('description', ''),
                short_description=data.get('short_description', ''),
                price=price,
                sale_price=data.get('sale_price'),
                sku=sku,
                category_id=data['category_id'],
                brand_id=data.get('brand_id'),
                is_active=data.get('is_active', True),
                is_featured=data.get('is_featured', False),
                is_new=data.get('is_new', False),
                is_sale=data.get('is_sale', False),
                is_flash_sale=data.get('is_flash_sale', False),
                is_luxury_deal=data.get('is_luxury_deal', False),
                thumbnail_url=data.get('thumbnail_url'),
                weight=data.get('weight'),
                dimensions=data.get('dimensions'),
                tags=data.get('tags', []),
                meta_title=data.get('meta_title'),
                meta_description=data.get('meta_description'),
                specifications=data.get('specifications'),
                warranty_info=data.get('warranty_info'),
                shipping_info=data.get('shipping_info'),
                min_order_quantity=data.get('min_order_quantity', 1),
                max_order_quantity=data.get('max_order_quantity'),
                is_digital=data.get('is_digital', False),
                is_taxable=data.get('is_taxable', True),
                is_shippable=data.get('is_shippable', True)
            )

            # Set creation timestamps
            now = datetime.utcnow()
            product.created_at = now
            product.updated_at = now

            db.session.add(product)
            db.session.flush()  # Get the product ID

            # Create inventory entry if stock is provided
            if 'stock' in data:
                try:
                    inventory = Inventory(
                        product_id=product.id,
                        stock_level=data.get('stock', 0),
                        reorder_level=data.get('reorder_level', 5),
                        low_stock_threshold=data.get('low_stock_threshold', 5),
                        sku=data.get('sku', product.sku),
                        location=data.get('location', 'Main Warehouse')
                    )
                    db.session.add(inventory)
                except Exception as inventory_error:
                    current_app.logger.warning(f"Could not create inventory entry: {str(inventory_error)}")

            db.session.commit()

            return jsonify({
                "message": "Product created successfully",
                "product": product_schema.dump(product)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating product: {str(e)}")
            return jsonify({"error": "Failed to create product", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def product_operations(product_id):
    """Get, update, or delete a product."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get product details
    if request.method == 'GET':
        try:
            product = Product.query.get_or_404(product_id)

            # Get product variants
            variants = ProductVariant.query.filter_by(product_id=product_id).all()

            # Get product reviews with pagination
            reviews_page = request.args.get('reviews_page', 1, type=int)
            reviews = Review.query.filter_by(product_id=product_id).order_by(
                Review.created_at.desc()
            ).paginate(page=reviews_page, per_page=10, error_out=False)

            # Get product images
            images = ProductImage.query.filter_by(product_id=product_id).order_by(
                ProductImage.sort_order
            ).all()

            # Get inventory details
            inventory = None
            try:
                inventory = Inventory.query.filter_by(product_id=product_id).first()
            except Exception:
                pass

            # Calculate product statistics
            total_sold = db.session.query(func.sum(OrderItem.quantity)).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                and_(OrderItem.product_id == product_id, Order.status != OrderStatus.CANCELLED)
            ).scalar() or 0

            total_revenue = db.session.query(func.sum(OrderItem.total)).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                and_(OrderItem.product_id == product_id, Order.status != OrderStatus.CANCELLED)
            ).scalar() or 0

            average_rating = db.session.query(func.avg(Review.rating)).filter(
                Review.product_id == product_id
            ).scalar() or 0

            # Prepare response
            product_data = product_schema.dump(product)
            product_data.update({
                'variants': product_variants_schema.dump(variants),
                'reviews': {
                    'items': reviews_schema.dump(reviews.items),
                    'pagination': {
                        'page': reviews.page,
                        'per_page': reviews.per_page,
                        'total_pages': reviews.pages,
                        'total_items': reviews.total
                    }
                },
                'images': product_images_schema.dump(images),
                'inventory': inventory.to_dict() if inventory else None,
                'statistics': {
                    'total_sold': total_sold,
                    'total_revenue': float(total_revenue),
                    'average_rating': float(average_rating) if average_rating else 0,
                    'total_reviews': reviews.total
                }
            })

            # Get category details
            if product.category_id:
                category = Category.query.get(product.category_id)
                if category:
                    product_data['category'] = category_schema.dump(category)

            # Get brand details
            if product.brand_id:
                brand = Brand.query.get(product.brand_id)
                if brand:
                    product_data['brand'] = brand_schema.dump(brand)

            return jsonify(product_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

    # PUT - Update product details
    elif request.method == 'PUT':
        try:
            product = Product.query.get_or_404(product_id)
            data = request.get_json()

            # Update basic fields
            if 'name' in data:
                product.name = data['name']
                # Update slug if not provided in the request
                if 'slug' not in data:
                    product.slug = create_slug(data['name'], Product, product_id)

            if 'slug' in data and data['slug']:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_product = Product.query.filter(
                    Product.slug == data['slug'],
                    Product.id != product_id
                ).first()

                if existing_product:
                    return jsonify({"error": "Slug already in use"}), 400

                product.slug = data['slug']

            # Update other text fields
            for field in ['description', 'short_description', 'meta_title', 'meta_description',
                         'warranty_info', 'shipping_info', 'specifications']:
                if field in data:
                    setattr(product, field, data[field])

            # Update price fields with validation
            if 'price' in data:
                try:
                    price = float(data['price'])
                    if price < 0:
                        return jsonify({"error": "Price cannot be negative"}), 400
                    product.price = price
                    # Also validate sale_price if it exists
                    if product.sale_price and product.sale_price >= price:
                        product.is_sale = False
                        product.sale_price = None
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid price value"}), 400

            if 'sale_price' in data:
                if data['sale_price'] is None:
                    product.sale_price = None
                    product.is_sale = False
                else:
                    try:
                        sale_price = float(data['sale_price'])
                        if sale_price < 0:
                            return jsonify({"error": "Sale price cannot be negative"}), 400
                        if sale_price >= product.price:
                            return jsonify({"error": "Sale price must be less than regular price"}), 400
                        product.sale_price = sale_price
                        product.is_sale = True
                    except (ValueError, TypeError):
                        return jsonify({"error": "Invalid sale price value"}), 400

            # Update category_id with validation
            if 'category_id' in data:
                category = Category.query.get(data['category_id'])
                if not category:
                    return jsonify({"error": "Category not found"}), 400
                product.category_id = data['category_id']

            # Update brand_id with validation
            if 'brand_id' in data:
                if data['brand_id'] is None:
                    product.brand_id = None
                else:
                    brand = Brand.query.get(data['brand_id'])
                    if not brand:
                        return jsonify({"error": "Brand not found"}), 400
                    product.brand_id = data['brand_id']

            # Update SKU with validation
            if 'sku' in data:
                existing_product = Product.query.filter(
                    Product.sku == data['sku'],
                    Product.id != product_id
                ).first()
                if existing_product:
                    return jsonify({"error": "SKU already in use"}), 400
                product.sku = data['sku']

            # Update stock with validation
            if 'stock' in data:
                try:
                    stock = float(data['stock'])
                    if stock < 0:
                        return jsonify({"error": "Stock cannot be negative"}), 400
                    product.stock = stock
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid stock value"}), 400

            # Update boolean fields
            boolean_fields = ['is_active', 'is_featured', 'is_new', 'is_sale', 'is_flash_sale',
                            'is_luxury_deal', 'is_digital', 'is_taxable', 'is_shippable']
            for field in boolean_fields:
                if field in data:
                    setattr(product, field, data[field])

            # Update other fields
            other_fields = ['thumbnail_url', 'weight', 'dimensions', 'tags', 'min_order_quantity',
                          'max_order_quantity']
            for field in other_fields:
                if field in data:
                    setattr(product, field, data[field])

            product.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Product updated successfully",
                "product": product_schema.dump(product)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to update product", "details": str(e)}), 500

    # DELETE - Delete a product
    elif request.method == 'DELETE':
        try:
            product = Product.query.get_or_404(product_id)

            # Check if product has orders
            order_items = OrderItem.query.filter_by(product_id=product_id).first()
            if order_items:
                return jsonify({"error": "Cannot delete product with associated orders"}), 400

            db.session.delete(product)
            db.session.commit()

            return jsonify({"message": "Product deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

@admin_routes.route('/products/bulk-update', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def bulk_update_products():
    """Bulk update products."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        data = request.get_json()

        if not data or 'product_ids' not in data or not data['product_ids']:
            return jsonify({"error": "Product IDs are required"}), 400

        product_ids = data['product_ids']
        updates = data.get('updates', {})

        # Validate updates
        allowed_fields = ['is_featured', 'is_new', 'is_sale', 'is_flash_sale', 'is_luxury_deal',
                         'sale_price', 'category_id', 'brand_id', 'is_active']
        for field in updates.keys():
            if field not in allowed_fields:
                return jsonify({"error": f"Field '{field}' cannot be updated in bulk"}), 400

        # Apply updates
        products = Product.query.filter(Product.id.in_(product_ids)).all()
        updated_count = 0

        for product in products:
            updated = False

            for field, value in updates.items():
                if hasattr(product, field):
                    # Special handling for category_id
                    if field == 'category_id' and value is not None:
                        category = Category.query.get(value)
                        if not category:
                            continue  # Skip invalid category

                    # Special handling for brand_id
                    if field == 'brand_id' and value is not None:
                        brand = Brand.query.get(value)
                        if not brand:
                            continue  # Skip invalid brand

                    # Set the field value
                    setattr(product, field, value)
                    updated = True

            if updated:
                product.updated_at = datetime.utcnow()
                updated_count += 1

        db.session.commit()

        return jsonify({
            "message": f"Updated {updated_count} products successfully",
            "updated_count": updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in bulk update products: {str(e)}")
        return jsonify({"error": "Failed to update products", "details": str(e)}), 500

# ----------------------
# Admin Brand Management Routes
# ----------------------

@admin_routes.route('/brands', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_brands():
    """Get all brands or create a new brand."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all brands
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            search = request.args.get('q')
            is_featured = request.args.get('is_featured')
            sort_by = request.args.get('sort_by', 'name')
            sort_order = request.args.get('sort_order', 'asc')

            # Build query
            query = Brand.query

            # Apply filters
            if search:
                query = query.filter(
                    or_(
                        Brand.name.ilike(f'%{search}%'),
                        Brand.description.ilike(f'%{search}%')
                    )
                )

            if is_featured is not None:
                is_featured_bool = is_featured.lower() == 'true'
                query = query.filter_by(is_featured=is_featured_bool)

            # Apply sorting
            if sort_by == 'name':
                query = query.order_by(Brand.name.asc() if sort_order == 'asc' else Brand.name.desc())
            elif sort_by == 'created_at':
                query = query.order_by(Brand.created_at.asc() if sort_order == 'asc' else Brand.created_at.desc())
            else:
                query = query.order_by(Brand.name.asc())

            return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting brands: {str(e)}")
            return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

    # POST - Create a new brand
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'name' not in data or not data['name']:
                return jsonify({"error": "Brand name is required"}), 400

            # Create slug if not provided
            if 'slug' not in data or not data['slug']:
                slug = create_slug(data['name'], Brand)
            else:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_brand = Brand.query.filter_by(slug=data['slug']).first()
                if existing_brand:
                    return jsonify({"error": "Slug already in use"}), 400

                slug = data['slug']

            # Create new brand
            brand = Brand(
                name=data['name'],
                slug=slug,
                description=data.get('description', ''),
                logo_url=data.get('logo_url'),
                website=data.get('website'),
                is_featured=data.get('is_featured', False)
            )

            # Set creation timestamps
            now = datetime.utcnow()
            brand.created_at = now
            brand.updated_at = now

            db.session.add(brand)
            db.session.commit()

            return jsonify({
                "message": "Brand created successfully",
                "brand": brand_schema.dump(brand)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating brand: {str(e)}")
            return jsonify({"error": "Failed to create brand", "details": str(e)}), 500

@admin_routes.route('/brands/<int:brand_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def brand_operations(brand_id):
    """Get, update, or delete a brand."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get brand details
    if request.method == 'GET':
        try:
            brand = Brand.query.get_or_404(brand_id)

            # Get products count for this brand
            products_count = Product.query.filter_by(brand_id=brand_id).count()

            # Get brand statistics
            total_sales = db.session.query(func.sum(OrderItem.total)).join(
                Product, Product.brand_id == brand_id
            ).join(
                OrderItem, OrderItem.product_id == Product.id
            ).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                Order.status != OrderStatus.CANCELLED
            ).scalar() or 0

            brand_data = brand_schema.dump(brand)
            brand_data.update({
                'products_count': products_count,
                'statistics': {
                    'total_sales': float(total_sales),
                    'products_count': products_count
                }
            })

            return jsonify(brand_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

    # PUT - Update brand details
    elif request.method == 'PUT':
        try:
            brand = Brand.query.get_or_404(brand_id)
            data = request.get_json()

            # Update name if provided
            if 'name' in data and data['name']:
                brand.name = data['name']
                # Update slug if not provided in the request
                if 'slug' not in data:
                    brand.slug = create_slug(data['name'], Brand, brand_id)

            # Update slug if provided
            if 'slug' in data and data['slug']:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_brand = Brand.query.filter(
                    Brand.slug == data['slug'],
                    Brand.id != brand_id
                ).first()

                if existing_brand:
                    return jsonify({"error": "Slug already in use"}), 400

                brand.slug = data['slug']

            # Update other fields
            if 'description' in data:
                brand.description = data['description']
            if 'logo_url' in data:
                brand.logo_url = data['logo_url']
            if 'website' in data:
                brand.website = data['website']
            if 'is_featured' in data:
                brand.is_featured = data['is_featured']

            brand.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Brand updated successfully",
                "brand": brand_schema.dump(brand)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to update brand", "details": str(e)}), 500

    # DELETE - Delete a brand
    elif request.method == 'DELETE':
        try:
            brand = Brand.query.get_or_404(brand_id)

            # Check if brand has products
            products_count = Product.query.filter_by(brand_id=brand_id).count()
            if products_count > 0:
                return jsonify({
                    "error": "Cannot delete brand with associated products",
                    "products_count": products_count
                }), 400

            db.session.delete(brand)
            db.session.commit()

            return jsonify({"message": "Brand deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to delete brand", "details": str(e)}), 500

# ----------------------
# Admin Order Management Routes
# ----------------------

@admin_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_orders():
    """Get all orders with comprehensive filtering and pagination."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        search = request.args.get('q')
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        min_amount = request.args.get('min_amount', type=float)
        max_amount = request.args.get('max_amount', type=float)
        user_id = request.args.get('user_id', type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = Order.query

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass  # Invalid status, ignore filter

        if payment_status:
            try:
                payment_status_enum = PaymentStatus(payment_status)
                query = query.filter_by(payment_status=payment_status_enum)
            except ValueError:
                pass  # Invalid payment status, ignore filter

        if user_id:
            query = query.filter_by(user_id=user_id)

        if search:
            # Search in order number, tracking number, and user information
            user_subquery = db.session.query(User.id).filter(
                or_(
                    User.name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.phone.ilike(f'%{search}%')
                )
            ).subquery()

            query = query.filter(
                or_(
                    Order.order_number.ilike(f'%{search}%'),
                    Order.tracking_number.ilike(f'%{search}%'),
                    Order.user_id.in_(user_subquery)
                )
            )

        # Apply date range filter
        date_from, date_to = validate_date_range(date_from_str, date_to_str)
        if date_from:
            query = query.filter(Order.created_at >= date_from)
        if date_to:
            query = query.filter(Order.created_at <= date_to)

        if min_amount is not None:
            query = query.filter(Order.total_amount >= min_amount)

        if max_amount is not None:
            query = query.filter(Order.total_amount <= max_amount)

        # Apply sorting
        if sort_by == 'total_amount':
            query = query.order_by(Order.total_amount.asc() if sort_order == 'asc' else Order.total_amount.desc())
        elif sort_by == 'order_number':
            query = query.order_by(Order.order_number.asc() if sort_order == 'asc' else Order.order_number.desc())
        elif sort_by == 'status':
            query = query.order_by(Order.status.asc() if sort_order == 'asc' else Order.status.desc())
        else:  # Default to created_at
            query = query.order_by(Order.created_at.asc() if sort_order == 'asc' else Order.created_at.desc())

        return jsonify(paginate_response(query, orders_schema, page, per_page)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting orders: {str(e)}")
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@admin_routes.route('/orders/<int:order_id>', methods=['GET', 'PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def order_operations(order_id):
    """Get or update order details."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # GET - Get order details
    if request.method == 'GET':
        try:
            order = Order.query.get_or_404(order_id)

            # Get order items with product details
            order_items = OrderItem.query.filter_by(order_id=order_id).all()
            items_data = []

            for item in order_items:
                product = Product.query.get(item.product_id)
                variant = None
                if item.variant_id:
                    variant = ProductVariant.query.get(item.variant_id)

                item_data = {
                    'id': item.id,
                    'product_id': item.product_id,
                    'variant_id': item.variant_id,
                    'quantity': item.quantity,
                    'price': item.price,
                    'total': item.total,
                    'product': product_schema.dump(product) if product else None,
                    'variant': product_variant_schema.dump(variant) if variant else None
                }
                items_data.append(item_data)

            # Get user details
            user = User.query.get(order.user_id) if order.user_id else None

            # Get payment details
            payments = Payment.query.filter_by(order_id=order.id).all()

            # Prepare response
            order_data = order_schema.dump(order)
            order_data.update({
                'items': items_data,
                'user': user_schema.dump(user) if user else None,
                'payments': payments_schema.dump(payments)
            })

            return jsonify(order_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting order {order_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

    # PUT - Update order details
    elif request.method == 'PUT':
        try:
            order = Order.query.get_or_404(order_id)
            data = request.get_json()

            # Update allowed fields
            if 'status' in data:
                try:
                    new_status = OrderStatus(data['status'])

                    # Validate status transition
                    if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                        return jsonify({"error": "Cannot change status of a cancelled order"}), 400

                    if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                        return jsonify({"error": "Cannot change status of a delivered order"}), 400

                    order.status = new_status
                except ValueError:
                    return jsonify({"error": "Invalid status value"}), 400

            if 'payment_status' in data:
                try:
                    order.payment_status = PaymentStatus(data['payment_status'])
                except ValueError:
                    return jsonify({"error": "Invalid payment status value"}), 400

            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            if 'shipping_method' in data:
                order.shipping_method = data['shipping_method']

            if 'notes' in data:
                order.notes = data['notes']

            order.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Order updated successfully",
                "order": order_schema.dump(order)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating order {order_id}: {str(e)}")
            return jsonify({"error": "Failed to update order", "details": str(e)}), 500

@admin_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_order_status(order_id):
    """Update order status with status transition validation."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        order = Order.query.get_or_404(order_id)
        data = request.get_json()

        if 'status' not in data:
            return jsonify({"error": "Status is required"}), 400

        try:
            new_status = OrderStatus(data['status'])

            # Validate status transition
            if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return jsonify({"error": "Cannot change status of a cancelled order"}), 400

            if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return jsonify({"error": "Cannot change status of a delivered order"}), 400

            # Update order status
            order.status = new_status
            order.updated_at = datetime.utcnow()

            # Update tracking information if provided
            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            # Add notes if provided
            if 'notes' in data:
                if order.notes:
                    order.notes += f"\n{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}: {data['notes']}"
                else:
                    order.notes = f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}: {data['notes']}"

            db.session.commit()

            return jsonify({
                "message": "Order status updated successfully",
                "order": {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status.value,
                    "tracking_number": order.tracking_number,
                    "updated_at": order.updated_at.isoformat()
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating order status {order_id}: {str(e)}")
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

@admin_routes.route('/orders/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def export_orders():
    """Export orders to CSV."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get filter parameters
        status = request.args.get('status')
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')

        # Build query
        query = Order.query

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass

        # Apply date range filter
        date_from, date_to = validate_date_range(date_from_str, date_to_str)
        if date_from:
            query = query.filter(Order.created_at >= date_from)
        if date_to:
            query = query.filter(Order.created_at <= date_to)

        # Order by creation date
        query = query.order_by(Order.created_at.desc())

        # Get all orders
        orders = query.all()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Order ID', 'Order Number', 'Customer Email', 'Customer Name', 'Status',
            'Payment Status', 'Total Amount', 'Created At', 'Tracking Number'
        ])

        # Write data
        for order in orders:
            user = User.query.get(order.user_id) if order.user_id else None

            writer.writerow([
                order.id,
                order.order_number,
                user.email if user else 'Guest',
                user.name if user else 'Guest Customer',
                order.status.value if hasattr(order.status, 'value') else str(order.status),
                order.payment_status.value if hasattr(order.payment_status, 'value') else str(order.payment_status),
                float(order.total_amount),
                order.created_at.strftime('%Y-%m-%d %H:%M:%S') if order.created_at else '',
                order.tracking_number or ''
            ])

        # Create response
        response = jsonify({
            "message": f"Exported {len(orders)} orders",
            "csv_data": output.getvalue(),
            "filename": f"orders_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        })

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error exporting orders: {str(e)}")
        return jsonify({"error": "Failed to export orders", "details": str(e)}), 500

# ----------------------
# Admin Inventory Management Routes
# ----------------------

@admin_routes.route('/inventory', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_inventory():
    """Get inventory data or create inventory entries."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # GET - List inventory
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            search = request.args.get('q')
            stock_status = request.args.get('stock_status')  # 'in_stock', 'out_of_stock', 'low_stock'
            category_id = request.args.get('category_id', type=int)
            sort_by = request.args.get('sort_by', 'stock_level')
            sort_order = request.args.get('sort_order', 'asc')

            # Build query - try Inventory table first, fallback to Product table
            try:
                query = db.session.query(
                    Inventory.id,
                    Inventory.product_id,
                    Inventory.stock_level,
                    Inventory.reserved_quantity,
                    Inventory.reorder_level,
                    Inventory.low_stock_threshold,
                    Inventory.status,
                    Product.name,
                    Product.sku,
                    Product.price,
                    Category.name.label('category_name')
                ).join(
                    Product, Product.id == Inventory.product_id
                ).outerjoin(
                    Category, Category.id == Product.category_id
                )

                # Apply filters
                if search:
                    query = query.filter(
                        or_(
                            Product.name.ilike(f'%{search}%'),
                            Product.sku.ilike(f'%{search}%')
                        )
                    )

                if category_id:
                    query = query.filter(Product.category_id == category_id)

                if stock_status:
                    low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
                    if stock_status == 'in_stock':
                        query = query.filter(Inventory.stock_level > 0)
                    elif stock_status == 'out_of_stock':
                        query = query.filter(Inventory.stock_level == 0)
                    elif stock_status == 'low_stock':
                        query = query.filter(
                            and_(Inventory.stock_level > 0, Inventory.stock_level <= low_stock_threshold)
                        )

                # Apply sorting
                if sort_by == 'stock_level':
                    query = query.order_by(Inventory.stock_level.asc() if sort_order == 'asc' else Inventory.stock_level.desc())
                elif sort_by == 'name':
                    query = query.order_by(Product.name.asc() if sort_order == 'asc' else Product.name.desc())
                else:
                    query = query.order_by(Inventory.stock_level.asc())

                # Paginate
                paginated = query.paginate(page=page, per_page=per_page, error_out=False)

                # Format results
                inventory_items = []
                for item in paginated.items:
                    inventory_items.append({
                        'id': item.id,
                        'product_id': item.product_id,
                        'product_name': item.name,
                        'sku': item.sku,
                        'price': float(item.price) if item.price else 0,
                        'category_name': item.category_name,
                        'stock_level': item.stock_level,
                        'reserved_quantity': item.reserved_quantity,
                        'available_quantity': max(0, item.stock_level - item.reserved_quantity),
                        'reorder_level': item.reorder_level,
                        'low_stock_threshold': item.low_stock_threshold,
                        'status': item.status
                    })

                return jsonify({
                    "items": inventory_items,
                    "pagination": {
                        "page": paginated.page,
                        "per_page": paginated.per_page,
                        "total_pages": paginated.pages,
                        "total_items": paginated.total,
                        "has_next": paginated.has_next,
                        "has_prev": paginated.has_prev
                    }
                }), 200

            except Exception as inventory_error:
                # Fallback to Product table
                current_app.logger.warning(f"Inventory table not available, using Product table: {str(inventory_error)}")

                query = db.session.query(
                    Product.id,
                    Product.name,
                    Product.sku,
                    Product.price,
                    Product.stock,
                    Category.name.label('category_name')
                ).outerjoin(
                    Category, Category.id == Product.category_id
                )

                # Apply filters
                if search:
                    query = query.filter(
                        or_(
                            Product.name.ilike(f'%{search}%'),
                            Product.sku.ilike(f'%{search}%')
                        )
                    )

                if category_id:
                    query = query.filter(Product.category_id == category_id)

                if stock_status:
                    low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
                    if stock_status == 'in_stock':
                        query = query.filter(Product.stock > 0)
                    elif stock_status == 'out_of_stock':
                        query = query.filter(Product.stock == 0)
                    elif stock_status == 'low_stock':
                        query = query.filter(
                            and_(Product.stock > 0, Product.stock <= low_stock_threshold)
                        )

                # Apply sorting
                if sort_by == 'stock_level':
                    query = query.order_by(Product.stock.asc() if sort_order == 'asc' else Product.stock.desc())
                elif sort_by == 'name':
                    query = query.order_by(Product.name.asc() if sort_order == 'asc' else Product.name.desc())
                else:
                    query = query.order_by(Product.stock.asc())

                # Paginate
                paginated = query.paginate(page=page, per_page=per_page, error_out=False)

                # Format results
                inventory_items = []
                for item in paginated.items:
                    inventory_items.append({
                        'id': item.id,
                        'product_id': item.id,
                        'product_name': item.name,
                        'sku': item.sku,
                        'price': float(item.price) if item.price else 0,
                        'category_name': item.category_name,
                        'stock_level': item.stock,
                        'reserved_quantity': 0,
                        'available_quantity': item.stock,
                        'reorder_level': 5,
                        'low_stock_threshold': 5,
                        'status': 'active' if item.stock > 0 else 'out_of_stock'
                    })

                return jsonify({
                    "items": inventory_items,
                    "pagination": {
                        "page": paginated.page,
                        "per_page": paginated.per_page,
                        "total_pages": paginated.pages,
                        "total_items": paginated.total,
                        "has_next": paginated.has_next,
                        "has_prev": paginated.has_prev
                    }
                }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting inventory: {str(e)}")
            return jsonify({"error": "Failed to retrieve inventory", "details": str(e)}), 500

    # POST - Create inventory entry
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'product_id' not in data:
                return jsonify({"error": "Product ID is required"}), 400

            # Check if product exists
            product = Product.query.get(data['product_id'])
            if not product:
                return jsonify({"error": "Product not found"}), 400

            # Check if inventory entry already exists
            existing_inventory = Inventory.query.filter_by(product_id=data['product_id']).first()
            if existing_inventory:
                return jsonify({"error": "Inventory entry already exists for this product"}), 400

            # Create new inventory entry
            inventory = Inventory(
                product_id=data['product_id'],
                stock_level=data.get('stock_level', 0),
                reserved_quantity=data.get('reserved_quantity', 0),
                reorder_level=data.get('reorder_level', 5),
                low_stock_threshold=data.get('low_stock_threshold', 5),
                sku=data.get('sku', product.sku),
                location=data.get('location', 'Main Warehouse')
            )

            db.session.add(inventory)
            db.session.commit()

            return jsonify({
                "message": "Inventory entry created successfully",
                "inventory": inventory.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating inventory entry: {str(e)}")
            return jsonify({"error": "Failed to create inventory entry", "details": str(e)}), 500

@admin_routes.route('/inventory/low-stock', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_low_stock_products():
    """Get products with low stock levels."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()
        threshold = request.args.get('threshold', current_app.config.get('LOW_STOCK_THRESHOLD', 5), type=int)

        try:
            # Try using Inventory table
            query = db.session.query(
                Inventory.id,
                Inventory.product_id,
                Inventory.stock_level,
                Inventory.low_stock_threshold,
                Product.name,
                Product.sku,
                Product.price,
                Category.name.label('category_name')
            ).join(
                Product, Product.id == Inventory.product_id
            ).outerjoin(
                Category, Category.id == Product.category_id
            ).filter(
                and_(Inventory.stock_level > 0, Inventory.stock_level <= threshold)
            ).order_by(Inventory.stock_level.asc())

        except Exception:
            # Fallback to Product table
            query = db.session.query(
                Product.id,
                Product.id.label('product_id'),
                Product.stock.label('stock_level'),
                Product.name,
                Product.sku,
                Product.price,
                Category.name.label('category_name')
            ).outerjoin(
                Category, Category.id == Product.category_id
            ).filter(
                and_(Product.stock > 0, Product.stock <= threshold)
            ).order_by(Product.stock.asc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format results
        low_stock_items = []
        for item in paginated.items:
            low_stock_items.append({
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.name,
                'sku': item.sku,
                'price': float(item.price) if item.price else 0,
                'category_name': getattr(item, 'category_name', ''),
                'stock_level': item.stock_level,
                'low_stock_threshold': getattr(item, 'low_stock_threshold', threshold)
            })

        return jsonify({
            "items": low_stock_items,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            },
            "threshold": threshold
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting low stock products: {str(e)}")
        return jsonify({"error": "Failed to retrieve low stock products", "details": str(e)}), 500

# ----------------------
# Admin Review Management Routes
# ----------------------

@admin_routes.route('/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_reviews():
    """Get all reviews with filtering and pagination."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        rating = request.args.get('rating', type=int)
        search = request.args.get('q')
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = Review.query

        # Apply filters
        if product_id:
            query = query.filter_by(product_id=product_id)

        if user_id:
            query = query.filter_by(user_id=user_id)

        if rating:
            query = query.filter_by(rating=rating)

        if search:
            query = query.filter(
                or_(
                    Review.title.ilike(f'%{search}%'),
                    Review.comment.ilike(f'%{search}%')
                )
            )

        # Apply date range filter
        date_from, date_to = validate_date_range(date_from_str, date_to_str)
        if date_from:
            query = query.filter(Review.created_at >= date_from)
        if date_to:
            query = query.filter(Review.created_at <= date_to)

        # Apply sorting
        if sort_by == 'rating':
            query = query.order_by(Review.rating.asc() if sort_order == 'asc' else Review.rating.desc())
        elif sort_by == 'title':
            query = query.order_by(Review.title.asc() if sort_order == 'asc' else Review.title.desc())
        else:  # Default to created_at
            query = query.order_by(Review.created_at.asc() if sort_order == 'asc' else Review.created_at.desc())

        # Get paginated results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Enhance reviews with user and product data
        enhanced_reviews = []
        for review in paginated.items:
            review_data = review_schema.dump(review)

            # Get user data
            user = User.query.get(review.user_id)
            if user:
                review_data['user'] = {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email
                }

            # Get product data
            product = Product.query.get(review.product_id)
            if product:
                review_data['product'] = {
                    'id': product.id,
                    'name': product.name,
                    'sku': product.sku,
                    'thumbnail_url': product.thumbnail_url
                }

            enhanced_reviews.append(review_data)

        return jsonify({
            "items": enhanced_reviews,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting reviews: {str(e)}")
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@admin_routes.route('/reviews/<int:review_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def review_operations(review_id):
    """Get, update, or delete a review."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    try:
        review = Review.query.get_or_404(review_id)

        # GET - Get review details
        if request.method == 'GET':
            # Get user and product data
            user = User.query.get(review.user_id)
            product = Product.query.get(review.product_id)

            review_data = review_schema.dump(review)
            review_data['user'] = user_schema.dump(user) if user else None
            review_data['product'] = product_schema.dump(product) if product else None

            return jsonify(review_data), 200

        # PUT - Update review (admin moderation)
        elif request.method == 'PUT':
            data = request.get_json()

            # Admin can moderate reviews
            if 'is_approved' in data:
                review.is_approved = data['is_approved']

            if 'admin_notes' in data:
                review.admin_notes = data['admin_notes']

            review.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Review updated successfully",
                "review": review_schema.dump(review)
            }), 200

        # DELETE - Delete a review
        elif request.method == 'DELETE':
            db.session.delete(review)
            db.session.commit()

            return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in review operation {review_id}: {str(e)}")
        return jsonify({"error": "Failed to perform review operation", "details": str(e)}), 500

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
# Admin Coupon Management Routes
# ----------------------

@admin_routes.route('/coupons', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_coupons():
    """Get all coupons or create a new coupon."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all coupons
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            search = request.args.get('q')
            is_active = request.args.get('is_active')
            coupon_type = request.args.get('type')
            sort_by = request.args.get('sort_by', 'created_at')
            sort_order = request.args.get('sort_order', 'desc')

            # Build query
            query = Coupon.query

            # Apply filters
            if search:
                query = query.filter(
                    or_(
                        Coupon.code.ilike(f'%{search}%'),
                        Coupon.description.ilike(f'%{search}%')
                    )
                )

            if is_active is not None:
                is_active_bool = is_active.lower() == 'true'
                query = query.filter_by(is_active=is_active_bool)

            if coupon_type:
                try:
                    coupon_type_enum = CouponType(coupon_type)
                    query = query.filter_by(type=coupon_type_enum)
                except ValueError:
                    pass  # Invalid type, ignore filter

            # Apply sorting
            if sort_by == 'code':
                query = query.order_by(Coupon.code.asc() if sort_order == 'asc' else Coupon.code.desc())
            elif sort_by == 'discount_value':
                query = query.order_by(Coupon.discount_value.asc() if sort_order == 'asc' else Coupon.discount_value.desc())
            else:  # Default to created_at
                query = query.order_by(Coupon.created_at.asc() if sort_order == 'asc' else Coupon.created_at.desc())

            return jsonify(paginate_response(query, coupons_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting coupons: {str(e)}")
            return jsonify({"error": "Failed to retrieve coupons", "details": str(e)}), 500

    # POST - Create a new coupon
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            required_fields = ['code', 'type', 'discount_value']
            for field in required_fields:
                if field not in data or data[field] is None:
                    return jsonify({"error": f"Field '{field}' is required"}), 400

            # Validate coupon code format
            if not re.match(r'^[A-Z0-9_-]+$', data['code']):
                return jsonify({"error": "Coupon code must contain only uppercase letters, numbers, underscores, and hyphens"}), 400

            # Check if coupon code already exists
            existing_coupon = Coupon.query.filter_by(code=data['code']).first()
            if existing_coupon:
                return jsonify({"error": "Coupon code already exists"}), 400

            # Validate coupon type
            try:
                coupon_type = CouponType(data['type'])
            except ValueError:
                return jsonify({"error": "Invalid coupon type"}), 400

            # Validate discount value
            try:
                discount_value = float(data['discount_value'])
                if discount_value <= 0:
                    return jsonify({"error": "Discount value must be greater than 0"}), 400

                if coupon_type == CouponType.PERCENTAGE and discount_value > 100:
                    return jsonify({"error": "Percentage discount cannot exceed 100%"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid discount value"}), 400

            # Validate dates
            valid_from = None
            valid_until = None

            if 'valid_from' in data and data['valid_from']:
                try:
                    valid_from = datetime.fromisoformat(data['valid_from'].replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({"error": "Invalid valid_from date format"}), 400

            if 'valid_until' in data and data['valid_until']:
                try:
                    valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({"error": "Invalid valid_until date format"}), 400

            if valid_from and valid_until and valid_from >= valid_until:
                return jsonify({"error": "valid_from must be before valid_until"}), 400

            # Create new coupon
            coupon = Coupon(
                code=data['code'],
                type=coupon_type,
                discount_value=discount_value,
                description=data.get('description', ''),
                minimum_order_amount=data.get('minimum_order_amount'),
                maximum_discount_amount=data.get('maximum_discount_amount'),
                usage_limit=data.get('usage_limit'),
                usage_limit_per_user=data.get('usage_limit_per_user'),
                valid_from=valid_from,
                valid_until=valid_until,
                is_active=data.get('is_active', True)
            )

            # Set creation timestamps
            now = datetime.utcnow()
            coupon.created_at = now
            coupon.updated_at = now

            db.session.add(coupon)
            db.session.commit()

            return jsonify({
                "message": "Coupon created successfully",
                "coupon": coupon_schema.dump(coupon)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating coupon: {str(e)}")
            return jsonify({"error": "Failed to create coupon", "details": str(e)}), 500

@admin_routes.route('/coupons/<int:coupon_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def coupon_operations(coupon_id):
    """Get, update, or delete a coupon."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    try:
        coupon = Coupon.query.get_or_404(coupon_id)

        # GET - Get coupon details
        if request.method == 'GET':
            # Get usage statistics
            usage_count = db.session.query(func.count(Order.id)).filter(
                Order.coupon_id == coupon_id
            ).scalar() or 0

            coupon_data = coupon_schema.dump(coupon)
            coupon_data['usage_statistics'] = {
                'total_usage': usage_count,
                'remaining_usage': max(0, (coupon.usage_limit or float('inf')) - usage_count)
            }

            return jsonify(coupon_data), 200

        # PUT - Update coupon details
        elif request.method == 'PUT':
            data = request.get_json()

            # Update basic fields
            if 'description' in data:
                coupon.description = data['description']

            if 'discount_value' in data:
                try:
                    discount_value = float(data['discount_value'])
                    if discount_value <= 0:
                        return jsonify({"error": "Discount value must be greater than 0"}), 400

                    if coupon.type == CouponType.PERCENTAGE and discount_value > 100:
                        return jsonify({"error": "Percentage discount cannot exceed 100%"}), 400

                    coupon.discount_value = discount_value
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid discount value"}), 400

            # Update limits
            if 'minimum_order_amount' in data:
                coupon.minimum_order_amount = data['minimum_order_amount']

            if 'maximum_discount_amount' in data:
                coupon.maximum_discount_amount = data['maximum_discount_amount']

            if 'usage_limit' in data:
                coupon.usage_limit = data['usage_limit']

            if 'usage_limit_per_user' in data:
                coupon.usage_limit_per_user = data['usage_limit_per_user']

            # Update dates
            if 'valid_from' in data:
                if data['valid_from']:
                    try:
                        coupon.valid_from = datetime.fromisoformat(data['valid_from'].replace('Z', '+00:00'))
                    except ValueError:
                        return jsonify({"error": "Invalid valid_from date format"}), 400
                else:
                    coupon.valid_from = None

            if 'valid_until' in data:
                if data['valid_until']:
                    try:
                        coupon.valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
                    except ValueError:
                        return jsonify({"error": "Invalid valid_until date format"}), 400
                else:
                    coupon.valid_until = None

            # Validate date range
            if coupon.valid_from and coupon.valid_until and coupon.valid_from >= coupon.valid_until:
                return jsonify({"error": "valid_from must be before valid_until"}), 400

            if 'is_active' in data:
                coupon.is_active = data['is_active']

            coupon.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Coupon updated successfully",
                "coupon": coupon_schema.dump(coupon)
            }), 200

        # DELETE - Delete a coupon
        elif request.method == 'DELETE':
            # Check if coupon has been used
            usage_count = db.session.query(func.count(Order.id)).filter(
                Order.coupon_id == coupon_id
            ).scalar() or 0

            if usage_count > 0:
                return jsonify({
                    "error": "Cannot delete coupon that has been used",
                    "usage_count": usage_count
                }), 400

            db.session.delete(coupon)
            db.session.commit()

            return jsonify({"message": "Coupon deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in coupon operation {coupon_id}: {str(e)}")
        return jsonify({"error": "Failed to perform coupon operation", "details": str(e)}), 500

# ----------------------
# Admin Settings Routes
# ----------------------

@admin_routes.route('/settings', methods=['GET', 'PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_settings():
    """Get or update admin settings."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, OPTIONS')

    # GET - Get current settings
    if request.method == 'GET':
        try:
            # Return current app configuration settings
            settings = {
                'site_name': current_app.config.get('SITE_NAME', 'Mizizzi E-commerce'),
                'site_url': current_app.config.get('SITE_URL', 'http://localhost:3000'),
                'admin_email': current_app.config.get('ADMIN_EMAIL', 'admin@mizizzi.com'),
                'low_stock_threshold': current_app.config.get('LOW_STOCK_THRESHOLD', 5),
                'currency': current_app.config.get('CURRENCY', 'KES'),
                'tax_rate': current_app.config.get('TAX_RATE', 0.16),
                'shipping_cost': current_app.config.get('SHIPPING_COST', 200),
                'free_shipping_threshold': current_app.config.get('FREE_SHIPPING_THRESHOLD', 5000),
                'max_file_size': current_app.config.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024),
                'allowed_file_extensions': ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                'pagination_per_page': current_app.config.get('PAGINATION_PER_PAGE', 12),
                'session_timeout': current_app.config.get('PERMANENT_SESSION_LIFETIME', 3600),
                'email_notifications': current_app.config.get('EMAIL_NOTIFICATIONS', True),
                'sms_notifications': current_app.config.get('SMS_NOTIFICATIONS', False),
                'maintenance_mode': current_app.config.get('MAINTENANCE_MODE', False)
            }

            return jsonify(settings), 200

        except Exception as e:
            current_app.logger.error(f"Error getting admin settings: {str(e)}")
            return jsonify({"error": "Failed to retrieve settings", "details": str(e)}), 500

    # PUT - Update settings
    elif request.method == 'PUT':
        try:
            data = request.get_json()

            # List of settings that can be updated
            updatable_settings = [
                'site_name', 'admin_email', 'low_stock_threshold', 'currency',
                'tax_rate', 'shipping_cost', 'free_shipping_threshold',
                'email_notifications', 'sms_notifications', 'maintenance_mode'
            ]

            updated_settings = {}

            for setting in updatable_settings:
                if setting in data:
                    # Validate specific settings
                    if setting == 'low_stock_threshold':
                        try:
                            value = int(data[setting])
                            if value < 0:
                                return jsonify({"error": "Low stock threshold cannot be negative"}), 400
                            current_app.config[setting.upper()] = value
                            updated_settings[setting] = value
                        except (ValueError, TypeError):
                            return jsonify({"error": "Invalid low stock threshold value"}), 400

                    elif setting == 'tax_rate':
                        try:
                            value = float(data[setting])
                            if value < 0 or value > 1:
                                return jsonify({"error": "Tax rate must be between 0 and 1"}), 400
                            current_app.config[setting.upper()] = value
                            updated_settings[setting] = value
                        except (ValueError, TypeError):
                            return jsonify({"error": "Invalid tax rate value"}), 400

                    elif setting in ['shipping_cost', 'free_shipping_threshold']:
                        try:
                            value = float(data[setting])
                            if value < 0:
                                return jsonify({"error": f"{setting.replace('_', ' ').title()} cannot be negative"}), 400
                            current_app.config[setting.upper()] = value
                            updated_settings[setting] = value
                        except (ValueError, TypeError):
                            return jsonify({"error": f"Invalid {setting.replace('_', ' ')} value"}), 400

                    elif setting in ['email_notifications', 'sms_notifications', 'maintenance_mode']:
                        value = bool(data[setting])
                        current_app.config[setting.upper()] = value
                        updated_settings[setting] = value

                    else:
                        # String settings
                        value = str(data[setting])
                        current_app.config[setting.upper()] = value
                        updated_settings[setting] = value

            return jsonify({
                "message": "Settings updated successfully",
                "updated_settings": updated_settings
            }), 200

        except Exception as e:
            current_app.logger.error(f"Error updating admin settings: {str(e)}")
            return jsonify({"error": "Failed to update settings", "details": str(e)}), 500

# ----------------------
# Admin System Info Routes
# ----------------------

@admin_routes.route('/system/info', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def system_info():
    """Get system information."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        import platform
        import sys
        import psutil
        from flask import __version__ as flask_version

        # Get system information
        system_info = {
            'server': {
                'platform': platform.platform(),
                'python_version': sys.version,
                'flask_version': flask_version,
                'cpu_count': psutil.cpu_count(),
                'memory_total': psutil.virtual_memory().total,
                'memory_available': psutil.virtual_memory().available,
                'disk_usage': psutil.disk_usage('/').percent
            },
            'database': {
                'url': current_app.config.get('SQLALCHEMY_DATABASE_URI', '').split('@')[-1] if '@' in current_app.config.get('SQLALCHEMY_DATABASE_URI', '') else 'Not configured',
                'pool_size': current_app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {}).get('pool_size', 'Default'),
                'max_overflow': current_app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {}).get('max_overflow', 'Default')
            },
            'application': {
                'debug_mode': current_app.debug,
                'testing_mode': current_app.testing,
                'secret_key_set': bool(current_app.config.get('SECRET_KEY')),
                'jwt_secret_set': bool(current_app.config.get('JWT_SECRET_KEY')),
                'upload_folder': current_app.config.get('UPLOAD_FOLDER', 'Not set'),
                'max_content_length': current_app.config.get('MAX_CONTENT_LENGTH', 'Not set')
            }
        }

        return jsonify(system_info), 200

    except Exception as e:
        current_app.logger.error(f"Error getting system info: {str(e)}")
        return jsonify({"error": "Failed to retrieve system information", "details": str(e)}), 500

# ----------------------
# Admin Health Check Route
# ----------------------

@admin_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def admin_health_check():
    """Health check endpoint for admin routes."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Check database connection
        db_status = "connected"
        try:
            if db and hasattr(db, 'session'):
                db.session.execute(text('SELECT 1'))
        except Exception as db_error:
            db_status = f"error: {str(db_error)}"

        # Check cache connection if available
        cache_status = "not_configured"
        try:
            if cache:
                cache.get('health_check')
                cache_status = "connected"
        except Exception as cache_error:
            cache_status = f"error: {str(cache_error)}"

        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": db_status,
            "cache": cache_status,
            "admin_routes": "operational"
        }

        return jsonify(health_data), 200

    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }), 500

# Error handlers
@admin_routes.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Admin endpoint not found"}), 404

@admin_routes.errorhandler(500)
def internal_error(error):
    if db and hasattr(db, 'session'):
        try:
            db.session.rollback()
        except:
            pass
    return jsonify({"error": "Internal admin error"}), 500

# Log successful initialization
print("✅ Admin routes initialized successfully with dashboard routes")

# ----------------------
# Export the blueprint
# ----------------------

# Make sure to export the blueprint
__all__ = ['admin_routes']
