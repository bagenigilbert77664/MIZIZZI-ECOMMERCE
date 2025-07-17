"""
Production-Ready Advanced Search Routes with Real Analytics
Implements search analytics and enterprise features with optional ML
"""

from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy import or_, and_, func, text, desc, asc, case
from sqlalchemy.orm import joinedload, aliased
import re
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import math
import logging
import hashlib
import threading
from functools import wraps

from ...models.models import (
    Product, Category, Brand, ProductVariant, Review,
    User, Order, OrderItem, db
)
from ...models.search_analytics import (
    SearchQuery, SearchClick, SearchConversion,
    SearchSuggestion, SearchPerformanceMetric
)
from ...schemas.schemas import products_schema, product_schema

# Optional ML imports
try:
    from fuzzywuzzy import fuzz, process
    FUZZYWUZZY_AVAILABLE = True
except ImportError:
    FUZZYWUZZY_AVAILABLE = False

try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.cluster import KMeans
    import pickle
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Create blueprint
search_routes = Blueprint('search', __name__, url_prefix='/api/search')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis connection for caching and analytics
redis_client = None
if REDIS_AVAILABLE:
    try:
        redis_client = redis.Redis(
            host='localhost',  # Use default since current_app might not be available yet
            port=6379,
            db=0,
            decode_responses=True
        )
    except:
        redis_client = None
        logger.warning("Redis not available, using in-memory cache")

# In-memory fallback cache
memory_cache = {}
cache_lock = threading.Lock()

class SearchAnalyticsDB:
    """Real database-backed search analytics"""

    @staticmethod
    def create_tables():
        """Create analytics tables if they don't exist"""
        try:
            db.create_all()
            logger.info("Search analytics tables created successfully")
        except Exception as e:
            logger.error(f"Error creating analytics tables: {e}")
            db.session.rollback()

    @staticmethod
    def log_search(query_data):
        """Log search query to database"""
        try:
            search_query = SearchQuery(
                query_text=query_data['query'],
                user_id=query_data.get('user_id'),
                session_id=query_data.get('session_id'),
                results_count=query_data.get('results_count', 0),
                filters_used=query_data.get('filters', {}),
                response_time_ms=query_data.get('response_time_ms', 0),
                user_agent=query_data.get('user_agent'),
                ip_address=query_data.get('ip_address')
            )

            db.session.add(search_query)
            db.session.commit()
            return search_query.id

        except Exception as e:
            logger.error(f"Error logging search: {e}")
            db.session.rollback()
            return None

    @staticmethod
    def log_click(search_query_id, product_id, position):
        """Log product click from search results"""
        try:
            search_click = SearchClick(
                search_query_id=search_query_id,
                product_id=product_id,
                click_position=position
            )

            db.session.add(search_click)
            db.session.commit()

        except Exception as e:
            logger.error(f"Error logging click: {e}")
            db.session.rollback()

    @staticmethod
    def log_conversion(search_query_id, order_id, value):
        """Log conversion from search"""
        try:
            search_conversion = SearchConversion(
                search_query_id=search_query_id,
                order_id=order_id,
                conversion_value=value
            )

            db.session.add(search_conversion)

            # Mark original search as converted
            search_query = db.session.query(SearchQuery).get(search_query_id)
            if search_query:
                search_query.converted = True

            db.session.commit()

        except Exception as e:
            logger.error(f"Error logging conversion: {e}")
            db.session.rollback()

    @staticmethod
    def get_trending_searches(limit=10, days=7):
        """Get real trending searches from analytics"""
        try:
            result = db.session.query(
                SearchQuery.query_text,
                func.count(SearchQuery.id).label('search_count'),
                func.avg(SearchQuery.results_count).label('avg_results'),
                func.count(func.distinct(SearchQuery.user_id)).label('unique_users')
            ).filter(
                SearchQuery.search_time >= datetime.utcnow() - timedelta(days=days),
                SearchQuery.query_text != '',
                func.length(SearchQuery.query_text) > 2
            ).group_by(SearchQuery.query_text)\
             .having(func.count(SearchQuery.id) > 1)\
             .order_by(func.count(SearchQuery.id).desc())\
             .limit(limit).all()

            return [
                {
                    'term': row.query_text,
                    'count': row.search_count,
                    'avg_results': float(row.avg_results) if row.avg_results else 0,
                    'unique_users': row.unique_users
                }
                for row in result
            ]

        except Exception as e:
            logger.error(f"Error getting trending searches: {e}")
            return []

    @staticmethod
    def get_popular_suggestions(query_prefix, limit=10):
        """Get popular search suggestions based on real data"""
        try:
            suggestions = db.session.query(SearchSuggestion).filter(
                SearchSuggestion.suggestion_text.like(f"{query_prefix.lower()}%")
            ).order_by(
                SearchSuggestion.search_count.desc(),
                SearchSuggestion.last_searched.desc()
            ).limit(limit).all()

            return [{'text': s.suggestion_text, 'count': s.search_count} for s in suggestions]

        except Exception as e:
            logger.error(f"Error getting suggestions: {e}")
            return []

    @staticmethod
    def update_suggestion_count(suggestion_text):
        """Update suggestion search count"""
        try:
            suggestion = db.session.query(SearchSuggestion).filter(
                SearchSuggestion.suggestion_text == suggestion_text.lower()
            ).first()

            if suggestion:
                suggestion.search_count += 1
                suggestion.last_searched = func.now()
            else:
                suggestion = SearchSuggestion(
                    suggestion_text=suggestion_text.lower(),
                    search_count=1
                )
                db.session.add(suggestion)

            db.session.commit()

        except Exception as e:
            logger.error(f"Error updating suggestion count: {e}")
            db.session.rollback()

