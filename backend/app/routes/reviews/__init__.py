"""
Reviews package for Mizizzi E-commerce platform.
Contains all review-related routes and functionality.
"""

# Import all review route blueprints
try:
    from .user_review_routes import user_review_routes
    from .admin_review_routes import admin_review_routes

    # Export all blueprints
    __all__ = ['user_review_routes', 'admin_review_routes']

except ImportError as e:
    # Fallback imports if some modules are missing
    import logging
    from flask import Blueprint

    logger = logging.getLogger(__name__)
    logger.warning(f"Some review route modules could not be imported: {e}")

    # Create fallback blueprints
    try:
        from .user_review_routes import user_review_routes
    except ImportError:
        user_review_routes = Blueprint('user_review_routes', __name__)

        @user_review_routes.route('/health', methods=['GET'])
        def fallback_user_review_health():
            return {"status": "ok", "message": "Fallback user review routes active"}, 200

    try:
        from .admin_review_routes import admin_review_routes
    except ImportError:
        admin_review_routes = Blueprint('admin_review_routes', __name__)

        @admin_review_routes.route('/health', methods=['GET'])
        def fallback_admin_review_health():
            return {"status": "ok", "message": "Fallback admin review routes active"}, 200

    __all__ = ['user_review_routes', 'admin_review_routes']

# Package metadata
__version__ = '1.0.0'
__author__ = 'Mizizzi E-commerce Team'
__description__ = 'Review management system for Mizizzi E-commerce platform'
