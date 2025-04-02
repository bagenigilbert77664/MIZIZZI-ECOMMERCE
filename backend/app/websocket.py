from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request
from datetime import datetime
import jwt
import logging

# Initialize SocketIO without an app (we'll attach it later)
socketio = SocketIO(cors_allowed_origins="*")

# Configure logging
logger = logging.getLogger('websocket')

# Store active connections
connected_users = {}
admin_rooms = set()

@socketio.on('connect')
def handle_connect():
    """Handle new connection"""
    logger.info(f"Client connected: {request.sid}")
    # We'll authenticate after connection via a separate event

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    user_id = None
    # Find and remove the user from connected_users
    for uid, sessions in list(connected_users.items()):
        if request.sid in sessions:
            sessions.remove(request.sid)
            user_id = uid
            if not sessions:  # If no more sessions for this user
                del connected_users[uid]
            break

    logger.info(f"Client disconnected: {request.sid}, User ID: {user_id}")

@socketio.on('authenticate')
def handle_authentication(data):
    """Authenticate a user with their JWT token"""
    token = data.get('token')
    if not token:
        emit('authentication_error', {'message': 'No token provided'})
        return

    try:
        # Decode the token
        decoded_token = decode_token(token)
        user_id = decoded_token.get('sub')  # or however you store user_id in your JWT
        is_admin = decoded_token.get('is_admin', False)

        # Store the connection
        if user_id not in connected_users:
            connected_users[user_id] = set()
        connected_users[user_id].add(request.sid)

        # Join user-specific room
        join_room(f"user_{user_id}")

        # Join admin room if applicable
        if is_admin:
            join_room("admin_room")
            admin_rooms.add(request.sid)

        emit('authenticated', {
            'user_id': user_id,
            'is_admin': is_admin
        })

        logger.info(f"User {user_id} authenticated (admin: {is_admin})")
    except jwt.ExpiredSignatureError:
        emit('authentication_error', {'message': 'Token expired'})
    except jwt.InvalidTokenError:
        emit('authentication_error', {'message': 'Invalid token'})
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        emit('authentication_error', {'message': str(e)})

# Product-related events
@socketio.on('product_view')
def handle_product_view(data):
    """Track when a user views a product"""
    product_id = data.get('product_id')
    if product_id:
        # Broadcast to admin room that someone is viewing this product
        emit('product_view_activity', {
            'product_id': product_id,
            'timestamp': datetime.now().isoformat()
        }, room="admin_room")

@socketio.on('add_to_cart')
def handle_add_to_cart(data):
    """Handle add to cart event"""
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    user_id = data.get('user_id')

    # You could update analytics here

    # Notify admins about cart activity
    emit('cart_activity', {
        'action': 'add',
        'product_id': product_id,
        'user_id': user_id,
        'quantity': quantity,
        'timestamp': datetime.now().isoformat()
    }, room="admin_room")

# Admin broadcasting functions
def broadcast_product_update(product_id, data):
    """Broadcast product updates to all connected clients"""
    socketio.emit('product_updated', {
        'product_id': product_id,
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

def broadcast_to_user(user_id, event_type, data):
    """Send a message to a specific user across all their devices"""
    socketio.emit(event_type, data, room=f"user_{user_id}")

def broadcast_to_admins(event_type, data):
    """Send a message to all admin users"""
    socketio.emit(event_type, data, room="admin_room")

# Order status updates
def broadcast_order_update(order_id, status, user_id=None):
    """Broadcast order status updates to the relevant user and all admins"""
    data = {
        'order_id': order_id,
        'status': status,
        'timestamp': datetime.now().isoformat()
    }

    # Send to the specific user who placed the order
    if user_id:
        broadcast_to_user(user_id, 'order_updated', data)

    # Also notify admins
    broadcast_to_admins('order_status_changed', data)

# Inventory updates
def broadcast_inventory_update(product_id, stock_level):
    """Broadcast inventory changes to all clients"""
    socketio.emit('inventory_updated', {
        'product_id': product_id,
        'stock_level': stock_level,
        'timestamp': datetime.now().isoformat()
    })

# Flash sale notifications
def broadcast_flash_sale(sale_data):
    """Broadcast flash sale notifications to all clients"""
    socketio.emit('flash_sale_started', {
        'sale_data': sale_data,
        'timestamp': datetime.now().isoformat()
    })

# For testing/debugging
@socketio.on('echo')
def handle_echo(data):
    """Echo back the received data (for testing)"""
    emit('echo_response', data)

