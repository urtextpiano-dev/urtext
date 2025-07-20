import { useEffect } from 'react';
import { perfLogger } from '@/renderer/utils/performance-logger';

/**
 * AI Consensus Fix: Cursor Scroll Following
 * 
 * Implements the "follow the cursor" feature for scrollable sheet music.
 * When cursor moves out of view, smoothly scrolls to keep it visible.
 * 
 * This solves the UX problem that remains after fixing container sizing:
 * when music is taller than container, cursor needs to scroll into view.
 */
export const useCursorScrollFollow = (osmd: any, isReady: boolean) => {
  useEffect(() => {
    if (!osmd || !isReady) return;

    const scrollToMakeCursorVisible = () => {
      const cursorElement = document.querySelector('[id^="cursorImg"]') as HTMLElement;
      const scrollContainer = document.querySelector('.sheet-music-area') as HTMLElement;
      
      if (!cursorElement || !scrollContainer) return;

      const cursorRect = cursorElement.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      // Check if cursor is above or below the visible area of the container
      const cursorAboveContainer = cursorRect.top < containerRect.top;
      const cursorBelowContainer = cursorRect.bottom > containerRect.bottom;
      
      if (cursorAboveContainer || cursorBelowContainer) {
        perfLogger.debug(' Scrolling to follow cursor');
        
        // Scroll the cursor into the center of the view for smoother experience
        cursorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    };

    // Set up cursor event monitoring
    const setupCursorFollowing = () => {
      if (!osmd.cursor) return;

      // Patch cursor methods to trigger scroll following
      const originalShow = osmd.cursor.show;
      const originalNext = osmd.cursor.next;
      const originalPrevious = osmd.cursor.previous;
      const originalReset = osmd.cursor.reset;

      osmd.cursor.show = function(...args: any[]) {
        const result = originalShow.apply(this, args);
        // Use requestAnimationFrame to ensure cursor position is updated
        requestAnimationFrame(scrollToMakeCursorVisible);
        return result;
      };

      osmd.cursor.next = function(...args: any[]) {
        const result = originalNext.apply(this, args);
        requestAnimationFrame(scrollToMakeCursorVisible);
        return result;
      };

      osmd.cursor.previous = function(...args: any[]) {
        const result = originalPrevious.apply(this, args);
        requestAnimationFrame(scrollToMakeCursorVisible);
        return result;
      };

      osmd.cursor.reset = function(...args: any[]) {
        const result = originalReset.apply(this, args);
        requestAnimationFrame(scrollToMakeCursorVisible);
        return result;
      };
    };

    // Set up following after a brief delay to ensure cursor is ready
    setTimeout(setupCursorFollowing, 100);

  }, [osmd, isReady]);
};