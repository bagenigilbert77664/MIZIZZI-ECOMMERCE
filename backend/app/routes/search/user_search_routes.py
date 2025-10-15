"""
User Search Routes for Mizizzi E-commerce platform.
Provides search functionality for end users with AI-powered semantic search.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity, jwt_required

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
user_search_routes = Blueprint('user_search_routes', __name__, url_prefix='/api/search')

try:
    from app.configuration.extensions import db
    from app.models.models import Product, Category, Brand
except ImportError:
    try:
        from backend.app.configuration.extensions import db
        from backend.app.models.models import Product, Category, Brand
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
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 50)  # Limit per_page to prevent abuse
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
@user_search_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def search_health():
    """Health check endpoint for search system."""
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
            "service": "user_search_routes",
            "timestamp": datetime.now().isoformat(),
            "database": db_status,
            "search_service": "available" if search_service else "unavailable",
            "embedding_service": embedding_status,
            "dependencies": dependencies,
            "index_stats": index_stats,
            "endpoints": [
                "/",
                "/semantic",
                "/suggestions",
                "/popular",
                "/categories",
                "/filters"
            ]
        }), 200
    except Exception as e:
        logger.error(f"Search health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "user_search_routes",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


# ----------------------
# Search Routes
# ----------------------

@user_search_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
def search_products():
    """
    Main search endpoint with hybrid search (semantic + keyword).
    Supports various query parameters for filtering and pagination.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        # Get search parameters
        query = request.args.get('q', '').strip()
        search_type = request.args.get('type', 'hybrid')  # hybrid, semantic, keyword
        page, per_page = get_pagination_params()

        # Additional filters
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        is_featured = request.args.get('is_featured', '').lower() == 'true'
        is_sale = request.args.get('is_sale', '').lower() == 'true'
        in_stock = request.args.get('in_stock', '').lower() == 'true'
        sort_by = request.args.get('sort_by', 'relevance')  # relevance, price, name, newest

        if not query:
            return jsonify({
                "error": "Search query is required",
                "message": "Please provide a search query using the 'q' parameter"
            }), 400

        # Get search service
        search_service = get_search_service()

        # Perform search based on type
        if search_type == 'semantic':
            results = search_service.semantic_search(query, k=per_page * 3)
        elif search_type == 'keyword':
            # Build filters for keyword search
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
            if in_stock:
                filters['in_stock'] = True

            results = search_service.keyword_search(query, filters=filters)
        else:  # hybrid (default)
            results = search_service.hybrid_search(query, limit=per_page * 3)

        # Apply additional filters to results if not already applied
        if results and search_type != 'keyword':
            filtered_results = []
            for product in results:
                # Apply filters
                if category_id and product.get('category_id') != category_id:
                    continue
                if brand_id and product.get('brand_id') != brand_id:
                    continue
                if min_price is not None and product.get('price', 0) < min_price:
                    continue
                if max_price is not None and product.get('price', float('inf')) > max_price:
                    continue
                if is_featured and not product.get('is_featured'):
                    continue
                if is_sale and not product.get('is_sale'):
                    continue
                if in_stock and product.get('stock', 0) <= 0:
                    continue

                filtered_results.append(product)

            results = filtered_results

        # Apply sorting
        if sort_by == 'price':
            results.sort(key=lambda x: x.get('price', 0))
        elif sort_by == 'price_desc':
            results.sort(key=lambda x: x.get('price', 0), reverse=True)
        elif sort_by == 'name':
            results.sort(key=lambda x: x.get('name', '').lower())
        elif sort_by == 'newest':
            results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        # For 'relevance', keep the original order from search

        # Calculate search time
        search_time = 0.1  # Placeholder for actual search time measurement

        # Paginate results
        total = len(results)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_results = results[start:end]

        # Return in the format expected by frontend
        response = {
            "results": paginated_results,  # Frontend expects 'results' property
            "total": total,
            "query": query,
            "search_time": search_time,
            "suggestions": [],  # Add suggestions if no results found
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "total_items": total,
                "has_next": end < total,
                "has_prev": page > 1
            },
            "search_metadata": {
                'query': query,
                'search_type': search_type,
                'total_found': total,
                'search_time': search_time,
                'filters_applied': {
                    'category_id': category_id,
                    'brand_id': brand_id,
                    'min_price': min_price,
                    'max_price': max_price,
                    'is_featured': is_featured,
                    'is_sale': is_sale,
                    'in_stock': in_stock
                }
            }
        }

        # Add suggestions if no results found
        if total == 0:
            try:
                search_service = get_search_service()
                suggestions = search_service.get_search_suggestions(query, limit=5)
                response["suggestions"] = suggestions
            except Exception as e:
                logger.error(f"Failed to get suggestions: {str(e)}")
                response["suggestions"] = []

        logger.info(f"Search completed: '{query}' ({search_type}) - {total} results")
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Search failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Search failed",
            "message": "An error occurred while searching for products",
            "details": str(e)
        }), 500


