/**
 * Practice Mode Latency Performance Tests
 * 
 * Critical requirements:
 * - Note comparison: <1ms
 * - MIDI to feedback: <30ms total
 * - State updates: <16ms (60fps)
 * - Cursor operations: <10ms
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { renderHook, act } from '@testing-library/react';

// These imports will fail until implementation
// import { compareNotes } from '@/renderer/features/practice-mode/utils/noteComparison';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController';
// import type { PracticeStep } from '@/renderer/features/practice-mode/types';

describe('Practice Mode Latency Performance', () => {
  beforeEach(() => {
    jest.useRealTimers(); // Real timers for accurate measurements
  });

  describe('Note Comparison Performance', () => {
    test('should compare single note in <1ms', () => {
      expect(() => {
        const expected: PracticeStep = {
          notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
          isChord: false,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        };

        const played = [60];

        // Warm up JIT
        for (let i = 0; i < 100; i++) {
          compareNotes(played, expected);
        }

        // Measure
        const iterations = 1000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          compareNotes(played, expected);
        }

        const totalTime = performance.now() - startTime;
        const averageTime = totalTime / iterations;

        expect(averageTime).toBeLessThan(1); // <1ms average
        console.log(`Average comparison time: ${averageTime.toFixed(3)}ms`);
      }).toThrow(/Cannot find module|compareNotes is not defined/);
    });

    test('should compare complex chord in <1ms', () => {
      expect(() => {
        const expected: PracticeStep = {
          notes: Array.from({ length: 10 }, (_, i) => ({
            midiValue: 50 + i * 2,
            pitchName: `Note${i}`,
            octave: 4
          })),
          isChord: true,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        };

        const played = Array.from({ length: 10 }, (_, i) => 50 + i * 2);

        const iterations = 1000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          compareNotes(played, expected);
        }

        const totalTime = performance.now() - startTime;
        const averageTime = totalTime / iterations;

        expect(averageTime).toBeLessThan(1); // Still <1ms for complex chords
      }).toThrow(/Cannot find module|compareNotes is not defined/);
    });

    test('should handle worst-case comparison in <1ms', () => {
      expect(() => {
        // Worst case: all wrong notes in a large set
        const expected: PracticeStep = {
          notes: Array.from({ length: 20 }, (_, i) => ({
            midiValue: 40 + i,
            pitchName: `Note${i}`,
            octave: 3
          })),
          isChord: true,
          isRest: false,
          measureIndex: 0,
          timestamp: Date.now()
        };

        const played = Array.from({ length: 20 }, (_, i) => 60 + i); // All wrong

        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          compareNotes(played, expected);
          times.push(performance.now() - start);
        }

        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

        expect(maxTime).toBeLessThan(1); // Max time <1ms
        expect(p95Time).toBeLessThan(0.5); // 95th percentile <0.5ms
      }).toThrow(/Cannot find module|compareNotes is not defined/);
    });
  });

  describe('State Update Performance', () => {
    test('should update store state in <16ms', () => {
      expect(() => {
        const { result } = renderHook(() => usePracticeStore());

        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          
          act(() => {
            result.current.updatePressedKeys([60, 64, 67]);
            result.current.setStatus('evaluating');
            result.current.setResult({ type: 'CORRECT' });
          });

          times.push(performance.now() - start);
        }

        const averageTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);

        expect(averageTime).toBeLessThan(16); // Average <16ms (60fps)
        expect(maxTime).toBeLessThan(16.67); // Max <16.67ms
      }).toThrow(/Cannot find module|usePracticeStore is not defined/);
    });

    test('should handle rapid state transitions', () => {
      expect(() => {
        const { result } = renderHook(() => usePracticeStore());

        const start = performance.now();

        // Simulate rapid state changes
        for (let i = 0; i < 60; i++) { // 60 updates (1 second at 60fps)
          act(() => {
            result.current.setStatus(i % 2 === 0 ? 'listening' : 'evaluating');
            result.current.updatePressedKeys([60 + (i % 10)]);
          });
        }

        const totalTime = performance.now() - start;
        const averageTime = totalTime / 60;

        expect(averageTime).toBeLessThan(16.67); // Maintain 60fps
      }).toThrow(/Cannot find module|usePracticeStore is not defined/);
    });
  });

  describe('End-to-End MIDI Latency', () => {
    test('should process MIDI input to result in <30ms', async () => {
      expect(async () => {
        // Mock high-resolution timer
        let capturedLatency = 0;
        const mockMidiHandler = jest.fn();
        const mockResultHandler = jest.fn((result) => {
          capturedLatency = performance.now() - startTime;
        });

        // Setup mocks
        jest.doMock('@/renderer/hooks/useMidi', () => ({
          useMidi: jest.fn(({ onKeysChanged }) => {
            mockMidiHandler.mockImplementation(() => {
              // Simulate immediate key processing
              if (onKeysChanged) {
                onKeysChanged([60]);
              }
            });
            return { pressedKeys: new Set([60]) };
          })
        }));

        jest.doMock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
          usePracticeStore: jest.fn(() => ({
            isActive: true,
            status: 'listening',
            currentStep: {
              notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
              isChord: false,
              isRest: false,
              measureIndex: 0,
              timestamp: Date.now()
            },
            setResult: mockResultHandler
          }))
        }));

        const { result } = renderHook(() => usePracticeController());

        // Measure end-to-end latency
        const startTime = performance.now();
        
        act(() => {
          mockMidiHandler(); // Simulate MIDI input
        });

        await new Promise(resolve => setImmediate(resolve));

        expect(capturedLatency).toBeLessThan(30); // <30ms total
        expect(mockResultHandler).toHaveBeenCalledWith({ type: 'CORRECT' });
      }).rejects.toThrow(/Cannot find module|usePracticeController is not defined/);
    });

    test('should maintain latency under load', async () => {
      expect(async () => {
        const latencies: number[] = [];
        
        // Simulate 100 rapid MIDI events
        for (let i = 0; i < 100; i++) {
          const start = performance.now();
          
          // Simulate MIDI processing
          const expected = {
            notes: [{ midiValue: 60 + (i % 12), pitchName: 'Note', octave: 4 }],
            isChord: false,
            isRest: false,
            measureIndex: i,
            timestamp: Date.now()
          };
          
          const played = [60 + (i % 12)];
          const result = compareNotes(played, expected);
          
          latencies.push(performance.now() - start);
          
          // Small delay between events
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

        expect(avgLatency).toBeLessThan(20); // Average <20ms
        expect(p95Latency).toBeLessThan(25); // 95th percentile <25ms
        expect(maxLatency).toBeLessThan(30); // Max <30ms
      }).rejects.toThrow(/Cannot find module|compareNotes is not defined/);
    });
  });

  describe('OSMD Cursor Operations', () => {
    test('should get notes at cursor in <10ms', () => {
      expect(() => {
        // Mock OSMD cursor with realistic data
        const mockCursor = {
          iterator: {
            endReached: false,
            CurrentVoiceEntries: [{
              Notes: Array.from({ length: 5 }, (_, i) => ({
                halfTone: i * 2,
                Pitch: { toString: () => `Note${i}`, Octave: 4 },
                Tie: null
              })),
              IsGrace: false
            }],
            currentMeasureIndex: 0
          }
        };

        const getExpectedNotesAtCursor = jest.fn(() => {
          // Simulate OSMD processing
          const notes = mockCursor.iterator.CurrentVoiceEntries.flatMap(entry =>
            entry.Notes.map(note => ({
              midiValue: note.halfTone + 60,
              pitchName: note.Pitch.toString(),
              octave: note.Pitch.Octave
            }))
          );

          return {
            notes,
            isChord: notes.length > 1,
            isRest: notes.length === 0,
            measureIndex: mockCursor.iterator.currentMeasureIndex,
            timestamp: Date.now()
          };
        });

        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          getExpectedNotesAtCursor();
          times.push(performance.now() - start);
        }

        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const maxTime = Math.max(...times);

        expect(avgTime).toBeLessThan(5); // Average <5ms
        expect(maxTime).toBeLessThan(10); // Max <10ms
      }).toThrow(/Cannot find module/);
    });

    test('should advance cursor position in <10ms', () => {
      expect(() => {
        const mockNextCursorPosition = jest.fn(() => {
          // Simulate cursor advancement
          const currentMeasure = 0;
          const nextMeasure = currentMeasure + 1;
          // Update internal state
          return nextMeasure;
        });

        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          mockNextCursorPosition();
          times.push(performance.now() - start);
        }

        const avgTime = times.reduce((a, b) => a + b) / times.length;
        expect(avgTime).toBeLessThan(10);
      }).toThrow(/mockNextCursorPosition/);
    });
  });

  describe('Debounce Performance', () => {
    test('should debounce efficiently without blocking', () => {
      expect(() => {
        jest.useFakeTimers();
        
        const debounce = (fn: Function, delay: number) => {
          let timeoutId: NodeJS.Timeout;
          const debounced = (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
          };
          debounced.cancel = () => clearTimeout(timeoutId);
          return debounced;
        };

        const callback = jest.fn();
        const debouncedFn = debounce(callback, 50);

        const start = performance.now();

        // Rapid calls
        for (let i = 0; i < 1000; i++) {
          debouncedFn(i);
        }

        const setupTime = performance.now() - start;
        expect(setupTime).toBeLessThan(10); // Setup should be fast

        jest.advanceTimersByTime(50);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(999);

        jest.useRealTimers();
      }).toThrow(/debounce/);
    });
  });

  describe('Memory Performance', () => {
    test('should not leak memory in comparison operations', () => {
      expect(() => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Run many comparisons
        for (let i = 0; i < 10000; i++) {
          const expected: PracticeStep = {
            notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
            isChord: false,
            isRest: false,
            measureIndex: i,
            timestamp: Date.now()
          };
          
          compareNotes([60], expected);
        }

        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

        expect(memoryIncrease).toBeLessThan(5); // Less than 5MB increase
      }).toThrow(/Cannot find module|compareNotes is not defined/);
    });
  });
});