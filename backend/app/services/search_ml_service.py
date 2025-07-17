"""
Advanced Machine Learning Service for Search
Real-world ML implementation with continuous learning
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import LatentDirichletAllocation
import pickle
import logging
from datetime import datetime, timedelta
import threading
import time
from collections import defaultdict
from sqlalchemy import func

# Attempt to import redis, else set redis_client to None
try:
  import redis
  redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)
except ImportError:
  redis_client = None
except Exception:
  redis_client = None

from ..app.models.models import Product, Category, Brand, Review, Order, OrderItem, db
from ..app.models.search_analytics import SearchQuery, SearchClick, SearchConversion

logger = logging.getLogger(__name__)

class SearchMLService:
    """Production ML service for search optimization"""

    def __init__(self):
        self.vectorizer = None
        self.product_vectors = None
        self.product_embeddings = None
        self.user_profiles = {}
        self.category_clusters = None
        self.trending_topics = None
        self.model_version = None
        self.last_training = None

        # Start background training scheduler
        self.training_thread = threading.Thread(target=self._training_scheduler, daemon=True)
        self.training_thread.start()

    def _training_scheduler(self):
        """Background scheduler for model retraining"""
        while True:
            try:
                # Retrain every 6 hours
                time.sleep(6 * 3600)

                if self._should_retrain():
                    logger.info("Starting scheduled model retraining...")
                    self.train_models()

            except Exception as e:
                logger.error(f"Training scheduler error: {e}")
                time.sleep(3600)  # Wait 1 hour before retry

    def _should_retrain(self):
        """Determine if models need retraining"""
        if not self.last_training:
            return True

        # Retrain if more than 6 hours old
        if datetime.now() - self.last_training > timedelta(hours=6):
            return True

        # Retrain if significant new data
        recent_searches = db.session.query(SearchQuery).filter(
            SearchQuery.search_time >= self.last_training
        ).count()

        return recent_searches > 1000  # Retrain if 1000+ new searches

    def train_models(self):
        """Train all ML models"""
        try:
            logger.info("Starting ML model training...")
            start_time = time.time()

            # Train product embeddings
            self._train_product_embeddings()

            # Train user profiles
            self._train_user_profiles()

            # Train category clusters
            self._train_category_clusters()

            # Extract trending topics
            self._extract_trending_topics()

            self.last_training = datetime.now()
            self.model_version = f"v{int(time.time())}"

            training_time = time.time() - start_time
            logger.info(f"ML training completed in {training_time:.2f}s, version: {self.model_version}")

            # Save models to cache/disk
            self._save_models()

        except Exception as e:
            logger.error(f"ML training error: {e}")

    def _train_product_embeddings(self):
        """Train product text embeddings using TF-IDF and advanced techniques"""
        try:
            # Get all active products with rich text data
            products = db.session.query(Product).filter(
                Product.is_active == True
            ).options(
                db.joinedload(Product.category),
                db.joinedload(Product.brand),
                db.joinedload(Product.reviews)
            ).all()

            if not products:
                logger.warning("No products found for embedding training")
                return

            # Create comprehensive text corpus
            corpus = []
            product_ids = []

            for product in products:
                # Combine all text sources
                text_parts = [
                    product.name or '',
                    product.description or '',
                    product.tags or '',
                    product.category.name if product.category else '',
                    product.brand.name if product.brand else ''
                ]

                # Add review sentiment and keywords
                if product.reviews:
                    review_texts = [r.comment or '' for r in product.reviews[-20:]]  # Last 20 reviews
                    text_parts.extend(review_texts)

                    # Add rating-based quality indicators
                    avg_rating = sum(r.rating for r in product.reviews) / len(product.reviews)
                    if avg_rating >= 4.5:
                        text_parts.append('excellent quality highly rated')
                    elif avg_rating >= 4.0:
                        text_parts.append('good quality well rated')

                # Add price category indicators
                price = float(product.sale_price or product.price)
                if price < 50:
                    text_parts.append('budget affordable cheap')
                elif price > 500:
                    text_parts.append('premium luxury expensive')

                # Add availability indicators
                if product.stock > 50:
                    text_parts.append('in stock available')
                elif product.stock == 0:
                    text_parts.append('out of stock unavailable')

                corpus.append(' '.join(text_parts).lower())
                product_ids.append(product.id)

            # Train advanced TF-IDF vectorizer
            self.vectorizer = TfidfVectorizer(
                max_features=10000,
                stop_words='english',
                ngram_range=(1, 3),  # Include trigrams
                min_df=2,
                max_df=0.8,
                sublinear_tf=True,
                use_idf=True
            )

            self.product_vectors = self.vectorizer.fit_transform(corpus)
            self.product_ids = product_ids

            logger.info(f"Product embeddings trained for {len(products)} products")

        except Exception as e:
            logger.error(f"Product embedding training error: {e}")

    def _train_user_profiles(self):
        """Build user preference profiles from behavior data"""
        try:
            # Get user behavior data
            user_data = db.session.query(
                SearchQuery.user_id,
                SearchQuery.query_text,
                SearchClick.product_id,
                SearchConversion.conversion_value
            ).outerjoin(SearchClick, SearchQuery.id == SearchClick.search_query_id)\
             .outerjoin(SearchConversion, SearchQuery.id == SearchConversion.search_query_id)\
             .filter(
                SearchQuery.user_id.isnot(None),
                SearchQuery.search_time >= datetime.now() - timedelta(days=90)
             ).all()

            # Build user profiles
            user_profiles = defaultdict(lambda: {
                'search_terms': [],
                'clicked_products': [],
                'purchased_products': [],
                'total_spent': 0.0,
                'avg_price_range': 0.0,
                'preferred_categories': [],
                'preferred_brands': []
            })

            for row in user_data:
                user_id, query, product_id, conversion_value = row

                if query:
                    user_profiles[user_id]['search_terms'].append(query.lower())

                if product_id:
                    user_profiles[user_id]['clicked_products'].append(product_id)

                if conversion_value:
                    user_profiles[user_id]['purchased_products'].append(product_id)
                    user_profiles[user_id]['total_spent'] += float(conversion_value)

            # Enrich profiles with product data
            for user_id, profile in user_profiles.items():
                if profile['clicked_products']:
                    products = db.session.query(Product).filter(
                        Product.id.in_(profile['clicked_products'])
                    ).all()

                    categories = [p.category.name for p in products if p.category]
                    brands = [p.brand.name for p in products if p.brand]
                    prices = [float(p.sale_price or p.price) for p in products]

                    profile['preferred_categories'] = list(set(categories))
                    profile['preferred_brands'] = list(set(brands))
                    profile['avg_price_range'] = sum(prices) / len(prices) if prices else 0

            self.user_profiles = dict(user_profiles)
            logger.info(f"User profiles built for {len(self.user_profiles)} users")

        except Exception as e:
            logger.error(f"User profile training error: {e}")

    def _train_category_clusters(self):
        """Cluster products by category and features for better recommendations"""
        try:
            if not self.product_vectors:
                return

            # Use K-means clustering on product vectors
            n_clusters = min(20, len(self.product_ids) // 10)  # Dynamic cluster count

            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(self.product_vectors.toarray())

            # Map products to clusters
            self.category_clusters = {}
            for i, product_id in enumerate(self.product_ids):
                cluster_id = cluster_labels[i]
                if cluster_id not in self.category_clusters:
                    self.category_clusters[cluster_id] = []
                self.category_clusters[cluster_id].append(product_id)

            logger.info(f"Category clustering completed with {n_clusters} clusters")

        except Exception as e:
            logger.error(f"Category clustering error: {e}")

    def _extract_trending_topics(self):
        """Extract trending topics from recent search queries using LDA"""
        try:
            # Get recent search queries
            recent_queries = db.session.query(SearchQuery.query_text).filter(
                SearchQuery.search_time >= datetime.now() - timedelta(days=7),
                SearchQuery.query_text != '',
                func.length(SearchQuery.query_text) > 2
            ).all()

            if len(recent_queries) < 10:
                logger.warning("Insufficient queries for topic extraction")
                return

            query_texts = [q[0] for q in recent_queries]

            # Vectorize queries for topic modeling
            topic_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.7
            )

            query_vectors = topic_vectorizer.fit_transform(query_texts)

            # Extract topics using LDA
            n_topics = min(10, len(query_texts) // 5)
            lda = LatentDirichletAllocation(
                n_components=n_topics,
                random_state=42,
                max_iter=100
            )

            lda.fit(query_vectors)

            # Extract top words for each topic
            feature_names = topic_vectorizer.get_feature_names_out()
            topics = []

            for topic_idx, topic in enumerate(lda.components_):
                top_words_idx = topic.argsort()[-10:][::-1]
                top_words = [feature_names[i] for i in top_words_idx]
                topics.append({
                    'id': topic_idx,
                    'words': top_words,
                    'weight': float(topic.sum())
                })

            self.trending_topics = topics
            logger.info(f"Extracted {len(topics)} trending topics")

        except Exception as e:
            logger.error(f"Topic extraction error: {e}")

    def get_semantic_recommendations(self, query, user_id=None, limit=50):
        """Get semantically similar products using ML"""
        try:
            if not self.vectorizer or not self.product_vectors:
                return []

            # Transform query
            query_vector = self.vectorizer.transform([query.lower()])

            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.product_vectors).flatten()

            # Get top matches
            top_indices = similarities.argsort()[-limit:][::-1]

            results = []
            for idx in top_indices:
                if similarities[idx] > 0.1:  # Minimum similarity threshold
                    product_id = self.product_ids[idx]
                    base_score = float(similarities[idx])

                    # Add personalization if user profile exists
                    if user_id and user_id in self.user_profiles:
                        personalization_boost = self._calculate_personalization_boost(
                            product_id, self.user_profiles[user_id]
                        )
                        base_score += personalization_boost

                    results.append({
                        'product_id': product_id,
                        'similarity_score': base_score,
                        'ml_source': 'semantic_similarity'
                    })

            return results

        except Exception as e:
            logger.error(f"Semantic recommendation error: {e}")
            return []

    def get_cluster_recommendations(self, product_id, limit=20):
        """Get recommendations from same cluster"""
        try:
            if not self.category_clusters:
                return []

            # Find product's cluster
            product_cluster = None
            for cluster_id, products in self.category_clusters.items():
                if product_id in products:
                    product_cluster = cluster_id
                    break

            if product_cluster is None:
                return []

            # Get other products from same cluster
            cluster_products = [
                pid for pid in self.category_clusters[product_cluster]
                if pid != product_id
            ]

            return cluster_products[:limit]

        except Exception as e:
            logger.error(f"Cluster recommendation error: {e}")
            return []

    def _calculate_personalization_boost(self, product_id, user_profile):
        """Calculate personalization boost for a product"""
        try:
            boost = 0.0

            # Get product details
            product = db.session.query(Product).get(product_id)
            if not product:
                return boost

            # Category preference boost
            if product.category and product.category.name in user_profile['preferred_categories']:
                boost += 0.2

            # Brand preference boost
            if product.brand and product.brand.name in user_profile['preferred_brands']:
                boost += 0.15

            # Price preference boost
            product_price = float(product.sale_price or product.price)
            user_avg_price = user_profile['avg_price_range']

            if user_avg_price > 0:
                price_diff = abs(product_price - user_avg_price) / user_avg_price
                if price_diff < 0.3:  # Within 30% of user's average
                    boost += 0.1

            # Previous interaction boost
            if product_id in user_profile['clicked_products']:
                boost += 0.05

            return boost

        except Exception as e:
            logger.error(f"Personalization boost error: {e}")
            return 0.0

    def get_trending_insights(self):
        """Get trending topics and insights"""
        return {
            'topics': self.trending_topics or [],
            'model_version': self.model_version,
            'last_training': self.last_training.isoformat() if self.last_training else None,
            'total_user_profiles': len(self.user_profiles),
            'total_clusters': len(self.category_clusters) if self.category_clusters else 0
        }

    def _save_models(self):
        """Save trained models to cache/storage"""
        try:
            model_data = {
                'vectorizer': pickle.dumps(self.vectorizer) if self.vectorizer else None,
                'product_vectors': pickle.dumps(self.product_vectors) if self.product_vectors else None,
                'product_ids': self.product_ids,
                'user_profiles': self.user_profiles,
                'category_clusters': self.category_clusters,
                'trending_topics': self.trending_topics,
                'model_version': self.model_version,
                'last_training': self.last_training.isoformat() if self.last_training else None
            }

            # Save to Redis if available
            if redis_client:
                redis_client.setex(
                    'search_ml_models',
                    86400,  # 24 hours
                    pickle.dumps(model_data)
                )

            # Also save to file as backup
            with open('/tmp/search_ml_models.pkl', 'wb') as f:
                pickle.dump(model_data, f)

            logger.info("ML models saved successfully")

        except Exception as e:
            logger.error(f"Model saving error: {e}")

    def load_models(self):
        """Load trained models from cache/storage"""
        try:
            model_data = None

            # Try Redis first
            if redis_client:
                cached_models = redis_client.get('search_ml_models')
                if cached_models:
                    model_data = pickle.loads(cached_models)

            # Fallback to file
            if not model_data:
                try:
                    with open('/tmp/search_ml_models.pkl', 'rb') as f:
                        model_data = pickle.load(f)
                except FileNotFoundError:
                    return False

            if model_data:
                self.vectorizer = pickle.loads(model_data['vectorizer']) if model_data['vectorizer'] else None
                self.product_vectors = pickle.loads(model_data['product_vectors']) if model_data['product_vectors'] else None
                self.product_ids = model_data.get('product_ids', [])
                self.user_profiles = model_data.get('user_profiles', {})
                self.category_clusters = model_data.get('category_clusters', {})
                self.trending_topics = model_data.get('trending_topics', [])
                self.model_version = model_data.get('model_version')

                if model_data.get('last_training'):
                    self.last_training = datetime.fromisoformat(model_data['last_training'])

                logger.info(f"ML models loaded successfully, version: {self.model_version}")
                return True

            return False

        except Exception as e:
            logger.error(f"Model loading error: {e}")
            return False

# Global ML service instance
ml_service = SearchMLService()
