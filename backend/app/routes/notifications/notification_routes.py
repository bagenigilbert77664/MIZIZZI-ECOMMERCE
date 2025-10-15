"""
Notification Routes for Mizizzi E-Commerce
Handles user notifications and preferences
"""

import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy import and_, or_, desc

from ...configuration.extensions import db
from ...models.notification_model import Notification, NotificationPreference, NotificationType, NotificationPriority
from ...models.models import User, PesapalTransaction, MpesaTransaction

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
notification_routes = Blueprint('notification_routes', __name__)

def create_error_response(message, status_code=400):
    """Create standardized error response"""
    return jsonify({
        'status': 'error',
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), status_code

def create_success_response(data, message="Success", status_code=200):
    """Create standardized success response"""
    response = {
        'status': 'success',
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    response.update(data)
    return jsonify(response), status_code

# =====================
# NOTIFICATION ROUTES
# =====================

@notification_routes.route('', methods=['GET'])
@jwt_required()
@cross_origin()
def get_notifications():
    """
    Get user notifications with pagination and filtering
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20)
    - type: Filter by notification type
    - read: Filter by read status (true/false)
    - priority: Filter by priority
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(max(1, request.args.get('per_page', 20, type=int)), 100)
        notification_type = request.args.get('type')
        read_filter = request.args.get('read')
        priority = request.args.get('priority')
        
        # Build query
        query = Notification.query.filter_by(user_id=current_user_id)
        
        # Apply filters
        if notification_type:
            try:
                type_enum = NotificationType(notification_type)
                query = query.filter_by(type=type_enum)
            except ValueError:
                pass
        
        if read_filter is not None:
            read_bool = read_filter.lower() == 'true'
            query = query.filter_by(read=read_bool)
        
        if priority:
            try:
                priority_enum = NotificationPriority(priority)
                query = query.filter_by(priority=priority_enum)
            except ValueError:
                pass
        
        # Order by creation date (newest first)
        query = query.order_by(desc(Notification.created_at))
        
        # Paginate
        notifications = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Format response
        notification_list = [n.to_dict() for n in notifications.items]
        
        # Get unread count
        unread_count = Notification.query.filter_by(
            user_id=current_user_id,
            read=False
        ).count()
        
        return create_success_response({
            'notifications': notification_list,
            'unread_count': unread_count,
            'pagination': {
                'page': notifications.page,
                'pages': notifications.pages,
                'per_page': notifications.per_page,
                'total': notifications.total,
                'has_next': notifications.has_next,
                'has_prev': notifications.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        return create_error_response('Failed to fetch notifications', 500)

@notification_routes.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
@cross_origin()
def mark_notification_as_read(notification_id):
    """Mark a notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return create_error_response('Notification not found', 404)
        
        notification.mark_as_read()
        
        return create_success_response({
            'notification': notification.to_dict()
        }, 'Notification marked as read')
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        db.session.rollback()
        return create_error_response('Failed to mark notification as read', 500)

@notification_routes.route('/read-all', methods=['PUT'])
@jwt_required()
@cross_origin()
def mark_all_as_read():
    """Mark all notifications as read"""
    try:
        current_user_id = get_jwt_identity()
        
        Notification.query.filter_by(
            user_id=current_user_id,
            read=False
        ).update({
            'read': True,
            'read_at': datetime.now(timezone.utc)
        })
        
        db.session.commit()
        
        return create_success_response({}, 'All notifications marked as read')
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        db.session.rollback()
        return create_error_response('Failed to mark all notifications as read', 500)

@notification_routes.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
@cross_origin()
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return create_error_response('Notification not found', 404)
        a
        db.session.delete(notification)
        db.session.commit()
        
        return create_success_response({}, 'Notification deleted')
        
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        db.session.rollback()
        return create_error_response('Failed to delete notification', 500)

# =====================
# PREFERENCE ROUTES
# =====================

@notification_routes.route('/preferences', methods=['GET'])
@jwt_required()
@cross_origin()
def get_preferences():
    """Get user notification preferences"""
    try:
        current_user_id = get_jwt_identity()
        
        preferences = NotificationPreference.query.filter_by(
            user_id=current_user_id
        ).first()
        
        if not preferences:
            # Create default preferences
            preferences = NotificationPreference(user_id=current_user_id)
            db.session.add(preferences)
            db.session.commit()
        
        return create_success_response({
            'preferences': preferences.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error fetching preferences: {str(e)}")
        return create_error_response('Failed to fetch preferences', 500)

@notification_routes.route('/preferences', methods=['PUT'])
@jwt_required()
@cross_origin()
def update_preferences():
    """Update user notification preferences"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return create_error_response('No data provided', 400)
        
        preferences = NotificationPreference.query.filter_by(
            user_id=current_user_id
        ).first()
        
        if not preferences:
            preferences = NotificationPreference(user_id=current_user_id)
            db.session.add(preferences)
        
        # Update preferences
        for key, value in data.items():
            if hasattr(preferences, key) and key not in ['id', 'user_id', 'created_at', 'updated_at']:
                setattr(preferences, key, value)
        
        preferences.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return create_success_response({
            'preferences': preferences.to_dict()
        }, 'Preferences updated successfully')
        
    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        db.session.rollback()
        return create_error_response('Failed to update preferences', 500)

# =====================
# PAYMENT NOTIFICATIONS
# =====================

@notification_routes.route('/payment-history', methods=['GET'])
@jwt_required()
@cross_origin()
def get_payment_notifications():
    """Get payment notifications from actual payment transactions"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(max(1, request.args.get('per_page', 20, type=int)), 100)
        status = request.args.get('status')
        
        # Get PesaPal transactions
        pesapal_query = PesapalTransaction.query.filter_by(user_id=current_user_id)
        if status:
            pesapal_query = pesapal_query.filter_by(status=status)
        pesapal_transactions = pesapal_query.order_by(desc(PesapalTransaction.created_at)).all()
        
        # Get M-PESA transactions
        mpesa_query = MpesaTransaction.query.filter_by(user_id=current_user_id)
        if status:
            mpesa_query = mpesa_query.filter_by(status=status)
        mpesa_transactions = mpesa_query.order_by(desc(MpesaTransaction.created_at)).all()
        
        # Combine and format transactions
        payment_notifications = []
        
        for transaction in pesapal_transactions:
            payment_notifications.append({
                'id': transaction.id,
                'type': 'pesapal',
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'status': transaction.status,
                'order_id': transaction.order_id,
                'merchant_reference': transaction.merchant_reference,
                'payment_method': getattr(transaction, 'payment_method', 'CARD'),
                'card_type': getattr(transaction, 'card_type', None),
                'receipt_number': getattr(transaction, 'pesapal_receipt_number', None),
                'created_at': transaction.created_at.isoformat(),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None
            })
        
        for transaction in mpesa_transactions:
            payment_notifications.append({
                'id': transaction.id,
                'type': 'mpesa',
                'amount': float(transaction.amount) if transaction.amount else 0,
                'currency': 'KES',
                'status': transaction.status,
                'order_id': transaction.order_id,
                'merchant_reference': transaction.account_reference,
                'payment_method': 'M-PESA',
                'phone_number': transaction.phone_number,
                'receipt_number': transaction.mpesa_receipt_number,
                'created_at': transaction.created_at.isoformat(),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None
            })
        
        # Sort by created_at
        payment_notifications.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Paginate manually
        start = (page - 1) * per_page
        end = start + per_page
        paginated_notifications = payment_notifications[start:end]
        
        total = len(payment_notifications)
        pages = (total + per_page - 1) // per_page
        
        return create_success_response({
            'notifications': paginated_notifications,
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total,
                'has_next': page < pages,
                'has_prev': page > 1
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching payment notifications: {str(e)}")
        return create_error_response('Failed to fetch payment notifications', 500)

# Export the blueprint
__all__ = ['notification_routes']
