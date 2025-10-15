"""
Route validation integration for Mizizzi E-commerce platform.
Applies validation to routes.
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
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, render_template_string, url_for, redirect
from flask_cors import cross_origin
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies
)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func
from ...configuration.extensions import db, ma, mail, cache, cors

# JWT
import jwt

# Google OAuth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# HTTP Requests
import requests

# Models
from ...models.models import (
    User, UserRole, Category, Product, ProductVariant, Brand, Review,
    CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
    OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
    ProductImage
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
from ...validations.validation import (
    validate_user_registration, validate_user_login, validate_user_update,
    validate_address_creation, validate_address_update,
    validate_product_creation, validate_product_update,
    validate_product_variant_creation, validate_product_variant_update,
    validate_cart_item_addition, validate_cart_item_update,
    validate_order_creation, validate_order_status_update,
    validate_payment_creation, validate_mpesa_payment,
    validate_review_creation, validate_review_update,
    admin_required
)

# SendGrid
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
from ..cart.cart_routes import cart_routes

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprints
validation_routes = Blueprint('validation_routes', __name__)
# Make sure the url_prefix is correct
# Remove or comment out the cart routes import and registration
# from ..cart.cart_routes import cart_routes as cart_blueprint
# validation_routes.register_blueprint(cart_blueprint, url_prefix='/cart')


# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": schema.dump(paginated.items),
        "pagination": {
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total
        }
    }

# Helper functions
def send_email(to, subject, template):
    """Send email using Brevo API directly since we know it works."""
    try:
        # Get the Brevo API key from configuration
        brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')
        sender_email = current_app.config.get('BREVO_SENDER_EMAIL', 'REDACTED-SENDER-EMAIL')

        if not brevo_api_key:
            logger.error("BREVO_API_KEY not configured")
            return False

        url = "https://api.brevo.com/v3/smtp/email"

        # Prepare the payload for Brevo API
        payload = {
            "sender": {
                "name": "MIZIZZI",
                "email": sender_email  # Use the verified sender email from config or fallback
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

        logger.info(f"Sending test email via Brevo API to {to} from {sender_email}")
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Test email sent via Brevo API. Status: {response.status_code}")
            return True
        else:
            logger.error(f"Failed to send email via Brevo API. Status: {response.status_code}. Response: {response.text}")
            # Attach the error message to the Flask global context for debugging
            g.brevo_error = response.text
            return False

    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        g.brevo_error = str(e)
        return False

def send_sms(phone_number, message):
    try:
        # Using Twilio for SMS
        account_sid = current_app.config['TWILIO_ACCOUNT_SID']
        auth_token = current_app.config['TWILIO_AUTH_TOKEN']
        from_number = current_app.config['TWILIO_PHONE_NUMBER']

        url = f'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json'
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
            return True
        else:
            logger.error(f"SMS API Error: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error sending SMS: {str(e)}")
        return False

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def validate_password(password):
    # Simplified password validation for Kenyan users
    # Only requires minimum length and at least one number
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"

    return True, "Password meets requirements"

def is_valid_phone(phone):
    # Kenyan phone number validation
    # Supports formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX

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
    # Standardize Kenyan phone numbers to international format +254XXXXXXXXX

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
    """
    Generate a CSRF token.

    Args:
        encoded_token: Optional JWT token to extract user info from

    Returns:
        A CSRF token string
    """
    try:
        # Generate a random token regardless of whether encoded_token is provided
        return secrets.token_hex(16)
    except Exception as e:
        logger.error(f"Error generating CSRF token with secrets: {str(e)}")
        # Fallback to uuid if secrets fails
        return str(uuid.uuid4()).replace('-', '')

@validation_routes.route('/auth/csrf', methods=["POST", "OPTIONS"])
@cross_origin()
@jwt_required(optional=True)
def get_csrf():
    """Get CSRF token."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        return response

    try:
        # Generate a CSRF token using the fixed function
        csrf_token = get_csrf_token()

        return jsonify({"csrf_token": csrf_token}), 200
    except Exception as e:
        current_app.logger.error(f"Error generating CSRF token: {str(e)}")
        return jsonify({"error": "Failed to generate CSRF token", "details": str(e)}), 500

