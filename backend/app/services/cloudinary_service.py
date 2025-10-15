"""
Cloudinary Service for Image Management
Enhanced version with complete functionality for Mizizzi E-Commerce
"""
import os
import uuid
import logging
from typing import List, Dict, Optional, Union
from werkzeug.datastructures import FileStorage
import cloudinary
import cloudinary.uploader
import cloudinary.api
from PIL import Image
import io
import base64
import json

from ..configuration.cloudinary_config import get_cloudinary, CLOUDINARY_SETTINGS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudinaryService:
    """Service class for handling Cloudinary operations"""

    def __init__(self):
        self.cloudinary = get_cloudinary()
        self.settings = CLOUDINARY_SETTINGS
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.allowed_formats = ['jpg', 'jpeg', 'png', 'webp', 'gif']

    def upload_product_image(
        self,
        file: Union[FileStorage, str, bytes],
        product_id: int,
        is_primary: bool = False,
        alt_text: str = None
    ) -> Dict:
        """
        Upload a product image to Cloudinary

        Args:
            file: Image file (FileStorage, file path, or bytes)
            product_id: Product ID for organizing images
            is_primary: Whether this is the primary product image
            alt_text: Alternative text for the image

        Returns:
            Dict containing upload result with URLs and metadata
        """
        try:
            # Generate unique public ID
            public_id = f"product_{product_id}_{uuid.uuid4().hex[:8]}"

            # Configure upload options
            upload_options = {
                'public_id': public_id,
                'folder': self.settings['product_images']['folder'],
                'transformation': self.settings['product_images']['transformation'],
                'resource_type': 'image',
                'overwrite': True,
                'invalidate': True,
                'context': {
                    'product_id': str(product_id),
                    'is_primary': str(is_primary),
                    'alt_text': alt_text or f"Product {product_id} image"
                },
                'tags': [f"product_{product_id}", "mizizzi_product"]
            }

            # Handle different file types
            if isinstance(file, FileStorage):
                # Validate file
                if not self._validate_image_file(file):
                    raise ValueError("Invalid image file")

                # Reset file pointer
                file.seek(0)

                # Upload file
                result = cloudinary.uploader.upload(file, **upload_options)

            elif isinstance(file, str):
                # File path or URL
                result = cloudinary.uploader.upload(file, **upload_options)

            elif isinstance(file, bytes):
                # Bytes data
                result = cloudinary.uploader.upload(file, **upload_options)

            else:
                raise ValueError("Unsupported file type")

            # Generate thumbnail
            thumbnail_result = self._generate_thumbnail(result['public_id'], product_id)

            # Prepare response
            response = {
                'success': True,
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'url': result['url'],
                'thumbnail_url': thumbnail_result.get('secure_url', result['secure_url']),
                'width': result['width'],
                'height': result['height'],
                'format': result['format'],
                'bytes': result['bytes'],
                'created_at': result['created_at'],
                'version': result['version'],
                'is_primary': is_primary,
                'alt_text': alt_text,
                'responsive_urls': self._generate_responsive_urls(result['public_id'])
            }

            logger.info(f"Successfully uploaded image for product {product_id}: {result['public_id']}")
            return response

        except Exception as e:
            logger.error(f"Error uploading image for product {product_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def upload_multiple_product_images(
        self,
        files: List[FileStorage],
        product_id: int,
        primary_index: int = 0
    ) -> List[Dict]:
        """
        Upload multiple product images

        Args:
            files: List of image files
            product_id: Product ID
            primary_index: Index of the primary image (default: 0)

        Returns:
            List of upload results
        """
        results = []

        for index, file in enumerate(files):
            is_primary = index == primary_index
            result = self.upload_product_image(
                file=file,
                product_id=product_id,
                is_primary=is_primary,
                alt_text=f"Product {product_id} image {index + 1}"
            )
            results.append(result)

        return results

    def _generate_thumbnail(self, public_id: str, product_id: int) -> Dict:
        """Generate thumbnail for uploaded image"""
        try:
            thumbnail_public_id = f"product_{product_id}_thumb_{uuid.uuid4().hex[:8]}"

            # Create thumbnail using transformation
            thumbnail_result = cloudinary.uploader.upload(
                f"image/upload/{public_id}",
                public_id=thumbnail_public_id,
                folder=self.settings['product_thumbnails']['folder'],
                transformation=self.settings['product_thumbnails']['transformation'],
                resource_type='image'
            )

            return thumbnail_result

        except Exception as e:
            logger.error(f"Error generating thumbnail: {str(e)}")
            # Return original image as fallback
            return {'secure_url': f"https://res.cloudinary.com/{self.cloudinary.config().cloud_name}/image/upload/{public_id}"}

    def _generate_responsive_urls(self, public_id: str) -> Dict:
        """Generate responsive image URLs for different screen sizes"""
        try:
            responsive_sizes = {
                'thumbnail': {'width': 150, 'height': 150, 'crop': 'fill'},
                'small': {'width': 300, 'height': 300, 'crop': 'fill'},
                'medium': {'width': 600, 'height': 600, 'crop': 'fill'},
                'large': {'width': 800, 'height': 800, 'crop': 'limit'},
                'xlarge': {'width': 1200, 'height': 1200, 'crop': 'limit'}
            }

            urls = {}
            for size_name, transformation in responsive_sizes.items():
                urls[size_name] = self.generate_transformation_url(
                    public_id,
                    width=transformation['width'],
                    height=transformation['height'],
                    crop=transformation['crop']
                )

            return urls

        except Exception as e:
            logger.error(f"Error generating responsive URLs: {str(e)}")
            return {}

    def delete_image(self, public_id: str) -> Dict:
        """
        Delete an image from Cloudinary

        Args:
            public_id: Cloudinary public ID of the image

        Returns:
            Dict containing deletion result
        """
        try:
            result = cloudinary.uploader.destroy(public_id)

            logger.info(f"Successfully deleted image: {public_id}")
            return {
                'success': True,
                'result': result['result'],
                'public_id': public_id
            }

        except Exception as e:
            logger.error(f"Error deleting image {public_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_multiple_images(self, public_ids: List[str]) -> List[Dict]:
        """Delete multiple images"""
        results = []

        for public_id in public_ids:
            result = self.delete_image(public_id)
            results.append(result)

        return results

    def update_image_metadata(self, public_id: str, context: Dict) -> Dict:
        """
        Update image metadata/context

        Args:
            public_id: Cloudinary public ID
            context: Context data to update

        Returns:
            Dict containing update result
        """
        try:
            result = cloudinary.uploader.update_metadata(
                public_id=public_id,
                context=context
            )

            return {
                'success': True,
                'public_id': public_id,
                'context': result.get('context', {})
            }

        except Exception as e:
            logger.error(f"Error updating metadata for {public_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_image_info(self, public_id: str) -> Dict:
        """Get detailed information about an image"""
        try:
            result = cloudinary.api.resource(public_id)

            return {
                'success': True,
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'url': result['url'],
                'width': result['width'],
                'height': result['height'],
                'format': result['format'],
                'bytes': result['bytes'],
                'created_at': result['created_at'],
                'context': result.get('context', {}),
                'tags': result.get('tags', [])
            }

        except Exception as e:
            logger.error(f"Error getting image info for {public_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_product_images(self, product_id: int) -> List[Dict]:
        """Get all images for a specific product"""
        try:
            # Search for images with product_id in context
            result = cloudinary.api.resources(
                type='upload',
                prefix=f"{self.settings['product_images']['folder']}/product_{product_id}",
                context=True,
                max_results=50
            )

            images = []
            for resource in result.get('resources', []):
                context = resource.get('context', {})

                images.append({
                    'public_id': resource['public_id'],
                    'secure_url': resource['secure_url'],
                    'url': resource['url'],
                    'width': resource['width'],
                    'height': resource['height'],
                    'format': resource['format'],
                    'bytes': resource['bytes'],
                    'created_at': resource['created_at'],
                    'is_primary': context.get('is_primary', 'false').lower() == 'true',
                    'alt_text': context.get('alt_text', f"Product {product_id} image"),
                    'responsive_urls': self._generate_responsive_urls(resource['public_id'])
                })

            # Sort by primary first, then by creation date
            images.sort(key=lambda x: (not x['is_primary'], x['created_at']))

            return images

        except Exception as e:
            logger.error(f"Error getting images for product {product_id}: {str(e)}")
            return []

    def _validate_image_file(self, file: FileStorage) -> bool:
        """Validate uploaded image file"""
        if not file or not file.filename:
            return False

        # Check file extension
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

        if file_extension not in self.allowed_formats:
            logger.error(f"Invalid file format: {file_extension}")
            return False

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > self.max_file_size:
            logger.error(f"File too large: {file_size} bytes")
            return False

        # Validate image format using PIL
        try:
            image = Image.open(file.stream)
            image.verify()
            file.stream.seek(0)  # Reset stream position
            return True
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            return False

    def generate_transformation_url(
        self,
        public_id: str,
        width: int = None,
        height: int = None,
        crop: str = 'fill',
        quality: str = 'auto',
        format: str = 'auto'
    ) -> str:
        """
        Generate a transformed image URL

        Args:
            public_id: Cloudinary public ID
            width: Target width
            height: Target height
            crop: Crop mode
            quality: Image quality
            format: Image format

        Returns:
            Transformed image URL
        """
        transformation = []

        if width or height:
            transform = {'crop': crop}
            if width:
                transform['width'] = width
            if height:
                transform['height'] = height
            transformation.append(transform)

        transformation.extend([
            {'quality': quality},
            {'format': format}
        ])

        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            transformation=transformation,
            secure=True
        )

        return url

    def upload_category_image(self, file: FileStorage, category_id: int, alt_text: str = None) -> Dict:
        """Upload category image to Cloudinary"""
        try:
            public_id = f"category_{category_id}_{uuid.uuid4().hex[:8]}"

            upload_options = {
                'public_id': public_id,
                'folder': self.settings['category_images']['folder'],
                'transformation': self.settings['category_images']['transformation'],
                'resource_type': 'image',
                'overwrite': True,
                'invalidate': True,
                'context': {
                    'category_id': str(category_id),
                    'alt_text': alt_text or f"Category {category_id} image"
                },
                'tags': [f"category_{category_id}", "mizizzi_category"]
            }

            if not self._validate_image_file(file):
                raise ValueError("Invalid image file")

            file.seek(0)
            result = cloudinary.uploader.upload(file, **upload_options)

            return {
                'success': True,
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'url': result['url'],
                'width': result['width'],
                'height': result['height'],
                'format': result['format'],
                'bytes': result['bytes']
            }

        except Exception as e:
            logger.error(f"Error uploading category image: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def upload_brand_logo(self, file: FileStorage, brand_id: int, alt_text: str = None) -> Dict:
        """Upload brand logo to Cloudinary"""
        try:
            public_id = f"brand_{brand_id}_{uuid.uuid4().hex[:8]}"

            upload_options = {
                'public_id': public_id,
                'folder': self.settings['brand_logos']['folder'],
                'transformation': self.settings['brand_logos']['transformation'],
                'resource_type': 'image',
                'overwrite': True,
                'invalidate': True,
                'context': {
                    'brand_id': str(brand_id),
                    'alt_text': alt_text or f"Brand {brand_id} logo"
                },
                'tags': [f"brand_{brand_id}", "mizizzi_brand"]
            }

            if not self._validate_image_file(file):
                raise ValueError("Invalid image file")

            file.seek(0)
            result = cloudinary.uploader.upload(file, **upload_options)

            return {
                'success': True,
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'url': result['url'],
                'width': result['width'],
                'height': result['height'],
                'format': result['format'],
                'bytes': result['bytes']
            }

        except Exception as e:
            logger.error(f"Error uploading brand logo: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def optimize_image_for_web(self, public_id: str, target_size: str = 'medium') -> str:
        """
        Generate optimized image URL for web display

        Args:
            public_id: Cloudinary public ID
            target_size: Size preset (thumbnail, small, medium, large, xlarge)

        Returns:
            Optimized image URL
        """
        size_presets = {
            'thumbnail': {'width': 150, 'height': 150, 'crop': 'fill'},
            'small': {'width': 300, 'height': 300, 'crop': 'fill'},
            'medium': {'width': 600, 'height': 600, 'crop': 'fill'},
            'large': {'width': 800, 'height': 800, 'crop': 'limit'},
            'xlarge': {'width': 1200, 'height': 1200, 'crop': 'limit'}
        }

        preset = size_presets.get(target_size, size_presets['medium'])

        return self.generate_transformation_url(
            public_id,
            width=preset['width'],
            height=preset['height'],
            crop=preset['crop'],
            quality='auto',
            format='auto'
        )

    def get_storage_usage(self) -> Dict:
        """Get Cloudinary storage usage statistics"""
        try:
            result = cloudinary.api.usage()

            return {
                'success': True,
                'credits_used': result.get('credits', 0),
                'bandwidth_used': result.get('bandwidth', 0),
                'storage_used': result.get('storage', 0),
                'transformations_used': result.get('transformations', 0),
                'objects_used': result.get('objects', 0)
            }

        except Exception as e:
            logger.error(f"Error getting storage usage: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def search_images(self, query: str, max_results: int = 20) -> List[Dict]:
        """Search for images in Cloudinary"""
        try:
            result = cloudinary.api.resources(
                type='upload',
                prefix=query,
                max_results=max_results,
                context=True
            )

            images = []
            for resource in result.get('resources', []):
                images.append({
                    'public_id': resource['public_id'],
                    'secure_url': resource['secure_url'],
                    'width': resource['width'],
                    'height': resource['height'],
                    'format': resource['format'],
                    'bytes': resource['bytes'],
                    'created_at': resource['created_at'],
                    'context': resource.get('context', {})
                })

            return images

        except Exception as e:
            logger.error(f"Error searching images: {str(e)}")
            return []

    def bulk_delete_images(self, public_ids: List[str]) -> Dict:
        """Delete multiple images in bulk"""
        try:
            result = cloudinary.api.delete_resources(public_ids)

            return {
                'success': True,
                'deleted': result.get('deleted', {}),
                'deleted_counts': result.get('deleted_counts', {}),
                'partial': result.get('partial', False)
            }

        except Exception as e:
            logger.error(f"Error bulk deleting images: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def create_image_archive(self, public_ids: List[str], archive_name: str = None) -> Dict:
        """Create a downloadable archive of images"""
        try:
            if not archive_name:
                archive_name = f"mizizzi_images_{uuid.uuid4().hex[:8]}"

            result = cloudinary.utils.archive_url(
                public_ids=public_ids,
                resource_type='image',
                type='upload',
                target_format='zip'
            )

            return {
                'success': True,
                'archive_url': result,
                'archive_name': archive_name
            }

        except Exception as e:
            logger.error(f"Error creating image archive: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_image_analysis(self, public_id: str) -> Dict:
        """Get AI-powered image analysis from Cloudinary"""
        try:
            # Get image with analysis
            result = cloudinary.api.resource(
                public_id,
                colors=True,
                faces=True,
                quality_analysis=True,
                accessibility_analysis=True
            )

            analysis = {
                'success': True,
                'public_id': public_id,
                'colors': result.get('colors', []),
                'faces': result.get('faces', []),
                'quality_score': result.get('quality_analysis', {}).get('quality_score'),
                'accessibility': result.get('accessibility_analysis', {}),
                'predominant_colors': result.get('predominant', {}).get('google', [])
            }

            return analysis

        except Exception as e:
            logger.error(f"Error analyzing image {public_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

# Create service instance
cloudinary_service = CloudinaryService()

# Helper functions for easy access
def upload_product_image(file, product_id, is_primary=False, alt_text=None):
    """Helper function to upload product image"""
    return cloudinary_service.upload_product_image(file, product_id, is_primary, alt_text)

def delete_image(public_id):
    """Helper function to delete image"""
    return cloudinary_service.delete_image(public_id)

def get_optimized_url(public_id, size='medium'):
    """Helper function to get optimized image URL"""
    return cloudinary_service.optimize_image_for_web(public_id, size)

def get_responsive_urls(public_id):
    """Helper function to get responsive image URLs"""
    return cloudinary_service._generate_responsive_urls(public_id)
