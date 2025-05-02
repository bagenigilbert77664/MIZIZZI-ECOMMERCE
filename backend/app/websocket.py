"""
WebSocket module for Mizizzi E-commerce platform.
Handles real-time communication between server and clients.
"""
import logging
import json
from flask import current_app
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request
from flask_jwt_extended import decode_token
from functools import wraps

# Initialize SocketIO with async_mode='eventlet' to ensure proper integration
socketio = SocketIO(async_mode='eventlet')

# Set up logger
logger = logging.getLogger(__name__)

# Connected clients tracking
connected_clients = {}
connected_admins = set()

def get_socketio():
    """
    Returns the SocketIO instance.
    This is useful when you need to access the socketio instance from other modules.
    """
    return socketio

def init_socketio(app):
    """
    Initialize the SocketIO instance with the app.
    This is useful when you need to initialize the socketio instance from other modules.
    """
    socketio.init_app(app,
                     cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'),
                     async_mode='eventlet',
                     message_queue=app.config.get('SOCKETIO_MESSAGE_QUEUE', None))
    return socketio

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
    Broadcast a message to a specific user.

    Args:
        user_id: The ID of the user to broadcast to
        event: The event name
        data: The data to send
    """
    try:
        # Check if SocketIO is initialized
        if not hasattr(current_app, 'socketio'):
            logger.warning("SocketIO not initialized, skipping broadcast")
            return

        # Get the user's room
        room = f"user_{user_id}"

        # Broadcast to the user's room
        current_app.socketio.emit(event, data, room=room, namespace='/user')
        logger.debug(f"Broadcast to user {user_id}: {event}")
    except Exception as e:
        logger.error(f"Error broadcasting to user {user_id}: {str(e)}")

def broadcast_to_admins(event, data):
    """
    Broadcast a message to all admin users.

    Args:
        event: The event name
        data: The data to send
    """
    try:
        # Check if SocketIO is initialized
        if not hasattr(current_app, 'socketio'):
            logger.warning("SocketIO not initialized, skipping broadcast")
            return

        # Broadcast to the admin room
        current_app.socketio.emit(event, data, room="admin", namespace='/admin')
        logger.debug(f"Broadcast to admins: {event}")
    except Exception as e:
        logger.error(f"Error broadcasting to admins: {str(e)}")

def broadcast_to_all(event, data):
    """
    Broadcast a message to all connected clients.

    Args:
        event: The event name
        data: The data to send
    """
    try:
        # Check if SocketIO is initialized
        if not hasattr(current_app, 'socketio'):
            logger.warning("SocketIO not initialized, skipping broadcast")
            return

        # Broadcast to all clients
        current_app.socketio.emit(event, data)
        logger.debug(f"Broadcast to all: {event}")
    except Exception as e:
        logger.error(f"Error broadcasting to all: {str(e)}")

def check_namespace(request):
    """
    Check if the request has a namespace attribute.
    If not, add a default namespace.

    Args:
        request: The Flask request object
    """
    if not hasattr(request, 'namespace'):
        # Add a default namespace attribute
        request.namespace = '/user'
        logger.debug("Added default namespace to request")

    return request
