"""
Search Service that combines FAISS semantic search with traditional keyword search.
Provides hybrid search functionality for better results.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Setup logger
logger = logging.getLogger(__name__)

# Database imports with fallbacks
try:
    from sqlalchemy import or_, and_, func, text
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    logger.warning("SQLAlchemy not available")
    SQLALCHEMY_AVAILABLE = False

try:
    from app.configuration.extensions import db
    from app.models.models import Product, Category, Brand
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import Product, Category, Brand
    except ImportError:
        try:
            from configuration.extensions import db
            from models.models import Product, Category, Brand
        except ImportError:
            logger.error("Could not import database models")
            db = None
            Product = None
            Category = None
            Brand = None

# Import embedding service with fallback
try:
    from .embedding_service import get_embedding_service
    EMBEDDING_SERVICE_AVAILABLE = True
except ImportError:
    logger.warning("Embedding service not available")
    EMBEDDING_SERVICE_AVAILABLE = False
    def get_embedding_service():
        return None


class SearchService:
    """Service that combines semantic and keyword search for optimal results."""

    def __init__(self):
        if EMBEDDING_SERVICE_AVAILABLE:
            try:
                self.embedding_service = get_embedding_service()
                if self.embedding_service and not self.embedding_service.is_available():
                    logger.warning("Embedding service not properly initialized")
                    self.embedding_service = None
            except Exception as e:
                logger.error(f"Failed to initialize embedding service: {str(e)}")
                self.embedding_service = None
        else:
            self.embedding_service = None

        # Common search terms and their mappings
        self.price_keywords = {
            'cheap': (0, 100),
            'budget': (0, 150),
            'affordable': (0, 200),
            'mid-range': (150, 500),
            'moderate': (200, 600),
            'premium': (500, 1500),
            'expensive': (1000, float('inf')),
            'luxury': (1500, float('inf')),
            'high-end': (2000, float('inf'))
        }

        self.category_keywords = {
            'phone': ['smartphone', 'mobile', 'cell phone', 'iphone', 'android'],
            'laptop': ['notebook', 'computer', 'macbook', 'ultrabook'],
            'headphones': ['earphones', 'earbuds', 'headset', 'audio'],
            'watch': ['smartwatch', 'timepiece', 'wearable'],
            'camera': ['photography', 'photo', 'video', 'lens'],
            'tablet': ['ipad', 'android tablet', 'slate'],
            'gaming': ['game', 'console', 'controller', 'xbox', 'playstation'],
            'fitness': ['exercise', 'workout', 'gym', 'health', 'sport'],
            'home': ['house', 'kitchen', 'bedroom', 'living room'],
            'fashion': ['clothing', 'apparel', 'style', 'wear', 'dress', 'shirt']
        }

    def extract_price_range(self, query: str) -> Optional[Tuple[float, float]]:
        """
        Extract price range from search query.

        Args:
            query: Search query text

        Returns:
            Tuple of (min_price, max_price) or None
        """
        query_lower = query.lower()

        # Check for explicit price mentions
        price_patterns = [
            r'under\s*\$?(\d+)',
            r'below\s*\$?(\d+)',
            r'less\s*than\s*\$?(\d+)',
            r'\$?(\d+)\s*or\s*less',
            r'up\s*to\s*\$?(\d+)',
            r'maximum\s*\$?(\d+)',
            r'max\s*\$?(\d+)'
        ]

        for pattern in price_patterns:
            match = re.search(pattern, query_lower)
            if match:
                max_price = float(match.group(1))
                return (0, max_price)

        # Check for price range patterns
        range_patterns = [
            r'\$?(\d+)\s*-\s*\$?(\d+)',
            r'\$?(\d+)\s*to\s*\$?(\d+)',
            r'between\s*\$?(\d+)\s*and\s*\$?(\d+)'
        ]

        for pattern in range_patterns:
            match = re.search(pattern, query_lower)
            if match:
                min_price = float(match.group(1))
                max_price = float(match.group(2))
                return (min_price, max_price)

        # Check for keyword-based price ranges
        for keyword, (min_price, max_price) in self.price_keywords.items():
            if keyword in query_lower:
                return (min_price, max_price)

        return None

    def extract_categories(self, query: str) -> List[str]:
        """
        Extract potential categories from search query.

        Args:
            query: Search query text

        Returns:
            List of category names
        """
        query_lower = query.lower()
        found_categories = []

        for category, keywords in self.category_keywords.items():
            if category in query_lower or any(keyword in query_lower for keyword in keywords):
                found_categories.append(category)

        return found_categories

    def keyword_search(self, query: str, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Perform traditional keyword-based search.

        Args:
            query: Search query text
            filters: Additional filters (category_id, brand_id, price_range, etc.)

        Returns:
            List of product dictionaries
        """
        if not Product or not db:
            return []

        try:
            # Build base query
            search_query = Product.query.filter(Product.is_active == True)

            # Apply text search
            if query and query.strip():
                search_terms = query.strip().split()
                conditions = []

                for term in search_terms:
                    term_pattern = f"%{term}%"
                    term_conditions = or_(
                        Product.name.ilike(term_pattern),
                        Product.description.ilike(term_pattern),
                        Product.short_description.ilike(term_pattern),
                        Product.sku.ilike(term_pattern)
                    )
                    conditions.append(term_conditions)

                # All terms should match (AND logic)
                if conditions:
                    search_query = search_query.filter(and_(*conditions))

            # Apply filters
            if filters:
                if filters.get('category_id'):
                    search_query = search_query.filter(Product.category_id == filters['category_id'])

                if filters.get('brand_id'):
                    search_query = search_query.filter(Product.brand_id == filters['brand_id'])

                if filters.get('price_range'):
                    min_price, max_price = filters['price_range']
                    if min_price is not None:
                        search_query = search_query.filter(Product.price >= min_price)
                    if max_price is not None and max_price != float('inf'):
                        search_query = search_query.filter(Product.price <= max_price)

                if filters.get('is_featured'):
                    search_query = search_query.filter(Product.is_featured == True)

                if filters.get('is_sale'):
                    search_query = search_query.filter(Product.is_sale == True)

                if filters.get('in_stock'):
                    search_query = search_query.filter(Product.stock > 0)

            # Order by relevance (featured first, then by name)
            search_query = search_query.order_by(
                Product.is_featured.desc(),
                Product.is_sale.desc(),
                Product.name.asc()
            )

            # Limit results
            products = search_query.limit(50).all()

            # Convert to dictionaries
            results = []
            for product in products:
                try:
                    product_dict = product.to_dict()

                    # Add category and brand info
                    if product.category:
                        product_dict['category'] = product.category.to_dict()

                    if product.brand:
                        product_dict['brand'] = product.brand.to_dict()

                    results.append(product_dict)
                except Exception as e:
                    logger.error(f"Error converting product {product.id} to dict: {str(e)}")
                    continue

            logger.info(f"Keyword search found {len(results)} products for query: '{query}'")
            return results

        except Exception as e:
            logger.error(f"Keyword search failed: {str(e)}")
            return []

    def semantic_search(self, query: str, k: int = 20, threshold: float = 0.3) -> List[Dict[str, Any]]:
        """
        Perform semantic search using FAISS.

        Args:
            query: Search query text
            k: Number of results to return
            threshold: Minimum similarity threshold

        Returns:
            List of product dictionaries with similarity scores
        """
        if not self.embedding_service:
            logger.warning("Embedding service not available, falling back to keyword search")
            return self.keyword_search(query)[:k]

        if not Product or not db:
            return []

        try:
            # Get similar product IDs from FAISS
            similar_products = self.embedding_service.search(query, k=k, threshold=threshold)

            if not similar_products:
                return []

            # Extract product IDs
            product_ids = [pid for pid, score in similar_products]

            # Fetch products from database
            products = Product.query.filter(
                Product.id.in_(product_ids),
                Product.is_active == True
            ).all()

            # Create a mapping of product_id to similarity score
            score_map = {pid: score for pid, score in similar_products}

            # Convert to dictionaries and add similarity scores
            results = []
            for product in products:
                try:
                    product_dict = product.to_dict()
                    product_dict['similarity_score'] = score_map.get(product.id, 0.0)

                    # Add category and brand info
                    if product.category:
                        product_dict['category'] = product.category.to_dict()

                    if product.brand:
                        product_dict['brand'] = product.brand.to_dict()

                    results.append(product_dict)
                except Exception as e:
                    logger.error(f"Error converting product {product.id} to dict: {str(e)}")
                    continue

            # Sort by similarity score
            results.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)

            logger.info(f"Semantic search found {len(results)} products for query: '{query}'")
            return results

        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
            return []

    def hybrid_search(self, query: str, limit: int = 20, semantic_weight: float = 0.7) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining semantic and keyword search.

        Args:
            query: Search query text
            limit: Maximum number of results to return
            semantic_weight: Weight for semantic search results (0.0 to 1.0)

        Returns:
            List of product dictionaries with combined scores
        """
        try:
            # Extract filters from query
            price_range = self.extract_price_range(query)
            categories = self.extract_categories(query)

            # Build filters
            filters = {}
            if price_range:
                filters['price_range'] = price_range

            # Get results from both search methods
            semantic_results = self.semantic_search(query, k=limit * 2, threshold=0.2)
            keyword_results = self.keyword_search(query, filters=filters)

            # Combine and score results
            combined_results = {}

            # Add semantic results with weighted scores
            for i, product in enumerate(semantic_results):
                product_id = product['id']
                semantic_score = product.get('similarity_score', 0.0)
                position_score = 1.0 - (i / len(semantic_results))  # Higher score for better positions

                combined_results[product_id] = {
                    'product': product,
                    'semantic_score': semantic_score,
                    'keyword_score': 0.0,
                    'position_score': position_score,
                    'source': 'semantic'
                }

            # Add keyword results with scores
            for i, product in enumerate(keyword_results):
                product_id = product['id']
                keyword_score = 1.0 - (i / len(keyword_results)) if keyword_results else 0.0

                if product_id in combined_results:
                    # Update existing entry
                    combined_results[product_id]['keyword_score'] = keyword_score
                    combined_results[product_id]['source'] = 'both'
                else:
                    # Add new entry
                    combined_results[product_id] = {
                        'product': product,
                        'semantic_score': 0.0,
                        'keyword_score': keyword_score,
                        'position_score': keyword_score,
                        'source': 'keyword'
                    }

            # Calculate combined scores
            final_results = []
            for product_id, data in combined_results.items():
                semantic_score = data['semantic_score']
                keyword_score = data['keyword_score']
                position_score = data['position_score']

                # Combined score with weights
                combined_score = (
                    semantic_weight * semantic_score +
                    (1 - semantic_weight) * keyword_score +
                    0.1 * position_score  # Small boost for position
                )

                # Boost score if found in both searches
                if data['source'] == 'both':
                    combined_score *= 1.2

                product_data = data['product'].copy()
                product_data['search_score'] = combined_score
                product_data['semantic_score'] = semantic_score
                product_data['keyword_score'] = keyword_score
                product_data['search_source'] = data['source']

                final_results.append(product_data)

            # Sort by combined score and limit results
            final_results.sort(key=lambda x: x.get('search_score', 0), reverse=True)
            final_results = final_results[:limit]

            logger.info(f"Hybrid search found {len(final_results)} products for query: '{query}'")
            return final_results

        except Exception as e:
            logger.error(f"Hybrid search failed: {str(e)}")
            # Fallback to keyword search
            return self.keyword_search(query)[:limit]

    def get_search_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        Get search suggestions based on partial query.

        Args:
            query: Partial search query
            limit: Maximum number of suggestions

        Returns:
            List of suggested search terms
        """
        if not Product or not db or not query or len(query.strip()) < 2:
            return []

        try:
            query_pattern = f"%{query.strip()}%"

            # Get product names that match
            products = Product.query.filter(
                Product.is_active == True,
                or_(
                    Product.name.ilike(query_pattern),
                    Product.description.ilike(query_pattern)
                )
            ).limit(limit * 2).all()

            suggestions = set()

            # Extract relevant terms from product names
            for product in products:
                words = product.name.lower().split()
                for word in words:
                    if query.lower() in word and len(word) > 2:
                        suggestions.add(word.capitalize())

                if len(suggestions) >= limit:
                    break

            return list(suggestions)[:limit]

        except Exception as e:
            logger.error(f"Failed to get search suggestions: {str(e)}")
            return []

    def get_popular_searches(self, limit: int = 10) -> List[str]:
        """
        Get popular search terms (placeholder implementation).
        In production, this would be based on search analytics.

        Args:
            limit: Maximum number of popular searches

        Returns:
            List of popular search terms
        """
        # This is a placeholder - in production you'd track actual search queries
        popular_terms = [
            "iPhone",
            "laptop",
            "headphones",
            "smartwatch",
            "gaming laptop",
            "wireless earbuds",
            "4K TV",
            "smartphone",
            "tablet",
            "camera"
        ]

        return popular_terms[:limit]


# Global search service instance
search_service = None

def get_search_service() -> SearchService:
    """Get or create the global search service instance."""
    global search_service
    if search_service is None:
        search_service = SearchService()
    return search_service
