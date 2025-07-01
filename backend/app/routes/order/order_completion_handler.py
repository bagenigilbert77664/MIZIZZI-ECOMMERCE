"""
Order completion handler that automatically reduces inventory when orders are completed.
Integrates with the Flask-SocketIO for real-time updates.
"""
from flask import current_app
from flask_socketio import emit
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def handle_order_completion(order_id, new_status):
    """
    Handle inventory reduction when an order is completed.
    This should be called whenever an order status changes to DELIVERED or PROCESSING.

    Args:
        order_id (int): The ID of the order being completed
        new_status (str): The new status of the order

    Returns:
        bool: True if inventory was successfully reduced, False otherwise
    """
    try:
        # Import here to avoid circular imports
        from ...models.models import Order, OrderItem, Inventory, Product, db
        from ...websocket import socketio

        # Only reduce inventory for certain status changes
        inventory_reduction_statuses = ['DELIVERED', 'PROCESSING', 'CONFIRMED']
        if new_status not in inventory_reduction_statuses:
            logger.info(f"Order {order_id} status changed to {new_status}, not reducing inventory")
            return True

        # Get the order with items
        order = Order.query.options(db.joinedload(Order.items)).get(order_id)
        if not order:
            logger.error(f"Order {order_id} not found")
            return False

        # Check if inventory has already been reduced for this order
        if hasattr(order, 'inventory_reduced') and order.inventory_reduced:
            logger.info(f"Inventory already reduced for order {order_id}")
            return True

        # Check order notes to see if inventory was already reduced
        if order.notes and "Inventory reduced" in order.notes:
            logger.info(f"Inventory already reduced for order {order_id} (found in notes)")
            return True

        logger.info(f"Reducing inventory for order {order_id} with {len(order.items)} items")

        # Track products that need real-time updates
        updated_products = []

        # Process each order item
        for order_item in order.items:
            try:
                # Find or create inventory record
                inventory = Inventory.query.filter_by(
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id if hasattr(order_item, 'variant_id') else None
                ).first()

                if not inventory:
                    # Create inventory record from product data
                    product = Product.query.get(order_item.product_id)
                    if product:
                        initial_stock = max(0, product.stock - order_item.quantity)
                        inventory = Inventory(
                            product_id=order_item.product_id,
                            variant_id=order_item.variant_id if hasattr(order_item, 'variant_id') else None,
                            stock_level=initial_stock,
                            reserved_quantity=0,
                            status='active' if initial_stock > 0 else 'out_of_stock',
                            last_updated=datetime.utcnow()
                        )
                        db.session.add(inventory)

                        # Update product stock for backward compatibility
                        product.stock = initial_stock

                        # Track for real-time updates
                        updated_products.append({
                            'product_id': order_item.product_id,
                            'old_stock': product.stock + order_item.quantity,
                            'new_stock': initial_stock,
                            'quantity_sold': order_item.quantity
                        })

                        logger.info(f"Created inventory record for product {order_item.product_id}, reduced to {initial_stock}")
                else:
                    # Reduce existing inventory
                    old_stock = inventory.stock_level
                    inventory.stock_level = max(0, inventory.stock_level - order_item.quantity)
                    inventory.last_updated = datetime.utcnow()

                    # Update inventory status based on new stock level
                    if inventory.stock_level == 0:
                        inventory.status = 'out_of_stock'
                    elif inventory.stock_level <= inventory.low_stock_threshold:
                        inventory.status = 'low_stock'
                    else:
                        inventory.status = 'active'

                    # Update product stock for backward compatibility
                    product = Product.query.get(order_item.product_id)
                    if product:
                        product.stock = inventory.stock_level

                        # Track for real-time updates
                        updated_products.append({
                            'product_id': order_item.product_id,
                            'old_stock': old_stock,
                            'new_stock': inventory.stock_level,
                            'quantity_sold': order_item.quantity
                        })

                    logger.info(f"Reduced inventory for product {order_item.product_id} from {old_stock} to {inventory.stock_level}")

            except Exception as item_error:
                logger.error(f"Error processing order item {order_item.id}: {str(item_error)}")
                # Continue with other items even if one fails
                continue

        # Mark order as having inventory reduced
        if not order.notes:
            order.notes = f"Inventory reduced on {datetime.utcnow().isoformat()}"
        elif "Inventory reduced" not in order.notes:
            order.notes += f" | Inventory reduced on {datetime.utcnow().isoformat()}"

        # Add inventory_reduced flag if the model supports it
        if hasattr(order, 'inventory_reduced'):
            order.inventory_reduced = True

        # Commit all changes
        db.session.commit()

        # Send real-time updates via WebSocket
        try:
            for product_update in updated_products:
                socketio.emit('inventory_updated', {
                    'product_id': product_update['product_id'],
                    'new_stock': product_update['new_stock'],
                    'old_stock': product_update['old_stock'],
                    'quantity_sold': product_update['quantity_sold'],
                    'timestamp': datetime.utcnow().isoformat(),
                    'order_id': order_id
                }, namespace='/inventory')

                # Also emit to specific product room
                socketio.emit('stock_update', {
                    'stock': product_update['new_stock'],
                    'status': 'in_stock' if product_update['new_stock'] > 0 else 'out_of_stock',
                    'last_updated': datetime.utcnow().isoformat()
                }, room=f"product_{product_update['product_id']}")

            logger.info(f"Sent real-time inventory updates for {len(updated_products)} products")
        except Exception as ws_error:
            logger.error(f"Error sending WebSocket updates: {str(ws_error)}")
            # Don't fail the whole operation if WebSocket fails

        logger.info(f"Successfully reduced inventory for order {order_id}")
        return True

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reducing inventory for order {order_id}: {str(e)}")
        return False

