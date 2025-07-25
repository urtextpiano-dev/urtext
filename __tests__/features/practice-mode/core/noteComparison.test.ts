/**
 * Version Note Comparison Logic Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - comparison functions don't exist
 * 2. GREEN: Implement pure functions in src/renderer/features/practice-mode/utils/noteComparison.ts
 * 3. REFACTOR: Optimize for <1ms performance
 * 
 * CRITICAL: Comparison must complete in <1ms to not add latency
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';

// These imports will fail until implementation
import { compareNotes, debounce } from '@/renderer/features/practice-mode/utils/noteComparison';
import type { PracticeStep, ComparisonResult } from '@/renderer/features/practice-mode/types';

describe('Version Note Comparison Logic', () => {
  describe('compareNotes function', () => {
    test('should detect correct single note', () => {
      const expected: PracticeStep = {
        notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
        isChord: false,
        isRest: false,
        measureIndex: 0,
        timestamp: Date.now()
      };
      
      const played = [60];
      const result = compareNotes(played, expected);
      
      expect(result).toEqual({ type: 'CORRECT' });
    });

    test('should detect correct chord', () => {
      const expected: PracticeStep = {
        notes: [
          { midiValue: 60, pitchName: 'C4', octave: 4 },
          { midiValue: 64, pitchName: 'E4', octave: 4 },
          { midiValue: 67, pitchName: 'G4', octave: 4 }
        ],
        isChord: true,
        isRest: false,
        measureIndex: 1,
        timestamp: Date.now()
      };
      
      const played = [60, 64, 67];
      const result = compareNotes(played, expected);
      
      expect(result).toEqual({ type: 'CORRECT' });
    });

    test('should handle chord notes in any order', () => {
      const expected: PracticeStep = {
        notes: [
          { midiValue: 60, pitchName: 'C4', octave: 4 },
          { midiValue: 64, pitchName: 'E4', octave: 4 }
        ],
        isChord: true,
        isRest: false,
        measureIndex: 1,
        timestamp: Date.now()
      };
      
      // Played in different order
      const played = [64, 60];
      const result = compareNotes(played, expected);
      
      expect(result).toEqual({ type: 'CORRECT' });
    });

    test('should detect missing notes', () => {
      const expected: PracticeStep = {
        notes: [
          { midiValue: 60, pitchName: 'C4', octave: 4 },
          { midiValue: 64, pitchName: 'E4', octave: 4 }
        ],
        isChord: true,
        isRest: false,
        measureIndex: 1,
        timestamp: Date.now()
      };
      
      const played = [60]; // Missing 64
      const result = compareNotes(played, expected);
      
      expect(result).toEqual({ 
        type: 'MISSING_NOTES', 
        missing: [64] 
      });
    });

    test('should detect extra notes', () => {
      const expected: PracticeStep = {
  notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
  isChord: false,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = [60, 61]; // Extra 61
const result = compareNotes(played, expected);

expect(result).toEqual({ 
  type: 'WRONG_NOTES', 
  wrong: [61],
  expected: [60]
});
    });

    test('should detect wrong notes', () => {
      const expected: PracticeStep = {
  notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
  isChord: false,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = [61]; // Wrong note
const result = compareNotes(played, expected);

expect(result).toEqual({ 
  type: 'WRONG_NOTES', 
  wrong: [61],
  expected: [60]
});
    });

    test('should auto-advance on rests', () => {
      const restStep: PracticeStep = {
  notes: [],
  isChord: false,
  isRest: true,
  measureIndex: 2,
  timestamp: Date.now()
};

const played: number[] = []; // No notes played
const result = compareNotes(played, restStep);

expect(result).toEqual({ type: 'CORRECT' });
    });

    test('should handle empty played array for non-rest', () => {
      const expected: PracticeStep = {
  notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
  isChord: false,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played: number[] = [];
const result = compareNotes(played, expected);

expect(result).toEqual({ 
  type: 'MISSING_NOTES', 
  missing: [60] 
});
    });

    test('should complete comparison in <1ms', () => {
      const expected: PracticeStep = {
  notes: Array.from({ length: 10 }, (_, i) => ({
    midiValue: 60 + i,
    pitchName: `Note${i}`,
    octave: 4
  })),
  isChord: true,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = Array.from({ length: 10 }, (_, i) => 60 + i);

const startTime = performance.now();
const result = compareNotes(played, expected);
const duration = performance.now() - startTime;

expect(duration).toBeLessThan(1); // <1ms requirement
expect(result.type).toBe('CORRECT');
    });

    test('should handle duplicate notes in played array', () => {
      const expected: PracticeStep = {
  notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
  isChord: false,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = [60, 60, 60]; // Duplicates should be ignored
const result = compareNotes(played, expected);

expect(result).toEqual({ type: 'CORRECT' });
    });
  });

  describe('debounce utility', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    test('should debounce function calls', () => {
      const mockFn = jest.fn();
const debouncedFn = debounce(mockFn, 50);

// Call multiple times rapidly
debouncedFn();
debouncedFn();
debouncedFn();

expect(mockFn).not.toHaveBeenCalled();

// Fast forward time
jest.advanceTimersByTime(50);

expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should pass latest arguments to debounced function', () => {
      const mockFn = jest.fn();
const debouncedFn = debounce(mockFn, 50);

debouncedFn(1);
debouncedFn(2);
debouncedFn(3);

jest.advanceTimersByTime(50);

expect(mockFn).toHaveBeenCalledWith(3);
    });

    test('should cancel previous timeout on new call', () => {
      const mockFn = jest.fn();
const debouncedFn = debounce(mockFn, 50);

debouncedFn();
jest.advanceTimersByTime(30);
debouncedFn(); // Should reset timer
jest.advanceTimersByTime(30);

expect(mockFn).not.toHaveBeenCalled();

jest.advanceTimersByTime(20);
expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should provide cancel method', () => {
      const mockFn = jest.fn();
const debouncedFn = debounce(mockFn, 50);

debouncedFn();
debouncedFn.cancel();

jest.advanceTimersByTime(100);

expect(mockFn).not.toHaveBeenCalled();
    });

    afterEach(() => {
      jest.useRealTimers();
    });
  });

  describe('edge cases', () => {
    test('should handle invalid MIDI values gracefully', () => {
      const expected: PracticeStep = {
  notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
  isChord: false,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = [60, 999, -1]; // Invalid MIDI values
const result = compareNotes(played, expected);

// Should ignore invalid values and still detect correct note
expect(result).toEqual({ 
  type: 'WRONG_NOTES',
  wrong: [999, -1],
  expected: [60]
});
    });

    test('should handle very large chords efficiently', () => {
      // 10-note chord (extreme case)
const expected: PracticeStep = {
  notes: Array.from({ length: 10 }, (_, i) => ({
    midiValue: 50 + i * 2,
    pitchName: `Note${i}`,
    octave: 4
  })),
  isChord: true,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

const played = Array.from({ length: 10 }, (_, i) => 50 + i * 2);

const startTime = performance.now();
const result = compareNotes(played, expected);
const duration = performance.now() - startTime;

expect(result.type).toBe('CORRECT');
expect(duration).toBeLessThan(1); // Still <1ms
    });
  });
});