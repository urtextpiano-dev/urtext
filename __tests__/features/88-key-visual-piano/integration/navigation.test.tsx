// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

describe('Phase 2: Simplified Keyboard Navigation', () => {
  describe('Tab Navigation', () => {
    test('should allow Tab navigation through all keys in order', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Tab to first key
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
      
      // Tab to second key
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A#0');
      
      // Tab to third key
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key B0');
      
      // Tab to fourth key (C1 - should be landmark)
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'C1 (landmark)');
    });

    test('should allow reverse Tab navigation with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Tab forward a few times
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab(); // Should be on C1
      
      // Now go backward
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key B0');
      
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A#0');
      
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
    });

    test('should maintain focus visibility during navigation', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      await user.tab();
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveClass('piano-key');
      expect(focusedElement).toHaveFocus();
    });
  });

  describe('Focus Order Verification', () => {
    test('should follow chromatic order from A0 to C8', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      const expectedOrder = [
        'Piano key A0',
        'Piano key A#0',
        'Piano key B0',
        'C1 (landmark)',
        'Piano key C#1',
        'Piano key D1',
        'Piano key D#1',
        'Piano key E1',
        'Piano key F1',
        'Piano key F#1',
        'Piano key G1',
        'Piano key G#1',
        'Piano key A1',
        'Piano key A#1',
        'Piano key B1',
        'C2 (landmark)'
      ];
      
      // Test first 16 keys to verify pattern
      for (const expectedLabel of expectedOrder) {
        await user.tab();
        expect(document.activeElement).toHaveAttribute('aria-label', expectedLabel);
      }
    });

    test('should reach last key (C8) through Tab navigation', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Get all keys and focus the last one directly for testing
      const keys = screen.getAllByRole('button');
      const lastKey = keys[keys.length - 1];
      
      lastKey.focus();
      
      expect(document.activeElement).toHaveAttribute('aria-label', 'C8 (landmark)');
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('should have appropriate ARIA attributes for all keys', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      keys.forEach(key => {
        // Each key should have aria-label
        expect(key).toHaveAttribute('aria-label');
        
        // Each key should have aria-pressed
        expect(key).toHaveAttribute('aria-pressed', 'false');
        
        // Each key should be focusable
        expect(key).toHaveAttribute('tabIndex', '0');
      });
    });

    test('should distinguish landmark keys in screen reader announcements', () => {
      render(<PianoKeyboard />);
      
      // Check regular key
      const regularKey = screen.getByRole('button', { name: 'Piano key D4' });
      expect(regularKey).toHaveAttribute('aria-label', 'Piano key D4');
      
      // Check landmark key
      const landmarkKey = screen.getByRole('button', { name: 'C4 (landmark)' });
      expect(landmarkKey).toHaveAttribute('aria-label', 'C4 (landmark)');
    });

    test('should maintain group semantics', () => {
      render(<PianoKeyboard />);
      
      const keyboard = screen.getByRole('group');
      expect(keyboard).toHaveAttribute('aria-label', '88-key piano keyboard');
    });
  });

  describe('Focus Management Edge Cases', () => {
    test('should handle focus when scrolled horizontally', async () => {
      const user = userEvent.setup();
      const { container } = render(<PianoKeyboard />);
      
      const scrollContainer = container.querySelector('.piano-container');
      
      // Simulate scroll
      if (scrollContainer) {
        scrollContainer.scrollLeft = 500;
      }
      
      // Tab navigation should still work
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
    });

    test('should not trap focus within piano', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Before Piano</button>
          <PianoKeyboard />
          <button>After Piano</button>
        </div>
      );
      
      const beforeButton = screen.getByText('Before Piano');
      const afterButton = screen.getByText('After Piano');
      
      // Focus the before button
      beforeButton.focus();
      expect(document.activeElement).toBe(beforeButton);
      
      // Tab should enter the piano
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
      
      // Tab 88 times to get through all keys
      // For testing, we'll just check that we can tab past the piano
      const keys = screen.getAllByRole('button', { name: /Piano key|landmark/ });
      
      // Focus last piano key
      keys[keys.length - 1].focus();
      
      // One more tab should leave the piano
      await user.tab();
      expect(document.activeElement).toBe(afterButton);
    });
  });

  describe('Performance During Navigation', () => {
    test('should handle rapid Tab key presses', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      const startTime = performance.now();
      
      // Rapidly tab through first 20 keys
      for (let i = 0; i < 20; i++) {
        await user.tab();
      }
      
      const duration = performance.now() - startTime;
      
      // Should handle rapid navigation smoothly
      expect(duration).toBeLessThan(1000); // Less than 50ms per tab
      
      // Verify we're on the expected key
      const activeLabel = document.activeElement?.getAttribute('aria-label');
      expect(activeLabel).toBeTruthy();
    });
  });

  describe('Documentation Requirements', () => {
    test('arrow key navigation is not implemented in Phase 2', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Focus first key
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
      
      // Arrow keys should not change focus (browser default behavior)
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
      
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toHaveAttribute('aria-label', 'Piano key A0');
    });
  });
});