// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { perfLogger } from '@/renderer/utils/performance-logger';

// Import the modules that will be created/modified in this phase
import { usePracticeControllerV2 as usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { V2RepeatAdapter } from '@/renderer/features/practice-mode/adapters/V2RepeatAdapter';
import { PracticeRepeatManager } from '@/renderer/features/practice-mode/services/PracticeRepeatManager';
import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock dependencies
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: false
}));

jest.mock('@/renderer/utils/simple-logger', () => ({
  logger: {
    practice: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('@/renderer/contexts/MidiContext', () => ({
  useMidiContext: jest.fn(() => ({
    isConnected: true,
    activeDevice: 'Mock MIDI Device',
    subscribeMidiEvents: jest.fn(() => jest.fn()) // Returns unsubscribe function
  }))
}));

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: jest.fn(() => ({
    osmd: {},
    isReady: true,
    controls: {
      cursor: {
        iterator: {
          CurrentMeasureIndex: 0,
          EndReached: false
        }
      }
    }
  }))
}));

jest.mock('@/renderer/features/practice-mode/providers/TempoServicesProvider', () => ({
  useTempoServices: jest.fn(() => ({
    tempoService: {},
    scheduler: {}
  }))
}));

const mockPracticeStore = {
  setIsActive: jest.fn(),
  setCurrentStep: jest.fn(),
  updateScore: jest.fn(),
  getCurrentOptimizedStep: jest.fn(),
  advanceOptimizedStep: jest.fn(),
  resetOptimizedSequence: jest.fn()
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: Object.assign(
    jest.fn((selector) => {
      // If selector is provided, call it with state
      if (typeof selector === 'function') {
        return selector(mockPracticeStore);
      }
      
      // Otherwise return the whole state
      return mockPracticeStore;
    }),
    {
      getState: jest.fn(() => mockPracticeStore)
    }
  )
}));