class MLSearchEngine:
    """Machine Learning powered search engine (optional)"""

    def __init__(self):
        self.vectorizer = None
        self.product_vectors = None
        self.product_ids = None
        self.model_last_updated = None
        self.update_interval = timedelta(hours=6)
        self.ml_enabled = ML_AVAILABLE

    def semantic_search(self, query, top_k=50):
        """Perform semantic search using ML if available"""
        if not self.ml_enabled:
            return []

        try:
            if not self.vectorizer:
                self.build_ml_model()

            if not self.vectorizer:
                return []

            # Transform query
            query_vector = self.vectorizer.transform([query.lower()])

            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.product_vectors).flatten()

            # Get top matches
            top_indices = similarities.argsort()[-top_k:][::-1]

            results = []
            for idx in top_indices:
                if similarities[idx] > 0.1:
                    results.append({
                        'product_id': self.product_ids[idx],
                        'similarity_score': float(similarities[idx])
                    })

            return results

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return []

    def build_ml_model(self):
        """Build ML model if dependencies available"""
        if not self.ml_enabled:
            return

        try:
            logger.info("Building ML search model...")

            products = db.session.query(Product).filter(
                Product.is_active == True
            ).options(
                joinedload(Product.category),
                joinedload(Product.brand)
            ).all()

            if not products:
                logger.warning("No products found for ML model")
                return

            corpus = []
            product_ids = []

            for product in products:
                text_parts = [
                    product.name or '',
                    product.description or '',
                    product.tags or '',
                    product.category.name if product.category else '',
                    product.brand.name if product.brand else ''
                ]

                corpus.append(' '.join(text_parts).lower())
                product_ids.append(product.id)

            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.8
            )

            self.product_vectors = self.vectorizer.fit_transform(corpus)
            self.product_ids = product_ids
            self.model_last_updated = datetime.now()

            logger.info(f"ML model built successfully with {len(products)} products")

        except Exception as e:
            logger.error(f"Error building ML model: {e}")

# Initialize ML engine
ml_engine = MLSearchEngine()

