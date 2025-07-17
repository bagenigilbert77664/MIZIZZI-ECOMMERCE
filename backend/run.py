#!/usr/bin/env python3
"""
Simple run script for Mizizzi E-commerce platform with colored terminal output.
This is the main entry point for running the development server.
"""

import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, Blueprint

# Add color support for terminal output
try:
    from colorama import init, Fore, Back, Style
    init(autoreset=True)
    COLORS_AVAILABLE = True
except ImportError:
    # Fallback if colorama is not installed
    class Fore:
        RED = GREEN = YELLOW = BLUE = MAGENTA = CYAN = WHITE = RESET = ""
    class Back:
        RED = GREEN = YELLOW = BLUE = MAGENTA = CYAN = WHITE = RESET = ""
    class Style:
        BRIGHT = DIM = NORMAL = RESET_ALL = ""
    COLORS_AVAILABLE = False

# Load environment variables
load_dotenv()

def print_colored(message, color=Fore.WHITE, style=Style.NORMAL):
    """Print colored message to terminal."""
    print(f"{style}{color}{message}{Style.RESET_ALL}")

def is_main_process():
    """Check if this is the main process (not a reloader subprocess)."""
    return os.environ.get('WERKZEUG_RUN_MAIN') != 'true'

def print_header():
    """Print application header with colors."""
    # Only print header in main process
    if not is_main_process():
        return

    print_colored("=" * 80, Fore.CYAN, Style.BRIGHT)
    print_colored("🚀 MIZIZZI E-COMMERCE BACKEND SERVER", Fore.YELLOW, Style.BRIGHT)
    print_colored("=" * 80, Fore.CYAN)
    print_colored(f"📅 Startup Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", Fore.GREEN)
    print_colored(f"🐍 Python Version: {sys.version.split()[0]}", Fore.GREEN)
    print_colored(f"📁 Working Directory: {os.getcwd()}", Fore.GREEN)
    print_colored("-" * 80, Fore.CYAN)

def print_config_info():
    """Print configuration information."""
    # Only print in main process
    if not is_main_process():
        return

    print_colored("⚙️  CONFIGURATION", Fore.MAGENTA, Style.BRIGHT)

    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    db_url = os.environ.get('DATABASE_URL', 'postgresql://mizizzi:junior2020@localhost:5432/mizizzi')

    print_colored(f"🌐 Host: {host}", Fore.CYAN)
    print_colored(f"🔌 Port: {port}", Fore.CYAN)
    print_colored(f"🔧 Debug Mode: {'ON' if debug else 'OFF'}", Fore.GREEN if debug else Fore.YELLOW)
    print_colored(f"🗄️  Database: {db_url.split('@')[-1] if '@' in db_url else 'Local SQLite'}", Fore.CYAN)
    print_colored("-" * 80, Fore.CYAN)

def setup_logging():
    """Configure colored logging."""
    class ColoredFormatter(logging.Formatter):
        """Custom formatter with colors."""

        COLORS = {
            'DEBUG': Fore.BLUE,
            'INFO': Fore.GREEN,
            'WARNING': Fore.YELLOW,
            'ERROR': Fore.RED,
            'CRITICAL': Fore.RED + Style.BRIGHT
        }

        def format(self, record):
            if COLORS_AVAILABLE:
                color = self.COLORS.get(record.levelname, Fore.WHITE)
                record.levelname = f"{color}{record.levelname}{Style.RESET_ALL}"
                record.name = f"{Fore.CYAN}{record.name}{Style.RESET_ALL}"
            return super().format(record)

    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
        datefmt='%H:%M:%S'
    )

    # Apply colored formatter to console handler
    if COLORS_AVAILABLE:
        for handler in logging.root.handlers:
            if isinstance(handler, logging.StreamHandler):
                handler.setFormatter(ColoredFormatter(
                    '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
                    datefmt='%H:%M:%S'
                ))

