// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect } from '@jest/globals';
import { generatePianoKeys } from '@/renderer/utils/pianoUtils';

describe('Version Landmark Key Identification', () => {
  describe('Core Requirements', () => {
    test('should mark all C notes as landmarks', () => {
      const keys = generatePianoKeys();
      
      const cNotes = keys.filter(k => k.noteName === 'C');
      
      // Should have 8 C notes (C1-C8)
      expect(cNotes).toHaveLength(8);
      
      // All C notes should be marked as landmarks
      cNotes.forEach(cNote => {
        expect(cNote.isLandmark).toBe(true);
      });
    });

    test('should not mark non-C notes as landmarks', () => {
      const keys = generatePianoKeys();
      
      const nonCNotes = keys.filter(k => k.noteName !== 'C');
      
      // All non-C notes should not be landmarks
      nonCNotes.forEach(note => {
        expect(note.isLandmark).toBeFalsy();
      });
    });

    test('should maintain all existing properties when adding landmark', () => {
      const keys = generatePianoKeys();
      
      const c4 = keys.find(k => k.fullName === 'C4');
      
      expect(c4).toBeDefined();
      expect(c4).toMatchObject({
        id: expect.any(String),
        type: 'white',
        noteName: 'C',
        octave: 4,
        fullName: 'C4',
        whiteKeyIndex: expect.any(Number),
        isLandmark: true
      });
    });
  });

  describe('Specific Landmark Keys', () => {
    test('should mark C1 through C8 as landmarks', () => {
      const keys = generatePianoKeys();
      
      const expectedLandmarks = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];
      
      expectedLandmarks.forEach(noteName => {
        const key = keys.find(k => k.fullName === noteName);
        expect(key).toBeDefined();
        expect(key?.isLandmark).toBe(true);
      });
    });

    test('should not mark C#/Db notes as landmarks', () => {
      const keys = generatePianoKeys();
      
      const cSharpNotes = keys.filter(k => k.noteName === 'C#');
      
      cSharpNotes.forEach(note => {
        expect(note.isLandmark).toBeFalsy();
      });
    });
  });

  describe('Integration with Key Generation', () => {
    test('should not affect total key count', () => {
      const keys = generatePianoKeys();
      expect(keys).toHaveLength(88);
    });

    test('should not affect key type distribution', () => {
      const keys = generatePianoKeys();
      
      const whiteKeys = keys.filter(k => k.type === 'white');
      const blackKeys = keys.filter(k => k.type === 'black');
      
      expect(whiteKeys).toHaveLength(52);
      expect(blackKeys).toHaveLength(36);
    });

    test('should preserve key ordering', () => {
      const keys = generatePianoKeys();
      
      // First key should still be A0
      expect(keys[0].fullName).toBe('A0');
      
      // Last key should still be C8
      expect(keys[87].fullName).toBe('C8');
      
      // C8 should be a landmark
      expect(keys[87].isLandmark).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should not significantly impact generation time', () => {
      const startTime = performance.now();
      const keys = generatePianoKeys();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(10); // Same as Phase 1
      expect(keys.filter(k => k.isLandmark)).toHaveLength(8);
    });
  });
});