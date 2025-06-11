"""
Create a simple Flask app to test Cloudinary integration
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def create_test_app():
    """Create a test Flask app with Cloudinary"""

    app_content = '''"""
Simple Flask app to test Cloudinary integration for Mizizzi E-Commerce
"""
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Cloudinary
cloudinary.config(
    cloud_name="da35rsdl0",
    api_key="192958788917765",
    api_secret="rXJtH3p6qsXnQ_Nb5XQ-l1ywaKc",
    secure=True
)

# HTML template for testing
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Mizizzi Cloudinary Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        img { max-width: 100%; height: auto; margin: 10px 0; border: 1px solid #ddd; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        input[type="file"] { margin: 10px 0; }
        .image-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .image-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>🚀 Mizizzi E-Commerce - Cloudinary Integration Test</h1>

    <div class="container info">
        <h3>📊 Account Status</h3>
        <p><strong>Cloud Name:</strong> da35rsdl0</p>
        <p><strong>Status:</strong> <span id="status">Checking...</span></p>
        <p><strong>Credits Used:</strong> <span id="credits">Loading...</span></p>
        <p><strong>Storage Used:</strong> <span id="storage">Loading...</span></p>
    </div>

    <div class="container">
        <h3>📤 Upload Test</h3>
        <input type="file" id="fileInput" accept="image/*" />
        <button onclick="uploadImage()">Upload to Cloudinary</button>
        <div id="uploadResult"></div>
    </div>

    <div class="container">
        <h3>🖼️ Image Transformations Test</h3>
        <div id="transformations"></div>
    </div>

    <div class="container">
        <h3>📁 Recent Images</h3>
        <div id="recentImages" class="image-grid"></div>
    </div>

    <script>
        // Check status on load
        window.onload = function() {
            checkStatus();
            loadRecentImages();
        };

        async function checkStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();

                document.getElementById('status').textContent = data.status;
                document.getElementById('credits').textContent = data.credits || 'N/A';
                document.getElementById('storage').textContent = data.storage || 'N/A';

                if (data.status === 'Connected') {
                    document.getElementById('status').style.color = 'green';
                } else {
                    document.getElementById('status').style.color = 'red';
                }
            } catch (error) {
                document.getElementById('status').textContent = 'Error';
                document.getElementById('status').style.color = 'red';
            }
        }

        async function uploadImage() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file first');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const resultDiv = document.getElementById('uploadResult');
            resultDiv.innerHTML = '<p>Uploading...</p>';

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    resultDiv.innerHTML = `
                        <div class="container success">
                            <h4>✅ Upload Successful!</h4>
                            <p><strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a></p>
                            <p><strong>Public ID:</strong> ${data.public_id}</p>
                            <img src="${data.url}" alt="Uploaded image" style="max-width: 300px;" />
                        </div>
                    `;

                    // Show transformations
                    showTransformations(data.public_id);

                    // Reload recent images
                    loadRecentImages();
                } else {
                    resultDiv.innerHTML = `
                        <div class="container error">
                            <h4>❌ Upload Failed</h4>
                            <p>${data.error}</p>
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="container error">
                        <h4>❌ Upload Error</h4>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }

        function showTransformations(publicId) {
            const baseUrl = `https://res.cloudinary.com/da35rsdl0/image/upload`;

            const transformations = [
                { name: 'Original', url: `${baseUrl}/${publicId}` },
                { name: 'Thumbnail (200x200)', url: `${baseUrl}/w_200,h_200,c_fill/${publicId}` },
                { name: 'Medium (400x400)', url: `${baseUrl}/w_400,h_400,c_fill/${publicId}` },
                { name: 'Grayscale', url: `${baseUrl}/e_grayscale/${publicId}` },
                { name: 'Sepia', url: `${baseUrl}/e_sepia/${publicId}` },
                { name: 'Auto Quality', url: `${baseUrl}/q_auto,f_auto/${publicId}` }
            ];

            const transformationsDiv = document.getElementById('transformations');
            transformationsDiv.innerHTML = transformations.map(t => `
                <div class="image-item">
                    <h4>${t.name}</h4>
                    <img src="${t.url}" alt="${t.name}" style="max-width: 150px;" />
                    <p><small><a href="${t.url}" target="_blank">View Full</a></small></p>
                </div>
            `).join('');
        }

        async function loadRecentImages() {
            try {
                const response = await fetch('/api/recent-images');
                const data = await response.json();

                const recentDiv = document.getElementById('recentImages');

                if (data.images && data.images.length > 0) {
                    recentDiv.innerHTML = data.images.map(img => `
                        <div class="image-item">
                            <img src="${img.secure_url}" alt="${img.public_id}" />
                            <p><small>${img.public_id}</small></p>
                            <p><small>${(img.bytes / 1024).toFixed(1)} KB</small></p>
                        </div>
                    `).join('');
                } else {
                    recentDiv.innerHTML = '<p>No images found. Upload some images to see them here!</p>';
                }
            } catch (error) {
                document.getElementById('recentImages').innerHTML = '<p>Error loading images</p>';
            }
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/status')
def status():
    try:
        # Test connection
        result = cloudinary.api.ping()

        if result.get('status') == 'ok':
            # Get usage info
            usage = cloudinary.api.usage()

            return jsonify({
                'status': 'Connected',
                'credits': f"{usage.get('credits', {}).get('used', 0)} / {usage.get('credits', {}).get('limit', 'N/A')}",
                'storage': f"{usage.get('storage', {}).get('used_bytes', 0) / 1024 / 1024:.2f} MB"
            })
        else:
            return jsonify({'status': 'Failed', 'error': 'Connection failed'})

    except Exception as e:
        return jsonify({'status': 'Error', 'error': str(e)})

@app.route('/api/upload', methods=['POST'])
def upload():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'})

        file = request.files['file']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})

        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder="mizizzi/test",
            transformation=[
                {'width': 800, 'height': 800, 'crop': 'limit', 'quality': 'auto'},
                {'format': 'auto'}
            ]
        )

        return jsonify({
            'success': True,
            'url': result['secure_url'],
            'public_id': result['public_id'],
            'bytes': result.get('bytes', 0)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/recent-images')
def recent_images():
    try:
        # Get recent images from mizizzi folder
        result = cloudinary.api.resources(
            type="upload",
            prefix="mizizzi/",
            max_results=10,
            resource_type="image"
        )

        return jsonify({
            'images': result.get('resources', [])
        })

    except Exception as e:
        return jsonify({'images': [], 'error': str(e)})

if __name__ == '__main__':
    print("🚀 Starting Mizizzi Cloudinary Test Server...")
    print("📱 Open http://localhost:5000 in your browser")
    print("🔗 Dashboard: https://console.cloudinary.com/console/c-da35rsdl0")
    app.run(debug=True, host='0.0.0.0', port=5000)
'''

    # Write the test app
    test_app_path = backend_dir / 'test_cloudinary_app.py'

    with open(test_app_path, 'w') as f:
        f.write(app_content)

    print(f"✓ Created test Flask app: {test_app_path}")
    print("\nTo run the test app:")
    print("1. cd backend")
    print("2. python test_cloudinary_app.py")
    print("3. Open http://localhost:5000 in your browser")

    return test_app_path

if __name__ == "__main__":
    create_test_app()
