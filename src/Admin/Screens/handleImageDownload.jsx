// handleImageDownload.js

/**
 * Downloads an image from a URL (direct S3 URL or through proxy)
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} [filename=null] - Optional custom filename for the download
 * @returns {Promise<boolean>} - Returns true if download was successful
 */
export const handleImageDownload = async (imageUrl, filename = null) => {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }
      
      // Check if URL is valid
      const isValidUrl = (string) => {
        try {
          new URL(string);
          return true;
        } catch (_) {
          return false;
        }
      };
      
      if (!isValidUrl(imageUrl)) {
        throw new Error('Invalid URL format');
      }
      
      console.log('Downloading image from:', imageUrl);
      
      // Fetch the image as a blob
      const response = await fetch(imageUrl, {
        headers: {
          // Add any required headers for your S3 bucket
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create a temporary download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set the filename - either provided, extracted from URL, or default
      const downloadFilename = filename || 
        imageUrl.split('/').pop().split('?')[0] || 
        `image-${new Date().getTime()}.jpg`;
      
      link.setAttribute('download', downloadFilename);
      
      // Append to document, click and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  };
  
  /**
   * Gets the appropriate image URL from a donation object
   * @param {Object} donation - The donation object
   * @returns {string|null} - Returns the image URL or null if not found
   */
  export const getImageUrlFromDonation = (donation) => {
    // First, check for direct imageUrl on donation
    if (donation.imageUrl) {
      return donation.imageUrl;
    }
    
    // Check for image URL in items
    if (donation.items && donation.items.length > 0) {
      // Look for an item with an imageUrl property
      for (const item of donation.items) {
        if (item.imageUrl) {
          return item.imageUrl;
        }
        
        // Check for image in nested properties
        if (item.image) {
          return typeof item.image === 'string' ? item.image : item.image.url;
        }
      }
    }
    
    // Check for receipt URL as fallback
    if (donation.receiptUrl) {
      return donation.receiptUrl;
    }
    
    // Try to find any property that might contain an image URL
    for (const key in donation) {
      if (
        (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) && 
        typeof donation[key] === 'string' && 
        (donation[key].startsWith('http') || donation[key].startsWith('/'))
      ) {
        return donation[key];
      }
    }
    
    return null;
  };
  
  export default {
    handleImageDownload,
    getImageUrlFromDonation
  };