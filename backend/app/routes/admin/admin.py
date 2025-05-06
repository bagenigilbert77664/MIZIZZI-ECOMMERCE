"""
Admin routes for Mizizzi E-commerce platform.
Provides admin-specific API endpoints.
"""
# Make sure to install python-slugify: pip install python-slugify
from flask import Blueprint, request, jsonify, g, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, desc, func
from datetime import datetime, timedelta
import uuid
import csv
import io
import os
from slugify import slugify
import re
import werkzeug
from ...models.models import  (
    User, UserRole, Category, Product, ProductVariant, Brand, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, Newsletter, CouponType, Address,
    AddressType,ProductImage, Inventory
)
from ...configuration.extensions import db, cache
from ...schemas.schemas  import(
    user_schema, users_schema, category_schema, categories_schema,
    product_schema, products_schema, brand_schema, brands_schema,
    review_schema, reviews_schema, cart_item_schema, cart_items_schema,
    order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
    coupon_schema, coupons_schema, payment_schema, payments_schema,
    product_variant_schema, product_variants_schema, address_schema, addresses_schema,
    newsletter_schema, newsletters_schema, product_image_schema, product_images_schema,
    address_type_schema, address_types_schema
)
from ...validations.validation import admin_required
from flask_cors import cross_origin
# At the top of the file, add the import for admin_cart_routes
from .admin_cart_routes import admin_cart_routes

admin_routes = Blueprint('admin_routes', __name__)
# After this line, add the registration of the admin_cart_routes blueprint
admin_routes.register_blueprint(admin_cart_routes, url_prefix='/cart')

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    """Create a paginated response."""
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": schema.dump(paginated.items),
        "pagination": {
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total
        }
    }

def create_slug(name, model, existing_id=None):
    """Create a unique slug for a model."""
    base_slug = slugify(name)
    slug = base_slug
    counter = 1

    while True:
        # Check if slug exists in the database
        if existing_id:
            exists = model.query.filter(model.slug == slug, model.id != existing_id).first()
        else:
            exists = model.query.filter_by(slug=slug).first()

        if not exists:
            break

        # If slug exists, append a counter and try again
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug

def handle_options(allowed_methods):
    """Standard OPTIONS response handler for CORS."""
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', allowed_methods)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# ----------------------
# Admin Image Upload Routes
# ----------------------

