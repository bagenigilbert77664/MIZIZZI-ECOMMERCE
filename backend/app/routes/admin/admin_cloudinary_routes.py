"""
Admin routes for Cloudinary image management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import logging

from ...models.models import Product, User, UserRole, ProductImage, db
from ...services.cloudinary_service import cloudinary_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

admin_cloudinary_routes = Blueprint('admin_cloudinary', __name__)

def admin_required():
    """Check if user has admin role"""
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

@admin_cloudinary_routes.route('/api/admin/products/<int:product_id>/images/upload', methods=['POST'])
@jwt_required()
def upload_product_images(product_id):
    """Upload images for a product to Cloudinary"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if files were uploaded
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400

        files = request.files.getlist('images')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'error': 'No images selected'}), 400

        # Get additional parameters
        primary_index = int(request.form.get('primary_index', 0))
        alt_text_prefix = request.form.get('alt_text', product.name)

        current_user_id = get_jwt_identity()
        uploaded_images = []
        errors = []

        # Get current image count for sort order
        current_image_count = ProductImage.query.filter_by(product_id=product_id).count()

        for index, file in enumerate(files):
            try:
                # Upload to Cloudinary
                is_primary = index == primary_index and current_image_count == 0
                alt_text = f"{alt_text_prefix} - Image {index + 1}"

                cloudinary_result = cloudinary_service.upload_product_image(
                    file=file,
                    product_id=product_id,
                    is_primary=is_primary,
                    alt_text=alt_text
                )

                if cloudinary_result['success']:
                    # Create database record
                    product_image = ProductImage.create_from_cloudinary_result(
                        product_id=product_id,
                        cloudinary_result=cloudinary_result,
                        uploaded_by=current_user_id,
                        is_primary=is_primary,
                        sort_order=current_image_count + index
                    )

                    db.session.add(product_image)
                    uploaded_images.append(product_image.to_dict())

                    # Update product thumbnail if this is the first/primary image
                    if is_primary or (not product.thumbnail_url and index == 0):
                        product.thumbnail_url = cloudinary_result['secure_url']

                else:
                    errors.append({
                        'file': file.filename,
                        'error': cloudinary_result['error']
                    })

            except Exception as e:
                logger.error(f"Error uploading image {file.filename}: {str(e)}")
                errors.append({
                    'file': file.filename,
                    'error': str(e)
                })

        # Commit database changes
        if uploaded_images:
            db.session.commit()

            # Update product's image_urls field for backward compatibility
            all_images = ProductImage.query.filter_by(product_id=product_id).order_by(
                ProductImage.is_primary.desc(),
                ProductImage.sort_order
            ).all()

            product.image_urls = [img.cloudinary_secure_url for img in all_images]
            db.session.commit()

        response = {
            'success': len(uploaded_images) > 0,
            'uploaded_images': uploaded_images,
            'total_uploaded': len(uploaded_images),
            'errors': errors,
            'product_id': product_id
        }

        if errors:
            response['message'] = f"Uploaded {len(uploaded_images)} images with {len(errors)} errors"
        else:
            response['message'] = f"Successfully uploaded {len(uploaded_images)} images"

        return jsonify(response), 200 if uploaded_images else 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in upload_product_images: {str(e)}")
        return jsonify({
            'error': 'Failed to upload images',
            'details': str(e)
        }), 500