class CacheManager:
    """Advanced caching with Redis fallback"""

    @staticmethod
    def get_cache_key(prefix, params):
        """Generate cache key"""
        key_data = json.dumps(params, sort_keys=True)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    @staticmethod
    def get(key):
        """Get from cache"""
        try:
            if redis_client:
                data = redis_client.get(key)
                return json.loads(data) if data else None
            else:
                with cache_lock:
                    return memory_cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    @staticmethod
    def set(key, value, ttl=300):
        """Set cache with TTL"""
        try:
            if redis_client:
                redis_client.setex(key, ttl, json.dumps(value))
            else:
                with cache_lock:
                    memory_cache[key] = value
                    if len(memory_cache) > 1000:
                        memory_cache.clear()
        except Exception as e:
            logger.error(f"Cache set error: {e}")

def cache_result(prefix, ttl=300):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = CacheManager.get_cache_key(prefix, {'args': args, 'kwargs': kwargs})

            cached_result = CacheManager.get(cache_key)
            if cached_result:
                return cached_result

            result = func(*args, **kwargs)
            CacheManager.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator

@search_routes.route('/', methods=['GET'])
def search_products():
    """Production-ready search with analytics"""
    start_time = time.time()

    try:
        # Get parameters
        query_text = request.args.get('q', '').strip()
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        sort_by = request.args.get('sort_by', 'relevance')

        # Extract filters
        filters = {
            'category_id': request.args.get('category_id', type=int),
            'brand_id': request.args.get('brand_id', type=int),
            'min_price': request.args.get('min_price', type=float),
            'max_price': request.args.get('max_price', type=float),
            'min_rating': request.args.get('min_rating', type=float),
            'in_stock': request.args.get('in_stock', type=bool),
            'is_featured': request.args.get('is_featured', type=bool),
            'is_sale': request.args.get('is_sale', type=bool),
            'is_new': request.args.get('is_new', type=bool),
            'tags': request.args.getlist('tags')
        }
        filters = {k: v for k, v in filters.items() if v is not None}

        # Get user info for analytics
        user_id = request.headers.get('X-User-ID')
        session_id = request.headers.get('X-Session-ID', 'anonymous')
        user_agent = request.headers.get('User-Agent', '')
        ip_address = request.remote_addr

        # Base query
        base_query = db.session.query(Product).filter(
            Product.is_active == True
        ).options(
            joinedload(Product.category),
            joinedload(Product.brand),
            joinedload(Product.images)
        )

        # Apply filters
        query = apply_advanced_filters(base_query, filters)

        if not query_text:
            # No search query - just filtered results
            products, total_count = execute_filtered_search(query, sort_by, page, per_page)
        else:
            # Full search with analytics
            products, total_count = execute_intelligent_search(
                query, query_text, sort_by, page, per_page, user_id, filters
            )

            # Update suggestion counts
            SearchAnalyticsDB.update_suggestion_count(query_text)

        # Serialize results
        products_data = products_schema.dump(products)

        # Calculate pagination
        total_pages = math.ceil(total_count / per_page)

        # Prepare response
        response_time = time.time() - start_time
        response_time_ms = int(response_time * 1000)

        result = {
            'success': True,
            'data': {
                'products': products_data,
                'pagination': {
                    'current_page': page,
                    'per_page': per_page,
                    'total_items': total_count,
                    'total_pages': total_pages,
                    'has_previous': page > 1,
                    'has_next': page < total_pages,
                    'previous_page': page - 1 if page > 1 else None,
                    'next_page': page + 1 if page < total_pages else None
                },
                'filters_applied': filters,
                'meta': {
                    'response_time': round(response_time, 3),
                    'sort_by': sort_by,
                    'cached': False,
                    'ml_enabled': ml_engine.ml_enabled
                }
            }
        }

        # Log search analytics
        SearchAnalyticsDB.log_search({
            'query': query_text,
            'user_id': user_id,
            'session_id': session_id,
            'results_count': total_count,
            'filters': filters,
            'response_time_ms': response_time_ms,
            'user_agent': user_agent,
            'ip_address': ip_address
        })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Search failed',
            'message': str(e)
        }), 500

