"""
Admin products routes for Mizizzi E-commerce platform.
Handles admin-only product management operations including CRUD, variants, and images.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from datetime import datetime
import re
import uuid

from app.configuration.extensions import db
from app.models.models import (
    Product, ProductVariant, ProductImage, Category, Brand,
    User, UserRole
)
from app.validations.validation import admin_required, validate_product_creation, validate_product_update

# Create blueprint for admin product routes
admin_products_routes = Blueprint('admin_products_routes', __name__, url_prefix='/api/admin/products')

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

def generate_slug(name):
    """Generate a URL-friendly slug from product name."""
    # Convert to lowercase and replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

def ensure_unique_slug(slug, product_id=None):
    """Ensure the slug is unique, adding a number suffix if needed."""
    original_slug = slug
    counter = 1

    while True:
        query = Product.query.filter_by(slug=slug)
        if product_id:
            query = query.filter(Product.id != product_id)

        if not query.first():
            return slug

        slug = f"{original_slug}-{counter}"
        counter += 1

        # Prevent infinite loops
        if counter > 1000:
            return f"{original_slug}-{str(uuid.uuid4())[:8]}"

def validate_integer_id(id_value, field_name="ID"):
    """Validate that an ID is a valid integer."""
    try:
        return int(id_value)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid {field_name}")

# ----------------------
# Health Check
# ----------------------

@admin_products_routes.route('/health', methods=['GET'])
@admin_required
def admin_health_check():
    """Health check endpoint for admin products service."""
    return jsonify({
        'status': 'ok',
        'service': 'admin_products_routes',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ----------------------
# Admin Products List
# ----------------------

@admin_products_routes.route('/', methods=['GET'])
@admin_required
def get_admin_products():
    """
    Get all products for admin with advanced filtering and sorting.
    Includes inactive and hidden products.
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
        is_active = request.args.get('is_active', type=bool)
        is_visible = request.args.get('is_visible', type=bool)
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query - admin can see all products
        query = Product.query

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

        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        if is_visible is not None:
            query = query.filter(Product.is_visible == is_visible)

        # Search functionality
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.short_description.ilike(search_term),
                    Product.sku.ilike(search_term)
                )
            )

        # Sorting
        valid_sort_fields = ['name', 'price', 'created_at', 'updated_at', 'stock', 'is_active', 'is_visible']
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

    except Exception as e:
        current_app.logger.error(f"Error getting admin products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Create Product
# ----------------------

@admin_products_routes.route('/', methods=['POST'])
@admin_required
@validate_product_creation()
def create_product():
    """Create a new product."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Product name is required'}), 400

        if not data.get('price'):
            return jsonify({'error': 'Product price is required'}), 400

        # Validate price
        try:
            price = float(data['price'])
            if price < 0:
                return jsonify({'error': 'Price cannot be negative'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid price format'}), 400

        # Generate slug if not provided
        if not data.get('slug'):
            data['slug'] = generate_slug(data['name'])

        # Ensure slug is unique
        data['slug'] = ensure_unique_slug(data['slug'])

        # Create product instance
        product = Product()

        # Set basic fields
        product.name = data['name']
        product.slug = data['slug']
        product.description = data.get('description')
        product.price = price
        product.sale_price = data.get('sale_price')
        product.stock = data.get('stock', 0)
        product.category_id = data.get('category_id')
        product.brand_id = data.get('brand_id')
        product.sku = data.get('sku')
        product.weight = data.get('weight')
        product.dimensions = data.get('dimensions')
        product.meta_title = data.get('meta_title')
        product.meta_description = data.get('meta_description')
        product.short_description = data.get('short_description')
        product.specifications = data.get('specifications')
        product.warranty_info = data.get('warranty_info')
        product.shipping_info = data.get('shipping_info')
        product.availability_status = data.get('availability_status')
        product.min_order_quantity = data.get('min_order_quantity', 1)
        product.max_order_quantity = data.get('max_order_quantity')
        product.discount_percentage = data.get('discount_percentage')
        product.tax_rate = data.get('tax_rate')
        product.tax_class = data.get('tax_class')
        product.barcode = data.get('barcode')
        product.manufacturer = data.get('manufacturer')
        product.country_of_origin = data.get('country_of_origin')
        product.canonical_url = data.get('canonical_url')
        product.condition = data.get('condition')
        product.video_url = data.get('video_url')
        product.preorder_release_date = data.get('preorder_release_date')
        product.preorder_message = data.get('preorder_message')
        product.badge_text = data.get('badge_text')
        product.badge_color = data.get('badge_color')
        product.sort_order = data.get('sort_order')

        # Set boolean fields
        product.is_featured = data.get('is_featured', False)
        product.is_new = data.get('is_new', True)
        product.is_sale = data.get('is_sale', False)
        product.is_flash_sale = data.get('is_flash_sale', False)
        product.is_luxury_deal = data.get('is_luxury_deal', False)
        product.is_active = data.get('is_active', True)
        product.is_digital = data.get('is_digital', False)
        product.is_taxable = data.get('is_taxable', True)
        product.is_shippable = data.get('is_shippable', True)
        product.requires_shipping = data.get('requires_shipping', True)
        product.is_gift_card = data.get('is_gift_card', False)
        product.is_customizable = data.get('is_customizable', False)
        product.is_visible = data.get('is_visible', True)
        product.is_searchable = data.get('is_searchable', True)
        product.is_comparable = data.get('is_comparable', True)
        product.is_preorder = data.get('is_preorder', False)

        # Set array fields using helper methods
        if 'image_urls' in data:
            product.set_image_urls(data['image_urls'])

        if 'related_products' in data:
            product.set_related_products(data['related_products'])

        if 'cross_sell_products' in data:
            product.set_cross_sell_products(data['cross_sell_products'])

        if 'up_sell_products' in data:
            product.set_up_sell_products(data['up_sell_products'])

        if 'seo_keywords' in data:
            product.set_seo_keywords(data['seo_keywords'])

        # Set other fields
        product.thumbnail_url = data.get('thumbnail_url')
        product.download_link = data.get('download_link')
        product.download_expiry_days = data.get('download_expiry_days')
        product.gift_card_value = data.get('gift_card_value')
        product.customization_options = data.get('customization_options')

        # Add to database
        db.session.add(product)
        db.session.flush()  # Get the ID without committing

        # Handle variants if provided
        if 'variants' in data and data['variants']:
            for variant_data in data['variants']:
                variant = ProductVariant(
                    product_id=product.id,
                    color=variant_data.get('color'),
                    size=variant_data.get('size'),
                    price=variant_data.get('price', product.price),
                    sale_price=variant_data.get('sale_price'),
                    stock=variant_data.get('stock', 0),
                    sku=variant_data.get('sku'),
                    image_url=variant_data.get('image_url')
                )
                db.session.add(variant)

        # Handle images if provided
        if 'images' in data and data['images']:
            for i, image_data in enumerate(data['images']):
                image = ProductImage(
                    product_id=product.id,
                    filename=image_data.get('filename', f'image_{i+1}'),
                    url=image_data['url'],
                    alt_text=image_data.get('alt_text'),
                    is_primary=image_data.get('is_primary', i == 0),
                    sort_order=image_data.get('sort_order', i)
                )
                db.session.add(image)

        db.session.commit()

        current_app.logger.info(f"Product created by admin {get_jwt_identity()}: {product.id}")

        # Return created product
        return jsonify({
            'message': 'Product created successfully',
            'product': serialize_product(product, include_variants=True, include_images=True)
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Integrity error creating product: {str(e)}")
        if 'slug' in str(e):
            return jsonify({'error': 'Product with this slug already exists'}), 400
        return jsonify({'error': 'Product creation failed due to data conflict'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating product: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Update Product
# ----------------------

@admin_products_routes.route('/<product_id>', methods=['PUT'])
@admin_required
@validate_product_update(lambda: request.view_args.get('product_id'))
def update_product(product_id):
    """Update a product."""
    try:
        # Validate product ID
        try:
            product_id = validate_integer_id(product_id, "Product ID")
        except ValueError:
            return jsonify({'error': 'Invalid product ID'}), 400

        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate price if provided
        if 'price' in data:
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({'error': 'Price cannot be negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid price format'}), 400

        # Handle slug update
        if 'slug' in data and data['slug'] != product.slug:
            # Check if the new slug conflicts with existing products
            existing_product = Product.query.filter(
                and_(Product.slug == data['slug'], Product.id != product_id)
            ).first()
            if existing_product:
                return jsonify({'error': 'Product with this slug already exists'}), 400

            # If no conflict, ensure it's unique (in case of edge cases)
            data['slug'] = ensure_unique_slug(data['slug'], product_id)

        # Update basic fields
        for field in ['name', 'slug', 'description', 'price', 'sale_price', 'stock',
                     'category_id', 'brand_id', 'sku', 'weight', 'dimensions',
                     'meta_title', 'meta_description', 'short_description',
                     'specifications', 'warranty_info', 'shipping_info',
                     'availability_status', 'min_order_quantity', 'max_order_quantity',
                     'discount_percentage', 'tax_rate', 'tax_class', 'barcode',
                     'manufacturer', 'country_of_origin', 'canonical_url', 'condition',
                     'video_url', 'preorder_release_date', 'preorder_message',
                     'badge_text', 'badge_color', 'sort_order', 'thumbnail_url',
                     'download_link', 'download_expiry_days', 'gift_card_value',
                     'customization_options']:
            if field in data:
                setattr(product, field, data[field])

        # Update boolean fields
        for field in ['is_featured', 'is_new', 'is_sale', 'is_flash_sale',
                     'is_luxury_deal', 'is_active', 'is_digital', 'is_taxable',
                     'is_shippable', 'requires_shipping', 'is_gift_card',
                     'is_customizable', 'is_visible', 'is_searchable',
                     'is_comparable', 'is_preorder']:
            if field in data:
                setattr(product, field, data[field])

        # Update array fields using helper methods
        if 'image_urls' in data:
            product.set_image_urls(data['image_urls'])

        if 'related_products' in data:
            product.set_related_products(data['related_products'])

        if 'cross_sell_products' in data:
            product.set_cross_sell_products(data['cross_sell_products'])

        if 'up_sell_products' in data:
            product.set_up_sell_products(data['up_sell_products'])

        if 'seo_keywords' in data:
            product.set_seo_keywords(data['seo_keywords'])

        product.updated_at = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"Product updated by admin {get_jwt_identity()}: {product_id}")

        return jsonify({
            'message': 'Product updated successfully',
            'product': serialize_product(product, include_variants=True, include_images=True)
        }), 200

    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Integrity error updating product: {str(e)}")
        if 'slug' in str(e):
            return jsonify({'error': 'Product with this slug already exists'}), 400
        return jsonify({'error': 'Product update failed due to data conflict'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Delete Product
# ----------------------

@admin_products_routes.route('/<product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    """Delete a product (soft delete by setting is_active to False)."""
    try:
        # Validate product ID
        try:
            product_id = validate_integer_id(product_id, "Product ID")
        except ValueError:
            return jsonify({'error': 'Invalid product ID'}), 400

        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Soft delete by setting is_active to False
        product.is_active = False
        product.updated_at = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"Product soft deleted by admin {get_jwt_identity()}: {product_id}")

        return jsonify({'message': 'Product deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/<product_id>/restore', methods=['POST'])
@admin_required
def restore_product(product_id):
    """Restore a soft-deleted product."""
    try:
        # Validate product ID
        try:
            product_id = validate_integer_id(product_id, "Product ID")
        except ValueError:
            return jsonify({'error': 'Invalid product ID'}), 400

        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Restore by setting is_active to True
        product.is_active = True
        product.updated_at = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"Product restored by admin {get_jwt_identity()}: {product_id}")

        return jsonify({
            'message': 'Product restored successfully',
            'product': serialize_product(product)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error restoring product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Product Variants Management
# ----------------------

@admin_products_routes.route('/<int:product_id>/variants', methods=['POST'])
@admin_required
def create_product_variant(product_id):
    """Create a new product variant."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required price field
        if 'price' not in data or data['price'] is None:
            return jsonify({'error': 'Price is required for product variant'}), 400

        # Validate price
        try:
            price = float(data['price'])
            if price < 0:
                return jsonify({'error': 'Price cannot be negative'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid price format'}), 400

        # Create variant
        variant = ProductVariant(
            product_id=product_id,
            color=data.get('color'),
            size=data.get('size'),
            price=price,
            sale_price=data.get('sale_price'),
            stock=data.get('stock', 0),
            sku=data.get('sku'),
            image_url=data.get('image_url')
        )

        db.session.add(variant)
        db.session.commit()

        current_app.logger.info(f"Product variant created by admin {get_jwt_identity()}: {variant.id}")

        return jsonify({
            'message': 'Product variant created successfully',
            'variant': serialize_variant(variant)
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating variant for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/variants/<int:variant_id>', methods=['PUT'])
@admin_required
def update_product_variant(variant_id):
    """Update a product variant."""
    try:
        variant = db.session.get(ProductVariant, variant_id)

        if not variant:
            return jsonify({'error': 'Variant not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update variant fields
        for field in ['color', 'size', 'price', 'sale_price', 'stock', 'sku', 'image_url']:
            if field in data:
                setattr(variant, field, data[field])

        variant.updated_at = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"Product variant updated by admin {get_jwt_identity()}: {variant_id}")

        return jsonify({
            'message': 'Product variant updated successfully',
            'variant': serialize_variant(variant)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating variant {variant_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/variants/<int:variant_id>', methods=['DELETE'])
@admin_required
def delete_product_variant(variant_id):
    """Delete a product variant."""
    try:
        variant = db.session.get(ProductVariant, variant_id)

        if not variant:
            return jsonify({'error': 'Variant not found'}), 404

        db.session.delete(variant)
        db.session.commit()

        current_app.logger.info(f"Product variant deleted by admin {get_jwt_identity()}: {variant_id}")

        return jsonify({'message': 'Product variant deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting variant {variant_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Product Images Management
# ----------------------

@admin_products_routes.route('/<int:product_id>/images', methods=['POST'])
@admin_required
def add_product_image(product_id):
    """Add an image to a product."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if not data.get('url'):
            return jsonify({'error': 'Image URL is required'}), 400

        if not data.get('filename'):
            return jsonify({'error': 'Filename is required'}), 400

        # Validate URL format
        if not data['url'].startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid URL format'}), 400

        # Create image
        image = ProductImage(
            product_id=product_id,
            filename=data['filename'],
            url=data['url'],
            alt_text=data.get('alt_text'),
            is_primary=data.get('is_primary', False),
            sort_order=data.get('sort_order', 0)
        )

        # If this is set as primary, unset other primary images
        if image.is_primary:
            ProductImage.query.filter_by(product_id=product_id, is_primary=True).update({'is_primary': False})

        db.session.add(image)
        db.session.commit()

        current_app.logger.info(f"Product image added by admin {get_jwt_identity()}: {image.id}")

        return jsonify({
            'message': 'Product image added successfully',
            'image': serialize_image(image)
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding image to product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/product-images/<int:image_id>', methods=['PUT', 'PATCH'])
@admin_required
def update_product_image(image_id):
    """Update a product image."""
    try:
        image = db.session.get(ProductImage, image_id)

        if not image:
            return jsonify({'error': 'Image not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update image fields
        for field in ['filename', 'url', 'alt_text', 'is_primary', 'sort_order']:
            if field in data:
                setattr(image, field, data[field])

        # If this is set as primary, unset other primary images for the same product
        if data.get('is_primary'):
            ProductImage.query.filter(
                and_(
                    ProductImage.product_id == image.product_id,
                    ProductImage.id != image.id
                )
            ).update({'is_primary': False})

        image.updated_at = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"Product image updated by admin {get_jwt_identity()}: {image_id}")

        return jsonify({
            'message': 'Product image updated successfully',
            'image': serialize_image(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating image {image_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/product-images/<int:image_id>', methods=['DELETE'])
@admin_required
def delete_product_image(image_id):
    """Delete a product image."""
    try:
        image = db.session.get(ProductImage, image_id)

        if not image:
            return jsonify({'error': 'Image not found'}), 404

        db.session.delete(image)
        db.session.commit()

        current_app.logger.info(f"Product image deleted by admin {get_jwt_identity()}: {image_id}")

        return jsonify({'message': 'Product image deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting image {image_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Image Management
# ----------------------

@admin_products_routes.route('/<int:product_id>/images/reorder', methods=['POST'])
@admin_required
def reorder_product_images(product_id):
    """Reorder product images."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        data = request.get_json()

        if not data or 'image_orders' not in data:
            return jsonify({'error': 'Image orders data is required'}), 400

        # Update sort orders
        for order_data in data['image_orders']:
            image_id = order_data.get('id')
            sort_order = order_data.get('sort_order')

            if image_id and sort_order is not None:
                image = ProductImage.query.filter_by(
                    id=image_id,
                    product_id=product_id
                ).first()

                if image:
                    image.sort_order = sort_order
                    image.updated_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(f"Product images reordered by admin {get_jwt_identity()}: {product_id}")

        return jsonify({'message': 'Product images reordered successfully'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error reordering images for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/<product_id>/images/set-primary/<image_id>', methods=['POST'])
@admin_required
def set_primary_image(product_id, image_id):
    """Set an image as the primary image for a product."""
    try:
        # Validate IDs
        try:
            product_id = validate_integer_id(product_id, "Product ID")
            image_id = validate_integer_id(image_id, "Image ID")
        except ValueError:
            return jsonify({'error': 'Invalid product or image ID'}), 400

        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if image belongs to this product
        image = ProductImage.query.filter_by(
            id=image_id,
            product_id=product_id
        ).first()

        if not image:
            return jsonify({'error': 'Image not found or does not belong to this product'}), 404

        # Unset all primary images for this product
        ProductImage.query.filter_by(product_id=product_id).update({'is_primary': False})

        # Set this image as primary
        image.is_primary = True
        image.updated_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(f"Primary image set by admin {get_jwt_identity()}: image {image_id} for product {product_id}")

        return jsonify({'message': 'Primary image set successfully'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error setting primary image {image_id} for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Bulk Operations
# ----------------------

@admin_products_routes.route('/bulk/update', methods=['POST'])
@admin_required
def bulk_update_products():
    """Bulk update multiple products."""
    try:
        data = request.get_json()

        if not data or 'product_ids' not in data or 'updates' not in data:
            return jsonify({'error': 'Product IDs and updates are required'}), 400

        product_ids = data['product_ids']
        updates = data['updates']

        if not isinstance(product_ids, list) or not product_ids:
            return jsonify({'error': 'Product IDs must be a non-empty list'}), 400

        # Validate product IDs
        try:
            product_ids = [int(pid) for pid in product_ids]
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid product ID format'}), 400

        # Get products
        products = Product.query.filter(Product.id.in_(product_ids)).all()

        if len(products) != len(product_ids):
            return jsonify({'error': 'Some products not found'}), 404

        # Apply updates
        updated_count = 0
        for product in products:
            for field, value in updates.items():
                if hasattr(product, field):
                    setattr(product, field, value)
                    updated_count += 1
            product.updated_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(f"Bulk update performed by admin {get_jwt_identity()}: {len(products)} products")

        return jsonify({
            'message': f'Successfully updated {len(products)} products',
            'updated_count': updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in bulk update: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@admin_products_routes.route('/bulk/delete', methods=['POST'])
@admin_required
def bulk_delete_products():
    """Bulk soft delete multiple products."""
    try:
        data = request.get_json()

        if not data or 'product_ids' not in data:
            return jsonify({'error': 'Product IDs are required'}), 400

        product_ids = data['product_ids']

        if not isinstance(product_ids, list) or not product_ids:
            return jsonify({'error': 'Product IDs must be a non-empty list'}), 400

        # Validate product IDs
        try:
            product_ids = [int(pid) for pid in product_ids]
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid product ID format'}), 400

        # Update products to inactive
        updated_count = Product.query.filter(Product.id.in_(product_ids)).update(
            {'is_active': False, 'updated_at': datetime.utcnow()},
            synchronize_session=False
        )

        db.session.commit()

        current_app.logger.info(f"Bulk delete performed by admin {get_jwt_identity()}: {updated_count} products")

        return jsonify({
            'message': f'Successfully deleted {updated_count} products'
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in bulk delete: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# Product Statistics
# ----------------------

@admin_products_routes.route('/stats', methods=['GET'])
@admin_required
def get_product_stats():
    """Get product statistics for admin dashboard."""
    try:
        stats = {
            'total_products': Product.query.count(),
            'active_products': Product.query.filter_by(is_active=True).count(),
            'inactive_products': Product.query.filter_by(is_active=False).count(),
            'featured_products': Product.query.filter_by(is_featured=True, is_active=True).count(),
            'new_products': Product.query.filter_by(is_new=True, is_active=True).count(),
            'sale_products': Product.query.filter_by(is_sale=True, is_active=True).count(),
            'flash_sale_products': Product.query.filter_by(is_flash_sale=True, is_active=True).count(),
            'luxury_deal_products': Product.query.filter_by(is_luxury_deal=True, is_active=True).count(),
            'out_of_stock': Product.query.filter(Product.stock <= 0, Product.is_active == True).count(),
            'low_stock': Product.query.filter(Product.stock <= 10, Product.stock > 0, Product.is_active == True).count()
        }

        return jsonify(stats), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product stats: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# OPTIONS handlers for CORS
# ----------------------

@admin_products_routes.route('/', methods=['OPTIONS'])
@admin_products_routes.route('/<product_id>', methods=['OPTIONS'])
@admin_products_routes.route('/<product_id>/restore', methods=['OPTIONS'])
@admin_products_routes.route('/<int:product_id>/variants', methods=['OPTIONS'])
@admin_products_routes.route('/variants/<int:variant_id>', methods=['OPTIONS'])
@admin_products_routes.route('/<int:product_id>/images', methods=['OPTIONS'])
@admin_products_routes.route('/product-images/<int:image_id>', methods=['OPTIONS'])
@admin_products_routes.route('/<int:product_id>/images/reorder', methods=['OPTIONS'])
@admin_products_routes.route('/<product_id>/images/set-primary/<image_id>', methods=['OPTIONS'])
@admin_products_routes.route('/bulk/update', methods=['OPTIONS'])
@admin_products_routes.route('/bulk/delete', methods=['OPTIONS'])
@admin_products_routes.route('/stats', methods=['OPTIONS'])
def handle_options():
    """Handle OPTIONS requests for CORS."""
    return '', 200
