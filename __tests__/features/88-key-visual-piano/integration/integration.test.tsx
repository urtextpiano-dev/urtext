// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

describe('Phase 2: Integration Tests - Enhanced UX', () => {
  describe('Complete Enhancement Integration', () => {
    test('should integrate all Phase 2 features together', () => {
      render(<PianoKeyboard />);
      
      // Verify landmark keys have all enhancements
      const c4 = screen.getByRole('button', { name: 'C4 (landmark)' });
      
      // Has landmark class
      expect(c4).toHaveClass('piano-key--landmark');
      
      // Has tooltip
      expect(c4).toHaveAttribute('title', 'C4');
      
      // Has enhanced aria-label
      expect(c4).toHaveAttribute('aria-label', 'C4 (landmark)');
      
      // Is keyboard accessible
      expect(c4).toHaveAttribute('tabIndex', '0');
    });

    test('should maintain Phase 1 functionality with Phase 2 enhancements', () => {
      render(<PianoKeyboard />);
      
      // All 88 keys should still render
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // White and black key distribution unchanged
      const whiteKeys = keys.filter(k => k.classList.contains('piano-key--white'));
      const blackKeys = keys.filter(k => k.classList.contains('piano-key--black'));
      
      expect(whiteKeys).toHaveLength(52);
      expect(blackKeys).toHaveLength(36);
      
      // Grid positioning still works
      expect(screen.getByRole('group')).toHaveClass('piano-keyboard');
    });
  });

  describe('Landmark Integration', () => {
    test('should have exactly 8 landmark keys (C1-C8)', () => {
      render(<PianoKeyboard />);
      
      const landmarkKeys = screen.getAllByRole('button')
        .filter(key => key.classList.contains('piano-key--landmark'));
      
      expect(landmarkKeys).toHaveLength(8);
      
      // Verify they are all C notes
      landmarkKeys.forEach(key => {
        const label = key.getAttribute('aria-label');
        expect(label).toMatch(/^C\d \(landmark\)$/);
      });
    });

    test('should apply all enhancements to landmark keys only', () => {
      render(<PianoKeyboard />);
      
      // Check a landmark key (C4)
      const c4 = screen.getByRole('button', { name: 'C4 (landmark)' });
      expect(c4).toHaveClass('piano-key--landmark');
      expect(c4).toHaveAttribute('title', 'C4');
      
      // Check a non-landmark key (D4)
      const d4 = screen.getByRole('button', { name: 'Piano key D4' });
      expect(d4).not.toHaveClass('piano-key--landmark');
      expect(d4).toHaveAttribute('title', 'D4');
    });
  });

  describe('Navigation and Interaction', () => {
    test('should navigate through enhanced keys correctly', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      // Tab through first few keys including a landmark
      await user.tab(); // A0
      await user.tab(); // A#0
      await user.tab(); // B0
      await user.tab(); // C1 (landmark)
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveAttribute('aria-label', 'C1 (landmark)');
      expect(focusedElement).toHaveClass('piano-key--landmark');
      expect(focusedElement).toHaveAttribute('title', 'C1');
    });

    test('should handle hover interactions on enhanced keys', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      const c4 = screen.getByRole('button', { name: 'C4 (landmark)' });
      
      // Hover should work (visual effect via CSS)
      await user.hover(c4);
      expect(c4).toHaveClass('piano-key');
      expect(c4).toHaveClass('piano-key--landmark');
      
      await user.unhover(c4);
      expect(c4).toHaveClass('piano-key');
    });
  });

  describe('Visual Consistency', () => {
    test('should maintain visual hierarchy with enhancements', () => {
      render(<PianoKeyboard />);
      
      // Black keys should still be on top (z-index)
      const blackKey = screen.getByRole('button', { name: 'Piano key C#4' });
      expect(blackKey).toHaveStyle({ zIndex: 2 });
      
      // White keys (including landmarks) at base level
      const whiteKey = screen.getByRole('button', { name: 'Piano key D4' });
      const landmarkKey = screen.getByRole('button', { name: 'C4 (landmark)' });
      
      // Both should be present and properly styled
      expect(whiteKey).toHaveClass('piano-key--white');
      expect(landmarkKey).toHaveClass('piano-key--white');
      expect(landmarkKey).toHaveClass('piano-key--landmark');
    });
  });

  describe('Performance with Enhancements', () => {
    test('should maintain performance targets with all enhancements', () => {
      const startTime = performance.now();
      render(<PianoKeyboard />);
      const duration = performance.now() - startTime;
      
      // Should still meet 100ms budget despite enhancements
      expect(duration).toBeLessThan(100);
    });

    test('should handle enhancement state changes efficiently', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const measurements: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        rerender(<PianoKeyboard />);
        const duration = performance.now() - start;
        measurements.push(duration);
      }
      
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('Mobile Considerations', () => {
    test('should handle touch devices gracefully', () => {
      // Simulate touch environment
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: () => {}
      });
      
      render(<PianoKeyboard />);
      
      // All keys should still render
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Landmark indicators should be visible (CSS-based)
      const landmarks = screen.getAllByRole('button')
        .filter(k => k.classList.contains('piano-key--landmark'));
      expect(landmarks).toHaveLength(8);
      
      // Tooltips won't show on mobile but title attribute should exist
      const c4 = screen.getByRole('button', { name: 'C4 (landmark)' });
      expect(c4).toHaveAttribute('title', 'C4');
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid tooltip triggers', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button').slice(0, 10);
      
      // Rapidly hover over multiple keys
      for (const key of keys) {
        await user.hover(key);
        expect(key).toHaveAttribute('title');
        await user.unhover(key);
      }
      
      // All should have maintained their tooltips
      keys.forEach(key => {
        expect(key).toHaveAttribute('title');
      });
    });

    test('should handle missing CSS gracefully', () => {
      // Even without CSS, structure should work
      render(<PianoKeyboard />);
      
      const c4 = screen.getByRole('button', { name: 'C4 (landmark)' });
      
      // Classes should be applied even if CSS doesn't load
      expect(c4).toHaveClass('piano-key');
      expect(c4).toHaveClass('piano-key--white');
      expect(c4).toHaveClass('piano-key--landmark');
    });
  });
});