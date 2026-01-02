'use client';

import { useEffect, useRef, useState } from 'react';

// Polyfill for requestIdleCallback
const requestIdleCallback = typeof window !== 'undefined' && (window as any).requestIdleCallback
  ? (window as any).requestIdleCallback
  : (callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void, options?: { timeout?: number }) => {
      const start = Date.now();
      return setTimeout(() => {
        callback({
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          didTimeout: false,
        });
      }, options?.timeout || 1);
    };

interface GoogleAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
  matchCardHeight?: boolean;
}

export default function GoogleAd({ 
  adSlot, 
  adFormat = 'auto',
  style,
  className = '',
  responsive = true,
  matchCardHeight = false
}: GoogleAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const adPushed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Lazy load using Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before the ad comes into view
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad]);

  useEffect(() => {
    // Only load ad when it should be loaded (lazy loading)
    if (!shouldLoad || !adRef.current || adPushed.current) return;

    // Wait for AdSense to load, then push the ad asynchronously
    const loadAd = () => {
      if (adRef.current && !adPushed.current) {
        try {
          if ((window as any).adsbygoogle) {
            // Push ad asynchronously using setTimeout to avoid blocking the main thread
            setTimeout(() => {
              if (adRef.current && !adPushed.current) {
                try {
                  ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
                  adPushed.current = true;
                  
                  // Check if ad loaded after a delay (non-blocking)
                  setTimeout(() => {
                    const iframe = adRef.current?.querySelector('iframe');
                    if (iframe) {
                      setAdLoaded(true);
                      setAdVisible(true);
                    } else {
                      // Ad blocker or ad didn't load
                      setAdVisible(true); // Always show container for proper spacing
                    }
                  }, 2000);
                } catch (error) {
                  console.error('Error pushing ad:', error);
                  setAdVisible(true);
                }
              }
            }, 0); // Use setTimeout(0) to push to next event loop tick
          } else {
            // Retry after a delay to avoid blocking
            setTimeout(loadAd, 1000);
          }
        } catch (error) {
          console.error('Error loading ad:', error);
          setAdVisible(true); // Always show container for proper spacing
        }
      }
    };

    // Start loading after page is interactive - use requestIdleCallback to avoid blocking
    const timer = requestIdleCallback(loadAd, { timeout: 3000 });
    return () => {
      if (typeof timer === 'number') {
        clearTimeout(timer);
      } else if (timer && typeof (timer as any).cancel === 'function') {
        (timer as any).cancel();
      }
    };
  }, [adSlot, matchCardHeight, shouldLoad]);

  useEffect(() => {
    // Add CSS to constrain ad iframes after they load
    const style = document.createElement('style');
    style.textContent = `
      .adsbygoogle iframe {
        max-width: 100% !important;
        width: 100% !important;
      }
      .adsbygoogle {
        max-width: 100% !important;
        width: 100% !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Always render the ad container, even if the ad doesn't load
  // This ensures proper spacing in the grid layout

  const defaultStyle: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    minHeight: matchCardHeight ? '100%' : '90px',
    ...style,
  };

  const containerStyle: React.CSSProperties = matchCardHeight ? {
    height: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
  } : {
    minHeight: '100px',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 overflow-hidden w-full flex flex-col relative ${matchCardHeight ? 'h-full' : ''} ${className}`}
      style={containerStyle}
    >
      {/* Ad Badge - positioned like Elite badge */}
      <div className="absolute top-3 left-3 z-50" style={{ zIndex: 9999 }}>
        <span className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
          <i className="fa fa-ad mr-1"></i>
          AD
        </span>
      </div>
      
      {/* Match card structure: image section (h-48) + content section (flex-grow) */}
      {matchCardHeight ? (
        <>
          {/* Image placeholder section to match card's h-48 */}
          <div className="relative h-48 overflow-hidden flex items-center justify-center bg-gray-700">
            <div 
              ref={adRef} 
              className="w-full h-full overflow-hidden flex items-center justify-center"
              style={{
                maxWidth: '100%',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <ins
                className="adsbygoogle"
                style={{
                  ...defaultStyle,
                  maxWidth: '100%',
                  width: '100%',
                  display: 'block',
                  boxSizing: 'border-box',
                  margin: '0 auto',
                }}
                data-ad-client="ca-pub-3842696805773142"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={responsive ? 'true' : 'false'}
              />
            </div>
          </div>
          {/* Content section to match card's p-6 flex-grow - but make it flex to fill remaining space */}
          <div className="p-6 flex flex-col flex-grow min-h-0">
            <div className="flex-grow min-h-0"></div>
          </div>
        </>
      ) : (
        <div 
          ref={adRef} 
          className="w-full overflow-hidden flex-1 flex items-center justify-center"
          style={{
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '90px',
          }}
        >
          <div className="w-full flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{
                ...defaultStyle,
                maxWidth: '100%',
                width: '100%',
                display: 'block',
                boxSizing: 'border-box',
                margin: '0 auto',
              }}
              data-ad-client="ca-pub-3842696805773142"
              data-ad-slot={adSlot}
              data-ad-format={adFormat}
              data-full-width-responsive={responsive ? 'true' : 'false'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

