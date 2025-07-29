from flask import Blueprint, jsonify, request, current_app
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError

db = SQLAlchemy()
admin_review_bp = Blueprint('admin_review', __name__)

# ...existing code...

@admin_review_bp.route('/<int:review_id>', methods=['GET', 'OPTIONS'])
@admin_required
def get_review_by_id(review_id):
    try:
        review = db.session.get(Review, review_id)
        if review is None:
            return jsonify({'error': 'Review not found'}), 404
        return jsonify({'review': review.to_dict()}), 200
    except SQLAlchemyError as e:
        current_app.logger.error(f"Error getting review: {e}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

# ...existing code...