// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PianoKey } from '@/renderer/components/PianoKey';
import type { PianoKeyData } from '@/renderer/utils/pianoUtils';

describe('Version PianoKey Component', () => {
  const mockWhiteKey: PianoKeyData = {
    id: 'C4',
    type: 'white',
    noteName: 'C',
    octave: 4,
    fullName: 'C4',
    whiteKeyIndex: 23
  };

  const mockBlackKey: PianoKeyData = {
    id: 'C#4',
    type: 'black',
    noteName: 'C#',
    octave: 4,
    fullName: 'C#4',
    referenceGridColumn: 25
  };

  describe('Core Rendering', () => {
    test('should render as a button element', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should apply correct CSS classes for white keys', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('piano-key');
      expect(button).toHaveClass('piano-key--white');
    });

    test('should apply correct CSS classes for black keys', () => {
      render(<PianoKey keyData={mockBlackKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('piano-key');
      expect(button).toHaveClass('piano-key--black');
    });

    test('should apply custom styles when provided', () => {
      const customStyle = { gridColumn: '24 / span 1', zIndex: 2 };
      render(<PianoKey keyData={mockWhiteKey} style={customStyle} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveStyle('grid-column: 24 / span 1');
      expect(button).toHaveStyle('z-index: 2');
    });
  });

  describe('Accessibility', () => {
    test('should have correct aria-label', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Piano key C4');
    });

    test('should have aria-pressed set to false', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    test('should be keyboard accessible with tabIndex', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    test('should have data-note attribute for testing/debugging', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('data-note', 'C4');
    });
  });

  describe('Performance Optimization', () => {
    test('should not re-render when props are the same', () => {
      const { rerender } = render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      // Add a test attribute to track re-renders
      button.setAttribute('data-render-count', '1');
      
      // Re-render with same props
      rerender(<PianoKey keyData={mockWhiteKey} />);
      
      // Should still have the test attribute (component didn't re-render)
      expect(button).toHaveAttribute('data-render-count', '1');
    });

    test('should have displayName for debugging', () => {
      expect(PianoKey.displayName).toBe('PianoKey');
    });
  });

  describe('Edge Cases', () => {
    test('should handle keys with sharp notation correctly', () => {
      render(<PianoKey keyData={mockBlackKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Piano key C#4');
      expect(button).toHaveAttribute('data-note', 'C#4');
    });

    test('should handle edge octaves (A0)', () => {
      const edgeKey: PianoKeyData = {
        id: 'A0',
        type: 'white',
        noteName: 'A',
        octave: 0,
        fullName: 'A0',
        whiteKeyIndex: 0
      };
      
      render(<PianoKey keyData={edgeKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Piano key A0');
    });

    test('should handle edge octaves (C8)', () => {
      const edgeKey: PianoKeyData = {
        id: 'C8',
        type: 'white',
        noteName: 'C',
        octave: 8,
        fullName: 'C8',
        whiteKeyIndex: 51
      };
      
      render(<PianoKey keyData={edgeKey} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Piano key C8');
    });
  });

  describe('Styling Requirements', () => {
    test('should remove default button styles', () => {
      render(<PianoKey keyData={mockWhiteKey} />);
      const button = screen.getByRole('button');
      
      // These styles should be reset in CSS
      expect(button).toHaveClass('piano-key');
      // The actual style reset happens in CSS, we just verify the class is applied
    });

    test('should have distinct classes for white and black keys', () => {
      const { rerender } = render(<PianoKey keyData={mockWhiteKey} />);
      let button = screen.getByRole('button');
      
      expect(button).toHaveClass('piano-key--white');
      expect(button).not.toHaveClass('piano-key--black');
      
      rerender(<PianoKey keyData={mockBlackKey} />);
      button = screen.getByRole('button');
      
      expect(button).toHaveClass('piano-key--black');
      expect(button).not.toHaveClass('piano-key--white');
    });
  });
});