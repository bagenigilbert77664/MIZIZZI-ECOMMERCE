"""
Search Analytics Models
Dedicated models for search tracking and analytics with optimized database configuration
"""
from ..configuration.extensions import db
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, DECIMAL, ForeignKey, Index
from sqlalchemy.sql import func
import json

# Check if PostgreSQL-specific types are available
try:
    from sqlalchemy.dialects.postgresql import JSONB, INET
    HAS_POSTGRES_TYPES = True
except ImportError:
    HAS_POSTGRES_TYPES = False
    # Fallback for non-PostgreSQL databases
    JSONB = Text
    INET = String

class SearchQuery(db.Model):
    """Track all search queries with comprehensive analytics"""
    __tablename__ = 'search_queries'

    id = Column(Integer, primary_key=True)
    query_text = Column(String(500), nullable=False, index=True)
    user_id = Column(Integer, index=True)
    session_id = Column(String(100), index=True)
    results_count = Column(Integer, default=0)
    clicked_product_id = Column(Integer)

    # Store JSON as Text for database compatibility
    _filters_used = Column(Text)

    search_time = Column(DateTime, default=func.now(), index=True)
    response_time_ms = Column(Integer)
    user_agent = Column(Text)
    ip_address = Column(String(45))  # IPv6 compatible
    converted = Column(Boolean, default=False, index=True)

    @property
    def filters_used(self):
        if self._filters_used:
            return json.loads(self._filters_used)
        return {}

    @filters_used.setter
    def filters_used(self, value):
        if value is not None:
            self._filters_used = json.dumps(value)
        else:
            self._filters_used = None

    def __repr__(self):
        return f'<SearchQuery {self.query_text}>'

    def to_dict(self):
        return {
            'id': self.id,
            'query_text': self.query_text,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'results_count': self.results_count,
            'clicked_product_id': self.clicked_product_id,
            'filters_used': self.filters_used,
            'search_time': self.search_time.isoformat() if self.search_time else None,
            'response_time_ms': self.response_time_ms,
            'user_agent': self.user_agent,
            'ip_address': self.ip_address,
            'converted': self.converted
        }

class SearchClick(db.Model):
    """Track clicks on search results for CTR analysis"""
    __tablename__ = 'search_clicks'

    id = Column(Integer, primary_key=True)
    search_query_id = Column(Integer, ForeignKey('search_queries.id', ondelete='CASCADE'), index=True)
    product_id = Column(Integer, nullable=False, index=True)
    click_position = Column(Integer)
    click_time = Column(DateTime, default=func.now())

    # Relationships
    search_query = db.relationship('SearchQuery', backref='clicks')

    def __repr__(self):
        return f'<SearchClick {self.product_id} at position {self.click_position}>'

    def to_dict(self):
        return {
            'id': self.id,
            'search_query_id': self.search_query_id,
            'product_id': self.product_id,
            'click_position': self.click_position,
            'click_time': self.click_time.isoformat() if self.click_time else None
        }

class SearchConversion(db.Model):
    """Track conversions from search to purchase"""
    __tablename__ = 'search_conversions'

    id = Column(Integer, primary_key=True)
    search_query_id = Column(Integer, ForeignKey('search_queries.id', ondelete='CASCADE'), index=True)
    order_id = Column(Integer, nullable=False, unique=True)  # Ensure one conversion per order
    conversion_value = Column(DECIMAL(10, 2))
    conversion_time = Column(DateTime, default=func.now())

    # Relationships
    search_query = db.relationship('SearchQuery', backref='conversions')

    def __repr__(self):
        return f'<SearchConversion order_id={self.order_id} value={self.conversion_value}>'

    def to_dict(self):
        return {
            'id': self.id,
            'search_query_id': self.search_query_id,
            'order_id': self.order_id,
            'conversion_value': float(self.conversion_value) if self.conversion_value else None,
            'conversion_time': self.conversion_time.isoformat() if self.conversion_time else None
        }

class SearchSuggestion(db.Model):
    """Track popular search suggestions for autocomplete"""
    __tablename__ = 'search_suggestions'

    id = Column(Integer, primary_key=True)
    suggestion_text = Column(String(200), nullable=False, unique=True, index=True)
    search_count = Column(Integer, default=1, index=True)
    last_searched = Column(DateTime, default=func.now())
    category_id = Column(Integer, index=True)
    brand_id = Column(Integer, index=True)

    def __repr__(self):
        return f'<SearchSuggestion {self.suggestion_text} ({self.search_count})>'

    def to_dict(self):
        return {
            'id': self.id,
            'suggestion_text': self.suggestion_text,
            'search_count': self.search_count,
            'last_searched': self.last_searched.isoformat() if self.last_searched else None,
            'category_id': self.category_id,
            'brand_id': self.brand_id
        }

