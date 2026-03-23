# Service Image Upload Integration Guide

## Overview

This guide explains how to use Cloudinary for uploading and managing service images in the Wedding Studio API.

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Getting Cloudinary Credentials

1. Sign up at [Cloudinary.com](https://cloudinary.com/)
2. Go to your Dashboard
3. Copy your **Cloud Name**, **API Key**, and **API Secret**
4. Add them to your `.env` file

## API Endpoints

### 1. Create Service with Image

```
POST /services (multipart/form-data)
```

**Form Fields:**

- `name` (string, required) - Service name
- `description` (string, optional) - Service description
- `price` (number, optional) - Service price
- `isActive` (boolean, optional) - Whether service is active
- `image` (file, optional) - Service image (max 5MB, jpg/jpeg/png/gif/webp)

**Example Request:**

```bash
curl -X POST http://localhost:3000/services \
  -F "name=Wedding Photography" \
  -F "description=Professional photography" \
  -F "price=1500" \
  -F "isActive=true" \
  -F "image=@path/to/image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Service created successfully",
  "data": {
    "id": "uuid",
    "name": "Wedding Photography",
    "description": "Professional photography",
    "price": 1500,
    "isActive": true,
    "imageUrl": "https://res.cloudinary.com/...",
    "cloudinaryPublicId": "wedding/services/...",
    "createdAt": "2026-03-24T10:00:00Z"
  }
}
```

### 2. Update Service with Image

```
PATCH /services/{id} (multipart/form-data)
```

**Form Fields:** Same as create (all optional)

**Example Request:**

```bash
curl -X PATCH http://localhost:3000/services/uuid \
  -F "name=Premium Wedding Photography" \
  -F "image=@path/to/new-image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Upload/Replace Service Image

```
POST /services/{id}/image (multipart/form-data)
```

**Form Fields:**

- `image` (file, required) - Service image (max 5MB, jpg/jpeg/png/gif/webp)

**Example Request:**

```bash
curl -X POST http://localhost:3000/services/uuid/image \
  -F "image=@path/to/image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Delete Service Image

```
DELETE /services/{id}/image
```

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/services/uuid/image \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service image deleted successfully",
  "data": {
    "id": "uuid",
    "name": "Wedding Photography",
    "imageUrl": null,
    "cloudinaryPublicId": null
  }
}
```

## Database Schema

### Service Table Changes

```sql
ALTER TABLE "Service" ADD COLUMN "image_url" TEXT;
ALTER TABLE "Service" ADD COLUMN "cloudinary_public_id" TEXT;
```

### Service Model Fields

```prisma
model Service {
  ...
  imageUrl             String? @map("image_url")
  cloudinaryPublicId   String? @map("cloudinary_public_id")
  ...
}
```

## Key Features

### Image Upload

- **Max Size:** 5MB per image
- **Supported Formats:** JPG, JPEG, PNG, GIF, WebP
- **Storage:** Cloudinary (CDN with auto-optimization)
- **Automatic Cleanup:** Old images deleted when replaced

### CloudinaryService Methods

```typescript
// Upload image
async uploadImage(fileBuffer: Buffer, fileName: string, folder: string)

// Delete image
async deleteImage(publicId: string)

// Get image URL with transformations
getImageUrl(publicId: string, options?: { width, height, crop, quality })
```

## Error Handling

### File Validation Errors

```json
{
  "statusCode": 400,
  "message": "File too large",
  "error": "Bad Request"
}
```

### Missing Image Error

```json
{
  "statusCode": 400,
  "message": "Service has no image to delete",
  "error": "Bad Request"
}
```

### Service Not Found

```json
{
  "statusCode": 404,
  "message": "Service with ID uuid not found"
}
```

## Best Practices

1. **Always validate file types** - Only image formats are accepted
2. **Use appropriate folder paths** - Images are organized in `wedding/services` folder
3. **Handle image deletion** - Old images are automatically deleted when replaced
4. **Implement retry logic** - Network requests to Cloudinary may experience delays
5. **Cache image URLs** - Store `imageUrl` in database for quick access
6. **Monitor Cloudinary limits** - Check your account's bandwidth and storage limits

## Testing

### Using Postman

1. Create new POST request to `http://localhost:3000/services`
2. Set Authorization header with Bearer token
3. Go to Body → form-data
4. Add fields: `name`, `description`, `price`, `isActive`
5. Add `image` field and select file
6. Send request

### Using cURL

See examples in API Endpoints section above

## Troubleshooting

### "Upload cancelled" Error

- Check network connectivity to Cloudinary
- Verify file size is under 5MB
- Ensure file format is supported

### "Failed to upload image" Error

- Verify Cloudinary credentials in `.env`
- Check if Cloudinary API key is valid
- Ensure API secret hasn't expired

### Image not appearing

- Verify `imageUrl` is present in database
- Check if Cloudinary URL is accessible
- Clear browser cache

## Migration Notes

After pulling code changes:

1. Update `.env` with Cloudinary credentials
2. Run `npx prisma migrate dev` to apply schema changes
3. TypeScript types will auto-update from Prisma client
4. Restart your NestJS application

## References

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
