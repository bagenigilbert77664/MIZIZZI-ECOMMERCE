"""
Order routes for Mizizzi E-commerce platform.
Handles all order-related operations including creation, tracking, and management.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, asc, func, extract
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import uuid
import json
import logging

from app.configuration.extensions import db
from app.models.models import (
    User, Order, OrderItem, Product, CartItem,
    Address, Coupon, CouponType, OrderStatus, PaymentStatus,
    Inventory, Category, Brand, Cart
)

# Create blueprint
order_routes = Blueprint('order_routes', __name__)
logger = logging.getLogger(__name__)


def get_current_user():
    """Get current authenticated user."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def generate_order_number():
    """Generate a unique order number."""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_suffix = str(uuid.uuid4())[:8].upper()
    return f"ORD-{timestamp}-{random_suffix}"


def calculate_estimated_delivery(shipping_method=None):
    """Calculate estimated delivery date."""
    base_days = 3  # Default delivery days
    if shipping_method == 'express':
        base_days = 1
    elif shipping_method == 'standard':
        base_days = 3
    elif shipping_method == 'economy':
        base_days = 7

    return datetime.utcnow() + timedelta(days=base_days)


def validate_coupon(coupon_code, order_total):
    """Validate and apply coupon discount."""
    if not coupon_code:
        return 0.0, None

    coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()

    if not coupon:
        return 0.0, "Invalid coupon code"

    # Check if coupon is expired
    now = datetime.utcnow()
    if coupon.start_date and now < coupon.start_date:
        return 0.0, "Coupon is not yet active"

    if coupon.end_date and now > coupon.end_date:
        return 0.0, "Coupon has expired"

    # Check usage limit
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        return 0.0, "Coupon usage limit exceeded"

    # Check minimum purchase requirement
    if coupon.min_purchase and order_total < coupon.min_purchase:
        return 0.0, f"Minimum purchase of ${coupon.min_purchase} required"

    # Calculate discount
    if coupon.type == CouponType.PERCENTAGE:
        discount = order_total * (coupon.value / 100)
        if coupon.max_discount and discount > coupon.max_discount:
            discount = coupon.max_discount
    else:  # Fixed amount
        discount = coupon.value

    return min(discount, order_total), None


def update_inventory_on_order(order_items):
    """Update inventory when order is created."""
    for item in order_items:
        inventory = Inventory.query.filter_by(
            product_id=item['product_id'],
            variant_id=item.get('variant_id')
        ).first()

        if inventory:
            inventory.reserve_stock(item['quantity'])

    db.session.commit()


def restore_inventory_on_cancel(order):
    """Restore inventory when order is cancelled."""
    for item in order.items:
        inventory = Inventory.query.filter_by(
            product_id=item.product_id,
            variant_id=item.variant_id
        ).first()

        if inventory:
            inventory.release_stock(item.quantity)

    db.session.commit()


