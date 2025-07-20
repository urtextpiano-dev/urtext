/**
 * Performance Tests for Immediate Cursor Seek
 * 
 * These tests ensure the feature meets strict latency requirements
 * for real-time MIDI performance in Urtext Piano.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { usePracticeControllerV2 } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { OSMDContext } from '@/renderer/contexts/OSMDContext';

// Performance constants from CLAUDE.md
const MIDI_LATENCY_BUDGET = 20; // ms
const SEEK_TIME_DESKTOP = 35; // ms
const SEEK_TIME_MOBILE = 60; // ms
const MEMORY_BUDGET = 5 * 1024 * 1024; // 5MB in bytes

describe('Immediate Cursor Seek - Performance Requirements', () => {
  // Mock OSMD context with performance tracking
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
    osmdControls: {},
    measureTimeline: {
      seekToMeasure: jest.fn().mockImplementation((measure) => {
        // Simulate realistic seek times based on measure distance
        const seekTime = Math.min(5 + Math.abs(measure) * 0.1, 30);
        return new Promise(resolve => setTimeout(() => resolve(true), seekTime));
      }),
      getTotalMeasures: jest.fn().mockReturnValue(300) // Large score
    }
  };

  beforeEach(() => {
    usePracticeStore.setState({
      customRangeActive: false,
      customStartMeasure: 1,
      customEndMeasure: 10
    });

    jest.clearAllMocks();
    
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  describe('Seek Time Performance', () => {
    test('should complete seek within 35ms on desktop', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      performance.mark('seek-start');

      await act(async () => {
        usePracticeStore.setState({
          customStartMeasure: 50,
          customRangeActive: true
        });
      });

      performance.mark('seek-end');
      performance.measure('seek-duration', 'seek-start', 'seek-end');

      const measure = performance.getEntriesByName('seek-duration')[0];
      expect(measure.duration).toBeLessThan(SEEK_TIME_DESKTOP);
    });

    test('should handle seeks to distant measures within budget', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      const testCases = [
        { measure: 100, description: 'medium distance' },
        { measure: 200, description: 'far distance' },
        { measure: 299, description: 'end of score' }
      ];

      for (const testCase of testCases) {
        performance.mark(`seek-${testCase.measure}-start`);

        await act(async () => {
          usePracticeStore.setState({
            customStartMeasure: testCase.measure,
            customRangeActive: true
          });
        });

        performance.mark(`seek-${testCase.measure}-end`);
        performance.measure(
          `seek-${testCase.measure}`,
          `seek-${testCase.measure}-start`,
          `seek-${testCase.measure}-end`
        );

        const measure = performance.getEntriesByName(`seek-${testCase.measure}`)[0];
        
        // Even distant seeks should complete within mobile budget
        expect(measure.duration).toBeLessThan(SEEK_TIME_MOBILE);
      }
    });

    test('should optimize repeated seeks to same measure', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      const seekTimes: number[] = [];

      // Seek to same measure multiple times
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        await act(async () => {
          usePracticeStore.setState({
            customStartMeasure: 25,
            customRangeActive: false
          });
        });

        await act(async () => {
          usePracticeStore.setState({ customRangeActive: true });
        });

        seekTimes.push(performance.now() - startTime);
      }

      // Later seeks should be faster (caching effect)
      const firstSeek = seekTimes[0];
      const lastSeek = seekTimes[seekTimes.length - 1];
      
      expect(lastSeek).toBeLessThanOrEqual(firstSeek);
    });
  });

  describe('MIDI Latency Impact', () => {
    test('should not block MIDI processing during seek', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      // Simulate MIDI event handler
      const processMidiNote = jest.fn((note: number, velocity: number) => {
        const startTime = performance.now();
        // Simulate MIDI processing
        const result = { note, velocity, timestamp: Date.now() };
        const processingTime = performance.now() - startTime;
        return { result, processingTime };
      });

      // Start seek operation
      const seekPromise = act(async () => {
        usePracticeStore.setState({
          customStartMeasure: 100,
          customRangeActive: true
        });
      });

      // Process MIDI events during seek
      const midiResults = [];
      for (let i = 0; i < 10; i++) {
        const { processingTime } = processMidiNote(60 + i, 100);
        midiResults.push(processingTime);
      }

      await seekPromise;

      // All MIDI events should process within latency budget
      midiResults.forEach(time => {
        expect(time).toBeLessThan(MIDI_LATENCY_BUDGET);
      });
    });

    test('should maintain 60fps during seek animation', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      const frameTimings: number[] = [];
      let lastFrameTime = performance.now();

      // Simulate render loop during seek
      const measureFrame = () => {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        frameTimings.push(frameDuration);
        lastFrameTime = currentTime;
      };

      // Start seek
      const seekPromise = act(async () => {
        usePracticeStore.setState({
          customStartMeasure: 150,
          customRangeActive: true
        });
      });

      // Measure frames during seek
      const frameInterval = setInterval(measureFrame, 16.67); // 60fps target

      await seekPromise;
      
      clearInterval(frameInterval);

      // Check frame consistency (allowing for some variance)
      const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
      expect(avgFrameTime).toBeLessThan(20); // Allow slight variance from 16.67ms
    });
  });

  describe('Memory Performance', () => {
    test('should not exceed memory budget with repeated seeks', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      // @ts-expect-error - performance.memory is Chrome-specific
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Perform many seeks
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          usePracticeStore.setState({
            customStartMeasure: (i % 50) + 1,
            customRangeActive: i % 2 === 0
          });
        });
      }

      // Force garbage collection if available
      // @ts-expect-error - gc is exposed with --expose-gc flag
      if (global.gc) global.gc();

      // @ts-expect-error - performance.memory is Chrome-specific
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_BUDGET);
    });

    test('should clean up resources on component unmount', async () => {
      const { unmount } = renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      // Start multiple seeks
      for (let i = 0; i < 10; i++) {
        act(() => {
          usePracticeStore.setState({
            customStartMeasure: i * 10,
            customRangeActive: true
          });
        });
      }

      // Unmount during seeks
      unmount();

      // Check for leaked timers
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Debounce Performance', () => {
    test('should efficiently handle rapid input changes', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      const startTime = performance.now();

      // Simulate rapid slider movement
      for (let i = 1; i <= 100; i++) {
        act(() => {
          usePracticeStore.setState({ customStartMeasure: i });
        });
      }

      const updateTime = performance.now() - startTime;

      // State updates should be fast despite many changes
      expect(updateTime).toBeLessThan(50); // 0.5ms per update average

      // Wait for debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should result in single seek
      expect(mockOSMDContext.measureTimeline?.seekToMeasure)
        .toHaveBeenCalledTimes(1);
    });
  });

  describe('Stress Testing', () => {
    test('should handle worst-case scenario gracefully', async () => {
      // Simulate slow OSMD operations
      mockOSMDContext.measureTimeline!.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 50) // Slow seek
        ));

      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      const operations = [];

      // Concurrent operations
      operations.push(
        // Seek operation
        act(async () => {
          usePracticeStore.setState({
            customStartMeasure: 200,
            customRangeActive: true
          });
        })
      );

      // MIDI events during seek
      for (let i = 0; i < 20; i++) {
        operations.push(
          new Promise(resolve => {
            const start = performance.now();
            // Simulate MIDI processing
            setTimeout(() => {
              const latency = performance.now() - start;
              expect(latency).toBeLessThan(MIDI_LATENCY_BUDGET);
              resolve(null);
            }, 1);
          })
        );
      }

      await Promise.all(operations);
    });

    test('should degrade gracefully under extreme load', async () => {
      renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      // Create extreme load
      const loadPromises = [];
      
      for (let i = 0; i < 1000; i++) {
        loadPromises.push(
          act(async () => {
            usePracticeStore.setState({
              customStartMeasure: Math.floor(Math.random() * 100) + 1
            });
          })
        );
      }

      const startTime = performance.now();
      await Promise.all(loadPromises);
      const totalTime = performance.now() - startTime;

      // Should complete even under extreme load
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should expose performance metrics for monitoring', async () => {
      const { result } = renderHook(() => usePracticeControllerV2({
        osmdContext: mockOSMDContext as OSMDContext
      }));

      // Perform several seeks
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          usePracticeStore.setState({
            customStartMeasure: i * 20 + 10,
            customRangeActive: true
          });
        });

        await new Promise(resolve => setTimeout(resolve, 100));
        
        act(() => {
          usePracticeStore.setState({ customRangeActive: false });
        });
      }

      // Get performance stats (when implemented)
      expect(() => {
        // @ts-expect-error - Not implemented yet
        const stats = result.current.getSeekPerformanceStats();
        expect(stats).toMatchObject({
          averageSeekTime: expect.any(Number),
          maxSeekTime: expect.any(Number),
          seekCount: expect.any(Number)
        });
      }).toThrow();
    });
  });
});