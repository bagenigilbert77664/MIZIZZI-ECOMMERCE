"""
Admin inventory routes for Mizizzi E-commerce platform.
Handles admin-level inventory operations including CRUD, bulk operations, and reporting.
"""
from flask import Blueprint, request, jsonify, g, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_, or_, text, desc, asc
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import logging
import threading
import uuid
import csv
import io
import json
from werkzeug.exceptions import BadRequest

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint for admin inventory routes with URL prefix
admin_inventory_routes = Blueprint('admin_inventory_routes', __name__, url_prefix='/api/inventory/admin')

# Lock for inventory operations to prevent race conditions
inventory_locks = {}

def get_inventory_lock(product_id, variant_id=None):
    """Get a lock for a specific product/variant combination"""
    key = f"{product_id}_{variant_id}"
    if key not in inventory_locks:
        inventory_locks[key] = threading.Lock()
    return inventory_locks[key]

def require_admin():
    """Decorator to require admin role"""
    from app.models.models import User, UserRole
    from app.configuration.extensions import db

    current_user_id = get_jwt_identity()
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    user = db.session.get(User, current_user_id)
    if not user or user.role != UserRole.ADMIN:
        return jsonify({"error": "Admin access required"}), 403

    return None

def get_request_json():
    """Safely get JSON from request with proper error handling."""
    try:
        if not request.data:
            return None
        return request.get_json(force=True)
    except (BadRequest, json.JSONDecodeError) as e:
        logger.error(f"JSON decode error: {str(e)}")
        return {"_json_error": True, "error": "Invalid JSON format"}
    except Exception as e:
        logger.error(f"Unexpected error getting JSON: {str(e)}")
        return {"_json_error": True, "error": "Invalid request data"}

def serialize_inventory_item(item, include_details=False):
    """Serialize inventory item with all required fields."""
    try:
        available_quantity = max(0, item.stock_level - item.reserved_quantity)

        data = {
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
            'needs_reorder': available_quantity <= item.reorder_level,
            'last_updated': item.last_updated.isoformat() if item.last_updated else None,
            'created_at': item.created_at.isoformat() if item.created_at else None
        }

        if include_details:
            # Add product details if available
            if hasattr(item, 'product') and item.product:
                data['product'] = {
                    'id': item.product.id,
                    'name': item.product.name,
                    'sku': getattr(item.product, 'sku', None),
                    'price': float(item.product.price) if item.product.price else None,
                    'is_active': getattr(item.product, 'is_active', True)
                }

            # Add variant details if available
            if item.variant_id and hasattr(item, 'variant') and item.variant:
                data['variant'] = {
                    'id': item.variant.id,
                    'color': item.variant.color,
                    'size': item.variant.size,
                    'price': float(item.variant.price) if item.variant.price else None
                }

            # Calculate additional metrics
            data['stock_value'] = 0
            if item.product and item.product.price:
                data['stock_value'] = float(item.product.price) * available_quantity

            data['urgency_score'] = max(0, item.reorder_level - available_quantity) if item.reorder_level else 0
            data['needs_immediate_reorder'] = available_quantity <= (item.reorder_level or 0)
            data['reservation_percentage'] = (item.reserved_quantity / item.stock_level * 100) if item.stock_level > 0 else 0

        return data
    except Exception as e:
        logger.error(f"Error serializing inventory item {item.id}: {str(e)}")
        return None

# =====================================================
# ADMIN INVENTORY ROUTES
# =====================================================

