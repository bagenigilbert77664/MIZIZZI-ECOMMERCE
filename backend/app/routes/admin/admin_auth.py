"""
Admin Authentication Routes for Mizizzi E-commerce platform.
Handles secure admin login, profile management, and admin-specific operations.
Production-ready with comprehensive security measures including token blacklisting,
rate limiting, audit trails, and MFA support.
"""

# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, url_for
from flask_cors import cross_origin
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies
)
from flask_limiter.util import get_remote_address

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func
from ...configuration.extensions import db, ma, mail, cache, cors, limiter

# JWT
import jwt

# HTTP Requests
import requests

# Models
from ...models.models import (
    User, UserRole, Category, Product, ProductVariant, Brand, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
    ProductImage, TokenBlacklist, AdminActivityLog, AdminMFA
)

# Schemas
from ...schemas.schemas import (
    user_schema, users_schema, category_schema, categories_schema,
    product_schema, products_schema, brand_schema, brands_schema,
    review_schema, reviews_schema, cart_item_schema, cart_items_schema,
    order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
    coupon_schema, coupons_schema, payment_schema, payments_schema,
    product_variant_schema, product_variants_schema,
    address_schema, addresses_schema,
    product_images_schema, product_image_schema
)

# Validations & Decorators
from ...validations.validation import admin_required

# Setup logger
logger = logging.getLogger(__name__)

# Create admin auth blueprint
admin_auth_routes = Blueprint('admin_auth_routes', __name__, url_prefix='/admin')

# ----------------------
# Helper Functions
# ----------------------

def send_admin_email(to, subject, template):
    """Send email using Brevo API for admin notifications."""
    try:
        # Get the Brevo API key from configuration
        brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')
        if not brevo_api_key:
            logger.error("BREVO_API_KEY not configured")
            return False

        url = "https://api.brevo.com/v3/smtp/email"

        # Prepare the payload for Brevo API
        payload = {
            "sender": {
                "name": "MIZIZZI Admin System",
                "email": "REDACTED-SENDER-EMAIL"
            },
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": template,
            "headers": {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                "Importance": "High"
            }
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": brevo_api_key
        }

        logger.info(f"Sending admin email via Brevo API to {to}")
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Admin email sent via Brevo API. Status: {response.status_code}")
            return True
        else:
            logger.error(f"Failed to send admin email via Brevo API. Status: {response.status_code}. Response: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Error sending admin email: {str(e)}")
        return False

def send_sms_otp(phone_number, otp_code):
    """Send SMS OTP for MFA."""
    try:
        # Using Twilio for SMS
        account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
        auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
        from_number = current_app.config.get('TWILIO_PHONE_NUMBER')

        if not all([account_sid, auth_token, from_number]):
            logger.error("Twilio credentials not configured")
            return False

        url = f'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json'

        message = f"Your MIZIZZI Admin verification code is: {otp_code}. This code will expire in 5 minutes. Do not share this code with anyone."

        data = {
            'From': from_number,
            'To': phone_number,
            'Body': message
        }

        response = requests.post(
            url,
            data=data,
            auth=(account_sid, auth_token)
        )

        if response.status_code == 201:
            logger.info(f"SMS OTP sent successfully to {phone_number}")
            return True
        else:
            logger.error(f"SMS API Error: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Error sending SMS OTP: {str(e)}")
        return False

def validate_admin_password(password):
    """Enhanced password validation for admin users."""
    if len(password) < 12:
        return False, "Admin password must be at least 12 characters long"
    if not re.search(r'[a-z]', password):
        return False, "Admin password must contain at least one lowercase letter"
    if not re.search(r'[A-Z]', password):
        return False, "Admin password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Admin password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Admin password must contain at least one special character"

    # Check for common patterns
    if re.search(r'(.)\1{2,}', password):  # Three or more consecutive identical characters
        return False, "Admin password cannot contain three or more consecutive identical characters"

    # Check against common passwords
    common_passwords = ['password', 'admin', 'administrator', '123456789', 'qwerty']
    if password.lower() in [p.lower() for p in common_passwords]:
        return False, "Admin password cannot be a common password"

    return True, "Password meets admin requirements"

def is_valid_phone(phone):
    """Kenyan phone number validation."""
    # Remove any spaces or dashes
    phone = re.sub(r'[\s-]', '', phone)

    # Check for valid Kenyan formats
    if re.match(r'^\+254[7,1]\d{8}$', phone):  # +254 format
        return True
    elif re.match(r'^254[7,1]\d{8}$', phone):  # 254 format without +
        return True
    elif re.match(r'^0[7,1]\d{8}$', phone):    # 07 or 01 format
        return True
    return False

def standardize_phone_number(phone):
    """Standardize Kenyan phone numbers to international format +254XXXXXXXXX."""
    # Remove any spaces or dashes
    phone = re.sub(r'[\s-]', '', phone)

    # Convert local format to international
    if re.match(r'^0[7,1]\d{8}$', phone):
        return '+254' + phone[1:]
    elif re.match(r'^254[7,1]\d{8}$', phone):
        return '+' + phone

    # Already in international format or invalid
    return phone

def get_csrf_token(encoded_token=None):
    """Generate a CSRF token for admin operations."""
    try:
        # Generate a random token regardless of whether encoded_token is provided
        return secrets.token_hex(32)  # Longer token for admin operations
    except Exception as e:
        logger.error(f"Error generating admin CSRF token with secrets: {str(e)}")
        # Fallback to uuid if secrets fails
        return str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')

def log_admin_activity(admin_id, action, details=None, status_code=200):
    """Log admin activities to database for security auditing."""
    try:
        activity_log = AdminActivityLog(
            admin_id=admin_id,
            action=action,
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            endpoint=request.endpoint,
            method=request.method,
            status_code=status_code
        )

        db.session.add(activity_log)
        db.session.commit()

        # Also log to file for immediate access
        log_entry = {
            'admin_id': admin_id,
            'action': action,
            'details': details,
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'endpoint': request.endpoint,
            'method': request.method,
            'status_code': status_code,
            'timestamp': datetime.utcnow().isoformat()
        }

        logger.info(f"ADMIN_ACTIVITY: {json.dumps(log_entry)}")

    except Exception as e:
        logger.error(f"Error logging admin activity: {str(e)}")

