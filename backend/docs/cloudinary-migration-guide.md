# Cloudinary Migration Guide for Mizizzi E-Commerce

This guide provides step-by-step instructions for migrating your Mizizzi e-commerce platform to use Cloudinary for product image management.

## Overview

The migration involves:
- Setting up Cloudinary integration
- Creating new database tables for Cloudinary image metadata
- Migrating existing images to Cloudinary
- Updating frontend components to use Cloudinary URLs
- Testing the new image system

## Prerequisites

- Cloudinary account (free tier available)
- Python 3.8+
- PostgreSQL database
- Node.js 16+ (for frontend)

## Step 1: Cloudinary Account Setup

1. **Create Cloudinary Account**
   - Visit [cloudinary.com](https://cloudinary.com)
   - Sign up for a free account
   - Note your Cloud Name, API Key, and API Secret

2. **Configure Upload Presets (Optional)**
   - Go to Settings > Upload
   - Create upload presets for different image types
   - Set transformation parameters for automatic optimization

## Step 2: Backend Setup

### Install Dependencies

\`\`\`bash
cd backend
pip install cloudinary==1.36.0 python-dotenv==1.0.0 Pillow==10.0.1
\`\`\`

### Environment Configuration

1. **Create/Update .env file**
\`\`\`bash
# Run the setup script
python scripts/setup_cloudinary.py
\`\`\`

2. **Add Cloudinary credentials to .env**
\`\`\`env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
\`\`\`

### Database Migration

1. **Run the migration**
\`\`\`bash
flask db upgrade
\`\`\`

2. **Verify new tables**
\`\`\`sql
-- Check if product_images table was created
\dt product_images
\`\`\`

## Step 3: Image Migration

### Migrate Existing Images

1. **Run the migration script**
\`\`\`bash
python scripts/migrate_images_to_cloudinary.py --migrate
\`\`\`

2. **Monitor the migration**
- Check logs for any errors
- Verify images are uploaded to Cloudinary dashboard
- Confirm database records are created

3. **Cleanup (Optional)**
\`\`\`bash
# After successful migration and testing
python scripts/migrate_images_to_cloudinary.py --cleanup
\`\`\`

## Step 4: Frontend Integration

### Install Frontend Dependencies

\`\`\`bash
cd frontend
npm install
\`\`\`

### Update Environment Variables

\`\`\`env
# .env.local
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_API_URL=http://localhost:5000
\`\`\`

### Test Frontend Components

1. **Test image upload**
   - Go to admin product creation/editing
   - Upload new images
   - Verify they appear in Cloudinary dashboard

2. **Test image display**
   - Check product pages
   - Verify images load from Cloudinary URLs
   - Test responsive transformations

## Step 5: Testing

### Backend API Testing

\`\`\`bash
# Test image upload endpoint
curl -X POST \
  http://localhost:5000/api/admin/products/1/images/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@test-image.jpg"

# Test image retrieval
curl -X GET \
  http://localhost:5000/api/admin/products/1/images \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Frontend Testing

1. **Admin Panel**
   - Create new product with images
   - Edit existing product images
   - Delete images
   - Set primary images
   - Reorder images

2. **Customer-Facing Pages**
   - Product detail pages
   - Product listings
   - Search results
   - Category pages

## Step 6: Performance Optimization

### Cloudinary Optimizations

1. **Auto-optimization**
   - Enable `f_auto` (format)
   - Enable `q_auto` (quality)

2. **Responsive Images**
   - Use `w_auto` for responsive width
   - Implement `dpr_auto` for device pixel ratio

3. **Lazy Loading**
   - Implement lazy loading for product grids
   - Use placeholder images during load

### Caching Strategy

1. **Browser Caching**
   - Set appropriate cache headers
   - Use Cloudinary's CDN caching

2. **Database Caching**
   - Cache image metadata
   - Implement Redis for frequently accessed images

## Step 7: Monitoring and Maintenance

### Cloudinary Dashboard

1. **Monitor Usage**
   - Check monthly bandwidth usage
   - Monitor transformation usage
   - Review storage consumption

2. **Analytics**
   - Track image performance
   - Monitor load times
   - Analyze popular transformations

### Error Handling

1. **Fallback Images**
   - Implement fallback for failed uploads
   - Use placeholder images for missing images

2. **Retry Logic**
   - Implement retry for failed uploads
   - Queue failed uploads for later processing

## Troubleshooting

### Common Issues

1. **Upload Failures**
   ```python
   # Check Cloudinary credentials
   from config.cloudinary_config import get_cloudinary
   cloudinary = get_cloudinary()
   print(cloudinary.config())
   \`\`\`

2. **Image Not Displaying**
   - Verify Cloudinary URLs are accessible
   - Check CORS settings
   - Validate image public IDs

3. **Migration Errors**
   - Check file permissions
   - Verify database connections
   - Review error logs

### Performance Issues

1. **Slow Image Loading**
   - Enable auto-optimization
   - Use appropriate image formats
   - Implement progressive loading

2. **High Bandwidth Usage**
   - Review transformation settings
   - Optimize image sizes
   - Implement lazy loading

## Security Considerations

### API Security

1. **Signed URLs**
   - Use signed URLs for sensitive images
   - Implement time-based expiration

2. **Upload Security**
   - Validate file types
   - Limit file sizes
   - Sanitize file names

### Access Control

1. **Admin Access**
   - Restrict upload permissions
   - Implement role-based access

2. **Public Access**
   - Configure appropriate public access
   - Use Cloudinary's access control features

## Best Practices

### Image Organization

1. **Folder Structure**
   \`\`\`
   mizizzi/
   ├── products/
   │   ├── product_1_image1
   │   └── product_1_image2
   ├── categories/
   └── brands/
   \`\`\`

2. **Naming Convention**
   - Use consistent naming patterns
   - Include product IDs in names
   - Use descriptive alt text

### Performance

1. **Optimization**
   - Use appropriate image formats
   - Implement responsive images
   - Enable auto-optimization

2. **Caching**
   - Leverage Cloudinary's CDN
   - Implement browser caching
   - Use database caching for metadata

## Rollback Plan

If issues arise, you can rollback:

1. **Database Rollback**
   \`\`\`bash
   flask db downgrade
   \`\`\`

2. **Code Rollback**
   - Revert to previous image handling code
   - Restore local image serving

3. **Data Recovery**
   - Keep local image backups during migration
   - Export Cloudinary images if needed

## Support and Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Python SDK Reference](https://cloudinary.com/documentation/python_integration)
- [Image Transformation Reference](https://cloudinary.com/documentation/image_transformations)
- [Mizizzi Development Team](mailto:dev@mizizzi.com)
