"""
Complete Category routes for Mizizzi E-commerce platform.
Handles category management with full validation for both users and admin.
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

# Validations & Decorators
from ...validations.validation import admin_required

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

def validate_slug(slug: str) -> bool:
    """Validate category slug format."""
    if not slug or len(slug) < 2 or len(slug) > 100:
        return False
    return bool(SLUG_PATTERN.match(slug.lower()))

def sanitize_input(data: str) -> str:
    """Sanitize input data."""
    if not data:
        return ""
    return data.strip()[:500]  # Limit length and strip whitespace

def get_current_user_role():
    """Get current user role if authenticated."""
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
        if current_user_id:
            user = User.query.get(current_user_id)
            return user.role if user else None
    except:
        pass
    return None

def add_cors_headers(response):
    """Add CORS headers to response."""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
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
        category = Category.query.get_or_404(category_id)
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
        category = Category.query.filter_by(slug=slug).first_or_404()
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
        category = Category.query.get_or_404(category_id)

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
        category = Category.query.get_or_404(category_id)
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

# ----------------------
# Admin Category Routes (Authentication Required)
# ----------------------

@categories_routes.route('/admin', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_get_categories():
    """Admin endpoint to get all categories with full details."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        page, per_page = get_pagination_params()
        search_params = get_search_params()

        # Build query (admin can see all categories)
        query = build_category_query(search_params)

        # Get paginated results
        result = paginate_response(query, categories_schema, page, per_page)

        # Add admin-specific data
        for item in result['items']:
            category = Category.query.get(item['id'])
            if category:
                item['products_count'] = Product.query.filter_by(category_id=category.id).count()
                item['subcategories_count'] = Category.query.filter_by(parent_id=category.id).count()
                item['created_at'] = category.created_at.isoformat() if category.created_at else None
                item['updated_at'] = category.updated_at.isoformat() if category.updated_at else None

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Admin error fetching categories: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_category():
    """Create a new category (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        name = sanitize_input(data.get('name', ''))
        slug = sanitize_input(data.get('slug', ''))

        if not name:
            return jsonify({"error": "Category name is required"}), 400

        if not slug:
            return jsonify({"error": "Category slug is required"}), 400

        if not validate_slug(slug):
            return jsonify({
                "error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only"
            }), 400

        # Check if slug already exists
        if Category.query.filter_by(slug=slug).first():
            return jsonify({"error": "Slug already exists"}), 409

        # Validate parent category if provided
        parent_id = data.get('parent_id')
        if parent_id:
            parent_category = Category.query.get(parent_id)
            if not parent_category:
                return jsonify({"error": "Parent category not found"}), 404

        # Create new category
        new_category = Category(
            name=name,
            slug=slug,
            description=sanitize_input(data.get('description', '')),
            image_url=sanitize_input(data.get('image_url', '')),
            banner_url=sanitize_input(data.get('banner_url', '')),
            parent_id=parent_id,
            is_featured=bool(data.get('is_featured', False))
        )

        db.session.add(new_category)
        db.session.commit()

        logger.info(f"Category created: {new_category.name} (ID: {new_category.id})")

        return jsonify({
            "message": "Category created successfully",
            "category": get_category_with_stats(new_category)
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error creating category: {str(e)}")
        return jsonify({"error": "Category with this slug already exists"}), 409

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating category: {str(e)}")
        return jsonify({
            "error": "Failed to create category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/<int:category_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_category(category_id):
    """Update a category (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields if provided
        if 'name' in data:
            name = sanitize_input(data['name'])
            if not name:
                return jsonify({"error": "Category name cannot be empty"}), 400
            category.name = name

        if 'slug' in data:
            slug = sanitize_input(data['slug'])
            if not slug:
                return jsonify({"error": "Category slug cannot be empty"}), 400

            if not validate_slug(slug):
                return jsonify({
                    "error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only"
                }), 400

            # Check if slug already exists for different category
            existing = Category.query.filter_by(slug=slug).first()
            if existing and existing.id != category_id:
                return jsonify({"error": "Slug already exists"}), 409

            category.slug = slug

        if 'description' in data:
            category.description = sanitize_input(data['description'])

        if 'image_url' in data:
            category.image_url = sanitize_input(data['image_url'])

        if 'banner_url' in data:
            category.banner_url = sanitize_input(data['banner_url'])

        if 'parent_id' in data:
            parent_id = data['parent_id']
            if parent_id:
                # Validate parent category exists
                parent_category = Category.query.get(parent_id)
                if not parent_category:
                    return jsonify({"error": "Parent category not found"}), 404

                # Prevent circular reference
                if parent_id == category_id:
                    return jsonify({"error": "Category cannot be its own parent"}), 400

                # Check if this would create a circular reference
                current_parent = parent_category
                while current_parent:
                    if current_parent.id == category_id:
                        return jsonify({"error": "This would create a circular reference"}), 400
                    current_parent = current_parent.parent if hasattr(current_parent, 'parent') else None

            category.parent_id = parent_id

        if 'is_featured' in data:
            category.is_featured = bool(data['is_featured'])

        category.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Category updated: {category.name} (ID: {category.id})")

        return jsonify({
            "message": "Category updated successfully",
            "category": get_category_with_stats(category)
        }), 200

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error updating category {category_id}: {str(e)}")
        return jsonify({"error": "Category with this slug already exists"}), 409

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to update category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/<int:category_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_category(category_id):
    """Delete a category (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get_or_404(category_id)

        # Check if category has products
        products_count = Product.query.filter_by(category_id=category_id).count()
        if products_count > 0:
            return jsonify({
                "error": f"Cannot delete category with {products_count} associated products. Please move or delete products first."
            }), 400

        # Check if category has subcategories
        subcategories_count = Category.query.filter_by(parent_id=category_id).count()
        if subcategories_count > 0:
            return jsonify({
                "error": f"Cannot delete category with {subcategories_count} subcategories. Please delete subcategories first."
            }), 400

        category_name = category.name
        db.session.delete(category)
        db.session.commit()

        logger.info(f"Category deleted: {category_name} (ID: {category_id})")

        return jsonify({"message": f"Category '{category_name}' deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to delete category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/bulk-delete', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def bulk_delete_categories():
    """Bulk delete categories (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        data = request.get_json()
        category_ids = data.get('category_ids', [])

        if not category_ids or not isinstance(category_ids, list):
            return jsonify({"error": "category_ids array is required"}), 400

        deleted_categories = []
        errors = []

        for category_id in category_ids:
            try:
                category = Category.query.get(category_id)
                if not category:
                    errors.append(f"Category {category_id} not found")
                    continue

                # Check constraints
                products_count = Product.query.filter_by(category_id=category_id).count()
                subcategories_count = Category.query.filter_by(parent_id=category_id).count()

                if products_count > 0 or subcategories_count > 0:
                    errors.append(f"Category '{category.name}' has {products_count} products and {subcategories_count} subcategories")
                    continue

                category_name = category.name
                db.session.delete(category)
                deleted_categories.append({"id": category_id, "name": category_name})

            except Exception as e:
                errors.append(f"Error deleting category {category_id}: {str(e)}")

        if deleted_categories:
            db.session.commit()
            logger.info(f"Bulk deleted {len(deleted_categories)} categories")

        return jsonify({
            "message": f"Successfully deleted {len(deleted_categories)} categories",
            "deleted_categories": deleted_categories,
            "errors": errors
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in bulk delete: {str(e)}")
        return jsonify({
            "error": "Failed to bulk delete categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@categories_routes.route('/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_category_stats():
    """Get category statistics (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        total_categories = Category.query.count()
        featured_categories = Category.query.filter_by(is_featured=True).count()
        top_level_categories = Category.query.filter_by(parent_id=None).count()

        # Categories with most products
        categories_with_products = db.session.query(
            Category.id,
            Category.name,
            func.count(Product.id).label('products_count')
        ).outerjoin(Product).group_by(Category.id).order_by(desc('products_count')).limit(10).all()

        top_categories = [
            {
                "id": cat.id,
                "name": cat.name,
                "products_count": cat.products_count
            }
            for cat in categories_with_products
        ]

        stats = {
            "total_categories": total_categories,
            "featured_categories": featured_categories,
            "top_level_categories": top_level_categories,
            "subcategories": total_categories - top_level_categories,
            "top_categories_by_products": top_categories
        }

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"Error fetching category stats: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category statistics",
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