@admin_routes.route('/upload/image', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def upload_image():
    """Upload an image file."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files['file']

        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check file size (5MB limit)
        file_content = file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB in bytes
            return jsonify({"error": "File too large (max 5MB)"}), 400

        # Reset file pointer after reading for size check
        file.seek(0)

        # Check if the file is an allowed image type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"error": "File type not allowed. Only images are permitted."}), 400

        # Create a secure filename with UUID to avoid collisions
        original_filename = werkzeug.utils.secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(current_app.root_path, 'uploads')
        product_images_dir = os.path.join(uploads_dir, 'product_images')

        for directory in [uploads_dir, product_images_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                current_app.logger.info(f"Created directory: {directory}")

        # Save the file
        file_path = os.path.join(product_images_dir, unique_filename)
        file.save(file_path)

        # Get the current user from JWT token
        current_user_id = get_jwt_identity()

        # Log the upload
        current_app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")

        # Generate URL for the uploaded file
        site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
        image_url = f"{site_url}/api/uploads/product_images/{unique_filename}"

        return jsonify({
            "success": True,
            "filename": unique_filename,
            "originalName": original_filename,
            "url": image_url,
            "size": os.path.getsize(file_path),
            "uploadedBy": current_user_id,
            "uploadedAt": datetime.now().isoformat()
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error uploading image: {str(e)}")
        return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500

@admin_routes.route('/uploads/product_images/<filename>', methods=['GET', 'OPTIONS'])
@cross_origin()
def serve_product_image(filename):
    """Serve an uploaded product image."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        product_images_dir = os.path.join(current_app.root_path, 'uploads', 'product_images')
        return send_from_directory(product_images_dir, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving image {filename}: {str(e)}")
        return jsonify({"error": f"Failed to serve image: {str(e)}"}), 500

@admin_routes.route('/products/<int:product_id>/upload-images', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def upload_product_images(product_id):
    """Upload multiple images for a specific product."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Check if product exists
        product = Product.query.get_or_404(product_id)

        # Check if the post request has files
        if 'files[]' not in request.files:
            return jsonify({"error": "No files part in the request"}), 400

        files = request.files.getlist('files[]')

        if not files or len(files) == 0:
            return jsonify({"error": "No files selected"}), 400

        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(current_app.root_path, 'uploads')
        product_images_dir = os.path.join(uploads_dir, 'product_images')

        for directory in [uploads_dir, product_images_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                current_app.logger.info(f"Created directory: {directory}")

        # Get current max position for this product's images
        max_position_result = db.session.query(func.max(ProductImage.sort_order)).filter_by(product_id=product_id).first()
        current_max_position = max_position_result[0] if max_position_result[0] is not None else 0

        uploaded_images = []
        position = current_max_position + 1

        for file in files:
            # Check file size (5MB limit)
            file_content = file.read()
            if len(file_content) > 5 * 1024 * 1024:  # 5MB in bytes
                continue  # Skip this file

            # Reset file pointer after reading for size check
            file.seek(0)

            # Check if the file is an allowed image type
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'webp'}):
                continue  # Skip this file

            # Create a secure filename with UUID to avoid collisions
            original_filename = werkzeug.utils.secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

            # Save the file
            file_path = os.path.join(product_images_dir, unique_filename)
            file.save(file_path)

            # Generate URL for the uploaded file
            site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
            image_url = f"{site_url}/api/uploads/product_images/{unique_filename}"

            # Create ProductImage record
            image = ProductImage(
                product_id=product_id,
                filename=unique_filename,
                original_name=original_filename,
                url=image_url,
                size=os.path.getsize(file_path),
                is_primary=(position == 1 and not ProductImage.query.filter_by(product_id=product_id, is_primary=True).first()),
                sort_order=position,
                alt_text=product.name,
                uploaded_by=get_jwt_identity(),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

            db.session.add(image)
            uploaded_images.append(product_image_schema.dump(image))
            position += 1

            # If this is the first image and product has no thumbnail, set it
            if position == 2 and not product.thumbnail_url:
                product.thumbnail_url = image_url
                product.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully uploaded {len(uploaded_images)} images",
            "images": uploaded_images
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading product images: {str(e)}")
        return jsonify({"error": f"Failed to upload images: {str(e)}"}), 500

@admin_routes.route('/product-images/<int:image_id>/set-primary', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def set_primary_image(image_id):
    """Set an image as the primary image for its product."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        image = ProductImage.query.get_or_404(image_id)
        product_id = image.product_id

        # Clear primary flag from all other images for this product
        ProductImage.query.filter_by(product_id=product_id, is_primary=True).update({'is_primary': False})

        # Set this image as primary
        image.is_primary = True
        image.updated_at = datetime.now()

        # Update product thumbnail
        product = Product.query.get(image.product_id)
        if product:
            product.thumbnail_url = image.url
            product.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Image set as primary successfully",
            "image": product_image_schema.dump(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error setting primary image: {str(e)}")
        return jsonify({"error": f"Failed to set primary image: {str(e)}"}), 500

@admin_routes.route('/product-images/reorder', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def reorder_product_images():
    """Reorder product images."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        data = request.get_json()

        if not data or 'images' not in data or not isinstance(data['images'], list):
            return jsonify({"error": "Invalid request format. Expected 'images' array."}), 400

        for idx, image_data in enumerate(data['images']):
            if not isinstance(image_data, dict) or 'id' not in image_data:
                continue

            image = ProductImage.query.get(image_data['id'])
            if image:
                image.sort_order = idx
                image.updated_at = datetime.now()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Images reordered successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error reordering images: {str(e)}")
        return jsonify({"error": f"Failed to reorder images: {str(e)}"}), 500

@admin_routes.route('/product-images/<int:image_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def manage_product_image(image_id):
    """Update or delete a product image."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, DELETE, OPTIONS')

    # PUT - Update image details
    if request.method == 'PUT':
        try:
            image = ProductImage.query.get_or_404(image_id)
            product_id = image.product_id  # Get product_id from the image
            product = Product.query.get_or_404(product_id)

            # Ensure image belongs to the specified product
            if image.product_id != product_id:
                return jsonify({"error": "Image does not belong to this product"}), 400

            data = request.get_json()

            # Update image fields
            if 'alt_text' in data:
                image.alt_text = data['alt_text']

            if 'position' in data:
                image.position = data['position']

            if 'url' in data:
                image.url = data['url']

            # Set as thumbnail if requested
            if data.get('set_as_thumbnail', False):
                product.thumbnail_url = image.url
                product.updated_at = datetime.utcnow()

            image.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Product image updated successfully",
                "image": product_image_schema.dump(image)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating product image {image_id}: {str(e)}")
            return jsonify({"error": "Failed to update product image", "details": str(e)}), 500

    # DELETE - Delete a product image
    elif request.method == 'DELETE':
        try:
            image = ProductImage.query.get_or_404(image_id)
            product_id = image.product_id  # Get product_id from the image
            product = Product.query.get_or_404(product_id)

            # Ensure image belongs to the specified product
            if image.product_id != product_id:
                return jsonify({"error": "Image does not belong to this product"}), 400

            # Check if this is the thumbnail image
            is_thumbnail = product.thumbnail_url == image.url

            # Delete the image
            db.session.delete(image)

            # If this was the thumbnail, set another image as thumbnail or reset to None
            if is_thumbnail:
                another_image = ProductImage.query.filter_by(product_id=product_id).first()
                product.thumbnail_url = another_image.url if another_image else None
                product.updated_at = datetime.utcnow()

            db.session.commit()

            return jsonify({"message": "Product image deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product image {image_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product image", "details": str(e)}), 500

# ----------------------
# Admin Dashboard Routes
# ----------------------

@admin_routes.route('/dashboard', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def admin_dashboard():
    """Get admin dashboard data."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get counts
        user_count = User.query.count()
        product_count = Product.query.count()
        order_count = Order.query.count()
        category_count = Category.query.count()
        brand_count = Brand.query.count()
        review_count = Review.query.count()
        newsletter_count = Newsletter.query.count()

        # Get recent orders
        recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()

        # Get recent users
        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()

        # Get sales data
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = datetime(today.year, today.month, 1)
        start_of_year = datetime(today.year, 1, 1)

        # Get the actual CANCELLED status value from the database
        # This handles case sensitivity issues
        try:
            # First try to get all distinct status values
            valid_statuses = db.session.query(Order.status).distinct().all()
            valid_status_values = [status[0] for status in valid_statuses if status[0] is not None]

            # Find the cancelled status by checking each value case-insensitively
            cancelled_status = None
            for status in valid_status_values:
                if isinstance(status, str) and status.upper() == 'CANCELLED':
                    cancelled_status = status
                    break
                elif hasattr(status, 'value') and status.value.upper() == 'CANCELLED':
                    cancelled_status = status
                    break

            # If we couldn't find it, use the enum value directly
            if cancelled_status is None:
                cancelled_status = OrderStatus.CANCELLED
        except Exception as e:
            current_app.logger.warning(f"Error finding cancelled status: {str(e)}")
            # Fallback to a simple query without status filtering
            cancelled_status = None

        # Today's sales - with safe status filtering
        if cancelled_status:
            today_sales = db.session.query(func.sum(Order.total_amount)).filter(
                func.date(Order.created_at) == today,
                Order.status != cancelled_status
            ).scalar() or 0
        else:
            today_sales = db.session.query(func.sum(Order.total_amount)).filter(
                func.date(Order.created_at) == today
            ).scalar() or 0

        # Yesterday's sales - with safe status filtering
        if cancelled_status:
            yesterday_sales = db.session.query(func.sum(Order.total_amount)).filter(
                func.date(Order.created_at) == yesterday,
                Order.status != cancelled_status
            ).scalar() or 0
        else:
            yesterday_sales = db.session.query(func.sum(Order.total_amount)).filter(
                func.date(Order.created_at) == yesterday
            ).scalar() or 0

        # Weekly sales - with safe status filtering
        if cancelled_status:
            weekly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_week,
                Order.status != cancelled_status
            ).scalar() or 0
        else:
            weekly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_week
            ).scalar() or 0

        # Monthly sales - with safe status filtering
        if cancelled_status:
            monthly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_month,
                Order.status != cancelled_status
            ).scalar() or 0
        else:
            monthly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_month
            ).scalar() or 0

        # Yearly sales - with safe status filtering
        if cancelled_status:
            yearly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_year,
                Order.status != cancelled_status
            ).scalar() or 0
        else:
            yearly_sales = db.session.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_of_year
            ).scalar() or 0

        # Get order status counts
        status_counts = {}
        for status_tuple in valid_statuses:
            status = status_tuple[0]
            if status is not None:  # Skip null values
                count = Order.query.filter(Order.status == status).count()
                # Use string representation as key
                status_key = status.value if hasattr(status, 'value') else str(status)
                status_counts[status_key] = count

        # Get low stock products
        low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
        low_stock_products = Product.query.filter(Product.stock <= low_stock_threshold).limit(10).all()

        # Get pending reviews - handle potential schema issues
        try:
            pending_reviews = Review.query.filter_by(is_approved=None).count()
        except Exception as e:
            current_app.logger.warning(f"Could not query pending reviews: {str(e)}")
            pending_reviews = 0

        # Get sales by category - with safe status filtering
        if cancelled_status:
            sales_by_category = db.session.query(
                Category.name,
                func.sum(OrderItem.total).label('total_sales')
            ).join(
                Product, Product.category_id == Category.id
            ).join(
                OrderItem, OrderItem.product_id == Product.id
            ).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                Order.status != cancelled_status
            ).group_by(
                Category.name
            ).order_by(
                desc('total_sales')
            ).limit(5).all()
        else:
            sales_by_category = db.session.query(
                Category.name,
                func.sum(OrderItem.total).label('total_sales')
            ).join(
                Product, Product.category_id == Category.id
            ).join(
                OrderItem, OrderItem.product_id == Product.id
            ).join(
                Order, Order.id == OrderItem.order_id
            ).group_by(
                Category.name
            ).order_by(
                desc('total_sales')
            ).limit(5).all()

        # Format sales by category
        category_sales = [
            {'category': item[0], 'sales': float(item[1])}
            for item in sales_by_category
        ]

        return jsonify({
            "counts": {
                "users": user_count,
                "products": product_count,
                "orders": order_count,
                "categories": category_count,
                "brands": brand_count,
                "reviews": review_count,
                "pending_reviews": pending_reviews,
                "newsletter_subscribers": newsletter_count
            },
            "sales": {
                "today": float(today_sales),
                "yesterday": float(yesterday_sales),
                "weekly": float(weekly_sales),
                "monthly": float(monthly_sales),
                "yearly": float(yearly_sales)
            },
            "order_status": status_counts,
            "recent_orders": orders_schema.dump(recent_orders),
            "recent_users": users_schema.dump(recent_users),
            "low_stock_products": products_schema.dump(low_stock_products),
            "sales_by_category": category_sales
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error in admin dashboard: {str(e)}")
        return jsonify({"error": "Failed to retrieve dashboard data", "details": str(e)}), 500

# ----------------------
# Admin User Management Routes
# ----------------------

@admin_routes.route('/users', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def users():
    """Get all users or create a new user."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all users
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            role = request.args.get('role')
            search = request.args.get('q')
            is_active = request.args.get('is_active')

            # Build query
            query = User.query

            # Apply filters
            if role:
                try:
                    user_role = UserRole(role)
                    query = query.filter_by(role=user_role)
                except ValueError:
                    pass  # Invalid role, ignore filter

            if search:
                query = query.filter(
                    or_(
                        User.name.ilike(f'%{search}%'),
                        User.email.ilike(f'%{search}%'),
                        User.phone.ilike(f'%{search}%')
                    )
                )

            if is_active is not None:
                is_active_bool = is_active.lower() == 'true'
                query = query.filter_by(is_active=is_active_bool)

            # Order by creation date, newest first
            query = query.order_by(User.created_at.desc())

            return jsonify(paginate_response(query, users_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting users: {str(e)}")
            return jsonify({"error": "Failed to retrieve users", "details": str(e)}), 500

    # POST - Create a new user
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            required_fields = ['name', 'email', 'password']
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({"error": f"Field '{field}' is required"}), 400

            # Check if email already exists
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user:
                return jsonify({"error": "Email already in use"}), 400

            # Create new user
            user = User(
                name=data['name'],
                email=data['email'],
                role=UserRole(data.get('role', 'CUSTOMER')),
                is_active=data.get('is_active', True),
                phone=data.get('phone')
            )

            # Set password
            user.set_password(data['password'])

            # Set creation timestamps
            now = datetime.utcnow()
            user.created_at = now
            user.updated_at = now

            db.session.add(user)
            db.session.commit()

            return jsonify({
                "message": "User created successfully",
                "user": user_schema.dump(user)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating user: {str(e)}")
            return jsonify({"error": "Failed to create user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def user_operations(user_id):
    """Get, update, or delete a user."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get user details
    if request.method == 'GET':
        try:
            user = User.query.get_or_404(user_id)

            # Get user's orders
            orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).limit(5).all()

            # Get user's addresses
            addresses = Address.query.filter_by(user_id=user_id).all()

            # Get user's reviews
            reviews = Review.query.filter_by(user_id=user_id).order_by(Review.created_at.desc()).limit(5).all()

            # Get user's cart items
            cart_items = CartItem.query.filter_by(user_id=user_id).all()

            # Get user's wishlist items
            wishlist_items = WishlistItem.query.filter_by(user_id=user_id).all()

            # Prepare response
            user_data = user_schema.dump(user)
            user_data['recent_orders'] = orders_schema.dump(orders)
            user_data['addresses'] = addresses_schema.dump(addresses)
            user_data['recent_reviews'] = reviews_schema.dump(reviews)
            user_data['cart_items'] = cart_items_schema.dump(cart_items)
            user_data['wishlist_items'] = wishlist_items_schema.dump(wishlist_items)

            return jsonify(user_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve user", "details": str(e)}), 500

    # PUT - Update user details
    elif request.method == 'PUT':
        try:
            user = User.query.get_or_404(user_id)
            data = request.get_json()

            # Update allowed fields
            if 'name' in data:
                user.name = data['name']
            if 'email' in data:
                # Check if email already exists
                existing_user = User.query.filter(User.email == data['email'], User.id != user_id).first()
                if existing_user:
                    return jsonify({"error": "Email already in use"}), 400
                user.email = data['email']
            if 'phone' in data:
                user.phone = data['phone']
            if 'is_active' in data:
                user.is_active = data['is_active']
            if 'role' in data:
                try:
                    user.role = UserRole(data['role'])
                except ValueError:
                    return jsonify({"error": "Invalid role"}), 400

            # Update password if provided
            if 'password' in data and data['password']:
                user.set_password(data['password'])

            user.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "User updated successfully",
                "user": user_schema.dump(user)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to update user", "details": str(e)}), 500

    # DELETE - Delete a user
    elif request.method == 'DELETE':
        try:
            # Prevent deleting the last admin
            if User.query.filter_by(role=UserRole.ADMIN).count() <= 1:
                admin_user = User.query.get(user_id)
                if admin_user and admin_user.role == UserRole.ADMIN:
                    return jsonify({"error": "Cannot delete the last admin user"}), 400

            user = User.query.get_or_404(user_id)

            # Instead of actually deleting, anonymize the user data
            user.name = f"Deleted User {user.id}"
            user.email = f"deleted_{user.id}@example.com"
            user.phone = None
            user.is_active = False
            user.is_deleted = True  # Assuming you have this field
            user.deleted_at = datetime.utcnow()

            db.session.commit()

            return jsonify({"message": "User deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting user {user_id}: {str(e)}")
            return jsonify({"error": "Failed to delete user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/activate', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def activate_user(user_id):
    """Activate a user account."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        user = User.query.get_or_404(user_id)
        user.is_active = True
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "User activated successfully",
            "user": user_schema.dump(user)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error activating user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to activate user", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/deactivate', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def deactivate_user(user_id):
    """Deactivate a user account."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        # Prevent deactivating the last admin
        if User.query.filter_by(role=UserRole.ADMIN, is_active=True).count() <= 1:
            admin_user = User.query.get(user_id)
            if admin_user and admin_user.role == UserRole.ADMIN:
                return jsonify({"error": "Cannot deactivate the last admin user"}), 400

        user = User.query.get_or_404(user_id)
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "User deactivated successfully",
            "user": user_schema.dump(user)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deactivating user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to deactivate user", "details": str(e)}), 500

# ----------------------
# Admin Category Management Routes
# ----------------------

@admin_routes.route('/categories', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def categories():
    """Get all categories or create a new category."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all categories
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            search = request.args.get('q')
            parent_id = request.args.get('parent_id', type=int)
            is_featured = request.args.get('is_featured')

            # Build query
            query = Category.query

            # Apply filters
            if search:
                query = query.filter(
                    or_(
                        Category.name.ilike(f'%{search}%'),
                        Category.description.ilike(f'%{search}%'),
                        Category.slug.ilike(f'%{search}%')
                    )
                )

            if parent_id is not None:
                query = query.filter_by(parent_id=parent_id)

            if is_featured is not None:
                is_featured_bool = is_featured.lower() == 'true'
                query = query.filter_by(is_featured=is_featured_bool)

            # Get sort parameters
            sort_by = request.args.get('sort_by', 'name')
            sort_order = request.args.get('sort_order', 'asc')

            # Apply sorting
            if sort_by == 'name':
                query = query.order_by(Category.name.asc() if sort_order == 'asc' else Category.name.desc())
            elif sort_by == 'created_at':
                query = query.order_by(Category.created_at.asc() if sort_order == 'asc' else Category.created_at.desc())
            else:  # Default to name
                query = query.order_by(Category.name.asc())

            return jsonify(paginate_response(query, categories_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting categories: {str(e)}")
            return jsonify({"error": "Failed to retrieve categories", "details": str(e)}), 500

    # POST - Create a new category
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'name' not in data or not data['name']:
                return jsonify({"error": "Category name is required"}), 400

            # Create slug if not provided
            if 'slug' not in data or not data['slug']:
                slug = create_slug(data['name'], Category)
            else:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_category = Category.query.filter_by(slug=data['slug']).first()
                if existing_category:
                    return jsonify({"error": "Slug already in use"}), 400

                slug = data['slug']

            # Validate parent_id if provided
            parent_id = data.get('parent_id')
            if parent_id:
                parent_category = Category.query.get(parent_id)
                if not parent_category:
                    return jsonify({"error": "Parent category not found"}), 400

            # Create new category
            category = Category(
                name=data['name'],
                slug=slug,
                description=data.get('description', ''),
                parent_id=parent_id,
                is_featured=data.get('is_featured', False),
                image_url=data.get('image_url')
            )

            # Set creation timestamps
            now = datetime.utcnow()
            category.created_at = now
            category.updated_at = now

            db.session.add(category)
            db.session.commit()

            return jsonify({
                "message": "Category created successfully",
                "category": category_schema.dump(category)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating category: {str(e)}")
            return jsonify({"error": "Failed to create category", "details": str(e)}), 500

@admin_routes.route('/categories/<int:category_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def category_operations(category_id):
    """Get, update, or delete a category."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get category details
    if request.method == 'GET':
        try:
            category = Category.query.get_or_404(category_id)

            # Get products in this category
            products_count = Product.query.filter_by(category_id=category_id).count()

            # Get subcategories
            subcategories = Category.query.filter_by(parent_id=category_id).all()

            # Prepare response
            category_data = category_schema.dump(category)
            category_data['products_count'] = products_count
            category_data['subcategories'] = categories_schema.dump(subcategories)

            # Get parent category if exists
            if category.parent_id:
                parent_category = Category.query.get(category.parent_id)
                if parent_category:
                    category_data['parent_category'] = category_schema.dump(parent_category)

            return jsonify(category_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

    # PUT - Update category details
    elif request.method == 'PUT':
        try:
            category = Category.query.get_or_404(category_id)
            data = request.get_json()

            # Update name if provided
            if 'name' in data and data['name']:
                category.name = data['name']

                # Update slug if not provided in the request
                if 'slug' not in data:
                    category.slug = create_slug(data['name'], Category, category_id)

            # Update slug if provided
            if 'slug' in data and data['slug']:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_category = Category.query.filter(
                    Category.slug == data['slug'],
                    Category.id != category_id
                ).first()

                if existing_category:
                    return jsonify({"error": "Slug already in use"}), 400

                category.slug = data['slug']

            # Update description if provided
            if 'description' in data:
                category.description = data['description']

            # Update parent_id if provided
            if 'parent_id' in data:
                # Cannot set itself as parent
                if data['parent_id'] == category_id:
                    return jsonify({"error": "Category cannot be its own parent"}), 400

                # Validate parent_id if not None
                if data['parent_id'] is not None:
                    parent_category = Category.query.get(data['parent_id'])
                    if not parent_category:
                        return jsonify({"error": "Parent category not found"}), 400

                category.parent_id = data['parent_id']

            # Update is_featured if provided
            if 'is_featured' in data:
                category.is_featured = data['is_featured']

            # Update image_url if provided
            if 'image_url' in data:
                category.image_url = data['image_url']

            category.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Category updated successfully",
                "category": category_schema.dump(category)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to update category", "details": str(e)}), 500

    # DELETE - Delete a category
    elif request.method == 'DELETE':
        try:
            category = Category.query.get_or_404(category_id)

            # Check if category has products
            products_count = Product.query.filter_by(category_id=category_id).count()
            if products_count > 0:
                return jsonify({
                    "error": "Cannot delete category with associated products",
                    "products_count": products_count
                }), 400

            # Check if category has subcategories
            subcategories_count = Category.query.filter_by(parent_id=category_id).count()
            if subcategories_count > 0:
                return jsonify({
                    "error": "Cannot delete category with subcategories",
                    "subcategories_count": subcategories_count
                }), 400

            db.session.delete(category)
            db.session.commit()

            return jsonify({"message": "Category deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting category {category_id}: {str(e)}")
            return jsonify({"error": "Failed to delete category", "details": str(e)}), 500

@admin_routes.route('/categories/<int:category_id>/toggle-featured', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def toggle_category_featured(category_id):
    """Toggle category featured status."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        category = Category.query.get_or_404(category_id)
        category.is_featured = not category.is_featured
        category.updated_at = datetime.utcnow()
        db.session.commit()

        status = "featured" if category.is_featured else "unfeatured"

        return jsonify({
            "message": f"Category {status} successfully",
            "category": category_schema.dump(category)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling category featured status {category_id}: {str(e)}")
        return jsonify({"error": "Failed to toggle category featured status", "details": str(e)}), 500

# ----------------------
# Admin Product Management Routes
# ----------------------

@admin_routes.route('/products', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def products():
    """Get all products or create a new product."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all products
    if request.method == 'GET':
        try:
            page, per_page = get_pagination_params()

            # Get filter parameters
            category_id = request.args.get('category_id', type=int)
            brand_id = request.args.get('brand_id', type=int)
            search = request.args.get('q')
            min_price = request.args.get('min_price', type=float)
            max_price = request.args.get('max_price', type=float)
            stock_status = request.args.get('stock_status')  # 'in_stock', 'out_of_stock', 'low_stock'

            # Build query
            query = Product.query

            # Apply filters
            if category_id:
                query = query.filter_by(category_id=category_id)

            if brand_id:
                query = query.filter_by(brand_id=brand_id)

            if search:
                query = query.filter(
                    or_(
                        Product.name.ilike(f'%{search}%'),
                        Product.description.ilike(f'%{search}%'),
                        Product.sku.ilike(f'%{search}%')
                    )
                )

            if min_price is not None:
                query = query.filter(Product.price >= min_price)

            if max_price is not None:
                query = query.filter(Product.price <= max_price)

            if stock_status:
                low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
                if stock_status == 'in_stock':
                    query = query.filter(Product.stock > 0)
                elif stock_status == 'out_of_stock':
                    query = query.filter(Product.stock == 0)
                elif stock_status == 'low_stock':
                    query = query.filter(Product.stock > 0, Product.stock <= low_stock_threshold)

            # Get sort parameters
            sort_by = request.args.get('sort_by', 'created_at')
            sort_order = request.args.get('sort_order', 'desc')

            # Apply sorting
            if sort_by == 'price':
                query = query.order_by(Product.price.asc() if sort_order == 'asc' else Product.price.desc())
            elif sort_by == 'name':
                query = query.order_by(Product.name.asc() if sort_order == 'asc' else Product.name.desc())
            elif sort_by == 'stock':
                query = query.order_by(Product.stock.asc() if sort_order == 'asc' else Product.stock.desc())
            else:  # Default to created_at
                query = query.order_by(Product.created_at.asc() if sort_order == 'asc' else Product.created_at.desc())

            return jsonify(paginate_response(query, products_schema, page, per_page)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting products: {str(e)}")
            return jsonify({"error": "Failed to retrieve products", "details": str(e)}), 500

    # POST - Create a new product
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            required_fields = ['name', 'price', 'category_id']
            for field in required_fields:
                if field not in data or data[field] is None:
                    return jsonify({"error": f"Field '{field}' is required"}), 400

            # Validate numeric fields
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({"error": "Price cannot be negative"}), 400

                if 'sale_price' in data and data['sale_price'] is not None:
                    sale_price = float(data['sale_price'])
                    if sale_price < 0:
                        return jsonify({"error": "Sale price cannot be negative"}), 400
                    if sale_price >= price:
                        return jsonify({"error": "Sale price must be less than regular price"}), 400

                if 'stock' in data and data['stock'] is not None:
                    stock = int(data['stock'])
                    if stock < 0:
                        return jsonify({"error": "Stock cannot be negative"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid numeric value"}), 400

            # Validate category_id
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({"error": "Category not found"}), 400

            # Validate brand_id if provided
            if 'brand_id' in data and data['brand_id'] is not None:
                brand = Brand.query.get(data['brand_id'])
                if not brand:
                    return jsonify({"error": "Brand not found"}), 400

            # Create slug if not provided
            if 'slug' not in data or not data['slug']:
                slug = create_slug(data['name'], Product)
            else:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_product = Product.query.filter_by(slug=data['slug']).first()
                if existing_product:
                    return jsonify({"error": "Slug already in use"}), 400

                slug = data['slug']

            # Generate SKU if not provided
            if 'sku' not in data or not data['sku']:
                # Simple SKU generation - category prefix + timestamp
                timestamp = int(datetime.utcnow().timestamp())
                category_prefix = category.name[:3].upper()
                sku = f"{category_prefix}-{timestamp}"
            else:
                # Check if SKU already exists
                existing_product = Product.query.filter_by(sku=data['sku']).first()
                if existing_product:
                    return jsonify({"error": "SKU already in use"}), 400

                sku = data['sku']

            # Create new product
            product = Product(
                name=data['name'],
                slug=slug,
                description=data.get('description', ''),
                price=price,
                sale_price=data.get('sale_price'),
                sku=sku,
                # stock=data.get('stock', 0), # REMOVE THIS LINE
                category_id=data['category_id'],
                brand_id=data.get('brand_id'),
                is_active=data.get('is_active', True),
                is_featured=data.get('is_featured', False),
                is_new=data.get('is_new', False),
                is_sale=data.get('is_sale', False),
                is_flash_sale=data.get('is_flash_sale', False),
                is_luxury_deal=data.get('is_luxury_deal', False),
                thumbnail_url=data.get('thumbnail_url'),
                weight=data.get('weight'),
                dimensions=data.get('dimensions'),
                tags=data.get('tags', []),
                meta_title=data.get('meta_title'),
                meta_description=data.get('meta_description')
            )

            # Set creation timestamps
            now = datetime.utcnow()
            product.created_at = now
            product.updated_at = now

            db.session.add(product)
            db.session.flush()  # Get the product ID

            # Create inventory entry
            inventory = Inventory(
                product_id=product.id,
                stock_level=data.get('stock', 0)
            )
            db.session.add(inventory)

            db.session.commit()

            return jsonify({
                "message": "Product created successfully",
                "product": product_schema.dump(product)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating product: {str(e)}")
            return jsonify({"error": "Failed to create product", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def product_operations(product_id):
    """Get, update, or delete a product."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get product details
    if request.method == 'GET':
        try:
            product = Product.query.get_or_404(product_id)

            # Get product variants
            variants = ProductVariant.query.filter_by(product_id=product_id).all()

            # Get product reviews
            reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).limit(5).all()

            # Get product images
            images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.position).all()

            # Prepare response
            product_data = product_schema.dump(product)
            product_data['variants'] = product_variants_schema.dump(variants)
            product_data['recent_reviews'] = reviews_schema.dump(reviews)
            product_data['images'] = product_images_schema.dump(images)

            # Get category details
            if product.category_id:
                category = Category.query.get(product.category_id)
                if category:
                    product_data['category'] = category_schema.dump(category)

            # Get brand details
            if product.brand_id:
                brand = Brand.query.get(product.brand_id)
                if brand:
                    product_data['brand'] = brand_schema.dump(brand)

            # Get inventory details
            inventory = Inventory.query.filter_by(product_id=product_id).first()
            if inventory:
                product_data['inventory'] = inventory.to_dict()

            return jsonify(product_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

    # PUT - Update product details
    elif request.method == 'PUT':
        try:
            product = Product.query.get_or_404(product_id)
            data = request.get_json()

            # Update basic fields
            if 'name' in data:
                product.name = data['name']

                # Update slug if not provided in the request
                if 'slug' not in data:
                    product.slug = create_slug(data['name'], Product, product_id)

            if 'slug' in data and data['slug']:
                # Validate slug format
                if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', data['slug']):
                    return jsonify({"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only."}), 400

                # Check if slug already exists
                existing_product = Product.query.filter(
                    Product.slug == data['slug'],
                    Product.id != product_id
                ).first()

                if existing_product:
                    return jsonify({"error": "Slug already in use"}), 400

                product.slug = data['slug']

            if 'description' in data:
                product.description = data['description']

            # Update price fields with validation
            if 'price' in data:
                try:
                    price = float(data['price'])
                    if price < 0:
                        return jsonify({"error": "Price cannot be negative"}), 400

                    product.price = price

                    # Also validate sale_price if it exists
                    if product.sale_price and product.sale_price >= price:
                        product.is_sale = False
                        product.sale_price = None
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid price value"}), 400

            if 'sale_price' in data:
                if data['sale_price'] is None:
                    product.sale_price = None
                    product.is_sale = False
                else:
                    try:
                        sale_price = float(data['sale_price'])
                        if sale_price < 0:
                            return jsonify({"error": "Sale price cannot be negative"}), 400
                        if sale_price >= product.price:
                            return jsonify({"error": "Sale price must be less than regular price"}), 400

                        product.sale_price = sale_price
                        product.is_sale = True
                    except (ValueError, TypeError):
                        return jsonify({"error": "Invalid sale price value"}), 400

            # Update category_id with validation
            if 'category_id' in data:
                category = Category.query.get(data['category_id'])
                if not category:
                    return jsonify({"error": "Category not found"}), 400

                product.category_id = data['category_id']

            # Update brand_id with validation
            if 'brand_id' in data:
                if data['brand_id'] is None:
                    product.brand_id = None
                else:
                    brand = Brand.query.get(data['brand_id'])
                    if not brand:
                        return jsonify({"error": "Brand not found"}), 400

                    product.brand_id = data['brand_id']

            # Update SKU with validation
            if 'sku' in data:
                # Check if SKU already exists
                existing_product = Product.query.filter(
                    Product.sku == data['sku'],
                    Product.id != product_id
                ).first()

                if existing_product:
                    return jsonify({"error": "SKU already in use"}), 400

                product.sku = data['sku']

            # Update stock with validation
            if 'stock' in data:
                try:
                    stock = int(data['stock'])
                    if stock < 0:
                        return jsonify({"error": "Stock cannot be negative"}), 400

                    # product.stock = stock # REMOVE THIS LINE

                    # Update inventory
                    inventory = Inventory.query.filter_by(product_id=product_id).first()
                    if inventory:
                        inventory.stock_level = stock
                        inventory.updated_at = datetime.utcnow()
                    else:
                        # Create inventory if it doesn't exist
                        inventory = Inventory(
                            product_id=product_id,
                            stock_level=stock
                        )
                        db.session.add(inventory)

                    db.session.commit()

                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid stock value"}), 400

            # Update boolean fields
            for field in ['is_active', 'is_featured', 'is_new', 'is_sale', 'is_flash_sale', 'is_luxury_deal']:
                if field in data:
                    setattr(product, field, data[field])

            # Update other fields
            for field in ['thumbnail_url', 'weight', 'dimensions', 'tags', 'meta_title', 'meta_description', 'meta_keywords']:
                if field in data:
                    setattr(product, field, data[field])

            product.updated_at = datetime.utcnow()

            # Process product images if provided
            if 'images' in data and isinstance(data['images'], list):
                # Delete existing images if replace flag is set
                if data.get('replace_images', False):
                    ProductImage.query.filter_by(product_id=product_id).delete()

                now = datetime.utcnow()

                for idx, image_data in enumerate(data['images']):
                    if isinstance(image_data, dict) and 'url' in image_data:
                        # Check if image already exists by URL
                        existing_image = ProductImage.query.filter_by(
                            product_id=product_id,
                            url=image_data['url']
                        ).first()

                        if existing_image:
                            existing_image.position = idx
                            existing_image.alt_text = image_data.get('alt_text', product.name)
                            existing_image.updated_at = now
                        else:
                            # Create new image
                            image = ProductImage(
                                product_id=product_id,
                                url=image_data['url'],
                                alt_text=image_data.get('alt_text', product.name),
                                position=idx,
                                created_at=now,
                                updated_at=now
                            )
                            db.session.add(image)

                            # Set first image as thumbnail if no thumbnail is provided
                            if idx == 0 and not product.thumbnail_url:
                                product.thumbnail_url = image_data['url']

            # Process product variants if provided
            if 'variants' in data and isinstance(data['variants'], list):
                # Delete existing variants if replace flag is set
                if data.get('replace_variants', False):
                    ProductVariant.query.filter_by(product_id=product_id).delete()

                now = datetime.utcnow()

                for variant_data in data['variants']:
                    if isinstance(variant_data, dict):
                        if 'id' in variant_data and variant_data['id']:
                            # Update existing variant
                            variant = ProductVariant.query.get(variant_data['id'])
                            if variant and variant.product_id == product_id:
                                if 'name' in variant_data:
                                    variant.name = variant_data['name']
                                if 'price' in variant_data:
                                    variant.price = variant_data['price']
                                if 'sale_price' in variant_data:
                                    variant.sale_price = variant_data['sale_price']
                                if 'stock' in variant_data:
                                    variant.stock = variant_data['stock']
                                if 'options' in variant_data:
                                    variant.options = variant_data['options']
                                if 'image_url' in variant_data:
                                    variant.image_url = variant_data['image_url']
                                if 'weight' in variant_data:
                                    variant.weight = variant_data['weight']
                                if 'dimensions' in variant_data:
                                    variant.dimensions = variant_data['dimensions']

                                variant.updated_at = now
                            else:
                                continue
                        else:
                            # Create new variant
                            variant = ProductVariant(
                                product_id=product_id,
                                name=variant_data.get('name', ''),
                                sku=variant_data.get('sku', f"{product.sku}-{uuid.uuid4().hex[:6]}"),
                                price=variant_data.get('price', product.price),
                                sale_price=variant_data.get('sale_price', product.sale_price),
                                stock=variant_data.get('stock', 0),
                                options=variant_data.get('options', {}),
                                image_url=variant_data.get('image_url'),
                                weight=variant_data.get('weight', product.weight),
                                dimensions=variant_data.get('dimensions', product.dimensions),
                                created_at=now,
                                updated_at=now
                            )
                            db.session.add(variant)

            db.session.commit()

            return jsonify({
                "message": "Product updated successfully",
                "product": product_schema.dump(product)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to update product", "details": str(e)}), 500

    # DELETE - Delete a product
    elif request.method == 'DELETE':
        try:
            product = Product.query.get_or_404(product_id)

            # Check if product has orders
            order_items = OrderItem.query.filter_by(product_id=product_id).first()
            if order_items:
                # Soft delete instead of hard delete
                product.is_active = False
                product.is_deleted = True
                product.updated_at = datetime.utcnow()
                db.session.commit()

                return jsonify({
                    "message": "Product has existing orders and has been deactivated instead of deleted",
                    "is_soft_delete": True
                }), 200

            # Delete product variants
            ProductVariant.query.filter_by(product_id=product_id).delete()

            # Delete product images
            ProductImage.query.filter_by(product_id=product_id).delete()

            # Delete product reviews
            Review.query.filter_by(product_id=product_id).delete()

            # Delete product from carts
            CartItem.query.filter_by(product_id=product_id).delete()

            # Delete product from wishlists
            WishlistItem.query.filter_by(product_id=product_id).delete()

            # Finally delete the product
            db.session.delete(product)
            db.session.commit()

            return jsonify({"message": "Product deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product {product_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>/stock', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_product_stock(product_id):
    """Update product stock."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()

        if 'stock' not in data:
            return jsonify({"error": "Stock value is required"}), 400

        try:
            stock = int(data['stock'])
            if stock < 0:
                return jsonify({"error": "Stock cannot be negative"}), 400

            product.stock = stock
            product.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Product stock updated successfully",
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "stock": product.stock
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Stock must be a valid integer"}), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating product stock {product_id}: {str(e)}")
        return jsonify({"error": "Failed to update product stock", "details": str(e)}), 500

@admin_routes.route('/products/bulk-update', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def bulk_update_products():
    """Bulk update products (e.g., for sales, featured status)."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        data = request.get_json()

        if not data or 'product_ids' not in data or not data['product_ids']:
            return jsonify({"error": "Product IDs are required"}), 400

        product_ids = data['product_ids']
        updates = data.get('updates', {})

        # Validate updates
        allowed_fields = ['is_featured', 'is_new', 'is_sale', 'is_flash_sale', 'is_luxury_deal', 'sale_price', 'category_id', 'brand_id', 'is_active']
        for field in updates.keys():
            if field not in allowed_fields:
                return jsonify({"error": f"Field '{field}' cannot be updated in bulk"}), 400

        # Apply updates
        products = Product.query.filter(Product.id.in_(product_ids)).all()
        updated_count = 0

        for product in products:
            updated = False

            for field, value in updates.items():
                if hasattr(product, field):
                    # Special handling for category_id
                    if field == 'category_id' and value is not None:
                        category = Category.query.get(value)
                        if not category:
                            continue  # Skip invalid category

                    # Special handling for brand_id
                    if field == 'brand_id' and value is not None:
                        brand = Brand.query.get(value)
                        if not brand:
                            continue  # Skip invalid brand

                    # Set the field value
                    setattr(product, field, value)
                    updated = True

            if updated:
                product.updated_at = datetime.utcnow()
                updated_count += 1

        db.session.commit()

        return jsonify({
            "message": f"Updated {updated_count} products successfully",
            "updated_count": updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in bulk update products: {str(e)}")
        return jsonify({"error": "Failed to update products", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>/images', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def product_images(product_id):
    """Manage product images."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, DELETE, OPTIONS')

    # GET - Get product images
    if request.method == 'GET':
        try:
            product = Product.query.get_or_404(product_id)
            images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.position).all()

            return jsonify({
                "product_id": product_id,
                "product_name": product.name,
                "images": product_images_schema.dump(images)
            }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting product images {product_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve product images", "details": str(e)}), 500

    # POST - Add product images
    elif request.method == 'POST':
        try:
            product = Product.query.get_or_404(product_id)
            data = request.get_json()

            if 'images' not in data or not isinstance(data['images'], list):
                return jsonify({"error": "Images array is required"}), 400

            now = datetime.utcnow()
            images_added = 0

            # Get current maximum position
            max_position_result = db.session.query(func.max(ProductImage.position)).filter_by(product_id=product_id).first()
            current_max_position = max_position_result[0] if max_position_result[0] is not None else -1

            for idx, image_data in enumerate(data['images']):
                if isinstance(image_data, dict) and 'url' in image_data:
                    # Check if image already exists by URL
                    existing_image = ProductImage.query.filter_by(
                        product_id=product_id,
                        url=image_data['url']
                    ).first()

                    if not existing_image:
                        # Create new image
                        image = ProductImage(
                            product_id=product_id,
                            url=image_data['url'],
                            alt_text=image_data.get('alt_text', product.name),
                            position=current_max_position + idx + 1,
                            created_at=now,
                            updated_at=now
                        )
                        db.session.add(image)
                        images_added += 1

                        # Set as thumbnail if requested
                        if image_data.get('set_as_thumbnail', False) or not product.thumbnail_url:
                            product.thumbnail_url = image_data['url']
                            product.updated_at = now

            db.session.commit()

            return jsonify({
                "message": f"Added {images_added} images to product",
                "images_added": images_added
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding product images {product_id}: {str(e)}")
            return jsonify({"error": "Failed to add product images", "details": str(e)}), 500

    # DELETE - Delete all product images
    elif request.method == 'DELETE':
        try:
            product = Product.query.get_or_404(product_id)

            # Delete all product images
            count = ProductImage.query.filter_by(product_id=product_id).delete()

            # Reset thumbnail URL if deleted
            if count > 0:
                product.thumbnail_url = None
                product.updated_at = datetime.utcnow()

            db.session.commit()

            return jsonify({
                "message": f"Deleted {count} images from product",
                "images_deleted": count
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product images {product_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product images", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>/images/<int:image_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def product_image_operations(product_id, image_id):
    """Update or delete a product image."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, DELETE, OPTIONS')

    # PUT - Update image details
    if request.method == 'PUT':
        try:
            product = Product.query.get_or_404(product_id)
            image = ProductImage.query.get_or_404(image_id)

            # Ensure image belongs to the specified product
            if image.product_id != product_id:
                return jsonify({"error": "Image does not belong to this product"}), 400

            data = request.get_json()

            # Update image fields
            if 'alt_text' in data:
                image.alt_text = data['alt_text']

            if 'position' in data:
                image.position = data['position']

            if 'url' in data:
                image.url = data['url']

            # Set as thumbnail if requested
            if data.get('set_as_thumbnail', False):
                product.thumbnail_url = image.url
                product.updated_at = datetime.utcnow()

            image.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Product image updated successfully",
                "image": product_image_schema.dump(image)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating product image {image_id}: {str(e)}")
            return jsonify({"error": "Failed to update product image", "details": str(e)}), 500

    # DELETE - Delete a product image
    elif request.method == 'DELETE':
        try:
            product = Product.query.get_or_404(product_id)
            image = ProductImage.query.get_or_404(image_id)

            # Ensure image belongs to the specified product
            if image.product_id != product_id:
                return jsonify({"error": "Image does not belong to this product"}), 400

            # Check if this is the thumbnail image
            is_thumbnail = product.thumbnail_url == image.url

            # Delete the image
            db.session.delete(image)

            # If this was the thumbnail, set another image as thumbnail or reset to None
            if is_thumbnail:
                another_image = ProductImage.query.filter_by(product_id=product_id).first()
                product.thumbnail_url = another_image.url if another_image else None
                product.updated_at = datetime.utcnow()

            db.session.commit()

            return jsonify({"message": "Product image deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product image {image_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product image", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>/variants', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def product_variants(product_id):
    """Manage product variants."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - Get product variants
    if request.method == 'GET':
        try:
            product = Product.query.get_or_404(product_id)
            variants = ProductVariant.query.filter_by(product_id=product_id).all()

            return jsonify({
                "product_id": product_id,
                "product_name": product.name,
                "variants": product_variants_schema.dump(variants)
            }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting product variants {product_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve product variants", "details": str(e)}), 500

    # POST - Add product variants
    elif request.method == 'POST':
        try:
            product = Product.query.get_or_404(product_id)
            data = request.get_json()

            if 'variants' not in data or not isinstance(data['variants'], list):
                return jsonify({"error": "Variants array is required"}), 400

            now = datetime.utcnow()
            variants_added = 0

            for variant_data in data['variants']:
                if isinstance(variant_data, dict):
                    # Create new variant
                    variant = ProductVariant(
                        product_id=product_id,
                        name=variant_data.get('name', ''),
                        sku=variant_data.get('sku', f"{product.sku}-{uuid.uuid4().hex[:6]}"),
                        price=variant_data.get('price', product.price),
                        sale_price=variant_data.get('sale_price', product.sale_price),
                        stock=variant_data.get('stock', 0),
                        options=variant_data.get('options', {}),
                        image_url=variant_data.get('image_url'),
                        weight=variant_data.get('weight', product.weight),
                        dimensions=variant_data.get('dimensions', product.dimensions),
                        created_at=now,
                        updated_at=now
                    )
                    db.session.add(variant)
                    variants_added += 1

            db.session.commit()

            return jsonify({
                "message": f"Added {variants_added} variants to product",
                "variants_added": variants_added
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding product variants {product_id}: {str(e)}")
            return jsonify({"error": "Failed to add product variants", "details": str(e)}), 500

@admin_routes.route('/products/<int:product_id>/variants/<int:variant_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def product_variant_operations(product_id, variant_id):
    """Get, update, or delete a product variant."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get variant details
    if request.method == 'GET':
        try:
            product = Product.query.get_or_404(product_id)
            variant = ProductVariant.query.get_or_404(variant_id)

            # Ensure variant belongs to the specified product
            if variant.product_id != product_id:
                return jsonify({"error": "Variant does not belong to this product"}), 400

            return jsonify(product_variant_schema.dump(variant)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting product variant {variant_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve product variant", "details": str(e)}), 500

    # PUT - Update variant details
    elif request.method == 'PUT':
        try:
            product = Product.query.get_or_404(product_id)
            variant = ProductVariant.query.get_or_404(variant_id)

            # Ensure variant belongs to the specified product
            if variant.product_id != product_id:
                return jsonify({"error": "Variant does not belong to this product"}), 400

            data = request.get_json()

            # Update variant fields
            if 'name' in data:
                variant.name = data['name']

            if 'sku' in data:
                # Check if SKU already exists
                existing_variant = ProductVariant.query.filter(
                    ProductVariant.sku == data['sku'],
                    ProductVariant.id != variant_id
                ).first()

                if existing_variant:
                    return jsonify({"error": "SKU already in use"}), 400

                variant.sku = data['sku']

            if 'price' in data:
                try:
                    price = float(data['price'])
                    if price < 0:
                        return jsonify({"error": "Price cannot be negative"}), 400

                    variant.price = price
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid price value"}), 400

            if 'sale_price' in data:
                if data['sale_price'] is None:
                    variant.sale_price = None
                else:
                    try:
                        sale_price = float(data['sale_price'])
                        if sale_price < 0:
                            return jsonify({"error": "Sale price cannot be negative"}), 400
                        if sale_price >= variant.price:
                            return jsonify({"error": "Sale price must be less than regular price"}), 400

                        variant.sale_price = sale_price
                    except (ValueError, TypeError):
                        return jsonify({"error": "Invalid sale price value"}), 400

            if 'stock' in data:
                try:
                    stock = int(data['stock'])
                    if stock < 0:
                        return jsonify({"error": "Stock cannot be negative"}), 400

                    variant.stock = stock
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid stock value"}), 400

            if 'options' in data:
                variant.options = data['options']

            if 'image_url' in data:
                variant.image_url = data['image_url']

            if 'weight' in data:
                variant.weight = data['weight']

            if 'dimensions' in data:
                variant.dimensions = data['dimensions']

            variant.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Product variant updated successfully",
                "variant": product_variant_schema.dump(variant)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating product variant {variant_id}: {str(e)}")
            return jsonify({"error": "Failed to update product variant", "details": str(e)}), 500

    # DELETE - Delete a product variant
    elif request.method == 'DELETE':
        try:
            product = Product.query.get_or_404(product_id)
            variant = ProductVariant.query.get_or_404(variant_id)

            # Ensure variant belongs to the specified product
            if variant.product_id != product_id:
                return jsonify({"error": "Variant does not belong to this product"}), 400

            # Check if variant is used in any orders
            order_items = OrderItem.query.filter_by(variant_id=variant_id).first()
            if order_items:
                return jsonify({"error": "Cannot delete variant that has been ordered"}), 400

            # Delete the variant
            db.session.delete(variant)
            db.session.commit()

            return jsonify({"message": "Product variant deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting product variant {variant_id}: {str(e)}")
            return jsonify({"error": "Failed to delete product variant", "details": str(e)}), 500

# ----------------------
# Admin Order Management Routes
# ----------------------

@admin_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_orders():
    """Get all orders with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        search = request.args.get('q')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        min_amount = request.args.get('min_amount', type=float)
        max_amount = request.args.get('max_amount', type=float)

        # Build query
        query = Order.query

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass  # Invalid status, ignore filter

        if payment_status:
            try:
                payment_status_enum = PaymentStatus(payment_status)
                query = query.filter_by(payment_status=payment_status_enum)
            except ValueError:
                pass  # Invalid payment status, ignore filter

        if search:
            query = query.filter(
                or_(
                    Order.order_number.ilike(f'%{search}%'),
                    Order.tracking_number.ilike(f'%{search}%')
                )
            )

            # Try to match user information
            user_matches = User.query.filter(
                or_(
                    User.name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.phone.ilike(f'%{search}%')
                )
            ).all()

            if user_matches:
                user_ids = [user.id for user in user_matches]
                query = query.filter(Order.user_id.in_(user_ids))

        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(Order.created_at >= from_date)
            except ValueError:
                pass  # Invalid date format, ignore filter

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                query = query.filter(Order.created_at <= to_date)
            except ValueError:
                pass  # Invalid date format, ignore filter

        if min_amount is not None:
            query = query.filter(Order.total_amount >= min_amount)

        if max_amount is not None:
            query = query.filter(Order.total_amount <= max_amount)

        # Get sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Apply sorting
        if sort_by == 'total_amount':
            query = query.order_by(Order.total_amount.asc() if sort_order == 'asc' else Order.total_amount.desc())
        elif sort_by == 'order_number':
            query = query.order_by(Order.order_number.asc() if sort_order == 'asc' else Order.order_number.desc())
        else:  # Default to created_at
            query = query.order_by(Order.created_at.asc() if sort_order == 'asc' else Order.created_at.desc())

        return jsonify(paginate_response(query, orders_schema, page, per_page)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting orders: {str(e)}")
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@admin_routes.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_order(order_id):
    """Get order details by ID."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        order = Order.query.get_or_404(order_id)

        # Get order items with product details
        order_items = OrderItem.query.filter_by(order_id=order_id).all()
        items_data = []

        for item in order_items:
            product = Product.query.get(item.product_id)
            variant = None
            if item.variant_id:
                variant = ProductVariant.query.get(item.variant_id)

            item_data = {
                'id': item.id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity,
                'price': item.price,
                'total': item.total,
                'product': product_schema.dump(product) if product else None,
                'variant': product_variant_schema.dump(variant) if variant else None
            }

            items_data.append(item_data)

        # Get user details
        user = User.query.get(order.user_id)

        # Get payment details
        payments = Payment.query.filter_by(order_id=order_id).all()

        # Prepare response
        order_data = order_schema.dump(order)
        order_data['items'] = items_data
        order_data['user'] = user_schema.dump(user) if user else None
        order_data['payments'] = payments_schema.dump(payments)

        return jsonify(order_data), 200

    except Exception as e:
        current_app.logger.error(f"Error getting order {order_id}: {str(e)}")
        return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@admin_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_order_status(order_id):
    """Update order status."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, OPTIONS')

    try:
        order = Order.query.get_or_404(order_id)
        data = request.get_json()

        if 'status' not in data:
            return jsonify({"error": "Status is required"}), 400

        try:
            new_status = OrderStatus(data['status'])

            # Validate status transition
            if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return jsonify({"error": "Cannot change status of a cancelled order"}), 400

            if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return jsonify({"error": "Cannot change status of a delivered order"}), 400

            # Update order status
            order.status = new_status
            order.updated_at = datetime.utcnow()

            # Update tracking information if provided
            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            if 'tracking_url' in data:
                order.tracking_url = data['tracking_url']

            # Add notes if provided
            if 'notes' in data:
                order.notes = data['notes']

            db.session.commit()

            return jsonify({
                "message": "Order status updated successfully",
                "order": {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status.value,
                    "tracking_number": order.tracking_number,
                    "updated_at": order.updated_at.isoformat()
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating order status {order_id}: {str(e)}")
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

# ----------------------
# Admin Cart Item Management Routes
# ----------------------

@admin_routes.route('/cart-items', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_cart_items():
    """Get all cart items with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        user_id = request.args.get('user_id', type=int)
        product_id = request.args.get('product_id', type=int)

        # Build query
        query = CartItem.query

        # Apply filters
        if user_id:
            query = query.filter_by(user_id=user_id)

        if product_id:
            query = query.filter_by(product_id=product_id)

        # Order by creation date, newest first
        query = query.order_by(CartItem.created_at.desc())

        # Get cart items with product and user details
        cart_items_data = []
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        for item in paginated.items:
            try:
                # Add more defensive coding with try/except blocks
                item_data = cart_item_schema.dump(item)

                # Handle product data safely
                try:
                    product = Product.query.get(item.product_id)
                    item_data['product'] = product_schema.dump(product) if product else None
                except Exception as product_error:
                    current_app.logger.error(f"Error processing product {item.product_id}: {str(product_error)}")
                    item_data['product'] = None

                # Handle user data safely
                try:
                    user = User.query.get(item.user_id)
                    item_data['user'] = user_schema.dump(user) if user else None
                except Exception as user_error:
                    current_app.logger.error(f"Error processing user {item.user_id}: {str(user_error)}")
                    item_data['user'] = None

                # Handle variant data safely
                try:
                    variant = None
                    if item.variant_id:
                        variant = ProductVariant.query.get(item.variant_id)
                    item_data['variant'] = product_variant_schema.dump(variant) if variant else None
                except Exception as variant_error:
                    current_app.logger.error(f"Error processing variant {item.variant_id}: {str(variant_error)}")
                    item_data['variant'] = None

                cart_items_data.append(item_data)
            except Exception as item_error:
                current_app.logger.error(f"Error processing cart item {item.id}: {str(item_error)}")
                # Continue with next item instead of failing the entire request

        return jsonify({
            "items": cart_items_data,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting cart items: {str(e)}")
        return jsonify({"error": "Failed to retrieve cart items", "details": str(e)}), 500

@admin_routes.route('/cart-items/<int:cart_item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_cart_item(cart_item_id):
    """Delete a cart item."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        cart_item = CartItem.query.get_or_404(cart_item_id)
        db.session.delete(cart_item)
        db.session.commit()

        return jsonify({"message": "Cart item deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting cart item {cart_item_id}: {str(e)}")
        return jsonify({"error": "Failed to delete cart item", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/cart/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def clear_user_cart(user_id):
    """Clear a user's cart."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        # Check if user exists
        user = User.query.get_or_404(user_id)

        # Delete all cart items for the user
        deleted_count = CartItem.query.filter_by(user_id=user_id).delete()
        db.session.commit()

        return jsonify({
            "message": f"Cleared {deleted_count} items from user's cart",
            "deleted_count": deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error clearing cart for user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to clear user's cart", "details": str(e)}), 500

# ----------------------
# Admin Wishlist Item Management Routes
# ----------------------

@admin_routes.route('/wishlist-items', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_wishlist_items():
    """Get all wishlist items with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        user_id = request.args.get('user_id', type=int)
        product_id = request.args.get('product_id', type=int)

        # Build query
        query = WishlistItem.query

        # Apply filters
        if user_id:
            query = query.filter_by(user_id=user_id)

        if product_id:
            query = query.filter_by(product_id=product_id)

        # Order by creation date, newest first
        query = query.order_by(WishlistItem.created_at.desc())

        # Get wishlist items with product and user details
        wishlist_items_data = []
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        for item in paginated.items:
            product = Product.query.get(item.product_id)
            user = User.query.get(item.user_id)

            item_data = wishlist_item_schema.dump(item)
            item_data['product'] = product_schema.dump(product) if product else None
            item_data['user'] = user_schema.dump(user) if user else None

            wishlist_items_data.append(item_data)

        return jsonify({
            "items": wishlist_items_data,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting wishlist items: {str(e)}")
        return jsonify({"error": "Failed to retrieve wishlist items", "details": str(e)}), 500

@admin_routes.route('/wishlist-items/<int:wishlist_item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_wishlist_item(wishlist_item_id):
    """Delete a wishlist item."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        wishlist_item = WishlistItem.query.get_or_404(wishlist_item_id)
        db.session.delete(wishlist_item)
        db.session.commit()

        return jsonify({"message": "Wishlist item deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting wishlist item {wishlist_item_id}: {str(e)}")
        return jsonify({"error": "Failed to delete wishlist item", "details": str(e)}), 500

@admin_routes.route('/users/<int:user_id>/wishlist/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def clear_user_wishlist(user_id):
    """Clear a user's wishlist."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        # Check if user exists
        user = User.query.get_or_404(user_id)

        # Delete all wishlist items for the user
        deleted_count = WishlistItem.query.filter_by(user_id=user_id).delete()
        db.session.commit()

        return jsonify({
            "message": f"Cleared {deleted_count} items from user's wishlist",
            "deleted_count": deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error clearing wishlist for user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to clear user's wishlist", "details": str(e)}), 500

# ----------------------
# Admin Address Management Routes
# ----------------------
# ----------------------
# Admin Address Management Routes
# ----------------------

@admin_routes.route('/address-types', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def address_types():
    """Get all address types or create a new address type."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all address types
    if request.method == 'GET':
        try:
            # Fix: AddressType is an Enum, not a model with query attribute
            # Return all enum values directly
            address_types_list = [{"value": type.value, "name": type.name} for type in AddressType]
            return jsonify({
                "address_types": address_types_list
            }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting address types: {str(e)}")
            return jsonify({"error": "Failed to retrieve address types", "details": str(e)}), 500

    # POST - Create a new address type
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'value' not in data or not data['value']:
                return jsonify({"error": "Address type value is required"}), 400

            if 'name' not in data or not data['name']:
                return jsonify({"error": "Address type name is required"}), 400

            # Check if the value already exists in the enum
            try:
                existing_type = AddressType(data['value'])
                return jsonify({"error": "Address type with this value already exists"}), 400
            except ValueError:
                # Value doesn't exist, which is what we want for creating a new one
                pass

            # Since AddressType is an Enum, we can't directly add new values at runtime
            # We would need to modify the Enum class definition and restart the application
            # For now, return a message explaining this limitation
            return jsonify({
                "message": "Adding new address types requires updating the AddressType enum in the code",
                "note": "This operation cannot be performed at runtime"
            }), 400

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating address type: {str(e)}")
            return jsonify({"error": "Failed to create address type", "details": str(e)}), 500

@admin_routes.route('/address-types/<string:type_value>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def address_type_operations(type_value):
    """Update or delete an address type."""
    if request.method == 'OPTIONS':
        return handle_options('PUT, DELETE, OPTIONS')

    # PUT - Update address type
    if request.method == 'PUT':
        try:
            # Check if the address type exists in the enum
            try:
                address_type = AddressType(type_value)
            except ValueError:
                return jsonify({"error": "Address type not found"}), 404

            # Since AddressType is an Enum, we can't modify it at runtime
            return jsonify({
                "message": "Updating address types requires modifying the AddressType enum in the code",
                "note": "This operation cannot be performed at runtime"
            }), 400

        except Exception as e:
            current_app.logger.error(f"Error updating address type {type_value}: {str(e)}")
            return jsonify({"error": "Failed to update address type", "details": str(e)}), 500

    # DELETE - Delete an address type
    elif request.method == 'DELETE':
        try:
            # Check if the address type exists in the enum
            try:
                address_type = AddressType(type_value)
            except ValueError:
                return jsonify({"error": "Address type not found"}), 404

            # Check if this address type is in use
            addresses_with_type = Address.query.filter_by(address_type=address_type).count()
            if addresses_with_type > 0:
                return jsonify({
                    "error": "Cannot delete address type that is in use",
                    "addresses_count": addresses_with_type
                }), 400

            # Since AddressType is an Enum, we can't delete values at runtime
            return jsonify({
                "message": "Deleting address types requires modifying the AddressType enum in the code",
                "note": "This operation cannot be performed at runtime"
            }), 400

        except Exception as e:
            current_app.logger.error(f"Error deleting address type {type_value}: {str(e)}")
            return jsonify({"error": "Failed to delete address type", "details": str(e)}), 500

@admin_routes.route('/addresses', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_addresses():
    """Get all addresses with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        user_id = request.args.get('user_id', type=int)
        address_type = request.args.get('type')
        is_default = request.args.get('is_default')
        search = request.args.get('q')

        # Build query
        query = Address.query

        # Apply filters
        if user_id:
            query = query.filter_by(user_id=user_id)

        if address_type:
            try:
                address_type_enum = AddressType(address_type)
                query = query.filter_by(address_type=address_type_enum)
            except ValueError:
                pass  # Invalid address type, ignore filter

        if is_default is not None:
            is_default_bool = is_default.lower() == 'true'
            query = query.filter_by(is_default=is_default_bool)

        if search:
            query = query.filter(
                or_(
                    Address.first_name.ilike(f'%{search}%'),
                    Address.last_name.ilike(f'%{search}%'),
                    Address.address_line1.ilike(f'%{search}%'),
                    Address.city.ilike(f'%{search}%'),
                    Address.state.ilike(f'%{search}%'),
                    Address.postal_code.ilike(f'%{search}%'),
                    Address.country.ilike(f'%{search}%'),
                    Address.phone.ilike(f'%{search}%')
                )
            )

        # Order by user ID and creation date
        query = query.order_by(Address.user_id, Address.created_at.desc())

        # Get addresses with user details
        addresses_data = []
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        for address in paginated.items:
            try:
                user = User.query.get(address.user_id)
                address_data = address_schema.dump(address)
                address_data['user'] = user_schema.dump(user) if user else None
                addresses_data.append(address_data)
            except Exception as item_error:
                current_app.logger.error(f"Error processing address {address.id}: {str(item_error)}")
                # Continue with next item instead of failing the entire request

        return jsonify({
            "items": addresses_data,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting addresses: {str(e)}")
        return jsonify({"error": "Failed to retrieve addresses", "details": str(e)}), 500

@admin_routes.route('/addresses/<int:address_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def address_operations(address_id):
    """Get, update, or delete an address."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get address details
    if request.method == 'GET':
        try:
            address = Address.query.get_or_404(address_id)
            user = User.query.get(address.user_id)

            address_data = address_schema.dump(address)
            address_data['user'] = user_schema.dump(user) if user else None

            return jsonify(address_data), 200

        except Exception as e:
            current_app.logger.error(f"Error getting address {address_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve address", "details": str(e)}), 500

    # PUT - Update address details
    elif request.method == 'PUT':
        try:
            address = Address.query.get_or_404(address_id)
            data = request.get_json()

            # Update address fields
            for field in ['first_name', 'last_name', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'phone', 'is_default']:
                if field in data:
                    setattr(address, field, data[field])

            # Update address type if provided
            if 'address_type' in data:
                try:
                    address.address_type = AddressType(data['address_type'])
                except ValueError:
                    return jsonify({"error": "Invalid address type"}), 400

            # If setting as default, unset other default addresses for this user
            if data.get('is_default', False):
                other_default_addresses = Address.query.filter(
                    Address.user_id == address.user_id,
                    Address.id != address_id,
                    Address.is_default == True
                ).all()

                for other_address in other_default_addresses:
                    other_address.is_default = False

            address.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Address updated successfully",
                "address": address_schema.dump(address)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating address {address_id}: {str(e)}")
            return jsonify({"error": "Failed to update address", "details": str(e)}), 500

    # DELETE - Delete an address
    elif request.method == 'DELETE':
        try:
            address = Address.query.get_or_404(address_id)

            # Check if this is the only address for the user
            address_count = Address.query.filter_by(user_id=address.user_id).count()

            if address_count <= 1:
                return jsonify({"error": "Cannot delete the only address for this user"}), 400

            # If this is a default address, set another address as default
            if address.is_default and address_count > 1:
                another_address = Address.query.filter(
                    Address.user_id == address.user_id,
                    Address.id != address_id
                ).first()

                if another_address:
                    another_address.is_default = True

            db.session.delete(address)
            db.session.commit()

            return jsonify({"message": "Address deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting address {address_id}: {str(e)}")
            return jsonify({"error": "Failed to delete address", "details": str(e)}), 500

# ----------------------
# Admin Newsletter Management Routes
# ----------------------

@admin_routes.route('/newsletters', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_newsletters():
    """Get all newsletter subscribers with pagination and filtering."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        page, per_page = get_pagination_params()

        # Get filter parameters
        is_active = request.args.get('is_active')
        search = request.args.get('q')

        # Build query
        query = Newsletter.query

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        if search:
            query = query.filter(
                or_(
                    Newsletter.email.ilike(f'%{search}%'),
                    Newsletter.name.ilike(f'%{search}%')
                )
            )

        # Order by creation date, newest first
        query = query.order_by(Newsletter.created_at.desc())

        return jsonify(paginate_response(query, newsletters_schema, page, per_page)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting newsletter subscribers: {str(e)}")
        return jsonify({"error": "Failed to retrieve newsletter subscribers", "details": str(e)}), 500

@admin_routes.route('/newsletters/<int:newsletter_id>/toggle', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def toggle_newsletter(newsletter_id):
    """Toggle newsletter subscription status."""
    if request.method == 'OPTIONS':
        return handle_options('POST, OPTIONS')

    try:
        newsletter = Newsletter.query.get_or_404(newsletter_id)
        newsletter.is_active = not newsletter.is_active
        newsletter.updated_at = datetime.utcnow()
        db.session.commit()

        status = "activated" if newsletter.is_active else "deactivated"

        return jsonify({
            "message": f"Newsletter subscription {status} successfully",
            "newsletter": newsletter_schema.dump(newsletter)
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling newsletter {newsletter_id}: {str(e)}")
        return jsonify({"error": f"Failed to toggle newsletter subscription", "details": str(e)}), 500

@admin_routes.route('/newsletters/export', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def export_newsletters():
    """Export newsletter subscribers to CSV."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get filter parameters
        is_active = request.args.get('is_active')

        # Build query
        query = Newsletter.query

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        # Order by email
        query = query.order_by(Newsletter.email)

        # Get all subscribers
        subscribers = query.all()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(['Email', 'Name', 'Status', 'Subscribed On'])

        # Write data
        for subscriber in subscribers:
            writer.writerow([
                subscriber.email,
                subscriber.name or '',
                'Active' if subscriber.is_active else 'Inactive',
                subscriber.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        # Create response
        response = jsonify({
            "message": f"Exported {len(subscribers)} newsletter subscribers",
            "csv_data": output.getvalue(),
            "filename": f"newsletter_subscribers_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        })

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error exporting newsletter subscribers: {str(e)}")
        return jsonify({"error": "Failed to export newsletter subscribers", "details": str(e)}), 500

@admin_routes.route('/newsletters/<int:newsletter_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_newsletter(newsletter_id):
    """Delete a newsletter subscription."""
    if request.method == 'OPTIONS':
        return handle_options('DELETE, OPTIONS')

    try:
        newsletter = Newsletter.query.get_or_404(newsletter_id)
        db.session.delete(newsletter)
        db.session.commit()

        return jsonify({"message": "Newsletter subscription deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting newsletter {newsletter_id}: {str(e)}")
        return jsonify({"error": "Failed to delete newsletter subscription", "details": str(e)}), 500

# ----------------------
# Admin Statistics Routes
# ----------------------
@admin_routes.route('/stats/sales', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_sales_stats():
    """Get sales statistics."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get time period
        period = request.args.get('period', 'month')  # day, week, month, year

        today = datetime.utcnow().date()

        if period == 'day':
            # Get sales for each hour of the day
            start_date = datetime(today.year, today.month, today.day, 0, 0, 0)
            # Fix: Use extract instead of hour function
            group_by = func.extract('hour', Order.created_at).cast(db.Integer)
            label_format = '%H:00'
        elif period == 'week':
            # Get sales for each day of the week
            start_date = today - timedelta(days=today.weekday())
            start_date = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
            # This should work as is in PostgreSQL
            group_by = func.date(Order.created_at)
            label_format = '%Y-%m-%d'
        elif period == 'year':
            # Get sales for each month of the year
            start_date = datetime(today.year, 1, 1, 0, 0, 0)
            # Fix: Use extract instead of month function
            group_by = func.extract('month', Order.created_at).cast(db.Integer)
            label_format = '%m'
        else:  # month (default)
            # Get sales for each day of the month
            start_date = datetime(today.year, today.month, 1, 0, 0, 0)
            # Fix: Use extract instead of day function
            group_by = func.extract('day', Order.created_at).cast(db.Integer)
            label_format = '%d'

        # Query sales data
        sales_data = db.session.query(
            group_by.label('period'),
            func.sum(Order.total_amount).label('total_sales'),
            func.count(Order.id).label('order_count')
        ).filter(
            Order.created_at >= start_date,
            Order.status != OrderStatus.CANCELLED
        ).group_by(
            'period'
        ).order_by(
            'period'
        ).all()

        # Format results
        formatted_data = []
        for item in sales_data:
            if period == 'day':
                # For hourly data
                label = f"{item.period}:00"
            elif period == 'week':
                # For daily data (date objects)
                label = item.period.strftime(label_format)
            elif period == 'month':
                # For daily data (integers)
                label = f"{item.period:02d}"
            else:  # year
                # For monthly data
                try:
                    month_name = datetime(today.year, int(item.period), 1).strftime('%b')
                    label = month_name
                except ValueError:
                    # Fallback if month is invalid
                    label = f"Month {item.period}"

            formatted_data.append({
                'label': label,
                'sales': float(item.total_sales),
                'orders': item.order_count
            })

        return jsonify({
            'period': period,
            'data': formatted_data
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting sales stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve sales statistics", "details": str(e)}), 500

@admin_routes.route('/stats/products', methods=['GET', 'OPTIONS'])
@cross_origin()
@admin_required
def get_product_stats():
    """Get product statistics."""
    if request.method == 'OPTIONS':
        return handle_options('GET, OPTIONS')

    try:
        # Get top selling products
        top_selling = db.session.query(
            Product.id,
            Product.name,
            Product.slug,
            Product.thumbnail_url,
            func.sum(OrderItem.quantity).label('total_quantity'),
            func.sum(OrderItem.total).label('total_sales')
        ).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Order.status != OrderStatus.CANCELLED
        ).group_by(
            Product.id
        ).order_by(
            desc('total_quantity')
        ).limit(10).all()

        # Format top selling products
        top_selling_products = []
        for product in top_selling:
            top_selling_products.append({
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'thumbnail_url': product.thumbnail_url,
                'total_quantity': product.total_quantity,
                'total_sales': float(product.total_sales)
            })

        # Get products with highest ratings
        # Fix: Remove the is_approved filter since the field doesn't exist
        highest_rated = db.session.query(
            Product.id,
            Product.name,
            Product.slug,
            Product.thumbnail_url,
            func.avg(Review.rating).label('average_rating'),
            func.count(Review.id).label('review_count')
        ).join(
            Review, Review.product_id == Product.id
        ).group_by(
            Product.id
        ).having(
            func.count(Review.id) >= 3  # At least 3 reviews
        ).order_by(
            desc('average_rating')
        ).limit(10).all()

        # Format highest rated products
        highest_rated_products = []
        for product in highest_rated:
            highest_rated_products.append({
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'thumbnail_url': product.thumbnail_url,
                'average_rating': float(product.average_rating),
                'review_count': product.review_count
            })

        # Get low stock products
        low_stock_threshold = current_app.config.get('LOW_STOCK_THRESHOLD', 5)
        low_stock = Product.query.filter(
            Product.stock <= low_stock_threshold,
            Product.stock > 0
        ).order_by(
            Product.stock
        ).limit(10).all()

        # Format low stock products
        low_stock_products = []
        for product in low_stock:
            low_stock_products.append({
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'thumbnail_url': product.thumbnail_url,
                'stock': product.stock
            })

        # Get out of stock products
        out_of_stock = Product.query.filter(
            Product.stock == 0
        ).order_by(
            Product.updated_at.desc()
        ).limit(
            10).all()

        # Format out of stock products
        out_of_stock_products = []
        for product in out_of_stock:
            out_of_stock_products.append({
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'thumbnail_url': product.thumbnail_url
            })

        return jsonify({
            'top_selling': top_selling_products,
            'highest_rated': highest_rated_products,
            'low_stock': low_stock_products,
            'out_of_stock': out_of_stock_products
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve product statistics", "details": str(e)}), 500
@admin_routes.route('/brands', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def brands():
    """Get all brands or create a new brand."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # GET - List all brands
    if request.method == 'GET':
        try:
            # Get pagination parameters
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)

            # Get filter parameters
            search = request.args.get('q')

            # Build query
            query = Brand.query

            # Apply filters
            if search:
                query = query.filter(Brand.name.ilike(f'%{search}%'))

            # Order by name
            query = query.order_by(Brand.name.asc())

            # Paginate results
            paginated = query.paginate(page=page, per_page=per_page, error_out=False)

            return jsonify({
                "items": brands_schema.dump(paginated.items),
                "pagination": {
                    "page": paginated.page,
                    "per_page": paginated.per_page,
                    "total_pages": paginated.pages,
                    "total_items": paginated.total
                }
            }), 200

        except Exception as e:
            current_app.logger.error(f"Error getting brands: {str(e)}")
            return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

    # POST - Create a new brand
    elif request.method == 'POST':
        try:
            data = request.get_json()

            # Validate required fields
            if 'name' not in data or not data['name']:
                return jsonify({"error": "Brand name is required"}), 400

            # Create new branda
            brand = Brand(
                name=data['name'],
                description=data.get('description', ''),
                logo_url=data.get('logo_url'),
                website=data.get('website')
            )

            # Set creation timestamps
            now = datetime.utcnow()
            brand.created_at = now
            brand.updated_at = now

            db.session.add(brand)
            db.session.commit()

            return jsonify({
                "message": "Brand created successfully",
                "brand": brand_schema.dump(brand)
            }), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating brand: {str(e)}")
            return jsonify({"error": "Failed to create brand", "details": str(e)}), 500

@admin_routes.route('/brands/<int:brand_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def brand_operations(brand_id):
    """Get, update, or delete a brand."""
    if request.method == 'OPTIONS':
        return handle_options('GET, PUT, DELETE, OPTIONS')

    # GET - Get brand details
    if request.method == 'GET':
        try:
            brand = Brand.query.get_or_404(brand_id)
            return jsonify(brand_schema.dump(brand)), 200

        except Exception as e:
            current_app.logger.error(f"Error getting brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

    # PUT - Update brand details
    elif request.method == 'PUT':
        try:
            brand = Brand.query.get_or_404(brand_id)
            data = request.get_json()

            # Update fields
            if 'name' in data:
                brand.name = data['name']
            if 'description' in data:
                brand.description = data['description']
            if 'logo_url' in data:
                brand.logo_url = data['logo_url']
            if 'website' in data:
                brand.website = data['website']

            brand.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Brand updated successfully",
                "brand": brand_schema.dump(brand)
            }), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to update brand", "details": str(e)}), 500

    # DELETE - Delete a brand
    elif request.method == 'DELETE':
        try:
            brand = Brand.query.get_or_404(brand_id)

            # Check if brand has products
            if hasattr(brand, 'products') and len(brand.products) > 0:
                return jsonify({
                    "error": "Cannot delete brand with associated products",
                    "products_count": len(brand.products)
                }), 400

            db.session.delete(brand)
            db.session.commit()

            return jsonify({"message": "Brand deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting brand {brand_id}: {str(e)}")
            return jsonify({"error": "Failed to delete brand", "details": str(e)}), 500

# Add this route to handle the /brands/list endpoint that your frontend is trying to access
@admin_routes.route('/brands/list', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@admin_required
def brands_list():
    """Alternative endpoint for getting all brands (for compatibility)."""
    if request.method == 'OPTIONS':
        return handle_options('GET, POST, OPTIONS')

    # For both GET and POST, return the same data
    try:
        # Get all brands without pagination
        brands_data = Brand.query.order_by(Brand.name.asc()).all()

        return jsonify({
            "items": brands_schema.dump(brands_data),
            "pagination": {
                "page": 1,
                "per_page": len(brands_data),
                "total_pages": 1,
                "total_items": len(brands_data)
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting brands list: {str(e)}")
        return jsonify({"error": "Failed to retrieve brands list", "details": str(e)}), 500
