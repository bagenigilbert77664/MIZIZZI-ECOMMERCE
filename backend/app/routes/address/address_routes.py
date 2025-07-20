"""
Address routes for Mizizzi E-commerce platform.
Handles user address management with validation for both users and admins.
"""
# Standard Libraries
import logging
from datetime import datetime
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

# Database & ORM
from sqlalchemy import text, func
from ...configuration.extensions import db

# Models
from ...models.models import Address, AddressType, User, UserRole

# Schemas
from ...schemas.schemas import address_schema, addresses_schema

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
address_routes = Blueprint('address_routes', __name__)

# Helper Functions
def get_pagination_params():
    """Get pagination parameters from request."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    # Limit per_page to prevent abuse
    per_page = min(per_page, 100)
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
            }
        }

def is_admin_user(user_id):
    """Check if user is admin."""
    try:
        user = User.query.get(user_id)
        return user and user.role == UserRole.ADMIN
    except Exception:
        return False

def get_address_type_enum(address_type_str):
    """Convert string to AddressType enum."""
    if not address_type_str:
        return None

    try:
        address_type_upper = address_type_str.upper()
        if address_type_upper == 'SHIPPING':
            return AddressType.SHIPPING
        elif address_type_upper == 'BILLING':
            return AddressType.BILLING
        elif address_type_upper == 'BOTH':
            return AddressType.BOTH
        else:
            return None
    except (ValueError, AttributeError):
        return None

def admin_required(f):
    """Decorator to require admin access."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        if not is_admin_user(current_user_id):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

# ----------------------
# Health Check Route
# ----------------------

@address_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def health_check():
    """Health check endpoint for address service."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        db.session.commit()

        return jsonify({
            "status": "healthy",
            "service": "address",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "service": "address",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }), 503

# ----------------------
# User Address Routes
# ----------------------

@address_routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_addresses():
    """Get user's addresses or all addresses for admin."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Check if user is admin
        is_admin = is_admin_user(current_user_id)

        # Get filter parameters
        address_type = request.args.get('type')
        user_id_filter = request.args.get('user_id')

        # Build base query
        if is_admin and user_id_filter:
            # Admin can filter by user_id
            query = Address.query.filter_by(user_id=user_id_filter)
        elif is_admin and not user_id_filter:
            # Admin gets all addresses if no user_id specified
            query = Address.query
        else:
            # Regular users get only their addresses
            query = Address.query.filter_by(user_id=current_user_id)

        # Apply address type filter
        if address_type:
            address_type_enum = get_address_type_enum(address_type)
            if address_type_enum:
                query = query.filter_by(address_type=address_type_enum)

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Order by creation date, with default addresses first
        query = query.order_by(
            Address.is_default.desc(),
            Address.created_at.desc()
        )

        result = paginate_response(query, addresses_schema, page, per_page)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting addresses: {str(e)}")
        return jsonify({"error": "Failed to retrieve addresses", "details": str(e)}), 500

