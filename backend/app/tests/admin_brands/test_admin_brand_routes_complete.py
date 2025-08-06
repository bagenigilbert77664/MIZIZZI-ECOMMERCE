"""
Admin Brand Routes for Mizizzi E-commerce Platform
Handles all admin-level brand management operations
"""

import logging
from datetime import datetime, UTC
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, and_, desc, asc
from sqlalchemy.exc import IntegrityError

# Import extensions and models
try:
    from app.configuration.extensions import db, cache
    from app.models.models import Brand, Product, User, UserRole
    from app.schemas.schemas import brand_schema, brands_schema, product_schema, products_schema
    from app.utils.auth_utils import admin_required
except ImportError:
    # Fallback imports for different project structures
    from backend.app.configuration.extensions import db, cache
    from backend.app.models.models import Brand, Product, User, UserRole
    from backend.app.schemas.schemas import brand_schema, brands_schema, product_schema, products_schema
    from backend.app.utils.auth_utils import admin_required

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
admin_brand_routes = Blueprint('admin_brand_routes', __name__)

# Constants
DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 100


@admin_brand_routes.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check endpoint for admin brand routes."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    return jsonify({
        'status': 'ok',
        'service': 'admin_brand_routes',
        'timestamp': datetime.now(UTC).isoformat(),
        'endpoints': [
            'GET /api/admin/brands/',
            'POST /api/admin/brands/',
            'GET /api/admin/brands/<int:brand_id>',
            'PUT /api/admin/brands/<int:brand_id>',
            'DELETE /api/admin/brands/<int:brand_id>',
            'GET /api/admin/brands/<int:brand_id>/products',
            'POST /api/admin/brands/<int:brand_id>/toggle-status',
            'POST /api/admin/brands/<int:brand_id>/toggle-featured',
            'POST /api/admin/brands/bulk-update',
            'GET /api/admin/brands/statistics'
        ]
    }), 200


@admin_brand_routes.route('/', methods=['GET'])
@jwt_required()
@admin_required
def get_all_brands():
    """Get all brands with admin-level details including inactive brands."""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', DEFAULT_PAGE_SIZE, type=int), MAX_PAGE_SIZE)
        search = request.args.get('search', '').strip()
        q = request.args.get('q', '').strip()  # Alternative search parameter
        active = request.args.get('active')
        featured = request.args.get('featured')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = Brand.query

        # Apply search filters
        search_term = search or q
        if search_term:
            search_filter = or_(
                Brand.name.ilike(f'%{search_term}%'),
                Brand.description.ilike(f'%{search_term}%'),
                Brand.slug.ilike(f'%{search_term}%')
            )
            query = query.filter(search_filter)

        # Apply status filters
        if active is not None:
            is_active = active.lower() in ['true', '1', 'yes']
            query = query.filter(Brand.is_active == is_active)

        if featured is not None:
            is_featured = featured.lower() in ['true', '1', 'yes']
            query = query.filter(Brand.is_featured == is_featured)

        # Apply sorting
        if hasattr(Brand, sort_by):
            sort_column = getattr(Brand, sort_by)
            if sort_order.lower() == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(Brand.created_at))

        # Execute pagination
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Serialize brands
        brands = brands_schema.dump(pagination.items)

        # Add product counts for each brand
        for brand in brands:
            brand_obj = Brand.query.get(brand['id'])
            if brand_obj:
                brand['product_count'] = len(brand_obj.products)
                brand['active_product_count'] = len([p for p in brand_obj.products if p.is_active])

        # Calculate statistics
        total_brands = Brand.query.count()
        active_brands = Brand.query.filter(Brand.is_active == True).count()
        featured_brands = Brand.query.filter(Brand.is_featured == True).count()
        inactive_brands = total_brands - active_brands

        statistics = {
            'total_brands': total_brands,
            'active_brands': active_brands,
            'featured_brands': featured_brands,
            'inactive_brands': inactive_brands
        }

        return jsonify({
            'items': brands,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'statistics': statistics
        }), 200

    except Exception as e:
        logger.error(f"Failed to retrieve brands: {str(e)}")
        return jsonify({'error': 'Failed to retrieve brands'}), 500


