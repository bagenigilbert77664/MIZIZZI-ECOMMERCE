from flask import Blueprint, jsonify, request
from app.models.models import Product, Category, Brand, db

public_routes = Blueprint('public', __name__)

@public_routes.route('/api/products', methods=['GET'])
def get_products():
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category_id = request.args.get('category_id', type=int)
        is_featured = request.args.get('is_featured', type=bool)
        is_sale = request.args.get('is_sale', type=bool)
        is_flash_sale = request.args.get('is_flash_sale', type=bool)
        is_luxury_deal = request.args.get('is_luxury_deal', type=bool)

        # Build query
        query = Product.query.filter(Product.is_active == True)

        if category_id:
            query = query.filter(Product.category_id == category_id)
        if is_featured:
            query = query.filter(Product.is_featured == True)
        if is_sale:
            query = query.filter(Product.is_sale == True)
        if is_flash_sale:
            query = query.filter(Product.is_flash_sale == True)
        if is_luxury_deal:
            query = query.filter(Product.is_luxury_deal == True)

        # Get paginated results
        products = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Convert to dict with proper image handling
        products_data = []
        for product in products.items:
            try:
                product_dict = product.to_dict()
                # Ensure image_urls is properly formatted
                if isinstance(product_dict.get('image_urls'), str):
                    try:
                        import json
                        product_dict['image_urls'] = json.loads(product_dict['image_urls'])
                    except:
                        product_dict['image_urls'] = [product_dict['image_urls']] if product_dict['image_urls'] else []
                elif not isinstance(product_dict.get('image_urls'), list):
                    product_dict['image_urls'] = []

                products_data.append(product_dict)
            except Exception as e:
                print(f"Error converting product {product.id} to dict: {e}")
                continue

        return jsonify({
            'success': True,
            'items': products_data,
            'pagination': {
                'page': products.page,
                'pages': products.pages,
                'per_page': products.per_page,
                'total': products.total,
                'has_next': products.has_next,
                'has_prev': products.has_prev
            }
        })

    except Exception as e:
        print(f"Error in get_products: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve products',
            'details': str(e)
        }), 500