# Registration route
@validation_routes.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        logger.info(f"Registration attempt with data: {data}")

        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')

        # Basic validation
        if not name or not password:
            return jsonify({'msg': 'Name and password are required'}), 400

        if not email and not phone:
            return jsonify({'msg': 'Either email or phone is required'}), 400

        # Validate password
        is_valid, password_msg = validate_password(password)
        if not is_valid:
            return jsonify({'msg': password_msg}), 400

        # Check if user already exists
        if email:
            try:
                # Validate email format
                valid_email = validate_email(email)
                email = valid_email.email
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    return jsonify({'msg': 'User with this email already exists'}), 409
            except EmailNotValidError:
                return jsonify({'msg': 'Invalid email format'}), 400

        if phone:
            if not is_valid_phone(phone):
                return jsonify({'msg': 'Invalid phone number format'}), 400

            existing_user = User.query.filter_by(phone=phone).first()
            if existing_user:
                return jsonify({'msg': 'User with this phone number already exists'}), 409

        # Generate verification code
        verification_code = generate_otp()

        # Create new user
        new_user = User(
            name=name,
            email=email if email else None,
            phone=standardize_phone_number(phone) if phone else None,
            is_active=True,
            created_at=datetime.utcnow()
        )

        # Set password
        new_user.set_password(password)

        # Add user to database first
        db.session.add(new_user)
        db.session.commit()

        # Determine if email or phone is used for verification
        is_email = email and '@' in email

        # Set verification code after user is committed to database
        new_user.verification_code = verification_code
        new_user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()

        # Log the verification code for debugging
        logger.info(f"Verification code set for user {new_user.id}: {verification_code}")

        # Send verification based on provided contact method
        if email:
            verification_link = url_for(
                'validation_routes.verify_email',
                token=create_access_token(identity=email, expires_delta=timedelta(hours=24)),
                _external=True
            )

            # Ultra-premium luxury email template with modern design
            email_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your MIZIZZI Account</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * {{
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }}

                    body {{
                        font-family: 'Poppins', sans-serif;
                        background-color: #f5f5f5;
                        color: #333;
                        line-height: 1.6;
                    }}

                    .email-wrapper {{
                        max-width: 650px;
                        margin: 0 auto;
                        background: #ffffff;
                        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                    }}

                    .email-header {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }}

                    .email-header::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.1;
                        z-index: 0;
                    }}

                    .email-header-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .logo {{
                        margin-bottom: 15px;
                    }}

                    .logo img {{
                        height: 60px;
                    }}

                    .email-header h1 {{
                        font-family: 'Cormorant Garamond', serif;
                        color: #ffffff;
                        font-size: 32px;
                        font-weight: 700;
                        margin: 0;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }}

                    .email-header p {{
                        color: rgba(255,255,255,0.8);
                        font-size: 14px;
                        margin-top: 5px;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }}

                    .email-body {{
                        padding: 50px 40px;
                        background: #ffffff;
                    }}

                    .greeting {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 26px;
                        color: #000000;
                        margin-bottom: 25px;
                        font-weight: 600;
                        border-bottom: 1px solid #f0f0f0;
                        padding-bottom: 15px;
                    }}

                    .message {{
                        margin-bottom: 35px;
                        color: #333;
                        font-size: 16px;
                        font-weight: 300;
                        line-height: 1.8;
                    }}

                    .message strong {{
                        font-weight: 500;
                        color: #000;
                    }}

                    .verification-box {{
                        background: linear-gradient(to right, #f9f9f9, #ffffff);
                        border: 1px solid #e0e0e0;
                        border-left: 4px solid #000000;
                        padding: 30px;
                        margin-bottom: 35px;
                        border-radius: 2px;
                        box-shadow: 0 3px 15px rgba(0,0,0,0.05);
                    }}

                    .verification-box h2 {{
                        font-family: 'Cormorant Garamond', serif;
                        color: #000000;
                        font-size: 22px;
                        margin-bottom: 20px;
                        font-weight: 600;
                    }}

                    .code-display {{
                        background-color: #ffffff;
                        border: 1px solid #e0e0e0;
                        border-radius: 2px;
                        padding: 20px;
                        text-align: center;
                        margin: 25px 0;
                        letter-spacing: 8px;
                        font-size: 36px;
                        font-weight: 600;
                        color: #000000;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.03);
                    }}

                    .button-container {{
                        text-align: center;
                        margin: 35px 0;
                    }}

                    .button {{
                        display: inline-block;
                        background-color: #000000;
                        color: #ffffff !important;
                        text-decoration: none;
                        padding: 16px 35px;
                        border-radius: 2px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    }}

                    .button:hover {{
                        background-color: #333333;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
                    }}

                    .note {{
                        margin-top: 30px;
                        font-size: 14px;
                        color: #666;
                        font-style: italic;
                        background-color: #f9f9f9;
                        padding: 15px;
                        border-radius: 2px;
                    }}

                    .signature {{
                        margin-top: 40px;
                        border-top: 1px solid #f0f0f0;
                        padding-top: 20px;
                    }}

                    .signature p {{
                        margin: 0;
                        line-height: 1.6;
                    }}

                    .signature .team {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 20px;
                        color: #000000;
                        font-weight: 600;
                        margin-top: 5px;
                    }}

                    .email-footer {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                    }}

                    .email-footer::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.05;
                        z-index: 0;
                    }}

                    .footer-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .social-links {{
                        margin-bottom: 25px;
                    }}

                    .social-links a {{
                        display: inline-block;
                        margin: 0 10px;
                        color: rgba(255,255,255,0.8);
                        text-decoration: none;
                        font-size: 14px;
                        transition: color 0.3s ease;
                    }}

                    .social-links a:hover {{
                        color: #ffffff;
                    }}

                    .divider {{
                        height: 1px;
                        background-color: rgba(255,255,255,0.1);
                        margin: 20px 0;
                    }}

                    .footer-links {{
                        margin-bottom: 20px;
                    }}

                    .footer-links a {{
                        color: rgba(255,255,255,0.7);
                        text-decoration: none;
                        margin: 0 10px;
                        font-size: 13px;
                        transition: color 0.3s ease;
                    }}

                    .footer-links a:hover {{
                        color: #ffffff;
                    }}

                    .copyright {{
                        color: rgba(255,255,255,0.5);
                        font-size: 12px;
                    }}

                    .highlight {{
                        color: #000000;
                        font-weight: 500;
                    }}

                    .expiry-notice {{
                        display: inline-block;
                        background-color: rgba(0,0,0,0.05);
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-size: 13px;
                        margin-top: 10px;
                    }}

                    @media only screen and (max-width: 650px) {{
                        .email-body {{
                            padding: 30px 20px;
                        }}

                        .verification-box {{
                            padding: 20px;
                        }}

                        .code-display {{
                            font-size: 28px;
                            letter-spacing: 6px;
                        }}

                        .greeting {{
                            font-size: 22px;
                        }}
                    }}
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="email-header">
                        <div class="email-header-content">
                            <div class="logo">
                                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" onerror="this.style.display='none'">
                            </div>
                            <h1>MIZIZZI</h1>
                            <p>LUXURY SHOPPING EXPERIENCE</p>
                        </div>
                    </div>

                    <div class="email-body">
                        <div class="greeting">Welcome, {name}</div>

                        <div class="message">
                            Thank you for joining the <strong>MIZIZZI</strong> community. We're thrilled to have you as part of our exclusive shopping experience. To activate your account and unlock all premium features, please verify your email address.
                        </div>

                        <div class="verification-box">
                            <h2>Email Verification</h2>
                            <p>Please use the verification code below to complete your registration:</p>
                            <div class="code-display">{verification_code}</div>
                            <p class="expiry-notice">This verification code will expire in 10 minutes</p>
                        </div>

                        <div class="button-container">
                            <a href="{verification_link}" class="button">VERIFY EMAIL</a>
                        </div>

                        <p class="note">
                            If you did not create an account with MIZIZZI, please disregard this email or contact our customer support if you have any concerns about your account security.
                        </p>

                        <div class="signature">
                            <p>With appreciation,</p>
                            <p class="team">The MIZIZZI Team</p>
                        </div>
                    </div>

                    <div class="email-footer">
                        <div class="footer-content">
                            <div class="social-links">
                                <a href="https://www.facebook.com/mizizzi">Facebook</a>
                                <a href="https://www.instagram.com/mizizzi">Instagram</a>
                                <a href="https://www.twitter.com/mizizzi">Twitter</a>
                                <a href="https://www.pinterest.com/mizizzi">Pinterest</a>
                            </div>

                            <div class="divider"></div>

                            <div class="footer-links">
                                <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                                <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                                <a href="https://www.mizizzi.com/help">Help Center</a>
                                <a href="https://www.mizizzi.com/contact">Contact Us</a>
                            </div>

                            <p class="copyright">
                                &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            email_sent = send_email(email, "Verify Your MIZIZZI Email", email_template)
            if not email_sent:
                # Return Brevo error details in development mode
                if os.environ.get('FLASK_ENV') == 'development':
                    return jsonify({'msg': 'Failed to send verification email. Please try again.', 'brevo_error': getattr(g, 'brevo_error', None)}), 500
                return jsonify({'msg': 'Failed to send verification email. Please try again.'}), 500

            return jsonify({
                'msg': 'User registered successfully. Please check your email for verification.',
                'user_id': new_user.id
            }, 201)

        elif 'phone' in locals() and phone:
            sms_message = f"Your MIZIZZI verification code is: {verification_code}. This code will expire in 10 minutes."
            sms_sent = send_sms(phone, sms_message)

            if not sms_sent:
                if 'new_user' in locals():
                    if 'new_user' in locals():
                        db.session.delete(new_user)
                db.session.commit()
                return jsonify({'msg': 'Failed to send SMS verification. Please try again.'}), 500

            return jsonify({
                'msg': 'User registered successfully. Please check your phone for verification code.',
                'user_id': new_user.id
            }, 201)

    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        # Return more detailed error information in development
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({
                'msg': f'Registration error: {str(e)}',
                'error_type': type(e).__name__
            }), 500
        else:
            return jsonify({'msg': 'An error occurred during registration'}), 500

