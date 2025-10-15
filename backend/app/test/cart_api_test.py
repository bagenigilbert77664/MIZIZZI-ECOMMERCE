"""
Cart API Test Script

This script tests the cart API endpoints and cart validation functionality
for the Mizizzi E-commerce platform.

Usage:
    python -m backend.tests.cart_api_test

Requirements:
    - requests
    - python-dotenv
"""

import requests
import json
import os
import sys
import time
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api")
TEST_USER = {
    "identifier": os.getenv("TEST_USER_EMAIL", "juniorg47@gmail.com"),
    "password": os.getenv("TEST_USER_PASSWORD", "junior2020")
}

# Store auth token and test data
auth_token = None
test_cart = None
test_cart_item = None
test_product = None
test_address = None
test_shipping_method = None
test_payment_method = None

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.ENDC}")

def print_success(message):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}⚠ {message}{Colors.WARNING}")

def print_error(message):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.OKBLUE}ℹ {message}{Colors.ENDC}")

def get_auth_token():
    """Log in and get authentication token."""
    print_header("Logging in test user")
    print_info(f"Attempting to login at: {API_BASE_URL}/auth/login")

    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json=TEST_USER,
            headers={"Content-Type": "application/json"}
        )

        response.raise_for_status()
        token = response.json().get("access_token")

        if token:
            print_success("Login successful!")
            return token
        else:
            print_error("No token received in response")
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print_error(f"Login failed: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print_error(f"Response status: {e.response.status_code}")
            print_error(f"Response data: {e.response.text}")
        sys.exit(1)

def get_test_product():
    """Fetch a test product to use in cart tests."""
    print_header("Fetching a test product")

    try:
        response = requests.get(
            f"{API_BASE_URL}/products",
            params={"per_page": 1},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        if data.get("items") and len(data["items"]) > 0:
            product = data["items"][0]
            print_success(f"Found test product: {product['name']} (ID: {product['id']})")
            return product
        else:
            print_error("No products found in database")
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to fetch test product: {str(e)}")
        sys.exit(1)

def get_test_address():
    """Get or create a test address."""
    print_header("Fetching a test address")

    try:
        response = requests.get(
            f"{API_BASE_URL}/addresses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        if data.get("items") and len(data["items"]) > 0:
            address = data["items"][0]
            print_success(f"Found test address: {address['address_line1']}, {address['city']}")

            # Check if address type is suitable for both shipping and billing
            if address.get("address_type") != "BOTH":
                print_warning("Existing address has incorrect type. Creating a new one...")
                return create_test_address()

            return address
        else:
            print_warning("No address found, creating a new one...")
            return create_test_address()
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to get test address: {str(e)}")
        print_warning("Creating a new test address...")
        return create_test_address()

def create_test_address():
    """Create a new test address."""
    print_info("Creating new test address with type BOTH...")

    try:
        new_address = {
            "first_name": "Test",
            "last_name": "User",
            "address_line1": "123 Test St",
            "city": "Nairobi",
            "state": "Nairobi County",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678",
            "address_type": "BOTH",
            "is_default": True
        }

        response = requests.post(
            f"{API_BASE_URL}/addresses",
            json=new_address,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        address = response.json().get("address")

        if address:
            print_success(f"Created new test address: {address['id']}")
            return address
        else:
            print_error("Failed to create address - no address in response")
            return None
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to create test address: {str(e)}")
        return None

def get_test_shipping_method():
    """Get a test shipping method."""
    print_header("Fetching test shipping method")

    # First make sure we have a shipping address set
    if test_address:
        try:
            address_data = {"address_id": test_address["id"]}
            response = requests.post(
                f"{API_BASE_URL}/cart/shipping-address",
                json=address_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {auth_token}"
                }
            )

            if response.status_code == 200:
                print_success("Set shipping address to enable shipping methods")
            else:
                print_warning(f"Could not set shipping address: {response.status_code} {response.reason}")
        except requests.exceptions.RequestException as e:
            print_warning(f"Could not set shipping address: {str(e)}")

    # Now try to get shipping methods
    try:
        response = requests.get(
            f"{API_BASE_URL}/cart/shipping-methods",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        if data.get("shipping_methods") and len(data["shipping_methods"]) > 0:
            shipping_method = data["shipping_methods"][0]
            print_success(f"Found test shipping method: {shipping_method['name']}")
            return shipping_method
        else:
            print_warning("No shipping methods found, will skip shipping method tests")
            return None
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to fetch shipping methods: {str(e)}")
        print_warning("Will skip shipping method tests")
        return None

def get_test_payment_method():
    """Get a test payment method."""
    print_header("Fetching test payment method")

    try:
        response = requests.get(
            f"{API_BASE_URL}/cart/payment-methods",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        if data.get("payment_methods") and len(data["payment_methods"]) > 0:
            payment_method = data["payment_methods"][0]
            print_success(f"Found test payment method: {payment_method['name']}")
            return payment_method
        else:
            print_warning("No payment methods found, will skip payment method tests")
            return None
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to fetch payment methods: {str(e)}")
        print_warning("Will skip payment method tests")
        return None

def test_get_cart():
    """Test getting the current cart."""
    print_header("TEST: Getting current cart")

    try:
        response = requests.get(
            f"{API_BASE_URL}/cart",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert "cart" in data, "Expected cart object to be returned"

        print_success(f"Got cart successfully! Cart ID: {data['cart']['id']}")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Get cart test failed: {str(e)}")
        raise

def test_add_to_cart():
    """Test adding an item to the cart."""
    print_header("TEST: Adding item to cart")

    try:
        # Try to clear the cart first to avoid stock issues
        try:
            requests.delete(
                f"{API_BASE_URL}/cart/clear",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            print_info("Cleared cart to start fresh")
        except requests.exceptions.RequestException as e:
            print_warning(f"Could not clear cart: {str(e)}")

        # Add the item
        cart_item = {
            "product_id": test_product["id"],
            "quantity": 1
        }

        print_info(f"Adding item to cart: {cart_item}")

        response = requests.post(
            f"{API_BASE_URL}/cart/add",
            json=cart_item,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["items"] and len(data["items"]) > 0, "Expected items array to contain at least one item"

        # Find the added item
        added_item = next((item for item in data["items"] if item["product_id"] == test_product["id"]), None)
        assert added_item is not None, "Expected to find the added item in response"

        print_success(f"Added item to cart successfully! Item ID: {added_item['id']}")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Add to cart test failed: {str(e)}")

        # Try to get the current cart to continue tests
        try:
            cart_response = requests.get(
                f"{API_BASE_URL}/cart",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            cart_data = cart_response.json()
            existing_item = next((item for item in cart_data.get("items", []) if item["product_id"] == test_product["id"]), None)

            if existing_item:
                print_info(f"Found existing item in cart, will use for further tests: ID {existing_item['id']}")
                return cart_data
        except requests.exceptions.RequestException as cart_error:
            print_error(f"Could not get current cart: {str(cart_error)}")

        raise

def test_update_cart_item(item_id, new_quantity):
    """Test updating a cart item quantity."""
    print_header(f"TEST: Updating cart item quantity to {new_quantity}")

    try:
        update_data = {"quantity": new_quantity}

        response = requests.put(
            f"{API_BASE_URL}/cart/update/{item_id}",
            json=update_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"

        # Find the updated item
        updated_item = next((item for item in data["items"] if item["id"] == item_id), None)
        assert updated_item is not None, "Expected to find the updated item in response"
        assert updated_item["quantity"] == new_quantity, f"Expected quantity to be updated to {new_quantity}"

        print_success("Updated cart item quantity successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Update cart item test failed: {str(e)}")
        raise

def test_validate_cart():
    """Test validating the cart."""
    print_header("TEST: Validating cart")

    try:
        response = requests.get(
            f"{API_BASE_URL}/cart/validate",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"

        is_valid = data.get("is_valid", False)
        print_success(f"Cart validation status: {'Valid' if is_valid else 'Invalid'}")

        if not is_valid:
            print_warning(f"Validation errors: {json.dumps(data.get('errors', []), indent=2)}")

        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Validate cart test failed: {str(e)}")
        raise

def test_apply_coupon(coupon_code="TESTCODE"):
    """Test applying a coupon to the cart."""
    print_header(f"TEST: Applying coupon {coupon_code} to cart")

    try:
        coupon_data = {"coupon_code": coupon_code}

        response = requests.post(
            f"{API_BASE_URL}/cart/apply-coupon",
            json=coupon_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True, "Expected success to be true"
            print_success("Applied coupon successfully!")
            return data
        else:
            print_warning(f"Coupon not applied (may not exist or be invalid): {response.status_code} {response.reason}")
            return None
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_warning(f"Coupon application failed (expected if coupon is invalid): {str(e)}")
        return None

def test_remove_coupon():
    """Test removing a coupon from the cart."""
    print_header("TEST: Removing coupon from cart")

    try:
        response = requests.delete(
            f"{API_BASE_URL}/cart/remove-coupon",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"

        print_success("Removed coupon successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Remove coupon test failed: {str(e)}")
        raise

def test_set_shipping_address(address_id):
    """Test setting the shipping address."""
    print_header("TEST: Setting shipping address")

    try:
        address_data = {"address_id": address_id}

        response = requests.post(
            f"{API_BASE_URL}/cart/shipping-address",
            json=address_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["cart"]["shipping_address_id"] == address_id, "Expected shipping address to be set correctly"

        print_success("Set shipping address successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set shipping address test failed: {str(e)}")
        raise

def test_set_billing_address(address_id):
    """Test setting the billing address."""
    print_header("TEST: Setting billing address")

    try:
        # Test same as shipping first
        same_as_shipping_data = {"same_as_shipping": True}

        response1 = requests.post(
            f"{API_BASE_URL}/cart/billing-address",
            json=same_as_shipping_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response1.raise_for_status()
        data1 = response1.json()

        assert data1["success"] == True, "Expected success to be true"
        assert data1["cart"]["same_as_shipping"] == True, "Expected same_as_shipping to be true"

        print_success("Set billing address (same as shipping) successfully!")

        # Now test with different address
        different_address_data = {
            "same_as_shipping": False,
            "address_id": address_id
        }

        response2 = requests.post(
            f"{API_BASE_URL}/cart/billing-address",
            json=different_address_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response2.raise_for_status()
        data2 = response2.json()

        assert data2["success"] == True, "Expected success to be true"
        assert data2["cart"]["same_as_shipping"] == False, "Expected same_as_shipping to be false"

        print_success("Set billing address (different from shipping) successfully!")
        return data2
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set billing address test failed: {str(e)}")
        raise

def test_set_shipping_method(shipping_method_id):
    """Test setting the shipping method."""
    print_header("TEST: Setting shipping method")

    try:
        shipping_data = {"shipping_method_id": shipping_method_id}

        response = requests.post(
            f"{API_BASE_URL}/cart/shipping-method",
            json=shipping_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["cart"]["shipping_method_id"] == shipping_method_id, "Expected shipping method to be set correctly"

        print_success("Set shipping method successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set shipping method test failed: {str(e)}")
        raise

def test_set_payment_method(payment_method_id):
    """Test setting the payment method."""
    print_header("TEST: Setting payment method")

    try:
        payment_data = {"payment_method_id": payment_method_id}

        response = requests.post(
            f"{API_BASE_URL}/cart/payment-method",
            json=payment_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["cart"]["payment_method_id"] == payment_method_id, "Expected payment method to be set correctly"

        print_success("Set payment method successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set payment method test failed: {str(e)}")
        raise

def test_validate_checkout():
    """Test validating the cart for checkout."""
    print_header("TEST: Validating cart for checkout")

    try:
        response = requests.get(
            f"{API_BASE_URL}/cart/checkout/validate",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"

        is_valid = data.get("is_valid", False)
        print_success(f"Checkout validation status: {'Valid' if is_valid else 'Invalid'}")

        if not is_valid:
            print_warning(f"Validation errors: {json.dumps(data.get('errors', []), indent=2)}")

        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Validate checkout test failed: {str(e)}")
        raise

def test_get_cart_summary():
    """Test getting the cart summary."""
    print_header("TEST: Getting cart summary")

    try:
        response = requests.get(
            f"{API_BASE_URL}/cart/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert "item_count" in data, "Expected item_count in response"
        assert "total" in data, "Expected total in response"
        assert "has_items" in data, "Expected has_items in response"

        print_success(f"Got cart summary successfully! Items: {data['item_count']}, Total: {data['total']}")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Get cart summary test failed: {str(e)}")
        raise

def test_set_cart_notes():
    """Test setting cart notes."""
    print_header("TEST: Setting cart notes")

    try:
        notes_data = {"notes": "Please deliver after 5 PM. Ring the doorbell twice."}

        response = requests.post(
            f"{API_BASE_URL}/cart/notes",
            json=notes_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["cart"]["notes"] == notes_data["notes"], "Expected notes to be set correctly"

        print_success("Set cart notes successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set cart notes test failed: {str(e)}")
        raise

def test_set_requires_shipping():
    """Test setting the requires shipping flag."""
    print_header("TEST: Setting requires shipping flag")

    try:
        shipping_data = {"requires_shipping": True}

        response = requests.post(
            f"{API_BASE_URL}/cart/requires-shipping",
            json=shipping_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert data["cart"]["requires_shipping"] == True, "Expected requires_shipping to be true"

        print_success("Set requires shipping flag successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Set requires shipping flag test failed: {str(e)}")
        raise

def test_remove_from_cart(item_id):
    """Test removing an item from the cart."""
    print_header("TEST: Removing item from cart")

    try:
        response = requests.delete(
            f"{API_BASE_URL}/cart/remove/{item_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert not any(item["id"] == item_id for item in data["items"]), "Expected item to be removed from cart"

        print_success("Removed item from cart successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Remove from cart test failed: {str(e)}")
        raise

def test_clear_cart():
    """Test clearing the cart."""
    print_header("TEST: Clearing cart")

    try:
        # First add an item to make sure there's something to clear
        try:
            test_add_to_cart()
        except Exception as e:
            print_warning(f"Could not add item before clearing cart: {str(e)}")

        response = requests.delete(
            f"{API_BASE_URL}/cart/clear",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        response.raise_for_status()
        data = response.json()

        assert data["success"] == True, "Expected success to be true"
        assert len(data["items"]) == 0, "Expected cart to be empty"

        print_success("Cleared cart successfully!")
        return data
    except (requests.exceptions.RequestException, AssertionError) as e:
        print_error(f"Clear cart test failed: {str(e)}")
        raise

def run_tests():
    """Run all cart API tests."""
    global auth_token, test_cart, test_cart_item, test_product, test_address, test_shipping_method, test_payment_method

    print_header("Starting Cart API tests")
    tests_failed = False

    try:
        # Setup
        auth_token = get_auth_token()
        test_product = get_test_product()
        test_address = get_test_address()

        # Basic cart operations
        cart_data = test_get_cart()
        test_cart = cart_data["cart"]

        try:
            add_data = test_add_to_cart()
            test_cart_item = next((item for item in add_data["items"] if item["product_id"] == test_product["id"]), None)
        except Exception as e:
            print_error("Add to cart test failed, but continuing with other tests")
            tests_failed = True

        # Only run these tests if we have a cart item
        if test_cart_item:
            try:
                test_update_cart_item(test_cart_item["id"], test_cart_item["quantity"] + 1)
            except Exception as e:
                print_error("Update cart item test failed, but continuing with other tests")
                tests_failed = True
        else:
            print_warning("Skipping update cart item test (no test cart item available)")

        try:
            test_validate_cart()
        except Exception as e:
            print_error("Validate cart test failed, but continuing with other tests")
            tests_failed = True

        try:
            test_get_cart_summary()
        except Exception as e:
            print_error("Get cart summary test failed, but continuing with other tests")
            tests_failed = True

        # Get shipping and payment methods after setting address
        test_shipping_method = get_test_shipping_method()
        test_payment_method = get_test_payment_method()

        # Cart features - run these tests even if earlier tests failed
        try:
            test_apply_coupon()
        except Exception as e:
            print_warning("Apply coupon test failed (expected if no valid coupons)")

        try:
            test_remove_coupon()
        except Exception as e:
            print_warning("Remove coupon test failed (expected if no coupon was applied)")

        if test_address:
            try:
                test_set_shipping_address(test_address["id"])
            except Exception as e:
                print_error("Set shipping address test failed, but continuing with other tests")
                tests_failed = True

            try:
                test_set_billing_address(test_address["id"])
            except Exception as e:
                print_error("Set billing address test failed, but continuing with other tests")
                tests_failed = True
        else:
            print_warning("Skipping address tests (no test address available)")

        if test_shipping_method:
            try:
                test_set_shipping_method(test_shipping_method["id"])
            except Exception as e:
                print_warning("Set shipping method test failed")
                tests_failed = True
        else:
            print_warning("Skipping shipping method test (no test shipping method available)")

        if test_payment_method:
            try:
                test_set_payment_method(test_payment_method["id"])
            except Exception as e:
                print_warning("Set payment method test failed")
                tests_failed = True
        else:
            print_warning("Skipping payment method test (no test payment method available)")

        try:
            test_set_cart_notes()
        except Exception as e:
            print_error("Set cart notes test failed, but continuing with other tests")
            tests_failed = True

        try:
            test_set_requires_shipping()
        except Exception as e:
            print_error("Set requires shipping flag test failed, but continuing with other tests")
            tests_failed = True

        try:
            test_validate_checkout()
        except Exception as e:
            print_error("Validate checkout test failed, but continuing with other tests")
            tests_failed = True

        # Cleanup - only run if we have a cart item
        if test_cart_item:
            try:
                test_remove_from_cart(test_cart_item["id"])
            except Exception as e:
                print_error("Remove from cart test failed, but continuing with other tests")
                tests_failed = True
        else:
            print_warning("Skipping remove from cart test (no test cart item available)")

        try:
            test_clear_cart()
        except Exception as e:
            print_error("Clear cart test failed")
            tests_failed = True

        if tests_failed:
            print_warning("Some tests failed, but the script completed")
        else:
            print_success("All tests completed successfully!")
    except Exception as e:
        print_error(f"Tests failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
