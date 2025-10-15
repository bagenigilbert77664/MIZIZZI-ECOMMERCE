"""
Complete test suite for user inventory routes.
Tests all endpoints with various scenarios including edge cases and error handling.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from flask import current_app
from sqlalchemy.exc import IntegrityError
from app.models.models import (
    User, Product, ProductVariant, Category, Brand, Inventory,
    Cart, CartItem, Order, OrderItem, OrderStatus, PaymentStatus
)
from app.configuration.extensions import db


class TestViewInventory:
    """Test cases for viewing inventory."""

    def test_view_inventory_success(self, client, sample_inventory):
        """Test successful inventory retrieval."""
        response = client.get('/api/inventory/user/')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert 'inventory' in data
        assert len(data['inventory']) > 0
        assert 'pagination' in data

    def test_view_inventory_with_product_filter(self, client, sample_inventory, sample_products):
        """Test inventory retrieval with product filter."""
        product_id = sample_products[0].id
        response = client.get(f'/api/inventory/user/?product_id={product_id}')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

        # All returned items should be for the specified product
        for item in data['inventory']:
            assert item['product_id'] == product_id

    def test_view_inventory_with_variant_filter(self, client, sample_inventory, sample_variants):
        """Test inventory retrieval with variant filter."""
        variant_id = sample_variants[0].id
        response = client.get(f'/api/inventory/user/?variant_id={variant_id}')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

        # All returned items should be for the specified variant
        for item in data['inventory']:
            assert item['variant_id'] == variant_id

    def test_view_inventory_with_status_filter(self, client, sample_inventory):
        """Test inventory retrieval with status filter."""
        response = client.get('/api/inventory/user/?status=active')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

        # All returned items should have active status
        for item in data['inventory']:
            assert item['status'] == 'active'

    def test_view_inventory_with_pagination(self, client, sample_inventory):
        """Test inventory retrieval with pagination."""
        response = client.get('/api/inventory/user/?page=1&per_page=2')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['inventory']) <= 2
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 2

    def test_view_inventory_empty_result(self, client):
        """Test inventory retrieval with no results."""
        response = client.get('/api/inventory/user/?product_id=99999')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['inventory']) == 0

    def test_view_inventory_options_request(self, client):
        """Test OPTIONS request for inventory endpoint."""
        response = client.options('/api/inventory/user/')
        assert response.status_code == 200


class TestCheckAvailability:
    """Test cases for checking product availability."""

    def test_check_availability_success(self, client, sample_products, sample_inventory):
        """Test successful availability check."""
        product_id = sample_products[0].id
        response = client.get(f'/api/inventory/user/availability/{product_id}')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['product_id'] == product_id
        assert 'available_quantity' in data
        assert 'is_available' in data
        assert 'can_fulfill' in data

    def test_check_availability_with_variant(self, client, sample_variants, sample_inventory):
        """Test availability check with variant."""
        variant = sample_variants[0]
        response = client.get(f'/api/inventory/user/availability/{variant.product_id}?variant_id={variant.id}')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['product_id'] == variant.product_id
        assert data['variant_id'] == variant.id

    def test_check_availability_with_quantity(self, client, sample_products, sample_inventory):
        """Test availability check with specific quantity."""
        product_id = sample_products[0].id
        quantity = 5
        response = client.get(f'/api/inventory/user/availability/{product_id}?quantity={quantity}')

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['requested_quantity'] == quantity

    def test_check_availability_out_of_stock(self, client, sample_products):
        """Test availability check for out of stock product."""
        # Create a product with zero stock
        with current_app.app_context():
            product = Product(
                name="Out of Stock Product",
                slug="out-of-stock",
                price=100.0,
                stock_quantity=0,
                category_id=sample_products[0].category_id,
                brand_id=sample_products[0].brand_id
            )
            db.session.add(product)
            db.session.commit()

            response = client.get(f'/api/inventory/user/availability/{product.id}')

            assert response.status_code == 200
            data = response.json
            assert data['success'] is True
            assert data['available_quantity'] == 0
            assert data['available'] is False

    def test_check_availability_product_not_found(self, client):
        """Test availability check for non-existent product."""
        response = client.get('/api/inventory/user/availability/99999')

        assert response.status_code == 404
        data = response.json
        assert 'error' in data

    def test_check_availability_invalid_quantity(self, client, sample_products):
        """Test availability check with invalid quantity."""
        product_id = sample_products[0].id
        response = client.get(f'/api/inventory/user/availability/{product_id}?quantity=-1')

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_check_availability_options_request(self, client, sample_products):
        """Test OPTIONS request for availability endpoint."""
        product_id = sample_products[0].id
        response = client.options(f'/api/inventory/user/availability/{product_id}')
        assert response.status_code == 200


class TestReserveInventory:
    """Test cases for reserving inventory."""

    def test_reserve_inventory_success(self, client, auth_headers, sample_products, sample_inventory):
        """Test successful inventory reservation."""
        product_id = sample_products[0].id
        quantity = 2

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': quantity},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['product_id'] == product_id
        assert data['quantity'] == quantity
        assert 'reservation_id' in data
        assert 'expires_at' in data

    def test_reserve_inventory_with_variant(self, client, auth_headers, sample_variants, sample_inventory):
        """Test inventory reservation with variant."""
        variant = sample_variants[0]
        quantity = 2

        response = client.post(
            f'/api/inventory/user/reserve/{variant.product_id}',
            json={
                'quantity': quantity,
                'variant_id': variant.id
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['variant_id'] == variant.id

    def test_reserve_inventory_insufficient_stock(self, client, auth_headers, sample_products, sample_inventory):
        """Test inventory reservation with insufficient stock."""
        product_id = sample_products[0].id
        quantity = 1000  # More than available

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': quantity},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data
        assert 'available' in data

    def test_reserve_inventory_unauthorized(self, client, sample_products):
        """Test inventory reservation without authentication."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': 1}
        )

        assert response.status_code == 401

    def test_reserve_inventory_invalid_quantity(self, client, auth_headers, sample_products):
        """Test inventory reservation with invalid quantity."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': -1},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_reserve_inventory_missing_quantity(self, client, auth_headers, sample_products):
        """Test inventory reservation without quantity."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_reserve_inventory_product_not_found(self, client, auth_headers):
        """Test inventory reservation for non-existent product."""
        response = client.post(
            '/api/inventory/user/reserve/99999',
            json={'quantity': 1},
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json
        assert 'error' in data

    def test_reserve_inventory_options_request(self, client, sample_products):
        """Test OPTIONS request for reserve endpoint."""
        product_id = sample_products[0].id
        response = client.options(f'/api/inventory/user/reserve/{product_id}')
        assert response.status_code == 200


class TestReleaseInventory:
    """Test cases for releasing inventory."""

    def test_release_inventory_success(self, client, auth_headers, sample_products, sample_inventory):
        """Test successful inventory release."""
        # First reserve some inventory
        product_id = sample_products[0].id
        quantity = 3

        reserve_response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': quantity},
            headers=auth_headers
        )

        assert reserve_response.status_code == 200
        reservation_id = reserve_response.json['reservation_id']

        # Now release it
        response = client.post(
            f'/api/inventory/user/release/{product_id}',
            json={
                'quantity': quantity,
                'reservation_id': reservation_id
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['released_quantity'] == quantity

    def test_release_inventory_with_variant(self, client, auth_headers, sample_variants, sample_inventory):
        """Test inventory release with variant."""
        variant = sample_variants[0]
        quantity = 2

        # Reserve first
        reserve_response = client.post(
            f'/api/inventory/user/reserve/{variant.product_id}',
            json={
                'quantity': quantity,
                'variant_id': variant.id
            },
            headers=auth_headers
        )
        reservation_id = reserve_response.json['reservation_id']

        # Then release
        response = client.post(
            f'/api/inventory/user/release/{variant.product_id}',
            json={
                'quantity': quantity,
                'variant_id': variant.id,
                'reservation_id': reservation_id
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

    def test_release_inventory_unauthorized(self, client, sample_products):
        """Test inventory release without authentication."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/release/{product_id}',
            json={'quantity': 1}
        )

        assert response.status_code == 401

    def test_release_inventory_invalid_reservation(self, client, auth_headers, sample_products, sample_inventory):
        """Test inventory release with invalid reservation."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/release/{product_id}',
            json={
                'quantity': 1,
                'reservation_id': 'invalid-reservation'
            },
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_release_inventory_missing_quantity(self, client, auth_headers, sample_products):
        """Test inventory release without quantity."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/release/{product_id}',
            json={},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_release_inventory_options_request(self, client, sample_products):
        """Test OPTIONS request for release endpoint."""
        product_id = sample_products[0].id
        response = client.options(f'/api/inventory/user/release/{product_id}')
        assert response.status_code == 200


class TestCommitInventory:
    """Test cases for committing inventory."""

    def test_commit_inventory_success(self, client, auth_headers, sample_products, sample_inventory):
        """Test successful inventory commit."""
        product_id = sample_products[0].id
        quantity = 2

        # First reserve inventory
        reserve_response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': quantity},
            headers=auth_headers
        )

        reservation_id = reserve_response.json['reservation_id']

        # Then commit it
        response = client.post(
            f'/api/inventory/user/commit/{product_id}',
            json={
                'quantity': quantity,
                'reservation_id': reservation_id,
                'order_id': 'ORD-TEST-001'
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['committed_quantity'] == quantity

    def test_commit_inventory_with_variant(self, client, auth_headers, sample_variants, sample_inventory):
        """Test inventory commit with variant."""
        variant = sample_variants[0]
        quantity = 1

        # Reserve first
        reserve_response = client.post(
            f'/api/inventory/user/reserve/{variant.product_id}',
            json={
                'quantity': quantity,
                'variant_id': variant.id
            },
            headers=auth_headers
        )
        reservation_id = reserve_response.json['reservation_id']

        # Then commit
        response = client.post(
            f'/api/inventory/user/commit/{variant.product_id}',
            json={
                'quantity': quantity,
                'variant_id': variant.id,
                'reservation_id': reservation_id,
                'order_id': 'ORD-VARIANT-001'
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

    def test_commit_inventory_unauthorized(self, client, sample_products):
        """Test inventory commit without authentication."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/commit/{product_id}',
            json={'quantity': 1, 'reservation_id': 'test'}
        )

        assert response.status_code == 401

    def test_commit_inventory_missing_reservation(self, client, auth_headers, sample_products):
        """Test inventory commit without reservation ID."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/commit/{product_id}',
            json={'quantity': 1},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_commit_inventory_invalid_reservation(self, client, auth_headers, sample_products, sample_inventory):
        """Test inventory commit with invalid reservation."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/commit/{product_id}',
            json={
                'quantity': 1,
                'reservation_id': 'invalid-reservation'
            },
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_commit_inventory_options_request(self, client, sample_products):
        """Test OPTIONS request for commit endpoint."""
        product_id = sample_products[0].id
        response = client.options(f'/api/inventory/user/commit/{product_id}')
        assert response.status_code == 200


class TestValidateCart:
    """Test cases for cart validation."""

    def test_validate_cart_success(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test successful cart validation."""
        # Create a cart with valid items
        items = [
            {'product_id': sample_products[0].id, 'quantity': 2},
            {'product_id': sample_products[1].id, 'quantity': 1}
        ]

        response = client.post(
            '/api/inventory/user/validate-cart',
            json={'items': items},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['valid'] is True
        assert len(data['items']) == 2

    def test_validate_cart_with_cart_id(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test cart validation with cart ID."""
        # Create a cart and get its ID
        cart_id = None
        with client.application.app_context():
            cart = Cart(
                user_id=sample_user.id,
                is_active=True
            )
            db.session.add(cart)
            db.session.commit()

            # Add items to cart
            cart_item = CartItem(
                cart_id=cart.id,
                user_id=sample_user.id,
                product_id=sample_products[0].id,
                quantity=2,
                price=100.0
            )
            db.session.add(cart_item)
            db.session.commit()

            cart_id = cart.id

        response = client.post(
            '/api/inventory/user/validate-cart',
            json={'cart_id': cart_id},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

    def test_validate_cart_guest_user(self, client, sample_products, sample_inventory):
        """Test cart validation for guest user."""
        items = [
            {'product_id': sample_products[0].id, 'quantity': 1}
        ]

        response = client.post(
            '/api/inventory/user/validate-cart',
            json={'items': items}
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

    def test_validate_cart_empty_cart(self, client, auth_headers):
        """Test validation of empty cart."""
        response = client.post(
            '/api/inventory/user/validate-cart',
            json={'items': []},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['items']) == 0

    def test_validate_cart_insufficient_stock(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test cart validation with insufficient stock."""
        # Create a cart with more items than available
        cart_id = None
        with client.application.app_context():
            cart = Cart(
                user_id=sample_user.id,
                is_active=True
            )
            db.session.add(cart)
            db.session.commit()

            # Add item with high quantity
            cart_item = CartItem(
                cart_id=cart.id,
                user_id=sample_user.id,
                product_id=sample_products[0].id,
                quantity=1000,  # More than available
                price=100.0
            )
            db.session.add(cart_item)
            db.session.commit()
            cart_id = cart.id

        response = client.post(
            '/api/inventory/user/validate-cart',
            json={'cart_id': cart_id},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['valid'] is False
        assert len(data['errors']) > 0

    def test_validate_cart_options_request(self, client):
        """Test OPTIONS request for validate cart endpoint."""
        response = client.options('/api/inventory/user/validate-cart')
        assert response.status_code == 200


class TestBatchAvailability:
    """Test cases for batch availability checking."""

    def test_batch_availability_success(self, client, sample_products, sample_inventory):
        """Test successful batch availability check."""
        items = [
            {'product_id': sample_products[0].id, 'quantity': 2},
            {'product_id': sample_products[1].id, 'quantity': 1}
        ]

        response = client.post(
            '/api/inventory/user/batch-availability',
            json={'items': items}
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['results']) == 2

    def test_batch_availability_with_variants(self, client, sample_variants, sample_inventory):
        """Test batch availability check with variants."""
        items = [
            {
                'product_id': sample_variants[0].product_id,
                'variant_id': sample_variants[0].id,
                'quantity': 1
            }
        ]

        response = client.post(
            '/api/inventory/user/batch-availability',
            json={'items': items}
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['results']) == 1

    def test_batch_availability_empty_items(self, client):
        """Test batch availability check with empty items."""
        response = client.post(
            '/api/inventory/user/batch-availability',
            json={'items': []}
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert len(data['results']) == 0

    def test_batch_availability_invalid_items(self, client):
        """Test batch availability check with invalid items."""
        items = [
            {'invalid': 'item'},
            {'product_id': 'invalid'}
        ]

        response = client.post(
            '/api/inventory/user/batch-availability',
            json={'items': items}
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        # Should have error entries for invalid items
        assert len(data['results']) == 2

    def test_batch_availability_missing_items(self, client):
        """Test batch availability check without items."""
        response = client.post(
            '/api/inventory/user/batch-availability',
            json={}
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_batch_availability_options_request(self, client):
        """Test OPTIONS request for batch availability endpoint."""
        response = client.options('/api/inventory/user/batch-availability')
        assert response.status_code == 200


class TestCompleteOrder:
    """Test cases for completing orders."""

    def test_complete_order_success(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test successful order completion."""
        # Create order
        order_id = None
        with client.application.app_context():
            order = Order(
                user_id=sample_user.id,
                order_number="ORD-SUCCESS-001",
                status=OrderStatus.PROCESSING,
                total_amount=299.99,
                subtotal=299.99,
                shipping_address={"test": "address"},
                billing_address={"test": "address"},
                payment_status=PaymentStatus.PAID
            )
            db.session.add(order)
            db.session.commit()

            # Add order item
            order_item = OrderItem(
                order_id=order.id,
                product_id=sample_products[0].id,
                quantity=2,
                price=149.99,
                total=299.98
            )
            db.session.add(order_item)
            db.session.commit()
            order_id = order.id

        response = client.post(
            f'/api/inventory/user/complete-order/{order_id}',
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert data['inventory_updated'] is False  # Order status is PROCESSING, not DELIVERED

    def test_complete_order_with_variants(self, client, auth_headers, sample_user, sample_variants, sample_inventory):
        """Test order completion with variants."""
        # Create order with variant items
        order_id = None
        with client.application.app_context():
            order = Order(
                user_id=sample_user.id,
                order_number="ORD-VARIANT-001",
                status=OrderStatus.PENDING,
                total_amount=649.99,
                subtotal=649.99,
                shipping_address={"test": "address"},
                billing_address={"test": "address"},
                payment_status=PaymentStatus.PENDING
            )
            db.session.add(order)
            db.session.commit()

            # Add order item with variant
            order_item = OrderItem(
                order_id=order.id,
                product_id=sample_variants[0].product_id,
                variant_id=sample_variants[0].id,
                quantity=1,
                price=649.99,
                total=649.99
            )
            db.session.add(order_item)
            db.session.commit()
            order_id = order.id

        response = client.post(
            f'/api/inventory/user/complete-order/{order_id}',
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True

    def test_complete_order_unauthorized(self, client, sample_user):
        """Test order completion without authentication."""
        response = client.post('/api/inventory/user/complete-order/1')

        assert response.status_code == 401

    def test_complete_order_not_found(self, client, auth_headers):
        """Test order completion for non-existent order."""
        response = client.post(
            '/api/inventory/user/complete-order/99999',
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json
        assert 'error' in data

    def test_complete_order_insufficient_stock(self, client, auth_headers, sample_user, sample_products, sample_inventory):
        """Test order completion with insufficient stock."""
        # Create order with more items than available
        order_id = None
        with client.application.app_context():
            order = Order(
                user_id=sample_user.id,
                order_number="ORD-INSUFFICIENT-001",
                status=OrderStatus.PENDING,
                total_amount=1000.0,
                subtotal=1000.0,
                shipping_address={"test": "address"},
                billing_address={"test": "address"},
                payment_status=PaymentStatus.PENDING
            )
            db.session.add(order)
            db.session.commit()

            # Add order item with high quantity
            order_item = OrderItem(
                order_id=order.id,
                product_id=sample_products[0].id,
                quantity=1000,  # More than available
                price=1.0,
                total=1000.0
            )
            db.session.add(order_item)
            db.session.commit()
            order_id = order.id

        response = client.post(
            f'/api/inventory/user/complete-order/{order_id}',
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        # Should not update inventory for PENDING orders
        assert data['inventory_updated'] is False

    def test_complete_order_options_request(self, client):
        """Test OPTIONS request for complete order endpoint."""
        response = client.options('/api/inventory/user/complete-order/1')
        assert response.status_code == 200


class TestInventoryIntegration:
    """Integration tests for inventory workflows."""

    def test_complete_inventory_workflow(self, client, auth_headers, sample_products, sample_inventory):
        """Test complete inventory workflow: check -> reserve -> commit."""
        product_id = sample_products[0].id
        quantity = 3

        # Step 1: Check availability
        availability_response = client.get(f'/api/inventory/user/availability/{product_id}?quantity={quantity}')
        assert availability_response.status_code == 200
        assert availability_response.json['can_fulfill'] is True

        # Step 2: Reserve inventory
        reserve_response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': quantity},
            headers=auth_headers
        )
        assert reserve_response.status_code == 200
        reservation_id = reserve_response.json['reservation_id']

        # Step 3: Commit inventory
        commit_response = client.post(
            f'/api/inventory/user/commit/{product_id}',
            json={
                'quantity': quantity,
                'reservation_id': reservation_id,
                'order_id': 'ORD-INTEGRATION-001'
            },
            headers=auth_headers
        )
        assert commit_response.status_code == 200

        # Step 4: Verify final stock level
        final_availability = client.get(f'/api/inventory/user/availability/{product_id}')
        assert final_availability.status_code == 200
        # Stock should be reduced by the committed quantity

    def test_cart_to_order_workflow(self, client, auth_headers, sample_cart, sample_inventory):
        """Test workflow from cart validation to order completion."""
        # Step 1: Validate cart
        validate_response = client.post(
            '/api/inventory/user/validate-cart',
            headers=auth_headers
        )
        assert validate_response.status_code == 200
        assert validate_response.json['valid'] is True

        # Step 2: Reserve cart items
        # Get cart items from database to avoid detached instance error
        with client.application.app_context():
            cart_items = CartItem.query.filter_by(cart_id=sample_cart.id).all()

            for item in cart_items:
                reserve_response = client.post(
                    f'/api/inventory/user/reserve/{item.product_id}',
                    json={
                        'quantity': item.quantity,
                        'variant_id': item.variant_id
                    },
                    headers=auth_headers
                )
                assert reserve_response.status_code == 200

    def test_concurrent_reservation_handling(self, client, auth_headers, sample_products, sample_inventory):
        """Test handling of concurrent reservation requests."""
        product_id = sample_products[0].id
        quantity = 5

        # Make multiple concurrent reservation requests
        responses = []
        for i in range(3):
            response = client.post(
                f'/api/inventory/user/reserve/{product_id}',
                json={'quantity': quantity},
                headers=auth_headers
            )
            responses.append(response)

        # At least one should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 1

    def test_inventory_consistency_after_operations(self, client, auth_headers, sample_products, sample_inventory):
        """Test inventory consistency after various operations."""
        product_id = sample_products[0].id

        # Get initial stock
        initial_response = client.get(f'/api/inventory/user/availability/{product_id}')
        initial_stock = initial_response.json['available_quantity']

        # Reserve some stock
        reserve_quantity = 3
        reserve_response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            json={'quantity': reserve_quantity},
            headers=auth_headers
        )
        reservation_id = reserve_response.json['reservation_id']

        # Check stock after reservation
        after_reserve_response = client.get(f'/api/inventory/user/availability/{product_id}')
        after_reserve_stock = after_reserve_response.json['available_quantity']

        # Available stock should be reduced by reserved amount
        assert after_reserve_stock == initial_stock - reserve_quantity

        # Release the reservation
        release_response = client.post(
            f'/api/inventory/user/release/{product_id}',
            json={
                'quantity': reserve_quantity,
                'reservation_id': reservation_id
            },
            headers=auth_headers
        )
        assert release_response.status_code == 200

        # Check stock after release
        after_release_response = client.get(f'/api/inventory/user/availability/{product_id}')
        after_release_stock = after_release_response.json['available_quantity']

        # Stock should be back to initial level
        assert after_release_stock == initial_stock


class TestInventoryErrorHandling:
    """Test cases for error handling."""

    def test_invalid_json_request(self, client, auth_headers, sample_products):
        """Test handling of invalid JSON requests."""
        product_id = sample_products[0].id

        response = client.post(
            f'/api/inventory/user/reserve/{product_id}',
            data='invalid json',
            headers=auth_headers,
            content_type='application/json'
        )

        assert response.status_code == 400
        data = response.json
        assert 'error' in data

    def test_database_error_handling(self, client, auth_headers):
        """Test handling of database errors."""
        with patch('app.models.models.Product.query') as mock_query:
            mock_query.get.return_value = None

            response = client.post(
                '/api/inventory/user/reserve/1',
                json={'quantity': 1},
                headers=auth_headers
            )

            assert response.status_code == 404
            data = response.json
            assert 'error' in data

    def test_concurrent_modification_handling(self, client, auth_headers, sample_products, sample_inventory):
        """Test handling of concurrent modifications."""
        product_id = sample_products[0].id

        # This test simulates concurrent access by making rapid requests
        responses = []
        for i in range(5):
            response = client.post(
                f'/api/inventory/user/reserve/{product_id}',
                json={'quantity': 10},
                headers=auth_headers
            )
            responses.append(response)

        # Some requests should succeed, others might fail due to insufficient stock
        status_codes = [r.status_code for r in responses]
        assert 200 in status_codes or 400 in status_codes


class TestInventoryHealthCheck:
    """Test cases for health check endpoint."""

    def test_inventory_health_check(self, client):
        """Test inventory health check endpoint."""
        response = client.get('/api/inventory/user/health')

        assert response.status_code == 200
        data = response.json
        assert data['status'] == 'healthy'
        assert data['service'] == 'user_inventory'
        assert 'endpoints' in data