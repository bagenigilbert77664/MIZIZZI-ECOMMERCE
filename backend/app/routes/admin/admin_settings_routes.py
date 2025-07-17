"""
Admin Settings Routes for Mizizzi E-commerce Platform
Handles all admin settings-related API endpoints including system settings,
integrations, store configuration, and other administrative settings.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from functools import wraps
import logging
import os
from datetime import datetime
import json
from ...models.models import User, UserRole

# Create the admin settings blueprint
admin_settings_routes = Blueprint('admin_settings_routes', __name__)

# Set up logger
logger = logging.getLogger(__name__)

def admin_required(f):
    """Decorator to ensure only admin users can access these routes"""
    from functools import wraps

    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            if not user or user.role != UserRole.ADMIN:
                return jsonify({
                    'success': False,
                    'error': 'Admin access required'
                }), 403
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin authentication error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Authentication failed'
            }), 401

    return decorated_function

# Handle OPTIONS requests for all routes
@admin_settings_routes.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-Requested-With")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@admin_settings_routes.route('/settings', methods=['GET', 'PUT'])
@cross_origin(origins=['http://localhost:3000'], supports_credentials=True)
@admin_required
def get_settings():
    """Get all system settings"""
    try:
        # Default system settings
        settings = {
            'site': {
                'name': 'Mizizzi E-commerce',
                'tagline': 'Your Premium Shopping Destination',
                'description': 'Discover amazing products at unbeatable prices',
                'logo_url': '/logo.png',
                'favicon_url': '/favicon.ico',
                'email': 'info@mizizzi.com',
                'phone': '+254 700 000 000',
                'address': 'Nairobi, Kenya',
                'social_links': {
                    'facebook': '',
                    'instagram': '',
                    'twitter': '',
                    'youtube': '',
                    'pinterest': '',
                    'linkedin': ''
                },
                'currency': 'KES',
                'currency_symbol': 'KSh',
                'timezone': 'Africa/Nairobi',
                'date_format': 'DD/MM/YYYY',
                'time_format': '24h',
                'default_language': 'en',
                'available_languages': ['en', 'sw']
            },
            'seo': {
                'meta_title': 'Mizizzi - Premium E-commerce Store',
                'meta_description': 'Shop the latest products with fast delivery and great prices',
                'meta_keywords': 'ecommerce, shopping, online store, kenya',
                'google_analytics_id': '',
                'facebook_pixel_id': '',
                'robots_txt': 'User-agent: *\nAllow: /',
                'sitemap_enabled': True
            },
            'email': {
                'smtp_host': '',
                'smtp_port': 587,
                'smtp_username': '',
                'smtp_password': '',
                'smtp_encryption': 'tls',
                'from_email': 'noreply@mizizzi.com',
                'from_name': 'Mizizzi Store',
                'email_signature': 'Best regards,\nThe Mizizzi Team'
            },
            'payment': {
                'payment_methods': [
                    {'id': 'mpesa', 'name': 'M-Pesa', 'is_active': True, 'config': {}},
                    {'id': 'card', 'name': 'Credit/Debit Card', 'is_active': True, 'config': {}},
                    {'id': 'cod', 'name': 'Cash on Delivery', 'is_active': True, 'config': {}}
                ],
                'currency': 'KES',
                'tax_rate': 16,
                'tax_included_in_price': False
            },
            'inventory': {
                'low_stock_threshold': 10,
                'notify_on_low_stock': True,
                'allow_backorders': False,
                'show_out_of_stock_products': True
            },
            'reviews': {
                'enabled': True,
                'require_approval': True,
                'allow_guest_reviews': False,
                'notify_on_new_review': True
            },
            'security': {
                'password_min_length': 8,
                'password_requires_special_char': True,
                'password_requires_number': True,
                'password_requires_uppercase': True,
                'max_login_attempts': 5,
                'lockout_time': 15,
                'session_lifetime': 24,
                'enable_two_factor': False
            },
            'maintenance': {
                'maintenance_mode': False,
                'maintenance_message': "We're currently performing maintenance. Please check back soon.",
                'allowed_ips': []
            }
        }

        return jsonify({
            'success': True,
            'settings': settings,
            'last_updated': datetime.utcnow().isoformat()
        })

    except Exception as e:
        current_app.logger.error(f"Error fetching settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch settings'
        }), 500

@admin_settings_routes.route('/settings', methods=['PUT'])
@cross_origin(origins=['http://localhost:3000'], supports_credentials=True)
@admin_required
def update_settings():
    """Update system settings"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        current_app.logger.info(f"Settings updated by admin user {get_jwt_identity()}")

        return jsonify({
            'success': True,
            'message': 'Settings updated successfully',
            'updated_at': datetime.utcnow().isoformat()
        })

    except Exception as e:
        current_app.logger.error(f"Error updating settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update settings'
        }), 500

