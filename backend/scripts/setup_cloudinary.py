"""
Enhanced Setup script for Cloudinary integration with actual credentials
"""
import os
import sys
import json
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Your actual Cloudinary credentials
CLOUDINARY_CREDENTIALS = {
    'CLOUDINARY_CLOUD_NAME': 'da35rsdl0',
    'CLOUDINARY_API_KEY': '192958788917765',
    'CLOUDINARY_API_SECRET': 'rXJtH3p6qsXnQ_Nb5XQ-l1ywaKc'
}

def create_env_file():
    """Create .env file with actual Cloudinary configuration"""
    env_path = backend_dir / '.env'

    env_content = f"""# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME={CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME']}
CLOUDINARY_API_KEY={CLOUDINARY_CREDENTIALS['CLOUDINARY_API_KEY']}
CLOUDINARY_API_SECRET={CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET']}

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=mizizzi_secure_secret_key_2024_production_ready
DATABASE_URL=postgresql://mizizzi:junior2020@localhost:5432/mizizzi
# Upload Configuration (for backward compatibility during migration)
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://mizizzi.com,https://www.mizizzi.com

# API Configuration
API_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Image Upload Settings
MAX_IMAGE_SIZE=10485760  # 10MB
ALLOWED_IMAGE_FORMATS=jpg,jpeg,png,webp,gif

# Cloudinary Upload Presets
CLOUDINARY_PRODUCT_PRESET=mizizzi_products
CLOUDINARY_CATEGORY_PRESET=mizizzi_categories
CLOUDINARY_BRAND_PRESET=mizizzi_brands
"""

    with open(env_path, 'w') as f:
        f.write(env_content)

    print("✓ Created .env file with your Cloudinary credentials")
    return True

def install_dependencies():
    """Install required Python packages"""
    import subprocess

    requirements = [
        'cloudinary==1.36.0',
        'python-dotenv==1.0.0',
        'Pillow==10.0.1',
        'requests==2.31.0'
    ]

    print("Installing Cloudinary dependencies...")

    for package in requirements:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            print(f"✓ Installed {package}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {package}: {e}")
            return False

    return True

def create_upload_folders():
    """Create necessary upload folders"""
    folders = [
        backend_dir / 'uploads',
        backend_dir / 'uploads' / 'products',
        backend_dir / 'uploads' / 'categories',
        backend_dir / 'uploads' / 'brands',
        backend_dir / 'uploads' / 'temp',
        backend_dir / 'static',
        backend_dir / 'static' / 'images'
    ]

    for folder in folders:
        folder.mkdir(exist_ok=True)
        print(f"✓ Created folder: {folder}")

def test_cloudinary_connection():
    """Test Cloudinary connection with actual credentials"""
    try:
        # Set environment variables temporarily for testing
        os.environ.update(CLOUDINARY_CREDENTIALS)

        import cloudinary
        import cloudinary.api
        import cloudinary.uploader

        # Configure Cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME'],
            api_key=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_KEY'],
            api_secret=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET'],
            secure=True
        )

        # Test API connection
        print("Testing Cloudinary API connection...")
        result = cloudinary.api.ping()

        if result.get('status') == 'ok':
            print("✓ Cloudinary API connection successful")

            # Test account details
            try:
                usage = cloudinary.api.usage()
                print(f"✓ Account usage: {usage.get('credits', 'N/A')} credits used")
                print(f"✓ Storage: {usage.get('storage', {}).get('used_bytes', 0) / 1024 / 1024:.2f} MB used")
            except Exception as e:
                print(f"⚠️  Could not fetch usage details: {e}")

            return True
        else:
            print("✗ Cloudinary connection failed")
            return False

    except Exception as e:
        print(f"✗ Cloudinary connection error: {e}")
        return False

def create_cloudinary_upload_presets():
    """Create upload presets on Cloudinary"""
    try:
        import cloudinary
        import cloudinary.api

        # Configure Cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME'],
            api_key=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_KEY'],
            api_secret=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET'],
            secure=True
        )

        presets = [
            {
                'name': 'mizizzi_products',
                'settings': {
                    'folder': 'mizizzi/products',
                    'transformation': [
                        {'width': 800, 'height': 800, 'crop': 'fill', 'quality': 'auto'},
                        {'format': 'auto'}
                    ],
                    'allowed_formats': ['jpg', 'jpeg', 'png', 'webp'],
                    'max_file_size': 10000000,  # 10MB
                    'use_filename': True,
                    'unique_filename': True
                }
            },
            {
                'name': 'mizizzi_categories',
                'settings': {
                    'folder': 'mizizzi/categories',
                    'transformation': [
                        {'width': 600, 'height': 400, 'crop': 'fill', 'quality': 'auto'},
                        {'format': 'auto'}
                    ],
                    'allowed_formats': ['jpg', 'jpeg', 'png', 'webp']
                }
            },
            {
                'name': 'mizizzi_brands',
                'settings': {
                    'folder': 'mizizzi/brands',
                    'transformation': [
                        {'width': 200, 'height': 200, 'crop': 'fit', 'quality': 'auto'},
                        {'format': 'auto'}
                    ],
                    'allowed_formats': ['jpg', 'jpeg', 'png', 'webp']
                }
            }
        ]

        print("Creating Cloudinary upload presets...")

        for preset in presets:
            try:
                result = cloudinary.api.create_upload_preset(
                    name=preset['name'],
                    **preset['settings']
                )
                print(f"✓ Created upload preset: {preset['name']}")
            except Exception as e:
                if 'already exists' in str(e):
                    print(f"✓ Upload preset already exists: {preset['name']}")
                else:
                    print(f"⚠️  Could not create preset {preset['name']}: {e}")

        return True

    except Exception as e:
        print(f"✗ Error creating upload presets: {e}")
        return False

