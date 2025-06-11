"""
Database initialization script to create all tables and handle dependencies
"""
from backend.app import create_app
from app.models.models import db
from app.models.search_analytics import SearchQuery, SearchClick, SearchConversion, SearchSuggestion, SearchPerformanceMetric

def init_database():
    """Initialize the database with all tables"""
    app = create_app()

    with app.app_context():
        try:
            # Drop all tables first (be careful in production!)
            print("Dropping existing tables...")
            db.drop_all()

            # Create all tables
            print("Creating all tables...")
            db.create_all()

            print("Database initialized successfully!")

        except Exception as e:
            print(f"Error initializing database: {e}")
            db.session.rollback()
        finally:
            db.session.close()

if __name__ == '__main__':
    init_database()