@admin_cloudinary_routes.route('/api/admin/products/<int:product_id>/images', methods=['GET'])
@jwt_required()
def get_product_images(product_id):
    """Get all images for a product"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Get images from database
        images = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order
        ).all()

        # Also get images from Cloudinary for verification
        cloudinary_images = cloudinary_service.get_product_images(product_id)

        response = {
            'success': True,
            'product_id': product_id,
            'images': [img.to_dict() for img in images],
            'total_count': len(images),
            'cloudinary_images': cloudinary_images,
            'thumbnail_url': product.thumbnail_url
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting product images: {str(e)}")
        return jsonify({
            'error': 'Failed to get product images',
            'details': str(e)
        }), 500

@admin_cloudinary_routes.route('/api/admin/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_product_image(image_id):
    """Delete a specific product image"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get image record
        image = ProductImage.query.get(image_id)
        if not image:
            return jsonify({'error': 'Image not found'}), 404

        product_id = image.product_id
        was_primary = image.is_primary

        # Delete from Cloudinary
        cloudinary_result = image.delete_from_cloudinary()

        if cloudinary_result['success']:
            # Delete from database
            db.session.delete(image)

            # If this was the primary image, set another image as primary
            if was_primary:
                next_primary = ProductImage.query.filter_by(product_id=product_id).first()
                if next_primary:
                    next_primary.is_primary = True

                    # Update product thumbnail
                    product = Product.query.get(product_id)
                    if product:
                        product.thumbnail_url = next_primary.cloudinary_secure_url

            # Update product's image_urls for backward compatibility
            product = Product.query.get(product_id)
            if product:
                remaining_images = ProductImage.query.filter_by(product_id=product_id).order_by(
                    ProductImage.is_primary.desc(),
                    ProductImage.sort_order
                ).all()

                product.image_urls = [img.cloudinary_secure_url for img in remaining_images]

                # Clear thumbnail if no images left
                if not remaining_images:
                    product.thumbnail_url = None

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Image deleted successfully',
                'image_id': image_id,
                'cloudinary_result': cloudinary_result
            }), 200
        else:
            return jsonify({
                'error': 'Failed to delete image from Cloudinary',
                'details': cloudinary_result.get('error')
            }), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting image: {str(e)}")
        return jsonify({
            'error': 'Failed to delete image',
            'details': str(e)
        }), 500

@admin_cloudinary_routes.route('/api/admin/images/<int:image_id>/primary', methods=['PUT'])
@jwt_required()
def set_primary_image(image_id):
    """Set an image as the primary image for its product"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get image record
        image = ProductImage.query.get(image_id)
        if not image:
            return jsonify({'error': 'Image not found'}), 404

        product_id = image.product_id

        # Remove primary status from all other images of this product
        ProductImage.query.filter_by(product_id=product_id).update({'is_primary': False})

        # Set this image as primary
        image.is_primary = True

        # Update product thumbnail
        product = Product.query.get(product_id)
        if product:
            product.thumbnail_url = image.cloudinary_secure_url

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Primary image updated successfully',
            'image_id': image_id,
            'product_id': product_id
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting primary image: {str(e)}")
        return jsonify({
            'error': 'Failed to set primary image',
            'details': str(e)
        }), 500

@admin_cloudinary_routes.route('/api/admin/images/<int:image_id>/metadata', methods=['PUT'])
@jwt_required()
def update_image_metadata(image_id):
    """Update image metadata (alt text, sort order, etc.)"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        # Get image record
        image = ProductImage.query.get(image_id)
        if not image:
            return jsonify({'error': 'Image not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update fields
        if 'alt_text' in data:
            image.alt_text = data['alt_text']

        if 'sort_order' in data:
            image.sort_order = int(data['sort_order'])

        # Update Cloudinary metadata
        cloudinary_context = {}
        if 'alt_text' in data:
            cloudinary_context['alt_text'] = data['alt_text']

        if cloudinary_context:
            cloudinary_service.update_image_metadata(
                image.cloudinary_public_id,
                cloudinary_context
            )

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Image metadata updated successfully',
            'image': image.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating image metadata: {str(e)}")
        return jsonify({
            'error': 'Failed to update image metadata',
            'details': str(e)
        }), 500

@admin_cloudinary_routes.route('/api/admin/images/reorder', methods=['PUT'])
@jwt_required()
def reorder_product_images():
    """Reorder product images"""
    # Check admin permissions
    auth_check = admin_required()
    if auth_check:
        return auth_check

    try:
        data = request.get_json()
        if not data or 'image_orders' not in data:
            return jsonify({'error': 'No image order data provided'}), 400

        image_orders = data['image_orders']  # List of {'id': image_id, 'sort_order': order}

        for item in image_orders:
            image = ProductImage.query.get(item['id'])
            if image:
                image.sort_order = item['sort_order']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Images reordered successfully',
            'updated_count': len(image_orders)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reordering images: {str(e)}")
        return jsonify({
            'error': 'Failed to reorder images',
            'details': str(e)
        }), 500
