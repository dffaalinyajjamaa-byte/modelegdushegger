import { useState, useEffect } from 'react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface ScreenSizeInfo {
  size: ScreenSize;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  viewportHeight: string; // CSS value with fallback
}

// Get viewport height with Windows 10 fallback
function getViewportHeight(): string {
  // Check if dvh is supported
  if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('height', '100dvh')) {
    return '100dvh';
  }
  return '100vh';
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
      isLandscape: width > height,
      isPortrait: height >= width,
      viewportHeight: getViewportHeight(),
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
        isLandscape: width > height,
        isPortrait: height >= width,
        viewportHeight: getViewportHeight(),
      });
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenInfo;
}