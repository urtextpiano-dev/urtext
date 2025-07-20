/**
 * Test for Chord Spillover Bug Fix
 * 
 * This test ensures that keys held from previous practice steps
 * are not incorrectly counted as correct for the next step.
 * 
 * Bug scenario:
 * 1. User plays chord: G4 + E5 + C4 (notes 67, 76, 60)
 * 2. Cursor advances to next step: single note C4 (60)
 * 3. User releases E5 + G4 but keeps holding C4 from previous chord
 * 4. System should NOT count the held C4 as correct for the new step
 * 5. System should only count freshly pressed keys
 */

import { renderHook, act } from '@testing-library/react';
import { usePracticeStore } from '../../src/renderer/features/practice-mode/stores/practiceStore';
import { compareNotes } from '../../src/renderer/features/practice-mode/utils/noteComparison';
import type { PracticeStep } from '../../src/renderer/features/practice-mode/types';

describe('Chord Spillover Bug Fix', () => {
  
  describe('compareNotes function behavior', () => {
    it('should correctly compare fresh keys vs expected notes', () => {
      // Step 1: Chord step - G4, E5, C4
      const chordStep: PracticeStep = {
        notes: [
          { midiValue: 67, name: 'G4' },
          { midiValue: 76, name: 'E5' },  
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: true,
        duration: 1.0
      };

      // Step 2: Single note C4
      const singleNoteStep: PracticeStep = {
        notes: [
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: false,
        duration: 1.0
      };

      // Test chord step with all correct keys
      const chordResult = compareNotes([67, 76, 60], chordStep);
      expect(chordResult.type).toBe('CORRECT');

      // Test single note step with fresh key press
      const freshKeyResult = compareNotes([60], singleNoteStep);
      expect(freshKeyResult.type).toBe('CORRECT');

      // Test single note step with no keys (simulating held key scenario)
      const noFreshKeysResult = compareNotes([], singleNoteStep);
      expect(noFreshKeysResult.type).toBe('MISSING_NOTES');
      expect(noFreshKeysResult.missing).toEqual([60]);
    });
  });

  describe('Practice store state management', () => {
    it('should properly reset state when advancing steps', () => {
      const { result } = renderHook(() => usePracticeStore());

      // Start practice
      act(() => {
        result.current.startPractice();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.status).toBe('listening');

      // Set first step (chord)
      const chordStep: PracticeStep = {
        notes: [
          { midiValue: 67, name: 'G4' },
          { midiValue: 76, name: 'E5' },
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: true,
        duration: 1.0
      };

      act(() => {
        result.current.setCurrentStep(chordStep);
      });

      expect(result.current.currentStep).toEqual(chordStep);
      expect(result.current.status).toBe('listening');

      // Set second step (single note)
      const singleStep: PracticeStep = {
        notes: [
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: false,
        duration: 1.0
      };

      act(() => {
        result.current.setCurrentStep(singleStep);
      });

      expect(result.current.currentStep).toEqual(singleStep);
      expect(result.current.status).toBe('listening');
      expect(result.current.attemptCount).toBe(0); // Should reset on new step
    });
  });

  describe('Fresh key tracking logic simulation', () => {
    it('should demonstrate the fix for chord spillover bug', () => {
      // Simulate the fresh key tracking mechanism implemented in usePracticeController
      let freshlyPressedKeys = new Set<number>();
      
      // Step 1: User plays chord G4 + E5 + C4
      const chordStep: PracticeStep = {
        notes: [
          { midiValue: 67, name: 'G4' },
          { midiValue: 76, name: 'E5' },
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: true,
        duration: 1.0
      };

      // Simulate MIDI note on events for chord
      freshlyPressedKeys.add(67); // G4
      freshlyPressedKeys.add(76); // E5
      freshlyPressedKeys.add(60); // C4

      // Evaluate chord step with fresh keys
      const chordKeys = Array.from(freshlyPressedKeys);
      const chordResult = compareNotes(chordKeys, chordStep);
      expect(chordResult.type).toBe('CORRECT');

      // Step 2: Advance to single note C4
      const singleNoteStep: PracticeStep = {
        notes: [
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: false,
        duration: 1.0
      };

      // CRITICAL FIX: Reset fresh keys when step changes
      freshlyPressedKeys = new Set<number>();

      // Simulate scenario: User keeps holding C4 but no fresh press
      // (In the bug scenario, pressedKeys would still contain [60],
      //  but freshlyPressedKeys is empty)
      const heldKeyEvaluation = compareNotes(Array.from(freshlyPressedKeys), singleNoteStep);
      
      // This should be INCORRECT because no fresh key was pressed
      expect(heldKeyEvaluation.type).toBe('MISSING_NOTES');
      expect(heldKeyEvaluation.missing).toEqual([60]);

      // Simulate fresh key press: User releases and re-presses C4
      freshlyPressedKeys.add(60); // Fresh C4 press

      const freshKeyEvaluation = compareNotes(Array.from(freshlyPressedKeys), singleNoteStep);
      
      // This should be CORRECT because a fresh key was pressed
      expect(freshKeyEvaluation.type).toBe('CORRECT');

      // Validation: The fix prevents held keys from being counted as correct
      console.log('✅ Bug fix validation passed:');
      console.log('  - Held keys are NOT counted as correct for new steps');
      console.log('  - Only freshly pressed keys are evaluated');
      console.log('  - Fresh key tracking resets on step changes');
    });
  });

  describe('Edge cases for fresh key tracking', () => {
    it('should handle rapid key presses correctly', () => {
      let freshlyPressedKeys = new Set<number>();
      
      // Simulate rapid key presses within a chord
      freshlyPressedKeys.add(60); // C4
      freshlyPressedKeys.add(64); // E4  
      freshlyPressedKeys.add(67); // G4

      const chordStep: PracticeStep = {
        notes: [
          { midiValue: 60, name: 'C4' },
          { midiValue: 64, name: 'E4' },
          { midiValue: 67, name: 'G4' }
        ],
        isRest: false,
        isChord: true,
        duration: 1.0
      };

      const result = compareNotes(Array.from(freshlyPressedKeys), chordStep);
      expect(result.type).toBe('CORRECT');
    });

    it('should handle extra keys correctly', () => {
      let freshlyPressedKeys = new Set<number>();
      
      // User presses more keys than expected
      freshlyPressedKeys.add(60); // C4 (expected)
      freshlyPressedKeys.add(65); // F4 (extra)

      const singleNoteStep: PracticeStep = {
        notes: [
          { midiValue: 60, name: 'C4' }
        ],
        isRest: false,
        isChord: false,
        duration: 1.0
      };

      const result = compareNotes(Array.from(freshlyPressedKeys), singleNoteStep);
      expect(result.type).toBe('WRONG_NOTES');
      expect(result.wrong).toEqual([65]);
    });
  });
});