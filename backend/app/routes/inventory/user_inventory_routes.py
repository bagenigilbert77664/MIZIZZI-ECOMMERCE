"""
User inventory routes for Mizizzi E-commerce platform.
Handles user-facing inventory operations like viewing, reserving, and cart validation.
"""
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, and_, or_, text
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone
import logging
import threading
import uuid

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint for user inventory routes
user_inventory_routes = Blueprint('user_inventory_routes', __name__)

# Lock for inventory operations to prevent race conditions
inventory_locks = {}

def get_inventory_lock(product_id, variant_id=None):
    """Get a lock for a specific product/variant combination"""
    key = f"{product_id}_{variant_id}"
    if key not in inventory_locks:
        inventory_locks[key] = threading.Lock()
    return inventory_locks[key]

# =====================================================
# USER INVENTORY ROUTES
# =====================================================

@user_inventory_routes.route('/', methods=['GET', 'OPTIONS'])
def get_all_inventory():
    """Get all inventory items (public endpoint with filters)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        # Import models here to avoid circular imports
        from app.models.models import Inventory, Product, ProductVariant
        from app.schemas.inventory_schema import inventories_schema
        from app.configuration.extensions import db

        # Get query parameters
        product_id = request.args.get('product_id', type=int)
        variant_id = request.args.get('variant_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Build query
        query = Inventory.query

        if product_id:
            query = query.filter(Inventory.product_id == product_id)
        if variant_id:
            query = query.filter(Inventory.variant_id == variant_id)
        if status:
            query = query.filter(Inventory.status == status)

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Prepare response with additional calculated fields
        inventory_items = []
        for item in pagination.items:
            available_quantity = max(0, item.stock_level - item.reserved_quantity)
            item_data = {
                'id': item.id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'stock_level': item.stock_level,
                'reserved_quantity': item.reserved_quantity,
                'available_quantity': available_quantity,
                'reorder_level': item.reorder_level,
                'low_stock_threshold': item.low_stock_threshold,
                'sku': item.sku,
                'location': item.location,
                'status': item.status,
                'is_in_stock': available_quantity > 0,
                'is_low_stock': 0 < available_quantity <= item.low_stock_threshold,
                'last_updated': item.last_updated.isoformat() if item.last_updated else None,
                'created_at': item.created_at.isoformat() if item.created_at else None
            }
            inventory_items.append(item_data)

        return jsonify({
            'success': True,
            'inventory': inventory_items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory", "details": str(e)}), 500

@user_inventory_routes.route('/availability/<int:product_id>', methods=['GET', 'OPTIONS'])
def check_availability(product_id):
    """Check product availability (public endpoint)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        variant_id = request.args.get('variant_id', type=int)
        requested_quantity = request.args.get('quantity', 1, type=int)

        if requested_quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400

        # Find inventory item
        inventory = Inventory.query.filter_by(
            product_id=product_id,
            variant_id=variant_id
        ).first()

        if not inventory:
            # If no inventory record exists, create one from product data
            product = db.session.get(Product, product_id)
            if not product:
                return jsonify({"error": "Product not found"}), 404

            if variant_id:
                variant = db.session.get(ProductVariant, variant_id)
                if not variant:
                    return jsonify({"error": "Variant not found"}), 404
                available = getattr(variant, 'stock', product.stock_quantity or 0)
            else:
                available = product.stock_quantity or 0

            # Create inventory record
            inventory = Inventory(
                product_id=product_id,
                variant_id=variant_id,
                stock_level=available,
                reserved_quantity=0,
                status='active' if available > 0 else 'out_of_stock'
            )
            db.session.add(inventory)
            db.session.commit()

        # Calculate availability
        available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)
        is_available = available_quantity >= requested_quantity
        can_fulfill = is_available

        return jsonify({
            "success": True,
            "product_id": product_id,
            "variant_id": variant_id,
            "requested_quantity": requested_quantity,
            "available_quantity": available_quantity,
            "available": available_quantity > 0,
            "is_available": is_available,
            "can_fulfill": can_fulfill,
            "status": inventory.status,
            "stock_level": inventory.stock_level,
            "reserved_quantity": inventory.reserved_quantity,
            "is_low_stock": inventory.is_low_stock(),
            "last_updated": inventory.last_updated.isoformat() if inventory.last_updated else None
        }), 200

    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}")
        return jsonify({"error": "Failed to check availability", "details": str(e)}), 500

