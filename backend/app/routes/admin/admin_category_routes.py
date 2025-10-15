"""
Admin Category routes for Mizizzi E-commerce platform.
Handles category management operations for administrators.
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
from flask_jwt_extended import jwt_required, get_jwt_identity

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
admin_category_routes = Blueprint('admin_category_routes', __name__)

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

def create_slug(name: str, existing_id: Optional[int] = None) -> str:
    """Create a unique slug from name."""
    if not name:
        return ""

    # Basic slug creation
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    slug = slug.strip('-')

    if not slug:
        slug = "category"

    # Check for uniqueness
    base_slug = slug
    counter = 1

    while True:
        query = Category.query.filter_by(slug=slug)
        if existing_id:
            query = query.filter(Category.id != existing_id)

        if not query.first():
            break

        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug

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

    # Add timestamps
    category_data['created_at'] = category.created_at.isoformat() if category.created_at else None
    category_data['updated_at'] = category.updated_at.isoformat() if category.updated_at else None

    return category_data

# ----------------------
# Admin Category Routes (Authentication Required)
# ----------------------

@admin_category_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
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

@admin_category_routes.route('/', methods=['POST'])
@cross_origin()
@jwt_required()
@admin_required
def create_category():
    """Create a new category (Admin only)."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        name = sanitize_input(data.get('name', ''))

        if not name:
            return jsonify({"error": "Category name is required"}), 400

        # Create or validate slug
        slug = sanitize_input(data.get('slug', ''))
        if not slug:
            slug = create_slug(name)
        else:
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
            is_featured=bool(data.get('is_featured', False)),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
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

@admin_category_routes.route('/<int:category_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_get_category(category_id):
    """Get category details for admin."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get_or_404(category_id)
        category_data = get_category_with_stats(category)

        # Add subcategories
        subcategories = Category.query.filter_by(parent_id=category.id).order_by(Category.name).all()
        category_data['subcategories'] = categories_schema.dump(subcategories)

        # Add parent category if exists
        if category.parent_id:
            parent_category = Category.query.get(category.parent_id)
            if parent_category:
                category_data['parent_category'] = category_schema.dump(parent_category)

        return jsonify(category_data), 200

    except Exception as e:
        logger.error(f"Error getting category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@admin_category_routes.route('/<int:category_id>', methods=['PUT'])
@cross_origin()
@jwt_required()
@admin_required
def update_category(category_id):
    """Update a category (Admin only)."""
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
            if slug:
                if not validate_slug(slug):
                    return jsonify({
                        "error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only"
                    }), 400

                # Check if slug already exists for different category
                existing = Category.query.filter_by(slug=slug).first()
                if existing and existing.id != category_id:
                    return jsonify({"error": "Slug already exists"}), 409

                category.slug = slug
            else:
                # Generate new slug from name if slug is empty
                if 'name' in data:
                    category.slug = create_slug(data['name'], category_id)

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
                    current_parent = Category.query.get(current_parent.parent_id) if current_parent.parent_id else None

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

@admin_category_routes.route('/<int:category_id>', methods=['DELETE'])
@cross_origin()
@jwt_required()
@admin_required
def delete_category(category_id):
    """Delete a category (Admin only)."""
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

@admin_category_routes.route('/bulk-delete', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
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

@admin_category_routes.route('/<int:category_id>/toggle-featured', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def toggle_category_featured(category_id):
    """Toggle category featured status."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        category = Category.query.get_or_404(category_id)
        category.is_featured = not category.is_featured
        category.updated_at = datetime.utcnow()
        db.session.commit()

        status = "featured" if category.is_featured else "unfeatured"

        return jsonify({
            "message": f"Category {status} successfully",
            "category": category_schema.dump(category)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling category featured status {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to toggle category featured status",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@admin_category_routes.route('/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
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

@admin_category_routes.route('/reorder', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def reorder_categories():
    """Reorder categories (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        data = request.get_json()
        category_orders = data.get('categories', [])

        if not category_orders or not isinstance(category_orders, list):
            return jsonify({"error": "Categories array is required"}), 400

        updated_count = 0
        for item in category_orders:
            if not isinstance(item, dict) or 'id' not in item or 'order' not in item:
                continue

            category = Category.query.get(item['id'])
            if category:
                category.sort_order = item['order']
                category.updated_at = datetime.utcnow()
                updated_count += 1

        db.session.commit()

        return jsonify({
            "message": f"Successfully reordered {updated_count} categories",
            "updated_count": updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reordering categories: {str(e)}")
        return jsonify({
            "error": "Failed to reorder categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

@admin_category_routes.route('/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def export_categories():
    """Export categories to CSV (Admin only)."""
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        import csv
        import io

        categories = Category.query.order_by(Category.name).all()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'ID', 'Name', 'Slug', 'Description', 'Parent ID', 'Parent Name',
            'Is Featured', 'Products Count', 'Created At', 'Updated At'
        ])

        # Write data
        for category in categories:
            parent_name = ""
            if category.parent_id:
                parent = Category.query.get(category.parent_id)
                parent_name = parent.name if parent else ""

            products_count = Product.query.filter_by(category_id=category.id).count()

            writer.writerow([
                category.id,
                category.name,
                category.slug,
                category.description or "",
                category.parent_id or "",
                parent_name,
                category.is_featured,
                products_count,
                category.created_at.strftime('%Y-%m-%d %H:%M:%S') if category.created_at else "",
                category.updated_at.strftime('%Y-%m-%d %H:%M:%S') if category.updated_at else ""
            ])

        csv_data = output.getvalue()
        output.close()

        return jsonify({
            "message": f"Exported {len(categories)} categories",
            "csv_data": csv_data,
            "filename": f"categories_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }), 200

    except Exception as e:
        logger.error(f"Error exporting categories: {str(e)}")
        return jsonify({
            "error": "Failed to export categories",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500

# ----------------------
# Error Handlers
# ----------------------

@admin_category_routes.errorhandler(404)
def category_not_found(error):
    """Handle category not found errors."""
    return jsonify({"error": "Category not found"}), 404

@admin_category_routes.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({"error": "Bad request", "details": str(error)}), 400

@admin_category_routes.errorhandler(500)
def internal_error(error):
    """Handle internal server errors."""
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

# ----------------------
# Health Check
# ----------------------

@admin_category_routes.route('/health', methods=['GET'])
@cross_origin()
def admin_health_check():
    """Health check endpoint for admin categories."""
    try:
        # Test database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            "status": "healthy",
            "service": "admin_categories",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "admin_categories",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 503
