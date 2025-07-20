/**
 * Practice Controller v2 Tests - State Machine Validation
 * 
 * Comprehensive test suite following ChatGPT O3's testing strategy:
 * 1. Pure reducer unit tests (state transitions)
 * 2. Integration tests with fake timers 
 * 3. Performance/latency validation
 * 4. Memory leak detection
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePracticeControllerV2 } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { MidiProvider } from '@/renderer/contexts/MidiContext';
import { OSMDProvider } from '@/renderer/contexts/OSMDContext';
import type { PracticeAction, PracticeState, PracticeStatus } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';

// Mock dependencies
jest.mock('@/renderer/services/LightweightLatencyMonitor', () => ({
  latencyMonitor: {
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
  },
}));

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => ({
    startPractice: jest.fn(),
    stopPractice: jest.fn(),
    setCurrentStep: jest.fn(),
    setStatus: jest.fn(),
    setResult: jest.fn(),
  }),
}));

jest.mock('@/renderer/contexts/MidiContext', () => ({
  useMidiContext: () => ({
    subscribeMidiEvents: jest.fn(() => jest.fn()), // Returns unsubscribe function
    isConnected: true,
    devices: [],
    status: 'ready',
    pressedKeys: new Set(),
    start: jest.fn(),
    stop: jest.fn(),
  }),
  MidiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => ({
    controls: mockOSMDControls,
    osmd: mockOSMD,
    isReady: true,
    detectRepeats: jest.fn(() => []),
    setOSMDInstance: jest.fn(),
    clearOSMDInstance: jest.fn(),
  }),
  OSMDProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock OSMD and MIDI contexts
const mockOSMDControls = {
  getExpectedNotesAtCursor: jest.fn(),
  nextCursorPosition: jest.fn(),
  showCursor: jest.fn(),
  hideCursor: jest.fn(),
};

const mockOSMD = {
  render: jest.fn(),
};

const mockMidiContext = {
  subscribeMidiEvents: jest.fn(() => jest.fn()), // Returns unsubscribe function
  isConnected: true,
  devices: [],
  status: 'ready',
  pressedKeys: new Set(),
  start: jest.fn(),
  stop: jest.fn(),
};

// Test wrapper component - simplified since we mock contexts
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

describe('usePracticeControllerV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mock returns
    mockOSMDControls.getExpectedNotesAtCursor.mockReturnValue({
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========================================================================
  // UNIT TESTS - Pure State Transitions
  // ========================================================================

  describe('State Machine Transitions', () => {
    test('should start in idle state', () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      expect(result.current._internalStatus).toBe('idle');
      expect(result.current.isActive).toBe(false);
    });

    test('should transition idle → loading → ready on START_CLICK', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Start practice
      act(() => {
        result.current.startPractice();
      });

      // Should be in loading state
      expect(result.current._internalStatus).toBe('loading');

      // Wait for asset loading to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current._internalStatus).toBe('ready');
    });

    test('should transition ready → practiceListening on second START_CLICK', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // First start (idle → loading → ready)
      act(() => {
        result.current.startPractice();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Second start (ready → practiceListening)
      act(() => {
        result.current.startPractice();
      });

      expect(result.current._internalStatus).toBe('practiceListening');
      expect(result.current.isActive).toBe(true);
    });

    test('should handle pause and resume correctly', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Start practice and get to listening state
      await startPracticeToListening(result);

      // Pause
      act(() => {
        result.current.pausePractice();
      });

      expect(result.current._internalStatus).toBe('paused');
      expect(result.current.status).toBe('paused');

      // Resume
      act(() => {
        result.current.resumePractice();
      });

      expect(result.current._internalStatus).toBe('practiceListening');
      expect(result.current.isActive).toBe(true);
    });

    test('should transition to completed when no more steps', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Mock end of piece
      mockOSMDControls.getExpectedNotesAtCursor.mockReturnValue({ type: 'END_OF_SCORE' });

      await startPracticeToListening(result);

      // Simulate correct note and advancement
      await simulateCorrectNote(result, 60);

      expect(result.current._internalStatus).toBe('completed');
      expect(result.current.isActive).toBe(false);
    });
  });

  // ========================================================================
  // INTEGRATION TESTS - Timing and MIDI Events
  // ========================================================================

  describe('Timing Integration', () => {
    test('should timeout after NOTE_TIMEOUT_MS in listening state', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      await startPracticeToListening(result);

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(30000); // NOTE_TIMEOUT_MS
      });

      expect(result.current._internalStatus).toBe('practiceFeedbackIncorrect');
    });

    test('should show feedback for correct duration', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      await startPracticeToListening(result);

      // Simulate correct note
      await simulateCorrectNote(result, 60);

      // Should be in feedback state
      expect(result.current._internalStatus).toBe('practiceFeedbackCorrect');

      // Fast-forward feedback duration
      act(() => {
        jest.advanceTimersByTime(500); // FEEDBACK_CORRECT_MS
      });

      // Should advance to next state
      expect(result.current._internalStatus).toBe('advancing');
    });

    test('should handle incorrect feedback with longer duration', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      await startPracticeToListening(result);

      // Simulate incorrect note
      await simulateIncorrectNote(result, 65); // Wrong note

      expect(result.current._internalStatus).toBe('practiceFeedbackIncorrect');

      // Fast-forward incorrect feedback duration
      act(() => {
        jest.advanceTimersByTime(1000); // FEEDBACK_INCORRECT_MS
      });

      expect(result.current._internalStatus).toBe('advancing');
    });
  });

  describe('MIDI Event Handling', () => {
    test('should process MIDI events only during practice states', async () => {
      // Mock the subscribeMidiEvents function to capture the handler
      const mockSubscribeMidiEvents = jest.fn(() => jest.fn());
      
      jest.doMock('@/renderer/contexts/MidiContext', () => ({
        useMidiContext: () => ({
          subscribeMidiEvents: mockSubscribeMidiEvents,
          isConnected: true,
          devices: [],
          status: 'ready',
          pressedKeys: new Set(),
          start: jest.fn(),
          stop: jest.fn(),
        }),
        MidiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      }));

      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Get MIDI event handler
      const midiEventHandler = mockSubscribeMidiEvents.mock.calls[0][0];

      // Send MIDI event while idle - should be ignored
      act(() => {
        midiEventHandler({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          timestamp: performance.now(),
        });
      });

      expect(result.current._internalStatus).toBe('idle');

      // Start practice
      await startPracticeToListening(result);

      // Send MIDI event while listening - should be processed
      act(() => {
        midiEventHandler({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          timestamp: performance.now(),
        });
      });

      expect(result.current._internalStatus).toBe('practiceEvaluating');
    });
  });

  // ========================================================================
  // PERFORMANCE TESTS - Latency Validation
  // ========================================================================

  describe('Performance Requirements', () => {
    test('should process MIDI events under 10ms (CI headroom for <20ms prod)', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      await startPracticeToListening(result);

      const midiEventHandler = mockMidiContext.subscribeMidiEvents.mock.calls[0][0];

      // Measure processing time
      const startTime = performance.now();

      act(() => {
        midiEventHandler({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          timestamp: performance.now(),
        });
      });

      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(10); // CI target
      expect(result.current._internalStatus).toBe('practiceEvaluating');
    });
  });

  // ========================================================================
  // MEMORY LEAK TESTS - Timer Cleanup
  // ========================================================================

  describe('Memory Management', () => {
    test('should cleanup timers on unmount', () => {
      const { result, unmount } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Get initial timer count
      const initialTimerCount = jest.getTimerCount();

      // Start practice to create timers
      act(() => {
        result.current.startPractice();
      });

      // Should have created timers
      expect(jest.getTimerCount()).toBeGreaterThan(initialTimerCount);

      // Unmount hook
      unmount();

      // All timers should be cleaned up
      expect(jest.getTimerCount()).toBe(0);
    });

    test('should cleanup timers on state transitions', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      await startPracticeToListening(result);

      // Should have listening timer
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // Simulate note to transition out of listening
      await simulateCorrectNote(result, 60);

      // Original listening timer should be cleaned up
      // Note: May have new feedback timer, but listening timer is gone
      const timersAfterTransition = jest.getTimerCount();

      // Stop practice to clear all timers
      act(() => {
        result.current.stopPractice();
      });

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ========================================================================
  // HAPPY PATH INTEGRATION TEST
  // ========================================================================

  describe('Full Practice Flow', () => {
    test('should complete full practice cycle', async () => {
      const { result } = renderHook(() => usePracticeControllerV2(), {
        wrapper: TestWrapper,
      });

      // Start practice
      act(() => {
        result.current.startPractice();
      });

      // Wait for loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Start actual practice
      act(() => {
        result.current.startPractice();
      });

      expect(result.current._internalStatus).toBe('practiceListening');

      // Play correct note
      await simulateCorrectNote(result, 60);

      // Should show feedback
      expect(result.current._internalStatus).toBe('practiceFeedbackCorrect');
      expect(result.current.score).toBe(1);

      // Advance through feedback
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current._internalStatus).toBe('advancing');

      // Complete advancement
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current._internalStatus).toBe('practiceListening');
      expect(result.current.isActive).toBe(true);
    });
  });
});

// ============================================================================
// TEST HELPERS
// ============================================================================

async function startPracticeToListening(result: any) {
  // Start practice
  act(() => {
    result.current.startPractice();
  });

  // Wait for loading
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  // Start actual practice
  act(() => {
    result.current.startPractice();
  });

  expect(result.current._internalStatus).toBe('practiceListening');
}

async function simulateCorrectNote(result: any, note: number) {
  const midiEventHandler = mockMidiContext.subscribeMidiEvents.mock.calls[0][0];

  act(() => {
    midiEventHandler({
      type: 'noteOn',
      note,
      velocity: 100,
      timestamp: performance.now(),
    });
  });

  // Wait for evaluation
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

async function simulateIncorrectNote(result: any, note: number) {
  const midiEventHandler = mockMidiContext.subscribeMidiEvents.mock.calls[0][0];

  act(() => {
    midiEventHandler({
      type: 'noteOn',
      note,
      velocity: 100,
      timestamp: performance.now(),
    });
  });

  // Wait for evaluation
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}