@user_search_routes.route('/semantic', methods=['GET', 'OPTIONS'])
@cross_origin()
def semantic_search():
    """
    Semantic search endpoint using AI embeddings.
    Best for natural language queries like "iPhone alternative under $500".
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        query = request.args.get('q', '').strip()
        page, per_page = get_pagination_params()
        threshold = request.args.get('threshold', 0.3, type=float)

        if not query:
            return jsonify({
                "error": "Search query is required",
                "message": "Please provide a search query using the 'q' parameter"
            }), 400

        # Validate threshold
        threshold = max(0.0, min(1.0, threshold))

        search_service = get_search_service()
        results = search_service.semantic_search(query, k=per_page * 3, threshold=threshold)

        # Paginate results
        paginated_response = paginate_results(results, page, per_page)

        # Add search metadata
        paginated_response['search_metadata'] = {
            'query': query,
            'search_type': 'semantic',
            'threshold': threshold,
            'total_found': len(results),
            'search_time': datetime.now().isoformat()
        }

        logger.info(f"Semantic search completed: '{query}' - {len(results)} results")
        return jsonify(paginated_response), 200

    except Exception as e:
        logger.error(f"Semantic search failed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Semantic search failed",
            "message": "An error occurred while performing semantic search",
            "details": str(e)
        }), 500


@user_search_routes.route('/suggestions', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_search_suggestions():
    """
    Get search suggestions based on partial query.
    Useful for autocomplete functionality.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5, type=int)
        limit = min(max(1, limit), 20)  # Limit between 1 and 20

        if not query or len(query) < 2:
            return jsonify({
                "suggestions": [],
                "message": "Query too short for suggestions"
            }), 200

        search_service = get_search_service()
        suggestions = search_service.get_search_suggestions(query, limit=limit)

        return jsonify({
            "suggestions": suggestions,
            "query": query,
            "count": len(suggestions)
        }), 200

    except Exception as e:
        logger.error(f"Failed to get search suggestions: {str(e)}")
        # Return empty suggestions with 200 status for graceful degradation
        return jsonify({
            "suggestions": [],
            "query": query if 'query' in locals() else "",
            "count": 0,
            "error": "Failed to get suggestions",
            "details": str(e)
        }), 200


