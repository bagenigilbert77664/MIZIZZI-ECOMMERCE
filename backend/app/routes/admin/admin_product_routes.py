"""
Admin Product Routes for Mizizzi E-Commerce Backend
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from ...models.models import Product, Category, Brand, db, User, UserRole, ProductImage
import json
from datetime import datetime
import werkzeug
import uuid
import os
from flask import current_app
from flask_cors import cross_origin

admin_product_routes = Blueprint('admin_products', __name__)

def admin_required():
    """Decorator to check if user has admin role"""
    current_user_id = get_jwt_identity()
    if not current_user_id:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        user = User.query.get(current_user_id)
        if not user or user.role != UserRole.ADMIN:
            return jsonify({'error': 'Admin access required'}), 403
        return None
    except Exception as e:
        return jsonify({'error': 'Database error during authentication'}), 500

def handle_options(allowed_methods):
    """Standard OPTIONS response handler for CORS."""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', allowed_methods)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@admin_product_routes.route('/api/admin/products', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_product():
    """Create a new product"""
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
        required_fields = ['name', 'price', 'category_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        # Check if category exists
        category = Category.query.get(data['category_id'])
        if not category:
            return jsonify({'error': 'Invalid category'}), 400

        # Check if brand exists (if provided)
        if data.get('brand_id'):
            brand = Brand.query.get(data['brand_id'])
            if not brand:
                return jsonify({'error': 'Invalid brand'}), 400

        # Handle tags - convert list to JSON string for storage
        tags_json = None
        if data.get('tags'):
            if isinstance(data['tags'], list):
                tags_json = json.dumps(data['tags'])
            elif isinstance(data['tags'], str):
                tags_json = data['tags']

        # Handle image_urls - convert list to JSON string for storage
        image_urls_json = None
        if data.get('image_urls'):
            if isinstance(data['image_urls'], list):
                image_urls_json = json.dumps(data['image_urls'])
            elif isinstance(data['image_urls'], str):
                image_urls_json = data['image_urls']

        # Create new product
        product = Product(
            name=data['name'],
            slug=data.get('slug', data['name'].lower().replace(' ', '-')),
            description=data.get('description', ''),
            price=float(data['price']),
            sale_price=float(data['sale_price']) if data.get('sale_price') else None,
            stock=int(data.get('stock', 0)),
            category_id=int(data['category_id']),
            brand_id=int(data['brand_id']) if data.get('brand_id') else None,
            sku=data.get('sku', f"SKU-{datetime.now().timestamp()}"),
            weight=float(data['weight']) if data.get('weight') else None,
            is_featured=bool(data.get('is_featured', False)),
            is_new=bool(data.get('is_new', True)),
            is_sale=bool(data.get('is_sale', False)),
            is_flash_sale=bool(data.get('is_flash_sale', False)),
            is_luxury_deal=bool(data.get('is_luxury_deal', False)),
            meta_title=data.get('meta_title', ''),
            meta_description=data.get('meta_description', ''),
            image_urls=image_urls_json,
            thumbnail_url=data.get('thumbnail_url'),
            tags=tags_json
        )

        # Add to database
        db.session.add(product)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Product created successfully',
            'product': product.to_dict()
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Product with this name or SKU already exists'}), 409
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to create product',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_products():
    """Get all products with pagination and filtering"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        featured = request.args.get('featured', type=bool)
        new = request.args.get('new', type=bool)
        sale = request.args.get('sale', type=bool)
        flash_sale = request.args.get('flash_sale', type=bool)
        luxury_deal = request.args.get('luxury_deal', type=bool)

        # Build query
        query = Product.query

        # Apply filters
        if search:
            query = query.filter(Product.name.ilike(f'%{search}%'))

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if brand_id:
            query = query.filter(Product.brand_id == brand_id)

        if featured is not None:
            query = query.filter(Product.is_featured == featured)

        if new is not None:
            query = query.filter(Product.is_new == new)

        if sale is not None:
            query = query.filter(Product.is_sale == sale)

        if flash_sale is not None:
            query = query.filter(Product.is_flash_sale == flash_sale)

        if luxury_deal is not None:
            query = query.filter(Product.is_luxury_deal == luxury_deal)

        # Order by creation date (newest first)
        query = query.order_by(Product.created_at.desc())

        # Paginate
        products = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'items': [product.to_dict() for product in products.items],
            'pagination': {
                'page': products.page,
                'per_page': products.per_page,
                'total': products.total,
                'pages': products.pages,
                'has_next': products.has_next,
                'has_prev': products.has_prev
            }
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch products',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_product(product_id):
    """Get a single product by ID"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        return jsonify(product.to_dict()), 200
    except Exception as e:
        print(f"Error fetching product {product_id}: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch product',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products/<int:product_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_product(product_id):
    """Update a product"""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update fields if provided
        if 'name' in data:
            product.name = data['name']

        if 'slug' in data:
            product.slug = data['slug']

        if 'description' in data:
            product.description = data['description']

        if 'price' in data:
            product.price = float(data['price'])

        if 'sale_price' in data:
            product.sale_price = float(data['sale_price']) if data['sale_price'] else None

        if 'stock' in data:
            product.stock = int(data['stock'])

        if 'category_id' in data:
            # Validate category exists
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({'error': 'Invalid category'}), 400
            product.category_id = int(data['category_id'])

        if 'brand_id' in data:
            if data['brand_id']:
                # Validate brand exists
                brand = Brand.query.get(data['brand_id'])
                if not brand:
                    return jsonify({'error': 'Invalid brand'}), 400
                product.brand_id = int(data['brand_id'])
            else:
                product.brand_id = None

        if 'sku' in data:
            product.sku = data['sku']

        if 'weight' in data:
            product.weight = float(data['weight']) if data['weight'] else None

        if 'is_featured' in data:
            product.is_featured = bool(data['is_featured'])

        if 'is_new' in data:
            product.is_new = bool(data['is_new'])

        if 'is_sale' in data:
            product.is_sale = bool(data['is_sale'])

        if 'is_flash_sale' in data:
            product.is_flash_sale = bool(data['is_flash_sale'])

        if 'is_luxury_deal' in data:
            product.is_luxury_deal = bool(data['is_luxury_deal'])

        if 'meta_title' in data:
            product.meta_title = data['meta_title']

        if 'meta_description' in data:
            product.meta_description = data['meta_description']

        if 'image_urls' in data:
            if isinstance(data['image_urls'], list):
                product.image_urls = json.dumps(data['image_urls'])
            else:
                product.image_urls = data['image_urls']

        if 'thumbnail_url' in data:
            product.thumbnail_url = data['thumbnail_url']

        if 'tags' in data:
            if isinstance(data['tags'], list):
                product.tags = json.dumps(data['tags'])
            else:
                product.tags = data['tags']

        # Update timestamp
        product.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Product updated successfully',
            'product': product.to_dict()
        }), 200

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Product with this name or SKU already exists'}), 409
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update product',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products/<int:product_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_product(product_id):
    """Delete a product"""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        product = Product.query.get_or_404(product_id)

        # Store product name for response
        product_name = product.name

        # Delete the product
        db.session.delete(product)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Product "{product_name}" deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to delete product',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products/<int:product_id>/images', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_product_images(product_id):
    """Get images for a specific product"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Get images from ProductImage table
        images = []
        try:
            # Use direct SQL query to avoid any model issues
            from sqlalchemy import text
            query = text("""
                SELECT id, product_id, filename, original_name, url, size,
                       is_primary, sort_order, alt_text, uploaded_by,
                       created_at, updated_at
                FROM product_images
                WHERE product_id = :product_id
                ORDER BY sort_order ASC, id ASC
            """)

            result = db.session.execute(query, {'product_id': product_id})
            rows = result.fetchall()

            for row in rows:
                image_data = {
                    'id': row[0],
                    'product_id': row[1],
                    'filename': row[2],
                    'original_name': row[3],
                    'url': row[4],
                    'size': row[5],
                    'is_primary': row[6],
                    'sort_order': row[7],
                    'alt_text': row[8],
                    'uploaded_by': row[9],
                    'created_at': row[10].isoformat() if row[10] else None,
                    'updated_at': row[11].isoformat() if row[11] else None
                }
                images.append(image_data)

        except Exception as e:
            print(f"Error accessing ProductImage table with SQL: {str(e)}")
            # Fallback to product.image_urls if available
            if product.image_urls:
                try:
                    if isinstance(product.image_urls, str):
                        image_urls = json.loads(product.image_urls)
                    else:
                        image_urls = product.image_urls

                    images = [{'url': url, 'alt_text': f'{product.name} image'} for url in image_urls]
                except:
                    images = []

        return jsonify({
            'success': True,
            'images': images,
            'total_count': len(images),
            'thumbnail_url': product.thumbnail_url
        }), 200

    except Exception as e:
        print(f"Error fetching images for product {product_id}: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch product images',
            'details': str(e)
        }), 500

@admin_product_routes.route('/api/admin/products/<int:product_id>/image', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_product_image(product_id):
    """Get the main image for a product"""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Return the thumbnail URL or first image URL
        image_url = product.thumbnail_url

        if not image_url and product.image_urls:
            try:
                if isinstance(product.image_urls, str):
                    image_urls = json.loads(product.image_urls)
                    if image_urls and len(image_urls) > 0:
                        image_url = image_urls[0]
                elif isinstance(product.image_urls, list) and len(product.image_urls) > 0:
                    image_url = product.image_urls[0]
            except:
                pass

        return jsonify({
            'url': image_url or '/placeholder.svg'
        }), 200

    except Exception as e:
        print(f"Error fetching image for product {product_id}: {str(e)}")
        return jsonify({
            'url': '/placeholder.svg'
        }), 200