# Add this function to expose the register route to be called from app.py
def handle_register():
    return register()

# Email verification route (via link)
@validation_routes.route('/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token')

    if not token:
        return jsonify({'msg': 'No token provided'}), 400

    try:
        # Decode the token
        decoded_token = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )

        # Extract email from token
        email = decoded_token['sub']

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Mark email as verified
        user.email_verified = True
        db.session.commit()

        # Create tokens for the verified user
        additional_claims = {"role": user.role.value}
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        # Generate CSRF token
        csrf_token = get_csrf_token()

        # Create the frontend URL with the tokens as query parameters
        frontend_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token={token}"

        # Check if the request wants JSON (API client) or HTML (browser)
        if request.headers.get('Accept') == 'application/json':
            # Return JSON response with tokens for API clients
            return jsonify({
                'msg': 'Email verified successfully',
                'verified': True,
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token,
                'csrf_token': csrf_token
            }), 200
        else:
            # For browser requests, redirect to the frontend with tokens in query params
            redirect_url = f"{frontend_url}&access_token={access_token}&refresh_token={refresh_token}&csrf_token={csrf_token}"
            return redirect(redirect_url)

    except jwt.ExpiredSignatureError:
        return jsonify({'msg': 'Verification link expired'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'msg': 'Invalid verification token'}), 400
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        return jsonify({'msg': 'An error occurred during email verification'}), 500

# Manual verification route (for OTPs)
@validation_routes.route('/verify-code', methods=['POST'])
def verify_code():
    try:
        data = request.get_json()

        user_id = data.get('user_id')
        code = data.get('code')
        is_phone = data.get('is_phone', False)

        if not user_id or not code:
            return jsonify({'msg': 'User ID and verification code are required'}), 400

        # Find user
        user = User.query.get(user_id)

        if not user:
            logger.error(f"User not found: {user_id}")
            return jsonify({'msg': 'User not found'}), 404

        # Log verification attempt
        logger.info(f"Verification attempt for user {user_id}, code: {code}, stored code: {user.verification_code}, expires: {user.verification_code_expires}")

        # Verify code
        if not user.verification_code or not user.verification_code_expires:
            logger.error(f"No verification code set for user {user_id}")
            return jsonify({'msg': 'No verification code set for this user'}), 400

        # Check if code has expired
        if datetime.utcnow() > user.verification_code_expires:
            logger.error(f"Verification code expired for user {user_id}. Expired at: {user.verification_code_expires}")
            return jsonify({'msg': 'Verification code has expired'}), 400

        # Check if code matches
        if user.verification_code != code:
            logger.error(f"Invalid verification code for user {user_id}. Expected: {user.verification_code}, Got: {code}")
            return jsonify({'msg': 'Invalid verification code'}), 400

        # Mark verification status based on contact method
        if is_phone:
            user.phone_verified = True
        else:
            user.email_verified = True

        # Clear the verification code after successful verification
        user.verification_code = None
        user.verification_code_expires = None

        db.session.commit()
        logger.info(f"Verification successful for user {user_id}")

        # Create tokens for the verified user (just like login)
        try:
            # Ensure user.id is properly converted to string for JWT
            user_id_str = str(user.id)
            logger.info(f"Generating tokens for user ID: {user_id_str}")

            # Create role claim safely
            try:
                role_value = user.role.value
                logger.info(f"User role: {role_value}")
                additional_claims = {"role": role_value}
            except Exception as role_error:
                logger.warning(f"Error getting role value: {str(role_error)}, using default")
                additional_claims = {"role": "user"}

            # Generate tokens with proper error handling
            try:
                access_token = create_access_token(identity=user_id_str, additional_claims=additional_claims)
                logger.info("Access token generated successfully")
            except Exception as access_error:
                logger.error(f"Error creating access token: {str(access_error)}")
                raise

            try:
                refresh_token = create_refresh_token(identity=user_id_str, additional_claims=additional_claims)
                logger.info("Refresh token generated successfully")
            except Exception as refresh_error:
                logger.error(f"Error creating refresh token: {str(refresh_error)}")
                raise

            # Generate CSRF token safely
            try:
                csrf_token = secrets.token_hex(16)
                logger.info("CSRF token generated successfully")
            except Exception as csrf_error:
                logger.error(f"Error generating CSRF token: {str(csrf_error)}")
                csrf_token = str(uuid.uuid4())  # Fallback

            # Create response with tokens
            resp = jsonify({
                'msg': 'Verification successful',
                'verified': True,
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token,
                'csrf_token': csrf_token
            })

            # Set cookies with proper error handling
            try:
                # Use secure=False for local development
                resp.set_cookie("access_token_cookie", access_token, httponly=True, secure=False, samesite="Lax")
                resp.set_cookie("refresh_token_cookie", refresh_token, httponly=True, secure=False, samesite="Lax")
                resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=False, samesite="Lax")
                logger.info("Cookies set successfully")
            except Exception as cookie_error:
                logger.warning(f"Could not set cookies: {str(cookie_error)}")
                # Continue even if cookie setting fails

            return resp, 200
        except Exception as token_error:
            logger.error(f"Error generating tokens after verification: {str(token_error)}", exc_info=True)
            # Return tokens in JSON even if cookie setting fails
            return jsonify({
                'msg': 'Verification successful',
                'verified': True,
                'user': user.to_dict(),
                'access_token': access_token if 'access_token' in locals() else None,
                'refresh_token': refresh_token if 'refresh_token' in locals() else None,
                'csrf_token': csrf_token if 'csrf_token' in locals() else None,
                'error': str(token_error)
            }), 200

    except Exception as e:
        logger.error(f"Code verification error: {str(e)}", exc_info=True)
        return jsonify({'msg': f'An error occurred during verification: {str(e)}'}), 500

