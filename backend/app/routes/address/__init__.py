"""
Address routes package for Mizizzi E-commerce platform.
Contains both user and admin address management routes.
"""

from .user_address_routes import user_address_routes
from .admin_address_routes import admin_address_routes

__all__ = ['user_address_routes', 'admin_address_routes']