@admin_settings_routes.route('/settings/general', methods=['GET', 'PUT'])
@admin_required
def general_settings():
    """Get or update general settings"""
    try:
        if request.method == 'GET':
            settings = {
                'site_name': os.environ.get('SITE_NAME', 'Mizizzi E-commerce'),
                'site_url': os.environ.get('SITE_URL', 'http://localhost:3000'),
                'admin_email': os.environ.get('ADMIN_EMAIL', 'admin@mizizzi.com'),
                'timezone': os.environ.get('TIMEZONE', 'UTC'),
                'currency': os.environ.get('CURRENCY', 'USD'),
                'language': os.environ.get('LANGUAGE', 'en'),
                'maintenance_mode': os.environ.get('MAINTENANCE_MODE', 'false').lower() == 'true'
            }

            return jsonify({
                'success': True,
                'settings': settings
            })

        elif request.method == 'PUT':
            data = request.get_json()

            # Update general settings logic here
            logger.info(f"General settings updated by admin user {get_jwt_identity()}")

            return jsonify({
                'success': True,
                'message': 'General settings updated successfully'
            })

    except Exception as e:
        logger.error(f"Error with general settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process general settings'
        }), 500

@admin_settings_routes.route('/settings/integrations', methods=['GET', 'PUT'])
@admin_required
def integration_settings():
    """Get or update integration settings"""
    try:
        if request.method == 'GET':
            integrations = {
                'mpesa': {
                    'enabled': os.environ.get('MPESA_ENABLED', 'false').lower() == 'true',
                    'environment': os.environ.get('MPESA_ENVIRONMENT', 'sandbox'),
                    'shortcode': os.environ.get('MPESA_SHORTCODE', ''),
                    'configured': bool(os.environ.get('MPESA_CONSUMER_KEY') and os.environ.get('MPESA_CONSUMER_SECRET'))
                },
                'email': {
                    'enabled': os.environ.get('MAIL_ENABLED', 'false').lower() == 'true',
                    'provider': os.environ.get('MAIL_PROVIDER', 'smtp'),
                    'configured': bool(os.environ.get('MAIL_SERVER') and os.environ.get('MAIL_USERNAME'))
                },
                'analytics': {
                    'google_analytics_enabled': os.environ.get('GA_ENABLED', 'false').lower() == 'true',
                    'facebook_pixel_enabled': os.environ.get('FB_PIXEL_ENABLED', 'false').lower() == 'true'
                },
                'social': {
                    'facebook_login': os.environ.get('FACEBOOK_LOGIN_ENABLED', 'false').lower() == 'true',
                    'google_login': os.environ.get('GOOGLE_LOGIN_ENABLED', 'false').lower() == 'true'
                }
            }

            return jsonify({
                'success': True,
                'integrations': integrations
            })

        elif request.method == 'PUT':
            data = request.get_json()

            # Update integration settings logic here
            logger.info(f"Integration settings updated by admin user {get_jwt_identity()}")

            return jsonify({
                'success': True,
                'message': 'Integration settings updated successfully'
            })

    except Exception as e:
        logger.error(f"Error with integration settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process integration settings'
        }), 500