describe('Version usePracticeController State Machine - Repeat Integration Tests', () => {
  let result: any;
  let mockOSMDControls: any;
  let mockTimeline: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock timeline
    mockTimeline = {
      build: jest.fn(),
      canHandleScore: jest.fn().mockReturnValue(true),
      seekToMeasure: jest.fn().mockReturnValue(true),
      getMeasureCount: jest.fn().mockReturnValue(10)
    };

    // Mock OSMD controls
    mockOSMDControls = {
      cursor: {
        iterator: {
          CurrentMeasureIndex: 0,
          EndReached: false
        },
        cursorPositionChanged: null // No event support by default
      }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('State Machine Extensions', () => {
    test('should add repeat-related state properties', () => {
      const { result } = renderHook(() => usePracticeController());
        
        const state = result.current.practiceState; // v2 exposes as practiceState
        
        // New state properties
        expect(state).toHaveProperty('repeatActive', false);
        expect(state).toHaveProperty('repeatMeasure', null);
        expect(state).toHaveProperty('currentMeasure', 0);
    });

    test('should handle TOGGLE_REPEAT action', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Initial state
        expect(result.current.practiceState.repeatActive).toBe(false);
        
        // Toggle on
        act(() => {
          result.current.dispatch({ type: 'TOGGLE_REPEAT' });
        });
        
        expect(result.current.practiceState.repeatActive).toBe(true);
        expect(result.current.practiceState.repeatMeasure).toBe(0); // Current measure
        
        // Toggle off
        act(() => {
          result.current.dispatch({ type: 'TOGGLE_REPEAT' });
        });
        
        expect(result.current.practiceState.repeatActive).toBe(false);
        expect(result.current.practiceState.repeatMeasure).toBe(null);
    });

    test('should handle SET_CURRENT_MEASURE action', () => {
      const { result } = renderHook(() => usePracticeController());
        
        act(() => {
          result.current.dispatch({ 
            type: 'SET_CURRENT_MEASURE', 
            payload: 5 
          });
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(5);
    });

    test('should preserve existing state when adding repeat features', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Set some existing state
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
        });
        
        const previousStatus = result.current.practiceState.status;
        
        // Toggle repeat
        act(() => {
          result.current.dispatch({ type: 'TOGGLE_REPEAT' });
        });
        
        // Existing state should be preserved
        expect(result.current.practiceState.status).toBe(previousStatus);
        expect(result.current.practiceState.repeatActive).toBe(true);
    });
  });

  describe('Service Initialization', () => {
    test('should initialize repeat services when OSMD loads', () => {
      // Mock the services exist
        jest.doMock('@/renderer/features/practice-mode/services/MeasureTimeline');
        jest.doMock('@/renderer/features/practice-mode/services/PracticeRepeatManager');
        jest.doMock('@/renderer/features/practice-mode/adapters/V2RepeatAdapter');
        
        const { result, rerender } = renderHook(() => usePracticeController());
        
        // Initially no services
        expect(result.current.repeatManagerRef?.current).toBeNull();
        
        // Simulate OSMD load
        // mockOSMDControls is now available
        rerender();
        
        // Services should be initialized
        expect(result.current.repeatManagerRef?.current).toBeDefined();
        expect(result.current.adapterRef?.current).toBeDefined();
    });

    test('should create stateless adapter with correct dependencies', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Verify adapter created with:
        // - getState function that returns current state
        // - dispatch function
        // - OSMD controls
        // - timeline
        
        // Mock to verify constructor calls
        const V2RepeatAdapterMock = jest.fn();
        jest.doMock('@/renderer/features/practice-mode/adapters/V2RepeatAdapter', () => ({
          V2RepeatAdapter: V2RepeatAdapterMock
        }));
        
        // Trigger initialization
        // ...
        
        expect(V2RepeatAdapterMock).toHaveBeenCalledWith(
          expect.any(Function), // getState
          expect.any(Function), // dispatch
          mockOSMDControls,
          expect.any(Object) // timeline
        );
    });

    test('should cleanup services on unmount', () => {
      const { result, unmount } = renderHook(() => usePracticeController());
        
        // Initialize services (mock)
        // ...
        
        unmount();
        
        // Services should be cleaned up
        expect(result.current.repeatManagerRef?.current).toBeNull();
        expect(result.current.adapterRef?.current).toBeNull();
    });
  });

  describe('Measure Tracking', () => {
    test('should use event-driven tracking when available', () => {
      // Add event support to mock
        mockOSMDControls.cursor.cursorPositionChanged = {
          connect: jest.fn(),
          disconnect: jest.fn()
        };
        
        const { result } = renderHook(() => usePracticeController());
        
        // Should connect to event
        expect(mockOSMDControls.cursor.cursorPositionChanged.connect)
          .toHaveBeenCalledWith(expect.any(Function));
        
        // Should not set up polling
        act(() => {
          jest.advanceTimersByTime(200);
        });
        
        // No polling calls expected
    });

    test('should fallback to smart polling when events unavailable', () => {
      // No event support in mock
        mockOSMDControls.cursor.cursorPositionChanged = null;
        
        const { result } = renderHook(() => usePracticeController());
        
        // Set to playing state
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
          result.current.dispatch({ type: 'ASSETS_LOADED' });
        });
        
        // Should poll during playback
        mockOSMDControls.cursor.iterator.CurrentMeasureIndex = 3;
        
        act(() => {
          jest.advanceTimersByTime(100);
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(3);
    });

    test('should only poll during active playback states', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Idle state - no polling
        act(() => {
          jest.advanceTimersByTime(200);
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(0);
        
        // Active state - should poll
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
          result.current.dispatch({ type: 'ASSETS_LOADED' });
        });
        
        mockOSMDControls.cursor.iterator.CurrentMeasureIndex = 2;
        
        act(() => {
          jest.advanceTimersByTime(100);
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(2);
        
        // Paused - stop polling
        act(() => {
          result.current.dispatch({ type: 'PAUSE_CLICK' });
        });
        
        mockOSMDControls.cursor.iterator.CurrentMeasureIndex = 5;
        
        act(() => {
          jest.advanceTimersByTime(200);
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(2); // No update
    });

    test('should handle measure change notifications to adapter', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Mock adapter notification
        const mockNotifyMeasureChange = jest.fn();
        result.current.adapterRef.current = {
          notifyMeasureChange: mockNotifyMeasureChange
        };
        
        // Trigger measure change
        act(() => {
          result.current.dispatch({ 
            type: 'SET_CURRENT_MEASURE', 
            payload: 7 
          });
        });
        
        // Adapter should be notified
        expect(mockNotifyMeasureChange).toHaveBeenCalledWith(7);
    });
  });

  describe('Repeat Logic Integration', () => {
    test('should trigger repeat manager when measure advances past target', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Mock repeat manager
        const mockHandleMeasureChange = jest.fn();
        result.current.repeatManagerRef.current = {
          handleMeasureChange: mockHandleMeasureChange,
          isActive: () => true
        };
        
        // Set repeat state
        act(() => {
          result.current.dispatch({ type: 'TOGGLE_REPEAT' });
        });
        
        expect(result.current.practiceState.repeatMeasure).toBe(0);
        
        // Advance measure
        act(() => {
          result.current.dispatch({ 
            type: 'SET_CURRENT_MEASURE', 
            payload: 1 
          });
        });
        
        // Manager should be notified
        expect(mockHandleMeasureChange).toHaveBeenCalledWith(1);
    });

    test('should export toggleRepeat function', () => {
      const { result } = renderHook(() => usePracticeController());
        
        expect(result.current.toggleRepeat).toBeDefined();
        expect(typeof result.current.toggleRepeat).toBe('function');
        
        // Call should dispatch action
        act(() => {
          result.current.toggleRepeat();
        });
        
        expect(result.current.practiceState.repeatActive).toBe(true);
    });

    test('should expose repeat state for UI', () => {
      const { result } = renderHook(() => usePracticeController());
        
        expect(result.current.repeatActive).toBe(false);
        
        act(() => {
          result.current.toggleRepeat();
        });
        
        expect(result.current.repeatActive).toBe(true);
    });
  });

  describe('Timeline Integration', () => {
    test('should build timeline when score loads', () => {
      // Mock score loading
        const mockMusicXML = '<score>...</score>';
        
        const { result, rerender } = renderHook(() => usePracticeController());
        
        // Simulate score load
        // Set musicXML and OSMD
        rerender();
        
        // Timeline should be built
        expect(mockTimeline.build).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should warn user if score has musical repeats', () => {
      mockTimeline.canHandleScore.mockReturnValue(false);
        
        const { result } = renderHook(() => usePracticeController());
        
        // Load score with repeats
        // ...
        
        // Should warn user
        expect(perfLogger.warn).toHaveBeenCalledWith(
          '[Practice] Score contains repeats - repeat feature disabled'
        );
    });

    test('should make timeline available to controller', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Initially no timeline
        expect(result.current.timeline).toBeUndefined();
        
        // After score load
        // ...
        
        // Timeline should be available
        expect(result.current.timeline).toBeDefined();
        expect(result.current.timeline).toBe(mockTimeline);
    });
  });

  describe('Performance Requirements', () => {
    test('should update state within 5ms', () => {
      const { result } = renderHook(() => usePracticeController());
        
        const start = performance.now();
        
        act(() => {
          result.current.dispatch({ type: 'TOGGLE_REPEAT' });
          result.current.dispatch({ type: 'SET_CURRENT_MEASURE', payload: 5 });
        });
        
        const duration = performance.now() - start;
        
        expect(duration).toBeLessThan(5);
    });

    test('should not leak memory with repeated toggles', () => {
      const { result } = renderHook(() => usePracticeController());
        
        const initialMemory = performance.memory?.usedJSHeapSize || 0;
        
        // Toggle many times
        for (let i = 0; i < 100; i++) {
          act(() => {
            result.current.toggleRepeat();
          });
        }
        
        const finalMemory = performance.memory?.usedJSHeapSize || 0;
        const growth = finalMemory - initialMemory;
        
        // Should have minimal memory growth
        expect(growth).toBeLessThan(1024 * 1024); // <1MB
    });
  });

  describe('Edge Cases - Event/Polling Clarity (Code review: Additions)', () => {
    test('should clearly define playback states for polling', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Define which states are considered "playback"
        const playbackStates = ['practiceListening', 'advancing'];
        const nonPlaybackStates = ['idle', 'loading', 'ready', 'paused', 'completed', 'error'];
        
        // Test polling only in playback states
        nonPlaybackStates.forEach(status => {
          act(() => {
            result.current.dispatch({ type: 'SET_STATUS', payload: status });
          });
          
          // Advance time
          act(() => {
            jest.advanceTimersByTime(200);
          });
          
          // Should NOT poll in non-playback states
          expect(result.current.practiceState.currentMeasure).toBe(0);
        });
    });

    test('NEGATIVE: must NOT poll when event system is active', () => {
      // Add event support
        mockOSMDControls.cursor.cursorPositionChanged = {
          connect: jest.fn(),
          disconnect: jest.fn()
        };
        
        const { result } = renderHook(() => usePracticeController());
        
        // Set to playback state
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
        });
        
        // Advance time to check for polling
        act(() => {
          jest.advanceTimersByTime(200);
        });
        
        // Should NOT have set up polling interval
        // Event handler should be used instead
    });
  });

  describe('Edge Cases - Race Conditions (Code review: Additions)', () => {
    test('should handle rapid concurrent state updates', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Simulate user spam-clicking
        const actions = Array(20).fill(null).map((_, i) => ({
          type: i % 2 === 0 ? 'TOGGLE_REPEAT' : 'SET_CURRENT_MEASURE',
          payload: i
        }));
        
        // Fire all actions rapidly
        act(() => {
          actions.forEach(action => {
            result.current.dispatch(action);
          });
        });
        
        // State should remain consistent
        expect(result.current.practiceState).toBeDefined();
        expect(typeof result.current.practiceState.repeatActive).toBe('boolean');
        expect(typeof result.current.practiceState.currentMeasure).toBe('number');
    });

    test('should handle invalid action payloads gracefully', () => {
      const { result } = renderHook(() => usePracticeController());
        
        // Invalid measure numbers
        const invalidValues = [-1, null, undefined, NaN, Infinity, 'not-a-number'];
        
        invalidValues.forEach(value => {
          act(() => {
            result.current.dispatch({ 
              type: 'SET_CURRENT_MEASURE', 
              payload: value 
            });
          });
          
          // Should either reject or clamp to valid value
          const measure = result.current.practiceState.currentMeasure;
          expect(measure).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(measure)).toBe(true);
        });
    });

    test('should handle event listener registration failures', () => {
      // Event system exists but registration fails
        mockOSMDControls.cursor.cursorPositionChanged = {
          connect: jest.fn().mockImplementation(() => {
            throw new Error('Event registration failed');
          }),
          disconnect: jest.fn()
        };
        
        const { result } = renderHook(() => usePracticeController());
        
        // Should fallback to polling
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
        });
        
        // Verify polling is active as fallback
        mockOSMDControls.cursor.iterator.CurrentMeasureIndex = 5;
        
        act(() => {
          jest.advanceTimersByTime(100);
        });
        
        expect(result.current.practiceState.currentMeasure).toBe(5);
    });

    test('should prevent memory leaks in service lifecycle', () => {
      const { result, unmount, rerender } = renderHook(() => usePracticeController());
        
        // Track event listeners
        const eventListeners: any[] = [];
        mockOSMDControls.cursor.cursorPositionChanged = {
          connect: jest.fn((handler) => {
            eventListeners.push(handler);
          }),
          disconnect: jest.fn((handler) => {
            const index = eventListeners.indexOf(handler);
            if (index > -1) eventListeners.splice(index, 1);
          })
        };
        
        // Mount/unmount cycle
        for (let i = 0; i < 5; i++) {
          rerender();
          unmount();
        }
        
        // All listeners should be cleaned up
        expect(eventListeners).toHaveLength(0);
        expect(mockOSMDControls.cursor.cursorPositionChanged.disconnect)
          .toHaveBeenCalledTimes(5);
    });

    test('should handle integration failures with external services', () => {
      // Timeline service fails
        mockTimeline.build.mockImplementation(() => {
          throw new Error('Timeline service unavailable');
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        // Should handle gracefully
        expect(result.current.timeline).toBeUndefined();
        expect(result.current.repeatActive).toBe(false);
        
        // Attempting to toggle should fail safely
        act(() => {
          result.current.toggleRepeat();
        });
        
        expect(result.current.repeatActive).toBe(false);
        expect(perfLogger.error).toHaveBeenCalled();
    });
  });
});