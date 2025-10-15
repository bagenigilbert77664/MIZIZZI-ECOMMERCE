"""
Comprehensive tests for admin cart management routes.
Tests all admin cart functionality including CRUD operations, validation, and error handling.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from app.models.models import Cart, CartItem, User, Product, db


class TestAdminCartHealthCheck:
    """Test admin cart health check functionality"""

    def test_health_check_success(self, client):
        """Test successful health check"""
        response = client.get('/api/admin/cart/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['service'] == 'admin_cart_routes'
        assert data['status'] == 'healthy'
        assert 'timestamp' in data


class TestAdminCartListAndRetrieve:
    """Test admin cart listing and retrieval functionality"""

    def test_list_carts_success(self, client, admin_headers, user_cart, another_user_cart, guest_cart):
        """Test successful cart listing"""
        response = client.get('/api/admin/cart/carts', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'carts' in data
        assert 'pagination' in data
        assert len(data['carts']) >= 3  # At least our test carts

        # Check pagination structure
        pagination = data['pagination']
        assert 'page' in pagination
        assert 'per_page' in pagination
        assert 'total_pages' in pagination
        assert 'total_items' in pagination

    def test_list_carts_with_user_filter(self, client, admin_headers, user_cart, regular_user):
        """Test cart listing with user filter"""
        response = client.get(
            f'/api/admin/cart/carts?user_id={regular_user.id}',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['carts']) == 1
        assert data['carts'][0]['user_id'] == regular_user.id

    def test_list_carts_with_active_filter(self, client, admin_headers, user_cart, inactive_cart):
        """Test cart listing with active filter"""
        response = client.get('/api/admin/cart/carts?is_active=true', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # All returned carts should be active
        for cart in data['carts']:
            assert cart['is_active'] is True

    def test_list_carts_pagination(self, client, admin_headers, user_cart):
        """Test cart listing pagination"""
        response = client.get('/api/admin/cart/carts?page=1&per_page=5', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5

    def test_get_cart_success(self, client, admin_headers, user_cart):
        """Test successful cart retrieval"""
        response = client.get(f'/api/admin/cart/carts/{user_cart.id}', headers=admin_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'cart' in data
        assert 'items' in data
        assert data['cart']['id'] == user_cart.id
        assert len(data['items']) >= 1  # Should have at least one item

    def test_get_cart_not_found(self, client, admin_headers):
        """Test cart retrieval with non-existent cart"""
        response = client.get('/api/admin/cart/carts/99999', headers=admin_headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']

    def test_list_carts_unauthorized(self, client, user_headers):
        """Test cart listing without admin privileges"""
        response = client.get('/api/admin/cart/carts', headers=user_headers)

        assert response.status_code == 403
        data = json.loads(response.data)
        assert data['success'] is False


class TestAdminCartItemManagement:
    """Test admin cart item management functionality"""

    def test_add_item_to_cart_success(self, client, admin_headers, empty_cart, product):
        """Test successful item addition to cart"""
        item_data = {
            'product_id': product.id,
            'quantity': 2
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'cart' in data
        assert 'items' in data
        assert len(data['items']) == 1
        assert data['items'][0]['quantity'] == 2
        assert data['items'][0]['product_id'] == product.id
        assert 'Item added to cart successfully' in data['message']

    def test_add_item_with_variant(self, client, admin_headers, empty_cart, product, product_variant):
        """Test adding item with variant to cart"""
        item_data = {
            'product_id': product.id,
            'variant_id': product_variant.id,
            'quantity': 1
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['items'][0]['variant_id'] == product_variant.id

    def test_add_item_updates_existing(self, client, admin_headers, user_cart, product):
        """Test that adding existing item updates quantity"""
        item_data = {
            'product_id': product.id,
            'quantity': 3
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Should update existing item quantity
        assert data['items'][0]['quantity'] == 3

    def test_add_item_missing_data(self, client, admin_headers, empty_cart):
        """Test adding item with missing required data"""
        item_data = {
            'quantity': 1
            # Missing product_id
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Product ID and quantity are required' in data['error']

    def test_add_item_invalid_quantity(self, client, admin_headers, empty_cart, product):
        """Test adding item with invalid quantity"""
        item_data = {
            'product_id': product.id,
            'quantity': -1
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'positive integer' in data['error']

    def test_add_item_nonexistent_product(self, client, admin_headers, empty_cart):
        """Test adding non-existent product to cart"""
        item_data = {
            'product_id': 99999,
            'quantity': 1
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Product not found' in data['error']

    def test_add_item_invalid_variant(self, client, admin_headers, empty_cart, product, product_variant):
        """Test adding item with invalid variant"""
        item_data = {
            'product_id': product.id,
            'variant_id': 99999,  # Non-existent variant
            'quantity': 1
        }

        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid variant' in data['error']

    def test_add_item_cart_not_found(self, client, admin_headers, product):
        """Test adding item to non-existent cart"""
        item_data = {
            'product_id': product.id,
            'quantity': 1
        }

        response = client.post(
            '/api/admin/cart/carts/99999/items',
            headers=admin_headers,
            json=item_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']

    def test_update_cart_item_success(self, client, admin_headers, user_cart):
        """Test successful cart item update"""
        # Get the cart item
        with client.application.app_context():
            cart_item = CartItem.query.filter_by(cart_id=user_cart.id).first()

        update_data = {'quantity': 5}

        response = client.put(
            f'/api/admin/cart/carts/items/{cart_item.id}',
            headers=admin_headers,
            json=update_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['items'][0]['quantity'] == 5

    def test_update_cart_item_zero_quantity(self, client, admin_headers, user_cart):
        """Test updating cart item with zero quantity"""
        with client.application.app_context():
            cart_item = CartItem.query.filter_by(cart_id=user_cart.id).first()

        update_data = {'quantity': 0}

        response = client.put(
            f'/api/admin/cart/carts/items/{cart_item.id}',
            headers=admin_headers,
            json=update_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Item should be removed when quantity is 0
        assert len(data['items']) == 0

    def test_update_cart_item_not_found(self, client, admin_headers):
        """Test updating non-existent cart item"""
        update_data = {'quantity': 2}

        response = client.put(
            '/api/admin/cart/carts/items/99999',
            headers=admin_headers,
            json=update_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart item not found' in data['error']

    def test_update_cart_item_missing_data(self, client, admin_headers, user_cart):
        """Test updating cart item without quantity"""
        with client.application.app_context():
            cart_item = CartItem.query.filter_by(cart_id=user_cart.id).first()

        response = client.put(
            f'/api/admin/cart/carts/items/{cart_item.id}',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Quantity is required' in data['error']

    def test_remove_cart_item_success(self, client, admin_headers, user_cart):
        """Test successful cart item removal"""
        with client.application.app_context():
            cart_item = CartItem.query.filter_by(cart_id=user_cart.id).first()

        response = client.delete(
            f'/api/admin/cart/carts/items/{cart_item.id}',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Item removed from cart' in data['message']
        assert len(data['items']) == 0  # Should be empty now

    def test_remove_cart_item_not_found(self, client, admin_headers):
        """Test removing non-existent cart item"""
        response = client.delete(
            '/api/admin/cart/carts/items/99999',
            headers=admin_headers
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart item not found' in data['error']


class TestAdminCartCouponManagement:
    """Test admin cart coupon management functionality"""

    def test_apply_coupon_success(self, client, admin_headers, user_cart, coupon):
        """Test successful coupon application"""
        coupon_data = {'code': coupon.code}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/coupon',
            headers=admin_headers,
            json=coupon_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Coupon applied' in data['message']
        assert 'coupon' in data
        assert data['cart']['coupon_code'] == coupon.code

    def test_apply_invalid_coupon(self, client, admin_headers, user_cart):
        """Test applying invalid coupon"""
        coupon_data = {'code': 'INVALID_CODE'}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/coupon',
            headers=admin_headers,
            json=coupon_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid coupon code' in data['error']

    def test_apply_expired_coupon(self, client, admin_headers, user_cart, expired_coupon):
        """Test applying expired coupon"""
        coupon_data = {'code': expired_coupon.code}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/coupon',
            headers=admin_headers,
            json=coupon_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'expired' in data['error']

    def test_apply_coupon_missing_code(self, client, admin_headers, user_cart):
        """Test applying coupon without code"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/coupon',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Coupon code is required' in data['error']

    def test_apply_coupon_cart_not_found(self, client, admin_headers, coupon):
        """Test applying coupon to non-existent cart"""
        coupon_data = {'code': coupon.code}

        response = client.post(
            '/api/admin/cart/carts/99999/coupon',
            headers=admin_headers,
            json=coupon_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']

    def test_remove_coupon_success(self, client, admin_headers, user_cart, coupon):
        """Test successful coupon removal"""
        # First apply coupon
        with client.application.app_context():
            cart = Cart.query.get(user_cart.id)
            cart.coupon_code = coupon.code
            db.session.commit()

        response = client.delete(
            f'/api/admin/cart/carts/{user_cart.id}/coupon',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Coupon removed' in data['message']
        assert data['cart']['coupon_code'] is None

    def test_remove_coupon_cart_not_found(self, client, admin_headers):
        """Test removing coupon from non-existent cart"""
        response = client.delete(
            '/api/admin/cart/carts/99999/coupon',
            headers=admin_headers
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']


class TestAdminCartShippingManagement:
    """Test admin cart shipping management functionality"""

    def test_set_shipping_method_success(self, client, admin_headers, user_cart, shipping_method):
        """Test successful shipping method setting"""
        shipping_data = {'shipping_method_id': shipping_method.id}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-method',
            headers=admin_headers,
            json=shipping_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Shipping method set' in data['message']
        assert data['cart']['shipping_method_id'] == shipping_method.id

    def test_set_shipping_method_invalid_id(self, client, admin_headers, user_cart):
        """Test setting invalid shipping method"""
        shipping_data = {'shipping_method_id': 99999}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-method',
            headers=admin_headers,
            json=shipping_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid shipping method' in data['error']

    def test_set_shipping_method_missing_id(self, client, admin_headers, user_cart):
        """Test setting shipping method without ID"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-method',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Shipping method ID is required' in data['error']

    def test_set_shipping_method_cart_not_found(self, client, admin_headers, shipping_method):
        """Test setting shipping method for non-existent cart"""
        shipping_data = {'shipping_method_id': shipping_method.id}

        response = client.post(
            '/api/admin/cart/carts/99999/shipping-method',
            headers=admin_headers,
            json=shipping_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']


class TestAdminCartPaymentManagement:
    """Test admin cart payment management functionality"""

    def test_set_payment_method_success(self, client, admin_headers, user_cart, payment_method):
        """Test successful payment method setting"""
        payment_data = {'payment_method_id': payment_method.id}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/payment-method',
            headers=admin_headers,
            json=payment_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Payment method set' in data['message']
        assert data['cart']['payment_method_id'] == payment_method.id

    def test_set_payment_method_invalid_id(self, client, admin_headers, user_cart):
        """Test setting invalid payment method"""
        payment_data = {'payment_method_id': 99999}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/payment-method',
            headers=admin_headers,
            json=payment_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid payment method' in data['error']

    def test_set_payment_method_missing_id(self, client, admin_headers, user_cart):
        """Test setting payment method without ID"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/payment-method',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Payment method ID is required' in data['error']

    def test_set_payment_method_cart_not_found(self, client, admin_headers, payment_method):
        """Test setting payment method for non-existent cart"""
        payment_data = {'payment_method_id': payment_method.id}

        response = client.post(
            '/api/admin/cart/carts/99999/payment-method',
            headers=admin_headers,
            json=payment_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']


class TestAdminCartAddressManagement:
    """Test admin cart address management functionality"""

    def test_set_addresses_success(self, client, admin_headers, user_cart, address):
        """Test successful address setting"""
        address_data = {
            'shipping_address_id': address.id,
            'billing_address_id': address.id,
            'same_as_shipping': False
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Addresses set' in data['message']
        assert data['cart']['shipping_address_id'] == address.id
        assert data['cart']['billing_address_id'] == address.id

    def test_set_addresses_same_as_shipping(self, client, admin_headers, user_cart, address):
        """Test setting billing address same as shipping"""
        address_data = {
            'shipping_address_id': address.id,
            'same_as_shipping': True
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['cart']['same_as_shipping'] is True
        assert data['cart']['billing_address_id'] == address.id

    def test_set_addresses_invalid_shipping(self, client, admin_headers, user_cart):
        """Test setting invalid shipping address"""
        address_data = {
            'shipping_address_id': 99999,
            'same_as_shipping': True
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid shipping address' in data['error']

    def test_set_addresses_invalid_billing(self, client, admin_headers, user_cart, address):
        """Test setting invalid billing address"""
        address_data = {
            'shipping_address_id': address.id,
            'billing_address_id': 99999,
            'same_as_shipping': False
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid billing address' in data['error']

    def test_set_addresses_missing_billing(self, client, admin_headers, user_cart, address):
        """Test setting addresses without billing when not same as shipping"""
        address_data = {
            'shipping_address_id': address.id,
            'same_as_shipping': False
        }

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Billing address is required' in data['error']

    def test_set_addresses_cart_not_found(self, client, admin_headers, address):
        """Test setting addresses for non-existent cart"""
        address_data = {
            'shipping_address_id': address.id,
            'same_as_shipping': True
        }

        response = client.post(
            '/api/admin/cart/carts/99999/addresses',
            headers=admin_headers,
            json=address_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']


class TestAdminCartNotesAndOptions:
    """Test admin cart notes and options management"""

    def test_set_notes_success(self, client, admin_headers, user_cart):
        """Test successful notes setting"""
        notes_data = {'notes': 'Special delivery instructions'}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=admin_headers,
            json=notes_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Notes set' in data['message']
        assert data['cart']['notes'] == 'Special delivery instructions'

    def test_set_notes_empty(self, client, admin_headers, user_cart):
        """Test setting empty notes"""
        notes_data = {'notes': ''}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=admin_headers,
            json=notes_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['cart']['notes'] == ''

    def test_set_notes_missing_data(self, client, admin_headers, user_cart):
        """Test setting notes without data"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Notes are required' in data['error']

    def test_set_notes_cart_not_found(self, client, admin_headers):
        """Test setting notes for non-existent cart"""
        notes_data = {'notes': 'Test notes'}

        response = client.post(
            '/api/admin/cart/carts/99999/notes',
            headers=admin_headers,
            json=notes_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']

    def test_set_shipping_options_success(self, client, admin_headers, user_cart):
        """Test successful shipping options setting"""
        options_data = {'requires_shipping': False}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-options',
            headers=admin_headers,
            json=options_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'Shipping options set' in data['message']
        assert data['cart']['requires_shipping'] is False

    def test_set_shipping_options_false_resets_method(self, client, admin_headers, user_cart, shipping_method):
        """Test that setting requires_shipping to False clears shipping method"""
        # First set a shipping method
        with client.application.app_context():
            cart = Cart.query.get(user_cart.id)
            cart.shipping_method_id = shipping_method.id
            db.session.commit()

        options_data = {'requires_shipping': False}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-options',
            headers=admin_headers,
            json=options_data
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['cart']['requires_shipping'] is False
        assert data['cart']['shipping_method_id'] is None

    def test_set_shipping_options_missing_data(self, client, admin_headers, user_cart):
        """Test setting shipping options without data"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/shipping-options',
            headers=admin_headers,
            json={}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Requires shipping flag is required' in data['error']

    def test_set_shipping_options_cart_not_found(self, client, admin_headers):
        """Test setting shipping options for non-existent cart"""
        options_data = {'requires_shipping': True}

        response = client.post(
            '/api/admin/cart/carts/99999/shipping-options',
            headers=admin_headers,
            json=options_data
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']


class TestAdminCartValidation:
    """Test admin cart validation functionality"""

    def test_validate_cart_success(self, client, admin_headers, user_cart):
        """Test successful cart validation"""
        response = client.get(
            f'/api/admin/cart/carts/{user_cart.id}/validate',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'is_valid' in data
        assert 'errors' in data
        assert 'warnings' in data

    def test_validate_cart_not_found(self, client, admin_headers):
        """Test validating non-existent cart"""
        response = client.get(
            '/api/admin/cart/carts/99999/validate',
            headers=admin_headers
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Cart not found' in data['error']

    def test_validate_empty_cart(self, client, admin_headers, empty_cart):
        """Test validating empty cart"""
        response = client.get(
            f'/api/admin/cart/carts/{empty_cart.id}/validate',
            headers=admin_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Empty cart should be invalid
        assert data['is_valid'] is False
        assert len(data['errors']) > 0


class TestAdminCartErrorHandling:
    """Test admin cart error handling and edge cases"""

    def test_malformed_json_request(self, client, admin_headers, user_cart):
        """Test handling of malformed JSON requests"""
        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=admin_headers,
            data='{"invalid": json}'
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Invalid JSON' in data['error']

    def test_missing_content_type(self, client, admin_token, user_cart):
        """Test handling of missing content type"""
        headers = {'Authorization': f'Bearer {admin_token}'}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=headers,
            json={'notes': 'test'}
        )

        # Should still work as Flask can handle JSON without explicit content-type
        assert response.status_code in [200, 400]

    @patch('app.models.models.db.session.commit')
    def test_database_error_handling(self, mock_commit, client, admin_headers, user_cart):
        """Test handling of database errors"""
        mock_commit.side_effect = Exception("Database error")

        notes_data = {'notes': 'Test notes'}

        response = client.post(
            f'/api/admin/cart/carts/{user_cart.id}/notes',
            headers=admin_headers,
            json=notes_data
        )

        assert response.status_code == 500

    def test_empty_request_body(self, client, admin_headers, empty_cart):
        """Test handling of empty request body"""
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=None
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False


class TestAdminCartIntegration:
    """Test admin cart integration scenarios"""

    def test_complete_cart_management_workflow(self, client, admin_headers, empty_cart, product,
                                             coupon, shipping_method, payment_method, address):
        """Test complete cart management workflow"""
        # 1. Add item to cart
        item_data = {'product_id': product.id, 'quantity': 2}
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )
        assert response.status_code == 200

        # 2. Apply coupon
        coupon_data = {'code': coupon.code}
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/coupon',
            headers=admin_headers,
            json=coupon_data
        )
        assert response.status_code == 200

        # 3. Set shipping method
        shipping_data = {'shipping_method_id': shipping_method.id}
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/shipping-method',
            headers=admin_headers,
            json=shipping_data
        )
        assert response.status_code == 200

        # 4. Set payment method
        payment_data = {'payment_method_id': payment_method.id}
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/payment-method',
            headers=admin_headers,
            json=payment_data
        )
        assert response.status_code == 200

        # 5. Set addresses
        address_data = {
            'shipping_address_id': address.id,
            'same_as_shipping': True
        }
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/addresses',
            headers=admin_headers,
            json=address_data
        )
        assert response.status_code == 200

        # 6. Set notes
        notes_data = {'notes': 'Admin managed cart'}
        response = client.post(
            f'/api/admin/cart/carts/{empty_cart.id}/notes',
            headers=admin_headers,
            json=notes_data
        )
        assert response.status_code == 200

        # 7. Validate cart
        response = client.get(
            f'/api/admin/cart/carts/{empty_cart.id}/validate',
            headers=admin_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

        # 8. Get final cart state
        response = client.get(
            f'/api/admin/cart/carts/{empty_cart.id}',
            headers=admin_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify all settings were applied
        cart = data['cart']
        assert cart['coupon_code'] == coupon.code
        assert cart['shipping_method_id'] == shipping_method.id
        assert cart['payment_method_id'] == payment_method.id
        assert cart['shipping_address_id'] == address.id
        assert cart['notes'] == 'Admin managed cart'
        assert len(data['items']) == 1

    def test_bulk_cart_operations(self, client, admin_headers, user_cart, another_user_cart, coupon):
        """Test bulk operations on multiple carts"""
        cart_ids = [user_cart.id, another_user_cart.id]

        # Apply same coupon to multiple carts
        for cart_id in cart_ids:
            coupon_data = {'code': coupon.code}
            response = client.post(
                f'/api/admin/cart/carts/{cart_id}/coupon',
                headers=admin_headers,
                json=coupon_data
            )
            assert response.status_code == 200

        # Verify both carts have the coupon
        for cart_id in cart_ids:
            response = client.get(
                f'/api/admin/cart/carts/{cart_id}',
                headers=admin_headers
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['cart']['coupon_code'] == coupon.code

    def test_guest_cart_management(self, client, admin_headers, guest_cart, product):
        """Test managing guest carts"""
        # Admin should be able to manage guest carts
        item_data = {'product_id': product.id, 'quantity': 3}
        response = client.post(
            f'/api/admin/cart/carts/{guest_cart.id}/items',
            headers=admin_headers,
            json=item_data
        )
        assert response.status_code == 200

        # Verify guest cart was updated
        response = client.get(
            f'/api/admin/cart/carts/{guest_cart.id}',
            headers=admin_headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['cart']['is_guest'] is True
        assert len(data['items']) >= 1
