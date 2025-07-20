// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PianoKey } from '@/renderer/components/PianoKey';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';
import type { PianoKeyData } from '@/renderer/utils/pianoUtils';

describe('Phase 2: Enhanced Visual Feedback', () => {
  const mockLandmarkKey: PianoKeyData = {
    id: 'C4',
    type: 'white',
    noteName: 'C',
    octave: 4,
    fullName: 'C4',
    whiteKeyIndex: 23,
    isLandmark: true
  };

  const mockRegularKey: PianoKeyData = {
    id: 'D4',
    type: 'white',
    noteName: 'D',
    octave: 4,
    fullName: 'D4',
    whiteKeyIndex: 24,
    isLandmark: false
  };

  describe('Landmark Key Styling', () => {
    test('should apply landmark class to C notes', () => {
      render(<PianoKey keyData={mockLandmarkKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveClass('piano-key');
      expect(key).toHaveClass('piano-key--white');
      expect(key).toHaveClass('piano-key--landmark');
    });

    test('should not apply landmark class to non-C notes', () => {
      render(<PianoKey keyData={mockRegularKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveClass('piano-key');
      expect(key).toHaveClass('piano-key--white');
      expect(key).not.toHaveClass('piano-key--landmark');
    });

    test('should update aria-label for landmark keys', () => {
      render(<PianoKey keyData={mockLandmarkKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveAttribute('aria-label', 'C4 (landmark)');
    });

    test('should have standard aria-label for non-landmark keys', () => {
      render(<PianoKey keyData={mockRegularKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveAttribute('aria-label', 'Piano key D4');
    });
  });

  describe('Native Tooltips', () => {
    test('should add title attribute for tooltips', () => {
      render(<PianoKey keyData={mockLandmarkKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveAttribute('title', 'C4');
    });

    test('should show full note name in tooltip', () => {
      const blackKey: PianoKeyData = {
        id: 'C#4',
        type: 'black',
        noteName: 'C#',
        octave: 4,
        fullName: 'C#4',
        referenceGridColumn: 25
      };
      
      render(<PianoKey keyData={blackKey} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveAttribute('title', 'C#4');
    });
  });

  describe('CSS Class Application', () => {
    test('should combine all appropriate classes', () => {
      render(<PianoKey keyData={mockLandmarkKey} />);
      
      const key = screen.getByRole('button');
      const classes = key.className.split(' ');
      
      expect(classes).toContain('piano-key');
      expect(classes).toContain('piano-key--white');
      expect(classes).toContain('piano-key--landmark');
    });

    test('should handle black landmark keys (if any)', () => {
      // While no black keys are landmarks in standard piano,
      // test the logic works correctly
      const blackLandmark: PianoKeyData = {
        id: 'test-black',
        type: 'black',
        noteName: 'C#',
        octave: 4,
        fullName: 'C#4',
        referenceGridColumn: 25,
        isLandmark: true // Hypothetical
      };
      
      render(<PianoKey keyData={blackLandmark} />);
      
      const key = screen.getByRole('button');
      expect(key).toHaveClass('piano-key--black');
      expect(key).toHaveClass('piano-key--landmark');
    });
  });

  describe('Integration with Full Keyboard', () => {
    test('should render all C notes with landmark styling', () => {
      render(<PianoKeyboard />);
      
      // Find all C notes by aria-label
      const cNotes = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];
      
      cNotes.forEach(note => {
        const key = screen.getByRole('button', { name: `${note} (landmark)` });
        expect(key).toBeInTheDocument();
        expect(key).toHaveClass('piano-key--landmark');
      });
    });

    test('should not affect non-C notes', () => {
      render(<PianoKeyboard />);
      
      // Check a few non-C notes
      const nonCNotes = ['A0', 'D4', 'E4', 'F#4', 'G7'];
      
      nonCNotes.forEach(note => {
        const key = screen.getByRole('button', { name: `Piano key ${note}` });
        expect(key).toBeInTheDocument();
        expect(key).not.toHaveClass('piano-key--landmark');
      });
    });
  });

  describe('Hover State Requirements', () => {
    test('should have hover-capable elements', async () => {
      const user = userEvent.setup();
      render(<PianoKeyboard />);
      
      const key = screen.getByRole('button', { name: 'Piano key A0' });
      
      // Hover over the key
      await user.hover(key);
      
      // The visual effect is CSS-based, so we just verify
      // the element can receive hover events
      expect(key).toHaveClass('piano-key');
      
      // Unhover
      await user.unhover(key);
      expect(key).toHaveClass('piano-key');
    });

    test('should apply will-change property sparingly', () => {
      // This is more of a CSS implementation detail
      // But we can verify the component structure supports it
      render(<PianoKeyboard />);
      
      const keys = screen.getAllByRole('button');
      
      // Verify we have the right number of keys
      expect(keys).toHaveLength(88);
      
      // CSS will handle the actual will-change property
      // Test just ensures components are structured correctly
    });
  });

  describe('Performance Impact', () => {
    test('should not degrade render performance', () => {
      const startTime = performance.now();
      render(<PianoKeyboard />);
      const duration = performance.now() - startTime;
      
      // Should still meet Phase 1 performance budget
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid class changes efficiently', () => {
      const { rerender } = render(<PianoKey keyData={mockRegularKey} />);
      
      const measurements: number[] = [];
      
      // Toggle between landmark and non-landmark
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        const keyData = { ...mockRegularKey, isLandmark: i % 2 === 0 };
        rerender(<PianoKey keyData={keyData} />);
        const duration = performance.now() - start;
        measurements.push(duration);
      }
      
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgDuration).toBeLessThan(5);
    });
  });
});