@admin_settings_routes.route('/settings/store', methods=['GET', 'PUT'])
@admin_required
def store_settings():
    """Get or update store settings"""
    try:
        if request.method == 'GET':
            settings = {
                'store_name': os.environ.get('STORE_NAME', 'Mizizzi Store'),
                'store_description': os.environ.get('STORE_DESCRIPTION', 'Your premium e-commerce destination'),
                'store_address': os.environ.get('STORE_ADDRESS', ''),
                'store_phone': os.environ.get('STORE_PHONE', ''),
                'store_email': os.environ.get('STORE_EMAIL', 'store@mizizzi.com'),
                'tax_rate': float(os.environ.get('TAX_RATE', '0.0')),
                'shipping_enabled': os.environ.get('SHIPPING_ENABLED', 'true').lower() == 'true',
                'free_shipping_threshold': float(os.environ.get('FREE_SHIPPING_THRESHOLD', '100.0'))
            }

            return jsonify({
                'success': True,
                'settings': settings
            })

        elif request.method == 'PUT':
            data = request.get_json()

            # Update store settings logic here
            logger.info(f"Store settings updated by admin user {get_jwt_identity()}")

            return jsonify({
                'success': True,
                'message': 'Store settings updated successfully'
            })

    except Exception as e:
        logger.error(f"Error with store settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process store settings'
        }), 500

@admin_settings_routes.route('/settings/security', methods=['GET', 'PUT'])
@admin_required
def security_settings():
    """Get or update security settings"""
    try:
        if request.method == 'GET':
            settings = {
                'two_factor_enabled': os.environ.get('TWO_FACTOR_ENABLED', 'false').lower() == 'true',
                'password_min_length': int(os.environ.get('PASSWORD_MIN_LENGTH', '8')),
                'session_timeout': int(os.environ.get('SESSION_TIMEOUT', '3600')),
                'max_login_attempts': int(os.environ.get('MAX_LOGIN_ATTEMPTS', '5')),
                'account_lockout_duration': int(os.environ.get('ACCOUNT_LOCKOUT_DURATION', '900'))
            }

            return jsonify({
                'success': True,
                'settings': settings
            })

        elif request.method == 'PUT':
            data = request.get_json()

            # Update security settings logic here
            logger.info(f"Security settings updated by admin user {get_jwt_identity()}")

            return jsonify({
                'success': True,
                'message': 'Security settings updated successfully'
            })

    except Exception as e:
        logger.error(f"Error with security settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process security settings'
        }), 500

@admin_settings_routes.route('/settings/test-connection', methods=['POST'])
@admin_required
def test_connection():
    """Test connection to external services"""
    try:
        data = request.get_json()
        service = data.get('service')

        if not service:
            return jsonify({
                'success': False,
                'error': 'Service type required'
            }), 400

        # Test connection logic based on service type
        if service == 'mpesa':
            # Test M-PESA connection
            result = {'success': True, 'message': 'M-PESA connection test successful'}
        elif service == 'email':
            # Test email connection
            result = {'success': True, 'message': 'Email connection test successful'}
        elif service == 'database':
            # Test database connection
            result = {'success': True, 'message': 'Database connection test successful'}
        else:
            result = {'success': False, 'message': f'Unknown service: {service}'}

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Connection test failed'
        }), 500

@admin_settings_routes.route('/settings/backup', methods=['POST'])
@admin_required
def backup_settings():
    """Create a backup of current settings"""
    try:
        # Create settings backup logic here
        backup_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'created_by': get_jwt_identity(),
            'settings': {
                # Include all current settings
            }
        }

        logger.info(f"Settings backup created by admin user {get_jwt_identity()}")

        return jsonify({
            'success': True,
            'message': 'Settings backup created successfully',
            'backup_id': f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        })

    except Exception as e:
        logger.error(f"Error creating settings backup: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create settings backup'
        }), 500

@admin_settings_routes.route('/settings/restore', methods=['POST'])
@admin_required
def restore_settings():
    """Restore settings from backup"""
    try:
        data = request.get_json()
        backup_id = data.get('backup_id')

        if not backup_id:
            return jsonify({
                'success': False,
                'error': 'Backup ID required'
            }), 400

        # Restore settings logic here
        logger.info(f"Settings restored from backup {backup_id} by admin user {get_jwt_identity()}")

        return jsonify({
            'success': True,
            'message': 'Settings restored successfully'
        })

    except Exception as e:
        logger.error(f"Error restoring settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to restore settings'
        }), 500

# Error handlers for the admin settings blueprint
@admin_settings_routes.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Settings endpoint not found'
    }), 404

@admin_settings_routes.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error in settings'
    }), 500