# Resend verification code
@validation_routes.route('/resend-verification', methods=['POST'])
def resend_verification():
    try:
        data = request.get_json()

        identifier = data.get('identifier')  # can be email or phone

        if not identifier:
            return jsonify({'msg': 'Email or phone number is required'}), 400

        # Check if it's an email or phone
        is_email = '@' in identifier

        # Find user
        if is_email:
            user = User.query.filter_by(email=identifier).first()
        else:
            user = User.query.filter_by(phone=identifier).first()

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Generate new verification code
        verification_code = generate_otp()

        # Set verification code directly
        user.verification_code = verification_code
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)

        # Ensure changes are committed
        try:
            db.session.commit()
            logger.info(f"New verification code set for user {user.id}: {verification_code}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to commit verification code: {str(e)}")
            return jsonify({'msg': 'Failed to generate verification code'}), 500

        # Send verification based on contact method
        if is_email:
            verification_link = url_for(
                'validation_routes.verify_email',
                token=create_access_token(identity=identifier, expires_delta=timedelta(hours=24)),
                _external=True
            )

            # Ultra-premium luxury email template for resending verification
            email_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your MIZIZZI Account</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * {{
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }}

                    body {{
                        font-family: 'Poppins', sans-serif;
                        background-color: #f5f5f5;
                        color: #333;
                        line-height: 1.6;
                    }}

                    .email-wrapper {{
                        max-width: 650px;
                        margin: 0 auto;
                        background: #ffffff;
                        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                    }}

                    .email-header {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }}

                    .email-header::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.1;
                        z-index: 0;
                    }}

                    .email-header-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .logo {{
                        margin-bottom: 15px;
                    }}

                    .logo img {{
                        height: 60px;
                    }}

                    .email-header h1 {{
                        font-family: 'Cormorant Garamond', serif;
                        color: #ffffff;
                        font-size: 32px;
                        font-weight: 700;
                        margin: 0;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }}

                    .email-header p {{
                        color: rgba(255,255,255,0.8);
                        font-size: 14px;
                        margin-top: 5px;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }}

                    .email-body {{
                        padding: 50px 40px;
                        background: #ffffff;
                    }}

                    .greeting {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 26px;
                        color: #000000;
                        margin-bottom: 25px;
                        font-weight: 600;
                        border-bottom: 1px solid #f0f0f0;
                        padding-bottom: 15px;
                    }}

                    .message {{
                        margin-bottom: 35px;
                        color: #333;
                        font-size: 16px;
                        font-weight: 300;
                        line-height: 1.8;
                    }}

                    .message strong {{
                        font-weight: 500;
                        color: #000;
                    }}

                    .verification-box {{
                        background: linear-gradient(to right, #f9f9f9, #ffffff);
                        border: 1px solid #e0e0e0;
                        border-left: 4px solid #000000;
                        padding: 30px;
                        margin-bottom: 35px;
                        border-radius: 2px;
                        box-shadow: 0 3px 15px rgba(0,0,0,0.05);
                    }}

                    .verification-box h2 {{
                        font-family: 'Cormorant Garamond', serif;
                        color: #000000;
                        font-size: 22px;
                        margin-bottom: 20px;
                        font-weight: 600;
                    }}

                    .code-display {{
                        background-color: #ffffff;
                        border: 1px solid #e0e0e0;
                        border-radius: 2px;
                        padding: 20px;
                        text-align: center;
                        margin: 25px 0;
                        letter-spacing: 8px;
                        font-size: 36px;
                        font-weight: 600;
                        color: #000000;
                        box-shadow: 0 3px 10px rgba(0,0,0,0.03);
                    }}

                    .button-container {{
                        text-align: center;
                        margin: 35px 0;
                    }}

                    .button {{
                        display: inline-block;
                        background-color: #000000;
                        color: #ffffff !important;
                        text-decoration: none;
                        padding: 16px 35px;
                        border-radius: 2px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    }}

                    .button:hover {{
                        background-color: #333333;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
                    }}

                    .note {{
                        margin-top: 30px;
                        font-size: 14px;
                        color: #666;
                        font-style: italic;
                        background-color: #f9f9f9;
                        padding: 15px;
                        border-radius: 2px;
                    }}

                    .signature {{
                        margin-top: 40px;
                        border-top: 1px solid #f0f0f0;
                        padding-top: 20px;
                    }}

                    .signature p {{
                        margin: 0;
                        line-height: 1.6;
                    }}

                    .signature .team {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 20px;
                        color: #000000;
                        font-weight: 600;
                        margin-top: 5px;
                    }}

                    .email-footer {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                    }}

                    .email-footer::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.05;
                        z-index: 0;
                    }}

                    .footer-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .social-links {{
                        margin-bottom: 25px;
                    }}

                    .social-links a {{
                        display: inline-block;
                        margin: 0 10px;
                        color: rgba(255,255,255,0.8);
                        text-decoration: none;
                        font-size: 14px;
                        transition: color 0.3s ease;
                    }}

                    .social-links a:hover {{
                        color: #ffffff;
                    }}

                    .divider {{
                        height: 1px;
                        background-color: rgba(255,255,255,0.1);
                        margin: 20px 0;
                    }}

                    .footer-links {{
                        margin-bottom: 20px;
                    }}

                    .footer-links a {{
                        color: rgba(255,255,255,0.7);
                        text-decoration: none;
                        margin: 0 10px;
                        font-size: 13px;
                        transition: color 0.3s ease;
                    }}

                    .footer-links a:hover {{
                        color: #ffffff;
                    }}

                    .copyright {{
                        color: rgba(255,255,255,0.5);
                        font-size: 12px;
                    }}

                    .highlight {{
                        color: #000000;
                        font-weight: 500;
                    }}

                    .expiry-notice {{
                        display: inline-block;
                        background-color: rgba(0,0,0,0.05);
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-size: 13px;
                        margin-top: 10px;
                    }}

                    @media only screen and (max-width: 650px) {{
                        .email-body {{
                            padding: 30px 20px;
                        }}

                        .verification-box {{
                            padding: 20px;
                        }}

                        .code-display {{
                            font-size: 28px;
                            letter-spacing: 6px;
                        }}

                        .greeting {{
                            font-size: 22px;
                        }}
                    }}
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="email-header">
                        <div class="email-header-content">
                            <div class="logo">
                                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" onerror="this.style.display='none'">
                            </div>
                            <h1>MIZIZZI</h1>
                            <p>LUXURY SHOPPING EXPERIENCE</p>
                        </div>
                    </div>

                    <div class="email-body">
                        <div class="greeting">Hello, {user.name}</div>

                        <div class="message">
                            You recently requested a new verification code for your <strong>MIZIZZI</strong> account. We've generated a new code for you to complete your account verification.
                        </div>

                        <div class="verification-box">
                            <h2>New Verification Code</h2>
                            <p>Please use the verification code below to complete your account verification:</p>
                            <div class="code-display">{verification_code}</div>
                            <p class="expiry-notice">This verification code will expire in 10 minutes</p>
                        </div>

                        <div class="button-container">
                            <a href="{verification_link}" class="button">VERIFY EMAIL</a>
                        </div>

                        <p class="note">
                            If you did not request this verification code, please disregard this email or contact our customer support if you have any concerns about your account security.
                        </p>

                        <div class="signature">
                            <p>With appreciation,</p>
                            <p class="team">The MIZIZZI Team</p>
                        </div>
                    </div>

                    <div class="email-footer">
                        <div class="footer-content">
                            <div class="social-links">
                                <a href="https://www.facebook.com/mizizzi">Facebook</a>
                                <a href="https://www.instagram.com/mizizzi">Instagram</a>
                                <a href="https://www.twitter.com/mizizzi">Twitter</a>
                                <a href="https://www.pinterest.com/mizizzi">Pinterest</a>
                            </div>

                            <div class="divider"></div>

                            <div class="footer-links">
                                <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                                <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                                <a href="https://www.mizizzi.com/help">Help Center</a>
                                <a href="https://www.mizizzi.com/contact">Contact Us</a>
                            </div>

                            <p class="copyright">
                                &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            email_sent = send_email(identifier, "Verify Your MIZIZZI Email", email_template)
            if not email_sent:
                # Return Brevo error details in development mode
                if os.environ.get('FLASK_ENV') == 'development':
                    return jsonify({'msg': 'Failed to send verification email. Please try again.', 'brevo_error': getattr(g, 'brevo_error', None)}), 500
                return jsonify({'msg': 'Failed to send verification email. Please try again.'}), 500

            return jsonify({
                'msg': 'Verification email sent successfully',
                'user_id': user.id,
                'email': identifier
            }), 200

        elif 'phone' in data and data.get('phone'):
            phone = data.get('phone')
            sms_message = f"Your MIZIZZI verification code is: {verification_code}. This code will expire in 10 minutes."
            sms_sent = send_sms(identifier, sms_message)

            if not sms_sent:
                return jsonify({'msg': 'Failed to send SMS verification. Please try again.'}), 500

            return jsonify({
                'user_id': user.id,
                'phone': identifier
            }), 200

    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        return jsonify({'msg': 'An error occurred while resending verification'}), 500

