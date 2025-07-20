// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (no instrumentation exists)
// 2. GREEN: Add performance instrumentation to make tests pass
// 3. REFACTOR: Improve instrumentation code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Import the hook that will be enhanced with instrumentation
// This import should fail initially - driving TDD implementation
import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';

// Mock dependencies for context providers
jest.mock('@/renderer/services/LightweightLatencyMonitor', () => ({
  latencyMonitor: {
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
  },
}));

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => {
  const mockStore = {
    startPractice: jest.fn(),
    stopPractice: jest.fn(),
    setCurrentStep: jest.fn(),
    setIsActive: jest.fn(),
    setStatus: jest.fn(),
    setResult: jest.fn(),
    getCurrentOptimizedStep: jest.fn(),
    advanceOptimizedStep: jest.fn(),
    resetOptimizedSequence: jest.fn(),
  };
  
  const usePracticeStoreMock = jest.fn((selector) => {
    if (selector) {
      return selector(mockStore);
    }
    return mockStore;
  });
  
  // Add getState method to the mock function
  usePracticeStoreMock.getState = jest.fn(() => mockStore);
  
  return {
    usePracticeStore: usePracticeStoreMock,
  };
});

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
}));

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => ({
    controls: {
      getExpectedNotesAtCursor: jest.fn(() => ({
        notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
        isChord: false,
        isRest: false,
        measureIndex: 0,
        timestamp: Date.now(),
      })),
      nextCursorPosition: jest.fn(),
      showCursor: jest.fn(),
      hideCursor: jest.fn(),
    },
    osmd: { render: jest.fn() },
    isReady: true,
    detectRepeats: jest.fn(() => []),
    setOSMDInstance: jest.fn(),
    clearOSMDInstance: jest.fn(),
  }),
}));

describe('Version Instrumentation & Baseline - Performance Monitoring', () => {
  beforeEach(() => {
    // Clear any existing performance logs
    console.warn = jest.fn();
    localStorage.clear();
    jest.clearAllMocks();
    
    // Mock performance.now() for test environment
    if (typeof global.performance === 'undefined') {
      global.performance = {
        now: jest.fn(() => Date.now()),
      } as any;
    }
  });

  describe('Performance Instrumentation', () => {
    test('should provide measureAdvancementLatency function', () => {
      // This test drives the creation of performance instrumentation
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        
        // Should have access to timing measurement utilities
        // This will fail until measureAdvancementLatency is implemented
        expect(result.current.measureAdvancementLatency).toBeDefined();
        expect(typeof result.current.measureAdvancementLatency).toBe('function');
      }).not.toThrow();
    });

    test('should track timing for cursor advancement operations', () => {
      // Drive implementation of timing tracking
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        
        const timing = result.current.measureAdvancementLatency();
        expect(timing).toBeDefined();
        expect(typeof timing.markComplete).toBe('function');
      }).not.toThrow();
    });

    test('should warn when cursor advancement exceeds 20ms target', () => {
      // Drive implementation of performance warning system
      const { result } = renderHook(() => usePracticeController());
      
      const timing = result.current.measureAdvancementLatency();
      
      // Simulate slow operation
      const slowOperation = () => {
        const start = Date.now();
        while (Date.now() - start < 25) {
          // Busy wait to simulate 25ms operation
        }
      };
      
      slowOperation();
      const duration = timing.markComplete();
      
      // Should warn about performance regression
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cursor advancement took')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('>20ms target')
      );
      expect(duration).toBeGreaterThan(20);
    });

    test('should track practice session timing statistics', () => {
      // Drive implementation of session-level timing tracking
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        
        // Should provide session timing utilities
        expect(result.current.getSessionTimingStats).toBeDefined();
        expect(typeof result.current.getSessionTimingStats).toBe('function');
        
        const stats = result.current.getSessionTimingStats();
        expect(stats).toMatchObject({
          averageAdvancementTime: expect.any(Number),
          maxAdvancementTime: expect.any(Number),
          totalAdvancementCount: expect.any(Number),
          performanceViolations: expect.any(Number)
        });
      }).not.toThrow();
    });

    test('should add minimal overhead (<1ms) for instrumentation', async () => {
      // Drive requirement that instrumentation doesn't impact performance
      const { result } = renderHook(() => usePracticeController());
      
      // Measure overhead of timing instrumentation itself
      const start = performance.now();
      
      const timing = result.current.measureAdvancementLatency();
      timing.markComplete();
      
      const instrumentationOverhead = performance.now() - start;
      
      // Instrumentation should add <1ms overhead
      expect(instrumentationOverhead).toBeLessThan(1);
    });
  });

  describe('Baseline Measurements', () => {
    test('should establish current FEEDBACK_CORRECT_MS timing baseline', () => {
      // Drive measurement of current fixed delay timing
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        
        // Should provide baseline measurement utilities
        expect(result.current.getCurrentTimingBaseline).toBeDefined();
        
        const baseline = result.current.getCurrentTimingBaseline();
        expect(baseline).toMatchObject({
          feedbackDelayMs: expect.any(Number),
          cursorAdvancementLatency: expect.any(Number),
          totalResponseTime: expect.any(Number)
        });
      }).not.toThrow();
    });

    test('should log baseline measurements for comparison', () => {
      // Drive baseline logging for future comparison
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const { result } = renderHook(() => usePracticeController());
      
      // Should automatically log baseline on initialization
      expect(result.current.logPerformanceBaseline).toBeDefined();
      result.current.logPerformanceBaseline();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎵 PERFORMANCE BASELINE')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Current fixed delay:')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration with Existing Practice Controller', () => {
    test('should not break existing practice mode functionality', () => {
      // Ensure instrumentation doesn't disrupt current behavior
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        
        // All existing practice controller functionality should still work
        expect(result.current.practiceState).toBeDefined();
        expect(result.current.dispatch).toBeDefined();
        expect(typeof result.current.dispatch).toBe('function');
        
        // State machine should still function
        expect(result.current.practiceState.status).toBeDefined();
      }).not.toThrow();
    });

    test('should maintain existing state machine behavior', () => {
      // Drive requirement that instrumentation preserves state machine
      const { result } = renderHook(() => usePracticeController());
      
      // Should be able to trigger state transitions
      expect(() => {
        act(() => {
          result.current.dispatch({ type: 'START_CLICK' });
        });
      }).not.toThrow();
      
      // State should update correctly
      expect(result.current.practiceState.status).not.toBe('idle');
    });
  });

  describe('Error Handling', () => {
    test('should handle performance.now() unavailability gracefully', () => {
      // Drive robust fallback implementation
      const originalPerformance = global.performance;
      
      // Simulate environment without performance.now()
      delete (global as any).performance;
      
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        const timing = result.current.measureAdvancementLatency();
        timing.markComplete();
      }).not.toThrow();
      
      // Restore performance object
      global.performance = originalPerformance;
    });

    test('should handle console.warn unavailability gracefully', () => {
      // Drive robust warning system
      const originalWarn = console.warn;
      delete (console as any).warn;
      
      expect(() => {
        const { result } = renderHook(() => usePracticeController());
        const timing = result.current.measureAdvancementLatency();
        timing.markComplete();
      }).not.toThrow();
      
      // Restore console.warn
      console.warn = originalWarn;
    });
  });
});