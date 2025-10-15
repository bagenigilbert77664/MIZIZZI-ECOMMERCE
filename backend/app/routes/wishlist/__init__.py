"""
Wishlist routes package for Mizizzi E-commerce platform.
Provides both user and admin wishlist management functionality.
"""

from .user_wishlist_routes import user_wishlist_routes
from .admin_wishlist_routes import admin_wishlist_routes

__all__ = ['user_wishlist_routes', 'admin_wishlist_routes']
