"""
Embedding Service for AI-powered semantic search using sentence-transformers.
Handles product embedding generation and FAISS index management.
"""

import os
import json
import pickle
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Setup logger
logger = logging.getLogger(__name__)

# Try importing optional dependencies with fallbacks
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    logger.warning("FAISS not available. Install with: pip install faiss-cpu")
    FAISS_AVAILABLE = False
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    logger.warning("sentence-transformers not available. Install with: pip install sentence-transformers")
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

# Database imports with fallbacks
try:
    from app.configuration.extensions import db
    from app.models.models import Product, ProductEmbedding
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import Product, ProductEmbedding
    except ImportError:
        try:
            from configuration.extensions import db
            from models.models import Product, ProductEmbedding
        except ImportError:
            logger.error("Could not import database models")
            db = None
            Product = None
            ProductEmbedding = None


class EmbeddingService:
    """Service for managing product embeddings and FAISS search index."""

    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the embedding service.

        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name
        self.model = None
        self.index = None
        self.product_ids = []
        self.embedding_dim = 384  # Default for all-MiniLM-L6-v2
        self.index_path = os.path.join(os.getcwd(), 'data', 'faiss_index.bin')
        self.metadata_path = os.path.join(os.getcwd(), 'data', 'index_metadata.json')

        # Check if required dependencies are available
        if not FAISS_AVAILABLE or not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.error("Required dependencies not available for EmbeddingService")
            self.available = False
            return

        self.available = True

        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)

        # Initialize model and index
        try:
            self._load_model()
            self._load_or_create_index()
        except Exception as e:
            logger.error(f"Failed to initialize EmbeddingService: {str(e)}")
            self.available = False

    def _load_model(self):
        """Load the sentence transformer model."""
        try:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info(f"Model loaded successfully. Embedding dimension: {self.embedding_dim}")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model: {str(e)}")
            raise

    def _load_or_create_index(self):
        """Load existing FAISS index or create a new one."""
        try:
            if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
                self._load_index()
            else:
                self._create_new_index()
        except Exception as e:
            logger.error(f"Failed to load/create FAISS index: {str(e)}")
            self._create_new_index()

    def _create_new_index(self):
        """Create a new FAISS index."""
        logger.info("Creating new FAISS index")
        self.index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product for cosine similarity
        self.product_ids = []
        self._save_index()

    def _load_index(self):
        """Load existing FAISS index from disk."""
        try:
            logger.info("Loading existing FAISS index")
            self.index = faiss.read_index(self.index_path)

            with open(self.metadata_path, 'r') as f:
                metadata = json.load(f)
                self.product_ids = metadata.get('product_ids', [])

            logger.info(f"Index loaded successfully. Contains {len(self.product_ids)} products")
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {str(e)}")
            raise

    def _save_index(self):
        """Save FAISS index and metadata to disk."""
        try:
            faiss.write_index(self.index, self.index_path)

            metadata = {
                'product_ids': self.product_ids,
                'embedding_dim': self.embedding_dim,
                'model_name': self.model_name,
                'last_updated': datetime.now().isoformat()
            }

            with open(self.metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            logger.info(f"Index saved successfully with {len(self.product_ids)} products")
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {str(e)}")
            raise

    def generate_product_text(self, product: Dict[str, Any]) -> str:
        """
        Generate searchable text from product data.

        Args:
            product: Product dictionary with name, description, etc.

        Returns:
            Combined text for embedding generation
        """
        text_parts = []

        # Add product name (most important)
        if product.get('name'):
            text_parts.append(product['name'])

        # Add description
        if product.get('description'):
            text_parts.append(product['description'])

        # Add short description
        if product.get('short_description'):
            text_parts.append(product['short_description'])

        # Add category information
        if product.get('category') and isinstance(product['category'], dict):
            if product['category'].get('name'):
                text_parts.append(f"Category: {product['category']['name']}")

        # Add brand information
        if product.get('brand') and isinstance(product['brand'], dict):
            if product['brand'].get('name'):
                text_parts.append(f"Brand: {product['brand']['name']}")

        # Add specifications if available
        if product.get('specifications') and isinstance(product['specifications'], dict):
            for key, value in product['specifications'].items():
                if value:
                    text_parts.append(f"{key}: {value}")

        # Add price range information
        if product.get('price'):
            price = float(product['price'])
            if price < 100:
                text_parts.append("budget affordable cheap")
            elif price < 500:
                text_parts.append("mid-range moderate")
            elif price < 1000:
                text_parts.append("premium quality")
            else:
                text_parts.append("luxury high-end expensive")

        return " ".join(text_parts)

    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for given text.

        Args:
            text: Text to embed

        Returns:
            Normalized embedding vector
        """
        if not self.model:
            raise ValueError("Model not loaded")

        try:
            embedding = self.model.encode([text], normalize_embeddings=True)[0]
            return embedding.astype(np.float32)
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise

    def add_product_to_index(self, product: Dict[str, Any]) -> bool:
        """
        Add a single product to the FAISS index.

        Args:
            product: Product dictionary

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("EmbeddingService not available, returning False")
            return False

        try:
            product_id = product.get('id')
            if not product_id:
                logger.error("Product ID is required")
                return False

            # Generate text and embedding
            text = self.generate_product_text(product)
            embedding = self.generate_embedding(text)

            # Add to index
            self.index.add(embedding.reshape(1, -1))
            self.product_ids.append(product_id)

            # Store embedding in database if ProductEmbedding model is available
            if ProductEmbedding and db:
                try:
                    # Check if embedding already exists
                    existing = ProductEmbedding.query.filter_by(product_id=product_id).first()
                    if existing:
                        existing.embedding_vector = embedding.tobytes()
                        existing.text_content = text
                        existing.updated_at = datetime.utcnow()
                    else:
                        new_embedding = ProductEmbedding(
                            product_id=product_id,
                            embedding_vector=embedding.tobytes(),
                            text_content=text,
                            model_name=self.model_name
                        )
                        db.session.add(new_embedding)

                    db.session.commit()
                except Exception as e:
                    logger.error(f"Failed to store embedding in database: {str(e)}")
                    db.session.rollback()

            logger.info(f"Added product {product_id} to index")
            return True

        except Exception as e:
            logger.error(f"Failed to add product to index: {str(e)}")
            return False

    def rebuild_index(self, products: List[Dict[str, Any]]) -> bool:
        """
        Rebuild the entire FAISS index with given products.

        Args:
            products: List of product dictionaries

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("EmbeddingService not available, returning False")
            return False

        try:
            logger.info(f"Rebuilding index with {len(products)} products")

            # Create new index
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.product_ids = []

            # Process products in batches
            batch_size = 100
            embeddings_batch = []
            ids_batch = []

            for i, product in enumerate(products):
                try:
                    product_id = product.get('id')
                    if not product_id:
                        continue

                    text = self.generate_product_text(product)
                    embedding = self.generate_embedding(text)

                    embeddings_batch.append(embedding)
                    ids_batch.append(product_id)

                    # Store in database
                    if ProductEmbedding and db:
                        try:
                            existing = ProductEmbedding.query.filter_by(product_id=product_id).first()
                            if existing:
                                existing.embedding_vector = embedding.tobytes()
                                existing.text_content = text
                                existing.updated_at = datetime.utcnow()
                            else:
                                new_embedding = ProductEmbedding(
                                    product_id=product_id,
                                    embedding_vector=embedding.tobytes(),
                                    text_content=text,
                                    model_name=self.model_name
                                )
                                db.session.add(new_embedding)
                        except Exception as e:
                            logger.error(f"Failed to store embedding for product {product_id}: {str(e)}")

                    # Add batch to index when batch is full
                    if len(embeddings_batch) >= batch_size:
                        embeddings_array = np.vstack(embeddings_batch)
                        self.index.add(embeddings_array)
                        self.product_ids.extend(ids_batch)

                        embeddings_batch = []
                        ids_batch = []

                        logger.info(f"Processed {i + 1}/{len(products)} products")

                except Exception as e:
                    logger.error(f"Failed to process product {product.get('id', 'unknown')}: {str(e)}")
                    continue

            # Add remaining embeddings
            if embeddings_batch:
                embeddings_array = np.vstack(embeddings_batch)
                self.index.add(embeddings_array)
                self.product_ids.extend(ids_batch)

            # Commit database changes
            if db:
                try:
                    db.session.commit()
                except Exception as e:
                    logger.error(f"Failed to commit embeddings to database: {str(e)}")
                    db.session.rollback()

            # Save index to disk
            self._save_index()

            logger.info(f"Index rebuilt successfully with {len(self.product_ids)} products")
            return True

        except Exception as e:
            logger.error(f"Failed to rebuild index: {str(e)}")
            return False

    def search(self, query: str, k: int = 10, threshold: float = 0.3) -> List[Tuple[int, float]]:
        """
        Search for similar products using semantic similarity.

        Args:
            query: Search query text
            k: Number of results to return
            threshold: Minimum similarity threshold

        Returns:
            List of (product_id, similarity_score) tuples
        """
        if not self.is_available():
            logger.warning("EmbeddingService not available, returning empty results")
            return []

        try:
            if not self.index or len(self.product_ids) == 0:
                logger.warning("Index is empty")
                return []

            # Generate query embedding
            query_embedding = self.generate_embedding(query)

            # Search index
            similarities, indices = self.index.search(
                query_embedding.reshape(1, -1),
                min(k, len(self.product_ids))
            )

            # Filter results by threshold and return product IDs with scores
            results = []
            for i, (similarity, idx) in enumerate(zip(similarities[0], indices[0])):
                if similarity >= threshold and idx < len(self.product_ids):
                    product_id = self.product_ids[idx]
                    results.append((product_id, float(similarity)))

            logger.info(f"Found {len(results)} similar products for query: '{query}'")
            return results

        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return []

    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the current index."""
        if not self.is_available():
            logger.warning("EmbeddingService not available, returning empty stats")
            return {}

        return {
            'total_products': len(self.product_ids),
            'embedding_dimension': self.embedding_dim,
            'model_name': self.model_name,
            'index_size_mb': os.path.getsize(self.index_path) / (1024 * 1024) if os.path.exists(self.index_path) else 0,
            'last_updated': datetime.fromtimestamp(os.path.getmtime(self.index_path)).isoformat() if os.path.exists(self.index_path) else None
        }

    def remove_product_from_index(self, product_id: int) -> bool:
        """
        Remove a product from the index.
        Note: FAISS doesn't support efficient removal, so this rebuilds the index.

        Args:
            product_id: ID of product to remove

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("EmbeddingService not available, returning False")
            return False

        try:
            if product_id not in self.product_ids:
                logger.warning(f"Product {product_id} not found in index")
                return True

            # Remove from database
            if ProductEmbedding and db:
                try:
                    embedding = ProductEmbedding.query.filter_by(product_id=product_id).first()
                    if embedding:
                        db.session.delete(embedding)
                        db.session.commit()
                except Exception as e:
                    logger.error(f"Failed to remove embedding from database: {str(e)}")
                    db.session.rollback()

            # For now, just remove from product_ids list
            # In production, you might want to rebuild the index periodically
            if product_id in self.product_ids:
                self.product_ids.remove(product_id)
                self._save_index()

            logger.info(f"Removed product {product_id} from index")
            return True

        except Exception as e:
            logger.error(f"Failed to remove product from index: {str(e)}")
            return False

    def is_available(self) -> bool:
        """Check if the embedding service is available and properly initialized."""
        return getattr(self, 'available', False) and self.model is not None


# Global embedding service instance
embedding_service = None

def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()
    return embedding_service
