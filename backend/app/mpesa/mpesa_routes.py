"""
M-PESA API Routes for Mizizzi E-commerce Platform.
Provides endpoints for initiating payments and handling callbacks.
"""
from flask import Blueprint, request, jsonify, current_app
import logging
import json
from datetime import datetime
import traceback
import time
import os
from flask_jwt_extended import jwt_required, get_jwt_identity

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
mpesa_routes = Blueprint('mpesa', __name__)

# Check if we're in development mode
def is_development():
    return os.environ.get('FLASK_ENV') == 'development' or os.environ.get('FLASK_DEBUG') == '1'

# Mock STK Push response for development
def mock_stk_push_response():
    timestamp = int(time.time())
    return {
        "MerchantRequestID": f"mock-{timestamp}",
        "CheckoutRequestID": f"ws_CO_{timestamp}",
        "ResponseCode": "0",
        "ResponseDescription": "Success. Request accepted for processing",
        "CustomerMessage": "Success. Request accepted for processing",
        "is_mock": True
    }

# Mock STK Query response for development
def mock_stk_query_response(checkout_request_id):
    current_second = datetime.now().second
    if current_second % 2 == 0:
        # Success response
        return {
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "MerchantRequestID": "29115-34620561-1",
            "CheckoutRequestID": checkout_request_id,
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Success. Request accepted for processing",
            "is_mock": True
        }
    else:
        # Pending response
        return {
            "ResultCode": 1,
            "ResultDesc": "The transaction is being processed",
            "MerchantRequestID": "29115-34620561-1",
            "CheckoutRequestID": checkout_request_id,
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Success. Request accepted for processing",
            "is_mock": True
        }

@mpesa_routes.route('/test-token', methods=['GET'])
@jwt_required()
def test_token():
    """
    Test endpoint to verify token generation.
    """
    if is_development():
        return jsonify({
            'success': True,
            'token': 'mock-token-for-development'
        })

    try:
        # In production, we would import and use the real function
        # token = generate_access_token()
        token = "mock-token-for-testing"
        return jsonify({
            'success': True,
            'token': token
        })
    except Exception as e:
        logger.error(f"Error testing token: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mpesa_routes.route('/test-credentials', methods=['GET'])
@jwt_required()
def test_credentials():
    """
    Test endpoint to verify M-PESA credentials.
    """
    return jsonify({
        'success': True,
        'credentials': {
            'consumer_key': "qBKab...",
            'consumer_secret': "MSpIy...",
            'business_short_code': "174379",
            'passkey': "bfb27...",
            'is_production': False,
            'is_development': is_development()
        }
    })

@mpesa_routes.route('/direct-payment', methods=['POST'])
@jwt_required()
def direct_payment():
    """
    Direct payment endpoint for testing M-PESA integration.
    In development mode, this will always return a successful mock response.

    Request Body:
        phone: Customer's phone number
        amount: Amount to pay

    Returns:
        JSON with payment initiation status
    """
    # Get request data
    data = request.get_json()

    if not data:
        logger.error("No data provided in direct_payment request")
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    phone = data.get('phone')
    amount = data.get('amount', 1)  # Default to 1 if not provided

    # Validate required fields
    if not phone:
        logger.error("Phone number is missing in direct_payment request")
        return jsonify({
            'success': False,
            'error': 'Phone number is required'
        }), 400

    # Log the request
    logger.info(f"Direct M-PESA payment request: phone={phone}, amount={amount}")

    # In development mode, always return a successful mock response
    if is_development():
        logger.info("Using mock response for development environment")
        mock_response = mock_stk_push_response()
        return jsonify({
            'success': True,
            'message': 'STK Push initiated successfully (MOCK)',
            'response': mock_response
        })

    # In production, we would use the real implementation
    try:
        # This is where we would call the real M-PESA API
        # response = initiate_stk_push(...)

        # For now, just return a mock response
        mock_response = mock_stk_push_response()
        return jsonify({
            'success': True,
            'message': 'STK Push initiated successfully',
            'response': mock_response
        })
    except Exception as e:
        logger.error(f"Error initiating M-PESA payment: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f"Failed to initiate payment: {str(e)}"
        }), 500

