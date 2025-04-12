"""
Admin cart routes for Mizizzi E-commerce platform.
Provides admin functionality for managing carts, shipping zones, shipping methods, payment methods, and coupons.
"""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from flask_cors import cross_origin

from ...models.models import (
  User, UserRole, Cart, CartItem, Product, ProductVariant,
  ShippingZone, ShippingMethod, PaymentMethod, Coupon, CouponType,
  db
)
from ...schemas.schemas import (
  cart_schema, cart_items_schema, cart_item_schema,
  coupon_schema, coupons_schema, shipping_method_schema, shipping_methods_schema,
  payment_method_schema, payment_methods_schema
)
from ...validations.validation import admin_required

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_cart_routes = Blueprint('admin_cart', __name__)

# Helper function for OPTIONS responses
def handle_options(allowed_methods):
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', allowed_methods)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# ----------------------
# Admin Cart Routes
# ----------------------

@admin_cart_routes.route('/carts', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_all_carts():
  """Get all carts with pagination and filtering."""
  if request.method == 'OPTIONS':
      return handle_options('GET, OPTIONS')

  try:
      # Get pagination parameters
      page = request.args.get('page', 1, type=int)
      per_page = request.args.get('per_page', 20, type=int)

      # Get filter parameters
      user_id = request.args.get('user_id', type=int)
      is_active = request.args.get('is_active')
      if is_active is not None:
          is_active = is_active.lower() == 'true'

      # Build query
      query = Cart.query

      # Apply filters
      if user_id:
          query = query.filter_by(user_id=user_id)
      if is_active is not None:
          query = query.filter_by(is_active=is_active)

      # Order by creation date, newest first
      query = query.order_by(Cart.created_at.desc())

      # Paginate results
      paginated = query.paginate(page=page, per_page=per_page, error_out=False)

      # Format response
      carts = []
      for cart in paginated.items:
          cart_dict = cart_schema.dump(cart)

          # Add user information
          user = User.query.get(cart.user_id)
          if user:
              cart_dict['user'] = {
                  'id': user.id,
                  'name': user.name,
                  'email': user.email
              }

          # Add items count
          cart_dict['items_count'] = CartItem.query.filter_by(cart_id=cart.id).count()

          carts.append(cart_dict)

      return jsonify({
          'success': True,
          'carts': carts,
          'pagination': {
              'page': paginated.page,
              'per_page': paginated.per_page,
              'total_pages': paginated.pages,
              'total_items': paginated.total
          }
      }), 200

  except Exception as e:
      logger.error(f"Error getting all carts: {str(e)}")
      return jsonify({
          'success': False,
          'error': 'An error occurred while retrieving carts',
          'details': str(e)
      }), 500

@admin_cart_routes.route('/carts/<int:cart_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def cart_operations(cart_id):
  """Get, update, or delete a specific cart by ID."""
  if request.method == 'OPTIONS':
      return handle_options('GET, PUT, DELETE, OPTIONS')

  # GET - Get cart details
  if request.method == 'GET':
      try:
          cart = Cart.query.get_or_404(cart_id)

          # Get cart items
          cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

          # Format response
          cart_dict = cart_schema.dump(cart)

          # Add user information
          user = User.query.get(cart.user_id)
          if user:
              cart_dict['user'] = {
                  'id': user.id,
                  'name': user.name,
                  'email': user.email
              }

          # Add items with product details
          items = []
          for item in cart_items:
              item_dict = cart_item_schema.dump(item)

              # Add product details
              product = Product.query.get(item.product_id)
              if product:
                  item_dict['product'] = {
                      'id': product.id,
                      'name': product.name,
                      'slug': product.slug,
                      'price': float(product.price),
                      'sale_price': float(product.sale_price) if product.sale_price else None,
                      'thumbnail_url': product.thumbnail_url
                  }

              # Add variant details if applicable
              if item.variant_id:
                  variant = ProductVariant.query.get(item.variant_id)
                  if variant:
                      item_dict['variant'] = {
                          'id': variant.id,
                          'color': variant.color,
                          'size': variant.size,
                          'price': float(variant.price)
                      }

              items.append(item_dict)

          return jsonify({
              'success': True,
              'cart': cart_dict,
              'items': items
          }), 200

      except Exception as e:
          logger.error(f"Error getting cart {cart_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while retrieving cart {cart_id}',
              'details': str(e)
          }), 500

  # PUT - Update cart
  elif request.method == 'PUT':
      try:
          cart = Cart.query.get_or_404(cart_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update fields
          if 'is_active' in data:
              cart.is_active = data['is_active']
          if 'coupon_code' in data:
              cart.coupon_code = data['coupon_code']
          if 'shipping_method_id' in data:
              cart.shipping_method_id = data['shipping_method_id']
          if 'payment_method_id' in data:
              cart.payment_method_id = data['payment_method_id']
          if 'shipping_address_id' in data:
              cart.shipping_address_id = data['shipping_address_id']
          if 'billing_address_id' in data:
              cart.billing_address_id = data['billing_address_id']
          if 'same_as_shipping' in data:
              cart.same_as_shipping = data['same_as_shipping']
          if 'requires_shipping' in data:
              cart.requires_shipping = data['requires_shipping']
          if 'notes' in data:
              cart.notes = data['notes']

          # Update cart totals
          cart.update_totals()

          cart.updated_at = datetime.utcnow()
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Cart updated successfully',
              'cart': cart_schema.dump(cart)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating cart {cart_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating cart {cart_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete cart
  elif request.method == 'DELETE':
      try:
          cart = Cart.query.get_or_404(cart_id)

          # Delete all cart items first
          CartItem.query.filter_by(cart_id=cart.id).delete()

          # Delete the cart
          db.session.delete(cart)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Cart deleted successfully'
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting cart {cart_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting cart {cart_id}',
              'details': str(e)
          }), 500

# ----------------------
# Admin Cart Items Routes
# ----------------------

@admin_cart_routes.route('/carts/<int:cart_id>/items', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def cart_items_operations(cart_id):
  """Get all items in a cart or add an item to a cart."""
  if request.method == 'OPTIONS':
      return handle_options('GET, POST, OPTIONS')

  # GET - Get cart items
  if request.method == 'GET':
      try:
          # Ensure cart exists
          Cart.query.get_or_404(cart_id)

          # Get cart items
          cart_items = CartItem.query.filter_by(cart_id=cart_id).all()

          # Format response with product details
          items = []
          for item in cart_items:
              item_dict = cart_item_schema.dump(item)

              # Add product details
              product = Product.query.get(item.product_id)
              if product:
                  item_dict['product'] = {
                      'id': product.id,
                      'name': product.name,
                      'slug': product.slug,
                      'price': float(product.price),
                      'sale_price': float(product.sale_price) if product.sale_price else None,
                      'thumbnail_url': product.thumbnail_url
                  }

              # Add variant details if applicable
              if item.variant_id:
                  variant = ProductVariant.query.get(item.variant_id)
                  if variant:
                      item_dict['variant'] = {
                          'id': variant.id,
                          'color': variant.color,
                          'size': variant.size,
                          'price': float(variant.price)
                      }

              items.append(item_dict)

          return jsonify({
              'success': True,
              'items': items
          }), 200

      except Exception as e:
          logger.error(f"Error getting cart items for cart {cart_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while retrieving cart items for cart {cart_id}',
              'details': str(e)
          }), 500

  # POST - Add item to cart
  elif request.method == 'POST':
      try:
          cart = Cart.query.get_or_404(cart_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Validate required fields
          if 'product_id' not in data:
              return jsonify({
                  'success': False,
                  'error': 'Product ID is required'
              }), 400

          # Get product
          product = Product.query.get(data['product_id'])
          if not product:
              return jsonify({
                  'success': False,
                  'error': f'Product with ID {data["product_id"]} not found'
              }), 404

          # Get variant if provided
          variant = None
          if 'variant_id' in data and data['variant_id']:
              variant = ProductVariant.query.get(data['variant_id'])
              if not variant:
                  return jsonify({
                      'success': False,
                      'error': f'Variant with ID {data["variant_id"]} not found'
                  }), 404

              # Check if variant belongs to product
              if variant.product_id != product.id:
                  return jsonify({
                      'success': False,
                      'error': 'Variant does not belong to the specified product'
                  }), 400

          # Check if item already exists in cart
          existing_item = CartItem.query.filter_by(
              cart_id=cart.id,
              product_id=product.id,
              variant_id=data.get('variant_id')
          ).first()

          # Determine price
          price = variant.price if variant and variant.price else product.price

          # Apply sale price if available
          if variant and hasattr(variant, 'sale_price') and variant.sale_price:
              price = variant.sale_price
          elif product.sale_price:
              price = product.sale_price

          # Get quantity
          quantity = int(data.get('quantity', 1))

          if existing_item:
              # Update quantity
              existing_item.quantity += quantity
              existing_item.price = float(price)  # Update price in case it changed
          else:
              # Create new cart item
              cart_item = CartItem(
                  cart_id=cart.id,
                  user_id=cart.user_id,
                  product_id=product.id,
                  variant_id=data.get('variant_id'),
                  quantity=quantity,
                  price=float(price)
              )
              db.session.add(cart_item)

          # Update cart totals
          cart.update_totals()

          db.session.commit()

          # Get updated cart items
          cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

          return jsonify({
              'success': True,
              'message': 'Item added to cart',
              'cart': cart_schema.dump(cart),
              'items': cart_items_schema.dump(cart_items)
          }), 201

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error adding item to cart {cart_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while adding item to cart {cart_id}',
              'details': str(e)
          }), 500

@admin_cart_routes.route('/carts/items/<int:item_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def cart_item_operations(item_id):
  """Update or delete a cart item."""
  if request.method == 'OPTIONS':
      return handle_options('PUT, DELETE, OPTIONS')

  # PUT - Update cart item
  if request.method == 'PUT':
      try:
          cart_item = CartItem.query.get_or_404(item_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update quantity if provided
          if 'quantity' in data:
              quantity = int(data['quantity'])

              # If quantity is 0, remove item
              if quantity <= 0:
                  cart = Cart.query.get(cart_item.cart_id)
                  db.session.delete(cart_item)

                  # Update cart totals
                  cart.update_totals()
                  db.session.commit()

                  # Get updated cart items
                  cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

                  return jsonify({
                      'success': True,
                      'message': 'Item removed from cart',
                      'cart': cart_schema.dump(cart),
                      'items': cart_items_schema.dump(cart_items)
                  }), 200

              cart_item.quantity = quantity

          # Update price if provided
          if 'price' in data:
              cart_item.price = float(data['price'])

          # Get cart
          cart = Cart.query.get(cart_item.cart_id)

          # Update cart totals
          cart.update_totals()

          db.session.commit()

          # Get updated cart items
          cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

          return jsonify({
              'success': True,
              'message': 'Cart item updated',
              'cart': cart_schema.dump(cart),
              'items': cart_items_schema.dump(cart_items)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating cart item {item_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating cart item {item_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete cart item
  elif request.method == 'DELETE':
      try:
          cart_item = CartItem.query.get_or_404(item_id)
          cart = Cart.query.get(cart_item.cart_id)

          # Delete the item
          db.session.delete(cart_item)

          # Update cart totals
          cart.update_totals()

          db.session.commit()

          # Get updated cart items
          cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

          return jsonify({
              'success': True,
              'message': 'Cart item deleted',
              'cart': cart_schema.dump(cart),
              'items': cart_items_schema.dump(cart_items)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting cart item {item_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting cart item {item_id}',
              'details': str(e)
          }), 500

# ----------------------
# Admin Shipping Zone Routes
# ----------------------

@admin_cart_routes.route('/shipping-zones', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def shipping_zones_operations():
  """Get all shipping zones or create a new shipping zone."""
  if request.method == 'OPTIONS':
      return handle_options('GET, POST, OPTIONS')

  # GET - Get all shipping zones
  if request.method == 'GET':
      try:
          # Get all shipping zones
          shipping_zones = ShippingZone.query.all()

          # Format response
          zones = []
          for zone in shipping_zones:
              zone_dict = {
                  'id': zone.id,
                  'name': zone.name,
                  'country': zone.country,
                  'all_regions': zone.all_regions,
                  'available_regions': zone.available_regions.split(',') if zone.available_regions else [],
                  'min_order_value': zone.min_order_value,
                  'is_active': zone.is_active,
                  'shipping_methods': []
              }

              # Add shipping methods
              # Replace this line in the GET method:
              # for method in zone.shipping_methods:
              #     zone_dict['shipping_methods'].append(shipping_method_to_dict(method))

              # With this:
              zone_dict['shipping_methods'] = shipping_methods_schema.dump(zone.shipping_methods)

              zones.append(zone_dict)

          return jsonify({
              'success': True,
              'shipping_zones': zones
          }), 200

      except Exception as e:
          logger.error(f"Error getting shipping zones: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while retrieving shipping zones',
              'details': str(e)
          }), 500

  # POST - Create a new shipping zone
  elif request.method == 'POST':
      try:
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Validate required fields
          if 'name' not in data:
              return jsonify({
                  'success': False,
                  'error': 'Name is required'
              }), 400

          if 'country' not in data:
              return jsonify({
                  'success': False,
                  'error': 'Country is required'
              }), 400

          # Create new shipping zone
          new_zone = ShippingZone(
              name=data['name'],
              country=data['country'],
              all_regions=data.get('all_regions', False),
              available_regions=data.get('available_regions'),
              min_order_value=data.get('min_order_value'),
              is_active=data.get('is_active', True)
          )

          db.session.add(new_zone)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping zone created successfully',
              'shipping_zone': {
                  'id': new_zone.id,
                  'name': new_zone.name,
                  'country': new_zone.country,
                  'all_regions': new_zone.all_regions,
                  'available_regions': new_zone.available_regions.split(',') if new_zone.available_regions else [],
                  'min_order_value': new_zone.min_order_value,
                  'is_active': new_zone.is_active
              }
          }), 201

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error creating shipping zone: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while creating shipping zone',
              'details': str(e)
          }), 500

@admin_cart_routes.route('/shipping-zones/<int:zone_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def shipping_zone_operations(zone_id):
  """Update or delete a shipping zone."""
  if request.method == 'OPTIONS':
      return handle_options('PUT, DELETE, OPTIONS')

  # PUT - Update shipping zone
  if request.method == 'PUT':
      try:
          zone = ShippingZone.query.get_or_404(zone_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update fields
          if 'name' in data:
              zone.name = data['name']
          if 'country' in data:
              zone.country = data['country']
          if 'all_regions' in data:
              zone.all_regions = data['all_regions']
          if 'available_regions' in data:
              zone.available_regions = data['available_regions']
          if 'min_order_value' in data:
              zone.min_order_value = data['min_order_value']
          if 'is_active' in data:
              zone.is_active = data['is_active']

          zone.updated_at = datetime.utcnow()
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping zone updated successfully',
              'shipping_zone': {
                  'id': zone.id,
                  'name': zone.name,
                  'country': zone.country,
                  'all_regions': zone.all_regions,
                  'available_regions': zone.available_regions.split(',') if zone.available_regions else [],
                  'min_order_value': zone.min_order_value,
                  'is_active': zone.is_active
              }
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating shipping zone {zone_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating shipping zone {zone_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete shipping zone
  elif request.method == 'DELETE':
      try:
          zone = ShippingZone.query.get_or_404(zone_id)

          # Check if zone has shipping methods
          if zone.shipping_methods:
              return jsonify({
                  'success': False,
                  'error': 'Cannot delete shipping zone with associated shipping methods'
              }), 400

          db.session.delete(zone)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping zone deleted successfully'
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting shipping zone {zone_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting shipping zone {zone_id}',
              'details': str(e)
          }), 500

# ----------------------
# Admin Shipping Method Routes
# ----------------------

@admin_cart_routes.route('/shipping-methods', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def shipping_methods_operations():
  """Get all shipping methods or create a new shipping method."""
  if request.method == 'OPTIONS':
      return handle_options('GET, POST, OPTIONS')

  # GET - Get all shipping methods
  if request.method == 'GET':
      try:
          # Get filter parameters
          zone_id = request.args.get('zone_id', type=int)
          is_active = request.args.get('is_active')
          if is_active is not None:
              is_active = is_active.lower() == 'true'

          # Build query
          query = ShippingMethod.query

          # Apply filters
          if zone_id:
              query = query.filter_by(shipping_zone_id=zone_id)
          if is_active is not None:
              query = query.filter_by(is_active=is_active)

          # Get all shipping methods
          shipping_methods = query.all()

          # Format response
          methods = shipping_methods_schema.dump(shipping_methods)
          for method_dict in methods:
              # Add zone information
              zone = ShippingZone.query.get(method_dict['shipping_zone_id'])
              if zone:
                  method_dict['zone'] = {
                      'id': zone.id,
                      'name': zone.name,
                      'country': zone.country
                  }

          return jsonify({
              'success': True,
              'shipping_methods': methods
          }), 200

      except Exception as e:
          logger.error(f"Error getting shipping methods: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while retrieving shipping methods',
              'details': str(e)
          }), 500

  # POST - Create a new shipping method
  elif request.method == 'POST':
      try:
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Validate required fields
          required_fields = ['shipping_zone_id', 'name', 'cost']
          for field in required_fields:
              if field not in data:
                  return jsonify({
                      'success': False,
                      'error': f'{field} is required'
                  }), 400

          # Check if shipping zone exists
          zone = ShippingZone.query.get(data['shipping_zone_id'])
          if not zone:
              return jsonify({
                  'success': False,
                  'error': f'Shipping zone with ID {data["shipping_zone_id"]} not found'
              }), 404

          # Create new shipping method
          new_method = ShippingMethod(
              shipping_zone_id=data['shipping_zone_id'],
              name=data['name'],
              description=data.get('description'),
              cost=data['cost'],
              min_order_value=data.get('min_order_value'),
              max_weight=data.get('max_weight'),
              estimated_days=data.get('estimated_days'),
              is_active=data.get('is_active', True)
          )

          db.session.add(new_method)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping method created successfully',
              'shipping_method': shipping_method_schema.dump(new_method)
          }), 201

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error creating shipping method: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while creating shipping method',
              'details': str(e)
          }), 500

@admin_cart_routes.route('/shipping-methods/<int:method_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def shipping_method_operations(method_id):
  """Update or delete a shipping method."""
  if request.method == 'OPTIONS':
      return handle_options('PUT, DELETE, OPTIONS')

  # PUT - Update shipping method
  if request.method == 'PUT':
      try:
          method = ShippingMethod.query.get_or_404(method_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update fields
          if 'shipping_zone_id' in data:
              # Check if shipping zone exists
              zone = ShippingZone.query.get(data['shipping_zone_id'])
              if not zone:
                  return jsonify({
                      'success': False,
                      'error': f'Shipping zone with ID {data["shipping_zone_id"]} not found'
                  }), 404
              method.shipping_zone_id = data['shipping_zone_id']

          if 'name' in data:
              method.name = data['name']
          if 'description' in data:
              method.description = data['description']
          if 'cost' in data:
              method.cost = data['cost']
          if 'min_order_value' in data:
              method.min_order_value = data['min_order_value']
          if 'max_weight' in data:
              method.max_weight = data['max_weight']
          if 'estimated_days' in data:
              method.estimated_days = data['estimated_days']
          if 'is_active' in data:
              method.is_active = data['is_active']

          method.updated_at = datetime.utcnow()
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping method updated successfully',
              'shipping_method': shipping_method_schema.dump(method)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating shipping method {method_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating shipping method {method_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete shipping method
  elif request.method == 'DELETE':
      try:
          method = ShippingMethod.query.get_or_404(method_id)

          # Check if method is being used by any carts
          carts_using_method = Cart.query.filter_by(shipping_method_id=method_id).count()
          if carts_using_method > 0:
              return jsonify({
                  'success': False,
                  'error': f'Cannot delete shipping method that is being used by {carts_using_method} carts'
              }), 400

          db.session.delete(method)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Shipping method deleted successfully'
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting shipping method {method_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting shipping method {method_id}',
              'details': str(e)
          }), 500

# ----------------------
# Admin Payment Method Routes
# ----------------------

@admin_cart_routes.route('/payment-methods', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def payment_methods_operations():
  """Get all payment methods or create a new payment method."""
  if request.method == 'OPTIONS':
      return handle_options('GET, POST, OPTIONS')

  # GET - Get all payment methods
  if request.method == 'GET':
      try:
          # Get filter parameters
          is_active = request.args.get('is_active')
          if is_active is not None:
              is_active = is_active.lower() == 'true'

          # Build query
          query = PaymentMethod.query

          # Apply filters
          if is_active is not None:
              query = query.filter_by(is_active=is_active)

          # Get all payment methods
          payment_methods = query.all()

          # Format response
          # Replace this line:
          # methods = [payment_method_to_dict(method) for method in payment_methods]

          # With this:
          methods = payment_methods_schema.dump(payment_methods)

          return jsonify({
              'success': True,
              'payment_methods': methods
          }), 200

      except Exception as e:
          logger.error(f"Error getting payment methods: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while retrieving payment methods',
              'details': str(e)
          }), 500

  # POST - Create a new payment method
  elif request.method == 'POST':
      try:
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Validate required fields
          required_fields = ['name', 'code']
          for field in required_fields:
              if field not in data:
                  return jsonify({
                      'success': False,
                      'error': f'{field} is required'
                  }), 400

          # Check if code already exists
          existing_method = PaymentMethod.query.filter_by(code=data['code']).first()
          if existing_method:
              return jsonify({
                  'success': False,
                  'error': f'Payment method with code {data["code"]} already exists'
              }), 409

          # Create new payment method
          new_method = PaymentMethod(
              name=data['name'],
              code=data['code'],
              description=data.get('description'),
              instructions=data.get('instructions'),
              min_amount=data.get('min_amount'),
              max_amount=data.get('max_amount'),
              countries=data.get('countries'),
              is_active=data.get('is_active', True)
          )

          db.session.add(new_method)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Payment method created successfully',
              'payment_method': payment_method_schema.dump(new_method)
          }), 201

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error creating payment method: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while creating payment method',
              'details': str(e)
          }), 500

@admin_cart_routes.route('/payment-methods/<int:method_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def payment_method_operations(method_id):
  """Update or delete a payment method."""
  if request.method == 'OPTIONS':
      return handle_options('PUT, DELETE, OPTIONS')

  # PUT - Update payment method
  if request.method == 'PUT':
      try:
          method = PaymentMethod.query.get_or_404(method_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update fields
          if 'name' in data:
              method.name = data['name']
          if 'code' in data:
              # Check if code already exists
              existing_method = PaymentMethod.query.filter_by(code=data['code']).first()
              if existing_method and existing_method.id != method_id:
                  return jsonify({
                      'success': False,
                      'error': f'Payment method with code {data["code"]} already exists'
                  }), 409
              method.code = data['code']
          if 'description' in data:
              method.description = data['description']
          if 'instructions' in data:
              method.instructions = data['instructions']
          if 'min_amount' in data:
              method.min_amount = data['min_amount']
          if 'max_amount' in data:
              method.max_amount = data['max_amount']
          if 'countries' in data:
              method.countries = data['countries']
          if 'is_active' in data:
              method.is_active = data['is_active']

          method.updated_at = datetime.utcnow()
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Payment method updated successfully',
              'payment_method': payment_method_schema.dump(method)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating payment method {method_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating payment method {method_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete payment method
  elif request.method == 'DELETE':
      try:
          method = PaymentMethod.query.get_or_404(method_id)

          # Check if method is being used by any carts
          carts_using_method = Cart.query.filter_by(payment_method_id=method_id).count()
          if carts_using_method > 0:
              return jsonify({
                  'success': False,
                  'error': f'Cannot delete payment method that is being used by {carts_using_method} carts'
              }), 400

          db.session.delete(method)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Payment method deleted successfully'
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting payment method {method_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting payment method {method_id}',
              'details': str(e)
          }), 500

# ----------------------
# Admin Coupon Routes
# ----------------------

@admin_cart_routes.route('/coupons', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def coupons_operations():
  """Get all coupons or create a new coupon."""
  if request.method == 'OPTIONS':
      return handle_options('GET, POST, OPTIONS')

  # GET - Get all coupons
  if request.method == 'GET':
      try:
          # Get filter parameters
          is_active = request.args.get('is_active')
          if is_active is not None:
              is_active = is_active.lower() == 'true'

          # Build query
          query = Coupon.query

          # Apply filters
          if is_active is not None:
              query = query.filter_by(is_active=is_active)

          # Get all coupons
          coupons = query.all()

          return jsonify({
              'success': True,
              'coupons': coupons_schema.dump(coupons)
          }), 200

      except Exception as e:
          logger.error(f"Error getting coupons: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while retrieving coupons',
              'details': str(e)
          }), 500

  # POST - Create a new coupon
  elif request.method == 'POST':
      try:
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Validate required fields
          required_fields = ['code', 'type', 'value']
          for field in required_fields:
              if field not in data:
                  return jsonify({
                      'success': False,
                      'error': f'{field} is required'
                  }), 400

          # Check if code already exists
          existing_coupon = Coupon.query.filter_by(code=data['code']).first()
          if existing_coupon:
              return jsonify({
                  'success': False,
                  'error': f'Coupon with code {data["code"]} already exists'
              }), 409

          # Validate coupon type
          try:
              coupon_type = CouponType(data['type'])
          except ValueError:
              return jsonify({
                  'success': False,
                  'error': f'Invalid coupon type: {data["type"]}. Must be one of: {", ".join([t.value for t in CouponType])}'
              }), 400

          # Parse dates if provided
          start_date = None
          if 'start_date' in data and data['start_date']:
              try:
                  start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
              except ValueError:
                  return jsonify({
                      'success': False,
                      'error': 'Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
                  }), 400

          end_date = None
          if 'end_date' in data and data['end_date']:
              try:
                  end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
              except ValueError:
                  return jsonify({
                      'success': False,
                      'error': 'Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
                  }), 400

          # Create new coupon
          new_coupon = Coupon(
              code=data['code'],
              type=coupon_type,
              value=data['value'],
              min_purchase=data.get('min_purchase'),
              max_discount=data.get('max_discount'),
              start_date=start_date,
              end_date=end_date,
              usage_limit=data.get('usage_limit'),
              used_count=data.get('used_count', 0),
              is_active=data.get('is_active', True)
          )

          db.session.add(new_coupon)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Coupon created successfully',
              'coupon': coupon_schema.dump(new_coupon)
          }), 201

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error creating coupon: {str(e)}")
          return jsonify({
              'success': False,
              'error': 'An error occurred while creating coupon',
              'details': str(e)
          }), 500

@admin_cart_routes.route('/coupons/<int:coupon_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def coupon_operations(coupon_id):
  """Update or delete a coupon."""
  if request.method == 'OPTIONS':
      return handle_options('PUT, DELETE, OPTIONS')

  # PUT - Update coupon
  if request.method == 'PUT':
      try:
          coupon = Coupon.query.get_or_404(coupon_id)
          data = request.get_json()

          if not data:
              return jsonify({
                  'success': False,
                  'error': 'No data provided'
              }), 400

          # Update fields
          if 'code' in data:
              # Check if code already exists
              existing_coupon = Coupon.query.filter_by(code=data['code']).first()
              if existing_coupon and existing_coupon.id != coupon_id:
                  return jsonify({
                      'success': False,
                      'error': f'Coupon with code {data["code"]} already exists'
                  }), 409
              coupon.code = data['code']

          if 'type' in data:
              # Validate coupon type
              try:
                  coupon_type = CouponType(data['type'])
                  coupon.type = coupon_type
              except ValueError:
                  return jsonify({
                      'success': False,
                      'error': f'Invalid coupon type: {data["type"]}. Must be one of: {", ".join([t.value for t in CouponType])}'
                  }), 400

          if 'value' in data:
              coupon.value = data['value']

          if 'min_purchase' in data:
              coupon.min_purchase = data['min_purchase']

          if 'max_discount' in data:
              coupon.max_discount = data['max_discount']

          # Parse dates if provided
          if 'start_date' in data:
              if data['start_date']:
                  try:
                      coupon.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
                  except ValueError:
                      return jsonify({
                          'success': False,
                          'error': 'Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
                      }), 400
              else:
                  coupon.start_date = None

          if 'end_date' in data:
              if data['end_date']:
                  try:
                      coupon.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
                  except ValueError:
                      return jsonify({
                          'success': False,
                          'error': 'Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
                      }), 400
              else:
                  coupon.end_date = None

          if 'usage_limit' in data:
              coupon.usage_limit = data['usage_limit']

          if 'used_count' in data:
              coupon.used_count = data['used_count']

          if 'is_active' in data:
              coupon.is_active = data['is_active']

          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Coupon updated successfully',
              'coupon': coupon_schema.dump(coupon)
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error updating coupon {coupon_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while updating coupon {coupon_id}',
              'details': str(e)
          }), 500

  # DELETE - Delete coupon
  elif request.method == 'DELETE':
      try:
          coupon = Coupon.query.get_or_404(coupon_id)

          # Check if coupon is being used by any carts
          carts_using_coupon = Cart.query.filter_by(coupon_code=coupon.code).count()
          if carts_using_coupon > 0:
              return jsonify({
                  'success': False,
                  'error': f'Cannot delete coupon that is being used by {carts_using_coupon} carts'
              }), 400

          db.session.delete(coupon)
          db.session.commit()

          return jsonify({
              'success': True,
              'message': 'Coupon deleted successfully'
          }), 200

      except Exception as e:
          db.session.rollback()
          logger.error(f"Error deleting coupon {coupon_id}: {str(e)}")
          return jsonify({
              'success': False,
              'error': f'An error occurred while deleting coupon {coupon_id}',
              'details': str(e)
          }), 500

# Add a simple test route at the end of the file

@admin_cart_routes.route('/test', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def test_admin_cart_routes():
  """Test route to verify admin cart routes are working."""
  if request.method == 'OPTIONS':
      return handle_options('GET, OPTIONS')

  return jsonify({
      'success': True,
      'message': 'Admin cart routes are working correctly!'
  }), 200
