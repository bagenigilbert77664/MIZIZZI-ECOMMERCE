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


if __name__ == '__main__':
    # Run with SocketIO instead of regular Flask server
    socketio.run(
        app,
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true',
        allow_unsafe_werkzeug=True
    )
