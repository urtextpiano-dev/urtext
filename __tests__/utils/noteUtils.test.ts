/**
 * Tests for note utility functions
 */

import { 
  midiToNoteName, 
  extractNoteNameFromPitch, 
  formatNoteNames, 
  formatWrongNotes, 
  isValidNoteName 
} from '@/renderer/utils/noteUtils';

describe('noteUtils', () => {
  describe('midiToNoteName', () => {
    it('converts standard MIDI numbers to note names', () => {
      expect(midiToNoteName(60)).toBe('C4'); // Middle C
      expect(midiToNoteName(69)).toBe('A4'); // A440
      expect(midiToNoteName(72)).toBe('C5');
      expect(midiToNoteName(21)).toBe('A0'); // Lowest piano key
      expect(midiToNoteName(108)).toBe('C8'); // Highest piano key
    });

    it('handles edge cases', () => {
      expect(midiToNoteName(0)).toBe('C-1');
      expect(midiToNoteName(127)).toBe('G9');
      expect(midiToNoteName(-1)).toBe('Invalid(-1)');
      expect(midiToNoteName(128)).toBe('Invalid(128)');
      expect(midiToNoteName(60.5)).toBe('Invalid(60.5)');
    });
  });

  describe('extractNoteNameFromPitch', () => {
    it('extracts from OSMD pitch object with Name and Octave', () => {
      const pitch = { Name: 'C', Octave: 4 };
      expect(extractNoteNameFromPitch(pitch, 60)).toBe('C4');
    });

    it('extracts from OSMD pitch object with lowercase properties', () => {
      const pitch = { name: 'A', octave: 4 };
      expect(extractNoteNameFromPitch(pitch, 69)).toBe('A4');
    });

    it('uses toString when available and meaningful', () => {
      const pitch = { toString: () => 'F#3' };
      expect(extractNoteNameFromPitch(pitch, 54)).toBe('F#3');
    });

    it('falls back to MIDI conversion for invalid toString', () => {
      const pitch = { toString: () => '[object Object]' };
      expect(extractNoteNameFromPitch(pitch, 60)).toBe('C4');
    });

    it('handles string pitch directly', () => {
      expect(extractNoteNameFromPitch('E4', 64)).toBe('E4');
    });

    it('falls back to MIDI conversion for null/undefined', () => {
      expect(extractNoteNameFromPitch(null, 60)).toBe('C4');
      expect(extractNoteNameFromPitch(undefined, 69)).toBe('A4');
    });

    it('handles FundamentalNote structure', () => {
      const pitch = { 
        FundamentalNote: { Name: 'G' }, 
        Octave: 3 
      };
      expect(extractNoteNameFromPitch(pitch, 55)).toBe('G3');
    });
  });

  describe('formatNoteNames', () => {
    it('formats single note', () => {
      expect(formatNoteNames(['C4'])).toBe('C4');
    });

    it('formats two notes', () => {
      expect(formatNoteNames(['C4', 'E4'])).toBe('C4 + E4');
    });

    it('formats small chords', () => {
      expect(formatNoteNames(['C4', 'E4', 'G4'])).toBe('C4 + E4 + G4');
      expect(formatNoteNames(['C4', 'E4', 'G4', 'B4'])).toBe('C4 + E4 + G4 + B4');
    });

    it('formats large chords with commas', () => {
      expect(formatNoteNames(['C4', 'E4', 'G4', 'B4', 'D5']))
        .toBe('C4, E4, G4, B4, and D5');
    });

    it('handles empty array', () => {
      expect(formatNoteNames([])).toBe('No notes');
    });
  });

  describe('formatWrongNotes', () => {
    it('formats wrong MIDI notes', () => {
      expect(formatWrongNotes([72])).toBe('C5');
      expect(formatWrongNotes([60, 64])).toBe('C4 + E4');
      expect(formatWrongNotes([])).toBe('');
    });
  });

  describe('isValidNoteName', () => {
    it('validates proper note names', () => {
      expect(isValidNoteName('C4')).toBe(true);
      expect(isValidNoteName('F#3')).toBe(true);
      expect(isValidNoteName('Bb2')).toBe(true);
      expect(isValidNoteName('A')).toBe(true); // Note without octave
    });

    it('rejects invalid note names', () => {
      expect(isValidNoteName('[object Object]')).toBe(false);
      expect(isValidNoteName('')).toBe(false);
      expect(isValidNoteName('InvalidNote123')).toBe(false);
      expect(isValidNoteName('X4')).toBe(false);
    });

    it('handles non-string inputs', () => {
      expect(isValidNoteName(null as any)).toBe(false);
      expect(isValidNoteName(undefined as any)).toBe(false);
      expect(isValidNoteName(123 as any)).toBe(false);
    });
  });
});