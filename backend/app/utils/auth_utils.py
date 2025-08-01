"""
Authentication utilities for the Mizizzi E-commerce Platform
"""

import logging
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity

# Import models
try:
    from ..models.models import User, UserRole
except ImportError:
    try:
        from app.models.models import User, UserRole
    except ImportError:
        from models.models import User, UserRole

logger = logging.getLogger(__name__)

def get_current_user():
    """Get the current authenticated user"""
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return None
        return User.query.get(user_id)
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return None

def admin_required(f):
    """Decorator to require admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if user.role != UserRole.ADMIN:
                return jsonify({"error": "Admin access required"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin authorization error: {str(e)}")
            return jsonify({"error": "Authorization failed"}), 403

    return decorated_function

def moderator_required(f):
    """Decorator to require moderator or admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
                return jsonify({"error": "Moderator access required"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Moderator authorization error: {str(e)}")
            return jsonify({"error": "Authorization failed"}), 403

    return decorated_function

def user_required(f):
    """Decorator to require any authenticated user"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if not user.is_active:
                return jsonify({"error": "Account is inactive"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"User authorization error: {str(e)}")
            return jsonify({"error": "Authorization failed"}), 403

    return decorated_function
