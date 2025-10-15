"""
Tests for the embedding service functionality.
"""
import pytest
import os
import tempfile
import shutil
import numpy as np
from unittest.mock import patch, MagicMock, mock_open
import json

from app.routes.search.embedding_service import EmbeddingService, get_embedding_service


class TestEmbeddingService:
    """Test the EmbeddingService class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.test_product = {
            'id': 1,
            'name': 'iPhone 15 Pro',
            'description': 'Latest iPhone with advanced features',
            'short_description': 'Premium smartphone',
            'category': {'name': 'Smartphones'},
            'brand': {'name': 'Apple'},
            'price': 999.99,  # This should trigger "premium quality" not "luxury"
            'specifications': {
                'storage': '256GB',
                'color': 'Space Black'
            }
        }

    def teardown_method(self):
        """Clean up test fixtures."""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', False)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', False)
    def test_embedding_service_unavailable_dependencies(self):
        """Test embedding service when dependencies are not available."""
        service = EmbeddingService()

        assert not service.is_available()
        assert not service.available

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SentenceTransformer')
    @patch('app.routes.search.embedding_service.faiss')
    def test_embedding_service_initialization_success(self, mock_faiss, mock_sentence_transformer):
        """Test successful embedding service initialization."""
        # Mock sentence transformer
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_sentence_transformer.return_value = mock_model

        # Mock FAISS index
        mock_index = MagicMock()
        mock_faiss.IndexFlatIP.return_value = mock_index

        with patch.object(EmbeddingService, '_load_or_create_index'):
            service = EmbeddingService()

            assert service.is_available()
            assert service.model == mock_model
            assert service.embedding_dim == 384

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SentenceTransformer')
    def test_embedding_service_model_loading_failure(self, mock_sentence_transformer):
        """Test embedding service when model loading fails."""
        mock_sentence_transformer.side_effect = Exception("Model loading failed")

        service = EmbeddingService()

        assert not service.is_available()

    def test_generate_product_text_complete_product(self):
        """Test product text generation with complete product data."""
        service = EmbeddingService()

        text = service.generate_product_text(self.test_product)

        assert 'iPhone 15 Pro' in text
        assert 'Latest iPhone with advanced features' in text
        assert 'Premium smartphone' in text
        assert 'Category: Smartphones' in text
        assert 'Brand: Apple' in text
        assert 'storage: 256GB' in text
        assert 'color: Space Black' in text
        assert 'premium quality' in text  # Price 999.99 should trigger "premium quality"

    def test_generate_product_text_minimal_product(self):
        """Test product text generation with minimal product data."""
        service = EmbeddingService()

        minimal_product = {
            'id': 1,
            'name': 'Basic Phone',
            'price': 50
        }

        text = service.generate_product_text(minimal_product)

        assert 'Basic Phone' in text
        assert 'budget affordable cheap' in text  # Price < 100

    def test_generate_product_text_price_categories(self):
        """Test product text generation with different price categories."""
        service = EmbeddingService()

        test_cases = [
            ({'id': 1, 'name': 'Cheap Phone', 'price': 50}, 'budget affordable cheap'),
            ({'id': 2, 'name': 'Mid Phone', 'price': 300}, 'mid-range moderate'),
            ({'id': 3, 'name': 'Premium Phone', 'price': 800}, 'premium quality'),
            ({'id': 4, 'name': 'Luxury Phone', 'price': 1500}, 'luxury high-end expensive')
        ]

        for product, expected_text in test_cases:
            text = service.generate_product_text(product)
            assert expected_text in text

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_generate_embedding_service_unavailable(self):
        """Test embedding generation when service is unavailable."""
        service = EmbeddingService()
        service.available = False
        service.model = None

        with pytest.raises(ValueError, match="Model not loaded"):
            service.generate_embedding("test text")

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_generate_embedding_success(self):
        """Test successful embedding generation."""
        service = EmbeddingService()
        service.available = True

        # Mock model
        mock_model = MagicMock()
        mock_embedding = np.array([[0.1, 0.2, 0.3, 0.4]], dtype=np.float32)
        mock_model.encode.return_value = mock_embedding
        service.model = mock_model

        result = service.generate_embedding("test text")

        assert isinstance(result, np.ndarray)
        assert result.dtype == np.float32
        mock_model.encode.assert_called_once_with(["test text"], normalize_embeddings=True)

    def test_add_product_to_index_service_unavailable(self):
        """Test adding product when service is unavailable."""
        service = EmbeddingService()
        service.available = False

        result = service.add_product_to_index(self.test_product)

        assert result is False

    def test_add_product_to_index_no_product_id(self):
        """Test adding product without ID."""
        service = EmbeddingService()
        service.available = True

        product_without_id = {'name': 'Test Product'}
        result = service.add_product_to_index(product_without_id)

        assert result is False

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.ProductEmbedding', None)
    @patch('app.routes.search.embedding_service.db', None)
    def test_add_product_to_index_success_no_db(self):
        """Test successful product addition without database."""
        service = EmbeddingService()
        service.available = True

        # Mock index and model
        mock_index = MagicMock()
        service.index = mock_index
        service.product_ids = []

        mock_model = MagicMock()
        mock_embedding = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_model.encode.return_value = np.array([mock_embedding])
        service.model = mock_model

        with patch.object(service, 'generate_product_text', return_value="test text"):
            result = service.add_product_to_index(self.test_product)

        assert result is True
        assert 1 in service.product_ids
        mock_index.add.assert_called_once()

    def test_rebuild_index_service_unavailable(self):
        """Test rebuilding index when service is unavailable."""
        service = EmbeddingService()
        service.available = False

        result = service.rebuild_index([self.test_product])

        assert result is False

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.faiss')
    @patch('app.routes.search.embedding_service.ProductEmbedding', None)
    @patch('app.routes.search.embedding_service.db', None)
    def test_rebuild_index_success(self, mock_faiss):
        """Test successful index rebuilding."""
        service = EmbeddingService()
        service.available = True
        service.embedding_dim = 384

        # Mock FAISS index
        mock_index = MagicMock()
        mock_faiss.IndexFlatIP.return_value = mock_index

        # Mock model
        mock_model = MagicMock()
        mock_embedding = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_model.encode.return_value = np.array([mock_embedding])
        service.model = mock_model

        with patch.object(service, 'generate_product_text', return_value="test text"), \
             patch.object(service, '_save_index'):

            result = service.rebuild_index([self.test_product])

        assert result is True
        assert service.index == mock_index
        assert 1 in service.product_ids

    def test_search_service_unavailable(self):
        """Test search when service is unavailable."""
        service = EmbeddingService()
        service.available = False

        result = service.search("test query")

        assert result == []

    def test_search_empty_index(self):
        """Test search with empty index."""
        service = EmbeddingService()
        service.available = True
        service.index = None
        service.product_ids = []

        result = service.search("test query")

        assert result == []

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_search_success(self):
        """Test successful search."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [1, 2, 3]

        # Mock index
        mock_index = MagicMock()
        # Mock search results: similarities and indices
        mock_index.search.return_value = (
            np.array([[0.9, 0.7, 0.5]]),  # similarities
            np.array([[0, 1, 2]])         # indices
        )
        service.index = mock_index

        # Mock model
        mock_model = MagicMock()
        mock_embedding = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_model.encode.return_value = np.array([mock_embedding])
        service.model = mock_model

        result = service.search("test query", k=3, threshold=0.6)

        # Should return products with similarity >= 0.6
        assert len(result) == 2  # 0.9 and 0.7 are >= 0.6
        assert result[0] == (1, 0.9)  # product_id=1, similarity=0.9
        assert result[1] == (2, 0.7)  # product_id=2, similarity=0.7

    def test_get_index_stats_service_unavailable(self):
        """Test getting index stats when service is unavailable."""
        service = EmbeddingService()
        service.available = False

        result = service.get_index_stats()

        assert result == {}

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_get_index_stats_success(self):
        """Test successful index stats retrieval."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [1, 2, 3]
        service.embedding_dim = 384
        service.model_name = 'test-model'

        with patch('os.path.exists', return_value=True), \
             patch('os.path.getsize', return_value=1024 * 1024), \
             patch('os.path.getmtime', return_value=1234567890):

            result = service.get_index_stats()

        assert result['total_products'] == 3
        assert result['embedding_dimension'] == 384
        assert result['model_name'] == 'test-model'
        assert result['index_size_mb'] == 1.0
        assert result['last_updated'] is not None

    def test_remove_product_from_index_service_unavailable(self):
        """Test removing product when service is unavailable."""
        service = EmbeddingService()
        service.available = False

        result = service.remove_product_from_index(1)

        assert result is False

    def test_remove_product_from_index_not_found(self):
        """Test removing product that's not in index."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [2, 3, 4]

        result = service.remove_product_from_index(1)

        assert result is True  # Returns True even if not found

    @patch('app.routes.search.embedding_service.ProductEmbedding', None)
    @patch('app.routes.search.embedding_service.db', None)
    def test_remove_product_from_index_success(self):
        """Test successful product removal."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [1, 2, 3]

        with patch.object(service, '_save_index'):
            result = service.remove_product_from_index(1)

        assert result is True
        assert 1 not in service.product_ids
        assert service.product_ids == [2, 3]

    def test_is_available_true(self):
        """Test is_available when service is properly initialized."""
        service = EmbeddingService()
        service.available = True
        service.model = MagicMock()

        assert service.is_available() is True

    def test_is_available_false_no_model(self):
        """Test is_available when model is not loaded."""
        service = EmbeddingService()
        service.available = True
        service.model = None

        assert service.is_available() is False

    def test_is_available_false_not_available(self):
        """Test is_available when service is not available."""
        service = EmbeddingService()
        service.available = False
        service.model = MagicMock()

        assert service.is_available() is False


class TestEmbeddingServiceFileOperations:
    """Test file operations in embedding service."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()

    def teardown_method(self):
        """Clean up test fixtures."""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.faiss')
    def test_save_index_success(self, mock_faiss):
        """Test successful index saving."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [1, 2, 3]
        service.embedding_dim = 384
        service.model_name = 'test-model'
        service.index_path = os.path.join(self.temp_dir, 'test_index.bin')
        service.metadata_path = os.path.join(self.temp_dir, 'test_metadata.json')

        mock_index = MagicMock()
        service.index = mock_index

        service._save_index()

        # Check that faiss.write_index was called
        mock_faiss.write_index.assert_called_once_with(mock_index, service.index_path)

        # Check that metadata file was created
        assert os.path.exists(service.metadata_path)

        # Check metadata content
        with open(service.metadata_path, 'r') as f:
            metadata = json.load(f)

        assert metadata['product_ids'] == [1, 2, 3]
        assert metadata['embedding_dim'] == 384
        assert metadata['model_name'] == 'test-model'
        assert 'last_updated' in metadata

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.faiss')
    @patch('app.routes.search.embedding_service.SentenceTransformer')
    def test_load_index_success(self, mock_sentence_transformer, mock_faiss):
        """Test successful index loading."""
        # Create test metadata file
        metadata_path = os.path.join(self.temp_dir, 'test_metadata.json')
        metadata = {
            'product_ids': [1, 2, 3],
            'embedding_dim': 384,
            'model_name': 'test-model',
            'last_updated': '2023-01-01T00:00:00'
        }

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)

        # Mock FAISS index loading
        mock_index = MagicMock()
        mock_faiss.read_index.return_value = mock_index

        # Mock sentence transformer
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_sentence_transformer.return_value = mock_model

        # Create service with custom paths to avoid loading existing index
        with patch('os.path.exists') as mock_exists:
            # First call (for existing index check) returns False, second call (for metadata) returns True
            mock_exists.side_effect = [False, True, True]

            service = EmbeddingService()
            service.available = True
            service.index_path = os.path.join(self.temp_dir, 'test_index.bin')
            service.metadata_path = metadata_path

            service._load_index()

        assert service.index == mock_index
        assert service.product_ids == [1, 2, 3]
        # Only check that read_index was called with the correct path
        mock_faiss.read_index.assert_called_with(service.index_path)

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.faiss')
    @patch('app.routes.search.embedding_service.SentenceTransformer')
    def test_load_index_file_not_found(self, mock_sentence_transformer, mock_faiss):
        """Test index loading when files don't exist."""
        # Mock sentence transformer
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_sentence_transformer.return_value = mock_model

        # Mock new index creation
        mock_index = MagicMock()
        mock_faiss.IndexFlatIP.return_value = mock_index

        with patch('os.path.exists', return_value=False):
            service = EmbeddingService()
            service.available = True
            service.embedding_dim = 384

        # Should create new index
        assert service.index == mock_index
        assert service.product_ids == []


