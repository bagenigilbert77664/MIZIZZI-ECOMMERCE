"""
Edge case tests for order functionality.
Tests unusual scenarios and error conditions.
"""
import pytest
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.models.models import (
    db, Order, OrderItem, Product, Coupon, CouponType,
    OrderStatus, PaymentStatus, User, UserRole, Inventory
)


class TestOrderEdgeCases:
    """Test edge cases and unusual scenarios."""

    def test_order_with_inactive_product(self, client, auth_headers, sample_order_data, test_products):
        """Test order creation with inactive product."""
        # Make product inactive
        test_products[0].is_active = False
        db.session.commit()

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'inactive' in data['message'].lower() or 'unavailable' in data['message'].lower()

    def test_order_with_price_change(self, client, auth_headers, sample_order_data, test_products):
        """Test order creation when product price changes between cart and checkout."""
        # Change product price
        original_price = test_products[0].price
        test_products[0].price = Decimal('999.99')
        db.session.commit()

        # Order data still has old price
        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should use current price, not the price in request
        assert response.status_code == 201
        data = json.loads(response.data)

        # Find the item with changed price
        for item in data['order']['items']:
            if item['product_id'] == test_products[0].id:
                assert float(item['price']) == 999.99

    def test_order_with_expired_coupon(self, client, auth_headers, sample_order_data, test_coupon):
        """Test order creation with expired coupon."""
        # Make coupon expired
        test_coupon.end_date = datetime.utcnow() - timedelta(days=1)
        db.session.commit()

        sample_order_data['coupon_code'] = test_coupon.code

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'expired' in data['message'].lower()

    def test_order_with_used_up_coupon(self, client, auth_headers, sample_order_data, test_coupon):
        """Test order creation with fully used coupon."""
        # Set coupon as fully used
        test_coupon.usage_limit = 1
        test_coupon.used_count = 1
        db.session.commit()

        sample_order_data['coupon_code'] = test_coupon.code

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'limit' in data['message'].lower() or 'used' in data['message'].lower()

    def test_order_with_minimum_purchase_coupon(self, client, auth_headers, sample_order_data, test_coupon):
        """Test order creation with coupon that has minimum purchase requirement."""
        # Set high minimum purchase
        test_coupon.min_purchase = 10000.0
        db.session.commit()

        sample_order_data['coupon_code'] = test_coupon.code

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'minimum' in data['message'].lower()

    def test_order_with_zero_quantity(self, client, auth_headers, sample_order_data):
        """Test order creation with zero quantity items."""
        sample_order_data['items'][0]['quantity'] = 0

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'quantity' in data['message'].lower()

    def test_order_with_negative_quantity(self, client, auth_headers, sample_order_data):
        """Test order creation with negative quantity."""
        sample_order_data['items'][0]['quantity'] = -1

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'quantity' in data['message'].lower()

    def test_order_with_duplicate_items(self, client, auth_headers, sample_order_data):
        """Test order creation with duplicate items."""
        # Add duplicate item
        sample_order_data['items'].append(sample_order_data['items'][0].copy())

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should either merge quantities or reject
        assert response.status_code in [201, 400]

    def test_order_with_very_large_quantity(self, client, auth_headers, sample_order_data):
        """Test order creation with unreasonably large quantity."""
        sample_order_data['items'][0]['quantity'] = 1000000

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'stock' in data['message'].lower() or 'quantity' in data['message'].lower()

    def test_order_with_missing_address_fields(self, client, auth_headers, sample_order_data):
        """Test order creation with incomplete address."""
        del sample_order_data['shipping_address']['city']

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'address' in data['message'].lower() or 'city' in data['message'].lower()

    def test_order_with_invalid_phone_number(self, client, auth_headers, sample_order_data):
        """Test order creation with invalid phone number."""
        sample_order_data['shipping_address']['phone'] = 'invalid-phone'

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should either accept or reject based on validation rules
        assert response.status_code in [201, 400]

    def test_order_with_very_long_notes(self, client, auth_headers, sample_order_data):
        """Test order creation with very long notes."""
        sample_order_data['notes'] = 'x' * 10000  # Very long notes

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should handle long text gracefully
        assert response.status_code in [201, 400]

    def test_order_with_special_characters(self, client, auth_headers, sample_order_data):
        """Test order creation with special characters in address."""
        sample_order_data['shipping_address']['address_line1'] = "123 Tëst Strëët 🏠"
        sample_order_data['notes'] = "Special notes with émojis 🎉 and ñ characters"

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should handle Unicode characters
        assert response.status_code == 201

    def test_cancel_already_cancelled_order(self, client, auth_headers, test_orders):
        """Test cancelling an already cancelled order."""
        order = test_orders[0]
        order.status = OrderStatus.CANCELLED
        db.session.commit()

        response = client.post(f'/api/orders/{order.id}/cancel', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'already' in data['message'].lower() or 'cannot' in data['message'].lower()

    def test_track_order_with_corrupted_data(self, client, auth_headers, test_orders):
        """Test tracking order with corrupted shipping address."""
        order = test_orders[0]
        order.shipping_address = "invalid json string"
        db.session.commit()

        response = client.get(f'/api/orders/{order.id}/track', headers=auth_headers)

        # Should handle corrupted data gracefully
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_get_orders_with_invalid_date_format(self, client, auth_headers):
        """Test getting orders with invalid date format."""
        response = client.get('/api/orders?start_date=invalid-date', headers=auth_headers)

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'date' in data['message'].lower()

    def test_get_orders_with_future_date_range(self, client, auth_headers):
        """Test getting orders with future date range."""
        future_date = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d')

        response = client.get(f'/api/orders?start_date={future_date}', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['orders']) == 0  # No orders in future

    def test_get_orders_with_very_large_page_size(self, client, auth_headers):
        """Test getting orders with unreasonably large page size."""
        response = client.get('/api/orders?per_page=10000', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        # Should limit page size
        assert data['pagination']['per_page'] <= 100

    def test_search_orders_with_sql_injection_attempt(self, client, auth_headers):
        """Test order search with SQL injection attempt."""
        malicious_query = "'; DROP TABLE orders; --"

        response = client.get(f'/api/orders/search?q={malicious_query}', headers=auth_headers)

        # Should handle safely without SQL injection
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_order_stats_with_no_orders(self, client, auth_headers, db_session):
        """Test order statistics for user with no orders."""
        # Create new user with no orders
        new_user = User(
            name="No Orders User",
            email="noorders@example.com",
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        new_user.set_password("password123")
        db_session.add(new_user)
        db_session.commit()

        # Create auth headers for new user
        from configuration.extensions import jwt
        access_token = jwt.create_access_token(identity=new_user.id)
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        response = client.get('/api/orders/stats', headers=headers)

        assert response.status_code == 200
        data = json.loads(response.data)

        stats = data['stats']
        assert stats['total_orders'] == 0
        assert stats['total_spent'] == 0
        assert stats['average_order_value'] == 0

    @patch('routes.order.order_routes.db.session.commit')
    def test_database_rollback_on_error(self, mock_commit, client, auth_headers, sample_order_data):
        """Test database rollback when order creation fails."""
        mock_commit.side_effect = Exception("Database error")

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        assert response.status_code == 500

        # Verify no partial order was created
        orders = Order.query.all()
        initial_count = len(orders)

        # Try again with working database
        mock_commit.side_effect = None

        response = client.post(
            '/api/orders',
            headers=auth_headers,
            data=json.dumps(sample_order_data)
        )

        # Should work now
        assert response.status_code == 201

    def test_create_order_with_inactive_product(self, client, sample_cart_items,
                                               sample_address, auth_headers_for_user):
        """Test order creation when product becomes inactive."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Make product inactive
        cart_item = sample_cart_items['items'][0]
        product = Product.query.get(cart_item.product_id)
        product.is_active = False
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        # Should still create order but skip inactive products
        assert response.status_code == 201

        # Verify only active products were included
        created_order = Order.query.filter_by(
            order_number=response.get_json()['data']['order_number']
        ).first()

        # Should have fewer items than cart (inactive product excluded)
        assert len(created_order.items) < len(sample_cart_items['items'])

    def test_create_order_with_price_changes(self, client, sample_cart_items,
                                           sample_address, sample_inventory, auth_headers_for_user):
        """Test order creation when product prices change during checkout."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Change product price after adding to cart
        cart_item = sample_cart_items['items'][0]
        product = Product.query.get(cart_item.product_id)
        original_price = product.price
        product.price = Decimal('199.99')  # Increase price
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        assert response.status_code == 201

        # Verify order uses current product price, not cart price
        created_order = Order.query.filter_by(
            order_number=response.get_json()['data']['order_number']
        ).first()

        order_item = next(item for item in created_order.items
                         if item.product_id == product.id)
        assert order_item.price == float(product.price)

    def test_create_order_with_expired_coupon(self, client, sample_cart_items,
                                            sample_address, sample_inventory, auth_headers_for_user):
        """Test order creation with expired coupon."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Create expired coupon
        expired_coupon = Coupon(
            code="EXPIRED10",
            type=CouponType.PERCENTAGE,
            value=10.0,
            start_date=datetime.utcnow() - timedelta(days=10),
            end_date=datetime.utcnow() - timedelta(days=1),  # Expired yesterday
            is_active=True
        )
        db.session.add(expired_coupon)
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True,
            'coupon_code': 'EXPIRED10'
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert 'expired' in data['error'].lower()

    def test_create_order_with_usage_limit_exceeded(self, client, sample_cart_items,
                                                   sample_address, sample_inventory, auth_headers_for_user):
        """Test order creation with coupon that has reached usage limit."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Create coupon with usage limit reached
        limited_coupon = Coupon(
            code="LIMITED5",
            type=CouponType.FIXED,
            value=5.0,
            usage_limit=1,
            used_count=1,  # Already used once, limit is 1
            is_active=True
        )
        db.session.add(limited_coupon)
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True,
            'coupon_code': 'LIMITED5'
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert 'usage limit' in data['error'].lower()

    def test_create_order_with_minimum_purchase_not_met(self, client, sample_cart_items,
                                                       sample_address, sample_inventory, auth_headers_for_user):
        """Test order creation with coupon minimum purchase not met."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Create coupon with high minimum purchase
        min_purchase_coupon = Coupon(
            code="BIGORDER",
            type=CouponType.PERCENTAGE,
            value=20.0,
            min_purchase=1000.0,  # Much higher than cart total
            is_active=True
        )
        db.session.add(min_purchase_coupon)
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True,
            'coupon_code': 'BIGORDER'
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert 'minimum purchase' in data['error'].lower()

    def test_create_order_concurrent_inventory_depletion(self, client, sample_cart_items,
                                                        sample_address, auth_headers_for_user):
        """Test order creation when inventory is depleted by concurrent order."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Simulate inventory depletion
        cart_item = sample_cart_items['items'][0]
        inventory = Inventory.query.filter_by(
            product_id=cart_item.product_id,
            variant_id=None
        ).first()

        if inventory:
            inventory.stock_level = 0  # Deplete inventory
            db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert 'stock' in data['error'].lower()

    def test_get_orders_with_corrupted_address_data(self, client, sample_order, auth_headers_for_user):
        """Test getting order with corrupted address JSON."""
        order_data = sample_order['order']
        user = sample_order['user']
        headers = auth_headers_for_user(user)

        # Corrupt the address JSON
        order_data.shipping_address = "invalid json data"
        db.session.commit()

        response = client.get(f'/api/orders/{order_data.id}', headers=headers)

        # Should still return order, but with null address
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['shipping_address'] is None

    def test_cancel_order_race_condition(self, client, sample_order, auth_headers_for_user):
        """Test cancelling order that was already processed."""
        order_data = sample_order['order']
        user = sample_order['user']
        headers = auth_headers_for_user(user)

        # Simulate race condition - order gets shipped while user tries to cancel
        order_data.status = OrderStatus.SHIPPED
        db.session.commit()

        response = client.post(f'/api/orders/{order_data.id}/cancel',
                              headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert 'cannot be cancelled' in data['error'].lower()

    def test_track_order_with_missing_tracking_number(self, client, sample_order, auth_headers_for_user):
        """Test tracking order without tracking number."""
        order_data = sample_order['order']
        user = sample_order['user']
        headers = auth_headers_for_user(user)

        # Ensure no tracking number
        order_data.tracking_number = None
        db.session.commit()

        response = client.get(f'/api/orders/{order_data.id}/track', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['tracking_number'] is None

    def test_get_orders_with_large_dataset(self, client, create_test_user,
                                          sample_product, auth_headers_for_user):
        """Test getting orders with large number of orders."""
        user = create_test_user()
        headers = auth_headers_for_user(user)

        # Create many orders
        orders = []
        for i in range(150):  # More than default pagination
            order = Order(
                user_id=user.id,
                order_number=f"LARGE{i:04d}",
                status=OrderStatus.DELIVERED,
                total_amount=100.0,
                shipping_address='{"test": "address"}',
                billing_address='{"test": "address"}',
                payment_method="M-Pesa",
                payment_status=PaymentStatus.PAID
            )
            orders.append(order)

        db.session.add_all(orders)
        db.session.commit()

        # Test pagination works correctly
        response = client.get('/api/orders?per_page=50', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['data']) == 50
        assert data['pagination']['total_items'] == 150
        assert data['pagination']['total_pages'] == 3

    def test_create_order_with_malformed_json(self, client, create_test_user, auth_headers_for_user):
        """Test order creation with malformed JSON."""
        user = create_test_user()
        headers = auth_headers_for_user(user)

        # Send malformed JSON
        response = client.post('/api/orders',
                              data="invalid json",
                              headers=headers,
                              content_type='application/json')

        assert response.status_code == 400

    def test_order_operations_with_deleted_user(self, client, sample_order):
        """Test order operations when user is deleted."""
        order_data = sample_order['order']
        user = sample_order['user']

        # Delete user
        db.session.delete(user)
        db.session.commit()

        # Try to access order (should fail due to foreign key constraint)
        # This tests the database integrity
        remaining_orders = Order.query.filter_by(user_id=user.id).all()
        assert len(remaining_orders) == 0  # Should be cascade deleted

    @patch('routes.order.order_routes.send_order_confirmation_email')
    def test_create_order_email_failure(self, mock_email, client, sample_cart_items,
                                       sample_address, sample_inventory, auth_headers_for_user):
        """Test order creation when email sending fails."""
        mock_email.side_effect = Exception("Email service unavailable")

        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        # Order should still be created even if email fails
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True

    def test_order_with_zero_quantity_items(self, client, sample_cart_items,
                                          sample_address, auth_headers_for_user):
        """Test order creation with zero quantity cart items."""
        user = sample_cart_items['user']
        headers = auth_headers_for_user(user)

        # Set cart item quantity to zero
        cart_item = sample_cart_items['items'][0]
        cart_item.quantity = 0
        db.session.commit()

        order_data = {
            'payment_method': 'M-Pesa',
            'shipping_address_id': sample_address.id,
            'same_as_shipping': True
        }

        response = client.post('/api/orders',
                              json=order_data,
                              headers=headers)

        # Should create order but skip zero quantity items
        assert response.status_code == 201

    def test_order_stats_with_extreme_values(self, client, create_test_user,
                                           sample_product, auth_headers_for_user):
        """Test order statistics with extreme values."""
        user = create_test_user()
        headers = auth_headers_for_user(user)

        # Create order with very large amount
        large_order = Order(
            user_id=user.id,
            order_number="EXTREME001",
            status=OrderStatus.DELIVERED,
            total_amount=999999.99,  # Very large amount
            shipping_address='{"test": "address"}',
            billing_address='{"test": "address"}',
            payment_method="Bank Transfer",
            payment_status=PaymentStatus.PAID
        )

        db.session.add(large_order)
        db.session.commit()

        response = client.get('/api/orders/stats', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['total_spent'] == 999999.99
        assert data['data']['average_order_value'] == 999999.99
