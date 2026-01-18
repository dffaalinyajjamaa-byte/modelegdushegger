/**
 * Utility functions for handling content URLs (videos, PDFs, etc.)
 */

/**
 * Convert any YouTube URL to embed format
 * Supports: youtube.com/watch, youtu.be, youtube.com/embed
 */
export function getYouTubeEmbedUrl(url: string): string {
  // Already an embed URL
  if (url.includes('/embed/')) {
    return url;
  }

  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`;
  }

  // Return original URL if no match
  return url;
}

/**
 * Extract Google Drive file ID from various URL formats
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;

  // Various patterns for Google Drive URLs
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/,
    /uc\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert Google Docs/Drive sharing URL to embeddable URL
 * Improved version with better handling of various URL formats
 */
export function getGoogleDocsEmbedUrl(url: string): string {
  if (!url) return '';

  // Already an embed/preview URL
  if (url.includes('/preview')) {
    return url;
  }

  // Handle /view URLs - convert to /preview
  if (url.includes('/view')) {
    return url.replace('/view', '/preview');
  }

  // Handle /edit URLs - convert to /preview
  if (url.includes('/edit')) {
    return url.replace('/edit', '/preview');
  }

  // Extract file ID and reconstruct URL
  const fileId = extractGoogleDriveFileId(url);
  
  if (fileId) {
    // Check if it's a Google Doc
    if (url.includes('docs.google.com/document')) {
      return `https://docs.google.com/document/d/${fileId}/preview`;
    }
    
    // Check if it's a Google Spreadsheet
    if (url.includes('docs.google.com/spreadsheets')) {
      return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
    }
    
    // Check if it's a Google Presentation
    if (url.includes('docs.google.com/presentation')) {
      return `https://docs.google.com/presentation/d/${fileId}/preview`;
    }
    
    // Default to Google Drive file preview
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // If we can't extract file ID, try simple replacements
  if (url.includes('drive.google.com')) {
    // Handle sharing links like /file/d/ID/view
    return url.replace(/\/view(\?.*)?$/, '/preview')
              .replace(/\/edit(\?.*)?$/, '/preview');
  }

  return url;
}

/**
 * Validate and process content URL based on type
 */
export function validateContentUrl(url: string, type: 'video' | 'pdf'): string {
  if (!url) return '';

  try {
    if (type === 'video') {
      // YouTube videos
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return getYouTubeEmbedUrl(url);
      }
      
      // Vimeo videos
      if (url.includes('vimeo.com')) {
        const vimeoId = url.split('/').pop()?.split('?')[0];
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    }

    if (type === 'pdf') {
      // Google Docs/Drive
      if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
        return getGoogleDocsEmbedUrl(url);
      }

      // Direct PDF URLs - use Google Docs viewer for better compatibility
      if (url.endsWith('.pdf')) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      }
    }

    return url;
  } catch (error) {
    console.error('Error processing URL:', error);
    return url;
  }
}

/**
 * Check if URL is a valid video URL
 */
export function isVideoUrl(url: string): boolean {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com') ||
    url.endsWith('.mp4') ||
    url.endsWith('.webm')
  );
}

/**
 * Check if URL is a valid PDF/document URL
 */
export function isPDFUrl(url: string): boolean {
  return (
    url.includes('docs.google.com') ||
    url.includes('drive.google.com') ||
    url.endsWith('.pdf')
  );
}

/**
 * Extract Google Drive file ID and generate thumbnail URL
 */
export function getGoogleDriveThumbnail(driveUrl: string, size: number = 400): string | null {
  const fileId = extractGoogleDriveFileId(driveUrl);
  
  if (fileId) {
    // Generate thumbnail URL with specified size
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }
  
  return null;
}

/**
 * Get a direct download link for a Google Drive file
 */
export function getGoogleDriveDirectLink(driveUrl: string): string | null {
  const fileId = extractGoogleDriveFileId(driveUrl);
  
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  return null;
}
