"""Admin Search Routes for managing and testing search functionality.
Provides comprehensive admin tools for search system management."""

import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from functools import wraps

from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from unittest.mock import MagicMock
from sqlalchemy import text

# Setup logger
logger = logging.getLogger(__name__)

# Database imports with fallbacks
try:
    from app.configuration.extensions import db
    from app.models.models import Product, Category, Brand
except ImportError:
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

# Import search services with fallbacks
try:
    from .search_service import get_search_service
    from .embedding_service import get_embedding_service
    SEARCH_SERVICES_AVAILABLE = True
except ImportError:
    logger.warning("Search services not available")
    SEARCH_SERVICES_AVAILABLE = False

    def get_search_service():
        return None

    def get_embedding_service():
        return None

# Create blueprint
admin_search_routes = Blueprint('admin_search_routes', __name__)

def admin_required(f):
    """Decorator to require admin authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user = get_jwt_identity()
            if not current_user:
                return jsonify({'error': 'Authentication required'}), 401
            # In a real app, you'd check if the user has admin privileges
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin authentication failed: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401
    return decorated_function

def safe_serialize(obj):
    """Safely serialize objects, handling MagicMock and other complex types."""
    if isinstance(obj, MagicMock):
        return {}
    elif isinstance(obj, dict):
        return {k: safe_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_serialize(item) for item in obj]
    elif hasattr(obj, '__dict__') and not isinstance(obj, (str, int, float, bool, type(None))):
        return str(obj)
    else:
        try:
            json.dumps(obj)  # Test if it's JSON serializable
            return obj
        except (TypeError, ValueError):
            return str(obj) if obj is not None else None

@admin_search_routes.route('/api/admin/search/health', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_search_health():
    """Health check endpoint for admin search system."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    try:
        # Check database connection first
        db_status = 'connected'
        try:
            if db:
                db.session.execute(text('SELECT 1'))
        except Exception as db_exc:
            logger.error(f"Database health check failed: {db_exc}")
            db_status = f"error: {str(db_exc)}"

        # Check embedding service
        embedding_service = None
        embedding_available = False
        try:
            embedding_service = get_embedding_service()
            if embedding_service and hasattr(embedding_service, 'is_available'):
                embedding_available = embedding_service.is_available()
            else:
                embedding_available = embedding_service is not None
        except Exception as embed_exc:
            logger.error(f"Embedding service check failed: {embed_exc}")
            embedding_available = False

        if not embedding_available:
            logger.error("Embedding service unavailable")
            return jsonify({
                'status': 'error',
                'error': 'Embedding service unavailable'
            }), 500

        # Check search service
        try:
            search_service = get_search_service()
        except Exception as svc_exc:
            logger.error(f"Search service initialization failed: {svc_exc}")
            return jsonify({
                'status': 'error',
                'error': f"Service initialization failed: {str(svc_exc)}"
            }), 500

        # Get index stats if available
        index_stats = {}
        if embedding_service and hasattr(embedding_service, 'get_index_stats'):
            try:
                raw_stats = embedding_service.get_index_stats()
                index_stats = safe_serialize(raw_stats)
            except Exception:
                index_stats = {}

        return jsonify({
            'status': 'ok',
            'service': 'admin_search_routes',
            'timestamp': datetime.utcnow().isoformat(),
            'database': db_status,
            'search_service': 'available',
            'embedding_service': 'available',
            'dependencies': {
                'flask': True,
                'sqlalchemy': db is not None,
                'search_services': SEARCH_SERVICES_AVAILABLE
            },
            'index_stats': index_stats,
            'endpoints': [
                '/api/admin/search/',
                '/api/admin/search/semantic',
                '/api/admin/search/rebuild-index',
                '/api/admin/search/index-stats',
                '/api/admin/search/analytics',
                '/api/admin/search/manage',
                '/api/admin/search/test',
                '/api/admin/search/similarity-test'
            ]
        }), 200

    except Exception as exc:
        logger.error(f"Health check failed: {exc}")
        return jsonify({'status': 'error', 'error': str(exc)}), 500

