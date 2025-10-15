"""
User Wishlist Routes
Handles all user wishlist operations including CRUD, bulk operations, and statistics.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from sqlalchemy import text, func, and_, or_, desc, asc
from datetime import datetime, timedelta, timezone
import logging
import json
import csv
import io
import re
from typing import Dict, List, Any, Optional, Tuple

# Import models and extensions
try:
    from app.models.models import User, Product, WishlistItem, Category, Brand
    from app.configuration.extensions import db, cache, limiter
except ImportError:
    from models.models import User, Product, WishlistItem, Category, Brand
    from configuration.extensions import db, cache, limiter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
user_wishlist_routes = Blueprint('user_wishlist_routes', __name__)

# Constants
MAX_WISHLIST_ITEMS = 500
MAX_BULK_ADD_ITEMS = 50
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
CACHE_TIMEOUT = 300  # 5 minutes

# Valid sort fields and orders
VALID_SORT_FIELDS = {
    'created_at': 'wishlist_items.created_at',
    'product_name': 'products.name',
    'product_price': 'products.price',
    'product_sale_price': 'products.sale_price',
    'category_name': 'categories.name',
    'brand_name': 'brands.name'
}

VALID_SORT_ORDERS = ['asc', 'desc']

# Helper Functions
def clear_user_cache(user_id: int):
    """Clear all cache entries for a specific user."""
    try:
        # Clear specific cache keys
        cache.delete(f"wishlist_stats_{user_id}")
        # Note: In production, you'd want to implement pattern-based cache clearing
        # For now, we clear the most important cache entries
    except Exception as e:
        logger.warning(f"Failed to clear cache for user {user_id}: {str(e)}")

def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS attacks."""
    if not text:
        return text
    
    # Remove script tags and other dangerous content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<[^>]+>', '', text)  # Remove all HTML tags
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    
    return text.strip()

