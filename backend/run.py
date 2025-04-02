import os
import eventlet
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Patch before any other imports
eventlet.monkey_patch()

from backend.app import create_app, socketio
from backend.app.configuration.extensions import db

app = create_app()

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    host = os.getenv('HOST', '0.0.0.0')  # Load from .env or use default
    port = int(os.getenv('PORT', 5000))  # Load from .env or default to 5000
    debug = os.getenv('DEBUG', 'False').lower() == 'true'  # Convert string to bool

    # Run with WebSocket support
    socketio.run(app, host=host, port=port, debug=debug)
