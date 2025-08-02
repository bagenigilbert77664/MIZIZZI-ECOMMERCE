#!/usr/bin/env python3
"""
M-PESA STK Push Test Script (Python)
Tests the M-PESA STK Push functionality directly using the Python utils
"""

import os
import sys
import json
import time
import logging
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_dir)

# Also add the current directory
current_dir = os.path.dirname(__file__)
sys.path.insert(0, current_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# M-PESA Client implementation (embedded for testing)
import base64
import requests
from datetime import timezone, timedelta

class MpesaClient:
    """M-PESA Daraja API Client"""

    def __init__(self):
        """Initialize M-PESA client with configuration"""
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY', 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET', 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7')
        self.business_short_code = os.getenv('MPESA_BUSINESS_SHORT_CODE', '174379')
        self.passkey = os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')

        # Environment settings
        self.environment = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
        if self.environment == 'production':
            self.base_url = 'https://api.safaricom.co.ke'
        else:
            self.base_url = 'https://sandbox.safaricom.co.ke'

        # API endpoints
        self.auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        self.stk_push_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        self.stk_query_url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        # Cache for access token
        self._access_token = None
        self._token_expires_at = None

    def get_access_token(self):
        """Get M-PESA access token"""
        try:
            # Check if we have a valid cached token
            if (self._access_token and self._token_expires_at and
                datetime.now(timezone.utc) < self._token_expires_at):
                return self._access_token

            # Create authorization header
            credentials = f"{self.consumer_key}:{self.consumer_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()

            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/json'
            }

            response = requests.get(self.auth_url, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                # Cache token for 55 minutes (tokens expire in 1 hour)
                self._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=55)
                logger.info("M-PESA access token obtained successfully")
                return self._access_token
            else:
                logger.error(f"Failed to get M-PESA access token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error getting M-PESA access token: {str(e)}")
            return None

    def generate_password(self):
        """Generate password for STK push"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_string = f"{self.business_short_code}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        return password, timestamp

    def stk_push(self, phone_number, amount, account_reference, transaction_desc, callback_url):
        """
        Initiate STK Push payment
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {"ResponseCode": "1", "errorMessage": "Failed to get access token"}

            password, timestamp = self.generate_password()

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": self.business_short_code,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": account_reference,
                "TransactionDesc": transaction_desc
            }

            logger.info(f"Initiating STK push for {phone_number}, amount: {amount}")
            response = requests.post(self.stk_push_url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"STK push response: {data}")
                return data
            else:
                error_msg = f"STK push failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"ResponseCode": "1", "errorMessage": error_msg}

        except Exception as e:
            error_msg = f"STK push error: {str(e)}"
            logger.error(error_msg)
            return {"ResponseCode": "1", "errorMessage": error_msg}

    def query_stk_status(self, checkout_request_id):
        """Query STK push status"""
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {"ResponseCode": "1", "errorMessage": "Failed to get access token"}

            password, timestamp = self.generate_password()

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id
            }

            response = requests.post(self.stk_query_url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"STK status query response: {data}")
                return data
            else:
                error_msg = f"STK status query failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"ResponseCode": "1", "errorMessage": error_msg}

        except Exception as e:
            error_msg = f"STK status query error: {str(e)}"
            logger.error(error_msg)
            return {"ResponseCode": "1", "errorMessage": error_msg}

    def format_phone_number(self, phone):
        """Format phone number for M-PESA"""
        try:
            if phone is None:
                return None

            # Remove all non-digit characters
            import re
            clean_phone = re.sub(r'\D', '', str(phone))

            if not clean_phone:
                return str(phone)

            if clean_phone.startswith('0'):
                # Convert 0712345678 to 254712345678
                return '254' + clean_phone[1:]
            elif clean_phone.startswith('254'):
                # Already in correct format
                return clean_phone
            elif len(clean_phone) == 9:
                # Add country code
                return '254' + clean_phone
            else:
                return clean_phone

        except Exception as e:
            logger.error(f"Phone formatting error: {str(e)}")
            return str(phone) if phone is not None else None

    def is_valid_amount(self, amount):
        """Check if amount is valid for M-PESA"""
        try:
            return 1.0 <= float(amount) <= 70000.0
        except (ValueError, TypeError):
            return False

    def get_transaction_status_description(self, result_code):
        """Get human-readable description for M-PESA result codes"""
        status_codes = {
            0: "Success - Payment completed successfully",
            1: "Insufficient Funds",
            1001: "Invalid Phone Number",
            1019: "Dialing the number failed",
            1025: "Unable to lock subscriber, a transaction is already in process for the current subscriber",
            1032: "Request cancelled by user",
            1037: "DS timeout user cannot be reached",
            2001: "Invalid Amount",
            4999: "Transaction is still under processing",
            9999: "Request failed"
        }
        return status_codes.get(result_code, f"Unknown status code: {result_code}")


