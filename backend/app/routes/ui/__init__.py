"""
UI batch routes for Mizizzi E-commerce platform.
Provides batch loading and status checking for UI components with Redis caching.
"""

from flask import Blueprint, jsonify, current_app, request
from datetime import datetime
import logging
import json

from ...utils.cache_utils import get_cache_status, test_cache_connection
from ...utils.redis_cache_helper import redis_cache, get_cache_stats
from ...services.ui_data_service import UIDataService
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
        # Check Redis cache connection
        redis_connected = redis_cache.is_available()
        
        # Check database connection
        db_connected = False
        db_status = {}
        try:
            from ...models.models import Category
            test = Category.query.first()
            db_connected = True
            db_status = {
                "carousel": "connected",
                "categories": "connected",
                "side_panels": "connected",
                "topbar": "connected"
            }
            logger.info("[v0] Database connection test successful")
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            db_status = {
                "carousel": "disconnected",
                "categories": "disconnected",
                "side_panels": "disconnected",
                "topbar": "disconnected"
            }
        
        # Determine overall status
        overall_status = "healthy" if (redis_connected and db_connected) else "degraded"
        
        return jsonify({
            "status": overall_status,
            "cache": "connected" if redis_connected else "disconnected",
            "cache_type": "redis" if redis_connected else "none",
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
            "cache_stats": get_cache_stats(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
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
    Get batch data for all UI components with Redis caching.
    Returns carousel slides, categories, topbar items, and side panel content.
    
    Query Parameters:
    - sections: comma-separated list of sections to fetch (carousel, categories, topbar, side_panels)
    - no_cache: if 'true', bypass cache and fetch fresh data
    """
    try:
        # Check for no-cache flag
        no_cache = request.args.get('no_cache', 'false').lower() == 'true'
        sections = request.args.get('sections', 'carousel,categories,topbar,side_panels').split(',')
        
        # Fetch all data (caching is handled at service level)
        all_data = UIDataService.get_all_ui_data()
        
        # Filter to requested sections
        response_data = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "cache_stats": get_cache_stats()
        }
        
        # Include requested sections
        if 'carousel' in sections or 'all' in sections:
            response_data['carousel'] = all_data['carousel']
        
        if 'categories' in sections or 'all' in sections:
            response_data['categories'] = all_data['categories']
        
        if 'topbar' in sections or 'all' in sections:
            response_data['topbar'] = all_data['topbar']
        
        if 'side_panels' in sections or 'all' in sections:
            response_data['side_panels'] = all_data['side_panels']
        
        logger.info(f"[v0] Batch data request completed - sections: {sections}")
        
        return jsonify(response_data), 200
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
        cache_stats = get_cache_stats()
        
        return jsonify({
            "status": "healthy" if cache_stats['connected'] else "degraded",
            "service": "ui_batch",
            "cache": cache_stats,
            "redis_available": redis_cache.is_available(),
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


@ui_batch_routes.route('/cache/invalidate', methods=['POST'])
def invalidate_cache():
    """
    Invalidate all UI component caches.
    Useful after database changes or admin updates.
    """
    try:
        result = UIDataService.invalidate_all_caches()
        
        return jsonify({
            "status": "success" if result['success'] else "error",
            "message": f"Invalidated {result.get('invalidated', 0)} cache keys" if result['success'] else result.get('error'),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Cache invalidation failed: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 500


# Export blueprint
__all__ = ['ui_batch_routes']
