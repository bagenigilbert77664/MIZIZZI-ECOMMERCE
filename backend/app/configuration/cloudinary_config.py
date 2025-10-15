"""
Enhanced Cloudinary Configuration for Mizizzi E-Commerce with actual credentials
"""
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CloudinaryConfig:
    """Enhanced Cloudinary configuration class with your actual credentials"""

    def __init__(self):
        # Use actual credentials with fallback to environment variables
        self.cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME', 'da35rsdl0')
        self.api_key = os.getenv('CLOUDINARY_API_KEY', '192958788917765')
        self.api_secret = os.getenv('CLOUDINARY_API_SECRET', 'rXJtH3p6qsXnQ_Nb5XQ-l1ywaKc')
        self.secure = True

        # Validate credentials
        if not all([self.cloud_name, self.api_key, self.api_secret]):
            raise ValueError(
                "Missing Cloudinary credentials. Please check your environment variables."
            )

        # Additional configuration
        self.base_url = f"https://res.cloudinary.com/{self.cloud_name}"
        self.upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/image/upload"

    def configure(self):
        """Configure Cloudinary with credentials"""
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=self.secure
        )
        return cloudinary

    def get_image_url(self, public_id, transformation=None):
        """Generate optimized image URL"""
        if not public_id:
            return None

        base_transformations = [
            {'quality': 'auto'},
            {'format': 'auto'}
        ]

        if transformation:
            if isinstance(transformation, list):
                base_transformations.extend(transformation)
            else:
                base_transformations.append(transformation)

        return cloudinary.CloudinaryImage(public_id).build_url(
            transformation=base_transformations,
            secure=True
        )

# Initialize configuration
cloudinary_config = CloudinaryConfig()

def get_cloudinary():
    """Get configured Cloudinary instance"""
    return cloudinary_config.configure()

def get_image_url(public_id, transformation=None):
    """Helper function to get image URL"""
    return cloudinary_config.get_image_url(public_id, transformation)

# Enhanced Cloudinary settings with your account
CLOUDINARY_SETTINGS = {
    'product_images': {
        'folder': 'mizizzi/products',
        'transformation': [
            {'width': 800, 'height': 800, 'crop': 'fill', 'quality': 'auto'},
            {'format': 'auto'}
        ],
        'allowed_formats': ['jpg', 'jpeg', 'png', 'webp'],
        'max_file_size': 10 * 1024 * 1024,  # 10MB
        'use_filename': True,
        'unique_filename': True
    },
    'product_thumbnails': {
        'folder': 'mizizzi/products/thumbnails',
        'transformation': [
            {'width': 300, 'height': 300, 'crop': 'fill', 'quality': 'auto'},
            {'format': 'auto'}
        ]
    },
    'product_gallery': {
        'folder': 'mizizzi/products/gallery',
        'transformation': [
            {'width': 1200, 'height': 1200, 'crop': 'limit', 'quality': 'auto'},
            {'format': 'auto'}
        ]
    },
    'category_images': {
        'folder': 'mizizzi/categories',
        'transformation': [
            {'width': 600, 'height': 400, 'crop': 'fill', 'quality': 'auto'},
            {'format': 'auto'}
        ]
    },
    'brand_logos': {
        'folder': 'mizizzi/brands',
        'transformation': [
            {'width': 200, 'height': 200, 'crop': 'fit', 'quality': 'auto'},
            {'format': 'auto'}
        ]
    }
}

# Responsive image transformations
RESPONSIVE_TRANSFORMATIONS = {
    'mobile': {'width': 400, 'height': 400, 'crop': 'fill'},
    'tablet': {'width': 600, 'height': 600, 'crop': 'fill'},
    'desktop': {'width': 800, 'height': 800, 'crop': 'fill'},
    'large': {'width': 1200, 'height': 1200, 'crop': 'limit'}
}

def get_responsive_image_urls(public_id):
    """Get responsive image URLs for different screen sizes"""
    if not public_id:
        return {}

    urls = {}
    for size, transformation in RESPONSIVE_TRANSFORMATIONS.items():
        urls[size] = get_image_url(public_id, transformation)

    return urls
