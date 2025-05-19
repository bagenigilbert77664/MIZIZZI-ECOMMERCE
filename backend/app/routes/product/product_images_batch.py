from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from backend.app.models.models import ProductImage, db
from backend.app.configuration.extensions import cache

# Create a blueprint for batch image operations
product_images_batch_bp = Blueprint('product_images_batch', __name__)

@product_images_batch_bp.route('/api/product-images/batch', methods=['OPTIONS'])
@cross_origin(origins=["*"], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def handle_preflight():
    """Handle preflight OPTIONS requests for CORS"""
    return '', 204

@product_images_batch_bp.route('/api/product-images/batch', methods=['POST'])
@cross_origin(origins=["*"], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def batch_product_images():
    """
    Fetch images for multiple products in a single request

    Request body:
    {
        "product_ids": ["123", "456", "789"]
    }

    Response:
    {
        "images": {
            "123": [{"id": "img1", "url": "url1", ...}, ...],
            "456": [{"id": "img2", "url": "url2", ...}, ...],
            ...
        }
    }
    """
    try:
        data = request.get_json()

        if not data or 'product_ids' not in data:
            return jsonify({"error": "Missing product_ids in request body"}), 400

        product_ids = data['product_ids']

        if not isinstance(product_ids, list):
            return jsonify({"error": "product_ids must be an array"}), 400

        # Convert all IDs to strings for consistent comparison
        product_ids = [str(pid) for pid in product_ids]

        # Limit the number of products that can be requested at once
        if len(product_ids) > 50:
            return jsonify({"error": "Too many product IDs. Maximum is 50."}), 400

        # Create a cache key based on the sorted product IDs
        cache_key = f"batch_images_{'_'.join(sorted(product_ids))}"

        # Try to get from cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            return jsonify(cached_result)

        # If not in cache, query the database
        result = {"images": {}}

        # Query all images for the requested products at once
        images = ProductImage.query.filter(
            ProductImage.product_id.in_([int(pid) for pid in product_ids])
        ).order_by(ProductImage.sort_order).all()

        # Group images by product_id
        for image in images:
            product_id = str(image.product_id)
            if product_id not in result["images"]:
                result["images"][product_id] = []

            # Convert image to dict
            image_dict = {
                "id": str(image.id),
                "product_id": str(image.product_id),
                "url": image.url,
                "filename": image.filename if hasattr(image, 'filename') else "",
                "is_primary": image.is_primary if hasattr(image, 'is_primary') else False,
                "sort_order": image.sort_order if hasattr(image, 'sort_order') else 0,
                "position": image.sort_order if hasattr(image, 'sort_order') else 0,
            }

            result["images"][product_id].append(image_dict)

        # Add empty arrays for products with no images
        for pid in product_ids:
            if pid not in result["images"]:
                result["images"][pid] = []

        # Cache the result for 5 minutes
        cache.set(cache_key, result, timeout=300)

        return jsonify(result)

    except Exception as e:
        print(f"Error in batch_product_images: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Register the batch endpoint with alternative URLs for better compatibility
@product_images_batch_bp.route('/api/products/images/batch', methods=['OPTIONS', 'POST'])
@cross_origin(origins=["*"], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def batch_product_images_alt1():
    """Alternative URL for batch product images"""
    if request.method == 'OPTIONS':
        return '', 204
    return batch_product_images()

@product_images_batch_bp.route('/api/batch/product-images', methods=['OPTIONS', 'POST'])
@cross_origin(origins=["*"], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def batch_product_images_alt2():
    """Alternative URL for batch product images"""
    if request.method == 'OPTIONS':
        return '', 204
    return batch_product_images()

@product_images_batch_bp.route('/api/images/batch', methods=['OPTIONS', 'POST'])
@cross_origin(origins=["*"], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def batch_product_images_alt3():
    """Alternative URL for batch product images"""
    if request.method == 'OPTIONS':
        return '', 204
    return batch_product_images()
