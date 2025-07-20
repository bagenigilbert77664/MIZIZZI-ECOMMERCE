"""
Product routes for Mizizzi E-commerce platform.
Handles product management and retrieval functionality.
"""
import os
import uuid
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, func

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
products_routes = Blueprint('products_routes', __name__)

# Import with error handling
try:
    from ...configuration.extensions import db
except ImportError:
    try:
        from ...configuration.extensions import db
    except ImportError:
        from flask_sqlalchemy import SQLAlchemy
        db = SQLAlchemy()

try:
    from ...models.models import Category, Product, ProductVariant, Brand, ProductImage
except ImportError:
    try:
        from ...models.models import Category, Product, ProductVariant, Brand, ProductImage
    except ImportError:
        logger.error("Could not import models - products routes may not function properly")
        # Create placeholder classes to prevent import errors
        class Product:
            query = None
        class ProductVariant:
            query = None
        class ProductImage:
            query = None
        class Category:
            query = None
        class Brand:
            query = None

try:
    from ...schemas.schemas import (
        product_schema, products_schema, product_variant_schema,
        product_variants_schema, product_images_schema, product_image_schema
    )
except ImportError:
    try:
        from ...schemas.schemas import (
            product_schema, products_schema, product_variant_schema,
            product_variants_schema, product_images_schema, product_image_schema
        )
    except ImportError:
        logger.error("Could not import schemas - using basic serialization")
        # Create basic schema classes
        class BasicSchema:
            def dump(self, obj):
                if isinstance(obj, list):
                    return [self._serialize(item) for item in obj]
                return self._serialize(obj)

            def _serialize(self, obj):
                if hasattr(obj, 'to_dict'):
                    return obj.to_dict()
                elif hasattr(obj, '__dict__'):
                    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
                return obj

        product_schema = BasicSchema()
        products_schema = BasicSchema()
        product_variant_schema = BasicSchema()
        product_variants_schema = BasicSchema()
        product_image_schema = BasicSchema()
        product_images_schema = BasicSchema()

try:
    from ...validations.validation import (
        validate_product_creation, validate_product_update,
        validate_product_variant_creation, validate_product_variant_update,
        admin_required
    )
except ImportError:
    try:
        from ...validations.validation import (
            validate_product_creation, validate_product_update,
            validate_product_variant_creation, validate_product_variant_update,
            admin_required
        )
    except ImportError:
        logger.error("Could not import validations - using basic decorators")
        # Create basic validation decorators
        def validate_product_creation():
            def decorator(f):
                def wrapper(*args, **kwargs):
                    data = request.get_json()
                    if not data:
                        return jsonify({"error": "No data provided"}), 400
                    if not data.get('name'):
                        return jsonify({"error": "Product name is required"}), 400
                    if not data.get('price'):
                        return jsonify({"error": "Product price is required"}), 400
                    g.validated_data = data
                    return f(*args, **kwargs)
                return wrapper
            return decorator

        def validate_product_update(product_id):
            def decorator(f):
                def wrapper(*args, **kwargs):
                    data = request.get_json()
                    if not data:
                        return jsonify({"error": "No data provided"}), 400
                    g.validated_data = data
                    return f(*args, **kwargs)
                return wrapper
            return decorator

        def validate_product_variant_creation(product_id_func):
            def decorator(f):
                def wrapper(*args, **kwargs):
                    data = request.get_json()
                    if not data:
                        return jsonify({"error": "No data provided"}), 400
                    g.validated_data = data
                    return f(*args, **kwargs)
                return wrapper
            return decorator

        def validate_product_variant_update(variant_id_func):
            def decorator(f):
                def wrapper(*args, **kwargs):
                    data = request.get_json()
                    if not data:
                        return jsonify({"error": "No data provided"}), 400
                    g.validated_data = data
                    return f(*args, **kwargs)
                return wrapper
            return decorator

        def admin_required(f):
            def wrapper(*args, **kwargs):
                # Basic admin check - in production this should verify admin role
                return f(*args, **kwargs)
            return wrapper

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    per_page = min(per_page, 100)  # Limit per_page to prevent abuse
    return page, per_page

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
                "has_prev": paginated.has_prev
            }
        }
    except Exception as e:
        logger.error(f"Pagination error: {str(e)}")
        return {
            "items": [],
            "pagination": {
                "page": 1,
                "per_page": per_page,
                "total_pages": 0,
                "total_items": 0,
                "has_next": False,
                "has_prev": False
            },
            "error": "Pagination failed"
        }

