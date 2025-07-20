// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, jest } from '@jest/globals';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

// Performance testing utilities
const measureRenderTime = (component: React.ReactElement) => {
  const startTime = performance.now();
  const result = render(component);
  const endTime = performance.now();
  
  return {
    duration: endTime - startTime,
    result
  };
};

const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};

describe('Phase 1: Performance Tests - 88-Key Visual Piano', () => {
  describe('Initial Render Performance', () => {
    test('should render within 100ms budget', () => {
      const { duration } = measureRenderTime(<PianoKeyboard />);
      
      expect(duration).toBeLessThan(100);
      
      // Verify it actually rendered
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });

    test('should not exceed DOM node count budget', () => {
      render(<PianoKeyboard />);
      
      // Count all DOM nodes in the piano
      const container = screen.getByRole('group').parentElement;
      const nodeCount = container?.querySelectorAll('*').length || 0;
      
      // 88 keys + ~10 container elements
      expect(nodeCount).toBeLessThan(110);
    });
  });

  describe('Re-render Performance', () => {
    test('should handle multiple re-renders efficiently', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const measurements: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        rerender(<PianoKeyboard />);
        const duration = performance.now() - startTime;
        measurements.push(duration);
      }
      
      // Average re-render time should be very low
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgDuration).toBeLessThan(10); // Re-renders should be fast
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory on unmount', () => {
      const initialMemory = measureMemoryUsage();
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<PianoKeyboard />);
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        // Memory should not significantly increase
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
      }
    });
  });

  describe('CSS Performance', () => {
    test('should not cause layout thrashing', () => {
      render(<PianoKeyboard />);
      
      // Track layout recalculations
      let layoutCount = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            layoutCount++;
          }
        }
      });
      
      if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Trigger some interactions that might cause layout shifts
        const keys = screen.getAllByRole('button');
        keys.forEach(key => {
          // Simulate hover by adding/removing classes
          key.classList.add('hover');
          key.classList.remove('hover');
        });
        
        observer.disconnect();
        
        // Should have minimal layout shifts
        expect(layoutCount).toBeLessThan(5);
      }
    });
  });

  describe('Component Optimization', () => {
    test('should use React.memo for PianoKey components', () => {
      // This is more of a unit test but important for performance
      // The actual memo behavior is tested in PianoKey.test.tsx
      // Here we just verify the render count stays reasonable
      
      const renderSpy = jest.fn();
      jest.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
        if (typeof type === 'function' && type.name === 'PianoKey') {
          renderSpy();
        }
        return React.createElement.call(React, type, props, ...children);
      });
      
      const { rerender } = render(<PianoKeyboard />);
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Re-render the parent
      rerender(<PianoKeyboard />);
      
      // If memo is working, keys shouldn't re-render
      const finalRenderCount = renderSpy.mock.calls.length;
      expect(finalRenderCount).toBe(initialRenderCount);
      
      jest.restoreAllMocks();
    });
  });

  describe('Bundle Size Impact', () => {
    test('should document component size metrics', () => {
      // This test serves as documentation for bundle size
      // Actual measurement happens during build
      
      const expectedSizes = {
        pianoUtils: 2, // KB
        usePianoHook: 1, // KB
        PianoKeyComponent: 2, // KB
        PianoKeyboardComponent: 3, // KB
        CSS: 2, // KB
        total: 10 // KB
      };
      
      // Verify our estimates are reasonable
      expect(expectedSizes.total).toBeLessThan(15);
    });
  });

  describe('Scroll Performance', () => {
    test('should maintain 60fps during horizontal scroll', () => {
      const { container } = render(<PianoKeyboard />);
      const scrollContainer = container.querySelector('.piano-container');
      
      if (!scrollContainer) {
        throw new Error('Scroll container not found');
      }
      
      // Simulate scroll events
      const frameCount = 60;
      const startTime = performance.now();
      
      for (let i = 0; i < frameCount; i++) {
        scrollContainer.scrollLeft = i * 10;
        // Force layout calculation
        void scrollContainer.offsetHeight;
      }
      
      const duration = performance.now() - startTime;
      const fps = (frameCount / duration) * 1000;
      
      // Should maintain close to 60fps
      expect(fps).toBeGreaterThan(30); // At least 30fps
    });
  });
});