"""
WebSocket implementation for Mizizzi E-commerce Platform
Provides real-time communication capabilities for the application.
"""
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import logging
from flask import request
from flask_jwt_extended import decode_token, get_jwt_identity
import json
from datetime import datetime
import threading
from collections import defaultdict

# Set up logger
logger = logging.getLogger(__name__)

# Initialize SocketIO instance
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

# Thread-safe client management
class ClientManager:
    def __init__(self):
        self._clients = {}
        self._rooms = defaultdict(set)
        self._lock = threading.Lock()

    def add_client(self, sid, user_id=None, user_type='guest'):
        with self._lock:
            self._clients[sid] = {
                'user_id': user_id,
                'user_type': user_type,
                'connected_at': datetime.utcnow(),
                'rooms': set()
            }
            logger.info(f"Client {sid} connected as {user_type} (user_id: {user_id})")

    def remove_client(self, sid):
        with self._lock:
            if sid in self._clients:
                client_info = self._clients[sid]
                # Remove from all rooms
                for room in client_info['rooms']:
                    self._rooms[room].discard(sid)
                del self._clients[sid]
                logger.info(f"Client {sid} disconnected")

    def join_room(self, sid, room):
        with self._lock:
            if sid in self._clients:
                self._clients[sid]['rooms'].add(room)
                self._rooms[room].add(sid)
                logger.info(f"Client {sid} joined room {room}")

    def leave_room(self, sid, room):
        with self._lock:
            if sid in self._clients:
                self._clients[sid]['rooms'].discard(room)
                self._rooms[room].discard(sid)
                logger.info(f"Client {sid} left room {room}")

    def get_client_info(self, sid):
        with self._lock:
            return self._clients.get(sid)

    def get_room_clients(self, room):
        with self._lock:
            return list(self._rooms[room])

    def get_stats(self):
        with self._lock:
            return {
                'total_clients': len(self._clients),
                'total_rooms': len(self._rooms),
                'clients_by_type': {
                    'admin': len([c for c in self._clients.values() if c['user_type'] == 'admin']),
                    'user': len([c for c in self._clients.values() if c['user_type'] == 'user']),
                    'guest': len([c for c in self._clients.values() if c['user_type'] == 'guest'])
                }
            }

# Global client manager instance
client_manager = ClientManager()

# Authentication helper
def authenticate_socket_user(token):
    """Authenticate user from JWT token"""
    try:
        if not token:
            return None, 'guest'

        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        # Decode JWT token
        decoded_token = decode_token(token)
        user_id = decoded_token.get('sub')
        user_type = decoded_token.get('user_type', 'user')

        return user_id, user_type
    except Exception as e:
        logger.warning(f"Socket authentication failed: {str(e)}")
        return None, 'guest'

# SocketIO Event Handlers
@socketio.on('connect')
def handle_connect(auth=None):
    """Handle client connection"""
    try:
        # Get authentication token
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get('token')

        # Authenticate user
        user_id, user_type = authenticate_socket_user(token)

        # Add client to manager
        client_manager.add_client(request.sid, user_id, user_type)

        # Send connection confirmation
        emit('connected', {
            'status': 'connected',
            'user_id': user_id,
            'user_type': user_type,
            'timestamp': datetime.utcnow().isoformat()
        })

        # Join user-specific room if authenticated
        if user_id:
            join_room(f"user_{user_id}")
            client_manager.join_room(request.sid, f"user_{user_id}")

        logger.info(f"WebSocket connection established for {user_type} (ID: {user_id})")

    except Exception as e:
        logger.error(f"Error handling WebSocket connection: {str(e)}")
        emit('error', {'message': 'Connection failed'})
        disconnect()

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        client_manager.remove_client(request.sid)
        logger.info(f"WebSocket client {request.sid} disconnected")
    except Exception as e:
        logger.error(f"Error handling WebSocket disconnection: {str(e)}")

