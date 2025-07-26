// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (integration points don't exist)
// 2. GREEN: Implement practice controller integration to make tests pass
// 3. REFACTOR: Optimize integration while keeping critical behavior tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import React from 'react';

// These imports will fail initially, driving TDD implementation
// CRITICAL: Code validation identified these exact integration issues
import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { TempoServicesProvider } from '@/renderer/features/practice-mode/providers/TempoServicesProvider';

// Mock dependencies
jest.mock('@/renderer/stores/osmdStore', () => ({
  useOSMDStore: () => ({
    tempoMap: {
      defaultBpm: 120,
      averageBpm: 118,
      hasExplicitTempo: true
    }
  })
}));

jest.mock('@/renderer/features/practice-mode/services/TempoService');
jest.mock('@/renderer/features/practice-mode/services/WebAudioScheduler');

describe('Practice Controller Integration - Tempo-Aware Advancement', () => {
  let mockTempoService: any;
  let mockScheduler: any;
  let mockPerformanceNow: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance.now for consistent timing tests
    mockPerformanceNow = jest.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValue(1000);
    
    // Mock TempoService
    mockTempoService = {
      getCurrentBpm: jest.fn(() => 120),
      computeDelay: jest.fn((duration) => {
        // Simulate 120 BPM: quarter note = 500ms + 40ms breathing = 540ms
        return (60_000 / 120) * duration + 40;
      }),
      setManualOverride: jest.fn(),
      applyTempoAdjustmentFactor: jest.fn()
    };
    
    // Mock WebAudioScheduler
    mockScheduler = {
      startSession: jest.fn(),
      getCurrentTime: jest.fn(() => 0),
      scheduleCallback: jest.fn((callback, delay) => {
        // Simulate immediate callback for testing
        setTimeout(callback, 0);
      })
    };
    
    // Mock the service constructors
    const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
    const { WebAudioScheduler } = require('@/renderer/features/practice-mode/services/WebAudioScheduler');
    
    TempoServiceImpl.mockImplementation(() => mockTempoService);
    WebAudioScheduler.mockImplementation(() => mockScheduler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockPerformanceNow.mockRestore();
  });

  describe('extractNoteDuration Implementation (CRITICAL MISSING FUNCTION)', () => {
    test('should implement extractNoteDuration function for quarter notes', () => {
      // CODE VALIDATION: This function was completely missing
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const quarterNote = result.current.extractNoteDuration({
        note: { duration: 'quarter', isDotted: false }
      });
      
      expect(quarterNote).toBe(1.0); // Quarter note = 1 beat
    });

    test('should implement extractNoteDuration for all note values', () => {
      // Drive comprehensive note duration mapping
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const testCases = [
        { duration: 'whole', expected: 4.0 },
        { duration: 'half', expected: 2.0 },
        { duration: 'quarter', expected: 1.0 },
        { duration: 'eighth', expected: 0.5 },
        { duration: 'sixteenth', expected: 0.25 },
        { duration: '32nd', expected: 0.125 }
      ];
      
      testCases.forEach(({ duration, expected }) => {
        const noteValue = result.current.extractNoteDuration({
          note: { duration, isDotted: false }
        });
        expect(noteValue).toBe(expected);
      });
    });

    test('should handle dotted notes (1.5x duration)', () => {
      // Drive dotted note calculation (critical for musical accuracy)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const dottedQuarter = result.current.extractNoteDuration({
        note: { duration: 'quarter', isDotted: true }
      });
      
      expect(dottedQuarter).toBe(1.5); // 1.0 * 1.5
    });

    test('should fallback to quarter note for unknown durations', () => {
      // Drive robust fallback handling
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const unknownNote = result.current.extractNoteDuration({
        note: { duration: 'unknown-duration', isDotted: false }
      });
      
      expect(unknownNote).toBe(1.0); // Default to quarter note
    });

    test('should handle missing note data gracefully', () => {
      // Drive null safety
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const missingNote = result.current.extractNoteDuration({});
      expect(missingNote).toBe(1.0); // Default to quarter note
      
      const nullStep = result.current.extractNoteDuration(null);
      expect(nullStep).toBe(1.0); // Default to quarter note
    });
  });

  describe('State Machine Integration (CRITICAL)', () => {
    test('should use FEEDBACK_TIMEOUT action not ADVANCE_CURSOR', () => {
      // CODE VALIDATION: ADVANCE_CURSOR doesn't exist
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Should be able to dispatch FEEDBACK_TIMEOUT
      expect(() => {
        act(() => {
          result.current.dispatch({ type: 'FEEDBACK_TIMEOUT' });
        });
      }).not.toThrow();
      
      // Should NOT be able to dispatch non-existent ADVANCE_CURSOR
      expect(() => {
        act(() => {
          result.current.dispatch({ type: 'ADVANCE_CURSOR' as any });
        });
      }).toThrow(); // This action should not exist
    });

    test('should integrate tempo-aware delays into practiceFeedbackCorrect case', () => {
      // Drive tempo-aware state machine enhancement
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Set up practice step with note duration
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: {
            note: { duration: 'quarter', isDotted: false }
          }
        });
      });
      
      // Trigger correct note feedback
      act(() => {
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      // Should compute delay and schedule callback
      expect(mockTempoService.computeDelay).toHaveBeenCalledWith(1.0); // Quarter note
      expect(mockScheduler.scheduleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        540 // 120 BPM quarter note delay: 500ms + 40ms breathing
      );
    });

    test('should maintain existing state machine behavior', () => {
      // Drive requirement that tempo enhancement doesn't break existing flow
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Test existing state transitions still work
      act(() => {
        result.current.dispatch({ type: 'START_PRACTICE' });
      });
      
      expect(result.current.practiceState.status).not.toBe('idle');
      
      act(() => {
        result.current.dispatch({ 
          type: 'NOTE_PLAYED', 
          payload: { note: 60, velocity: 100 } 
        });
      });
      
      expect(result.current.practiceState.lastNote).toBe(60);
    });

    test('should remove duplicate timeout effects (CRITICAL FIX)', () => {
      // CODE VALIDATION: Duplicate timeouts were identified as critical issue
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Set up practice step
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: { note: { duration: 'quarter' } }
        });
      });
      
      // Rapid state changes should clear previous timeouts
      act(() => {
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      // Should have cleared previous timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    test('should use proper useEffect dependencies to prevent infinite loops', () => {
      // Drive effect dependency management
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const initialScheduleCalls = mockScheduler.scheduleCallback.mock.calls.length;
      
      // Multiple renders with same state shouldn't trigger additional effects
      act(() => {
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      const afterFirstCall = mockScheduler.scheduleCallback.mock.calls.length;
      
      // Force re-render without state change
      act(() => {
        // No state change, just re-render
      });
      
      const afterRerender = mockScheduler.scheduleCallback.mock.calls.length;
      
      // Should not schedule additional callbacks on re-render
      expect(afterRerender).toBe(afterFirstCall);
    });
  });

  describe('Service Integration via Context', () => {
    test('should access services via useTempoServices not direct instantiation', () => {
      // Drive proper service lifecycle management
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Should have access to tempo services
      expect(result.current.getTempoServices).toBeDefined();
      expect(typeof result.current.getTempoServices).toBe('function');
      
      const services = result.current.getTempoServices();
      expect(services.tempoService).toBeDefined();
      expect(services.scheduler).toBeDefined();
    });

    test('should fail gracefully when used outside TempoServicesProvider', () => {
      // Drive context boundary enforcement
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => usePracticeController());
      }).toThrow(); // Should require provider context
      
      consoleSpy.mockRestore();
    });

    test('should share services across multiple practice controller instances', () => {
      // Drive service sharing via context
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result: result1 } = renderHook(() => usePracticeController(), { wrapper });
      const { result: result2 } = renderHook(() => usePracticeController(), { wrapper });
      
      const services1 = result1.current.getTempoServices();
      const services2 = result2.current.getTempoServices();
      
      // Should share the same service instances
      expect(services1.tempoService).toBe(services2.tempoService);
      expect(services1.scheduler).toBe(services2.scheduler);
    });
  });

  describe('Performance Instrumentation Integration', () => {
    test('should measure advancement latency with tempo awareness', () => {
      // Drive performance monitoring integration
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Should provide performance measurement utilities
      expect(result.current.measureAdvancementLatency).toBeDefined();
      
      const timing = result.current.measureAdvancementLatency();
      expect(typeof timing.markComplete).toBe('function');
      
      // Simulate advancement
      const duration = timing.markComplete();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test('should warn when advancement exceeds 20ms target', () => {
      // Drive latency monitoring with tempo calculations
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate slow operation
      mockPerformanceNow
        .mockReturnValueOnce(1000)  // Start time
        .mockReturnValueOnce(1025); // End time (25ms later)
      
      const timing = result.current.measureAdvancementLatency();
      timing.markComplete();
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cursor advancement took')
      );
      
      warnSpy.mockRestore();
    });

    test('should track session timing statistics with tempo data', () => {
      // Drive session-level performance tracking
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      expect(result.current.getSessionTimingStats).toBeDefined();
      
      const stats = result.current.getSessionTimingStats();
      expect(stats).toMatchObject({
        averageAdvancementTime: expect.any(Number),
        maxAdvancementTime: expect.any(Number),
        totalAdvancementCount: expect.any(Number),
        performanceViolations: expect.any(Number),
        tempoAwareAdvancementCount: expect.any(Number), // New metric
        averageTempoDelay: expect.any(Number) // New metric
      });
    });
  });

  describe('<20ms MIDI Latency Requirement', () => {
    test('should maintain MIDI latency under 20ms with tempo calculations', async () => {
      // Drive critical latency requirement
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const startTime = performance.now();
      
      await act(async () => {
        // Simulate full MIDI → cursor advancement path
        result.current.dispatch({ 
          type: 'NOTE_PLAYED', 
          payload: { note: 60, velocity: 100 } 
        });
        
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        
        // Wait for tempo calculation and scheduling
        await new Promise(resolve => setTimeout(resolve, 1));
      });
      
      const totalLatency = performance.now() - startTime;
      expect(totalLatency).toBeLessThan(20);
    });

    test('should optimize tempo calculation performance', () => {
      // Drive tempo calculation efficiency
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const startTime = performance.now();
      
      // Perform tempo calculation
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: { note: { duration: 'quarter' } }
        });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      const calculationTime = performance.now() - startTime;
      expect(calculationTime).toBeLessThan(5); // <5ms for calculation + scheduling
    });

    test('should handle AudioContext latency efficiently', () => {
      // Drive AudioContext performance
      mockScheduler.scheduleCallback = jest.fn((callback, delay) => {
        const startTime = performance.now();
        // Simulate AudioContext scheduling overhead
        setTimeout(() => {
          const schedulingLatency = performance.now() - startTime;
          expect(schedulingLatency).toBeLessThan(2); // <2ms scheduling
          callback();
        }, 0);
      });
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: { note: { duration: 'quarter' } }
        });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      expect(mockScheduler.scheduleCallback).toHaveBeenCalled();
    });
  });

  describe('Musical Timing Accuracy', () => {
    test('should calculate delays correctly for different tempos', () => {
      // Drive musical accuracy requirement
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Test with different BPM values
      const testCases = [
        { bpm: 60, expectedQuarterDelay: 1040 }, // 1000ms + 40ms breathing
        { bpm: 120, expectedQuarterDelay: 540 }, // 500ms + 40ms breathing
        { bpm: 180, expectedQuarterDelay: 373 } // 333ms + 40ms breathing (rounded)
      ];
      
      testCases.forEach(({ bpm, expectedQuarterDelay }) => {
        mockTempoService.getCurrentBpm.mockReturnValue(bpm);
        mockTempoService.computeDelay.mockReturnValue(expectedQuarterDelay);
        
        act(() => {
          result.current.dispatch({
            type: 'SET_CURRENT_STEP',
            payload: { note: { duration: 'quarter' } }
          });
          result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        });
        
        expect(mockScheduler.scheduleCallback).toHaveBeenCalledWith(
          expect.any(Function),
          expectedQuarterDelay
        );
      });
    });

    test('should handle manual tempo overrides', () => {
      // Drive manual override integration
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Simulate manual tempo override to 90 BPM
      mockTempoService.getCurrentBpm.mockReturnValue(90);
      const overrideDelay = (60_000 / 90) * 1.0 + 40; // 666ms + 40ms = 706ms
      mockTempoService.computeDelay.mockReturnValue(overrideDelay);
      
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: { note: { duration: 'quarter' } }
        });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      expect(mockScheduler.scheduleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        overrideDelay
      );
    });

    test('should adapt to different note durations', () => {
      // Drive comprehensive note duration support
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      const noteDurations = [
        { duration: 'whole', beatValue: 4.0, expectedDelay: 2040 },
        { duration: 'half', beatValue: 2.0, expectedDelay: 1040 },
        { duration: 'quarter', beatValue: 1.0, expectedDelay: 540 },
        { duration: 'eighth', beatValue: 0.5, expectedDelay: 290 }
      ];
      
      noteDurations.forEach(({ duration, beatValue, expectedDelay }) => {
        mockTempoService.computeDelay.mockReturnValue(expectedDelay);
        
        act(() => {
          result.current.dispatch({
            type: 'SET_CURRENT_STEP',
            payload: { note: { duration } }
          });
          result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        });
        
        expect(mockTempoService.computeDelay).toHaveBeenCalledWith(beatValue);
        expect(mockScheduler.scheduleCallback).toHaveBeenCalledWith(
          expect.any(Function),
          expectedDelay
        );
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should fallback to fixed delay when tempo calculation fails', () => {
      // Drive robust error handling
      mockTempoService.computeDelay.mockImplementation(() => {
        throw new Error('Tempo calculation failed');
      });
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      act(() => {
        result.current.dispatch({
          type: 'SET_CURRENT_STEP',
          payload: { note: { duration: 'quarter' } }
        });
        result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
      });
      
      // Should fallback to setTimeout with fixed delay
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        500 // Fixed fallback delay
      );
      
      setTimeoutSpy.mockRestore();
    });

    test('should handle scheduler failures gracefully', () => {
      // Drive scheduler error handling
      mockScheduler.scheduleCallback.mockImplementation(() => {
        throw new Error('Scheduler failed');
      });
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      expect(() => {
        act(() => {
          result.current.dispatch({
            type: 'SET_CURRENT_STEP',
            payload: { note: { duration: 'quarter' } }
          });
          result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        });
      }).not.toThrow();
      
      // Should have fallback mechanism
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      setTimeoutSpy.mockRestore();
    });

    test('should handle missing current step gracefully', () => {
      // Drive null safety
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TempoServicesProvider>{children}</TempoServicesProvider>
      );
      
      const { result } = renderHook(() => usePracticeController(), { wrapper });
      
      // Trigger feedback without setting current step
      expect(() => {
        act(() => {
          result.current.dispatch({ type: 'PRACTICE_FEEDBACK_CORRECT' });
        });
      }).not.toThrow();
      
      // Should handle gracefully without scheduling
      expect(mockScheduler.scheduleCallback).not.toHaveBeenCalled();
    });
  });
});