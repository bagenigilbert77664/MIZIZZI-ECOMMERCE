"""
Admin Search Routes for Mizizzi E-commerce platform.
Provides advanced search functionality for administrators with AI-powered semantic search.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_search_routes = Blueprint('admin_search_routes', __name__, url_prefix='/api/admin/search')

try:
    from app.configuration.extensions import db
    from app.models.models import Product, Category, Brand
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import Product, Category, Brand
    except ImportError:
        logger.error("Could not import database models")
        db = None
        Product = None
        Category = None
        Brand = None

from .search_service import get_search_service
from .embedding_service import get_embedding_service


# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)  # Higher limit for admin
    return page, per_page


def paginate_results(results, page, per_page):
    """Paginate search results."""
    total = len(results)
    start = (page - 1) * per_page
    end = start + per_page

    paginated_items = results[start:end]

    return {
        "items": paginated_items,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "total_items": total,
            "has_next": end < total,
            "has_prev": page > 1
        }
    }


# Health check endpoint
@admin_search_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def admin_search_health():
    """Health check endpoint for admin search system."""
    try:
        search_service = get_search_service()
        embedding_service = get_embedding_service()

        # Test database connection
        db_status = "disconnected"
        if db and hasattr(db, 'session'):
            try:
                db.session.execute('SELECT 1')
                db_status = "connected"
            except Exception as e:
                db_status = f"error: {str(e)}"

        # Check embedding service availability
        embedding_status = "unavailable"
        if embedding_service:
            if hasattr(embedding_service, 'is_available') and embedding_service.is_available():
                embedding_status = "available"
            else:
                embedding_status = "initialized_but_not_ready"

        # Get index stats if available
        index_stats = {}
        if embedding_service and hasattr(embedding_service, 'get_index_stats'):
            try:
                index_stats = embedding_service.get_index_stats()
            except Exception as e:
                index_stats = {"error": str(e)}

        # Check required dependencies
        dependencies = {
            "sentence_transformers": False,
            "faiss": False,
            "numpy": False
        }

        try:
            import sentence_transformers
            dependencies["sentence_transformers"] = True
        except ImportError:
            pass

        try:
            import faiss
            dependencies["faiss"] = True
        except ImportError:
            pass

        try:
            import numpy
            dependencies["numpy"] = True
        except ImportError:
            pass

        return jsonify({
            "status": "ok",
            "service": "admin_search_routes",
            "timestamp": datetime.now().isoformat(),
            "database": db_status,
            "search_service": "available" if search_service else "unavailable",
            "embedding_service": embedding_status,
            "dependencies": dependencies,
            "index_stats": index_stats,
            "endpoints": [
                "/",
                "/semantic",
                "/rebuild-index",
                "/index-stats",
                "/analytics",
                "/manage"
            ]
        }), 200
    except Exception as e:
        logger.error(f"Admin search health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "admin_search_routes",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


# ----------------------
# Admin Search Routes
# ----------------------

@admin_search_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def admin_search_products():
    """
    Admin search endpoint with advanced filtering and analytics.
    Includes inactive products and detailed product information.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Get search parameters
        query = request.args.get('q', '').strip()
        search_type = request.args.get('type', 'hybrid')  # hybrid, semantic, keyword
        page, per_page = get_pagination_params()

        # Admin-specific filters
        include_inactive = request.args.get('include_inactive', '').lower() == 'true'
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        min_stock = request.args.get('min_stock', type=int)
        max_stock = request.args.get('max_stock', type=int)
        is_featured = request.args.get('is_featured', '').lower() == 'true'
        is_sale = request.args.get('is_sale', '').lower() == 'true'
        sort_by = request.args.get('sort_by', 'relevance')

        if not query:
            return jsonify({
                "error": "Search query is required",
                "message": "Please provide a search query using the 'q' parameter"
            }), 400

        # Get search service
        search_service = get_search_service()

        # Build filters for admin search
        filters = {}
        if category_id:
            filters['category_id'] = category_id
        if brand_id:
            filters['brand_id'] = brand_id
        if min_price is not None or max_price is not None:
            filters['price_range'] = (min_price, max_price)
        if is_featured:
            filters['is_featured'] = True
        if is_sale:
            filters['is_sale'] = True

        # Perform search based on type
        if search_type == 'semantic':
            results = search_service.semantic_search(query, k=per_page * 3)
        elif search_type == 'keyword':
            results = search_service.keyword_search(query, filters=filters)
        else:  # hybrid (default)
            results = search_service.hybrid_search(query, limit=per_page * 3)

        # Apply admin-specific filters
        if results:
            filtered_results = []
            for product in results:
                # Include inactive products if requested
                if not include_inactive and not product.get('is_active', True):
                    continue

                # Apply stock filters
                if min_stock is not None and product.get('stock', 0) < min_stock:
                    continue
                if max_stock is not None and product.get('stock', float('inf')) > max_stock:
                    continue

                # Add admin-specific fields
                product['admin_info'] = {
                    'created_at': product.get('created_at'),
                    'updated_at': product.get('updated_at'),
                    'views': product.get('views', 0),
                    'sales_count': product.get('sales_count', 0),
                    'last_sold': product.get('last_sold'),
                    'profit_margin': product.get('profit_margin', 0)
                }

                filtered_results.append(product)

            results = filtered_results

        # Apply sorting
        if sort_by == 'price':
            results.sort(key=lambda x: x.get('price', 0))
        elif sort_by == 'price_desc':
            results.sort(key=lambda x: x.get('price', 0), reverse=True)
        elif sort_by == 'name':
            results.sort(key=lambda x: x.get('name', '').lower())
        elif sort_by == 'stock':
            results.sort(key=lambda x: x.get('stock', 0))
        elif sort_by == 'stock_desc':
            results.sort(key=lambda x: x.get('stock', 0), reverse=True)
        elif sort_by == 'created':
            results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        elif sort_by == 'sales':
            results.sort(key=lambda x: x.get('sales_count', 0), reverse=True)

        # Paginate results
        paginated_response = paginate_results(results, page, per_page)

        # Add admin search metadata
        paginated_response['search_metadata'] = {
            'query': query,
            'search_type': search_type,
            'total_found': len(results),
            'search_time': datetime.now().isoformat(),
            'admin_user': get_jwt_identity(),
            'filters_applied': {
                'include_inactive': include_inactive,
                'category_id': category_id,
                'brand_id': brand_id,
                'min_price': min_price,
                'max_price': max_price,
                'min_stock': min_stock,
                'max_stock': max_stock,
                'is_featured': is_featured,
                'is_sale': is_sale
            }
        }

        logger.info(f"Admin search completed by {get_jwt_identity()}: '{query}' ({search_type}) - {len(results)} results")
        return jsonify(paginated_response), 200

    except Exception as e:
        logger.error(f"Admin search failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Admin search failed",
            "message": "An error occurred while searching for products",
            "details": str(e)
        }), 500


