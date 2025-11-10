import { useState, useEffect } from 'react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface ScreenSizeInfo {
  size: ScreenSize;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useScreenSize(): ScreenSizeInfo {
  const [screenInfo, setScreenInfo] = useState<ScreenSizeInfo>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    let size: ScreenSize = 'desktop';
    if (width < 768) {
      size = 'mobile';
    } else if (width < 1024) {
      size = 'tablet';
    }

    return {
      size,
      width,
      height,
      isMobile: size === 'mobile',
      isTablet: size === 'tablet',
      isDesktop: size === 'desktop',
    };
  });

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let size: ScreenSize = 'desktop';
      if (width < 768) {
        size = 'mobile';
      } else if (width < 1024) {
        size = 'tablet';
      }

      setScreenInfo({
        size,
        width,
        height,
        isMobile: size === 'mobile',
        isTablet: size === 'tablet',
        isDesktop: size === 'desktop',
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenInfo;
}
