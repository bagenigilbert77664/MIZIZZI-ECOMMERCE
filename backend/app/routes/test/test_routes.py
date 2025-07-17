"""
Test routes for Mizizzi E-commerce platform.
Provides endpoints for testing various components of the application.
"""
from flask import Blueprint, jsonify, current_app
from ...configuration.extensions import db

test_routes = Blueprint('test_routes', __name__)

@test_routes.route('/test-db-connection', methods=['GET'])
def test_db_connection():
    """Test database connection and return detailed status."""
    try:
        # Test database connection
        result = db.session.execute('SELECT 1').scalar()

        # Get database info
        db_info = db.session.execute('SELECT version()').scalar()

        return jsonify({
            "status": "success",
            "message": "Database connection successful",
            "test_result": result,
            "database_info": db_info
        }), 200
    except Exception as e:
        error_details = str(e)
        current_app.logger.error(f"Database connection test failed: {error_details}")

        # Provide more specific error messages based on common issues
        if "could not connect to server" in error_details:
            error_message = "Could not connect to database server. Is the database running?"
        elif "password authentication failed" in error_details:
            error_message = "Password authentication failed. Check your database credentials."
        elif "database" in error_details and "does not exist" in error_details:
            error_message = "The specified database does not exist."
        else:
            error_message = error_details

        return jsonify({
            "status": "error",
            "message": "Database connection failed",
            "error": error_message
        }), 500

@test_routes.route('/config-check', methods=['GET'])
def config_check():
    """Check application configuration (without revealing sensitive information)."""
    try:
        # Get database URI (hide password)
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', 'Not configured')
        if db_uri != 'Not configured':
            # Mask password in connection string if present
            parts = db_uri.split('@')
            if len(parts) > 1:
                auth_parts = parts[0].split(':')
                if len(auth_parts) > 2:
                    # Format: dialect+driver://username:password@host:port/database
                    masked_uri = f"{auth_parts[0]}:{auth_parts[1]}:****@{parts[1]}"
                    db_uri = masked_uri

        # Check if debug mode is enabled
        debug_mode = current_app.config.get('DEBUG', False)

        # Check environment
        environment = current_app.config.get('ENV', 'production')

        return jsonify({
            "status": "success",
            "config": {
                "database_uri": db_uri,
                "debug_mode": debug_mode,
                "environment": environment,
                "testing": current_app.config.get('TESTING', False),
                "secret_key_configured": bool(current_app.config.get('SECRET_KEY')),
                "cors_origins": current_app.config.get('CORS_ORIGINS', [])
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Config check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to check configuration",
            "error": str(e)
        }), 500
