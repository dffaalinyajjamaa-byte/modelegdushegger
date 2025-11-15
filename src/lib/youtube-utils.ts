export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\/]+)/,
    /youtube\.com\/embed\/([^&\?\/]+)/,
    /youtube\.com\/v\/([^&\?\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function getYouTubeThumbnail(
  url: string,
  quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'
): string {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return '/placeholder.svg';

  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function parseYouTubeTitle(title: string): {
  subject: string;
  chapter: string;
  part: string;
} {
  const parts = title.split(' ');

  return {
    subject: parts[0] || 'Unknown',
    chapter: parts.includes('boqonnaa') ? parts[parts.indexOf('boqonnaa') + 1] : '',
    part: parts.includes('part') ? parts[parts.indexOf('part') + 1] : '',
  };
}
