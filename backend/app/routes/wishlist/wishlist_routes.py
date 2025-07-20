"""
Wishlist routes for Mizizzi E-commerce platform.
Handles wishlist management functionality with comprehensive validation and error handling.
Production-ready implementation with proper security measures.
"""
# Standard Libraries
import logging
from datetime import datetime

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

# Database & ORM
from sqlalchemy import func
from ...configuration.extensions import db

# Models
from ...models.models import WishlistItem, Product, User

# Schemas
from ...schemas.schemas import wishlist_item_schema, wishlist_items_schema

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
wishlist_routes = Blueprint('wishlist_routes', __name__)

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 20), type=int)
    # Limit per_page to prevent abuse
    per_page = min(per_page, 100)
    return page, per_page

def validate_product_exists(product_id):
    """Validate that a product exists and is active."""
    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        return None, "Invalid product ID format"

    if product_id <= 0:
        return None, "Invalid product ID"

    product = Product.query.get(product_id)
    if not product:
        return None, "Product not found"

    if not product.is_active:
        return None, "Product is not available"

    return product, None

def enhance_wishlist_item_data(item):
    """Enhance wishlist item with product details."""
    product = Product.query.get(item.product_id)
    if not product:
        return None  # Skip if product doesn't exist anymore

    # Convert numeric values to float for JSON serialization
    price = float(product.price) if product.price is not None else None
    sale_price = float(product.sale_price) if product.sale_price is not None else None

    # Handle image_urls properly
    image_urls = []
    if product.image_urls:
        # Check if image_urls is a string (comma-separated) or already a list
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
        "created_at": item.created_at.isoformat() if item.created_at else None,
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
            "brand_id": product.brand_id
        }
    }

