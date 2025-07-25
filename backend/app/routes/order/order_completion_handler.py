"""
Order completion handler for inventory management.
Handles inventory reduction when orders are completed and provides order lifecycle management.
"""
import logging
from datetime import datetime
from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

# Setup logger
logger = logging.getLogger(__name__)

def handle_order_completion(order_id, new_status):
    """
    Handle order completion by reducing inventory.
    This function is called when an order status changes to DELIVERED or PROCESSING.

    Args:
        order_id: The ID of the order being completed
        new_status: The new status of the order

    Returns:
        bool: True if inventory was successfully reduced, False otherwise
    """
    try:
        # Import models here to avoid circular imports
        from ...models.models import Order, OrderItem, Product, ProductVariant, OrderStatus
        from ...configuration.extensions import db

        # Get the order
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order {order_id} not found for inventory reduction")
            return False

        # Only reduce inventory for specific statuses
        inventory_reduction_statuses = [OrderStatus.DELIVERED, OrderStatus.PROCESSING]
        if new_status not in inventory_reduction_statuses:
            logger.info(f"Order {order_id} status {new_status} does not require inventory reduction")
            return True

        # Check if inventory has already been reduced for this order
        if hasattr(order, 'inventory_reduced') and order.inventory_reduced:
            logger.info(f"Inventory already reduced for order {order_id}")
            return True

        inventory_reduced = True
        inventory_changes = []

        # Reduce inventory for each order item
        for item in order.items:
            try:
                # Get the product
                product = Product.query.get(item.product_id)
                if not product:
                    logger.warning(f"Product {item.product_id} not found for inventory reduction")
                    continue

                # If there's a variant, reduce variant inventory
                if item.variant_id:
                    variant = ProductVariant.query.get(item.variant_id)
                    if variant and hasattr(variant, 'stock_quantity'):
                        if variant.stock_quantity >= item.quantity:
                            old_variant_stock = variant.stock_quantity
                            variant.stock_quantity -= item.quantity
                            inventory_changes.append({
                                'type': 'variant',
                                'id': variant.id,
                                'old_stock': old_variant_stock,
                                'new_stock': variant.stock_quantity,
                                'quantity_reduced': item.quantity
                            })
                            logger.info(f"Reduced variant {variant.id} inventory by {item.quantity} (from {old_variant_stock} to {variant.stock_quantity})")
                        else:
                            logger.warning(f"Insufficient variant {variant.id} inventory: {variant.stock_quantity} < {item.quantity}")
                            inventory_reduced = False
                    else:
                        logger.warning(f"Variant {item.variant_id} not found or has no stock_quantity")

                # Reduce main product inventory
                if hasattr(product, 'stock_quantity'):
                    if product.stock_quantity >= item.quantity:
                        old_product_stock = product.stock_quantity
                        product.stock_quantity -= item.quantity
                        inventory_changes.append({
                            'type': 'product',
                            'id': product.id,
                            'old_stock': old_product_stock,
                            'new_stock': product.stock_quantity,
                            'quantity_reduced': item.quantity
                        })
                        logger.info(f"Reduced product {product.id} inventory by {item.quantity} (from {old_product_stock} to {product.stock_quantity})")
                    else:
                        logger.warning(f"Insufficient product {product.id} inventory: {product.stock_quantity} < {item.quantity}")
                        inventory_reduced = False
                else:
                    logger.warning(f"Product {product.id} has no stock_quantity field")

            except Exception as item_error:
                logger.error(f"Error reducing inventory for order item {item.id}: {str(item_error)}")
                inventory_reduced = False

        # Mark inventory as reduced if successful
        if inventory_reduced:
            try:
                # Mark the order as having inventory reduced
                if hasattr(order, 'inventory_reduced'):
                    order.inventory_reduced = True

                # Add inventory reduction timestamp
                if hasattr(order, 'inventory_reduced_at'):
                    order.inventory_reduced_at = datetime.utcnow()

                db.session.commit()
                logger.info(f"Successfully committed inventory reduction for order {order_id}")

                # Log inventory changes summary
                logger.info(f"Inventory changes for order {order_id}: {len(inventory_changes)} items updated")
                for change in inventory_changes:
                    logger.debug(f"  {change['type']} {change['id']}: {change['old_stock']} -> {change['new_stock']} (-{change['quantity_reduced']})")

            except Exception as commit_error:
                logger.error(f"Failed to commit inventory reduction for order {order_id}: {str(commit_error)}")
                db.session.rollback()
                return False
        else:
            logger.warning(f"Some inventory reductions failed for order {order_id}, rolling back")
            db.session.rollback()

        return inventory_reduced

    except Exception as e:
        logger.error(f"Error in handle_order_completion for order {order_id}: {str(e)}", exc_info=True)
        try:
            from ...configuration.extensions import db
            db.session.rollback()
        except:
            pass
        return False

