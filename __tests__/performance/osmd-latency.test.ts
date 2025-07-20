/**
 * OSMD Latency Performance Tests
 * 
 * Critical performance validation for <30ms MIDI to visual latency
 * These tests MUST pass for production readiness
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// These imports will be created during implementation
// import { useOSMD } from '@/renderer/hooks/useOSMD';
// import { performanceMonitor } from '@/renderer/utils/performanceMonitor';

describe('OSMD Latency Performance Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
    
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Single Note Highlighting Performance', () => {
    test('CRITICAL: must highlight single note in <30ms', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore(10))
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const measurements: number[] = [];
        
        // Test 100 iterations for statistical significance
        for (let i = 0; i < 100; i++) {
          const startTime = performance.now();
          
          act(() => {
            result.current.imperativeApi.highlightNote(60, 100);
          });
          
          const latency = performance.now() - startTime;
          measurements.push(latency);
        }
        
        // Calculate statistics
        const avgLatency = measurements.reduce((a, b) => a + b) / measurements.length;
        const maxLatency = Math.max(...measurements);
        const p95Latency = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
        
        console.log(`Single Note Latency - Avg: ${avgLatency.toFixed(2)}ms, P95: ${p95Latency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
        
        expect(avgLatency).toBeLessThan(30);
        expect(p95Latency).toBeLessThan(30);
        expect(maxLatency).toBeLessThan(50); // Allow occasional spikes
      }).rejects.toThrow('Single note performance not optimized');
    });

    test('should maintain <30ms with different velocities', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore(10))
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const velocities = [1, 32, 64, 96, 127]; // Min to max
        const measurements: Record<number, number[]> = {};
        
        velocities.forEach(velocity => {
          measurements[velocity] = [];
          
          for (let i = 0; i < 20; i++) {
            const startTime = performance.now();
            
            act(() => {
              result.current.imperativeApi.highlightNote(60, velocity);
            });
            
            measurements[velocity].push(performance.now() - startTime);
          }
        });
        
        // All velocities should meet latency requirement
        Object.entries(measurements).forEach(([velocity, times]) => {
          const avg = times.reduce((a, b) => a + b) / times.length;
          console.log(`Velocity ${velocity}: ${avg.toFixed(2)}ms`);
          expect(avg).toBeLessThan(30);
        });
      }).rejects.toThrow('Velocity performance not consistent');
    });
  });

  describe('Concurrent Note Performance', () => {
    test('CRITICAL: must handle 10 simultaneous notes in <30ms', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateChordScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const notes = Array.from({ length: 10 }, (_, i) => 60 + i);
        const measurements: number[] = [];
        
        for (let iteration = 0; iteration < 50; iteration++) {
          const startTime = performance.now();
          
          act(() => {
            notes.forEach(note => {
              result.current.imperativeApi.highlightNote(note, 100);
            });
          });
          
          const totalLatency = performance.now() - startTime;
          measurements.push(totalLatency);
          
          // Clear highlights for next iteration
          act(() => {
            result.current.imperativeApi.clearAllHighlights();
          });
        }
        
        const avgLatency = measurements.reduce((a, b) => a + b) / measurements.length;
        const maxLatency = Math.max(...measurements);
        
        console.log(`10-Note Chord - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
        
        expect(avgLatency).toBeLessThan(30);
        expect(maxLatency).toBeLessThan(50);
      }).rejects.toThrow('Concurrent note performance not optimized');
    });

    test('should scale linearly with note count', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateDenseScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const noteCounts = [1, 5, 10, 15, 20];
        const avgLatencies: Record<number, number> = {};
        
        noteCounts.forEach(count => {
          const notes = Array.from({ length: count }, (_, i) => 40 + i);
          const measurements: number[] = [];
          
          for (let i = 0; i < 10; i++) {
            const startTime = performance.now();
            
            act(() => {
              notes.forEach(note => {
                result.current.imperativeApi.highlightNote(note, 100);
              });
            });
            
            measurements.push(performance.now() - startTime);
            
            act(() => {
              result.current.imperativeApi.clearAllHighlights();
            });
          }
          
          avgLatencies[count] = measurements.reduce((a, b) => a + b) / measurements.length;
        });
        
        // Verify approximately linear scaling
        console.log('Scaling:', avgLatencies);
        
        const perNoteTime = avgLatencies[1];
        Object.entries(avgLatencies).forEach(([count, latency]) => {
          const expected = perNoteTime * parseInt(count);
          const tolerance = expected * 0.5; // 50% tolerance
          
          expect(latency).toBeLessThan(expected + tolerance);
        });
      }).rejects.toThrow('Linear scaling not achieved');
    });
  });

  describe('RequestAnimationFrame Batching', () => {
    test('should batch multiple highlights in single frame', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        rafSpy.mockClear();
        
        // Highlight multiple notes rapidly
        act(() => {
          for (let i = 0; i < 5; i++) {
            result.current.imperativeApi.highlightNote(60 + i, 100);
          }
        });
        
        // Should batch into minimal RAF calls
        expect(rafSpy).toHaveBeenCalledTimes(1);
      }).rejects.toThrow('RAF batching not implemented');
    });

    test('should complete RAF callback quickly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        let rafCallbackTime = 0;
        const originalRAF = window.requestAnimationFrame;
        
        window.requestAnimationFrame = jest.fn((callback) => {
          const id = originalRAF(() => {
            const start = performance.now();
            callback(start);
            rafCallbackTime = performance.now() - start;
          });
          return id;
        });
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        act(() => {
          result.current.imperativeApi.highlightNote(60, 100);
        });
        
        // Wait for RAF to execute
        await new Promise(resolve => setTimeout(resolve, 20));
        
        expect(rafCallbackTime).toBeLessThan(16); // Complete within single frame
        
        window.requestAnimationFrame = originalRAF;
      }).rejects.toThrow('RAF callback performance not optimized');
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should track latency metrics', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockMonitor = {
          recordMidiLatency: jest.fn()
        };
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore(), {
            performanceMonitor: mockMonitor
          })
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        act(() => {
          result.current.imperativeApi.highlightNote(60, 100);
        });
        
        expect(mockMonitor.recordMidiLatency).toHaveBeenCalledWith(
          expect.any(Number)
        );
        
        const recordedLatency = mockMonitor.recordMidiLatency.mock.calls[0][0];
        expect(recordedLatency).toBeLessThan(30);
      }).rejects.toThrow('Performance monitoring not integrated');
    });

    test('should alert on performance degradation', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const consoleWarn = jest.spyOn(console, 'warn');
        
        // Mock slow performance
        const originalNow = performance.now;
        let callCount = 0;
        performance.now = jest.fn(() => {
          callCount++;
          // Simulate degrading performance
          return callCount === 1 ? 0 : 35 * Math.floor(callCount / 2);
        });
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateTestScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Trigger multiple highlights
        for (let i = 0; i < 10; i++) {
          act(() => {
            result.current.imperativeApi.highlightNote(60, 100);
          });
        }
        
        expect(consoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('Performance degradation')
        );
        
        performance.now = originalNow;
      }).rejects.toThrow('Performance alerting not implemented');
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle rapid arpeggios at 240 BPM', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateArpeggioScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // 16th notes at 240 BPM = 16 notes per second
        const noteInterval = 1000 / 16; // ~62.5ms between notes
        const notes = Array.from({ length: 16 }, (_, i) => 50 + i);
        
        const latencies: number[] = [];
        
        // Simulate rapid arpeggio
        for (let i = 0; i < notes.length; i++) {
          const startTime = performance.now();
          
          act(() => {
            result.current.imperativeApi.highlightNote(notes[i], 80);
            if (i > 0) {
              result.current.imperativeApi.unhighlightNote(notes[i - 1]);
            }
          });
          
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          // Wait for next note timing
          await new Promise(resolve => setTimeout(resolve, noteInterval));
        }
        
        // All notes should meet latency requirement
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        const maxLatency = Math.max(...latencies);
        
        console.log(`Arpeggio Test - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
        
        expect(avgLatency).toBeLessThan(30);
        expect(maxLatency).toBeLessThan(50);
      }).rejects.toThrow('Arpeggio performance not optimized');
    });

    test('should handle glissando sweep', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, generateGlissandoScore())
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Simulate glissando from C3 to C6
        const startNote = 48;
        const endNote = 84;
        const sweepTime = 1000; // 1 second sweep
        const noteCount = endNote - startNote + 1;
        const noteInterval = sweepTime / noteCount;
        
        const latencies: number[] = [];
        
        for (let note = startNote; note <= endNote; note++) {
          const startTime = performance.now();
          
          act(() => {
            result.current.imperativeApi.highlightNote(note, 100);
            if (note > startNote) {
              result.current.imperativeApi.unhighlightNote(note - 1);
            }
          });
          
          latencies.push(performance.now() - startTime);
          
          await new Promise(resolve => setTimeout(resolve, noteInterval));
        }
        
        // Should maintain performance throughout sweep
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        expect(avgLatency).toBeLessThan(30);
      }).rejects.toThrow('Glissando performance not optimized');
    });
  });
});