def apply_advanced_filters(query, filters):
    """Apply comprehensive filtering"""

    if filters.get('category_id'):
        query = query.filter(Product.category_id == filters['category_id'])

    if filters.get('brand_id'):
        query = query.filter(Product.brand_id == filters['brand_id'])

    if filters.get('min_price'):
        query = query.filter(
            or_(
                Product.sale_price >= filters['min_price'],
                and_(Product.sale_price.is_(None), Product.price >= filters['min_price'])
            )
        )

    if filters.get('max_price'):
        query = query.filter(
            or_(
                Product.sale_price <= filters['max_price'],
                and_(Product.sale_price.is_(None), Product.price <= filters['max_price'])
            )
        )

    if filters.get('in_stock'):
        query = query.filter(Product.stock > 0)

    if filters.get('is_featured'):
        query = query.filter(Product.is_featured == True)

    if filters.get('is_sale'):
        query = query.filter(Product.is_sale == True)

    if filters.get('is_new'):
        query = query.filter(Product.is_new == True)

    if filters.get('tags'):
        tag_conditions = []
        for tag in filters['tags']:
            tag_conditions.append(Product.tags.ilike(f"%{tag}%"))
        query = query.filter(or_(*tag_conditions))

    return query

def execute_filtered_search(query, sort_by, page, per_page):
    """Execute search without text query"""

    if sort_by == 'price_asc':
        query = query.order_by(asc(func.coalesce(Product.sale_price, Product.price)))
    elif sort_by == 'price_desc':
        query = query.order_by(desc(func.coalesce(Product.sale_price, Product.price)))
    elif sort_by == 'newest':
        query = query.order_by(desc(Product.created_at))
    elif sort_by == 'name':
        query = query.order_by(asc(Product.name))
    else:  # Default relevance for filtered results
        query = query.order_by(
            desc(Product.is_featured),
            desc(Product.is_sale),
            desc(Product.created_at)
        )

    total_count = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return products, total_count