@admin_brand_routes.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_brand():
    """Create a new brand."""
    try:
        # Validate JSON data
        if not request.is_json:
            return jsonify({'error': 'Invalid JSON format'}), 400

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Brand name is required'}), 400

        # Check for duplicate name
        existing_brand = Brand.query.filter(Brand.name.ilike(name)).first()
        if existing_brand:
            return jsonify({'error': 'Brand name already exists'}), 409

        # Generate slug if not provided
        slug = data.get('slug', '').strip()
        if not slug:
            slug = name.lower().replace(' ', '-').replace('&', 'and')
            # Remove special characters except hyphens
            import re
            slug = re.sub(r'[^a-z0-9\-]', '', slug)
            slug = re.sub(r'-+', '-', slug).strip('-')

        # Check for duplicate slug
        existing_slug = Brand.query.filter(Brand.slug == slug).first()
        if existing_slug:
            return jsonify({'error': 'Slug already exists'}), 409

        # Create new brand
        brand = Brand(
            name=name,
            slug=slug,
            description=data.get('description', '').strip(),
            logo_url=data.get('logo_url', '').strip(),
            website=data.get('website', '').strip(),
            is_active=data.get('is_active', True),
            is_featured=data.get('is_featured', False)
        )

        db.session.add(brand)
        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        # Serialize and return
        brand_data = brand_schema.dump(brand)
        brand_data['product_count'] = 0
        brand_data['active_product_count'] = 0

        logger.info(f"Brand created successfully: {brand.name} (ID: {brand.id})")

        return jsonify({
            'message': 'Brand created successfully',
            'brand': brand_data
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Database integrity error creating brand: {str(e)}")
        return jsonify({'error': 'Brand with this name or slug already exists'}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create brand: {str(e)}")
        return jsonify({'error': 'Failed to create brand'}), 500


@admin_brand_routes.route('/<int:brand_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_brand_by_id(brand_id):
    """Get a specific brand by ID with admin details."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Serialize brand
        brand_data = brand_schema.dump(brand)

        # Add product counts
        brand_data['product_count'] = len(brand.products)
        brand_data['active_product_count'] = len([p for p in brand.products if p.is_active])

        return jsonify(brand_data), 200

    except Exception as e:
        logger.error(f"Failed to retrieve brand {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve brand'}), 500


@admin_brand_routes.route('/<int:brand_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_brand(brand_id):
    """Update a brand."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Validate JSON data
        if not request.is_json:
            return jsonify({'error': 'Invalid JSON format'}), 400

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update fields if provided
        if 'name' in data:
            new_name = data['name'].strip()
            if new_name and new_name != brand.name:
                # Check for duplicate name
                existing_brand = Brand.query.filter(
                    and_(Brand.name.ilike(new_name), Brand.id != brand_id)
                ).first()
                if existing_brand:
                    return jsonify({'error': 'Brand name already exists'}), 409
                brand.name = new_name

        if 'slug' in data:
            new_slug = data['slug'].strip()
            if new_slug and new_slug != brand.slug:
                # Check for duplicate slug
                existing_slug = Brand.query.filter(
                    and_(Brand.slug == new_slug, Brand.id != brand_id)
                ).first()
                if existing_slug:
                    return jsonify({'error': 'Slug already exists'}), 409
                brand.slug = new_slug

        if 'description' in data:
            brand.description = data['description'].strip()

        if 'logo_url' in data:
            brand.logo_url = data['logo_url'].strip()

        if 'website' in data:
            brand.website = data['website'].strip()

        if 'is_active' in data:
            brand.is_active = bool(data['is_active'])

        if 'is_featured' in data:
            brand.is_featured = bool(data['is_featured'])

        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        # Serialize and return
        brand_data = brand_schema.dump(brand)
        brand_data['product_count'] = len(brand.products)
        brand_data['active_product_count'] = len([p for p in brand.products if p.is_active])

        logger.info(f"Brand updated successfully: {brand.name} (ID: {brand.id})")

        return jsonify({
            'message': 'Brand updated successfully',
            'brand': brand_data
        }), 200

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Database integrity error updating brand: {str(e)}")
        return jsonify({'error': 'Brand with this name or slug already exists'}), 409
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to update brand {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to update brand'}), 500


@admin_brand_routes.route('/<int:brand_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_brand(brand_id):
    """Delete a brand."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Check if brand has associated products
        if brand.products:
            return jsonify({
                'error': 'Cannot delete brand with associated products. Please remove or reassign products first.'
            }), 400

        brand_name = brand.name
        db.session.delete(brand)
        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        logger.info(f"Brand deleted successfully: {brand_name} (ID: {brand_id})")

        return jsonify({
            'message': 'Brand deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete brand {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete brand'}), 500


@admin_brand_routes.route('/<int:brand_id>/products', methods=['GET'])
@jwt_required()
@admin_required
def get_brand_products(brand_id):
    """Get all products for a specific brand with admin details."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', DEFAULT_PAGE_SIZE, type=int), MAX_PAGE_SIZE)
        search = request.args.get('search', '').strip()
        active = request.args.get('active')
        featured = request.args.get('featured')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = Product.query.filter(Product.brand_id == brand_id)

        # Apply search filter
        if search:
            search_filter = or_(
                Product.name.ilike(f'%{search}%'),
                Product.description.ilike(f'%{search}%'),
                Product.sku.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)

        # Apply status filters
        if active is not None:
            is_active = active.lower() in ['true', '1', 'yes']
            query = query.filter(Product.is_active == is_active)

        if featured is not None:
            is_featured = featured.lower() in ['true', '1', 'yes']
            query = query.filter(Product.is_featured == is_featured)

        # Apply sorting
        if hasattr(Product, sort_by):
            sort_column = getattr(Product, sort_by)
            if sort_order.lower() == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(Product.created_at))

        # Execute pagination
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Serialize products
        products = products_schema.dump(pagination.items)

        # Calculate statistics
        total_products = Product.query.filter(Product.brand_id == brand_id).count()
        active_products = Product.query.filter(
            and_(Product.brand_id == brand_id, Product.is_active == True)
        ).count()
        inactive_products = total_products - active_products

        statistics = {
            'total_products': total_products,
            'active_products': active_products,
            'inactive_products': inactive_products
        }

        return jsonify({
            'items': products,
            'brand': brand_schema.dump(brand),
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'statistics': statistics
        }), 200

    except Exception as e:
        logger.error(f"Failed to retrieve products for brand {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve brand products'}), 500


@admin_brand_routes.route('/<int:brand_id>/toggle-status', methods=['POST'])
@jwt_required()
@admin_required
def toggle_brand_status(brand_id):
    """Toggle brand active status."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Toggle status
        brand.is_active = not brand.is_active
        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        status = 'activated' if brand.is_active else 'deactivated'
        logger.info(f"Brand {status}: {brand.name} (ID: {brand.id})")

        return jsonify({
            'message': f'Brand {status} successfully',
            'brand': brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to toggle brand status {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to toggle brand status'}), 500


@admin_brand_routes.route('/<int:brand_id>/toggle-featured', methods=['POST'])
@jwt_required()
@admin_required
def toggle_brand_featured(brand_id):
    """Toggle brand featured status."""
    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({'error': 'Brand not found'}), 404

        # Toggle featured status
        brand.is_featured = not brand.is_featured
        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        status = 'featured' if brand.is_featured else 'unfeatured'
        logger.info(f"Brand {status}: {brand.name} (ID: {brand.id})")

        return jsonify({
            'message': f'Brand {status} successfully',
            'brand': brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to toggle brand featured status {brand_id}: {str(e)}")
        return jsonify({'error': 'Failed to toggle brand featured status'}), 500


@admin_brand_routes.route('/bulk-update', methods=['POST'])
@jwt_required()
@admin_required
def bulk_update_brands():
    """Bulk update multiple brands."""
    try:
        # Validate JSON data
        if not request.is_json:
            return jsonify({'error': 'Invalid JSON format'}), 400

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        brand_ids = data.get('brand_ids', [])
        updates = data.get('updates', {})

        if not brand_ids:
            return jsonify({'error': 'No brand IDs provided'}), 400

        if not updates:
            return jsonify({'error': 'No updates provided'}), 400

        # Validate brand IDs exist
        brands = Brand.query.filter(Brand.id.in_(brand_ids)).all()
        if len(brands) != len(brand_ids):
            found_ids = [b.id for b in brands]
            missing_ids = [bid for bid in brand_ids if bid not in found_ids]
            return jsonify({
                'error': 'Some brand IDs not found',
                'missing_ids': missing_ids
            }), 404

        # Apply updates
        updated_count = 0
        for brand in brands:
            if 'is_active' in updates:
                brand.is_active = bool(updates['is_active'])
            if 'is_featured' in updates:
                brand.is_featured = bool(updates['is_featured'])

            brand.updated_at = datetime.now(UTC)
            updated_count += 1

        db.session.commit()

        # Clear cache
        cache.delete('brands_list')
        cache.delete('featured_brands')

        logger.info(f"Bulk updated {updated_count} brands")

        return jsonify({
            'message': f'Successfully updated {updated_count} brands',
            'updated_count': updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to bulk update brands: {str(e)}")
        return jsonify({'error': 'Failed to bulk update brands'}), 500


@admin_brand_routes.route('/statistics', methods=['GET'])
@jwt_required()
@admin_required
def get_brand_statistics():
    """Get comprehensive brand statistics."""
    try:
        # Basic statistics
        total_brands = Brand.query.count()
        active_brands = Brand.query.filter(Brand.is_active == True).count()
        featured_brands = Brand.query.filter(Brand.is_featured == True).count()
        inactive_brands = total_brands - active_brands

        # Top brands by product count
        top_brands = db.session.query(
            Brand.id,
            Brand.name,
            Brand.slug,
            db.func.count(Product.id).label('product_count')
        ).outerjoin(Product).group_by(Brand.id).order_by(
            db.func.count(Product.id).desc()
        ).limit(10).all()

        top_brands_data = [
            {
                'id': brand.id,
                'name': brand.name,
                'slug': brand.slug,
                'product_count': brand.product_count
            }
            for brand in top_brands
        ]

        # Recent brands
        recent_brands = Brand.query.order_by(desc(Brand.created_at)).limit(5).all()
        recent_brands_data = brands_schema.dump(recent_brands)

        return jsonify({
            'overview': {
                'total_brands': total_brands,
                'active_brands': active_brands,
                'featured_brands': featured_brands,
                'inactive_brands': inactive_brands
            },
            'top_brands': top_brands_data,
            'recent_brands': recent_brands_data
        }), 200

    except Exception as e:
        logger.error(f"Failed to retrieve brand statistics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve brand statistics'}), 500


# Error handlers
@admin_brand_routes.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404


@admin_brand_routes.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400


@admin_brand_routes.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500


# CORS support
@admin_brand_routes.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