@user_inventory_routes.route('/product/<int:product_id>', methods=['GET', 'OPTIONS'])
def get_product_inventory(product_id):
    """Get inventory for a specific product (public endpoint)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        # Check if variant_id is provided
        variant_id = request.args.get('variant_id', type=int)

        if variant_id:
            # Get inventory for specific product variant
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # Create inventory from product/variant data
                product = db.session.get(Product, product_id)
                if not product:
                    return jsonify({"error": "Product not found"}), 404

                variant = db.session.get(ProductVariant, variant_id)
                if variant and variant.product_id == product_id:
                    stock_level = getattr(variant, 'stock', product.stock_quantity or 0)
                else:
                    stock_level = product.stock_quantity or 0

                # Create inventory record
                inventory = Inventory(
                    product_id=product_id,
                    variant_id=variant_id,
                    stock_level=stock_level,
                    reserved_quantity=0,
                    status='active' if stock_level > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                db.session.commit()

            # Calculate available quantity
            available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)

            # Prepare response
            response = {
                'id': inventory.id,
                'product_id': inventory.product_id,
                'variant_id': inventory.variant_id,
                'stock_level': inventory.stock_level,
                'reserved_quantity': inventory.reserved_quantity,
                'available_quantity': available_quantity,
                'reorder_level': inventory.reorder_level,
                'low_stock_threshold': inventory.low_stock_threshold,
                'sku': inventory.sku,
                'location': inventory.location,
                'status': inventory.status,
                'is_in_stock': available_quantity > 0,
                'is_low_stock': 0 < available_quantity <= inventory.low_stock_threshold,
                'last_updated': inventory.last_updated.isoformat() if inventory.last_updated else None,
                'created_at': inventory.created_at.isoformat() if inventory.created_at else None
            }

            return jsonify(response), 200

        else:
            # Get all inventory items for the product
            inventory_items = Inventory.query.filter_by(product_id=product_id).all()

            if not inventory_items:
                # Create inventory from product data
                product = db.session.get(Product, product_id)
                if not product:
                    return jsonify({"error": "Product not found"}), 404

                inventory = Inventory(
                    product_id=product_id,
                    variant_id=None,
                    stock_level=product.stock_quantity or 0,
                    reserved_quantity=0,
                    status='active' if (product.stock_quantity or 0) > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                db.session.commit()
                inventory_items = [inventory]

            # Prepare response with additional calculated fields
            response = []
            for item in inventory_items:
                available_quantity = max(0, item.stock_level - item.reserved_quantity)
                item_data = {
                    'id': item.id,
                    'product_id': item.product_id,
                    'variant_id': item.variant_id,
                    'stock_level': item.stock_level,
                    'reserved_quantity': item.reserved_quantity,
                    'available_quantity': available_quantity,
                    'reorder_level': item.reorder_level,
                    'low_stock_threshold': item.low_stock_threshold,
                    'sku': item.sku,
                    'location': item.location,
                    'status': item.status,
                    'is_in_stock': available_quantity > 0,
                    'is_low_stock': 0 < available_quantity <= item.low_stock_threshold,
                    'last_updated': item.last_updated.isoformat() if item.last_updated else None,
                    'created_at': item.created_at.isoformat() if item.created_at else None
                }
                response.append(item_data)

            return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting product inventory: {str(e)}")
        return jsonify({"error": "Failed to retrieve product inventory", "details": str(e)}), 500

@user_inventory_routes.route('/reserve/<int:product_id>', methods=['POST', 'OPTIONS'])
@jwt_required()
def reserve_inventory(product_id):
    """Reserve inventory for a product (e.g., when adding to cart)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        # Handle JSON parsing errors
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "Invalid JSON format"}), 400

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        try:
            quantity = int(data['quantity'])
        except (ValueError, TypeError):
            return jsonify({"error": "Quantity must be an integer"}), 400

        variant_id = data.get('variant_id')
        reservation_id = data.get('reservation_id')  # Cart ID or session ID

        if quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400

        # Get lock for this inventory item
        with get_inventory_lock(product_id, variant_id):
            # Find inventory item
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # If no inventory record exists, check the product's stock
                product = db.session.get(Product, product_id)
                if not product:
                    return jsonify({"error": "Product not found"}), 404

                if variant_id:
                    variant = db.session.get(ProductVariant, variant_id)
                    if not variant:
                        return jsonify({"error": "Variant not found"}), 404
                    available = getattr(variant, 'stock', product.stock_quantity or 0)
                else:
                    available = product.stock_quantity or 0

                # Create inventory record
                try:
                    inventory = Inventory(
                        product_id=product_id,
                        variant_id=variant_id,
                        stock_level=available,
                        reserved_quantity=0,
                        status='active' if available > 0 else 'out_of_stock'
                    )
                    db.session.add(inventory)
                    db.session.flush()  # Get ID without committing
                except IntegrityError:
                    # Handle race condition where another request created the inventory
                    db.session.rollback()
                    inventory = Inventory.query.filter_by(
                        product_id=product_id,
                        variant_id=variant_id
                    ).first()
                    if not inventory:
                        return jsonify({"error": "Failed to create inventory record"}), 500

            # Check if enough stock is available
            available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)
            if quantity > available_quantity:
                return jsonify({
                    "error": "Insufficient stock",
                    "available": available_quantity,
                    "requested": quantity
                }), 400

            # Reserve stock
            inventory.reserved_quantity += quantity
            inventory.update_status()

            # Generate reservation ID if not provided
            if not reservation_id:
                reservation_id = f"res_{product_id}_{variant_id}_{datetime.now().timestamp()}"

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Stock reserved successfully",
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": quantity,
                "reservation_id": reservation_id,
                "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
                "inventory": {
                    'id': inventory.id,
                    'stock_level': inventory.stock_level,
                    'reserved_quantity': inventory.reserved_quantity,
                    'status': inventory.status
                },
                "reserved_quantity": quantity,
                "remaining_available": max(0, inventory.stock_level - inventory.reserved_quantity)
            }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error reserving inventory: {str(e)}")
        return jsonify({"error": "Failed to reserve inventory", "details": str(e)}), 500