@user_search_routes.route('/popular', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_popular_searches():
    """
    Get popular search terms.
    Useful for showing trending searches or search suggestions.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        limit = request.args.get('limit', 10, type=int)
        limit = min(max(1, limit), 50)  # Limit between 1 and 50

        search_service = get_search_service()
        popular_searches = search_service.get_popular_searches(limit=limit)

        return jsonify({
            "popular_searches": popular_searches,
            "count": len(popular_searches)
        }), 200

    except Exception as e:
        logger.error(f"Failed to get popular searches: {str(e)}")
        # Return empty list with 200 status for graceful degradation
        return jsonify({
            "popular_searches": [],
            "count": 0,
            "error": "Failed to get popular searches",
            "details": str(e)
        }), 200


@user_search_routes.route('/categories', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_search_categories():
    """
    Get available categories for search filtering.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        if not Category or not db:
            return jsonify({
                "categories": [],
                "message": "Categories not available"
            }), 200

        # Get categories with product counts
        categories = Category.query.filter_by(is_featured=True).all()

        category_data = []
        for category in categories:
            try:
                # Count active products in this category
                product_count = Product.query.filter_by(
                    category_id=category.id,
                    is_active=True
                ).count() if Product else 0

                category_dict = category.to_dict()
                category_dict['product_count'] = product_count
                category_data.append(category_dict)
            except Exception as e:
                logger.error(f"Error processing category {category.id}: {str(e)}")
                continue

        return jsonify({
            "categories": category_data,
            "count": len(category_data)
        }), 200

    except Exception as e:
        logger.error(f"Failed to get search categories: {str(e)}")
        return jsonify({
            "categories": [],
            "error": "Failed to get categories",
            "details": str(e)
        }), 500


@user_search_routes.route('/filters', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_search_filters():
    """
    Get available search filters (brands, price ranges, etc.).
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        filters = {
            "brands": [],
            "price_ranges": [
                {"label": "Under $100", "min": 0, "max": 100},
                {"label": "$100 - $500", "min": 100, "max": 500},
                {"label": "$500 - $1000", "min": 500, "max": 1000},
                {"label": "$1000 - $2000", "min": 1000, "max": 2000},
                {"label": "Over $2000", "min": 2000, "max": None}
            ],
            "sort_options": [
                {"value": "relevance", "label": "Most Relevant"},
                {"value": "price", "label": "Price: Low to High"},
                {"value": "price_desc", "label": "Price: High to Low"},
                {"value": "name", "label": "Name: A to Z"},
                {"value": "newest", "label": "Newest First"}
            ]
        }

        # Get brands with product counts
        if Brand and db:
            try:
                brands = Brand.query.filter_by(is_featured=True).all()
                for brand in brands:
                    try:
                        product_count = Product.query.filter_by(
                            brand_id=brand.id,
                            is_active=True
                        ).count() if Product else 0

                        if product_count > 0:
                            brand_dict = brand.to_dict()
                            brand_dict['product_count'] = product_count
                            filters["brands"].append(brand_dict)
                    except Exception as e:
                        logger.error(f"Error processing brand {brand.id}: {str(e)}")
                        continue
            except Exception as e:
                logger.error(f"Failed to get brands: {str(e)}")
                return jsonify({
                    "error": "Database error",
                    "message": "Failed to retrieve brands from database",
                    "details": str(e)
                }), 500

        return jsonify(filters), 200

    except Exception as e:
        logger.error(f"Failed to get search filters: {str(e)}")
        return jsonify({
            "brands": [],
            "price_ranges": [],
            "sort_options": [],
            "error": "Failed to get filters",
            "details": str(e)
        }), 500


@user_search_routes.route('/similar/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_similar_products(product_id):
    """
    Get products similar to a specific product using semantic search.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        # Handle invalid product IDs - this should be checked first
        if product_id < 1:
            return jsonify({
                'error': 'Product not found',
                'message': f'Invalid product ID: {product_id}'
            }), 404

        if not Product or not db:
            return jsonify({
                "similar_products": [],
                "message": "Product model not available"
            }), 200

        # Get the source product
        product = Product.query.get(product_id)
        if not product or not product.is_active:
            return jsonify({
                "error": "Product not found",
                "message": f"Product with ID {product_id} not found or inactive"
            }), 404

        limit = request.args.get('limit', 10, type=int)
        limit = min(max(1, limit), 50)

        # Create search query from product details
        search_service = get_search_service()
        query_parts = []

        if product.name:
            query_parts.append(product.name)
        if product.description:
            # Take first 100 characters of description
            query_parts.append(product.description[:100])
        if product.category:
            query_parts.append(product.category.name)

        query = " ".join(query_parts)

        # Get similar products
        similar_products = search_service.semantic_search(query, k=limit + 5, threshold=0.2)

        # Remove the source product from results
        similar_products = [p for p in similar_products if p.get('id') != product_id][:limit]

        return jsonify({
            "similar_products": similar_products,
            "source_product": product.to_dict(),
            "count": len(similar_products)
        }), 200

    except Exception as e:
        logger.error(f"Failed to get similar products for {product_id}: {str(e)}")
        return jsonify({
            "similar_products": [],
            "error": "Failed to get similar products",
            "details": str(e)
        }), 500
