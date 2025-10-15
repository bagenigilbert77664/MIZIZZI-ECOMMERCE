"""
Notification Utility Functions
Helper functions to create and manage notifications
"""

import logging
from datetime import datetime, timezone
from ..configuration.extensions import db
from ..models.notification_model import Notification, NotificationType, NotificationPriority

logger = logging.getLogger(__name__)

def create_notification(
    user_id,
    title,
    message,
    notification_type=NotificationType.SYSTEM,
    priority=NotificationPriority.NORMAL,
    link=None,
    image=None,
    badge=None,
    order_id=None,
    product_id=None,
    data=None
):
    """
    Create a new notification for a user
    
    Args:
        user_id: ID of the user to notify
        title: Notification title
        message: Notification message
        notification_type: Type of notification (NotificationType enum)
        priority: Priority level (NotificationPriority enum)
        link: Optional link URL
        image: Optional image URL
        badge: Optional badge text
        order_id: Optional related order ID
        product_id: Optional related product ID
        data: Optional additional data (dict)
    
    Returns:
        Notification object or None if failed
    """
    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            description=message,
            type=notification_type,
            priority=priority,
            link=link,
            image=image,
            badge=badge,
            order_id=order_id,
            product_id=product_id,
            data=data,
            read=False,
            created_at=datetime.now(timezone.utc)
        )
        
        db.session.add(notification)
        db.session.commit()
        
        logger.info(f"Created notification {notification.id} for user {user_id}: {title}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        db.session.rollback()
        return None

def create_payment_notification(user_id, payment_data):
    """
    Create a payment notification
    
    Args:
        user_id: ID of the user
        payment_data: Dictionary containing payment information
            - status: Payment status (completed, failed, pending)
            - amount: Payment amount
            - currency: Currency code
            - order_id: Order ID
            - payment_method: Payment method used
            - receipt_number: Receipt/confirmation number
    
    Returns:
        Notification object or None if failed
    """
    try:
        status = payment_data.get('status', 'pending')
        amount = payment_data.get('amount', 0)
        currency = payment_data.get('currency', 'KES')
        order_id = payment_data.get('order_id')
        payment_method = payment_data.get('payment_method', 'Card')
        receipt_number = payment_data.get('receipt_number')
        
        # Determine title, message, and priority based on status
        if status == 'completed':
            title = "Payment Successful"
            message = f"Your payment of {currency} {amount:,.2f} for Order #{order_id} was successful."
            priority = NotificationPriority.HIGH
            badge = "Success"
        elif status == 'failed':
            title = "Payment Failed"
            message = f"Your payment of {currency} {amount:,.2f} for Order #{order_id} failed. Please try again."
            priority = NotificationPriority.HIGH
            badge = "Failed"
        elif status == 'pending':
            title = "Payment Pending"
            message = f"Your {payment_method} payment of {currency} {amount:,.2f} for Order #{order_id} is pending confirmation."
            priority = NotificationPriority.MEDIUM
            badge = "Pending"
        else:
            title = "Payment Update"
            message = f"Payment status for Order #{order_id}: {status}"
            priority = NotificationPriority.NORMAL
            badge = None
        
        # Create notification
        notification = create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.PAYMENT,
            priority=priority,
            link=f"/account?tab=orders&id={order_id}" if order_id else None,
            badge=badge,
            order_id=order_id,
            data={
                'payment_status': status,
                'amount': amount,
                'currency': currency,
                'payment_method': payment_method,
                'receipt_number': receipt_number
            }
        )
        
        return notification
        
    except Exception as e:
        logger.error(f"Error creating payment notification: {str(e)}")
        return None

def create_order_notification(user_id, order_data):
    """
    Create an order notification
    
    Args:
        user_id: ID of the user
        order_data: Dictionary containing order information
            - order_id: Order ID
            - status: Order status
            - tracking_number: Optional tracking number
    
    Returns:
        Notification object or None if failed
    """
    try:
        order_id = order_data.get('order_id')
        status = order_data.get('status', 'pending')
        tracking_number = order_data.get('tracking_number')
        
        # Determine title and message based on status
        status_messages = {
            'confirmed': ("Order Confirmed", f"Your order #{order_id} has been confirmed and is being processed."),
            'processing': ("Order Processing", f"Your order #{order_id} is being prepared for shipment."),
            'shipped': ("Order Shipped", f"Your order #{order_id} has been shipped. Tracking: {tracking_number}"),
            'delivered': ("Order Delivered", f"Your order #{order_id} has been delivered. Enjoy your purchase!"),
            'cancelled': ("Order Cancelled", f"Your order #{order_id} has been cancelled."),
        }
        
        title, message = status_messages.get(status, ("Order Update", f"Order #{order_id} status: {status}"))
        
        notification = create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.ORDER,
            priority=NotificationPriority.NORMAL,
            link=f"/account?tab=orders&id={order_id}",
            order_id=order_id,
            data={
                'order_status': status,
                'tracking_number': tracking_number
            }
        )
        
        return notification
        
    except Exception as e:
        logger.error(f"Error creating order notification: {str(e)}")
        return None
