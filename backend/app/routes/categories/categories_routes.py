"""
User-facing Category routes for Mizizzi E-commerce platform.
Handles public category browsing and viewing operations.
"""

# Standard Libraries
import logging
import re
from datetime import datetime
from functools import wraps
from typing import Optional, Dict, Any, List

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

# Database & ORM
from sqlalchemy import or_, desc, func, and_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

# Extensions
from ...configuration.extensions import db, ma

# Models
from ...models.models import Category, Product, User, UserRole

# Schemas
from ...schemas.schemas import category_schema, categories_schema

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
categories_routes = Blueprint('categories_routes', __name__)

# Constants
DEFAULT_PER_PAGE = 12
MAX_PER_PAGE = 100
SLUG_PATTERN = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')

# ----------------------
# Helper Functions
# ----------------------

def get_pagination_params():
    """Get pagination parameters from request."""
    page = max(1, request.args.get('page', 1, type=int))
    per_page = min(MAX_PER_PAGE, max(1, request.args.get('per_page', DEFAULT_PER_PAGE, type=int)))
    return page, per_page

def get_search_params():
    """Get search parameters from request."""
    return {
        'search': request.args.get('search', '').strip(),
        'featured_only': request.args.get('featured', '').lower() == 'true',
        'parent_id': request.args.get('parent_id', type=int),
        'include_subcategories': request.args.get('include_subcategories', '').lower() == 'true',
        'sort_by': request.args.get('sort_by', 'name'),
        'sort_order': request.args.get('sort_order', 'asc').lower()
    }

def paginate_response(query, schema, page, per_page):
    """Create paginated response."""
    try:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": schema.dump(paginated.items),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev,
                "next_page": paginated.next_num if paginated.has_next else None,
                "prev_page": paginated.prev_num if paginated.has_prev else None
            }
        }
    except Exception as e:
        logger.error(f"Pagination error: {str(e)}")
        raise

def add_cors_headers(response):
    """Add CORS headers to response."""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

def handle_options_request():
    """Handle OPTIONS request for CORS."""
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

def build_category_query(search_params: Dict[str, Any]):
    """Build category query based on search parameters."""
    query = Category.query

    # Search functionality
    if search_params['search']:
        search_term = f"%{search_params['search']}%"
        query = query.filter(
            or_(
                Category.name.ilike(search_term),
                Category.description.ilike(search_term),
                Category.slug.ilike(search_term)
            )
        )

    # Featured categories filter
    if search_params['featured_only']:
        query = query.filter_by(is_featured=True)

    # Parent category filter
    if search_params['parent_id'] is not None:
        query = query.filter_by(parent_id=search_params['parent_id'])
    elif search_params['parent_id'] is None and not search_params['search']:
        # Default to top-level categories if no parent specified and no search
        query = query.filter_by(parent_id=None)

    # Sorting
    sort_column = Category.name  # default
    if search_params['sort_by'] == 'created_at':
        sort_column = Category.created_at
    elif search_params['sort_by'] == 'updated_at':
        sort_column = Category.updated_at
    elif search_params['sort_by'] == 'products_count':
        # Join with products to sort by count
        query = query.outerjoin(Product).group_by(Category.id)
        sort_column = func.count(Product.id)

    if search_params['sort_order'] == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    return query

def get_category_with_stats(category):
    """Get category with additional statistics."""
    category_data = category_schema.dump(category)

    # Add product count
    category_data['products_count'] = Product.query.filter_by(category_id=category.id).count()

    # Add subcategories count
    category_data['subcategories_count'] = Category.query.filter_by(parent_id=category.id).count()

    # Add breadcrumb
    category_data['breadcrumb'] = get_category_breadcrumb(category)

    return category_data

def get_category_breadcrumb(category):
    """Get category breadcrumb trail."""
    breadcrumb = []
    current = category

    while current:
        breadcrumb.insert(0, {
            'id': current.id,
            'name': current.name,
            'slug': current.slug
        })
        current = current.parent if hasattr(current, 'parent') else None

    return breadcrumb

def get_category_tree(parent_id=None, max_depth=3, current_depth=0):
    """Get category tree structure."""
    if current_depth >= max_depth:
        return []

    categories = Category.query.filter_by(parent_id=parent_id).order_by(Category.name).all()
    tree = []

    for category in categories:
        category_data = category_schema.dump(category)
        category_data['products_count'] = Product.query.filter_by(category_id=category.id).count()
        category_data['subcategories'] = get_category_tree(category.id, max_depth, current_depth + 1)
        tree.append(category_data)

    return tree

# ----------------------
# Public Category Routes (No Authentication Required)
# ----------------------