def validate_user(user_id: int) -> Tuple[Optional[User], Optional[Dict]]:
    """
    Validate user exists and is active.
    
    Args:
        user_id: The user ID to validate
        
    Returns:
        Tuple of (User object or None, error dict or None)
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return None, {'error': 'User not found', 'code': 'USER_NOT_FOUND'}
        
        if not user.is_active:
            return None, {'error': 'Account is deactivated', 'code': 'ACCOUNT_DEACTIVATED'}
        
        return user, None
    except Exception as e:
        logger.error(f"Error validating user {user_id}: {str(e)}")
        return None, {'error': 'Failed to validate user', 'code': 'VALIDATION_ERROR'}

def validate_product(product_id: int) -> Tuple[Optional[Product], Optional[Dict]]:
    """
    Validate product exists and is active.
    
    Args:
        product_id: The product ID to validate
        
    Returns:
        Tuple of (Product object or None, error dict or None)
    """
    try:
        product = Product.query.get(product_id)
        if not product:
            return None, {'error': 'Product not found', 'code': 'PRODUCT_NOT_FOUND'}
        
        if not product.is_active:
            return None, {'error': 'Product is not available', 'code': 'PRODUCT_INACTIVE'}
        
        return product, None
    except Exception as e:
        logger.error(f"Error validating product {product_id}: {str(e)}")
        return None, {'error': 'Failed to validate product', 'code': 'VALIDATION_ERROR'}

def get_wishlist_query(user_id: int, filters: Dict = None):
    """
    Build wishlist query with filters and joins.
    
    Args:
        user_id: The user ID
        filters: Dictionary of filters to apply
        
    Returns:
        SQLAlchemy query object
    """
    # This ensures products without categories or brands are still included
    query = db.session.query(WishlistItem).join(Product).outerjoin(Category).outerjoin(Brand).filter(
        WishlistItem.user_id == user_id,
        Product.is_active == True
    )
    
    if not filters:
        return query
    
    # Apply filters
    if filters.get('category_id'):
        query = query.filter(Product.category_id == filters['category_id'])
    
    if filters.get('brand_id'):
        query = query.filter(Product.brand_id == filters['brand_id'])
    
    if filters.get('search_query'):
        search_term = f"%{filters['search_query']}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Category.name.ilike(search_term),
                Brand.name.ilike(search_term)
            )
        )
    
    if filters.get('min_price'):
        query = query.filter(
            or_(
                and_(Product.sale_price.isnot(None), Product.sale_price >= filters['min_price']),
                and_(Product.sale_price.is_(None), Product.price >= filters['min_price'])
            )
        )
    
    if filters.get('max_price'):
        query = query.filter(
            or_(
                and_(Product.sale_price.isnot(None), Product.sale_price <= filters['max_price']),
                and_(Product.sale_price.is_(None), Product.price <= filters['max_price'])
            )
        )
    
    if filters.get('in_stock_only'):
        query = query.filter(Product.stock > 0)
    
    if filters.get('on_sale_only'):
        query = query.filter(Product.is_sale == True)
    
    if filters.get('featured_only'):
        query = query.filter(Product.is_featured == True)
    
    return query

def apply_sorting(query, sort_by: str, sort_order: str):
    """
    Apply sorting to wishlist query.
    
    Args:
        query: SQLAlchemy query object
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        
    Returns:
        Query with sorting applied
    """
    if sort_by not in VALID_SORT_FIELDS:
        sort_by = 'created_at'
    
    if sort_order not in VALID_SORT_ORDERS:
        sort_order = 'desc'
    
    if sort_order == 'desc':
        if sort_by == 'product_price':
            # Sort by sale_price if available, otherwise by price
            query = query.order_by(
                desc(func.coalesce(Product.sale_price, Product.price))
            )
        elif sort_by == 'product_sale_price':
            query = query.order_by(desc(Product.sale_price))
        elif sort_by == 'created_at':
            query = query.order_by(desc(WishlistItem.created_at))
        elif sort_by == 'product_name':
            query = query.order_by(desc(Product.name))
        elif sort_by == 'category_name':
            query = query.order_by(desc(Category.name))
        elif sort_by == 'brand_name':
            query = query.order_by(desc(Brand.name))
    else:
        if sort_by == 'product_price':
            query = query.order_by(
                asc(func.coalesce(Product.sale_price, Product.price))
            )
        elif sort_by == 'product_sale_price':
            query = query.order_by(asc(Product.sale_price))
        elif sort_by == 'created_at':
            query = query.order_by(asc(WishlistItem.created_at))
        elif sort_by == 'product_name':
            query = query.order_by(asc(Product.name))
        elif sort_by == 'category_name':
            query = query.order_by(asc(Category.name))
        elif sort_by == 'brand_name':
            query = query.order_by(asc(Brand.name))
    
    return query

def serialize_wishlist_item(item: WishlistItem) -> Dict:
    """
    Serialize wishlist item to dictionary.
    
    Args:
        item: WishlistItem object
        
    Returns:
        Dictionary representation of wishlist item
    """
    return {
        'id': item.id,
        'product_id': item.product_id,
        'created_at': item.created_at.isoformat() if item.created_at else None,
        'product': {
            'id': item.product.id,
            'name': item.product.name,
            'slug': item.product.slug,
            'description': item.product.description,
            'short_description': item.product.short_description,
            'price': float(item.product.price) if item.product.price else None,
            'sale_price': float(item.product.sale_price) if item.product.sale_price else None,
            'stock': item.product.stock,
            'sku': item.product.sku,
            'thumbnail_url': item.product.thumbnail_url,
            'image_urls': item.product.get_image_urls(),
            'is_featured': item.product.is_featured,
            'is_sale': item.product.is_sale,
            'is_new': item.product.is_new,
            'availability_status': item.product.availability_status,
            'category': {
                'id': item.product.category.id,
                'name': item.product.category.name,
                'slug': item.product.category.slug
            } if item.product.category else None,
            'brand': {
                'id': item.product.brand.id,
                'name': item.product.brand.name,
                'slug': item.product.brand.slug
            } if item.product.brand else None
        }
    }

# Routes

@user_wishlist_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def health_check():
    """Health check endpoint for user wishlist routes."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Test database connection using text() for SQLAlchemy 2.0 compatibility
        db.session.execute(text('SELECT 1'))
        
        return jsonify({
            'status': 'ok',
            'service': 'user_wishlist_routes',
            'database': 'connected',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'endpoints': [
                'GET /health',
                'GET /',
                'POST /',
                'POST /bulk/add',
                'DELETE /<int:item_id>',
                'DELETE /clear',
                'GET /check/<int:product_id>',
                'POST /toggle/<int:product_id>',
                'GET /stats',
                'GET /export'
            ]
        }), 200
    
    except Exception as e:
        logger.error(f"User wishlist health check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'service': 'user_wishlist_routes',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@user_wishlist_routes.route('/', methods=['GET', 'OPTIONS'])
@user_wishlist_routes.route('', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("100 per minute")
def get_wishlist():
    """
    Get user's wishlist with filtering, sorting, and pagination.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - category_id: Filter by category ID
        - brand_id: Filter by brand ID
        - search: Search query for product name/description
        - min_price: Minimum price filter
        - max_price: Maximum price filter
        - in_stock_only: Show only in-stock items (true/false)
        - on_sale_only: Show only sale items (true/false)
        - featured_only: Show only featured items (true/false)
        - sort_by: Sort field (created_at, product_name, product_price, etc.)
        - sort_order: Sort order (asc, desc)
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        logger.info(f"[WISHLIST GET] User {current_user_id} fetching wishlist")
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Get query parameters
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(MAX_PAGE_SIZE, max(1, int(request.args.get('per_page', DEFAULT_PAGE_SIZE))))
        
        # Build filters
        filters = {}
        if request.args.get('category_id'):
            try:
                filters['category_id'] = int(request.args.get('category_id'))
            except ValueError:
                pass
        
        if request.args.get('brand_id'):
            try:
                filters['brand_id'] = int(request.args.get('brand_id'))
            except ValueError:
                pass
        
        if request.args.get('search'):
            search_query = sanitize_input(request.args.get('search'))
            if search_query:
                filters['search_query'] = search_query
        
        if request.args.get('min_price'):
            try:
                filters['min_price'] = float(request.args.get('min_price'))
            except ValueError:
                pass
        
        if request.args.get('max_price'):
            try:
                filters['max_price'] = float(request.args.get('max_price'))
            except ValueError:
                pass
        
        if request.args.get('in_stock_only', '').lower() == 'true':
            filters['in_stock_only'] = True
        
        if request.args.get('on_sale_only', '').lower() == 'true':
            filters['on_sale_only'] = True
        
        if request.args.get('featured_only', '').lower() == 'true':
            filters['featured_only'] = True
        
        # Sorting parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Check cache
        cache_key = f"wishlist_{current_user_id}_{page}_{per_page}_{hash(str(sorted(filters.items())))}_{sort_by}_{sort_order}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return jsonify(cached_result), 200
        
        # Build and execute query
        query = get_wishlist_query(current_user_id, filters)
        query = apply_sorting(query, sort_by, sort_order)
        
        total_count = query.count()
        logger.info(f"[WISHLIST GET] Total items found: {total_count}")
        
        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Serialize items
        items = [serialize_wishlist_item(item) for item in pagination.items]
        
        logger.info(f"[WISHLIST GET] Returning {len(items)} items on page {page}")
        
        result = {
            'success': True,
            'wishlist': items,  # Changed from 'items' to 'wishlist'
            'item_count': len(items),
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev,
                'next_page': pagination.next_num if pagination.has_next else None,
                'prev_page': pagination.prev_num if pagination.has_prev else None
            },
            'filters_applied': filters,
            'sort': {
                'sort_by': sort_by if sort_by in VALID_SORT_FIELDS else 'created_at',
                'sort_order': sort_order if sort_order in VALID_SORT_ORDERS else 'desc'
            }
        }
        
        # Cache result
        cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error retrieving wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve wishlist'}), 500

@user_wishlist_routes.route('/', methods=['POST'])
@user_wishlist_routes.route('', methods=['POST'])
@cross_origin()
@jwt_required()
@limiter.limit("60 per minute")
def add_to_wishlist():
    """
    Add item to user's wishlist.
    
    Request Body:
        {
            "product_id": int
        }
    """
    try:
        current_user_id = get_jwt_identity()
        
        logger.info(f"[WISHLIST POST] User {current_user_id} attempting to add product to wishlist")
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Get request data
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({'error': 'No data provided'}), 400

        product_id = data.get('product_id') if data else None
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        logger.info(f"[WISHLIST POST] Product ID: {product_id}")
        
        # Validate product ID
        try:
            product_id = int(product_id)
            if product_id <= 0:
                raise ValueError("Invalid product ID")
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid product ID format'}), 400
        
        # Validate product
        product, error = validate_product(product_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'PRODUCT_NOT_FOUND' else 400
        
        # Check if item already exists
        existing_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()
        
        if existing_item:
            logger.info(f"[WISHLIST POST] Item already exists: wishlist_item_id={existing_item.id}")
        else:
            logger.info(f"[WISHLIST POST] Item does not exist, creating new entry")
        
        if existing_item:
            return jsonify({
                'message': 'Item already in wishlist',
                'already_exists': True,
                'item': serialize_wishlist_item(existing_item)
            }), 200
        
        # Check wishlist limit
        current_count = WishlistItem.query.filter_by(user_id=current_user_id).count()
        if current_count >= MAX_WISHLIST_ITEMS:
            return jsonify({
                'error': f'Wishlist limit reached. Maximum {MAX_WISHLIST_ITEMS} items allowed.'
            }), 400
        
        # Create new wishlist item
        wishlist_item = WishlistItem(
            user_id=current_user_id,
            product_id=product_id,
            created_at=datetime.now(timezone.utc)
        )
        
        db.session.add(wishlist_item)
        db.session.commit()
        
        logger.info(f"[WISHLIST POST] Successfully added item: wishlist_item_id={wishlist_item.id}")
        
        # Clear cache
        clear_user_cache(current_user_id)
        
        return jsonify({
            'message': 'Item added to wishlist',
            'already_exists': False,
            'item': serialize_wishlist_item(wishlist_item)
        }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding item to wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to add item to wishlist'}), 500

@user_wishlist_routes.route('/bulk/add', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("10 per minute")
def bulk_add_to_wishlist():
    """
    Bulk add items to user's wishlist.
    
    Request Body:
        {
            "product_ids": [int, int, ...]
        }
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Get request data
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({'error': 'No data provided'}), 400

        product_ids = data.get('product_ids') if data else None
        if not isinstance(product_ids, list):
            return jsonify({'error': 'Product IDs array is required'}), 400
        
        if len(product_ids) == 0:
            return jsonify({'error': 'At least one product ID is required'}), 400
        
        if len(product_ids) > MAX_BULK_ADD_ITEMS:
            return jsonify({
                'error': f'Maximum {MAX_BULK_ADD_ITEMS} products can be added at once'
            }), 400
        
        # Check current wishlist count
        current_count = WishlistItem.query.filter_by(user_id=current_user_id).count()
        if current_count + len(product_ids) > MAX_WISHLIST_ITEMS:
            return jsonify({
                'error': f'Adding these items would exceed the wishlist limit of {MAX_WISHLIST_ITEMS} items'
            }), 400
        
        # Get existing wishlist items
        existing_items = set(
            item.product_id for item in 
            WishlistItem.query.filter_by(user_id=current_user_id).all()
        )
        
        # Process each product ID
        added_items = []
        skipped_items = []
        invalid_products = []
        
        for product_id in product_ids:
            try:
                # Validate product ID format
                product_id = int(product_id)
                if product_id <= 0:
                    raise ValueError("Invalid product ID")
                
                # Skip if already in wishlist
                if product_id in existing_items:
                    skipped_items.append(product_id)
                    continue
                
                # Validate product
                product, error = validate_product(product_id)
                if error:
                    invalid_products.append({
                        'product_id': product_id,
                        'error': error['error']
                    })
                    continue
                
                # Create wishlist item
                wishlist_item = WishlistItem(
                    user_id=current_user_id,
                    product_id=product_id,
                    created_at=datetime.now(timezone.utc)
                )
                
                db.session.add(wishlist_item)
                added_items.append(product_id)
                existing_items.add(product_id)  # Update local set
                
            except (ValueError, TypeError):
                invalid_products.append({
                    'product_id': product_id,
                    'error': 'Invalid product ID format'
                })
        
        # Commit changes
        db.session.commit()
        
        # Clear cache
        clear_user_cache(current_user_id)
        
        return jsonify({
            'message': f'Bulk add completed',
            'added_count': len(added_items),
            'skipped_count': len(skipped_items),
            'invalid_count': len(invalid_products),
            'details': {
                'added_items': added_items,
                'skipped_items': skipped_items,
                'invalid_products': invalid_products
            }
        }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error bulk adding items to wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to bulk add items to wishlist'}), 500

@user_wishlist_routes.route('/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@user_wishlist_routes.route('/<int:item_id>/', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("100 per minute")
def remove_from_wishlist(item_id):
    """
    Remove item from user's wishlist.
    
    Args:
        item_id: Wishlist item ID to remove
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        logger.info(f"[WISHLIST DELETE] User {current_user_id} attempting to remove item {item_id}")
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Validate item ID
        if item_id <= 0:
            return jsonify({'error': 'Invalid item ID'}), 400
        
        # Find wishlist item
        wishlist_item = WishlistItem.query.filter_by(
            id=item_id,
            user_id=current_user_id
        ).first()
        
        if not wishlist_item:
            logger.warning(f"[WISHLIST DELETE] Item {item_id} not found for user {current_user_id}")
            return jsonify({'error': 'Wishlist item not found'}), 404
        
        logger.info(f"[WISHLIST DELETE] Found item {item_id}, deleting...")
        
        # Remove item
        db.session.delete(wishlist_item)
        db.session.commit()
        
        # Clear cache
        clear_user_cache(current_user_id)
        
        logger.info(f"[WISHLIST DELETE] Successfully removed item {item_id}")
        
        return jsonify({'message': 'Item removed from wishlist'}), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing item {item_id} from wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to remove item from wishlist'}), 500

@user_wishlist_routes.route('/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("10 per minute")
def clear_wishlist():
    """Clear all items from user's wishlist."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Count current items
        items_count = WishlistItem.query.filter_by(user_id=current_user_id).count()
        
        if items_count == 0:
            return jsonify({
                'message': 'Wishlist is already empty',
                'items_removed': 0
            }), 200
        
        # Remove all items
        WishlistItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        
        # Clear cache
        clear_user_cache(current_user_id)
        
        return jsonify({
            'message': 'Wishlist cleared successfully',
            'items_removed': items_count
        }), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to clear wishlist'}), 500

@user_wishlist_routes.route('/check/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("200 per minute")
def check_wishlist_item(product_id):
    """
    Check if a product is in user's wishlist.
    
    Args:
        product_id: Product ID to check
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Validate product ID
        if product_id <= 0:
            return jsonify({'error': 'Invalid product ID'}), 400
        
        # Validate product exists
        product, error = validate_product(product_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'PRODUCT_NOT_FOUND' else 400
        
        # Check cache first
        cache_key = f"wishlist_check_{current_user_id}_{product_id}"
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return jsonify(cached_result), 200
        
        # Check if item exists in wishlist
        wishlist_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()
        
        result = {
            'in_wishlist': wishlist_item is not None,
            'wishlist_item_id': wishlist_item.id if wishlist_item else None,
            'added_at': wishlist_item.created_at.isoformat() if wishlist_item else None
        }
        
        # Cache result
        cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error checking wishlist item {product_id} for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to check wishlist item'}), 500

@user_wishlist_routes.route('/toggle/<product_id>', methods=['POST', 'OPTIONS'])
@user_wishlist_routes.route('/toggle/<product_id>/', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("60 per minute")
def toggle_wishlist_item(product_id):
    """
    Toggle product in user's wishlist (add if not present, remove if present).
    
    Args:
        product_id: Product ID to toggle
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Validate product ID
        try:
            product_id = int(product_id)
            if product_id <= 0:
                raise ValueError("Invalid product ID")
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid product ID format'}), 400
        
        # Validate product
        product, error = validate_product(product_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'PRODUCT_NOT_FOUND' else 400
        
        # Check if item exists
        wishlist_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()
        
        if wishlist_item:
            # Remove from wishlist
            db.session.delete(wishlist_item)
            db.session.commit()
            
            # Clear cache
            clear_user_cache(current_user_id)
            
            return jsonify({
                'message': 'Item removed from wishlist',
                'in_wishlist': False,
                'action': 'removed'
            }), 200
        else:
            # Add to wishlist
            # Check wishlist limit
            current_count = WishlistItem.query.filter_by(user_id=current_user_id).count()
            if current_count >= MAX_WISHLIST_ITEMS:
                return jsonify({
                    'error': f'Wishlist limit reached. Maximum {MAX_WISHLIST_ITEMS} items allowed.'
                }), 400
            
            # Create new wishlist item
            new_item = WishlistItem(
                user_id=current_user_id,
                product_id=product_id,
                created_at=datetime.now(timezone.utc)
            )
            
            db.session.add(new_item)
            db.session.commit()
            
            # Clear cache
            clear_user_cache(current_user_id)
            
            return jsonify({
                'message': 'Item added to wishlist',
                'in_wishlist': True,
                'action': 'added',
                'item': serialize_wishlist_item(new_item)
            }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling wishlist item {product_id} for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to toggle wishlist item'}), 500

@user_wishlist_routes.route('/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("30 per minute")
def get_wishlist_stats():
    """
    Get comprehensive wishlist statistics for the user.
    
    Returns detailed analytics about the user's wishlist including:
    - Total items and value
    - Category and brand distribution
    - Price ranges
    - Stock status
    - Sale items count
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Check cache first
        cache_key = f"wishlist_stats_{current_user_id}"
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return jsonify(cached_stats), 200
        
        wishlist_items = db.session.query(WishlistItem).join(Product).outerjoin(Category).outerjoin(Brand).filter(
            WishlistItem.user_id == current_user_id,
            Product.is_active == True
        ).all()
        
        if not wishlist_items:
            empty_stats = {
                'total_items': 0,
                'active_items': 0,
                'total_value': 0,
                'average_item_value': 0,
                'sale_items_count': 0,
                'featured_items_count': 0,
                'out_of_stock_count': 0,
                'in_stock_count': 0,
                'unique_categories': 0,
                'unique_brands': 0,
                'categories': [],
                'brands': [],
                'price_ranges': {
                    'under_10': 0,
                    '10_to_50': 0,
                    '50_to_100': 0,
                    '100_to_500': 0,
                    'over_500': 0
                },
                'latest_addition': None,
                'oldest_item': None,
                'wishlist_health': 'empty',
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Cache empty stats for shorter time
            cache.set(cache_key, empty_stats, timeout=60)
            return jsonify(empty_stats), 200
        
        # Calculate statistics
        total_items = len(wishlist_items)
        active_items = sum(1 for item in wishlist_items if item.product.is_active)
        
        # Calculate total value
        total_value = 0
        sale_items_count = 0
        featured_items_count = 0
        out_of_stock_count = 0
        in_stock_count = 0
        
        categories = {}
        brands = {}
        price_ranges = {
            'under_10': 0,
            '10_to_50': 0,
            '50_to_100': 0,
            '100_to_500': 0,
            'over_500': 0
        }
        
        for item in wishlist_items:
            product = item.product
            
            # Calculate value (use sale price if available, otherwise regular price)
            price = float(product.sale_price) if product.sale_price else float(product.price)
            total_value += price
            
            # Count special items
            if product.is_sale:
                sale_items_count += 1
            if product.is_featured:
                featured_items_count += 1
            
            # Stock status
            if product.stock <= 0:
                out_of_stock_count += 1
            else:
                in_stock_count += 1
            
            # Category distribution
            if product.category:
                cat_name = product.category.name
                if cat_name not in categories:
                    categories[cat_name] = {
                        'id': product.category.id,
                        'name': cat_name,
                        'count': 0,
                        'total_value': 0
                    }
                categories[cat_name]['count'] += 1
                categories[cat_name]['total_value'] += price
            
            # Brand distribution
            if product.brand:
                brand_name = product.brand.name
                if brand_name not in brands:
                    brands[brand_name] = {
                        'id': product.brand.id,
                        'name': brand_name,
                        'count': 0,
                        'total_value': 0
                    }
                brands[brand_name]['count'] += 1
                brands[brand_name]['total_value'] += price
            
            # Price ranges
            if price < 10:
                price_ranges['under_10'] += 1
            elif price < 50:
                price_ranges['10_to_50'] += 1
            elif price < 100:
                price_ranges['50_to_100'] += 1
            elif price < 500:
                price_ranges['100_to_500'] += 1
            else:
                price_ranges['over_500'] += 1
        
        # Calculate average
        average_item_value = total_value / total_items if total_items > 0 else 0
        
        # Find latest and oldest items
        latest_item = max(wishlist_items, key=lambda x: x.created_at)
        oldest_item = min(wishlist_items, key=lambda x: x.created_at)
        
        # Determine wishlist health
        health_score = 0
        if in_stock_count / total_items > 0.8:
            health_score += 1
        if sale_items_count / total_items > 0.3:
            health_score += 1
        if total_items >= 5:
            health_score += 1
        
        if health_score >= 2:
            wishlist_health = 'excellent'
        elif health_score == 1:
            wishlist_health = 'good'
        else:
            wishlist_health = 'needs_attention'
        
        # Prepare response
        stats = {
            'total_items': total_items,
            'active_items': active_items,
            'total_value': round(total_value, 2),
            'average_item_value': round(average_item_value, 2),
            'sale_items_count': sale_items_count,
            'featured_items_count': featured_items_count,
            'out_of_stock_count': out_of_stock_count,
            'in_stock_count': in_stock_count,
            'unique_categories': len(categories),
            'unique_brands': len(brands),
            'categories': sorted(categories.values(), key=lambda x: x['count'], reverse=True),
            'brands': sorted(brands.values(), key=lambda x: x['count'], reverse=True),
            'price_ranges': price_ranges,
            'latest_addition': {
                'item_id': latest_item.id,
                'product_name': latest_item.product.name,
                'added_at': latest_item.created_at.isoformat()
            },
            'oldest_item': {
                'item_id': oldest_item.id,
                'product_name': oldest_item.product.name,
                'added_at': oldest_item.created_at.isoformat()
            },
            'wishlist_health': wishlist_health,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Cache stats
        cache.set(cache_key, stats, timeout=CACHE_TIMEOUT)
        
        return jsonify(stats), 200
    
    except Exception as e:
        logger.error(f"Error getting wishlist stats for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to get wishlist statistics'}), 500

@user_wishlist_routes.route('/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@limiter.limit("5 per minute")
def export_wishlist():
    """
    Export user's wishlist data in various formats.
    
    Query Parameters:
        - format: Export format (json, csv) - default: json
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        current_user_id = get_jwt_identity()
        
        # Validate user
        user, error = validate_user(current_user_id)
        if error:
            return jsonify(error), 404 if error['code'] == 'USER_NOT_FOUND' else 403
        
        # Get export format
        export_format = request.args.get('format', 'json').lower()
        if export_format not in ['json', 'csv']:
            return jsonify({'error': 'Invalid export format. Supported formats: json, csv'}), 400
        
        wishlist_items = db.session.query(WishlistItem).join(Product).outerjoin(Category).outerjoin(Brand).filter(
            WishlistItem.user_id == current_user_id,
            Product.is_active == True
        ).order_by(WishlistItem.created_at.desc()).all()
        
        # Prepare export data
        export_data = []
        for item in wishlist_items:
            product = item.product
            price = float(product.sale_price) if product.sale_price else float(product.price)
            
            export_item = {
                'wishlist_item_id': item.id,
                'added_date': item.created_at.isoformat(),
                'product_id': product.id,
                'product_name': product.name,
                'product_slug': product.slug,
                'description': item.product.short_description or item.product.description,
                'price': price,
                'original_price': float(product.price),
                'sale_price': float(product.sale_price) if product.sale_price else None,
                'is_on_sale': product.is_sale,
                'stock': product.stock,
                'sku': product.sku,
                'category': product.category.name if product.category else None,
                'brand': product.brand.name if product.brand else None,
                'is_featured': product.is_featured,
                'is_new': product.is_new,
                'thumbnail_url': product.thumbnail_url,
                'availability_status': product.availability_status
            }
            export_data.append(export_item)
        
        if export_format == 'json':
            return jsonify({
                'export_format': 'json',
                'total_items': len(export_data),
                'user_id': current_user_id,
                'exported_at': datetime.now(timezone.utc).isoformat(),
                'data': export_data
            }), 200
        
        elif export_format == 'csv':
            # Create CSV data
            output = io.StringIO()
            if export_data:
                # Define proper CSV headers
                fieldnames = [
                    'Wishlist Item ID', 'Added Date', 'Product ID', 'Product Name', 
                    'Product Slug', 'Description', 'Price', 'Original Price', 
                    'Sale Price', 'Is On Sale', 'Stock', 'SKU', 'Category', 
                    'Brand', 'Is Featured', 'Is New', 'Thumbnail URL', 'Availability Status'
                ]
                
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                # Map the data to match headers
                for item in export_data:
                    csv_row = {
                        'Wishlist Item ID': item['wishlist_item_id'],
                        'Added Date': item['added_date'],
                        'Product ID': item['product_id'],
                        'Product Name': item['product_name'],
                        'Product Slug': item['product_slug'],
                        'Description': item['description'],
                        'Price': item['price'],
                        'Original Price': item['original_price'],
                        'Sale Price': item['sale_price'],
                        'Is On Sale': item['is_on_sale'],
                        'Stock': item['stock'],
                        'SKU': item['sku'],
                        'Category': item['category'],
                        'Brand': item['brand'],
                        'Is Featured': item['is_featured'],
                        'Is New': item['is_new'],
                        'Thumbnail URL': item['thumbnail_url'],
                        'Availability Status': item['availability_status']
                    }
                    writer.writerow(csv_row)
            
            csv_data = output.getvalue()
            output.close()
            
            return jsonify({
                'export_format': 'csv',
                'total_items': len(export_data),
                'user_id': current_user_id,
                'exported_at': datetime.now(timezone.utc).isoformat(),
                'csv_data': csv_data
            }), 200
    
    except Exception as e:
        logger.error(f"Error exporting wishlist for user {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to export wishlist'}), 500

# Error handlers
@user_wishlist_routes.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded errors."""
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please try again later.',
        'retry_after': getattr(e, 'retry_after', None)
    }), 429

@user_wishlist_routes.errorhandler(400)
def bad_request_handler(e):
    """Handle bad request errors."""
    return jsonify({
        'error': 'Bad request',
        'message': str(e.description) if hasattr(e, 'description') else 'Invalid request data'
    }), 400

@user_wishlist_routes.errorhandler(401)
def unauthorized_handler(e):
    """Handle unauthorized errors."""
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401

@user_wishlist_routes.errorhandler(403)
def forbidden_handler(e):
    """Handle forbidden errors."""
    return jsonify({
        'error': 'Forbidden',
        'message': 'Access denied'
    }), 403

@user_wishlist_routes.errorhandler(404)
def not_found_handler(e):
    """Handle not found errors."""
    return jsonify({
        'error': 'Not found',
        'message': 'Resource not found'
    }), 404

@user_wishlist_routes.errorhandler(500)
def internal_error_handler(e):
    """Handle internal server errors."""
    db.session.rollback()
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500