def manual_inventory_sync():
    """
    Manually sync inventory for orders that may have missed automatic inventory reduction.
    This is useful for fixing data inconsistencies.

    Returns:
        dict: Results of the sync operation
    """
    try:
        from ...models.models import Order, OrderStatus
        from ...configuration.extensions import db

        # Find orders that should have inventory reduced but don't
        completed_statuses = [OrderStatus.DELIVERED, OrderStatus.PROCESSING]

        # Query for orders that are completed but haven't had inventory reduced
        orders_to_sync = Order.query.filter(
            Order.status.in_(completed_statuses)
        ).all()

        # Filter orders that haven't had inventory reduced (if the field exists)
        if orders_to_sync and hasattr(orders_to_sync[0], 'inventory_reduced'):
            orders_to_sync = [order for order in orders_to_sync if not order.inventory_reduced]

        sync_results = {
            'success': True,
            'orders_processed': 0,
            'orders_successful': 0,
            'orders_failed': 0,
            'errors': [],
            'timestamp': datetime.utcnow().isoformat()
        }

        for order in orders_to_sync:
            sync_results['orders_processed'] += 1

            try:
                if handle_order_completion(order.id, order.status):
                    sync_results['orders_successful'] += 1
                    logger.info(f"Successfully synced inventory for order {order.id}")
                else:
                    sync_results['orders_failed'] += 1
                    sync_results['errors'].append(f"Failed to sync inventory for order {order.id}")

            except Exception as order_error:
                sync_results['orders_failed'] += 1
                error_msg = f"Error syncing order {order.id}: {str(order_error)}"
                sync_results['errors'].append(error_msg)
                logger.error(error_msg)

        # Update overall success status
        sync_results['success'] = sync_results['orders_failed'] == 0

        logger.info(f"Manual inventory sync completed: {sync_results['orders_successful']}/{sync_results['orders_processed']} successful")

        return sync_results

    except Exception as e:
        logger.error(f"Error in manual_inventory_sync: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

def setup_order_completion_hooks(app):
    """
    Set up order completion hooks and related endpoints.
    This function is called during app initialization.

    Args:
        app: Flask application instance
    """
    try:
        # Import required modules
        from flask import jsonify, request
        from flask_jwt_extended import jwt_required, get_jwt_identity

        logger.info("Setting up order completion hooks...")

        # Add inventory sync endpoint for manual fixes
        @app.route('/api/admin/inventory/sync', methods=['POST'])
        @jwt_required()
        def sync_inventory():
            """Manual inventory sync endpoint for administrators."""
            try:
                current_user_id = get_jwt_identity()
                logger.info(f"Manual inventory sync requested by user {current_user_id}")

                result = manual_inventory_sync()

                # Log the sync operation
                if result['success']:
                    logger.info(f"Manual inventory sync completed successfully by user {current_user_id}")
                else:
                    logger.warning(f"Manual inventory sync completed with errors by user {current_user_id}")

                return jsonify(result), 200 if result['success'] else 500

            except Exception as e:
                logger.error(f"Error in inventory sync endpoint: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }), 500

        # Add order completion status endpoint
        @app.route('/api/admin/orders/<int:order_id>/complete', methods=['POST'])
        @jwt_required()
        def complete_order(order_id):
            """Manually complete an order and reduce inventory."""
            try:
                current_user_id = get_jwt_identity()
                logger.info(f"Order completion requested for order {order_id} by user {current_user_id}")

                # Get the new status from request
                data = request.get_json() or {}
                new_status = data.get('status', 'DELIVERED')

                # Handle the order completion
                success = handle_order_completion(order_id, new_status)

                if success:
                    return jsonify({
                        "success": True,
                        "message": f"Order {order_id} completed successfully",
                        "order_id": order_id,
                        "status": new_status,
                        "timestamp": datetime.utcnow().isoformat()
                    }), 200
                else:
                    return jsonify({
                        "success": False,
                        "message": f"Failed to complete order {order_id}",
                        "order_id": order_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }), 400

            except Exception as e:
                logger.error(f"Error in complete order endpoint: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "order_id": order_id,
                    "timestamp": datetime.utcnow().isoformat()
                }), 500

        # Add inventory status endpoint
        @app.route('/api/admin/inventory/status', methods=['GET'])
        @jwt_required()
        def inventory_status():
            """Get inventory status and low stock alerts."""
            try:
                from ...models.models import Product, ProductVariant

                # Get products with low stock (less than 10 items)
                low_stock_threshold = 10

                low_stock_products = Product.query.filter(
                    Product.stock_quantity < low_stock_threshold,
                    Product.stock_quantity >= 0
                ).all()

                # Get variants with low stock
                low_stock_variants = ProductVariant.query.filter(
                    ProductVariant.stock_quantity < low_stock_threshold,
                    ProductVariant.stock_quantity >= 0
                ).all()

                # Get out of stock items
                out_of_stock_products = Product.query.filter(
                    Product.stock_quantity <= 0
                ).all()

                out_of_stock_variants = ProductVariant.query.filter(
                    ProductVariant.stock_quantity <= 0
                ).all()

                return jsonify({
                    "success": True,
                    "inventory_status": {
                        "low_stock_products": len(low_stock_products),
                        "low_stock_variants": len(low_stock_variants),
                        "out_of_stock_products": len(out_of_stock_products),
                        "out_of_stock_variants": len(out_of_stock_variants),
                        "threshold": low_stock_threshold
                    },
                    "low_stock_items": [
                        {
                            "type": "product",
                            "id": p.id,
                            "name": getattr(p, 'name', f'Product {p.id}'),
                            "stock": p.stock_quantity
                        } for p in low_stock_products[:10]  # Limit to 10 items
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                }), 200

            except Exception as e:
                logger.error(f"Error in inventory status endpoint: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }), 500

        # Add order completion health check
        @app.route('/api/admin/inventory/health', methods=['GET'])
        def inventory_health():
            """Health check for inventory management system."""
            try:
                return jsonify({
                    "status": "ok",
                    "service": "inventory_management",
                    "features": [
                        "automatic_inventory_reduction",
                        "manual_inventory_sync",
                        "order_completion_hooks",
                        "low_stock_monitoring"
                    ],
                    "endpoints": [
                        "/api/admin/inventory/sync",
                        "/api/admin/inventory/status",
                        "/api/admin/orders/<id>/complete",
                        "/api/admin/inventory/health"
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                }), 200

            except Exception as e:
                logger.error(f"Error in inventory health check: {str(e)}")
                return jsonify({
                    "status": "error",
                    "service": "inventory_management",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }), 500

        logger.info("Order completion hooks set up successfully")
        logger.info("Available inventory endpoints:")
        logger.info("  POST /api/admin/inventory/sync - Manual inventory sync")
        logger.info("  POST /api/admin/orders/<id>/complete - Complete order and reduce inventory")
        logger.info("  GET  /api/admin/inventory/status - Get inventory status")
        logger.info("  GET  /api/admin/inventory/health - Health check")

    except Exception as e:
        logger.error(f"Error setting up order completion hooks: {str(e)}", exc_info=True)
        raise

def restore_inventory_for_cancelled_order(order_id):
    """
    Restore inventory when an order is cancelled.
    This function adds back the inventory that was reduced when the order was completed.

    Args:
        order_id: The ID of the cancelled order

    Returns:
        bool: True if inventory was successfully restored, False otherwise
    """
    try:
        from ...models.models import Order, OrderItem, Product, ProductVariant
        from ...configuration.extensions import db

        # Get the order
        order = Order.query.get(order_id)
        if not order:
            logger.error(f"Order {order_id} not found for inventory restoration")
            return False

        # Only restore inventory if it was previously reduced
        if hasattr(order, 'inventory_reduced') and not order.inventory_reduced:
            logger.info(f"Inventory was not reduced for order {order_id}, no restoration needed")
            return True

        inventory_restored = True
        restoration_changes = []

        # Restore inventory for each order item
        for item in order.items:
            try:
                # Get the product
                product = Product.query.get(item.product_id)
                if not product:
                    logger.warning(f"Product {item.product_id} not found for inventory restoration")
                    continue

                # If there's a variant, restore variant inventory
                if item.variant_id:
                    variant = ProductVariant.query.get(item.variant_id)
                    if variant and hasattr(variant, 'stock_quantity'):
                        old_variant_stock = variant.stock_quantity
                        variant.stock_quantity += item.quantity
                        restoration_changes.append({
                            'type': 'variant',
                            'id': variant.id,
                            'old_stock': old_variant_stock,
                            'new_stock': variant.stock_quantity,
                            'quantity_restored': item.quantity
                        })
                        logger.info(f"Restored variant {variant.id} inventory by {item.quantity} (from {old_variant_stock} to {variant.stock_quantity})")

                # Restore main product inventory
                if hasattr(product, 'stock_quantity'):
                    old_product_stock = product.stock_quantity
                    product.stock_quantity += item.quantity
                    restoration_changes.append({
                        'type': 'product',
                        'id': product.id,
                        'old_stock': old_product_stock,
                        'new_stock': product.stock_quantity,
                        'quantity_restored': item.quantity
                    })
                    logger.info(f"Restored product {product.id} inventory by {item.quantity} (from {old_product_stock} to {product.stock_quantity})")

            except Exception as item_error:
                logger.error(f"Error restoring inventory for order item {item.id}: {str(item_error)}")
                inventory_restored = False

        # Mark inventory as not reduced if successful
        if inventory_restored:
            try:
                # Mark the order as not having inventory reduced
                if hasattr(order, 'inventory_reduced'):
                    order.inventory_reduced = False

                # Clear inventory reduction timestamp
                if hasattr(order, 'inventory_reduced_at'):
                    order.inventory_reduced_at = None

                db.session.commit()
                logger.info(f"Successfully committed inventory restoration for order {order_id}")

                # Log restoration changes summary
                logger.info(f"Inventory restoration for order {order_id}: {len(restoration_changes)} items updated")
                for change in restoration_changes:
                    logger.debug(f"  {change['type']} {change['id']}: {change['old_stock']} -> {change['new_stock']} (+{change['quantity_restored']})")

            except Exception as commit_error:
                logger.error(f"Failed to commit inventory restoration for order {order_id}: {str(commit_error)}")
                db.session.rollback()
                return False
        else:
            logger.warning(f"Some inventory restorations failed for order {order_id}, rolling back")
            db.session.rollback()

        return inventory_restored

    except Exception as e:
        logger.error(f"Error in restore_inventory_for_cancelled_order for order {order_id}: {str(e)}", exc_info=True)
        try:
            from ...configuration.extensions import db
            db.session.rollback()
        except:
            pass
        return False

# Export the main functions
__all__ = [
    'handle_order_completion',
    'manual_inventory_sync',
    'setup_order_completion_hooks',
    'restore_inventory_for_cancelled_order'
]
