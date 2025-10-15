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
from .order_email_templates import send_order_confirmation_email, send_email

# Create blueprint
order_routes = Blueprint('order_routes', __name__)
logger = logging.getLogger(__name__)


def get_current_user():
    """Get current authenticated user."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def generate_order_number():
    """Generate unique order number using Jumia-style algorithm."""
    import random
    import time
    
    # Use current timestamp as seed for better uniqueness
    random.seed(int(time.time() * 1000000) % 1000000)
    
    # Generate 9-digit number starting with 3 (like Jumia pattern)
    first_digit = 3
    remaining_digits = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    
    return f"{first_digit}{remaining_digits}"


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
        logger.info("[v0] get_user_orders function called")
        logger.info(f"[v0] Request args: {dict(request.args)}")
        
        logger.info("[v0] Starting get_user_orders request")
        
        try:
            user = get_current_user()
            logger.info(f"[v0] get_current_user() completed, user: {user.id if user else 'None'}")
        except Exception as e:
            logger.error(f"[v0] Error in get_current_user(): {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Authentication error'
            }), 401
            
        if not user:
            logger.error("[v0] User not found in get_user_orders")
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        logger.info(f"[v0] Found user {user.id} for orders request")
        
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
        
        logger.info(f"[v0] Query params - page: {page}, per_page: {per_page}, status: {status}")
        
        try:
            # Build query
            query = Order.query.filter_by(user_id=user.id)
            logger.info(f"[v0] Base query created for user {user.id}")
        except Exception as e:
            logger.error(f"[v0] Error building base query: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Database query error'
            }), 500
        
        # Apply filters
        if status:
            try:
                status_lower = status.lower()
                valid_statuses = [s.value for s in OrderStatus]
                
                if status_lower not in valid_statuses:
                    logger.error(f"[v0] Invalid status value: {status}. Valid values: {valid_statuses}")
                    return jsonify({
                        'success': False,
                        'error': f'Invalid status value: {status}. Valid values are: {valid_statuses}'
                    }), 400
                
                # Find the enum by value
                status_enum = None
                for enum_item in OrderStatus:
                    if enum_item.value == status_lower:
                        status_enum = enum_item
                        break
                
                if status_enum is None:
                    logger.error(f"[v0] No matching enum found for status: {status_lower}")
                    return jsonify({
                        'success': False,
                        'error': f'Invalid status value: {status}. Valid values are: {valid_statuses}'
                    }), 400
                
                query = query.filter(Order.status == status_enum)
                logger.info(f"[v0] Applied status filter: {status_lower} -> {status_enum}")
                
            except Exception as e:
                logger.error(f"[v0] Status filter error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Status filter error'
                }), 400
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at >= start_dt)
                logger.info(f"[v0] Applied start_date filter: {start_date}")
            except ValueError as e:
                logger.error(f"[v0] Start date parsing error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format'
                }), 400
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at <= end_dt)
                logger.info(f"[v0] Applied end_date filter: {end_date}")
            except ValueError as e:
                logger.error(f"[v0] End date parsing error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format'
                }), 400
        
        if search:
            try:
                query = query.filter(
                    or_(
                        Order.order_number.ilike(f'%{search}%'),
                        Order.notes.ilike(f'%{search}%')
                    )
                )
                logger.info(f"[v0] Applied search filter: {search}")
            except Exception as e:
                logger.error(f"[v0] Search filter error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Search filter error'
                }), 400
        
        # Apply sorting
        try:
            if sort_by == 'created_at':
                sort_column = Order.created_at
            elif sort_by == 'total_amount':
                sort_column = Order.total_amount
            elif sort_by == 'status':
                sort_column = Order.status
            else:
                sort_column = Order.created_at
            
            if sort_order.lower() == 'asc':
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
            
            logger.info(f"[v0] Applied sorting: {sort_by} {sort_order}")
        except Exception as e:
            logger.error(f"[v0] Sorting error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Sorting error'
            }), 400
        
        try:
            # Execute pagination
            logger.info(f"[v0] Executing paginated query...")
            
            try:
                pagination = query.paginate(
                    page=page,
                    per_page=per_page,
                    error_out=False
                )
            except Exception as enum_error:
                # If we get an enum error, it's likely due to invalid data in the database
                if 'is not among the defined enum values' in str(enum_error):
                    logger.error(f"[v0] Enum validation error during pagination: {str(enum_error)}")
                    logger.error("[v0] This indicates invalid enum values in the database. Please run the fix-payment-status-enum-data.py script.")
                    return jsonify({
                        'success': False,
                        'error': 'Database contains invalid enum values. Please contact support.',
                        'details': 'Run fix-payment-status-enum-data.py script to fix the data.'
                    }), 500
                else:
                    raise enum_error
            
            orders = pagination.items
            logger.info(f"[v0] Found {len(orders)} orders for user {user.id}")
            logger.info(f"[v0] Pagination - Total: {pagination.total}, Pages: {pagination.pages}")
        except Exception as e:
            logger.error(f"[v0] Pagination error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Database pagination error'
            }), 500
        
        orders_data = []
        for order in orders:
            try:
                order_dict = {
                    'id': order.id,
                    'order_number': order.order_number or '',
                    'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                    'total_amount': float(order.total_amount) if order.total_amount is not None else 0.0,
                    'subtotal': float(order.subtotal) if order.subtotal is not None else 0.0,
                    'tax_amount': float(order.tax_amount) if order.tax_amount is not None else 0.0,
                    'shipping_cost': float(order.shipping_cost) if order.shipping_cost is not None else 0.0,
                    'payment_method': order.payment_method or '',
                    'payment_status': (
                        order.payment_status.value
                        if hasattr(order.payment_status, 'value')
                        else str(order.payment_status).upper() if order.payment_status
                        else 'PENDING'
                    ),
                    'shipping_method': order.shipping_method or '',
                    'tracking_number': order.tracking_number or '',
                    'notes': order.notes or '',
                    'shipping_address': order.shipping_address or {},
                    'billing_address': order.billing_address or {},
                    'created_at': order.created_at.isoformat() if order.created_at else None,
                    'updated_at': order.updated_at.isoformat() if order.updated_at else None,
                    'is_archived': bool(order.is_archived) if hasattr(order, 'is_archived') else False
                }
                
                # Add estimated delivery for processing/shipped orders
                try:
                    if hasattr(order, 'status') and order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURNED]:
                        estimated_delivery = calculate_estimated_delivery(order.shipping_method)
                        order_dict['estimated_delivery'] = estimated_delivery.isoformat() if estimated_delivery else None
                except Exception as delivery_error:
                    logger.warning(f"[v0] Could not calculate delivery for order {order.id}: {str(delivery_error)}")
                    order_dict['estimated_delivery'] = None
                
                # Add items if requested
                if include_items:
                    items_data = []
                    try:
                        if hasattr(order, 'items') and order.items:
                            for item in order.items:
                                try:
                                    # Create item dict manually with better error handling
                                    item_dict = {
                                        'id': item.id,
                                        'product_id': item.product_id,
                                        'quantity': int(item.quantity) if item.quantity is not None else 0,
                                        'price': float(item.price) if item.price is not None else 0.0,
                                        'total': float(item.quantity * item.price) if (item.price is not None and item.quantity is not None) else 0.0
                                    }
                                    
                                    # Add product info if available
                                    try:
                                        if hasattr(item, 'product') and item.product:
                                            product = item.product
                                            
                                            # Parse image_urls if it's stored as JSON string
                                            image_urls = []
                                            if product.image_urls:
                                                try:
                                                    import json
                                                    if isinstance(product.image_urls, str):
                                                        image_urls = json.loads(product.image_urls)
                                                    elif isinstance(product.image_urls, list):
                                                        image_urls = product.image_urls
                                                except:
                                                    image_urls = []
                                            
                                            # Get product images from ProductImage relationship
                                            product_images = []
                                            if hasattr(product, 'images') and product.images:
                                                for img in product.images:
                                                    product_images.append({
                                                        'id': img.id,
                                                        'url': img.url,
                                                        'is_primary': img.is_primary,
                                                        'alt_text': img.alt_text or product.name
                                                    })
                                            
                                            # Determine the best thumbnail/primary image
                                            primary_image = product.thumbnail_url
                                            if not primary_image and product_images:
                                                # Find primary image or use first one
                                                primary_img = next((img for img in product_images if img['is_primary']), None)
                                                if primary_img:
                                                    primary_image = primary_img['url']
                                                elif product_images:
                                                    primary_image = product_images[0]['url']
                                            
                                            if not primary_image and image_urls:
                                                primary_image = image_urls[0]
                                            
                                            item_dict['product'] = {
                                                'id': product.id,
                                                'name': product.name or 'Unknown Product',
                                                'slug': product.slug or '',
                                                'sku': product.sku or '',
                                                'description': product.description or '',
                                                'short_description': product.short_description or '',
                                                'price': float(product.price) if product.price else 0.0,
                                                'sale_price': float(product.sale_price) if product.sale_price else None,
                                                'thumbnail_url': primary_image or '',
                                                'image_url': primary_image or '',  # For backward compatibility
                                                'image_urls': image_urls,
                                                'images': product_images,
                                                'brand': product.brand.name if product.brand else '',
                                                'category': product.category.name if product.category else '',
                                                'is_active': product.is_active,
                                                'stock_quantity': product.stock_quantity or 0,
                                                'weight': product.weight,
                                                'dimensions': product.dimensions
                                            }
                                            
                                            # Add product name to item level for easier access
                                            item_dict['product_name'] = product.name
                                            item_dict['product_image'] = primary_image
                                            
                                    except Exception as product_error:
                                        logger.warning(f"[v0] Could not load product info for item {item.id}: {str(product_error)}")
                                        item_dict['product'] = {
                                            'id': item.product_id if hasattr(item, 'product_id') else 0,
                                            'name': 'Unknown Product',
                                            'sku': '',
                                            'thumbnail_url': '',
                                            'image_url': '',
                                            'image_urls': [],
                                            'images': []
                                        }
                                        item_dict['product_name'] = 'Unknown Product'
                                        item_dict['product_image'] = ''
                                    
                                    items_data.append(item_dict)
                                except Exception as item_error:
                                    logger.error(f"[v0] Error processing item {item.id}: {str(item_error)}")
                                    # Add minimal item data as fallback
                                    items_data.append({
                                        'id': getattr(item, 'id', 0),
                                        'product_id': getattr(item, 'product_id', 0),
                                        'quantity': 0,
                                        'price': 0.0,
                                        'total': 0.0,
                                        'error': 'Could not load item details'
                                    })
                    except Exception as items_error:
                        logger.error(f"[v0] Error processing items for order {order.id}: {str(items_error)}")
                        items_data = []
                    
                    order_dict['items'] = items_data
                
                orders_data.append(order_dict)
                
            except Exception as order_error:
                logger.error(f"[v0] Error processing order {order.id}: {str(order_error)}")
                # Add minimal order data as fallback
                try:
                    orders_data.append({
                        'id': getattr(order, 'id', 0),
                        'order_number': getattr(order, 'order_number', ''),
                        'status': 'unknown',
                        'total_amount': 0.0,
                        'subtotal': 0.0,
                        'tax_amount': 0.0,
                        'shipping_cost': 0.0,
                        'payment_method': '',
                        'payment_status': 'unknown',
                        'shipping_method': '',
                        'tracking_number': '',
                        'notes': '',
                        'shipping_address': {},
                        'billing_address': {},
                        'created_at': None,
                        'updated_at': None,
                        'is_archived': False,
                        'error': 'Could not load order details'
                    })
                except Exception as fallback_error:
                    logger.error(f"[v0] Even fallback order processing failed: {str(fallback_error)}")
        
        logger.info(f"[v0] Successfully processed {len(orders_data)} orders")
        
        return jsonify({
            'success': True,
            'data': {
                'orders': orders_data,
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"[v0] Unexpected error in get_user_orders: {str(e)}")
        logger.error(f"[v0] Error type: {type(e).__name__}")
        import traceback
        logger.error(f"[v0] Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'success': False,
            'error': 'Internal server error occurred while fetching orders',
            'details': str(e) if current_app.debug else None
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
        if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURNED]:
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
            logger.error("[v0] User not found in create_order")
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Handle JSON parsing errors
        try:
            data = request.get_json()
            logger.info(f"[v0] Order creation request data: {json.dumps(data, indent=2) if data else 'None'}")
        except Exception as e:
            logger.error(f"[v0] JSON parsing error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON format'
            }), 400
        
        if not data:
            logger.error("[v0] No data provided in request")
            return jsonify({
                'success': False,
                'error': 'No request data provided'
            }), 400
        
        required_fields = ['payment_method']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"[v0] Missing required fields: {missing_fields}")
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        logger.info(f"[v0] Creating order for user {user.id} with payment method: {data.get('payment_method')}")
        
        cart_items = CartItem.query.filter_by(user_id=user.id).all()
        request_items = data.get('items', [])
        
        logger.info(f"[v0] Found {len(cart_items)} cart items and {len(request_items)} request items")
        
        # If no cart items but items provided in request, use request items
        if not cart_items and request_items:
            logger.info("[v0] Processing items from request payload")
            # Process items from request payload
            order_items = []
            subtotal = 0.0
            
            for i, item_data in enumerate(request_items):
                logger.info(f"[v0] Processing item {i}: {item_data}")
                
                if 'product_id' not in item_data:
                    logger.error(f"[v0] Missing product_id in item {i}")
                    return jsonify({
                        'success': False,
                        'error': f'Missing product_id in item {i}'
                    }), 400
                
                product = Product.query.get(item_data['product_id'])
                if not product:
                    logger.error(f"[v0] Product {item_data['product_id']} not found")
                    return jsonify({
                        'success': False,
                        'error': f'Product {item_data["product_id"]} not found'
                    }), 404
                
                if not product.is_active:
                    logger.error(f"[v0] Product {product.name} is not active")
                    return jsonify({
                        'success': False,
                        'error': f'Product {product.name} is not available'
                    }), 400
                
                quantity = item_data.get('quantity', 1)
                price = float(item_data.get('price', product.sale_price or product.price))
                
                logger.info(f"[v0] Item details - Product: {product.name}, Quantity: {quantity}, Price: {price}")
                
                # Check inventory
                inventory = Inventory.query.filter_by(
                    product_id=product.id,
                    variant_id=item_data.get('variant_id')
                ).first()
                
                if inventory and inventory.available_quantity < quantity:
                    logger.error(f"[v0] Insufficient stock for {product.name}. Available: {inventory.available_quantity}, Requested: {quantity}")
                    return jsonify({
                        'success': False,
                        'error': f'Insufficient stock for {product.name}. Available: {inventory.available_quantity}'
                    }), 400
                
                item_total = price * quantity
                subtotal += item_total
                
                order_items.append({
                    'product_id': product.id,
                    'variant_id': item_data.get('variant_id'),
                    'quantity': quantity,
                    'price': price,
                    'total': item_total
                })
        
        elif cart_items:
            logger.info("[v0] Processing items from user cart")
            # Process items from cart (existing logic)
            subtotal = 0.0
            order_items = []
            
            for cart_item in cart_items:
                product = Product.query.get(cart_item.product_id)
                if not product:
                    logger.error(f"[v0] Cart product {cart_item.product_id} not found")
                    return jsonify({
                        'success': False,
                        'error': f'Product {cart_item.product_id} not found'
                    }), 404
                
                if not product.is_active:
                    logger.error(f"[v0] Cart product {product.name} is not active")
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
                    logger.error(f"[v0] Insufficient cart stock for {product.name}. Available: {inventory.available_quantity}, Requested: {quantity}")
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
        else:
            logger.error("[v0] No cart items and no request items provided")
            return jsonify({
                'success': False,
                'error': 'Cart is empty and no items provided'
            }), 400
        
        logger.info(f"[v0] Order items processed successfully. Subtotal: {subtotal}")
        
        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0.0
        if coupon_code:
            discount, coupon_error = validate_coupon(coupon_code, subtotal)
            if coupon_error:
                logger.error(f"[v0] Coupon validation error: {coupon_error}")
                return jsonify({
                    'success': False,
                    'error': coupon_error
                }), 400
        
        cart_totals = data.get('cart_totals')
        if cart_totals and isinstance(cart_totals, dict):
            try:
                # Use totals calculated by frontend to ensure consistency
                subtotal = float(cart_totals.get('subtotal', subtotal))
                shipping_cost = float(cart_totals.get('shipping', 0.0))
                tax = float(cart_totals.get('tax', 0.0))
                total_amount = float(cart_totals.get('total', subtotal + shipping_cost + tax - discount))
                
                logger.info(f"[v0] Using frontend cart totals - Subtotal: {subtotal}, Tax: {tax}, Shipping: {shipping_cost}, Total: {total_amount}")
            except (ValueError, TypeError) as e:
                logger.error(f"[v0] Error parsing cart_totals: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid cart totals format'
                }), 400
        else:
            # Fallback to backend calculation if no cart totals provided
            try:
                shipping_cost = float(data.get('shipping_cost', 0.0))
                tax = float(data.get('tax', 0.0))
                total_amount = subtotal + shipping_cost + tax - discount
                
                logger.info(f"[v0] Using backend calculated totals - Subtotal: {subtotal}, Tax: {tax}, Shipping: {shipping_cost}, Total: {total_amount}")
            except (ValueError, TypeError) as e:
                logger.error(f"[v0] Error calculating totals: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid numeric values in order data'
                }), 400

        # Validate shipping address
        shipping_address = data.get('shipping_address')
        if not shipping_address:
            logger.error("[v0] Shipping address is required but not provided")
            return jsonify({
                'success': False,
                'error': 'Shipping address is required'
            }), 400
        
        if isinstance(shipping_address, dict):
            required_address_fields = ['first_name', 'last_name', 'address_line1', 'city', 'phone']
            missing_address_fields = [field for field in required_address_fields if not shipping_address.get(field)]
            if missing_address_fields:
                logger.error(f"[v0] Missing address fields: {missing_address_fields}")
                return jsonify({
                    'success': False,
                    'error': f'Missing required address fields: {", ".join(missing_address_fields)}'
                }), 400
        
        logger.info(f"[v0] Shipping address validated: {type(shipping_address)}")
        
        order_number = generate_order_number()
        logger.info(f"[v0] Generated order number: {order_number}")
        
        try:
            payment_method = data['payment_method'].lower().strip()
            
            # Validate payment method
            valid_payment_methods = ['pesapal', 'cash_on_delivery', 'cod', 'mpesa']
            if payment_method not in valid_payment_methods:
                logger.error(f"[v0] Invalid payment method: {payment_method}")
                return jsonify({
                    'success': False,
                    'error': f'Invalid payment method. Must be one of: {", ".join(valid_payment_methods)}'
                }), 400
            
            # Normalize payment method
            if payment_method in ['cod', 'cash_on_delivery']:
                payment_method = 'cash_on_delivery'
            
            if payment_method == 'cash_on_delivery':
                order_status = OrderStatus.PENDING
                payment_status = PaymentStatus.PENDING
            else:
                order_status = OrderStatus.PENDING
                payment_status = PaymentStatus.PENDING
                
            logger.info(f"[v0] Set order status: {order_status}, payment status: {payment_status}")
                
        except (ValueError, AttributeError, KeyError) as e:
            logger.error(f"[v0] Error setting order status enums: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Invalid payment method or order status configuration'
            }), 400
        
        try:
            # Create order - let database auto-generate integer ID
            order = Order(
                user_id=user.id,
                order_number=order_number,
                status=order_status,
                total_amount=total_amount,
                subtotal=subtotal,
                tax_amount=tax,
                shipping_address=shipping_address,
                billing_address=data.get('billing_address', shipping_address),
                payment_method=payment_method,
                payment_status=payment_status,
                shipping_method=data.get('shipping_method', 'standard'),
                shipping_cost=shipping_cost,
                notes=data.get('notes', '')
            )

            logger.info(f"[v0] Created order object with total_amount: {total_amount}, subtotal: {subtotal}, tax: {tax}, shipping: {shipping_cost}")

            db.session.add(order)
            db.session.flush()  # Flush to get the order ID before creating items
            
            logger.info(f"[v0] Order flushed to database with ID: {order.id}")
            
        except Exception as e:
            logger.error(f"[v0] Error creating order object: {str(e)}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to create order in database'
            }), 500
        
        # Create order items
        try:
            for i, item_data in enumerate(order_items):
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item_data['product_id'],
                    variant_id=item_data['variant_id'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    total=item_data['total']
                )
                db.session.add(order_item)
                logger.info(f"[v0] Added order item {i}: Product {item_data['product_id']}, Quantity {item_data['quantity']}")
        except Exception as e:
            logger.error(f"[v0] Error creating order items: {str(e)}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to create order items'
            }), 500
        
        # Update coupon usage
        if coupon_code and discount > 0:
            try:
                coupon = Coupon.query.filter_by(code=coupon_code).first()
                if coupon:
                    coupon.used_count += 1
                    logger.info(f"[v0] Updated coupon usage for {coupon_code}")
            except Exception as e:
                logger.warning(f"[v0] Could not update coupon usage: {str(e)}")
        
        try:
            # Update inventory
            update_inventory_on_order(order_items)
            logger.info("[v0] Inventory updated successfully")
        except Exception as e:
            logger.warning(f"[v0] Could not update inventory: {str(e)}")
            # Continue without inventory update - don't fail the order
        
        # Clear user's cart if specified and we used cart items
        if data.get('clear_cart', True) and cart_items:
            try:
                CartItem.query.filter_by(user_id=user.id).delete()
                logger.info("[v0] User cart cleared")
            except Exception as e:
                logger.warning(f"[v0] Could not clear cart: {str(e)}")
                # Continue without clearing cart - don't fail the order
        
        # DO NOT send confirmation email here - it will be sent from Pesapal callback after payment is confirmed
        logger.info(f"[v0] Order {order_number} created successfully. Email will be sent after payment confirmation.")
        
        try:
            db.session.commit()
            logger.info(f"[v0] Order {order_number} committed to database successfully")
        except Exception as e:
            logger.error(f"[v0] Database commit failed: {str(e)}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to save order to database'
            }), 500
        
        try:
            order_data = order.to_dict()
            order_data['items'] = [item.to_dict() for item in order.items]
            
            return jsonify({
                'success': True,
                'message': 'Order created successfully',
                'data': order_data
            }), 201
        except Exception as e:
            logger.error(f"[v0] Error formatting order response: {str(e)}")
            # Return minimal response if formatting fails
            return jsonify({
                'success': True,
                'message': 'Order created successfully',
                'data': {
                    'id': order.id,
                    'order_number': order.order_number,
                    'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                    'total_amount': order.total_amount
                }
            }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"[v0] Database error creating order: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Database error occurred while creating order'
        }), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"[v0] Unexpected error creating order: {str(e)}")
        logger.error(f"[v0] Error type: {type(e).__name__}")
        import traceback
        logger.error(f"[v0] Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'success': False,
            'error': 'Internal server error occurred while creating order'
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


@order_routes.route('/<int:order_id>/return', methods=['POST'])
@jwt_required()
def return_order(order_id):
    """Return user's order."""
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
        
        # Only delivered orders can be returned
        if order.status != OrderStatus.DELIVERED:
            return jsonify({
                'success': False,
                'error': f'Cannot return order with status: {order.status.value}. Only delivered orders can be returned.'
            }), 400
        
        # Get return reason from request
        data = request.get_json() or {}
        return_reason = data.get('reason', 'No reason provided')
        
        # Update order status to RETURNED
        order.status = OrderStatus.RETURNED
        
        # Add return reason to notes
        if order.notes:
            order.notes += f"\n\nReturn Reason: {return_reason}"
        else:
            order.notes = f"Return Reason: {return_reason}"
        
        # Restore inventory
        restore_inventory_on_cancel(order)
        
        db.session.commit()
        
        logger.info(f"Order {order_id} returned successfully by user {user.id}. Reason: {return_reason}")
        
        return jsonify({
            'success': True,
            'message': 'Order return request submitted successfully',
            'data': {
                'order': order.to_dict(),
                'return_reason': return_reason
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error returning order {order_id}: {str(e)}")
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
        if order.status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURNED]:
            timeline.append({
                'status': 'processing',
                'title': 'Processing',
                'description': 'Your order is being prepared for shipment',
                'timestamp': order.updated_at.isoformat(),
                'completed': True
            })
        
        # Shipped
        if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURNED]:
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

        # Returned
        if order.status == OrderStatus.RETURNED:
            timeline.append({
                'status': 'returned',
                'title': 'Returned',
                'description': 'Your order has been returned',
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
            'current_status': order.status.value,  # Convert enum to string
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
        
        status_counts = {}
        # Include RETURNED and RETURN_REQUESTED in status counts
        for status in [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED]:
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
            'POST /api/orders/<id>/return',
            'GET /api/orders/<id>/track',
            'GET /api/orders/stats',
            'GET /api/orders/search'
        ]
    }), 200


# OPTIONS handlers for CORS
@order_routes.route('', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>/cancel', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>/return', methods=['OPTIONS'])
@order_routes.route('/<int:order_id>/track', methods=['OPTIONS'])
@order_routes.route('/stats', methods=['OPTIONS'])
@order_routes.route('/search', methods=['OPTIONS'])
@order_routes.route('/health', methods=['OPTIONS'])
def handle_options():
    """Handle OPTIONS requests for CORS."""
    return '', 200
