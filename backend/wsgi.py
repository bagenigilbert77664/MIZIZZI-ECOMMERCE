"""
WSGI entry point for production deployment.
This file is used by production WSGI servers like Gunicorn.
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import the app factory
from app import create_app

# Create the application instance
application = create_app(os.environ.get('FLASK_CONFIG', 'production'))

if __name__ == "__main__":
    application.run()
