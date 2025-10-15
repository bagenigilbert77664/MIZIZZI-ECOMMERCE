"""
Admin routes package initialization
"""

from .admin import admin_routes
from .admin_cart_routes import admin_cart_routes
from .admin_settings_routes import admin_settings_routes

__all__ = ['admin_routes', 'admin_cart_routes', 'admin_settings_routes']
