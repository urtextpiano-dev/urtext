/**
 * Phase 1: OSMD Hook Extension Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - getExpectedNotesAtCursor method doesn't exist
 * 2. GREEN: Extend useOSMD hook in src/renderer/hooks/useOSMD.ts
 * 3. REFACTOR: Optimize cursor operations for performance
 * 
 * CRITICAL: Must handle end of score and null cursor gracefully
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// Mock OSMD
jest.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: jest.fn()
}));

// Mock ResizeObserver
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// These imports will fail until implementation
import { useOSMD } from '@/renderer/hooks/useOSMD';
import type { PracticeStepResult } from '@/renderer/features/practice-mode/types';

describe('Phase 1: OSMD Hook Extension for Practice Mode', () => {
  let mockOSMDInstance: any;
  let mockCursor: any;
  let mockIterator: any;
  let containerRef: React.RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    // Create mock OSMD structure
    mockIterator = {
      endReached: false,
      EndReached: false,
      CurrentVoiceEntries: [],
      currentMeasureIndex: 0
    };

    mockCursor = {
      iterator: mockIterator,
      show: jest.fn(),
      hide: jest.fn(),
      next: jest.fn(),
      previous: jest.fn(),
      resetIterator: jest.fn(),
      update: jest.fn(),
      visible: false
    };

    mockOSMDInstance = {
      cursors: [mockCursor],
      GraphicSheet: {
        MeasureList: []
      },
      enableOrDisableCursors: jest.fn(),
      load: jest.fn(() => Promise.resolve()),
      render: jest.fn(),
      clear: jest.fn()
    };

    // Mock OpenSheetMusicDisplay constructor
    const { OpenSheetMusicDisplay } = require('opensheetmusicdisplay');
    OpenSheetMusicDisplay.mockImplementation(() => mockOSMDInstance);

    // Create container ref with proper dimensions
    const container = document.createElement('div');
    // Mock getBoundingClientRect to return dimensions
    container.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    containerRef = React.createRef();
    Object.defineProperty(containerRef, 'current', {
      value: container,
      writable: true
    });
  });

  // Type guard helper
  function assertPracticeStep(result: PracticeStepResult): asserts result is Exclude<PracticeStepResult, { type: 'END_OF_SCORE' }> {
    if ('type' in result && result.type === 'END_OF_SCORE') {
      throw new Error('Expected PracticeStep but got END_OF_SCORE');
    }
  }

  test('should extend OSMDControls with getExpectedNotesAtCursor method', async () => {
    const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
    
    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    
    expect(result.current.controls).toHaveProperty('getExpectedNotesAtCursor');
    expect(typeof result.current.controls.getExpectedNotesAtCursor).toBe('function');
  });

  test('should return notes at current cursor position', async () => {
      // Setup mock voice entries with notes
      const mockNote1 = {
        halfTone: 0, // C4 = 60 in MIDI
        Pitch: {
          toString: () => 'C4',
          Octave: 4
        },
        Tie: null
      };

      const mockNote2 = {
        halfTone: 4, // E4 = 64 in MIDI
        Pitch: {
          toString: () => 'E4',
          Octave: 4
        },
        Tie: null
      };

      const mockVoiceEntry = {
        Notes: [mockNote1, mockNote2],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      assertPracticeStep(stepResult);
      
      expect(stepResult.notes).toHaveLength(2);
      expect(stepResult.notes[0]).toEqual({
        midiValue: 60,
        pitchName: 'C4',
        octave: 4
      });
      expect(stepResult.notes[1]).toEqual({
        midiValue: 64,
        pitchName: 'E4',
        octave: 4
      });
      expect(stepResult.isChord).toBe(true);
      expect(stepResult.isRest).toBe(false);
  });

  test('should handle end of score', () => {
    mockIterator.endReached = true;
    mockIterator.EndReached = true;

    const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
    const stepResult = result.current.controls.getExpectedNotesAtCursor();

    expect(stepResult).toEqual({ type: 'END_OF_SCORE' });
  });

  test('should handle null cursor', () => {
    mockOSMDInstance.cursors = null;

    const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
    const stepResult = result.current.controls.getExpectedNotesAtCursor();

    expect(stepResult).toEqual({ type: 'END_OF_SCORE' });
  });

  test('should handle empty cursor array', () => {
    mockOSMDInstance.cursors = [];

    const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
    const stepResult = result.current.controls.getExpectedNotesAtCursor();

    expect(stepResult).toEqual({ type: 'END_OF_SCORE' });
  });

  test('should handle null CurrentVoiceEntries', async () => {
    mockIterator.CurrentVoiceEntries = null;

    const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
    
    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    
    const stepResult = result.current.controls.getExpectedNotesAtCursor();

    // When CurrentVoiceEntries is null, it's treated as a rest
    assertPracticeStep(stepResult);
    expect(stepResult.notes).toHaveLength(0);
    expect(stepResult.isRest).toBe(true);
  });

  test('should identify rests correctly', async () => {
      // Empty voice entries = rest
      mockIterator.CurrentVoiceEntries = [];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      assertPracticeStep(stepResult);
      expect(stepResult.notes).toHaveLength(0);
      expect(stepResult.isRest).toBe(true);
      expect(stepResult.isChord).toBe(false);
  });

  test('should skip grace notes', async () => {
      const mockGraceNote = {
        halfTone: 0,
        Pitch: { toString: () => 'C4', Octave: 4 },
        Tie: null
      };

      const mockRegularNote = {
        halfTone: 2,
        Pitch: { toString: () => 'D4', Octave: 4 },
        Tie: null
      };

      const mockVoiceEntry = {
        Notes: [mockGraceNote],
        IsGrace: true // This is a grace note entry
      };

      const mockRegularEntry = {
        Notes: [mockRegularNote],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry, mockRegularEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      // Should only include the regular note
      assertPracticeStep(stepResult);
      expect(stepResult.notes).toHaveLength(1);
      expect(stepResult.notes[0].midiValue).toBe(62); // D4
  });

  test('should skip tied note continuations', async () => {
      const startNote = {
        halfTone: 0,
        Pitch: { toString: () => 'C4', Octave: 4 },
        Tie: null
      };

      const tiedNote = {
        halfTone: 0,
        Pitch: { toString: () => 'C4', Octave: 4 },
        Tie: {
          StartNote: startNote // This is a continuation
        }
      };

      const mockVoiceEntry = {
        Notes: [startNote, tiedNote],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      // Should only include the start note
      assertPracticeStep(stepResult);
      expect(stepResult.notes).toHaveLength(1);
      expect(stepResult.notes[0].midiValue).toBe(60);
  });

  test('should handle multiple voices (both hands)', async () => {
      // Right hand voice
      const rightHandEntry = {
        Notes: [{
          halfTone: 0, // C4
          Pitch: { toString: () => 'C4', Octave: 4 },
          Tie: null
        }],
        IsGrace: false
      };

      // Left hand voice
      const leftHandEntry = {
        Notes: [{
          halfTone: -12, // C3
          Pitch: { toString: () => 'C3', Octave: 3 },
          Tie: null
        }],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [rightHandEntry, leftHandEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      assertPracticeStep(stepResult);
      expect(stepResult.notes).toHaveLength(2);
      expect(stepResult.notes[0].midiValue).toBe(60); // C4
      expect(stepResult.notes[1].midiValue).toBe(48); // C3
      expect(stepResult.isChord).toBe(true);
  });

  test('should provide correct measure index', async () => {
      mockIterator.currentMeasureIndex = 5;

      const mockVoiceEntry = {
        Notes: [{
          halfTone: 0,
          Pitch: { toString: () => 'C4', Octave: 4 },
          Tie: null
        }],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      assertPracticeStep(stepResult);
      expect(stepResult.measureIndex).toBe(5);
  });

  test('should include timestamp', async () => {
      const beforeTime = Date.now();

      const mockVoiceEntry = {
        Notes: [{
          halfTone: 0,
          Pitch: { toString: () => 'C4', Octave: 4 },
          Tie: null
        }],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      const afterTime = Date.now();

      assertPracticeStep(stepResult);
      expect(stepResult.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(stepResult.timestamp).toBeLessThanOrEqual(afterTime);
  });

  test('should handle octave extremes correctly', async () => {
      const veryLowNote = {
        halfTone: -48, // C1 (MIDI 12)
        Pitch: { toString: () => 'C1', Octave: 1 },
        Tie: null
      };

      const veryHighNote = {
        halfTone: 48, // C8 (MIDI 108)
        Pitch: { toString: () => 'C8', Octave: 8 },
        Tie: null
      };

      const mockVoiceEntry = {
        Notes: [veryLowNote, veryHighNote],
        IsGrace: false
      };

      mockIterator.CurrentVoiceEntries = [mockVoiceEntry];

      const { result } = renderHook(() => useOSMD(containerRef, '<xml>test</xml>'));
      
      // Wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });
      
      const stepResult = result.current.controls.getExpectedNotesAtCursor();

      assertPracticeStep(stepResult);
      expect(stepResult.notes[0].midiValue).toBe(12); // C1
      expect(stepResult.notes[0].octave).toBe(1);
      expect(stepResult.notes[1].midiValue).toBe(108); // C8
      expect(stepResult.notes[1].octave).toBe(8);
  });
});