@address_routes.route('/<int:address_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_address(address_id):
    """Get address by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address:
            return jsonify({"error": "Address not found"}), 404

        # Check permissions
        is_admin = is_admin_user(current_user_id)
        if not is_admin and str(address.user_id) != str(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        logger.error(f"Error getting address {address_id}: {str(e)}")
        return jsonify({"error": "Failed to retrieve address", "details": str(e)}), 500

@address_routes.route('/', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def create_address():
    """Create a new address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        required_fields = [
            'first_name', 'last_name', 'address_line1',
            'city', 'state', 'postal_code', 'country', 'phone'
        ]

        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"{field} is required"}), 400

        # Parse address type
        address_type = AddressType.BOTH  # Default
        if 'address_type' in data:
            address_type_enum = get_address_type_enum(data['address_type'])
            if address_type_enum:
                address_type = address_type_enum
            else:
                return jsonify({"error": "Invalid address type. Use 'shipping', 'billing', or 'both'"}), 400

        # Determine target user (admin can create for other users)
        target_user_id = current_user_id
        is_admin = is_admin_user(current_user_id)
        if is_admin and 'user_id' in data:
            target_user_id = data['user_id']
            # Verify target user exists
            target_user = User.query.get(target_user_id)
            if not target_user:
                return jsonify({"error": "Target user not found"}), 404

        # Create new address
        new_address = Address(
            user_id=target_user_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            address_line1=data['address_line1'],
            address_line2=data.get('address_line2', ''),
            city=data['city'],
            state=data['state'],
            postal_code=data['postal_code'],
            country=data['country'],
            phone=data['phone'],
            alternative_phone=data.get('alternative_phone', ''),
            address_type=address_type,
            is_default=data.get('is_default', False),
            additional_info=data.get('additional_info', '')
        )

        # Handle default address settings
        if new_address.is_default:
            # Remove default flag from other addresses for this user
            Address.query.filter_by(
                user_id=target_user_id,
                is_default=True
            ).update({'is_default': False})

        db.session.add(new_address)
        db.session.commit()

        logger.info(f"Address created successfully for user {target_user_id}")
        return jsonify({
            "message": "Address created successfully",
            "address": address_schema.dump(new_address)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating address: {str(e)}")
        return jsonify({"error": "Failed to create address", "details": str(e)}), 500

@address_routes.route('/<int:address_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
def update_address(address_id):
    """Update an address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address:
            return jsonify({"error": "Address not found"}), 404

        # Check permissions
        is_admin = is_admin_user(current_user_id)
        if not is_admin and str(address.user_id) != str(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields
        updatable_fields = [
            'first_name', 'last_name', 'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country', 'phone',
            'alternative_phone', 'additional_info'
        ]

        for field in updatable_fields:
            if field in data:
                setattr(address, field, data[field])

        # Handle address type
        if 'address_type' in data:
            address_type_enum = get_address_type_enum(data['address_type'])
            if address_type_enum:
                address.address_type = address_type_enum
            else:
                return jsonify({"error": "Invalid address type"}), 400

        # Handle default flag
        if 'is_default' in data and data['is_default'] and not address.is_default:
            # Remove default flag from other addresses for this user
            Address.query.filter_by(
                user_id=address.user_id,
                is_default=True
            ).update({'is_default': False})
            address.is_default = True
        elif 'is_default' in data:
            address.is_default = data['is_default']

        address.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Address {address_id} updated successfully")
        return jsonify({
            "message": "Address updated successfully",
            "address": address_schema.dump(address)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating address {address_id}: {str(e)}")
        return jsonify({"error": "Failed to update address", "details": str(e)}), 500

@address_routes.route('/<int:address_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_address(address_id):
    """Delete an address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address:
            return jsonify({"error": "Address not found"}), 404

        # Check permissions
        is_admin = is_admin_user(current_user_id)
        if not is_admin and str(address.user_id) != str(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403

        user_id = address.user_id
        was_default = address.is_default

        # Check if this is the only address
        address_count = Address.query.filter_by(user_id=user_id).count()

        # Delete the address
        db.session.delete(address)

        # If this was a default address and there are other addresses, set a new default
        if was_default and address_count > 1:
            # Find another address to make default
            another_address = Address.query.filter_by(user_id=user_id).first()
            if another_address:
                another_address.is_default = True

        db.session.commit()

        logger.info(f"Address {address_id} deleted successfully")
        return jsonify({"message": "Address deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting address {address_id}: {str(e)}")
        return jsonify({"error": "Failed to delete address", "details": str(e)}), 500

@address_routes.route('/default', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_default_address():
    """Get user's default address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        user_id_param = request.args.get('user_id')

        # Determine target user
        target_user_id = current_user_id
        is_admin = is_admin_user(current_user_id)

        if is_admin and user_id_param:
            target_user_id = user_id_param
        elif user_id_param and not is_admin:
            return jsonify({"error": "Unauthorized"}), 403

        # Find default address
        address = Address.query.filter_by(
            user_id=target_user_id,
            is_default=True
        ).first()

        if not address:
            # If no default address, get the first address
            address = Address.query.filter_by(user_id=target_user_id).first()

        if not address:
            return jsonify({"message": "No address found"}), 404

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        logger.error(f"Error getting default address: {str(e)}")
        return jsonify({"error": "Failed to retrieve default address", "details": str(e)}), 500

@address_routes.route('/<int:address_id>/set-default', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def set_default_address(address_id):
    """Set an address as default."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get(address_id)

        if not address:
            return jsonify({"error": "Address not found"}), 404

        # Check permissions
        is_admin = is_admin_user(current_user_id)
        if not is_admin and str(address.user_id) != str(current_user_id):
            return jsonify({"error": "Unauthorized"}), 403

        # Remove default flag from other addresses for this user
        Address.query.filter_by(
            user_id=address.user_id,
            is_default=True
        ).update({'is_default': False})

        # Set this address as default
        address.is_default = True
        db.session.commit()

        logger.info(f"Address {address_id} set as default")
        return jsonify({
            "message": "Default address set successfully",
            "address": address_schema.dump(address)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting default address {address_id}: {str(e)}")
        return jsonify({"error": "Failed to set default address", "details": str(e)}), 500

# ----------------------
# Admin-Only Routes
# ----------------------

@address_routes.route('/admin/users/<int:user_id>/addresses', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_get_user_addresses(user_id):
    """Admin: Get all addresses for a specific user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Verify user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get filter parameters
        address_type = request.args.get('type')

        # Build query
        query = Address.query.filter_by(user_id=user_id)

        # Apply address type filter
        if address_type:
            address_type_enum = get_address_type_enum(address_type)
            if address_type_enum:
                query = query.filter_by(address_type=address_type_enum)

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Order by creation date, with default addresses first
        query = query.order_by(
            Address.is_default.desc(),
            Address.created_at.desc()
        )

        result = paginate_response(query, addresses_schema, page, per_page)
        result['user'] = {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting addresses for user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to retrieve user addresses", "details": str(e)}), 500

@address_routes.route('/admin/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_get_address_stats():
    """Admin: Get address statistics."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Get basic stats
        total_addresses = Address.query.count()
        total_users_with_addresses = db.session.query(Address.user_id).distinct().count()

        # Get address type distribution
        shipping_count = Address.query.filter_by(address_type=AddressType.SHIPPING).count()
        billing_count = Address.query.filter_by(address_type=AddressType.BILLING).count()
        both_count = Address.query.filter_by(address_type=AddressType.BOTH).count()

        # Get country distribution (top 10)
        country_stats = db.session.query(
            Address.country,
            func.count(Address.id).label('count')
        ).group_by(Address.country).order_by(
            func.count(Address.id).desc()
        ).limit(10).all()

        stats = {
            "total_addresses": total_addresses,
            "total_users_with_addresses": total_users_with_addresses,
            "address_type_distribution": {
                "shipping": shipping_count,
                "billing": billing_count,
                "both": both_count
            },
            "top_countries": [
                {"country": country, "count": count}
                for country, count in country_stats
            ],
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"Error getting address stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve address statistics", "details": str(e)}), 500

# ----------------------
# Search and Filter Routes
# ----------------------

@address_routes.route('/search', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def search_addresses():
    """Search addresses (users see only their addresses, admins see all)."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        is_admin = is_admin_user(current_user_id)

        # Get search parameters
        query_param = request.args.get('q', '').strip()
        city = request.args.get('city', '').strip()
        state = request.args.get('state', '').strip()
        country = request.args.get('country', '').strip()
        address_type = request.args.get('type', '').strip()

        # Build base query
        if is_admin:
            query = Address.query
        else:
            query = Address.query.filter_by(user_id=current_user_id)

        # Apply search filters
        if query_param:
            search_filter = db.or_(
                Address.first_name.ilike(f'%{query_param}%'),
                Address.last_name.ilike(f'%{query_param}%'),
                Address.address_line1.ilike(f'%{query_param}%'),
                Address.address_line2.ilike(f'%{query_param}%'),
                Address.phone.ilike(f'%{query_param}%')
            )
            query = query.filter(search_filter)

        if city:
            query = query.filter(Address.city.ilike(f'%{city}%'))

        if state:
            query = query.filter(Address.state.ilike(f'%{state}%'))

        if country:
            query = query.filter(Address.country.ilike(f'%{country}%'))

        if address_type:
            address_type_enum = get_address_type_enum(address_type)
            if address_type_enum:
                query = query.filter_by(address_type=address_type_enum)

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Order results
        query = query.order_by(
            Address.is_default.desc(),
            Address.created_at.desc()
        )

        result = paginate_response(query, addresses_schema, page, per_page)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error searching addresses: {str(e)}")
        return jsonify({"error": "Failed to search addresses", "details": str(e)}), 500