# Health check endpoint
@wishlist_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def wishlist_health():
    """Health check endpoint for wishlist system."""
    try:
        # Test database connection
        db.session.execute('SELECT 1')

        return jsonify({
            "status": "ok",
            "service": "wishlist_routes",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "endpoints": [
                "/",
                "/bulk/add",
                "/stats",
                "/<int:item_id>",
                "/clear",
                "/check/<int:product_id>",
                "/toggle/<int:product_id>"
            ]
        }), 200
    except Exception as e:
        logger.error(f"Wishlist health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "wishlist_routes",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# ----------------------
# Wishlist Routes with Validation
# ----------------------

@wishlist_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_wishlist():
    """Get user's wishlist items with enhanced product details."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Get sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Validate sort parameters
        valid_sort_fields = ['created_at', 'product_name', 'product_price']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'

        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'

        # Build query
        query = WishlistItem.query.filter_by(user_id=current_user_id)

        # Apply sorting
        if sort_by == 'created_at':
            if sort_order == 'asc':
                query = query.order_by(WishlistItem.created_at.asc())
            else:
                query = query.order_by(WishlistItem.created_at.desc())
        elif sort_by == 'product_name':
            # Join with Product table for sorting by name
            query = query.join(Product).order_by(
                Product.name.asc() if sort_order == 'asc' else Product.name.desc()
            )
        elif sort_by == 'product_price':
            # Join with Product table for sorting by price
            query = query.join(Product).order_by(
                Product.price.asc() if sort_order == 'asc' else Product.price.desc()
            )

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        wishlist_items = paginated.items

        # Enhance wishlist items with product details
        wishlist_data = []
        for item in wishlist_items:
            enhanced_item = enhance_wishlist_item_data(item)
            if enhanced_item:  # Only include if product still exists
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
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching wishlist for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve wishlist", "details": str(e)}), 500

@wishlist_routes.route('/', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def add_to_wishlist():
    """Add item to wishlist with comprehensive validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()

        # Validate required fields
        if not data or not data.get('product_id'):
            return jsonify({"error": "Product ID is required"}), 400

        # Validate and get product
        product, error = validate_product_exists(data.get('product_id'))
        if error:
            return jsonify({"error": error}), 400 if "Invalid" in error or "format" in error else 404

        # Check if item already exists in wishlist
        existing_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product.id
        ).first()

        if existing_item:
            enhanced_item = enhance_wishlist_item_data(existing_item)
            return jsonify({
                "message": "Item already in wishlist",
                "item": enhanced_item,
                "already_exists": True
            }), 200
        else:
            # Create new wishlist item
            new_item = WishlistItem(
                user_id=current_user_id,
                product_id=product.id
            )

            db.session.add(new_item)
            db.session.commit()

            enhanced_item = enhance_wishlist_item_data(new_item)

            logger.info(f"Item added to wishlist: product {product.id} for user {current_user_id}")

            return jsonify({
                "message": "Item added to wishlist",
                "item": enhanced_item,
                "already_exists": False
            }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding to wishlist for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to add item to wishlist", "details": str(e)}), 500

@wishlist_routes.route('/bulk/add', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def bulk_add_to_wishlist():
    """Add multiple items to wishlist at once."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()

        # Validate required fields
        if not data or not isinstance(data.get('product_ids'), list):
            return jsonify({"error": "Product IDs array is required"}), 400

        product_ids = data.get('product_ids', [])

        if len(product_ids) == 0:
            return jsonify({"error": "At least one product ID is required"}), 400

        if len(product_ids) > 50:  # Limit bulk operations
            return jsonify({"error": "Maximum 50 products can be added at once"}), 400

        # Validate all products exist and are active
        valid_products = []
        invalid_products = []

        for product_id in product_ids:
            product, error = validate_product_exists(product_id)
            if error:
                invalid_products.append({"product_id": product_id, "error": error})
            else:
                valid_products.append(product)

        # Get existing wishlist items to avoid duplicates
        existing_items = WishlistItem.query.filter(
            WishlistItem.user_id == current_user_id,
            WishlistItem.product_id.in_([p.id for p in valid_products])
        ).all()

        existing_product_ids = {item.product_id for item in existing_items}

        # Add new items
        new_items = []
        skipped_items = []

        for product in valid_products:
            if product.id in existing_product_ids:
                skipped_items.append(product.id)
            else:
                new_item = WishlistItem(
                    user_id=current_user_id,
                    product_id=product.id
                )
                new_items.append(new_item)
                db.session.add(new_item)

        db.session.commit()

        logger.info(f"Bulk add to wishlist: {len(new_items)} items added for user {current_user_id}")

        return jsonify({
            "message": f"Bulk add completed",
            "added_count": len(new_items),
            "skipped_count": len(skipped_items),
            "invalid_count": len(invalid_products),
            "details": {
                "added_items": [item.product_id for item in new_items],
                "skipped_items": skipped_items,
                "invalid_products": invalid_products
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in bulk add to wishlist for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to bulk add items to wishlist", "details": str(e)}), 500

@wishlist_routes.route('/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_wishlist(item_id):
    """Remove item from wishlist with proper authorization."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate item_id
        if item_id <= 0:
            return jsonify({"error": "Invalid item ID"}), 400

        # Try to get the item
        item = WishlistItem.query.get(item_id)

        # If item doesn't exist, return 404
        if not item:
            return jsonify({"error": "Wishlist item not found"}), 404

        # Ensure item belongs to current user
        if str(current_user_id) != str(item.user_id):
            return jsonify({"error": "Unauthorized access to wishlist item"}), 403

        # Store product info for logging
        product_id = item.product_id

        db.session.delete(item)
        db.session.commit()

        logger.info(f"Item removed from wishlist: product {product_id} for user {current_user_id}")

        return jsonify({"message": "Item removed from wishlist"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing from wishlist item {item_id} for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to remove item from wishlist", "details": str(e)}), 500

@wishlist_routes.route('/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_wishlist():
    """Clear entire wishlist with confirmation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Count items before deletion for confirmation message
        count = WishlistItem.query.filter_by(user_id=current_user_id).count()

        if count == 0:
            return jsonify({
                "message": "Wishlist is already empty",
                "items_removed": 0
            }), 200

        # Delete all wishlist items for this user
        WishlistItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()

        logger.info(f"Wishlist cleared: {count} items removed for user {current_user_id}")

        return jsonify({
            "message": "Wishlist cleared successfully",
            "items_removed": count
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing wishlist for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to clear wishlist", "details": str(e)}), 500

@wishlist_routes.route('/check/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def check_wishlist_item(product_id):
    """Check if a product is in the user's wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Validate and get product
        product, error = validate_product_exists(product_id)
        if error:
            return jsonify({"error": error}), 400 if "Invalid" in error or "format" in error else 404

        # Check if item exists in wishlist
        item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()

        if item:
            return jsonify({
                "in_wishlist": True,
                "wishlist_item_id": item.id,
                "added_at": item.created_at.isoformat() if item.created_at else None
            }), 200
        else:
            return jsonify({
                "in_wishlist": False
            }), 200

    except Exception as e:
        logger.error(f"Error checking wishlist item product {product_id} for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to check wishlist item", "details": str(e)}), 500

@wishlist_routes.route('/toggle/<int:product_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def toggle_wishlist_item(product_id):
    """Toggle a product in the wishlist (add or remove)."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Validate and get product
        product, error = validate_product_exists(product_id)
        if error:
            return jsonify({"error": error}), 400 if "Invalid" in error or "format" in error else 404

        # Check if item already exists in wishlist
        existing_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product_id
        ).first()

        if existing_item:
            # Remove from wishlist
            db.session.delete(existing_item)
            db.session.commit()

            logger.info(f"Item toggled (removed) from wishlist: product {product_id} for user {current_user_id}")

            return jsonify({
                "message": "Item removed from wishlist",
                "in_wishlist": False,
                "action": "removed"
            }), 200
        else:
            # Add to wishlist
            new_item = WishlistItem(
                user_id=current_user_id,
                product_id=product.id
            )

            db.session.add(new_item)
            db.session.commit()

            enhanced_item = enhance_wishlist_item_data(new_item)

            logger.info(f"Item toggled (added) to wishlist: product {product_id} for user {current_user_id}")

            return jsonify({
                "message": "Item added to wishlist",
                "in_wishlist": True,
                "action": "added",
                "item": enhanced_item
            }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling wishlist item product {product_id} for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to toggle wishlist item", "details": str(e)}), 500

@wishlist_routes.route('/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_wishlist_stats():
    """Get wishlist statistics for the current user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Validate user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get basic stats
        total_items = WishlistItem.query.filter_by(user_id=current_user_id).count()

        # Get items with product details for additional stats
        wishlist_items = db.session.query(WishlistItem, Product).join(
            Product, WishlistItem.product_id == Product.id
        ).filter(
            WishlistItem.user_id == current_user_id,
            Product.is_active == True
        ).all()

        # Calculate additional statistics
        total_value = 0
        sale_items_count = 0
        featured_items_count = 0
        categories = set()
        brands = set()

        for wishlist_item, product in wishlist_items:
            # Calculate total value (use sale price if available, otherwise regular price)
            price = float(product.sale_price) if product.sale_price else float(product.price)
            total_value += price

            # Count sale items
            if product.is_sale:
                sale_items_count += 1

            # Count featured items
            if product.is_featured:
                featured_items_count += 1

            # Collect categories and brands
            if product.category_id:
                categories.add(product.category_id)
            if product.brand_id:
                brands.add(product.brand_id)

        # Get most recent addition
        latest_item = WishlistItem.query.filter_by(user_id=current_user_id).order_by(
            WishlistItem.created_at.desc()
        ).first()

        return jsonify({
            "total_items": total_items,
            "active_items": len(wishlist_items),
            "total_value": round(total_value, 2),
            "sale_items_count": sale_items_count,
            "featured_items_count": featured_items_count,
            "unique_categories": len(categories),
            "unique_brands": len(brands),
            "latest_addition": {
                "date": latest_item.created_at.isoformat() if latest_item and latest_item.created_at else None,
                "product_id": latest_item.product_id if latest_item else None
            } if latest_item else None,
            "generated_at": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting wishlist stats for user {current_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get wishlist statistics", "details": str(e)}), 500
