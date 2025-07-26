"""
Products routes package for Mizizzi E-commerce platform.
Contains both user-facing and admin product management routes.
"""

from .products_routes import products_routes
from .admin_products_routes import admin_products_routes

__all__ = ['products_routes', 'admin_products_routes']
