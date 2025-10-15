#!/usr/bin/env python3
"""
Main entry point for running the Mizizzi E-commerce Flask application.
"""
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, Blueprint
from pathlib import Path

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

def check_search_dependencies():
    """Check if search system dependencies are available."""
    try:
        import sentence_transformers
        import faiss
        import numpy
        return True
    except ImportError as e:
        if is_main_process():
            print_colored(f"⚠️  Search dependencies missing: {str(e)}", Fore.YELLOW)
            print_colored("   Install with: pip install sentence-transformers faiss-cpu numpy", Fore.CYAN)
        return False

def populate_search_index(app):
    """Populate the search index with existing products."""
    if not is_main_process():
        return False
    
    print_colored("🔍 INITIALIZING SEARCH SYSTEM", Fore.MAGENTA, Style.BRIGHT)
    
    # Check dependencies first
    if not check_search_dependencies():
        print_colored("❌ Search system disabled - missing dependencies", Fore.YELLOW)
        return False
    
    try:
        with app.app_context():
            # Import search components
            try:
                from app.routes.search.embedding_service import get_embedding_service
                from app.routes.search.search_service import get_search_service
                from app.models.models import Product
                from app.configuration.extensions import db
                
                print_colored("✅ Search components imported successfully", Fore.GREEN)
            except ImportError as e:
                print_colored(f"⚠️  Search components not available: {str(e)}", Fore.YELLOW)
                return False
            
            # Get embedding service
            embedding_service = get_embedding_service()
            
            if not embedding_service or not embedding_service.is_available():
                print_colored("⚠️  Embedding service not available", Fore.YELLOW)
                return False
            
            # Check current index status
            stats = embedding_service.get_index_stats()
            current_products = stats.get('total_products', 0)
            
            print_colored(f"📊 Current index contains: {current_products} products", Fore.CYAN)
            
            if current_products > 0:
                print_colored("✅ Search index already populated", Fore.GREEN)
                return True
            
            # Get all active products from database
            print_colored("🔄 Fetching products from database...", Fore.YELLOW)
            products = Product.query.filter_by(is_active=True).all()
            
            if not products:
                print_colored("⚠️  No active products found in database", Fore.YELLOW)
                print_colored("   Add some products first, then restart the server", Fore.CYAN)
                return False
            
            print_colored(f"📦 Found {len(products)} active products", Fore.GREEN)
            
            # Convert products to dictionaries
            print_colored("🔄 Processing products for indexing...", Fore.YELLOW)
            product_dicts = []
            processed_count = 0
            
            for product in products:
                try:
                    product_dict = product.to_dict()
                    
                    # Add related data
                    if product.category:
                        product_dict['category'] = product.category.to_dict()
                    
                    if product.brand:
                        product_dict['brand'] = product.brand.to_dict()
                    
                    product_dicts.append(product_dict)
                    processed_count += 1
                    
                    # Show progress for large datasets
                    if processed_count % 10 == 0:
                        print_colored(f"   Processed {processed_count}/{len(products)} products...", Fore.CYAN)
                    
                except Exception as e:
                    print_colored(f"⚠️  Error processing product {product.id}: {str(e)}", Fore.YELLOW)
                    continue
            
            if not product_dicts:
                print_colored("❌ No products could be processed for indexing", Fore.RED)
                return False
            
            print_colored(f"✅ Processed {len(product_dicts)} products successfully", Fore.GREEN)
            
            # Build the search index
            print_colored("🔄 Building FAISS search index...", Fore.YELLOW)
            print_colored("   This may take a moment for large product catalogs...", Fore.CYAN)
            
            success = embedding_service.rebuild_index(product_dicts)
            
            if success:
                # Get final stats
                final_stats = embedding_service.get_index_stats()
                indexed_products = final_stats.get('total_products', 0)
                
                print_colored("✅ Search index built successfully!", Fore.GREEN, Style.BRIGHT)
                print_colored(f"📊 Index statistics:", Fore.CYAN)
                print_colored(f"   • Total products indexed: {indexed_products}", Fore.GREEN)
                print_colored(f"   • Index dimension: {final_stats.get('dimension', 'Unknown')}", Fore.GREEN)
                print_colored(f"   • Index type: {final_stats.get('index_type', 'FAISS')}", Fore.GREEN)
                
                # Test the search system
                test_search_system(app)
                return True
            else:
                print_colored("❌ Failed to build search index", Fore.RED)
                return False
                
    except Exception as e:
        print_colored(f"❌ Error initializing search system: {str(e)}", Fore.RED)
        import traceback
        print_colored("📋 Full traceback:", Fore.YELLOW)
        traceback.print_exc()
        return False

