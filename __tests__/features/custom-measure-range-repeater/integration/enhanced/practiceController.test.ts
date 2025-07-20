/**
 * Version Practice Controller Modification Tests (CRITICAL)
 * 
 * 
 * CRITICAL PERFORMANCE TARGET: 
 * - MIDI latency must remain <20ms
 * - Range check overhead <1ms
 * - No practice flow interruption
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// Imports will fail initially - this drives implementation
// import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock dependencies
const mockOsmdControls = {
  cursor: {
    iterator: {
      currentMeasureIndex: 0
    },
    next: jest.fn(),
    reset: jest.fn()
  }
};

const mockMeasureTimeline = {
  seekToMeasure: jest.fn(() => true),
  getMeasureCount: jest.fn(() => 20)
};

jest.mock('@/renderer/features/practice-mode/services/MeasureTimeline', () => ({
  MeasureTimeline: mockMeasureTimeline
}));

describe('Version Practice Controller Custom Range Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOsmdControls.cursor.iterator.currentMeasureIndex = 0;
    
    // Reset practice store
    try {
      const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
      usePracticeStore.getState().clearCustomRange?.();
    } catch {
      // Expected during RED phase
    }
  });

  describe('Custom Range Detection', () => {
    test('should detect when practice reaches custom range end', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Set up custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        // Mock cursor at end of range
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 6; // 0-indexed, so measure 7
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Advance practice - should detect end of range
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        // Should not call stopPractice, but instead loop back
        expect(result.current.practiceStatus).not.toBe('stopped');
        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalledWith(2, mockOsmdControls.cursor);
      }).toThrow('Version Custom range detection not implemented');
    });

    test('should not interfere when custom range is inactive', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Custom range inactive
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Normal practice flow should continue
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 10;
        
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        // Should not attempt to seek
        expect(mockMeasureTimeline.seekToMeasure).not.toHaveBeenCalled();
      }).toThrow('Version Normal flow preservation not implemented');
    });

    test('should handle edge case of single measure range', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Single measure range (start = end)
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 5);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 4; // Measure 5
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Should loop back to same measure
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalledWith(4, mockOsmdControls.cursor);
      }).toThrow('Version Single measure range not handled');
    });
  });

  describe('Performance Critical Path', () => {
    test('should add <1ms overhead to practice advancement', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Enable custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(1, 10);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        const iterations = 100;
        const startTime = performance.now();
        
        // Simulate practice advancement
        for (let i = 0; i < iterations; i++) {
          mockOsmdControls.cursor.iterator.currentMeasureIndex = i % 5;
          act(() => {
            result.current.handlePracticeAdvance();
          });
        }
        
        const duration = performance.now() - startTime;
        const avgOverhead = duration / iterations;
        
        // Must maintain <1ms overhead per advancement
        expect(avgOverhead).toBeLessThan(1);
      }).toThrow('Version Performance overhead exceeds 1ms');
    });

    test('should maintain <20ms MIDI latency with custom range active', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Enable custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Simulate MIDI note evaluation cycle
        const startTime = performance.now();
        
        act(() => {
          // MIDI note received
          result.current.handleMidiNoteOn(60, 100);
          
          // Evaluation and advancement
          result.current.evaluateAndAdvance();
        });
        
        const latency = performance.now() - startTime;
        
        // Total MIDI processing must remain <20ms
        expect(latency).toBeLessThan(20);
      }).toThrow('Version MIDI latency requirement not met');
    });
  });

  describe('Error Handling & Recovery', () => {
    test('should fall back to normal practice on range detection error', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Enable custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        // Mock cursor error
        mockOsmdControls.cursor.iterator = null;
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Should not crash
        expect(() => {
          act(() => {
            result.current.handlePracticeAdvance();
          });
        }).not.toThrow();
        
        // Should log warning
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error in custom range detection')
        );
        
        consoleSpy.mockRestore();
      }).toThrow('Version Error recovery not implemented');
    });

    test('should handle MeasureTimeline seek failures gracefully', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Mock seek failure
        mockMeasureTimeline.seekToMeasure.mockReturnValueOnce(false);
        
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 6;
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        // Should stop practice on seek failure
        expect(result.current.practiceStatus).toBe('stopped');
      }).toThrow('Version Seek failure handling not implemented');
    });

    // CRITICAL: Race condition protection (Code review: Gemini pro)
    test('should handle custom range being disabled mid-loop', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');

        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });

        // Mock seekToMeasure to simulate a state change during its execution
        mockMeasureTimeline.seekToMeasure.mockImplementation(() => {
          // Simulate user disabling the range while the seek is in progress
          act(() => {
            usePracticeStore.getState().toggleCustomRange();
          });
          return true; // The seek itself succeeds
        });

        mockOsmdControls.cursor.iterator.currentMeasureIndex = 6; // At end of range

        const { result } = renderHook(() =>
          usePracticeController({ osmdControls: mockOsmdControls })
        );

        // This call should not throw, and should complete the loop
        // based on the state when the function was invoked
        act(() => {
          result.current.handlePracticeAdvance();
        });

        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalledWith(2, mockOsmdControls.cursor);
        // After the advance, the practice status should be normal, not stopped
        expect(result.current.practiceStatus).not.toBe('stopped');

        // However, the store state should now reflect that the range is off
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
      }).toThrow('Version Race condition with state toggle not handled');
    });
  });

  describe('State Consistency', () => {
    test('should clear custom range when practice stops', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Stop practice
        act(() => {
          result.current.stopPractice();
        });
        
        // Custom range should be cleared
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
      }).toThrow('Version State cleanup not implemented');
    });

    test('should validate range bounds against current score', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Set range that exceeds score length
        act(() => {
          usePracticeStore.getState().setCustomRange(15, 25);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        // Mock score with only 20 measures
        mockMeasureTimeline.getMeasureCount.mockReturnValue(20);
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        // Should auto-clear invalid range
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
      }).toThrow('Version Range validation not implemented');
    });
  });

  describe('Integration with Existing Features', () => {
    test('should work with getExpectedNotesAtCursor', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 6;
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Mock expected notes at start of range
        const mockExpectedNotes = { notes: [60, 64, 67], duration: 1000 };
        result.current.getExpectedNotesAtCursor = jest.fn(() => mockExpectedNotes);
        
        act(() => {
          result.current.handlePracticeAdvance();
        });
        
        // Should get notes from start measure after loop
        expect(result.current.currentStep).toEqual(mockExpectedNotes);
      }).toThrow('Version getExpectedNotesAtCursor integration not implemented');
    });
  });
});