def create_sample_test_image():
    """Create a sample test image for upload testing"""
    try:
        from PIL import Image, ImageDraw, ImageFont

        # Create a simple test image
        img = Image.new('RGB', (400, 300), color='lightblue')
        draw = ImageDraw.Draw(img)

        # Add text
        try:
            # Try to use a default font
            font = ImageFont.load_default()
        except:
            font = None

        text = "Mizizzi Test Image"
        if font:
            draw.text((50, 130), text, fill='darkblue', font=font)
        else:
            draw.text((50, 130), text, fill='darkblue')

        # Save test image
        test_image_path = backend_dir / 'uploads' / 'test_image.jpg'
        img.save(test_image_path, 'JPEG')

        print(f"✓ Created test image: {test_image_path}")
        return test_image_path

    except Exception as e:
        print(f"⚠️  Could not create test image: {e}")
        return None

def test_image_upload():
    """Test image upload to Cloudinary"""
    try:
        import cloudinary
        import cloudinary.uploader

        # Configure Cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME'],
            api_key=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_KEY'],
            api_secret=CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET'],
            secure=True
        )

        # Create test image
        test_image_path = create_sample_test_image()

        if test_image_path and test_image_path.exists():
            print("Testing image upload to Cloudinary...")

            result = cloudinary.uploader.upload(
                str(test_image_path),
                folder="mizizzi/test",
                public_id="setup_test_image",
                transformation=[
                    {'width': 300, 'height': 300, 'crop': 'fill', 'quality': 'auto'}
                ]
            )

            if result.get('secure_url'):
                print(f"✓ Test image uploaded successfully!")
                print(f"  URL: {result['secure_url']}")
                print(f"  Public ID: {result['public_id']}")

                # Clean up test image
                try:
                    cloudinary.uploader.destroy(result['public_id'])
                    print("✓ Test image cleaned up from Cloudinary")
                except:
                    pass

                # Remove local test image
                test_image_path.unlink()
                print("✓ Local test image cleaned up")

                return True
            else:
                print("✗ Image upload failed")
                return False
        else:
            print("⚠️  Could not create test image for upload")
            return False

    except Exception as e:
        print(f"✗ Image upload test failed: {e}")
        return False

def generate_config_summary():
    """Generate a summary of the configuration"""
    print("\n" + "="*60)
    print("📋 CLOUDINARY CONFIGURATION SUMMARY")
    print("="*60)
    print(f"Cloud Name: {CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME']}")
    print(f"API Key: {CLOUDINARY_CREDENTIALS['CLOUDINARY_API_KEY']}")
    print(f"API Secret: {'*' * (len(CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET']) - 4) + CLOUDINARY_CREDENTIALS['CLOUDINARY_API_SECRET'][-4:]}")
    print(f"Dashboard URL: https://console.cloudinary.com/console/c-{CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME']}")
    print("\n📁 FOLDER STRUCTURE:")
    print("  mizizzi/products/     - Product images")
    print("  mizizzi/categories/   - Category images")
    print("  mizizzi/brands/       - Brand logos")
    print("  mizizzi/test/         - Test images")

def main():
    """Main setup function with actual credentials"""
    print("🚀 Setting up Cloudinary integration for Mizizzi E-Commerce")
    print("🔑 Using your actual Cloudinary credentials")
    print("=" * 60)

    success_steps = []

    # Step 1: Create .env file
    print("\n1. Setting up environment configuration...")
    if create_env_file():
        success_steps.append("Environment configuration")

    # Step 2: Install dependencies
    print("\n2. Installing dependencies...")
    if install_dependencies():
        success_steps.append("Dependencies installation")

    # Step 3: Create folders
    print("\n3. Creating upload folders...")
    create_upload_folders()
    success_steps.append("Folder structure")

    # Step 4: Test connection
    print("\n4. Testing Cloudinary connection...")
    if test_cloudinary_connection():
        success_steps.append("Cloudinary connection")

    # Step 5: Create upload presets
    print("\n5. Creating upload presets...")
    if create_cloudinary_upload_presets():
        success_steps.append("Upload presets")

    # Step 6: Test image upload
    print("\n6. Testing image upload...")
    if test_image_upload():
        success_steps.append("Image upload test")

    # Generate summary
    generate_config_summary()

    print("\n" + "=" * 60)
    print("🎉 Cloudinary setup completed!")
    print(f"✅ Successfully completed: {len(success_steps)}/6 steps")

    if len(success_steps) == 6:
        print("\n🟢 ALL SYSTEMS GO! Your Cloudinary integration is ready.")
    else:
        print(f"\n🟡 {6 - len(success_steps)} steps need attention. Check the output above.")

    print("\n📋 Next steps:")
    print("1. ✅ Cloudinary is configured and ready")
    print("2. 🔄 Run database migrations: flask db upgrade")
    print("3. 📦 Run migration script: python scripts/migrate_images_to_cloudinary.py")
    print("4. 🧪 Test the integration in your application")
    print("5. 🌐 Update frontend components to use Cloudinary URLs")

    print(f"\n🔗 Cloudinary Dashboard: https://console.cloudinary.com/console/c-{CLOUDINARY_CREDENTIALS['CLOUDINARY_CLOUD_NAME']}")

if __name__ == "__main__":
    main()
