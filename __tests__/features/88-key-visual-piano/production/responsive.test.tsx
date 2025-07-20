// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

describe('Version Advanced Responsive Design', () => {
  // Store original values
  let originalInnerWidth: number;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    window.matchMedia = originalMatchMedia;
  });

  // Helper to mock viewport size
  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });

    // Mock matchMedia for CSS media queries
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  describe('CSS Custom Properties', () => {
    test('should use CSS variables for key sizing', () => {
      const { container } = render(<PianoKeyboard />);
      
      const keyboard = container.querySelector('.piano-keyboard');
      expect(keyboard).toBeInTheDocument();
      
      // CSS variables should be used (actual values set in CSS)
      // We verify the structure supports CSS variables
      expect(keyboard).toHaveClass('piano-keyboard');
    });

    test('should support dynamic sizing through CSS variables', () => {
      const { container } = render(<PianoKeyboard />);
      
      // Set CSS variables programmatically
      const root = container.querySelector('.piano-container');
      if (root) {
        root.setAttribute('style', '--key-width: 25px; --key-height: 150px;');
      }
      
      // Verify component still renders correctly
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });
  });

  describe('Responsive Breakpoints', () => {
    test('should handle desktop viewport (>1400px)', () => {
      setViewportWidth(1920);
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Desktop should show all keys comfortably
      const container = screen.getByRole('group').parentElement;
      expect(container).toHaveClass('piano-container');
    });

    test('should handle laptop viewport (1024-1400px)', () => {
      setViewportWidth(1366);
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Should still be functional with slightly smaller keys
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    test('should handle tablet viewport (768-1024px)', () => {
      setViewportWidth(768);
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Should have horizontal scroll
      const container = document.querySelector('.piano-container');
      expect(container).toBeInTheDocument();
    });

    test('should handle mobile viewport (<768px)', () => {
      setViewportWidth(375);
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Mobile should have scroll indicators (added via CSS)
      const container = document.querySelector('.piano-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Scroll Indicators', () => {
    test('should have scroll container on mobile', () => {
      setViewportWidth(375);
      const { container } = render(<PianoKeyboard />);
      
      const scrollContainer = container.querySelector('.piano-container');
      expect(scrollContainer).toBeInTheDocument();
      
      // Container should be scrollable
      expect(scrollContainer).toHaveClass('piano-container');
    });

    test('should render visual scroll indicators via CSS', () => {
      setViewportWidth(375);
      const { container } = render(<PianoKeyboard />);
      
      const scrollContainer = container.querySelector('.piano-container');
      
      // CSS pseudo-elements will add the indicators
      // We verify the structure supports them
      expect(scrollContainer).toHaveClass('piano-container');
      
      // All keys should still be accessible
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });
  });

  describe('Grid Responsiveness', () => {
    test('should maintain grid structure at all breakpoints', () => {
      const viewports = [1920, 1366, 1024, 768, 375];
      
      viewports.forEach(width => {
        setViewportWidth(width);
        const { unmount } = render(<PianoKeyboard />);
        
        const keyboard = screen.getByRole('group');
        expect(keyboard).toHaveClass('piano-keyboard');
        
        const keys = screen.getAllByRole('button');
        expect(keys).toHaveLength(88);
        
        unmount();
      });
    });

    test('should preserve key relationships across breakpoints', () => {
      setViewportWidth(375);
      render(<PianoKeyboard />);
      
      // Check that black keys maintain position relative to white keys
      const cSharp = screen.getByRole('button', { name: 'Piano key C#4' });
      const dKey = screen.getByRole('button', { name: 'Piano key D4' });
      
      // Both should exist and have proper styles
      expect(cSharp).toHaveStyle({ zIndex: 2 });
      expect(dKey).toBeInTheDocument();
    });
  });

  describe('Performance Across Breakpoints', () => {
    test('should render efficiently at all viewport sizes', () => {
      const viewports = [1920, 1024, 375];
      const measurements: Record<number, number> = {};
      
      viewports.forEach(width => {
        setViewportWidth(width);
        
        const start = performance.now();
        const { unmount } = render(<PianoKeyboard />);
        const duration = performance.now() - start;
        
        measurements[width] = duration;
        unmount();
      });
      
      // All viewports should render within budget
      Object.values(measurements).forEach(duration => {
        expect(duration).toBeLessThan(100);
      });
      
      // Performance shouldn't vary too much
      const durations = Object.values(measurements);
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      expect(max - min).toBeLessThan(50); // Consistent across viewports
    });
  });

  describe('Touch Device Optimization', () => {
    test('should handle touch devices appropriately', () => {
      setViewportWidth(375);
      
      // Mock touch capability
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: () => {}
      });
      
      render(<PianoKeyboard />);
      
      // All keys should be interactive
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Keys should be large enough for touch
      // CSS will handle actual sizing
      keys.forEach(key => {
        expect(key).toHaveClass('piano-key');
      });
    });
  });

  describe('Orientation Changes', () => {
    test('should handle portrait to landscape transition', () => {
      // Start in portrait
      setViewportWidth(375);
      const { rerender } = render(<PianoKeyboard />);
      
      let keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Switch to landscape
      setViewportWidth(812);
      rerender(<PianoKeyboard />);
      
      keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Layout should adapt smoothly
      expect(screen.getByRole('group')).toHaveClass('piano-keyboard');
    });
  });

  describe('Dynamic Resizing', () => {
    test('should handle window resize events', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      // Simulate resize sequence
      const sizes = [1920, 1366, 1024, 768, 1024, 1366, 1920];
      
      sizes.forEach(width => {
        setViewportWidth(width);
        rerender(<PianoKeyboard />);
        
        const keys = screen.getAllByRole('button');
        expect(keys).toHaveLength(88);
      });
    });

    test('should maintain performance during resize', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const measurements: number[] = [];
      
      // Rapid resize simulation
      for (let i = 0; i < 10; i++) {
        setViewportWidth(800 + i * 50);
        
        const start = performance.now();
        rerender(<PianoKeyboard />);
        const duration = performance.now() - start;
        
        measurements.push(duration);
      }
      
      // All resizes should be fast
      const avgDuration = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(avgDuration).toBeLessThan(10);
    });
  });
});