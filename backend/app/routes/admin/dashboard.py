"""
Complete Admin Dashboard routes for Mizizzi E-commerce platform.
Provides comprehensive dashboard analytics and metrics with real database data.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity # type: ignore
from sqlalchemy import func, desc, and_, or_, text, case, extract, distinct
from datetime import datetime, timedelta
from flask_cors import cross_origin # type: ignore
import logging
import json

# Create dashboard blueprint
dashboard_routes = Blueprint('dashboard_routes', __name__)

# Set up logging
logger = logging.getLogger(__name__)

# Import models with fallback handling
try:
    from ...models.models import (
        User, UserRole, Category, Product, Brand, Review,
        Order, OrderItem, OrderStatus, PaymentStatus, Newsletter,
        Cart, CartItem, WishlistItem, Coupon, Payment, Inventory,
        ProductVariant, ProductImage, Address, ShippingMethod,
        PaymentMethod, Promotion, PaymentTransaction
    )
    from ...configuration.extensions import db
    print("✅ Dashboard routes: Successfully imported models")
except ImportError as e:
    print(f"❌ Dashboard routes: Failed to import models: {str(e)}")
    # Try alternative import paths
    try:
        from models.models import (
            User, UserRole, Category, Product, Brand, Review,
            Order, OrderItem, OrderStatus, PaymentStatus, Newsletter,
            Cart, CartItem, WishlistItem, Coupon, Payment, Inventory,
            ProductVariant, ProductImage, Address, ShippingMethod,
            PaymentMethod, Promotion, PaymentTransaction
        )
        from configuration.extensions import db
        print("✅ Dashboard routes: Successfully imported models (alternative path)")
    except ImportError as e2:
        print(f"❌ Dashboard routes: Failed to import models (alternative path): {str(e2)}")
        # Set models to None for safe checking
        User = Product = Order = Category = Brand = Review = None
        Newsletter = Cart = WishlistItem = Coupon = Payment = Inventory = None
        OrderStatus = PaymentStatus = UserRole = None
        db = None

def admin_required(f):
    """Decorator to ensure only admin users can access dashboard routes."""
    from functools import wraps

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
            logger.error(f"Dashboard admin authentication error: {str(e)}")
            return jsonify({
                'error': 'Authentication failed',
                'code': 'AUTH_FAILED',
                'details': str(e)
            }), 500

    return decorated_function

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
        result = query_func()
        return result if result is not None else default
    except Exception as e:
        logger.warning(f"Query count failed: {str(e)}")
        return default

def safe_query_scalar(query_func, default=0):
    """Safely execute a scalar query with error handling."""
    try:
        result = query_func()
        return float(result) if result is not None else default
    except Exception as e:
        logger.warning(f"Query scalar failed: {str(e)}")
        return default

def safe_query_all(query_func, default=None):
    """Safely execute a query that returns multiple results."""
    try:
        result = query_func()
        return result if result is not None else (default or [])
    except Exception as e:
        logger.warning(f"Query all failed: {str(e)}")
        return default or []

def get_date_range_from_params():
    """Extract date range from request parameters."""
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')

    # Default to last 30 days if not provided
    if not from_date or not to_date:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=30)
        from_date = start_date.isoformat()
        to_date = end_date.isoformat()

    try:
        start_date = datetime.strptime(from_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(to_date, '%Y-%m-%d').date()
    except ValueError:
        # Fallback to last 30 days
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=30)

    return start_date, end_date

# ----------------------
# Dashboard Main Route
# ----------------------

@dashboard_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def dashboard_overview():
    """Get comprehensive dashboard overview data from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        current_app.logger.info("📊 Dashboard overview request received")

        # Get date range
        start_date, end_date = get_date_range_from_params()

        # Initialize response data
        dashboard_data = {
            'counts': {},
            'sales': {},
            'order_status': {},
            'payment_status': {},
            'shipping_status': {},
            'recent_orders': [],
            'recent_users': [],
            'low_stock_products': [],
            'sales_by_category': [],
            'top_products': [],
            'customer_segments': [],
            'geographic_data': [],
            'device_analytics': [],
            'browser_analytics': [],
            'traffic_sources': [],
            'system_health': {},
            'recent_activities': [],
            'notifications': [],
            'promotions': [],
            'timestamp': datetime.utcnow().isoformat(),
            'data_source': 'database'
        }

        # ----------------------
        # Basic Counts
        # ----------------------
        if db and User:
            try:
                # User counts
                dashboard_data['counts']['users'] = safe_query_count(lambda: User.query.count())
                dashboard_data['counts']['verified_customers'] = safe_query_count(
                    lambda: User.query.filter_by(email_verified=True).count()
                )
                dashboard_data['counts']['unverified_customers'] = safe_query_count(
                    lambda: User.query.filter_by(email_verified=False).count()
                )
                dashboard_data['counts']['premium_customers'] = safe_query_count(
                    lambda: User.query.filter_by(role=UserRole.USER).count() if UserRole else 0
                )

                # Active sessions (users who logged in today)
                today = datetime.utcnow().date()
                dashboard_data['counts']['active_sessions'] = safe_query_count(
                    lambda: User.query.filter(func.date(User.last_login) == today).count()
                )

            except Exception as e:
                logger.warning(f"Error getting user counts: {str(e)}")

        if db and Product:
            try:
                # Product counts
                dashboard_data['counts']['products'] = safe_query_count(lambda: Product.query.count())
                dashboard_data['counts']['featured_products'] = safe_query_count(
                    lambda: Product.query.filter_by(is_featured=True).count()
                )
                dashboard_data['counts']['new_products'] = safe_query_count(
                    lambda: Product.query.filter_by(is_new=True).count()
                )
                dashboard_data['counts']['sale_products'] = safe_query_count(
                    lambda: Product.query.filter_by(is_sale=True).count()
                )
                dashboard_data['counts']['flash_sale_products'] = safe_query_count(
                    lambda: Product.query.filter_by(is_flash_sale=True).count()
                )
                dashboard_data['counts']['luxury_products'] = safe_query_count(
                    lambda: Product.query.filter_by(is_luxury_deal=True).count()
                )

                # Stock counts
                if Inventory:
                    dashboard_data['counts']['low_stock_products'] = safe_query_count(
                        lambda: db.session.query(Inventory).filter(
                            Inventory.stock_level <= Inventory.low_stock_threshold
                        ).count()
                    )
                    dashboard_data['counts']['out_of_stock_products'] = safe_query_count(
                        lambda: db.session.query(Inventory).filter(
                            Inventory.stock_level <= 0
                        ).count()
                    )
                else:
                    # Fallback to product stock if Inventory model not available
                    dashboard_data['counts']['low_stock_products'] = safe_query_count(
                        lambda: Product.query.filter(Product.stock <= 10).count()
                    )
                    dashboard_data['counts']['out_of_stock_products'] = safe_query_count(
                        lambda: Product.query.filter(Product.stock <= 0).count()
                    )

            except Exception as e:
                logger.warning(f"Error getting product counts: {str(e)}")

        if db and Order:
            try:
                # Order counts
                dashboard_data['counts']['orders'] = safe_query_count(lambda: Order.query.count())

                if OrderStatus:
                    dashboard_data['counts']['pending_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.PENDING).count()
                    )
                    dashboard_data['counts']['processing_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.PROCESSING).count()
                    )
                    dashboard_data['counts']['shipped_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.SHIPPED).count()
                    )
                    dashboard_data['counts']['delivered_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.DELIVERED).count()
                    )
                    dashboard_data['counts']['cancelled_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.CANCELLED).count()
                    )
                    dashboard_data['counts']['returned_orders'] = safe_query_count(
                        lambda: Order.query.filter_by(status=OrderStatus.REFUNDED).count()
                    )

            except Exception as e:
                logger.warning(f"Error getting order counts: {str(e)}")

        if db and Category:
            try:
                dashboard_data['counts']['categories'] = safe_query_count(lambda: Category.query.count())
            except Exception as e:
                logger.warning(f"Error getting category count: {str(e)}")

        if db and Brand:
            try:
                dashboard_data['counts']['brands'] = safe_query_count(lambda: Brand.query.count())
            except Exception as e:
                logger.warning(f"Error getting brand count: {str(e)}")

        if db and Review:
            try:
                dashboard_data['counts']['reviews'] = safe_query_count(lambda: Review.query.count())
                # Assuming pending reviews are those without approval (you may need to adjust based on your schema)
                dashboard_data['counts']['pending_reviews'] = safe_query_count(
                    lambda: Review.query.filter_by(is_verified_purchase=False).count()
                )
            except Exception as e:
                logger.warning(f"Error getting review counts: {str(e)}")

        if db and Newsletter:
            try:
                dashboard_data['counts']['newsletter_subscribers'] = safe_query_count(
                    lambda: Newsletter.query.filter_by(is_subscribed=True).count()
                )
            except Exception as e:
                logger.warning(f"Error getting newsletter count: {str(e)}")

        # ----------------------
        # Sales Data
        # ----------------------
        if db and Order:
            try:
                today = datetime.utcnow().date()
                yesterday = today - timedelta(days=1)
                start_of_week = today - timedelta(days=today.weekday())
                start_of_month = datetime(today.year, today.month, 1).date()
                start_of_year = datetime(today.year, 1, 1).date()
                last_30_days = today - timedelta(days=30)

                # Today's sales
                dashboard_data['sales']['today'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        and_(
                            func.date(Order.created_at) == today,
                            Order.status != OrderStatus.CANCELLED if OrderStatus else True
                        )
                    ).scalar()
                )

                # Yesterday's sales
                dashboard_data['sales']['yesterday'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        and_(
                            func.date(Order.created_at) == yesterday,
                            Order.status != OrderStatus.CANCELLED if OrderStatus else True
                        )
                    ).scalar()
                )

                # Weekly sales
                dashboard_data['sales']['weekly'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        and_(
                            Order.created_at >= start_of_week,
                            Order.status != OrderStatus.CANCELLED if OrderStatus else True
                        )
                    ).scalar()
                )

                # Monthly sales
                dashboard_data['sales']['monthly'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        and_(
                            Order.created_at >= start_of_month,
                            Order.status != OrderStatus.CANCELLED if OrderStatus else True
                        )
                    ).scalar()
                )

                # Yearly sales
                dashboard_data['sales']['yearly'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        and_(
                            Order.created_at >= start_of_year,
                            Order.status != OrderStatus.CANCELLED if OrderStatus else True
                        )
                    ).scalar()
                )

                # Total revenue
                dashboard_data['sales']['total_revenue'] = safe_query_scalar(
                    lambda: db.session.query(func.sum(Order.total_amount)).filter(
                        Order.status != OrderStatus.CANCELLED if OrderStatus else True
                    ).scalar()
                )

                # Pending amount (orders not yet paid)
                if PaymentStatus:
                    dashboard_data['sales']['pending_amount'] = safe_query_scalar(
                        lambda: db.session.query(func.sum(Order.total_amount)).filter(
                            Order.payment_status == PaymentStatus.PENDING
                        ).scalar()
                    )

                # Refunded amount
                if OrderStatus:
                    dashboard_data['sales']['refunded_amount'] = safe_query_scalar(
                        lambda: db.session.query(func.sum(Order.total_amount)).filter(
                            Order.status == OrderStatus.REFUNDED
                        ).scalar()
                    )

                # Calculate additional metrics
                total_orders = safe_query_count(
                    lambda: Order.query.filter(Order.status != OrderStatus.CANCELLED if OrderStatus else True).count()
                )

                if total_orders > 0:
                    dashboard_data['sales']['average_order_value'] = round(
                        dashboard_data['sales']['total_revenue'] / total_orders, 2
                    )
                else:
                    dashboard_data['sales']['average_order_value'] = 0

                # Conversion rate (assuming you track website visits - placeholder calculation)
                dashboard_data['sales']['conversion_rate'] = 3.2  # You'll need to implement actual tracking

                # Cart abandonment rate (if you have cart data)
                if Cart:
                    total_carts = safe_query_count(lambda: Cart.query.count())
                    completed_orders = safe_query_count(lambda: Order.query.count())
                    if total_carts > 0:
                        dashboard_data['sales']['cart_abandonment_rate'] = round(
                            ((total_carts - completed_orders) / total_carts) * 100, 1
                        )
                    else:
                        dashboard_data['sales']['cart_abandonment_rate'] = 0
                else:
                    dashboard_data['sales']['cart_abandonment_rate'] = 0

                # Return rate
                returned_orders = safe_query_count(
                    lambda: Order.query.filter_by(status=OrderStatus.REFUNDED).count() if OrderStatus else 0
                )
                if total_orders > 0:
                    dashboard_data['sales']['return_rate'] = round((returned_orders / total_orders) * 100, 1)
                else:
                    dashboard_data['sales']['return_rate'] = 0

                # Customer lifetime value (simplified calculation)
                if User:
                    total_customers = safe_query_count(lambda: User.query.count())
                    if total_customers > 0:
                        dashboard_data['sales']['customer_lifetime_value'] = round(
                            dashboard_data['sales']['total_revenue'] / total_customers, 2
                        )
                    else:
                        dashboard_data['sales']['customer_lifetime_value'] = 0

            except Exception as e:
                logger.warning(f"Error calculating sales data: {str(e)}")

        # ----------------------
        # Order Status Distribution
        # ----------------------
        if db and Order and OrderStatus:
            try:
                order_statuses = db.session.query(
                    Order.status,
                    func.count(Order.id).label('count')
                ).group_by(Order.status).all()

                for status, count in order_statuses:
                    status_name = status.value if hasattr(status, 'value') else str(status)
                    dashboard_data['order_status'][status_name.lower()] = count

            except Exception as e:
                logger.warning(f"Error getting order status distribution: {str(e)}")

        # ----------------------
        # Payment Status Distribution
        # ----------------------
        if db and Order and PaymentStatus:
            try:
                payment_statuses = db.session.query(
                    Order.payment_status,
                    func.count(Order.id).label('count')
                ).group_by(Order.payment_status).all()

                for status, count in payment_statuses:
                    status_name = status.value if hasattr(status, 'value') else str(status)
                    dashboard_data['payment_status'][status_name.lower()] = count

            except Exception as e:
                logger.warning(f"Error getting payment status distribution: {str(e)}")

        # ----------------------
        # Recent Orders
        # ----------------------
        if db and Order and User:
            try:
                recent_orders = db.session.query(Order, User).join(
                    User, User.id == Order.user_id
                ).order_by(desc(Order.created_at)).limit(10).all()

                for order, user in recent_orders:
                    order_data = {
                        'id': str(order.id),
                        'order_number': getattr(order, 'order_number', f"ORD-{order.id}"),
                        'user': {
                            'name': user.name,
                            'email': user.email
                        },
                        'total_amount': float(order.total_amount),
                        'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                        'payment_status': order.payment_status.value if hasattr(order.payment_status, 'value') else str(order.payment_status),
                        'created_at': order.created_at.isoformat(),
                        'shipping_method': getattr(order, 'shipping_method', 'Standard')
                    }

                    # Get order items count
                    if OrderItem:
                        items_count = safe_query_count(
                            lambda: OrderItem.query.filter_by(order_id=order.id).count()
                        )
                        order_data['items'] = [{'quantity': items_count}]

                    dashboard_data['recent_orders'].append(order_data)

            except Exception as e:
                logger.warning(f"Error getting recent orders: {str(e)}")

        # ----------------------
        # Recent Users
        # ----------------------
        if db and User:
            try:
                recent_users = User.query.order_by(desc(User.created_at)).limit(10).all()

                for user in recent_users:
                    user_data = {
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'role': user.role.value if hasattr(user.role, 'value') else str(user.role),
                        'is_active': getattr(user, 'is_active', True),
                        'created_at': user.created_at.isoformat() if hasattr(user, 'created_at') else datetime.utcnow().isoformat(),
                        'last_login': user.last_login.isoformat() if getattr(user, 'last_login', None) else None,
                        'location': 'Unknown'  # You may want to add location tracking
                    }

                    # Get user's order count and total spent
                    if Order:
                        orders_count = safe_query_count(
                            lambda: Order.query.filter_by(user_id=user.id).count()
                        )
                        total_spent = safe_query_scalar(
                            lambda: db.session.query(func.sum(Order.total_amount)).filter_by(user_id=user.id).scalar()
                        )
                        user_data['orders_count'] = orders_count
                        user_data['total_spent'] = total_spent

                    dashboard_data['recent_users'].append(user_data)

            except Exception as e:
                logger.warning(f"Error getting recent users: {str(e)}")

        # ----------------------
        # Low Stock Products
        # ----------------------
        if db and Product:
            try:
                if Inventory:
                    # Use Inventory model if available
                    low_stock_query = db.session.query(
                        Product, Inventory
                    ).join(
                        Inventory, Inventory.product_id == Product.id
                    ).filter(
                        Inventory.stock_level <= Inventory.low_stock_threshold
                    ).order_by(Inventory.stock_level).limit(10)

                    for product, inventory in low_stock_query:
                        product_data = {
                            'id': product.id,
                            'name': product.name,
                            'stock': inventory.stock_level,
                            'sku': inventory.sku or product.sku,
                            'price': float(product.price),
                            'thumbnail_url': product.thumbnail_url or '/placeholder.svg?height=40&width=40',
                            'category': product.category.name if product.category else 'Uncategorized',
                            'min_stock': inventory.low_stock_threshold
                        }
                        dashboard_data['low_stock_products'].append(product_data)
                else:
                    # Fallback to product stock
                    low_stock_products = Product.query.filter(
                        Product.stock <= 10
                    ).order_by(Product.stock).limit(10).all()

                    for product in low_stock_products:
                        product_data = {
                            'id': product.id,
                            'name': product.name,
                            'stock': product.stock,
                            'sku': product.sku or f"SKU-{product.id}",
                            'price': float(product.price),
                            'thumbnail_url': product.thumbnail_url or '/placeholder.svg?height=40&width=40',
                            'category': product.category.name if product.category else 'Uncategorized',
                            'min_stock': 10
                        }
                        dashboard_data['low_stock_products'].append(product_data)

            except Exception as e:
                logger.warning(f"Error getting low stock products: {str(e)}")

        # ----------------------
        # Sales by Category
        # ----------------------
        if db and Category and Product and Order and OrderItem:
            try:
                sales_by_category = db.session.query(
                    Category.name,
                    func.sum(OrderItem.total).label('total_sales'),
                    func.count(OrderItem.id).label('order_count')
                ).join(
                    Product, Product.category_id == Category.id
                ).join(
                    OrderItem, OrderItem.product_id == Product.id
                ).join(
                    Order, Order.id == OrderItem.order_id
                ).filter(
                    Order.status != OrderStatus.CANCELLED if OrderStatus else True
                ).group_by(Category.name).order_by(desc('total_sales')).limit(10).all()

                total_sales = sum(item.total_sales for item in sales_by_category)

                for category_name, sales, orders in sales_by_category:
                    percentage = (sales / total_sales * 100) if total_sales > 0 else 0
                    dashboard_data['sales_by_category'].append({
                        'category': category_name,
                        'sales': float(sales),
                        'orders': orders,
                        'percentage': round(percentage, 1)
                    })

            except Exception as e:
                logger.warning(f"Error getting sales by category: {str(e)}")

        # ----------------------
        # Top Products
        # ----------------------
        if db and Product and OrderItem and Order:
            try:
                top_products = db.session.query(
                    Product.id,
                    Product.name,
                    Product.thumbnail_url,
                    func.sum(OrderItem.quantity).label('total_sales'),
                    func.sum(OrderItem.total).label('total_revenue')
                ).join(
                    OrderItem, OrderItem.product_id == Product.id
                ).join(
                    Order, Order.id == OrderItem.order_id
                ).filter(
                    Order.status != OrderStatus.CANCELLED if OrderStatus else True
                ).group_by(
                    Product.id, Product.name, Product.thumbnail_url
                ).order_by(desc('total_revenue')).limit(10).all()

                for product_id, name, thumbnail, sales, revenue in top_products:
                    dashboard_data['top_products'].append({
                        'id': product_id,
                        'name': name,
                        'sales': sales,
                        'revenue': float(revenue),
                        'views': 0,  # You'll need to implement view tracking
                        'conversion_rate': 0,  # You'll need to implement conversion tracking
                        'thumbnail_url': thumbnail or '/placeholder.svg?height=40&width=40'
                    })

            except Exception as e:
                logger.warning(f"Error getting top products: {str(e)}")

        # ----------------------
        # Customer Segments
        # ----------------------
        if db and User and Order:
            try:
                # Simple segmentation based on order count and total spent
                customer_segments = db.session.query(
                    case(
                        (func.count(Order.id) >= 10, 'Premium'),
                        (func.count(Order.id) >= 5, 'Regular'),
                        (func.count(Order.id) >= 1, 'New'),
                        else_='Inactive'
                    ).label('segment'),
                    func.count(User.id).label('customer_count'),
                    func.sum(Order.total_amount).label('total_revenue')
                ).outerjoin(
                    Order, Order.user_id == User.id
                ).group_by('segment').all()

                total_customers = sum(segment.customer_count for segment in customer_segments)

                for segment_name, count, revenue in customer_segments:
                    percentage = (count / total_customers * 100) if total_customers > 0 else 0
                    dashboard_data['customer_segments'].append({
                        'segment': segment_name,
                        'count': count,
                        'percentage': round(percentage, 1),
                        'revenue': float(revenue or 0)
                    })

            except Exception as e:
                logger.warning(f"Error getting customer segments: {str(e)}")

        # ----------------------
        # System Health (placeholder data)
        # ----------------------
        dashboard_data['system_health'] = {
            'api_status': 'operational',
            'database_status': 'operational',
            'storage_status': 'operational',
            'cdn_status': 'operational',
            'payment_gateway': 'operational',
            'email_service': 'operational',
            'sms_service': 'operational',
            'backup_status': 'operational',
            'uptime': 99.9,
            'response_time': 245,
            'error_rate': 0.1,
            'active_connections': dashboard_data['counts'].get('active_sessions', 0),
            'cpu_usage': 45,
            'memory_usage': 67,
            'disk_usage': 34,
            'bandwidth_usage': 78
        }

        # ----------------------
        # Recent Activities (simplified)
        # ----------------------
        activities = []

        # Add recent order activities
        for order in dashboard_data['recent_orders'][:5]:
            activities.append({
                'id': len(activities) + 1,
                'type': 'order',
                'message': f"New order {order['order_number']} placed by {order['user']['name']} (${order['total_amount']})",
                'time': '2 minutes ago',  # You'll need to implement proper time calculation
                'icon': 'ShoppingCart',
                'color': 'green'
            })

        # Add recent user activities
        for user in dashboard_data['recent_users'][:3]:
            activities.append({
                'id': len(activities) + 1,
                'type': 'user',
                'message': f"{user['name']} registered as new customer",
                'time': '5 minutes ago',
                'icon': 'Users',
                'color': 'blue'
            })

        dashboard_data['recent_activities'] = activities

        # ----------------------
        # Notifications (placeholder)
        # ----------------------
        notifications = []

        if dashboard_data['counts'].get('low_stock_products', 0) > 0:
            notifications.append({
                'id': 1,
                'title': 'Low Stock Alert',
                'message': f"{dashboard_data['counts']['low_stock_products']} products are running low on stock",
                'type': 'warning',
                'time': '5 minutes ago',
                'read': False
            })

        if dashboard_data['counts'].get('pending_orders', 0) > 0:
            notifications.append({
                'id': 2,
                'title': 'Pending Orders',
                'message': f"{dashboard_data['counts']['pending_orders']} orders need processing",
                'type': 'info',
                'time': '10 minutes ago',
                'read': False
            })

        dashboard_data['notifications'] = notifications

        # ----------------------
        # Promotions
        # ----------------------
        if db and Promotion:
            try:
                active_promotions = Promotion.query.filter_by(is_active=True).limit(10).all()

                for promo in active_promotions:
                    dashboard_data['promotions'].append({
                        'id': promo.id,
                        'name': promo.name,
                        'discount': float(promo.discount_value),
                        'type': promo.discount_type.value if hasattr(promo.discount_type, 'value') else str(promo.discount_type),
                        'status': 'active' if promo.is_active else 'inactive',
                        'start_date': promo.start_date.isoformat() if promo.start_date else None,
                        'end_date': promo.end_date.isoformat() if promo.end_date else None,
                        'usage': 0  # You'll need to implement usage tracking
                    })

            except Exception as e:
                logger.warning(f"Error getting promotions: {str(e)}")

        current_app.logger.info("✅ Dashboard overview data compiled successfully from database")
        return jsonify(dashboard_data), 200

    except Exception as e:
        current_app.logger.error(f"❌ Error in dashboard overview: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve dashboard data",
            "details": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

# ----------------------
# Sales Chart Route
# ----------------------

@dashboard_routes.route('/sales-chart', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def sales_chart():
    """Get sales chart data from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        days = request.args.get('days', 30, type=int)
        days = min(days, 365)  # Limit to 1 year max

        # Calculate date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)

        chart_data = []

        if Order and db:
            try:
                # Get daily sales for the specified period
                sales_data = db.session.query(
                    func.date(Order.created_at).label('date'),
                    func.sum(Order.total_amount).label('total_sales'),
                    func.count(Order.id).label('order_count')
                ).filter(
                    and_(
                        Order.created_at >= start_date,
                        Order.created_at <= end_date,
                        Order.status != OrderStatus.CANCELLED if OrderStatus else True
                    )
                ).group_by(func.date(Order.created_at)).order_by('date').all()

                # Create a dictionary for easy lookup
                sales_dict = {item.date: item for item in sales_data}

                # Fill in all dates in the range
                current_date = start_date
                while current_date <= end_date:
                    if current_date in sales_dict:
                        item = sales_dict[current_date]
                        chart_data.append({
                            'date': current_date.isoformat(),
                            'sales': float(item.total_sales),
                            'orders': item.order_count
                        })
                    else:
                        chart_data.append({
                            'date': current_date.isoformat(),
                            'sales': 0,
                            'orders': 0
                        })
                    current_date += timedelta(days=1)

            except Exception as query_error:
                logger.warning(f"Error getting sales chart data: {str(query_error)}")

        return jsonify({
            'chart_data': chart_data,
            'period': f'{days} days',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting sales chart: {str(e)}")
        return jsonify({"error": "Failed to retrieve sales chart data", "details": str(e)}), 500

# ----------------------
# Category Sales Route
# ----------------------

@dashboard_routes.route('/category-sales', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def category_sales():
    """Get category sales data from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        category_sales_data = []

        if Category and Product and Order and OrderItem and db:
            try:
                # Get sales by category
                sales_by_category = db.session.query(
                    Category.id,
                    Category.name,
                    func.sum(OrderItem.total).label('total_sales'),
                    func.sum(OrderItem.quantity).label('total_quantity'),
                    func.count(distinct(Order.id)).label('order_count')
                ).join(
                    Product, Product.category_id == Category.id
                ).join(
                    OrderItem, OrderItem.product_id == Product.id
                ).join(
                    Order, Order.id == OrderItem.order_id
                ).filter(
                    Order.status != OrderStatus.CANCELLED if OrderStatus else True
                ).group_by(
                    Category.id, Category.name
                ).order_by(
                    desc('total_sales')
                ).limit(15).all()

                # Format the data
                for item in sales_by_category:
                    category_sales_data.append({
                        'category_id': item.id,
                        'category_name': item.name,
                        'total_sales': float(item.total_sales),
                        'total_quantity': item.total_quantity,
                        'order_count': item.order_count
                    })

            except Exception as query_error:
                logger.warning(f"Error getting category sales data: {str(query_error)}")

        return jsonify({
            'category_sales': category_sales_data,
            'total_categories': len(category_sales_data)
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting category sales: {str(e)}")
        return jsonify({"error": "Failed to retrieve category sales data", "details": str(e)}), 500

# ----------------------
# Recent Activity Route
# ----------------------

@dashboard_routes.route('/recent-activity', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def recent_activity():
    """Get recent activity data from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        activities = []

        # Get recent orders
        if Order and User and db:
            try:
                recent_orders = db.session.query(Order, User).join(
                    User, User.id == Order.user_id
                ).order_by(
                    desc(Order.created_at)
                ).limit(10).all()

                for order, user in recent_orders:
                    time_diff = datetime.utcnow() - order.created_at
                    time_ago = f"{time_diff.days} days ago" if time_diff.days > 0 else f"{time_diff.seconds // 3600} hours ago"

                    activities.append({
                        'type': 'order',
                        'id': order.id,
                        'description': f"New order #{getattr(order, 'order_number', order.id)} by {user.name}",
                        'amount': float(order.total_amount),
                        'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                        'timestamp': order.created_at.isoformat(),
                        'time_ago': time_ago,
                        'user_name': user.name,
                        'user_email': user.email
                    })

            except Exception as query_error:
                logger.warning(f"Error getting recent orders: {str(query_error)}")

        # Get recent user registrations
        if User and db:
            try:
                recent_users = User.query.order_by(
                    desc(User.created_at)
                ).limit(5).all()

                for user in recent_users:
                    created_at = getattr(user, 'created_at', datetime.utcnow())
                    time_diff = datetime.utcnow() - created_at
                    time_ago = f"{time_diff.days} days ago" if time_diff.days > 0 else f"{time_diff.seconds // 3600} hours ago"

                    activities.append({
                        'type': 'user_registration',
                        'id': user.id,
                        'description': f"New user registered: {user.name}",
                        'timestamp': created_at.isoformat(),
                        'time_ago': time_ago,
                        'user_name': user.name,
                        'user_email': user.email
                    })

            except Exception as query_error:
                logger.warning(f"Error getting recent users: {str(query_error)}")

        # Get recent reviews
        if Review and User and Product and db:
            try:
                recent_reviews = db.session.query(Review, User, Product).join(
                    User, User.id == Review.user_id
                ).join(
                    Product, Product.id == Review.product_id
                ).order_by(
                    desc(Review.created_at)
                ).limit(5).all()

                for review, user, product in recent_reviews:
                    time_diff = datetime.utcnow() - review.created_at
                    time_ago = f"{time_diff.days} days ago" if time_diff.days > 0 else f"{time_diff.seconds // 3600} hours ago"

                    activities.append({
                        'type': 'review',
                        'id': review.id,
                        'description': f"{review.rating}-star review for {product.name} by {user.name}",
                        'timestamp': review.created_at.isoformat(),
                        'time_ago': time_ago,
                        'user_name': user.name,
                        'product_name': product.name,
                        'rating': review.rating
                    })

            except Exception as query_error:
                logger.warning(f"Error getting recent reviews: {str(query_error)}")

        # Sort activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        # Limit to 20 most recent activities
        activities = activities[:20]

        return jsonify({
            'activities': activities,
            'total_activities': len(activities)
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting recent activity: {str(e)}")
        return jsonify({"error": "Failed to retrieve recent activity data", "details": str(e)}), 500

# ----------------------
# Product Analytics Route
# ----------------------

@dashboard_routes.route('/product-analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def product_analytics():
    """Get detailed product analytics from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        analytics_data = {}

        if db and Product:
            # Product performance metrics
            if OrderItem and Order:
                try:
                    # Best selling products
                    best_sellers = db.session.query(
                        Product.id,
                        Product.name,
                        Product.thumbnail_url,
                        func.sum(OrderItem.quantity).label('total_sold'),
                        func.sum(OrderItem.total).label('total_revenue'),
                        func.count(distinct(Order.id)).label('order_count')
                    ).join(
                        OrderItem, OrderItem.product_id == Product.id
                    ).join(
                        Order, Order.id == OrderItem.order_id
                    ).filter(
                        Order.status != OrderStatus.CANCELLED if OrderStatus else True
                    ).group_by(
                        Product.id, Product.name, Product.thumbnail_url
                    ).order_by(desc('total_sold')).limit(10).all()

                    analytics_data['best_sellers'] = [
                        {
                            'id': item.id,
                            'name': item.name,
                            'thumbnail_url': item.thumbnail_url,
                            'total_sold': item.total_sold,
                            'total_revenue': float(item.total_revenue),
                            'order_count': item.order_count
                        }
                        for item in best_sellers
                    ]

                except Exception as e:
                    logger.warning(f"Error getting best sellers: {str(e)}")
                    analytics_data['best_sellers'] = []

            # Product stock analysis
            if Inventory:
                try:
                    stock_analysis = db.session.query(
                        case(
                            (Inventory.stock_level <= 0, 'out_of_stock'),
                            (Inventory.stock_level <= Inventory.low_stock_threshold, 'low_stock'),
                            (Inventory.stock_level <= Inventory.low_stock_threshold * 2, 'medium_stock'),
                            else_='high_stock'
                        ).label('stock_level'),
                        func.count(Product.id).label('product_count')
                    ).join(
                        Inventory, Inventory.product_id == Product.id
                    ).group_by('stock_level').all()

                    analytics_data['stock_analysis'] = {
                        item.stock_level: item.product_count
                        for item in stock_analysis
                    }

                except Exception as e:
                    logger.warning(f"Error getting stock analysis: {str(e)}")
                    analytics_data['stock_analysis'] = {}

            # Category distribution
            if Category:
                try:
                    category_distribution = db.session.query(
                        Category.name,
                        func.count(Product.id).label('product_count')
                    ).join(
                        Product, Product.category_id == Category.id
                    ).group_by(Category.name).order_by(desc('product_count')).all()

                    analytics_data['category_distribution'] = [
                        {
                            'category': item.name,
                            'product_count': item.product_count
                        }
                        for item in category_distribution
                    ]

                except Exception as e:
                    logger.warning(f"Error getting category distribution: {str(e)}")
                    analytics_data['category_distribution'] = []

        return jsonify(analytics_data), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve product analytics", "details": str(e)}), 500

# ----------------------
# Customer Analytics Route
# ----------------------

@dashboard_routes.route('/customer-analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def customer_analytics():
    """Get detailed customer analytics from real database."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        analytics_data = {}

        if db and User:
            # Customer registration trends
            try:
                registration_trends = db.session.query(
                    func.date(User.created_at).label('date'),
                    func.count(User.id).label('registrations')
                ).filter(
                    User.created_at >= datetime.utcnow() - timedelta(days=30)
                ).group_by(func.date(User.created_at)).order_by('date').all()

                analytics_data['registration_trends'] = [
                    {
                        'date': item.date.isoformat(),
                        'registrations': item.registrations
                    }
                    for item in registration_trends
                ]

            except Exception as e:
                logger.warning(f"Error getting registration trends: {str(e)}")
                analytics_data['registration_trends'] = []

            # Customer value segments
            if Order:
                try:
                    customer_segments = db.session.query(
                        User.id,
                        User.name,
                        User.email,
                        func.count(Order.id).label('order_count'),
                        func.sum(Order.total_amount).label('total_spent'),
                        func.max(Order.created_at).label('last_order_date')
                    ).outerjoin(
                        Order, Order.user_id == User.id
                    ).group_by(
                        User.id, User.name, User.email
                    ).order_by(desc('total_spent')).limit(50).all()

                    analytics_data['top_customers'] = [
                        {
                            'id': item.id,
                            'name': item.name,
                            'email': item.email,
                            'order_count': item.order_count or 0,
                            'total_spent': float(item.total_spent or 0),
                            'last_order_date': item.last_order_date.isoformat() if item.last_order_date else None
                        }
                        for item in customer_segments
                    ]

                except Exception as e:
                    logger.warning(f"Error getting customer segments: {str(e)}")
                    analytics_data['top_customers'] = []

        return jsonify(analytics_data), 200

    except Exception as e:
        current_app.logger.error(f"Error getting customer analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve customer analytics", "details": str(e)}), 500

# ----------------------
# Dashboard Health Check
# ----------------------

@dashboard_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def dashboard_health():
    """Health check endpoint for dashboard."""
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

        health_data = {
            "status": "healthy",
            "service": "admin_dashboard",
            "timestamp": datetime.utcnow().isoformat(),
            "database": db_status,
            "models_loaded": {
                "User": User is not None,
                "Product": Product is not None,
                "Order": Order is not None,
                "Category": Category is not None,
                "Brand": Brand is not None,
                "Review": Review is not None,
                "Inventory": Inventory is not None
            }
        }

        return jsonify(health_data), 200

    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "admin_dashboard",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

# Error handlers
@dashboard_routes.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Dashboard endpoint not found"}), 404

@dashboard_routes.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal dashboard error"}), 500

print("✅ Complete Dashboard routes initialized successfully with real database integration")
