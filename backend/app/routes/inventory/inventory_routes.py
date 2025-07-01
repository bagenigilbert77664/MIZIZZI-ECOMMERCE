"""
Fixed Inventory management routes for Mizizzi E-commerce platform.
This ensures inventory is properly reduced when orders are completed.
"""
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_, or_
from sqlalchemy.exc import IntegrityError
from ...models.models import Inventory, Product, ProductVariant, User, UserRole, db, Order, OrderItem, OrderStatus
from ...schemas.inventory_schema import inventory_schema, inventories_schema
from ...configuration.extensions import db
from ...validations.validation import admin_required
import logging
import threading
import time
from datetime import datetime, timedelta

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint with a proper name
inventory_routes = Blueprint('inventory', __name__)

# Lock for inventory operations to prevent race conditions
inventory_locks = {}

def get_inventory_lock(product_id, variant_id=None):
    """Get a lock for a specific product/variant combination"""
    key = f"{product_id}_{variant_id}"
    if key not in inventory_locks:
        inventory_locks[key] = threading.Lock()
    return inventory_locks[key]

# CRITICAL: Add order completion handler to reduce inventory
@inventory_routes.route('/complete-order/<int:order_id>', methods=['POST'])
@jwt_required()
def complete_order_inventory(order_id):
    """Reduce inventory when an order is completed."""
    try:
        current_user_id = get_jwt_identity()

        # Get the order
        order = Order.query.get_or_404(order_id)

        # Verify user owns this order or is admin
        user = User.query.get(current_user_id)
        if str(order.user_id) != current_user_id and user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        # Only process if order is being marked as delivered/completed
        if order.status not in [OrderStatus.DELIVERED, OrderStatus.PROCESSING]:
            logger.info(f"Order {order_id} status is {order.status}, not reducing inventory yet")
            return jsonify({"message": "Order not ready for inventory reduction"}), 200

        # Process each order item
        inventory_updates = []

        for order_item in order.items:
            with get_inventory_lock(order_item.product_id, order_item.variant_id):
                # Find or create inventory record
                inventory = Inventory.query.filter_by(
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id
                ).first()

                if not inventory:
                    # Create inventory record if it doesn't exist
                    product = Product.query.get(order_item.product_id)
                    if product:
                        inventory = Inventory(
                            product_id=order_item.product_id,
                            variant_id=order_item.variant_id,
                            stock_level=max(0, product.stock - order_item.quantity),
                            reserved_quantity=0,
                            status='active' if (product.stock - order_item.quantity) > 0 else 'out_of_stock'
                        )
                        db.session.add(inventory)

                        # Also update the product stock
                        product.stock = max(0, product.stock - order_item.quantity)

                        inventory_updates.append({
                            'product_id': order_item.product_id,
                            'variant_id': order_item.variant_id,
                            'quantity_reduced': order_item.quantity,
                            'new_stock': inventory.stock_level
                        })
                else:
                    # Reduce existing inventory
                    old_stock = inventory.stock_level
                    inventory.stock_level = max(0, inventory.stock_level - order_item.quantity)
                    inventory.update_status()

                    # Also update the product stock for backward compatibility
                    product = Product.query.get(order_item.product_id)
                    if product:
                        product.stock = inventory.stock_level

                    inventory_updates.append({
                        'product_id': order_item.product_id,
                        'variant_id': order_item.variant_id,
                        'quantity_reduced': order_item.quantity,
                        'old_stock': old_stock,
                        'new_stock': inventory.stock_level
                    })

                logger.info(f"Reduced inventory for product {order_item.product_id} by {order_item.quantity}")

        # Commit all changes
        db.session.commit()

        logger.info(f"Successfully reduced inventory for order {order_id}: {inventory_updates}")

        return jsonify({
            "message": "Inventory reduced successfully",
            "order_id": order_id,
            "inventory_updates": inventory_updates
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reducing inventory for order {order_id}: {str(e)}")
        return jsonify({"error": "Failed to reduce inventory", "details": str(e)}), 500

# RESTful route for getting all inventory items
@inventory_routes.route('/', methods=['GET'])
@jwt_required()
@admin_required
def get_all_inventory():
    """Get all inventory items with pagination and filtering."""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Get filter parameters
        product_id = request.args.get('product_id', type=int)
        variant_id = request.args.get('variant_id', type=int)
        status = request.args.get('status')
        low_stock = request.args.get('low_stock', '').lower() == 'true'
        out_of_stock = request.args.get('out_of_stock', '').lower() == 'true'
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'product_id')
        sort_dir = request.args.get('sort_dir', 'asc')

        # Build query
        query = Inventory.query

        # Apply filters
        if product_id:
            query = query.filter_by(product_id=product_id)

        if variant_id:
            query = query.filter_by(variant_id=variant_id)

        if status:
            query = query.filter_by(status=status)

        if low_stock:
            query = query.filter(Inventory.stock_level <= Inventory.low_stock_threshold,
                                Inventory.stock_level > 0)

        if out_of_stock:
            query = query.filter(Inventory.stock_level <= 0)

        if search:
            # Join with Product to search by product name or SKU
            query = query.join(Product, Inventory.product_id == Product.id)
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Inventory.sku.ilike(search_term)
                )
            )

        # Apply sorting
        if sort_by == 'product_name':
            query = query.join(Product, Inventory.product_id == Product.id)
            if sort_dir.lower() == 'desc':
                query = query.order_by(Product.name.desc())
            else:
                query = query.order_by(Product.name.asc())
        elif sort_by == 'stock_level':
            if sort_dir.lower() == 'desc':
                query = query.order_by(Inventory.stock_level.desc())
            else:
                query = query.order_by(Inventory.stock_level.asc())
        elif sort_by == 'last_updated':
            if sort_dir.lower() == 'desc':
                query = query.order_by(Inventory.last_updated.desc())
            else:
                query = query.order_by(Inventory.last_updated.asc())
        else:
            # Default sort by product_id
            if sort_dir.lower() == 'desc':
                query = query.order_by(Inventory.product_id.desc())
            else:
                query = query.order_by(Inventory.product_id.asc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        result = {
            "items": inventories_schema.dump(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory", "details": str(e)}), 500

# RESTful route for getting a specific inventory item
@inventory_routes.route('/<int:inventory_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_inventory(inventory_id):
    """Get inventory item by ID."""
    try:
        inventory = Inventory.query.get_or_404(inventory_id)

        # Get product details
        product = Product.query.get(inventory.product_id)
        product_data = None
        if product:
            product_data = {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "is_active": product.is_active
            }

        # Get variant details if applicable
        variant_data = None
        if inventory.variant_id:
            variant = ProductVariant.query.get(inventory.variant_id)
            if variant:
                variant_data = {
                    "id": variant.id,
                    "color": variant.color,
                    "size": variant.size,
                    "sku": variant.sku
                }

        # Prepare response
        inventory_data = inventory_schema.dump(inventory)
        inventory_data["product"] = product_data
        inventory_data["variant"] = variant_data

        return jsonify(inventory_data), 200

    except Exception as e:
        logger.error(f"Error getting inventory item: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory item", "details": str(e)}), 500

# RESTful route for getting inventory for a specific product
@inventory_routes.route('/product/<int:product_id>', methods=['GET'])
def get_product_inventory(product_id):
    """Get inventory for a specific product (public endpoint)."""
    try:
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
                product = Product.query.get_or_404(product_id)
                variant = ProductVariant.query.get(variant_id)

                if variant and variant.product_id == product_id:
                    stock_level = variant.stock if hasattr(variant, 'stock') else product.stock
                else:
                    stock_level = product.stock

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
            response = inventory_schema.dump(inventory)
            response["available_quantity"] = available_quantity
            response["is_in_stock"] = available_quantity > 0
            response["is_low_stock"] = 0 < available_quantity <= inventory.low_stock_threshold

            return jsonify(response), 200
        else:
            # Get all inventory items for the product
            inventory_items = Inventory.query.filter_by(product_id=product_id).all()

            if not inventory_items:
                # Create inventory from product data
                product = Product.query.get_or_404(product_id)

                inventory = Inventory(
                    product_id=product_id,
                    variant_id=None,
                    stock_level=product.stock,
                    reserved_quantity=0,
                    status='active' if product.stock > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                db.session.commit()
                inventory_items = [inventory]

            # Prepare response with additional calculated fields
            response = []
            for item in inventory_items:
                available_quantity = max(0, item.stock_level - item.reserved_quantity)
                item_data = inventory_schema.dump(item)
                item_data["available_quantity"] = available_quantity
                item_data["is_in_stock"] = available_quantity > 0
                item_data["is_low_stock"] = 0 < available_quantity <= item.low_stock_threshold
                response.append(item_data)

            return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting product inventory: {str(e)}")
        return jsonify({"error": "Failed to retrieve product inventory", "details": str(e)}), 500

# RESTful route for creating a new inventory item
@inventory_routes.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_inventory():
    """Create a new inventory item."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'product_id' not in data:
            return jsonify({"error": "Product ID is required"}), 400

        # Check if product exists
        product = Product.query.get(data['product_id'])
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Check if variant exists if variant_id is provided
        if data.get('variant_id'):
            variant = ProductVariant.query.get(data['variant_id'])
            if not variant or variant.product_id != data['product_id']:
                return jsonify({"error": "Invalid variant ID"}), 400

        # Check if inventory already exists for this product/variant
        existing = Inventory.query.filter_by(
            product_id=data['product_id'],
            variant_id=data.get('variant_id')
        ).first()

        if existing:
            return jsonify({"error": "Inventory already exists for this product/variant combination"}), 409

        # Create new inventory item
        new_inventory = Inventory(
            product_id=data['product_id'],
            variant_id=data.get('variant_id'),
            stock_level=data.get('stock_level', 0),
            reserved_quantity=data.get('reserved_quantity', 0),
            reorder_level=data.get('reorder_level', 5),
            low_stock_threshold=data.get('low_stock_threshold', 5),
            sku=data.get('sku'),
            location=data.get('location'),
            status=data.get('status', 'active')
        )

        db.session.add(new_inventory)
        db.session.commit()

        # Update product stock for backward compatibility
        if not data.get('variant_id'):
            product.stock = new_inventory.stock_level
            db.session.commit()

        return jsonify({
            "message": "Inventory created successfully",
            "inventory": inventory_schema.dump(new_inventory)
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error creating inventory: {str(e)}")
        return jsonify({"error": "Inventory already exists for this product/variant combination"}), 409

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating inventory: {str(e)}")
        return jsonify({"error": "Failed to create inventory", "details": str(e)}), 500

# RESTful route for updating an inventory item
@inventory_routes.route('/<int:inventory_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_inventory(inventory_id):
    """Update an inventory item."""
    try:
        inventory = Inventory.query.get_or_404(inventory_id)
        data = request.get_json()

        # Get lock for this inventory item
        with get_inventory_lock(inventory.product_id, inventory.variant_id):
            # Update fields if provided
            if 'stock_level' in data:
                inventory.stock_level = data['stock_level']

            if 'reserved_quantity' in data:
                inventory.reserved_quantity = data['reserved_quantity']

            if 'reorder_level' in data:
                inventory.reorder_level = data['reorder_level']

            if 'low_stock_threshold' in data:
                inventory.low_stock_threshold = data['low_stock_threshold']

            if 'sku' in data:
                inventory.sku = data['sku']

            if 'location' in data:
                inventory.location = data['location']

            if 'status' in data:
                inventory.status = data['status']

            # Update status based on stock level
            inventory.update_status()

            db.session.commit()

            # Update product stock for backward compatibility
            if not inventory.variant_id:
                product = Product.query.get(inventory.product_id)
                if product:
                    product.stock = inventory.stock_level
                    db.session.commit()

            return jsonify({
                "message": "Inventory updated successfully",
                "inventory": inventory_schema.dump(inventory)
            }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating inventory: {str(e)}")
        return jsonify({"error": "Failed to update inventory", "details": str(e)}), 500

# RESTful route for adjusting inventory
@inventory_routes.route('/adjust/<int:product_id>', methods=['POST'])
@jwt_required()
@admin_required
def adjust_inventory(product_id):
    """Adjust inventory for a product."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'adjustment' not in data:
            return jsonify({"error": "Adjustment value is required"}), 400

        adjustment = int(data['adjustment'])
        variant_id = data.get('variant_id')
        reason = data.get('reason', 'Manual adjustment')

        # Get lock for this inventory item
        with get_inventory_lock(product_id, variant_id):
            # Find inventory item
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # Create new inventory if it doesn't exist
                inventory = Inventory(
                    product_id=product_id,
                    variant_id=variant_id,
                    stock_level=max(0, adjustment) if adjustment > 0 else 0,
                    status='active' if adjustment > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
            else:
                # Adjust existing inventory
                if adjustment > 0:
                    inventory.increase_stock(adjustment)
                elif adjustment < 0:
                    # Ensure we don't go below zero
                    abs_adjustment = abs(adjustment)
                    if abs_adjustment > inventory.stock_level:
                        return jsonify({
                            "error": "Insufficient stock",
                            "available": inventory.stock_level,
                            "requested": abs_adjustment
                        }), 400

                    inventory.reduce_stock(abs_adjustment)

            # Log the adjustment
            current_user_id = get_jwt_identity()

            # TODO: Add inventory adjustment log entry
            # inventory_log = InventoryLog(
            #     product_id=product_id,
            #     variant_id=variant_id,
            #     adjustment=adjustment,
            #     reason=reason,
            #     user_id=current_user_id,
            #     previous_level=inventory.stock_level - adjustment,
            #     new_level=inventory.stock_level
            # )
            # db.session.add(inventory_log)

            db.session.commit()

            # Update product stock for backward compatibility
            if not variant_id:
                product = Product.query.get(product_id)
                if product:
                    product.stock = inventory.stock_level
                    db.session.commit()

            return jsonify({
                "message": "Inventory adjusted successfully",
                "inventory": inventory_schema.dump(inventory)
            }), 200

    except ValueError:
        return jsonify({"error": "Adjustment must be an integer"}), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adjusting inventory: {str(e)}")
        return jsonify({"error": "Failed to adjust inventory", "details": str(e)}), 500

# RESTful route for checking availability
@inventory_routes.route('/check-availability/<int:product_id>', methods=['GET'])
def check_availability(product_id):
    """Check product availability (public endpoint)."""
    try:
        variant_id = request.args.get('variant_id', type=int)
        requested_quantity = request.args.get('quantity', 1, type=int)

        # Find inventory item
        inventory = Inventory.query.filter_by(
            product_id=product_id,
            variant_id=variant_id
        ).first()

        if not inventory:
            # If no inventory record exists, create one from product data
            product = Product.query.get_or_404(product_id)

            if variant_id:
                variant = ProductVariant.query.get(variant_id)
                if not variant:
                    return jsonify({"error": "Variant not found"}), 404
                available = getattr(variant, 'stock', product.stock)
            else:
                available = product.stock

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

        return jsonify({
            "product_id": product_id,
            "variant_id": variant_id,
            "requested_quantity": requested_quantity,
            "available_quantity": available_quantity,
            "is_available": is_available,
            "status": inventory.status,
            "is_low_stock": inventory.is_low_stock(),
            "last_updated": inventory.last_updated.isoformat() if inventory.last_updated else None
        }), 200

    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}")
        return jsonify({"error": "Failed to check availability", "details": str(e)}), 500

# RESTful route for reserving inventory
@inventory_routes.route('/reserve/<int:product_id>', methods=['POST'])
@jwt_required(optional=True)
def reserve_inventory(product_id):
    """Reserve inventory for a product (e.g., when adding to cart)."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        quantity = int(data['quantity'])
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
                product = Product.query.get_or_404(product_id)

                if variant_id:
                    variant = ProductVariant.query.get(variant_id)
                    if not variant:
                        return jsonify({"error": "Variant not found"}), 404

                    available = variant.stock
                else:
                    available = product.stock

                # Create inventory record
                inventory = Inventory(
                    product_id=product_id,
                    variant_id=variant_id,
                    stock_level=available,
                    reserved_quantity=0,
                    status='active' if available > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                db.session.flush()  # Get ID without committing

            # Check if enough stock is available
            if quantity > inventory.available_quantity:
                return jsonify({
                    "error": "Insufficient stock",
                    "available": inventory.available_quantity,
                    "requested": quantity
                }), 400

            # Reserve stock
            inventory.reserve_stock(quantity)

            # TODO: Add reservation log entry
            # reservation = InventoryReservation(
            #     inventory_id=inventory.id,
            #     reservation_id=reservation_id,
            #     quantity=quantity,
            #     expires_at=datetime.utcnow() + timedelta(minutes=30)  # 30-minute reservation
            # )
            # db.session.add(reservation)

            db.session.commit()

            return jsonify({
                "message": "Stock reserved successfully",
                "inventory": inventory_schema.dump(inventory)
            }), 200

    except ValueError:
        return jsonify({"error": "Quantity must be an integer"}), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reserving inventory: {str(e)}")
        return jsonify({"error": "Failed to reserve inventory", "details": str(e)}), 500

# RESTful route for releasing inventory
@inventory_routes.route('/release/<int:product_id>', methods=['POST'])
@jwt_required(optional=True)
def release_inventory(product_id):
    """Release previously reserved inventory (e.g., when removing from cart)."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        quantity = int(data['quantity'])
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
                return jsonify({"error": "Inventory not found"}), 404

            # Check if enough stock is reserved
            if quantity > inventory.reserved_quantity:
                return jsonify({
                    "error": "Cannot release more than reserved",
                    "reserved": inventory.reserved_quantity,
                    "requested": quantity
                }), 400

            # Release stock
            inventory.release_stock(quantity)

            # TODO: Update or remove reservation log entry
            # InventoryReservation.query.filter_by(
            #     inventory_id=inventory.id,
            #     reservation_id=reservation_id
            # ).delete()

            db.session.commit()

            return jsonify({
                "message": "Stock released successfully",
                "inventory": inventory_schema.dump(inventory)
            }), 200

    except ValueError:
        return jsonify({"error": "Quantity must be an integer"}), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error releasing inventory: {str(e)}")
        return jsonify({"error": "Failed to release inventory", "details": str(e)}), 500

# RESTful route for committing inventory
@inventory_routes.route('/commit/<int:product_id>', methods=['POST'])
@jwt_required()
def commit_inventory(product_id):
    """Commit reserved inventory (e.g., when completing an order)."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'quantity' not in data:
            return jsonify({"error": "Quantity is required"}), 400

        quantity = int(data['quantity'])
        variant_id = data.get('variant_id')
        reservation_id = data.get('reservation_id')  # Cart ID or session ID
        order_id = data.get('order_id')

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
                return jsonify({"error": "Inventory not found"}), 404

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

            # TODO: Add inventory transaction log entry
            # inventory_transaction = InventoryTransaction(
            #     inventory_id=inventory.id,
            #     order_id=order_id,
            #     quantity=quantity,
            #     transaction_type='order',
            #     previous_level=inventory.stock_level + quantity,
            #     new_level=inventory.stock_level
            # )
            # db.session.add(inventory_transaction)

            # TODO: Remove reservation log entry
            # InventoryReservation.query.filter_by(
            #     inventory_id=inventory.id,
            #     reservation_id=reservation_id
            # ).delete()

            db.session.commit()

            # Update product stock for backward compatibility
            if not variant_id:
                product = Product.query.get(product_id)
                if product:
                    product.stock = inventory.stock_level
                    db.session.commit()

            return jsonify({
                "message": "Stock committed successfully",
                "inventory": inventory_schema.dump(inventory)
            }), 200

    except ValueError:
        return jsonify({"error": "Quantity must be an integer"}), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error committing inventory: {str(e)}")
        return jsonify({"error": "Failed to commit inventory", "details": str(e)}), 500

# RESTful route for getting low stock items
@inventory_routes.route('/low-stock', methods=['GET'])
@jwt_required()
@admin_required
def get_low_stock():
    """Get low stock items."""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Build query for low stock items
        query = Inventory.query.filter(
            Inventory.stock_level <= Inventory.low_stock_threshold,
            Inventory.stock_level > 0
        )

        # Order by stock level (lowest first)
        query = query.order_by(Inventory.stock_level)

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        result = {
            "items": inventories_schema.dump(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting low stock items: {str(e)}")
        return jsonify({"error": "Failed to retrieve low stock items", "details": str(e)}), 500

# RESTful route for syncing inventory from products
@inventory_routes.route('/sync-from-products', methods=['POST'])
@jwt_required()
@admin_required
def sync_from_products():
    """Sync inventory from products (one-time operation)."""
    try:
        # Get all products
        products = Product.query.all()

        created_count = 0
        updated_count = 0

        for product in products:
            # Check if inventory exists
            inventory = Inventory.query.filter_by(
                product_id=product.id,
                variant_id=None
            ).first()

            if inventory:
                # Update existing inventory
                inventory.stock_level = product.stock
                inventory.update_status()
                updated_count += 1
            else:
                # Create new inventory
                inventory = Inventory(
                    product_id=product.id,
                    stock_level=product.stock,
                    sku=product.sku,
                    status='active' if product.stock > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                created_count += 1

            # Process variants
            if product.variants:
                for variant in product.variants:
                    # Check if inventory exists for variant
                    variant_inventory = Inventory.query.filter_by(
                        product_id=product.id,
                        variant_id=variant.id
                    ).first()

                    if variant_inventory:
                        # Update existing inventory
                        variant_inventory.stock_level = variant.stock
                        variant_inventory.update_status()
                        updated_count += 1
                    else:
                        # Create new inventory
                        variant_inventory = Inventory(
                            product_id=product.id,
                            variant_id=variant.id,
                            stock_level=variant.stock,
                            sku=variant.sku,
                            status='active' if variant.stock > 0 else 'out_of_stock'
                        )
                        db.session.add(variant_inventory)
                        created_count += 1

        db.session.commit()

        return jsonify({
            "message": "Inventory synced successfully",
            "created": created_count,
            "updated": updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error syncing inventory: {str(e)}")
        return jsonify({"error": "Failed to sync inventory", "details": str(e)}), 500

# RESTful route for validating cart items against inventory
@inventory_routes.route('/validate-cart', methods=['POST'])
def validate_cart_items():
    """Validate cart items against inventory."""
    try:
        data = request.get_json()

        if not data or 'items' not in data:
            return jsonify({"error": "Items are required"}), 400

        items = data['items']

        if not isinstance(items, list):
            return jsonify({"error": "Items must be an array"}), 400

        errors = []
        warnings = []

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
                product = Product.query.get(product_id)

                if not product:
                    errors.append({
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "message": f"Product with ID {product_id} not found",
                        "code": "product_not_found"
                    })
                    continue

                if variant_id:
                    variant = ProductVariant.query.get(variant_id)
                    if not variant:
                        errors.append({
                            "product_id": product_id,
                            "variant_id": variant_id,
                            "message": f"Variant with ID {variant_id} not found",
                            "code": "variant_not_found"
                        })
                        continue

                    available = variant.stock
                else:
                    available = product.stock

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

        return jsonify({
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }), 200

    except Exception as e:
        logger.error(f"Error validating cart items: {str(e)}")
        return jsonify({"error": "Failed to validate cart items", "details": str(e)}), 500

# Add a new route for inventory logs (optional but useful for auditing)
@inventory_routes.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_inventory_logs():
    """Get inventory transaction logs."""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Get filter parameters
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        action_type = request.args.get('action_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # This is a placeholder - you would need to implement the actual InventoryLog model
        # and query logic based on your database schema
        return jsonify({
            "message": "Inventory logs endpoint - implement with your actual InventoryLog model",
            "filters": {
                "product_id": product_id,
                "user_id": user_id,
                "action_type": action_type,
                "start_date": start_date,
                "end_date": end_date
            },
            "pagination": {
                "page": page,
                "per_page": per_page
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting inventory logs: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory logs", "details": str(e)}), 500
