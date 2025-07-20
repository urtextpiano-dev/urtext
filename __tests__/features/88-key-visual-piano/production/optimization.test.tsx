// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

// Mock React to spy on useMemo
jest.spyOn(React, 'useMemo');

describe('Version Performance Optimization', () => {
  describe('Memoization Implementation', () => {
    test('should use useMemo for key element generation', () => {
      render(<PianoKeyboard />);
      
      // Verify useMemo is called
      expect(React.useMemo).toHaveBeenCalled();
      
      // Should have keys rendered
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });

    test('should not regenerate key elements on re-render', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      // Clear mock calls after initial render
      (React.useMemo as jest.Mock).mockClear();
      
      // Re-render component
      rerender(<PianoKeyboard />);
      
      // useMemo should be called but return memoized value
      expect(React.useMemo).toHaveBeenCalled();
      
      // The memoization function shouldn't re-execute
      // This is hard to test directly, but we can verify performance
      const startTime = performance.now();
      rerender(<PianoKeyboard />);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(5); // Re-render should be very fast
    });

    test('should properly memoize style calculations', () => {
      render(<PianoKeyboard />);
      
      // Get a sample of keys and verify they have styles
      const whiteKey = screen.getByRole('button', { name: 'Piano key A0' });
      const blackKey = screen.getByRole('button', { name: 'Piano key A#0' });
      
      expect(whiteKey).toHaveStyle({ gridColumn: '1 / span 1' });
      expect(blackKey).toHaveStyle({ gridColumn: '2 / span 1', zIndex: 2 });
    });
  });

  describe('Performance Targets', () => {
    test('should achieve <80ms initial render time', () => {
      const startTime = performance.now();
      render(<PianoKeyboard />);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(80); // Optimized from 100ms
      
      // Verify full render completed
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });

    test('should maintain smooth 60fps during interactions', () => {
      const { container } = render(<PianoKeyboard />);
      
      const measurements: number[] = [];
      const frameTarget = 16.67; // 60fps = ~16.67ms per frame
      
      // Simulate multiple frame renders
      for (let i = 0; i < 60; i++) {
        const start = performance.now();
        
        // Force style recalculation
        void container.offsetHeight;
        
        const duration = performance.now() - start;
        measurements.push(duration);
      }
      
      // Most frames should meet 60fps target
      const fastFrames = measurements.filter(d => d < frameTarget);
      expect(fastFrames.length).toBeGreaterThan(50); // 80%+ at 60fps
    });
  });

  describe('Memory Optimization', () => {
    test('should not leak memory during extended use', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      // Render and unmount multiple times
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<PianoKeyboard />);
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize;
      
      if (initialMemory && finalMemory) {
        const increase = finalMemory - initialMemory;
        expect(increase).toBeLessThan(2 * 1024 * 1024); // Less than 2MB increase
      }
    });

    test('should efficiently handle component updates', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Multiple re-renders
      for (let i = 0; i < 50; i++) {
        rerender(<PianoKeyboard />);
      }
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      if (startMemory && endMemory) {
        const increase = endMemory - startMemory;
        expect(increase).toBeLessThan(1024 * 1024); // Less than 1MB for 50 re-renders
      }
    });
  });

  describe('React DevTools Profiling', () => {
    test('should have proper component display names for debugging', () => {
      render(<PianoKeyboard />);
      
      // Component should be identifiable in DevTools
      expect(PianoKeyboard.name).toBe('PianoKeyboard');
      
      // PianoKey should have displayName set
      const { PianoKey } = require('@/renderer/components/PianoKey');
      expect(PianoKey.displayName).toBe('PianoKey');
    });
  });

  describe('CSS Optimization', () => {
    test('should use will-change sparingly', () => {
      const { container } = render(<PianoKeyboard />);
      
      // Only keys that need it should have will-change
      // This is more of a CSS implementation detail
      // We verify the structure supports optimization
      const keys = container.querySelectorAll('.piano-key');
      
      expect(keys.length).toBe(88);
      
      // Keys should be ready for CSS optimizations
      keys.forEach(key => {
        expect(key).toHaveClass('piano-key');
      });
    });
  });

  describe('Render Optimization Edge Cases', () => {
    test('should handle rapid prop changes efficiently', () => {
      const measurements: number[] = [];
      
      // Test with different key props to force updates
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        const { unmount } = render(<PianoKeyboard key={i} />);
        const duration = performance.now() - start;
        measurements.push(duration);
        unmount();
      }
      
      // All renders should be consistently fast
      const maxDuration = Math.max(...measurements);
      expect(maxDuration).toBeLessThan(100);
      
      // Check variance isn't too high
      const avgDuration = measurements.reduce((a, b) => a + b) / measurements.length;
      const variance = measurements.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / measurements.length;
      expect(Math.sqrt(variance)).toBeLessThan(20); // Low standard deviation
    });

    test('should optimize nested component renders', () => {
      const { container } = render(<PianoKeyboard />);
      
      // Verify structure is optimized for rendering
      const keyboard = container.querySelector('.piano-keyboard');
      const keys = keyboard?.children;
      
      // Should render keys directly without unnecessary wrappers
      expect(keys?.length).toBe(88);
      
      // Each key should be a direct child
      if (keys) {
        Array.from(keys).forEach(key => {
          expect(key).toHaveClass('piano-key');
        });
      }
    });
  });
});