/**
 * Cloudinary Upload Helper
 * Reusable function for uploading images to Cloudinary using signed uploads
 * Matches the mobile app approach
 */

/**
 * Upload an image file to Cloudinary using signed uploads
 * @param {File|Blob} file - The image file to upload
 * @param {string} folder - The Cloudinary folder (optional)
 * @param {string} publicId - The public ID for the image (optional)
 * @returns {Promise<string>} - The uploaded image URL
 */
async function uploadToCloudinary(file, folder, publicId) {
  try {
    // Step 1: Get signature from server (matching mobile app)
    const apiUrl = window.API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
    const signatureResponse = await fetch(`${apiUrl}/api/v1/generate-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!signatureResponse.ok) {
      throw new Error('Failed to get signature from server');
    }

    const { timestamp, signature } = await signatureResponse.json();

    // Step 2: Upload to Cloudinary with signed parameters (matching mobile app)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', window.CLOUDINARY_API_KEY || '');
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET || '');

    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME || ''}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await cloudinaryResponse.json();
    
    if (result.error) {
      throw new Error(result.error.message || 'Upload failed');
    }

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

// Make the function available globally
window.uploadToCloudinary = uploadToCloudinary;
