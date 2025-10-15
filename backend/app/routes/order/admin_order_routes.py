"""
Complete Admin Order Routes for Mizizzi E-commerce platform.
Handles comprehensive admin-only order operations with advanced features.
"""
# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
import csv
import io
from datetime import datetime, timedelta, UTC
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, url_for, redirect, send_file
from flask_cors import cross_origin
from flask_jwt_extended import (
   jwt_required, get_jwt_identity, get_jwt
)

# Database & ORM
from sqlalchemy import or_, desc, func, and_, extract
from ...configuration.extensions import db, ma, mail, cache, cors

# Models
from ...models.models import (
   User, UserRole, Product, ProductVariant, Review,
   CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
   OrderStatus, PaymentStatus, CouponType, Address, Category,
   AdminActivityLog
)

# Schemas
from ...schemas.schemas import (
   product_schema, review_schema, reviews_schema, cart_item_schema,
   order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
   coupon_schema, payment_schema, payments_schema
)

# Validations & Decorators
from ...validations.validation import (
   validate_order_creation, validate_order_status_update,
   validate_payment_creation, validate_mpesa_payment,
   validate_review_creation, validate_review_update,
   admin_required
)

# HTTP Requests
import requests

# Flask Mail
from flask_mail import Message

from ...websocket import broadcast_to_user, broadcast_to_admins

# Import shared email functions
from .order_email_templates import (
   send_order_confirmation_email,
   send_order_status_update_email
)

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint for admin order routes
admin_order_routes = Blueprint('admin_order_routes', __name__)

# Enhanced Order Status Management
ALLOWED_STATUS_TRANSITIONS = {
   OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
   OrderStatus.CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
   OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
   OrderStatus.SHIPPED: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
   OrderStatus.DELIVERED: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
   OrderStatus.CANCELLED: [OrderStatus.PENDING],  # Allow reopening to pending
   OrderStatus.RETURNED: [OrderStatus.PENDING, OrderStatus.CONFIRMED], # Allow reopening to pending or confirmed
   OrderStatus.REFUNDED: []  # Final state
}

# Admin Permission Levels
class AdminPermission:
   VIEW_ORDERS = "view_orders"
   EDIT_ORDERS = "edit_orders"
   CANCEL_ORDERS = "cancel_orders"
   REFUND_ORDERS = "refund_orders"
   DELETE_ORDERS = "delete_orders"
   BULK_OPERATIONS = "bulk_operations"
   EXPORT_DATA = "export_data"
   MANAGE_PAYMENTS = "manage_payments"

# Super admin permissions (can do everything)
SUPER_ADMIN_PERMISSIONS = [
   AdminPermission.VIEW_ORDERS,
   AdminPermission.EDIT_ORDERS,
   AdminPermission.CANCEL_ORDERS,
   AdminPermission.REFUND_ORDERS,
   AdminPermission.DELETE_ORDERS,
   AdminPermission.BULK_OPERATIONS,
   AdminPermission.EXPORT_DATA,
   AdminPermission.MANAGE_PAYMENTS
]

# Regular admin permissions (limited)
REGULAR_ADMIN_PERMISSIONS = [
   AdminPermission.VIEW_ORDERS,
   AdminPermission.EDIT_ORDERS,
   AdminPermission.CANCEL_ORDERS,
   AdminPermission.BULK_OPERATIONS,
   AdminPermission.EXPORT_DATA
]

# Helper Functions
def get_pagination_params():
   """Get pagination parameters from request."""
   page = request.args.get('page', 1, type=int)
   per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 items per page
   return page, per_page

def require_admin():
   """Decorator to ensure user is admin."""
   def decorator(f):
       @wraps(f)
       def decorated_function(*args, **kwargs):
           try:
               current_user_id = get_jwt_identity()
               if not current_user_id:
                   return jsonify({"error": "Authentication required"}), 401

               user = User.query.get(current_user_id)
               if not user:
                   return jsonify({"error": "User not found"}), 404

               if user.role != UserRole.ADMIN:
                   return jsonify({"error": "Admin access required"}), 403

               return f(*args, **kwargs)
           except Exception as e:
               logger.error(f"Admin authentication error: {str(e)}")
               return jsonify({"error": "Authentication failed"}), 401
       return decorated_function
   return decorator

def require_super_admin():
   """Decorator to ensure user is super admin."""
   def decorator(f):
       @wraps(f)
       def decorated_function(*args, **kwargs):
           try:
               current_user_id = get_jwt_identity()
               if not current_user_id:
                   return jsonify({"error": "Authentication required"}), 401

               user = User.query.get(current_user_id)
               if not user:
                   return jsonify({"error": "User not found"}), 404

               if user.role != UserRole.ADMIN:
                   return jsonify({"error": "Admin access required"}), 403

               # Check if super admin (admin@mizizzi.com)
               if user.email != 'admin@mizizzi.com':
                   return jsonify({"error": "Super admin access required"}), 403

               return f(*args, **kwargs)
           except Exception as e:
               logger.error(f"Super admin authentication error: {str(e)}")
               return jsonify({"error": "Authentication failed"}), 401
       return decorated_function
   return decorator

def log_admin_activity(admin_id, action, details=None):
   """Log admin activity for audit trail."""
   try:
       activity_log = AdminActivityLog(
           admin_id=admin_id,
           action=action,
           details=details or '',
           ip_address=request.remote_addr,
           user_agent=request.headers.get('User-Agent', ''),
           endpoint=request.endpoint,
           method=request.method,
           status_code=200
       )
       db.session.add(activity_log)

       # Always flush to make the log visible in the current transaction
       db.session.flush()

       # Only commit in non-testing environments to allow pytest fixtures to manage transactions
       if not current_app.testing:
           db.session.commit()
   except Exception as e:
       logger.error(f"Failed to log admin activity: {str(e)}")

