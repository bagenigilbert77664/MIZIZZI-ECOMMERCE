#!/usr/bin/env python3

import os
import sys
import importlib.util
import traceback

def check_python_path():
    """Check if the backend directory is in the Python path"""
    print("=== Checking Python Path ===")

    # Get the backend directory path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    project_dir = os.path.dirname(backend_dir)

    print(f"Current directory: {current_dir}")
    print(f"Backend directory: {backend_dir}")
    print(f"Project directory: {project_dir}")

    # Check if backend is in sys.path
    if backend_dir in sys.path:
        print("✅ Backend directory is in Python path")
    else:
        print("❌ Backend directory is not in Python path")
        print("   Adding it now...")
        sys.path.insert(0, project_dir)
        print(f"✅ Added {project_dir} to Python path")

def check_backend_structure():
    """Check the structure of the backend module"""
    print("\n=== Checking Backend Structure ===")

    # Check if backend/__init__.py exists
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    init_path = os.path.join(backend_dir, '__init__.py')

    if os.path.exists(init_path):
        print(f"✅ Found {init_path}")

        # Check if create_app is defined in __init__.py
        with open(init_path, 'r') as f:
            content = f.read()
            if 'def create_app' in content:
                print("✅ create_app function found in __init__.py")
            else:
                print("❌ create_app function not found in __init__.py")
    else:
        print(f"❌ {init_path} not found")

def try_import_create_app():
    """Try to import create_app from different locations"""
    print("\n=== Trying to Import create_app ===")

    # Add the parent directory to sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(os.path.dirname(current_dir))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    # Try different import paths
    import_paths = [
        'backend',
        'backend.app',
        'MIZIZZI-ECOMMERCE3.backend',
        'backend.run'
    ]

    for path in import_paths:
        print(f"Trying to import from {path}...")
        try:
            module = importlib.import_module(path)
            if hasattr(module, 'create_app'):
                print(f"✅ Found create_app in {path}")
                return module.create_app
            else:
                print(f"❌ No create_app in {path}")
        except ImportError as e:
            print(f"❌ Import error: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")

    return None

def create_run_script():
    """Create a run.py script in the backend directory"""
    print("\n=== Creating run.py Script ===")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    run_path = os.path.join(backend_dir, 'run.py')

    script_content = '''"""
Run script for the Mizizzi E-commerce platform.
This script creates and runs the Flask application.
"""
from backend import create_app
from backend.websocket import socketio
import os

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

if __name__ == '__main__':
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
'''

    with open(run_path, 'w') as f:
        f.write(script_content)

    print(f"✅ Created {run_path}")
    print("   You can now run the app with: python backend/run.py")

def main():
    print("🔧 Flask App Fixer")
    print("=" * 50)

    # Check Python path
    check_python_path()

    # Check backend structure
    check_backend_structure()

    # Try to import create_app
    create_app = try_import_create_app()

    if create_app:
        print("\n🎉 Successfully found create_app function!")
        print("You can now run the Flask app")
    else:
        print("\n❌ Could not find create_app function")
        print("Creating a run.py script as a workaround...")
        create_run_script()

        print("\n📋 Next steps:")
        print("1. Make sure you're in the project root directory")
        print("2. Run the Flask app with: python backend/run.py")
        print("3. Or use: FLASK_APP=backend flask run")

if __name__ == "__main__":
    main()
