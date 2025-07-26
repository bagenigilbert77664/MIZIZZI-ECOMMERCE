"""
User-facing products routes for Mizizzi E-commerce platform.
Handles public product viewing, searching, and browsing functionality.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from sqlalchemy import or_, func
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import re

from app.configuration.extensions import db
from app.models.models import (
    Product, ProductVariant, ProductImage, Category, Brand,
    User, UserRole
)

# Create blueprint for user-facing product routes
products_routes = Blueprint('products_routes', __name__, url_prefix='/api/products')

# ----------------------
# Helper Functions
# ----------------------

def serialize_product(product, include_variants=False, include_images=False):
    """
    Serialize a product to dictionary format.

    Args:
        product: Product instance
        include_variants: Whether to include variants
        include_images: Whether to include images

    Returns:
        Dictionary representation of the product
    """
    try:
        data = {
            'id': product.id,
            'name': product.name,
            'slug': product.slug,
            'description': product.description,
            'price': float(product.price) if product.price else None,
            'sale_price': float(product.sale_price) if product.sale_price else None,
            'stock': product.stock,
            'category_id': product.category_id,
            'brand_id': product.brand_id,
            'image_urls': product.get_image_urls(),
            'thumbnail_url': product.thumbnail_url,
            'is_featured': product.is_featured,
            'is_new': product.is_new,
            'is_sale': product.is_sale,
            'is_flash_sale': product.is_flash_sale,
            'is_luxury_deal': product.is_luxury_deal,
            'is_active': product.is_active,
            'sku': product.sku,
            'weight': product.weight,
            'dimensions': product.dimensions,
            'meta_title': product.meta_title,
            'meta_description': product.meta_description,
            'short_description': product.short_description,
            'specifications': product.specifications,
            'warranty_info': product.warranty_info,
            'shipping_info': product.shipping_info,
            'availability_status': product.availability_status,
            'min_order_quantity': product.min_order_quantity,
            'max_order_quantity': product.max_order_quantity,
            'related_products': product.get_related_products(),
            'cross_sell_products': product.get_cross_sell_products(),
            'up_sell_products': product.get_up_sell_products(),
            'discount_percentage': product.discount_percentage,
            'tax_rate': product.tax_rate,
            'tax_class': product.tax_class,
            'barcode': product.barcode,
            'manufacturer': product.manufacturer,
            'country_of_origin': product.country_of_origin,
            'is_digital': product.is_digital,
            'download_link': product.download_link,
            'download_expiry_days': product.download_expiry_days,
            'is_taxable': product.is_taxable,
            'is_shippable': product.is_shippable,
            'requires_shipping': product.requires_shipping,
            'is_gift_card': product.is_gift_card,
            'gift_card_value': float(product.gift_card_value) if product.gift_card_value else None,
            'is_customizable': product.is_customizable,
            'customization_options': product.customization_options,
            'seo_keywords': product.get_seo_keywords(),
            'canonical_url': product.canonical_url,
            'condition': product.condition,
            'video_url': product.video_url,
            'is_visible': product.is_visible,
            'is_searchable': product.is_searchable,
            'is_comparable': product.is_comparable,
            'is_preorder': product.is_preorder,
            'preorder_release_date': product.preorder_release_date.isoformat() if product.preorder_release_date else None,
            'preorder_message': product.preorder_message,
            'badge_text': product.badge_text,
            'badge_color': product.badge_color,
            'sort_order': product.sort_order,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None
        }

        # Include category and brand details if available
        if product.category:
            data['category'] = {
                'id': product.category.id,
                'name': product.category.name,
                'slug': product.category.slug
            }

        if product.brand:
            data['brand'] = {
                'id': product.brand.id,
                'name': product.brand.name,
                'slug': product.brand.slug
            }

        # Include variants if requested
        if include_variants and product.variants:
            data['variants'] = [serialize_variant(variant) for variant in product.variants]

        # Include images if requested
        if include_images and product.images:
            data['images'] = [serialize_image(image) for image in product.images]

        return data
    except Exception as e:
        current_app.logger.error(f"Error serializing product {product.id}: {str(e)}")
        return None

def serialize_variant(variant):
    """Serialize a product variant to dictionary format."""
    return {
        'id': variant.id,
        'product_id': variant.product_id,
        'color': variant.color,
        'size': variant.size,
        'price': float(variant.price) if variant.price else None,
        'sale_price': float(variant.sale_price) if variant.sale_price else None,
        'stock': variant.stock,
        'sku': variant.sku,
        'image_url': variant.image_url,
        'created_at': variant.created_at.isoformat() if variant.created_at else None,
        'updated_at': variant.updated_at.isoformat() if variant.updated_at else None
    }

def serialize_image(image):
    """Serialize a product image to dictionary format."""
    return {
        'id': image.id,
        'product_id': image.product_id,
        'filename': image.filename,
        'url': image.url,
        'is_primary': image.is_primary,
        'sort_order': image.sort_order,
        'alt_text': image.alt_text,
        'created_at': image.created_at.isoformat() if image.created_at else None,
        'updated_at': image.updated_at.isoformat() if image.updated_at else None
    }

def is_admin_user():
    """Check if the current user is an admin."""
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()

        if not current_user_id:
            return False

        user = db.session.get(User, current_user_id)
        return user and user.role == UserRole.ADMIN
    except Exception:
        return False

# ----------------------
# Health Check
# ----------------------

@products_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for products service."""
    return jsonify({
        'status': 'ok',
        'service': 'products_routes',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ----------------------
# Public Products List
# ----------------------

@products_routes.route('/', methods=['GET'])
def get_products():
    """
    Get products with filtering, sorting, and pagination.

    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - category_id: Filter by category ID
        - brand_id: Filter by brand ID
        - min_price: Minimum price filter
        - max_price: Maximum price filter
        - is_featured: Filter featured products (true/false)
        - is_new: Filter new products (true/false)
        - is_sale: Filter sale products (true/false)
        - is_flash_sale: Filter flash sale products (true/false)
        - is_luxury_deal: Filter luxury deal products (true/false)
        - search: Search in product name and description
        - sort_by: Sort field (name, price, created_at, updated_at)
        - sort_order: Sort order (asc, desc)
        - include_inactive: Include inactive products (admin only)
    """
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        is_featured = request.args.get('is_featured', type=bool)
        is_new = request.args.get('is_new', type=bool)
        is_sale = request.args.get('is_sale', type=bool)
        is_flash_sale = request.args.get('is_flash_sale', type=bool)
        is_luxury_deal = request.args.get('is_luxury_deal', type=bool)
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        include_inactive = request.args.get('include_inactive', False, type=bool)

        # Build query
        query = Product.query

        # Filter by active status (unless admin requests inactive products)
        if not (include_inactive and is_admin_user()):
            query = query.filter(Product.is_active == True)

        # Only show visible products for non-admin users
        if not is_admin_user():
            query = query.filter(Product.is_visible == True)

        # Apply filters
        if category_id:
            query = query.filter(Product.category_id == category_id)

        if brand_id:
            query = query.filter(Product.brand_id == brand_id)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if is_featured is not None:
            query = query.filter(Product.is_featured == is_featured)

        if is_new is not None:
            query = query.filter(Product.is_new == is_new)

        if is_sale is not None:
            query = query.filter(Product.is_sale == is_sale)

        if is_flash_sale is not None:
            query = query.filter(Product.is_flash_sale == is_flash_sale)

        if is_luxury_deal is not None:
            query = query.filter(Product.is_luxury_deal == is_luxury_deal)

        # Search functionality
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.short_description.ilike(search_term)
                )
            )

        # Sorting
        valid_sort_fields = ['name', 'price', 'created_at', 'updated_at', 'stock']
        if sort_by in valid_sort_fields:
            sort_column = getattr(Product, sort_by)
            if sort_order.lower() == 'desc':
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(Product.created_at.desc())

        # Execute query with pagination
        try:
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error during pagination: {str(e)}")
            return jsonify({'error': 'Database error occurred'}), 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error during pagination: {str(e)}")
            return jsonify({'error': 'Database error occurred'}), 500

        # Serialize products
        products = []
        for product in pagination.items:
            serialized = serialize_product(product)
            if serialized:
                products.append(serialized)

        return jsonify({
            'items': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error getting products: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Get Product by ID
# ----------------------

@products_routes.route('/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """Get a product by ID."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is active and visible (unless admin)
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        return jsonify(serialize_product(product, include_variants=True, include_images=True)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Get Product by Slug
# ----------------------

@products_routes.route('/<string:slug>', methods=['GET'])
def get_product_by_slug(slug):
    """Get a product by slug."""
    try:
        product = Product.query.filter_by(slug=slug).first()

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is active and visible (unless admin)
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        return jsonify(serialize_product(product, include_variants=True, include_images=True)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product by slug {slug}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Product Variants (Read-only for users)
# ----------------------

@products_routes.route('/<int:product_id>/variants', methods=['GET'])
def get_product_variants(product_id):
    """Get variants for a product."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is accessible to user
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        variants = ProductVariant.query.filter_by(product_id=product_id).all()

        return jsonify([serialize_variant(variant) for variant in variants]), 200

    except Exception as e:
        current_app.logger.error(f"Error getting variants for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Product Images (Read-only for users)
# ----------------------

@products_routes.route('/<int:product_id>/images', methods=['GET'])
def get_product_images(product_id):
    """Get images for a product."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is accessible to user
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        images = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc()
        ).all()

        return jsonify({
            'items': [serialize_image(image) for image in images]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting images for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@products_routes.route('/product-images/<int:image_id>', methods=['GET'])
def get_product_image(image_id):
    """Get a specific product image."""
    try:
        image = db.session.get(ProductImage, image_id)

        if not image:
            return jsonify({'error': 'Image not found'}), 404

        # Check if the product is accessible to user
        if not is_admin_user():
            product = db.session.get(Product, image.product_id)
            if not product or not product.is_active or not product.is_visible:
                return jsonify({'error': 'Image not found'}), 404

        return jsonify(serialize_image(image)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting image {image_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Search and Filter Endpoints
# ----------------------

@products_routes.route('/search', methods=['GET'])
def search_products():
    """Advanced product search endpoint."""
    try:
        # Get search parameters
        query_text = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        if not query_text:
            return jsonify({'error': 'Search query is required'}), 400

        # Build search query
        search_term = f"%{query_text}%"
        query = Product.query.filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_searchable == True,
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.short_description.ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )

        # Execute query with pagination
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Serialize products
        products = []
        for product in pagination.items:
            serialized = serialize_product(product)
            if serialized:
                products.append(serialized)

        return jsonify({
            'query': query_text,
            'items': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error searching products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@products_routes.route('/featured', methods=['GET'])
def get_featured_products():
    """Get featured products."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_featured == True
        ).order_by(Product.sort_order.asc(), Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        products = []
        for product in pagination.items:
            serialized = serialize_product(product)
            if serialized:
                products.append(serialized)

        return jsonify({
            'items': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting featured products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@products_routes.route('/new', methods=['GET'])
def get_new_products():
    """Get new products."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_new == True
        ).order_by(Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        products = []
        for product in pagination.items:
            serialized = serialize_product(product)
            if serialized:
                products.append(serialized)

        return jsonify({
            'items': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting new products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@products_routes.route('/sale', methods=['GET'])
def get_sale_products():
    """Get products on sale."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_sale == True
        ).order_by(Product.discount_percentage.desc(), Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        products = []
        for product in pagination.items:
            serialized = serialize_product(product)
            if serialized:
                products.append(serialized)

        return jsonify({
            'items': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting sale products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# OPTIONS handlers for CORS
# ----------------------

@products_routes.route('/', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>', methods=['OPTIONS'])
@products_routes.route('/<string:slug>', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>/variants', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>/images', methods=['OPTIONS'])
@products_routes.route('/product-images/<int:image_id>', methods=['OPTIONS'])
@products_routes.route('/search', methods=['OPTIONS'])
@products_routes.route('/featured', methods=['OPTIONS'])
@products_routes.route('/new', methods=['OPTIONS'])
@products_routes.route('/sale', methods=['OPTIONS'])
def handle_options():
    """Handle OPTIONS requests for CORS."""
    return '', 200