def test_search_system(app):
    """Test the search system with sample queries."""
    if not is_main_process():
        return
    
    try:
        with app.app_context():
            from app.routes.search.search_service import get_search_service
            
            print_colored("🧪 Testing search functionality...", Fore.YELLOW)
            
            search_service = get_search_service()
            
            if not search_service:
                print_colored("⚠️  Search service not available for testing", Fore.YELLOW)
                return
            
            # Test with common search terms
            test_queries = ["phone", "laptop", "shirt", "shoes"]
            
            for query in test_queries[:2]:  # Test first 2 queries only
                try:
                    # Test hybrid search (combines semantic + keyword)
                    results = search_service.hybrid_search(query, limit=3)
                    
                    if results:
                        print_colored(f"✅ Search test '{query}': {len(results)} results", Fore.GREEN)
                        top_result = results[0]
                        score = top_result.get('search_score', 0)
                        name = top_result.get('name', 'Unknown')
                        print_colored(f"   Top result: {name} (score: {score:.3f})", Fore.CYAN)
                    else:
                        print_colored(f"⚠️  Search test '{query}': No results", Fore.YELLOW)
                        
                except Exception as e:
                    print_colored(f"⚠️  Search test '{query}' failed: {str(e)}", Fore.YELLOW)
            
            print_colored("✅ Search system testing completed", Fore.GREEN)
            
    except Exception as e:
        print_colored(f"⚠️  Search testing failed: {str(e)}", Fore.YELLOW)

def create_app_with_error_handling():
    """Create Flask app with comprehensive error handling."""
    try:
        # Add backend directory to Python path
        backend_dir = Path(__file__).parent
        sys.path.insert(0, str(backend_dir))
        
        # Only print in main process
        if is_main_process():
            print_colored(f"📂 Backend Directory: {backend_dir}", Fore.GREEN)
        
        # Try importing the create_app function
        try:
            from app import create_app
            if is_main_process():
                print_colored("✅ Imported create_app from app module", Fore.GREEN)
        except ImportError:
            try:
                from backend.app import create_app
                if is_main_process():
                    print_colored("✅ Imported create_app from backend module", Fore.GREEN)
            except ImportError as e:
                if is_main_process():
                    print_colored(f"❌ Failed to import create_app: {str(e)}", Fore.RED)
                return None
        
        # Create the Flask application
        if is_main_process():
            print_colored("🔧 Creating Flask application...", Fore.YELLOW)
        
        app = create_app(config_name='development', enable_socketio=True)
        
        if app:
            if is_main_process():
                print_colored("✅ Flask application created successfully", Fore.GREEN)
                print_colored("🔌 WebSocket server enabled", Fore.GREEN)
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
        ("Search Stats", "GET", "http://localhost:5000/api/admin/search/index/stats"),
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
            print_colored("🔧 Troubleshooting tips:", Fore.YELLOW)
            print_colored("   1. Check if all dependencies are installed: pip install -r requirements.txt", Fore.CYAN)
            print_colored("   2. Verify database connection settings", Fore.CYAN)
            print_colored("   3. Check if all environment variables are set", Fore.CYAN)
        sys.exit(1)
    
    # Initialize search system (only in main process)
    if is_main_process():
        print_colored("-" * 80, Fore.CYAN)
        search_success = populate_search_index(app)
        
        if search_success:
            print_colored("✅ Search system initialized successfully", Fore.GREEN, Style.BRIGHT)
        else:
            print_colored("⚠️  Search system initialization skipped or failed", Fore.YELLOW)
            print_colored("   The application will still work without search functionality", Fore.CYAN)
    
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
    
    # Setup logging for production
    if not app.debug:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )
    
    # Print startup complete message
    print_startup_complete(host, port, debug)
    
    try:
        if hasattr(app, 'socketio') and app.socketio is not None:
            # Start the Flask development server with SocketIO support
            if is_main_process():
                print_colored("🔌 Starting server with SocketIO support...", Fore.GREEN, Style.BRIGHT)
            
            app.socketio.run(
                app,
                host=host,
                port=port,
                debug=debug,
                use_reloader=debug,
                allow_unsafe_werkzeug=True  # Allow werkzeug in development
            )
        else:
            # Fallback to regular Flask server if SocketIO is not available
            if is_main_process():
                print_colored("⚠️  SocketIO not available, starting regular Flask server...", Fore.YELLOW)
            
            app.run(
                host=host,
                port=port,
                debug=debug,
                use_reloader=debug
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
