// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect } from '@jest/globals';
import { PianoKeyData, generatePianoKeys } from '@/renderer/utils/pianoUtils';

describe('Version Piano Key Data Generation', () => {
  describe('Core Requirements', () => {
    test('should generate exactly 88 keys', () => {
      const keys = generatePianoKeys();
      expect(keys).toHaveLength(88);
    });

    test('should start with A0 and end with C8', () => {
      const keys = generatePianoKeys();
      expect(keys[0]).toMatchObject({
        noteName: 'A',
        octave: 0,
        fullName: 'A0'
      });
      expect(keys[87]).toMatchObject({
        noteName: 'C',
        octave: 8,
        fullName: 'C8'
      });
    });

    test('should have 52 white keys and 36 black keys', () => {
      const keys = generatePianoKeys();
      const whiteKeys = keys.filter(k => k.type === 'white');
      const blackKeys = keys.filter(k => k.type === 'black');
      
      expect(whiteKeys).toHaveLength(52);
      expect(blackKeys).toHaveLength(36);
    });

    test('should have unique IDs for each key', () => {
      const keys = generatePianoKeys();
      const ids = keys.map(k => k.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(88);
    });
  });

  describe('White Key Indexing', () => {
    test('should assign whiteKeyIndex only to white keys', () => {
      const keys = generatePianoKeys();
      const whiteKeys = keys.filter(k => k.type === 'white');
      
      whiteKeys.forEach((key, index) => {
        expect(key.whiteKeyIndex).toBe(index);
      });
    });

    test('should have whiteKeyIndex from 0 to 51', () => {
      const keys = generatePianoKeys();
      const whiteKeys = keys.filter(k => k.type === 'white');
      
      expect(whiteKeys[0].whiteKeyIndex).toBe(0);
      expect(whiteKeys[51].whiteKeyIndex).toBe(51);
    });

    test('black keys should not have whiteKeyIndex', () => {
      const keys = generatePianoKeys();
      const blackKeys = keys.filter(k => k.type === 'black');
      
      blackKeys.forEach(key => {
        expect(key.whiteKeyIndex).toBeUndefined();
      });
    });
  });

  describe('Black Key Grid Positioning', () => {
    test('should assign referenceGridColumn to black keys only', () => {
      const keys = generatePianoKeys();
      const blackKeys = keys.filter(k => k.type === 'black');
      
      blackKeys.forEach(key => {
        expect(key.referenceGridColumn).toBeDefined();
        expect(typeof key.referenceGridColumn).toBe('number');
      });
    });

    test('white keys should not have referenceGridColumn', () => {
      const keys = generatePianoKeys();
      const whiteKeys = keys.filter(k => k.type === 'white');
      
      whiteKeys.forEach(key => {
        expect(key.referenceGridColumn).toBeUndefined();
      });
    });

    test('A#0 should reference B0 grid column (position 2)', () => {
      const keys = generatePianoKeys();
      const aSharp0 = keys.find(k => k.fullName === 'A#0');
      
      expect(aSharp0).toBeDefined();
      expect(aSharp0?.referenceGridColumn).toBe(2); // B0 is at grid column 2
    });

    test('C#1 should reference D1 grid column', () => {
      const keys = generatePianoKeys();
      const cSharp1 = keys.find(k => k.fullName === 'C#1');
      const d1 = keys.find(k => k.fullName === 'D1');
      
      expect(cSharp1).toBeDefined();
      expect(d1).toBeDefined();
      expect(cSharp1?.referenceGridColumn).toBe((d1?.whiteKeyIndex ?? -1) + 1);
    });

    test('G#7 should reference A7 grid column', () => {
      const keys = generatePianoKeys();
      const gSharp7 = keys.find(k => k.fullName === 'G#7');
      const a7 = keys.find(k => k.fullName === 'A7');
      
      expect(gSharp7).toBeDefined();
      expect(a7).toBeDefined();
      expect(gSharp7?.referenceGridColumn).toBe((a7?.whiteKeyIndex ?? -1) + 1);
    });
  });

  describe('Note Pattern Validation', () => {
    test('should follow correct chromatic note pattern', () => {
      const keys = generatePianoKeys();
      const expectedPattern = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
      
      // Check first 12 notes after A0
      for (let i = 0; i < 12; i++) {
        expect(keys[i].noteName).toBe(expectedPattern[i % 12]);
      }
    });

    test('should correctly identify black keys by note name', () => {
      const keys = generatePianoKeys();
      const blackNoteNames = ['C#', 'D#', 'F#', 'G#', 'A#'];
      
      keys.forEach(key => {
        if (blackNoteNames.includes(key.noteName)) {
          expect(key.type).toBe('black');
        }
      });
    });

    test('should correctly identify white keys by note name', () => {
      const keys = generatePianoKeys();
      const whiteNoteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      
      keys.forEach(key => {
        if (whiteNoteNames.includes(key.noteName)) {
          expect(key.type).toBe('white');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle partial octave at the beginning (A0, A#0, B0)', () => {
      const keys = generatePianoKeys();
      
      expect(keys[0]).toMatchObject({ fullName: 'A0', type: 'white' });
      expect(keys[1]).toMatchObject({ fullName: 'A#0', type: 'black' });
      expect(keys[2]).toMatchObject({ fullName: 'B0', type: 'white' });
    });

    test('should handle single key at the end (C8)', () => {
      const keys = generatePianoKeys();
      const lastKey = keys[87];
      
      expect(lastKey).toMatchObject({
        fullName: 'C8',
        type: 'white',
        octave: 8,
        noteName: 'C'
      });
    });

    test('should handle octave transitions correctly', () => {
      const keys = generatePianoKeys();
      const b1 = keys.find(k => k.fullName === 'B1');
      const c2 = keys.find(k => k.fullName === 'C2');
      
      expect(b1).toBeDefined();
      expect(c2).toBeDefined();
      expect(b1?.octave).toBe(1);
      expect(c2?.octave).toBe(2);
    });
  });

  describe('Performance Requirements', () => {
    test('should generate keys within 10ms', () => {
      const startTime = performance.now();
      const keys = generatePianoKeys();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(keys).toHaveLength(88);
    });
  });
});