def handle_order_cancellation(order_id):
    """
    Handle inventory restoration when an order is cancelled.

    Args:
        order_id (int): The ID of the cancelled order

    Returns:
        bool: True if inventory was successfully restored, False otherwise
    """
    try:
        from ...models.models import Order, OrderItem, Inventory, Product, db
        from ...websocket import socketio

        # Get the order with items
        order = Order.query.options(db.joinedload(Order.items)).get(order_id)
        if not order:
            logger.error(f"Order {order_id} not found for cancellation")
            return False

        # Check if inventory was previously reduced
        if not (order.notes and "Inventory reduced" in order.notes):
            logger.info(f"Inventory was not reduced for order {order_id}, nothing to restore")
            return True

        logger.info(f"Restoring inventory for cancelled order {order_id}")

        # Track products that need real-time updates
        updated_products = []

        # Restore inventory for each order item
        for order_item in order.items:
            try:
                # Find inventory record
                inventory = Inventory.query.filter_by(
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id if hasattr(order_item, 'variant_id') else None
                ).first()

                if inventory:
                    # Restore inventory
                    old_stock = inventory.stock_level
                    inventory.stock_level += order_item.quantity
                    inventory.last_updated = datetime.utcnow()

                    # Update inventory status
                    if inventory.stock_level > inventory.low_stock_threshold:
                        inventory.status = 'active'
                    elif inventory.stock_level > 0:
                        inventory.status = 'low_stock'

                    # Update product stock
                    product = Product.query.get(order_item.product_id)
                    if product:
                        product.stock = inventory.stock_level

                        updated_products.append({
                            'product_id': order_item.product_id,
                            'old_stock': old_stock,
                            'new_stock': inventory.stock_level,
                            'quantity_restored': order_item.quantity
                        })

                    logger.info(f"Restored inventory for product {order_item.product_id} from {old_stock} to {inventory.stock_level}")

            except Exception as item_error:
                logger.error(f"Error restoring inventory for item {order_item.id}: {str(item_error)}")
                continue

        # Update order notes
        if order.notes:
            order.notes += f" | Inventory restored on {datetime.utcnow().isoformat()}"

        # Remove inventory_reduced flag if the model supports it
        if hasattr(order, 'inventory_reduced'):
            order.inventory_reduced = False

        # Commit changes
        db.session.commit()

        # Send real-time updates
        try:
            for product_update in updated_products:
                socketio.emit('inventory_restored', {
                    'product_id': product_update['product_id'],
                    'new_stock': product_update['new_stock'],
                    'old_stock': product_update['old_stock'],
                    'quantity_restored': product_update['quantity_restored'],
                    'timestamp': datetime.utcnow().isoformat(),
                    'order_id': order_id
                }, namespace='/inventory')

        except Exception as ws_error:
            logger.error(f"Error sending WebSocket updates for restoration: {str(ws_error)}")

        logger.info(f"Successfully restored inventory for cancelled order {order_id}")
        return True

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error restoring inventory for cancelled order {order_id}: {str(e)}")
        return False

def setup_order_completion_hooks(app):
    """
    Set up hooks to automatically reduce inventory when orders are completed.
    This should be called during app initialization.

    Args:
        app: Flask application instance
    """
    try:
        from ...models.models import Order, db
        from sqlalchemy import event

        logger.info("Setting up order completion hooks...")

        # Hook for order status changes
        @event.listens_for(Order.status, 'set')
        def order_status_changed(target, value, oldvalue, initiator):
            """Automatically reduce inventory when order status changes to completed states."""
            if value != oldvalue and value in ['DELIVERED', 'PROCESSING', 'CONFIRMED']:
                logger.info(f"Order {target.id} status changed from {oldvalue} to {value}")

                # Schedule inventory reduction after the current transaction commits
                @event.listens_for(db.session, 'after_commit', once=True)
                def reduce_inventory_after_commit():
                    with app.app_context():
                        handle_order_completion(target.id, value)

            elif value != oldvalue and value in ['CANCELLED', 'REFUNDED']:
                logger.info(f"Order {target.id} status changed from {oldvalue} to {value}")

                # Schedule inventory restoration after the current transaction commits
                @event.listens_for(db.session, 'after_commit', once=True)
                def restore_inventory_after_commit():
                    with app.app_context():
                        handle_order_cancellation(target.id)

        logger.info("Order completion hooks set up successfully")

    except Exception as e:
        logger.error(f"Error setting up order completion hooks: {str(e)}")

def manual_inventory_sync():
    """
    Manually sync inventory for all completed orders that haven't had inventory reduced.
    This is useful for migrating existing orders.

    Returns:
        dict: Summary of the sync operation
    """
    try:
        from ...models.models import Order, db

        logger.info("Starting manual inventory sync...")

        # Find completed orders that haven't had inventory reduced
        completed_orders = Order.query.filter(
            Order.status.in_(['DELIVERED', 'PROCESSING', 'CONFIRMED']),
            ~Order.notes.like('%Inventory reduced%') if Order.notes else True
        ).all()

        success_count = 0
        error_count = 0

        for order in completed_orders:
            try:
                if handle_order_completion(order.id, order.status):
                    success_count += 1
                else:
                    error_count += 1
            except Exception as e:
                logger.error(f"Error syncing inventory for order {order.id}: {str(e)}")
                error_count += 1

        logger.info(f"Manual inventory sync completed: {success_count} success, {error_count} errors")

        return {
            'success': True,
            'orders_processed': len(completed_orders),
            'success_count': success_count,
            'error_count': error_count
        }

    except Exception as e:
        logger.error(f"Error in manual inventory sync: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
