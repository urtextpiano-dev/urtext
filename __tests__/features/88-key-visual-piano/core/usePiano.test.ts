// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { renderHook } from '@testing-library/react';
import { describe, test, expect, jest } from '@jest/globals';
import { usePiano } from '@/renderer/hooks/usePiano';

// Mock the pianoUtils module
jest.mock('@/renderer/utils/pianoUtils', () => ({
  generatePianoKeys: jest.fn(() => [
    { id: 'A0', type: 'white', noteName: 'A', octave: 0, fullName: 'A0', whiteKeyIndex: 0 },
    { id: 'A#0', type: 'black', noteName: 'A#', octave: 0, fullName: 'A#0', referenceGridColumn: 2 },
    { id: 'B0', type: 'white', noteName: 'B', octave: 0, fullName: 'B0', whiteKeyIndex: 1 },
    // Add more mock keys as needed for tests
  ])
}));

describe('Version usePiano Hook Implementation', () => {
  describe('Core Functionality', () => {
    test('should provide keys, whiteKeys, and blackKeys arrays', () => {
      const { result } = renderHook(() => usePiano());
      
      expect(result.current).toHaveProperty('keys');
      expect(result.current).toHaveProperty('whiteKeys');
      expect(result.current).toHaveProperty('blackKeys');
      
      expect(Array.isArray(result.current.keys)).toBe(true);
      expect(Array.isArray(result.current.whiteKeys)).toBe(true);
      expect(Array.isArray(result.current.blackKeys)).toBe(true);
    });

    test('should memoize the generated keys', () => {
      const { result, rerender } = renderHook(() => usePiano());
      
      const firstKeys = result.current.keys;
      const firstWhiteKeys = result.current.whiteKeys;
      const firstBlackKeys = result.current.blackKeys;
      
      // Re-render the hook
      rerender();
      
      // Keys should be the same reference (memoized)
      expect(result.current.keys).toBe(firstKeys);
      expect(result.current.whiteKeys).toBe(firstWhiteKeys);
      expect(result.current.blackKeys).toBe(firstBlackKeys);
    });

    test('should correctly filter white and black keys', () => {
      const { result } = renderHook(() => usePiano());
      
      const { keys, whiteKeys, blackKeys } = result.current;
      
      // All white keys should have type 'white'
      whiteKeys.forEach(key => {
        expect(key.type).toBe('white');
      });
      
      // All black keys should have type 'black'
      blackKeys.forEach(key => {
        expect(key.type).toBe('black');
      });
      
      // Combined should equal total keys
      expect(whiteKeys.length + blackKeys.length).toBe(keys.length);
    });
  });

  describe('Data Integrity', () => {
    test('should preserve all key properties', () => {
      const { result } = renderHook(() => usePiano());
      
      result.current.keys.forEach(key => {
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('type');
        expect(key).toHaveProperty('noteName');
        expect(key).toHaveProperty('octave');
        expect(key).toHaveProperty('fullName');
        
        if (key.type === 'white') {
          expect(key).toHaveProperty('whiteKeyIndex');
        } else {
          expect(key).toHaveProperty('referenceGridColumn');
        }
      });
    });

    test('should maintain key order from generation', () => {
      const { result } = renderHook(() => usePiano());
      const { keys } = result.current;
      
      // First three keys should be A0, A#0, B0
      expect(keys[0].fullName).toBe('A0');
      expect(keys[1].fullName).toBe('A#0');
      expect(keys[2].fullName).toBe('B0');
    });
  });

  describe('Performance', () => {
    test('should not regenerate keys on every render', () => {
      const generatePianoKeys = jest.spyOn(
        require('@/renderer/utils/pianoUtils'),
        'generatePianoKeys'
      );
      
      const { rerender } = renderHook(() => usePiano());
      
      // Initial render
      expect(generatePianoKeys).toHaveBeenCalledTimes(1);
      
      // Multiple re-renders
      rerender();
      rerender();
      rerender();
      
      // Should still only be called once (memoized)
      expect(generatePianoKeys).toHaveBeenCalledTimes(1);
    });

    test('should execute within performance budget', () => {
      const startTime = performance.now();
      const { result } = renderHook(() => usePiano());
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(5); // Hook should be very fast
      expect(result.current.keys).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    test('should return properly typed data', () => {
      const { result } = renderHook(() => usePiano());
      
      // TypeScript will catch type errors at compile time
      // This test ensures runtime types match expected types
      const { keys, whiteKeys, blackKeys } = result.current;
      
      // Check that filtering doesn't break type expectations
      expect(keys.every(k => typeof k.id === 'string')).toBe(true);
      expect(keys.every(k => ['white', 'black'].includes(k.type))).toBe(true);
      expect(keys.every(k => typeof k.octave === 'number')).toBe(true);
    });
  });
});