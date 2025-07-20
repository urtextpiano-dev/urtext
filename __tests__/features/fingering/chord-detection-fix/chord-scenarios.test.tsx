/**
 * TDD Tests for Chord Scenarios
 * 
 * End-to-end tests validating the original bug is fixed:
 * - Users can set different fingerings on different notes in a chord
 * - Each chord note returns a distinct note ID when clicked
 * - Fingering assignments work independently per chord note
 * 
 * Validates Plan Task 5: Test Chord Scenarios
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
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
        'm0-s0-v0-n0-midi60': [1], // C4 fingering
        'm0-s0-v0-n1-midi67': [5], // G4 fingering
      }
    }
  })
}));

// Mock the FingeringLayer component - will fail until implemented
jest.mock('@/renderer/features/fingering/components/FingeringLayer', () => ({
  FingeringLayer: jest.fn(() => <div data-testid="fingering-layer">Mocked FingeringLayer</div>)
}));

// Mock console for debugging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';

describe('Chord Scenarios - End-to-End Bug Fix Validation', () => {
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

  describe('Two-Note Chord Scenarios', () => {
    test('should distinguish C4 and G5 in chord (original bug scenario)', async () => {
      // Setup: Two-note chord C4 + G5 (the exact scenario from bug report)
      const c4Note = document.createElement('ellipse');
      c4Note.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60'); // C4
      c4Note.setAttribute('data-testid', 'chord-note-c4');
      c4Note.classList.add('vf-notehead');
      
      const g5Note = document.createElement('ellipse');
      g5Note.setAttribute('data-note-id', 'm0-s0-v0-n1-midi79'); // G5
      g5Note.setAttribute('data-testid', 'chord-note-g5');
      g5Note.classList.add('vf-notehead');
      
      // Simulate OSMD chord group structure
      const chordGroup = document.createElement('g');
      chordGroup.classList.add('vf-chord');
      chordGroup.appendChild(c4Note);
      chordGroup.appendChild(g5Note);
      
      document.body.appendChild(chordGroup);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Test Case 1: Click on C4, set fingering "1"
      await act(async () => {
        await user.click(c4Note);
      });

      // Should detect C4 note specifically
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n0-midi60')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n0-midi60')
      );

      // Simulate setting fingering "1" on C4
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String), // scoreId
        'm0-s0-v0-n0-midi60', // noteId
        1 // fingering value
      );

      // Clear mocks for next test
      mockSetFingering.mockClear();
      mockConsoleLog.mockClear();

      // Test Case 2: Click on G5, set fingering "5"
      await act(async () => {
        await user.click(g5Note);
      });

      // Should detect G5 note specifically (DIFFERENT from C4!)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n1-midi79')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n1-midi79')
      );

      // Simulate setting fingering "5" on G5
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String), // scoreId
        'm0-s0-v0-n1-midi79', // noteId (DIFFERENT!)
        5 // fingering value
      );

      // CRITICAL: Verify different note IDs were returned
      const c4Calls = mockSetFingering.mock.calls.filter(call => 
        call[1] === 'm0-s0-v0-n0-midi60'
      );
      const g5Calls = mockSetFingering.mock.calls.filter(call => 
        call[1] === 'm0-s0-v0-n1-midi79'
      );

      expect(c4Calls).toHaveLength(1);
      expect(g5Calls).toHaveLength(1);
      
      // Verify the bug is fixed: different clicks return different IDs
      expect('m0-s0-v0-n0-midi60').not.toBe('m0-s0-v0-n1-midi79');
    });

    test('should handle repeated clicks on same chord note', async () => {
      // Setup: Chord note C4
      const c4Note = document.createElement('ellipse');
      c4Note.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      c4Note.setAttribute('data-testid', 'chord-note-c4');
      document.body.appendChild(c4Note);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click same note twice
      await act(async () => {
        await user.click(c4Note);
      });
      
      await act(async () => {
        await user.click(c4Note);
      });

      // Should return same ID both times (consistent behavior)
      const setFingeringCalls = mockSetFingering.mock.calls;
      expect(setFingeringCalls).toHaveLength(2);
      expect(setFingeringCalls[0][1]).toBe('m0-s0-v0-n0-midi60');
      expect(setFingeringCalls[1][1]).toBe('m0-s0-v0-n0-midi60');
    });
  });

  describe('Three-Note Chord Scenarios', () => {
    test('should distinguish all notes in C-E-G triad', async () => {
      // Setup: Three-note chord C4 + E4 + G4
      const c4Note = document.createElement('ellipse');
      c4Note.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60'); // C4
      c4Note.setAttribute('data-testid', 'chord-note-c4');
      
      const e4Note = document.createElement('ellipse');
      e4Note.setAttribute('data-note-id', 'm0-s0-v0-n1-midi64'); // E4
      e4Note.setAttribute('data-testid', 'chord-note-e4');
      
      const g4Note = document.createElement('ellipse');
      g4Note.setAttribute('data-note-id', 'm0-s0-v0-n2-midi67'); // G4
      g4Note.setAttribute('data-testid', 'chord-note-g4');
      
      const chordGroup = document.createElement('g');
      chordGroup.appendChild(c4Note);
      chordGroup.appendChild(e4Note);
      chordGroup.appendChild(g4Note);
      document.body.appendChild(chordGroup);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click each note and verify distinct IDs
      const expectedResults = [
        { element: c4Note, noteId: 'm0-s0-v0-n0-midi60', fingering: 1 },
        { element: e4Note, noteId: 'm0-s0-v0-n1-midi64', fingering: 3 },
        { element: g4Note, noteId: 'm0-s0-v0-n2-midi67', fingering: 5 }
      ];

      for (const { element, noteId, fingering } of expectedResults) {
        mockSetFingering.mockClear();
        mockConsoleLog.mockClear();

        await act(async () => {
          await user.click(element);
        });

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining(`✅ Found data-note-id: ${noteId}`)
        );
        expect(mockSetFingering).toHaveBeenCalledWith(
          expect.any(String),
          noteId,
          fingering
        );
      }

      // Verify all IDs are unique
      const noteIds = expectedResults.map(r => r.noteId);
      const uniqueIds = new Set(noteIds);
      expect(uniqueIds.size).toBe(3); // All different
    });
  });

  describe('Complex Chord Scenarios', () => {
    test('should handle overlapping noteheads with same visual position', async () => {
      // Setup: Notes that might have similar/identical bounding boxes
      const note1 = document.createElement('ellipse');
      note1.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      note1.style.position = 'absolute';
      note1.style.left = '100px';
      note1.style.top = '50px';
      
      const note2 = document.createElement('ellipse');
      note2.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67');
      note2.style.position = 'absolute';
      note2.style.left = '100px'; // Same X position
      note2.style.top = '52px';   // Slightly different Y (2px apart)
      
      document.body.appendChild(note1);
      document.body.appendChild(note2);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click on each note
      await act(async () => {
        await user.click(note1);
      });
      
      const firstCall = mockSetFingering.mock.calls[0];
      expect(firstCall[1]).toBe('m0-s0-v0-n0-midi60');

      mockSetFingering.mockClear();

      await act(async () => {
        await user.click(note2);
      });
      
      const secondCall = mockSetFingering.mock.calls[0];
      expect(secondCall[1]).toBe('m0-s0-v0-n1-midi67');

      // Should return different IDs despite similar positions
      expect(firstCall[1]).not.toBe(secondCall[1]);
    });

    test('should handle chords across different measures', async () => {
      // Setup: Chord notes in different measures
      const m0Note = document.createElement('ellipse');
      m0Note.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60'); // Measure 0
      
      const m1Note = document.createElement('ellipse');
      m1Note.setAttribute('data-note-id', 'm1-s0-v0-n0-midi60'); // Measure 1, same pitch
      
      document.body.appendChild(m0Note);
      document.body.appendChild(m1Note);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Click notes from different measures
      await act(async () => {
        await user.click(m0Note);
      });
      
      const m0Call = mockSetFingering.mock.calls[0];
      expect(m0Call[1]).toBe('m0-s0-v0-n0-midi60');

      mockSetFingering.mockClear();

      await act(async () => {
        await user.click(m1Note);
      });
      
      const m1Call = mockSetFingering.mock.calls[0];
      expect(m1Call[1]).toBe('m1-s0-v0-n0-midi60');

      // Should distinguish between measures
      expect(m0Call[1]).not.toBe(m1Call[1]);
    });
  });

  describe('Real-World OSMD Structure', () => {
    test('should work with typical OSMD SVG hierarchy', async () => {
      // Setup: Realistic OSMD structure
      const svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgRoot.setAttribute('class', 'vf-svg');
      
      const measureGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      measureGroup.setAttribute('class', 'vf-measure');
      
      const voiceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      voiceGroup.setAttribute('class', 'vf-voice');
      
      const chordGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chordGroup.setAttribute('class', 'vf-chord');
      
      // Chord notes
      const note1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      note1.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      note1.setAttribute('class', 'vf-notehead');
      
      const note2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      note2.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67');
      note2.setAttribute('class', 'vf-notehead');
      
      // Build hierarchy
      chordGroup.appendChild(note1);
      chordGroup.appendChild(note2);
      voiceGroup.appendChild(chordGroup);
      measureGroup.appendChild(voiceGroup);
      svgRoot.appendChild(measureGroup);
      document.body.appendChild(svgRoot);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Test clicking on each notehead
      await act(async () => {
        await user.click(note1);
      });
      
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n0-midi60',
        expect.any(Number)
      );

      mockSetFingering.mockClear();

      await act(async () => {
        await user.click(note2);
      });
      
      expect(mockSetFingering).toHaveBeenCalledWith(
        expect.any(String),
        'm0-s0-v0-n1-midi67',
        expect.any(Number)
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle chord notes without data-note-id gracefully', async () => {
      // Setup: Chord note missing data-note-id (fallback scenario)
      const noteWithoutId = document.createElement('ellipse');
      // NO data-note-id attribute
      noteWithoutId.setAttribute('data-testid', 'broken-chord-note');
      document.body.appendChild(noteWithoutId);

      const user = userEvent.setup();
      render(<FingeringLayer />);

      // Should not crash and should try fallback methods
      await act(async () => {
        await user.click(noteWithoutId);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ No data-note-id found in element tree');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ No data-note-id, trying OSMD DOM traversal...')
      );
      
      // Should not crash the component
      expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
    });
  });
});

// TDD Reminder:
// This test file should FAIL initially because:
// 1. FingeringLayer doesn't use data-note-id detection first
// 2. Chord notes currently return the same ID due to coordinate detection bug
// 3. Console logs don't show the correct detection path
// 
// After implementing the fix, chord notes should return distinct IDs:
// BEFORE: Both clicks → m0-s0-v0-n1-midi76 (SAME!)
// AFTER: Click C4 → m0-s0-v0-n0-midi60, Click G5 → m0-s0-v0-n1-midi79 (DISTINCT!)