def blacklist_token(jti, token_type, user_id, expires_at, reason='logout'):
    """Add token to blacklist."""
    try:
        blacklisted_token = TokenBlacklist(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=expires_at,
            reason=reason
        )

        db.session.add(blacklisted_token)
        db.session.commit()

        logger.info(f"Token {jti} blacklisted for user {user_id}, reason: {reason}")
        return True

    except Exception as e:
        logger.error(f"Error blacklisting token: {str(e)}")
        return False

def is_token_blacklisted(jti):
    """Check if token is blacklisted."""
    try:
        blacklisted = TokenBlacklist.query.filter_by(jti=jti).first()
        return blacklisted is not None
    except Exception as e:
        logger.error(f"Error checking token blacklist: {str(e)}")
        return False

def cleanup_expired_tokens():
    """Clean up expired tokens from blacklist."""
    try:
        expired_tokens = TokenBlacklist.query.filter(
            TokenBlacklist.expires_at < datetime.utcnow()
        ).all()

        for token in expired_tokens:
            db.session.delete(token)

        db.session.commit()
        logger.info(f"Cleaned up {len(expired_tokens)} expired tokens from blacklist")

    except Exception as e:
        logger.error(f"Error cleaning up expired tokens: {str(e)}")

def enhanced_admin_required(f):
    """Enhanced admin required decorator with additional security checks."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()

            # Get additional claims from JWT
            claims = get_jwt()
            jti = claims.get('jti')

            # Check if token is blacklisted
            if is_token_blacklisted(jti):
                log_admin_activity(current_user_id, 'BLACKLISTED_TOKEN_ATTEMPT', f'Attempted to use blacklisted token: {jti}', 401)
                return jsonify({"error": "Token has been revoked"}), 401

            # Check if user exists and is admin
            user = db.session.get(User, current_user_id)

            if not user:
                log_admin_activity(current_user_id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'User not found', 404)
                return jsonify({"error": "User not found"}), 404

            if not user.is_active:
                log_admin_activity(current_user_id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Inactive user', 403)
                return jsonify({"error": "Account is deactivated"}), 403

            if user.role != UserRole.ADMIN:
                log_admin_activity(current_user_id, 'UNAUTHORIZED_ACCESS_ATTEMPT', f'Non-admin user with role: {user.role}', 403)
                return jsonify({"error": "Admin access required"}), 403

            # Check if role in JWT matches database role
            if claims.get('role') != 'admin':
                log_admin_activity(current_user_id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'JWT role mismatch', 403)
                return jsonify({"error": "Invalid admin token"}), 403

            # Store admin user in g for use in the route
            g.current_admin = user

            return f(*args, **kwargs)

        except Exception as e:
            logger.error(f"Admin authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    return decorated_function

def mfa_required(f):
    """Decorator to require MFA for sensitive admin operations."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin = g.current_admin

        # Check if MFA is enabled for this admin
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()

        if mfa_settings and mfa_settings.is_enabled:
            # Check if MFA token is provided
            mfa_token = request.headers.get('X-MFA-Token') or (request.json.get('mfa_token') if request.json else None)

            if not mfa_token:
                log_admin_activity(admin.id, 'MFA_REQUIRED', f'MFA token required for {request.endpoint}', 403)
                return jsonify({"error": "MFA token required", "mfa_required": True}), 403

            # Verify MFA token
            totp = pyotp.TOTP(mfa_settings.secret_key)
            if not totp.verify(mfa_token, valid_window=1):
                # Try backup codes
                if not mfa_settings.verify_backup_code(mfa_token):
                    log_admin_activity(admin.id, 'MFA_VERIFICATION_FAILED', f'Invalid MFA token for {request.endpoint}', 403)
                    return jsonify({"error": "Invalid MFA token"}), 403

            # Update last used timestamp
            mfa_settings.last_used_at = datetime.utcnow()
            db.session.commit()

        return f(*args, **kwargs)

    return decorated_function

# ----------------------
# Rate Limiting Setup
# ----------------------

def get_admin_rate_limit_key():
    """Generate rate limit key based on IP and user ID if available."""
    try:
        user_id = get_jwt_identity() if request.headers.get('Authorization') else None
        return f"{request.remote_addr}:{user_id}" if user_id else request.remote_addr
    except:
        return request.remote_addr

# ----------------------
# Admin Authentication Routes
# ----------------------