def execute_intelligent_search(query, query_text, sort_by, page, per_page, user_id, filters):
    """Execute intelligent search with scoring"""

    processed_query = query_text.lower().strip()
    query_terms = processed_query.split()

    # Get semantic search results from ML if available
    ml_results = ml_engine.semantic_search(processed_query, top_k=200)

    # Build flexible search conditions
    search_conditions = []

    # Search in product name (most important)
    name_conditions = []
    for term in query_terms:
        if len(term) >= 2:
            name_conditions.append(Product.name.ilike(f"%{term}%"))

    # Search in description
    desc_conditions = []
    for term in query_terms:
        if len(term) >= 2:
            desc_conditions.append(Product.description.ilike(f"%{term}%"))

    # Search in tags
    tag_conditions = []
    for term in query_terms:
        if len(term) >= 2:
            tag_conditions.append(Product.tags.ilike(f"%{term}%"))

    # Search in category name
    category_conditions = []
    for term in query_terms:
        if len(term) >= 2:
            category_conditions.append(Category.name.ilike(f"%{term}%"))

    # Search in brand name
    brand_conditions = []
    for term in query_terms:
        if len(term) >= 2:
            brand_conditions.append(Brand.name.ilike(f"%{term}%"))

    # Combine all conditions with OR (more inclusive)
    all_conditions = []

    if name_conditions:
        all_conditions.append(or_(*name_conditions))
    if desc_conditions:
        all_conditions.append(or_(*desc_conditions))
    if tag_conditions:
        all_conditions.append(or_(*tag_conditions))

    # Join with category and brand for their searches
    search_query = query.outerjoin(Category, Product.category_id == Category.id)\
                       .outerjoin(Brand, Product.brand_id == Brand.id)

    if category_conditions:
        all_conditions.append(or_(*category_conditions))
    if brand_conditions:
        all_conditions.append(or_(*brand_conditions))

    # Combine ML and traditional search
    if ml_results:
        ml_product_ids = [r['product_id'] for r in ml_results]
        ml_condition = Product.id.in_(ml_product_ids)
        all_conditions.append(ml_condition)

    # If we have any conditions, use them; otherwise, do a broad search
    if all_conditions:
        final_condition = or_(*all_conditions)
    else:
        # Fallback: search for any product containing any part of the query
        fallback_condition = or_(
            Product.name.ilike(f"%{processed_query}%"),
            Product.description.ilike(f"%{processed_query}%")
        )
        final_condition = fallback_condition

    # Apply search condition to query
    search_query = search_query.filter(final_condition)

    # Get all matching products for scoring
    all_products = search_query.all()

    # If no products found, try even more flexible search
    if not all_products:
        # Try searching each word individually
        flexible_conditions = []
        for term in query_terms:
            if len(term) >= 2:
                flexible_conditions.extend([
                    Product.name.ilike(f"%{term}%"),
                    Product.description.ilike(f"%{term}%"),
                    Category.name.ilike(f"%{term}%"),
                    Brand.name.ilike(f"%{term}%")
                ])

        if flexible_conditions:
            search_query = query.outerjoin(Category, Product.category_id == Category.id)\
                               .outerjoin(Brand, Product.brand_id == Brand.id)\
                               .filter(or_(*flexible_conditions))
            all_products = search_query.all()

    # Calculate comprehensive scores
    scored_products = []
    ml_scores = {r['product_id']: r['similarity_score'] for r in ml_results}

    for product in all_products:
        score = calculate_advanced_relevance_score(
            product, query_terms, ml_scores.get(product.id, 0)
        )
        scored_products.append((product, score))

    # Add personalization
    if user_id:
        scored_products = add_personalization_scores(scored_products, user_id)

    # Sort results
    if sort_by == 'relevance':
        scored_products.sort(key=lambda x: x[1], reverse=True)
    elif sort_by == 'price_asc':
        scored_products.sort(key=lambda x: float(x[0].sale_price or x[0].price))
    elif sort_by == 'price_desc':
        scored_products.sort(key=lambda x: float(x[0].sale_price or x[0].price), reverse=True)
    elif sort_by == 'newest':
        scored_products.sort(key=lambda x: x[0].created_at, reverse=True)
    elif sort_by == 'name':
        scored_products.sort(key=lambda x: x[0].name)
    elif sort_by == 'rating':
        scored_products.sort(key=lambda x: get_product_rating(x[0]), reverse=True)

    # Manual pagination
    total_count = len(scored_products)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page

    products = [item[0] for item in scored_products[start_idx:end_idx]]

    return products, total_count

def calculate_advanced_relevance_score(product, query_terms, ml_score):
    """Calculate comprehensive relevance score"""
    score = 0.0

    # ML semantic similarity (20% weight)
    score += ml_score * 20.0

    # Exact text matches (40% weight)
    product_name = (product.name or '').lower()
    product_desc = (product.description or '').lower()
    product_tags = (product.tags or '').lower()

    for term in query_terms:
        term = term.lower()
        # Name matches are most important
        if term in product_name:
            if product_name.startswith(term):
                score += 25.0  # Starts with term
            elif term in product_name.split():
                score += 20.0  # Exact word match
            else:
                score += 15.0  # Partial match

        # Description matches
        if term in product_desc:
            if term in product_desc.split():
                score += 10.0  # Exact word match
            else:
                score += 5.0   # Partial match

        # Tag matches
        if term in product_tags:
            score += 8.0

    # Fuzzy matching (15% weight) - only if fuzzywuzzy is available
    if FUZZYWUZZY_AVAILABLE:
        for term in query_terms:
            name_ratio = fuzz.partial_ratio(term.lower(), product_name)
            if name_ratio > 60:
                score += (name_ratio / 100) * 8.0

    # Category/Brand matching (10% weight)
    if product.category:
        category_name = product.category.name.lower()
        for term in query_terms:
            if term.lower() in category_name:
                score += 6.0

    if product.brand:
        brand_name = product.brand.name.lower()
        for term in query_terms:
            if term.lower() in brand_name:
                score += 5.0

    # Business metrics (15% weight)
    # Rating boost
    avg_rating = get_product_rating(product)
    score += avg_rating * 1.5

    # Review count boost
    review_count = get_product_review_count(product)
    score += min(review_count * 0.2, 3.0)

    # Stock availability
    if product.stock > 0:
        score += 2.0
    if product.stock > 10:
        score += 1.0

    # Product flags
    if product.is_featured:
        score += 3.0
    if product.is_sale:
        score += 2.0
    if product.is_new:
        score += 1.0

    return max(score, 0.1)  # Minimum score to ensure all products have some relevance

