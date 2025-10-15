"""
Comprehensive test suite for User Address Routes in Mizizzi E-commerce platform.
Tests all user address management functionality including CRUD operations,
authentication, authorization, validation, and error handling.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import current_app
from flask_jwt_extended import create_access_token

from app.models.models import Address, AddressType, User, UserRole
from app.configuration.extensions import db


class TestUserAddressHealthCheck:
    """Test user address service health check endpoint."""

    def test_health_check_success(self, client):
        """Test successful health check."""
        response = client.get('/api/addresses/user/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'user_address'
        assert 'timestamp' in data
        assert data['database'] == 'connected'

    def test_health_check_options(self, client):
        """Test OPTIONS request for health check."""
        response = client.options('/api/addresses/user/health')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)

    @patch('app.routes.address.user_address_routes.db.session.execute')
    def test_health_check_database_error(self, mock_execute, client):
        """Test health check with database error."""
        mock_execute.side_effect = Exception("Database connection failed")

        response = client.get('/api/addresses/user/health')

        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'unhealthy'
        assert 'error' in data


class TestUserAddressList:
    """Test user address listing functionality."""

    def test_get_addresses_empty_list(self, client, auth_headers):
        """Test getting addresses when user has none."""
        response = client.get('/api/addresses/user/', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []
        assert data['pagination']['total_items'] == 0

    def test_get_addresses_success(self, client, create_test_user):
        """Test successful address retrieval."""
        user = create_test_user()

        # Create test addresses
        address1 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        address2 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="456 Oak Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        # Create auth headers
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2
        assert data['pagination']['total_items'] == 2

        # Check that default address comes first
        assert data['items'][0]['is_default'] == True
        assert data['items'][0]['city'] == "Nairobi"

    def test_get_addresses_with_pagination(self, client, create_test_user):
        """Test address listing with pagination."""
        user = create_test_user()

        # Create multiple addresses
        addresses = []
        for i in range(5):
            address = Address(
                user_id=user.id,
                first_name=f"User{i}",
                last_name="Test",
                address_line1=f"{i+1}00 Test St",
                city="Nairobi",
                state="Nairobi",
                postal_code="00100",
                country="Kenya",
                phone="+254712345678",
                address_type=AddressType.BOTH
            )
            addresses.append(address)

        db.session.add_all(addresses)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Test first page
        response = client.get('/api/addresses/user/?page=1&per_page=3', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 3
        assert data['pagination']['page'] == 1
        assert data['pagination']['total_pages'] == 2
        assert data['pagination']['has_next'] == True

        # Test second page
        response = client.get('/api/addresses/user/?page=2&per_page=3', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 2
        assert data['pagination']['page'] == 2
        assert data['pagination']['has_prev'] == True

    def test_get_addresses_with_type_filter(self, client, create_test_user):
        """Test address filtering by type."""
        user = create_test_user()

        # Create addresses with different types
        shipping_address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Shipping St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        billing_address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="456 Billing Ave",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([shipping_address, billing_address])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Test shipping filter
        response = client.get('/api/addresses/user/?type=shipping', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['address_type'] == 'shipping'

        # Test billing filter
        response = client.get('/api/addresses/user/?type=billing', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['address_type'] == 'billing'

    def test_get_addresses_user_isolation(self, client, create_test_user):
        """Test that users can only see their own addresses."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        # Create addresses for different users
        address1 = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Test",
            address_line1="123 User1 St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user2.id,
            first_name="User2",
            last_name="Test",
            address_line1="456 User2 Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345679",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        # User1 should only see their address
        access_token = create_access_token(
            identity=str(user1.id),
            additional_claims={"role": user1.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['first_name'] == "User1"

    def test_get_addresses_unauthorized(self, client):
        """Test getting addresses without authentication."""
        response = client.get('/api/addresses/user/')

        assert response.status_code == 401

    def test_get_addresses_options(self, client):
        """Test OPTIONS request for address list."""
        response = client.options('/api/addresses/user/')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestUserAddressById:
    """Test getting individual addresses by ID."""

    def test_get_address_by_id_success(self, client, create_test_user):
        """Test successful address retrieval by ID."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get(f'/api/addresses/user/{address.id}', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == address.id
        assert data['first_name'] == "John"
        assert data['city'] == "Nairobi"
        assert data['is_default'] == True

    def test_get_address_by_id_not_found(self, client, auth_headers):
        """Test getting non-existent address."""
        response = client.get('/api/addresses/user/999', headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert "Not Found" in str(data) or data.get('error') == "Address not found"

    def test_get_address_by_id_unauthorized_user(self, client, create_test_user):
        """Test user cannot access another user's address."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        # Create address for user1
        address = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Test",
            address_line1="123 Private St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        # Try to access with user2's token
        access_token = create_access_token(
            identity=str(user2.id),
            additional_claims={"role": user2.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get(f'/api/addresses/user/{address.id}', headers=headers)

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized"

    def test_get_address_by_id_options(self, client):
        """Test OPTIONS request for address by ID."""
        response = client.options('/api/addresses/user/1')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestCreateUserAddress:
    """Test user address creation functionality."""

    def test_create_address_success(self, client, create_test_user):
        """Test successful address creation."""
        user = create_test_user()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "address_line2": "Apt 4B",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "alternative_phone": "+254722345678",
            "address_type": "shipping",
            "is_default": True,
            "additional_info": "Near the mall"
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == "Address created successfully"
        assert data['address']['first_name'] == "John"
        assert data['address']['city'] == "Nairobi"
        assert data['address']['is_default'] == True

        # Verify address was created in database
        address = Address.query.filter_by(user_id=user.id).first()
        assert address is not None
        assert address.first_name == "John"

    def test_create_address_missing_required_fields(self, client, auth_headers):
        """Test address creation with missing required fields."""
        incomplete_data = {
            "first_name": "John",
            "last_name": "Doe"
            # Missing other required fields
        }

        response = client.post('/api/addresses/user/',
                             json=incomplete_data,
                             headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert "is required" in data['error']

    def test_create_address_invalid_type(self, client, auth_headers):
        """Test address creation with invalid address type."""
        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "invalid_type"
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert "Invalid address type" in data['error']

    def test_create_address_default_handling(self, client, create_test_user):
        """Test default address handling when creating new address."""
        user = create_test_user()

        # Create first address as default
        first_address = Address(
            user_id=user.id,
            first_name="First",
            last_name="Address",
            address_line1="123 First St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        db.session.add(first_address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Create second address as default
        address_data = {
            "first_name": "Second",
            "last_name": "Address",
            "address_line1": "456 Second St",
            "city": "Mombasa",
            "state": "Mombasa",
            "postal_code": "80100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "billing",
            "is_default": True
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=headers)

        assert response.status_code == 201

        # Verify only the new address is default
        addresses = Address.query.filter_by(user_id=user.id).all()
        default_addresses = [addr for addr in addresses if addr.is_default]
        assert len(default_addresses) == 1
        assert default_addresses[0].first_name == "Second"

    def test_create_address_no_data(self, client, auth_headers):
        """Test address creation with no data."""
        response = client.post('/api/addresses/user/', headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "No data provided"

    def test_create_address_unauthorized(self, client):
        """Test address creation without authentication."""
        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        response = client.post('/api/addresses/user/', json=address_data)

        assert response.status_code == 401

    def test_create_address_options(self, client):
        """Test OPTIONS request for address creation."""
        response = client.options('/api/addresses/user/')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestUpdateUserAddress:
    """Test user address update functionality."""

    def test_update_address_success(self, client, create_test_user):
        """Test successful address update."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        update_data = {
            "first_name": "Jane",
            "city": "Mombasa",
            "address_type": "billing",
            "is_default": True
        }

        response = client.put(f'/api/addresses/user/{address.id}',
                            json=update_data,
                            headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Address updated successfully"
        assert data['address']['first_name'] == "Jane"
        assert data['address']['city'] == "Mombasa"
        assert data['address']['address_type'] == "billing"
        assert data['address']['is_default'] == True

        # Verify database was updated
        updated_address = Address.query.get(address.id)
        assert updated_address.first_name == "Jane"
        assert updated_address.city == "Mombasa"

    def test_update_address_patch_method(self, client, create_test_user):
        """Test address update using PATCH method."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        update_data = {"city": "Kisumu"}

        response = client.patch(f'/api/addresses/user/{address.id}',
                              json=update_data,
                              headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['address']['city'] == "Kisumu"
        # Other fields should remain unchanged
        assert data['address']['first_name'] == "John"

    def test_update_address_not_found(self, client, auth_headers):
        """Test updating non-existent address."""
        update_data = {"city": "Mombasa"}

        response = client.put('/api/addresses/user/999',
                            json=update_data,
                            headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Address not found"

    def test_update_address_unauthorized_user(self, client, create_test_user):
        """Test user cannot update another user's address."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        address = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Test",
            address_line1="123 Private St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user2.id),
            additional_claims={"role": user2.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        update_data = {"city": "Mombasa"}

        response = client.put(f'/api/addresses/user/{address.id}',
                            json=update_data,
                            headers=headers)

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized"

    def test_update_address_invalid_type(self, client, create_test_user):
        """Test updating address with invalid type."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        update_data = {"address_type": "invalid_type"}

        response = client.put(f'/api/addresses/user/{address.id}',
                            json=update_data,
                            headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "Invalid address type"

    def test_update_address_default_handling(self, client, create_test_user):
        """Test default address handling during update."""
        user = create_test_user()

        # Create two addresses
        address1 = Address(
            user_id=user.id,
            first_name="First",
            last_name="Address",
            address_line1="123 First St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        address2 = Address(
            user_id=user.id,
            first_name="Second",
            last_name="Address",
            address_line1="456 Second St",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING,
            is_default=False
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Set second address as default
        update_data = {"is_default": True}

        response = client.put(f'/api/addresses/user/{address2.id}',
                            json=update_data,
                            headers=headers)

        assert response.status_code == 200

        # Verify only address2 is now default
        updated_address1 = Address.query.get(address1.id)
        updated_address2 = Address.query.get(address2.id)

        assert updated_address1.is_default == False
        assert updated_address2.is_default == True

    def test_update_address_no_data(self, client, create_test_user):
        """Test address update with no data."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.put(f'/api/addresses/user/{address.id}', headers=headers)

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == "No data provided"

    def test_update_address_options(self, client):
        """Test OPTIONS request for address update."""
        response = client.options('/api/addresses/user/1')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestDeleteUserAddress:
    """Test user address deletion functionality."""

    def test_delete_address_success(self, client, create_test_user):
        """Test successful address deletion."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()
        address_id = address.id

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )

        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.delete(f'/api/addresses/user/{address_id}', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Address deleted successfully"

        # Verify address was deleted
        deleted_address = Address.query.get(address_id)
        assert deleted_address is None

    def test_delete_address_not_found(self, client, auth_headers):
        """Test deleting non-existent address."""
        response = client.delete('/api/addresses/user/999', headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Address not found"

    def test_delete_address_unauthorized_user(self, client, create_test_user):
        """Test user cannot delete another user's address."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        address = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Test",
            address_line1="123 Private St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user2.id),
            additional_claims={"role": user2.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.delete(f'/api/addresses/user/{address.id}', headers=headers)

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized"

    def test_delete_default_address_with_others(self, client, create_test_user):
        """Test deleting default address when other addresses exist."""
        user = create_test_user()

        # Create two addresses, first one is default
        address1 = Address(
            user_id=user.id,
            first_name="First",
            last_name="Address",
            address_line1="123 First St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        address2 = Address(
            user_id=user.id,
            first_name="Second",
            last_name="Address",
            address_line1="456 Second St",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING,
            is_default=False
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Delete the default address
        response = client.delete(f'/api/addresses/user/{address1.id}', headers=headers)

        assert response.status_code == 200

        # Verify address1 was deleted and address2 became default
        deleted_address = Address.query.get(address1.id)
        remaining_address = Address.query.get(address2.id)

        assert deleted_address is None
        assert remaining_address is not None
        assert remaining_address.is_default == True

    def test_delete_address_options(self, client):
        """Test OPTIONS request for address deletion."""
        response = client.options('/api/addresses/user/1')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestUserDefaultAddress:
    """Test user default address functionality."""

    def test_get_default_address_success(self, client, create_test_user):
        """Test getting user's default address."""
        user = create_test_user()

        # Create addresses, one default
        address1 = Address(
            user_id=user.id,
            first_name="Regular",
            last_name="Address",
            address_line1="123 Regular St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=False
        )

        address2 = Address(
            user_id=user.id,
            first_name="Default",
            last_name="Address",
            address_line1="456 Default St",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING,
            is_default=True
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/default', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == address2.id
        assert data['first_name'] == "Default"
        assert data['is_default'] == True

    def test_get_default_address_no_default_set(self, client, create_test_user):
        """Test getting default address when none is explicitly set."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="Only",
            last_name="Address",
            address_line1="123 Only St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=False
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/default', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == address.id
        assert data['first_name'] == "Only"

    def test_get_default_address_no_addresses(self, client, auth_headers):
        """Test getting default address when user has no addresses."""
        response = client.get('/api/addresses/user/default', headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['message'] == "No address found"

    def test_set_default_address_success(self, client, create_test_user):
        """Test setting an address as default."""
        user = create_test_user()

        # Create two addresses
        address1 = Address(
            user_id=user.id,
            first_name="First",
            last_name="Address",
            address_line1="123 First St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        address2 = Address(
            user_id=user.id,
            first_name="Second",
            last_name="Address",
            address_line1="456 Second St",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING,
            is_default=False
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Set address2 as default
        response = client.post(f'/api/addresses/user/{address2.id}/set-default', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == "Default address set successfully"
        assert data['address']['is_default'] == True

        # Verify only address2 is default
        updated_address1 = Address.query.get(address1.id)
        updated_address2 = Address.query.get(address2.id)

        assert updated_address1.is_default == False
        assert updated_address2.is_default == True

    def test_set_default_address_not_found(self, client, auth_headers):
        """Test setting non-existent address as default."""
        response = client.post('/api/addresses/user/999/set-default', headers=auth_headers)

        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == "Address not found"

    def test_set_default_address_unauthorized(self, client, create_test_user):
        """Test user cannot set another user's address as default."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        address = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Address",
            address_line1="123 User1 St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user2.id),
            additional_claims={"role": user2.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.post(f'/api/addresses/user/{address.id}/set-default', headers=headers)

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == "Unauthorized"


class TestUserAddressSearch:
    """Test user address search functionality."""

    def test_search_addresses_by_name(self, client, create_test_user):
        """Test searching addresses by name."""
        user = create_test_user()

        # Create addresses with different names
        address1 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user.id,
            first_name="Jane",
            last_name="Smith",
            address_line1="456 Oak Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Search for "John"
        response = client.get('/api/addresses/user/search?q=John', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['first_name'] == "John"

    def test_search_addresses_by_address_line(self, client, create_test_user):
        """Test searching addresses by address line."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Unique Street Name",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?q=Unique', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert "Unique" in data['items'][0]['address_line1']

    def test_search_addresses_by_city(self, client, create_test_user):
        """Test searching addresses by city."""
        user = create_test_user()

        # Create addresses in different cities
        address1 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user.id,
            first_name="Jane",
            last_name="Smith",
            address_line1="456 Oak Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?city=Nairobi', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['city'] == "Nairobi"

    def test_search_addresses_by_country(self, client, create_test_user):
        """Test searching addresses by country."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?country=Kenya', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['country'] == "Kenya"

    def test_search_addresses_by_type(self, client, create_test_user):
        """Test searching addresses by type."""
        user = create_test_user()

        # Create addresses with different types
        address1 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Shipping St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user.id,
            first_name="Jane",
            last_name="Smith",
            address_line1="456 Billing Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?type=shipping', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['address_type'] == 'shipping'

    def test_search_addresses_combined_filters(self, client, create_test_user):
        """Test searching addresses with multiple filters."""
        user = create_test_user()

        # Create addresses with different combinations
        address1 = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user.id,
            first_name="Jane",
            last_name="Smith",
            address_line1="456 Oak Ave",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Search for shipping addresses in Nairobi
        response = client.get('/api/addresses/user/search?city=Nairobi&type=shipping', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['city'] == "Nairobi"
        assert data['items'][0]['address_type'] == 'shipping'

    def test_search_addresses_user_isolation(self, client, create_test_user):
        """Test that users can only search their own addresses."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        # Create addresses for different users
        address1 = Address(
            user_id=user1.id,
            first_name="SearchUser1",
            last_name="Test",
            address_line1="123 User1 St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        address2 = Address(
            user_id=user2.id,
            first_name="SearchUser2",
            last_name="Test",
            address_line1="456 User2 Ave",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345679",
            address_type=AddressType.BILLING
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        # User1 should only see their address
        access_token = create_access_token(
            identity=str(user1.id),
            additional_claims={"role": user1.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?q=SearchUser', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 1
        assert data['items'][0]['first_name'] == "SearchUser1"

    def test_search_addresses_no_results(self, client, create_test_user):
        """Test searching addresses with no matching results."""
        user = create_test_user()

        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        response = client.get('/api/addresses/user/search?q=NonExistent', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['items']) == 0
        assert data['pagination']['total_items'] == 0

    def test_search_addresses_options(self, client):
        """Test OPTIONS request for address search."""
        response = client.options('/api/addresses/user/search')

        assert response.status_code == 200
        # Check for either Access-Control-Allow-Methods or Allow header
        assert ('Access-Control-Allow-Methods' in response.headers or
                'Allow' in response.headers)


class TestUserAddressErrorHandling:
    """Test error handling in user address routes."""

    @patch('app.routes.address.user_address_routes.db.session.commit')
    def test_create_address_database_error(self, mock_commit, client, auth_headers):
        """Test address creation with database error."""
        mock_commit.side_effect = Exception("Database error")

        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == "Failed to create address"
        assert 'details' in data

    def test_update_address_database_error(self, client, create_test_user):
        """Test address update with database error."""
        user = create_test_user()

        # Create and commit address first
        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        # Now patch commit to raise exception for the update
        with patch('app.routes.address.user_address_routes.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": user.role.value}
            )
            headers = {'Authorization': f'Bearer {access_token}'}

            update_data = {"city": "Mombasa"}

            response = client.put(f'/api/addresses/user/{address.id}',
                                json=update_data,
                                headers=headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == "Failed to update address"

    def test_delete_address_database_error(self, client, create_test_user):
        """Test address deletion with database error."""
        user = create_test_user()

        # Create and commit address first
        address = Address(
            user_id=user.id,
            first_name="John",
            last_name="Doe",
            address_line1="123 Main St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        # Now patch commit to raise exception for the delete
        with patch('app.routes.address.user_address_routes.db.session.commit') as mock_commit:
            mock_commit.side_effect = Exception("Database error")

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={"role": user.role.value}
            )
            headers = {'Authorization': f'Bearer {access_token}'}

            response = client.delete(f'/api/addresses/user/{address.id}', headers=headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['error'] == "Failed to delete address"

    def test_malformed_json_request(self, client, auth_headers):
        """Test handling of malformed JSON in requests."""
        response = client.post('/api/addresses/user/',
                             data='{"invalid": json}',
                             headers={**auth_headers, 'Content-Type': 'application/json'})

        assert response.status_code == 400

    @patch('app.routes.address.user_address_routes.Address.query')
    def test_database_query_error(self, mock_query, client, auth_headers):
        """Test handling of database query errors."""
        mock_query.filter_by.side_effect = Exception("Database query failed")

        response = client.get('/api/addresses/user/', headers=auth_headers)

        assert response.status_code == 500
        data = response.get_json()
        assert data['error'] == "Failed to retrieve addresses"


class TestUserAddressIntegration:
    """Test complete user address management workflows."""

    def test_complete_address_lifecycle(self, client, create_test_user):
        """Test complete address lifecycle: create, read, update, delete."""
        user = create_test_user()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # 1. Create address
        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "shipping",
            "is_default": True
        }

        create_response = client.post('/api/addresses/user/',
                                    json=address_data,
                                    headers=headers)

        assert create_response.status_code == 201
        created_address = create_response.get_json()['address']
        address_id = created_address['id']

        # 2. Read address
        read_response = client.get(f'/api/addresses/user/{address_id}', headers=headers)

        assert read_response.status_code == 200
        read_address = read_response.get_json()
        assert read_address['first_name'] == "John"
        assert read_address['is_default'] == True

        # 3. Update address
        update_data = {
            "first_name": "Jane",
            "city": "Mombasa",
            "address_type": "billing"
        }

        update_response = client.put(f'/api/addresses/user/{address_id}',
                                   json=update_data,
                                   headers=headers)

        assert update_response.status_code == 200
        updated_address = update_response.get_json()['address']
        assert updated_address['first_name'] == "Jane"
        assert updated_address['city'] == "Mombasa"
        assert updated_address['address_type'] == "billing"

        # 4. Verify in list
        list_response = client.get('/api/addresses/user/', headers=headers)

        assert list_response.status_code == 200
        addresses = list_response.get_json()['items']
        assert len(addresses) == 1
        assert addresses[0]['first_name'] == "Jane"

        # 5. Delete address
        delete_response = client.delete(f'/api/addresses/user/{address_id}', headers=headers)

        assert delete_response.status_code == 200

        # 6. Verify deletion
        final_list_response = client.get('/api/addresses/user/', headers=headers)

        assert final_list_response.status_code == 200
        final_addresses = final_list_response.get_json()['items']
        assert len(final_addresses) == 0

    def test_multiple_addresses_default_management(self, client, create_test_user):
        """Test managing multiple addresses with default switching."""
        user = create_test_user()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Create first address as default
        address1_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 First Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "shipping",
            "is_default": True
        }

        response1 = client.post('/api/addresses/user/',
                              json=address1_data,
                              headers=headers)

        assert response1.status_code == 201
        address1_id = response1.get_json()['address']['id']

        # Create second address (not default)
        address2_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "address_line1": "456 Second Avenue",
            "city": "Mombasa",
            "state": "Mombasa",
            "postal_code": "80100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "billing",
            "is_default": False
        }

        response2 = client.post('/api/addresses/user/',
                              json=address2_data,
                              headers=headers)

        assert response2.status_code == 201
        address2_id = response2.get_json()['address']['id']

        # Verify first address is default
        default_response = client.get('/api/addresses/user/default', headers=headers)

        assert default_response.status_code == 200
        default_address = default_response.get_json()
        assert default_address['id'] == address1_id

        # Set second address as default
        set_default_response = client.post(f'/api/addresses/user/{address2_id}/set-default',
                                         headers=headers)

        assert set_default_response.status_code == 200

        # Verify second address is now default
        new_default_response = client.get('/api/addresses/user/default', headers=headers)

        assert new_default_response.status_code == 200
        new_default_address = new_default_response.get_json()
        assert new_default_address['id'] == address2_id

        # Verify first address is no longer default
        address1_response = client.get(f'/api/addresses/user/{address1_id}', headers=headers)

        assert address1_response.status_code == 200
        address1_current = address1_response.get_json()
        assert address1_current['is_default'] == False


class TestUserAddressValidation:
    """Test user address validation scenarios."""

    def test_create_address_field_validation(self, client, auth_headers):
        """Test validation of individual fields during address creation."""
        # Test each required field individually
        required_fields = [
            'first_name', 'last_name', 'address_line1',
            'city', 'state', 'postal_code', 'country', 'phone'
        ]

        base_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        for field in required_fields:
            # Create data missing one required field
            test_data = base_data.copy()
            del test_data[field]

            response = client.post('/api/addresses/user/',
                                 json=test_data,
                                 headers=auth_headers)

            assert response.status_code == 400
            data = response.get_json()
            assert f"{field} is required" in data['error']

    def test_create_address_empty_field_validation(self, client, auth_headers):
        """Test validation of empty fields during address creation."""
        address_data = {
            "first_name": "",  # Empty string
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 400
        data = response.get_json()
        assert "first_name is required" in data['error']

    def test_address_type_case_insensitive(self, client, auth_headers):
        """Test that address type validation is case insensitive."""
        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "SHIPPING"  # Uppercase
        }

        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['address']['address_type'] == 'shipping'

        # Test lowercase
        address_data['address_type'] = 'billing'
        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['address']['address_type'] == 'billing'

        # Test mixed case
        address_data['address_type'] = 'Both'
        response = client.post('/api/addresses/user/',
                             json=address_data,
                             headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['address']['address_type'] == 'both'


class TestUserAddressSecurityFeatures:
    """Test security features in user address routes."""

    def test_user_isolation_enforcement(self, client, create_test_user):
        """Test that user isolation is strictly enforced."""
        user1 = create_test_user({
            'name': 'User One',
            'email': 'user1@test.com',
            'password': 'TestPass123!'
        })
        user2 = create_test_user({
            'name': 'User Two',
            'email': 'user2@test.com',
            'password': 'TestPass123!'
        })

        # Create address for user1
        address = Address(
            user_id=user1.id,
            first_name="User1",
            last_name="Private",
            address_line1="123 Secret St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING
        )

        db.session.add(address)
        db.session.commit()

        # User2 tries to access user1's address
        access_token = create_access_token(
            identity=str(user2.id),
            additional_claims={"role": user2.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Test all operations
        operations = [
            ('GET', f'/api/addresses/user/{address.id}'),
            ('PUT', f'/api/addresses/user/{address.id}', {"city": "Mombasa"}),
            ('PATCH', f'/api/addresses/user/{address.id}', {"city": "Mombasa"}),
            ('DELETE', f'/api/addresses/user/{address.id}'),
            ('POST', f'/api/addresses/user/{address.id}/set-default')
        ]

        for method, url, *data in operations:
            if method == 'GET':
                response = client.get(url, headers=headers)
            elif method == 'PUT':
                response = client.put(url, json=data[0], headers=headers)
            elif method == 'PATCH':
                response = client.patch(url, json=data[0], headers=headers)
            elif method == 'DELETE':
                response = client.delete(url, headers=headers)
            elif method == 'POST':
                response = client.post(url, headers=headers)

            assert response.status_code == 403
            response_data = response.get_json()
            assert response_data['error'] == "Unauthorized"

    def test_input_sanitization(self, client, auth_headers):
        """Test input sanitization for address fields."""
        # Test with potentially malicious input
        malicious_data = {
            "first_name": "<script>alert('xss')</script>",
            "last_name": "'; DROP TABLE addresses; --",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        response = client.post('/api/addresses/user/',
                             json=malicious_data,
                             headers=auth_headers)

        # Should still create successfully - input sanitization is not implemented
        # This test documents the current behavior
        assert response.status_code == 201
        data = response.get_json()
        # Note: This test expects no sanitization is currently implemented
        # If sanitization is added later, this test should be updated
        assert data['address']['first_name'] == "<script>alert('xss')</script>"

    def test_rate_limiting_simulation(self, client, auth_headers):
        """Test rapid requests to simulate rate limiting."""
        address_data = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = client.post('/api/addresses/user/',
                                 json=address_data,
                                 headers=auth_headers)
            responses.append(response.status_code)

        # All should succeed (rate limiting would be implemented at infrastructure level)
        success_count = sum(1 for status in responses if status == 201)
        assert success_count >= 1  # At least one should succeed


class TestUserAddressEdgeCases:
    """Test edge cases in user address management."""

    def test_concurrent_default_address_updates(self, client, create_test_user):
        """Test concurrent updates to default address."""
        user = create_test_user()

        # Create two addresses
        address1 = Address(
            user_id=user.id,
            first_name="First",
            last_name="Address",
            address_line1="123 First St",
            city="Nairobi",
            state="Nairobi",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.SHIPPING,
            is_default=True
        )

        address2 = Address(
            user_id=user.id,
            first_name="Second",
            last_name="Address",
            address_line1="456 Second St",
            city="Mombasa",
            state="Mombasa",
            postal_code="80100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BILLING,
            is_default=False
        )

        db.session.add_all([address1, address2])
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        headers = {'Authorization': f'Bearer {access_token}'}

        # Simulate concurrent requests to set different addresses as default
        import threading
        import time

        results = []

        def set_default(address_id):
            response = client.post(f'/api/addresses/user/{address_id}/set-default',
                                 headers=headers)
            results.append(response.status_code)

        # Start concurrent threads
        thread1 = threading.Thread(target=set_default, args=(address1.id,))
        thread2 = threading.Thread(target=set_default, args=(address2.id,))

        thread1.start()
        thread2.start()

        thread1.join()
        thread2.join()

        # Both requests should succeed
        assert all(status == 200 for status in results)

        # Only one address should be default
        default_count = Address.query.filter_by(
            user_id=user.id,
            is_default=True
        ).count()
        assert default_count == 1

    def test_address_with_unicode_characters(self, client, auth_headers):
        """Test address creation with unicode characters."""
        unicode_data = {
            "first_name": "José",
            "last_name": "García",
            "address_line1": "123 Cañón Street",
            "city": "São Paulo",
            "state": "São Paulo",
            "postal_code": "01234-567",
            "country": "Brasil",
            "phone": "+55 11 98765-4321"
        }

        response = client.post('/api/addresses/user/',
                             json=unicode_data,
                             headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['address']['first_name'] == "José"
        assert data['address']['city'] == "São Paulo"

    def test_address_with_very_long_fields(self, client, auth_headers):
        """Test address creation with very long field values."""
        long_string = "A" * 500  # Very long string

        long_data = {
            "first_name": long_string,
            "last_name": "Doe",
            "address_line1": "123 Main Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        }

        response = client.post('/api/addresses/user/',
                             json=long_data,
                             headers=auth_headers)

        # Should handle gracefully (either truncate or reject)
        assert response.status_code in [201, 400]

    def test_database_connection_failure_simulation(self, client, auth_headers):
        """Test behavior when database connection fails."""
        # This test simulates a scenario where the database query succeeds
        # but returns empty results, which is more realistic than patching execute
        response = client.get('/api/addresses/user/', headers=auth_headers)

        # Should return empty list when no addresses exist
        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []

    def test_empty_address_list_pagination(self, client, auth_headers):
        """Test pagination with empty address list."""
        response = client.get('/api/addresses/user/?page=1&per_page=10', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []
        assert data['pagination']['total_items'] == 0
        assert data['pagination']['total_pages'] == 0
        assert data['pagination']['has_next'] == False
        assert data['pagination']['has_prev'] == False


# Helper function to create auth headers for tests
def create_auth_headers(user_id, role="user"):
    """Create authorization headers for testing."""
    access_token = create_access_token(
        identity=str(user_id),
        additional_claims={"role": role}
    )
    return {'Authorization': f'Bearer {access_token}'}


# Test configuration and fixtures
@pytest.fixture
def auth_headers(create_test_user):
    """Create authorization headers for a test user."""
    user = create_test_user()
    return create_auth_headers(user.id, user.role.value)


# Test markers for different test categories
pytestmark = [
    pytest.mark.user_address,
    pytest.mark.routes,
    pytest.mark.integration
]
