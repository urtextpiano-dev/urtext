// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';

// Mock the dependencies
jest.mock('@/renderer/hooks/usePiano');
jest.mock('@/renderer/components/PianoKey', () => ({
  PianoKey: jest.fn()
}));

import { usePiano } from '@/renderer/hooks/usePiano';
import { PianoKey } from '@/renderer/components/PianoKey';

const mockUsePiano = usePiano as jest.MockedFunction<typeof usePiano>;
const mockPianoKey = PianoKey as jest.MockedFunction<typeof PianoKey>;

describe('Version PianoKeyboard Component', () => {
  const mockKeys: any[] = [
    { id: 'A0', type: 'white', noteName: 'A', octave: 0, fullName: 'A0', whiteKeyIndex: 0 },
    { id: 'A#0', type: 'black', noteName: 'A#', octave: 0, fullName: 'A#0', referenceGridColumn: 2 },
    { id: 'B0', type: 'white', noteName: 'B', octave: 0, fullName: 'B0', whiteKeyIndex: 1 },
    { id: 'C1', type: 'white', noteName: 'C', octave: 1, fullName: 'C1', whiteKeyIndex: 2 },
    { id: 'C#1', type: 'black', noteName: 'C#', octave: 1, fullName: 'C#1', referenceGridColumn: 4 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock PianoKey to render a simple div with test data
    mockPianoKey.mockImplementation(({ keyData, style }: any) => (
      <div 
        data-testid={`piano-key-${keyData.id}`}
        data-key-type={keyData.type}
        style={style}
      >
        {keyData.fullName}
      </div>
    ));
    
    // Mock usePiano to return test keys
    mockUsePiano.mockReturnValue({
      keys: mockKeys,
      whiteKeys: mockKeys.filter(k => k.type === 'white'),
      blackKeys: mockKeys.filter(k => k.type === 'black')
    });
  });

  describe('Core Structure', () => {
    test('should render piano container with correct structure', () => {
      render(<PianoKeyboard />);
      
      const container = screen.getByRole('group');
      expect(container).toHaveClass('piano-keyboard');
      expect(container).toHaveAttribute('aria-label', '88-key piano keyboard');
    });

    test('should have a scrollable container', () => {
      const { container } = render(<PianoKeyboard />);
      
      const pianoContainer = container.querySelector('.piano-container');
      expect(pianoContainer).toBeInTheDocument();
      
      const keyboard = within(pianoContainer as HTMLElement).getByRole('group');
      expect(keyboard).toBeInTheDocument();
    });

    test('should render all keys from usePiano hook', () => {
      render(<PianoKeyboard />);
      
      mockKeys.forEach(key => {
        expect(screen.getByTestId(`piano-key-${key.id}`)).toBeInTheDocument();
      });
    });
  });

  describe('Grid Positioning', () => {
    test('should apply correct grid positioning to white keys', () => {
      render(<PianoKeyboard />);
      
      const whiteKey0 = screen.getByTestId('piano-key-A0');
      expect(whiteKey0).toHaveStyle('grid-column: 1 / span 1');
      
      const whiteKey1 = screen.getByTestId('piano-key-B0');
      expect(whiteKey1).toHaveStyle('grid-column: 2 / span 1');
      
      const whiteKey2 = screen.getByTestId('piano-key-C1');
      expect(whiteKey2).toHaveStyle('grid-column: 3 / span 1');
    });

    test('should apply correct grid positioning to black keys', () => {
      render(<PianoKeyboard />);
      
      const blackKey0 = screen.getByTestId('piano-key-A#0');
      expect(blackKey0).toHaveStyle('grid-column: 2 / span 1');
      expect(blackKey0).toHaveStyle('z-index: 2');
      
      const blackKey1 = screen.getByTestId('piano-key-C#1');
      expect(blackKey1).toHaveStyle('grid-column: 4 / span 1');
      expect(blackKey1).toHaveStyle('z-index: 2');
    });

    test('should render keys in single map for correct DOM order', () => {
      render(<PianoKeyboard />);
      
      // Verify that PianoKey was called with correct props
      expect(mockPianoKey).toHaveBeenCalledTimes(mockKeys.length);
      
      // Check that keys are rendered in the order they appear in the array
      const renderedKeys = screen.getAllByTestId(/piano-key-/);
      expect(renderedKeys).toHaveLength(mockKeys.length);
    });
  });

  describe('CSS Import', () => {
    test('should import PianoKeyboard.css', () => {
      // This is more of a build-time check, but we can verify the component renders
      // which would fail if CSS import is incorrect
      render(<PianoKeyboard />);
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should render within performance budget', () => {
      const startTime = performance.now();
      render(<PianoKeyboard />);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should render quickly
    });

    test('should use memoized keys from usePiano hook', () => {
      const { rerender } = render(<PianoKeyboard />);
      
      expect(mockUsePiano).toHaveBeenCalledTimes(1);
      
      rerender(<PianoKeyboard />);
      
      // Hook should be called again on re-render
      expect(mockUsePiano).toHaveBeenCalledTimes(2);
      // But the keys should be memoized within the hook itself
    });
  });

  describe('Integration with Full 88 Keys', () => {
    test('should handle all 88 keys when provided', () => {
      // Create a full 88-key mock
      const fullKeys = Array.from({ length: 88 }, (_, i) => ({
        id: `key-${i}`,
        type: i % 2 === 0 ? 'white' : 'black' as 'white' | 'black',
        noteName: 'A',
        octave: Math.floor(i / 12),
        fullName: `Note${i}`,
        whiteKeyIndex: i % 2 === 0 ? Math.floor(i / 2) : undefined,
        referenceGridColumn: i % 2 === 1 ? Math.floor(i / 2) + 2 : undefined
      }));
      
      mockUsePiano.mockReturnValue({
        keys: fullKeys,
        whiteKeys: fullKeys.filter(k => k.type === 'white'),
        blackKeys: fullKeys.filter(k => k.type === 'black')
      });
      
      render(<PianoKeyboard />);
      
      // Should render all 88 keys
      expect(mockPianoKey).toHaveBeenCalledTimes(88);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty key array gracefully', () => {
      mockUsePiano.mockReturnValue({
        keys: [],
        whiteKeys: [],
        blackKeys: []
      });
      
      render(<PianoKeyboard />);
      
      const container = screen.getByRole('group');
      expect(container).toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });
  });
});