# Health check endpoint
@products_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def products_health():
    """Health check endpoint for products system."""
    try:
        # Test database connection
        db_status = "disconnected"
        if db and hasattr(db, 'session'):
            try:
                db.session.execute('SELECT 1')
                db_status = "connected"
            except Exception as e:
                db_status = f"error: {str(e)}"

        return jsonify({
            "status": "ok",
            "service": "products_routes",
            "timestamp": datetime.now().isoformat(),
            "database": db_status,
            "models_available": hasattr(Product, 'query') and Product.query is not None,
            "endpoints": [
                "/",
                "/<int:product_id>",
                "/<string:slug>",
                "/<int:product_id>/variants",
                "/<int:product_id>/images",
                "/variants/<int:variant_id>",
                "/product-images/<int:image_id>"
            ]
        }), 200
    except Exception as e:
        logger.error(f"Products health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "service": "products_routes",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# ----------------------
# Product Routes
# ----------------------

@products_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_products():
    """Get all products with pagination and filtering."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check if Product model is available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        page, per_page = get_pagination_params()

        # Filter parameters
        category_id = request.args.get('category_id', type=int)
        category_slug = request.args.get('category_slug')
        brand_id = request.args.get('brand_id', type=int)
        brand_slug = request.args.get('brand_slug')
        featured_only = request.args.get('featured', '').lower() == 'true'
        new_only = request.args.get('new', '').lower() == 'true'
        sale_only = request.args.get('sale', '').lower() == 'true'
        flash_sale_only = request.args.get('flash_sale', '').lower() == 'true'
        luxury_deal_only = request.args.get('luxury_deal', '').lower() == 'true'
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('q')
        active_only = request.args.get('active', 'true').lower() == 'true'

        # Sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Validate sort parameters
        valid_sort_fields = ['created_at', 'updated_at', 'name', 'price', 'stock']
        if sort_by not in valid_sort_fields:
            sort_by = 'created_at'

        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'

        query = Product.query

        # Apply active filter by default
        if active_only:
            query = query.filter_by(is_active=True)

        # Apply filters
        if category_id:
            query = query.filter_by(category_id=category_id)

        if category_slug and hasattr(Category, 'query') and Category.query:
            category = Category.query.filter_by(slug=category_slug).first()
            if category:
                query = query.filter_by(category_id=category.id)

        if brand_id:
            query = query.filter_by(brand_id=brand_id)

        if brand_slug and hasattr(Brand, 'query') and Brand.query:
            brand = Brand.query.filter_by(slug=brand_slug).first()
            if brand:
                query = query.filter_by(brand_id=brand.id)

        if featured_only:
            query = query.filter_by(is_featured=True)

        if new_only:
            query = query.filter_by(is_new=True)

        if sale_only:
            query = query.filter_by(is_sale=True)

        if flash_sale_only:
            query = query.filter_by(is_flash_sale=True)

        if luxury_deal_only:
            query = query.filter_by(is_luxury_deal=True)

        if min_price is not None and min_price >= 0:
            query = query.filter(Product.price >= min_price)

        if max_price is not None and max_price >= 0:
            query = query.filter(Product.price <= max_price)

        if search_query:
            search_term = f"%{search_query.strip()}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.meta_title.ilike(search_term),
                    Product.meta_description.ilike(search_term),
                    Product.sku.ilike(search_term)
                )
            )

        # Apply sorting
        if sort_by == 'price':
            if sort_order == 'asc':
                query = query.order_by(Product.price.asc())
            else:
                query = query.order_by(Product.price.desc())
        elif sort_by == 'name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        elif sort_by == 'stock':
            if sort_order == 'asc':
                query = query.order_by(Product.stock.asc())
            else:
                query = query.order_by(Product.stock.desc())
        elif sort_by == 'updated_at':
            if sort_order == 'asc':
                query = query.order_by(Product.updated_at.asc())
            else:
                query = query.order_by(Product.updated_at.desc())
        else:  # Default to created_at
            if sort_order == 'asc':
                query = query.order_by(Product.created_at.asc())
            else:
                query = query.order_by(Product.created_at.desc())

        result = paginate_response(query, products_schema, page, per_page)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error retrieving products: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve products", "details": str(e)}), 500

@products_routes.route('/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product(product_id):
    """Get product by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Check if Product model is available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        product = Product.query.get_or_404(product_id)

        # Check if product is active (unless admin)
        if not product.is_active:
            return jsonify({"error": "Product not found"}), 404

        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        logger.error(f"Error retrieving product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@products_routes.route('/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_by_slug(slug):
    """Get product by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate slug
        if not slug or len(slug.strip()) == 0:
            return jsonify({"error": "Invalid product slug"}), 400

        # Check if Product model is available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        product = Product.query.filter_by(slug=slug.strip()).first()

        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Check if product is active
        if not product.is_active:
            return jsonify({"error": "Product not found"}), 404

        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        logger.error(f"Error retrieving product by slug {slug}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@products_routes.route('/', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
@validate_product_creation()
def create_product():
    """Create a new product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check if Product model is available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Create new product
        new_product = Product(
            name=data['name'],
            slug=data.get('slug', data['name'].lower().replace(' ', '-').replace('_', '-')),
            description=data.get('description'),
            price=data['price'],
            sale_price=data.get('sale_price'),
            stock=data.get('stock', 0),
            category_id=data.get('category_id'),
            brand_id=data.get('brand_id'),
            image_urls=data.get('image_urls', []),
            thumbnail_url=data.get('thumbnail_url'),
            sku=data.get('sku'),
            weight=data.get('weight'),
            dimensions=data.get('dimensions'),
            is_featured=data.get('is_featured', False),
            is_new=data.get('is_new', True),
            is_sale=data.get('is_sale', False),
            is_flash_sale=data.get('is_flash_sale', False),
            is_luxury_deal=data.get('is_luxury_deal', False),
            is_active=data.get('is_active', True),
            meta_title=data.get('meta_title'),
            meta_description=data.get('meta_description'),
            short_description=data.get('short_description'),
            specifications=data.get('specifications'),
            warranty_info=data.get('warranty_info'),
            shipping_info=data.get('shipping_info')
        )

        db.session.add(new_product)
        db.session.flush()  # Get the ID without committing

        # Handle variants if provided
        variants = data.get('variants', [])
        for variant_data in variants:
            if hasattr(ProductVariant, '__init__'):
                variant = ProductVariant(
                    product_id=new_product.id,
                    sku=variant_data.get('sku'),
                    color=variant_data.get('color'),
                    size=variant_data.get('size'),
                    stock=variant_data.get('stock', 0),
                    price=variant_data.get('price', new_product.price),
                    sale_price=variant_data.get('sale_price'),
                    image_url=variant_data.get('image_url')
                )
                db.session.add(variant)

        db.session.commit()

        logger.info(f"Product created successfully: {new_product.id} by user {current_user_id}")

        return jsonify({
            "message": "Product created successfully",
            "product": product_schema.dump(new_product)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating product: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create product", "details": str(e)}), 500

@products_routes.route('/<int:product_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def update_product(product_id):
    """Update a product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    @validate_product_update(product_id)
    def perform_update():
        try:
            # Check if Product model is available
            if not hasattr(Product, 'query') or Product.query is None:
                return jsonify({"error": "Product model not available"}), 503

            # Data is already validated by the decorator
            data = g.validated_data
            current_user_id = get_jwt_identity()

            product = Product.query.get_or_404(product_id)

            # Update fields
            fields = [
                'name', 'slug', 'description', 'price', 'sale_price', 'stock',
                'category_id', 'brand_id', 'image_urls', 'thumbnail_url', 'sku',
                'weight', 'dimensions', 'is_featured', 'is_new', 'is_sale',
                'is_flash_sale', 'is_luxury_deal', 'is_active', 'meta_title',
                'meta_description', 'short_description', 'specifications',
                'warranty_info', 'shipping_info'
            ]

            for field in fields:
                if field in data:
                    setattr(product, field, data[field])

            product.updated_at = datetime.utcnow()

            # Handle variants if provided
            if 'variants' in data and hasattr(ProductVariant, 'query') and ProductVariant.query:
                # Delete existing variants
                ProductVariant.query.filter_by(product_id=product_id).delete()

                # Add new variants
                for variant_data in data['variants']:
                    variant = ProductVariant(
                        product_id=product_id,
                        sku=variant_data.get('sku'),
                        color=variant_data.get('color'),
                        size=variant_data.get('size'),
                        stock=variant_data.get('stock', 0),
                        price=variant_data.get('price', product.price),
                        sale_price=variant_data.get('sale_price'),
                        image_url=variant_data.get('image_url')
                    )
                    db.session.add(variant)

            db.session.commit()

            logger.info(f"Product updated successfully: {product_id} by user {current_user_id}")

            return jsonify({
                "message": "Product updated successfully",
                "product": product_schema.dump(product)
            }), 200

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating product {product_id}: {str(e)}", exc_info=True)
            return jsonify({"error": "Failed to update product", "details": str(e)}), 500

    return perform_update()

@products_routes.route('/<int:product_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_product(product_id):
    """Delete a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check if Product model is available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        current_user_id = get_jwt_identity()
        product = Product.query.get_or_404(product_id)

        # Store product name for logging
        product_name = product.name

        # Delete product and all related entities (variants, reviews, etc.)
        db.session.delete(product)
        db.session.commit()

        logger.info(f"Product deleted successfully: {product_id} ({product_name}) by user {current_user_id}")

        return jsonify({"message": "Product deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

# ----------------------
# Product Variant Routes
# ----------------------

@products_routes.route('/<int:product_id>/variants', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_variants(product_id):
    """Get all variants for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductVariant, 'query') or ProductVariant.query is None:
            return jsonify({"error": "ProductVariant model not available"}), 503

        product = Product.query.get_or_404(product_id)  # Ensure product exists

        variants = ProductVariant.query.filter_by(product_id=product_id).order_by(
            ProductVariant.created_at.desc()
        ).all()

        return jsonify({
            "variants": product_variants_schema.dump(variants),
            "count": len(variants)
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving product variants for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product variants", "details": str(e)}), 500

@products_routes.route('/<int:product_id>/variants', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
@validate_product_variant_creation(lambda: request.view_args.get('product_id'))
def create_product_variant(product_id):
    """Create a new product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductVariant, 'query') or ProductVariant.query is None:
            return jsonify({"error": "ProductVariant model not available"}), 503

        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()
        product = Product.query.get_or_404(product_id)

        new_variant = ProductVariant(
            product_id=product_id,
            sku=data.get('sku'),
            color=data.get('color'),
            size=data.get('size'),
            stock=data.get('stock', 0),
            price=data.get('price', product.price),
            sale_price=data.get('sale_price'),
            image_url=data.get('image_url')
        )

        db.session.add(new_variant)
        db.session.commit()

        logger.info(f"Product variant created successfully: {new_variant.id} for product {product_id} by user {current_user_id}")

        return jsonify({
            "message": "Product variant created successfully",
            "variant": product_variant_schema.dump(new_variant)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating product variant for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create product variant", "details": str(e)}), 500

@products_routes.route('/variants/<int:variant_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
@validate_product_variant_update(lambda: request.view_args.get('variant_id'))
def update_product_variant(variant_id):
    """Update a product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check if ProductVariant model is available
        if not hasattr(ProductVariant, 'query') or ProductVariant.query is None:
            return jsonify({"error": "ProductVariant model not available"}), 503

        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()
        variant = ProductVariant.query.get_or_404(variant_id)

        # Update fields
        updateable_fields = ['sku', 'color', 'size', 'stock', 'price', 'sale_price', 'image_url']

        for field in updateable_fields:
            if field in data:
                setattr(variant, field, data[field])

        variant.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Product variant updated successfully: {variant_id} by user {current_user_id}")

        return jsonify({
            "message": "Product variant updated successfully",
            "variant": product_variant_schema.dump(variant)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating product variant {variant_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update product variant", "details": str(e)}), 500

@products_routes.route('/variants/<int:variant_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_product_variant(variant_id):
    """Delete a product variant."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Check if ProductVariant model is available
        if not hasattr(ProductVariant, 'query') or ProductVariant.query is None:
            return jsonify({"error": "ProductVariant model not available"}), 503

        current_user_id = get_jwt_identity()
        variant = ProductVariant.query.get_or_404(variant_id)

        # Store variant info for logging
        product_id = variant.product_id
        variant_info = f"{variant.color}-{variant.size}" if variant.color and variant.size else str(variant_id)

        db.session.delete(variant)
        db.session.commit()

        logger.info(f"Product variant deleted successfully: {variant_id} ({variant_info}) from product {product_id} by user {current_user_id}")

        return jsonify({"message": "Product variant deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting product variant {variant_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete product variant", "details": str(e)}), 500

# ----------------------
# Product Image Routes
# ----------------------

@products_routes.route('/<int:product_id>/images', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_images(product_id):
    """Get all images for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        page, per_page = get_pagination_params()

        # Query images for this product, ordered by sort_order and primary image first
        query = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc(),
            ProductImage.created_at.desc()
        )

        return jsonify(paginate_response(query, product_images_schema, page, per_page)), 200

    except Exception as e:
        logger.error(f"Error retrieving product images for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product images", "details": str(e)}), 500

@products_routes.route('/<int:product_id>/images', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def add_product_image(product_id):
    """Add a new image to a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        # Get current user ID for tracking who uploaded
        current_user_id = get_jwt_identity()

        data = request.get_json()

        # Validate required fields
        if not data or not data.get('url'):
            return jsonify({"error": "Image URL is required"}), 400

        # Validate URL format
        url = data['url'].strip()
        if not url.startswith(('http://', 'https://')):
            return jsonify({"error": "Invalid image URL format"}), 400

        # Generate a unique filename if not provided
        filename = data.get('filename')
        if not filename:
            # Extract extension from URL or use .jpg as default
            ext = os.path.splitext(url)[1] if '.' in url.split('/')[-1] else '.jpg'
            filename = f"{uuid.uuid4().hex}{ext}"

        # Check if this should be the primary image
        is_primary = data.get('is_primary', False)

        # If setting as primary, unset any existing primary image
        if is_primary:
            ProductImage.query.filter_by(
                product_id=product_id,
                is_primary=True
            ).update({'is_primary': False})

        # Get the next sort order if not provided
        sort_order = data.get('sort_order')
        if sort_order is None:
            # Find the highest sort_order and add 1
            max_sort = db.session.query(func.max(ProductImage.sort_order)).filter_by(
                product_id=product_id
            ).scalar()
            sort_order = (max_sort or 0) + 10  # Use increments of 10 to allow for later insertions

        # Create new product image
        new_image = ProductImage(
            product_id=product_id,
            filename=filename,
            original_name=data.get('original_name', filename),
            url=url,
            size=data.get('size'),
            is_primary=is_primary,
            sort_order=sort_order,
            alt_text=data.get('alt_text', product.name),
            uploaded_by=current_user_id
        )

        db.session.add(new_image)

        # If this is the first image for the product, update the product's thumbnail_url
        if not product.thumbnail_url:
            product.thumbnail_url = url

        # If this is a primary image, update the product's thumbnail_url
        if is_primary:
            product.thumbnail_url = url

        # Add to product's image_urls array if not already there
        if not product.image_urls:
            product.image_urls = [url]
        elif url not in product.image_urls:
            product.image_urls = product.image_urls + [url]

        db.session.commit()

        logger.info(f"Product image added successfully: {new_image.id} for product {product_id} by user {current_user_id}")

        return jsonify({
            "message": "Product image added successfully",
            "image": product_image_schema.dump(new_image)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding product image for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to add product image", "details": str(e)}), 500

@products_routes.route('/product-images/<int:image_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_image(image_id):
    """Get a specific product image by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate image_id
        if image_id <= 0:
            return jsonify({"error": "Invalid image ID"}), 400

        # Check if ProductImage model is available
        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        image = ProductImage.query.get_or_404(image_id)
        return jsonify(product_image_schema.dump(image)), 200

    except Exception as e:
        logger.error(f"Error retrieving product image {image_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve product image", "details": str(e)}), 500

@products_routes.route('/product-images/<int:image_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def update_product_image(image_id):
    """Update a product image."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate image_id
        if image_id <= 0:
            return jsonify({"error": "Invalid image ID"}), 400

        # Check if models are available
        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        current_user_id = get_jwt_identity()
        image = ProductImage.query.get_or_404(image_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields if provided
        if 'filename' in data:
            image.filename = data['filename'].strip()

        if 'original_name' in data:
            image.original_name = data['original_name'].strip()

        if 'url' in data:
            new_url = data['url'].strip()
            # Validate URL format
            if not new_url.startswith(('http://', 'https://')):
                return jsonify({"error": "Invalid image URL format"}), 400

            old_url = image.url
            image.url = new_url

            # Update product's image_urls and thumbnail_url if needed
            product = Product.query.get(image.product_id)
            if product:
                # Replace old URL in image_urls
                if product.image_urls and old_url in product.image_urls:
                    image_urls = product.image_urls.copy() if product.image_urls else []
                    try:
                        index = image_urls.index(old_url)
                        image_urls[index] = new_url
                        product.image_urls = image_urls
                    except ValueError:
                        # If old URL not found, add the new one
                        product.image_urls = image_urls + [new_url]

                # Update thumbnail_url if this image was being used
                if product.thumbnail_url == old_url:
                    product.thumbnail_url = new_url

        if 'size' in data:
            image.size = data['size']

        if 'alt_text' in data:
            image.alt_text = data['alt_text'].strip()

        if 'sort_order' in data:
            image.sort_order = data['sort_order']

        # Handle is_primary flag
        if 'is_primary' in data and data['is_primary'] != image.is_primary:
            if data['is_primary']:
                # Unset any existing primary image for this product
                ProductImage.query.filter_by(
                    product_id=image.product_id,
                    is_primary=True
                ).update({'is_primary': False})

                # Set this image as primary
                image.is_primary = True

                # Update product's thumbnail_url
                product = Product.query.get(image.product_id)
                if product:
                    product.thumbnail_url = image.url
            else:
                # If unsetting primary, only allow if there's another primary image
                other_primary = ProductImage.query.filter_by(
                    product_id=image.product_id,
                    is_primary=True
                ).filter(ProductImage.id != image_id).first()

                if other_primary:
                    image.is_primary = False
                else:
                    # Don't allow unsetting the only primary image
                    return jsonify({"error": "Cannot unset primary flag on the only primary image"}), 400

        image.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Product image updated successfully: {image_id} by user {current_user_id}")

        return jsonify({
            "message": "Product image updated successfully",
            "image": product_image_schema.dump(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating product image {image_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update product image", "details": str(e)}), 500

@products_routes.route('/product-images/<int:image_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_product_image(image_id):
    """Delete a product image."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate image_id
        if image_id <= 0:
            return jsonify({"error": "Invalid image ID"}), 400

        # Check if models are available
        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        current_user_id = get_jwt_identity()
        image = ProductImage.query.get_or_404(image_id)
        product = Product.query.get(image.product_id)

        # Store image info for logging
        image_url = image.url

        # If this is the primary image, find another image to make primary
        if image.is_primary and product:
            # Find another image to make primary
            another_image = ProductImage.query.filter_by(
                product_id=image.product_id
            ).filter(ProductImage.id != image_id).first()

            if another_image:
                another_image.is_primary = True
                product.thumbnail_url = another_image.url
            else:
                # If no other images, clear the thumbnail_url
                product.thumbnail_url = None

        # Remove the URL from product's image_urls
        if product and product.image_urls and image.url in product.image_urls:
            try:
                image_urls = product.image_urls.copy()
                image_urls.remove(image.url)
                product.image_urls = image_urls
            except (ValueError, AttributeError):
                # Handle case where image_urls is not a list or URL is not in the list
                pass

        # Delete the image
        db.session.delete(image)
        db.session.commit()

        logger.info(f"Product image deleted successfully: {image_id} ({image_url}) by user {current_user_id}")

        return jsonify({"message": "Product image deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting product image {image_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete product image", "details": str(e)}), 500

@products_routes.route('/<int:product_id>/images/reorder', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def reorder_product_images(product_id):
    """Reorder product images."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate product_id
        if product_id <= 0:
            return jsonify({"error": "Invalid product ID"}), 400

        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        # Ensure product exists
        product = Product.query.get_or_404(product_id)
        current_user_id = get_jwt_identity()

        data = request.get_json()

        # Validate required fields
        if not data or not isinstance(data.get('image_order'), list):
            return jsonify({"error": "Image order array is required"}), 400

        image_order = data['image_order']

        # Validate image_order structure
        for item in image_order:
            if not isinstance(item, dict) or 'id' not in item or 'sort_order' not in item:
                return jsonify({"error": "Invalid image order format"}), 400

        # Verify all image IDs belong to this product
        image_ids = [item['id'] for item in image_order]
        images = ProductImage.query.filter(
            ProductImage.id.in_(image_ids),
            ProductImage.product_id == product_id
        ).all()

        if len(images) != len(image_ids):
            return jsonify({"error": "Some image IDs do not belong to this product"}), 400

        # Update sort orders
        for item in image_order:
            image = next((img for img in images if img.id == item['id']), None)
            if image:
                image.sort_order = item['sort_order']
                image.updated_at = datetime.utcnow()

        db.session.commit()

        # Get updated images
        updated_images = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc()
        ).all()

        logger.info(f"Product images reordered successfully for product {product_id} by user {current_user_id}")

        return jsonify({
            "message": "Product images reordered successfully",
            "images": product_images_schema.dump(updated_images)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reordering product images for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to reorder product images", "details": str(e)}), 500

@products_routes.route('/<int:product_id>/images/set-primary/<int:image_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def set_primary_image(product_id, image_id):
    """Set a specific image as the primary image for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Validate IDs
        if product_id <= 0 or image_id <= 0:
            return jsonify({"error": "Invalid product or image ID"}), 400

        # Check if models are available
        if not hasattr(Product, 'query') or Product.query is None:
            return jsonify({"error": "Product model not available"}), 503

        if not hasattr(ProductImage, 'query') or ProductImage.query is None:
            return jsonify({"error": "ProductImage model not available"}), 503

        # Ensure product exists
        product = Product.query.get_or_404(product_id)
        current_user_id = get_jwt_identity()

        # Ensure image exists and belongs to this product
        image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first()
        if not image:
            return jsonify({"error": "Image not found or does not belong to this product"}), 404

        # Unset any existing primary image
        ProductImage.query.filter_by(
            product_id=image.product_id,
            is_primary=True
        ).update({'is_primary': False})

        # Set this image as primary
        image.is_primary = True
        image.updated_at = datetime.utcnow()

        # Update product's thumbnail_url
        product.thumbnail_url = image.url

        db.session.commit()

        logger.info(f"Primary image set successfully: image {image_id} for product {product_id} by user {current_user_id}")

        return jsonify({
            "message": "Primary image set successfully",
            "image": product_image_schema.dump(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting primary image {image_id} for product {product_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to set primary image", "details": str(e)}), 500
