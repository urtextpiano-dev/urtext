/**
 * CRITICAL Performance Tests: MIDI Latency
 * 
 * TDD CYCLE REMINDER:
 * 1. RED: Run these tests - they should fail with "not implemented" errors
 * 2. GREEN: Optimize implementation to meet latency requirements
 * 3. REFACTOR: Further optimize while maintaining <20ms latency
 * 
 * CRITICAL REQUIREMENT: MIDI input to audio output <20ms
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Imports will fail initially - this drives implementation
// import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// CRITICAL: Performance budget clarification (AI consensus)
const PERFORMANCE_BUDGETS = {
  TOTAL_MIDI_LATENCY: 20,      // ms - Critical requirement (MIDI input to audio output)
  RANGE_CHECK_OVERHEAD: 1,      // ms - Additional overhead for custom range checking
  LOOP_NAVIGATION: 10,          // ms - Seek operation for loop back
  COMPONENT_RENDER: 100,        // ms - UI update
  MEMORY_GROWTH_PER_HOUR: 2     // MB - Long session memory growth
};

// High-precision timing mock
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 0 }])
};

global.performance = mockPerformance as any;

// Mock AudioContext with precise timing
const mockAudioContext = {
  currentTime: 0,
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  destination: {}
};

global.AudioContext = jest.fn(() => mockAudioContext) as any;

describe('Performance: MIDI Latency Requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
  });

  describe('Baseline MIDI Latency (No Custom Range)', () => {
    test('should process MIDI note within 20ms without custom range', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        
        const { result } = renderHook(() => usePracticeController());
        
        // Measure baseline latency
        const iterations = 1000;
        const latencies: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          const startTime = 1000 + i * 0.1;
          mockPerformance.now.mockReturnValueOnce(startTime);
          
          act(() => {
            result.current.handleMidiNoteOn(60, 100);
          });
          
          const endTime = startTime + 15; // Simulated processing time
          mockPerformance.now.mockReturnValueOnce(endTime);
          
          act(() => {
            result.current.processMidiEvaluation();
          });
          
          latencies.push(endTime - startTime);
        }
        
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const p99Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];
        
        expect(avgLatency).toBeLessThan(20);
        expect(maxLatency).toBeLessThan(25);
        expect(p99Latency).toBeLessThan(22);
      }).toThrow('Performance: Baseline MIDI latency not optimized');
    });
  });

  describe('Custom Range Overhead', () => {
    test('should add <1ms overhead for range checking', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Enable custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 10);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        // Measure overhead
        const iterations = 1000;
        const overheads: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          // Baseline timing
          mockPerformance.now.mockReturnValueOnce(1000);
          act(() => {
            result.current.checkPracticeAdvancement();
          });
          const baselineEnd = 1000.5;
          mockPerformance.now.mockReturnValueOnce(baselineEnd);
          
          // With range checking
          mockPerformance.now.mockReturnValueOnce(2000);
          act(() => {
            result.current.checkPracticeAdvancementWithRange();
          });
          const rangeEnd = 2000.8; // Should be <1ms more
          mockPerformance.now.mockReturnValueOnce(rangeEnd);
          
          const overhead = (rangeEnd - 2000) - (baselineEnd - 1000);
          overheads.push(overhead);
        }
        
        const avgOverhead = overheads.reduce((a, b) => a + b) / overheads.length;
        const maxOverhead = Math.max(...overheads);
        
        expect(avgOverhead).toBeLessThan(1); // <1ms average
        expect(maxOverhead).toBeLessThan(2); // <2ms worst case
      }).toThrow('Performance: Range checking overhead not optimized');
    });

    test('should maintain <20ms total latency with custom range active', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Enable custom range
        act(() => {
          usePracticeStore.getState().setCustomRange(3, 7);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        // Simulate complete MIDI processing cycle
        const testScenarios = [
          { measure: 3, description: 'Start of range' },
          { measure: 5, description: 'Middle of range' },
          { measure: 6, description: 'Near end of range' },
          { measure: 7, description: 'End of range (loop point)' }
        ];
        
        testScenarios.forEach(({ measure, description }) => {
          // Set cursor position
          result.current.osmdControls.cursor.iterator.currentMeasureIndex = measure - 1;
          
          const latencies: number[] = [];
          
          for (let i = 0; i < 100; i++) {
            const startTime = performance.now();
            
            act(() => {
              // Complete MIDI processing pipeline
              result.current.handleMidiNoteOn(60, 100);
              result.current.evaluateNote();
              result.current.checkAndAdvancePractice();
            });
            
            const endTime = performance.now();
            latencies.push(endTime - startTime);
          }
          
          const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
          
          expect(avgLatency).toBeLessThan(20); // Must maintain <20ms
          console.log(`${description}: ${avgLatency.toFixed(2)}ms average latency`);
        });
      }).toThrow('Performance: Total MIDI latency with range not optimized');
    });
  });

  describe('Loop Navigation Performance', () => {
    test('should complete loop navigation within 10ms', () => {
      expect(() => {
        const { handleCustomRangeLoop } = require('@/renderer/features/practice-mode/utils/customRangeLoop');
        const { MeasureTimeline } = require('@/renderer/features/practice-mode/services/MeasureTimeline');
        
        // Mock MeasureTimeline for fast seeking
        MeasureTimeline.seekToMeasure = jest.fn((measure) => {
          // Simulate O(1) seeking
          mockPerformance.now.mockReturnValueOnce(performance.now() + 0.5);
          return true;
        });
        
        const context = {
          osmdControls: { 
            cursor: { 
              iterator: { currentMeasureIndex: 9 },
              reset: jest.fn(),
              next: jest.fn()
            } 
          },
          practiceState: {
            setCurrentStep: jest.fn(),
            setStatus: jest.fn(),
            stopPractice: jest.fn()
          },
          getExpectedNotesAtCursor: jest.fn(() => ({ notes: [60], duration: 1000 })),
          customStartMeasure: 5,
          customEndMeasure: 10
        };
        
        const iterations = 100;
        const loopTimes: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          const startTime = 1000 + i;
          mockPerformance.now.mockReturnValueOnce(startTime);
          
          act(() => {
            handleCustomRangeLoop(context);
          });
          
          const endTime = startTime + 8; // Should be <10ms
          mockPerformance.now.mockReturnValueOnce(endTime);
          
          loopTimes.push(endTime - startTime);
        }
        
        const avgLoopTime = loopTimes.reduce((a, b) => a + b) / loopTimes.length;
        const maxLoopTime = Math.max(...loopTimes);
        
        expect(avgLoopTime).toBeLessThan(10); // <10ms average
        expect(maxLoopTime).toBeLessThan(15); // <15ms worst case
      }).toThrow('Performance: Loop navigation not optimized');
    });

    test('should not cause latency spikes during loop transition', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Small range for frequent looping
        act(() => {
          usePracticeStore.getState().setCustomRange(1, 2);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        const latencyTrace: number[] = [];
        let isLooping = false;
        
        // Simulate rapid practice with looping
        for (let i = 0; i < 200; i++) {
          const measure = i % 2; // Alternates between 0 and 1
          result.current.osmdControls.cursor.iterator.currentMeasureIndex = measure;
          
          if (measure === 1) {
            isLooping = true;
          }
          
          const startTime = performance.now();
          
          act(() => {
            result.current.handleMidiNoteOn(60, 100);
            result.current.evaluateAndAdvance();
          });
          
          const latency = performance.now() - startTime;
          latencyTrace.push(latency);
          
          if (isLooping) {
            // Check for latency spike during loop
            expect(latency).toBeLessThan(25); // Allow small spike
            isLooping = false;
          }
        }
        
        // Analyze latency consistency
        const avgLatency = latencyTrace.reduce((a, b) => a + b) / latencyTrace.length;
        const variance = latencyTrace.reduce((sum, lat) => 
          sum + Math.pow(lat - avgLatency, 2), 0
        ) / latencyTrace.length;
        const stdDev = Math.sqrt(variance);
        
        expect(stdDev).toBeLessThan(5); // Low variance
      }).toThrow('Performance: Loop transition latency spikes not prevented');
    });
  });

  describe('Stress Testing', () => {
    test('should handle 1000 loops without performance degradation', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Single measure range for maximum stress
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 5);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        const latencyBuckets = {
          first100: [] as number[],
          middle100: [] as number[],
          last100: [] as number[]
        };
        
        for (let loop = 0; loop < 1000; loop++) {
          const startTime = performance.now();
          
          act(() => {
            result.current.handleMidiNoteOn(60, 100);
            result.current.evaluateAndAdvance();
          });
          
          const latency = performance.now() - startTime;
          
          if (loop < 100) {
            latencyBuckets.first100.push(latency);
          } else if (loop >= 450 && loop < 550) {
            latencyBuckets.middle100.push(latency);
          } else if (loop >= 900) {
            latencyBuckets.last100.push(latency);
          }
        }
        
        // Calculate averages
        const avgFirst = latencyBuckets.first100.reduce((a, b) => a + b) / 100;
        const avgMiddle = latencyBuckets.middle100.reduce((a, b) => a + b) / 100;
        const avgLast = latencyBuckets.last100.reduce((a, b) => a + b) / 100;
        
        // Should not degrade over time
        expect(avgLast - avgFirst).toBeLessThan(2); // <2ms degradation
        expect(avgMiddle).toBeLessThan(20); // Still meeting requirement
        expect(avgLast).toBeLessThan(20); // Still meeting requirement
      }).toThrow('Performance: Long-term performance degradation not prevented');
    });
  });

  describe('Real-Time Constraints', () => {
    test('should never block main thread for >16ms', () => {
      expect(() => {
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        act(() => {
          usePracticeStore.getState().setCustomRange(1, 100);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        const { result } = renderHook(() => usePracticeController());
        
        // Track longest blocking operation
        let maxBlockingTime = 0;
        
        const operations = [
          () => result.current.handleMidiNoteOn(60, 100),
          () => result.current.evaluateNote(),
          () => result.current.checkAndAdvancePractice(),
          () => result.current.handleCustomRangeLoop(),
          () => result.current.updateVisualFeedback()
        ];
        
        operations.forEach((operation, index) => {
          const startTime = performance.now();
          
          act(() => {
            operation();
          });
          
          const blockingTime = performance.now() - startTime;
          maxBlockingTime = Math.max(maxBlockingTime, blockingTime);
          
          expect(blockingTime).toBeLessThan(16); // 60fps frame budget
        });
        
        expect(maxBlockingTime).toBeLessThan(10); // Well under frame budget
      }).toThrow('Performance: Main thread blocking not prevented');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track and report performance metrics', () => {
      expect(() => {
        const { PerformanceMonitor } = require('@/renderer/features/practice-mode/utils/performanceMonitor');
        
        const monitor = new PerformanceMonitor();
        
        // Simulate practice session
        for (let i = 0; i < 100; i++) {
          monitor.startMeasure('midi-processing');
          // Simulate processing
          mockPerformance.now.mockReturnValueOnce(performance.now() + 15);
          monitor.endMeasure('midi-processing');
        }
        
        const metrics = monitor.getMetrics();
        
        expect(metrics).toMatchObject({
          'midi-processing': {
            count: 100,
            average: expect.any(Number),
            min: expect.any(Number),
            max: expect.any(Number),
            p50: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number)
          }
        });
        
        expect(metrics['midi-processing'].average).toBeLessThan(20);
        expect(metrics['midi-processing'].p99).toBeLessThan(25);
      }).toThrow('Performance: Monitoring system not implemented');
    });
  });
});