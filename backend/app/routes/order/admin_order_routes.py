"""
Admin Order Routes for Mizizzi E-commerce platform.
Provides order management endpoints for admin users.
"""
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import or_, desc, asc, func
from datetime import datetime, timedelta, timezone
import csv
import io
import json
from functools import wraps
import uuid
from ...models.models import User, UserRole, Order, OrderItem, Product, ProductVariant, Payment, OrderStatus, PaymentStatus
from ...configuration.extensions import db, logger
from flask_cors import cross_origin

admin_order_routes = Blueprint('admin_order_routes', __name__)

# Helper to serialize enums for JSON responses
def serialize_enum(obj):
   """Helper to serialize enums and custom objects"""
   if isinstance(obj, (OrderStatus, PaymentStatus, UserRole)):
       return obj.value
   if hasattr(obj, '__dict__'):
       return obj.__dict__
   raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

def custom_jsonify(data):
   """Enhanced JSON response handler with better error handling"""
   try:
       return current_app.response_class(
           json.dumps(data, default=serialize_enum),
           mimetype="application/json"
       )
   except TypeError as e:
       logger.error(f"Serialization error: {e}")
       try:
           # Try to sanitize the data
           if isinstance(data, dict):
               sanitized = {}
               for k, v in data.items():
                   try:
                       if isinstance(v, (OrderStatus, PaymentStatus, UserRole)):
                           sanitized[k] = v.value
                       elif hasattr(v, '__dict__'):
                           sanitized[k] = v.__dict__
                       else:
                           json.dumps({k: v})  # Test if serializable
                           sanitized[k] = v
                   except (TypeError, ValueError):
                       sanitized[k] = str(v)
               return jsonify(sanitized)
       except Exception as e2:
           logger.error(f"Sanitization failed: {e2}")
       return jsonify({"error": "Serialization error", "details": str(e)}), 500

def require_admin():
   """Decorator to require admin access"""
   def decorator(f):
       @wraps(f)
       def wrapper(*args, **kwargs):
           try:
               current_user_id = get_jwt_identity()
               claims = get_jwt()
               user_role = claims.get('role', 'user')

               if user_role != 'admin':
                   return jsonify({'error': 'Admin access required'}), 403

               # Verify user exists and is admin
               user = db.session.get(User, current_user_id)
               if not user or user.role.value != 'admin':
                   return jsonify({'error': 'Admin access required'}), 403

               return f(*args, **kwargs)
           except Exception as e:
               logger.error(f"Admin auth error: {str(e)}")
               return jsonify({'error': 'Authentication failed'}), 401

       return wrapper
   return decorator

@admin_order_routes.after_request
def add_cors_headers(response):
   """Add CORS headers to all responses."""
   response.headers.add('Access-Control-Allow-Origin', '*')
   response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
   response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
   response.headers.add('Access-Control-Allow-Credentials', 'true')
   return response

@admin_order_routes.route('/api/admin/orders/health', methods=['GET'])
def health_check():
   """Health check endpoint for admin order routes."""
   return jsonify({
       'status': 'ok',
       'timestamp': datetime.now().isoformat(),
       'service': 'admin-order-service',
       'version': '1.0.0',
       'endpoints': [
           '/api/admin/orders',
           '/api/admin/orders/<id>',
           '/api/admin/orders/<id>/status',
           '/api/admin/orders/bulk-update',
           '/api/admin/orders/export',
           '/api/admin/orders/stats',
       ]
   }), 200

