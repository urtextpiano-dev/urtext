/**
 * Phase 3: Production Hardening Tests
 * 
 * TDD Cycle Reminder:
 * 1. RED: Run these tests - they should fail
 * 2. GREEN: Write minimum code to make tests pass
 * 3. REFACTOR: Improve code while keeping tests green
 * 
 * Implementation Guide:
 * - Add cancellation tokens to prevent race conditions
 * - Implement comprehensive error handling with recovery
 * - Ensure all edge cases are handled gracefully
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeControllerV2 } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { OSMDContext } from '@/renderer/contexts/OSMDContext';
import { perfLogger } from '@/renderer/utils/performance-logger';

// Mock isPracticeStep
jest.mock('@/renderer/utils/practice/typeGuards', () => ({
  isPracticeStep: jest.fn().mockReturnValue(true)
}));

// Mock dependencies
jest.mock('@/renderer/contexts/OSMDContext');
jest.mock('@/renderer/contexts/MidiContext');

jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/renderer/utils/simple-logger', () => ({
  logger: {
    practice: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/renderer/utils/debounce', () => ({
  useDebounce: jest.fn((value) => value) // Return value immediately for tests
}));
jest.mock('@/renderer/features/practice-mode/providers/TempoServicesProvider', () => ({
  useTempoServices: () => ({
    tempoService: {
      getBeatDuration: jest.fn().mockReturnValue(500),
      getBeatsPerMeasure: jest.fn().mockReturnValue(4)
    },
    webAudioScheduler: {
      scheduleNextBeat: jest.fn()
    }
  })
}));

// Mock usePracticeStore and all its methods
const mockSetIsActive = jest.fn((isActive) => {
  mockStoreState.isActive = isActive;
});
const mockSetCurrentMeasure = jest.fn((measureIndex) => {
  mockStoreState.currentMeasureIndex = measureIndex;
});
const mockSetLastValidMeasureIndex = jest.fn((measureIndex) => {
  mockStoreState.lastValidMeasureIndex = measureIndex;
});
const mockSetCurrentStep = jest.fn((step) => {
  mockStoreState.currentStep = step;
});

// Store state that can be updated by setState
let mockStoreState = {
  customRangeActive: false,
  customStartMeasure: 1,
  customEndMeasure: 10,
  isActive: false,
  status: 'idle',
  currentStep: null,
  pressedKeys: new Set(),
  lastResult: null,
  attemptCount: 0,
  currentMeasureIndex: 0,
  hasRepeats: false,
  repeatWarningDismissed: false,
  repeatsEnabled: true,
  repeatsFailed: false,
  optimizedSequence: [],
  currentOptimizedIndex: 0,
  lastValidMeasureIndex: 0,
  setIsActive: mockSetIsActive,
  setCurrentMeasure: mockSetCurrentMeasure,
  setLastValidMeasureIndex: mockSetLastValidMeasureIndex,
  setCurrentStep: mockSetCurrentStep
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => {
  return {
    usePracticeStore: Object.assign(
      // Default selector
      jest.fn((selector) => {
        return selector ? selector(mockStoreState) : mockStoreState;
      }),
      {
        // Static methods
        getState: jest.fn(() => mockStoreState),
        setState: jest.fn((updates) => {
          // Update the mocked state
          Object.assign(mockStoreState, updates);
        })
      }
    )
  };
});

// Mock context hooks
const mockUseOSMDContext = jest.fn();
const mockUseMidiContext = jest.fn();

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => mockUseOSMDContext()
}));

jest.mock('@/renderer/contexts/MidiContext', () => ({
  useMidiContext: () => mockUseMidiContext()
}));

describe('Phase 3: Production - Race Conditions and Error Recovery', () => {
  // Mock OSMD context
  const mockOSMDContext: Partial<OSMDContext> = {
    osmd: {
      cursor: {
        hidden: false,
        show: jest.fn(),
        update: jest.fn(),
        iterator: { currentMeasureIndex: 0 }
      }
    },
    osmdReady: true,
    osmdControls: {
      cursor: {}, // Will be set to osmd.cursor in setup
      getExpectedNotesAtCursor: jest.fn().mockImplementation(() => ({
        notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
        isChord: false,
        isRest: false,
        measureIndex: mockOSMDContext.osmd?.cursor?.iterator?.currentMeasureIndex || 0,
        timestamp: Date.now()
      }))
    },
    measureTimeline: {
      seekToMeasure: jest.fn().mockImplementation((measureIndex) => {
        // Update cursor position to match seek
        if (mockOSMDContext.osmd?.cursor?.iterator) {
          mockOSMDContext.osmd.cursor.iterator.currentMeasureIndex = measureIndex;
        }
        return true;
      }),
      getMeasureCount: jest.fn().mockReturnValue(100)
    }
  };

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup context mocks
    // Link the cursor object properly
    if (mockOSMDContext.osmdControls) {
      mockOSMDContext.osmdControls.cursor = mockOSMDContext.osmd?.cursor;
    }
    
    mockUseOSMDContext.mockReturnValue({
      controls: mockOSMDContext.osmdControls,
      osmd: mockOSMDContext.osmd,
      isReady: mockOSMDContext.osmdReady,
      measureTimeline: mockOSMDContext.measureTimeline
    });

    mockUseMidiContext.mockReturnValue({
      subscribeMidiEvents: jest.fn()
    });
    
    // Reset mock function calls
    mockSetIsActive.mockClear();
    mockSetCurrentMeasure.mockClear();
    mockSetLastValidMeasureIndex.mockClear();
    mockSetCurrentStep.mockClear();
    
    // Reset perfLogger mocks
    (perfLogger.debug as jest.Mock).mockClear();
    (perfLogger.info as jest.Mock).mockClear();
    (perfLogger.warn as jest.Mock).mockClear();
    (perfLogger.error as jest.Mock).mockClear();
    
    // Reset store state
    mockStoreState = {
      customRangeActive: false,
      customStartMeasure: 1,
      customEndMeasure: 10,
      isActive: false,
      status: 'idle',
      currentStep: null,
      pressedKeys: new Set(),
      lastResult: null,
      attemptCount: 0,
      currentMeasureIndex: 0,
      hasRepeats: false,
      repeatWarningDismissed: false,
      repeatsEnabled: true,
      repeatsFailed: false,
      optimizedSequence: [],
      currentOptimizedIndex: 0,
      lastValidMeasureIndex: 0,
      setIsActive: mockSetIsActive,
      setCurrentMeasure: mockSetCurrentMeasure,
      setLastValidMeasureIndex: mockSetLastValidMeasureIndex,
      setCurrentStep: mockSetCurrentStep
    };
    
    // Mock performance.now for timing tests
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Task 3.1: Implement Race Condition Prevention', () => {
    test('should use cancellation tokens for seek operations', async () => {
      const { result } = renderHook(() => usePracticeControllerV2());

      // Check that currentSeekId ref exists
      expect(result.current.currentSeekId.current).toBeDefined();
      expect(result.current.currentSeekId.current).toBe(0); // Initial value
    });

    test('should cancel stale seeks when newer seek starts', async () => {
      // Delay first seek to simulate slow operation
      let seekCallCount = 0;
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn().mockImplementation(() => {
        seekCallCount++;
        return seekCallCount === 1 
          ? new Promise(resolve => setTimeout(() => resolve(true), 100))
          : true; // Synchronous for second call
      });

      renderHook(() => usePracticeControllerV2());

      // Start first seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 10,
          customRangeActive: true
        });
      });

      // Start second seek before first completes
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 20 });
      });

      // Wait for seeks to process
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // Check that seeks were attempted
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledTimes(2);
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledWith(9, expect.any(Object));
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledWith(19, expect.any(Object));
    });

    test('should handle rapid seeks without race conditions', async () => {
      renderHook(() => usePracticeControllerV2());

      // Activate custom range
      act(() => {
        usePracticeStore.setState({ 
          customStartMeasure: 5,
          customRangeActive: true
        });
      });

      // Rapid changes to custom range
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 10 });
      });
      
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 15 });
      });
      
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 20 });
      });

      // Wait for debounce and seek to complete
      await waitFor(() => {
        // Should only seek once to the last value (20-1=19)
        expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledWith(19, expect.any(Object));
      });
      
      // Should have seeked only once due to our configuration tracking
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledTimes(1);
    });

    test('should check seek validity before state updates', async () => {
      let seekDelay = 50;
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), seekDelay)
        ));

      const { result } = renderHook(() => usePracticeControllerV2());

      // Start slow seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 30,
          customRangeActive: true
        });
      });

      // Start fast seek
      seekDelay = 10;
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 40 });
      });

      await waitFor(() => {
        // Only the second seek should update state
        // @ts-expect-error - Not implemented yet
        expect(usePracticeStore.getState().currentMeasureIndex).toBe(39);
      });
    });
  });

  describe('Task 3.2: Add Comprehensive Error Handling', () => {
    test('should track last valid measure index', async () => {
      // Make seek succeed
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn().mockResolvedValue(true);
      
      renderHook(() => usePracticeControllerV2());

      // Successful seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 15,
          customRangeActive: true
        });
      });

      // Wait a bit for effects to run
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Check if the custom range effect was triggered
      const debugCalls = (perfLogger.debug as jest.Mock).mock.calls;
      console.log('Debug calls after state change:', debugCalls.filter(call => call[0].includes('[CustomRange]')));

      // Wait for the seek to complete
      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledWith(14, expect.any(Object));
      });

      // Check that lastValidMeasureIndex was updated
      await waitFor(() => {
        expect(mockSetLastValidMeasureIndex).toHaveBeenCalledWith(14);
      });
    });

    test('should recover to last valid position on seek failure', async () => {
      // First seek succeeds, second fails
      let seekCount = 0;
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation((measure) => {
          seekCount++;
          if (seekCount === 1) return Promise.resolve(true);
          if (seekCount === 2) return Promise.resolve(false);
          // Recovery seek
          return Promise.resolve(true);
        });

      renderHook(() => usePracticeControllerV2());

      // First successful seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 10,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline?.seekToMeasure)
          .toHaveBeenCalledWith(9, expect.any(Object));
      });

      // Second seek that will fail
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 999 });
      });

      await waitFor(() => {
        // Should attempt recovery
        expect(mockPerfLogger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Attempting recovery to last valid position/)
        );
      });

      // Should recover to measure 10 (index 9)
      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline?.seekToMeasure)
          .toHaveBeenCalledWith(9, expect.any(Object));
      });
    });

    test('should handle seek exceptions gracefully', async () => {
      // Mock seek that throws
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockRejectedValue(new Error('OSMD internal error'));

      renderHook(() => usePracticeControllerV2());

      // Attempt seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 25,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        expect(mockPerfLogger.error).toHaveBeenCalledWith(
          expect.stringMatching(/Error during seek operation/),
          expect.any(Error)
        );
      });

      // Should not crash the application
      expect(() => {
        usePracticeStore.getState();
      }).not.toThrow();
    });

    test('should handle cursor becoming undefined during seek', async () => {
      const dynamicContext = { ...mockOSMDContext };
      
      renderHook(() => usePracticeControllerV2());

      // Make cursor undefined mid-operation
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation(() => {
          dynamicContext.osmd!.cursor = undefined;
          return Promise.resolve(false);
        });

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 30,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        expect(mockPerfLogger.error).toHaveBeenCalledWith(
          expect.stringMatching(/Missing cursor or measureTimeline/)
        );
      });
    });

    test('should log but not crash on recovery failure', async () => {
      // Both seek and recovery fail
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockResolvedValue(false);

      renderHook(() => usePracticeControllerV2());

      // Set a valid position first
      // @ts-expect-error - Not implemented yet
      usePracticeStore.setState({ lastValidMeasureIndex: 5 });

      // Attempt failing seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 999,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        expect(mockPerfLogger.error).toHaveBeenCalledWith(
          expect.stringMatching(/Recovery also failed/),
          expect.any(Error)
        );
      });
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    test('should handle component unmount during seek', async () => {
      // Slow seek operation
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 100)
        ));

      const { unmount } = renderHook(() => usePracticeControllerV2());

      // Start seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 45,
          customRangeActive: true
        });
      });

      // Unmount before seek completes
      unmount();

      // Should not cause errors
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // Should not cause errors or state updates
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalled();
    });

    test('should handle invalid measure ranges gracefully', async () => {
      renderHook(() => usePracticeControllerV2());

      // Test various invalid ranges
      const invalidRanges = [
        { start: -1, end: 10 },
        { start: 0, end: 5 },
        { start: 1000, end: 1005 },
        { start: 10, end: 5 }, // start > end
      ];

      for (const range of invalidRanges) {
        act(() => {
          usePracticeStore.setState({
            customStartMeasure: range.start,
            customEndMeasure: range.end,
            customRangeActive: true
          });
        });

        // Should handle without seeking or crashing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // No seeks should occur for invalid ranges
      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .not.toHaveBeenCalled();
    });

    test('should handle OSMD not ready during seek attempt', async () => {
      const dynamicContext = { 
        ...mockOSMDContext,
        osmdReady: true 
      };

      renderHook(() => usePracticeControllerV2());

      // Make OSMD not ready during operation
      act(() => {
        dynamicContext.osmdReady = false;
        usePracticeStore.setState({
          customStartMeasure: 50,
          customRangeActive: true
        });
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not attempt seek
      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .not.toHaveBeenCalled();
    });

    test('should handle practice state transitions during seek', async () => {
      const { result } = renderHook(() => usePracticeControllerV2());

      // Slow seek
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 100)
        ));

      // Start seek
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 60,
          customRangeActive: true
        });
      });

      // Change practice state during seek
      act(() => {
        result.current.dispatch({ type: 'START_CLICK' });
      });

      await waitFor(() => {
        // Should handle state change gracefully
        expect(result.current.practiceState.status).toBeDefined();
      });
    });
  });

  describe('Performance Under Stress', () => {
    test('should maintain performance with 1000 rapid seeks', async () => {
      renderHook(() => usePracticeControllerV2());

      const startTime = performance.now();

      // Simulate extreme usage
      for (let i = 0; i < 1000; i++) {
        act(() => {
          usePracticeStore.setState({ 
            customStartMeasure: (i % 50) + 1
          });
        });
      }

      const duration = performance.now() - startTime;

      // Should handle without performance degradation
      expect(duration).toBeLessThan(1000); // 1ms per operation average
    });

    test('should not leak memory with repeated seeks', async () => {
      const { rerender } = renderHook(() => usePracticeControllerV2());

      // Simulate extended usage
      for (let i = 0; i < 100; i++) {
        act(() => {
          usePracticeStore.setState({
            customStartMeasure: (i % 20) + 1,
            customRangeActive: i % 2 === 0
          });
        });
        
        rerender();
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Memory should be stable (tested via heap snapshots in real scenario)
      expect(jest.getTimerCount()).toBe(0); // No leaked timers
    });
  });

  describe('Integration with Complete Feature', () => {
    test('should integrate with all practice mode features', async () => {
      const { result } = renderHook(() => usePracticeControllerV2());

      // Complex interaction scenario
      
      // 1. Start practice
      act(() => {
        result.current.dispatch({ type: 'START_CLICK' });
      });

      // 2. Activate custom range during practice
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 25,
          customEndMeasure: 35,
          customRangeActive: true
        });
      });

      // 3. Change range while seeking
      act(() => {
        usePracticeStore.setState({ customStartMeasure: 30 });
      });

      // 4. Deactivate and reactivate
      act(() => {
        usePracticeStore.setState({ customRangeActive: false });
      });

      act(() => {
        usePracticeStore.setState({ customRangeActive: true });
      });

      // Should handle all transitions gracefully
      await waitFor(() => {
        expect(result.current.state.status).toBe('ready');
        // @ts-expect-error - Not implemented yet
        expect(usePracticeStore.getState().currentMeasureIndex).toBeDefined();
      });
    });
  });
});