"""
Inventory routes package for Mizizzi E-commerce platform.
Contains both user and admin inventory management routes.
"""

# Import the blueprints to make them available when the package is imported
try:
    from .user_inventory_routes import user_inventory_routes
    from .admin_inventory_routes import admin_inventory_routes

    __all__ = ['user_inventory_routes', 'admin_inventory_routes']

except ImportError as e:
    # Handle import errors gracefully
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Failed to import inventory routes: {str(e)}")

    # Create fallback blueprints
    from flask import Blueprint, jsonify

    user_inventory_routes = Blueprint('user_inventory_routes', __name__)
    admin_inventory_routes = Blueprint('admin_inventory_routes', __name__)

    @user_inventory_routes.route('/health', methods=['GET'])
    def user_inventory_health():
        return jsonify({
            "status": "fallback",
            "message": "User inventory routes fallback active"
        }), 200

    @admin_inventory_routes.route('/health', methods=['GET'])
    def admin_inventory_health():
        return jsonify({
            "status": "fallback",
            "message": "Admin inventory routes fallback active"
        }), 200

    __all__ = ['user_inventory_routes', 'admin_inventory_routes']
