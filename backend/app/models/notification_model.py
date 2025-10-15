"""
Notification Model for Mizizzi E-Commerce
Stores user notifications including payment notifications
"""

from ..configuration.extensions import db
from sqlalchemy.sql import func
from sqlalchemy import Enum as SQLEnum
import enum
from datetime import datetime, timezone

class NotificationType(enum.Enum):
    ORDER = "order"
    PAYMENT = "payment"
    SHIPPING = "shipping"
    SYSTEM = "system"
    PROMOTION = "promotion"
    PRODUCT = "product"
    ANNOUNCEMENT = "announcement"
    PRODUCT_UPDATE = "product_update"
    PRICE_CHANGE = "price_change"
    STOCK_ALERT = "stock_alert"

class NotificationPriority(enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    NORMAL = "normal"
    LOW = "low"

class Notification(db.Model):
    """Model to store user notifications"""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    type = db.Column(SQLEnum(NotificationType), nullable=False, default=NotificationType.SYSTEM)
    priority = db.Column(SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL)
    read = db.Column(db.Boolean, default=False, index=True)
    link = db.Column(db.String(500))
    image = db.Column(db.String(500))
    badge = db.Column(db.String(50))
    
    # Related entities
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    
    # Additional data stored as JSON
    data = db.Column(db.JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    read_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('notifications', lazy=True, cascade="all, delete-orphan"))
    order = db.relationship('Order', backref=db.backref('notifications', lazy=True))
    product = db.relationship('Product', backref=db.backref('notifications', lazy=True))
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_user_read_created', 'user_id', 'read', 'created_at'),
        db.Index('idx_user_type', 'user_id', 'type'),
    )

    def __repr__(self):
        return f"<Notification {self.id}: {self.title} for User {self.user_id}>"

    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'description': self.description or self.message,
            'type': self.type.value if hasattr(self.type, 'value') else self.type,
            'priority': self.priority.value if hasattr(self.priority, 'value') else self.priority,
            'read': self.read,
            'link': self.link,
            'image': self.image,
            'badge': self.badge,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'data': self.data,
            'date': self.created_at.isoformat() if self.created_at else None,
            'timestamp': self.format_timestamp(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

    def format_timestamp(self):
        """Format timestamp for display"""
        if not self.created_at:
            return "now"
        
        now = datetime.now(timezone.utc)
        created = self.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        
        diff = now - created
        
        if diff.days > 30:
            return f"{diff.days // 30} month{'s' if diff.days // 30 > 1 else ''} ago"
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "just now"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.read:
            self.read = True
            self.read_at = datetime.now(timezone.utc)
            db.session.commit()

class NotificationPreference(db.Model):
    """Model to store user notification preferences"""
    __tablename__ = 'notification_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Notification type preferences
    order = db.Column(db.Boolean, default=True)
    payment = db.Column(db.Boolean, default=True)
    product = db.Column(db.Boolean, default=True)
    promotion = db.Column(db.Boolean, default=True)
    system = db.Column(db.Boolean, default=True)
    announcement = db.Column(db.Boolean, default=True)
    product_update = db.Column(db.Boolean, default=True)
    price_change = db.Column(db.Boolean, default=True)
    stock_alert = db.Column(db.Boolean, default=True)
    
    # Channel preferences
    email_notifications = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=False)
    sms_notifications = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationship
    user = db.relationship('User', backref=db.backref('notification_preferences', uselist=False, cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<NotificationPreference for User {self.user_id}>"

    def to_dict(self):
        """Convert preferences to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'order': self.order,
            'payment': self.payment,
            'product': self.product,
            'promotion': self.promotion,
            'system': self.system,
            'announcement': self.announcement,
            'product_update': self.product_update,
            'price_change': self.price_change,
            'stock_alert': self.stock_alert,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'sms_notifications': self.sms_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