@admin_search_routes.route('/semantic', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def admin_semantic_search():
    """
    Admin semantic search endpoint with advanced options.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        query = request.args.get('q', '').strip()
        page, per_page = get_pagination_params()
        threshold = request.args.get('threshold', 0.2, type=float)  # Lower threshold for admin
        include_inactive = request.args.get('include_inactive', '').lower() == 'true'

        if not query:
            return jsonify({
                "error": "Search query is required",
                "message": "Please provide a search query using the 'q' parameter"
            }), 400

        # Validate threshold
        threshold = max(0.0, min(1.0, threshold))

        search_service = get_search_service()
        results = search_service.semantic_search(query, k=per_page * 3, threshold=threshold)

        # Filter inactive products if not requested
        if not include_inactive:
            results = [r for r in results if r.get('is_active', True)]

        # Add detailed similarity information for admin
        for result in results:
            if 'similarity_score' in result:
                result['similarity_info'] = {
                    'score': result['similarity_score'],
                    'confidence': 'high' if result['similarity_score'] > 0.7 else 'medium' if result['similarity_score'] > 0.4 else 'low',
                    'threshold_used': threshold
                }

        # Paginate results
        paginated_response = paginate_results(results, page, per_page)

        # Add admin search metadata
        paginated_response['search_metadata'] = {
            'query': query,
            'search_type': 'semantic',
            'threshold': threshold,
            'include_inactive': include_inactive,
            'total_found': len(results),
            'search_time': datetime.now().isoformat(),
            'admin_user': get_jwt_identity()
        }

        logger.info(f"Admin semantic search completed by {get_jwt_identity()}: '{query}' - {len(results)} results")
        return jsonify(paginated_response), 200

    except Exception as e:
        logger.error(f"Admin semantic search failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Admin semantic search failed",
            "message": "An error occurred while performing semantic search",
            "details": str(e)
        }), 500


@admin_search_routes.route('/rebuild-index', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def rebuild_search_index():
    """
    Rebuild the search index with all active products.
    This is a resource-intensive operation that should be used sparingly.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        if not Product or not db:
            return jsonify({
                "error": "Database not available",
                "message": "Cannot rebuild index without database access"
            }), 500

        embedding_service = get_embedding_service()
        if not embedding_service or not hasattr(embedding_service, 'is_available') or not embedding_service.is_available():
            return jsonify({
                "error": "Embedding service not available",
                "message": "Cannot rebuild index without embedding service. Please install required dependencies."
            }), 500

        # Get all active products
        products = Product.query.filter_by(is_active=True).all()

        if not products:
            return jsonify({
                "error": "No products found",
                "message": "No active products available to index"
            }), 400

        # Convert products to dictionaries
        product_dicts = []
        for product in products:
            try:
                product_dict = product.to_dict()

                # Add category and brand info
                if product.category:
                    product_dict['category'] = product.category.to_dict()

                if product.brand:
                    product_dict['brand'] = product.brand.to_dict()

                product_dicts.append(product_dict)
            except Exception as e:
                logger.error(f"Error converting product {product.id} to dict: {str(e)}")
                continue

        # Rebuild the index
        start_time = datetime.now()
        success = embedding_service.rebuild_index(product_dicts)
        end_time = datetime.now()

        if success:
            # Get updated index stats
            index_stats = embedding_service.get_index_stats()

            logger.info(f"Search index rebuilt by {get_jwt_identity()}: {len(product_dicts)} products indexed")

            return jsonify({
                "success": True,
                "message": "Search index rebuilt successfully",
                "products_indexed": len(product_dicts),
                "rebuild_time_seconds": (end_time - start_time).total_seconds(),
                "index_stats": index_stats,
                "rebuilt_by": get_jwt_identity(),
                "timestamp": datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                "error": "Index rebuild failed",
                "message": "Failed to rebuild search index. Check server logs for details."
            }), 500

    except Exception as e:
        logger.error(f"Index rebuild failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Index rebuild failed",
            "message": "An error occurred while rebuilding the search index",
            "details": str(e)
        }), 500