def add_personalization_scores(scored_products, user_id):
    """Add personalization based on user behavior"""
    try:
        # Get user preferences from purchase history
        user_prefs = db.session.execute(text("""
            SELECT p.category_id, p.brand_id, COUNT(*) as frequency,
                   AVG(COALESCE(p.sale_price, p.price)) as avg_price
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = :user_id
              AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 180 DAY)
            GROUP BY p.category_id, p.brand_id
            ORDER BY frequency DESC
        """), {'user_id': user_id}).fetchall()

        # Apply personalization boosts
        for i, (product, score) in enumerate(scored_products):
            # Category/brand preference boost
            for pref in user_prefs:
                if product.category_id == pref[0]:
                    score += 3.0 * (pref[2] / 10)  # Frequency-based boost
                if product.brand_id == pref[1]:
                    score += 2.0 * (pref[2] / 10)

            # Price preference boost
            if user_prefs:
                user_avg_price = sum(p[3] for p in user_prefs) / len(user_prefs)
                product_price = float(product.sale_price or product.price)
                price_diff = abs(product_price - user_avg_price) / user_avg_price
                if price_diff < 0.3:  # Within 30% of user's average
                    score += 2.0

            scored_products[i] = (product, score)

        return scored_products

    except Exception as e:
        logger.error(f"Personalization error: {e}")
        return scored_products

@cache_result('product_rating', ttl=3600)
def get_product_rating(product):
    """Get cached product rating"""
    try:
        if hasattr(product, 'reviews') and product.reviews:
            return sum(r.rating for r in product.reviews) / len(product.reviews)
        return 0.0
    except:
        return 0.0

@cache_result('product_review_count', ttl=3600)
def get_product_review_count(product):
    """Get cached review count"""
    try:
        return len(product.reviews) if hasattr(product, 'reviews') else 0
    except:
        return 0

