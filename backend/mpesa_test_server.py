"""
Standalone M-PESA Test Server.
Run this file directly to test M-PESA integration without modifying your existing code.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS # type: ignore
import base64
import json
import requests
from datetime import datetime
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# M-PESA API Credentials
CONSUMER_KEY = "qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n"
CONSUMER_SECRET = "MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7"
BUSINESS_SHORT_CODE = "174379"  # Default sandbox shortcode
PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"  # Default sandbox passkey

# API Endpoints
TOKEN_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
STK_QUERY_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"

# Create Flask app
app = Flask(__name__)
CORS(app)

def generate_access_token():
    """Generate an access token for the Safaricom M-PESA API."""
    # Encode credentials
    auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
    encoded_credentials = base64.b64encode(auth_string.encode()).decode()

    # Set up headers
    headers = {
        "Authorization": f"Basic {encoded_credentials}",
    }

    # Make the request
    try:
        logger.info("Generating M-PESA access token...")
        response = requests.get(TOKEN_URL, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"Token generation failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        response_data = response.json()

        # Extract the access token
        if "access_token" in response_data:
            token = response_data["access_token"]
            logger.info(f"Token generated successfully: {token[:10]}...")
            return token
        else:
            logger.error(f"Token generation failed: {response_data}")
            return None

    except Exception as e:
        logger.error(f"Error generating access token: {str(e)}")
        return None

def initiate_stk_push(phone_number, amount=1, account_reference="TEST-ACCOUNT", transaction_desc="Test Transaction"):
    """Initiate an STK Push request to the customer's phone."""
    # Generate token
    token = generate_access_token()
    if not token:
        logger.error("Failed to generate token for STK push")
        return None

    # Format phone number (ensure it starts with 254)
    if phone_number.startswith("+"):
        phone_number = phone_number[1:]
    if phone_number.startswith("0"):
        phone_number = "254" + phone_number[1:]

    # Generate timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # Generate password
    password_str = f"{BUSINESS_SHORT_CODE}{PASSKEY}{timestamp}"
    password = base64.b64encode(password_str.encode()).decode()

    # Set up headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Set up request body
    request_data = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone_number,
        "CallBackURL": "https://webhook.site/your-webhook-id",  # Replace with your webhook URL
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc
    }

    # Make the request
    try:
        logger.info(f"Initiating STK Push: phone={phone_number}, amount={amount}")
        logger.info(f"Request URL: {STK_PUSH_URL}")
        logger.info(f"Request Headers: {headers}")
        logger.info(f"Request Data: {json.dumps(request_data, indent=2)}")

        response = requests.post(STK_PUSH_URL, json=request_data, headers=headers)

        logger.info(f"Response Status: {response.status_code}")
        logger.info(f"Response Text: {response.text}")

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"STK Push failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            return response_data
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error initiating STK Push: {str(e)}")
        return None

def query_stk_status(checkout_request_id):
    """Query the status of an STK Push transaction."""
    # Generate token
    token = generate_access_token()
    if not token:
        return None

    # Generate timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # Generate password
    password_str = f"{BUSINESS_SHORT_CODE}{PASSKEY}{timestamp}"
    password = base64.b64encode(password_str.encode()).decode()

    # Set up headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Set up request body
    request_data = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id
    }

    # Make the request
    try:
        response = requests.post(STK_QUERY_URL, json=request_data, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"STK Query failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            return response_data
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error querying STK status: {str(e)}")
        return None

@app.route('/test-token', methods=['GET'])
def test_token():
    """Test endpoint to verify token generation."""
    token = generate_access_token()
    if token:
        return jsonify({
            'success': True,
            'token': token
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to generate token'
        }), 500

@app.route('/direct-payment', methods=['POST'])
def direct_payment():
    """Direct payment endpoint for testing M-PESA integration."""
    # Get request data
    data = request.json

    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    phone = data.get('phone')
    amount = data.get('amount', 1)  # Default to 1 if not provided

    # Validate required fields
    if not phone:
        return jsonify({
            'success': False,
            'error': 'Phone number is required'
        }), 400

    try:
        # Use the direct implementation
        response = initiate_stk_push(
            phone_number=phone,
            amount=int(amount),
            account_reference="DIRECT-TEST",
            transaction_desc="Direct Test Transaction"
        )

        if not response:
            return jsonify({
                'success': False,
                'error': 'Failed to initiate STK Push'
            }), 500

        return jsonify({
            'success': True,
            'message': 'STK Push initiated successfully',
            'response': response
        })

    except Exception as e:
        logger.error(f"Error in direct M-PESA payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to process direct payment: {str(e)}"
        }), 500

@app.route('/query', methods=['POST'])
def query_payment():
    """Query the status of an M-PESA STK Push payment."""
    # Get request data
    data = request.json

    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    checkout_request_id = data.get('checkout_request_id')

    if not checkout_request_id:
        return jsonify({
            'success': False,
            'error': 'Checkout request ID is required'
        }), 400

    try:
        # Query STK status
        response = query_stk_status(checkout_request_id)

        if not response:
            return jsonify({
                'success': False,
                'error': 'Failed to query payment status'
            }), 500

        return jsonify({
            'success': True,
            'response': response
        })

    except Exception as e:
        logger.error(f"Error querying M-PESA payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to query payment: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Use a different port than your main app
    logger.info(f"Starting M-PESA test server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