# Login route
@validation_routes.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        identifier = data.get('identifier')  # can be email or phone
        password = data.get('password')

        if not identifier or not password:
            return jsonify({'msg': 'Identifier (email/phone) and password are required'}), 400

        # Check if identifier is email or phone
        is_email = '@' in identifier

        # Find user
        if is_email:
            user = User.query.filter_by(email=identifier).first()
        else:
            user = User.query.filter_by(phone=identifier).first()

        # Check if user exists and password is correct
        if not user or not user.verify_password(password):
            return jsonify({'msg': 'Invalid credentials'}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'msg': 'Account is deactivated. Please contact support.'}), 403

        # Check if user is verified
        if is_email and not user.email_verified:
            return jsonify({'msg': 'Email not verified', 'user_id': user.id, 'verification_required': True}), 403

        if not is_email and not user.phone_verified:
            return jsonify({'msg': 'Phone number not verified', 'user_id': user.id, 'verification_required': True}), 403

        # Create tokens
        additional_claims = {"role": user.role.value}
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        # Generate CSRF token
        csrf_token = get_csrf_token()

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Create response with tokens
        resp = jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'csrf_token': csrf_token,
            'user': user.to_dict()
        })

        # Set cookies for tokens - use secure=False for local development
        try:
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)
            # Use secure=False for local development
            resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=False, samesite="Lax")
            logger.info("Cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set cookies: {str(e)}")
            # Continue even if cookie setting fails

        return resp, 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'msg': 'An error occurred during login'}), 500

# Google login
@validation_routes.route('/google-login', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({'msg': 'Google token is required'}), 400

        # Verify the token
        try:
            # Client ID from your Google console
            client_id = current_app.config.get('GOOGLE_CLIENT_ID')

            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id
            )

            # Get user info from the token
            google_id = idinfo['sub']
            email = idinfo['email']
            name = idinfo.get('name', '')

            # Check if it's a verified email
            if not idinfo.get('email_verified', False):
                return jsonify({'msg': 'Google email not verified'}), 400

        except ValueError:
            # Invalid token
            return jsonify({'msg': 'Invalid Google token'}), 400

        # Check if user exists by email
        user = User.query.filter_by(email=email).first()

        if user:
            # User exists, update Google information
            user.is_google_user = True
            user.email_verified = True
            user.last_login = datetime.utcnow()
            db.session.commit()
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                is_google_user=True,
                email_verified=True,
                is_active=True,
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow()
            )

            # Set a random password (not used for Google users)
            random_password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16))
            user.set_password(random_password)

            db.session.add(user)
            db.session.commit()

        # Create tokens with role claim
        additional_claims = {"role": user.role.value}
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        # Generate CSRF token
        csrf_token = get_csrf_token()

        # Create response with tokens
        resp = jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'csrf_token': csrf_token,
            'user': user.to_dict()
        })

        # Set cookies for tokens - use secure=False for local development
        try:
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)
            # Use secure=False for local development
            resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=False, samesite="Lax")
            logger.info("Cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set cookies: {str(e)}")
            # Continue even if cookie setting fails

        return resp, 200

    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        return jsonify({'msg': 'An error occurred during Google login'}), 500

