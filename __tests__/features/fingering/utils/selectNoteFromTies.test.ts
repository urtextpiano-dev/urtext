// Unit tests for the selectNoteFromTies pure function
// Tests chord note selection logic and edge cases

import { describe, test, expect } from '@jest/globals';
import { selectNoteFromTies } from '@/renderer/features/fingering/utils/selectNoteFromTies';

describe('selectNoteFromTies - Chord Note Selection', () => {
  // Sample chord notes for testing
  const chordNotes = [
    {
      noteId: 'm0-s0-v0-n0-midi67', // G4 (lower note)
      bounds: { x: 150, y: 200, width: 20, height: 30 },
      distance: 8.5,
      midiValue: 67
    },
    {
      noteId: 'm0-s0-v0-n1-midi76', // E5 (higher note)
      bounds: { x: 150, y: 200, width: 20, height: 30 },
      distance: 8.5,
      midiValue: 76
    }
  ];

  describe('Basic Selection Logic', () => {
    test('should return undefined for empty array', () => {
      const result = selectNoteFromTies([], 0.5);
      expect(result).toBeUndefined();
    });

    test('should return undefined for null/undefined input', () => {
      expect(selectNoteFromTies(null as any, 0.5)).toBeUndefined();
      expect(selectNoteFromTies(undefined as any, 0.5)).toBeUndefined();
    });

    test('should return single note when only one note provided', () => {
      const result = selectNoteFromTies([chordNotes[0]], 0.5);
      expect(result).toBe(chordNotes[0]);
    });
  });

  describe('Chord Note Selection by Position', () => {
    test('should select lower note when clicking in lower zone (Y < 0.4)', () => {
      const result = selectNoteFromTies(chordNotes, 0.2);
      expect(result?.noteId).toBe('m0-s0-v0-n0-midi67'); // Lower MIDI value
    });

    test('should select higher note when clicking in upper zone (Y > 0.6)', () => {
      const result = selectNoteFromTies(chordNotes, 0.8);
      expect(result?.noteId).toBe('m0-s0-v0-n1-midi76'); // Higher MIDI value
    });

    test('should default to lower note when clicking in middle zone (0.4 <= Y <= 0.6)', () => {
      const result = selectNoteFromTies(chordNotes, 0.5);
      expect(result?.noteId).toBe('m0-s0-v0-n0-midi67'); // Lower MIDI value (default)
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should clamp Y values outside 0-1 range', () => {
      // Y = -0.5 should be clamped to 0 (lower zone)
      const resultBelow = selectNoteFromTies(chordNotes, -0.5);
      expect(resultBelow?.noteId).toBe('m0-s0-v0-n0-midi67');

      // Y = 1.5 should be clamped to 1 (upper zone)
      const resultAbove = selectNoteFromTies(chordNotes, 1.5);
      expect(resultAbove?.noteId).toBe('m0-s0-v0-n1-midi76');
    });

    test('should handle notes without valid MIDI values', () => {
      const notesWithoutMidi = [
        { noteId: 't1-invalid', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5 },
        { noteId: 't2-also-invalid', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5 }
      ];

      const result = selectNoteFromTies(notesWithoutMidi, 0.8);
      expect(result?.noteId).toBe('t1-invalid'); // Should fallback to first note
    });

    test('should handle mixed valid and invalid MIDI values', () => {
      const mixedNotes = [
        { noteId: 'invalid-note', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5 },
        { noteId: 'm0-s0-v0-n1-midi72', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5, midiValue: 72 }
      ];

      const result = selectNoteFromTies(mixedNotes, 0.8);
      expect(result?.noteId).toBe('m0-s0-v0-n1-midi72'); // Should use the valid MIDI note
    });
  });

  describe('Complex Chord Scenarios', () => {
    test('should correctly sort and select from complex chord (3+ notes)', () => {
      const complexChord = [
        { noteId: 'm0-s0-v0-n0-midi60', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5, midiValue: 60 }, // C4
        { noteId: 'm0-s0-v0-n1-midi67', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5, midiValue: 67 }, // G4
        { noteId: 'm0-s0-v0-n2-midi72', bounds: { x: 0, y: 0, width: 20, height: 30 }, distance: 5, midiValue: 72 }  // C5
      ];

      // Lower zone should select lowest note (C4)
      const lowerResult = selectNoteFromTies(complexChord, 0.2);
      expect(lowerResult?.noteId).toBe('m0-s0-v0-n0-midi60');

      // Upper zone should select highest note (C5)
      const upperResult = selectNoteFromTies(complexChord, 0.8);
      expect(upperResult?.noteId).toBe('m0-s0-v0-n2-midi72');
    });
  });

  describe('Boundary Testing', () => {
    test('should handle exact boundary values correctly', () => {
      // Test exact boundaries
      const lowerBoundary = selectNoteFromTies(chordNotes, 0.4);
      expect(lowerBoundary?.noteId).toBe('m0-s0-v0-n0-midi67'); // Should be middle zone (default to lower)

      const upperBoundary = selectNoteFromTies(chordNotes, 0.6);
      expect(upperBoundary?.noteId).toBe('m0-s0-v0-n0-midi67'); // Should be middle zone (default to lower)
    });

    test('should handle values just outside boundaries', () => {
      // Just below lower threshold
      const justBelowLower = selectNoteFromTies(chordNotes, 0.39);
      expect(justBelowLower?.noteId).toBe('m0-s0-v0-n0-midi67'); // Lower zone

      // Just above upper threshold  
      const justAboveUpper = selectNoteFromTies(chordNotes, 0.61);
      expect(justAboveUpper?.noteId).toBe('m0-s0-v0-n1-midi76'); // Upper zone
    });
  });
});