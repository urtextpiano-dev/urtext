/**
 * Phase 2: Practice Flow Integration Tests (CRITICAL)
 * 
 * TDD CYCLE REMINDER:
 * 1. RED: Run these tests - they should fail with "not implemented" errors
 * 2. GREEN: Integrate all Phase 2 components following phase-2-practice-integration.md
 * 3. REFACTOR: Optimize integration while keeping tests green
 * 
 * CRITICAL: This validates the entire practice flow modification
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// Imports will fail initially - this drives implementation
// import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock complete practice environment
const mockOsmdControls = {
  cursor: {
    iterator: {
      currentMeasureIndex: 0
    },
    next: jest.fn(),
    reset: jest.fn(),
    show: jest.fn(),
    hide: jest.fn()
  },
  osmd: {
    sheet: {
      measureList: Array(20).fill(null).map((_, i) => ({ index: i }))
    }
  }
};

const mockMeasureTimeline = {
  seekToMeasure: jest.fn(() => true),
  getMeasureCount: jest.fn(() => 20),
  isBuilt: jest.fn(() => true),
  build: jest.fn()
};

const mockMidiHandlers = {
  handleNoteOn: jest.fn(),
  handleNoteOff: jest.fn()
};

jest.mock('@/renderer/features/practice-mode/services/MeasureTimeline', () => ({
  MeasureTimeline: mockMeasureTimeline
}));

describe('Phase 2: Complete Practice Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset store
    try {
      const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
      usePracticeStore.getState().clearCustomRange?.();
      usePracticeStore.getState().reset?.();
    } catch {
      // Expected during RED phase
    }
  });

  describe('End-to-End Custom Range Flow', () => {
    test('should complete full loop cycle during practice', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Setup custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 5);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ 
            osmdControls: mockOsmdControls,
            midiHandlers: mockMidiHandlers 
          })
        );
        
        // Start practice
        act(() => {
          result.current.startPractice();
        });
        
        expect(result.current.isActive).toBe(true);
        
        // Simulate advancing through measures
        for (let measure = 2; measure < 5; measure++) { // 0-indexed
          mockOsmdControls.cursor.iterator.currentMeasureIndex = measure;
          
          act(() => {
            // Simulate correct note played
            result.current.handleNoteOn(60, 100);
            result.current.evaluateAndAdvance();
          });
        }
        
        // Should loop back to start when reaching end
        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalledWith(2, mockOsmdControls.cursor);
        expect(result.current.isActive).toBe(true); // Still practicing
      }).toThrow('Phase 2: Complete loop cycle not implemented');
    });

    test('should maintain performance during continuous looping', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Small range for rapid looping
        act(() => {
          usePracticeStore.getState().setCustomRange(1, 2);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.startPractice();
        });
        
        const startTime = performance.now();
        let loopCount = 0;
        
        // Simulate 10 complete loops
        for (let i = 0; i < 20; i++) {
          mockOsmdControls.cursor.iterator.currentMeasureIndex = i % 2;
          
          act(() => {
            result.current.handleNoteOn(60, 100);
            result.current.evaluateAndAdvance();
          });
          
          if (i % 2 === 1) loopCount++;
        }
        
        const totalTime = performance.now() - startTime;
        const avgLoopTime = totalTime / loopCount;
        
        expect(loopCount).toBe(10);
        expect(avgLoopTime).toBeLessThan(50); // <50ms per complete loop
      }).toThrow('Phase 2: Continuous looping performance not optimized');
    });
  });

  describe('MIDI Integration with Custom Range', () => {
    test('should maintain <20ms MIDI latency with range active', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 10);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.startPractice();
        });
        
        // Measure MIDI processing latency
        const midiLatencies: number[] = [];
        
        for (let i = 0; i < 100; i++) {
          const startTime = performance.now();
          
          act(() => {
            result.current.handleNoteOn(60, 100);
            result.current.processNoteEvaluation();
          });
          
          const latency = performance.now() - startTime;
          midiLatencies.push(latency);
        }
        
        const avgLatency = midiLatencies.reduce((a, b) => a + b) / midiLatencies.length;
        const maxLatency = Math.max(...midiLatencies);
        
        expect(avgLatency).toBeLessThan(20); // Average <20ms
        expect(maxLatency).toBeLessThan(30); // Max <30ms
      }).toThrow('Phase 2: MIDI latency requirement not met');
    });

    test('should handle rapid notes at range boundaries', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 4);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.startPractice();
        });
        
        // Position at end of range
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 3;
        
        // Rapid note sequence
        const noteSequence = [60, 64, 67, 60, 64, 67];
        
        act(() => {
          noteSequence.forEach((note, index) => {
            setTimeout(() => {
              result.current.handleNoteOn(note, 100);
            }, index * 10); // 10ms apart
          });
        });
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should handle boundary transition smoothly
        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalled();
        expect(result.current.isActive).toBe(true);
      }).toThrow('Phase 2: Rapid note boundary handling not implemented');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from timeline seek failure during practice', async () => {
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
        
        act(() => {
          result.current.startPractice();
        });
        
        // Mock seek failure
        mockMeasureTimeline.seekToMeasure.mockReturnValueOnce(false);
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 6;
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        act(() => {
          result.current.evaluateAndAdvance();
        });
        
        // Should log warning and stop practice gracefully
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to seek to start measure for custom range loop'
        );
        expect(result.current.isActive).toBe(false);
        
        consoleSpy.mockRestore();
      }).toThrow('Phase 2: Seek failure recovery not integrated');
    });

    test('should handle score changes during active range', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(15, 20);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.startPractice();
        });
        
        // Simulate score change (fewer measures)
        mockMeasureTimeline.getMeasureCount.mockReturnValue(10);
        
        act(() => {
          result.current.handleScoreChange();
        });
        
        // Should auto-disable invalid range
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
      }).toThrow('Phase 2: Score change handling not integrated');
    });

    // CRITICAL: Cursor corruption recovery (AI: Grok3)
    test('should recover from cursor corruption during active practice', async () => {
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
        
        act(() => {
          result.current.startPractice();
        });
        
        // Simulate cursor corruption
        mockOsmdControls.cursor.iterator = null;
        
        act(() => {
          result.current.evaluateAndAdvance();
        });
        
        // Should stop practice gracefully
        expect(result.current.isActive).toBe(false);
        expect(screen.getByRole('alert')).toHaveTextContent(/Practice stopped due to error/);
      }).toThrow('Phase 2: Cursor corruption recovery not implemented');
    });
  });

  describe('State Machine Integration', () => {
    test('should maintain correct state transitions with custom range', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(2, 4);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        // Track state transitions
        const stateHistory: string[] = [];
        result.current.onStateChange = (state: string) => {
          stateHistory.push(state);
        };
        
        act(() => {
          result.current.startPractice();
        });
        
        expect(stateHistory).toContain('ready');
        expect(stateHistory).toContain('listening');
        
        // Advance to end of range
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 3;
        
        act(() => {
          result.current.evaluateAndAdvance();
        });
        
        // Should transition through looping state
        expect(stateHistory).toContain('looping');
        expect(stateHistory[stateHistory.length - 1]).toBe('listening');
      }).toThrow('Phase 2: State machine integration not implemented');
    });
  });

  describe('Memory & Performance Monitoring', () => {
    test('should not leak memory during extended practice sessions', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(1, 3);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        const initialMemory = performance.memory?.usedJSHeapSize || 0;
        
        act(() => {
          result.current.startPractice();
        });
        
        // Simulate 50 loop iterations
        for (let i = 0; i < 150; i++) {
          mockOsmdControls.cursor.iterator.currentMeasureIndex = i % 3;
          
          act(() => {
            result.current.evaluateAndAdvance();
          });
        }
        
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const finalMemory = performance.memory?.usedJSHeapSize || 0;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Should not leak more than 2MB
        expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024);
      }).toThrow('Phase 2: Memory leak prevention not integrated');
    });

    test('should track performance metrics in development', () => {
      expect(() => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        act(() => {
          result.current.startPractice();
        });
        
        // Perform 10 loops
        for (let i = 0; i < 50; i++) {
          mockOsmdControls.cursor.iterator.currentMeasureIndex = 3 + (i % 5);
          if (mockOsmdControls.cursor.iterator.currentMeasureIndex === 6) {
            act(() => {
              result.current.evaluateAndAdvance();
            });
          }
        }
        
        // Should log performance summary
        expect(consoleSpy).toHaveBeenCalledWith(
          'Custom Range Performance:',
          expect.objectContaining({
            totalLoops: expect.any(Number),
            averageLatency: expect.any(Number),
            maxLatency: expect.any(Number)
          })
        );
        
        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }).toThrow('Phase 2: Performance tracking not integrated');
    });
  });

  describe('Phase 2 Complete Verification', () => {
    test('should demonstrate all Phase 2 features working together', async () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // 1. Custom range is set
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 8);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        // 2. Practice controller recognizes custom range
        const { result } = renderHook(() => 
          usePracticeController({ osmdControls: mockOsmdControls })
        );
        
        act(() => {
          result.current.startPractice();
        });
        
        // 3. Detection works at boundary
        mockOsmdControls.cursor.iterator.currentMeasureIndex = 7;
        
        act(() => {
          result.current.evaluateAndAdvance();
        });
        
        // 4. Loop back works
        expect(mockMeasureTimeline.seekToMeasure).toHaveBeenCalledWith(4, mockOsmdControls.cursor);
        
        // 5. Practice continues
        expect(result.current.isActive).toBe(true);
        
        // 6. Performance maintained
        expect(result.current.lastLatency).toBeLessThan(20);
        
        // Phase 2 is complete!
      }).toThrow('Phase 2: Complete integration not implemented');
    });
  });
});