def create_app_with_error_handling():
    """Create Flask app with comprehensive error handling."""
    try:
        # Add backend directory to Python path
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if 'backend' in backend_dir:
            backend_dir = backend_dir
        else:
            backend_dir = os.path.join(backend_dir, 'backend')

        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        # Only print in main process
        if is_main_process():
            print_colored(f"📂 Backend Directory: {backend_dir}", Fore.GREEN)

        # Try importing the create_app function
        try:
            from backend import create_app
            if is_main_process():
                print_colored("✅ Imported create_app from backend module", Fore.GREEN)
        except ImportError:
            try:
                from app import create_app
                if is_main_process():
                    print_colored("✅ Imported create_app from app module", Fore.GREEN)
            except ImportError as e:
                if is_main_process():
                    print_colored(f"❌ Failed to import create_app: {str(e)}", Fore.RED)
                return None

        # Create the Flask application
        if is_main_process():
            print_colored("🔧 Creating Flask application...", Fore.YELLOW)

        app = create_app(config_name='development', enable_socketio=False)

        if app:
            if is_main_process():
                print_colored("✅ Flask application created successfully", Fore.GREEN)
            return app
        else:
            if is_main_process():
                print_colored("❌ Failed to create Flask application", Fore.RED)
            return None

    except Exception as e:
        if is_main_process():
            print_colored(f"❌ Error creating application: {str(e)}", Fore.RED)
            import traceback
            print_colored("📋 Full traceback:", Fore.YELLOW)
            traceback.print_exc()
        return None

def print_blueprint_info(app):
    """Print registered blueprints information with correct URL prefixes."""
    # Only print in main process
    if not is_main_process():
        return

    print_colored("📋 REGISTERED BLUEPRINTS", Fore.MAGENTA, Style.BRIGHT)

    if not app.blueprints:
        print_colored("⚠️  No blueprints registered", Fore.YELLOW)
        return

    # Create a mapping of expected URL prefixes
    expected_prefixes = {
        'validation_routes': '/api',
        'cart': '/api/cart',
        'admin_routes': '/api/admin',
        'dashboard_routes': '/api/admin/dashboard',
        'inventory': '/api/inventory',
        'order_routes': '/api/order',
        'admin_cart': '/api/admin/cart',
        'admin_cloudinary': '/api/admin/cloudinary',
        'product_images_batch': '(no prefix)',
        'search': '/api/search',
        'mpesa': '/api/mpesa'
    }

    for blueprint_name, blueprint in app.blueprints.items():
        # Try to get the actual URL prefix from the blueprint
        url_prefix = getattr(blueprint, 'url_prefix', None)

        # If no prefix found, check our expected mapping
        if not url_prefix and blueprint_name in expected_prefixes:
            url_prefix = expected_prefixes[blueprint_name]
        elif not url_prefix:
            url_prefix = '(no prefix)'

        # Color code based on whether we have a proper prefix
        if url_prefix and url_prefix != '(no prefix)':
            status_color = Fore.GREEN
            prefix_display = url_prefix
        else:
            status_color = Fore.YELLOW
            prefix_display = 'No prefix'

        print_colored(f"  📌 {blueprint_name}: {prefix_display}", status_color)

    print_colored(f"📊 Total blueprints: {len(app.blueprints)}", Fore.CYAN)

def print_endpoints_info(app):
    """Print available endpoints organized by category."""
    # Only print in main process
    if not is_main_process():
        return

    print_colored("🌐 AVAILABLE ENDPOINTS", Fore.MAGENTA, Style.BRIGHT)

    endpoints = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            methods = ', '.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
            endpoints.append((rule.rule, methods, rule.endpoint))

    # Categorize endpoints
    categories = {
        'Authentication': [ep for ep in endpoints if any(x in ep[0] for x in ['/auth/', '/login', '/register', '/verify', '/profile'])],
        'Products': [ep for ep in endpoints if '/products' in ep[0] and '/admin/' not in ep[0]],
        'Cart & Checkout': [ep for ep in endpoints if '/cart' in ep[0] and '/admin/' not in ep[0]],
        'Orders': [ep for ep in endpoints if '/order' in ep[0] and '/admin/' not in ep[0]],
        'Admin Dashboard': [ep for ep in endpoints if '/admin/dashboard' in ep[0]],
        'Admin Products': [ep for ep in endpoints if '/admin/products' in ep[0] or '/admin/categories' in ep[0] or '/admin/brands' in ep[0]],
        'Admin Orders': [ep for ep in endpoints if '/admin/orders' in ep[0]],
        'Admin Users': [ep for ep in endpoints if '/admin/users' in ep[0]],
        'Admin Other': [ep for ep in endpoints if '/admin/' in ep[0] and not any(x in ep[0] for x in ['/dashboard', '/products', '/orders', '/users', '/categories', '/brands'])],
        'Search & Inventory': [ep for ep in endpoints if any(x in ep[0] for x in ['/search', '/inventory'])],
        'Payments': [ep for ep in endpoints if '/mpesa' in ep[0]],
        'Other': [ep for ep in endpoints if not any(cat_check(ep[0]) for cat_check in [
            lambda x: '/auth/' in x or '/login' in x or '/register' in x or '/verify' in x or '/profile' in x,
            lambda x: '/products' in x and '/admin/' not in x,
            lambda x: '/cart' in x and '/admin/' not in x,
            lambda x: '/order' in x and '/admin/' not in x,
            lambda x: '/admin/' in x,
            lambda x: '/search' in x or '/inventory' in x,
            lambda x: '/mpesa' in x
        ])]
    }

    # Print each category
    for category_name, category_endpoints in categories.items():
        if category_endpoints:
            print_colored(f"  🔗 {category_name} ({len(category_endpoints)} endpoints):", Fore.CYAN)
            for rule, methods, endpoint in sorted(category_endpoints)[:5]:  # Show first 5
                print_colored(f"    {methods:15} {rule}", Fore.GREEN)
            if len(category_endpoints) > 5:
                print_colored(f"    ... and {len(category_endpoints) - 5} more", Fore.YELLOW)

    print_colored(f"📊 Total endpoints: {len(endpoints)}", Fore.CYAN)

