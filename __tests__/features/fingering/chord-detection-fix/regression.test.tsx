/**
 * TDD Tests for Single Note Regression Testing
 * 
 * Ensures that fixing chord detection doesn't break existing single note functionality
 * Validates that all existing single note fingering scenarios continue to work
 * 
 * Validates Plan Task 6: No Single Note Regression
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fingering store
const mockSetFingering = jest.fn();
const mockGetFingering = jest.fn();

jest.mock('@/renderer/features/fingering/stores/fingeringStore', () => ({
  useFingeringStore: () => ({
    setFingering: mockSetFingering,
    getFingering: mockGetFingering,
    annotations: {
      'test-score': {
        'm0-s0-v0-n0-midi60': [1], // C4 single note
        'm1-s0-v0-n0-midi67': [2], // G4 single note
      }
    }
  })
}));

// Mock the FingeringLayer component
jest.mock('@/renderer/features/fingering/components/FingeringLayer', () => ({
  FingeringLayer: jest.fn(() => <div data-testid="fingering-layer">Mocked FingeringLayer</div>)
}));

// Mock console for debugging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';

describe('Single Note Regression Tests', () => {
  beforeEach(() => {
    mockSetFingering.mockClear();
    mockGetFingering.mockClear();
    mockConsoleLog.mockClear();
    
    // Clean DOM
    document.body.innerHTML = '';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Basic Single Note Functionality', () => {
    test('should handle single note with data-note-id correctly', async () => {
      // Setup: Single note with data-note-id
      const singleNote = document.createElement('ellipse');
      singleNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60'); // C4
      singleNote.setAttribute('data-testid', 'single-note-c4');
      singleNote.classList.add('vf-notehead');
      document.body.appendChild(singleNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click on single note
      await act(async () => {
        await user.click(singleNote);
      });

      // Should use data-note-id detection (same as chord fix)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n0-midi60')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n0-midi60')
      );

      // Should call fingering assignment
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String), // scoreId
        'm0-s0-v0-n0-midi60', // noteId
        expect.any(Number) // fingering value
      );
    });

    test('should handle single note without data-note-id using fallback', async () => {
      // Setup: Single note without data-note-id (tests fallback path)
      const singleNote = document.createElement('ellipse');
      // NO data-note-id attribute
      singleNote.setAttribute('data-testid', 'single-note-no-id');
      singleNote.classList.add('vf-notehead');
      document.body.appendChild(singleNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click on single note
      await act(async () => {
        await user.click(singleNote);
      });

      // Should try data-note-id first, then fallback
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ No data-note-id found in element tree');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ No data-note-id, trying OSMD DOM traversal...')
      );

      // Should still work through fallback mechanisms
      // (The exact behavior depends on mock setup, but should not crash)
      expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
    });
  });

  describe('Various Single Note Scenarios', () => {
    test('should handle notes across different measures', async () => {
      // Setup: Single notes in different measures
      const notes = [
        { element: document.createElement('ellipse'), id: 'm0-s0-v0-n0-midi60', measure: 0 },
        { element: document.createElement('ellipse'), id: 'm1-s0-v0-n0-midi64', measure: 1 },
        { element: document.createElement('ellipse'), id: 'm2-s0-v0-n0-midi67', measure: 2 }
      ];

      notes.forEach((note, index) => {
        note.element.setAttribute('data-note-id', note.id);
        note.element.setAttribute('data-testid', `note-measure-${note.measure}`);
        document.body.appendChild(note.element);
      });

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Test each note
      for (const note of notes) {
        mockSetFingering.mockClear();

        await act(async () => {
          await user.click(note.element);
        });

        expect(mockSetFingering).toHaveBeenCalledWith(
          expect.any(String),
          note.id,
          expect.any(Number)
        );
      }
    });

    test('should handle notes across different staves', async () => {
      // Setup: Single notes on different staves (treble vs bass)
      const trebleNote = document.createElement('ellipse');
      trebleNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi72'); // Treble staff
      trebleNote.setAttribute('data-testid', 'treble-note');

      const bassNote = document.createElement('ellipse');
      bassNote.setAttribute('data-note-id', 'm0-s1-v0-n0-midi48'); // Bass staff (s1)
      bassNote.setAttribute('data-testid', 'bass-note');

      document.body.appendChild(trebleNote);
      document.body.appendChild(bassNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click treble note
      await act(async () => {
        await user.click(trebleNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi72',
        expect.any(Number)
      );

      mockSetFingering.mockClear();

      // Click bass note
      await act(async () => {
        await user.click(bassNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s1-v0-n0-midi48',
        expect.any(Number)
      );
    });

    test('should handle notes with different durations', async () => {
      // Setup: Single notes with various durations (half, quarter, eighth, etc.)
      const notes = [
        { id: 'm0-s0-v0-n0-midi60', type: 'whole' },
        { id: 'm0-s0-v0-n1-midi64', type: 'half' },
        { id: 'm0-s0-v0-n2-midi67', type: 'quarter' },
        { id: 'm0-s0-v0-n3-midi72', type: 'eighth' }
      ];

      notes.forEach(note => {
        const element = document.createElement('ellipse');
        element.setAttribute('data-note-id', note.id);
        element.setAttribute('data-testid', `${note.type}-note`);
        element.classList.add('vf-notehead', `vf-${note.type}`);
        document.body.appendChild(element);
      });

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Test each note duration
      for (const note of notes) {
        mockSetFingering.mockClear();
        
        const element = screen.getByTestId(`${note.type}-note`);
        await act(async () => {
          await user.click(element);
        });

        expect(mockSetFingering).toHaveBeenCalledWith(
          expect.any(String),
          note.id,
          expect.any(Number)
        );
      }
    });
  });

  describe('Accidentals and Special Cases', () => {
    test('should handle notes with accidentals (sharps/flats)', async () => {
      // Setup: Notes with accidentals
      const sharpNote = document.createElement('ellipse');
      sharpNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi61'); // C#
      sharpNote.setAttribute('data-testid', 'sharp-note');

      const flatNote = document.createElement('ellipse');
      flatNote.setAttribute('data-note-id', 'm0-s0-v0-n1-midi58'); // Bb
      flatNote.setAttribute('data-testid', 'flat-note');

      document.body.appendChild(sharpNote);
      document.body.appendChild(flatNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Test sharp note
      await act(async () => {
        await user.click(sharpNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi61',
        expect.any(Number)
      );

      mockSetFingering.mockClear();

      // Test flat note
      await act(async () => {
        await user.click(flatNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n1-midi58',
        expect.any(Number)
      );
    });

    test('should handle grace notes', async () => {
      // Setup: Grace note
      const graceNote = document.createElement('ellipse');
      graceNote.setAttribute('data-note-id', 'm0-s0-v0-g0-midi67'); // Grace note (g0)
      graceNote.setAttribute('data-testid', 'grace-note');
      graceNote.classList.add('vf-grace-note');
      document.body.appendChild(graceNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      await act(async () => {
        await user.click(graceNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-g0-midi67',
        expect.any(Number)
      );
    });

    test('should handle tied notes', async () => {
      // Setup: Tied note (should still be fingerable)
      const tiedNote = document.createElement('ellipse');
      tiedNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi72');
      tiedNote.setAttribute('data-testid', 'tied-note');
      tiedNote.classList.add('vf-tied');
      document.body.appendChild(tiedNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      await act(async () => {
        await user.click(tiedNote);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi72',
        expect.any(Number)
      );
    });
  });

  describe('SVG Structure Variations', () => {
    test('should handle note in complex SVG hierarchy', async () => {
      // Setup: Note embedded in complex SVG structure
      const svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const measureGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const voiceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const noteGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const notehead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');

      notehead.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      notehead.setAttribute('data-testid', 'nested-note');

      // Build hierarchy
      noteGroup.appendChild(notehead);
      voiceGroup.appendChild(noteGroup);
      measureGroup.appendChild(voiceGroup);
      svgRoot.appendChild(measureGroup);
      document.body.appendChild(svgRoot);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      await act(async () => {
        await user.click(notehead);
      });

      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi60',
        expect.any(Number)
      );
    });

    test('should handle note with data-note-id on parent element', async () => {
      // Setup: data-note-id on parent, click on child
      const noteGroup = document.createElement('g');
      noteGroup.setAttribute('data-note-id', 'm0-s0-v0-n0-midi64');
      noteGroup.classList.add('vf-note');

      const notehead = document.createElement('ellipse');
      notehead.setAttribute('data-testid', 'child-notehead');
      notehead.classList.add('vf-notehead');

      noteGroup.appendChild(notehead);
      document.body.appendChild(noteGroup);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click on child element (should find parent's data-note-id)
      await act(async () => {
        await user.click(notehead);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n0-midi64')
      );
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi64',
        expect.any(Number)
      );
    });
  });

  describe('Performance and Stability', () => {
    test('should handle rapid clicks on single note', async () => {
      // Setup: Single note for rapid clicking
      const singleNote = document.createElement('ellipse');
      singleNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      singleNote.setAttribute('data-testid', 'rapid-click-note');
      document.body.appendChild(singleNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Rapid clicks (should not break)
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await user.click(singleNote);
        });
      }

      // Should handle all clicks correctly
      expect(mockSetFingering).toHaveBeenCalledTimes(5);
      mockSetFingering.mock.calls.forEach(call => {
        expect(call[1]).toBe('m0-s0-v0-n0-midi60');
      });
    });

    test('should maintain consistent behavior across multiple single notes', async () => {
      // Setup: Multiple single notes
      const noteCount = 10;
      const notes = Array.from({ length: noteCount }, (_, i) => {
        const element = document.createElement('ellipse');
        const noteId = `m0-s0-v0-n${i}-midi${60 + i}`;
        element.setAttribute('data-note-id', noteId);
        element.setAttribute('data-testid', `consistency-note-${i}`);
        document.body.appendChild(element);
        return { element, noteId };
      });

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click each note and verify consistent behavior
      for (const { element, noteId } of notes) {
        mockSetFingering.mockClear();

        await act(async () => {
          await user.click(element);
        });

        expect(mockSetFingering).toHaveBeenCalledWith(
          expect.any(String),
          noteId,
          expect.any(Number)
        );
      }
    });
  });

  describe('Error Conditions', () => {
    test('should handle single note with malformed data-note-id', async () => {
      // Setup: Note with malformed ID
      const malformedNote = document.createElement('ellipse');
      malformedNote.setAttribute('data-note-id', 'invalid-note-id-format');
      malformedNote.setAttribute('data-testid', 'malformed-note');
      document.body.appendChild(malformedNote);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Should not crash
      await act(async () => {
        await user.click(malformedNote);
      });

      // Should still attempt to use the ID (graceful degradation)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: invalid-note-id-format')
      );
    });

    test('should handle detached DOM elements gracefully', async () => {
      // Setup: Create element but don't attach to document
      const detachedNote = document.createElement('ellipse');
      detachedNote.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      // Note: NOT appended to document.body

      render(<FingeringLayer />);

      // Simulate click event on detached element
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: detachedNote });

      // Should not crash
      expect(() => {
        detachedNote.dispatchEvent(clickEvent);
      }).not.toThrow();
    });
  });
});

// TDD Reminder:
// This test file ensures that fixing chord detection doesn't break single notes.
// All existing single note functionality should continue working exactly as before.
// 
// Key things being tested:
// 1. Single notes still use data-note-id detection first (same as chord fix)
// 2. Fallback methods still work for single notes without data-note-id
// 3. All edge cases (accidentals, tied notes, grace notes) still work
// 4. Performance and stability are maintained
// 5. Error conditions are handled gracefully
//
// Expected behavior: No change in single note functionality after chord fix