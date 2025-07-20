// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import the actual components (not mocked for integration tests)
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

describe('Version Integration Tests - 88-Key Visual Piano', () => {
  describe('Full Component Integration', () => {
    test('should render complete 88-key piano', () => {
      render(<PianoKeyboard />);
      
      const keyboard = screen.getByRole('group', { name: '88-key piano keyboard' });
      expect(keyboard).toBeInTheDocument();
      
      // Should have 88 buttons (keys)
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
    });

    test('should have correct number of white and black keys', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      const whiteKeys = keys.filter(key => key.classList.contains('piano-key--white'));
      const blackKeys = keys.filter(key => key.classList.contains('piano-key--black'));
      
      expect(whiteKeys).toHaveLength(52);
      expect(blackKeys).toHaveLength(36);
    });

    test('should render keys in correct order from A0 to C8', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      // First key should be A0
      expect(keys[0]).toHaveAttribute('aria-label', 'Piano key A0');
      expect(keys[0]).toHaveAttribute('data-note', 'A0');
      
      // Last key should be C8
      expect(keys[87]).toHaveAttribute('aria-label', 'Piano key C8');
      expect(keys[87]).toHaveAttribute('data-note', 'C8');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should allow Tab navigation through all keys', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Tab to first key
      await user.tab();
      
      const firstKey = screen.getByRole('button', { name: 'Piano key A0' });
      expect(firstKey).toHaveFocus();
      
      // Tab to second key
      await user.tab();
      
      const secondKey = screen.getByRole('button', { name: 'Piano key A#0' });
      expect(secondKey).toHaveFocus();
    });

    test('should show focus indicator when key is focused', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      await user.tab();
      
      const focusedKey = document.activeElement;
      expect(focusedKey).toHaveClass('piano-key');
      // Focus styles are applied via CSS, verified by visual testing
    });
  });

  describe('Responsive Behavior', () => {
    test('should have horizontal scroll container', () => {
      const { container } = render(<PianoKeyboard />);
      
      const scrollContainer = container.querySelector('.piano-container');
      expect(scrollContainer).toBeInTheDocument();
      
      // Check that it has overflow-x: auto style (set in CSS)
      expect(scrollContainer).toHaveClass('piano-container');
    });

    test('should use CSS Grid for layout', () => {
      render(<PianoKeyboard />);
      
      const keyboard = screen.getByRole('group');
      expect(keyboard).toHaveClass('piano-keyboard');
      
      // Grid styles are applied via CSS
      // Actual grid behavior verified through visual testing
    });
  });

  describe('Accessibility Compliance', () => {
    test('should have proper ARIA attributes on all keys', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      keys.forEach(key => {
        // Each key should have aria-label
        expect(key).toHaveAttribute('aria-label');
        expect(key.getAttribute('aria-label')).toMatch(/^Piano key [A-G]#?\d$/);
        
        // Each key should have aria-pressed
        expect(key).toHaveAttribute('aria-pressed', 'false');
        
        // Each key should be keyboard accessible
        expect(key).toHaveAttribute('tabIndex', '0');
      });
    });

    test('should have semantic group role with label', () => {
      render(<PianoKeyboard />);
      
      const keyboard = screen.getByRole('group');
      expect(keyboard).toHaveAttribute('aria-label', '88-key piano keyboard');
    });
  });

  describe('CSS Class Structure', () => {
    test('should apply correct CSS classes to components', () => {
      const { container } = render(<PianoKeyboard />);
      
      // Container classes
      expect(container.querySelector('.piano-container')).toBeInTheDocument();
      expect(container.querySelector('.piano-keyboard')).toBeInTheDocument();
      
      // Key classes
      const keys = screen.getAllByRole('button');
      keys.forEach(key => {
        expect(key).toHaveClass('piano-key');
        expect(key.classList.contains('piano-key--white') || 
               key.classList.contains('piano-key--black')).toBe(true);
      });
    });
  });

  describe('Data Attributes', () => {
    test('should have data-note attributes for debugging', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      keys.forEach(key => {
        expect(key).toHaveAttribute('data-note');
        const noteValue = key.getAttribute('data-note');
        expect(noteValue).toMatch(/^[A-G]#?\d$/);
      });
    });
  });

  describe('Performance in Integration', () => {
    test('should render full piano within performance budget', () => {
      const startTime = performance.now();
      
      render(<PianoKeyboard />);
      
      const duration = performance.now() - startTime;
      const keys = screen.getAllByRole('button');
      
      expect(keys).toHaveLength(88);
      expect(duration).toBeLessThan(100); // 100ms budget for initial render
    });

    test('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const startTime = performance.now();
      
      // Multiple rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<PianoKeyboard />);
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // Should handle re-renders efficiently
    });
  });
});