@user_inventory_routes.route('/release/<int:product_id>', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def release_inventory(product_id):
    """Release previously reserved inventory (e.g., when removing from cart)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory
        from app.configuration.extensions import db

        # Check authentication
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"msg": "Missing Authorization Header"}), 401

        # Handle JSON parsing errors
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "Invalid JSON format"}), 400

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        try:
            quantity = int(data['quantity'])
        except (ValueError, TypeError):
            return jsonify({"error": "Quantity must be an integer"}), 400

        variant_id = data.get('variant_id')
        reservation_id = data.get('reservation_id')  # Cart ID or session ID

        if quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400

        # Get lock for this inventory item
        with get_inventory_lock(product_id, variant_id):
            # Find inventory item
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # If reservation_id is provided but inventory not found, treat as invalid reservation
                if reservation_id:
                    return jsonify({"error": "Invalid reservation ID"}), 400
                return jsonify({"error": "Inventory not found"}), 404

            # Check if enough stock is reserved
            if quantity > inventory.reserved_quantity:
                return jsonify({
                    "error": "Cannot release more than reserved",
                    "reserved": inventory.reserved_quantity,
                    "requested": quantity
                }), 400

            # Release stock
            inventory.reserved_quantity -= quantity
            inventory.update_status()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Stock released successfully",
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": quantity,
                "inventory": {
                    'id': inventory.id,
                    'stock_level': inventory.stock_level,
                    'reserved_quantity': inventory.reserved_quantity,
                    'status': inventory.status
                },
                "released_quantity": quantity,
                "new_available": max(0, inventory.stock_level - inventory.reserved_quantity)
            }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error releasing inventory: {str(e)}")
        return jsonify({"error": "Failed to release inventory", "details": str(e)}), 500

@user_inventory_routes.route('/commit/<int:product_id>', methods=['POST', 'OPTIONS'])
@jwt_required()
def commit_inventory(product_id):
    """Commit reserved inventory (e.g., when completing an order)."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        # Handle JSON parsing errors
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "Invalid JSON format"}), 400

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        try:
            quantity = int(data['quantity'])
        except (ValueError, TypeError):
            return jsonify({"error": "Quantity must be an integer"}), 400

        variant_id = data.get('variant_id')
        reservation_id = data.get('reservation_id')  # Cart ID or session ID
        order_id = data.get('order_id')

        if quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400

        if not reservation_id:
            return jsonify({"error": "Reservation ID is required"}), 400

        # Get lock for this inventory item
        with get_inventory_lock(product_id, variant_id):
            # Find inventory item
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # If reservation_id is provided but inventory not found, treat as invalid reservation
                return jsonify({"error": "Invalid reservation ID"}), 400

            # Check if enough stock is reserved
            if quantity > inventory.reserved_quantity:
                return jsonify({
                    "error": "Cannot commit more than reserved",
                    "reserved": inventory.reserved_quantity,
                    "requested": quantity
                }), 400

            # Reduce stock level and reserved quantity
            inventory.stock_level -= quantity
            inventory.reserved_quantity -= quantity

            # Ensure values don't go below zero
            if inventory.stock_level < 0:
                inventory.stock_level = 0
            if inventory.reserved_quantity < 0:
                inventory.reserved_quantity = 0

            # Update status based on stock level
            inventory.update_status()

            db.session.commit()

            # Update product stock for backward compatibility
            if not variant_id:
                product = db.session.get(Product, product_id)
                if product:
                    product.stock_quantity = inventory.stock_level
                    db.session.commit()

            return jsonify({
                "success": True,
                "message": "Stock committed successfully",
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": quantity,
                "inventory": {
                    'id': inventory.id,
                    'stock_level': inventory.stock_level,
                    'reserved_quantity': inventory.reserved_quantity,
                    'status': inventory.status
                },
                "committed_quantity": quantity,
                "new_stock_level": inventory.stock_level
            }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error committing inventory: {str(e)}")
        return jsonify({"error": "Failed to commit inventory", "details": str(e)}), 500

@user_inventory_routes.route('/validate-cart', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def validate_cart_items():
    """Validate cart items against inventory."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product, ProductVariant, Cart, CartItem
        from app.configuration.extensions import db

        # Handle case where no JSON data is provided
        if not request.is_json:
            data = {}
        else:
            try:
                data = request.get_json() or {}
            except Exception as e:
                return jsonify({"error": "Invalid JSON format"}), 400

        # Handle different input formats
        if not data:
            # Try to get user's active cart
            try:
                current_user_id = get_jwt_identity()
                if current_user_id:
                    cart = Cart.query.filter_by(user_id=current_user_id, is_active=True).first()
                    if cart:
                        # Eagerly load the items to avoid lazy loading issues
                        items_query = CartItem.query.filter_by(cart_id=cart.id).all()
                        items = [{
                            'product_id': item.product_id,
                            'variant_id': item.variant_id,
                            'quantity': item.quantity
                        } for item in items_query]
                    else:
                        items = []
                else:
                    items = []
            except:
                items = []
        elif 'items' in data:
            items = data['items']
        elif 'cart_id' in data:
            # Get items from specific cart
            cart_id = data['cart_id']
            items_query = CartItem.query.filter_by(cart_id=cart_id).all()
            items = [{
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity
            } for item in items_query]
        elif 'guest_cart_id' in data:
            # Handle guest cart validation
            cart = Cart.query.filter_by(guest_id=data['guest_cart_id'], is_active=True).first()
            if cart:
                # Eagerly load the items to avoid lazy loading issues
                items_query = CartItem.query.filter_by(cart_id=cart.id).all()
                items = [{
                    'product_id': item.product_id,
                    'variant_id': item.variant_id,
                    'quantity': item.quantity
                } for item in items_query]
            else:
                return jsonify({"error": "Guest cart not found"}), 404
        else:
            return jsonify({"error": "Items are required"}), 400

        if not isinstance(items, list):
            return jsonify({"error": "Items must be an array"}), 400

        errors = []
        warnings = []
        validated_items = []

        # Validate each item
        for item in items:
            if not isinstance(item, dict) or 'product_id' not in item or 'quantity' not in item:
                errors.append({
                    "message": "Invalid item format",
                    "code": "invalid_format"
                })
                continue

            product_id = item['product_id']
            variant_id = item.get('variant_id')
            quantity = item['quantity']

            # Find inventory item
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # If no inventory record exists, check the product's stock
                product = db.session.get(Product, product_id)
                if not product:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Product with ID {product_id} not found",
                        "code": "product_not_found"
                    })
                    continue

                if variant_id:
                    variant = db.session.get(ProductVariant, variant_id)
                    if not variant:
                        errors.append({
                            "product_id": product_id,
                            "variant_id": variant_id,
                            "message": f"Variant with ID {variant_id} not found",
                            "code": "variant_not_found"
                        })
                        continue
                    available = getattr(variant, 'stock', product.stock_quantity or 0)
                else:
                    available = product.stock_quantity or 0

                if available <= 0:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Product '{product.name}' is out of stock",
                        "code": "out_of_stock",
                        "available_stock": 0
                    })
                    continue

                if quantity > available:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Requested quantity ({quantity}) exceeds available stock ({available}) for product '{product.name}'",
                        "code": "insufficient_stock",
                        "available_stock": available
                    })
                    continue

                # Add warning if stock is low
                if available <= 5:  # Assuming 5 is the low stock threshold
                    warnings.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Only {available} items left in stock for product '{product.name}'",
                        "code": "low_stock",
                        "available_stock": available
                    })

                validated_items.append({
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "requested_quantity": quantity,
                    "available_quantity": available,
                    "can_fulfill": True,
                    "status": "active"
                })

            else:
                # Calculate available quantity
                available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)

                if available_quantity <= 0:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Product is out of stock",
                        "code": "out_of_stock",
                        "available_stock": 0
                    })
                    continue

                if quantity > available_quantity:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Requested quantity ({quantity}) exceeds available stock ({available_quantity})",
                        "code": "insufficient_stock",
                        "available_stock": available_quantity
                    })
                    continue

                # Add warning if stock is low
                if available_quantity <= inventory.low_stock_threshold:
                    warnings.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Only {available_quantity} items left in stock",
                        "code": "low_stock",
                        "available_stock": available_quantity
                    })

                validated_items.append({
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "requested_quantity": quantity,
                    "available_quantity": available_quantity,
                    "can_fulfill": True,
                    "status": inventory.status
                })

        return jsonify({
            "success": True,
            "valid": len(errors) == 0,
            "is_valid": len(errors) == 0,
            "items": validated_items,
            "errors": errors,
            "warnings": warnings,
            "validated_at": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error validating cart items: {str(e)}")
        return jsonify({"error": "Failed to validate cart items", "details": str(e)}), 500

@user_inventory_routes.route('/complete-order/<int:order_id>', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def complete_order_inventory(order_id):
    """Reduce inventory when an order is completed."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Order, OrderItem, User, UserRole, Inventory, Product
        from app.configuration.extensions import db

        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"msg": "Missing Authorization Header"}), 401

        # Get the order with eager loading
        order = db.session.query(Order).options(
            db.joinedload(Order.items)
        ).filter_by(id=order_id).first()

        if not order:
            return jsonify({"error": "Order not found"}), 404

        # Verify user owns this order or is admin
        user = db.session.get(User, current_user_id)
        if str(order.user_id) != str(current_user_id) and (not user or user.role != UserRole.ADMIN):
            return jsonify({"error": "Unauthorized"}), 403

        # Only process if order is being marked as delivered/completed
        if hasattr(order.status, 'value'):
            order_status = order.status.value
        else:
            order_status = str(order.status)

        if order_status not in ['delivered']:
            logger.info(f"Order {order_id} status is {order.status}, inventory will only be reduced when status is 'delivered'")
            return jsonify({
                "success": True,
                "message": "Order not ready for inventory reduction",
                "order_id": order_id,
                "inventory_updated": False,
                "items_processed": 0,
                "inventory_updates": []
            }), 200

        # Process each order item
        inventory_updates = []
        items_processed = 0

        for order_item in order.items:
            with get_inventory_lock(order_item.product_id, order_item.variant_id):
                # Find or create inventory record
                inventory = Inventory.query.filter_by(
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id
                ).first()

                if not inventory:
                    # Create inventory record if it doesn't exist
                    product = db.session.get(Product, order_item.product_id)
                    if product:
                        inventory = Inventory(
                            product_id=order_item.product_id,
                            variant_id=order_item.variant_id,
                            stock_level=max(0, (product.stock_quantity or 0) - order_item.quantity),
                            reserved_quantity=0,
                            status='active' if ((product.stock_quantity or 0) - order_item.quantity) > 0 else 'out_of_stock'
                        )
                        db.session.add(inventory)

                        # Also update the product stock
                        product.stock_quantity = max(0, (product.stock_quantity or 0) - order_item.quantity)

                        inventory_updates.append({
                            'product_id': order_item.product_id,
                            'variant_id': order_item.variant_id,
                            'quantity_reduced': order_item.quantity,
                            'new_stock': inventory.stock_level
                        })
                else:
                    # Check if we have enough stock
                    if order_item.quantity > inventory.stock_level:
                        return jsonify({
                            "error": f"Insufficient stock for product {order_item.product_id}. Available: {inventory.stock_level}, Required: {order_item.quantity}"
                        }), 400

                    # Reduce existing inventory
                    old_stock = inventory.stock_level
                    inventory.stock_level = max(0, inventory.stock_level - order_item.quantity)
                    inventory.update_status()

                    # Also update the product stock for backward compatibility
                    product = db.session.get(Product, order_item.product_id)
                    if product:
                        product.stock_quantity = inventory.stock_level

                    inventory_updates.append({
                        'product_id': order_item.product_id,
                        'variant_id': order_item.variant_id,
                        'quantity_reduced': order_item.quantity,
                        'old_stock': old_stock,
                        'new_stock': inventory.stock_level
                    })

                items_processed += 1
                logger.info(f"Reduced inventory for product {order_item.product_id} by {order_item.quantity}")

        # Commit all changes
        db.session.commit()

        logger.info(f"Successfully reduced inventory for order {order_id}: {inventory_updates}")

        return jsonify({
            "success": True,
            "message": "Inventory reduced successfully",
            "order_id": order_id,
            "inventory_updated": True,
            "items_processed": items_processed,
            "inventory_updates": inventory_updates
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error reducing inventory for order {order_id}: {str(e)}")
        return jsonify({"error": "Failed to reduce inventory", "details": str(e)}), 500

@user_inventory_routes.route('/batch-availability', methods=['POST', 'OPTIONS'])
def batch_check_availability():
    """Check availability for multiple products at once."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        # Handle JSON parsing errors
        try:
            data = request.get_json()
        except Exception as e:
            return jsonify({"error": "Invalid JSON format"}), 400

        if not data or 'items' not in data:
            return jsonify({"error": "Items are required"}), 400

        items = data['items']
        if not isinstance(items, list):
            return jsonify({"error": "Items must be an array"}), 400

        results = []

        for item in items:
            if not isinstance(item, dict) or 'product_id' not in item:
                results.append({
                    "error": "Invalid item format - product_id required",
                    "item": item
                })
                continue

            product_id = item['product_id']
            variant_id = item.get('variant_id')
            requested_quantity = item.get('quantity', 1)

            try:
                # Find inventory item
                inventory = Inventory.query.filter_by(
                    product_id=product_id,
                    variant_id=variant_id
                ).first()

                if not inventory:
                    # Create from product data
                    product = db.session.get(Product, product_id)
                    if not product:
                        results.append({
                            "product_id": product_id,
                            "variant_id": variant_id,
                            "available": False,
                            "error": "Product not found"
                        })
                        continue

                    if variant_id:
                        variant = db.session.get(ProductVariant, variant_id)
                        if not variant:
                            results.append({
                                "product_id": product_id,
                                "variant_id": variant_id,
                                "available": False,
                                "error": "Variant not found"
                            })
                            continue
                        available = getattr(variant, 'stock', product.stock_quantity or 0)
                    else:
                        available = product.stock_quantity or 0

                    # Create inventory record
                    inventory = Inventory(
                        product_id=product_id,
                        variant_id=variant_id,
                        stock_level=available,
                        reserved_quantity=0,
                        status='active' if available > 0 else 'out_of_stock'
                    )
                    db.session.add(inventory)

                # Calculate availability
                available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)
                is_available = available_quantity >= requested_quantity

                results.append({
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "requested_quantity": requested_quantity,
                    "available_quantity": available_quantity,
                    "available": available_quantity > 0,
                    "is_available": is_available,
                    "can_fulfill": is_available,
                    "status": inventory.status,
                    "is_low_stock": inventory.is_low_stock()
                })

            except Exception as e:
                results.append({
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "available": False,
                    "error": str(e)
                })

        db.session.commit()

        return jsonify({
            "success": True,
            "results": results,
            "total_items": len(results),
            "checked_at": datetime.now().isoformat()
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error in batch availability check: {str(e)}")
        return jsonify({"error": "Failed to check availability", "details": str(e)}), 500

@user_inventory_routes.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check endpoint for inventory system."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.configuration.extensions import db

        # Check database connectivity
        db.session.execute(text('SELECT 1'))

        return jsonify({
            "status": "healthy",
            "service": "user_inventory",
            "timestamp": datetime.now().isoformat(),
            "endpoints": [
                "/api/inventory/user/",
                "/api/inventory/user/availability/<product_id>",
                "/api/inventory/user/product/<product_id>",
                "/api/inventory/user/reserve/<product_id>",
                "/api/inventory/user/release/<product_id>",
                "/api/inventory/user/commit/<product_id>",
                "/api/inventory/user/validate-cart",
                "/api/inventory/user/batch-availability",
                "/api/inventory/user/complete-order/<order_id>",
                "/api/inventory/user/health"
            ]
        }), 200

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "service": "user_inventory",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500
