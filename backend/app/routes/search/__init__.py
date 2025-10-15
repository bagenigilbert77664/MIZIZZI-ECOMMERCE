"""
Search routes package for Mizizzi E-commerce platform.
Provides both user and admin search functionality with AI-powered semantic search.
"""

try:
    from .user_search_routes import user_search_routes
    from .admin_search_routes import admin_search_routes
    from .search_service import SearchService, get_search_service
    from .embedding_service import EmbeddingService, get_embedding_service

    __all__ = [
        'user_search_routes',
        'admin_search_routes',
        'SearchService',
        'EmbeddingService',
        'get_search_service',
        'get_embedding_service'
    ]

except ImportError as e:
    # Create fallback components if imports fail
    from flask import Blueprint, jsonify

    user_search_routes = Blueprint('user_search_routes', __name__, url_prefix='/api/search')
    admin_search_routes = Blueprint('admin_search_routes', __name__, url_prefix='/api/admin/search')

    @user_search_routes.route('/health', methods=['GET'])
    def user_search_health():
        return jsonify({"status": "error", "message": f"Search routes import failed: {str(e)}"}), 500

    @admin_search_routes.route('/health', methods=['GET'])
    def admin_search_health():
        return jsonify({"status": "error", "message": f"Admin search routes import failed: {str(e)}"}), 500

    class SearchService:
        def __init__(self):
            self.error = str(e)
        def search(self, query):
            return {"error": "Search service not available", "details": self.error}

    class EmbeddingService:
        def __init__(self):
            self.error = str(e)
        def generate_embedding(self, text):
            return {"error": "Embedding service not available", "details": self.error}

    def get_search_service():
        return SearchService()

    def get_embedding_service():
        return EmbeddingService()

    __all__ = [
        'user_search_routes',
        'admin_search_routes',
        'SearchService',
        'EmbeddingService',
        'get_search_service',
        'get_embedding_service'
    ]