@mpesa_routes.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_payment():
    """
    Initiate an M-PESA STK Push payment.
    In development mode, this will always return a successful mock response.

    Request Body:
        phone: Customer's phone number
        amount: Amount to pay
        account_reference: Reference for the transaction (optional)
        transaction_desc: Description of the transaction (optional)

    Returns:
        JSON with payment initiation status
    """
    # Get request data
    data = request.get_json()

    if not data:
        logger.error("No data provided in initiate_payment request")
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    phone = data.get('phone')
    amount = data.get('amount')
    account_reference = data.get('account_reference', 'MIZIZZI-ECOMMERCE')
    transaction_desc = data.get('transaction_desc', 'Payment for goods')

    # Validate required fields
    if not phone or not amount:
        logger.error(f"Missing required fields in initiate_payment request: phone={phone}, amount={amount}")
        return jsonify({
            'success': False,
            'error': 'Phone number and amount are required'
        }), 400

    # Log the request
    logger.info(f"Initiating M-PESA payment: phone={phone}, amount={amount}, account_reference={account_reference}")

    # In development mode, always return a successful mock response
    if is_development():
        logger.info("Using mock response for development environment")
        mock_response = mock_stk_push_response()
        return jsonify({
            'success': True,
            'message': 'STK Push initiated successfully (MOCK)',
            'response': mock_response
        })

    # In production, we would use the real implementation
    try:
        # This is where we would call the real M-PESA API
        # response = initiate_stk_push(...)

        # For now, just return a mock response
        mock_response = mock_stk_push_response()
        return jsonify({
            'success': True,
            'message': 'STK Push initiated successfully',
            'response': mock_response
        })
    except Exception as e:
        logger.error(f"Error initiating M-PESA payment: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f"Failed to initiate payment: {str(e)}"
        }), 500

@mpesa_routes.route('/query', methods=['POST'])
@jwt_required()
def query_payment():
    """
    Query the status of an M-PESA STK Push payment.
    In development mode, this will return a mock response.

    Request Body:
        checkout_request_id: The CheckoutRequestID from the STK Push response

    Returns:
        JSON with payment status
    """
    # Get request data
    data = request.get_json()

    if not data:
        logger.error("No data provided in query_payment request")
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    checkout_request_id = data.get('checkout_request_id')

    if not checkout_request_id:
        logger.error("Checkout request ID is missing in query_payment request")
        return jsonify({
            'success': False,
            'error': 'Checkout request ID is required'
        }), 400

    # Log the request
    logger.info(f"Querying M-PESA payment status: checkout_request_id={checkout_request_id}")

    # In development mode, return a mock response
    if is_development():
        logger.info("Using mock response for development environment")
        mock_response = mock_stk_query_response(checkout_request_id)
        return jsonify({
            'success': True,
            'response': mock_response
        })

    # In production, we would use the real implementation
    try:
        # This is where we would call the real M-PESA API
        # response = query_stk_status(...)

        # For now, just return a mock response
        mock_response = mock_stk_query_response(checkout_request_id)
        return jsonify({
            'success': True,
            'response': mock_response
        })
    except Exception as e:
        logger.error(f"Error in query_payment endpoint: {str(e)}")
        logger.error(traceback.format_exc())

        # Return a structured error response
        return jsonify({
            'success': False,
            'error': f"Failed to query payment status: {str(e)}",
            'response': {
                "ResultCode": -1,
                "ResultDesc": f"Error: {str(e)}",
                "CheckoutRequestID": checkout_request_id,
                "is_mock": True,
                "error_details": traceback.format_exc()
            }
        }), 200  # Return 200 even for errors to allow frontend to handle them

@mpesa_routes.route('/mock-query', methods=['POST'])
@jwt_required()
def mock_query_payment():
    """
    Mock endpoint for querying payment status.
    This is useful for testing and development.

    Request Body:
        checkout_request_id: The CheckoutRequestID from the STK Push response

    Returns:
        JSON with mock payment status
    """
    # Get request data
    data = request.get_json()

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

    # Simulate processing delay
    time.sleep(1)

    # Generate a mock response
    mock_response = mock_stk_query_response(checkout_request_id)

    return jsonify({
        'success': True,
        'response': mock_response
    })

@mpesa_routes.route('/callback', methods=['POST'])
def handle_callback():
    """
    Handle M-PESA STK Push callback.

    This endpoint receives the callback from Safaricom after the user
    completes or cancels the STK Push transaction.

    Returns:
        JSON acknowledgement response
    """
    try:
        # Get callback data
        callback_data = request.json
        logger.info(f"Received M-PESA callback: {callback_data}")

        # Process the callback data here
        # For now, just log it and return success

        return jsonify({
            'ResultCode': 0,
            'ResultDesc': 'Success'
        })

    except Exception as e:
        logger.error(f"Error handling M-PESA callback: {str(e)}")
        logger.error(traceback.format_exc())
        # Still return success to acknowledge receipt
        return jsonify({
            'ResultCode': 0,
            'ResultDesc': 'Success'
        })