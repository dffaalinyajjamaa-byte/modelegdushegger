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
 * Convert Google Docs/Drive sharing URL to embeddable URL
 */
export function getGoogleDocsEmbedUrl(url: string): string {
  // Already an embed/preview URL
  if (url.includes('/preview') || url.includes('/embed')) {
    return url;
  }

  // Extract document ID from Google Docs URL
  const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (docIdMatch) {
    const docId = docIdMatch[1];
    
    // Check if it's a Google Doc or Drive file
    if (url.includes('docs.google.com/document')) {
      return `https://docs.google.com/document/d/${docId}/preview`;
    }
    if (url.includes('drive.google.com')) {
      return `https://drive.google.com/file/d/${docId}/preview`;
    }
  }

  // Handle Google Drive sharing links
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
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

      // Direct PDF URLs
      if (url.endsWith('.pdf')) {
        return url;
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
