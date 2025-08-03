"""
Authentication utility functions for Mizizzi E-commerce Platform
"""

import logging
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity

logger = logging.getLogger(__name__)

def admin_required(f):
    """
    Decorator to require admin role for accessing endpoints.
    Must be used after @jwt_required()
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Import here to avoid circular imports
            from ..configuration.extensions import db
            from ..models.models import User, UserRole

            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401

            # Use session.get instead of Query.get to avoid deprecation warning
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Check if user has admin role
            if user.role != UserRole.ADMIN:
                return jsonify({"error": "Admin access required"}), 403

            return f(*args, **kwargs)

        except Exception as e:
            logger.error(f"Admin authorization error: {str(e)}")
            return jsonify({"error": "Authorization failed"}), 403

    return decorated_function

def get_current_user():
    """
    Get the current authenticated user

    Returns:
        User object or None if not authenticated
    """
    try:
        from ..configuration.extensions import db
        from ..models.models import User

        user_id = get_jwt_identity()
        if not user_id:
            return None

        # Use session.get instead of Query.get to avoid deprecation warning
        return db.session.get(User, user_id)

    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return None

def is_admin():
    """
    Check if the current user is an admin

    Returns:
        bool: True if user is admin, False otherwise
    """
    try:
        from ..models.models import UserRole

        user = get_current_user()
        return user and user.role == UserRole.ADMIN

    except Exception as e:
        logger.error(f"Error checking admin status: {str(e)}")
        return False

def validate_user_access(user_id):
    """
    Validate that the current user can access resources for the given user_id
    (either the same user or an admin)

    Args:
        user_id: The user ID to validate access for

    Returns:
        bool: True if access is allowed, False otherwise
    """
    try:
        current_user = get_current_user()
        if not current_user:
            return False

        # Allow access if it's the same user or if current user is admin
        return current_user.id == user_id or is_admin()

    except Exception as e:
        logger.error(f"Error validating user access: {str(e)}")
        return False

def require_user_or_admin(target_user_id):
    """
    Decorator to require that the current user is either the target user or an admin

    Args:
        target_user_id: The user ID that should have access (or admin)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not validate_user_access(target_user_id):
                return jsonify({"error": "Access denied"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
