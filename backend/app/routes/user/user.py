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
from flask import Blueprint, request, jsonify, g, current_app, make_response, render_template_string, url_for
from flask_cors import cross_origin
from flask_mail import Mail, Message

# JWT Auth
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func
from ...configuration.extensions import db, cache, mail

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

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprints
validation_routes = Blueprint('validation_routes', __name__)
user_bp = Blueprint('user', __name__)

# Register user blueprint with validation routes
validation_routes.register_blueprint(user_bp, url_prefix='/api/user')

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
    try:
        # Try to send email using Flask-Mail first
        msg = Message(
            subject=subject,
            recipients=[to],
            html=template,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@mizizzi.com')
        )

        # Add headers to improve deliverability
        msg.extra_headers = {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
        }

        mail.send(msg)
        logger.info(f"Email sent to {to} with Flask-Mail")
        return True

    except Exception as e:
        logger.error(f"Error sending email via Flask-Mail: {str(e)}")

        # Fallback to Brevo API if Flask-Mail fails
        try:
            brevo_api_key = current_app.config.get('BREVO_API_KEY')
            if not brevo_api_key:
                logger.error("BREVO_API_KEY not configured")
                return False

            url = "https://api.brevo.com/v3/smtp/email"

            # Prepare the payload for Brevo API
            payload = {
                "sender": {
                    "name": "MIZIZZI",
                    "email": current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@mizizzi.com')
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

            response = requests.post(url, json=payload, headers=headers)

            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"Email sent to {to} with Brevo API. Status code: {response.status_code}")
                return True
            else:
                logger.error(f"Failed to send email via Brevo API. Status code: {response.status_code}. Response: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error sending email via Brevo: {str(e)}")
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
    # Password must be at least 8 characters with at least one uppercase, one lowercase, one number and one special character
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"

    return True, "Password meets requirements"

def is_valid_phone(phone):
    # Basic phone number validation for international format
    # This regex matches most international phone number formats
    phone_pattern = re.compile(r'^\+?[1-9]\d{1,14}$')
    return bool(phone_pattern.match(phone))

# Registration route
@user_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

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

        # Create new user
        new_user = User(
            name=name,
            email=email if email else None,
            phone=phone if phone else None,
            is_active=True,
            created_at=datetime.utcnow()
        )

        # Set password
        new_user.set_password(password)

        # Generate verification code
        verification_code = generate_otp()
        new_user.set_verification_code(verification_code, is_phone=bool(phone and not email))

        # Save user to database
        db.session.add(new_user)
        db.session.commit()

        # Send verification based on provided contact method
        if email:
            verification_link = url_for(
                'validation_routes.user.verify_email',
                token=create_access_token(identity=email, expires_delta=timedelta(hours=24)),
                _external=True
            )

            # Enhanced email template for better deliverability and user experience
            email_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your MIZIZZI Account</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .container {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }}
                    .header {{ text-align: center; margin-bottom: 20px; }}
                    .logo {{ max-width: 150px; height: auto; }}
                    h1 {{ color: #333; font-size: 24px; margin-bottom: 20px; }}
                    .verification-code {{ background-color: #f5f5f5; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px; }}
                    .button {{ display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to MIZIZZI!</h1>
                    </div>
                    <p>Hello {name},</p>
                    <p>Thank you for registering with MIZIZZI. To complete your registration, please verify your email address.</p>

                    <p>You can either click the button below:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email</a>
                    </div>

                    <p>Or enter the following verification code on the verification page:</p>
                    <div class="verification-code">{verification_code}</div>

                    <p>This code will expire in 10 minutes.</p>

                    <p>If you did not sign up for MIZIZZI, please ignore this email.</p>

                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            email_sent = send_email(email, "Verify Your MIZIZZI Account", email_template)
            if not email_sent:
                db.session.delete(new_user)
                db.session.commit()
                return jsonify({'msg': 'Failed to send verification email. Please try again.'}), 500

            return jsonify({
                'msg': 'User registered successfully. Please check your email for verification.',
                'user_id': new_user.id
            }), 201

        elif phone:
            sms_message = f"Your MIZIZZI verification code is: {verification_code}. This code will expire in 10 minutes."
            sms_sent = send_sms(phone, sms_message)

            if not sms_sent:
                db.session.delete(new_user)
                db.session.commit()
                return jsonify({'msg': 'Failed to send SMS verification. Please try again.'}), 500

            return jsonify({
                'msg': 'User registered successfully. Please check your phone for verification code.',
                'user_id': new_user.id
            }), 201

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'msg': 'An error occurred during registration'}), 500

# Email verification route (via link)
@user_bp.route('/verify-email', methods=['GET'])
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

        # Redirect to frontend verification success page
        return render_template_string("""
        <html>
            <head>
                <title>Email Verified</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                    .success { color: green; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="success">Email Verified Successfully!</h1>
                    <p>Your email has been verified. You can now log in to your MIZIZZI account.</p>
                    <p><a href="{{frontend_url}}">Go to Login</a></p>
                </div>
                <script>
                    // Redirect to login page after 5 seconds
                    setTimeout(function() {
                        window.location.href = "{{frontend_url}}";
                    }, 5000);
                </script>
            </body>
        </html>
        """, frontend_url=current_app.config['FRONTEND_URL'])

    except jwt.ExpiredSignatureError:
        return jsonify({'msg': 'Verification link expired'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'msg': 'Invalid verification token'}), 400
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        return jsonify({'msg': 'An error occurred during email verification'}), 500

# Manual verification route (for OTPs)
@user_bp.route('/verify-code', methods=['POST'])
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
            return jsonify({'msg': 'User not found'}), 404

        # Verify code
        if not user.verify_verification_code(code, is_phone=is_phone):
            return jsonify({'msg': 'Invalid or expired verification code'}), 400

        # Mark verification status based on contact method
        if is_phone:
            user.phone_verified = True
        else:
            user.email_verified = True

        db.session.commit()

        return jsonify({'msg': 'Verification successful', 'verified': True}), 200

    except Exception as e:
        logger.error(f"Code verification error: {str(e)}")
        return jsonify({'msg': 'An error occurred during verification'}), 500

# Resend verification code
@user_bp.route('/resend-verification', methods=['POST'])
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
        user.set_verification_code(verification_code, is_phone=not is_email)
        db.session.commit()

        # Send verification based on contact method
        if is_email:
            verification_link = url_for(
                'validation_routes.user.verify_email',
                token=create_access_token(identity=identifier, expires_delta=timedelta(hours=24)),
                _external=True
            )

            # Enhanced email template for better deliverability and user experience
            email_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your MIZIZZI Email</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .container {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }}
                    .header {{ text-align: center; margin-bottom: 20px; }}
                    .logo {{ max-width: 150px; height: auto; }}
                    h1 {{ color: #333; font-size: 24px; margin-bottom: 20px; }}
                    .verification-code {{ background-color: #f5f5f5; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px; }}
                    .button {{ display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>MIZIZZI Email Verification</h1>
                    </div>
                    <p>Hello {user.name},</p>
                    <p>Please verify your email address to complete your MIZIZZI account setup.</p>

                    <p>You can either click the button below:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email</a>
                    </div>

                    <p>Or enter the following verification code on the verification page:</p>
                    <div class="verification-code">{verification_code}</div>

                    <p>This code will expire in 10 minutes.</p>

                    <p>If you did not request this verification, please ignore this email or contact our support team.</p>

                    <div class="footer">
                        <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            email_sent = send_email(identifier, "Verify Your MIZIZZI Email", email_template)
            if not email_sent:
                return jsonify({'msg': 'Failed to send verification email. Please try again.'}), 500

            return jsonify({'msg': 'Verification email sent successfully'}), 200

        else:  # Phone
            sms_message = f"Your MIZIZZI verification code is: {verification_code}. This code will expire in 10 minutes."
            sms_sent = send_sms(identifier, sms_message)

            if not sms_sent:
                return jsonify({'msg': 'Failed to send SMS verification. Please try again.'}), 500

            return jsonify({'msg': 'Verification SMS sent successfully'}), 200

    except Exception as e:
        logger.error(f"Resend verification error: {str(e)}")
        return jsonify({'msg': 'An error occurred while resending verification'}), 500

# Login route
@user_bp.route('/login', methods=['POST'])
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
        access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=user.id, additional_claims=additional_claims)

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Return tokens and user info
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'msg': 'An error occurred during login'}), 500

# Google login
@user_bp.route('/google-login', methods=['POST'])
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
        access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=user.id, additional_claims=additional_claims)

        # Return tokens and user info
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        return jsonify({'msg': 'An error occurred during Google login'}), 500

# Request password reset
@user_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'msg': 'Email is required'}), 400

        # Find user
        user = User.query.filter_by(email=email).first()

        # For security reasons, always return success even if user not found
        if not user:
            return jsonify({'msg': 'If your email is registered, you will receive a password reset link shortly'}), 200

        # Generate reset token (valid for 30 minutes)
        reset_token = create_access_token(identity=email, expires_delta=timedelta(minutes=30))

        # Create reset link
        reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={reset_token}"

        # Enhanced email template for better deliverability and user experience
        reset_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your MIZIZZI Password</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .container {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }}
                .header {{ text-align: center; margin-bottom: 20px; }}
                .logo {{ max-width: 150px; height: auto; }}
                h1 {{ color: #333; font-size: 24px; margin-bottom: 20px; }}
                .button {{ display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
                .warning {{ color: #e74c3c; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MIZIZZI Password Reset</h1>
                </div>
                <p>Hello,</p>
                <p>We received a request to reset your password for your MIZIZZI account. To proceed with the password reset, please click the button below:</p>

                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>

                <p>This link will expire in 30 minutes for security reasons.</p>

                <p class="warning"><strong>Important:</strong> If you did not request a password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>

                <div class="footer">
                    <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send email
        email_sent = send_email(email, "MIZIZZI - Password Reset", reset_template)

        if not email_sent:
            return jsonify({'msg': 'Failed to send password reset email. Please try again.'}), 500

        return jsonify({'msg': 'If your email is registered, you will receive a password reset link shortly'}), 200

    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return jsonify({'msg': 'An error occurred during password reset request'}), 500

# Reset password
@user_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()

        token = data.get('token')
        new_password = data.get('password')

        if not token or not new_password:
            return jsonify({'msg': 'Token and new password are required'}), 400

        # Validate password
        is_valid, password_msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'msg': password_msg}), 400

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

            # Update password
            user.set_password(new_password)
            db.session.commit()

            return jsonify({'msg': 'Password reset successful'}), 200

        except jwt.ExpiredSignatureError:
            return jsonify({'msg': 'Password reset link expired'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'msg': 'Invalid reset token'}), 400

    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({'msg': 'An error occurred during password reset'}), 500

# Token refresh
@user_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user or not user.is_active:
            return jsonify({'msg': 'User not found or inactive'}), 404

        # Create new access token with role claim
        additional_claims = {"role": user.role.value}
        new_access_token = create_access_token(identity=current_user_id, additional_claims=additional_claims)

        return jsonify({'access_token': new_access_token}), 200

    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'msg': 'An error occurred while refreshing token'}), 500

# Get user profile
@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()

        # Get the user from database
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return jsonify({'msg': 'An error occurred while fetching profile'}), 500

# Update user profile
@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
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

                if not is_valid_phone(data['phone']):
                    return jsonify({'msg': 'Invalid phone number format'}), 400

                # Set phone and mark as unverified
                user.phone = data['phone']
                user.phone_verified = False

                # Generate verification code for new phone
                verification_code = generate_otp()
                user.set_verification_code(verification_code, is_phone=True)

                # Send verification SMS
                sms_message = f"Your MIZIZZI verification code for your new phone number is: {verification_code}. This code will expire in 10 minutes."
                send_sms(data['phone'], sms_message)
            else:
                user.phone = None
                user.phone_verified = False

        if 'email' in data and data['email'] != user.email:
            # Check if email already exists for another user
            if data['email']:
                try:
                    # Validate email format
                    valid_email = validate_email(data['email'])
                    email = valid_email.email

                    existing = User.query.filter_by(email=email).first()
                    if existing and existing.id != current_user_id:
                        return jsonify({'msg': 'Email already in use'}), 409

                    # Set email and mark as unverified
                    user.email = email
                    user.email_verified = False

                    # Generate verification code for new email
                    verification_link = url_for(
                        'validation_routes.user.verify_email',
                        token=create_access_token(identity=email, expires_delta=timedelta(hours=24)),
                        _external=True
                    )

                    email_template = f"""
                    <h1>MIZIZZI Email Verification</h1>
                    <p>Please click the link below to verify your new email:</p>
                    <p><a href="{verification_link}">Verify Email</a></p>
                    <p>Or enter the following verification code on the verification page:</p>
                    <h2>{verification_code}</h2>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you did not request this change, please update your password immediately.</p>
                    """

                    send_email(email, "MIZIZZI - Verify Your New Email", email_template)

                except EmailNotValidError:
                    return jsonify({'msg': 'Invalid email format'}), 400
            else:
                user.email = None
                user.email_verified = False

        if 'address' in data:
            user.address = data['address']

        # Save changes
        db.session.commit()

        return jsonify({
            'msg': 'Profile updated successfully',
            'user': user.to_dict(),
            'verification_required': {
                'email': 'email' in data and data['email'] != user.email and data['email'] is not None,
                'phone': 'phone' in data and data['phone'] != user.phone and data['phone'] is not None
            }
        }), 200

    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        return jsonify({'msg': 'An error occurred while updating profile'}), 500

# Change password
@user_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
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
        logger.error(f"Change password error: {str(e)}")
        return jsonify({'msg': 'An error occurred while changing password'}), 500

# Delete account (soft delete)
@user_bp.route('/delete-account', methods=['POST'])
@jwt_required()
def delete_account():
    try:
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
        logger.error(f"Delete account error: {str(e)}")
        return jsonify({'msg': 'An error occurred while deleting account'}), 500

# Admin routes
@user_bp.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Get users with pagination
        users = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page)

        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': users.page
        }), 200

    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        return jsonify({'msg': 'An error occurred while fetching users'}), 500

@user_bp.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'msg': 'An error occurred while fetching user'}), 500

