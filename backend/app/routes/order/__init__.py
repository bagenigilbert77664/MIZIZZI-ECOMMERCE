"""
Order routes package initialization.
Exports both user and admin order blueprints.
"""
from .order_routes import order_routes
from .admin_order_routes import admin_order_routes
from .order_email_templates import send_order_confirmation_email, send_order_status_update_email
from .order_completion_handler import handle_order_completion

__all__ = [
    'order_routes',
    'admin_order_routes',
    'send_order_confirmation_email',
    'send_order_status_update_email',
    'handle_order_completion'
]