@order_routes.route('', methods=['GET'])
@jwt_required()
def get_user_orders():
    """Get user's orders with filtering and pagination."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        include_items = request.args.get('include_items', 'false').lower() == 'true'

        # Build query
        query = Order.query.filter_by(user_id=user.id)

        # Apply filters
        if status:
            try:
                status_enum = OrderStatus(status.lower())
                query = query.filter(Order.status == status_enum)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid status value'
                }), 400

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at >= start_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format'
                }), 400

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at <= end_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format'
                }), 400

        if search:
            query = query.filter(
                or_(
                    Order.order_number.ilike(f'%{search}%'),
                    Order.notes.ilike(f'%{search}%')
                )
            )

        # Apply sorting
        if sort_by == 'created_at':
            order_col = Order.created_at
        elif sort_by == 'total_amount':
            order_col = Order.total_amount
        elif sort_by == 'status':
            order_col = Order.status
        else:
            order_col = Order.created_at

        if sort_order == 'desc':
            query = query.order_by(desc(order_col))
        else:
            query = query.order_by(asc(order_col))

        # Paginate
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )

        orders = []
        for order in pagination.items:
            order_data = order.to_dict()

            if include_items:
                order_data['items'] = [item.to_dict() for item in order.items]

            # Add estimated delivery
            if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED]:
                order_data['estimated_delivery'] = calculate_estimated_delivery(
                    order.shipping_method
                ).isoformat()

            orders.append(order_data)

        return jsonify({
            'success': True,
            'data': {
                'orders': orders,
                'pagination': {
                    'page': pagination.page,
                    'pages': pagination.pages,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting user orders: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_user_order(order_id):
    """Get specific user order."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        order = Order.query.filter_by(id=order_id, user_id=user.id).first()
        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        order_data = order.to_dict()

        # Add estimated delivery
        if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED]:
            order_data['estimated_delivery'] = calculate_estimated_delivery(
                order.shipping_method
            ).isoformat()

        return jsonify({
            'success': True,
            'data': {'order': order_data}
        }), 200

    except Exception as e:
        logger.error(f"Error getting order {order_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('', methods=['POST'])
@jwt_required()
def create_order():
    """Create new order from user's cart."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        # Handle JSON parsing errors
        try:
            data = request.get_json()
        except Exception as e:
            logger.error(f"JSON parsing error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON format'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: payment_method'
            }), 400

        # Validate required fields
        required_fields = ['payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(user_id=user.id).all()
        if not cart_items:
            return jsonify({
                'success': False,
                'error': 'Cart is empty'
            }), 400

        # Calculate order totals
        subtotal = 0.0
        order_items = []

        for cart_item in cart_items:
            product = Product.query.get(cart_item.product_id)
            if not product:
                return jsonify({
                    'success': False,
                    'error': f'Product {cart_item.product_id} not found'
                }), 404

            if not product.is_active:
                return jsonify({
                    'success': False,
                    'error': f'Product {product.name} is not available'
                }), 400

            quantity = cart_item.quantity
            price = float(product.sale_price or product.price)

            # Check inventory
            inventory = Inventory.query.filter_by(
                product_id=product.id,
                variant_id=cart_item.variant_id
            ).first()

            if inventory and inventory.available_quantity < quantity:
                return jsonify({
                    'success': False,
                    'error': f'Insufficient stock for {product.name}. Available: {inventory.available_quantity}'
                }), 400

            item_total = price * quantity
            subtotal += item_total

            order_items.append({
                'product_id': product.id,
                'variant_id': cart_item.variant_id,
                'quantity': quantity,
                'price': price,
                'total': item_total
            })

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount, coupon_error = validate_coupon(coupon_code, subtotal)

        if coupon_error:
            return jsonify({
                'success': False,
                'error': coupon_error
            }), 400

        # Calculate final total
        shipping_cost = data.get('shipping_cost', 0.0)
        tax = data.get('tax', 0.0)
        total_amount = subtotal + shipping_cost + tax - discount

        # Validate shipping address
        shipping_address = data.get('shipping_address')
        if not shipping_address:
            return jsonify({
                'success': False,
                'error': 'Shipping address is required'
            }), 400

        # Create order
        order = Order(
            user_id=user.id,
            order_number=generate_order_number(),
            status=OrderStatus.PENDING,
            total_amount=total_amount,
            shipping_address=shipping_address,
            billing_address=data.get('billing_address', shipping_address),
            payment_method=data['payment_method'],
            payment_status=PaymentStatus.PENDING,
            shipping_method=data.get('shipping_method', 'standard'),
            shipping_cost=shipping_cost,
            notes=data.get('notes', '')
        )

        db.session.add(order)
        db.session.flush()  # Get order ID

        # Create order items
        for item_data in order_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data['product_id'],
                variant_id=item_data['variant_id'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                total=item_data['total']
            )
            db.session.add(order_item)

        # Update coupon usage
        if coupon_code and discount > 0:
            coupon = Coupon.query.filter_by(code=coupon_code).first()
            if coupon:
                coupon.used_count += 1

        # Update inventory
        update_inventory_on_order(order_items)

        # Clear user's cart if specified
        if data.get('clear_cart', True):
            CartItem.query.filter_by(user_id=user.id).delete()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'data': {'order': order.to_dict()}
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error creating order: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Database error occurred'
        }), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating order: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    """Cancel user's order."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        order = Order.query.filter_by(id=order_id, user_id=user.id).first()
        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Check if order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            return jsonify({
                'success': False,
                'error': f'Cannot cancel order with status: {order.status.value}'
            }), 400

        # Update order status
        order.status = OrderStatus.CANCELLED

        # Restore inventory
        restore_inventory_on_cancel(order)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Order cancelled successfully',
            'data': {'order': order.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error cancelling order {order_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/<int:order_id>/track', methods=['GET'])
@jwt_required()
def track_order(order_id):
    """Track user's order."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        order = Order.query.filter_by(id=order_id, user_id=user.id).first()
        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Create tracking timeline
        timeline = []

        # Order placed
        timeline.append({
            'status': 'placed',
            'title': 'Order Placed',
            'description': 'Your order has been received and is being processed',
            'timestamp': order.created_at.isoformat(),
            'completed': True
        })

        # Processing
        if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            timeline.append({
                'status': 'processing',
                'title': 'Processing',
                'description': 'Your order is being prepared for shipment',
                'timestamp': order.updated_at.isoformat(),
                'completed': True
            })

        # Shipped
        if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            timeline.append({
                'status': 'shipped',
                'title': 'Shipped',
                'description': 'Your order has been shipped',
                'timestamp': order.updated_at.isoformat(),
                'completed': True,
                'tracking_number': order.tracking_number
            })

        # Delivered
        if order.status == OrderStatus.DELIVERED:
            timeline.append({
                'status': 'delivered',
                'title': 'Delivered',
                'description': 'Your order has been delivered',
                'timestamp': order.updated_at.isoformat(),
                'completed': True
            })

        # Cancelled
        if order.status == OrderStatus.CANCELLED:
            timeline.append({
                'status': 'cancelled',
                'title': 'Cancelled',
                'description': 'Your order has been cancelled',
                'timestamp': order.updated_at.isoformat(),
                'completed': True
            })

        tracking_info = {
            'order': order.to_dict(),
            'timeline': timeline,
            'current_status': order.status.value,
            'tracking_number': order.tracking_number
        }

        # Add estimated delivery for active orders
        if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED]:
            tracking_info['estimated_delivery'] = calculate_estimated_delivery(
                order.shipping_method
            ).isoformat()

        return jsonify({
            'success': True,
            'data': tracking_info
        }), 200

    except Exception as e:
        logger.error(f"Error tracking order {order_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/stats', methods=['GET'])
@jwt_required()
def get_order_stats():
    """Get user's order statistics."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        # Basic stats
        total_orders = Order.query.filter_by(user_id=user.id).count()
        total_spent = db.session.query(func.sum(Order.total_amount)).filter_by(
            user_id=user.id
        ).scalar() or 0.0

        # Orders by status
        status_counts = {}
        for status in OrderStatus:
            count = Order.query.filter_by(
                user_id=user.id, status=status
            ).count()
            status_counts[status.value] = count

        # Recent orders
        recent_orders = Order.query.filter_by(user_id=user.id).order_by(
            desc(Order.created_at)
        ).limit(5).all()

        # Monthly spending (last 12 months)
        monthly_spending = []
        for i in range(12):
            month_start = datetime.utcnow().replace(day=1) - timedelta(days=30*i)
            month_end = month_start.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)

            spent = db.session.query(func.sum(Order.total_amount)).filter(
                and_(
                    Order.user_id == user.id,
                    Order.created_at >= month_start,
                    Order.created_at <= month_end
                )
            ).scalar() or 0.0

            monthly_spending.append({
                'month': month_start.strftime('%Y-%m'),
                'amount': float(spent)
            })

        # Favorite categories
        favorite_categories = db.session.query(
            Category.name,
            func.count(OrderItem.id).label('order_count'),
            func.sum(OrderItem.total).label('total_spent')
        ).join(
            Product, Category.id == Product.category_id
        ).join(
            OrderItem, Product.id == OrderItem.product_id
        ).join(
            Order, OrderItem.order_id == Order.id
        ).filter(
            Order.user_id == user.id
        ).group_by(
            Category.id, Category.name
        ).order_by(
            desc('order_count')
        ).limit(5).all()

        stats = {
            'total_orders': total_orders,
            'total_spent': float(total_spent),
            'average_order_value': float(total_spent / total_orders) if total_orders > 0 else 0.0,
            'status_counts': status_counts,
            'recent_orders': [order.to_dict() for order in recent_orders],
            'monthly_spending': monthly_spending,
            'favorite_categories': [
                {
                    'name': cat.name,
                    'order_count': cat.order_count,
                    'total_spent': float(cat.total_spent)
                }
                for cat in favorite_categories
            ]
        }

        return jsonify({
            'success': True,
            'data': stats
        }), 200

    except Exception as e:
        logger.error(f"Error getting order stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/search', methods=['GET'])
@jwt_required()
def search_orders():
    """Search user's orders."""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        query_param = request.args.get('q', '').strip()
        if not query_param:
            return jsonify({
                'success': True,
                'data': {
                    'orders': [],
                    'query': query_param
                }
            }), 200

        # Search in order number, product names, and notes
        orders = db.session.query(Order).filter(
            and_(
                Order.user_id == user.id,
                or_(
                    Order.order_number.ilike(f'%{query_param}%'),
                    Order.notes.ilike(f'%{query_param}%'),
                    Order.id.in_(
                        db.session.query(OrderItem.order_id).join(
                            Product, OrderItem.product_id == Product.id
                        ).filter(
                            Product.name.ilike(f'%{query_param}%')
                        )
                    )
                )
            )
        ).order_by(desc(Order.created_at)).limit(20).all()

        return jsonify({
            'success': True,
            'data': {
                'orders': [order.to_dict() for order in orders],
                'query': query_param
            }
        }), 200

    except Exception as e:
        logger.error(f"Error searching orders: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@order_routes.route('/health', methods=['GET'])
def order_health_check():
    """Health check endpoint for order system."""
    return jsonify({
        'status': 'ok',
        'service': 'orders',
        'timestamp': datetime.utcnow().isoformat(),
        'endpoints': [
            'GET /api/orders',
            'POST /api/orders',
            'GET /api/orders/<id>',
            'POST /api/orders/<id>/cancel',
            'GET /api/orders/<id>/track',
            'GET /api/orders/stats',
            'GET /api/orders/search'
        ]
    }), 200


# OPTIONS handlers for CORS
@order_routes.route('', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>/cancel', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>/track', methods=['OPTIONS'])
@order_routes.route('/stats', methods=['OPTIONS'])
@order_routes.route('/search', methods=['OPTIONS'])
@order_routes.route('/health', methods=['OPTIONS'])
def handle_options():
    """Handle OPTIONS requests for CORS."""
    return '', 200