# Request password reset
@validation_routes.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Log the attempt
        logger.info(f"Password reset requested for email: {email}")

        # Find user
        user = User.query.filter_by(email=email).first()

        # For security reasons, always return success even if user not found
        if not user:
            logger.info(f"User not found for email: {email}, but returning success for security")
            return jsonify({'message': 'If your email is registered, you will receive a password reset link shortly'}), 200

        # Generate reset token (valid for 30 minutes)
        reset_token = create_access_token(
            identity=email,
            expires_delta=timedelta(minutes=30),
            additional_claims={"purpose": "password_reset"}
        )

        # Create reset link
        reset_link = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token={reset_token}"

        logger.info(f"Reset link generated: {reset_link}")

        # Ultra-premium luxury email template for password reset
        reset_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your MIZIZZI Password</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}

                body {{
                    font-family: 'Poppins', sans-serif;
                    background-color: #f5f5f5;
                    color: #333;
                    line-height: 1.6;
                }}

                .email-wrapper {{
                    max-width: 650px;
                    margin: 0 auto;
                    background: #ffffff;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                }}

                .email-header {{
                    background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                    padding: 40px 20px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }}

                .email-header::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: url('https://i.imgur.com/8YsGZmd.png');
                    background-size: cover;
                    opacity: 0.1;
                    z-index: 0;
                }}

                .email-header-content {{
                    position: relative;
                    z-index: 1;
                }}

                .logo {{
                    margin-bottom: 15px;
                }}

                .logo img {{
                    height: 60px;
                }}

                .email-header h1 {{
                    font-family: 'Cormorant Garamond', serif;
                    color: #ffffff;
                    font-size: 32px;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }}

                .email-header p {{
                    color: rgba(255,255,255,0.8);
                    font-size: 14px;
                    margin-top: 5px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }}

                .email-body {{
                    padding: 50px 40px;
                    background: #ffffff;
                }}

                .greeting {{
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 26px;
                    color: #000000;
                    margin-bottom: 25px;
                    font-weight: 600;
                    border-bottom: 1px solid #f0f0f0;
                    padding-bottom: 15px;
                }}

                .message {{
                    margin-bottom: 35px;
                    color: #333;
                    font-size: 16px;
                    font-weight: 300;
                    line-height: 1.8;
                }}

                .message strong {{
                    font-weight: 500;
                    color: #000;
                }}

                .reset-section {{
                    background: linear-gradient(to right, #f9f9f9, #ffffff);
                    border: 1px solid #e0e0e0;
                    border-left: 4px solid #000000;
                    padding: 30px;
                    margin-bottom: 35px;
                    border-radius: 2px;
                    box-shadow: 0 3px 15px rgba(0,0,0,0.05);
                }}

                .reset-section h2 {{
                    font-family: 'Cormorant Garamond', serif;
                    color: #000000;
                    font-size: 22px;
                    margin-bottom: 20px;
                    font-weight: 600;
                }}

                .button-container {{
                    text-align: center;
                    margin: 35px 0;
                }}

                .button {{
                    display: inline-block;
                    background-color: #000000;
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 16px 35px;
                    border-radius: 2px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }}

                .button:hover {{
                    background-color: #333333;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
                }}

                .warning {{
                    background-color: #fff8f8;
                    border-left: 4px solid #ff6b6b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 2px;
                }}

                .warning strong {{
                    color: #e74c3c;
                    display: block;
                    margin-bottom: 10px;
                    font-size: 16px;
                }}

                .note {{
                    margin-top: 30px;
                    font-size: 14px;
                    color: #666;
                    font-style: italic;
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 2px;
                }}

                .signature {{
                    margin-top: 40px;
                    border-top: 1px solid #f0f0f0;
                    padding-top: 20px;
                }}

                .signature p {{
                    margin: 0;
                    line-height: 1.6;
                }}

                .signature .team {{
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 20px;
                    color: #000000;
                    font-weight: 600;
                    margin-top: 5px;
                }}

                .email-footer {{
                    background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                    padding: 40px 20px;
                    text-align: center;
                    position: relative;
                }}

                .email-footer::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: url('https://i.imgur.com/8YsGZmd.png');
                    background-size: cover;
                    opacity: 0.05;
                    z-index: 0;
                }}

                .footer-content {{
                    position: relative;
                    z-index: 1;
                }}

                .social-links {{
                    margin-bottom: 25px;
                }}

                .social-links a {{
                    display: inline-block;
                    margin: 0 10px;
                    color: rgba(255,255,255,0.8);
                    text-decoration: none;
                    font-size: 14px;
                    transition: color 0.3s ease;
                }}

                .social-links a:hover {{
                    color: #ffffff;
                }}

                .divider {{
                    height: 1px;
                    background-color: rgba(255,255,255,0.1);
                    margin: 20px 0;
                }}

                .footer-links {{
                    margin-bottom: 20px;
                }}

                .footer-links a {{
                    color: rgba(255,255,255,0.7);
                    text-decoration: none;
                    margin: 0 10px;
                    font-size: 13px;
                    transition: color 0.3s ease;
                }}

                .footer-links a:hover {{
                    color: #ffffff;
                }}

                .copyright {{
                    color: rgba(255,255,255,0.5);
                    font-size: 12px;
                }}

                @media only screen and (max-width: 650px) {{
                    .email-body {{
                        padding: 30px 20px;
                    }}

                    .reset-section {{
                        padding: 20px;
                    }}

                    .greeting {{
                        font-size: 22px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-header">
                    <div class="email-header-content">
                        <div class="logo">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" onerror="this.style.display='none'">
                        </div>
                        <h1>MIZIZZI</h1>
                        <p>LUXURY SHOPPING EXPERIENCE</p>
                    </div>
                </div>

                <div class="email-body">
                    <div class="greeting">Hello, {user.name}</div>

                    <div class="message">
                        We received a request to reset the password for your <strong>MIZIZZI</strong> account. To proceed with resetting your password, please click the button below.
                    </div>

                    <div class="reset-section">
                        <h2>Reset Your Password</h2>
                        <p>For security reasons, this password reset link will expire in 30 minutes.</p>
                        <div class="button-container">
                            <a href="{reset_link}" class="button">RESET PASSWORD</a>
                        </div>
                    </div>

                    <div class="warning">
                        <strong>Important Security Notice</strong>
                        <p>If you did not request a password reset, please ignore this email or contact our support team immediately if you have concerns about your account security.</p>
                    </div>

                    <div class="signature">
                        <p>With appreciation,</p>
                        <p class="team">The MIZIZZI Team</p>
                    </div>
                </div>

                <div class="email-footer">
                    <div class="footer-content">
                        <div class="social-links">
                            <a href="https://www.facebook.com/mizizzi">Facebook</a>
                            <a href="https://www.instagram.com/mizizzi">Instagram</a>
                            <a href="https://www.twitter.com/mizizzi">Twitter</a>
                            <a href="https://www.pinterest.com/mizizzi">Pinterest</a>
                        </div>

                        <div class="divider"></div>

                        <div class="footer-links">
                            <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                            <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                            <a href="https://www.mizizzi.com/help">Help Center</a>
                            <a href="https://www.mizizzi.com/contact">Contact Us</a>
                        </div>

                        <p class="copyright">
                            &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Try multiple email sending methods for reliability
        email_sent = False

        # Try direct Brevo API first
        try:
            brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')

            if brevo_api_key:
                url = "https://api.brevo.com/v3/smtp/email"

                # Prepare the payload for Brevo API
                payload = {
                    "sender": {
                        "name": "MIZIZZI Password Reset",
                        "email": "REDACTED-SENDER-EMAIL"  # Use the verified sender email
                    },
                    "to": [{"email": email}],
                    "subject": "MIZIZZI - Password Reset",
                    "htmlContent": reset_template,
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

                logger.info(f"Sending password reset email via Brevo API to {email}")
                response = requests.post(url, json=payload, headers=headers)

                if response.status_code >= 200 and response.status_code < 300:
                    logger.info(f"Password reset email sent via Brevo API. Status: {response.status_code}")
                    email_sent = True
                else:
                    logger.error(f"Failed to send email via Brevo API. Status: {response.status_code}. Response: {response.text}")
        except Exception as brevo_error:
            logger.error(f"Brevo API error: {str(brevo_error)}")

        # If Brevo API failed, try the regular send_email function
        if not email_sent:
            email_sent = send_email(email, "MIZIZZI - Password Reset", reset_template)

        # If all email methods failed, try one more fallback
        if not email_sent:
            try:
                # Try Flask-Mail as a last resort
                from flask_mail import Message
                msg = Message(
                    "MIZIZZI - Password Reset",
                    recipients=[email],
                    html=reset_template,
                    sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@mizizzi.com')
                )
                mail.send(msg)
                email_sent = True
                logger.info(f"Password reset email sent via Flask-Mail to {email}")
            except Exception as mail_error:
                logger.error(f"Flask-Mail error: {str(mail_error)}")

        # Store the reset token in the database for additional security
        try:
            # Update user record with reset token info
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
            db.session.commit()
            logger.info(f"Reset token stored in database for user {user.id}")
        except Exception as db_error:
            logger.error(f"Error storing reset token in database: {str(db_error)}")
            # Continue even if database update fails

        if not email_sent:
            logger.error(f"Failed to send password reset email to {email} after all attempts")
            return jsonify({'error': 'Failed to send password reset email. Please try again or contact support.'}), 500

        return jsonify({'message': 'If your email is registered, you will receive a password reset link shortly'}), 200

    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during password reset request', 'details': str(e)}), 500

# Reset password
@validation_routes.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()

        token = data.get('token')
        new_password = data.get('password')

        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400

        # Validate password
        is_valid, password_msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': password_msg}), 400

        try:
            # Decode the token
            decoded_token = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )

            # Check if token is for password reset
            if decoded_token.get('purpose') != 'password_reset':
                logger.warning(f"Token used for password reset was not created for that purpose")
                return jsonify({'error': 'Invalid reset token'}), 400

            # Extract email from token
            email = decoded_token['sub']

            # Find user
            user = User.query.filter_by(email=email).first()

            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Check if token matches stored token (if available)
            if hasattr(user, 'reset_token') and user.reset_token and user.reset_token != token:
                logger.warning(f"Token mismatch for user {user.id}")
                return jsonify({'error': 'Invalid reset token'}), 400

            # Check if token is expired in database (if available)
            if hasattr(user, 'reset_token_expires') and user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
                logger.warning(f"Token expired in database for user {user.id}")
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
            logger.info(f"Password reset successful for user {user.id}")

            # Send confirmation email
            confirmation_template = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Successful</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * {{
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }}

                    body {{
                        font-family: 'Poppins', sans-serif;
                        background-color: #f5f5f5;
                        color: #333;
                        line-height: 1.6;
                    }}

                    .email-wrapper {{
                        max-width: 650px;
                        margin: 0 auto;
                        background: #ffffff;
                        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                    }}

                    .email-header {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }}

                    .email-header::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.1;
                        z-index: 0;
                    }}

                    .email-header-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .logo {{
                        margin-bottom: 15px;
                    }}

                    .logo img {{
                        height: 60px;
                    }}

                    .email-header h1 {{
                        font-family: 'Cormorant Garamond', serif;
                        color: #ffffff;
                        font-size: 32px;
                        font-weight: 700;
                        margin: 0;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }}

                    .email-header p {{
                        color: rgba(255,255,255,0.8);
                        font-size: 14px;
                        margin-top: 5px;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }}

                    .email-body {{
                        padding: 50px 40px;
                        background: #ffffff;
                    }}

                    .greeting {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 26px;
                        color: #000000;
                        margin-bottom: 25px;
                        font-weight: 600;
                        border-bottom: 1px solid #f0f0f0;
                        padding-bottom: 15px;
                    }}

                    .message {{
                        margin-bottom: 35px;
                        color: #333;
                        font-size: 16px;
                        font-weight: 300;
                        line-height: 1.8;
                    }}

                    .message strong {{
                        font-weight: 500;
                        color: #000;
                    }}

                    .success-message {{
                        background-color: #f0fff4;
                        border-left: 4px solid #48bb78;
                        padding: 20px;
                        margin: 30px 0;
                        color: #2f855a;
                        border-radius: 2px;
                    }}

                    .success-message h2 {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 22px;
                        margin-bottom: 10px;
                        color: #2f855a;
                    }}

                    .button-container {{
                        text-align: center;
                        margin: 35px 0;
                    }}

                    .button {{
                        display: inline-block;
                        background-color: #000000;
                        color: #ffffff !important;
                        text-decoration: none;
                        padding: 16px 35px;
                        border-radius: 2px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    }}

                    .button:hover {{
                        background-color: #333333;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
                    }}

                    .note {{
                        margin-top: 30px;
                        font-size: 14px;
                        color: #666;
                        font-style: italic;
                        background-color: #f9f9f9;
                        padding: 15px;
                        border-radius: 2px;
                    }}

                    .signature {{
                        margin-top: 40px;
                        border-top: 1px solid #f0f0f0;
                        padding-top: 20px;
                    }}

                    .signature p {{
                        margin: 0;
                        line-height: 1.6;
                    }}

                    .signature .team {{
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 20px;
                        color: #000000;
                        font-weight: 600;
                        margin-top: 5px;
                    }}

                    .email-footer {{
                        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                        padding: 40px 20px;
                        text-align: center;
                        position: relative;
                    }}

                    .email-footer::before {{
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url('https://i.imgur.com/8YsGZmd.png');
                        background-size: cover;
                        opacity: 0.05;
                        z-index: 0;
                    }}

                    .footer-content {{
                        position: relative;
                        z-index: 1;
                    }}

                    .social-links {{
                        margin-bottom: 25px;
                    }}

                    .social-links a {{
                        display: inline-block;
                        margin: 0 10px;
                        color: rgba(255,255,255,0.8);
                        text-decoration: none;
                        font-size: 14px;
                        transition: color 0.3s ease;
                    }}

                    .social-links a:hover {{
                        color: #ffffff;
                    }}

                    .divider {{
                        height: 1px;
                        background-color: rgba(255,255,255,0.1);
                        margin: 20px 0;
                    }}

                    .footer-links {{
                        margin-bottom: 20px;
                    }}

                    .footer-links a {{
                        color: rgba(255,255,255,0.7);
                        text-decoration: none;
                        margin: 0 10px;
                        font-size: 13px;
                        transition: color 0.3s ease;
                    }}

                    .footer-links a:hover {{
                        color: #ffffff;
                    }}

                    .copyright {{
                        color: rgba(255,255,255,0.5);
                        font-size: 12px;
                    }}

                    @media only screen and (max-width: 650px) {{
                        .email-body {{
                            padding: 30px 20px;
                        }}

                        .success-message {{
                            padding: 20px;
                        }}

                        .greeting {{
                            font-size: 22px;
                        }}
                    }}
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="email-header">
                        <div class="email-header-content">
                            <div class="logo">
                                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png" alt="MIZIZZI" onerror="this.style.display='none'">
                            </div>
                            <h1>MIZIZZI</h1>
                            <p>LUXURY SHOPPING EXPERIENCE</p>
                        </div>
                    </div>

                    <div class="email-body">
                        <div class="greeting">Hello, {user.name}</div>

                        <div class="message">
                            Your password for your <strong>MIZIZZI</strong> account has been successfully reset.
                        </div>

                        <div class="success-message">
                            <h2>Password Reset Successful</h2>
                            <p>You can now log in to your account using your new password.</p>
                        </div>

                        <div class="button-container">
                            <a href="https://www.mizizzi.com/auth/login" class="button">LOG IN NOW</a>
                        </div>

                        <p class="note">
                            If you did not make this change, please contact our support team immediately as your account may have been compromised.
                        </p>

                        <div class="signature">
                            <p>With appreciation,</p>
                            <p class="team">The MIZIZZI Team</p>
                        </div>
                    </div>

                    <div class="email-footer">
                        <div class="footer-content">
                            <div class="social-links">
                                <a href="https://www.facebook.com/mizizzi">Facebook</a>
                                <a href="https://www.instagram.com/mizizzi">Instagram</a>
                                <a href="https://www.twitter.com/mizizzi">Twitter</a>
                                <a href="https://www.pinterest.com/mizizzi">Pinterest</a>
                            </div>

                            <div class="divider"></div>

                            <div class="footer-links">
                                <a href="https://www.mizizzi.com/terms">Terms & Conditions</a>
                                <a href="https://www.mizizzi.com/privacy">Privacy Policy</a>
                                <a href="https://www.mizizzi.com/help">Help Center</a>
                                <a href="https://www.mizizzi.com/contact">Contact Us</a>
                            </div>

                            <p class="copyright">
                                &copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Try to send confirmation email, but don't fail if it doesn't work
            try:
                send_email(email, "MIZIZZI - Password Reset Successful", confirmation_template)
            except Exception as email_error:
                logger.error(f"Failed to send confirmation email: {str(email_error)}")
                # Continue even if email fails

            return jsonify({'message': 'Password reset successful'}), 200

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Password reset link expired'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid reset token'}), 400

    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({'error': 'An error occurred during password reset'}), 500

