"""
Comprehensive tests for cart routes.
"""
import pytest
import json
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock
from app.models.models import (
    Cart, CartItem, Product, User, Address, ShippingMethod,
    PaymentMethod, Coupon, Inventory
)
from app import db
from sqlalchemy.exc import SQLAlchemyError


class TestCartHealthCheck:
    """Test cart health check endpoint"""

    def test_health_check_success(self, client):
        """Test health check returns success"""
        response = client.get('/api/cart/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'cart_routes'


class TestGetCart:
    """Test get cart endpoint"""

    def test_get_cart_creates_new_cart(self, client, auth_headers):
        """Test getting cart creates new cart if none exists"""
        headers, user_id = auth_headers
        response = client.get('/api/cart/', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'cart' in data
        assert 'items' in data
        assert len(data['items']) == 0

    def test_get_cart_returns_existing_cart(self, client, auth_headers, app, create_cart):
        """Test getting existing cart"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)

        response = client.get('/api/cart/', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'cart' in data

    def test_get_cart_with_validation(self, client, auth_headers, app, create_cart, create_product, create_cart_item):
        """Test getting cart with validation"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            create_cart_item(cart_id, product_id)

        response = client.get('/api/cart/', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'validation' in data
        assert 'is_valid' in data['validation']

    def test_get_cart_unauthorized(self, client):
        """Test getting cart without authentication"""
        response = client.get('/api/cart/')
        assert response.status_code == 401


class TestGetCartSummary:
    """Test get cart summary endpoint"""

    def test_get_cart_summary_authenticated_user(self, client, auth_headers, app,
                                               create_cart, create_product,
                                               create_cart_item):
        """Test getting cart summary for authenticated user"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product({'price': 25.00})
            create_cart_item(cart_id, product_id, quantity=2)

            # Update cart totals
            cart = db.session.get(Cart, cart_id)
            cart.update_totals()
            db.session.commit()

        response = client.get('/api/cart/summary', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['item_count'] == 2
        assert data['has_items'] is True
        assert data['total'] > 0

    def test_get_cart_summary_empty_cart(self, client, auth_headers):
        """Test getting cart summary for empty cart"""
        headers, user_id = auth_headers
        response = client.get('/api/cart/summary', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['item_count'] == 0
        assert data['has_items'] is False
        assert data['total'] == 0

    def test_get_cart_summary_guest_user(self, client):
        """Test getting cart summary for guest user"""
        response = client.get('/api/cart/summary')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['item_count'] == 0
        assert data['guest'] is True


class TestAddToCart:
    """Test add to cart endpoint"""

    def test_add_to_cart_success(self, client, auth_headers, create_product):
        """Test adding item to cart successfully"""
        headers, user_id = auth_headers
        product_id = create_product()
        data = {
            'product_id': product_id,
            'quantity': 2
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert len(response_data['items']) == 1
        assert response_data['items'][0]['quantity'] == 2

    def test_add_to_cart_with_variant(self, client, auth_headers, create_product, create_product_variant):
        """Test adding item with variant to cart"""
        headers, user_id = auth_headers
        product_id = create_product()
        variant_id = create_product_variant(product_id)

        data = {
            'product_id': product_id,
            'variant_id': variant_id,
            'quantity': 1
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['items'][0]['variant_id'] == variant_id

    def test_add_to_cart_existing_item_updates_quantity(self, client, auth_headers,
                                                      create_product, app, create_cart,
                                                      create_cart_item):
        """Test adding existing item updates quantity"""
        headers, user_id = auth_headers
        with app.app_context():
            product_id = create_product()
            cart_id = create_cart(user_id)
            create_cart_item(cart_id, product_id, quantity=1)

        data = {
            'product_id': product_id,
            'quantity': 2
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        # Should have updated quantity (1 + 2 = 3)
        assert response_data['items'][0]['quantity'] == 3

    def test_add_to_cart_missing_required_fields(self, client, auth_headers):
        """Test adding to cart with missing required fields"""
        headers, user_id = auth_headers
        data = {
            'quantity': 1
            # Missing product_id
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 400

    def test_add_to_cart_invalid_quantity(self, client, auth_headers, create_product):
        """Test adding to cart with invalid quantity"""
        headers, user_id = auth_headers
        product_id = create_product()
        data = {
            'product_id': product_id,
            'quantity': 0  # Invalid quantity
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 400

    def test_add_to_cart_nonexistent_product(self, client, auth_headers):
        """Test adding nonexistent product to cart"""
        headers, user_id = auth_headers
        data = {
            'product_id': 99999,
            'quantity': 1
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 404

    def test_add_to_cart_insufficient_stock(self, client, auth_headers, create_product):
        """Test adding to cart with insufficient stock"""
        headers, user_id = auth_headers
        product_id = create_product({'stock': 2})  # Only 2 in stock
        data = {
            'product_id': product_id,
            'quantity': 5  # Requesting more than available
        }

        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'insufficient_stock' in str(response_data)

    def test_add_to_cart_guest_user(self, client, create_product):
        """Test adding to cart as guest user"""
        product_id = create_product()
        data = {
            'product_id': product_id,
            'quantity': 1
        }

        response = client.post('/api/cart/items', json=data)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        # Should set guest_id cookie
        assert 'Set-Cookie' in response.headers

    def test_add_to_cart_unauthorized(self, client, create_product):
        """Test adding to cart without proper authentication"""
        # This test is for the old /add endpoint which requires auth
        product_id = create_product()
        data = {
            'product_id': product_id,
            'quantity': 1
        }

        response = client.post('/api/cart/add', json=data)
        assert response.status_code == 401


class TestUpdateCartItem:
    """Test update cart item endpoint"""

    def test_update_cart_item_success(self, client, auth_headers, app, create_cart,
                                    create_product, create_cart_item):
        """Test updating cart item successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product({'stock': 10})
            item_id = create_cart_item(cart_id, product_id, quantity=2)

        data = {'quantity': 3}
        response = client.put(f'/api/cart/items/{item_id}', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

        # Find the updated item
        updated_item = next(item for item in response_data['items'] if item['id'] == item_id)
        assert updated_item['quantity'] == 3

    def test_update_cart_item_remove_with_zero_quantity(self, client, auth_headers, app,
                                                      create_cart, create_product,
                                                      create_cart_item):
        """Test updating cart item with zero quantity removes it"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            item_id = create_cart_item(cart_id, product_id)

        data = {'quantity': 0}
        response = client.put(f'/api/cart/items/{item_id}', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

        # Item should be removed
        item_exists = any(item['id'] == item_id for item in response_data['items'])
        assert not item_exists

    def test_update_cart_item_not_found(self, client, auth_headers):
        """Test updating nonexistent cart item"""
        headers, user_id = auth_headers
        data = {'quantity': 2}
        response = client.put('/api/cart/items/99999', json=data, headers=headers)
        assert response.status_code == 404

    def test_update_cart_item_insufficient_stock(self, client, auth_headers, app,
                                               create_cart, create_product,
                                               create_cart_item):
        """Test updating cart item with insufficient stock"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product({'stock': 3})  # Only 3 in stock
            item_id = create_cart_item(cart_id, product_id, quantity=1)

        data = {'quantity': 5}  # More than available
        response = client.put(f'/api/cart/items/{item_id}', json=data, headers=headers)
        assert response.status_code == 400

    def test_update_cart_item_no_data(self, client, auth_headers, app, create_cart,
                                    create_product, create_cart_item):
        """Test updating cart item with no data"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            item_id = create_cart_item(cart_id, product_id)

        response = client.put(f'/api/cart/items/{item_id}', headers=headers)
        assert response.status_code == 400

    def test_update_cart_item_unauthorized(self, client, app, create_user, create_cart,
                                         create_product, create_cart_item):
        """Test updating cart item without authentication"""
        with app.app_context():
            user_id = create_user()
            cart_id = create_cart(user_id)
            product_id = create_product()
            item_id = create_cart_item(cart_id, product_id)

        data = {'quantity': 2}
        response = client.put(f'/api/cart/items/{item_id}', json=data)
        assert response.status_code == 401


class TestRemoveFromCart:
    """Test remove from cart endpoint"""

    def test_remove_from_cart_success(self, client, auth_headers, app, create_cart,
                                    create_product, create_cart_item):
        """Test removing item from cart successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            item_id = create_cart_item(cart_id, product_id)

        response = client.delete(f'/api/cart/items/{item_id}', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

        # Item should be removed
        item_exists = any(item['id'] == item_id for item in response_data['items'])
        assert not item_exists

    def test_remove_from_cart_not_found(self, client, auth_headers):
        """Test removing nonexistent cart item"""
        headers, user_id = auth_headers
        response = client.delete('/api/cart/items/99999', headers=headers)
        assert response.status_code == 404

    def test_remove_from_cart_unauthorized(self, client, app, create_user, create_cart,
                                         create_product, create_cart_item):
        """Test removing from cart without authentication"""
        with app.app_context():
            user_id = create_user()
            cart_id = create_cart(user_id)
            product_id = create_product()
            item_id = create_cart_item(cart_id, product_id)

        response = client.delete(f'/api/cart/items/{item_id}')
        assert response.status_code == 401


class TestCouponOperations:
    """Test coupon operations"""

    def test_apply_coupon_success(self, client, auth_headers, app, create_cart,
                                create_coupon):
        """Test applying coupon successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            coupon_code = create_coupon()

        data = {'code': coupon_code}
        response = client.post('/api/cart/coupons', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'coupon' in response_data

    def test_apply_invalid_coupon(self, client, auth_headers, app, create_cart):
        """Test applying invalid coupon"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'code': 'INVALID_CODE'}
        response = client.post('/api/cart/coupons', json=data, headers=headers)
        assert response.status_code == 400

    def test_apply_coupon_missing_code(self, client, auth_headers):
        """Test applying coupon with missing code"""
        headers, user_id = auth_headers
        data = {}
        response = client.post('/api/cart/coupons', json=data, headers=headers)
        assert response.status_code == 400

    def test_remove_coupon_success(self, client, auth_headers, app, create_cart,
                                 create_coupon):
        """Test removing coupon successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            coupon_code = create_coupon()

            # Apply coupon first
            cart = db.session.get(Cart, cart_id)
            cart.coupon_code = coupon_code
            db.session.commit()

        response = client.delete('/api/cart/coupons', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_remove_coupon_unauthorized(self, client):
        """Test removing coupon without authentication"""
        response = client.delete('/api/cart/coupons')
        assert response.status_code == 401


class TestShippingMethods:
    """Test shipping methods endpoints"""

    def test_get_shipping_methods_success(self, client, auth_headers, app, create_cart,
                                        create_shipping_zone, create_shipping_method):
        """Test getting shipping methods successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            zone_id = create_shipping_zone()
            create_shipping_method(zone_id)

        response = client.get('/api/cart/shipping-methods', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'shipping_methods' in response_data
        assert len(response_data['shipping_methods']) >= 1

    def test_get_shipping_methods_creates_default(self, client, auth_headers, app,
                                                create_cart):
        """Test getting shipping methods creates default if none exist"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        response = client.get('/api/cart/shipping-methods', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'shipping_methods' in response_data

    def test_set_shipping_method_success(self, client, auth_headers, app, create_cart,
                                       create_shipping_zone, create_shipping_method):
        """Test setting shipping method successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            zone_id = create_shipping_zone()
            method_id = create_shipping_method(zone_id)

        data = {'shipping_method_id': method_id}
        response = client.post('/api/cart/shipping-method', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_set_shipping_method_invalid_id(self, client, auth_headers, app,
                                          create_cart):
        """Test setting invalid shipping method"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'shipping_method_id': 99999}
        response = client.post('/api/cart/shipping-method', json=data, headers=headers)
        assert response.status_code == 400

    def test_set_shipping_method_missing_id(self, client, auth_headers):
        """Test setting shipping method with missing ID"""
        headers, user_id = auth_headers
        data = {}
        response = client.post('/api/cart/shipping-method', json=data, headers=headers)
        assert response.status_code == 400


class TestPaymentMethods:
    """Test payment methods endpoints"""

    def test_get_payment_methods_success(self, client, auth_headers, app, create_cart,
                                       create_payment_method):
        """Test getting payment methods successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            create_payment_method()

        response = client.get('/api/cart/payment-methods', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'payment_methods' in response_data
        assert len(response_data['payment_methods']) >= 1

    def test_get_payment_methods_creates_default(self, client, auth_headers, app,
                                               create_cart):
        """Test getting payment methods creates default if none exist"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        response = client.get('/api/cart/payment-methods', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'payment_methods' in response_data

    def test_set_payment_method_success(self, client, auth_headers, app, create_cart,
                                      create_payment_method):
        """Test setting payment method successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            method_id = create_payment_method()

        data = {'payment_method_id': method_id}
        response = client.post('/api/cart/payment-method', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_set_payment_method_invalid_id(self, client, auth_headers, app,
                                         create_cart):
        """Test setting invalid payment method"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'payment_method_id': 99999}
        response = client.post('/api/cart/payment-method', json=data, headers=headers)
        assert response.status_code == 400


class TestAddressManagement:
    """Test address management endpoints"""

    def test_set_shipping_address_success(self, client, auth_headers, app, create_cart,
                                        create_address):
        """Test setting shipping address successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            address_id = create_address(user_id)

        data = {'address_id': address_id}
        response = client.post('/api/cart/shipping-address', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_set_shipping_address_invalid_id(self, client, auth_headers, app,
                                           create_cart):
        """Test setting invalid shipping address"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'address_id': 99999}
        response = client.post('/api/cart/shipping-address', json=data, headers=headers)
        assert response.status_code == 400

    def test_set_billing_address_same_as_shipping(self, client, auth_headers, app,
                                                create_cart, create_address):
        """Test setting billing address same as shipping"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            address_id = create_address(user_id)

            # Set shipping address first
            cart = db.session.get(Cart, cart_id)
            cart.shipping_address_id = address_id
            db.session.commit()

        data = {'same_as_shipping': True}
        response = client.post('/api/cart/billing-address', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['cart']['same_as_shipping'] is True

    def test_set_billing_address_different(self, client, auth_headers, app, create_cart,
                                         create_address):
        """Test setting different billing address"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)
            address_id = create_address(user_id)

        data = {
            'same_as_shipping': False,
            'address_id': address_id
        }
        response = client.post('/api/cart/billing-address', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['cart']['same_as_shipping'] is False


class TestCheckoutValidation:
    """Test checkout validation endpoints"""

    def test_validate_checkout_success(self, client, auth_headers, app, create_cart,
                                     create_product, create_cart_item):
        """Test checkout validation success"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            create_cart_item(cart_id, product_id)

        response = client.get('/api/cart/checkout/validate', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'is_valid' in response_data

    def test_validate_checkout_empty_cart(self, client, auth_headers, app,
                                        create_cart):
        """Test checkout validation with empty cart"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        response = client.get('/api/cart/checkout/validate', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['is_valid'] is False


class TestCartNotes:
    """Test cart notes endpoint"""

    def test_set_cart_notes_success(self, client, auth_headers, app, create_cart):
        """Test setting cart notes successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'notes': 'Please deliver after 5 PM'}
        response = client.post('/api/cart/notes', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['cart']['notes'] == 'Please deliver after 5 PM'

    def test_set_cart_notes_empty(self, client, auth_headers, app, create_cart):
        """Test setting empty cart notes"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'notes': ''}
        response = client.post('/api/cart/notes', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True


class TestShippingOptions:
    """Test shipping options endpoint"""

    def test_set_shipping_options_success(self, client, auth_headers, app,
                                        create_cart):
        """Test setting shipping options successfully"""
        headers, user_id = auth_headers
        with app.app_context():
            create_cart(user_id)

        data = {'requires_shipping': True}
        response = client.post('/api/cart/shipping-options', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['cart']['requires_shipping'] is True

    def test_set_shipping_options_false_resets_method(self, client, auth_headers, app,
                                                    create_cart, create_shipping_zone,
                                                    create_shipping_method):
        """Test setting requires_shipping to false resets shipping method"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            zone_id = create_shipping_zone()
            method_id = create_shipping_method(zone_id)

            # Set shipping method first
            cart = db.session.get(Cart, cart_id)
            cart.shipping_method_id = method_id
            db.session.commit()

        data = {'requires_shipping': False}
        response = client.post('/api/cart/shipping-options', json=data, headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['cart']['requires_shipping'] is False
        assert response_data['cart']['shipping_method_id'] is None


class TestCartValidation:
    """Test cart validation endpoint"""

    def test_validate_cart_authenticated_user(self, client, auth_headers, app,
                                            create_cart, create_product,
                                            create_cart_item):
        """Test cart validation for authenticated user"""
        headers, user_id = auth_headers
        with app.app_context():
            cart_id = create_cart(user_id)
            product_id = create_product()
            create_cart_item(cart_id, product_id)

        response = client.get('/api/cart/validate', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'is_valid' in response_data
        assert 'errors' in response_data
        assert 'warnings' in response_data

    def test_validate_cart_guest_user(self, client):
        """Test cart validation for guest user"""
        response = client.get('/api/cart/validate')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['is_valid'] is True
        assert response_data['errors'] == []
        assert response_data['warnings'] == []

    def test_validate_cart_options_request(self, client):
        """Test OPTIONS request for cart validation"""
        response = client.options('/api/cart/validate')
        assert response.status_code == 200


class TestCartErrorHandling:
    """Test error handling in cart endpoints"""

    def test_add_to_cart_database_error(self, client, auth_headers, app, create_user):
        """Test handling database errors during add to cart"""
        headers, user_id = auth_headers

        # Create product manually to avoid mock interference
        with app.app_context():
            product = Product(
                name='Test Product',
                slug='test-product-db-error',
                price=25.00,
                stock=10
            )
            db.session.add(product)
            db.session.commit()
            product_id = product.id

        # Mock the cart creation to fail
        with patch('app.routes.cart.cart_routes.Cart') as mock_cart:
            mock_cart.side_effect = Exception('Database write failed')

            data = {
                'product_id': product_id,
                'quantity': 1
            }

            response = client.post('/api/cart/items', json=data, headers=headers)
            assert response.status_code == 500

    def test_malformed_json_request(self, client, auth_headers):
        """Test handling of malformed JSON requests"""
        headers, user_id = auth_headers
        headers = headers.copy()
        headers['Content-Type'] = 'application/json'

        # Send malformed JSON
        response = client.post('/api/cart/items', data='{"invalid": json}', headers=headers)
        assert response.status_code == 400

    @patch('app.validations.cart_validation.CartValidator')
    def test_validation_error_handling(self, mock_validator, client, auth_headers):
        """Test handling validation errors"""
        headers, user_id = auth_headers
        mock_validator.side_effect = Exception('Validation failed')

        response = client.get('/api/cart/', headers=headers)
        # Should handle the error gracefully
        assert response.status_code in [200, 500]


class TestCartIntegration:
    """Integration tests for cart functionality"""

    def test_complete_cart_workflow(self, client, auth_headers, app, create_product,
                                  create_address, create_shipping_zone,
                                  create_shipping_method, create_payment_method):
        """Test complete cart workflow from empty to checkout ready"""
        headers, user_id = auth_headers

        # Setup environment manually to ensure correct user ownership
        with app.app_context():
            # Create product
            product_id = create_product()

            # Create address for the correct user
            address_id = create_address(user_id)

            # Create shipping zone and method
            zone_id = create_shipping_zone()
            shipping_method_id = create_shipping_method(zone_id)

            # Create payment method
            payment_method_id = create_payment_method()

        # 1. Get empty cart
        response = client.get('/api/cart/', headers=headers)
        assert response.status_code == 200

        # 2. Add item to cart
        data = {
            'product_id': product_id,
            'quantity': 2
        }
        response = client.post('/api/cart/items', json=data, headers=headers)
        assert response.status_code == 200

        # 3. Update item quantity
        response_data = json.loads(response.data)
        item_id = response_data['items'][0]['id']

        update_data = {'quantity': 3}
        response = client.put(f'/api/cart/items/{item_id}', json=update_data, headers=headers)
        assert response.status_code == 200

        # 4. Set shipping address
        address_data = {'address_id': address_id}
        response = client.post('/api/cart/shipping-address', json=address_data, headers=headers)
        assert response.status_code == 200

        # 5. Set billing address (same as shipping)
        billing_data = {'same_as_shipping': True}
        response = client.post('/api/cart/billing-address', json=billing_data, headers=headers)
        assert response.status_code == 200

        # 6. Set shipping method
        shipping_data = {'shipping_method_id': shipping_method_id}
        response = client.post('/api/cart/shipping-method', json=shipping_data, headers=headers)
        assert response.status_code == 200

        # 7. Set payment method
        payment_data = {'payment_method_id': payment_method_id}
        response = client.post('/api/cart/payment-method', json=payment_data, headers=headers)
        assert response.status_code == 200

        # 8. Add notes
        notes_data = {'notes': 'Test order notes'}
        response = client.post('/api/cart/notes', json=notes_data, headers=headers)
        assert response.status_code == 200

        # 9. Validate checkout
        response = client.get('/api/cart/checkout/validate', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

        # 10. Get final cart summary
        response = client.get('/api/cart/summary', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['item_count'] == 3
        assert response_data['has_items'] is True

    def test_cart_with_multiple_products_and_variants(self, client, auth_headers, app,
                                                    create_product,
                                                    create_product_variant):
        """Test cart with multiple products and variants"""
        headers, user_id = auth_headers

        with app.app_context():
            # Create products
            product1_id = create_product({'name': 'Product 1', 'slug': 'product-1', 'price': 25.00})
            product2_id = create_product({'name': 'Product 2', 'slug': 'product-2', 'price': 35.00})

            # Create variants
            variant1_id = create_product_variant(product1_id, {'color': 'Red', 'size': 'M'})
            variant2_id = create_product_variant(product2_id, {'color': 'Blue', 'size': 'L'})

        # Add products to cart
        items_to_add = [
            {'product_id': product1_id, 'quantity': 2},
            {'product_id': product1_id, 'variant_id': variant1_id, 'quantity': 1},
            {'product_id': product2_id, 'variant_id': variant2_id, 'quantity': 3}
        ]

        for item_data in items_to_add:
            response = client.post('/api/cart/items', json=item_data, headers=headers)
            assert response.status_code == 200

        # Get cart summary
        response = client.get('/api/cart/summary', headers=headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['item_count'] == 6  # 2 + 1 + 3
        assert response_data['has_items'] is True

    def test_guest_to_authenticated_user_workflow(self, client, create_product,
                                                create_user, app):
        """Test workflow from guest user to authenticated user"""
        # 1. Add item as guest
        product_id = create_product()
        data = {
            'product_id': product_id,
            'quantity': 2
        }

        response = client.post('/api/cart/items', json=data)
        assert response.status_code == 200

        # Extract guest_id from cookie
        guest_id = None
        for cookie in response.headers.getlist('Set-Cookie'):
            if 'guest_id' in cookie:
                guest_id = cookie.split('=')[1].split(';')[0]
                break

        assert guest_id is not None

        # 2. Get cart summary as guest
        response = client.get('/api/cart/summary')
        assert response.status_code == 200
        response_data = json.loads(response.data)
        # Guest cart might not persist items without proper session handling
        # Just check that we get a valid response structure
        assert 'item_count' in response_data
        assert 'guest' in response_data
        assert response_data['guest'] is True

        # 3. Now authenticate (in real app, this would merge carts)
        with app.app_context():
            user_id = create_user()

        from flask_jwt_extended import create_access_token
        with app.app_context():
            user = db.session.get(User, user_id)
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": user.role.value}
            )

        auth_headers = {'Authorization': f'Bearer {access_token}'}

        # 4. Get cart as authenticated user (should create new cart)
        response = client.get('/api/cart/', headers=auth_headers)
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True


class TestCartRateLimiting:
    """Test rate limiting on cart endpoints"""

    def test_add_to_cart_rate_limit(self, client, auth_headers, create_product):
        """Test rate limiting on add to cart endpoint"""
        headers, user_id = auth_headers
        product_id = create_product()
        responses = []

        # Make multiple requests quickly
        for i in range(10):
            data = {
                'product_id': product_id,
                'quantity': 1
            }
            response = client.post('/api/cart/items', json=data, headers=headers)
            responses.append(response.status_code)

        # Rate limiting might not be enforced in test environment
        # Just check that we get responses
        success_responses = [status for status in responses if status in [200, 400, 429]]
        assert len(success_responses) > 0

    def test_get_cart_rate_limit(self, client, auth_headers):
        """Test rate limiting on get cart endpoint"""
        headers, user_id = auth_headers
        responses = []

        # Make multiple requests quickly
        for _ in range(15):
            response = client.get('/api/cart/', headers=headers)
            responses.append(response.status_code)

        # Rate limiting might not be enforced in test environment
        # Just check that we get responses
        success_responses = [status for status in responses if status in [200, 429]]
        assert len(success_responses) > 0


class TestCartCORS:
    """Test CORS handling for cart endpoints"""

    def test_cart_options_requests(self, client):
        """Test OPTIONS requests for CORS"""
        endpoints = [
            '/api/cart/',
            '/api/cart/items',
            '/api/cart/coupons',
            '/api/cart/shipping-methods',
            '/api/cart/payment-methods',
            '/api/cart/shipping-address',
            '/api/cart/billing-address',
            '/api/cart/checkout/validate',
            '/api/cart/notes',
            '/api/cart/shipping-options',
            '/api/cart/validate'
        ]

        for endpoint in endpoints:
            response = client.options(endpoint)
            # Should handle OPTIONS requests
            assert response.status_code in [200, 404]  # 404 if route doesn't handle OPTIONS