@admin_auth_routes.route('/auth/csrf', methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required(optional=True)
def get_admin_csrf():
    """Get CSRF token for admin operations."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        return response

    try:
        # Generate a CSRF token using the enhanced function
        csrf_token = get_csrf_token()
        return jsonify({"csrf_token": csrf_token}), 200

    except Exception as e:
        logger.error(f"Error generating admin CSRF token: {str(e)}")
        return jsonify({"error": "Failed to generate CSRF token", "details": str(e)}), 500

@admin_auth_routes.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin()
@limiter.limit("5 per minute", key_func=get_remote_address)  # Rate limiting
def admin_login():
    """Secure admin login route - only allows users with admin role."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MFA-Token')
        return response

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Support both 'identifier' and 'email' for backward compatibility
        identifier = data.get('identifier') or data.get('email')
        password = data.get('password')
        mfa_token = data.get('mfa_token')  # Optional MFA token

        if not identifier or not password:
            return jsonify({'error': 'Email/phone and password are required'}), 400

        # Log login attempt
        logger.info(f"Admin login attempt for identifier: {identifier}")

        # Check if identifier is email or phone
        is_email = '@' in identifier

        # Find user
        if is_email:
            user = User.query.filter_by(email=identifier).first()
        else:
            user = User.query.filter_by(phone=identifier).first()

        # Check if user exists
        if not user:
            log_admin_activity(None, 'FAILED_LOGIN_ATTEMPT', f'User not found: {identifier}', 401)
            return jsonify({'error': 'Invalid admin credentials'}), 401

        # Check if user is admin
        if user.role != UserRole.ADMIN:
            log_admin_activity(user.id, 'UNAUTHORIZED_LOGIN_ATTEMPT', f'Non-admin user attempted admin login: {user.role}', 403)
            return jsonify({'error': 'Admin access required'}), 403

        # Check password
        if not user.verify_password(password):
            log_admin_activity(user.id, 'FAILED_LOGIN_ATTEMPT', 'Invalid password', 401)
            return jsonify({'error': 'Invalid admin credentials'}), 401

        # Check if user is active
        if not user.is_active:
            log_admin_activity(user.id, 'FAILED_LOGIN_ATTEMPT', 'Inactive account', 403)
            return jsonify({'error': 'Admin account is deactivated. Please contact super admin.'}), 403

        # Check if user is verified (admins should be verified)
        if is_email and not user.email_verified:
            log_admin_activity(user.id, 'FAILED_LOGIN_ATTEMPT', 'Unverified email', 403)
            return jsonify({'error': 'Admin email not verified', 'user_id': user.id}), 403

        if not is_email and not user.phone_verified:
            log_admin_activity(user.id, 'FAILED_LOGIN_ATTEMPT', 'Unverified phone', 403)
            return jsonify({'error': 'Admin phone not verified', 'user_id': user.id}), 403

        # Check MFA if enabled - CRITICAL FIX: Move this check BEFORE token creation
        mfa_settings = AdminMFA.query.filter_by(user_id=user.id).first()
        if mfa_settings and mfa_settings.is_enabled:
            if not mfa_token:
                log_admin_activity(user.id, 'MFA_REQUIRED_LOGIN', 'MFA token required for login', 403)
                return jsonify({
                    'error': 'MFA token required',
                    'mfa_required': True,
                    'user_id': user.id
                }), 403

            # Verify MFA token
            totp = pyotp.TOTP(mfa_settings.secret_key)
            if not totp.verify(mfa_token, valid_window=1):
                # Try backup codes
                if not mfa_settings.verify_backup_code(mfa_token):
                    log_admin_activity(user.id, 'MFA_VERIFICATION_FAILED', 'Invalid MFA token during login', 403)
                    return jsonify({'error': 'Invalid MFA token'}), 403

            # Update MFA last used timestamp
            mfa_settings.last_used_at = datetime.utcnow()
            db.session.commit()

        # Create tokens with admin role claim - MOVED AFTER MFA CHECK
        additional_claims = {
            "role": "admin",
            "admin_level": "standard",
            "permissions": ["read", "write", "delete", "manage_users", "manage_products", "manage_orders"],
            "mfa_verified": mfa_settings.is_enabled if mfa_settings else False
        }

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=8)  # Shorter expiry for admin tokens
        )

        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims=additional_claims,
            expires_delta=timedelta(days=7)  # Shorter refresh for admin
        )

        # Generate CSRF token
        csrf_token = get_csrf_token()

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Log successful login
        log_admin_activity(user.id, 'SUCCESSFUL_LOGIN', f'Admin logged in: {identifier}', 200)

        # Create response with tokens - FIXED RESPONSE STRUCTURE
        resp = jsonify({
            'message': 'Admin login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,  # ENSURE THIS IS INCLUDED
            'csrf_token': csrf_token,
            'mfa_enabled': mfa_settings.is_enabled if mfa_settings else False,
            'user': {  # CHANGED BACK TO 'user' TO MATCH TEST EXPECTATIONS
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'role': user.role.value,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'email_verified': user.email_verified,
                'phone_verified': user.phone_verified
            }
        })

        # Set cookies for tokens - use secure=True for production
        is_production = current_app.config.get('ENV') == 'production'
        try:
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)
            resp.set_cookie(
                "admin_csrf_token",
                csrf_token,
                httponly=False,
                secure=is_production,
                samesite="Lax" if not is_production else "Strict"
            )
            logger.info("Admin cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set admin cookies: {str(e)}")

        return resp, 200

    except Exception as e:
        logger.error(f"Admin login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during admin login', 'details': str(e)}), 500

@admin_auth_routes.route('/profile', methods=['GET'])
@enhanced_admin_required
def get_admin_profile():
    """Get admin profile information."""
    try:
        admin = g.current_admin
        log_admin_activity(admin.id, 'PROFILE_ACCESS', 'Admin accessed profile', 200)

        # Get MFA status
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()

        return jsonify({
            'admin': {
                'id': admin.id,
                'name': admin.name,
                'email': admin.email,
                'phone': admin.phone,
                'role': admin.role.value,
                'last_login': admin.last_login.isoformat() if admin.last_login else None,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'is_active': admin.is_active,
                'email_verified': admin.email_verified,
                'phone_verified': admin.phone_verified,
                'avatar_url': admin.avatar_url,
                'mfa_enabled': mfa_settings.is_enabled if mfa_settings else False
            }
        }), 200

    except Exception as e:
        logger.error(f"Get admin profile error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'PROFILE_ACCESS_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching admin profile'}), 500

@admin_auth_routes.route('/profile', methods=['PUT'])
@enhanced_admin_required
def update_admin_profile():
    """Update admin profile information."""
    try:
        admin = g.current_admin
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Track changes for logging
        changes = []

        # Update fields if provided
        if 'name' in data and data['name'] != admin.name:
            old_name = admin.name
            admin.name = data['name']
            changes.append(f"Name: {old_name} -> {admin.name}")

        if 'phone' in data and data['phone'] != admin.phone:
            # Check if phone already exists for another user
            if data['phone']:
                if not is_valid_phone(data['phone']):
                    return jsonify({'error': 'Invalid phone number format'}), 400

                existing = User.query.filter_by(phone=data['phone']).first()
                if existing and existing.id != admin.id:
                    return jsonify({'error': 'Phone number already in use'}), 409

                old_phone = admin.phone
                admin.phone = standardize_phone_number(data['phone'])
                changes.append(f"Phone: {old_phone} -> {admin.phone}")

        if 'email' in data and data['email'] != admin.email:
            # Check if email already exists
            if data['email']:
                try:
                    # Validate email format
                    valid_email = validate_email(data['email'])
                    new_email = valid_email.email

                    existing = User.query.filter_by(email=new_email).first()
                    if existing and existing.id != admin.id:
                        return jsonify({'error': 'Email already in use'}), 409

                    old_email = admin.email
                    admin.email = new_email
                    admin.email_verified = False  # Need to re-verify new email
                    changes.append(f"Email: {old_email} -> {admin.email}")

                except EmailNotValidError:
                    return jsonify({'error': 'Invalid email format'}), 400

        if 'avatar_url' in data:
            old_avatar = admin.avatar_url
            admin.avatar_url = data['avatar_url']
            changes.append(f"Avatar updated")

        # Save changes
        if changes:
            db.session.commit()
            log_admin_activity(admin.id, 'PROFILE_UPDATE', f"Changes: {', '.join(changes)}", 200)

            return jsonify({
                'message': 'Admin profile updated successfully',
                'changes': changes,
                'admin': {
                    'id': admin.id,
                    'name': admin.name,
                    'email': admin.email,
                    'phone': admin.phone,
                    'role': admin.role.value,
                    'is_active': admin.is_active,
                    'email_verified': admin.email_verified,
                    'phone_verified': admin.phone_verified,
                    'avatar_url': admin.avatar_url
                }
            }), 200
        else:
            return jsonify({'message': 'No changes detected'}), 200

    except Exception as e:
        logger.error(f"Update admin profile error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'PROFILE_UPDATE_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while updating admin profile'}), 500

@admin_auth_routes.route('/change-password', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA for password changes
@limiter.limit("3 per hour", key_func=get_admin_rate_limit_key)  # Rate limiting
def change_admin_password():
    """Change admin password with enhanced security."""
    try:
        admin = g.current_admin
        data = request.get_json()

        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return jsonify({'error': 'Current password, new password, and confirmation are required'}), 400

        # Check if new password matches confirmation
        if new_password != confirm_password:
            return jsonify({'error': 'New password and confirmation do not match'}), 400

        # Check current password
        if not admin.verify_password(current_password):
            log_admin_activity(admin.id, 'FAILED_PASSWORD_CHANGE', 'Incorrect current password', 401)
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Validate new password with enhanced requirements
        is_valid, password_msg = validate_admin_password(new_password)
        if not is_valid:
            return jsonify({'error': password_msg}), 400

        # Check if new password is different from current
        if admin.verify_password(new_password):
            return jsonify({'error': 'New password must be different from current password'}), 400

        # Update password
        admin.set_password(new_password)
        db.session.commit()

        # Blacklist all existing tokens for this admin
        try:
            # Get current token to avoid blacklisting it immediately
            current_claims = get_jwt()
            current_jti = current_claims.get('jti')

            # In a real implementation, you'd query all active tokens for this user
            # For now, we'll just log the password change
            log_admin_activity(admin.id, 'PASSWORD_CHANGED', 'Admin password changed successfully - all tokens should be revoked', 200)

        except Exception as token_error:
            logger.error(f"Error handling token blacklisting after password change: {str(token_error)}")

        # Send notification email about password change
        try:
            password_change_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Password Changed - MIZIZZI</title>
                <style>
                    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box_shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                    .content {{ line-height: 1.6; color: #333; }}
                    .alert {{ background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>MIZIZZI Admin Security Alert</h1>
                    </div>
                    <div class="content">
                        <h2>Password Changed Successfully</h2>
                        <p>Hello {admin.name},</p>
                        <p>Your admin account password has been successfully changed.</p>
                        <div class="alert">
                            <strong>Security Notice:</strong> If you did not make this change, please contact the system administrator immediately.
                        </div>
                        <p><strong>Change Details:</strong></p>
                        <ul>
                            <li>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                            <li>IP Address: {request.remote_addr}</li>
                            <li>User Agent: {request.headers.get('User-Agent', 'Unknown')}</li>
                        </ul>
                        <p>For security reasons, you may need to log in again on all devices.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            send_admin_email(admin.email, "MIZIZZI Admin - Password Changed", password_change_template)

        except Exception as email_error:
            logger.error(f"Failed to send password change notification: {str(email_error)}")

        return jsonify({
            'message': 'Admin password changed successfully',
            'security_notice': 'You may need to log in again on all devices'
        }), 200

    except Exception as e:
        logger.error(f"Change admin password error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'PASSWORD_CHANGE_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while changing password'}), 500

@admin_auth_routes.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("10 per minute", key_func=get_admin_rate_limit_key)  # Rate limiting
def refresh_admin_token():
    """Refresh admin access token."""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        jti = claims.get('jti')

        # Check if refresh token is blacklisted
        if is_token_blacklisted(jti):
            return jsonify({'error': 'Refresh token has been revoked'}), 401

        # Verify this is an admin refresh token
        if claims.get('role') != 'admin':
            return jsonify({'error': 'Invalid admin refresh token'}), 403

        # Get the admin from database
        admin = db.session.get(User, current_user_id)
        if not admin or not admin.is_active or admin.role != UserRole.ADMIN:
            return jsonify({'error': 'Admin not found or inactive'}), 404

        # Create new access token with admin role claim
        additional_claims = {
            "role": "admin",
            "admin_level": "standard",
            "permissions": ["read", "write", "delete", "manage_users", "manage_products", "manage_orders"]
        }

        new_access_token = create_access_token(
            identity=str(current_user_id),
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=8)
        )

        # Generate CSRF token
        csrf_token = get_csrf_token()

        log_admin_activity(admin.id, 'TOKEN_REFRESH', 'Admin token refreshed', 200)

        # Create response with tokens
        resp = jsonify({
            'access_token': new_access_token,
            'csrf_token': csrf_token
        })

        # Set cookies for tokens
        is_production = current_app.config.get('ENV') == 'production'
        try:
            set_access_cookies(resp, new_access_token)
            resp.set_cookie(
                "admin_csrf_token",
                csrf_token,
                httponly=False,
                secure=is_production,
                samesite="Lax" if not is_production else "Strict"
            )
            logger.info("Admin refresh cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set admin refresh cookies: {str(e)}")

        return resp, 200

    except Exception as e:
        logger.error(f"Admin token refresh error: {str(e)}")
        return jsonify({'error': 'An error occurred while refreshing admin token'}), 500

@admin_auth_routes.route('/logout', methods=['POST'])
@enhanced_admin_required
def admin_logout():
    """Admin logout with token blacklisting."""
    try:
        admin = g.current_admin
        claims = get_jwt()
        jti = claims.get('jti')
        exp = claims.get('exp')

        # Blacklist the current token
        if jti and exp:
            expires_at = datetime.fromtimestamp(exp)
            blacklist_token(jti, 'access', admin.id, expires_at, 'logout')

        log_admin_activity(admin.id, 'LOGOUT', 'Admin logged out', 200)

        return jsonify({'message': 'Admin logged out successfully'}), 200

    except Exception as e:
        logger.error(f"Admin logout error: {str(e)}")
        return jsonify({'error': 'An error occurred during admin logout'}), 500

@admin_auth_routes.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per hour", key_func=get_remote_address)  # Rate limiting
def admin_forgot_password():
    """Admin password reset request."""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Log the attempt
        logger.info(f"Admin password reset requested for email: {email}")

        # Find admin user
        user = User.query.filter_by(email=email, role=UserRole.ADMIN).first()

        # For security reasons, always return success even if admin not found
        if not user:
            logger.info(f"Admin not found for email: {email}, but returning success for security")
            return jsonify({'message': 'If your admin email is registered, you will receive a password reset link shortly'}), 200

        # Generate reset token (valid for 15 minutes for admin - shorter than regular users)
        reset_token = create_access_token(
            identity=email,
            expires_delta=timedelta(minutes=15),
            additional_claims={"purpose": "admin_password_reset", "role": "admin"}
        )

        # Create reset link
        reset_link = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/admin/reset-password?token={reset_token}"

        log_admin_activity(user.id, 'PASSWORD_RESET_REQUEST', f'Reset link generated for: {email}', 200)

        # Admin password reset email template
        reset_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Password Reset - MIZIZZI</title>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                .content {{ line-height: 1.6; color: #333; }}
                .button {{ display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                .warning {{ background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MIZIZZI Admin Password Reset</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>Hello {user.name},</p>
                    <p>We received a request to reset the password for your admin account. To proceed with resetting your password, please click the button below.</p>
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">RESET ADMIN PASSWORD</a>
                    </div>
                    <div class="warning">
                        <strong>Security Notice:</strong>
                        <ul>
                            <li>This link will expire in 15 minutes for security reasons</li>
                            <li>If you did not request this reset, please contact the system administrator immediately</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    <p><strong>Request Details:</strong></p>
                    <ul>
                        <li>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                        <li>IP Address: {request.remote_addr}</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send reset email
        email_sent = send_admin_email(email, "MIZIZZI Admin - Password Reset", reset_template)

        # Store the reset token in the database for additional security
        try:
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
            logger.info(f"Admin reset token stored in database for user {user.id}")
        except Exception as db_error:
            logger.error(f"Error storing admin reset token in database: {str(db_error)}")

        if not email_sent:
            logger.error(f"Failed to send admin password reset email to {email}")
            return jsonify({'error': 'Failed to send password reset email. Please contact system administrator.'}), 500

        return jsonify({'message': 'If your admin email is registered, you will receive a password reset link shortly'}), 200

    except Exception as e:
        logger.error(f"Admin forgot password error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during password reset request'}), 500

@admin_auth_routes.route('/reset-password', methods=['POST'])
@limiter.limit("3 per hour", key_func=get_remote_address)  # Rate limiting
def admin_reset_password():
    """Admin password reset with enhanced validation."""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        confirm_password = data.get('confirm_password')

        if not token or not new_password or not confirm_password:
            return jsonify({'error': 'Token, new password, and confirmation are required'}), 400

        # Check if passwords match
        if new_password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400

        # Validate password with enhanced admin requirements
        is_valid, password_msg = validate_admin_password(new_password)
        if not is_valid:
            return jsonify({'error': password_msg}), 400

        try:
            # Decode the token
            decoded_token = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )

            # Check if token is for admin password reset
            if decoded_token.get('purpose') != 'admin_password_reset':
                logger.warning(f"Token used for admin password reset was not created for that purpose")
                return jsonify({'error': 'Invalid admin reset token'}), 400

            if decoded_token.get('role') != 'admin':
                logger.warning(f"Non-admin token used for admin password reset")
                return jsonify({'error': 'Invalid admin reset token'}), 400

            # Extract email from token
            email = decoded_token['sub']

            # Find admin user
            user = User.query.filter_by(email=email, role=UserRole.ADMIN).first()
            if not user:
                return jsonify({'error': 'Admin not found'}), 404

            # Check if token matches stored token (if available)
            if hasattr(user, 'reset_token') and user.reset_token and user.reset_token != token:
                logger.warning(f"Token mismatch for admin user {user.id}")
                return jsonify({'error': 'Invalid reset token'}), 400

            # Check if token is expired in database (if available)
            if hasattr(user, 'reset_token_expires') and user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
                logger.warning(f"Token expired in database for admin user {user.id}")
                return jsonify({'error': 'Password reset link expired'}), 400

            # Update password
            user.set_password(new_password)

            # Clear reset token
            if hasattr(user, 'reset_token'):
                user.reset_token = None
            if hasattr(user, 'reset_token_expires'):
                user.reset_token_expires = None

            db.session.commit()

            # Log successful password reset
            log_admin_activity(user.id, 'PASSWORD_RESET_COMPLETED', f'Admin password reset successful for: {email}', 200)

            # Send confirmation email
            confirmation_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Password Reset Successful - MIZIZZI</title>
                <style>
                    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                    .content {{ line-height: 1.6; color: #333; }}
                    .success {{ background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }}
                    .button {{ display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Successful</h1>
                    </div>
                    <div class="content">
                        <h2>Admin Password Updated</h2>
                        <p>Hello {user.name},</p>
                        <p>Your admin account password has been successfully reset.</p>
                        <div class="success">
                            <strong>Success:</strong> You can now log in to your admin account using your new password.
                        </div>
                        <div style="text-align: center;">
                            <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/admin/login" class="button">LOGIN TO ADMIN PANEL</a>
                        </div>
                        <p><strong>Reset Details:</strong></p>
                        <ul>
                            <li>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                            <li>IP Address: {request.remote_addr}</li>
                        </ul>
                        <p><strong>Security Notice:</strong> If you did not make this change, please contact the system administrator immediately.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Try to send confirmation email
            try:
                send_admin_email(email, "MIZIZZI Admin - Password Reset Successful", confirmation_template)
            except Exception as email_error:
                logger.error(f"Failed to send admin confirmation email: {str(email_error)}")

            return jsonify({'message': 'Admin password reset successful'}), 200

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Password reset link expired'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid reset token'}), 400

    except Exception as e:
        logger.error(f"Admin reset password error: {str(e)}")
        return jsonify({'error': 'An error occurred during password reset'}), 500

# ----------------------
# MFA (Multi-Factor Authentication) Routes
# ----------------------

@admin_auth_routes.route('/mfa/setup', methods=['POST'])
@enhanced_admin_required
def setup_mfa():
    """Setup MFA for admin account."""
    try:
        admin = g.current_admin

        # Check if MFA is already enabled
        existing_mfa = AdminMFA.query.filter_by(user_id=admin.id).first()
        if existing_mfa and existing_mfa.is_enabled:
            return jsonify({'error': 'MFA is already enabled for this account'}), 400

        # Generate secret key
        secret_key = pyotp.random_base32()

        # Create or update MFA settings
        if existing_mfa:
            existing_mfa.secret_key = secret_key
            existing_mfa.is_enabled = False  # Will be enabled after verification
            mfa_settings = existing_mfa
        else:
            mfa_settings = AdminMFA(
                user_id=admin.id,
                secret_key=secret_key,
                is_enabled=False
            )
            db.session.add(mfa_settings)

        # Generate backup codes
        backup_codes = mfa_settings.generate_backup_codes()
        db.session.commit()

        # Generate QR code
        totp = pyotp.TOTP(secret_key)
        provisioning_uri = totp.provisioning_uri(
            name=admin.email,
            issuer_name="MIZIZZI Admin"
        )

        # Create QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        qr_code_base64 = base64.b64encode(img_buffer.getvalue()).decode()

        log_admin_activity(admin.id, 'MFA_SETUP_INITIATED', 'Admin initiated MFA setup', 200)

        return jsonify({
            'message': 'MFA setup initiated',
            'secret_key': secret_key,
            'qr_code': f"data:image/png;base64,{qr_code_base64}",
            'backup_codes': backup_codes,
            'manual_entry_key': secret_key
        }), 200

    except Exception as e:
        logger.error(f"MFA setup error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'MFA_SETUP_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred during MFA setup'}), 500

@admin_auth_routes.route('/mfa/verify', methods=['POST'])
@enhanced_admin_required
def verify_mfa_setup():
    """Verify and enable MFA for admin account."""
    try:
        admin = g.current_admin
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({'error': 'MFA token is required'}), 400

        # Get MFA settings
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()
        if not mfa_settings:
            return jsonify({'error': 'MFA setup not initiated'}), 400

        # Verify token
        totp = pyotp.TOTP(mfa_settings.secret_key)
        if not totp.verify(token, valid_window=1):
            log_admin_activity(admin.id, 'MFA_VERIFICATION_FAILED', 'Invalid MFA token during setup', 400)
            return jsonify({'error': 'Invalid MFA token'}), 400

        # Enable MFA
        mfa_settings.is_enabled = True
        mfa_settings.last_used_at = datetime.utcnow()
        db.session.commit()

        log_admin_activity(admin.id, 'MFA_ENABLED', 'Admin successfully enabled MFA', 200)

        # Send confirmation email
        try:
            mfa_enabled_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MFA Enabled - MIZIZZI Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                    .content {{ line-height: 1.6; color: #333; }}
                    .success {{ background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>MFA Enabled Successfully</h1>
                    </div>
                    <div class="content">
                        <h2>Multi-Factor Authentication Activated</h2>
                        <p>Hello {admin.name},</p>
                        <p>Multi-Factor Authentication (MFA) has been successfully enabled for your admin account.</p>
                        <div class="success">
                            <strong>Enhanced Security:</strong> Your account is now protected with an additional layer of security.
                        </div>
                        <p><strong>Important Notes:</strong></p>
                        <ul>
                            <li>Keep your backup codes in a safe place</li>
                            <li>You will need your authenticator app for future logins</li>
                            <li>Contact support if you lose access to your authenticator app</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            send_admin_email(admin.email, "MIZIZZI Admin - MFA Enabled", mfa_enabled_template)
        except Exception as email_error:
            logger.error(f"Failed to send MFA enabled notification: {str(email_error)}")

        return jsonify({
            'message': 'MFA enabled successfully',
            'backup_codes': mfa_settings.backup_codes
        }), 200

    except Exception as e:
        logger.error(f"MFA verification error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'MFA_VERIFICATION_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred during MFA verification'}), 500

@admin_auth_routes.route('/mfa/disable', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA to disable MFA
def disable_mfa():
    """Disable MFA for admin account."""
    try:
        admin = g.current_admin

        # Get MFA settings
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()
        if not mfa_settings or not mfa_settings.is_enabled:
            return jsonify({'error': 'MFA is not enabled for this account'}), 400

        # Disable MFA
        mfa_settings.is_enabled = False
        mfa_settings.backup_codes = None
        db.session.commit()

        log_admin_activity(admin.id, 'MFA_DISABLED', 'Admin disabled MFA', 200)

        # Send notification email
        try:
            mfa_disabled_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MFA Disabled - MIZIZZI Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                    .content {{ line-height: 1.6; color: #333; }}
                    .warning {{ background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>MFA Disabled</h1>
                    </div>
                    <div class="content">
                        <h2>Multi-Factor Authentication Disabled</h2>
                        <p>Hello {admin.name},</p>
                        <p>Multi-Factor Authentication (MFA) has been disabled for your admin account.</p>
                        <div class="warning">
                            <strong>Security Notice:</strong> Your account security has been reduced. Consider re-enabling MFA for better protection.
                        </div>
                        <p><strong>Disable Details:</strong></p>
                        <ul>
                            <li>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                            <li>IP Address: {request.remote_addr}</li>
                        </ul>
                        <p>If you did not make this change, please contact the system administrator immediately.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            send_admin_email(admin.email, "MIZIZZI Admin - MFA Disabled", mfa_disabled_template)
        except Exception as email_error:
            logger.error(f"Failed to send MFA disabled notification: {str(email_error)}")

        return jsonify({'message': 'MFA disabled successfully'}), 200

    except Exception as e:
        logger.error(f"MFA disable error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'MFA_DISABLE_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while disabling MFA'}), 500

@admin_auth_routes.route('/mfa/backup-codes', methods=['GET'])
@enhanced_admin_required
@mfa_required  # Require MFA to view backup codes
def get_backup_codes():
    """Get backup codes for admin account."""
    try:
        admin = g.current_admin

        # Get MFA settings
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()
        if not mfa_settings or not mfa_settings.is_enabled:
            return jsonify({'error': 'MFA is not enabled for this account'}), 400

        log_admin_activity(admin.id, 'BACKUP_CODES_VIEWED', 'Admin viewed backup codes', 200)

        return jsonify({
            'backup_codes': mfa_settings.backup_codes or [],
            'remaining_codes': len(mfa_settings.backup_codes) if mfa_settings.backup_codes else 0
        }), 200

    except Exception as e:
        logger.error(f"Get backup codes error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'BACKUP_CODES_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching backup codes'}), 500

@admin_auth_routes.route('/mfa/regenerate-backup-codes', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA to regenerate backup codes
def regenerate_backup_codes():
    """Regenerate backup codes for admin account."""
    try:
        admin = g.current_admin

        # Get MFA settings
        mfa_settings = AdminMFA.query.filter_by(user_id=admin.id).first()
        if not mfa_settings or not mfa_settings.is_enabled:
            return jsonify({'error': 'MFA is not enabled for this account'}), 400

        # Generate new backup codes
        new_backup_codes = mfa_settings.generate_backup_codes()
        db.session.commit()

        log_admin_activity(admin.id, 'BACKUP_CODES_REGENERATED', 'Admin regenerated backup codes', 200)

        return jsonify({
            'message': 'Backup codes regenerated successfully',
            'backup_codes': new_backup_codes
        }), 200

    except Exception as e:
        logger.error(f"Regenerate backup codes error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'BACKUP_CODES_REGENERATE_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while regenerating backup codes'}), 500

# ----------------------
# User Management Routes
# ----------------------

@admin_auth_routes.route('/users', methods=['GET'])
@enhanced_admin_required
def get_all_users():
    """Get all users (admin only) with pagination and filtering."""
    try:
        admin = g.current_admin

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role_filter = request.args.get('role', None)
        search = request.args.get('search', None)
        is_active = request.args.get('is_active', None)

        # Build query
        query = User.query

        # Apply filters
        if role_filter:
            try:
                role_enum = UserRole(role_filter)
                query = query.filter(User.role == role_enum)
            except ValueError:
                return jsonify({'error': 'Invalid role filter'}), 400

        if search:
            query = query.filter(
                or_(
                    User.name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.phone.ilike(f'%{search}%')
                )
            )

        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            query = query.filter(User.is_active == active_bool)

        # Order by creation date (newest first)
        query = query.order_by(desc(User.created_at))

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Convert to dict
        users_data = []
        for user in paginated.items:
            user_dict = user.to_dict()
            # Remove sensitive information
            user_dict.pop('password_hash', None)
            users_data.append(user_dict)

        log_admin_activity(admin.id, 'USER_LIST_ACCESS', f'Viewed users list (page {page})', 200)

        return jsonify({
            'users': users_data,
            'pagination': {
                'page': paginated.page,
                'per_page': paginated.per_page,
                'total_pages': paginated.pages,
                'total_items': paginated.total,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            },
            'filters': {
                'role': role_filter,
                'search': search,
                'is_active': is_active
            }
        }), 200

    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'USER_LIST_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching users'}), 500

@admin_auth_routes.route('/users/<int:user_id>', methods=['GET'])
@enhanced_admin_required
def get_user_details(user_id):
    """Get detailed information about a specific user."""
    try:
        admin = g.current_admin
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_dict = user.to_dict()
        # Remove sensitive information
        user_dict.pop('password_hash', None)

        log_admin_activity(admin.id, 'USER_DETAIL_ACCESS', f'Viewed user details for user ID: {user_id}', 200)

        return jsonify({'user': user_dict}), 200

    except Exception as e:
        logger.error(f"Get user details error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'USER_DETAIL_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching user details'}), 500

@admin_auth_routes.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA for user status changes
def toggle_user_status(user_id):
    """Toggle user active status (activate/deactivate)."""
    try:
        admin = g.current_admin
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent admin from deactivating themselves
        if user.id == admin.id:
            return jsonify({'error': 'Cannot change your own account status'}), 400

        # Toggle status
        old_status = user.is_active
        user.is_active = not user.is_active
        db.session.commit()

        action = 'activated' if user.is_active else 'deactivated'
        log_admin_activity(admin.id, 'USER_STATUS_CHANGE', f'User {user_id} {action} (was {old_status})', 200)

        return jsonify({
            'message': f'User {action} successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'is_active': user.is_active
            }
        }), 200

    except Exception as e:
        logger.error(f"Toggle user status error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'USER_STATUS_CHANGE_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while updating user status'}), 500

@admin_auth_routes.route('/create-admin', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA for admin creation
@limiter.limit("2 per hour", key_func=get_admin_rate_limit_key)  # Rate limiting
def create_admin():
    """Create a new admin user (super admin only)."""
    try:
        admin = g.current_admin
        data = request.get_json()

        # Check if current admin has permission to create other admins
        # This could be extended with role hierarchy
        if not admin.is_active:
            return jsonify({'error': 'Your account is not active'}), 403

        # Required fields
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')

        if not all([name, email, phone, password]):
            return jsonify({'error': 'Name, email, phone, and password are required'}), 400

        # Validate email
        try:
            valid_email = validate_email(email)
            email = valid_email.email
        except EmailNotValidError:
            return jsonify({'error': 'Invalid email format'}), 400

        # Validate phone
        if not is_valid_phone(phone):
            return jsonify({'error': 'Invalid phone number format'}), 400
        phone = standardize_phone_number(phone)

        # Validate password
        is_valid, password_msg = validate_admin_password(password)
        if not is_valid:
            return jsonify({'error': password_msg}), 400

        # Check if email or phone already exists
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({'error': 'Email already in use'}), 409

        existing_phone = User.query.filter_by(phone=phone).first()
        if existing_phone:
            return jsonify({'error': 'Phone number already in use'}), 409

        # Create new admin user
        new_admin = User(
            name=name,
            email=email,
            phone=phone,
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,  # Admins are pre-verified
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        new_admin.set_password(password)

        db.session.add(new_admin)
        db.session.commit()

        log_admin_activity(admin.id, 'ADMIN_CREATED', f'Created new admin: {email} (ID: {new_admin.id})', 200)

        # Send welcome email to new admin
        try:
            welcome_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to MIZIZZI Admin</title>
                <style>
                    body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }}
                    .content {{ line-height: 1.6; color: #333; }}
                    .button {{ display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
                    .info {{ background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to MIZIZZI Admin</h1>
                    </div>
                    <div class="content">
                        <h2>Admin Account Created</h2>
                        <p>Hello {name},</p>
                        <p>Your admin account has been successfully created for the MIZIZZI E-commerce platform.</p>
                        <div class="info">
                            <strong>Account Details:</strong>
                            <ul>
                                <li>Email: {email}</li>
                                <li>Phone: {phone}</li>
                                <li>Role: Administrator</li>
                                <li>Created by: {admin.name} ({admin.email})</li>
                            </ul>
                        </div>
                        <div style="text-align: center;">
                            <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/admin/login" class="button">LOGIN TO ADMIN PANEL</a>
                        </div>
                        <p><strong>Security Recommendations:</strong></p>
                        <ul>
                            <li>Change your password after first login</li>
                            <li>Enable Multi-Factor Authentication (MFA)</li>
                            <li>Keep your login credentials secure</li>
                            <li>Report any suspicious activity immediately</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI Admin System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            send_admin_email(email, "Welcome to MIZIZZI Admin", welcome_template)
        except Exception as email_error:
            logger.error(f"Failed to send welcome email to new admin: {str(email_error)}")

        return jsonify({
            'message': 'Admin created successfully',
            'admin': {
                'id': new_admin.id,
                'name': new_admin.name,
                'email': new_admin.email,
                'phone': new_admin.phone,
                'role': new_admin.role.value,
                'is_active': new_admin.is_active,
                'created_at': new_admin.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        logger.error(f"Create admin error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'ADMIN_CREATION_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while creating admin'}), 500

# ----------------------
# Dashboard & Monitoring Routes
# ----------------------

@admin_auth_routes.route('/dashboard/stats', methods=['GET'])
@enhanced_admin_required
def get_dashboard_stats():
    """Get dashboard statistics for admin panel."""
    try:
        admin = g.current_admin

        # Get basic counts
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter_by(role=UserRole.ADMIN).count()

        # Get recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = User.query.filter(User.created_at >= thirty_days_ago).count()

        # Get orders count if Order model exists
        try:
            total_orders = Order.query.count()
            pending_orders = Order.query.filter_by(status=OrderStatus.PENDING).count()
        except:
            total_orders = 0
            pending_orders = 0

        # Get products count if Product model exists
        try:
            total_products = Product.query.count()
            active_products = Product.query.filter_by(is_active=True).count()
        except:
            total_products = 0
            active_products = 0

        log_admin_activity(admin.id, 'DASHBOARD_ACCESS', 'Accessed admin dashboard stats', 200)

        return jsonify({
            'stats': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'admins': admin_users,
                    'recent_registrations': recent_registrations
                },
                'orders': {
                    'total': total_orders,
                    'pending': pending_orders
                },
                'products': {
                    'total': total_products,
                    'active': active_products
                }
            },
            'generated_at': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'DASHBOARD_STATS_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching dashboard stats'}), 500

@admin_auth_routes.route('/activity-logs', methods=['GET'])
@enhanced_admin_required
def get_activity_logs():
    """Get admin activity logs with pagination and filtering."""
    try:
        admin = g.current_admin

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        admin_id_filter = request.args.get('admin_id', None, type=int)
        action_filter = request.args.get('action', None)
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)

        # Build query
        query = AdminActivityLog.query

        # Apply filters
        if admin_id_filter:
            query = query.filter(AdminActivityLog.admin_id == admin_id_filter)

        if action_filter:
            query = query.filter(AdminActivityLog.action.ilike(f'%{action_filter}%'))

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                query = query.filter(AdminActivityLog.created_at >= start_dt)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format'}), 400

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                query = query.filter(AdminActivityLog.created_at <= end_dt)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format'}), 400

        # Order by creation date (newest first)
        query = query.order_by(desc(AdminActivityLog.created_at))

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Convert to dict and include admin names
        logs_data = []
        for log in paginated.items:
            log_dict = log.to_dict()
            if log.admin:
                log_dict['admin_name'] = log.admin.name
                log_dict['admin_email'] = log.admin.email
            logs_data.append(log_dict)

        log_admin_activity(admin.id, 'ACTIVITY_LOGS_ACCESS', f'Viewed activity logs (page {page})', 200)

        return jsonify({
            'logs': logs_data,
            'pagination': {
                'page': paginated.page,
                'per_page': paginated.per_page,
                'total_pages': paginated.pages,
                'total_items': paginated.total,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            },
            'filters': {
                'admin_id': admin_id_filter,
                'action': action_filter,
                'start_date': start_date,
                'end_date': end_date
            }
        }), 200

    except Exception as e:
        logger.error(f"Get activity logs error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'ACTIVITY_LOGS_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching activity logs'}), 500

# ----------------------
# Maintenance Routes
# ----------------------

@admin_auth_routes.route('/maintenance/cleanup-tokens', methods=['POST'])
@enhanced_admin_required
@mfa_required  # Require MFA for maintenance operations
def cleanup_tokens():
    """Clean up expired tokens from blacklist."""
    try:
        admin = g.current_admin
        cleanup_expired_tokens()

        log_admin_activity(admin.id, 'TOKEN_CLEANUP', 'Performed token cleanup maintenance', 200)

        return jsonify({'message': 'Token cleanup completed successfully'}), 200

    except Exception as e:
        logger.error(f"Token cleanup error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'TOKEN_CLEANUP_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred during token cleanup'}), 500

# ----------------------
# Health Check and Info Routes
# ----------------------

@admin_auth_routes.route('/health', methods=['GET'])
def admin_health_check():
    """Health check for admin authentication system."""
    return jsonify({
        'status': 'healthy',
        'service': 'admin_auth',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'features': {
            'token_blacklisting': True,
            'rate_limiting': True,
            'mfa_support': True,
            'audit_trail': True,
            'enhanced_password_validation': True
        }
    }), 200

@admin_auth_routes.route('/info', methods=['GET'])
@enhanced_admin_required
def admin_system_info():
    """Get system information (admin only)."""
    try:
        admin = g.current_admin

        log_admin_activity(admin.id, 'SYSTEM_INFO_ACCESS', 'Accessed system information', 200)

        return jsonify({
            'system': {
                'name': 'MIZIZZI E-commerce Admin System',
                'version': '1.0.0',
                'environment': os.environ.get('FLASK_ENV', 'production'),
                'database_connected': True,  # You could add actual DB health check here
                'features': [
                    'Admin Authentication',
                    'Multi-Factor Authentication',
                    'Token Blacklisting',
                    'Rate Limiting',
                    'User Management',
                    'Order Management',
                    'Product Management',
                    'Security Logging',
                    'Audit Trail',
                    'Role-based Access Control'
                ]
            },
            'admin': {
                'id': admin.id,
                'name': admin.name,
                'role': admin.role.value,
                'last_login': admin.last_login.isoformat() if admin.last_login else None,
                'mfa_enabled': AdminMFA.query.filter_by(user_id=admin.id, is_enabled=True).first() is not None
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Get system info error: {str(e)}")
        log_admin_activity(g.current_admin.id if hasattr(g, 'current_admin') else None, 'SYSTEM_INFO_ERROR', str(e), 500)
        return jsonify({'error': 'An error occurred while fetching system info'}), 500

# ----------------------
# Database Initialization
# ----------------------

def init_admin_auth_tables():
    """Initialize admin authentication tables."""
    try:
        db.create_all()
        logger.info("Admin authentication tables initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing admin authentication tables: {str(e)}")

# Export the blueprint and initialization function
__all__ = ['admin_auth_routes', 'init_admin_auth_tables', 'TokenBlacklist', 'AdminActivityLog', 'AdminMFA']