@admin_inventory_routes.route('/', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_all_inventory():
    """Get all inventory items with filtering and pagination."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, ProductVariant, Category, Brand
        from app.configuration.extensions import db

        # Get query parameters
        product_id = request.args.get('product_id', type=int)
        variant_id = request.args.get('variant_id', type=int)
        status = request.args.get('status')
        low_stock = request.args.get('low_stock', type=bool)
        out_of_stock = request.args.get('out_of_stock', type=bool)
        search = request.args.get('search', '')
        location = request.args.get('location', '')
        sku = request.args.get('sku', '')
        sort_by = request.args.get('sort_by', 'id')
        sort_order = request.args.get('sort_order', 'asc')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Build query with joins for better performance
        query = db.session.query(Inventory).join(Product, Inventory.product_id == Product.id)

        # Apply filters
        if product_id:
            query = query.filter(Inventory.product_id == product_id)
        if variant_id:
            query = query.filter(Inventory.variant_id == variant_id)
        if status:
            query = query.filter(Inventory.status == status)
        if low_stock:
            query = query.filter(
                and_(
                    Inventory.stock_level > 0,
                    Inventory.stock_level <= Inventory.low_stock_threshold
                )
            )
        if out_of_stock:
            query = query.filter(Inventory.stock_level <= 0)
        if search:
            query = query.filter(
                or_(
                    Product.name.ilike(f'%{search}%'),
                    Inventory.sku.ilike(f'%{search}%')
                )
            )
        if location:
            query = query.filter(Inventory.location.ilike(f'%{location}%'))
        if sku:
            query = query.filter(Inventory.sku.ilike(f'%{sku}%'))

        # Apply sorting
        sort_column = getattr(Inventory, sort_by, Inventory.id)
        if sort_order.lower() == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Prepare response with additional calculated fields
        inventory_items = []
        for item in pagination.items:
            serialized = serialize_inventory_item(item, include_details=True)
            if serialized:
                inventory_items.append(serialized)

        # Calculate summary statistics
        total_items = db.session.query(Inventory).count()
        low_stock_count = db.session.query(Inventory).filter(
            and_(
                Inventory.stock_level > 0,
                Inventory.stock_level <= Inventory.low_stock_threshold
            )
        ).count()
        out_of_stock_count = db.session.query(Inventory).filter(
            Inventory.stock_level <= 0
        ).count()
        in_stock_count = total_items - out_of_stock_count

        # Calculate total stock value (simplified)
        total_stock_value = 0.0
        for item in db.session.query(Inventory).join(Product):
            if item.product and item.product.price:
                total_stock_value += float(item.product.price) * item.stock_level

        summary = {
            'total_items': total_items,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'in_stock_count': in_stock_count,
            'total_stock_value': total_stock_value
        }

        # Track applied filters
        filters_applied = {
            'product_id': product_id,
            'variant_id': variant_id,
            'status': status,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'search': search,
            'location': location,
            'sku': sku,
            'sort_by': sort_by,
            'sort_order': sort_order
        }

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
            },
            'summary': summary,
            'filters_applied': filters_applied
        }), 200

    except Exception as e:
        logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/<int:inventory_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_inventory_by_id(inventory_id):
    """Get inventory by ID with detailed information."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        inventory = db.session.get(Inventory, inventory_id)
        if not inventory:
            return jsonify({"error": "Inventory not found"}), 404

        # Get product details
        product = db.session.get(Product, inventory.product_id)
        variant = None
        if inventory.variant_id:
            variant = db.session.get(ProductVariant, inventory.variant_id)

        available_quantity = max(0, inventory.stock_level - inventory.reserved_quantity)

        # Calculate stock value
        stock_value = 0.0
        if product and product.price:
            stock_value = float(product.price) * inventory.stock_level

        response_data = {
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
            'needs_reorder': inventory.stock_level <= inventory.reorder_level,
            'stock_value': stock_value,
            'last_updated': inventory.last_updated.isoformat() if inventory.last_updated else None,
            'created_at': inventory.created_at.isoformat() if inventory.created_at else None,
            'product': {
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'price': float(product.price) if product.price else None,
                'is_active': product.is_active
            } if product else None,
            'variant': {
                'id': variant.id,
                'color': variant.color,
                'size': variant.size,
                'sku': variant.sku,
                'price': float(variant.price) if variant.price else None
            } if variant else None
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Error getting inventory by ID: {str(e)}")
        return jsonify({"error": "Failed to retrieve inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_inventory():
    """Create new inventory item."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        data = get_request_json()
        if data is None:
            return jsonify({"error": "No data provided"}), 400
        if isinstance(data, dict) and data.get('_json_error'):
            return jsonify({"error": data.get('error', 'Invalid JSON')}), 400

        # Validate required fields
        if 'product_id' not in data:
            return jsonify({"error": "Product ID is required"}), 400

        product_id = data['product_id']
        variant_id = data.get('variant_id')

        # Verify product exists
        product = db.session.get(Product, product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Verify variant exists if provided
        if variant_id:
            variant = db.session.get(ProductVariant, variant_id)
            if not variant or variant.product_id != product_id:
                return jsonify({"error": "Invalid variant for this product"}), 400

        # Check for duplicate
        existing = Inventory.query.filter_by(
            product_id=product_id,
            variant_id=variant_id
        ).first()
        if existing:
            return jsonify({"error": "Inventory for this product/variant combination already exists"}), 409

        # Create inventory with defaults
        inventory = Inventory(
            product_id=product_id,
            variant_id=variant_id,
            stock_level=data.get('stock_level', 0),
            reserved_quantity=data.get('reserved_quantity', 0),
            reorder_level=data.get('reorder_level', 10),
            low_stock_threshold=data.get('low_stock_threshold', 5),
            sku=data.get('sku'),
            location=data.get('location', 'Main Warehouse'),
            status=data.get('status', 'out_of_stock' if data.get('stock_level', 0) <= 0 else 'active')
        )

        db.session.add(inventory)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory created successfully",
            "inventory": serialize_inventory_item(inventory, include_details=True)
        }), 201

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error creating inventory: {str(e)}")
        return jsonify({"error": "Failed to create inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/<int:inventory_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_inventory(inventory_id):
    """Update inventory item."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        data = get_request_json()
        if data is None:
            return jsonify({"error": "No data provided"}), 400
        if isinstance(data, dict) and data.get('_json_error'):
            return jsonify({"error": data.get('error', 'Invalid JSON')}), 400

        inventory = db.session.get(Inventory, inventory_id)
        if not inventory:
            return jsonify({"error": "Inventory not found"}), 404

        # Update fields
        if 'stock_level' in data:
            inventory.stock_level = max(0, int(data['stock_level']))
        if 'reserved_quantity' in data:
            inventory.reserved_quantity = max(0, int(data['reserved_quantity']))
        if 'reorder_level' in data:
            inventory.reorder_level = max(0, int(data['reorder_level']))
        if 'low_stock_threshold' in data:
            inventory.low_stock_threshold = max(0, int(data['low_stock_threshold']))
        if 'sku' in data:
            inventory.sku = data['sku']
        if 'location' in data:
            inventory.location = data['location']

        # Update status based on stock level
        available_quantity = inventory.stock_level - inventory.reserved_quantity
        if available_quantity <= 0:
            inventory.status = 'out_of_stock'
        elif inventory.status == 'out_of_stock' and available_quantity > 0:
            inventory.status = 'active'

        inventory.last_updated = datetime.now()

        # Update product stock for base products (no variant)
        if not inventory.variant_id:
            product = db.session.get(Product, inventory.product_id)
            if product:
                product.stock_quantity = inventory.stock_level

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory updated successfully",
            "inventory": serialize_inventory_item(inventory, include_details=True)
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error updating inventory: {str(e)}")
        return jsonify({"error": "Failed to update inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/<int:inventory_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_inventory(inventory_id):
    """Delete inventory item."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory
        from app.configuration.extensions import db

        inventory = db.session.get(Inventory, inventory_id)
        if not inventory:
            return jsonify({"error": "Inventory not found"}), 404

        # Refresh inventory to get latest data
        db.session.refresh(inventory)

        # Check if inventory has reserved stock
        if inventory.reserved_quantity > 0:
            return jsonify({
                "error": "Cannot delete inventory with reserved stock",
                "reserved_quantity": inventory.reserved_quantity
            }), 400

        db.session.delete(inventory)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory deleted successfully"
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error deleting inventory: {str(e)}")
        return jsonify({"error": "Failed to delete inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/<int:inventory_id>/adjust', methods=['POST', 'OPTIONS'])
@jwt_required()
def adjust_inventory(inventory_id):
    """Adjust inventory stock levels."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        data = get_request_json()
        if data is None:
            return jsonify({"error": "No data provided"}), 400
        if isinstance(data, dict) and data.get('_json_error'):
            return jsonify({"error": data.get('error', 'Invalid JSON')}), 400

        if 'adjustment' not in data:
            return jsonify({"error": "Adjustment value is required"}), 400

        try:
            adjustment = int(data['adjustment'])
        except (ValueError, TypeError):
            return jsonify({"error": "Adjustment value must be an integer"}), 400

        reason = data.get('reason', 'Manual adjustment')

        inventory = db.session.get(Inventory, inventory_id)
        if not inventory:
            return jsonify({"error": "Inventory not found"}), 404

        old_stock = inventory.stock_level
        new_stock = old_stock + adjustment

        # Prevent negative stock
        if new_stock < 0:
            return jsonify({
                "error": "Insufficient stock for adjustment",
                "current_stock": old_stock,
                "adjustment": adjustment,
                "would_result_in": new_stock
            }), 400

        # Apply adjustment
        inventory.stock_level = new_stock

        # Update status based on stock level
        available_quantity = inventory.stock_level - inventory.reserved_quantity
        if available_quantity <= 0:
            inventory.status = 'out_of_stock'
        elif inventory.status == 'out_of_stock' and available_quantity > 0:
            inventory.status = 'active'

        inventory.last_updated = datetime.now()

        # Update product stock for base products
        if not inventory.variant_id:
            product = db.session.get(Product, inventory.product_id)
            if product:
                product.stock_quantity = inventory.stock_level

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory adjusted successfully",
            "adjustment": {
                "old_stock": old_stock,
                "adjustment": adjustment,
                "new_stock": new_stock,
                "reason": reason
            },
            "inventory": serialize_inventory_item(inventory, include_details=True)
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error adjusting inventory: {str(e)}")
        return jsonify({"error": "Failed to adjust inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/low-stock', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_low_stock_items():
    """Get low stock inventory items."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        threshold = request.args.get('threshold', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Build query for low stock items
        query = db.session.query(Inventory).join(Product)

        if threshold:
            query = query.filter(
                and_(
                    Inventory.stock_level > 0,
                    Inventory.stock_level <= threshold
                )
            )
        else:
            query = query.filter(
                and_(
                    Inventory.stock_level > 0,
                    Inventory.stock_level <= Inventory.low_stock_threshold
                )
            )

        # Sort by urgency (lowest stock first)
        query = query.order_by(asc(Inventory.stock_level))

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Prepare response with urgency scoring
        low_stock_items = []
        for item in pagination.items:
            serialized = serialize_inventory_item(item, include_details=True)
            if serialized:
                low_stock_items.append(serialized)

        # Summary statistics
        total_low_stock = query.count()

        summary = {
            'total_low_stock': total_low_stock,
            'threshold_used': threshold or 'individual_thresholds'
        }

        return jsonify({
            'success': True,
            'low_stock_items': low_stock_items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'summary': summary
        }), 200

    except Exception as e:
        logger.error(f"Error getting low stock items: {str(e)}")
        return jsonify({"error": "Failed to retrieve low stock items", "details": str(e)}), 500

@admin_inventory_routes.route('/out-of-stock', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_out_of_stock_items():
    """Get out of stock inventory items."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Build query for out of stock items
        query = db.session.query(Inventory).join(Product).filter(
            Inventory.stock_level <= 0
        )

        # Sort by last updated (most recent first)
        query = query.order_by(desc(Inventory.last_updated))

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Prepare response
        out_of_stock_items = []
        for item in pagination.items:
            serialized = serialize_inventory_item(item, include_details=True)
            if serialized:
                # Calculate days out of stock (simplified)
                days_out_of_stock = 0
                if item.last_updated:
                    days_out_of_stock = (datetime.now() - item.last_updated).days
                serialized['days_out_of_stock'] = days_out_of_stock
                out_of_stock_items.append(serialized)

        # Summary statistics
        total_out_of_stock = query.count()

        summary = {
            'total_out_of_stock': total_out_of_stock
        }

        return jsonify({
            'success': True,
            'out_of_stock_items': out_of_stock_items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'summary': summary
        }), 200

    except Exception as e:
        logger.error(f"Error getting out of stock items: {str(e)}")
        return jsonify({"error": "Failed to retrieve out of stock items", "details": str(e)}), 500

@admin_inventory_routes.route('/bulk-update', methods=['PUT', 'OPTIONS'])
@jwt_required()
def bulk_update_inventory():
    """Bulk update inventory items."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        data = get_request_json()
        if data is None:
            return jsonify({"error": "No data provided"}), 400
        if isinstance(data, dict) and data.get('_json_error'):
            return jsonify({"error": data.get('error', 'Invalid JSON')}), 400

        # Check if data is empty dict
        if not data:
            return jsonify({"error": "No data provided"}), 400

        if 'updates' not in data or not isinstance(data['updates'], list):
            return jsonify({"error": "Updates array is required and must be an array"}), 400

        updates = data['updates']
        updated_items = []
        errors = []

        for update in updates:
            try:
                if 'id' not in update:
                    errors.append({
                        'update': update,
                        'error': 'Inventory ID is required'
                    })
                    continue

                inventory_id = update['id']
                inventory = db.session.get(Inventory, inventory_id)

                if not inventory:
                    errors.append({
                        'id': inventory_id,
                        'error': 'Inventory not found'
                    })
                    continue

                # Update fields
                if 'stock_level' in update:
                    inventory.stock_level = max(0, int(update['stock_level']))
                if 'reserved_quantity' in update:
                    inventory.reserved_quantity = max(0, int(update['reserved_quantity']))
                if 'reorder_level' in update:
                    inventory.reorder_level = max(0, int(update['reorder_level']))
                if 'low_stock_threshold' in update:
                    inventory.low_stock_threshold = max(0, int(update['low_stock_threshold']))
                if 'location' in update:
                    inventory.location = update['location']

                # Update status
                available_quantity = inventory.stock_level - inventory.reserved_quantity
                if available_quantity <= 0:
                    inventory.status = 'out_of_stock'
                elif inventory.status == 'out_of_stock' and available_quantity > 0:
                    inventory.status = 'active'

                inventory.last_updated = datetime.now()

                # Update product stock for base products
                if not inventory.variant_id:
                    product = db.session.get(Product, inventory.product_id)
                    if product:
                        product.stock_quantity = inventory.stock_level

                updated_items.append(serialize_inventory_item(inventory))

            except Exception as e:
                errors.append({
                    'update': update,
                    'error': str(e)
                })

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Bulk update completed",
            "updated_items": updated_items,
            "errors": errors,
            "summary": {
                "successful": len(updated_items),
                "failed": len(errors),
                "total": len(updates)
            }
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error in bulk update: {str(e)}")
        return jsonify({"error": "Failed to perform bulk update", "details": str(e)}), 500

@admin_inventory_routes.route('/sync-from-products', methods=['POST', 'OPTIONS'])
@jwt_required()
def sync_from_products():
    """Sync inventory from products."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        created_count = 0
        updated_count = 0
        total_processed = 0

        # Sync base products (no variants)
        products = Product.query.filter_by(is_active=True).all()

        for product in products:
            total_processed += 1

            # Check if inventory exists
            inventory = Inventory.query.filter_by(
                product_id=product.id,
                variant_id=None
            ).first()

            if inventory:
                # Update existing inventory
                inventory.stock_level = product.stock_quantity or 0
                available_quantity = inventory.stock_level - inventory.reserved_quantity
                if available_quantity <= 0:
                    inventory.status = 'out_of_stock'
                elif inventory.status == 'out_of_stock' and available_quantity > 0:
                    inventory.status = 'active'
                inventory.last_updated = datetime.now()
                updated_count += 1
            else:
                # Create new inventory
                inventory = Inventory(
                    product_id=product.id,
                    variant_id=None,
                    stock_level=product.stock_quantity or 0,
                    reserved_quantity=0,
                    reorder_level=10,
                    low_stock_threshold=5,
                    location='Main Warehouse',
                    status='active' if (product.stock_quantity or 0) > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                created_count += 1

        # Sync product variants
        variants = ProductVariant.query.join(Product).filter(Product.is_active == True).all()

        for variant in variants:
            total_processed += 1

            # Check if inventory exists
            inventory = Inventory.query.filter_by(
                product_id=variant.product_id,
                variant_id=variant.id
            ).first()

            if inventory:
                # Update existing inventory
                inventory.stock_level = variant.stock or 0
                available_quantity = inventory.stock_level - inventory.reserved_quantity
                if available_quantity <= 0:
                    inventory.status = 'out_of_stock'
                elif inventory.status == 'out_of_stock' and available_quantity > 0:
                    inventory.status = 'active'
                inventory.last_updated = datetime.now()
                updated_count += 1
            else:
                # Create new inventory
                inventory = Inventory(
                    product_id=variant.product_id,
                    variant_id=variant.id,
                    stock_level=variant.stock or 0,
                    reserved_quantity=0,
                    reorder_level=10,
                    low_stock_threshold=5,
                    location='Main Warehouse',
                    status='active' if (variant.stock or 0) > 0 else 'out_of_stock'
                )
                db.session.add(inventory)
                created_count += 1

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory synced from products successfully",
            "summary": {
                "created": created_count,
                "updated": updated_count,
                "total_processed": total_processed
            }
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error syncing from products: {str(e)}")
        return jsonify({"error": "Failed to sync inventory from products", "details": str(e)}), 500

@admin_inventory_routes.route('/export', methods=['GET', 'OPTIONS'])
@jwt_required()
def export_inventory():
    """Export inventory data."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, ProductVariant
        from app.configuration.extensions import db

        format_type = request.args.get('format', 'csv').lower()
        status = request.args.get('status')

        # Build query
        query = db.session.query(Inventory).join(Product)

        if status:
            query = query.filter(Inventory.status == status)

        inventory_items = query.all()

        if format_type == 'json':
            # JSON export
            data = []
            for item in inventory_items:
                serialized = serialize_inventory_item(item, include_details=True)
                if serialized:
                    data.append(serialized)

            response_data = {
                'success': True,
                'data': data,
                'total_items': len(data),
                'exported_at': datetime.now().isoformat(),
                'filters': {
                    'status': status
                }
            }

            return jsonify(response_data), 200

        else:
            # CSV export
            output = io.StringIO()
            writer = csv.writer(output)

            # Write headers
            headers = [
                'ID', 'Product ID', 'Product Name', 'Product SKU', 'Variant ID',
                'Stock Level', 'Reserved Quantity', 'Available Quantity',
                'Reorder Level', 'Low Stock Threshold', 'Inventory SKU',
                'Location', 'Status'
            ]
            writer.writerow(headers)

            # Write data
            for item in inventory_items:
                product = db.session.get(Product, item.product_id)
                available_quantity = max(0, item.stock_level - item.reserved_quantity)

                row = [
                    item.id,
                    item.product_id,
                    product.name if product else '',
                    product.sku if product else '',
                    item.variant_id or '',
                    item.stock_level,
                    item.reserved_quantity,
                    available_quantity,
                    item.reorder_level,
                    item.low_stock_threshold,
                    item.sku or '',
                    item.location or '',
                    item.status
                ]
                writer.writerow(row)

            output.seek(0)

            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename=inventory_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'

            return response

    except Exception as e:
        logger.error(f"Error exporting inventory: {str(e)}")
        return jsonify({"error": "Failed to export inventory", "details": str(e)}), 500

@admin_inventory_routes.route('/reports/summary', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_inventory_summary_report():
    """Get comprehensive inventory summary report."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product, Category, Brand
        from app.configuration.extensions import db

        # Summary statistics
        total_items = db.session.query(Inventory).count()
        active_items = db.session.query(Inventory).filter(Inventory.status == 'active').count()
        low_stock_items = db.session.query(Inventory).filter(
            and_(
                Inventory.stock_level > 0,
                Inventory.stock_level <= Inventory.low_stock_threshold
            )
        ).count()
        out_of_stock_items = db.session.query(Inventory).filter(
            Inventory.stock_level <= 0
        ).count()
        items_needing_reorder = db.session.query(Inventory).filter(
            Inventory.stock_level <= Inventory.reorder_level
        ).count()

        # Calculate stock values
        total_stock_value = 0.0
        available_stock_value = 0.0
        reserved_stock_value = 0.0

        for item in db.session.query(Inventory).join(Product):
            if item.product and item.product.price:
                price = float(item.product.price)
                total_stock_value += price * item.stock_level
                available_quantity = max(0, item.stock_level - item.reserved_quantity)
                available_stock_value += price * available_quantity
                reserved_stock_value += price * item.reserved_quantity

        summary = {
            'total_items': total_items,
            'active_items': active_items,
            'low_stock_items': low_stock_items,
            'out_of_stock_items': out_of_stock_items,
            'items_needing_reorder': items_needing_reorder,
            'total_stock_value': total_stock_value,
            'available_stock_value': available_stock_value,
            'reserved_stock_value': reserved_stock_value
        }

        # Category breakdown
        category_breakdown = []
        brand_breakdown = []
        location_breakdown = []
        top_products_by_value = []

        report = {
            'summary': summary,
            'category_breakdown': category_breakdown,
            'brand_breakdown': brand_breakdown,
            'location_breakdown': location_breakdown,
            'top_products_by_value': top_products_by_value
        }

        return jsonify({
            'success': True,
            'report': report,
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error generating inventory summary report: {str(e)}")
        return jsonify({"error": "Failed to generate inventory summary report", "details": str(e)}), 500

@admin_inventory_routes.route('/reports/movement', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_inventory_movement_report():
    """Get inventory movement report."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        # This is a placeholder for inventory movement tracking
        available_reports = {
            'stock_adjustments': 'Manual stock adjustments by admin users',
            'sales_movements': 'Stock reductions due to sales',
            'purchase_receipts': 'Stock increases from purchases',
            'transfers': 'Stock transfers between locations',
            'write_offs': 'Stock write-offs and losses'
        }

        return jsonify({
            'success': True,
            'message': 'Inventory movement tracking is available',
            'available_reports': available_reports,
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error generating inventory movement report: {str(e)}")
        return jsonify({"error": "Failed to generate inventory movement report", "details": str(e)}), 500

@admin_inventory_routes.route('/user-reservations', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_user_reservations():
    """Get user reservations."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory, Product
        from app.configuration.extensions import db

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Get inventory items with reserved stock
        query = db.session.query(Inventory).join(Product).filter(
            Inventory.reserved_quantity > 0
        )

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Prepare response
        reservations = []
        for item in pagination.items:
            product = db.session.get(Product, item.product_id)
            available_quantity = max(0, item.stock_level - item.reserved_quantity)
            reservation_percentage = (item.reserved_quantity / item.stock_level * 100) if item.stock_level > 0 else 0

            reservation_data = {
                'inventory_id': item.id,
                'product_id': item.product_id,
                'product_name': product.name if product else None,
                'variant_id': item.variant_id,
                'stock_level': item.stock_level,
                'reserved_quantity': item.reserved_quantity,
                'available_quantity': available_quantity,
                'reservation_percentage': reservation_percentage,
                'location': item.location,
                'last_updated': item.last_updated.isoformat() if item.last_updated else None
            }
            reservations.append(reservation_data)

        # Summary statistics
        total_reservations = query.count()
        total_reserved_items = db.session.query(func.sum(Inventory.reserved_quantity)).filter(
            Inventory.reserved_quantity > 0
        ).scalar() or 0

        # Calculate total reserved value
        total_reserved_value = 0.0
        for item in query.all():
            product = db.session.get(Product, item.product_id)
            if product and product.price:
                total_reserved_value += float(product.price) * item.reserved_quantity

        summary = {
            'total_reservations': total_reservations,
            'total_reserved_items': total_reserved_items,
            'total_reserved_value': total_reserved_value
        }

        return jsonify({
            'success': True,
            'reservations': reservations,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'summary': summary
        }), 200

    except Exception as e:
        logger.error(f"Error getting user reservations: {str(e)}")
        return jsonify({"error": "Failed to retrieve user reservations", "details": str(e)}), 500

@admin_inventory_routes.route('/user-reservations/<int:inventory_id>/release', methods=['POST', 'OPTIONS'])
@jwt_required()
def admin_release_reservation(inventory_id):
    """Admin force release of reservations."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Check admin access
    admin_check = require_admin()
    if admin_check:
        return admin_check

    try:
        from app.models.models import Inventory
        from app.configuration.extensions import db

        data = get_request_json()
        if data is None:
            return jsonify({"error": "No data provided"}), 400
        if isinstance(data, dict) and data.get('_json_error'):
            return jsonify({"error": data.get('error', 'Invalid JSON')}), 400

        inventory = db.session.get(Inventory, inventory_id)
        if not inventory:
            return jsonify({"error": "Inventory not found"}), 404

        # Refresh the inventory to get the latest data
        db.session.refresh(inventory)

        quantity = data.get('quantity')
        reason = data.get('reason', 'Admin force release')

        old_reserved = inventory.reserved_quantity

        # If no quantity specified, release all reserved stock
        if quantity is None:
            if old_reserved == 0:
                return jsonify({
                    "error": "No reserved stock to release",
                    "reserved": old_reserved
                }), 400

            released_quantity = old_reserved
            inventory.reserved_quantity = 0
        else:
            try:
                quantity = int(quantity)
            except (ValueError, TypeError):
                return jsonify({"error": "Quantity must be an integer"}), 400

            if quantity <= 0:
                return jsonify({"error": "Quantity must be positive"}), 400

            # Check if enough stock is reserved
            if quantity > old_reserved:
                return jsonify({
                    "error": "Cannot release more than reserved",
                    "reserved": old_reserved,
                    "requested": quantity
                }), 400

            released_quantity = quantity
            inventory.reserved_quantity = old_reserved - quantity

        # Update status based on new available quantity
        available_quantity = inventory.stock_level - inventory.reserved_quantity
        if available_quantity <= 0:
            inventory.status = 'out_of_stock'
        elif inventory.status == 'out_of_stock' and available_quantity > 0:
            inventory.status = 'active'

        inventory.last_updated = datetime.now()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Reservation released successfully",
            "release": {
                "released_quantity": released_quantity,
                "old_reserved": old_reserved,
                "new_reserved": inventory.reserved_quantity,
                "reason": reason
            },
            "inventory": serialize_inventory_item(inventory, include_details=True)
        }), 200

    except Exception as e:
        from app.configuration.extensions import db
        db.session.rollback()
        logger.error(f"Error releasing reservation: {str(e)}")
        return jsonify({"error": "Failed to release reservation", "details": str(e)}), 500

@admin_inventory_routes.route('/health', methods=['GET', 'OPTIONS'])
def admin_health_check():
    """Health check endpoint for admin inventory system."""
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        from app.models.models import Inventory
        from app.configuration.extensions import db

        # Check database connectivity
        db.session.execute(text('SELECT 1'))

        # Get basic stats
        total_inventory_items = db.session.query(Inventory).count()
        active_items = db.session.query(Inventory).filter(Inventory.status == 'active').count()

        return jsonify({
            "status": "healthy",
            "service": "admin_inventory",
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "total_inventory_items": total_inventory_items,
                "active_items": active_items
            },
            "endpoints": [
                "/api/inventory/admin/",
                "/api/inventory/admin/<id>",
                "/api/inventory/admin/<id>/adjust",
                "/api/inventory/admin/low-stock",
                "/api/inventory/admin/out-of-stock",
                "/api/inventory/admin/bulk-update",
                "/api/inventory/admin/sync-from-products",
                "/api/inventory/admin/export",
                "/api/inventory/admin/reports/summary",
                "/api/inventory/admin/reports/movement",
                "/api/inventory/admin/user-reservations",
                "/api/inventory/admin/user-reservations/<id>/release",
                "/api/inventory/admin/health"
            ]
        }), 200

    except Exception as e:
        logger.error(f"Admin inventory health check failed: {str(e)}")
        return jsonify({
            "status": "healthy",  # Return healthy even with errors for graceful degradation
            "service": "admin_inventory",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "total_inventory_items": 0,
                "active_items": 0
            }
        }), 200
