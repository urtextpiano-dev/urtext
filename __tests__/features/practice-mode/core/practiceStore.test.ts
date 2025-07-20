/**
 * Version Practice Store Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - store doesn't exist
 * 2. GREEN: Create Zustand store in src/renderer/features/practice-mode/stores/practiceStore.ts
 * 3. REFACTOR: Optimize state updates and ensure immutability
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// These imports will fail until implementation
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { PracticeStep, ComparisonResult } from '@/renderer/features/practice-mode/types';

describe('Version Practice Store Implementation', () => {
  beforeEach(() => {
    // Reset store state before each test
    if (typeof usePracticeStore !== 'undefined') {
      // Reset by calling stopPractice which returns to initial state
      usePracticeStore.getState().stopPractice();
    }
  });

  test('should create store with initial state', () => {
      const { result } = renderHook(() => usePracticeStore());
      const state = result.current;

      expect(state.isActive).toBe(false);
      expect(state.status).toBe('idle');
      expect(state.currentStep).toBeNull();
      expect(state.pressedKeys).toBeInstanceOf(Set);
      expect(state.pressedKeys.size).toBe(0);
      expect(state.lastResult).toBeNull();
      expect(state.attemptCount).toBe(0);
      expect(state.hasRepeats).toBe(false);
  });

  test('should start practice mode', () => {
      const { result } = renderHook(() => usePracticeStore());

      act(() => {
        result.current.startPractice();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.status).toBe('listening');
      expect(result.current.attemptCount).toBe(0);
  });

  test('should stop practice mode', () => {
      const { result } = renderHook(() => usePracticeStore());

      // Start first
      act(() => {
        result.current.startPractice();
        result.current.setCurrentStep({
          notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
          isChord: false,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        });
      });

      // Then stop
      act(() => {
        result.current.stopPractice();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.status).toBe('idle');
      expect(result.current.currentStep).toBeNull();
      expect(result.current.lastResult).toBeNull();
  });

  test('should set current step', () => {
      const { result } = renderHook(() => usePracticeStore());

      const step: PracticeStep = {
        notes: [
          { midiValue: 60, pitchName: 'C4', octave: 4 },
          { midiValue: 64, pitchName: 'E4', octave: 4 }
        ],
        isChord: true,
        isRest: false,
        measureIndex: 1,
        timestamp: Date.now()
      };

      act(() => {
        result.current.setCurrentStep(step);
      });

      expect(result.current.currentStep).toEqual(step);
      expect(result.current.status).toBe('listening');
      expect(result.current.lastResult).toBeNull();
  });

  test('should update pressed keys', () => {
      const { result } = renderHook(() => usePracticeStore());

      act(() => {
        result.current.updatePressedKeys([60, 64, 67]);
      });

      expect(result.current.pressedKeys.size).toBe(3);
      expect(result.current.pressedKeys.has(60)).toBe(true);
      expect(result.current.pressedKeys.has(64)).toBe(true);
      expect(result.current.pressedKeys.has(67)).toBe(true);

      // Update with different keys
      act(() => {
        result.current.updatePressedKeys([60, 65]);
      });

      expect(result.current.pressedKeys.size).toBe(2);
      expect(result.current.pressedKeys.has(60)).toBe(true);
      expect(result.current.pressedKeys.has(65)).toBe(true);
      expect(result.current.pressedKeys.has(64)).toBe(false);
  });

  test('should set comparison result - correct', () => {
      const { result } = renderHook(() => usePracticeStore());

      const correctResult: ComparisonResult = { type: 'CORRECT' };

      act(() => {
        result.current.setResult(correctResult);
      });

      expect(result.current.lastResult).toEqual(correctResult);
      expect(result.current.status).toBe('feedback_correct');
      expect(result.current.attemptCount).toBe(1);
  });

  test('should set comparison result - incorrect', () => {
      const { result } = renderHook(() => usePracticeStore());

      const incorrectResult: ComparisonResult = {
        type: 'WRONG_NOTES',
        wrong: [61],
        expected: [60]
      };

      act(() => {
        result.current.setResult(incorrectResult);
      });

      expect(result.current.lastResult).toEqual(incorrectResult);
      expect(result.current.status).toBe('feedback_incorrect');
      expect(result.current.attemptCount).toBe(1);
  });

  test('should increment attempt count on each result', () => {
      const { result } = renderHook(() => usePracticeStore());

      act(() => {
        result.current.setResult({ type: 'CORRECT' });
      });
      expect(result.current.attemptCount).toBe(1);

      act(() => {
        result.current.setResult({ type: 'MISSING_NOTES', missing: [64] });
      });
      expect(result.current.attemptCount).toBe(2);

      act(() => {
        result.current.setResult({ type: 'CORRECT' });
      });
      expect(result.current.attemptCount).toBe(3);
  });

  test('should set status independently', () => {
      const { result } = renderHook(() => usePracticeStore());

      const statuses = [
        'idle',
        'listening',
        'evaluating',
        'feedback_correct',
        'feedback_incorrect'
      ] as const;

      statuses.forEach(status => {
        act(() => {
          result.current.setStatus(status);
        });
        expect(result.current.status).toBe(status);
      });
  });

  test('should reset attempt count', () => {
      const { result } = renderHook(() => usePracticeStore());

      // Set some attempts
      act(() => {
        result.current.setResult({ type: 'CORRECT' });
        result.current.setResult({ type: 'CORRECT' });
        result.current.setResult({ type: 'CORRECT' });
      });
      expect(result.current.attemptCount).toBe(3);

      // Reset
      act(() => {
        result.current.resetAttempts();
      });
      expect(result.current.attemptCount).toBe(0);
  });

  test('should handle state transitions correctly', () => {
      const { result } = renderHook(() => usePracticeStore());

      // Start practice
      act(() => {
        result.current.startPractice();
      });
      expect(result.current.status).toBe('listening');

      // Set current step
      act(() => {
        result.current.setCurrentStep({
          notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
          isChord: false,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        });
      });
      expect(result.current.status).toBe('listening');

      // Transition to evaluating
      act(() => {
        result.current.setStatus('evaluating');
      });
      expect(result.current.status).toBe('evaluating');

      // Set result
      act(() => {
        result.current.setResult({ type: 'CORRECT' });
      });
      expect(result.current.status).toBe('feedback_correct');
  });

  test('should handle repeat detection flag', () => {
      const { result } = renderHook(() => usePracticeStore());

      expect(result.current.hasRepeats).toBe(false);

      // This would be set when OSMD detects repeats
      act(() => {
        result.current.setHasRepeats(true);
      });
      expect(result.current.hasRepeats).toBe(true);

      // In Phase 1, we just track whether there are repeats
      // Acknowledgement will be added in later phases
      expect(result.current.hasRepeats).toBe(true);
  });

  test('should maintain immutability of pressed keys set', () => {
      const { result } = renderHook(() => usePracticeStore());

      act(() => {
        result.current.updatePressedKeys([60, 64]);
      });

      const firstSet = result.current.pressedKeys;

      act(() => {
        result.current.updatePressedKeys([60, 64, 67]);
      });

      const secondSet = result.current.pressedKeys;

      // Should be different Set instances
      expect(firstSet).not.toBe(secondSet);
      expect(firstSet.size).toBe(2);
      expect(secondSet.size).toBe(3);
  });

  test('should handle null step correctly', () => {
      const { result } = renderHook(() => usePracticeStore());

      act(() => {
        result.current.setCurrentStep({
          notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
          isChord: false,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        });
      });

      expect(result.current.currentStep).not.toBeNull();

      act(() => {
        result.current.setCurrentStep(null);
      });

      expect(result.current.currentStep).toBeNull();
  });
});