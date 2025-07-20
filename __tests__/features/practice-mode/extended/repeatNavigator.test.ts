/**
 * Phase 4 Task 4.2: Repeat Navigator Tests
 * 
 * Tests musical repeat navigation including D.C., D.S., Coda, and repeat signs.
 * Verifies correct navigation flow and infinite loop prevention.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { RepeatMarking } from '@/renderer/features/practice-mode/types';

// Mock dependencies to fix import.meta syntax error
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: false
}));

jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock OSMD structure
const createMockOSMD = (repeatStructure: any[] = []) => ({
  GraphicSheet: {
    MeasureList: [
      repeatStructure.map((config, index) => ({
        parentSourceMeasure: {
          ...config,
          measureNumber: index + 1
        }
      }))
    ]
  }
});

// Import after mocks
import { RepeatNavigator } from '@/renderer/features/practice-mode/services/RepeatNavigator';

describe('Repeat Navigator', () => {
  let navigator: RepeatNavigator;
  
  describe('Basic Repeat Signs', () => {
    test('should parse simple repeat signs', () => {
      const osmd = createMockOSMD([
        {}, // Measure 0
        { repeatStartLine: true }, // Measure 1
        {}, // Measure 2
        { repeatEndLine: true }, // Measure 3
        {} // Measure 4
      ]);
      
      navigator = new RepeatNavigator(osmd);
      const markings = navigator.getRepeatMarkings();
      
      expect(markings).toHaveLength(2);
      expect(markings[0]).toEqual({
        type: 'REPEAT_START',
        measureIndex: 1
      });
      expect(markings[1]).toEqual({
        type: 'REPEAT_END',
        measureIndex: 3,
        targetMeasure: 1
      });
    });
    
    test('should navigate simple repeats correctly', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { repeatStartLine: true }, // 1
        {}, // 2
        { repeatEndLine: true }, // 3
        {} // 4
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // First pass
      expect(navigator.getNextMeasure(0)).toBe(1);
      expect(navigator.getNextMeasure(1)).toBe(2);
      expect(navigator.getNextMeasure(2)).toBe(3);
      expect(navigator.getNextMeasure(3)).toBe(1); // Jump back on first encounter
      
      // Second pass (after jumping back)
      navigator.getNextMeasure(1); // 2
      navigator.getNextMeasure(2); // 3
      expect(navigator.getNextMeasure(3)).toBe(4); // Continue forward on second encounter
    });
    
    test('should handle nested repeats', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { repeatStartLine: true }, // 1 - Outer start
        { repeatStartLine: true }, // 2 - Inner start
        {}, // 3
        { repeatEndLine: true }, // 4 - Inner end
        {}, // 5
        { repeatEndLine: true }, // 6 - Outer end
        {} // 7
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // Navigate through nested structure
      const path: number[] = [];
      let current = 0;
      
      for (let i = 0; i < 20 && current !== null && current < 8; i++) {
        path.push(current);
        current = navigator.getNextMeasure(current);
      }
      
      // Expected: 0, 1, 2, 3, 4, 2, 3, 4, 5, 6, 1, 2, 3, 4, 2, 3, 4, 5, 6, 7
      expect(path).toContain(1); // Outer repeat start
      expect(path.filter(m => m === 2).length).toBeGreaterThan(2); // Inner repeat executed multiple times
    });
  });
  
  describe('D.C. and D.S. Navigation', () => {
    test('should handle Da Capo (D.C.)', () => {
      const osmd = createMockOSMD([
        {}, // 0
        {}, // 1
        {}, // 2
        { instructions: [{ type: 'DaCapo' }] }, // 3 - D.C.
        {} // 4
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      expect(navigator.getNextMeasure(2)).toBe(3);
      expect(navigator.getNextMeasure(3)).toBe(0); // Jump to beginning
      
      // Should not jump again on second pass
      navigator.reset();
      navigator.getNextMeasure(0);
      navigator.getNextMeasure(1);
      navigator.getNextMeasure(2);
      navigator.getNextMeasure(3); // First encounter - jumps
      
      // Continue from beginning
      navigator.getNextMeasure(0);
      navigator.getNextMeasure(1);
      navigator.getNextMeasure(2);
      expect(navigator.getNextMeasure(3)).toBe(4); // Second encounter - continues
    });
    
    test('should handle Dal Segno (D.S.)', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { instructions: [{ type: 'Segno' }] }, // 1 - Segno marker
        {}, // 2
        {}, // 3
        { instructions: [{ type: 'DalSegno' }] }, // 4 - D.S.
        {} // 5
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      expect(navigator.getNextMeasure(3)).toBe(4);
      expect(navigator.getNextMeasure(4)).toBe(1); // Jump to Segno
    });
    
    test('should handle D.C. al Fine', () => {
      const osmd = createMockOSMD([
        {}, // 0
        {}, // 1
        { instructions: [{ type: 'Fine' }] }, // 2 - Fine
        {}, // 3
        { instructions: [{ type: 'DaCapoAlFine' }] }, // 4 - D.C. al Fine
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // First pass
      expect(navigator.getNextMeasure(3)).toBe(4);
      expect(navigator.getNextMeasure(4)).toBe(0); // Jump to beginning
      
      // After jump, play until Fine
      expect(navigator.getNextMeasure(0)).toBe(1);
      expect(navigator.getNextMeasure(1)).toBe(2);
      expect(navigator.getNextMeasure(2)).toBe(null); // End at Fine
    });
    
    test('should handle Coda jumps', () => {
      const osmd = createMockOSMD([
        {}, // 0
        {}, // 1
        { instructions: [{ type: 'ToCoda' }] }, // 2 - To Coda marker
        {}, // 3
        { instructions: [{ type: 'DalSegnoAlCoda' }] }, // 4 - D.S. al Coda
        {}, // 5
        { instructions: [{ type: 'Coda' }] }, // 6 - Coda section
        {} // 7
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // First pass - skip "To Coda"
      expect(navigator.getNextMeasure(1)).toBe(2);
      expect(navigator.getNextMeasure(2)).toBe(3); // Continue past "To Coda"
      
      // After D.S. al Coda jump
      navigator.markCodaJump();
      expect(navigator.getNextMeasure(2)).toBe(6); // Jump to Coda
    });
  });
  
  describe('Play Order Generation', () => {
    test('should generate correct play order for simple repeat', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { repeatStartLine: true }, // 1
        {}, // 2
        { repeatEndLine: true }, // 3
        {} // 4
      ]);
      
      navigator = new RepeatNavigator(osmd);
      const order = navigator.generatePlayOrder(5);
      
      expect(order).toEqual([0, 1, 2, 3, 1, 2, 3, 4]);
    });
    
    test('should generate correct play order for D.C.', () => {
      const osmd = createMockOSMD([
        {}, // 0
        {}, // 1
        { instructions: [{ type: 'DaCapo' }] }, // 2
      ]);
      
      navigator = new RepeatNavigator(osmd);
      const order = navigator.generatePlayOrder(3);
      
      expect(order).toEqual([0, 1, 2, 0, 1, 2]);
    });
    
    test('should detect infinite loops', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { instructions: [{ type: 'DaCapo' }] }, // 1 - Infinite D.C.
      ]);
      
      navigator = new RepeatNavigator(osmd);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const order = navigator.generatePlayOrder(2);
      
      expect(consoleSpy).toHaveBeenCalledWith('🚨 Infinite loop detected in repeat structure');
      expect(order.length).toBeLessThanOrEqual(1000);
      
      consoleSpy.mockRestore();
    });
    
    test('should handle complex repeat structures', () => {
      const osmd = createMockOSMD([
        {}, // 0
        { repeatStartLine: true }, // 1
        {}, // 2
        { repeatEndLine: true, instructions: [{ type: 'Volta', number: 1 }] }, // 3 - First ending
        {}, // 4
        { instructions: [{ type: 'Volta', number: 2 }] }, // 5 - Second ending
        {}, // 6
        { instructions: [{ type: 'DaCapo' }] }, // 7
      ]);
      
      navigator = new RepeatNavigator(osmd);
      const order = navigator.generatePlayOrder(8);
      
      // Should include volta (ending) handling
      expect(order).toContain(3); // First ending
      expect(order).toContain(5); // Second ending
      expect(order.filter(m => m === 0).length).toBeGreaterThan(1); // D.C. executed
    });
  });
  
  describe('State Management', () => {
    test('should reset navigation state', () => {
      const osmd = createMockOSMD([
        {},
        { repeatStartLine: true },
        {},
        { repeatEndLine: true },
        {}
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // First navigation
      expect(navigator.getNextMeasure(3)).toBe(1); // Jump back
      
      // Reset
      navigator.reset();
      
      // Should jump again after reset
      expect(navigator.getNextMeasure(3)).toBe(1);
    });
    
    test('should track current playback path', () => {
      const osmd = createMockOSMD([
        {},
        { repeatStartLine: true },
        {},
        { repeatEndLine: true },
        {}
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      const path = navigator.getCurrentPath();
      expect(path).toEqual([]);
      
      navigator.getNextMeasure(0);
      navigator.getNextMeasure(1);
      
      const updatedPath = navigator.getCurrentPath();
      expect(updatedPath.length).toBeGreaterThan(0);
    });
    
    test('should provide repeat status information', () => {
      const osmd = createMockOSMD([
        {},
        { repeatStartLine: true },
        {},
        { repeatEndLine: true },
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      const status = navigator.getRepeatStatus(3);
      expect(status).toEqual({
        isRepeatEnd: true,
        hasBeenVisited: false,
        targetMeasure: 1
      });
      
      navigator.getNextMeasure(3); // Visit the repeat
      
      const statusAfter = navigator.getRepeatStatus(3);
      expect(statusAfter.hasBeenVisited).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle missing OSMD data gracefully', () => {
      const invalidOsmd = { GraphicSheet: null };
      
      expect(() => new RepeatNavigator(invalidOsmd)).not.toThrow();
      
      navigator = new RepeatNavigator(invalidOsmd);
      expect(navigator.getNextMeasure(0)).toBe(1); // Default behavior
    });
    
    test('should handle invalid measure indices', () => {
      const osmd = createMockOSMD([{}, {}, {}]);
      navigator = new RepeatNavigator(osmd);
      
      expect(navigator.getNextMeasure(-1)).toBe(0);
      expect(navigator.getNextMeasure(999)).toBe(null);
    });
    
    test('should handle malformed repeat structures', () => {
      const osmd = createMockOSMD([
        { repeatEndLine: true }, // End without start
        {},
        { repeatStartLine: true }, // Start without end
      ]);
      
      navigator = new RepeatNavigator(osmd);
      
      // Should not crash and provide sensible defaults
      expect(navigator.getNextMeasure(0)).toBe(1);
      expect(navigator.getNextMeasure(2)).toBe(3);
    });
  });
});