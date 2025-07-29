"""
Admin Wishlist routes for Mizizzi E-commerce platform.
Handles admin wishlist management functionality with comprehensive analytics and management tools.
Production-ready implementation with enhanced security and monitoring features.
"""

# Standard Libraries
import logging
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

# Database & ORM
from sqlalchemy import func, and_, or_, desc, asc, text
from sqlalchemy.orm import joinedload

# Extensions
from ...configuration.extensions import db, cache, limiter

# Models
from ...models.models import WishlistItem, Product, User, Category, Brand

# Schemas
from ...schemas.schemas import wishlist_item_schema, wishlist_items_schema

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_wishlist_routes = Blueprint('admin_wishlist_routes', __name__)

# Configuration
ADMIN_CACHE_TIMEOUT = 600  # 10 minutes
BULK_DELETE_LIMIT = 1000

# Helper Functions
def admin_required(f):
    """Decorator to ensure user has admin privileges."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user:
                return jsonify({"error": "User not found"}), 404

            if not user.is_admin:
                return jsonify({"error": "Admin access required"}), 403

            if not user.is_active:
                return jsonify({"error": "Account is inactive"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401

    return decorated_function

def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ADMIN_ITEMS_PER_PAGE', 50), type=int)
    # Limit per_page to prevent abuse
    per_page = min(per_page, 500)
    return page, per_page

def enhance_admin_wishlist_item_data(item, product, user, category=None, brand=None):
    """Enhance wishlist item with comprehensive admin data."""
    # Convert numeric values to float for JSON serialization
    price = float(product.price) if product.price is not None else None
    sale_price = float(product.sale_price) if product.sale_price is not None else None

    # Handle image_urls properly
    image_urls = []
    if product.image_urls:
        if isinstance(product.image_urls, str):
            if ',' in product.image_urls:
                image_urls = [url.strip() for url in product.image_urls.split(',')]
            else:
                image_urls = [product.image_urls]
        elif isinstance(product.image_urls, list):
            image_urls = product.image_urls

    return {
        "id": item.id,
        "product_id": item.product_id,
        "user_id": item.user_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "product": {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "price": price,
            "sale_price": sale_price,
            "stock": product.stock,
            "thumbnail_url": product.thumbnail_url,
            "image_urls": image_urls,
            "is_active": product.is_active,
            "is_featured": product.is_featured,
            "is_sale": product.is_sale,
            "category_id": product.category_id,
            "brand_id": product.brand_id,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "category": {
                "id": category.id,
                "name": category.name,
                "slug": category.slug
            } if category else None,
            "brand": {
                "id": brand.id,
                "name": brand.name,
                "slug": brand.slug
            } if brand else None
        }
    }

# Rate limiting decorator for admin operations
def admin_rate_limit(limit="500 per hour"):
    """Rate limiting decorator for admin wishlist operations."""
    def decorator(f):
        @wraps(f)
        @limiter.limit(limit)
        def decorated_function(*args, **kwargs):
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Health check endpoint
@admin_wishlist_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def admin_wishlist_health():
    """Health check endpoint for admin wishlist system."""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({
            "status": "ok",
            "service": "admin_wishlist_routes",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "cache": "enabled" if cache else "disabled",
            "rate_limiting": "enabled",
            "endpoints": [
                "/",
                "/analytics",
                "/users/<int:user_id>",
                "/users/<int:user_id>/clear",
                "/bulk/delete",
                "/export",
                "/products/<int:product_id>/users",
                "/items/<int:item_id>",
                "/stats/summary"
            ]
        }), 200
    except Exception as e:
        logger.error(f"Admin wishlist health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "admin_wishlist_routes",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# ----------------------
# Admin Wishlist Routes
# ----------------------

@admin_wishlist_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("200 per hour")
def get_all_wishlist_items():
    """Get all wishlist items with advanced filtering and analytics."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Get filter parameters
        user_id = request.args.get('user_id', type=int)
        product_id = request.args.get('product_id', type=int)
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('search', '').strip()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        active_users_only = request.args.get('active_users_only', 'false').lower() == 'true'
        active_products_only = request.args.get('active_products_only', 'true').lower() == 'true'

        # Get sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Validate sort parameters
        valid_sort_fields = ['created_at', 'user_email', 'product_name', 'product_price', 'user_id', 'product_id']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'

        # Build query with comprehensive joins
        query = db.session.query(WishlistItem, Product, User, Category, Brand).join(
            Product, WishlistItem.product_id == Product.id
        ).join(
            User, WishlistItem.user_id == User.id
        ).outerjoin(
            Category, Product.category_id == Category.id
        ).outerjoin(
            Brand, Product.brand_id == Brand.id
        )

        # Apply filters
        if user_id:
            query = query.filter(WishlistItem.user_id == user_id)

        if product_id:
            query = query.filter(WishlistItem.product_id == product_id)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if brand_id:
            query = query.filter(Product.brand_id == brand_id)

        if min_price is not None:
            query = query.filter(
                or_(
                    and_(Product.sale_price.isnot(None), Product.sale_price >= min_price),
                    and_(Product.sale_price.is_(None), Product.price >= min_price)
                )
            )

        if max_price is not None:
            query = query.filter(
                or_(
                    and_(Product.sale_price.isnot(None), Product.sale_price <= max_price),
                    and_(Product.sale_price.is_(None), Product.price <= max_price)
                )
            )

        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern)
                )
            )

        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at >= date_from_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_from format. Use ISO format."}), 400

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at <= date_to_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_to format. Use ISO format."}), 400

        if active_users_only:
            query = query.filter(User.is_active == True)

        if active_products_only:
            query = query.filter(Product.is_active == True)

        # Apply sorting
        if sort_by == 'created_at':
            if sort_order == 'asc':
                query = query.order_by(WishlistItem.created_at.asc())
            else:
                query = query.order_by(WishlistItem.created_at.desc())
        elif sort_by == 'user_email':
            if sort_order == 'asc':
                query = query.order_by(User.email.asc())
            else:
                query = query.order_by(User.email.desc())
        elif sort_by == 'product_name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        elif sort_by == 'product_price':
            price_field = func.coalesce(Product.sale_price, Product.price)
            if sort_order == 'asc':
                query = query.order_by(price_field.asc())
            else:
                query = query.order_by(price_field.desc())
        elif sort_by == 'user_id':
            if sort_order == 'asc':
                query = query.order_by(WishlistItem.user_id.asc())
            else:
                query = query.order_by(WishlistItem.user_id.desc())
        elif sort_by == 'product_id':
            if sort_order == 'asc':
                query = query.order_by(WishlistItem.product_id.asc())
            else:
                query = query.order_by(WishlistItem.product_id.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        wishlist_items = paginated.items

        # Enhance wishlist items with comprehensive admin data
        wishlist_data = []
        for item, product, user, category, brand in wishlist_items:
            enhanced_item = enhance_admin_wishlist_item_data(item, product, user, category, brand)
            wishlist_data.append(enhanced_item)

        return jsonify({
            "items": wishlist_data,
            "item_count": len(wishlist_data),
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev
            },
            "filters_applied": {
                "user_id": user_id,
                "product_id": product_id,
                "category_id": category_id,
                "brand_id": brand_id,
                "min_price": min_price,
                "max_price": max_price,
                "search_query": search_query,
                "date_from": date_from,
                "date_to": date_to,
                "active_users_only": active_users_only,
                "active_products_only": active_products_only
            },
            "sort": {
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching admin wishlist items: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve wishlist items", "details": str(e)}), 500

@admin_wishlist_routes.route('/analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("50 per hour")
def get_wishlist_analytics():
    """Get comprehensive wishlist analytics for admin dashboard."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check cache first
        cache_key = "admin_wishlist_analytics"
        cached_result = cache.get(cache_key) if cache else None
        if cached_result:
            return jsonify(cached_result), 200

        # Get date range for analytics
        days_back = request.args.get('days_back', 30, type=int)
        date_from = datetime.now() - timedelta(days=days_back)

        # Basic statistics
        total_wishlist_items = WishlistItem.query.count()
        total_users_with_wishlists = db.session.query(WishlistItem.user_id).distinct().count()
        total_products_in_wishlists = db.session.query(WishlistItem.product_id).distinct().count()

        # Recent activity
        recent_additions = WishlistItem.query.filter(
            WishlistItem.created_at >= date_from
        ).count()

        # Top products in wishlists
        top_products = db.session.query(
            Product.id,
            Product.name,
            func.count(WishlistItem.id).label('wishlist_count')
        ).join(
            WishlistItem, Product.id == WishlistItem.product_id
        ).group_by(
            Product.id, Product.name
        ).order_by(
            desc('wishlist_count')
        ).limit(10).all()

        # Top categories in wishlists
        top_categories = db.session.query(
            Category.id,
            Category.name,
            func.count(WishlistItem.id).label('wishlist_count')
        ).join(
            Product, Category.id == Product.category_id
        ).join(
            WishlistItem, Product.id == WishlistItem.product_id
        ).group_by(
            Category.id, Category.name
        ).order_by(
            desc('wishlist_count')
        ).limit(10).all()

        # Top brands in wishlists
        top_brands = db.session.query(
            Brand.id,
            Brand.name,
            func.count(WishlistItem.id).label('wishlist_count')
        ).join(
            Product, Brand.id == Product.brand_id
        ).join(
            WishlistItem, Product.id == WishlistItem.product_id
        ).group_by(
            Brand.id, Brand.name
        ).order_by(
            desc('wishlist_count')
        ).limit(10).all()

        # Users with most wishlist items
        top_users = db.session.query(
            User.id,
            User.email,
            User.first_name,
            User.last_name,
            func.count(WishlistItem.id).label('wishlist_count')
        ).join(
            WishlistItem, User.id == WishlistItem.user_id
        ).group_by(
            User.id, User.email, User.first_name, User.last_name
        ).order_by(
            desc('wishlist_count')
        ).limit(10).all()

        # Wishlist activity over time (last 30 days)
        daily_activity = db.session.query(
            func.date(WishlistItem.created_at).label('date'),
            func.count(WishlistItem.id).label('count')
        ).filter(
            WishlistItem.created_at >= date_from
        ).group_by(
            func.date(WishlistItem.created_at)
        ).order_by(
            'date'
        ).all()

        # Price analysis of wishlisted products
        price_stats = db.session.query(
            func.avg(func.coalesce(Product.sale_price, Product.price)).label('avg_price'),
            func.min(func.coalesce(Product.sale_price, Product.price)).label('min_price'),
            func.max(func.coalesce(Product.sale_price, Product.price)).label('max_price'),
            func.sum(func.coalesce(Product.sale_price, Product.price)).label('total_value')
        ).join(
            WishlistItem, Product.id == WishlistItem.product_id
        ).first()

        # Stock analysis
        stock_analysis = db.session.query(
            func.sum(func.case([(Product.stock > 0, 1)], else_=0)).label('in_stock'),
            func.sum(func.case([(Product.stock == 0, 1)], else_=0)).label('out_of_stock'),
            func.avg(Product.stock).label('avg_stock')
        ).join(
            WishlistItem, Product.id == WishlistItem.product_id
        ).first()

        # Conversion potential (products on sale in wishlists)
        sale_products = db.session.query(
            func.count(WishlistItem.id).label('sale_items_count'),
            func.sum(Product.price - Product.sale_price).label('potential_savings')
        ).join(
            Product, WishlistItem.product_id == Product.id
        ).filter(
            Product.is_sale == True,
            Product.sale_price.isnot(None)
        ).first()

        result = {
            "overview": {
                "total_wishlist_items": total_wishlist_items,
                "total_users_with_wishlists": total_users_with_wishlists,
                "total_products_in_wishlists": total_products_in_wishlists,
                "recent_additions": recent_additions,
                "analysis_period_days": days_back
            },
            "top_products": [
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "wishlist_count": product.wishlist_count
                } for product in top_products
            ],
            "top_categories": [
                {
                    "category_id": category.id,
                    "category_name": category.name,
                    "wishlist_count": category.wishlist_count
                } for category in top_categories
            ],
            "top_brands": [
                {
                    "brand_id": brand.id,
                    "brand_name": brand.name,
                    "wishlist_count": brand.wishlist_count
                } for brand in top_brands
            ],
            "top_users": [
                {
                    "user_id": user.id,
                    "user_email": user.email,
                    "user_name": f"{user.first_name} {user.last_name}".strip(),
                    "wishlist_count": user.wishlist_count
                } for user in top_users
            ],
            "daily_activity": [
                {
                    "date": activity.date.isoformat(),
                    "count": activity.count
                } for activity in daily_activity
            ],
            "price_analysis": {
                "average_price": float(price_stats.avg_price) if price_stats.avg_price else 0,
                "minimum_price": float(price_stats.min_price) if price_stats.min_price else 0,
                "maximum_price": float(price_stats.max_price) if price_stats.max_price else 0,
                "total_value": float(price_stats.total_value) if price_stats.total_value else 0
            },
            "stock_analysis": {
                "in_stock_items": int(stock_analysis.in_stock) if stock_analysis.in_stock else 0,
                "out_of_stock_items": int(stock_analysis.out_of_stock) if stock_analysis.out_of_stock else 0,
                "average_stock": float(stock_analysis.avg_stock) if stock_analysis.avg_stock else 0
            },
            "conversion_potential": {
                "sale_items_count": int(sale_products.sale_items_count) if sale_products.sale_items_count else 0,
                "potential_savings": float(sale_products.potential_savings) if sale_products.potential_savings else 0
            },
            "generated_at": datetime.now().isoformat()
        }

        # Cache the result
        if cache:
            cache.set(cache_key, result, timeout=ADMIN_CACHE_TIMEOUT)

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting wishlist analytics: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get wishlist analytics", "details": str(e)}), 500

@admin_wishlist_routes.route('/users/<int:user_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("100 per hour")
def get_user_wishlist(user_id):
    """Get specific user's wishlist with detailed information."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Get user's wishlist items with product details
        query = db.session.query(WishlistItem, Product, Category, Brand).join(
            Product, WishlistItem.product_id == Product.id
        ).outerjoin(
            Category, Product.category_id == Category.id
        ).outerjoin(
            Brand, Product.brand_id == Brand.id
        ).filter(
            WishlistItem.user_id == user_id
        ).order_by(WishlistItem.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        wishlist_items = paginated.items

        # Enhance wishlist items
        wishlist_data = []
        total_value = 0

        for item, product, category, brand in wishlist_items:
            enhanced_item = enhance_admin_wishlist_item_data(item, product, user, category, brand)
            wishlist_data.append(enhanced_item)

            # Calculate total value
            price = float(product.sale_price) if product.sale_price else float(product.price)
            total_value += price

        # Get user statistics
        total_items = WishlistItem.query.filter_by(user_id=user_id).count()
        first_item = WishlistItem.query.filter_by(user_id=user_id).order_by(WishlistItem.created_at.asc()).first()
        latest_item = WishlistItem.query.filter_by(user_id=user_id).order_by(WishlistItem.created_at.desc()).first()

        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None
            },
            "wishlist": {
                "items": wishlist_data,
                "item_count": len(wishlist_data),
                "total_items": total_items,
                "total_value": round(total_value, 2),
                "first_item_date": first_item.created_at.isoformat() if first_item and first_item.created_at else None,
                "latest_item_date": latest_item.created_at.isoformat() if latest_item and latest_item.created_at else None
            },
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching user {user_id} wishlist: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve user wishlist", "details": str(e)}), 500

@admin_wishlist_routes.route('/users/<int:user_id>/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("20 per hour")
def clear_user_wishlist(user_id):
    """Clear specific user's entire wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_admin_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Count items before deletion
        count = WishlistItem.query.filter_by(user_id=user_id).count()

        if count == 0:
            return jsonify({
                "message": f"User {user.email}'s wishlist is already empty",
                "items_removed": 0
            }), 200

        # Delete all wishlist items for this user
        WishlistItem.query.filter_by(user_id=user_id).delete()
        db.session.commit()

        # Clear cache
        if cache:
            cache.delete_memoized(f"user_wishlist_{user_id}_*")
            cache.delete("admin_wishlist_analytics")

        logger.info(f"Admin {current_admin_id} cleared wishlist for user {user_id}: {count} items removed")

        return jsonify({
            "message": f"Wishlist cleared for user {user.email}",
            "items_removed": count,
            "user_id": user_id,
            "cleared_by_admin": current_admin_id
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing wishlist for user {user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to clear user wishlist", "details": str(e)}), 500

@admin_wishlist_routes.route('/bulk/delete', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("10 per hour")
def bulk_delete_wishlist_items():
    """Bulk delete wishlist items based on various criteria."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_admin_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Get deletion criteria
        item_ids = data.get('item_ids', [])
        user_ids = data.get('user_ids', [])
        product_ids = data.get('product_ids', [])
        category_ids = data.get('category_ids', [])
        brand_ids = data.get('brand_ids', [])
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        inactive_products_only = data.get('inactive_products_only', False)
        inactive_users_only = data.get('inactive_users_only', False)

        # Build deletion query
        query = WishlistItem.query

        # Apply filters
        if item_ids:
            if len(item_ids) > BULK_DELETE_LIMIT:
                return jsonify({"error": f"Maximum {BULK_DELETE_LIMIT} items can be deleted at once"}), 400
            query = query.filter(WishlistItem.id.in_(item_ids))

        if user_ids:
            query = query.filter(WishlistItem.user_id.in_(user_ids))

        if product_ids:
            query = query.filter(WishlistItem.product_id.in_(product_ids))

        if category_ids or brand_ids or inactive_products_only:
            query = query.join(Product, WishlistItem.product_id == Product.id)

            if category_ids:
                query = query.filter(Product.category_id.in_(category_ids))

            if brand_ids:
                query = query.filter(Product.brand_id.in_(brand_ids))

            if inactive_products_only:
                query = query.filter(Product.is_active == False)

        if inactive_users_only:
            query = query.join(User, WishlistItem.user_id == User.id).filter(User.is_active == False)

        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at >= date_from_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_from format. Use ISO format."}), 400

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at <= date_to_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_to format. Use ISO format."}), 400

        # Count items to be deleted
        count = query.count()

        if count == 0:
            return jsonify({
                "message": "No items match the deletion criteria",
                "items_deleted": 0
            }), 200

        if count > BULK_DELETE_LIMIT:
            return jsonify({
                "error": f"Too many items to delete ({count}). Maximum {BULK_DELETE_LIMIT} allowed.",
                "matching_items": count
            }), 400

        # Perform deletion
        deleted_count = query.delete(synchronize_session=False)
        db.session.commit()

        # Clear cache
        if cache:
            cache.delete("admin_wishlist_analytics")

        logger.info(f"Admin {current_admin_id} performed bulk delete: {deleted_count} wishlist items removed")

        return jsonify({
            "message": f"Bulk deletion completed",
            "items_deleted": deleted_count,
            "deleted_by_admin": current_admin_id,
            "criteria_applied": {
                "item_ids": len(item_ids) if item_ids else 0,
                "user_ids": len(user_ids) if user_ids else 0,
                "product_ids": len(product_ids) if product_ids else 0,
                "category_ids": len(category_ids) if category_ids else 0,
                "brand_ids": len(brand_ids) if brand_ids else 0,
                "date_from": date_from,
                "date_to": date_to,
                "inactive_products_only": inactive_products_only,
                "inactive_users_only": inactive_users_only
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in bulk delete wishlist items: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to bulk delete wishlist items", "details": str(e)}), 500

@admin_wishlist_routes.route('/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("5 per hour")
def export_all_wishlist_data():
    """Export comprehensive wishlist data for admin analysis."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_admin_id = get_jwt_identity()

        # Get export format
        export_format = request.args.get('format', 'json').lower()
        if export_format not in ['json', 'csv']:
            return jsonify({"error": "Invalid export format. Supported: json, csv"}), 400

        # Get export filters
        include_inactive_users = request.args.get('include_inactive_users', 'false').lower() == 'true'
        include_inactive_products = request.args.get('include_inactive_products', 'false').lower() == 'true'
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        # Build query
        query = db.session.query(WishlistItem, Product, User, Category, Brand).join(
            Product, WishlistItem.product_id == Product.id
        ).join(
            User, WishlistItem.user_id == User.id
        ).outerjoin(
            Category, Product.category_id == Category.id
        ).outerjoin(
            Brand, Product.brand_id == Brand.id
        )

        # Apply filters
        if not include_inactive_users:
            query = query.filter(User.is_active == True)

        if not include_inactive_products:
            query = query.filter(Product.is_active == True)

        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at >= date_from_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_from format. Use ISO format."}), 400

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(WishlistItem.created_at <= date_to_obj)
            except ValueError:
                return jsonify({"error": "Invalid date_to format. Use ISO format."}), 400

        # Order by creation date
        query = query.order_by(WishlistItem.created_at.desc())

        # Execute query
        wishlist_items = query.all()

        if export_format == 'json':
            export_data = []
            for item, product, user, category, brand in wishlist_items:
                item_data = enhance_admin_wishlist_item_data(item, product, user, category, brand)
                export_data.append(item_data)

            return jsonify({
                "export_format": "json",
                "exported_at": datetime.now().isoformat(),
                "exported_by_admin": current_admin_id,
                "total_items": len(export_data),
                "filters": {
                    "include_inactive_users": include_inactive_users,
                    "include_inactive_products": include_inactive_products,
                    "date_from": date_from,
                    "date_to": date_to
                },
                "data": export_data
            }), 200

        elif export_format == 'csv':
            import csv
            import io

            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow([
                'Wishlist Item ID', 'User ID', 'User Email', 'User Name', 'User Active',
                'Product ID', 'Product Name', 'Product Price', 'Product Sale Price',
                'Product Stock', 'Product Active', 'Product Featured', 'Product On Sale',
                'Category', 'Brand', 'Added Date'
            ])

            # Write data
            for item, product, user, category, brand in wishlist_items:
                writer.writerow([
                    item.id,
                    user.id,
                    user.email,
                    f"{user.first_name} {user.last_name}".strip(),
                    'Yes' if user.is_active else 'No',
                    product.id,
                    product.name,
                    float(product.price) if product.price else '',
                    float(product.sale_price) if product.sale_price else '',
                    product.stock,
                    'Yes' if product.is_active else 'No',
                    'Yes' if product.is_featured else 'No',
                    'Yes' if product.is_sale else 'No',
                    category.name if category else '',
                    brand.name if brand else '',
                    item.created_at.isoformat() if item.created_at else ''
                ])

            csv_content = output.getvalue()
            output.close()

            return jsonify({
                "export_format": "csv",
                "exported_at": datetime.now().isoformat(),
                "exported_by_admin": current_admin_id,
                "total_items": len(wishlist_items),
                "filters": {
                    "include_inactive_users": include_inactive_users,
                    "include_inactive_products": include_inactive_products,
                    "date_from": date_from,
                    "date_to": date_to
                },
                "csv_data": csv_content
            }), 200

    except Exception as e:
        logger.error(f"Error exporting wishlist data: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to export wishlist data", "details": str(e)}), 500

@admin_wishlist_routes.route('/products/<int:product_id>/users', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("100 per hour")
def get_users_interested_in_product(product_id):
    """Get all users who have a specific product in their wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Get users who have this product in their wishlist
        query = db.session.query(WishlistItem, User).join(
            User, WishlistItem.user_id == User.id
        ).filter(
            WishlistItem.product_id == product_id
        ).order_by(WishlistItem.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        wishlist_items = paginated.items

        # Format user data
        users_data = []
        for item, user in wishlist_items:
            users_data.append({
                "wishlist_item_id": item.id,
                "added_date": item.created_at.isoformat() if item.created_at else None,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat() if user.created_at else None
                }
            })

        return jsonify({
            "product": {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "price": float(product.price) if product.price else None,
                "sale_price": float(product.sale_price) if product.sale_price else None,
                "is_active": product.is_active
            },
            "interested_users": users_data,
            "user_count": len(users_data),
            "total_interested_users": paginated.total,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching users interested in product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve interested users", "details": str(e)}), 500

@admin_wishlist_routes.route('/items/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("100 per hour")
def delete_wishlist_item(item_id):
    """Delete a specific wishlist item."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_admin_id = get_jwt_identity()

        # Validate item exists
        item = WishlistItem.query.get(item_id)
        if not item:
            return jsonify({"error": "Wishlist item not found"}), 404

        # Get item details for logging
        user_id = item.user_id
        product_id = item.product_id

        # Delete the item
        db.session.delete(item)
        db.session.commit()

        # Clear cache
        if cache:
            cache.delete_memoized(f"user_wishlist_{user_id}_*")
            cache.delete("admin_wishlist_analytics")

        logger.info(f"Admin {current_admin_id} deleted wishlist item {item_id} (user: {user_id}, product: {product_id})")

        return jsonify({
            "message": "Wishlist item deleted successfully",
            "deleted_item_id": item_id,
            "user_id": user_id,
            "product_id": product_id,
            "deleted_by_admin": current_admin_id
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting wishlist item {item_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete wishlist item", "details": str(e)}), 500

@admin_wishlist_routes.route('/stats/summary', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
@admin_rate_limit("100 per hour")
def get_wishlist_summary_stats():
    """Get summary statistics for admin dashboard."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check cache first
        cache_key = "admin_wishlist_summary"
        cached_result = cache.get(cache_key) if cache else None
        if cached_result:
            return jsonify(cached_result), 200

        # Get basic counts
        total_items = WishlistItem.query.count()
        total_users = db.session.query(WishlistItem.user_id).distinct().count()
        total_products = db.session.query(WishlistItem.product_id).distinct().count()

        # Get recent activity (last 24 hours)
        yesterday = datetime.now() - timedelta(days=1)
        recent_additions = WishlistItem.query.filter(
            WishlistItem.created_at >= yesterday
        ).count()

        # Get this week's activity
        week_ago = datetime.now() - timedelta(days=7)
        weekly_additions = WishlistItem.query.filter(
            WishlistItem.created_at >= week_ago
        ).count()

        # Get average items per user
        avg_items_per_user = total_items / total_users if total_users > 0 else 0

        result = {
            "total_wishlist_items": total_items,
            "total_users_with_wishlists": total_users,
            "total_products_in_wishlists": total_products,
            "recent_additions_24h": recent_additions,
            "weekly_additions": weekly_additions,
            "average_items_per_user": round(avg_items_per_user, 2),
            "generated_at": datetime.now().isoformat()
        }

        # Cache the result
        if cache:
            cache.set(cache_key, result, timeout=300)  # 5 minutes cache

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting wishlist summary stats: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get summary statistics", "details": str(e)}), 500