@admin_search_routes.route('/index-stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_index_stats():
    """
    Get detailed statistics about the search index.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        embedding_service = get_embedding_service()

        if not embedding_service:
            return jsonify({
                "error": "Embedding service not available",
                "message": "Cannot get index stats without embedding service"
            }), 500

        # Get index statistics
        index_stats = embedding_service.get_index_stats() if hasattr(embedding_service, 'get_index_stats') else {}

        # Get database statistics
        db_stats = {}
        if Product and db:
            try:
                db_stats = {
                    'total_products': Product.query.count(),
                    'active_products': Product.query.filter_by(is_active=True).count(),
                    'inactive_products': Product.query.filter_by(is_active=False).count(),
                    'featured_products': Product.query.filter_by(is_featured=True).count(),
                    'sale_products': Product.query.filter_by(is_sale=True).count()
                }
            except Exception as e:
                db_stats = {"error": str(e)}

        # Check service availability
        service_status = {
            'embedding_service_available': hasattr(embedding_service, 'is_available') and embedding_service.is_available(),
            'database_available': db is not None,
            'search_service_available': get_search_service() is not None
        }

        return jsonify({
            "index_stats": index_stats,
            "database_stats": db_stats,
            "service_status": service_status,
            "timestamp": datetime.now().isoformat(),
            "requested_by": get_jwt_identity()
        }), 200

    except Exception as e:
        logger.error(f"Failed to get index stats: {str(e)}")
        return jsonify({
            "error": "Failed to get index stats",
            "message": "An error occurred while retrieving index statistics",
            "details": str(e)
        }), 500


@admin_search_routes.route('/analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_search_analytics():
    """
    Get search analytics and performance metrics.
    This is a placeholder for future search analytics implementation.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Placeholder analytics data
        # In production, this would track actual search queries, performance, etc.
        analytics = {
            "search_performance": {
                "average_response_time_ms": 150,
                "total_searches_today": 0,
                "total_searches_this_week": 0,
                "total_searches_this_month": 0
            },
            "popular_queries": [
                {"query": "laptop", "count": 0, "avg_results": 0},
                {"query": "phone", "count": 0, "avg_results": 0},
                {"query": "headphones", "count": 0, "avg_results": 0}
            ],
            "search_types": {
                "keyword_searches": 0,
                "semantic_searches": 0,
                "hybrid_searches": 0
            },
            "result_quality": {
                "average_results_per_query": 0,
                "zero_result_queries": 0,
                "high_confidence_results": 0
            },
            "system_health": {
                "embedding_service_uptime": "100%",
                "search_service_uptime": "100%",
                "last_index_update": None
            }
        }

        return jsonify({
            "analytics": analytics,
            "timestamp": datetime.now().isoformat(),
            "requested_by": get_jwt_identity(),
            "note": "This is placeholder data. Full analytics will be implemented in future versions."
        }), 200

    except Exception as e:
        logger.error(f"Failed to get search analytics: {str(e)}")
        return jsonify({
            "error": "Failed to get search analytics",
            "message": "An error occurred while retrieving search analytics",
            "details": str(e)
        }), 500


@admin_search_routes.route('/manage', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def manage_search_system():
    """
    Manage search system settings and operations.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        if request.method == 'GET':
            # Get current search system configuration
            config = {
                "embedding_model": "all-MiniLM-L6-v2",
                "similarity_threshold": 0.3,
                "max_results": 50,
                "hybrid_search_weight": 0.7,
                "auto_index_updates": True,
                "search_logging": True
            }

            return jsonify({
                "configuration": config,
                "timestamp": datetime.now().isoformat(),
                "requested_by": get_jwt_identity()
            }), 200

        elif request.method == 'POST':
            # Update search system configuration
            data = request.get_json() or {}
            action = data.get('action')

            if action == 'clear_cache':
                # Clear search cache (placeholder)
                return jsonify({
                    "success": True,
                    "message": "Search cache cleared successfully",
                    "timestamp": datetime.now().isoformat(),
                    "performed_by": get_jwt_identity()
                }), 200

            elif action == 'update_config':
                # Update configuration (placeholder)
                new_config = data.get('config', {})
                return jsonify({
                    "success": True,
                    "message": "Search configuration updated successfully",
                    "updated_config": new_config,
                    "timestamp": datetime.now().isoformat(),
                    "updated_by": get_jwt_identity()
                }), 200

            else:
                return jsonify({
                    "error": "Invalid action",
                    "message": "Supported actions: clear_cache, update_config"
                }), 400

    except Exception as e:
        logger.error(f"Search management operation failed: {str(e)}")
        return jsonify({
            "error": "Management operation failed",
            "message": "An error occurred while managing the search system",
            "details": str(e)
        }), 500


@admin_search_routes.route('/test', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def test_search_system():
    """
    Test search system functionality with sample queries.
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json() or {}
        test_queries = data.get('queries', ['laptop', 'smartphone', 'headphones'])

        search_service = get_search_service()
        test_results = []

        for query in test_queries:
            start_time = datetime.now()

            # Test keyword search
            keyword_results = search_service.keyword_search(query)
            keyword_time = (datetime.now() - start_time).total_seconds()

            # Test semantic search
            start_time = datetime.now()
            semantic_results = search_service.semantic_search(query, k=10)
            semantic_time = (datetime.now() - start_time).total_seconds()

            # Test hybrid search
            start_time = datetime.now()
            hybrid_results = search_service.hybrid_search(query, limit=10)
            hybrid_time = (datetime.now() - start_time).total_seconds()

            test_results.append({
                "query": query,
                "keyword_search": {
                    "results_count": len(keyword_results),
                    "response_time_ms": keyword_time * 1000
                },
                "semantic_search": {
                    "results_count": len(semantic_results),
                    "response_time_ms": semantic_time * 1000
                },
                "hybrid_search": {
                    "results_count": len(hybrid_results),
                    "response_time_ms": hybrid_time * 1000
                }
            })

        return jsonify({
            "test_results": test_results,
            "total_queries_tested": len(test_queries),
            "timestamp": datetime.now().isoformat(),
            "tested_by": get_jwt_identity()
        }), 200

    except Exception as e:
        logger.error(f"Search system test failed: {str(e)}")
        return jsonify({
            "error": "Search system test failed",
            "message": "An error occurred while testing the search system",
            "details": str(e)
        }), 500
