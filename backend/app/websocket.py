"""
WebSocket module for Mizizzi E-commerce platform.
Provides real-time notifications for cart updates, orders, and admin actions.
"""
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request
from flask_jwt_extended import decode_token
from functools import wraps
import logging

# Initialize SocketIO
socketio = SocketIO()

# Set up logger
logger = logging.getLogger(__name__)

# Connected clients tracking
connected_clients = {}
connected_admins = set()

def authenticated_only(f):
    """Decorator to ensure a user is authenticated for WebSocket events."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        if 'jwt' not in kwargs or not kwargs['jwt']:
            disconnect()
            return

        try:
            token_data = decode_token(kwargs['jwt'])
            user_id = token_data['sub']
            kwargs['user_id'] = user_id
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"WebSocket authentication error: {str(e)}")
            disconnect()

    return wrapped

@socketio.on('connect')
def on_connect():
    """Handle client connection."""
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def on_disconnect():
    """Handle client disconnection."""
    logger.info(f"Client disconnected: {request.sid}")

    # Remove from connected clients if applicable
    for user_id, sid in list(connected_clients.items()):
        if sid == request.sid:
            del connected_clients[user_id]
            logger.info(f"User {user_id} disconnected")
            break

    # Remove from connected admins if applicable
    if request.sid in connected_admins:
        connected_admins.remove(request.sid)
        logger.info("Admin disconnected")

@socketio.on('auth')
def handle_auth(data):
    """Handle authentication and register client."""
    jwt = data.get('jwt')
    is_admin = data.get('is_admin', False)

    if not jwt:
        return

    try:
        token_data = decode_token(jwt)
        user_id = token_data['sub']

        # Register client
        connected_clients[user_id] = request.sid
        logger.info(f"User {user_id} authenticated")

        # Join user's room for private messages
        join_room(f"user_{user_id}")

        # Register as admin if applicable
        if is_admin:
            connected_admins.add(request.sid)
            join_room("admin")
            logger.info(f"Admin {user_id} authenticated")

        # Send acknowledgment
        emit('auth_success', {'user_id': user_id})

    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        emit('auth_error', {'error': 'Invalid token'})

def broadcast_to_user(user_id, event, data):
    """
    Broadcast an event to a specific user.

    Args:
        user_id: The ID of the user to broadcast to
        event: The event name
        data: The data to send
    """
    if str(user_id) in connected_clients:
        # User is connected, emit directly to their socket
        emit(event, data, room=connected_clients[str(user_id)])
    else:
        # User is not connected, emit to their room
        emit(event, data, room=f"user_{user_id}")

def broadcast_to_admins(event, data):
    """
    Broadcast an event to all connected admins.

    Args:
        event: The event name
        data: The data to send
    """
    emit(event, data, room="admin")