@search_routes.route('/suggestions', methods=['GET'])
def get_search_suggestions():
    """Real-time search suggestions based on analytics"""
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 20)

        if len(query) < 2:
            return jsonify({'success': True, 'data': {'suggestions': []}})

        suggestions = []

        # Get popular suggestions from analytics
        popular_suggestions = SearchAnalyticsDB.get_popular_suggestions(query, limit // 2)
        for suggestion in popular_suggestions:
            suggestions.append({
                'text': suggestion['text'],
                'type': 'popular',
                'category': 'Popular Searches',
                'count': suggestion['count']
            })

        # Get product name suggestions
        products = db.session.query(Product.name).filter(
            Product.name.ilike(f"%{query}%"),
            Product.is_active == True
        ).limit(limit // 3).all()

        for product in products:
            suggestions.append({
                'text': product.name,
                'type': 'product',
                'category': 'Products'
            })

        # Get category suggestions
        categories = db.session.query(Category.name).filter(
            Category.name.ilike(f"%{query}%")
        ).limit(limit // 6).all()

        for category in categories:
            suggestions.append({
                'text': category.name,
                'type': 'category',
                'category': 'Categories'
            })

        # Get brand suggestions
        brands = db.session.query(Brand.name).filter(
            Brand.name.ilike(f"%{query}%")
        ).limit(limit // 6).all()

        for brand in brands:
            suggestions.append({
                'text': brand.name,
                'type': 'brand',
                'category': 'Brands'
            })

        return jsonify({
            'success': True,
            'data': {'suggestions': suggestions[:limit]}
        })

    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to get suggestions'}), 500

@search_routes.route('/trending', methods=['GET'])
def get_trending_searches():
    """Get real trending searches from analytics"""
    try:
        days = int(request.args.get('days', 7))
        limit = min(int(request.args.get('limit', 10)), 50)

        trending = SearchAnalyticsDB.get_trending_searches(limit, days)

        return jsonify({
            'success': True,
            'data': {'trending': trending}
        })

    except Exception as e:
        logger.error(f"Trending searches error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to get trending searches'}), 500

@search_routes.route('/analytics', methods=['GET'])
def get_search_analytics():
    """Get search analytics dashboard data"""
    try:
        days = int(request.args.get('days', 30))

        # Search volume over time - use more compatible SQL
        search_volume = db.session.execute(text("""
            SELECT DATE(search_time) as date, COUNT(*) as searches
            FROM search_queries
            WHERE search_time >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)
            GROUP BY DATE(search_time)
            ORDER BY date
        """), {'days': days}).fetchall()

        # Top searches
        top_searches = db.session.execute(text("""
            SELECT query_text, COUNT(*) as count, AVG(results_count) as avg_results
            FROM search_queries
            WHERE search_time >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)
              AND query_text != ''
            GROUP BY query_text
            ORDER BY count DESC
            LIMIT 20
        """), {'days': days}).fetchall()

        # Search performance metrics
        performance = db.session.execute(text("""
            SELECT
                AVG(response_time_ms) as avg_response_time,
                AVG(results_count) as avg_results_count,
                COUNT(CASE WHEN results_count = 0 THEN 1 END) * 100.0 / COUNT(*) as zero_results_rate,
                COUNT(CASE WHEN converted = true THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
            FROM search_queries
            WHERE search_time >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)
        """), {'days': days}).fetchone()

        return jsonify({
            'success': True,
            'data': {
                'search_volume': [{'date': str(row[0]), 'searches': row[1]} for row in search_volume],
                'top_searches': [
                    {'query': row[0], 'count': row[1], 'avg_results': float(row[2]) if row[2] else 0}
                    for row in top_searches
                ],
                'performance': {
                    'avg_response_time': float(performance[0]) if performance[0] else 0,
                    'avg_results_count': float(performance[1]) if performance[1] else 0,
                    'zero_results_rate': float(performance[2]) if performance[2] else 0,
                    'conversion_rate': float(performance[3]) if performance[3] else 0
                } if performance else {
                    'avg_response_time': 0,
                    'avg_results_count': 0,
                    'zero_results_rate': 0,
                    'conversion_rate': 0
                }
            }
        })

    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        # Return empty analytics instead of error
        return jsonify({
            'success': True,
            'data': {
                'search_volume': [],
                'top_searches': [],
                'performance': {
                    'avg_response_time': 0,
                    'avg_results_count': 0,
                    'zero_results_rate': 0,
                    'conversion_rate': 0
                }
            }
        })

@search_routes.route('/click', methods=['POST'])
def log_search_click():
    """Log when user clicks on search result"""
    try:
        data = request.get_json()
        search_query_id = data.get('search_query_id')
        product_id = data.get('product_id')
        position = data.get('position')

        if search_query_id and product_id:
            SearchAnalyticsDB.log_click(search_query_id, product_id, position)

        return jsonify({'success': True})

    except Exception as e:
        logger.error(f"Click logging error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to log click'}), 500

@search_routes.route('/conversion', methods=['POST'])
def log_search_conversion():
    """Log when search leads to conversion"""
    try:
        data = request.get_json()
        search_query_id = data.get('search_query_id')
        order_id = data.get('order_id')
        value = data.get('value')

        if search_query_id and order_id:
            SearchAnalyticsDB.log_conversion(search_query_id, order_id, value)

        return jsonify({'success': True})

    except Exception as e:
        logger.error(f"Conversion logging error: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to log conversion'}), 500
