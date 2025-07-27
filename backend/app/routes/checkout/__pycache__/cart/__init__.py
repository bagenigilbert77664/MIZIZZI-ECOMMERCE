# Import the cart routes to make them available
try:
    from .cart_routes import cart_routes
except ImportError:
    # Fallback for when the module is run directly
    from backend.app.routes.cart.cart_routes import cart_routes