def send_webhook_notification(event_type, order_id, data):
    """Send webhook notification for order events."""
    try:
        webhook_url = current_app.config.get('WEBHOOK_URL')
        if webhook_url:
            payload = {
                'event': event_type,
                'data': data,
                'order_id': order_id,
                'timestamp': datetime.now(UTC).isoformat()
            }
            
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "MIZIZZI-Webhook/1.0"
            }
            
            try:
                import requests
                response = requests.post(webhook_url, json=payload, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    logger.info(f"Webhook notification sent successfully: {event_type} for order {order_id}")
                    return True
                else:
                    logger.warning(f"Webhook notification failed with status {response.status_code}: {event_type} for order {order_id}")
                    return False
            except Exception as req_error:
                logger.error(f"Failed to send webhook request: {str(req_error)}")
                return False
        else:
            # Webhooks are optional, so only log at debug level
            logger.debug("WEBHOOK_URL not configured. Skipping webhook notification.")
        return False
    except Exception as e:
        logger.error(f"Failed to send webhook: {str(e)}")
        return False

def validate_status_transition(current_status, new_status):
   """Validate if status transition is allowed."""
   try:
       current_enum = OrderStatus(current_status) if isinstance(current_status, str) else current_status
       new_enum = OrderStatus(new_status) if isinstance(new_status, str) else new_status

       allowed_transitions = ALLOWED_STATUS_TRANSITIONS.get(current_enum, [])
       return new_enum in allowed_transitions
   except (ValueError, KeyError):
       return False

def format_order_response(order, include_items=False, include_user=True, include_history=False, include_attachments=False):
   """Format order data for API response."""
   try:
       # Get user info if requested
       user_info = None
       if include_user:
           user = User.query.get(order.user_id)
           if user:
               user_info = {
                   'id': user.id,
                   'email': user.email,
                   'name': getattr(user, 'name', None),
                   'phone': getattr(user, 'phone', None)
               }

       # Parse addresses safely
       shipping_address = None
       billing_address = None

       try:
           if order.shipping_address:
               if isinstance(order.shipping_address, str):
                   shipping_address = json.loads(order.shipping_address)
               else:
                   shipping_address = order.shipping_address
       except (json.JSONDecodeError, TypeError):
           logger.warning(f"Could not parse shipping address for order {order.id}")

       try:
           if order.billing_address:
               if isinstance(order.billing_address, str):
                   billing_address = json.loads(order.billing_address)
               else:
                   billing_address = order.billing_address
       except (json.JSONDecodeError, TypeError):
           logger.warning(f"Could not parse billing address for order {order.id}")

       order_dict = {
           'id': order.id,
           'user_id': order.user_id,
           'user': user_info,
           'order_number': order.order_number,
           'status': order.status.value,
           'payment_status': order.payment_status.value if order.payment_status else None,
           'total_amount': float(order.total_amount),
           'subtotal': float(getattr(order, 'subtotal', 0) or 0),
           'tax_amount': float(getattr(order, 'tax_amount', 0) or 0),
           'shipping_cost': float(order.shipping_cost) if order.shipping_cost else 0,
           'payment_method': order.payment_method,
           'shipping_method': order.shipping_method,
           'tracking_number': order.tracking_number,
           'notes': order.notes,
           'shipping_address': shipping_address,
           'billing_address': billing_address,
           'created_at': order.created_at.isoformat(),
           'updated_at': order.updated_at.isoformat(),
           'items_count': len(order.items),
           'can_cancel': order.status in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
           'can_refund': order.status in [OrderStatus.DELIVERED, OrderStatus.RETURNED],
           'can_return': order.status == OrderStatus.DELIVERED,
           'can_reopen': order.status in [OrderStatus.CANCELLED, OrderStatus.RETURNED],
           'can_edit_items': order.status in [OrderStatus.PENDING, OrderStatus.CONFIRMED],
           'allowed_transitions': [status.value for status in ALLOWED_STATUS_TRANSITIONS.get(order.status, [])],
           'is_archived': getattr(order, 'is_archived', False),
           'archived_at': getattr(order, 'archived_at', None),
           'items': [],
           'status_history': [],
           'attachments': []
       }

       # Include order items if requested
       if include_items:
           for item in order.items:
               item_dict = {
                   'id': item.id,
                   'product_id': item.product_id,
                   'variant_id': item.variant_id,
                   'quantity': item.quantity,
                   'price': float(item.price),
                   'total': float(item.total),
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
                       'thumbnail_url': product.thumbnail_url,
                       'sku': getattr(product, 'sku', None)
                   }

               # Add variant details if applicable
               if item.variant_id:
                   variant = ProductVariant.query.get(item.variant_id)
                   if variant:
                       item_dict['variant'] = {
                           'id': variant.id,
                           'color': variant.color,
                           'size': variant.size,
                           'sku': getattr(variant, 'sku', None)
                       }

               order_dict['items'].append(item_dict)

       return order_dict
   except Exception as e:
       logger.error(f"Error formatting order response: {str(e)}")
       return None

def get_allowed_status_transitions(current_status):
   """Get allowed status transitions for current status."""
   transitions = {
       OrderStatus.PENDING: ['confirmed', 'cancelled'],
       OrderStatus.CONFIRMED: ['processing', 'cancelled'],
       OrderStatus.PROCESSING: ['shipped', 'cancelled'],
       OrderStatus.SHIPPED: ['delivered', 'returned'],
       OrderStatus.DELIVERED: ['returned'],
       OrderStatus.CANCELLED: [],
       OrderStatus.RETURNED: [],
       OrderStatus.REFUNDED: []
   }
   return [status.value for status in ALLOWED_STATUS_TRANSITIONS.get(current_status, [])]

# ----------------------
# ADMIN Order Routes
# ----------------------

@admin_order_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def get_all_orders():
   """Get all orders with advanced filtering and pagination (Admin only)."""
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
       user_id = request.args.get('user_id', type=int)
       include_items = request.args.get('include_items', 'false').lower() == 'true'
       include_history = request.args.get('include_history', 'false').lower() == 'true'
       include_archived = request.args.get('include_archived', 'false').lower() == 'true'
       search = request.args.get('search', '').strip()
       date_from = request.args.get('date_from')
       date_to = request.args.get('date_to')
       payment_method = request.args.get('payment_method')
       payment_status = request.args.get('payment_status')
       min_amount = request.args.get('min_amount', type=float)
       max_amount = request.args.get('max_amount', type=float)
       sort_by = request.args.get('sort_by', 'created_at')
       sort_order = request.args.get('sort_order', 'desc')
       fulfillment_status = request.args.get('fulfillment_status')
       shipping_status = request.args.get('shipping_status')
       tags = request.args.get('tags', '').split(',') if request.args.get('tags') else []

       # Build query
       query = Order.query

       # Filter archived orders
       if not include_archived:
           query = query.filter(or_(Order.is_archived.is_(None), Order.is_archived == False))

       # Apply filters
       if status:
           try:
               order_status = OrderStatus(status)
               query = query.filter(Order.status == order_status)
           except ValueError:
               return jsonify({"error": f"Invalid status: {status}"}), 400

       if user_id:
           query = query.filter(Order.user_id == user_id)

       if search:
           # Enhanced search across multiple fields
           search_filter = or_(
               Order.order_number.ilike(f'%{search}%'),
               Order.notes.ilike(f'%{search}%'),
               Order.tracking_number.ilike(f'%{search}%')
           )

           # Search in user email/name
           user_subquery = db.session.query(User.id).filter(
               or_(
                   User.email.ilike(f'%{search}%'),
                   User.name.ilike(f'%{search}%')
               )
           ).subquery()

           search_filter = or_(
               search_filter,
               Order.user_id.in_(user_subquery)
           )

           query = query.filter(search_filter)

       if date_from:
           try:
               date_from_obj = datetime.fromisoformat(date_from) # Removed .replace('Z', '+00:00')
               query = query.filter(Order.created_at >= date_from_obj)
           except ValueError:
               logger.warning(f"Invalid date_from format: {date_from}. Filtering ignored.")
               # Return 200 and ignore invalid date filter as it might be an optional param
               pass # Continue without filtering if date is malformed

       if date_to:
           try:
               date_to_obj = datetime.fromisoformat(date_to) # Removed .replace('Z', '+00:00')
               query = query.filter(Order.created_at <= date_to_obj)
           except ValueError:
               logger.warning(f"Invalid date_to format: {date_to}. Filtering ignored.")
               pass # Continue without filtering if date is malformed

       if payment_method:
           query = query.filter(Order.payment_method == payment_method)

       if payment_status:
           try:
               payment_status_enum = PaymentStatus(payment_status)
               query = query.filter(Order.payment_status == payment_status_enum)
           except ValueError:
               return jsonify({"error": f"Invalid payment_status: {payment_status}"}), 400

       if min_amount is not None:
           query = query.filter(Order.total_amount >= min_amount)

       if max_amount is not None:
           query = query.filter(Order.total_amount <= max_amount)

       if fulfillment_status:
           # Filter by fulfillment status
           if fulfillment_status == 'unfulfilled':
               query = query.filter(Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED]))
           elif fulfillment_status == 'partially_fulfilled':
               query = query.filter(Order.status == OrderStatus.PROCESSING)
           elif fulfillment_status == 'fulfilled':
               query = query.filter(Order.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED]))

       if shipping_status:
           # Filter by shipping status
           if shipping_status == 'not_shipped':
               query = query.filter(Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]))
           elif shipping_status == 'shipped':
               query = query.filter(Order.status == OrderStatus.SHIPPED)
           elif shipping_status == 'delivered':
               query = query.filter(Order.status == OrderStatus.DELIVERED)

       # Apply sorting
       if sort_by == 'created_at':
           order_column = Order.created_at
       elif sort_by == 'updated_at':
           order_column = Order.updated_at
       elif sort_by == 'total_amount':
           order_column = Order.total_amount
       elif sort_by == 'status':
           order_column = Order.status
       elif sort_by == 'order_number':
           order_column = Order.order_number
       else:
           order_column = Order.created_at

       if sort_order.lower() == 'desc':
           query = query.order_by(desc(order_column))
       else:
           query = query.order_by(order_column)

       # Paginate results
       paginated = query.paginate(page=page, per_page=per_page, error_out=False)

       # Format response
       orders = []
       for order in paginated.items:
           order_dict = format_order_response(
               order,
               include_items=include_items,
               include_history=include_history
           )
           if order_dict:
               orders.append(order_dict)

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'VIEW_ORDERS',
           f'Viewed orders page {page} with filters: status={status}, search={search}'
       )

       return jsonify({
           "items": orders,
           "pagination": {
               "page": paginated.page,
               "per_page": paginated.per_page,
               "total_pages": paginated.pages,
               "total_items": paginated.total,
               "has_next": paginated.has_next,
               "has_prev": paginated.has_prev
           },
           "filters_applied": {
               "status": status,
               "user_id": user_id,
               "search": search,
               "date_from": date_from,
               "date_to": date_to,
               "payment_method": payment_method,
               "payment_status": payment_status,
               "min_amount": min_amount,
               "max_amount": max_amount,
               "fulfillment_status": fulfillment_status,
               "shipping_status": shipping_status,
               "include_archived": include_archived
           }
       }), 200

   except Exception as e:
       logger.error(f"Get all orders error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def get_any_order(order_id):
   """Get any order by ID with full details (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       order_dict = format_order_response(
           order,
           include_items=True,
           include_user=True,
           include_history=True,
           include_attachments=True
       )
       if not order_dict:
           return jsonify({"error": "Failed to format order data"}), 500

       # Add payment information if available
       payments = Payment.query.filter_by(order_id=order_id).all()
       order_dict['payments'] = []
       for payment in payments:
           order_dict['payments'].append({
               'id': payment.id,
               'amount': float(payment.amount),
               'status': payment.status.value if payment.status else None,
               'payment_method': getattr(payment, 'payment_method', payment.payment_method if hasattr(payment, 'payment_method') else None),
               'transaction_id': payment.transaction_id,
               'created_at': payment.created_at.isoformat() if payment.created_at else None
           })

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'VIEW_ORDER_DETAILS',
           f'Viewed order details for order_id:{order_id}'
       )

       return jsonify(order_dict), 200

   except Exception as e:
       logger.error(f"Get order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/items', methods=['POST', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def manage_order_items(order_id):
   """Add, edit, or remove items from an order (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Check if order can be edited
       if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
           return jsonify({
               "error": f"Cannot edit items for order with status: {order.status.value}"
           }), 400

       data = request.get_json()

       if request.method == 'POST':
           # Add new item to order
           if not data or 'product_id' not in data or 'quantity' not in data:
               return jsonify({"error": "product_id and quantity are required"}), 400

           product_id = data['product_id']
           variant_id = data.get('variant_id')
           quantity = data['quantity']
           custom_price = data.get('price')

           # Validate product exists
           product = db.session.get(Product, product_id)
           if not product:
               return jsonify({"error": "Product not found"}), 404

           # Get price
           if custom_price:
               price = float(custom_price)
           else:
               if variant_id:
                   variant = ProductVariant.query.get(variant_id)
                   price = float(variant.price) if variant else float(product.price)
               else:
                   price = float(product.price)

           # Create new order item
           new_item = OrderItem(
               order_id=order_id,
               product_id=product_id,
               variant_id=variant_id,
               quantity=quantity,
               price=price,
               total=price * quantity
           )

           db.session.add(new_item)

           # Update order total
           order.total_amount += new_item.total
           order.updated_at = datetime.now(UTC)

           db.session.commit()

           # Log admin activity
           log_admin_activity(
               current_user_id,
               'ADD_ORDER_ITEM',
               f'Added item (product_id:{product_id}, qty:{quantity}) to order_id:{order_id}'
           )

           return jsonify({
               "message": "Item added successfully",
               "item": {
                   'id': new_item.id,
                   'product_id': new_item.product_id,
                   'variant_id': new_item.variant_id,
                   'quantity': new_item.quantity,
                   'price': float(new_item.price),
                   'total': float(new_item.total)
               },
               "new_order_total": float(order.total_amount)
           }), 200

       elif request.method == 'PUT':
           # Update existing item
           if not data or 'item_id' not in data:
               return jsonify({"error": "item_id is required"}), 400

           item_id = data['item_id']
           item = OrderItem.query.filter_by(id=item_id, order_id=order_id).first()

           if not item:
               return jsonify({"error": "Order item not found"}), 404

           old_total = item.total

           # Update quantity if provided
           if 'quantity' in data:
               item.quantity = data['quantity']

           # Update price if provided
           if 'price' in data:
               item.price = float(data['price'])

           # Recalculate total
           item.total = item.price * item.quantity

           # Update order total
           order.total_amount = order.total_amount - old_total + item.total
           order.updated_at = datetime.now(UTC)

           db.session.commit()

           # Log admin activity
           log_admin_activity(
               current_user_id,
               'UPDATE_ORDER_ITEM',
               f'Updated item {item_id} in order_id:{order_id}. Old total: {old_total}, New total: {item.total}'
           )

           return jsonify({
               "message": "Item updated successfully",
               "item": {
                   'id': item.id,
                   'product_id': item.product_id,
                   'variant_id': item.variant_id,
                   'quantity': item.quantity,
                   'price': float(item.price),
                   'total': float(item.total)
               },
               "new_order_total": float(order.total_amount)
           }), 200

       elif request.method == 'DELETE':
           # Remove item from order
           if not data or 'item_id' not in data:
               return jsonify({"error": "item_id is required"}), 400

           item_id = data['item_id']
           item = OrderItem.query.filter_by(id=item_id, order_id=order_id).first()

           if not item:
               return jsonify({"error": "Order item not found"}), 404

           # Update order total
           order.total_amount -= item.total
           order.updated_at = datetime.now(UTC)

           # Remove item
           db.session.delete(item)
           db.session.commit()

           # Log admin activity
           log_admin_activity(
               current_user_id,
               'REMOVE_ORDER_ITEM',
               f'Removed item {item_id} (total: {item.total}) from order_id:{order_id}'
           )

           return jsonify({
               "message": "Item removed successfully",
               "removed_item_total": float(item.total),
               "new_order_total": float(order.total_amount)
           }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Manage order items error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to manage order items", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/payment/manual', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_super_admin()
def mark_payment_manually(order_id):
   """Manually mark order payment status (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json()

       if not data or 'payment_status' not in data:
           return jsonify({"error": "payment_status is required"}), 400

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       try:
           new_payment_status = PaymentStatus(data['payment_status'])
       except ValueError:
           return jsonify({"error": "Invalid payment status"}), 400

       old_payment_status = order.payment_status
       order.payment_status = new_payment_status
       order.updated_at = datetime.now(UTC)

       # Add note about manual payment update
       payment_method = data.get('payment_method', 'manual')
       transaction_id = data.get('transaction_id', f"MANUAL-{order.order_number}-{int(datetime.now(UTC).timestamp())}")
       amount = data.get('amount', order.total_amount)
       notes = data.get('notes', '')

       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       payment_note = f"[{timestamp}] {admin_name}: Payment manually marked as {new_payment_status.value}"
       if notes:
           payment_note += f" - Notes: {notes}"

       if order.notes:
           order.notes += f"\n{payment_note}"
       else:
           order.notes = payment_note

       # Create payment record if marking as paid
       if new_payment_status == PaymentStatus.PAID:
           payment_record = Payment(
               order_id=order_id,
               amount=float(amount),
               payment_method=payment_method,
               transaction_id=transaction_id,
               status=PaymentStatus.COMPLETED,
               created_at=datetime.now(UTC),
               completed_at=datetime.now(UTC)
           )
           db.session.add(payment_record)

       db.session.commit()

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'MANUAL_PAYMENT_UPDATE',
           f'Manually updated payment status for order_id:{order_id} from {old_payment_status.value if old_payment_status else "None"} to {new_payment_status.value}'
       )

       return jsonify({
           "message": "Payment status updated manually",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'old_payment_status': old_payment_status.value if old_payment_status else None,
               'new_payment_status': new_payment_status.value,
               'transaction_id': transaction_id,
               'updated_at': order.updated_at.isoformat()
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Manual payment update error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to update payment status", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/reopen', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def reopen_order(order_id):
   """Reopen a cancelled or returned order (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json() or {}

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Check if order can be reopened
       if order.status not in [OrderStatus.CANCELLED, OrderStatus.RETURNED]:
           return jsonify({
               "error": f"Order cannot be reopened. Current status: {order.status.value}"
           }), 400

       # Get reopen reason and new status
       reopen_reason = data.get('reason', 'Reopened by admin')
       new_status = data.get('new_status', 'pending')

       # Fix the status validation - convert to uppercase and handle the enum properly
       try:
           # Assuming OrderStatus enum values are defined in lowercase strings (e.g., PENDING = 'pending')
           new_status_enum = OrderStatus(new_status.lower())
       except ValueError:
           return jsonify({"error": f"Invalid new status: {new_status}"}), 400

       old_status = order.status
       order.status = new_status_enum
       order.updated_at = datetime.now(UTC)

       # Add reopen note
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       reopen_note = f"[{timestamp}] {admin_name}: Order reopened from {old_status.value} to {new_status_enum.value}. Reason: {reopen_reason}"

       if order.notes:
           order.notes += f"\n{reopen_note}"
       else:
           order.notes = reopen_note

       db.session.commit()

       # Send webhook notification
       send_webhook_notification('order.reopened', order_id, {
           'old_status': old_status.value,
           'new_status': new_status_enum.value,
           'reason': reopen_reason
       })

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'REOPEN_ORDER',
           f'Reopened order_id:{order_id} from {old_status.value} to {new_status_enum.value}. Reason: {reopen_reason}'
       )

       return jsonify({
           "message": "Order reopened successfully",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'old_status': old_status.value,
               'new_status': order.status.value,
               'reopen_reason': reopen_reason,
               'updated_at': order.updated_at.isoformat()
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Reopen order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to reopen order", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/archive', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def archive_order(order_id):
   """Archive an order (soft delete) (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json() or {}

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       archive_reason = data.get('reason', 'Archived by admin')

       # Add archive fields to order (these would need to be added to the Order model)
       order.is_archived = True
       order.archived_at = datetime.now(UTC)
       order.updated_at = datetime.now(UTC)

       # Add archive note
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       archive_note = f"[{timestamp}] {admin_name}: Order archived. Reason: {archive_reason}"

       if order.notes:
           order.notes += f"\n{archive_note}"
       else:
           order.notes = archive_note

       db.session.commit()

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'ARCHIVE_ORDER',
           f'Archived order_id:{order_id}. Reason: {archive_reason}'
       )

       return jsonify({
           "message": "Order archived successfully",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'archived_at': order.archived_at.isoformat(),
               'archive_reason': archive_reason
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Archive order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to archive order", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/unarchive', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def unarchive_order(order_id):
   """Unarchive an order (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       if not getattr(order, 'is_archived', False):
           return jsonify({"error": "Order is not archived"}), 400

       # Remove archive status
       order.is_archived = False
       order.archived_at = None
       order.updated_at = datetime.now(UTC)

       # Add unarchive note
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       unarchive_note = f"[{timestamp}] {admin_name}: Order unarchived"

       if order.notes:
           order.notes += f"\n{unarchive_note}"
       else:
           order.notes = unarchive_note

       db.session.commit()

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'UNARCHIVE_ORDER',
           f'Unarchived order_id:{order_id}'
       )

       return jsonify({
           "message": "Order unarchived successfully",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'is_archived': False,
               'updated_at': order.updated_at.isoformat()
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Unarchive order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to unarchive order", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/delete', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_super_admin()
def delete_order(order_id):
   """Permanently delete an order (Super Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json() or {}

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Additional confirmation required for deletion
       confirmation = data.get('confirm_delete', False)
       if not confirmation:
           return jsonify({
               "error": "Deletion requires explicit confirmation. Set 'confirm_delete': true"
           }), 400

       deletion_reason = data.get('reason', 'Deleted by admin')
       order_number = order.order_number

       # Log admin activity before deletion
       log_admin_activity(
           current_user_id,
           'DELETE_ORDER',
           f'Permanently deleted order_id:{order_id} (order_number:{order_number}). Reason: {deletion_reason}'
       )

       # Delete related records first
       OrderItem.query.filter_by(order_id=order_id).delete()
       Payment.query.filter_by(order_id=order_id).delete()

       # Delete the order
       db.session.delete(order)
       db.session.commit()

       return jsonify({
           "message": "Order deleted permanently",
           "deleted_order": {
               'id': order_id,
               'order_number': order_number,
               'deletion_reason': deletion_reason,
               'deleted_at': datetime.now(UTC).isoformat()
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Delete order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to delete order", "details": str(e)}), 500

# Continue with existing routes (status update, cancel, refund, etc.) with enhanced features...

@admin_order_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def update_order_status(order_id):
   """Update order status with enhanced validation and inventory management (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json()
       if not data or 'status' not in data:
           return jsonify({"error": "Status is required"}), 400

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404
       old_status = order.status

       # Validate status transition
       try:
           new_status = OrderStatus(data['status'])
       except ValueError:
           return jsonify({"error": "Invalid status value"}), 400

       # Check if transition is allowed
       if not validate_status_transition(old_status, new_status):
           return jsonify({
               "error": f"Invalid status transition from {old_status.value} to {new_status.value}",
               "allowed_transitions": [status.value for status in ALLOWED_STATUS_TRANSITIONS.get(old_status, [])]
           }), 400

       # Update order
       order.status = new_status
       order.updated_at = datetime.now(UTC)

       # Add tracking number if provided
       if 'tracking_number' in data and data['tracking_number']:
           order.tracking_number = data['tracking_number'].strip()

       # Add notes if provided
       note_text = data.get('notes', '').strip()
       if note_text:
           timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
           admin_user = db.session.get(User, current_user_id)
           admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

           new_note = f"[{timestamp}] {admin_name}: {note_text}"

           if order.notes:
               order.notes += f"\n{new_note}"
           else:
               order.notes = new_note

       # Handle inventory changes based on status
       inventory_message = ""
       try:
           if new_status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED] and old_status == OrderStatus.PENDING:
               # Reduce inventory when order moves to processing/shipped
               from .order_completion_handler import handle_order_completion
               inventory_reduced = handle_order_completion(order_id, new_status)
               if inventory_reduced:
                   inventory_message = "Inventory reduced successfully"
                   logger.info(f"Inventory reduced for order {order_id}")
               else:
                   inventory_message = "Warning: Failed to reduce inventory"
                   logger.warning(f"Failed to reduce inventory for order {order_id}")
           elif new_status == OrderStatus.CANCELLED and old_status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED]:
               # Restore inventory when order is cancelled
               from .order_completion_handler import restore_inventory_for_cancelled_order
               inventory_restored = restore_inventory_for_cancelled_order(order_id)
               if inventory_restored:
                   inventory_message = "Inventory restored successfully"
                   logger.info(f"Inventory restored for cancelled order {order_id}")
               else:
                   inventory_message = "Warning: Failed to restore inventory"
                   logger.warning(f"Failed to restore inventory for cancelled order {order_id}")
       except ImportError:
           inventory_message = "Warning: Inventory handler not available"
           logger.warning("Order completion handler not found")

       db.session.commit()

       try:
           # Prepare WebSocket event data
           ws_data = {
               'order_id': order.id,
               'orderId': order.id,  # Include both formats for compatibility
               'id': order.id,
               'order_number': order.order_number,
               'old_status': old_status.value,
               'status': new_status.value,
               'tracking_number': order.tracking_number,
               'timestamp': datetime.now(UTC).isoformat()
           }
           
           # Notify the customer who placed the order
           broadcast_to_user(order.user_id, 'order_updated', ws_data)
           broadcast_to_user(order.user_id, 'order_status_changed', ws_data)
           
           # Notify all admins for monitoring
           broadcast_to_admins('admin_order_update', {
               **ws_data,
               'user_id': order.user_id
           })
           
           logger.info(f"WebSocket notifications sent for order {order_id} status update: {old_status.value} -> {new_status.value}")
       except Exception as ws_error:
           # Don't fail the request if WebSocket fails
           logger.error(f"WebSocket notification error for order {order_id}: {str(ws_error)}")

       # Send status update email
       try:
           customer = db.session.get(User, order.user_id)
           if customer and customer.email:
               customer_name = getattr(customer, 'name', 'Valued Customer') or 'Valued Customer'
               send_order_status_update_email(
                   order_id=order.id,
                   to_email=customer.email,
                   customer_name=customer_name
               )
               logger.info(f"Status update email sent for order {order.id}")
       except Exception as email_error:
           logger.error(f"Failed to send status update email: {str(email_error)}")

       # Send webhook notification
       send_webhook_notification('order.status_updated', order_id, {
           'old_status': old_status.value,
           'new_status': new_status.value,
           'tracking_number': order.tracking_number
       })

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'UPDATE_ORDER_STATUS',
           f'Updated order_id:{order_id} status from {old_status.value} to {new_status.value}. Notes: {note_text}'
       )

       response_data = {
           "message": "Order status updated successfully",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'old_status': old_status.value,
               'new_status': order.status.value,
               'updated_at': order.updated_at.isoformat(),
               'allowed_next_transitions': [status.value for status in ALLOWED_STATUS_TRANSITIONS.get(order.status, [])]
           }
       }

       if inventory_message:
           response_data["inventory_message"] = inventory_message

       return jsonify(response_data), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Update order status error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/cancel', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def cancel_order(order_id):
   """Cancel an order with reason logging (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json() or {}

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Check if order can be cancelled
       if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]:
           return jsonify({
               "error": f"Order cannot be cancelled. Current status: {order.status.value}"
           }), 400

       # Get cancellation reason
       cancellation_reason = data.get('reason', 'Cancelled by admin')
       refund_amount = float(data.get('refund_amount')) if data.get('refund_amount') is not None else None

       old_status = order.status
       order.status = OrderStatus.CANCELLED
       order.updated_at = datetime.now(UTC)

       # Add cancellation note
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       cancellation_note = f"[{timestamp}] {admin_name}: Order cancelled. Reason: {cancellation_reason}"
       if refund_amount:
           cancellation_note += f" | Refund amount: ${refund_amount:.2f}"

       if order.notes:
           order.notes += f"\n{cancellation_note}"
       else:
           order.notes = cancellation_note

       # Restore inventory if needed
       inventory_message = ""
       try:
           if old_status in [OrderStatus.PROCESSING, OrderStatus.SHIPPED]:
               from .order_completion_handler import restore_inventory_for_cancelled_order
               inventory_restored = restore_inventory_for_cancelled_order(order_id)
               if inventory_restored:
                   inventory_message = "Inventory restored successfully"
               else:
                   inventory_message = "Warning: Failed to restore inventory"
       except ImportError:
           inventory_message = "Warning: Inventory handler not available"

       db.session.commit()

       # Send webhook notification
       send_webhook_notification('order.cancelled', order_id, {
           'old_status': old_status.value,
           'reason': cancellation_reason,
           'refund_amount': refund_amount
       })

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'CANCEL_ORDER',
           f'Cancelled order_id:{order_id}. Reason: {cancellation_reason}. Refund: ${refund_amount or 0:.2f}'
       )

       return jsonify({
           "message": "Order cancelled successfully",
           "order": {
               'id': order.id,
               'order_number': order.order_number,
               'old_status': old_status.value,
               'new_status': order.status.value,
               'cancellation_reason': cancellation_reason,
               'refund_amount': refund_amount,
               'updated_at': order.updated_at.isoformat()
           },
           "inventory_message": inventory_message
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Cancel order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to cancel order", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/refund', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_super_admin()
def refund_order(order_id):
   """Process a refund for an order (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json()

       if not data or 'refund_amount' not in data:
           return jsonify({"error": "Refund amount is required"}), 400

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Check if order can be refunded
       if order.status not in [OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.CANCELLED]:
           return jsonify({
               "error": f"Order cannot be refunded. Current status: {order.status.value}"
           }), 400

       refund_amount = float(data['refund_amount'])
       refund_reason = data.get('reason', 'Admin refund')
       partial_refund = data.get('partial_refund', False)

       # Validate refund amount
       if refund_amount <= 0 or refund_amount > order.total_amount:
           return jsonify({
               "error": f"Invalid refund amount. Must be between 0 and {order.total_amount}"
           }), 400

       # Update order status if full refund
       old_status = order.status
       if not partial_refund and refund_amount == order.total_amount:
           order.status = OrderStatus.REFUNDED
           order.payment_status = PaymentStatus.REFUNDED

       order.updated_at = datetime.now(UTC)

       # Add refund note
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       refund_note = f"[{timestamp}] {admin_name}: Refund processed. Amount: ${refund_amount:.2f}. Reason: {refund_reason}"
       if partial_refund:
           refund_note += " (Partial refund)"

       if order.notes:
           order.notes += f"\n{refund_note}"
       else:
           order.notes = refund_note

       # Create payment record for refund
       refund_payment = Payment(
           order_id=order_id,
           amount=-refund_amount,  # Negative amount for refund
           payment_method=order.payment_method,
           transaction_id=f"REFUND-{order.order_number}-{int(datetime.now(UTC).timestamp())}",
           status=PaymentStatus.COMPLETED,
           created_at=datetime.now(UTC),
           completed_at=datetime.now(UTC)
       )
       db.session.add(refund_payment)

       db.session.commit()

       # Send webhook notification
       send_webhook_notification('order.refunded', order_id, {
           'refund_amount': refund_amount,
           'reason': refund_reason,
           'partial_refund': partial_refund,
           'transaction_id': refund_payment.transaction_id
       })

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'REFUND_ORDER',
           f'Processed refund for order_id:{order_id}. Amount: ${refund_amount:.2f}. Reason: {refund_reason}'
       )

       return jsonify({
           "message": "Refund processed successfully",
           "refund": {
               'order_id': order.id,
               'order_number': order.order_number,
               'refund_amount': refund_amount,
               'refund_reason': refund_reason,
               'partial_refund': partial_refund,
               'old_status': old_status.value,
               'new_status': order.status.value,
               'transaction_id': refund_payment.transaction_id,
               'processed_at': datetime.now(UTC).isoformat()
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Refund order error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to process refund", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/notes', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def add_order_note(order_id):
   """Add internal note to an order (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json()

       if not data or 'note' not in data:
           return jsonify({"error": "Note content is required"}), 400

       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       note_text = data['note'].strip()
       is_internal = data.get('internal', True)

       if not note_text:
           return jsonify({"error": "Note cannot be empty"}), 400

       # Add note with timestamp and admin info
       timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
       admin_user = db.session.get(User, current_user_id)
       admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

       note_prefix = "[INTERNAL]" if is_internal else "[CUSTOMER]"
       formatted_note = f"[{timestamp}] {note_prefix} {admin_name}: {note_text}"

       if order.notes:
           order.notes += f"\n{formatted_note}"
       else:
           order.notes = formatted_note

       order.updated_at = datetime.now(UTC)
       db.session.commit()

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'ADD_ORDER_NOTE',
           f'Added {"internal" if is_internal else "customer"} note to order_id:{order_id}: {note_text[:100]}...'
       )

       return jsonify({
           "message": "Note added successfully",
           "note": {
               'content': note_text,
               'is_internal': is_internal,
               'added_by': admin_name,
               'added_at': timestamp
           }
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Add order note error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to add note", "details": str(e)}), 500

@admin_order_routes.route('/orders/bulk-update', methods=['POST', 'OPTIONS']) # Changed route path
@cross_origin()
@jwt_required()
@require_admin()
def bulk_update_orders():
   """Enhanced bulk update multiple orders (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       data = request.get_json()

       if not data or 'order_ids' not in data or 'action' not in data:
           return jsonify({"error": "order_ids and action are required"}), 400

       order_ids = data['order_ids']
       action = data['action']

       if not isinstance(order_ids, list) or not order_ids:
           return jsonify({"error": "order_ids must be a non-empty list"}), 400

       results = []
       errors = []
       updated_count = 0

       for order_id in order_ids:
           try:
               order = db.session.get(Order, order_id)
               if not order:
                   errors.append(f"Order {order_id} not found")
                   continue

               if action == 'update_status':
                   if 'status' not in data:
                       errors.append(f"Status required for order {order_id}")
                       continue

                   try:
                       new_status = OrderStatus(data['status'])
                       old_status = order.status

                       # Validate transition
                       if not validate_status_transition(old_status, new_status):
                           errors.append(f"Invalid status transition for order {order_id}: {old_status.value} -> {new_status.value}")
                           continue
                       # Validate transition
                       if not validate_status_transition(old_status, new_status):
                           errors.append(f"Invalid status transition for order {order_id}: {old_status.value} -> {new_status.value}")
                           continue

                       order.status = new_status
                       order.updated_at = datetime.now(UTC)

                       # Send webhook notification
                       send_webhook_notification('order.bulk_status_updated', order_id, {
                           'old_status': old_status.value,
                           'new_status': new_status.value
                       })

                       results.append({
                           'order_id': order_id,
                           'old_status': old_status.value,
                           'new_status': new_status.value,
                           'success': True
                       })
                       updated_count += 1
                   except ValueError:
                       errors.append(f"Invalid status for order {order_id}")

               elif action == 'add_tracking':
                   if 'tracking_number' not in data:
                       errors.append(f"Tracking number required for order {order_id}")
                       continue

                   order.tracking_number = data['tracking_number']
                   order.updated_at = datetime.now(UTC)
                   results.append({
                       'order_id': order_id,
                       'tracking_number': data['tracking_number'],
                       'success': True
                   })
                   updated_count += 1

               elif action == 'add_notes':
                   if 'notes' not in data:
                       errors.append(f"Notes required for order {order_id}")
                       continue

                   timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
                   admin_user = db.session.get(User, current_user_id)
                   admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

                   new_note = f"[{timestamp}] {admin_name} (Bulk): {data['notes']}"

                   if order.notes:
                       order.notes += f"\n{new_note}"
                   else:
                       order.notes = new_note

                   order.updated_at = datetime.now(UTC)
                   results.append({
                       'order_id': order_id,
                       'note_added': True,
                       'success': True
                   })
                   updated_count += 1

               elif action == 'bulk_cancel':
                   if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]:
                       errors.append(f"Order {order_id} cannot be cancelled (status: {order.status.value})")
                       continue

                   reason = data.get('reason', 'Bulk cancellation by admin')
                   old_status = order.status
                   order.status = OrderStatus.CANCELLED
                   order.updated_at = datetime.now(UTC)

                   # Add cancellation note
                   timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
                   admin_user = db.session.get(User, current_user_id)
                   admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

                   cancellation_note = f"[{timestamp}] {admin_name} (Bulk): Order cancelled. Reason: {reason}"

                   if order.notes:
                       order.notes += f"\n{cancellation_note}"
                   else:
                       order.notes = cancellation_note

                   # Send webhook notification
                   send_webhook_notification('order.bulk_cancelled', order_id, {
                       'old_status': old_status.value,
                       'reason': reason
                   })

                   results.append({
                       'order_id': order_id,
                       'old_status': old_status.value,
                       'new_status': 'cancelled',
                       'reason': reason,
                       'success': True
                   })
                   updated_count += 1

               elif action == 'bulk_archive':
                   reason = data.get('reason', 'Bulk archive by admin')
                   order.is_archived = True
                   order.archived_at = datetime.now(UTC)
                   order.updated_at = datetime.now(UTC)

                   # Add archive note
                   timestamp = datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')
                   admin_user = db.session.get(User, current_user_id)
                   admin_name = admin_user.name if admin_user else f"Admin {current_user_id}"

                   archive_note = f"[{timestamp}] {admin_name} (Bulk): Order archived. Reason: {reason}"

                   if order.notes:
                       order.notes += f"\n{archive_note}"
                   else:
                       order.notes = archive_note

                   results.append({
                       'order_id': order_id,
                       'archived': True,
                       'reason': reason,
                       'success': True
                   })
                   updated_count += 1

               else:
                   errors.append(f"Unknown action: {action}")

           except Exception as e:
               errors.append(f"Error processing order {order_id}: {str(e)}")

       if updated_count > 0:
           db.session.commit()

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'BULK_UPDATE_ORDERS',
           f'Bulk {action} on {len(order_ids)} orders. Updated: {updated_count}, Errors: {len(errors)}'
       )

       return jsonify({
           "message": f"Bulk update completed. {updated_count} successful, {len(errors)} errors",
           "updated_count": updated_count,
           "results": results,
           "errors": errors
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Bulk update orders error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to bulk update orders", "details": str(e)}), 500

@admin_order_routes.route('/orders/stats', methods=['GET', 'OPTIONS']) # Changed route path
@cross_origin()
@jwt_required()
@require_admin()
def get_comprehensive_order_stats():
   """Get comprehensive order statistics with analytics (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()

       # Get date range parameters
       days = request.args.get('days', 30, type=int)
       start_date = datetime.now(UTC) - timedelta(days=days)

       # Basic statistics
       total_orders = Order.query.count()
       total_revenue = db.session.query(func.sum(Order.total_amount)).scalar() or 0
       recent_orders = Order.query.filter(Order.created_at >= start_date).count()
       recent_revenue = db.session.query(func.sum(Order.total_amount)).filter(
           Order.created_at >= start_date
       ).scalar() or 0

       # Orders by status
       status_stats = {}
       for status in OrderStatus:
           count = Order.query.filter_by(status=status).count()
           revenue = db.session.query(func.sum(Order.total_amount)).filter_by(status=status).scalar() or 0
           status_stats[status.value] = {
               'count': count,
               'revenue': float(revenue),
               'percentage': (count / total_orders * 100) if total_orders > 0 else 0
           }

       # Daily statistics for the specified period
       daily_stats = []
       for i in range(min(days, 30)):  # Limit to 30 days for performance
           day = datetime.now(UTC).date() - timedelta(days=i)
           day_start = datetime.combine(day, datetime.min.time())
           day_end = datetime.combine(day, datetime.max.time())

           day_orders = Order.query.filter(
               Order.created_at >= day_start,
               Order.created_at <= day_end
           ).all()

           daily_stats.append({
               'date': day.isoformat(),
               'orders': len(day_orders),
               'revenue': sum(order.total_amount for order in day_orders),
               'avg_order_value': sum(order.total_amount for order in day_orders) / len(day_orders) if day_orders else 0
           })

       # Top customers
       top_customers = db.session.query(
           Order.user_id,
           func.count(Order.id).label('order_count'),
           func.sum(Order.total_amount).label('total_spent'),
           func.avg(Order.total_amount).label('avg_order_value')
       ).group_by(Order.user_id).order_by(func.sum(Order.total_amount).desc()).limit(10).all()

       top_customers_data = []
       for customer in top_customers:
           user = db.session.get(User, customer.user_id)
           top_customers_data.append({
               'user_id': customer.user_id,
               'user_email': user.email if user else None,
               'user_name': getattr(user, 'name', None) if user else None,
               'order_count': customer.order_count,
               'total_spent': float(customer.total_spent),
               'avg_order_value': float(customer.avg_order_value)
           })

       # Payment method statistics
       payment_methods = db.session.query(
           Order.payment_method,
           func.count(Order.id).label('count'),
           func.sum(Order.total_amount).label('revenue')
       ).group_by(Order.payment_method).all()

       payment_method_stats = {}
       for method in payment_methods:
           if method.payment_method:
               payment_method_stats[method.payment_method] = {
                   'count': method.count,
                   'revenue': float(method.revenue),
                   'percentage': (method.count / total_orders * 100) if total_orders > 0 else 0
               }

       # Fulfillment statistics
       fulfillment_stats = {
           'unfulfilled': Order.query.filter(Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED])).count(),
           'partially_fulfilled': Order.query.filter(Order.status == OrderStatus.PROCESSING).count(),
           'fulfilled': Order.query.filter(Order.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])).count(),
           'cancelled': Order.query.filter(Order.status == OrderStatus.CANCELLED).count(),
           'returned': Order.query.filter(Order.status == OrderStatus.RETURNED).count(),
           'refunded': Order.query.filter(Order.status == OrderStatus.REFUNDED).count()
       }

       # Archive statistics
       archived_orders = Order.query.filter(Order.is_archived == True).count() if hasattr(Order, 'is_archived') else 0

       # Recent orders
       recent_orders_query = Order.query.order_by(Order.created_at.desc()).limit(10).all()
       recent_orders_data = []
       for order in recent_orders_query:
           order_dict = format_order_response(order, include_items=False, include_user=True)
           if order_dict:
               recent_orders_data.append(order_dict)

       # Log admin activity
       log_admin_activity(
           current_user_id,
           'VIEW_ORDER_STATS',
           f'Viewed order statistics for {days} days period'
       )

       return jsonify({
           "overview": {
               "total_orders": total_orders,
               "total_revenue": float(total_revenue),
               "recent_orders": recent_orders,
               "recent_revenue": float(recent_revenue),
               "average_order_value": float(total_revenue / total_orders) if total_orders > 0 else 0,
               "recent_avg_order_value": float(recent_revenue / recent_orders) if recent_orders > 0 else 0,
               "archived_orders": archived_orders
           },
           "status_breakdown": status_stats,
           "fulfillment_stats": fulfillment_stats,
           "daily_breakdown": daily_stats,
           "top_customers": top_customers_data,
           "payment_methods": payment_method_stats,
           "recent_orders": recent_orders_data,
           "period_days": days
       }), 200

   except Exception as e:
       logger.error(f"Get comprehensive order stats error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to retrieve order statistics", "details": str(e)}), 500

@admin_order_routes.route('/orders/export', methods=['GET', 'OPTIONS']) # Changed route path
@cross_origin()
@jwt_required()
@require_admin()
def export_orders():
   """Export orders to CSV with enhanced filtering (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()

       # Get filter parameters (same as get_all_orders)
       status = request.args.get('status')
       date_from = request.args.get('date_from')
       date_to = request.args.get('date_to')
       payment_method = request.args.get('payment_method')
       format_type = request.args.get('format', 'csv').lower()
       include_archived = request.args.get('include_archived', 'false').lower() == 'true'

       # Build query
       query = Order.query

       # Filter archived orders
       if not include_archived:
           query = query.filter(or_(Order.is_archived.is_(None), Order.is_archived == False))

       if status:
           try:
               order_status = OrderStatus(status)
               query = query.filter(Order.status == order_status)
           except ValueError:
               pass

       if date_from:
           try:
               date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
               query = query.filter(Order.created_at >= date_from_obj)
           except ValueError:
               pass

       if date_to:
           try:
               date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
               query = query.filter(Order.created_at <= date_to_obj)
           except ValueError:
               pass

       if payment_method:
           query = query.filter(Order.payment_method == payment_method)

       orders = query.order_by(Order.created_at.desc()).all()

       if format_type == 'csv':
           # Create CSV
           output = io.StringIO()
           writer = csv.writer(output)

           # Enhanced header
           writer.writerow([
               'Order ID', 'Order Number', 'User Email', 'User Name', 'Status',
               'Payment Status', 'Total Amount', 'Subtotal', 'Tax Amount', 'Shipping Cost',
               'Payment Method', 'Shipping Method', 'Tracking Number',
               'Created At', 'Updated At', 'Items Count', 'Notes', 'Is Archived'
           ])

           # Write data
           for order in orders:
               user = db.session.get(User, order.user_id)
               writer.writerow([
                   order.id,
                   order.order_number,
                   user.email if user else '',
                   getattr(user, 'name', '') if user else '',
                   order.status.value,
                   order.payment_status.value if order.payment_status else '',
                   order.total_amount,
                   getattr(order, 'subtotal', 0) or 0,
                   getattr(order, 'tax_amount', 0) or 0,
                   order.shipping_cost or 0,
                   order.payment_method or '',
                   order.shipping_method or '',
                   order.tracking_number or '',
                   order.created_at.isoformat(),
                   order.updated_at.isoformat(),
                   len(order.items),
                   (order.notes or '').replace('\n', ' | '),  # Replace newlines for CSV
                   getattr(order, 'is_archived', False)
               ])

           output.seek(0)

           # Create response
           response = make_response(output.getvalue())
           response.headers['Content-Type'] = 'text/csv; charset=utf-8'
           response.headers['Content-Disposition'] = f'attachment; filename=orders_export_{datetime.now(UTC).strftime("%Y%m%d_%H%M%S")}.csv'

           # Log admin activity
           log_admin_activity(
               current_user_id,
               'EXPORT_ORDERS',
               f'Exported {len(orders)} orders to CSV with filters: status={status}, payment_method={payment_method}'
           )

           return response

       else:
           return jsonify({"error": "Unsupported format. Use 'csv'"}), 400

   except Exception as e:
       logger.error(f"Export orders error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to export orders", "details": str(e)}), 500

@admin_order_routes.route('/orders/<int:order_id>/resend-confirmation', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@require_admin()
def resend_order_confirmation(order_id):
   """Resend order confirmation email (Admin only)."""
   if request.method == 'OPTIONS':
       response = jsonify({'status': 'ok'})
       response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
       response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       return response

   try:
       current_user_id = get_jwt_identity()
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       user = db.session.get(User, order.user_id)
       if not user or not user.email:
           return jsonify({"error": "User email not found"}), 400

       # Get customer name
       customer_name = getattr(user, 'name', 'Valued Customer') or 'Valued Customer'

       # Try to get name from shipping address if not available
       if customer_name == "Valued Customer" and order.shipping_address:
           try:
               if isinstance(order.shipping_address, str):
                   address_data = json.loads(order.shipping_address)
                   if address_data.get('first_name'):
                       customer_name = f"{address_data.get('first_name')} {address_data.get('last_name', '')}".strip()
           except:
               pass

       # Send the confirmation email
       email_sent = send_order_confirmation_email(
           order_id=order.id,
           to_email=user.email,
           customer_name=customer_name
       )

       if email_sent:
           # Log admin activity
           log_admin_activity(
               current_user_id,
               'RESEND_ORDER_CONFIRMATION',
               f'Resent order confirmation email for order_id:{order_id} to {user.email}'
           )

           logger.info(f"Order confirmation email resent for order {order.id} to {user.email}")
           return jsonify({"message": "Order confirmation email sent successfully"}), 200
       else:
           logger.error(f"Failed to resend order confirmation email for order {order.id}")
           return jsonify({"error": "Failed to send email"}), 500

   except Exception as e:
       logger.error(f"Resend order confirmation error: {str(e)}", exc_info=True)
       return jsonify({"error": "Failed to resend confirmation email", "details": str(e)}), 500

# Health check endpoint
@admin_order_routes.route('/health', methods=['GET'])
def admin_order_health():
   """Enhanced health check for admin order routes."""
   try:
       # Check database connectivity
       total_orders = Order.query.count()

       # Check recent activity
       recent_orders = Order.query.filter(
           Order.created_at >= datetime.now(UTC) - timedelta(hours=24)
       ).count()

       # Check archived orders
       archived_orders = Order.query.filter(Order.is_archived == True).count() if hasattr(Order, 'is_archived') else 0

       return jsonify({
           "status": "healthy",
           "service": "admin_order_routes",
           "timestamp": datetime.now(UTC).isoformat(),
           "version": "3.0",
           "database_status": "connected",
           "total_orders": total_orders,
           "recent_orders_24h": recent_orders,
           "archived_orders": archived_orders,
           "available_endpoints": [
               "GET /orders - Get all orders with advanced filtering",
               "GET /orders/<id> - Get order details with history",
               "PUT /orders/<id>/status - Update order status with validation",
               "POST /orders/<id>/cancel - Cancel order with reason",
               "POST /orders/<id>/refund - Process order refund",
               "POST /orders/<id>/notes - Add internal notes",
               "POST /orders/<id>/items - Manage order items (add/edit/remove)",
               "POST /orders/<id>/payment/manual - Manually mark payment status",
               "POST /orders/<id>/reopen - Reopen cancelled/returned orders",
               "POST /orders/<id>/archive - Archive order (soft delete)",
               "POST /orders/<id>/unarchive - Unarchive order",
               "DELETE /orders/<id>/delete - Permanently delete order",
               "POST /orders/bulk-update - Enhanced bulk operations",
               "GET /orders/stats - Comprehensive order statistics",
               "GET /orders/export - Export orders to CSV",
               "POST /orders/<id>/resend-confirmation - Resend confirmation email"
           ],
           "supported_bulk_actions": [
               "update_status", "add_tracking", "add_notes", "bulk_cancel", "bulk_archive"
           ],
           "supported_status_transitions": {
               status.value: [t.value for t in transitions]
               for status, transitions in ALLOWED_STATUS_TRANSITIONS.items()
           },
           "permission_levels": {
               "regular_admin": REGULAR_ADMIN_PERMISSIONS,
               "super_admin": SUPER_ADMIN_PERMISSIONS
           }
       }), 200

   except Exception as e:
       logger.error(f"Health check error: {str(e)}")
       return jsonify({
           "status": "unhealthy",
           "service": "admin_order_routes",
           "timestamp": datetime.now(UTC).isoformat(),
           "error": str(e)
       }), 500
