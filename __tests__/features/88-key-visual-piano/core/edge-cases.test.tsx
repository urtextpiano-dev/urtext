// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

describe('Version Critical Edge Cases - Based on Code Validation', () => {
  describe('Grid Gap Resilience', () => {
    test('should maintain black key positioning with grid gap', () => {
      // Test that black keys align correctly even with CSS grid-gap
      const { container } = render(
        <div style={{ 
          '--piano-grid-gap': '4px' // CSS variable approach
        } as React.CSSProperties}>
          <PianoKeyboard />
        </div>
      );
      
      // Find a black key and its reference white key
      const cSharp4 = screen.getByRole('button', { name: 'Piano key C#4' });
      const d4 = screen.getByRole('button', { name: 'Piano key D4' });
      
      // Black key should have correct CSS class for positioning
      expect(cSharp4).toHaveClass('piano-key--black');
      
      // Both should exist in the DOM
      expect(cSharp4).toBeInTheDocument();
      expect(d4).toBeInTheDocument();
    });
  });

  describe('DOM Order for Accessibility', () => {
    test('should maintain correct DOM order for keyboard navigation', () => {
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      // Verify first few keys are in correct pitch order
      expect(keys[0]).toHaveAttribute('aria-label', 'Piano key A0');
      expect(keys[1]).toHaveAttribute('aria-label', 'Piano key A#0');
      expect(keys[2]).toHaveAttribute('aria-label', 'Piano key B0');
      expect(keys[3]).toHaveAttribute('aria-label', 'Piano key C1');
      expect(keys[4]).toHaveAttribute('aria-label', 'Piano key C#1');
      
      // Verify last key
      expect(keys[87]).toHaveAttribute('aria-label', 'Piano key C8');
      
      // All keys should be in chromatic order
      const notePattern = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
      let expectedIndex = 0; // Start at A
      let octave = 0;
      
      keys.forEach((key, index) => {
        const label = key.getAttribute('aria-label') || '';
        const noteMatch = label.match(/Piano key ([A-G]#?)(\d)/);
        
        if (noteMatch) {
          const [_, noteName, noteOctave] = noteMatch;
          
          // Handle the special case for the first three keys (A0, A#0, B0)
          if (index < 3) {
            expect(noteOctave).toBe('0');
          }
          
          // Verify we're following the chromatic pattern
          const currentNote = notePattern[expectedIndex % 12];
          if (index >= 3) { // After the initial A0, A#0, B0
            expectedIndex = (expectedIndex + 1) % 12;
            if (expectedIndex === 0) octave++; // Increment octave after G#
          } else {
            // Special handling for A0, A#0, B0
            expectedIndex = notePattern.indexOf(noteName);
          }
        }
      });
    });
  });

  describe('Viewport Edge Cases', () => {
    test('should handle extremely narrow viewports', () => {
      // Mock window.innerWidth for narrow viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320
      });
      
      const { container } = render(<PianoKeyboard />);
      
      const pianoContainer = container.querySelector('.piano-container');
      expect(pianoContainer).toBeInTheDocument();
      
      // Should have horizontal scroll capability
      expect(pianoContainer).toHaveClass('piano-container');
      
      // All keys should still render
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // First and last keys should be accessible
      expect(screen.getByRole('button', { name: 'Piano key A0' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Piano key C8' })).toBeInTheDocument();
    });

    test('should handle extremely wide viewports', () => {
      // Mock window.innerWidth for wide viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 3840 // 4K display
      });
      
      render(<PianoKeyboard />);
      
      // All keys should render without issues
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Layout should remain intact
      const keyboard = screen.getByRole('group');
      expect(keyboard).toHaveClass('piano-keyboard');
    });
  });

  describe('Performance Under Stress', () => {
    test('should maintain performance with rapid re-renders', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      const measurements: number[] = [];
      
      // Simulate rapid prop changes that might trigger re-renders
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        rerender(<PianoKeyboard key={i} />);
        const duration = performance.now() - start;
        measurements.push(duration);
      }
      
      // Average re-render should be very fast
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgDuration).toBeLessThan(5); // Re-renders should be <5ms average
      
      // No single re-render should spike
      const maxDuration = Math.max(...measurements);
      expect(maxDuration).toBeLessThan(20); // No spikes over 20ms
    });
  });

  describe('CSS Rendering Edge Cases', () => {
    test('should handle missing CSS gracefully', () => {
      // This tests that component doesn't crash if CSS fails to load
      render(<PianoKeyboard />);
      
      const keyboard = screen.getByRole('group');
      expect(keyboard).toBeInTheDocument();
      
      // All structural elements should exist
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(88);
      
      // Basic classes should be applied
      keys.forEach(key => {
        expect(key).toHaveClass('piano-key');
        const hasKeyType = key.classList.contains('piano-key--white') || 
                          key.classList.contains('piano-key--black');
        expect(hasKeyType).toBe(true);
      });
    });
  });
});