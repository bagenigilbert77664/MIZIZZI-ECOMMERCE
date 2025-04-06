from flask import current_app
from ...websocket import broadcast_product_update, broadcast_order_update, broadcast_to_user, broadcast_to_admins

def notify_product_update(product_id, product_data):
    """Notify clients about product updates"""
    try:
        broadcast_product_update(product_id, product_data)
        current_app.logger.info(f"Broadcast product update for product {product_id}")
        return True
    except Exception as e:
        current_app.logger.error(f"Error broadcasting product update: {str(e)}")
        return False

def notify_order_status_change(order_id, status, user_id):
    """Notify about order status changes"""
    try:
        broadcast_order_update(order_id, status, user_id)
        current_app.logger.info(f"Broadcast order update for order {order_id}")
        return True
    except Exception as e:
        current_app.logger.error(f"Error broadcasting order update: {str(e)}")
        return False

def notify_low_stock(product_id, stock_level):
    """Notify admins about low stock"""
    try:
        broadcast_to_admins('low_stock_alert', {
            'product_id': product_id,
            'stock_level': stock_level
        })
        current_app.logger.info(f"Broadcast low stock alert for product {product_id}")
        return True
    except Exception as e:
        current_app.logger.error(f"Error broadcasting low stock alert: {str(e)}")
        return False

def send_user_notification(user_id, notification_type, message, data=None):
    """Send notification to specific user"""
    try:
        notification_data = {
            'type': notification_type,
            'message': message,
            'data': data or {},
            'timestamp': current_app.config.get('DATETIME_FORMAT', '%Y-%m-%d %H:%M:%S')
        }
        broadcast_to_user(user_id, 'notification', notification_data)
        current_app.logger.info(f"Sent notification to user {user_id}")
        return True
    except Exception as e:
        current_app.logger.error(f"Error sending notification to user: {str(e)}")
        return False

