/**
 * Version Practice Mode Types and Interfaces Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - types don't exist
 * 2. GREEN: Create types in src/renderer/features/practice-mode/types/index.ts
 * 3. REFACTOR: Ensure types are well-documented and exported
 */

import { describe, test, expect } from '@jest/globals';

// These imports will fail until implementation
import type {
  PracticeNote,
  PracticeStep,
  ComparisonResult,
  PracticeStatus,
  PracticeState,
  PracticeStepResult
} from '@/renderer/features/practice-mode/types';

describe('Version Practice Mode Types', () => {
  test('should export PracticeNote interface', () => {
    // TypeScript compilation will verify the interface shape
const note: PracticeNote = {
  midiValue: 60, // Middle C
  pitchName: 'C4',
  octave: 4
};

// Verify required properties
expect(note.midiValue).toBe(60);
expect(note.pitchName).toBe('C4');
expect(note.octave).toBe(4);
  });

  test('should export PracticeStep interface', () => {
    const step: PracticeStep = {
  notes: [
    { midiValue: 60, pitchName: 'C4', octave: 4 },
    { midiValue: 64, pitchName: 'E4', octave: 4 }
  ],
  isChord: true,
  isRest: false,
  measureIndex: 0,
  timestamp: Date.now()
};

expect(step.notes).toHaveLength(2);
expect(step.isChord).toBe(true);
expect(step.isRest).toBe(false);
  });

  test('should export ComparisonResult union type', () => {
    // Test all variants of the union
const correct: ComparisonResult = { type: 'CORRECT' };
const missing: ComparisonResult = { 
  type: 'MISSING_NOTES', 
  missing: [60, 64] 
};
const extra: ComparisonResult = { 
  type: 'EXTRA_NOTES', 
  extra: [61, 65] 
};
const wrong: ComparisonResult = { 
  type: 'WRONG_NOTES', 
  wrong: [61], 
  expected: [60] 
};

expect(correct.type).toBe('CORRECT');
expect(missing.missing).toEqual([60, 64]);
expect(extra.extra).toEqual([61, 65]);
expect(wrong.wrong).toEqual([61]);
  });

  test('should export PracticeStatus type', () => {
    // All valid status values
const statuses: PracticeStatus[] = [
  'idle',
  'listening',
  'evaluating',
  'feedback_correct',
  'feedback_incorrect'
];

statuses.forEach(status => {
  expect(typeof status).toBe('string');
});
  });

  test('should export PracticeState interface', () => {
    const state: PracticeState = {
  isActive: true,
  status: 'listening',
  currentStep: {
    notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
    isChord: false,
    isRest: false,
    measureIndex: 0,
    timestamp: Date.now()
  },
  pressedKeys: new Set([60, 64]),
  lastResult: { type: 'CORRECT' },
  attemptCount: 1,
  hasRepeats: false
};

expect(state.isActive).toBe(true);
expect(state.status).toBe('listening');
expect(state.pressedKeys).toBeInstanceOf(Set);
expect(state.pressedKeys.size).toBe(2);
  });

  test('should export PracticeStepResult union type', () => {
    // Test both variants
const stepResult: PracticeStepResult = {
  notes: [],
  isChord: false,
  isRest: true,
  measureIndex: 5,
  timestamp: Date.now()
};

const endResult: PracticeStepResult = { type: 'END_OF_SCORE' };

// Type guard would be:
if ('type' in stepResult && stepResult.type === 'END_OF_SCORE') {
  expect(stepResult.type).toBe('END_OF_SCORE');
} else {
  expect(stepResult.notes).toBeDefined();
}
  });

  test('should handle MIDI value ranges correctly', () => {
    // MIDI values should be 0-127
const lowNote: PracticeNote = {
  midiValue: 0,
  pitchName: 'C-1',
  octave: -1
};

const highNote: PracticeNote = {
  midiValue: 127,
  pitchName: 'G9',
  octave: 9
};

expect(lowNote.midiValue).toBeGreaterThanOrEqual(0);
expect(highNote.midiValue).toBeLessThanOrEqual(127);
  });

  test('should support rest notes in PracticeStep', () => {
    const restStep: PracticeStep = {
  notes: [], // Empty array for rests
  isChord: false,
  isRest: true,
  measureIndex: 2,
  timestamp: Date.now()
};

expect(restStep.notes).toHaveLength(0);
expect(restStep.isRest).toBe(true);
expect(restStep.isChord).toBe(false);
  });
});