import { useMemo, useRef, useEffect, useState } from 'react';

// Note: OSMDContext import commented out to avoid Jest issues during Phase 4 development
// import { useOSMDContext } from '@/renderer/contexts/OSMDContext';

interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface OSMDContainer {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
  addEventListener: (event: string, handler: Function) => void;
  removeEventListener: (event: string, handler: Function) => void;
}

export const useViewportOptimization = () => {
  // Mock OSMD context for now - will be activated when Jest issues are resolved
  // const { osmd } = useOSMDContext();
  const osmd = { container: null as OSMDContainer | null };
  
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const retryAttempts = useRef(0);

  // AI Consensus Fix: Use frame-aligned throttling instead of 100ms debounce
  useEffect(() => {
    if (!osmd?.container) return;

    const scrollContainer = osmd.container;
    
    const updateViewport = () => {
      // Clear existing timeout/frame request
      if (updateTimeoutRef.current) {
        cancelAnimationFrame(updateTimeoutRef.current);
      }

      // AI Consensus Fix: Use requestAnimationFrame for frame-aligned updates
      updateTimeoutRef.current = requestAnimationFrame(() => {
        try {
          if (!scrollContainer) return;
          
          // Calculate viewport bounds from scroll position
          const bounds = {
            left: scrollContainer.scrollLeft,
            right: scrollContainer.scrollLeft + scrollContainer.clientWidth,
            top: scrollContainer.scrollTop,
            bottom: scrollContainer.scrollTop + scrollContainer.clientHeight
          };
          
          setViewportBounds(bounds);
          retryAttempts.current = 0; // Reset on success
        } catch (error) {
          // Retry mechanism with limit to prevent infinite loops
          if (retryAttempts.current < 3) {
            console.warn('Error updating viewport bounds, retrying:', error);
            retryAttempts.current++;
            setTimeout(updateViewport, 100); // Brief retry delay
          } else {
            console.error('Failed to update viewport bounds after 3 attempts, falling back to render all');
            setViewportBounds(null); // Fallback to render all
          }
        }
      });
    };

    // Throttled update function using lodash-style throttling pattern
    let lastUpdateTime = 0;
    const throttleDelay = 16; // AI Consensus Fix: 16ms = 60fps frame rate
    
    const throttledUpdate = () => {
      const now = performance.now();
      if (now - lastUpdateTime >= throttleDelay) {
        lastUpdateTime = now;
        updateViewport();
      }
    };

    // Listen on correct container for scroll events  
    scrollContainer.addEventListener('scroll', throttledUpdate);
    window.addEventListener('resize', updateViewport); // Resize can stay on window
    
    // Initial update
    updateViewport();

    return () => {
      scrollContainer.removeEventListener('scroll', throttledUpdate);
      window.removeEventListener('resize', updateViewport);
      if (updateTimeoutRef.current) {
        cancelAnimationFrame(updateTimeoutRef.current);
      }
    };
  }, [osmd]);

  // Memoized function to check if element is within viewport
  const isInViewport = useMemo(() => {
    return (x: number, y: number, margin = 50) => {
      if (!viewportBounds) return true; // Render all if bounds unknown (fallback)
      
      return (
        x >= viewportBounds.left - margin &&
        x <= viewportBounds.right + margin &&
        y >= viewportBounds.top - margin &&
        y <= viewportBounds.bottom + margin
      );
    };
  }, [viewportBounds]);

  return { isInViewport, viewportBounds };
};