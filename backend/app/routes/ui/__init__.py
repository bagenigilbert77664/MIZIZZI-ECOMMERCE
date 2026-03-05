"""
UI batch routes for Mizizzi E-commerce platform.
Provides batch loading and status checking for UI components.
"""

from flask import Blueprint, jsonify, current_app
from datetime import datetime
import logging

from ...utils.cache_utils import get_cache_status, test_cache_connection
from ...configuration.extensions import db

logger = logging.getLogger(__name__)

# Create UI blueprint
ui_batch_routes = Blueprint('ui_batch_routes', __name__, url_prefix='/api/ui')


@ui_batch_routes.route('/batch/status', methods=['GET'])
def batch_status():
    """
    Get batch loading status for all UI components.
    Checks database and cache connectivity for carousel, categories, topbar, and side_panels.
    """
    try:
        # Check cache connection
        cache_connected, cache_message = test_cache_connection()
        
        # Check database connection
        db_connected = False
        db_status = {}
        try:
            # Test database with a simple query
            from ..models.models import Category
            test = Category.query.first()
            db_connected = True
            db_status = {
                "carousel": "connected",
                "categories": "connected",
                "side_panels": "connected",
                "topbar": "connected"
            }
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            db_status = {
                "carousel": "disconnected",
                "categories": "disconnected",
                "side_panels": "disconnected",
                "topbar": "disconnected"
            }
        
        # Determine overall status
        overall_status = "healthy" if (cache_connected and db_connected) else "degraded"
        
        return jsonify({
            "status": overall_status,
            "cache": "connected" if cache_connected else "disconnected",
            "database": db_status,
            "endpoint": "/api/ui/batch",
            "sections_available": [
                "carousel",
                "topbar",
                "categories",
                "side_panels"
            ],
            "cache_ttls": {
                "carousel": 60,
                "categories": 300,
                "combined": 60,
                "side_panels": 300,
                "topbar": 120
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "cache_details": get_cache_status()
        }), 200
    except Exception as e:
        logger.error(f"Error checking batch status: {str(e)}")
        return jsonify({
            "status": "error",
            "cache": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


@ui_batch_routes.route('/batch/data', methods=['GET'])
def batch_data():
    """
    Get batch data for all UI components.
    Returns carousel slides, categories, topbar items, and side panel content.
    """
    try:
        from ...models.models import Category, Product
        
        # Get categories
        categories = Category.query.filter_by(is_active=True).all() if db else []
        
        # Get featured products for carousel
        carousel = Product.query.filter_by(is_active=True).limit(5).all() if db else []
        
        return jsonify({
            "status": "success",
            "carousel": [p.to_dict() if hasattr(p, 'to_dict') else {} for p in carousel],
            "categories": [c.to_dict() if hasattr(c, 'to_dict') else {} for c in categories],
            "topbar": {
                "items": []
            },
            "side_panels": {
                "active": True,
                "items": []
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200
    except Exception as e:
        logger.error(f"Error fetching batch data: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


@ui_batch_routes.route('/health', methods=['GET'])
def ui_health():
    """Health check endpoint for UI batch service."""
    try:
        cache_status = get_cache_status()
        
        return jsonify({
            "status": "ok",
            "service": "ui_batch",
            "cache": cache_status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200
    except Exception as e:
        logger.error(f"UI health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "ui_batch",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Export blueprint
__all__ = ['ui_batch_routes']
