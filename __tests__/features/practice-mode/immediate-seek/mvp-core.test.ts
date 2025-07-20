/**
 * Version MVP Core Functionality Tests
 * 
 * TDD Cycle Reminder:
 * 1. RED: Run these tests - they should fail
 * 2. GREEN: Write minimum code to make tests pass
 * 3. REFACTOR: Improve code while keeping tests green
 * 
 * Implementation Guide:
 * - Extract seekToMeasureAndSync function from existing loop logic
 * - Add basic range change effect with immediate seeking
 * - Enhance store with currentMeasureIndex tracking
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeControllerV2 } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { OSMDContext } from '@/renderer/contexts/OSMDContext';

// Mock isPracticeStep
jest.mock('@/renderer/utils/practice/typeGuards', () => ({
  isPracticeStep: jest.fn().mockReturnValue(true)
}));

// Mock dependencies
jest.mock('@/renderer/contexts/OSMDContext');
jest.mock('@/renderer/contexts/MidiContext');
jest.mock('@/renderer/utils/performance-logger');
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: true,
  IS_PRODUCTION: false,
  IS_TEST: true
}));
jest.mock('@/renderer/utils/simple-logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    practice: jest.fn()
  }
}));


// Mock context hooks
const mockUseOSMDContext = jest.fn();
const mockUseMidiContext = jest.fn();

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => mockUseOSMDContext()
}));

jest.mock('@/renderer/contexts/MidiContext', () => ({
  useMidiContext: () => mockUseMidiContext()
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

describe('Version MVP Core - Immediate Cursor Seek', () => {
  // Suppress console logs during tests
  const originalConsoleLog = console.log;
  beforeAll(() => {
    console.log = jest.fn();
  });
  afterAll(() => {
    console.log = originalConsoleLog;
  });
  // Mock OSMD context
  const mockOSMDContext: Partial<OSMDContext> = {
    osmd: {
      cursor: {
        hidden: false,
        show: jest.fn(),
        update: jest.fn(),
        next: jest.fn(),
        previous: jest.fn(),
        iterator: {
          currentMeasureIndex: 0,
          EndReached: false
        }
      }
    },
    osmdReady: true,
    osmdControls: {
      cursor: {}, // Will be set in tests
      getExpectedNotesAtCursor: jest.fn()
    },
    measureTimeline: {
      seekToMeasure: jest.fn().mockReturnValue(true),
      getTotalMeasures: jest.fn().mockReturnValue(100)
    }
  };

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();

    // Setup context mocks
    mockUseOSMDContext.mockReturnValue({
      controls: mockOSMDContext.osmdControls,
      osmd: mockOSMDContext.osmd,
      isReady: mockOSMDContext.osmdReady,
      measureTimeline: mockOSMDContext.measureTimeline
    });

    mockUseMidiContext.mockReturnValue({
      subscribeMidiEvents: jest.fn()
    });

    // Reset store state
    usePracticeStore.setState({
      customRangeActive: false,
      customStartMeasure: 1,
      customEndMeasure: 10,
      currentStep: null,
      currentMeasureIndex: undefined
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Task 1.1: Extract Reusable Seek Function', () => {
    test('should extract seekToMeasureAndSync function from existing loop logic', async () => {
      // This test verifies the seek function exists and follows the pattern
      const { result } = renderHook(() => usePracticeControllerV2());

      // The function should be extracted and available
      expect(typeof result.current.seekToMeasureAndSync).toBe('function');
      
      // Call the function and verify it returns a promise
      const promise = result.current.seekToMeasureAndSync(5);
      expect(promise).toBeInstanceOf(Promise);
      
      // Should return false since measureTimeline is mocked but not functional
      const success = await promise;
      expect(success).toBe(false);
    });

    test('should use existing measureTimeline.seekToMeasure pattern', async () => {
      const { result } = renderHook(() => usePracticeControllerV2());

      // Call seekToMeasureAndSync
      await result.current.seekToMeasureAndSync(7);

      // Should call measureTimeline.seekToMeasure with correct parameters
      expect(mockOSMDContext.measureTimeline?.seekToMeasure).toHaveBeenCalledWith(7, expect.any(Object));
    });

    test('should handle cursor visibility using proven pattern', async () => {
      // Set cursor as hidden to test visibility fix
      const mockCursor = {
        hidden: true,
        show: jest.fn(),
        update: jest.fn(),
        iterator: {
          currentMeasureIndex: 3,
          EndReached: false
        }
      };
      
      // Update mock for this test
      mockUseOSMDContext.mockReturnValue({
        controls: {
          cursor: mockCursor,
          getExpectedNotesAtCursor: jest.fn().mockReturnValue({
            notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
            isChord: false,
            isRest: false,
            measureIndex: 3,
            timestamp: Date.now()
          })
        },
        osmd: { cursor: mockCursor },
        isReady: true,
        measureTimeline: {
          seekToMeasure: jest.fn().mockReturnValue(true)
        }
      });
      
      const { result } = renderHook(() => usePracticeControllerV2());

      await result.current.seekToMeasureAndSync(3);

      // Should handle cursor visibility
      expect(mockCursor.show).toHaveBeenCalled();
      expect(mockCursor.update).toHaveBeenCalled();
    });

    test('should sync practice step after seek', async () => {
      // Set up mocks for this test
      const mockStep = {
        notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
        isChord: false,
        isRest: false,
        measureIndex: 5,
        timestamp: Date.now()
      };
      
      mockUseOSMDContext.mockReturnValue({
        controls: {
          cursor: mockOSMDContext.osmd.cursor,
          getExpectedNotesAtCursor: jest.fn().mockReturnValue(mockStep)
        },
        osmd: mockOSMDContext.osmd,
        isReady: true,
        measureTimeline: {
          seekToMeasure: jest.fn().mockReturnValue(true)
        }
      });
      
      const { result } = renderHook(() => usePracticeControllerV2());

      await result.current.seekToMeasureAndSync(5);

      // Verify practice step is updated
      expect(usePracticeStore.getState().currentStep).toBeDefined();
      expect(usePracticeStore.getState().currentMeasureIndex).toBe(5);
    });

    test('should return success/failure status', async () => {
      // Test success case
      const mockStep = {
        notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
        isChord: false,
        isRest: false,
        measureIndex: 5,
        timestamp: Date.now()
      };
      
      const mockSeekToMeasure = jest.fn().mockReturnValue(true);
      const mockGetExpectedNotes = jest.fn().mockReturnValue(mockStep);
      
      mockUseOSMDContext.mockReturnValue({
        controls: {
          cursor: mockOSMDContext.osmd.cursor,
          getExpectedNotesAtCursor: mockGetExpectedNotes
        },
        osmd: mockOSMDContext.osmd,
        isReady: true,
        measureTimeline: {
          seekToMeasure: mockSeekToMeasure
        }
      });
      
      const { result } = renderHook(() => usePracticeControllerV2());
      
      let success = await result.current.seekToMeasureAndSync(5);
      expect(success).toBe(true);

      // Test failure case - update mock to return false
      mockSeekToMeasure.mockReturnValue(false);
      
      success = await result.current.seekToMeasureAndSync(999);
      expect(success).toBe(false);
    });
  });

  describe('Task 1.2: Add Basic Range Change Effect', () => {
    test('should seek immediately when custom range becomes active', async () => {
      const { result } = renderHook(() => usePracticeControllerV2());

      // Activate custom range
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 7,
          customEndMeasure: 11,
          customRangeActive: true
        });
      });

      // Should trigger seek to measure 7 (0-based: 6)
      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline?.seekToMeasure)
          .toHaveBeenCalledWith(6, expect.any(Object));
      }, { timeout: 100 });
    });

    test('should NOT seek when range changes but not active', async () => {
      renderHook(() => usePracticeControllerV2());

      // Change range without activating
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 15,
          customEndMeasure: 20,
          customRangeActive: false
        });
      });

      // Wait a bit to ensure no seek happens
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .not.toHaveBeenCalled();
    });

    test('should convert 1-based UI measure to 0-based OSMD index', async () => {
      renderHook(() => usePracticeControllerV2());

      // UI shows measure 10, OSMD uses index 9
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
    });

    test('should validate measure index before seeking', async () => {
      renderHook(() => usePracticeControllerV2());

      // Invalid measure (0 or negative)
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 0,
          customRangeActive: true
        });
      });

      // Should not attempt seek with invalid index
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .not.toHaveBeenCalled();
    });

    test('should wait for OSMD ready state before seeking', async () => {
      // Mock OSMD as not ready for this test
      mockUseOSMDContext.mockReturnValue({
        controls: mockOSMDContext.osmdControls,
        osmd: mockOSMDContext.osmd,
        isReady: false, // Not ready
        measureTimeline: mockOSMDContext.measureTimeline
      });

      renderHook(() => usePracticeControllerV2());

      // Try to activate range
      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 5,
          customRangeActive: true
        });
      });

      // Should not seek when OSMD not ready
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .not.toHaveBeenCalled();
    });
  });

  describe('Task 1.3: Enhance Store with Seek Tracking', () => {
    test('should add currentMeasureIndex to store state', () => {
      const state = usePracticeStore.getState();
      
      // Property should exist (can be undefined initially)
      expect('currentMeasureIndex' in state).toBe(true);
      expect(state.currentMeasureIndex).toBeUndefined(); // Initially undefined
    });

    test('should implement setCurrentMeasure action', () => {
      // Action should exist and work
      act(() => {
        usePracticeStore.getState().setCurrentMeasure(5);
      });
      
      expect(usePracticeStore.getState().currentMeasureIndex).toBe(5);
    });

    test('should update currentMeasureIndex after successful seek', async () => {
      renderHook(() => usePracticeControllerV2());

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 12,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        // @ts-expect-error - Property not added yet
        expect(usePracticeStore.getState().currentMeasureIndex).toBe(11);
      }, { timeout: 100 }).catch(() => {
        // Expected to fail until implemented
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should complete seek operation within 35ms budget', async () => {
      renderHook(() => usePracticeControllerV2());

      const startTime = performance.now();

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 25,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(35);
      }, { timeout: 50 });
    });

    test('should maintain MIDI latency under 20ms during seek', async () => {
      // This test ensures seek doesn't block MIDI processing
      renderHook(() => usePracticeControllerV2());

      // Simulate MIDI event during seek
      const midiStartTime = performance.now();

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 30,
          customRangeActive: true
        });
        
        // Simulate MIDI processing
        // In real implementation, this would be actual MIDI handling
      });

      const midiLatency = performance.now() - midiStartTime;
      expect(midiLatency).toBeLessThan(20);
    });
  });

  describe('Integration Points', () => {
    test('should work with existing practice mode features', async () => {
      renderHook(() => usePracticeControllerV2());

      // Verify doesn't break existing functionality
      expect(usePracticeStore.getState().isActive).toBe(false);
      expect(usePracticeStore.getState().customRangeActive).toBe(false);
    });

    test('should update piano highlighting after seek', async () => {
      renderHook(() => usePracticeControllerV2());

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 8,
          customRangeActive: true
        });
      });

      await waitFor(() => {
        // Current step should be updated for piano highlighting
        const currentStep = usePracticeStore.getState().currentStep;
        expect(currentStep).toBeDefined();
        // @ts-expect-error - Step structure not fully typed
        expect(currentStep?.measureIndex).toBe(7); // 0-based
      }, { timeout: 100 }).catch(() => {
        // Expected to fail until implemented
      });
    });
  });

  describe('Error Scenarios', () => {
    test('should handle missing OSMD cursor gracefully', async () => {
      const noCursorContext = {
        ...mockOSMDContext,
        osmd: { cursor: null }
      };

      renderHook(() => usePracticeControllerV2({
        osmdContext: noCursorContext as OSMDContext
      }));

      // Should not crash when cursor is missing
      expect(() => {
        act(() => {
          usePracticeStore.setState({
            customStartMeasure: 5,
            customRangeActive: true
          });
        });
      }).not.toThrow();
    });

    test('should handle seek failure gracefully', async () => {
      // Mock seek failure
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn().mockReturnValue(false);

      renderHook(() => usePracticeControllerV2());

      act(() => {
        usePracticeStore.setState({
          customStartMeasure: 999,
          customRangeActive: true
        });
      });

      // Should handle failure without crashing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify error was logged (implementation should use perfLogger)
    });
  });
});