# Token refresh
@validation_routes.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        # Rollback any failed transaction before proceeding
        db.session.rollback()

        current_user_id = get_jwt_identity()

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user or not user.is_active:
            return jsonify({'msg': 'User not found or inactive'}), 404

        # Create new access token with role claim
        additional_claims = {"role": user.role.value}
        new_access_token = create_access_token(identity=str(current_user_id), additional_claims=additional_claims)

        # Generate CSRF token
        csrf_token = get_csrf_token()

        # Create response with tokens
        resp = jsonify({
            'access_token': new_access_token,
            'csrf_token': csrf_token
        })

        # Set cookies for tokens - use secure=False for local development
        try:
            set_access_cookies(resp, new_access_token)
            # Use secure=False for local development
            resp.set_cookie("csrf_access_token", csrf_token, httponly=False, secure=False, samesite="Lax")
            logger.info("Cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set cookies: {str(e)}")
            # Continue even if cookie setting fails

        return resp, 200

    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}", exc_info=True)
        db.session.rollback()  # <-- Add this line to recover from failed transaction
        # Return detailed error in development mode
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({'msg': 'An error occurred while refreshing token', 'details': str(e), 'error_type': type(e).__name__}), 500
        return jsonify({'msg': 'An error occurred while refreshing token'}), 500