def print_startup_complete(host, port, debug):
    """Print startup completion message."""
    # Only print in main process
    if not is_main_process():
        return

    print_colored("-" * 80, Fore.CYAN)
    print_colored("🎉 SERVER STARTUP COMPLETE", Fore.GREEN, Style.BRIGHT)
    print_colored(f"🌍 Server running at: http://{host}:{port}", Fore.YELLOW, Style.BRIGHT)
    print_colored(f"🔧 Debug mode: {'ENABLED' if debug else 'DISABLED'}", Fore.GREEN if debug else Fore.YELLOW)
    print_colored("📡 Press Ctrl+C to stop the server", Fore.CYAN)
    print_colored("=" * 80, Fore.CYAN, Style.BRIGHT)

def print_quick_test_info():
    """Print quick test endpoints for development."""
    # Only print in main process
    if not is_main_process():
        return

    print_colored("🧪 QUICK TEST ENDPOINTS", Fore.MAGENTA, Style.BRIGHT)
    test_endpoints = [
        ("Health Check", "GET", "http://localhost:5000/api/health-check"),
        ("Admin Health", "GET", "http://localhost:5000/api/admin/health"),
        ("Products List", "GET", "http://localhost:5000/api/products"),
        ("Categories List", "GET", "http://localhost:5000/api/categories"),
        ("Search Test", "GET", "http://localhost:5000/api/search/?q=test"),
    ]

    for name, method, url in test_endpoints:
        print_colored(f"  🔍 {name}: {method} {url}", Fore.GREEN)

    print_colored("-" * 80, Fore.CYAN)

def main():
    """Main function to start the Flask application."""
    # Print header
    print_header()

    # Setup logging
    setup_logging()

    # Print configuration
    print_config_info()

    # Create the Flask app
    if is_main_process():
        print_colored("🔨 INITIALIZING APPLICATION", Fore.MAGENTA, Style.BRIGHT)

    app = create_app_with_error_handling()

    if not app:
        if is_main_process():
            print_colored("💥 Failed to create application. Exiting.", Fore.RED, Style.BRIGHT)
        sys.exit(1)

    # Print blueprint and endpoint information (only in main process)
    if is_main_process():
        print_colored("-" * 80, Fore.CYAN)
        print_blueprint_info(app)
        print_colored("-" * 80, Fore.CYAN)
        print_endpoints_info(app)
        print_colored("-" * 80, Fore.CYAN)
        print_quick_test_info()

    # Get server configuration
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'

    # Print startup complete message
    print_startup_complete(host, port, debug)

    try:
        # Start the Flask development server
        app.run(
            host=host,
            port=port,
            debug=debug,
            use_reloader=debug,  # This is what causes the restart
            threaded=True
        )
    except KeyboardInterrupt:
        print_colored("\n🛑 Server stopped by user", Fore.YELLOW, Style.BRIGHT)
        print_colored("👋 Goodbye!", Fore.GREEN)
    except Exception as e:
        print_colored(f"\n💥 Server error: {str(e)}", Fore.RED, Style.BRIGHT)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