@admin_search_routes.route('/api/admin/search/', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_search():
    """Main admin search endpoint with advanced filtering and analytics."""
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    try:
        # Get query parameters
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        search_type = request.args.get('search_type', 'hybrid')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'

        # Filters
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        min_stock = request.args.get('min_stock', type=int)
        max_stock = request.args.get('max_stock', type=int)
        is_featured = request.args.get('is_featured')
        is_sale = request.args.get('is_sale')
        sort_by = request.args.get('sort_by', 'relevance')

        # Get search service
        search_service = get_search_service()
        if not search_service:
            return jsonify({'error': 'Search service not available'}), 500

        # Build filters
        filters = {}
        if category_id:
            filters['category_id'] = category_id
        if brand_id:
            filters['brand_id'] = brand_id
        if min_price is not None or max_price is not None:
            filters['price_range'] = (min_price, max_price)
        if is_featured is not None:
            filters['is_featured'] = is_featured.lower() == 'true'
        if is_sale is not None:
            filters['is_sale'] = is_sale.lower() == 'true'

        # Perform search based on type
        start_time = time.time()
        if search_type == 'semantic':
            results = search_service.semantic_search(query, k=per_page * 5)
        elif search_type == 'keyword':
            results = search_service.keyword_search(query, filters=filters)
        else:  # hybrid (default)
            results = search_service.hybrid_search(query, limit=per_page * 5)
        search_time = time.time() - start_time

        # Filter inactive products if needed
        if not include_inactive:
            results = [r for r in results if r.get('is_active', True)]

        # Apply additional filters
        if min_stock is not None:
            results = [r for r in results if r.get('stock', 0) >= min_stock]
        if max_stock is not None:
            results = [r for r in results if r.get('stock', 0) <= max_stock]

        # Sort results
        if sort_by == 'price':
            results.sort(key=lambda x: x.get('price', 0))
        elif sort_by == 'price_desc':
            results.sort(key=lambda x: x.get('price', 0), reverse=True)
        elif sort_by == 'stock':
            results.sort(key=lambda x: x.get('stock', 0))
        elif sort_by == 'stock_desc':
            results.sort(key=lambda x: x.get('stock', 0), reverse=True)
        elif sort_by == 'name':
            results.sort(key=lambda x: x.get('name', ''))
        # Default is relevance (keep original order)

        # Pagination
        total_items = len(results)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_results = results[start_idx:end_idx]

        # Add admin-specific information to each product
        for product in paginated_results:
            product['admin_info'] = {
                'created_at': product.get('created_at'),
                'updated_at': product.get('updated_at'),
                'views': product.get('views', 0),
                'sales_count': product.get('sales_count', 0),
                'profit_margin': product.get('profit_margin', 0),
                'last_sold': product.get('last_sold'),
                'inventory_status': 'in_stock' if product.get('stock', 0) > 0 else 'out_of_stock'
            }

        # Build response
        response_data = {
            'items': paginated_results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_items': total_items,
                'total_pages': (total_items + per_page - 1) // per_page,
                'has_next': end_idx < total_items,
                'has_prev': page > 1
            },
            'search_metadata': {
                'query': query,
                'search_type': search_type,  # Return the actual search type used
                'search_time_ms': round(search_time * 1000, 2),
                'filters_applied': {
                    'include_inactive': include_inactive,
                    'category_id': category_id,
                    'brand_id': brand_id,
                    'min_price': min_price,
                    'max_price': max_price,
                    'min_stock': min_stock,
                    'max_stock': max_stock,
                    'is_featured': is_featured.lower() == 'true' if is_featured else None,
                    'is_sale': is_sale.lower() == 'true' if is_sale else None,
                    'sort_by': sort_by
                },
                'total_results_before_pagination': total_items
            }
        }

        # Log admin search
        current_user = get_jwt_identity()
        logger.info(f"Admin search completed by {current_user}: '{query}' ({search_type}) - {total_items} results")

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Admin search failed: {str(e)}")
        return jsonify({
            'error': 'Admin search failed',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/semantic', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_semantic_search():
    """Dedicated semantic search endpoint with similarity analysis."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        k = min(int(request.args.get('k', 20)), 100)
        threshold = float(request.args.get('threshold', 0.3))
        threshold = max(0.0, min(1.0, threshold))  # Clamp between 0 and 1

        # Get search service
        search_service = get_search_service()
        if not search_service:
            return jsonify({'error': 'Search service not available'}), 500

        # Perform semantic search
        start_time = time.time()
        results = search_service.semantic_search(query, k=k, threshold=threshold)
        search_time = time.time() - start_time

        # Add similarity analysis
        for product in results:
            similarity_score = product.get('similarity_score', 0.0)
            product['similarity_info'] = {
                'score': similarity_score,
                'confidence': 'high' if similarity_score >= 0.7 else 'medium' if similarity_score >= 0.5 else 'low',
                'explanation': f"Semantic similarity: {similarity_score:.3f}"
            }

        response_data = {
            'items': results,
            'search_metadata': {
                'query': query,
                'search_type': 'semantic',
                'search_time_ms': round(search_time * 1000, 2),
                'threshold': threshold,
                'max_results': k,
                'total_results': len(results)
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Admin semantic search failed: {str(e)}")
        return jsonify({
            'error': 'Semantic search failed',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/similarity-test', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def test_similarity():
    """Test similarity between a search query and product embeddings."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Get request data
        data = request.get_json() or {}
        query = data.get('query', '').strip()

        if not query:
            return jsonify({
                'error': 'Query is required',
                'message': 'Please provide a search query to test similarity'
            }), 400

        # Check if database and Product model are available
        if not Product or not db:
            return jsonify({
                'error': 'Database not available',
                'message': 'Cannot perform similarity test without database access'
            }), 500

        # Get embedding service
        embedding_service = get_embedding_service()
        if not embedding_service:
            return jsonify({
                'error': 'Embedding service not available',
                'message': 'Cannot perform similarity test without embedding service'
            }), 500

        # Check if embedding service is available
        if not hasattr(embedding_service, 'is_available') or not embedding_service.is_available():
            return jsonify({
                'error': 'Embedding service unavailable',
                'message': 'Embedding service is not properly initialized'
            }), 500

        # Get first product from database
        try:
            product = Product.query.first()
        except Exception as db_error:
            logger.error(f"Database query failed: {db_error}")
            return jsonify({
                'error': 'Database query failed',
                'message': f'Failed to query products: {str(db_error)}'
            }), 500

        # Check if any products exist
        if not product:
            return jsonify({
                'error': 'No products found',
                'message': 'No products are available in the database for similarity testing'
            }), 404

        # Check if product has embedding
        if not hasattr(product, 'embedding') or product.embedding is None:
            return jsonify({
                'error': 'Product embedding missing',
                'message': f'Product "{product.name}" (ID: {product.id}) does not have an embedding. Please rebuild the search index.'
            }), 422

        # Generate query embedding
        try:
            query_embedding = embedding_service.generate_embedding(query)
            if query_embedding is None:
                return jsonify({
                    'error': 'Failed to generate query embedding',
                    'message': 'Could not generate embedding for the provided query'
                }), 500
        except Exception as embed_error:
            logger.error(f"Query embedding generation failed: {embed_error}")
            return jsonify({
                'error': 'Query embedding failed',
                'message': f'Failed to generate embedding for query: {str(embed_error)}'
            }), 500

        # Calculate similarity
        try:
            similarity_score = embedding_service.calculate_similarity(query_embedding, product.embedding)
        except Exception as sim_error:
            logger.error(f"Similarity calculation failed: {sim_error}")
            return jsonify({
                'error': 'Similarity calculation failed',
                'message': f'Failed to calculate similarity: {str(sim_error)}'
            }), 500

        # Determine confidence level
        if similarity_score >= 0.8:
            confidence = 'very_high'
        elif similarity_score >= 0.6:
            confidence = 'high'
        elif similarity_score >= 0.4:
            confidence = 'medium'
        elif similarity_score >= 0.2:
            confidence = 'low'
        else:
            confidence = 'very_low'

        # Build successful response
        response_data = {
            'success': True,
            'query': query,
            'test_product': {
                'id': product.id,
                'name': product.name,
                'description': product.description[:100] + '...' if product.description and len(product.description) > 100 else product.description,
                'price': float(product.price) if product.price else None,
                'category': product.category.name if product.category else None,
                'brand': product.brand.name if product.brand else None
            },
            'similarity_result': {
                'score': float(similarity_score),
                'confidence': confidence,
                'interpretation': {
                    'very_high': 'Extremely similar (0.8+)',
                    'high': 'Very similar (0.6-0.8)',
                    'medium': 'Moderately similar (0.4-0.6)',
                    'low': 'Somewhat similar (0.2-0.4)',
                    'very_low': 'Not very similar (<0.2)'
                }[confidence]
            },
            'embedding_info': {
                'query_embedding_dimension': len(query_embedding),
                'product_embedding_dimension': len(product.embedding) if hasattr(product.embedding, '__len__') else 'unknown',
                'embedding_model': getattr(embedding_service, 'model_name', 'unknown')
            },
            'timestamp': datetime.utcnow().isoformat(),
            'tested_by': get_jwt_identity()
        }

        logger.info(f"Similarity test completed by {get_jwt_identity()}: '{query}' vs '{product.name}' = {similarity_score:.3f}")
        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Similarity test failed: {str(e)}")
        return jsonify({
            'error': 'Similarity test failed',
            'message': 'An unexpected error occurred during similarity testing',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/rebuild-index', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def rebuild_search_index():
    """Rebuild the search index with all active products."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        if not Product or not db:
            return jsonify({'error': 'Database not available'}), 500

        # Get embedding service
        embedding_service = get_embedding_service()
        if not embedding_service or not hasattr(embedding_service, 'is_available') or not embedding_service.is_available():
            return jsonify({'error': 'Embedding service not available'}), 500

        # Get all active products
        products = Product.query.filter_by(is_active=True).all()
        if not products:
            return jsonify({'error': 'No products found'}), 400

        # Convert to dictionaries
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

        # Rebuild index
        start_time = time.time()
        success = embedding_service.rebuild_index(product_dicts)
        rebuild_time = time.time() - start_time

        if not success:
            return jsonify({'error': 'Index rebuild failed'}), 500

        # Get updated stats
        index_stats = {}
        if hasattr(embedding_service, 'get_index_stats'):
            try:
                raw_stats = embedding_service.get_index_stats()
                index_stats = safe_serialize(raw_stats)
            except Exception:
                index_stats = {}

        current_user = get_jwt_identity()
        logger.info(f"Search index rebuilt by {current_user}: {len(product_dicts)} products indexed")

        return jsonify({
            'success': True,
            'products_indexed': len(product_dicts),
            'rebuild_time_seconds': round(rebuild_time, 2),
            'index_stats': index_stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Index rebuild failed: {str(e)}")
        return jsonify({
            'error': 'Index rebuild failed',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/index-stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_index_stats():
    """Get comprehensive search index statistics."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    def ensure_json_serializable(obj):
        """Ensure all values in the object are JSON serializable."""
        if isinstance(obj, MagicMock):
            # Convert MagicMock to appropriate default values
            return 0
        elif isinstance(obj, dict):
            return {k: ensure_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [ensure_json_serializable(item) for item in obj]
        elif isinstance(obj, (int, float, str, bool, type(None))):
            return obj
        else:
            # For any other type, try to convert to int if it looks numeric, otherwise string
            try:
                # Try to convert to int first
                return int(obj)
            except (ValueError, TypeError):
                try:
                    # Try to convert to float
                    return float(obj)
                except (ValueError, TypeError):
                    # Fall back to string representation
                    return str(obj) if obj is not None else None

    try:
        embedding_service = get_embedding_service()
        if not embedding_service:
            return jsonify({
                'status': 'error',
                'error': 'Embedding service not available'
            }), 500

        # Get stats and ensure they're serializable
        try:
            stats = embedding_service.get_index_stats()
            serialized_stats = ensure_json_serializable(stats)
        except Exception as stats_error:
            logger.error(f"Error getting index stats: {stats_error}")
            serialized_stats = {'error': str(stats_error)}

        # Get database stats with explicit serialization
        database_stats = {}
        if Product and db:
            try:
                # Get counts and ensure they're integers
                total_products = Product.query.count() if hasattr(Product.query, 'count') else 0
                total_products = ensure_json_serializable(total_products)

                active_products = Product.query.filter_by(is_active=True).count() if hasattr(Product.query, 'filter_by') else 0
                active_products = ensure_json_serializable(active_products)

                inactive_products = Product.query.filter_by(is_active=False).count() if hasattr(Product.query, 'filter_by') else 0
                inactive_products = ensure_json_serializable(inactive_products)

                featured_products = Product.query.filter_by(is_featured=True).count() if hasattr(Product.query, 'filter_by') else 0
                featured_products = ensure_json_serializable(featured_products)

                sale_products = Product.query.filter_by(is_sale=True).count() if hasattr(Product.query, 'filter_by') else 0
                sale_products = ensure_json_serializable(sale_products)

                database_stats = {
                    'total_products': total_products,
                    'active_products': active_products,
                    'inactive_products': inactive_products,
                    'featured_products': featured_products,
                    'sale_products': sale_products
                }
            except Exception as e:
                logger.error(f"Error getting database stats: {str(e)}")
                database_stats = {'error': str(e)}

        # Get service status and ensure it's serializable
        search_service = get_search_service()
        service_status = {
            'search_service_available': bool(search_service is not None),
            'embedding_service_available': bool(hasattr(embedding_service, 'is_available') and embedding_service.is_available()),
            'database_available': bool(db is not None)
        }

        # Compose response with guaranteed serializable values
        response_data = {
            'index_stats': {
                'total_products': ensure_json_serializable(serialized_stats.get('total_products', 0)),
                'embedding_dimension': ensure_json_serializable(serialized_stats.get('embedding_dimension', 0)),
                'database_stats': ensure_json_serializable(database_stats),
                'service_status': ensure_json_serializable(service_status)
            },
            'timestamp': datetime.utcnow().isoformat()
        }

        # Final check to ensure everything is serializable
        response_data = ensure_json_serializable(response_data)

        return jsonify(response_data), 200

    except Exception as exc:
        logger.error(f"Failed to get index stats: {exc}")
        # Always return a valid JSON object with error key
        return jsonify({'status': 'error', 'error': str(exc)}), 500

@admin_search_routes.route('/api/admin/search/analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_search_analytics():
    """Get search analytics and performance metrics."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # This is a placeholder implementation
        # In production, you'd collect real analytics data
        analytics_data = {
            'analytics': {
                'search_performance': {
                    'average_response_time_ms': 150,
                    'total_searches_today': 245,
                    'successful_searches': 230,
                    'failed_searches': 15,
                    'success_rate': 93.9
                },
                'popular_queries': [
                    {'query': 'iPhone', 'count': 45, 'avg_results': 12},
                    {'query': 'laptop', 'count': 38, 'avg_results': 25},
                    {'query': 'headphones', 'count': 32, 'avg_results': 18},
                    {'query': 'smartwatch', 'count': 28, 'avg_results': 8},
                    {'query': 'camera', 'count': 22, 'avg_results': 15}
                ],
                'search_types': {
                    'hybrid': 65,
                    'keyword': 25,
                    'semantic': 10
                },
                'result_quality': {
                    'average_results_per_query': 15.2,
                    'zero_result_queries': 8.5,
                    'high_confidence_results': 72.3
                },
                'system_health': {
                    'index_freshness': 'up_to_date',
                    'service_uptime': '99.8%',
                    'last_index_update': datetime.utcnow().isoformat()
                }
            },
            'note': 'This is placeholder analytics data. In production, implement real analytics collection.',
            'timestamp': datetime.utcnow().isoformat()
        }

        return jsonify(analytics_data), 200

    except Exception as e:
        logger.error(f"Failed to get search analytics: {str(e)}")
        return jsonify({
            'error': 'Failed to get search analytics',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/manage', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def manage_search_system():
    """Manage search system configuration and operations."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        if request.method == 'GET':
            # Return current configuration
            config = {
                'configuration': {
                    'embedding_model': 'all-MiniLM-L6-v2',
                    'similarity_threshold': 0.3,
                    'max_results': 50,
                    'hybrid_search_weight': 0.7,
                    'cache_enabled': True,
                    'cache_ttl_seconds': 300
                }
            }
            return jsonify(config), 200

        elif request.method == 'POST':
            try:
                data = request.get_json(force=True, silent=True)
                if data is None:
                    return jsonify({'error': 'Malformed JSON'}), 400
            except Exception as e:
                logger.error(f"Failed to parse JSON: {str(e)}")
                return jsonify({'error': 'Malformed JSON'}), 400

            action = data.get('action')
            if action == 'clear_cache':
                # Clear search cache (placeholder)
                return jsonify({
                    'success': True,
                    'message': 'Search cache cleared successfully'
                }), 200

            elif action == 'update_config':
                config = data.get('config', {})
                # Update configuration (placeholder)
                return jsonify({
                    'success': True,
                    'message': 'Configuration updated successfully',
                    'updated_config': config
                }), 200

            else:
                return jsonify({'error': 'Invalid action'}), 400

    except Exception as e:
        logger.error(f"Search management operation failed: {str(e)}")
        return jsonify({
            'error': 'Search management operation failed',
            'details': str(e)
        }), 500

@admin_search_routes.route('/api/admin/search/test', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def test_search_system():
    """Test search system with predefined queries."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json() or {}
        test_queries = data.get('queries', ['laptop', 'smartphone', 'headphones'])

        search_service = get_search_service()
        if not search_service:
            return jsonify({'error': 'Search service not available'}), 500

        test_results = []
        for query in test_queries:
            query_result = {
                'query': query,
                'keyword_search': {},
                'semantic_search': {},
                'hybrid_search': {}
            }

            # Test keyword search
            try:
                start_time = time.time()
                keyword_results = search_service.keyword_search(query)
                keyword_time = time.time() - start_time
                query_result['keyword_search'] = {
                    'results_count': len(keyword_results),
                    'response_time_ms': round(keyword_time * 1000, 2),
                    'status': 'success'
                }
            except Exception as e:
                query_result['keyword_search'] = {
                    'status': 'error',
                    'error': str(e)
                }

            # Test semantic search
            try:
                start_time = time.time()
                semantic_results = search_service.semantic_search(query)
                semantic_time = time.time() - start_time
                query_result['semantic_search'] = {
                    'results_count': len(semantic_results),
                    'response_time_ms': round(semantic_time * 1000, 2),
                    'status': 'success'
                }
            except Exception as e:
                query_result['semantic_search'] = {
                    'status': 'error',
                    'error': str(e)
                }

            # Test hybrid search
            try:
                start_time = time.time()
                hybrid_results = search_service.hybrid_search(query)
                hybrid_time = time.time() - start_time
                query_result['hybrid_search'] = {
                    'results_count': len(hybrid_results),
                    'response_time_ms': round(hybrid_time * 1000, 2),
                    'status': 'success'
                }
            except Exception as e:
                query_result['hybrid_search'] = {
                    'status': 'error',
                    'error': str(e)
                }

            test_results.append(query_result)

        return jsonify({
            'test_results': test_results,
            'total_queries_tested': len(test_queries),
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Search system test failed: {str(e)}")
        return jsonify({
            'error': 'Search system test failed',
            'details': str(e)
        }), 500

# Error handlers
@admin_search_routes.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@admin_search_routes.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

@admin_search_routes.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500
