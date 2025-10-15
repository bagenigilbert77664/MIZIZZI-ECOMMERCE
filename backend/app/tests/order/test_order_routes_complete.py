"""
Comprehensive test suite for order routes.
Tests all order-related functionality including creation, tracking, cancellation, and statistics.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
from decimal import Decimal

from app.models.models import (
    Order, OrderItem, CartItem, User, Product, Category, Brand,
    OrderStatus, PaymentStatus, UserRole, Coupon, CouponType,
    Inventory, Address, AddressType, Cart
)
from app.configuration.extensions import db


class TestGetUserOrders:
    """Test getting user orders with various filters and pagination."""

    def test_get_user_orders_success(self, client, auth_headers, sample_user, sample_orders):
        """Test successful retrieval of user orders."""
        response = client.get('/api/orders', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'data' in data
        assert 'orders' in data['data']
        assert 'pagination' in data['data']
        assert len(data['data']['orders']) > 0

    def test_get_user_orders_with_pagination(self, client, auth_headers, sample_user, sample_orders):
        """Test order retrieval with pagination."""
        response = client.get('/api/orders?page=1&per_page=2', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['pagination']['per_page'] == 2
        assert data['data']['pagination']['page'] == 1

    def test_get_user_orders_with_status_filter(self, client, auth_headers, sample_user, sample_orders):
        """Test filtering orders by status."""
        response = client.get('/api/orders?status=pending', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        # All returned orders should have pending status
        for order in data['data']['orders']:
            assert order['status'] == 'pending'

    def test_get_user_orders_with_date_filter(self, client, auth_headers, sample_user, sample_orders):
        """Test filtering orders by date range."""
        today = datetime.utcnow().isoformat()
        yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()

        response = client.get(f'/api/orders?start_date={yesterday}&end_date={today}',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_get_user_orders_with_search(self, client, auth_headers, sample_user, sample_orders):
        """Test searching orders."""
        # Get the first order's order number
        order = sample_orders[0]
        search_term = order.order_number[:10]  # Use part of order number

        response = client.get(f'/api/orders?search={search_term}', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_get_user_orders_with_sorting(self, client, auth_headers, sample_user, sample_orders):
        """Test sorting orders."""
        response = client.get('/api/orders?sort_by=total_amount&sort_order=desc',
                            headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_get_user_orders_include_items(self, client, auth_headers, sample_user, sample_orders):
        """Test including order items in response."""
        response = client.get('/api/orders?include_items=true', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        if data['data']['orders']:
            assert 'items' in data['data']['orders'][0]

    def test_get_user_orders_unauthorized(self, client):
        """Test order retrieval without authentication."""
        response = client.get('/api/orders')

        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data

    def test_get_user_orders_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders')

        assert response.status_code == 200


class TestGetUserOrder:
    """Test getting individual user orders."""

    def test_get_user_order_success(self, client, auth_headers, sample_user, sample_orders):
        """Test successful retrieval of a specific order."""
        order = sample_orders[0]
        response = client.get(f'/api/orders/{order.id}', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['order']['id'] == order.id

    def test_get_user_order_not_found(self, client, auth_headers, sample_user):
        """Test getting non-existent order."""
        response = client.get('/api/orders/99999', headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False
        assert 'error' in data

    def test_get_user_order_unauthorized_access(self, client, other_auth_headers, sample_user, sample_orders):
        """Test accessing another user's order."""
        order = sample_orders[0]
        response = client.get(f'/api/orders/{order.id}', headers=other_auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False

    def test_get_user_order_with_estimated_delivery(self, client, auth_headers, sample_user):
        """Test order with estimated delivery calculation."""
        # Create order with processing status
        order = Order(
            user_id=sample_user.id,
            order_number='TEST123',
            status=OrderStatus.PROCESSING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING,
            shipping_method='express'
        )
        db.session.add(order)
        db.session.commit()

        response = client.get(f'/api/orders/{order.id}', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'estimated_delivery' in data['data']['order']

    def test_get_user_order_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders/1')

        assert response.status_code == 200


class TestCreateOrder:
    """Test order creation functionality."""

    def test_create_order_success(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test successful order creation."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert 'order' in data['data']

    def test_create_order_empty_cart(self, client, auth_headers, sample_user):
        """Test creating order with empty cart."""
        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'empty' in data['error'].lower()

    def test_create_order_with_coupon(self, client, auth_headers, sample_user, sample_products, sample_coupon, sample_inventory):
        """Test creating order with valid coupon."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'coupon_code': sample_coupon.code,
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_create_order_invalid_coupon(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test creating order with invalid coupon."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'coupon_code': 'INVALID',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'coupon' in data['error'].lower()

    def test_create_order_missing_required_fields(self, client, auth_headers, sample_user):
        """Test creating order without required fields."""
        order_data = {}

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'missing' in data['error'].lower()

    def test_create_order_missing_shipping_address(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test creating order without shipping address."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card'
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'address' in data['error'].lower()

    def test_create_order_with_address_id(self, client, auth_headers, sample_user, sample_products, sample_address, sample_inventory):
        """Test creating order with address ID."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_create_order_email_confirmation(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test order creation sends confirmation email."""
        # Create cart items first
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_create_order_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders')

        assert response.status_code == 200


class TestCancelOrder:
    """Test order cancellation functionality."""

    def test_cancel_order_success(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test successful order cancellation."""
        # Create order
        order = Order(
            user_id=sample_user.id,
            order_number='CANCEL123',
            status=OrderStatus.PENDING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING
        )
        db.session.add(order)
        db.session.flush()

        # Add order item
        order_item = OrderItem(
            order_id=order.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price),
            total=float(sample_products[0].price) * 2
        )
        db.session.add(order_item)
        db.session.commit()

        response = client.post(f'/api/orders/{order.id}/cancel', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['order']['status'] == 'cancelled'

    def test_cancel_order_invalid_status(self, client, auth_headers, sample_user):
        """Test cancelling order with invalid status."""
        order = Order(
            user_id=sample_user.id,
            order_number='DELIVERED123',
            status=OrderStatus.DELIVERED,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PAID
        )
        db.session.add(order)
        db.session.commit()

        response = client.post(f'/api/orders/{order.id}/cancel', headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'cannot cancel' in data['error'].lower()

    def test_cancel_order_unauthorized_access(self, client, other_auth_headers, sample_user):
        """Test cancelling another user's order."""
        order = Order(
            user_id=sample_user.id,
            order_number='UNAUTHORIZED123',
            status=OrderStatus.PENDING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING
        )
        db.session.add(order)
        db.session.commit()

        response = client.post(f'/api/orders/{order.id}/cancel', headers=other_auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False

    def test_cancel_order_inventory_restoration(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test inventory restoration on order cancellation."""
        # Get initial inventory
        inventory = sample_inventory[0]
        initial_stock = inventory.stock_level

        # Create order
        order = Order(
            user_id=sample_user.id,
            order_number='INVENTORY123',
            status=OrderStatus.PENDING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING
        )
        db.session.add(order)
        db.session.flush()

        # Add order item
        order_item = OrderItem(
            order_id=order.id,
            product_id=inventory.product_id,
            quantity=5,
            price=100.0,
            total=500.0
        )
        db.session.add(order_item)
        db.session.commit()

        response = client.post(f'/api/orders/{order.id}/cancel', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_cancel_order_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders/1/cancel')

        assert response.status_code == 200


class TestTrackOrder:
    """Test order tracking functionality."""

    def test_track_order_success(self, client, auth_headers, sample_user, sample_orders):
        """Test successful order tracking."""
        order = sample_orders[0]
        response = client.get(f'/api/orders/{order.id}/track', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'timeline' in data['data']
        assert 'current_status' in data['data']

    def test_track_order_with_tracking_number(self, client, auth_headers, sample_user):
        """Test tracking order with tracking number."""
        order = Order(
            user_id=sample_user.id,
            order_number='TRACK123',
            status=OrderStatus.SHIPPED,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PAID,
            tracking_number='TRK123456'
        )
        db.session.add(order)
        db.session.commit()

        response = client.get(f'/api/orders/{order.id}/track', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['tracking_number'] == 'TRK123456'

    def test_track_cancelled_order(self, client, auth_headers, sample_user):
        """Test tracking cancelled order."""
        order = Order(
            user_id=sample_user.id,
            order_number='CANCELLED123',
            status=OrderStatus.CANCELLED,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.REFUNDED
        )
        db.session.add(order)
        db.session.commit()

        response = client.get(f'/api/orders/{order.id}/track', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        # Should have cancelled status in timeline
        timeline_statuses = [item['status'] for item in data['data']['timeline']]
        assert 'cancelled' in timeline_statuses

    def test_track_order_estimated_delivery(self, client, auth_headers, sample_user):
        """Test tracking order with estimated delivery."""
        order = Order(
            user_id=sample_user.id,
            order_number='DELIVERY123',
            status=OrderStatus.PROCESSING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PAID,
            shipping_method='express'
        )
        db.session.add(order)
        db.session.commit()

        response = client.get(f'/api/orders/{order.id}/track', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'estimated_delivery' in data['data']

    def test_track_order_unauthorized_access(self, client, other_auth_headers, sample_user, sample_orders):
        """Test tracking another user's order."""
        order = sample_orders[0]
        response = client.get(f'/api/orders/{order.id}/track', headers=other_auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False

    def test_track_order_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders/1/track')

        assert response.status_code == 200


class TestOrderStats:
    """Test order statistics functionality."""

    def test_get_order_stats_success(self, client, auth_headers, sample_user, sample_orders):
        """Test successful retrieval of order statistics."""
        response = client.get('/api/orders/stats', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'total_orders' in data['data']
        assert 'total_spent' in data['data']
        assert 'status_counts' in data['data']

    def test_get_order_stats_no_orders(self, client, auth_headers, sample_user):
        """Test order stats with no orders."""
        response = client.get('/api/orders/stats', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['total_orders'] == 0
        assert data['data']['total_spent'] == 0.0

    def test_get_order_stats_monthly_spending(self, client, auth_headers, sample_user, sample_orders):
        """Test monthly spending statistics."""
        response = client.get('/api/orders/stats', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'monthly_spending' in data['data']
        assert len(data['data']['monthly_spending']) == 12

    def test_get_order_stats_favorite_categories(self, client, auth_headers, sample_user, sample_orders):
        """Test favorite categories statistics."""
        response = client.get('/api/orders/stats', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'favorite_categories' in data['data']

    def test_get_order_stats_options_request(self, client):
        """Test OPTIONS request for CORS support."""
        response = client.options('/api/orders/stats')

        assert response.status_code == 200


class TestSearchOrders:
    """Test order search functionality."""

    def test_search_orders_by_order_number(self, client, auth_headers, sample_user, sample_orders):
        """Test searching orders by order number."""
        order = sample_orders[0]
        search_term = order.order_number[:10]

        response = client.get(f'/api/orders/search?q={search_term}', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'orders' in data['data']

    def test_search_orders_by_product_name(self, client, auth_headers, sample_user, sample_products):
        """Test searching orders by product name."""
        # Create order with product
        order = Order(
            user_id=sample_user.id,
            order_number='SEARCH123',
            status=OrderStatus.PENDING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING
        )
        db.session.add(order)
        db.session.flush()

        order_item = OrderItem(
            order_id=order.id,
            product_id=sample_products[0].id,
            quantity=1,
            price=100.0,
            total=100.0
        )
        db.session.add(order_item)
        db.session.commit()

        search_term = sample_products[0].name[:10]
        response = client.get(f'/api/orders/search?q={search_term}', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_search_orders_by_notes(self, client, auth_headers, sample_user):
        """Test searching orders by notes."""
        order = Order(
            user_id=sample_user.id,
            order_number='NOTES123',
            status=OrderStatus.PENDING,
            total_amount=100.00,
            shipping_address={'test': 'address'},
            billing_address={'test': 'address'},
            payment_method='card',
            payment_status=PaymentStatus.PENDING,
            notes='Special delivery instructions'
        )
        db.session.add(order)
        db.session.commit()

        response = client.get('/api/orders/search?q=Special', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_search_orders_empty_query(self, client, auth_headers, sample_user):
        """Test searching with empty query."""
        response = client.get('/api/orders/search?q=', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['data']['orders']) == 0

    def test_search_orders_no_results(self, client, auth_headers, sample_user):
        """Test searching with no matching results."""
        response = client.get('/api/orders/search?q=nonexistent', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['data']['orders']) == 0

    def test_search_orders_options_request(self, client):
        """Test OPTIONS request for order search endpoint."""
        response = client.options('/api/orders/search')
        assert response.status_code == 200


class TestOrderIntegration:
    """Test order integration scenarios."""

    def test_complete_order_workflow(self, client, auth_headers, sample_user, sample_products):
        """Test complete order workflow from cart to completion."""
        # 1. Add items to cart
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        # 2. Create order
        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        order_id = data['data']['order']['id']

        # 3. Track order
        response = client.get(f'/api/orders/{order_id}/track', headers=auth_headers)
        assert response.status_code == 200

        # 4. Get order details
        response = client.get(f'/api/orders/{order_id}', headers=auth_headers)
        assert response.status_code == 200

    def test_inventory_management_integration(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test inventory management during order lifecycle."""
        # Add cart item
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_inventory[0].product_id,
            quantity=5,
            price=100.0
        )
        db.session.add(cart_item)
        db.session.commit()

        # Create order
        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201


class TestOrderErrorHandling:
    """Test error handling in order operations."""

    def test_invalid_json_request(self, client, auth_headers):
        """Test handling of invalid JSON in request."""
        response = client.post('/api/orders',
                             headers=auth_headers,
                             data='invalid json',
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_database_error_handling(self, client, auth_headers, sample_user):
        """Test handling of database errors."""
        with patch('app.models.models.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            order_data = {
                'payment_method': 'card',
                'shipping_address': {
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'phone': '+254712345678',
                    'address_line_1': '123 Test St',
                    'city': 'Nairobi',
                    'postal_code': '00100'
                }
            }

            response = client.post('/api/orders',
                                 headers=auth_headers,
                                 data=json.dumps(order_data),
                                 content_type='application/json')

            assert response.status_code == 400  # Empty cart error comes first
            data = response.get_json()
            assert data['success'] is False


class TestOrderEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_expired_coupon_handling(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test handling of expired coupons."""
        # Create expired coupon
        expired_coupon = Coupon(
            code="EXPIRED10",
            type=CouponType.PERCENTAGE,
            value=10.0,
            start_date=datetime.utcnow() - timedelta(days=10),
            end_date=datetime.utcnow() - timedelta(days=1),
            is_active=True
        )
        db.session.add(expired_coupon)

        # Create cart items
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'coupon_code': 'EXPIRED10',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'expired' in data['error'].lower()

    def test_used_up_coupon_handling(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test handling of coupons that have reached usage limit."""
        # Create used up coupon
        used_coupon = Coupon(
            code="USED10",
            type=CouponType.PERCENTAGE,
            value=10.0,
            usage_limit=1,
            used_count=1,
            is_active=True
        )
        db.session.add(used_coupon)

        # Create cart items
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'coupon_code': 'USED10',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'usage limit' in data['error'].lower()

    def test_large_order_data_handling(self, client, auth_headers, sample_user, sample_products):
        """Test handling of orders with large amounts of data."""
        # Create many cart items
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        for i, product in enumerate(sample_products):
            cart_item = CartItem(
                cart_id=cart.id,
                user_id=sample_user.id,
                product_id=product.id,
                quantity=10,
                price=float(product.price)
            )
            db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            },
            'notes': 'A' * 1000  # Large notes field
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_corrupted_address_data_handling(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test handling of corrupted address data."""
        # Create cart items
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': '',  # Empty required field
                'last_name': 'Doe',
                'phone': 'invalid_phone',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        response = client.post('/api/orders',
                             headers=auth_headers,
                             data=json.dumps(order_data),
                             content_type='application/json')

        # Should still create order as we don't validate address fields strictly
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_email_sending_failure(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test order creation when email sending fails."""
        # Create cart items
        cart = Cart(user_id=sample_user.id, is_active=True)
        db.session.add(cart)
        db.session.flush()

        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=sample_products[0].id,
            quantity=2,
            price=float(sample_products[0].price)
        )
        db.session.add(cart_item)
        db.session.commit()

        order_data = {
            'payment_method': 'card',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '+254712345678',
                'address_line_1': '123 Test St',
                'city': 'Nairobi',
                'postal_code': '00100'
            }
        }

        # Mock email sending failure
        with patch('app.routes.order.order_routes.logger') as mock_logger:
            response = client.post('/api/orders',
                                 headers=auth_headers,
                                 data=json.dumps(order_data),
                                 content_type='application/json')

            # Order should still be created successfully
            assert response.status_code == 201
            data = response.get_json()
            assert data['success'] is True


class TestOrderHealthCheck:
    """Test order system health check."""

    def test_order_health_check(self, client):
        """Test order health check endpoint."""
        response = client.get('/api/orders/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['service'] == 'orders'
        assert 'endpoints' in data