class SearchPerformanceMetric(db.Model):
    """Daily aggregated search performance metrics"""
    __tablename__ = 'search_performance_metrics'

    id = Column(Integer, primary_key=True)
    date = Column(DateTime, nullable=False, unique=True, index=True)  # One record per date
    total_searches = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    avg_response_time = Column(DECIMAL(8, 3))
    zero_results_count = Column(Integer, default=0)
    conversion_count = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 2))

    def __repr__(self):
        return f'<SearchMetrics {self.date} - {self.total_searches} searches>'

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'total_searches': self.total_searches,
            'unique_users': self.unique_users,
            'avg_response_time': float(self.avg_response_time) if self.avg_response_time else None,
            'zero_results_count': self.zero_results_count,
            'conversion_count': self.conversion_count,
            'total_revenue': float(self.total_revenue) if self.total_revenue else None
        }

class SearchTrendingTopic(db.Model):
    """Track trending search topics extracted via ML"""
    __tablename__ = 'search_trending_topics'

    id = Column(Integer, primary_key=True)
    topic_name = Column(String(200), nullable=False, index=True)
    _keywords = Column(Text)  # Store JSON as Text for compatibility
    search_volume = Column(Integer, default=0, index=True)
    trend_score = Column(DECIMAL(5, 2), index=True)  # Trending score (0-100)
    date_detected = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True, index=True)

    @property
    def keywords(self):
        if self._keywords:
            return json.loads(self._keywords)
        return []

    @keywords.setter
    def keywords(self, value):
        if value is not None:
            self._keywords = json.dumps(value)
        else:
            self._keywords = None

    def __repr__(self):
        return f'<TrendingTopic {self.topic_name} (score: {self.trend_score})>'

    def to_dict(self):
        return {
            'id': self.id,
            'topic_name': self.topic_name,
            'keywords': self.keywords,
            'search_volume': self.search_volume,
            'trend_score': float(self.trend_score) if self.trend_score else None,
            'date_detected': self.date_detected.isoformat() if self.date_detected else None,
            'is_active': self.is_active
        }

class SearchUserProfile(db.Model):
    """ML-generated user search profiles for personalization"""
    __tablename__ = 'search_user_profiles'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    session_id = Column(String(100), index=True)  # For anonymous users
    _search_patterns = Column(Text)  # JSON stored as text
    _click_patterns = Column(Text)  # JSON stored as text
    _conversion_patterns = Column(Text)  # JSON stored as text
    _preferred_categories = Column(Text)  # JSON stored as text
    _preferred_brands = Column(Text)  # JSON stored as text
    _price_range_preference = Column(Text)  # JSON stored as text
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, default=func.now())

    # JSON property getters and setters
    @property
    def search_patterns(self):
        return json.loads(self._search_patterns) if self._search_patterns else {}

    @search_patterns.setter
    def search_patterns(self, value):
        self._search_patterns = json.dumps(value) if value else None

    @property
    def click_patterns(self):
        return json.loads(self._click_patterns) if self._click_patterns else {}

    @click_patterns.setter
    def click_patterns(self, value):
        self._click_patterns = json.dumps(value) if value else None

    @property
    def conversion_patterns(self):
        return json.loads(self._conversion_patterns) if self._conversion_patterns else {}

    @conversion_patterns.setter
    def conversion_patterns(self, value):
        self._conversion_patterns = json.dumps(value) if value else None

    @property
    def preferred_categories(self):
        return json.loads(self._preferred_categories) if self._preferred_categories else []

    @preferred_categories.setter
    def preferred_categories(self, value):
        self._preferred_categories = json.dumps(value) if value else None

    @property
    def preferred_brands(self):
        return json.loads(self._preferred_brands) if self._preferred_brands else []

    @preferred_brands.setter
    def preferred_brands(self, value):
        self._preferred_brands = json.dumps(value) if value else None

    @property
    def price_range_preference(self):
        return json.loads(self._price_range_preference) if self._price_range_preference else {}

    @price_range_preference.setter
    def price_range_preference(self, value):
        self._price_range_preference = json.dumps(value) if value else None

    def __repr__(self):
        return f'<SearchUserProfile user_id={self.user_id} session_id={self.session_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'search_patterns': self.search_patterns,
            'click_patterns': self.click_patterns,
            'conversion_patterns': self.conversion_patterns,
            'preferred_categories': self.preferred_categories,
            'preferred_brands': self.preferred_brands,
            'price_range_preference': self.price_range_preference,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
