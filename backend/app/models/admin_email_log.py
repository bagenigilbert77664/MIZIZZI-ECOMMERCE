from datetime import datetime
from ..configuration.extensions import db

class AdminEmailLog(db.Model):
    """Model to track emails sent by admins to users."""
    __tablename__ = 'admin_email_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    admin_id = db.Column(db.Integer, nullable=True)
    subject = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default='sent')

    # Relationship
    user = db.relationship('User', backref='admin_emails_received')

    def __repr__(self):
        return f'<AdminEmailLog {self.id}: {self.subject} to User {self.user_id}>'