def format_order_for_response(order, include_items=False):
    """Helper function to format order data consistently"""
    try:
        order_data = {
            "id": order.id,
            "order_number": order.order_number,
            "user_id": order.user_id,  # Always include user_id
            "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
            "payment_status": order.payment_status.value if hasattr(order.payment_status, 'value') else str(order.payment_status),
            "payment_method": order.payment_method or '',  # Ensure payment_method is never None
            "total_amount": float(order.total_amount) if order.total_amount else 0,
            "subtotal": float(getattr(order, 'subtotal', 0)) if getattr(order, 'subtotal', None) else 0,
            "tax_amount": float(getattr(order, 'tax_amount', 0)) if getattr(order, 'tax_amount', None) else 0,
            "shipping_cost": float(order.shipping_cost) if order.shipping_cost else 0,
            "shipping_method": order.shipping_method,
            "tracking_number": order.tracking_number,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None
        }

        # Always include user field as dict or None
        user_data = None
        if order.user_id:
            try:
                user = db.session.get(User, order.user_id)
                if user:
                    user_data = {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "phone": user.phone,
                        "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
                    }
            except Exception as e:
                logger.error(f"Error loading user {order.user_id}: {str(e)}")

        order_data["user"] = user_data

        # Include order items if requested
        if include_items:
            order_data["items"] = []
            try:
                order_items = OrderItem.query.filter_by(order_id=order.id).all()
                for item in order_items:
                    item_data = {
                        "id": item.id,
                        "order_id": order.id,
                        "product_id": item.product_id,
                        "variant_id": item.variant_id,
                        "quantity": item.quantity,
                        "price": float(item.price),
                        "total": float(item.total)
                    }

                    # Include product info if available
                    try:
                        product = db.session.get(Product, item.product_id)
                        if product:
                            item_data["product"] = {
                                "id": product.id,
                                "name": product.name,
                                "sku": getattr(product, 'sku', None),
                                "thumbnail_url": product.thumbnail_url
                            }
                    except Exception as e:
                        logger.error(f"Error loading product {item.product_id}: {str(e)}")

                    # Include variant info if available
                    if item.variant_id:
                        try:
                            variant = db.session.get(ProductVariant, item.variant_id)
                            if variant:
                                item_data["variant"] = {
                                    "id": variant.id,
                                    "name": f"{variant.size or ''} {variant.color or ''}".strip(),
                                    "sku": getattr(variant, 'sku', None)
                                }
                        except Exception as e:
                            logger.error(f"Error loading variant {item.variant_id}: {str(e)}")

                    order_data["items"].append(item_data)
            except Exception as e:
                logger.error(f"Error loading items for order {order.id}: {str(e)}")
                order_data["items"] = []

        return order_data
    except Exception as e:
        logger.error(f"Error formatting order {order.id}: {str(e)}")
        return {
            "id": getattr(order, 'id', None),
            "order_number": getattr(order, 'order_number', 'Unknown'),
            "user_id": getattr(order, 'user_id', None),
            "status": "unknown",
            "payment_status": "unknown",
            "payment_method": getattr(order, 'payment_method', ''),
            "total_amount": 0,
            "user": None,
            "created_at": None,
            "updated_at": None
        }