@socketio.on('join_room')
def handle_join_room(data):
    """Handle room joining"""
    try:
        room = data.get('room')
        if not room:
            emit('error', {'message': 'Room name required'})
            return

        # Validate room access based on user type
        client_info = client_manager.get_client_info(request.sid)
        if not client_info:
            emit('error', {'message': 'Client not found'})
            return

        # Check permissions for admin rooms
        if room.startswith('admin_') and client_info['user_type'] != 'admin':
            emit('error', {'message': 'Access denied to admin room'})
            return

        join_room(room)
        client_manager.join_room(request.sid, room)

        emit('room_joined', {
            'room': room,
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error joining room: {str(e)}")
        emit('error', {'message': 'Failed to join room'})

@socketio.on('leave_room')
def handle_leave_room(data):
    """Handle room leaving"""
    try:
        room = data.get('room')
        if not room:
            emit('error', {'message': 'Room name required'})
            return

        leave_room(room)
        client_manager.leave_room(request.sid, room)

        emit('room_left', {
            'room': room,
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error leaving room: {str(e)}")
        emit('error', {'message': 'Failed to leave room'})

@socketio.on('ping')
def handle_ping():
    """Handle ping for connection health check"""
    emit('pong', {'timestamp': datetime.utcnow().isoformat()})

@socketio.on('get_stats')
def handle_get_stats():
    """Handle stats request (admin only)"""
    try:
        client_info = client_manager.get_client_info(request.sid)
        if not client_info or client_info['user_type'] != 'admin':
            emit('error', {'message': 'Access denied'})
            return

        stats = client_manager.get_stats()
        emit('stats', stats)

    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        emit('error', {'message': 'Failed to get stats'})

# Business Logic Event Handlers
@socketio.on('cart_updated')
def handle_cart_updated(data):
    """Handle cart update notifications"""
    try:
        user_id = data.get('user_id')
        if not user_id:
            return

        # Emit to user's room
        socketio.emit('cart_update', {
            'type': 'cart_updated',
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f"user_{user_id}")

    except Exception as e:
        logger.error(f"Error handling cart update: {str(e)}")

@socketio.on('order_status_changed')
def handle_order_status_changed(data):
    """Handle order status change notifications"""
    try:
        user_id = data.get('user_id')
        order_id = data.get('order_id')
        new_status = data.get('status')

        if not all([user_id, order_id, new_status]):
            return

        # Emit to user's room
        socketio.emit('order_update', {
            'type': 'status_changed',
            'order_id': order_id,
            'status': new_status,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f"user_{user_id}")

        # Also emit to admin room for monitoring
        socketio.emit('admin_order_update', {
            'type': 'status_changed',
            'user_id': user_id,
            'order_id': order_id,
            'status': new_status,
            'timestamp': datetime.utcnow().isoformat()
        }, room='admin_orders')

    except Exception as e:
        logger.error(f"Error handling order status change: {str(e)}")

@socketio.on('product_stock_updated')
def handle_product_stock_updated(data):
    """Handle product stock update notifications"""
    try:
        product_id = data.get('product_id')
        new_stock = data.get('stock')

        if product_id is None or new_stock is None:
            return

        # Emit to all clients in product room
        socketio.emit('stock_update', {
            'type': 'stock_updated',
            'product_id': product_id,
            'stock': new_stock,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f"product_{product_id}")

        # Emit to admin room
        socketio.emit('admin_stock_update', {
            'type': 'stock_updated',
            'product_id': product_id,
            'stock': new_stock,
            'timestamp': datetime.utcnow().isoformat()
        }, room='admin_inventory')

    except Exception as e:
        logger.error(f"Error handling product stock update: {str(e)}")

@socketio.on('new_order')
def handle_new_order(data):
    """Handle new order notifications"""
    try:
        order_id = data.get('order_id')
        user_id = data.get('user_id')
        total = data.get('total')

        if not all([order_id, user_id]):
            return

        # Emit to admin room
        socketio.emit('admin_new_order', {
            'type': 'new_order',
            'order_id': order_id,
            'user_id': user_id,
            'total': total,
            'timestamp': datetime.utcnow().isoformat()
        }, room='admin_orders')

    except Exception as e:
        logger.error(f"Error handling new order: {str(e)}")

# Utility functions for external use
def emit_to_user(user_id, event, data):
    """Emit event to specific user"""
    try:
        socketio.emit(event, data, room=f"user_{user_id}")
    except Exception as e:
        logger.error(f"Error emitting to user {user_id}: {str(e)}")

def emit_to_admin(event, data):
    """Emit event to all admin users"""
    try:
        socketio.emit(event, data, room='admin_general')
    except Exception as e:
        logger.error(f"Error emitting to admin: {str(e)}")

def emit_to_room(room, event, data):
    """Emit event to specific room"""
    try:
        socketio.emit(event, data, room=room)
    except Exception as e:
        logger.error(f"Error emitting to room {room}: {str(e)}")

def get_connection_stats():
    """Get current connection statistics"""
    return client_manager.get_stats()

# Error handler
@socketio.on_error_default
def default_error_handler(e):
    """Default error handler for SocketIO"""
    logger.error(f"SocketIO error: {str(e)}")
    emit('error', {'message': 'An error occurred'})

logger.info("WebSocket handlers initialized successfully")
