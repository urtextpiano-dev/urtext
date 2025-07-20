/**
 * Phase 2: Enhanced Piano Key Highlighting Tests
 * 
 * Requirements:
 * - Blue highlights for expected notes (before playing)
 * - Green highlights for correctly played notes
 * - Red highlights for incorrect notes
 * - Smooth color transitions
 * - Clear visual feedback without obscuring key labels
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act, waitFor } from '@testing-library/react';

// Components and hooks
import { PianoKeyboard } from '@/renderer/components/PianoKeyboard';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import { usePianoStore } from '@/renderer/stores/pianoStore';
import { usePiano } from '@/renderer/hooks/usePiano';
import { useMidi } from '@/renderer/hooks/useMidi';
import type { PracticeStep, ComparisonResult } from '@/renderer/features/practice-mode/types';

// Mock dependencies
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');
jest.mock('@/renderer/hooks/useMidi');
jest.mock('@/renderer/services/PianoKeyAnimator');
jest.mock('@/renderer/stores/pianoStore');
jest.mock('@/renderer/hooks/usePiano');

// Mock PianoKey component to avoid complexity
jest.mock('@/renderer/components/PianoKey', () => ({
  PianoKey: jest.fn(({ keyData }: any) => (
    <button 
      data-testid={`piano-key-${keyData.id}`}
      data-midi-note={keyData.midiNote || '0'}
      className="piano-key"
    >
      {keyData.fullName}
    </button>
  ))
}));

describe('Phase 2: Enhanced Piano Key Highlighting', () => {
  let mockPracticeStore: any;
  let mockMidiHook: any;
  let mockAnimator: any;
  let mockPianoStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock practice store
    mockPracticeStore = {
      isActive: false,
      status: 'idle',
      currentStep: null,
      lastResult: null,
      pressedKeys: new Set<number>(),
    };
    (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue(mockPracticeStore);
    
    // Mock piano store for key press tracking
    mockPianoStore = {
      activeNotes: new Map<number, number>(),
      pressNote: jest.fn(),
      releaseNote: jest.fn(),
      resetAllNotes: jest.fn(),
    };
    (usePianoStore as jest.MockedFunction<typeof usePianoStore>).mockReturnValue(mockPianoStore);
    
    // Mock MIDI hook
    mockMidiHook = {
      pressedKeys: new Set<number>(),
      devices: [],
      isConnected: false,
    };
    (useMidi as jest.Mock).mockReturnValue(mockMidiHook);
    
    // Mock animator
    const { PianoKeyAnimator } = require('@/renderer/services/PianoKeyAnimator');
    mockAnimator = {
      highlightKey: jest.fn(),
      unhighlightKey: jest.fn(),
      setPracticeHighlight: jest.fn(),
      clearPracticeHighlights: jest.fn(),
      setKeyState: jest.fn(),
    };
    PianoKeyAnimator.mockReturnValue(mockAnimator);
    
    // Mock usePiano hook to return a minimal set of keys
    const mockKeys = [
      { id: 'C4', type: 'white', fullName: 'C4', whiteKeyIndex: 39, midiNote: 60 },
      { id: 'E4', type: 'white', fullName: 'E4', whiteKeyIndex: 41, midiNote: 64 },
      { id: 'G4', type: 'white', fullName: 'G4', whiteKeyIndex: 43, midiNote: 67 },
    ];
    (usePiano as jest.MockedFunction<typeof usePiano>).mockReturnValue({
      keys: mockKeys,
      whiteKeys: mockKeys,
      blackKeys: []
    });
  });

  test('should show blue highlights for expected notes when practice is active', () => {
    const expectedStep: PracticeStep = {
      notes: [
        { midiValue: 60, pitchName: 'C4', octave: 4 },
        { midiValue: 64, pitchName: 'E4', octave: 4 }
      ],
      isChord: true,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = expectedStep;
    
    render(<PianoKeyboard />);
    
    // Should highlight expected notes in blue
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'expected');
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(64, 'expected');
  });

  test('should clear highlights when practice mode is deactivated', () => {
    mockPracticeStore.isActive = true;
    mockPracticeStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const { rerender } = render(<PianoKeyboard />);
    
    // Deactivate practice mode
    mockPracticeStore.isActive = false;
    mockPracticeStore.currentStep = null;
    rerender(<PianoKeyboard />);
    
    expect(mockAnimator.clearPracticeHighlights).toHaveBeenCalled();
  });

  test('should show green highlight for correctly played notes', async () => {
    const expectedStep: PracticeStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = expectedStep;
    
    const { rerender } = render(<PianoKeyboard />);
    
    // Verify initial highlight
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'expected');
    
    // Simulate correct note played - update the mock return value
    act(() => {
      (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue({
        ...mockPracticeStore,
        status: 'feedback_correct',
        lastResult: { type: 'CORRECT' }
      });
    });
    
    // Force rerender
    rerender(<PianoKeyboard />);
    
    await waitFor(() => {
      expect(mockAnimator.clearPracticeHighlights).toHaveBeenCalled();
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'correct');
    });
  });

  test('should show red highlight for incorrect notes', async () => {
    const expectedStep: PracticeStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const wrongResult: ComparisonResult = {
      type: 'WRONG_NOTES',
      wrong: [61], // C# instead of C
      expected: [60]
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = expectedStep;
    
    const { rerender } = render(<PianoKeyboard />);
    
    // Simulate wrong note played - update the mock return value
    act(() => {
      (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue({
        ...mockPracticeStore,
        status: 'feedback_incorrect',
        lastResult: wrongResult
      });
    });
    
    // Force rerender
    rerender(<PianoKeyboard />);
    
    await waitFor(() => {
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(61, 'incorrect');
      // Expected note should still be highlighted
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'expected');
    });
  });

  test('should handle chord highlighting correctly', async () => {
    const chordStep: PracticeStep = {
      notes: [
        { midiValue: 60, pitchName: 'C4', octave: 4 },
        { midiValue: 64, pitchName: 'E4', octave: 4 },
        { midiValue: 67, pitchName: 'G4', octave: 4 }
      ],
      isChord: true,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = chordStep;
    
    const { rerender } = render(<PianoKeyboard />);
    
    // All chord notes should be highlighted as expected
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'expected');
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(64, 'expected');
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(67, 'expected');
    
    // Simulate partial chord played (missing one note)
    const partialResult: ComparisonResult = {
      type: 'MISSING_NOTES',
      missing: [67]
    };
    
    act(() => {
      (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue({
        ...mockPracticeStore,
        status: 'feedback_incorrect',
        lastResult: partialResult
      });
    });
    
    // Force rerender
    rerender(<PianoKeyboard />);
    
    await waitFor(() => {
      // Played notes should be correct
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'correct');
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(64, 'correct');
      // Missing note should remain expected
      expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(67, 'expected');
    });
  });

  test('should not highlight keys during rest', () => {
    const restStep: PracticeStep = {
      notes: [],
      isChord: false,
      isRest: true,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = restStep;
    
    render(<PianoKeyboard />);
    
    // Should clear all highlights during rest
    expect(mockAnimator.clearPracticeHighlights).toHaveBeenCalled();
    expect(mockAnimator.setPracticeHighlight).not.toHaveBeenCalled();
  });

  test('should transition highlights smoothly between steps', async () => {
    const step1: PracticeStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const step2: PracticeStep = {
      notes: [{ midiValue: 62, pitchName: 'D4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 1,
      timestamp: Date.now()
    };
    
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = step1;
    
    const { rerender } = render(<PianoKeyboard />);
    
    // Move to next step
    act(() => {
      mockPracticeStore.currentStep = step2;
    });
    rerender(<PianoKeyboard />);
    
    // Should clear previous and highlight new
    expect(mockAnimator.clearPracticeHighlights).toHaveBeenCalled();
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(62, 'expected');
  });

  test('should maintain normal key press highlights alongside practice highlights', () => {
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    // User is pressing a different key
    mockPianoStore.activeNotes.set(65, 1); // F4 is pressed
    
    render(<PianoKeyboard />);
    
    // Should show both practice highlight and pressed key
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(60, 'expected');
    expect(mockAnimator.highlightKey).toHaveBeenCalledWith(65, expect.any(Number));
  });

  test('should handle highlight cleanup on unmount', () => {
    mockPracticeStore.isActive = true;
    mockPracticeStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const { unmount } = render(<PianoKeyboard />);
    
    unmount();
    
    expect(mockAnimator.clearPracticeHighlights).toHaveBeenCalled();
  });

  test('should apply CSS classes for different highlight states', () => {
    mockPracticeStore.isActive = true;
    mockPracticeStore.status = 'listening';
    mockPracticeStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<PianoKeyboard />);
    
    // Verify CSS class application through animator
    expect(mockAnimator.setPracticeHighlight).toHaveBeenCalledWith(
      60, 
      'expected'
    );
    
    // The animator should handle CSS classes internally
    // Classes should be: 
    // - .key--practice-expected (blue)
    // - .key--practice-correct (green)
    // - .key--practice-incorrect (red)
  });

  test('should not interfere with non-practice mode operation', () => {
    mockPracticeStore.isActive = false;
    // C major chord is pressed - set the map values
    mockPianoStore.activeNotes.set(60, 1); // C4
    mockPianoStore.activeNotes.set(64, 1); // E4
    mockPianoStore.activeNotes.set(67, 1); // G4
    
    render(<PianoKeyboard />);
    
    // Should only show normal highlights, no practice highlights
    expect(mockAnimator.highlightKey).toHaveBeenCalledTimes(3);
    expect(mockAnimator.setPracticeHighlight).not.toHaveBeenCalled();
  });
});