@user_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        data = request.get_json()

        # Update fields
        if 'name' in data:
            user.name = data['name']

        if 'email' in data:
            # Check if email already exists
            if data['email'] and data['email'] != user.email:
                existing = User.query.filter_by(email=data['email']).first()
                if existing and existing.id != user_id:
                    return jsonify({'msg': 'Email already in use'}), 409
                user.email = data['email']

        if 'phone' in data:
            # Check if phone already exists
            if data['phone'] and data['phone'] != user.phone:
                existing = User.query.filter_by(phone=data['phone']).first()
                if existing and existing.id != user_id:
                    return jsonify({'msg': 'Phone number already in use'}), 409
                user.phone = data['phone']

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

        return jsonify({'msg': 'User updated successfully', 'user': user.to_dict()}), 200

    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        return jsonify({'msg': 'An error occurred while updating user'}), 500

@user_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'msg': 'User not found'}), 404

        # Hard delete the user (be careful with this in production!)
        db.session.delete(user)
        db.session.commit()

        return jsonify({'msg': 'User deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Delete user error: {str(e)}")
        return jsonify({'msg': 'An error occurred while deleting user'}), 500

@user_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # In a stateless JWT system, the client simply discards the tokens
    # For additional security, you could implement a token blacklist
    return jsonify({'msg': 'Successfully logged out'}), 200

# Check if email or phone exists (for registration validation)
@user_bp.route('/check-availability', methods=['POST'])
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


# ----------------------
# Category Routes with Validation
# ----------------------

@validation_routes.route('/categories', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_categories():
    """Get all categories with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        page, per_page = get_pagination_params()

        # Check if we should return featured categories only
        featured_only = request.args.get('featured', '').lower() == 'true'
        parent_id = request.args.get('parent_id', type=int)

        query = Category.query

        if featured_only:
            query = query.filter_by(is_featured=True)

        if parent_id is not None:
            query = query.filter_by(parent_id=parent_id)
        else:
            # If no parent_id is specified, return top-level categories
            query = query.filter_by(parent_id=None)

        # Order by name
        query = query.order_by(Category.name)

        return jsonify(paginate_response(query, categories_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve categories", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category(category_id):
    """Get category by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.get_or_404(category_id)
        return jsonify(category_schema.dump(category)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

@validation_routes.route('/categories/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_category_by_slug(slug):
    """Get category by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        category = Category.query.filter_by(slug=slug).first_or_404()
        return jsonify(category_schema.dump(category)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve category", "details": str(e)}), 500

@validation_routes.route('/categories', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_category():
    """Create a new category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('name') or not data.get('slug'):
            return jsonify({"error": "Name and slug are required"}), 400

        # Check if slug already exists
        if Category.query.filter_by(slug=data['slug']).first():
            return jsonify({"error": "Slug already exists"}), 409

        new_category = Category(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            image_url=data.get('image_url'),
            banner_url=data.get('banner_url'),
            parent_id=data.get('parent_id'),
            is_featured=data.get('is_featured', False)
        )

        db.session.add(new_category)
        db.session.commit()

        return jsonify({
            "message": "Category created successfully",
            "category": category_schema.dump(new_category)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create category", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_category(category_id):
    """Update a category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()

        # Update fields
        if 'name' in data:
            category.name = data['name']
        if 'slug' in data:
            # Check if slug already exists and is not this category
            existing = Category.query.filter_by(slug=data['slug']).first()
            if existing and existing.id != category_id:
                return jsonify({"error": "Slug already exists"}), 409
            category.slug = data['slug']
        if 'description' in data:
            category.description = data['description']
        if 'image_url' in data:
            category.image_url = data['image_url']
        if 'banner_url' in data:
            category.banner_url = data['banner_url']
        if 'parent_id' in data:
            category.parent_id = data['parent_id']
        if 'is_featured' in data:
            category.is_featured = data['is_featured']

        category.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Category updated successfully",
            "category": category_schema.dump(category)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update category", "details": str(e)}), 500

@validation_routes.route('/categories/<int:category_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_category(category_id):
    """Delete a category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        category = Category.query.get_or_404(category_id)

        # Check if category has products
        if category.products:
            return jsonify({"error": "Cannot delete category with associated products"}), 400

        # Check if category has subcategories
        if category.subcategories:
            return jsonify({"error": "Cannot delete category with subcategories"}), 400

        db.session.delete(category)
        db.session.commit()

        return jsonify({"message": "Category deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete category", "details": str(e)}), 500

# ----------------------
# Brand Routes with Validation
# ----------------------

@validation_routes.route('/brands', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brands():
    """Get all brands with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        page, per_page = get_pagination_params()

        # Check if we should return featured brands only
        featured_only = request.args.get('featured', '').lower() == 'true'

        query = Brand.query

        if featured_only:
            query = query.filter_by(is_featured=True)

        # Order by name
        query = query.order_by(Brand.name)

        return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand(brand_id):
    """Get brand by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@validation_routes.route('/brands/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_by_slug(slug):
    """Get brand by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        brand = Brand.query.filter_by(slug=slug).first_or_404()
        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@validation_routes.route('/brands', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
def create_brand():
    """Create a new brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('name') or not data.get('slug'):
            return jsonify({"error": "Name and slug are required"}), 400

        # Check if slug already exists
        if Brand.query.filter_by(slug=data['slug']).first():
            return jsonify({"error": "Slug already exists"}), 409

        new_brand = Brand(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            is_featured=data.get('is_featured', False)
        )

        db.session.add(new_brand)
        db.session.commit()

        return jsonify({
            "message": "Brand created successfully",
            "brand": brand_schema.dump(new_brand)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create brand", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_brand(brand_id):
    """Update a brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)
        data = request.get_json()

        # Update fields
        if 'name' in data:
            brand.name = data['name']
        if 'slug' in data:
            # Check if slug already exists and is not this brand
            existing = Brand.query.filter_by(slug=data['slug']).first()
            if existing and existing.id != brand_id:
                return jsonify({"error": "Slug already exists"}), 409
            brand.slug = data['slug']
        if 'description' in data:
            brand.description = data['description']
        if 'logo_url' in data:
            brand.logo_url = data['logo_url']
        if 'website' in data:
            brand.website = data['website']
        if 'is_featured' in data:
            brand.is_featured = data['is_featured']

        db.session.commit()

        return jsonify({
            "message": "Brand updated successfully",
            "brand": brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update brand", "details": str(e)}), 500

@validation_routes.route('/brands/<int:brand_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_brand(brand_id):
    """Delete a brand."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        brand = Brand.query.get_or_404(brand_id)

        # Check if brand has products
        if brand.products:
            return jsonify({"error": "Cannot delete brand with associated products"}), 400

        db.session.delete(brand)
        db.session.commit()

        return jsonify({"message": "Brand deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete brand", "details": str(e)}), 500

# ----------------------
# Product Routes with Validation
# ----------------------

@validation_routes.route('/products', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_products():
    """Get all products with pagination and filtering."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        category_id = request.args.get('category_id', type=int)
        category_slug = request.args.get('category_slug')
        brand_id = request.args.get('brand_id', type=int)
        brand_slug = request.args.get('brand_slug')
        featured_only = request.args.get('featured', '').lower() == 'true'
        new_only = request.args.get('new', '').lower() == 'true'
        sale_only = request.args.get('sale', '').lower() == 'true'
        flash_sale_only = request.args.get('flash_sale', '').lower() == 'true'
        luxury_deal_only = request.args.get('luxury_deal', '').lower() == 'true'
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('q')

        # Sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        query = Product.query

        # Apply filters
        if category_id:
            query = query.filter_by(category_id=category_id)

        if category_slug:
            category = Category.query.filter_by(slug=category_slug).first()
            if category:
                query = query.filter_by(category_id=category.id)

        if brand_id:
            query = query.filter_by(brand_id=brand_id)

        if brand_slug:
            brand = Brand.query.filter_by(slug=brand_slug).first()
            if brand:
                query = query.filter_by(brand_id=brand.id)

        if featured_only:
            query = query.filter_by(is_featured=True)

        if new_only:
            query = query.filter_by(is_new=True)

        if sale_only:
            query = query.filter_by(is_sale=True)

        if flash_sale_only:
            query = query.filter_by(is_flash_sale=True)

        if luxury_deal_only:
            query = query.filter_by(is_luxury_deal=True)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.meta_title.ilike(search_term),
                    Product.meta_description.ilike(search_term)
                )
            )

        # Apply sorting
        if sort_by == 'price':
            if sort_order == 'asc':
                query = query.order_by(Product.price.asc())
            else:
                query = query.order_by(Product.price.desc())
        elif sort_by == 'name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        else:  # Default to created_at
            if sort_order == 'asc':
                query = query.order_by(Product.created_at.asc())
            else:
                query = query.order_by(Product.created_at.desc())

        return jsonify(paginate_response(query, products_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve products", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product(product_id):
    """Get product by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@validation_routes.route('/products/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_by_slug(slug):
    """Get product by slug."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        product = Product.query.filter_by(slug=slug).first_or_404()
        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product", "details": str(e)}), 500

@validation_routes.route('/products', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_creation()
def create_product():
    """Create a new product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Create new product
        new_product = Product(
            name=data['name'],
            slug=data['slug'],
            description=data.get('description'),
            price=data['price'],
            sale_price=data.get('sale_price'),
            stock=data.get('stock', 0),
            category_id=data['category_id'],
            brand_id=data.get('brand_id'),
            image_urls=data.get('image_urls', []),
            thumbnail_url=data.get('thumbnail_url'),
            sku=data.get('sku'),
            weight=data.get('weight'),
            dimensions=data.get('dimensions'),
            is_featured=data.get('is_featured', False),
            is_new=data.get('is_new', True),
            is_sale=data.get('is_sale', False),
            is_flash_sale=data.get('is_flash_sale', False),
            is_luxury_deal=data.get('is_luxury_deal', False),
            meta_title=data.get('meta_title'),
            meta_description=data.get('meta_description')
        )

        db.session.add(new_product)
        db.session.commit()

        # Handle variants if provided
        variants = data.get('variants', [])
        for variant_data in variants:
            variant = ProductVariant(
                product_id=new_product.id,
                sku=variant_data.get('sku'),
                color=variant_data.get('color'),
                size=variant_data.get('size'),
                stock=variant_data.get('stock', 0),
                price=variant_data.get('price', new_product.price),
                image_urls=variant_data.get('image_urls', [])
            )
            db.session.add(variant)

        db.session.commit()

        return jsonify({
            "message": "Product created successfully",
            "product": product_schema.dump(new_product)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create product", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
def update_product(product_id):
    """Update a product with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    @validate_product_update(product_id)
    def perform_update():
        try:
            # Data is already validated by the decorator
            data = g.validated_data

            product = Product.query.get_or_404(product_id)

            # Update fields
            fields = [
                'name', 'slug', 'description', 'price', 'sale_price', 'stock',
                'category_id', 'brand_id', 'image_urls', 'thumbnail_url', 'sku',
                'weight', 'dimensions', 'is_featured', 'is_new', 'is_sale',
                'is_flash_sale', 'is_luxury_deal', 'meta_title', 'meta_description'
            ]

            for field in fields:
                if field in data:
                    setattr(product, field, data[field])

            product.updated_at = datetime.utcnow()

            # Handle variants if provided
            if 'variants' in data:
                # Delete existing variants
                ProductVariant.query.filter_by(product_id=product_id).delete()

                # Add new variants
                for variant_data in data['variants']:
                    variant = ProductVariant(
                        product_id=product_id,
                        sku=variant_data.get('sku'),
                        color=variant_data.get('color'),
                        size=variant_data.get('size'),
                        stock=variant_data.get('stock', 0),
                        price=variant_data.get('price', product.price),
                        image_urls=variant_data.get('image_urls', [])
                    )
                    db.session.add(variant)

            db.session.commit()

            return jsonify({
                "message": "Product updated successfully",
                "product": product_schema.dump(product)
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update product", "details": str(e)}), 500

    return perform_update()

@validation_routes.route('/products/<int:product_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_product(product_id):
    """Delete a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        product = Product.query.get_or_404(product_id)

        # Delete product and all related entities (variants, reviews, etc.)
        db.session.delete(product)
        db.session.commit()

        return jsonify({"message": "Product deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

# ----------------------
# Product Variant Routes with Validation
# ----------------------

@validation_routes.route('/products/<int:product_id>/variants', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_variants(product_id):
    """Get all variants for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        Product.query.get_or_404(product_id)  # Ensure product exists

        variants = ProductVariant.query.filter_by(product_id=product_id).all()
        return jsonify(product_variants_schema.dump(variants)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product variants", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/variants', methods=['POST', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_variant_creation(lambda: request.view_args.get('product_id'))
def create_product_variant(product_id):
    """Create a new product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        product = Product.query.get_or_404(product_id)

        new_variant = ProductVariant(
            product_id=product_id,
            sku=data.get('sku'),
            color=data.get('color'),
            size=data.get('size'),
            stock=data.get('stock', 0),
            price=data.get('price', product.price),
            image_urls=data.get('image_urls', [])
        )

        db.session.add(new_variant)
        db.session.commit()

        return jsonify({
            "message": "Product variant created successfully",
            "variant": product_variant_schema.dump(new_variant)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create product variant", "details": str(e)}), 500

@validation_routes.route('/variants/<int:variant_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_product_variant_update(lambda: request.view_args.get('variant_id'))
def update_product_variant(variant_id):
    """Update a product variant with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        variant = ProductVariant.query.get_or_404(variant_id)

        if 'sku' in data:
            variant.sku = data['sku']
        if 'color' in data:
            variant.color = data['color']
        if 'size' in data:
            variant.size = data['size']
        if 'stock' in data:
            variant.stock = data['stock']
        if 'price' in data:
            variant.price = data['price']
        if 'image_urls' in data:
            variant.image_urls = data['image_urls']

        db.session.commit()

        return jsonify({
            "message": "Product variant updated successfully",
            "variant": product_variant_schema.dump(variant)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update product variant", "details": str(e)}), 500

@validation_routes.route('/variants/<int:variant_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@admin_required
def delete_product_variant(variant_id):
    """Delete a product variant."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        variant = ProductVariant.query.get_or_404(variant_id)

        db.session.delete(variant)
        db.session.commit()

        return jsonify({"message": "Product variant deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete product variant", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/images', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_images(product_id):
    """Get all images for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        page, per_page = get_pagination_params()

        # Query images for this product, ordered by sort_order and primary image first
        query = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc(),
            ProductImage.created_at.desc()
        )

        return jsonify(paginate_response(query, product_images_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product images", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/images', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def add_product_image(product_id):
    """Add a new image to a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        # Get current user ID for tracking who uploaded
        current_user_id = get_jwt_identity()

        data = request.get_json()

        # Validate required fields
        if not data or not data.get('url'):
            return jsonify({"error": "Image URL is required"}), 400

        # Generate a unique filename if not provided
        filename = data.get('filename')
        if not filename:
            # Extract extension from URL or use .jpg as default
            url = data['url']
            ext = os.path.splitext(url)[1] if '.' in url.split('/')[-1] else '.jpg'
            filename = f"{uuid.uuid4().hex}{ext}"

        # Check if this should be the primary image
        is_primary = data.get('is_primary', False)

        # If setting as primary, unset any existing primary image
        if is_primary:
            ProductImage.query.filter_by(
                product_id=product_id,
                is_primary=True
            ).update({'is_primary': False})

        # Get the next sort order if not provided
        sort_order = data.get('sort_order')
        if sort_order is None:
            # Find the highest sort_order and add 1
            max_sort = db.session.query(db.func.max(ProductImage.sort_order)).filter_by(
                product_id=product_id
            ).scalar()
            sort_order = (max_sort or 0) + 10  # Use increments of 10 to allow for later insertions

        # Create new product image
        new_image = ProductImage(
            product_id=product_id,
            filename=filename,
            original_name=data.get('original_name', filename),
            url=data['url'],
            size=data.get('size'),
            is_primary=is_primary,
            sort_order=sort_order,
            alt_text=data.get('alt_text', product.name),
            uploaded_by=current_user_id
        )

        db.session.add(new_image)

        # If this is the first image for the product, update the product's thumbnail_url
        if not product.thumbnail_url:
            product.thumbnail_url = data['url']

        # If this is a primary image, update the product's thumbnail_url
        if is_primary:
            product.thumbnail_url = data['url']

        # Add to product's image_urls array if not already there
        if not product.image_urls:
            product.image_urls = [data['url']]
        elif data['url'] not in product.image_urls:
            product.image_urls = product.image_urls + [data['url']]

        db.session.commit()

        return jsonify({
            "message": "Product image added successfully",
            "image": product_image_schema.dump(new_image)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to add product image", "details": str(e)}), 500

@validation_routes.route('/product-images/<int:image_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_image(image_id):
    """Get a specific product image by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        image = ProductImage.query.get_or_404(image_id)
        return jsonify(product_image_schema.dump(image)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve product image", "details": str(e)}), 500

@validation_routes.route('/product-images/<int:image_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def update_product_image(image_id):
    """Update a product image."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        image = ProductImage.query.get_or_404(image_id)
        data = request.get_json()

        # Update fields if provided
        if 'filename' in data:
            image.filename = data['filename']
        if 'original_name' in data:
            image.original_name = data['original_name']
        if 'url' in data:
            old_url = image.url
            image.url = data['url']

            # Update product's image_urls and thumbnail_url if needed
            product = Product.query.get(image.product_id)
            if product:
                # Replace old URL in image_urls
                if product.image_urls and old_url in product.image_urls:
                    image_urls = product.image_urls.copy() if product.image_urls else []
                    try:
                        index = image_urls.index(old_url)
                        image_urls[index] = data['url']
                        product.image_urls = image_urls
                    except ValueError:
                        # If old URL not found, add the new one
                        product.image_urls = image_urls + [data['url']]

                # Update thumbnail_url if this image was being used
                if product.thumbnail_url == old_url:
                    product.thumbnail_url = data['url']

        if 'size' in data:
            image.size = data['size']
        if 'alt_text' in data:
            image.alt_text = data['alt_text']
        if 'sort_order' in data:
            image.sort_order = data['sort_order']

        # Handle is_primary flag
        if 'is_primary' in data and data['is_primary'] != image.is_primary:
            if data['is_primary']:
                # Unset any existing primary image for this product
                ProductImage.query.filter_by(
                    product_id=image.product_id,
                    is_primary=True
                ).update({'is_primary': False})

                # Set this image as primary
                image.is_primary = True

                # Update product's thumbnail_url
                product = Product.query.get(image.product_id)
                if product:
                    product.thumbnail_url = image.url
            else:
                # If unsetting primary, only allow if there's another primary image
                other_primary = ProductImage.query.filter_by(
                    product_id=image.product_id,
                    is_primary=True
                ).filter(ProductImage.id != image_id).first()

                if other_primary:
                    image.is_primary = False
                else:
                    # Don't allow unsetting the only primary image
                    return jsonify({"error": "Cannot unset primary flag on the only primary image"}), 400

        image.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Product image updated successfully",
            "image": product_image_schema.dump(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update product image", "details": str(e)}), 500

@validation_routes.route('/product-images/<int:image_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_product_image(image_id):
    """Delete a product image."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        image = ProductImage.query.get_or_404(image_id)
        product = Product.query.get(image.product_id)

        # If this is the primary image, find another image to make primary
        if image.is_primary and product:
            # Find another image to make primary
            another_image = ProductImage.query.filter_by(
                product_id=image.product_id
            ).filter(ProductImage.id != image_id).first()

            if another_image:
                another_image.is_primary = True
                product.thumbnail_url = another_image.url
            else:
                # If no other images, clear the thumbnail_url
                product.thumbnail_url = None

        # Remove the URL from product's image_urls
        if product and product.image_urls and image.url in product.image_urls:
            try:
                image_urls = product.image_urls.copy()
                image_urls.remove(image.url)
                product.image_urls = image_urls
            except (ValueError, AttributeError):
                # Handle case where image_urls is not a list or URL is not in the list
                pass

        # Delete the image
        db.session.delete(image)
        db.session.commit()

        return jsonify({"message": "Product image deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete product image", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/images/reorder', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def reorder_product_images(product_id):
    """Reorder product images."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        data = request.get_json()

        # Validate required fields
        if not data or not isinstance(data.get('image_order'), list):
            return jsonify({"error": "Image order array is required"}), 400

        image_order = data['image_order']

        # Verify all image IDs belong to this product
        image_ids = [item['id'] for item in image_order if 'id' in item]
        images = ProductImage.query.filter(
            ProductImage.id.in_(image_ids),
            ProductImage.product_id == product_id
        ).all()

        if len(images) != len(image_ids):
            return jsonify({"error": "Some image IDs do not belong to this product"}), 400

        # Update sort orders
        for item in image_order:
            if 'id' in item and 'sort_order' in item:
                image = next((img for img in images if img.id == item['id']), None)
                if image:
                    image.sort_order = item['sort_order']

        db.session.commit()

        # Get updated images
        updated_images = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc()
        ).all()

        return jsonify({
            "message": "Product images reordered successfully",
            "images": product_images_schema.dump(updated_images)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to reorder product images", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/images/set-primary/<int:image_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def set_primary_image(product_id, image_id):
    """Set a specific image as the primary image for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Ensure product exists
        product = Product.query.get_or_404(product_id)

        # Ensure image exists and belongs to this product
        image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first_or_404()

        # Unset any existing primary image
        ProductImage.query.filter_by(
            product_id=product_id,
            is_primary=True
        ).update({'is_primary': False})

        # Set this image as primary
        image.is_primary = True

        # Update product's thumbnail_url
        product.thumbnail_url = image.url

        db.session.commit()

        return jsonify({
            "message": "Primary image set successfully",
            "image": product_image_schema.dump(image)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to set primary image", "details": str(e)}), 500
# ----------------------
# Address Routes with Validation
# ----------------------

@validation_routes.route('/addresses', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_addresses():
    """Get user's addresses."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Get filter parameters
        address_type = request.args.get('type')

        # Build query
        query = Address.query.filter_by(user_id=current_user_id)

        # Apply filters
        if address_type:
            try:
                address_type_enum = AddressType(address_type)
                query = query.filter_by(address_type=address_type_enum)
            except ValueError:
                pass  # Invalid address type, ignore filter

        # Get pagination parameters
        page, per_page = get_pagination_params()

        # Order by creation date, with default addresses first
        query = query.order_by(
            Address.is_default.desc(),
            Address.created_at.desc()
        )

        return jsonify(paginate_response(query, addresses_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve addresses", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_address(address_id):
    """Get address by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve address", "details": str(e)}), 500

@validation_routes.route('/addresses', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_address_creation(lambda: get_jwt_identity())
def create_address():
    """Create a new address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Parse address type
        address_type = AddressType.BOTH
        if 'address_type' in data:
            try:
                # Handle case-insensitive address type
                address_type_str = data['address_type'].upper()
                if address_type_str == 'SHIPPING':
                    address_type = AddressType.SHIPPING
                elif address_type_str == 'BILLING':
                    address_type = AddressType.BILLING
                elif address_type_str == 'BOTH':
                    address_type = AddressType.BOTH
                else:
                    return jsonify({"error": "Invalid address type"}), 400
            except (ValueError, AttributeError):
                return jsonify({"error": "Invalid address type"}), 400

        # Create new address
        new_address = Address(
            user_id=current_user_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            address_line1=data['address_line1'],
            address_line2=data.get('address_line2', ''),
            city=data['city'],
            state=data['state'],
            postal_code=data['postal_code'],
            country=data['country'],
            phone=data.get('phone', ''),
            alternative_phone=data.get('alternative_phone', ''),
            address_type=address_type,
            is_default=data.get('is_default', False)
        )

        # Handle default address settings
        if new_address.is_default:
            # Remove default flag from other addresses
            Address.query.filter_by(
                user_id=current_user_id,
                is_default=True
            ).update({'is_default': False})

        db.session.add(new_address)
        db.session.commit()

        return jsonify({
            "message": "Address created successfully",
            "address": address_schema.dump(new_address)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create address", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@cross_origin()
@jwt_required()
def update_address(address_id):
    """Update an address with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    current_user_id = get_jwt_identity()
    address = Address.query.get_or_404(address_id)

    # Ensure address belongs to current user
    if str(address.user_id) != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Apply validation
    @validate_address_update(current_user_id, address_id)
    def perform_update():
        try:
            data = g.validated_data

            # Update fields
            if 'first_name' in data:
                address.first_name = data['first_name']
            if 'last_name' in data:
                address.last_name = data['last_name']
            if 'address_line1' in data:
                address.address_line1 = data['address_line1']
            if 'address_line2' in data:
                address.address_line2 = data['address_line2']
            if 'city' in data:
                address.city = data['city']
            if 'state' in data:
                address.state = data['state']
            if 'postal_code' in data:
                address.postal_code = data['postal_code']
            if 'country' in data:
                address.country = data['country']
            if 'phone' in data:
                address.phone = data['phone']
            if 'alternative_phone' in data:
                address.alternative_phone = data['alternative_phone']

            # Handle address type
            if 'address_type' in data:
                try:
                    address.address_type = AddressType(data['address_type'])
                except ValueError:
                    return jsonify({"error": "Invalid address type"}), 400

            # Handle default flag
            if 'is_default' in data and data['is_default'] and not address.is_default:
                # Remove default flag from other addresses
                Address.query.filter_by(
                    user_id=current_user_id,
                    is_default=True
                ).update({'is_default': False})
                address.is_default = True
            elif 'is_default' in data:
                address.is_default = data['is_default']

            address.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                "message": "Address updated successfully",
                "address": address_schema.dump(address)
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to update address", "details": str(e)}), 500

    return perform_update()

@validation_routes.route('/addresses/<int:address_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_address(address_id):
    """Delete an address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Check if this is the only address
        address_count = Address.query.filter_by(user_id=current_user_id).count()

        # Delete the address
        db.session.delete(address)

        # If this was a default address and there are other addresses, set a new default
        if address.is_default and address_count > 1:
            # Find another address to make default
            another_address = Address.query.filter_by(user_id=current_user_id).first()
            if another_address:
                another_address.is_default = True

        db.session.commit()

        return jsonify({"message": "Address deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete address", "details": str(e)}), 500

@validation_routes.route('/addresses/default', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_default_address():
    """Get user's default address."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Find default address
        address = Address.query.filter_by(
            user_id=current_user_id,
            is_default=True
        ).first()

        if not address:
            # If no default address, get the first address
            address = Address.query.filter_by(user_id=current_user_id).first()

        if not address:
            return jsonify({"message": "No address found"}), 404

        return jsonify(address_schema.dump(address)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve default address", "details": str(e)}), 500

@validation_routes.route('/addresses/<int:address_id>/set-default', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def set_default_address(address_id):
    """Set an address as default."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        address = Address.query.get_or_404(address_id)

        # Ensure address belongs to current user
        if str(address.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Remove default flag from other addresses
        Address.query.filter_by(
            user_id=current_user_id,
            is_default=True
        ).update({'is_default': False})

        # Set this address as default
        address.is_default = True
        db.session.commit()

        return jsonify({
            "message": "Default address set successfully",
            "address": address_schema.dump(address)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to set default address", "details": str(e)}), 500

# ----------------------
# Order Routes with Validation
# ----------------------

@validation_routes.route('/orders', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_user_orders():
    """Get user's orders with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        current_user_id = get_jwt_identity()
        page, per_page = get_pagination_params()

        # Get filter parameters
        status = request.args.get('status')
        include_items = request.args.get('include_items', 'false').lower() == 'true'

        # Build query
        query = Order.query.filter_by(user_id=current_user_id)

        # Apply filters
        if status:
            try:
                order_status = OrderStatus(status)
                query = query.filter_by(status=order_status)
            except ValueError:
                pass  # Invalid status, ignore filter

        # Order by creation date, newest first
        query = query.order_by(Order.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format response
        orders = []
        for order in paginated.items:
            order_dict = {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value,
                'total_amount': order.total_amount,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status.value,
                'shipping_method': order.shipping_method,
                'shipping_cost': order.shipping_cost,
                'tracking_number': order.tracking_number,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items_count': len(order.items),
                'items': []  # Initialize items array
            }

            # Include order items with product details if requested
            if include_items:
                for item in order.items:
                    item_dict = {
                        'id': item.id,
                        'product_id': item.product_id,
                        'variant_id': item.variant_id,
                        'quantity': item.quantity,
                        'price': item.price,
                        'total': item.total,
                        'product': None,
                        'variant': None
                    }

                    # Add product details
                    product = Product.query.get(item.product_id)
                    if product:
                        item_dict['product'] = {
                            'id': product.id,
                            'name': product.name,
                            'slug': product.slug,
                            'thumbnail_url': product.thumbnail_url
                        }

                    # Add variant details if applicable
                    if item.variant_id:
                        variant = ProductVariant.query.get(item.variant_id)
                        if variant:
                            item_dict['variant'] = {
                                'id': variant.id,
                                'color': variant.color,
                                'size': variant.size
                            }

                    order_dict['items'].append(item_dict)

            orders.append(order_dict)

        return jsonify({
            "items": orders,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve orders", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order(order_id):
    """Get order by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user or user is admin
        user = User.query.get(current_user_id)
        if str(order.user_id) != current_user_id and user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        # Get order details with items and product information
        order_dict = {
            'id': order.id,
            'user_id': order.user_id,
            'order_number': order.order_number,
            'status': order.status.value,
            'total_amount': order.total_amount,
            'shipping_address': order.shipping_address,
            'billing_address': order.billing_address,
            'payment_method': order.payment_method,
            'payment_status': order.payment_status.value,
            'shipping_method': order.shipping_method,
            'shipping_cost': order.shipping_cost,
            'tracking_number': order.tracking_number,
            'notes': order.notes,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
            'items': []
        }

        # Add items with product details
        for item in order.items:
            item_dict = {
                'id': item.id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity,
                'price': item.price,
                'total': item.total,
                'product': None,
                'variant': None
            }

            # Add product details
            product = Product.query.get(item.product_id)
            if product:
                item_dict['product'] = {
                    'id': product.id,
                    'name': product.name,
                    'slug': product.slug,
                    'thumbnail_url': product.thumbnail_url
                }

            # Add variant details if applicable
            if item.variant_id:
                variant = ProductVariant.query.get(item.variant_id)
                if variant:
                    item_dict['variant'] = {
                        'id': variant.id,
                        'color': variant.color,
                        'size': variant.size
                    }

            order_dict['items'].append(item_dict)

        return jsonify(order_dict), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve order", "details": str(e)}), 500

@validation_routes.route('/orders', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_order_creation(lambda: get_jwt_identity())
def create_order():
    """Create a new order with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Process shipping and billing addresses
        shipping_address = None
        billing_address = None

        # Get shipping address
        if 'shipping_address_id' in data:
            address = Address.query.get(data['shipping_address_id'])
            shipping_address = address.to_dict()
        elif 'shipping_address' in data:
            shipping_address = data['shipping_address']

        # Get billing address
        if data.get('same_as_shipping', False):
            billing_address = shipping_address
        elif 'billing_address_id' in data:
            address = Address.query.get(data['billing_address_id'])
            billing_address = address.to_dict()
        elif 'billing_address' in data:
            billing_address = data['billing_address']

        # Get cart items
        cart_items = CartItem.query.filter_by(user_id=current_user_id).all()

        if not cart_items:
            return jsonify({"error": "Cart is empty"}), 400

        # Calculate total amount
        total_amount = 0
        order_items = []

        for cart_item in cart_items:
            product = Product.query.get(cart_item.product_id)
            if not product:
                continue

            variant = None
            if cart_item.variant_id:
                variant = ProductVariant.query.get(cart_item.variant_id)

            price = variant.price if variant and variant.price else (product.sale_price or product.price)
            item_total = price * cart_item.quantity
            total_amount += item_total

            order_items.append({
                "product_id": cart_item.product_id,
                "variant_id": cart_item.variant_id,
                "quantity": cart_item.quantity,
                "price": price,
                "total": item_total
            })

        # Apply shipping cost
        shipping_cost = data.get('shipping_cost', 0)
        total_amount += shipping_cost

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0

        if coupon_code:
            coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()
            if coupon:
                # Check if coupon is valid
                now = datetime.utcnow()
                if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
                    return jsonify({"error": "Coupon is not valid at this time"}), 400

                # Check if coupon has reached usage limit
                if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
                    return jsonify({"error": "Coupon usage limit reached"}), 400

                # Apply discount
                if coupon.type == CouponType.PERCENTAGE:
                    discount = total_amount * (coupon.value / 100)
                    if coupon.max_discount and discount > coupon.max_discount:
                        discount = coupon.max_discount
                else:  # Fixed amount
                    discount = coupon.value

                total_amount -= discount

                # Increment coupon usage
                coupon.used_count += 1

        # Generate order number
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        # Create order
        new_order = Order(
            user_id=current_user_id,
            order_number=order_number,
            status=OrderStatus.PENDING,
            total_amount=total_amount,
            shipping_address=shipping_address,
            billing_address=billing_address,
            payment_method=data['payment_method'],
            payment_status=PaymentStatus.PENDING,
            shipping_method=data.get('shipping_method'),
            shipping_cost=shipping_cost,
            notes=data.get('notes')
        )

        db.session.add(new_order)
        db.session.flush()  # Get the order ID

        # Create order items
        for item_data in order_items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item_data['product_id'],
                variant_id=item_data['variant_id'],
                quantity=item_data['quantity'],
                price=item_data['price'],
                total=item_data['total']
            )
            db.session.add(order_item)

        # Clear cart
        CartItem.query.filter_by(user_id=current_user_id).delete()

        db.session.commit()

        return jsonify({
            "message": "Order created successfully",
            "order": {
                'id': new_order.id,
                'order_number': new_order.order_number,
                'status': new_order.status.value,
                'total_amount': new_order.total_amount,
                'created_at': new_order.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create order", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>/cancel', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def cancel_order(order_id):
    """Cancel an order."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user
        if str(order.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Check if order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            return jsonify({"error": "Order cannot be cancelled at this stage"}), 400

        # Update order status
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()

        # Add cancellation reason if provided
        data = request.get_json()
        if data and 'reason' in data:
            order.notes = f"Cancellation reason: {data['reason']}"

        db.session.commit()

        return jsonify({
            "message": "Order cancelled successfully",
            "order": {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to cancel order", "details": str(e)}), 500

@validation_routes.route('/orders/<int:order_id>/status', methods=['PUT', 'OPTIONS'])
@cross_origin()
@admin_required
@validate_order_status_update(lambda: request.view_args.get('order_id'))
def update_order_status(order_id):
    """Update order status with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        order = Order.query.get_or_404(order_id)

        # Validate status transition
        try:
            new_status = OrderStatus(data['status'])

            if order.status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
                return jsonify({"error": "Cannot change status of a cancelled order"}), 400

            if order.status == OrderStatus.DELIVERED and new_status != OrderStatus.DELIVERED:
                return jsonify({"error": "Cannot change status of a delivered order"}), 400

            # Update order status
            order.status = new_status
            order.updated_at = datetime.utcnow()

            # Add tracking number if provided
            if 'tracking_number' in data:
                order.tracking_number = data['tracking_number']

            # Add notes if provided
            if 'notes' in data:
                order.notes = data['notes']

            db.session.commit()

            return jsonify({
                "message": "Order status updated successfully",
                "order": {
                    'id': order.id,
                    'order_number': order.order_number,
                    'status': order.status.value
                }
            }), 200

        except ValueError:
            return jsonify({"error": "Invalid status value"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update order status", "details": str(e)}), 500

# Removed duplicate definition of get_order_stats to avoid conflicts.

@validation_routes.route('/orders/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_order_stats():
    """Get order statistics for the current user."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        # Get all orders for the user
        orders = Order.query.filter_by(user_id=current_user_id).all()

        # Initialize stats
        stats = {
            'total': len(orders),
            'pending': 0,
            'processing': 0,
            'shipped': 0,
            'delivered': 0,
            'cancelled': 0,
            'returned': 0
        }

        # Count orders by status
        for order in orders:
            status = order.status.value.lower()
            if status in stats:
                stats[status] += 1
            # Handle "canceled" vs "cancelled" inconsistency
            elif status == 'canceled' and 'cancelled' in stats:
                stats['cancelled'] += 1

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve order statistics", "details": str(e)}), 500
# ----------------------
# Payment Routes with Validation
# ----------------------

@validation_routes.route('/orders/<int:order_id>/payments', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_payment_creation(lambda: get_jwt_identity(), lambda: request.view_args.get('order_id'))
def create_payment(order_id):
    """Create a payment with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        order = Order.query.get_or_404(order_id)

        # Ensure order belongs to current user
        if str(order.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Create payment
        new_payment = Payment(
            order_id=order_id,
            amount=data['amount'],
            payment_method=data['payment_method'],
            transaction_id=data['transaction_id'],
            transaction_data=data.get('transaction_data'),
            status=PaymentStatus.COMPLETED,
            completed_at=datetime.utcnow()
        )

        db.session.add(new_payment)

        # Update order payment status
        order.payment_status = PaymentStatus.COMPLETED

        db.session.commit()

        return jsonify({
            "message": "Payment processed successfully",
            "payment": payment_schema.dump(new_payment)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to process payment", "details": str(e)}), 500

@validation_routes.route('/mpesa/initiate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_mpesa_payment()
def initiate_mpesa_payment():
    """Initiate M-Pesa payment with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data

        # Here you would integrate with the M-Pesa API
        # This is a placeholder for the actual implementation

        return jsonify({
            "message": "M-Pesa payment initiated",
            "checkout_request_id": "sample-request-id",
            "phone": data['phone'],
            "amount": data['amount']
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to initiate M-Pesa payment", "details": str(e)}), 500

# ----------------------
# Review Routes with Validation
# ----------------------

@validation_routes.route('/products/<int:product_id>/reviews', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_product_reviews():
    """Get reviews for a product."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        Product.query.get_or_404(product_id)  # Ensure product exists
        page, per_page = get_pagination_params()

        query = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc())

        return jsonify(paginate_response(query, reviews_schema, page, per_page)), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve reviews", "details": str(e)}), 500

@validation_routes.route('/products/<int:product_id>/reviews', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_review_creation(lambda: get_jwt_identity(), lambda: request.view_args.get('product_id'))
def create_review(product_id):
    """Create a review with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        # Create new review
        new_review = Review(
            user_id=current_user_id,
            product_id=product_id,
            rating=data['rating'],
            title=data.get('title'),
            comment=data.get('comment'),
            images=data.get('images', []),
            is_verified_purchase=False  # This would be set based on order history
        )

        # Check if user has purchased this product
        has_purchased = Order.query.join(OrderItem).filter(
            Order.user_id == current_user_id,
            OrderItem.product_id == product_id,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.SHIPPED])
        ).first() is not None

        if has_purchased:
            new_review.is_verified_purchase = True

        db.session.add(new_review)
        db.session.commit()

        return jsonify({
            "message": "Review submitted successfully",
            "review": review_schema.dump(new_review)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create review", "details": str(e)}), 500

@validation_routes.route('/reviews/<int:review_id>', methods=['PUT', 'PATCH', 'OPTIONS'])
@cross_origin()
@jwt_required()
@validate_review_update(lambda: get_jwt_identity(), lambda: request.view_args.get('review_id'))
def update_review(review_id):
    """Update a review with validation."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Data is already validated by the decorator
        data = g.validated_data
        current_user_id = get_jwt_identity()

        review = Review.query.get_or_404(review_id)

        # Ensure review belongs to current user
        if str(review.user_id) != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403

        if 'rating' in data:
            review.rating = data['rating']
        if 'title' in data:
            review.title = data['title']
        if 'comment' in data:
            review.comment = data['comment']
        if 'images' in data:
            review.images = data['images']

        review.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Review updated successfully",
            "review": review_schema.dump(review)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update review", "details": str(e)}), 500

@validation_routes.route('/reviews/<int:review_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_review(review_id):
    """Delete a review."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        review = Review.query.get_or_404(review_id)

        # Ensure review belongs to current user or user is admin
        user = User.query.get(current_user_id)
        if str(review.user_id) != current_user_id and user.role != UserRole.ADMIN:
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(review)
        db.session.commit()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete review", "details": str(e)}), 500

# ----------------------
# Wishlist Routes with Validation
# ----------------------

@validation_routes.route('/wishlist', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_wishlist():
    """Get user's wishlist items."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        wishlist_items = WishlistItem.query.filter_by(user_id=current_user_id).all()

        # Enhance wishlist items with product details
        wishlist_data = []

        for item in wishlist_items:
            product = Product.query.get(item.product_id)
            if not product:
                continue

            wishlist_data.append({
                "id": item.id,
                "product_id": item.product_id,
                "created_at": item.created_at.isoformat(),
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "price": product.price,
                    "sale_price": product.sale_price,
                    "thumbnail_url": product.thumbnail_url,
                    "image_urls": product.image_urls
                }
            })

        return jsonify({
            "items": wishlist_data,
            "item_count": len(wishlist_data)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def add_to_wishlist():
    """Add item to wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        # Validate required fields
        if not data or not data.get('product_id'):
            return jsonify({"error": "Product ID is required"}), 400

        product_id = int(data.get('product_id'))
        product = Product.query.get_or_404(product_id)

        # Check if item already exists in wishlist
        existing_item = WishlistItem.query.filter_by(
            user_id=current_user_id,
            product_id=product.id
        ).first()

        if existing_item:
            return jsonify({
                "message": "Item already in wishlist",
                "item": wishlist_item_schema.dump(existing_item)
            }), 200
        else:
            # Create new wishlist item
            new_item = WishlistItem(
                user_id=current_user_id,
                product_id=product.id
            )

            db.session.add(new_item)
            db.session.commit()

            return jsonify({
                "message": "Item added to wishlist",
                "item": wishlist_item_schema.dump(new_item)
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to add item to wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist/<int:item_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def remove_from_wishlist(item_id):
    """Remove item from wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()
        item = WishlistItem.query.get_or_404(item_id)

        # Ensure item belongs to current user
        if int(current_user_id) != item.user_id:
            return jsonify({"error": "Unauthorized"}), 403

        db.session.delete(item)
        db.session.commit()

        return jsonify({"message": "Item removed from wishlist"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to remove item from wishlist", "details": str(e)}), 500

@validation_routes.route('/wishlist/clear', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def clear_wishlist():
    """Clear entire wishlist."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        current_user_id = get_jwt_identity()

        WishlistItem.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()

        return jsonify({"message": "Wishlist cleared successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to clear wishlist", "details": str(e)}), 500

# ----------------------
# Coupon Routes with Validation
# ----------------------

@validation_routes.route('/coupons/validate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def validate_coupon():
    """Validate a coupon code."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json()

        if not data.get('code'):
            return jsonify({"error": "Coupon code is required"}), 400

        coupon = Coupon.query.filter_by(code=data['code'], is_active=True).first()

        if not coupon:
            return jsonify({"error": "Invalid coupon code"}), 404

        # Check if coupon is valid
        now = datetime.utcnow()
        if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
            return jsonify({"error": "Coupon is not valid at this time"}), 400

        # Check if coupon has reached usage limit
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            return jsonify({"error": "Coupon usage limit reached"}), 400

        return jsonify({
            "valid": True,
            "coupon": coupon_schema.dump(coupon)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to validate coupon", "details": str(e)}), 500

# Add this new test endpoint at the end of the file, just before the last line

@validation_routes.route('/test-email', methods=['GET', 'OPTIONS'])
@cross_origin()
def test_email():
    """Test endpoint to verify email sending functionality."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Email to test
        test_email = request.args.get('email', "REDACTED-SENDER-EMAIL")

        # Log the test attempt
        logger.info(f"Testing email sending to {test_email}")

        # Generate a verification code
        verification_code = generate_otp()

        # Create an email template
        email_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MIZIZZI Email Test</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .container {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }}
                .header {{ text-align: center; margin-bottom: 20px; }}
                h1 {{ color: #333; font-size: 24px; margin-bottom: 20px; }}
                .verification-code {{ background-color: #f5f5f5; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MIZIZZI Email Test</h1>
                </div>
                <p>Hello,</p>
                <p>This is a test email to verify that the email integration is working correctly.</p>

                <p>Your test verification code is:</p>
                <div class="verification-code">{verification_code}</div>

                <p>If you did not request this test, please ignore this email.</p>

                <div class="footer">
                    <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                    <p>This is an automated test message.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Get mail configuration for debugging
        mail_config = {
            'MAIL_SERVER': current_app.config.get('MAIL_SERVER'),
            'MAIL_PORT': current_app.config.get('MAIL_PORT'),
            'MAIL_USE_TLS': current_app.config.get('MAIL_USE_TLS'),
            'MAIL_USE_SSL': current_app.config.get('MAIL_USE_SSL'),
            'MAIL_USERNAME': current_app.config.get('MAIL_USERNAME'),
            'MAIL_DEFAULT_SENDER': current_app.config.get('MAIL_DEFAULT_SENDER'),
            'BREVO_API_KEY': bool(current_app.config.get('BREVO_API_KEY'))
        }

        # Try direct Brevo API first for testing
        try:
            brevo_api_key = current_app.config.get('BREVO_API_KEY')
            if brevo_api_key:
                url = "https://api.brevo.com/v3/smtp/email"

                # Prepare the payload for Brevo API
                payload = {
                    "sender": {
                        "name": "MIZIZZI Test",
                        "email": current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@mizizzi.com')
                    },
                    "to": [{"email": test_email}],
                    "subject": "MIZIZZI - Test Email (Direct API)",
                    "htmlContent": email_template,
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

                logger.info(f"Sending test email via Brevo API to {test_email}")
                response = requests.post(url, json=payload, headers=headers)

                if response.status_code >= 200 and response.status_code < 300:
                    logger.info(f"Test email sent via Brevo API. Status: {response.status_code}")
                    return jsonify({
                        'success': True,
                        'message': 'Test email sent successfully using Brevo API directly',
                        'verification_code': verification_code,
                        'mail_config': mail_config,
                        'brevo_response': response.json()
                    }), 200
                else:
                    logger.error(f"Brevo API error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Error using Brevo API directly: {str(e)}")

        # Fall back to the regular send_email function
        email_sent = send_email(test_email, "MIZIZZI - Test Email", email_template)

        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Test email sent successfully',
                'verification_code': verification_code,
                'mail_config': mail_config,
                'recipient': test_email
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send test email',
                'mail_config': mail_config
            }), 500

    except Exception as e:
        logger.error(f"Test email error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during test email sending',
            'error': str(e)
        }), 500

# Error handlers
@validation_routes.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@validation_routes.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

@validation_routes.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "Unauthorized"}), 401

@validation_routes.errorhandler(403)
def forbidden(error):
    return jsonify({"error": "Forbidden"}), 403

@validation_routes.errorhandler(500)
def internal_server_error(error):
    db.session.rollback()
    return jsonify({"error": "Internal server error"}), 500
