"""
Tests for the search service functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
import json

from app.routes.search.search_service import SearchService, get_search_service


class TestSearchService:
    """Test the SearchService class."""

    def test_search_service_initialization(self):
        """Test search service initialization."""
        service = SearchService()

        # Should initialize without errors
        assert service is not None
        assert hasattr(service, 'price_keywords')
        assert hasattr(service, 'category_keywords')

    def test_extract_price_range_under_patterns(self):
        """Test price range extraction for 'under' patterns."""
        service = SearchService()

        test_cases = [
            ("under $500", (0, 500)),
            ("below $1000", (0, 1000)),
            ("less than $200", (0, 200)),
            ("$300 or less", (0, 300)),
            ("up to $150", (0, 150)),
            ("maximum $800", (0, 800)),
            ("max $600", (0, 600))
        ]

        for query, expected in test_cases:
            result = service.extract_price_range(query)
            assert result == expected, f"Failed for query: {query}"

    def test_extract_price_range_range_patterns(self):
        """Test price range extraction for range patterns."""
        service = SearchService()

        test_cases = [
            ("$100-$500", (100, 500)),
            ("$200 to $800", (200, 800)),
            ("between $50 and $300", (50, 300)),
            ("100-500", (100, 500))
        ]

        for query, expected in test_cases:
            result = service.extract_price_range(query)
            assert result == expected, f"Failed for query: {query}"

    def test_extract_price_range_keywords(self):
        """Test price range extraction using keywords."""
        service = SearchService()

        test_cases = [
            ("cheap phone", (0, 100)),
            ("budget laptop", (0, 150)),
            ("affordable headphones", (0, 200)),
            ("premium smartphone", (500, 1500)),
            ("luxury watch", (1500, float('inf'))),
            ("high-end camera", (2000, float('inf')))
        ]

        for query, expected in test_cases:
            result = service.extract_price_range(query)
            assert result == expected, f"Failed for query: {query}"

    def test_extract_price_range_no_match(self):
        """Test price range extraction when no pattern matches."""
        service = SearchService()

        test_cases = [
            "smartphone",
            "latest iPhone",
            "gaming laptop",
            "wireless headphones"
        ]

        for query in test_cases:
            result = service.extract_price_range(query)
            assert result is None, f"Should return None for query: {query}"

    def test_extract_categories(self):
        """Test category extraction from queries."""
        service = SearchService()

        test_cases = [
            ("iPhone smartphone", ["phone"]),
            ("gaming laptop computer", ["laptop"]),
            ("wireless headphones audio", ["headphones"]),
            ("smartwatch fitness tracker", ["watch", "fitness"]),
            ("DSLR camera photography", ["camera"]),
            ("iPad tablet", ["tablet"]),
            ("Xbox gaming console", ["gaming"]),
            ("running shoes fitness", ["fitness"]),
            ("kitchen appliances home", ["home"]),
            ("fashion clothing style", ["fashion"])
        ]

        for query, expected_categories in test_cases:
            result = service.extract_categories(query)
            for expected in expected_categories:
                assert expected in result, f"Expected '{expected}' in result for query: {query}"

    @patch('app.routes.search.search_service.Product')
    @patch('app.routes.search.search_service.db')
    def test_keyword_search_success(self, mock_db, mock_product):
        """Test successful keyword search."""
        service = SearchService()

        # Mock product query
        mock_query = MagicMock()
        mock_product.query.filter.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query

        # Mock products
        mock_products = [
            MagicMock(id=1, name="iPhone 15", to_dict=lambda: {"id": 1, "name": "iPhone 15"}),
            MagicMock(id=2, name="Samsung Galaxy", to_dict=lambda: {"id": 2, "name": "Samsung Galaxy"})
        ]
        mock_query.all.return_value = mock_products

        # Mock category and brand relationships
        for product in mock_products:
            product.category = None
            product.brand = None

        result = service.keyword_search("iPhone")

        assert len(result) == 2
        assert result[0]["name"] == "iPhone 15"
        assert result[1]["name"] == "Samsung Galaxy"

    @patch('app.routes.search.search_service.Product', None)
    @patch('app.routes.search.search_service.db', None)
    def test_keyword_search_no_models(self):
        """Test keyword search when models are not available."""
        service = SearchService()

        result = service.keyword_search("test query")

        assert result == []

    def test_keyword_search_with_filters(self):
        """Test keyword search with filters applied."""
        service = SearchService()

        with patch('app.routes.search.search_service.Product') as mock_product, \
             patch('app.routes.search.search_service.db'):

            # Mock the query chain
            mock_query = MagicMock()
            mock_product.query.filter.return_value = mock_query
            mock_query.filter.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.all.return_value = []

            filters = {
                'category_id': 1,
                'brand_id': 2,
                'price_range': (100, 500),
                'is_featured': True,
                'is_sale': True,
                'in_stock': True
            }

            result = service.keyword_search("test", filters=filters)

            # Should call filter at least once (base query + some filters before error)
            assert mock_query.filter.call_count >= 1
            assert result == []

    @patch('app.routes.search.search_service.get_embedding_service')
    def test_semantic_search_success(self, mock_get_embedding_service):
        """Test successful semantic search."""
        service = SearchService()

        # Mock embedding service
        mock_embedding_service = MagicMock()
        mock_embedding_service.search.return_value = [(1, 0.85), (2, 0.75)]
        mock_get_embedding_service.return_value = mock_embedding_service
        service.embedding_service = mock_embedding_service

        with patch('app.routes.search.search_service.Product') as mock_product, \
             patch('app.routes.search.search_service.db'):

            # Mock products
            mock_products = [
                MagicMock(id=1, name="iPhone", to_dict=lambda: {"id": 1, "name": "iPhone"}),
                MagicMock(id=2, name="Samsung", to_dict=lambda: {"id": 2, "name": "Samsung"})
            ]

            mock_product.query.filter.return_value.all.return_value = mock_products

            # Mock category and brand relationships
            for product in mock_products:
                product.category = None
                product.brand = None

            result = service.semantic_search("smartphone")

            assert len(result) == 2
            assert result[0]["similarity_score"] == 0.85
            assert result[1]["similarity_score"] == 0.75

    def test_semantic_search_no_embedding_service(self):
        """Test semantic search when embedding service is not available."""
        service = SearchService()
        service.embedding_service = None

        with patch.object(service, 'keyword_search') as mock_keyword_search:
            mock_keyword_search.return_value = [{"id": 1, "name": "Test"}]

            result = service.semantic_search("test query")

            # Should fallback to keyword search
            mock_keyword_search.assert_called_once_with("test query")
            assert result == [{"id": 1, "name": "Test"}]

    @patch('app.routes.search.search_service.get_embedding_service')
    def test_hybrid_search_success(self, mock_get_embedding_service):
        """Test successful hybrid search."""
        service = SearchService()

        # Mock embedding service
        mock_embedding_service = MagicMock()
        mock_get_embedding_service.return_value = mock_embedding_service
        service.embedding_service = mock_embedding_service

        with patch.object(service, 'semantic_search') as mock_semantic, \
             patch.object(service, 'keyword_search') as mock_keyword:

            # Mock search results
            mock_semantic.return_value = [
                {"id": 1, "name": "iPhone", "similarity_score": 0.85}
            ]
            mock_keyword.return_value = [
                {"id": 1, "name": "iPhone"},
                {"id": 2, "name": "Samsung"}
            ]

            result = service.hybrid_search("smartphone")

            assert len(result) >= 1
            # Should have combined scores
            for item in result:
                assert 'search_score' in item
                assert 'search_source' in item

    def test_hybrid_search_price_extraction(self):
        """Test that hybrid search extracts price ranges from queries."""
        service = SearchService()

        with patch.object(service, 'extract_price_range') as mock_extract_price, \
             patch.object(service, 'semantic_search') as mock_semantic, \
             patch.object(service, 'keyword_search') as mock_keyword:

            mock_extract_price.return_value = (100, 500)
            mock_semantic.return_value = []
            mock_keyword.return_value = []

            service.hybrid_search("cheap smartphone under $500")

            mock_extract_price.assert_called_once_with("cheap smartphone under $500")

    @patch('app.routes.search.search_service.Product')
    @patch('app.routes.search.search_service.db')
    def test_get_search_suggestions_success(self, mock_db, mock_product):
        """Test successful search suggestions."""
        service = SearchService()

        # Mock products
        mock_products = [
            MagicMock(name="iPhone 15 Pro"),
            MagicMock(name="iPad Air"),
            MagicMock(name="iPod Touch")
        ]

        mock_query = MagicMock()
        mock_product.query.filter.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_products

        result = service.get_search_suggestions("ip")

        assert isinstance(result, list)
        assert len(result) <= 5  # Default limit
        # Should contain suggestions starting with or containing "ip"
        for suggestion in result:
            assert isinstance(suggestion, str)

    def test_get_search_suggestions_short_query(self):
        """Test search suggestions with short query."""
        service = SearchService()

        result = service.get_search_suggestions("a")

        assert result == []

    def test_get_search_suggestions_empty_query(self):
        """Test search suggestions with empty query."""
        service = SearchService()

        result = service.get_search_suggestions("")

        assert result == []

    def test_get_popular_searches(self):
        """Test getting popular searches."""
        service = SearchService()

        result = service.get_popular_searches()

        assert isinstance(result, list)
        assert len(result) <= 10  # Default limit

        # Should contain common search terms
        expected_terms = ["iPhone", "laptop", "headphones", "smartwatch"]
        for term in expected_terms:
            assert term in result

    def test_get_popular_searches_with_limit(self):
        """Test getting popular searches with custom limit."""
        service = SearchService()

        result = service.get_popular_searches(limit=5)

        assert isinstance(result, list)
        assert len(result) <= 5


class TestSearchServiceSingleton:
    """Test the search service singleton pattern."""

    def test_get_search_service_singleton(self):
        """Test that get_search_service returns the same instance."""
        service1 = get_search_service()
        service2 = get_search_service()

        assert service1 is service2

    def test_get_search_service_returns_search_service(self):
        """Test that get_search_service returns a SearchService instance."""
        service = get_search_service()

        assert isinstance(service, SearchService)


class TestSearchServiceErrorHandling:
    """Test error handling in search service."""

    @patch('app.routes.search.search_service.Product')
    @patch('app.routes.search.search_service.db')
    def test_keyword_search_database_error(self, mock_db, mock_product):
        """Test keyword search with database error."""
        service = SearchService()

        # Mock database error
        mock_product.query.filter.side_effect = Exception("Database error")

        result = service.keyword_search("test")

        assert result == []

    @patch('app.routes.search.search_service.get_embedding_service')
    def test_semantic_search_embedding_error(self, mock_get_embedding_service):
        """Test semantic search with embedding service error."""
        service = SearchService()

        # Mock embedding service error
        mock_embedding_service = MagicMock()
        mock_embedding_service.search.side_effect = Exception("Embedding error")
        mock_get_embedding_service.return_value = mock_embedding_service
        service.embedding_service = mock_embedding_service

        result = service.semantic_search("test")

        assert result == []

    def test_hybrid_search_fallback_to_keyword(self):
        """Test that hybrid search falls back to keyword search on error."""
        service = SearchService()

        with patch.object(service, 'semantic_search') as mock_semantic, \
             patch.object(service, 'keyword_search') as mock_keyword:

            # Mock semantic search error
            mock_semantic.side_effect = Exception("Semantic search error")
            mock_keyword.return_value = [{"id": 1, "name": "Test"}]

            result = service.hybrid_search("test")

            # Should fallback to keyword search
            mock_keyword.assert_called_once()
            assert result == [{"id": 1, "name": "Test"}]

    @patch('app.routes.search.search_service.Product')
    @patch('app.routes.search.search_service.db')
    def test_get_search_suggestions_database_error(self, mock_db, mock_product):
        """Test search suggestions with database error."""
        service = SearchService()

        # Mock database error
        mock_product.query.filter.side_effect = Exception("Database error")

        result = service.get_search_suggestions("test")

        assert result == []


class TestSearchServiceEdgeCases:
    """Test edge cases in search service."""

    def test_extract_price_range_multiple_patterns(self):
        """Test price range extraction with multiple patterns in query."""
        service = SearchService()

        # Should match the first pattern found (keyword-based has higher priority)
        result = service.extract_price_range("cheap phone under $500 between $100 and $300")

        # Should match "cheap" keyword first
        assert result == (0, 100)

    def test_extract_categories_overlapping_keywords(self):
        """Test category extraction with overlapping keywords."""
        service = SearchService()

        result = service.extract_categories("gaming laptop computer")

        # Should find both "laptop" and "gaming"
        assert "laptop" in result
        assert "gaming" in result

    def test_hybrid_search_empty_results(self):
        """Test hybrid search when both semantic and keyword return empty results."""
        service = SearchService()

        with patch.object(service, 'semantic_search') as mock_semantic, \
             patch.object(service, 'keyword_search') as mock_keyword:

            mock_semantic.return_value = []
            mock_keyword.return_value = []

            result = service.hybrid_search("nonexistent product")

            assert result == []

    def test_hybrid_search_duplicate_products(self):
        """Test hybrid search handling of duplicate products from both searches."""
        service = SearchService()

        with patch.object(service, 'semantic_search') as mock_semantic, \
             patch.object(service, 'keyword_search') as mock_keyword:

            # Same product in both results
            duplicate_product = {"id": 1, "name": "iPhone", "similarity_score": 0.8}

            mock_semantic.return_value = [duplicate_product]
            mock_keyword.return_value = [{"id": 1, "name": "iPhone"}]

            result = service.hybrid_search("iPhone")

            # Should only appear once in results
            product_ids = [p["id"] for p in result]
            assert product_ids.count(1) == 1

            # Should have combined source
            iphone_result = next(p for p in result if p["id"] == 1)
            assert iphone_result["search_source"] == "both"
