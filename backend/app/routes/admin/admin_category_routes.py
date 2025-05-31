"""
Admin Category Routes for managing categories and brands
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy import or_
import json
from datetime import datetime
from ...models.models import Category, Brand, db, User, UserRole

admin_category_routes = Blueprint('admin_categories', __name__)

def admin_required():
    """Check if user has admin role"""
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401

        user = User.query.get(current_user_id)
        if not user or user.role != UserRole.ADMIN:
            return jsonify({'error': 'Admin access required'}), 403

        return None
    except Exception as e:
        current_app.logger.error(f"Error checking admin role: {str(e)}")
        return jsonify({'error': 'Authorization check failed'}), 500

def handle_options(allowed_methods):
    """Standard OPTIONS response handler for CORS."""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', allowed_methods)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Access-Control-Allow-Methods')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '86400')
    return response

@admin_category_routes.route('/api/admin/categories', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_categories():
    """Get all categories with pagination"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 10000)
        search = request.args.get('search', '')

        # Build query
        query = Category.query

        # Apply search filter
        if search:
            query = query.filter(or_(
                Category.name.ilike(f'%{search}%'),
                Category.description.ilike(f'%{search}%')
            ))

        # Order by name
        query = query.order_by(Category.name.asc())

        # Paginate
        categories = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'items': [category.to_dict() for category in categories.items],
            'pagination': {
                'page': categories.page,
                'per_page': categories.per_page,
                'total': categories.total,
                'pages': categories.pages,
                'has_next': categories.has_next,
                'has_prev': categories.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching categories: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch categories',
            'details': str(e)
        }), 500

@admin_category_routes.route('/api/admin/brands', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_brands():
    """Get all brands with pagination"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 10000)
        search = request.args.get('search', '')

        # Build query
        query = Brand.query

        # Apply search filter
        if search:
            query = query.filter(or_(
                Brand.name.ilike(f'%{search}%'),
                Brand.description.ilike(f'%{search}%')
            ))

        # Order by name
        query = query.order_by(Brand.name.asc())

        # Paginate
        brands = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'items': [brand.to_dict() for brand in brands.items],
            'pagination': {
                'page': brands.page,
                'per_page': brands.per_page,
                'total': brands.total,
                'pages': brands.pages,
                'has_next': brands.has_next,
                'has_prev': brands.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching brands: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch brands',
            'details': str(e)
        }), 500

@admin_category_routes.route('/api/admin/categories', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_category():
    """Create a new category"""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400

        # Create new category
        category = Category(
            name=data['name'],
            slug=data.get('slug', data['name'].lower().replace(' ', '-')),
            description=data.get('description', ''),
            is_active=bool(data.get('is_active', True)),
            parent_id=data.get('parent_id'),
            sort_order=int(data.get('sort_order', 0)),
            meta_title=data.get('meta_title', ''),
            meta_description=data.get('meta_description', ''),
            image_url=data.get('image_url')
        )

        # Add to database
        db.session.add(category)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating category: {str(e)}")
        return jsonify({
            'error': 'Failed to create category',
            'details': str(e)
        }), 500

@admin_category_routes.route('/api/admin/brands', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_brand():
    """Create a new brand"""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Brand name is required'}), 400

        # Create new brand
        brand = Brand(
            name=data['name'],
            slug=data.get('slug', data['name'].lower().replace(' ', '-')),
            description=data.get('description', ''),
            is_active=bool(data.get('is_active', True)),
            logo_url=data.get('logo_url'),
            website_url=data.get('website_url'),
            meta_title=data.get('meta_title', ''),
            meta_description=data.get('meta_description', '')
        )

        # Add to database
        db.session.add(brand)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Brand created successfully',
            'brand': brand.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating brand: {str(e)}")
        return jsonify({
            'error': 'Failed to create brand',
            'details': str(e)
        }), 500