class TestEmbeddingServiceSingleton:
    """Test the embedding service singleton pattern."""

    def test_get_embedding_service_singleton(self):
        """Test that get_embedding_service returns the same instance."""
        # Reset the global instance first
        import app.routes.search.embedding_service as embedding_module
        embedding_module.embedding_service = None

        service1 = get_embedding_service()
        service2 = get_embedding_service()

        assert service1 is service2

    def test_get_embedding_service_returns_embedding_service(self):
        """Test that get_embedding_service returns an EmbeddingService instance."""
        service = get_embedding_service()

        assert isinstance(service, EmbeddingService)


class TestEmbeddingServiceErrorHandling:
    """Test error handling in embedding service."""

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_generate_embedding_model_error(self):
        """Test embedding generation when model fails."""
        service = EmbeddingService()
        service.available = True

        # Mock model that raises exception
        mock_model = MagicMock()
        mock_model.encode.side_effect = Exception("Model encoding failed")
        service.model = mock_model

        with pytest.raises(Exception, match="Model encoding failed"):
            service.generate_embedding("test text")

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_add_product_to_index_error(self):
        """Test adding product when an error occurs."""
        service = EmbeddingService()
        service.available = True

        # Mock methods to raise exceptions
        with patch.object(service, 'generate_product_text', side_effect=Exception("Text generation failed")):
            result = service.add_product_to_index({'id': 1, 'name': 'Test'})

        assert result is False

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    def test_search_error(self):
        """Test search when an error occurs."""
        service = EmbeddingService()
        service.available = True
        service.product_ids = [1, 2, 3]

        # Mock index that raises exception
        mock_index = MagicMock()
        mock_index.search.side_effect = Exception("Search failed")
        service.index = mock_index

        # Mock model
        mock_model = MagicMock()
        mock_embedding = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        mock_model.encode.return_value = np.array([mock_embedding])
        service.model = mock_model

        result = service.search("test query")

        assert result == []


