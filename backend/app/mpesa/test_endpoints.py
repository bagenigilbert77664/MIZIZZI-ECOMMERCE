"""
Test endpoints for M-PESA integration.
These endpoints are for testing purposes only and should be disabled in production.
"""
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required

from .mpesa_auth import generate_access_token

# Create blueprint
mpesa_test_routes = Blueprint('mpesa_test', __name__)

@mpesa_test_routes.route('/test-token', methods=['GET'])
@jwt_required()
def test_token():
    """
    Test endpoint to verify token generation.
    This endpoint should be disabled in production.

    Returns:
        JSON with token generation status
    """
    try:
        token = generate_access_token()
        return jsonify({
            'success': True,
            'token': token
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mpesa_test_routes.route('/test-credentials', methods=['GET'])
@jwt_required()
def test_credentials():
    """
    Test endpoint to verify M-PESA credentials.
    This endpoint should be disabled in production.

    Returns:
        JSON with credential verification status
    """
    from .mpesa_credentials import (
        CONSUMER_KEY, CONSUMER_SECRET, BUSINESS_SHORT_CODE,
        PASSKEY, get_token_url, get_stk_push_url
    )

    # Mask sensitive data
    def mask_string(s):
        if not s:
            return None
        if len(s) <= 8:
            return '*' * len(s)
        return s[:4] + '*' * (len(s) - 8) + s[-4:]

    return jsonify({
        'success': True,
        'credentials': {
            'consumer_key': mask_string(CONSUMER_KEY),
            'consumer_secret': mask_string(CONSUMER_SECRET),
            'business_short_code': BUSINESS_SHORT_CODE,
            'passkey': mask_string(PASSKEY) if PASSKEY else None,
            'token_url': get_token_url(),
            'stk_push_url': get_stk_push_url()
        }
    })