@admin_order_routes.route('/api/admin/orders', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_admin()
def get_orders():
   """Get all orders with pagination and filtering."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       # Get pagination parameters
       page = max(1, int(request.args.get('page', 1)))
       per_page = min(100, max(1, int(request.args.get('per_page', 20))))

       # Get filter parameters
       status = request.args.get('status')
       payment_status = request.args.get('payment_status')
       payment_method = request.args.get('payment_method')
       search = request.args.get('search')
       date_from = request.args.get('date_from')
       date_to = request.args.get('date_to')
       min_amount = request.args.get('min_amount', type=float)
       max_amount = request.args.get('max_amount', type=float)
       include_items = request.args.get('include_items', 'false').lower() == 'true'

       # Sorting parameters
       sort_by = request.args.get('sort_by', 'created_at')
       sort_order = request.args.get('sort_order', 'desc')

       # Build query
       query = Order.query
       filters_applied = {}

       # Apply filters
       if status:
           try:
               order_status = OrderStatus(status)
               query = query.filter(Order.status == order_status)
               filters_applied['status'] = status
           except ValueError:
               # Invalid status, ignore filter
               pass

       if payment_status:
           try:
               payment_status_enum = PaymentStatus(payment_status)
               query = query.filter(Order.payment_status == payment_status_enum)
               filters_applied['payment_status'] = payment_status
           except ValueError:
               # Invalid payment status, ignore filter
               pass

       if payment_method:
           query = query.filter(Order.payment_method == payment_method)
           filters_applied['payment_method'] = payment_method

       if search:
           filters_applied['search'] = search
           search_conditions = []
           search_term = f"%{search}%"

           # Search in order fields
           search_conditions.extend([
               Order.order_number.ilike(search_term),
               Order.tracking_number.ilike(search_term)
           ])

           # Search in user fields by joining
           user_subquery = (
               db.session.query(Order.id)
               .join(User, Order.user_id == User.id)
               .filter(
                   or_(
                       User.name.ilike(search_term),
                       User.email.ilike(search_term),
                       User.phone.ilike(search_term)
                   )
               )
           )

           search_conditions.append(Order.id.in_(user_subquery.scalar_subquery()))
           query = query.filter(or_(*search_conditions))

       if date_from:
           try:
               from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
               query = query.filter(Order.created_at >= from_date)
               filters_applied['date_from'] = date_from
           except ValueError:
               # Invalid date format, ignore filter
               pass

       if date_to:
           try:
               to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
               to_date = to_date.replace(hour=23, minute=59, second=59)
               query = query.filter(Order.created_at <= to_date)
               filters_applied['date_to'] = date_to
           except ValueError:
               # Invalid date format, ignore filter
               pass

       if min_amount is not None:
           query = query.filter(Order.total_amount >= min_amount)
           filters_applied['min_amount'] = min_amount

       if max_amount is not None:
           query = query.filter(Order.total_amount <= max_amount)
           filters_applied['max_amount'] = max_amount

       # Apply sorting
       if sort_by == 'total_amount':
           sort_column = Order.total_amount
       elif sort_by == 'order_number':
           sort_column = Order.order_number
       else:  # Default to created_at
           sort_column = Order.created_at

       if sort_order.lower() == 'asc':
           query = query.order_by(asc(sort_column))
       else:
           query = query.order_by(desc(sort_column))

       # Paginate the results
       paginated = query.paginate(page=page, per_page=per_page, error_out=False)

       # Prepare response
       response_data = {
           "items": [],
           "pagination": {
               "page": paginated.page,
               "per_page": paginated.per_page,
               "total_pages": paginated.pages,
               "total_items": paginated.total,
               "has_next": paginated.has_next,
               "has_prev": paginated.has_prev
           }
       }

       # Add filters applied if any
       if filters_applied:
           response_data["filters_applied"] = filters_applied

       # Process orders for response
       for order in paginated.items:
           order_data = format_order_for_response(order, include_items)
           # Ensure payment_method filter works correctly
           if payment_method and order_data.get('payment_method') != payment_method:
               continue
           response_data["items"].append(order_data)

       return custom_jsonify(response_data), 200

   except Exception as e:
       logger.error(f"Error retrieving orders: {str(e)}")
       return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_admin()
def get_order(order_id):
   """Get order details by ID."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       # Use the helper function to format the order data consistently
       order_data = format_order_for_response(order, include_items=True)

       # Defensive: ensure user is dict or None, never int
       if isinstance(order_data.get("user"), int):
           order_data["user"] = None

       # Add additional fields specific to single order view
       # Get payment details
       payments = Payment.query.filter_by(order_id=order_id).all()
       payments_data = []

       for payment in payments:
           payment_data = {
               'id': payment.id,
               'amount': float(payment.amount),
               'payment_method': payment.payment_method,
               'transaction_id': payment.transaction_id,
               'status': payment.status.value if hasattr(payment.status, 'value') else str(payment.status),
               'created_at': payment.created_at.isoformat() if payment.created_at else None,
               'completed_at': payment.completed_at.isoformat() if payment.completed_at else None
           }
           payments_data.append(payment_data)

       # Extract shipping and billing addresses
       shipping_address = {}
       billing_address = {}

       try:
           if order.shipping_address:
               if isinstance(order.shipping_address, str):
                   shipping_address = json.loads(order.shipping_address)
               else:
                   shipping_address = order.shipping_address
       except (json.JSONDecodeError, TypeError):
           shipping_address = {'error': 'Malformed address data'}

       try:
           if order.billing_address:
               if isinstance(order.billing_address, str):
                   billing_address = json.loads(order.billing_address)
               else:
                   billing_address = order.billing_address
       except (json.JSONDecodeError, TypeError):
           billing_address = {'error': 'Malformed address data'}

       # Add the additional fields to the order data
       order_data.update({
           'notes': order.notes,
           'shipping_address': shipping_address,
           'billing_address': billing_address,
           'payments': payments_data
       })

       return custom_jsonify(order_data), 200

   except Exception as e:
       logger.error(f"Error getting order {order_id}: {str(e)}")
       return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@jwt_required()
@require_admin()
def update_order_status(order_id):
   """Update order status."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       data = request.get_json()

       if 'status' not in data:
           return jsonify({"error": "Status is required"}), 400

       try:
           new_status = OrderStatus(data['status'])

           # Validate status transition
           if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
               return jsonify({"error": "Cannot change status of a cancelled order"}), 400

           if order.status == OrderStatus.DELIVERED and new_status not in [OrderStatus.DELIVERED, OrderStatus.RETURNED]:
               return jsonify({"error": "Delivered orders can only be marked as returned"}), 400

           # Update order status
           order.status = new_status
           order.updated_at = datetime.now(timezone.utc)

           # Update tracking information if provided
           if 'tracking_number' in data:
               order.tracking_number = data['tracking_number']

           if 'tracking_url' in data:
               order.tracking_url = data['tracking_url']

           # Add notes if provided
           if 'notes' in data:
               # Append timestamp to notes
               now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
               if order.notes:
                   order.notes += f"\n{now_str}: {data['notes']}"
               else:
                   order.notes = f"{now_str}: {data['notes']}"

           db.session.commit()

           return custom_jsonify({
               "message": "Order status updated successfully",
               "order": {
                   "id": order.id,
                   "order_number": order.order_number,
                   "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                   "tracking_number": order.tracking_number,
                   "updated_at": order.updated_at.isoformat()
               }
           }), 200

       except ValueError:
           return jsonify({"error": "Invalid status value"}), 400

   except Exception as e:
       db.session.rollback()
       logger.error(f"Error updating order status {order_id}: {str(e)}")
       return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/bulk-update', methods=['POST', 'OPTIONS'])
@jwt_required()
@require_admin()
def bulk_update_orders():
   """Bulk update order statuses."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       data = request.get_json()

       if 'order_ids' not in data or not data['order_ids']:
           return jsonify({"error": "Order IDs are required"}), 400

       if 'action' not in data:
           return jsonify({"error": "Action is required"}), 400

       order_ids = data['order_ids']
       action = data['action']

       valid_actions = ['update_status', 'add_tracking', 'cancel_orders']
       if action not in valid_actions:
           return jsonify({"error": f"Invalid action. Supported actions: {', '.join(valid_actions)}"}), 400

       results = {
           "successful": [],
           "failed": []
       }

       if action == 'update_status':
           if 'status' not in data:
               return jsonify({"error": "Status is required for update_status action"}), 400

           try:
               new_status = OrderStatus(data['status'])

               for order_id in order_ids:
                   try:
                       order = db.session.get(Order, order_id)

                       if not order:
                           results["failed"].append({
                               "id": order_id,
                               "reason": "Order not found"
                           })
                           continue

                       # Validate status transition
                       if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                           results["failed"].append({
                               "id": order_id,
                               "reason": "Cannot change status of a cancelled order"
                           })
                           continue

                       if order.status == OrderStatus.DELIVERED and new_status not in [OrderStatus.DELIVERED, OrderStatus.RETURNED]:
                           results["failed"].append({
                               "id": order_id,
                               "reason": "Delivered orders can only be marked as returned"
                           })
                           continue

                       # Update order status
                       order.status = new_status
                       order.updated_at = datetime.now(timezone.utc)

                       # Add notes if provided
                       if 'notes' in data:
                           now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                           if order.notes:
                               order.notes += f"\n{now_str} (Bulk): {data['notes']}"
                           else:
                               order.notes = f"{now_str} (Bulk): {data['notes']}"

                       results["successful"].append({
                           "id": order_id,
                           "order_number": order.order_number,
                           "status": order.status.value if hasattr(order.status, 'value') else str(order.status)
                       })

                   except Exception as e:
                       logger.error(f"Error updating order {order_id}: {str(e)}")
                       results["failed"].append({
                           "id": order_id,
                           "reason": str(e)
                       })

           except ValueError:
               return jsonify({"error": "Invalid status value"}), 400

       elif action == 'add_tracking':
           # Accept either tracking_number directly or nested in tracking_data
           tracking_number = data.get('tracking_number')
           tracking_data = data.get('tracking_data', {})

           if not tracking_number and not tracking_data.get('tracking_number'):
               return jsonify({"error": "Tracking number is required for add_tracking action"}), 400

           # Use tracking_number directly if provided, otherwise use from tracking_data
           tracking_number = tracking_number or tracking_data.get('tracking_number')
           tracking_url = data.get('tracking_url') or tracking_data.get('tracking_url')

           for order_id in order_ids:
               try:
                   order = db.session.get(Order, order_id)

                   if not order:
                       results["failed"].append({
                           "id": order_id,
                           "reason": "Order not found"
                       })
                       continue

                   # Update tracking information
                   order.tracking_number = tracking_number
                   if tracking_url:
                       order.tracking_url = tracking_url
                   order.updated_at = datetime.now(timezone.utc)

                   # Update status to shipped if currently processing
                   if order.status == OrderStatus.PROCESSING:
                       order.status = OrderStatus.SHIPPED

                   results["successful"].append({
                       "id": order_id,
                       "order_number": order.order_number,
                       "tracking_number": order.tracking_number
                   })

               except Exception as e:
                   logger.error(f"Error adding tracking to order {order_id}: {str(e)}")
                   results["failed"].append({
                       "id": order_id,
                       "reason": str(e)
                   })

       elif action == 'cancel_orders':
           for order_id in order_ids:
               try:
                   order = db.session.get(Order, order_id)

                   if not order:
                       results["failed"].append({
                           "id": order_id,
                           "reason": "Order not found"
                       })
                       continue

                   # Only allow cancellation of pending or processing orders
                   if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
                       results["failed"].append({
                           "id": order_id,
                           "reason": f"Cannot cancel order in {order.status.value} status"
                       })
                       continue

                   # Update order status to cancelled
                   order.status = OrderStatus.CANCELLED
                   order.updated_at = datetime.now(timezone.utc)

                   # Add cancellation note
                   cancel_reason = data.get('cancel_reason', 'Administrative cancellation')
                   now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                   if order.notes:
                       order.notes += f"\n{now_str} (Cancelled): {cancel_reason}"
                   else:
                       order.notes = f"{now_str} (Cancelled): {cancel_reason}"

                   results["successful"].append({
                       "id": order_id,
                       "order_number": order.order_number,
                       "status": "cancelled"
                   })

               except Exception as e:
                   logger.error(f"Error cancelling order {order_id}: {str(e)}")
                   results["failed"].append({
                       "id": order_id,
                       "reason": str(e)
                   })

       db.session.commit()

       summary = {
           "total": len(order_ids),
           "successful": len(results["successful"]),
           "failed": len(results["failed"])
       }

       return custom_jsonify({
           "message": f"Bulk update completed: {summary['successful']} successful, {summary['failed']} failed",
           "summary": summary,
           "results": results
       }), 200

   except Exception as e:
       db.session.rollback()
       logger.error(f"Error in bulk update orders: {str(e)}")
       return jsonify({"error": "Failed to update orders", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_admin()
def get_order_stats():
   """Get order statistics."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       # Get time period
       period = request.args.get('period', 'month')  # day, week, month, year
       days = int(request.args.get('days', 30))

       today = datetime.now().date()
       period_start = datetime.now() - timedelta(days=days)

       if period == 'day':
           # Get sales for each hour of the day
           start_date = datetime(today.year, today.month, today.day, 0, 0, 0)
           # Use extract to get hour
           group_by = func.extract('hour', Order.created_at).cast(db.Integer)
           label_format = '%H:00'
       elif period == 'week':
           # Get sales for each day of the week
           start_date = today - timedelta(days=today.weekday())
           start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
           # This should work in PostgreSQL
           group_by = func.date(Order.created_at)
           label_format = '%Y-%m-%d'
       elif period == 'year':
           # Get sales for each month of the year
           start_date = datetime(today.year, 1, 1, 0, 0, 0)
           # Use extract to get month
           group_by = func.extract('month', Order.created_at).cast(db.Integer)
           label_format = '%m'
       else:  # month (default)
           # Get sales for each day of the month
           start_date = datetime(today.year, today.month, 1, 0, 0, 0)
           # Use extract to get day
           group_by = func.extract('day', Order.created_at).cast(db.Integer)
           label_format = '%d'

       # Query sales data
       sales_data = db.session.query(
           group_by.label('period'),
           func.sum(Order.total_amount).label('total_sales'),
           func.count(Order.id).label('order_count')
       ).filter(
           Order.created_at >= period_start,
           Order.status != OrderStatus.CANCELLED
       ).group_by(
           'period'
       ).order_by(
           'period'
       ).all()

       # Format results
       formatted_data = []
       for item in sales_data:
           if period == 'day':
               # For hourly data
               label = f"{item.period}:00"
           elif period == 'week':
               # For daily data (date objects)
               if hasattr(item.period, 'strftime'):
                   label = item.period.strftime(label_format)
               else:
                   label = str(item.period)
           elif period == 'month':
               # For daily data (integers)
               label = f"{item.period:02d}"
           else:  # year
               # For monthly data
               try:
                   month_name = datetime(today.year, int(item.period), 1).strftime('%b')
                   label = month_name
               except ValueError:
                   # Fallback if month is invalid
                   label = f"Month {item.period}"

           formatted_data.append({
               'label': label,
               'sales': float(item.total_sales) if item.total_sales else 0,
               'orders': item.order_count
           })

       # Get payment method stats
       payment_methods = db.session.query(
           Order.payment_method,
           func.count(Order.id).label('count'),
           func.sum(Order.total_amount).label('total')
       ).filter(
           Order.payment_method.isnot(None),
           Order.status != OrderStatus.CANCELLED
       ).group_by(
           Order.payment_method
       ).order_by(
           desc('count')
       ).all()

       payment_method_stats = []
       for method in payment_methods:
           payment_method_stats.append({
               'method': method.payment_method,
               'count': method.count,
               'total': float(method.total) if method.total else 0
           })

       # Get top customers
       top_customers = db.session.query(
           Order.user_id,
           func.count(Order.id).label('order_count'),
           func.sum(Order.total_amount).label('total_spent')
       ).filter(
           Order.user_id.isnot(None),
           Order.status != OrderStatus.CANCELLED
       ).group_by(
           Order.user_id
       ).order_by(
           desc('total_spent')
       ).limit(5).all()

       top_customers_data = []
       for customer in top_customers:
           user = db.session.get(User, customer.user_id)
           if user:
               top_customers_data.append({
                   'id': user.id,
                   'name': user.name,
                   'email': user.email,
                   'order_count': customer.order_count,
                   'total_spent': float(customer.total_spent) if customer.total_spent else 0
               })

       # Get status distribution
       status_distribution = db.session.query(
           Order.status,
           func.count(Order.id).label('count')
       ).group_by(
           Order.status
       ).all()

       status_counts = {}
       for status_item in status_distribution:
           status_key = status_item.status.value if hasattr(status_item.status, 'value') else str(status_item.status)
           status_counts[status_key] = status_item.count

       return custom_jsonify({
           'period': period,
           'days': days,
           'sales_data': formatted_data,
           'payment_methods': payment_method_stats,
           'top_customers': top_customers_data,
           'status_distribution': status_counts
       }), 200

   except Exception as e:
       logger.error(f"Error getting order stats: {str(e)}")
       return jsonify({"error": "Failed to retrieve order statistics", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/export', methods=['GET', 'OPTIONS'])
@jwt_required()
@require_admin()
def export_orders():
   """Export orders to CSV."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       # Get export format
       export_format = request.args.get('format', 'csv').lower()

       if export_format != 'csv':
           return jsonify({"error": "Only CSV export format is supported"}), 400

       # Get filter parameters (same as get_orders)
       status = request.args.get('status')
       payment_status = request.args.get('payment_status')
       date_from = request.args.get('date_from')
       date_to = request.args.get('date_to')
       search = request.args.get('search')

       # Build query
       query = Order.query

       # Apply filters
       if status:
           try:
               order_status = OrderStatus(status)
               query = query.filter(Order.status == order_status)
           except ValueError:
               pass  # Invalid status, ignore filter

       if payment_status:
           try:
               payment_status_enum = PaymentStatus(payment_status)
               query = query.filter(Order.payment_status == payment_status_enum)
           except ValueError:
               pass  # Invalid payment status, ignore filter

       if search:
           query = query.filter(
               or_(
                   Order.order_number.ilike(f'%{search}%'),
                   Order.tracking_number.ilike(f'%{search}%')
               )
           )

       if date_from:
           try:
               from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
               query = query.filter(Order.created_at >= from_date)
           except ValueError:
               pass  # Invalid date format, ignore filter

       if date_to:
           try:
               to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
               to_date = to_date.replace(hour=23, minute=59, second=59)
               query = query.filter(Order.created_at <= to_date)
           except ValueError:
               pass  # Invalid date format, ignore filter

       # Order by creation date, newest first
       query = query.order_by(Order.created_at.desc())

       # Execute query
       orders = query.all()

       if not orders:
           return jsonify({"message": "No orders found matching the criteria"}), 404

       # Create CSV in memory
       output = io.StringIO()
       writer = csv.writer(output)

       # Write header
       writer.writerow([
           'Order ID',
           'Order Number',
           'Date',
           'Customer Name',
           'Customer Email',
           'Status',
           'Payment Status',
           'Payment Method',
           'Total Amount',
           'Shipping Method',
           'Tracking Number',
           'Items'
       ])

       # Write data
       for order in orders:
           user = db.session.get(User, order.user_id) if order.user_id else None

           # Get order items
           order_items = OrderItem.query.filter_by(order_id=order.id).all()
           items_text = ", ".join([f"{item.quantity}x {db.session.get(Product, item.product_id).name if db.session.get(Product, item.product_id) else 'Unknown Product'}" for item in order_items])

           writer.writerow([
               order.id,
               order.order_number,
               order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else 'N/A',
               user.name if user else 'Guest',
               user.email if user else 'N/A',
               order.status.value if hasattr(order.status, 'value') else str(order.status),
               order.payment_status.value if hasattr(order.payment_status, 'value') else str(order.payment_status),
               order.payment_method or 'N/A',
               f"{float(order.total_amount):.2f}",
               order.shipping_method or 'N/A',
               order.tracking_number or 'N/A',
               items_text
           ])

       # Create response
       output.seek(0)

       return Response(
           output.getvalue(),
           mimetype='text/csv',
           headers={
               "Content-Disposition": f"attachment; filename=orders_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
           }
       )

   except Exception as e:
       logger.error(f"Error exporting orders: {str(e)}")
       return jsonify({"error": "Failed to export orders", "details": str(e)}), 500

@admin_order_routes.route('/api/admin/orders/<int:order_id>/resend-confirmation', methods=['POST', 'OPTIONS'])
@jwt_required()
@require_admin()
def resend_order_confirmation(order_id):
   """Resend order confirmation email."""
   if request.method == 'OPTIONS':
       return jsonify({'status': 'ok'}), 200

   try:
       order = db.session.get(Order, order_id)
       if not order:
           return jsonify({"error": "Order not found"}), 404

       user = db.session.get(User, order.user_id) if order.user_id else None

       if not user or not user.email:
           return jsonify({"error": "No valid email address associated with this order"}), 400

       # Get order items
       order_items = OrderItem.query.filter_by(order_id=order_id).all()
       items_data = []

       for item in order_items:
           product = db.session.get(Product, item.product_id)
           product_name = product.name if product else "Unknown Product"

           items_data.append({
               'product_name': product_name,
               'quantity': item.quantity,
               'price': float(item.price),
               'total': float(item.total)
           })

       # Log the email sending (actual email sending would be implemented here)
       logger.info(f"Resending confirmation for order {order_id} to {user.email}")

       return jsonify({
           "message": "Order confirmation email resent successfully",
           "sent_to": user.email
       }), 200

   except Exception as e:
       logger.error(f"Error resending order confirmation {order_id}: {str(e)}")
       return jsonify({"error": "Failed to resend order confirmation", "details": str(e)}), 500