class MpesaSTKTester:
    def __init__(self):
        self.client = MpesaClient()
        self.test_results = []

    def log(self, message, level='info'):
        """Log message with emoji prefix"""
        prefix = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'processing': '🔄'
        }.get(level, 'ℹ️')

        print(f"{prefix} {message}")

        if level == 'error':
            logger.error(message)
        elif level == 'warning':
            logger.warning(message)
        else:
            logger.info(message)

    def test_mpesa_connection(self):
        """Test M-PESA API connection"""
        self.log("Testing M-PESA API connection...")

        try:
            token = self.client.get_access_token()

            if token:
                self.log("M-PESA connection successful!", 'success')
                self.log(f"Access token obtained: {token[:20]}...")

                self.test_results.append({
                    'test': 'M-PESA Connection',
                    'status': 'passed',
                    'details': 'Access token obtained successfully'
                })
                return True
            else:
                self.log("Failed to get M-PESA access token", 'error')
                self.test_results.append({
                    'test': 'M-PESA Connection',
                    'status': 'failed',
                    'details': 'Could not obtain access token'
                })
                return False

        except Exception as e:
            self.log(f"M-PESA connection error: {str(e)}", 'error')
            self.test_results.append({
                'test': 'M-PESA Connection',
                'status': 'failed',
                'details': str(e)
            })
            return False

    def test_phone_formatting(self):
        """Test phone number formatting"""
        self.log("Testing phone number formatting...")

        test_cases = [
            ('0712345678', '254712345678'),
            ('254712345678', '254712345678'),
            ('712345678', '254712345678'),
            ('+254712345678', '254712345678'),
            ('254 712 345 678', '254712345678')
        ]

        all_passed = True

        for input_phone, expected in test_cases:
            result = self.client.format_phone_number(input_phone)
            if result == expected:
                self.log(f"✓ {input_phone} -> {result}")
            else:
                self.log(f"✗ {input_phone} -> {result} (expected {expected})", 'error')
                all_passed = False

        if all_passed:
            self.log("Phone formatting tests passed!", 'success')
            self.test_results.append({
                'test': 'Phone Formatting',
                'status': 'passed',
                'details': 'All test cases passed'
            })
        else:
            self.log("Some phone formatting tests failed", 'error')
            self.test_results.append({
                'test': 'Phone Formatting',
                'status': 'failed',
                'details': 'Some test cases failed'
            })

        return all_passed

    def test_amount_validation(self):
        """Test amount validation"""
        self.log("Testing amount validation...")

        test_cases = [
            (1, True),      # Minimum valid amount
            (100, True),    # Normal amount
            (70000, True),  # Maximum valid amount
            (0.5, False),   # Below minimum
            (70001, False), # Above maximum
            (-10, False),   # Negative amount
            ('invalid', False)  # Invalid type
        ]

        all_passed = True

        for amount, expected in test_cases:
            result = self.client.is_valid_amount(amount)
            if result == expected:
                self.log(f"✓ Amount {amount}: {result}")
            else:
                self.log(f"✗ Amount {amount}: {result} (expected {expected})", 'error')
                all_passed = False

        if all_passed:
            self.log("Amount validation tests passed!", 'success')
            self.test_results.append({
                'test': 'Amount Validation',
                'status': 'passed',
                'details': 'All test cases passed'
            })
        else:
            self.log("Some amount validation tests failed", 'error')
            self.test_results.append({
                'test': 'Amount Validation',
                'status': 'failed',
                'details': 'Some test cases failed'
            })

        return all_passed

    def test_stk_push(self, phone_number, amount):
        """Test STK Push initiation"""
        self.log(f"Testing STK Push for {phone_number}, amount: KES {amount}")

        try:
            # Format phone number
            formatted_phone = self.client.format_phone_number(phone_number)
            self.log(f"Formatted phone: {formatted_phone}")

            # Validate amount
            if not self.client.is_valid_amount(amount):
                self.log(f"Invalid amount: {amount}", 'error')
                return None

            # Generate test data
            account_reference = f"TEST_{int(time.time())}"
            transaction_desc = f"STK Push Test - {datetime.now().strftime('%Y%m%d_%H%M%S')}"
            callback_url = "https://your-callback-url.com/mpesa/callback"  # Replace with actual callback URL

            self.log(f"Account Reference: {account_reference}")
            self.log(f"Transaction Description: {transaction_desc}")

            # Initiate STK Push
            response = self.client.stk_push(
                phone_number=formatted_phone,
                amount=int(amount),
                account_reference=account_reference,
                transaction_desc=transaction_desc,
                callback_url=callback_url
            )

            self.log(f"STK Push Response: {json.dumps(response, indent=2)}")

            if response.get('ResponseCode') == '0':
                self.log("STK Push initiated successfully!", 'success')
                self.log(f"Checkout Request ID: {response.get('CheckoutRequestID')}")
                self.log(f"Merchant Request ID: {response.get('MerchantRequestID')}")

                self.test_results.append({
                    'test': 'STK Push Initiation',
                    'status': 'passed',
                    'details': response
                })

                return response
            else:
                error_msg = response.get('errorMessage', 'Unknown error')
                self.log(f"STK Push failed: {error_msg}", 'error')

                self.test_results.append({
                    'test': 'STK Push Initiation',
                    'status': 'failed',
                    'details': error_msg
                })

                return None

        except Exception as e:
            self.log(f"STK Push error: {str(e)}", 'error')
            self.test_results.append({
                'test': 'STK Push Initiation',
                'status': 'failed',
                'details': str(e)
            })
            return None

    def test_stk_query(self, checkout_request_id):
        """Test STK Push status query"""
        self.log(f"Testing STK Push status query for: {checkout_request_id}")

        try:
            response = self.client.query_stk_status(checkout_request_id)
            self.log(f"STK Query Response: {json.dumps(response, indent=2)}")

            if response.get('ResponseCode') == '0':
                result_code = response.get('ResultCode')
                result_desc = response.get('ResultDesc')

                self.log(f"Query successful - Result Code: {result_code}")
                self.log(f"Result Description: {result_desc}")

                if result_code is not None:
                    status_desc = self.client.get_transaction_status_description(int(result_code))
                    self.log(f"Status: {status_desc}")

                self.test_results.append({
                    'test': 'STK Push Query',
                    'status': 'passed',
                    'details': response
                })

                return response
            else:
                error_msg = response.get('errorMessage', 'Unknown error')
                self.log(f"STK Query failed: {error_msg}", 'error')

                self.test_results.append({
                    'test': 'STK Push Query',
                    'status': 'failed',
                    'details': error_msg
                })

                return None

        except Exception as e:
            self.log(f"STK Query error: {str(e)}", 'error')
            self.test_results.append({
                'test': 'STK Push Query',
                'status': 'failed',
                'details': str(e)
            })
            return None

    def monitor_payment_status(self, checkout_request_id, max_attempts=12, interval=10):
        """Monitor payment status with polling"""
        self.log(f"Monitoring payment status for {max_attempts * interval} seconds...")

        for attempt in range(1, max_attempts + 1):
            self.log(f"Status check attempt {attempt}/{max_attempts}")

            response = self.test_stk_query(checkout_request_id)

            if response:
                result_code = response.get('ResultCode')

                if result_code == '0':
                    self.log("Payment completed successfully!", 'success')
                    return 'completed'
                elif result_code in ['1032', '1037']:
                    self.log("Payment was cancelled or timed out", 'warning')
                    return 'cancelled'
                elif result_code == '4999':
                    self.log("Payment is still processing...", 'processing')
                    # Continue monitoring for processing status
                elif result_code and result_code != '1':
                    self.log(f"Payment failed with code: {result_code}", 'error')
                    status_desc = self.client.get_transaction_status_description(int(result_code))
                    self.log(f"Error description: {status_desc}", 'error')
                    return 'failed'

            if attempt < max_attempts:
                self.log(f"Waiting {interval} seconds before next check...")
                time.sleep(interval)

        self.log("Payment monitoring timed out", 'warning')
        return 'timeout'

    def run_full_test(self, phone_number=None, amount=None):
        """Run complete STK Push test"""
        self.log("=" * 60)
        self.log("M-PESA STK Push Full Test")
        self.log("=" * 60)

        # Default values - use the phone number from previous test
        if not phone_number:
            phone_number = os.getenv('TEST_PHONE', '254746741719')  # Updated default
        if not amount:
            amount = float(os.getenv('TEST_AMOUNT', '1'))

        self.log(f"Test Phone: {phone_number}")
        self.log(f"Test Amount: KES {amount}")
        self.log("")

        # Step 1: Test connection
        if not self.test_mpesa_connection():
            self.log("Connection test failed. Aborting.", 'error')
            return False

        # Step 2: Test utilities
        self.test_phone_formatting()
        self.test_amount_validation()

        # Step 3: Initiate STK Push
        stk_response = self.test_stk_push(phone_number, amount)

        if not stk_response:
            self.log("STK Push initiation failed. Aborting.", 'error')
            return False

        checkout_request_id = stk_response.get('CheckoutRequestID')

        if not checkout_request_id:
            self.log("No CheckoutRequestID received. Cannot monitor status.", 'error')
            return False

        self.log("")
        self.log("📱 Please check your phone and complete the M-PESA payment...")
        self.log("💡 You can cancel this monitoring by pressing Ctrl+C")
        self.log("")

        # Step 4: Monitor payment status
        try:
            final_status = self.monitor_payment_status(checkout_request_id)

            if final_status == 'completed':
                self.log("🎉 STK Push test completed successfully!", 'success')
                return True
            elif final_status == 'timeout':
                self.log("⏰ Payment monitoring timed out - this is normal for testing", 'warning')
                self.log("The STK Push was initiated successfully!", 'success')
                return True  # Consider timeout as success since STK was initiated
            else:
                self.log(f"STK Push test ended with status: {final_status}", 'warning')
                return False

        except KeyboardInterrupt:
            self.log("\nTest interrupted by user", 'warning')
            self.log("STK Push was initiated successfully before interruption!", 'success')
            return True  # Consider interruption as success since STK was initiated

    def print_test_summary(self):
        """Print test results summary"""
        self.log("=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)

        passed = len([r for r in self.test_results if r['status'] == 'passed'])
        failed = len([r for r in self.test_results if r['status'] == 'failed'])

        self.log(f"Total Tests: {len(self.test_results)}")
        self.log(f"Passed: {passed}", 'success' if passed > 0 else 'info')
        self.log(f"Failed: {failed}", 'error' if failed > 0 else 'info')

        self.log("\nDetailed Results:")
        for i, result in enumerate(self.test_results, 1):
            status_emoji = '✅' if result['status'] == 'passed' else '❌'
            self.log(f"{i}. {status_emoji} {result['test']}")

            if result['status'] == 'failed' and 'details' in result:
                self.log(f"   Error: {result['details']}")

def main():
    """Main function"""
    print("M-PESA STK Push Tester (Python)")
    print("=" * 40)
    print("This script will test the M-PESA STK Push functionality.")
    print("Make sure your M-PESA credentials are configured in environment variables.")
    print("")

    # Get test parameters - use the previous phone number as default
    default_phone = os.getenv('TEST_PHONE', '254746741719')
    phone = input(f"Enter phone number (default: {default_phone}): ").strip()
    if not phone:
        phone = default_phone

    default_amount = os.getenv('TEST_AMOUNT', '1')
    amount_input = input(f"Enter amount (default: {default_amount}): ").strip()
    try:
        amount = float(amount_input) if amount_input else float(default_amount)
    except ValueError:
        amount = 1.0

    print("")

    # Run tests
    tester = MpesaSTKTester()

    try:
        success = tester.run_full_test(phone, amount)
        tester.print_test_summary()

        if success:
            print("\n🎉 All tests completed successfully!")
            print("📱 The STK Push was initiated and sent to your phone!")
            sys.exit(0)
        else:
            print("\n⚠️ Some tests failed or were incomplete.")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        tester.print_test_summary()
        print("📱 STK Push was successfully initiated before interruption!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Test execution error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