# Get user profile
@validation_routes.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        db.session.rollback()  # Ensure session is clean before querying
        current_user_id = get_jwt_identity()

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        db.session.rollback()  # <-- Add this to recover from failed transaction
        logger.error(f"Get profile error: {str(e)}", exc_info=True)
        # Return more detailed error in development mode
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({'msg': 'An error occurred while fetching profile', 'details': str(e), 'error_type': type(e).__name__}), 500
        return jsonify({'msg': 'An error occurred while fetching profile'}), 500

# Update user profile
@validation_routes.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        db.session.rollback()  # Ensure session is clean before any DB operation
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Update fields if provided
        if 'name' in data:
            user.name = data['name']

        if 'phone' in data and data['phone'] != user.phone:
            # Check if phone already exists for another user
            if data['phone']:
                existing = User.query.filter_by(phone=data['phone']).first()
                if existing and existing.id != current_user_id:
                    return jsonify({'msg': 'Phone number already in use'}), 409
                user.phone = data['phone']

        if 'email' in data:
            # Check if email already exists
            if data['email'] and data['email'] != user.email:
                existing = User.query.filter_by(email=data['email']).first()
                if existing and existing.id != current_user_id:
                    return jsonify({'msg': 'Email already in use'}), 409
                user.email = data['email']

        if 'is_active' in data:
            user.is_active = data['is_active']

        if 'role' in data:
            try:
                user.role = UserRole(data['role'])
            except ValueError:
                return jsonify({'msg': 'Invalid role'}), 400

        if 'email_verified' in data:
            user.email_verified = data['email_verified']

        if 'phone_verified' in data:
            user.phone_verified = data['phone_verified']

        # Save changes
        db.session.commit()

        return jsonify({
            'msg': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()  # Ensure session is clean after error
        logger.error(f"Update profile error: {str(e)}", exc_info=True)
        # Return more detailed error in development mode
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({'msg': 'An error occurred while updating profile', 'details': str(e), 'error_type': type(e).__name__}), 500
        return jsonify({'msg': 'An error occurred while updating profile'}), 500

# Change password
@validation_routes.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        db.session.rollback()  # Ensure session is clean before any DB operation
        current_user_id = get_jwt_identity()
        data = request.get_json()

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'msg': 'Current password and new password are required'}), 400

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Check current password
        if not user.verify_password(current_password):
            return jsonify({'msg': 'Current password is incorrect'}), 401

        # Validate new password
        is_valid, password_msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'msg': password_msg}), 400

        # Update password
        user.set_password(new_password)
        db.session.commit()

        return jsonify({'msg': 'Password changed successfully'}), 200

    except Exception as e:
        import traceback
        db.session.rollback()  # Ensure session is clean after error
        logger.error(f"Change password error: {str(e)}", exc_info=True)
        # Return more detailed error in development mode
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({
                'msg': 'An error occurred while changing password',
                'details': str(e),
                'error_type': type(e).__name__,
                'traceback': traceback.format_exc()
            }), 500
        return jsonify({'msg': 'An error occurred while changing password'}), 500

# Delete account (soft delete)
@validation_routes.route('/delete-account', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_account():
    try:
        db.session.rollback()  # <-- Always rollback before any DB operation
        current_user_id = get_jwt_identity()
        data = request.get_json()

        password = data.get('password')

        if not password:
            return jsonify({'msg': 'Password is required to confirm account deletion'}), 400

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Verify password
        if not user.verify_password(password):
            return jsonify({'msg': 'Password is incorrect'}), 401

        # Soft delete the account
        user.is_deleted = True
        user.deleted_at = datetime.utcnow()
        user.is_active = False
        db.session.commit()

        return jsonify({'msg': 'Account deleted successfully'}), 200

    except Exception as e:
        import traceback
        db.session.rollback()  # Ensure session is clean after error
        logger.error(f"Delete account error: {str(e)}\n{traceback.format_exc()}")
        # Return more detailed error in development mode
        if os.environ.get('FLASK_ENV') == 'development':
            return jsonify({
                'msg': 'An error occurred while deleting account',
                'details': str(e),
                'error_type': type(e).__name__,
                'traceback': traceback.format_exc()
            }), 500
        return jsonify({'msg': 'An error occurred while deleting account'}), 500

@validation_routes.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # In a stateless JWT system, the client simply discards the tokens
    # For additional security, you could implement a token blacklist
    return jsonify({'msg': 'Successfully logged out'}), 200

# Check if email or phone exists (for registration validation)
@validation_routes.route('/check-availability', methods=['POST'])
def check_availability():
    try:
        data = request.get_json()
        email = data.get('email')
        phone = data.get('phone')

        if not email and not phone:
            return jsonify({'msg': 'Either email or phone is required'}), 400

        response = {}

        if email:
            user = User.query.filter_by(email=email).first()
            response['email_available'] = user is None

        if phone:
            user = User.query.filter_by(phone=phone).first()
            response['phone_available'] = user is None

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Check availability error: {str(e)}")
        return jsonify({'msg': 'An error occurred during availability check'}), 500

# ----------------------authentication routes ----------------------