class TestEmbeddingServiceIntegration:
    """Integration tests for embedding service."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.test_products = [
            {
                'id': 1,
                'name': 'iPhone 15 Pro',
                'description': 'Latest iPhone with advanced features',
                'category': {'name': 'Smartphones'},
                'brand': {'name': 'Apple'},
                'price': 999.99
            },
            {
                'id': 2,
                'name': 'Samsung Galaxy S24',
                'description': 'Premium Android smartphone',
                'category': {'name': 'Smartphones'},
                'brand': {'name': 'Samsung'},
                'price': 899.99
            },
            {
                'id': 3,
                'name': 'MacBook Pro',
                'description': 'Professional laptop for developers',
                'category': {'name': 'Laptops'},
                'brand': {'name': 'Apple'},
                'price': 1999.99
            }
        ]

    def teardown_method(self):
        """Clean up test fixtures."""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    @patch('app.routes.search.embedding_service.FAISS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.SENTENCE_TRANSFORMERS_AVAILABLE', True)
    @patch('app.routes.search.embedding_service.faiss')
    @patch('app.routes.search.embedding_service.SentenceTransformer')
    @patch('app.routes.search.embedding_service.ProductEmbedding', None)
    @patch('app.routes.search.embedding_service.db', None)
    def test_full_workflow(self, mock_sentence_transformer, mock_faiss):
        """Test complete workflow: rebuild index, add product, search, remove product."""
        # Mock sentence transformer
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_sentence_transformer.return_value = mock_model

        # Mock FAISS index
        mock_index = MagicMock()
        mock_faiss.IndexFlatIP.return_value = mock_index

        # Create service with mocked dependencies
        with patch('os.path.exists', return_value=False):
            service = EmbeddingService()
            service.available = True
            service.embedding_dim = 384

        # Mock embeddings for different calls
        mock_embeddings = [
            np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32),
            np.array([0.2, 0.3, 0.4, 0.5], dtype=np.float32),
            np.array([0.3, 0.4, 0.5, 0.6], dtype=np.float32),
            np.array([0.4, 0.5, 0.6, 0.7], dtype=np.float32),  # For new product
            np.array([0.5, 0.6, 0.7, 0.8], dtype=np.float32)   # For search query
        ]
        mock_model.encode.side_effect = [np.array([emb]) for emb in mock_embeddings]

        with patch.object(service, '_save_index'):
            # 1. Rebuild index with initial products
            result = service.rebuild_index(self.test_products)
            assert result is True
            assert len(service.product_ids) == 3

            # 2. Add a new product
            new_product = {
                'id': 4,
                'name': 'iPad Pro',
                'description': 'Professional tablet',
                'category': {'name': 'Tablets'},
                'brand': {'name': 'Apple'},
                'price': 799.99
            }
            result = service.add_product_to_index(new_product)
            assert result is True
            assert 4 in service.product_ids

            # 3. Mock search results
            mock_index.search.return_value = (
                np.array([[0.9, 0.8, 0.7]]),  # similarities
                np.array([[0, 1, 2]])         # indices
            )

            # Perform search
            results = service.search("Apple products", k=3, threshold=0.6)
            assert len(results) == 3  # All similarities are >= 0.6

            # 4. Remove a product
            result = service.remove_product_from_index(2)
            assert result is True
            assert 2 not in service.product_ids

    def test_product_text_generation_edge_cases(self):
        """Test product text generation with various edge cases."""
        service = EmbeddingService()

        edge_cases = [
            # Empty product
            {},
            # Product with None values
            {'id': 1, 'name': None, 'description': None, 'price': None},
            # Product with empty strings
            {'id': 2, 'name': '', 'description': '', 'price': 0},
            # Product with complex nested data
            {
                'id': 3,
                'name': 'Complex Product',
                'category': {'name': 'Electronics', 'subcategory': 'Phones'},
                'brand': {'name': 'TestBrand', 'country': 'USA'},
                'specifications': {
                    'color': 'Blue',
                    'storage': '128GB',
                    'ram': None,
                    'display': ''
                },
                'price': 299.99
            }
        ]

        for product in edge_cases:
            # Should not raise exceptions
            text = service.generate_product_text(product)
            assert isinstance(text, str)
