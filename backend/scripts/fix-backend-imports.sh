#!/bin/bash

echo "🔧 Fixing backend import issues..."

# Set the backend directory
BACKEND_DIR="backend"

# Create __init__.py files to make directories Python packages
echo "📦 Creating __init__.py files..."

# Main backend directory
touch "${BACKEND_DIR}/__init__.py"

# Configuration directory
touch "${BACKEND_DIR}/configuration/__init__.py"

# Models directory
touch "${BACKEND_DIR}/models/__init__.py"

# Routes directory
touch "${BACKEND_DIR}/routes/__init__.py"
touch "${BACKEND_DIR}/routes/admin/__init__.py"
touch "${BACKEND_DIR}/routes/cart/__init__.py"
touch "${BACKEND_DIR}/routes/order/__init__.py"
touch "${BACKEND_DIR}/routes/payment/__init__.py"
touch "${BACKEND_DIR}/routes/checkout/__init__.py"
touch "${BACKEND_DIR}/routes/public/__init__.py"

# Schemas directory
touch "${BACKEND_DIR}/schemas/__init__.py"

# Validations directory
touch "${BACKEND_DIR}/validations/__init__.py"

# Services directory
touch "${BACKEND_DIR}/services/__init__.py"

echo "✅ Created all necessary __init__.py files"

# Fix Python path in run.py
echo "🔧 Updating run.py..."
cat > run.py << 'EOF'
#!/usr/bin/env python3

import os
import sys

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Add the backend directory to Python path
backend_dir = os.path.join(current_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == '__main__':
    try:
        from backend.app import create_app

        app = create_app('development')

        print("🚀 Starting Mizizzi E-commerce Backend Server...")
        print("📍 Server running at: http://localhost:5000")
        print("🔗 Admin API: http://localhost:5000/api/admin/")
        print("💡 Health check: http://localhost:5000/api/health")

        app.run(debug=True, host='0.0.0.0', port=5000)

    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("💡 Make sure all required packages are installed:")
        print("   pip install -r backend/requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Server Error: {e}")
        sys.exit(1)
EOF

chmod +x run.py

echo "✅ Backend import fixes completed!"
echo ""
echo "🚀 To start the server:"
echo "   python run.py"
echo ""
echo "🧪 To test admin routes:"
echo "   node app/tests/admin-routes-test.mjs"