@categories_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_categories():
    """
    Get all categories with pagination and filtering.

    Query Parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 12, max: 100)
    - search: Search term for name, description, or slug
    - featured: Filter featured categories (true/false)
    - parent_id: Filter by parent category ID
    - include_subcategories: Include subcategories in response
    - sort_by: Sort field (name, created_at, updated_at, products_count)
    - sort_order: Sort order (asc, desc)
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        page, per_page = get_pagination_params()
        search_params = get_search_params()

        # Build query
        query = build_category_query(search_params)

        # Get paginated results
        result = paginate_response(query, categories_schema, page, per_page)

        # Add additional data for each category
        for item in result['items']:
            category = Category.query.get(item['id'])
            if category:
                item['products_count'] = Product.query.filter_by(category_id=category.id).count()
                item['subcategories_count'] = Category.query.filter_by(parent_id=category.id).count()

                # Include subcategories if requested
                if search_params['include_subcategories']:
                    subcategories = Category.query.filter_by(parent_id=category.id).order_by(Category.name).all()
                    item['subcategories'] = categories_schema.dump(subcategories)

        # Add cache headers for public endpoints
        response = jsonify(result)
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/tree', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_tree_endpoint():
    """Get complete category tree structure."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        max_depth = min(5, request.args.get('max_depth', 3, type=int))
        tree = get_category_tree(max_depth=max_depth)

        response = jsonify({
            "tree": tree,
            "total_categories": len(tree)
        })
        response.headers['Cache-Control'] = 'public, max-age=600'  # 10 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching category tree: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category tree",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/featured', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_featured_categories():
    """Get featured categories."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        limit = min(20, request.args.get('limit', 8, type=int))

        categories = Category.query.filter_by(is_featured=True)\
                                 .order_by(Category.name)\
                                 .limit(limit)\
                                 .all()

        result = []
        for category in categories:
            category_data = category_schema.dump(category)
            category_data['products_count'] = Product.query.filter_by(category_id=category.id).count()
            result.append(category_data)

        response = jsonify({
            "items": result,
            "total": len(result)
        })
        response.headers['Cache-Control'] = 'public, max-age=600'  # 10 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching featured categories: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve featured categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/<int:category_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category(category_id):
    """Get category by ID with detailed information."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": "Category not found"}), 404

        category_data = get_category_with_stats(category)

        # Add subcategories
        subcategories = Category.query.filter_by(parent_id=category.id).order_by(Category.name).all()
        category_data['subcategories'] = categories_schema.dump(subcategories)

        response = jsonify(category_data)
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/slug/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_by_slug(slug):
    """Get category by slug with detailed information."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.filter_by(slug=slug).first()
        if not category:
            return jsonify({"error": "Category not found"}), 404

        category_data = get_category_with_stats(category)

        # Add subcategories
        subcategories = Category.query.filter_by(parent_id=category.id).order_by(Category.name).all()
        category_data['subcategories'] = categories_schema.dump(subcategories)

        response = jsonify(category_data)
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching category by slug {slug}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/<int:category_id>/products', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_products(category_id):
    """Get products in a specific category."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": "Category not found"}), 404

        page, per_page = get_pagination_params()
        include_subcategories = request.args.get('include_subcategories', '').lower() == 'true'

        # Build products query
        if include_subcategories:
            # Get all subcategory IDs
            subcategory_ids = [cat.id for cat in Category.query.filter_by(parent_id=category_id).all()]
            subcategory_ids.append(category_id)
            query = Product.query.filter(Product.category_id.in_(subcategory_ids))
        else:
            query = Product.query.filter_by(category_id=category_id)

        # Filter active products only
        query = query.filter_by(is_active=True)

        # Add sorting
        sort_by = request.args.get('sort_by', 'name')
        if sort_by == 'price':
            query = query.order_by(Product.price)
        elif sort_by == 'created_at':
            query = query.order_by(desc(Product.created_at))
        else:
            query = query.order_by(Product.name)

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Import product schema here to avoid circular imports
        from ...schemas.schemas import products_schema

        result = {
            "category": category_schema.dump(category),
            "products": {
                "items": products_schema.dump(paginated.items),
                "pagination": {
                    "page": paginated.page,
                    "per_page": paginated.per_page,
                    "total_pages": paginated.pages,
                    "total_items": paginated.total,
                    "has_next": paginated.has_next,
                    "has_prev": paginated.has_prev
                }
            }
        }

        response = jsonify(result)
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching products for category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category products",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/<int:category_id>/breadcrumb', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_breadcrumb_endpoint(category_id):
    """Get category breadcrumb trail."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": "Category not found"}), 404

        breadcrumb = get_category_breadcrumb(category)

        response = jsonify({"breadcrumb": breadcrumb})
        response.headers['Cache-Control'] = 'public, max-age=600'  # 10 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching breadcrumb for category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category breadcrumb",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/search', methods=['GET', 'OPTIONS'])
@cross_origin()
def search_categories():
    """Search categories by name or description."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({
                "error": "Search term is required",
                "items": [],
                "total": 0
            }), 400

        page, per_page = get_pagination_params()

        # Build search query
        #query = Category.query.filter(
        #    or_(
        #        Category.name.ilike(f'%{search_term}%'),
        #        Category.description.ilike(f'%{search_term}%')
        #    )
        #).order_by(Category.name)

        # Get all categories
        all_categories = Category.query.all()

        # Prepare search
        search_words = search_term.lower().split()
        matching_categories = []

        # Python string matching - require better matching for search terms
        for category in all_categories:
            category_name = (category.name or '').lower()
            category_desc = (category.description or '').lower()
            category_slug = (category.slug or '').lower()
            logger.debug(f"Checking category {category.id}: name='{category_name}', desc='{category_desc}', slug='{category_slug}'")

            # Calculate relevance score for this category
            relevance_score = 0

            # Exact match on full search term gets highest score
            if search_term.lower() in category_name:
                relevance_score += 100
            elif search_term.lower() in category_desc:
                relevance_score += 50
            elif search_term.lower() in category_slug:
                relevance_score += 40

            # Check individual words - must match all words to be considered
            words_matched = 0
            for word in search_words:
                if word in category_name:
                    words_matched += 1
                    relevance_score += 10
                elif word in category_desc:
                    words_matched += 1
                    relevance_score += 5
                elif word in category_slug:
                    words_matched += 1
                    relevance_score += 4

            # Only include if all words matched or we have a direct match
            all_words_matched = words_matched == len(search_words) and len(search_words) > 0
            exact_match = relevance_score >= 40  # Direct match in name/desc/slug

            if all_words_matched or exact_match:
                logger.debug(f"  -> MATCHED category {category.id} with score {relevance_score}")
                category.search_relevance = relevance_score  # Add score for sorting
                matching_categories.append(category)

        # Use Python matching results
        if matching_categories:
            # Sort by relevance score (highest first)
            matching_categories.sort(key=lambda c: getattr(c, 'search_relevance', 0), reverse=True)
            matching_ids = [cat.id for cat in matching_categories]
            query = Category.query.filter(Category.id.in_(matching_ids))
            # Preserve the sorted order from Python matching
            from sqlalchemy import case
            if matching_ids:
                query = query.order_by(case(
                    {id_val: idx for idx, id_val in enumerate(matching_ids)},
                    value=Category.id
                ))
            logger.debug("Using Python matching results")
        else:
            query = Category.query.filter(Category.id == -1)  # Empty result
            logger.debug("No matches found")

        # Get paginated results
        result = paginate_response(query, categories_schema, page, per_page)

        # Add product counts
        for item in result['items']:
            category = Category.query.get(item['id'])
            if category:
                item['products_count'] = Product.query.filter_by(category_id=category.id).count()

        response = jsonify(result)
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error searching categories: {str(e)}")
        return jsonify({
            "error": "Failed to search categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/popular', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_popular_categories():
    """Get categories with most products."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        limit = min(20, request.args.get('limit', 10, type=int))

        # Get categories with product counts
        categories_with_counts = db.session.query(
            Category,
            func.count(Product.id).label('products_count')
        ).outerjoin(Product).group_by(Category.id).order_by(
            desc('products_count')
        ).limit(limit).all()

        result = []
        for category, products_count in categories_with_counts:
            category_data = category_schema.dump(category)
            category_data['products_count'] = products_count
            result.append(category_data)

        response = jsonify({
            "items": result,
            "total": len(result)
        })
        response.headers['Cache-Control'] = 'public, max-age=600'  # 10 minutes
        return response, 200

    except Exception as e:
        logger.error(f"Error fetching popular categories: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve popular categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

# ----------------------
# Error Handlers
# ----------------------

@categories_routes.errorhandler(404)
def category_not_found(error):
    """Handle category not found errors."""
    return jsonify({"error": "Category not found"}), 404

@categories_routes.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({"error": "Bad request", "details": str(error)}), 400

@categories_routes.errorhandler(500)
def internal_error(error):
    """Handle internal server errors."""
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

# ----------------------
# Health Check
# ----------------------

@categories_routes.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            "status": "healthy",
            "service": "categories",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "categories",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 503
