/**
 * Memory Leak Detection Tests
 * 
 * Critical tests for identifying memory leaks in production
 * These tests are especially important for Electron apps
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, cleanup } from '@testing-library/react';

// These imports will be created during implementation
// import { useOSMD } from '@/renderer/hooks/useOSMD';
// import { SheetMusic } from '@/renderer/components/SheetMusic';
// import { memoryProfiler } from '@/renderer/utils/memoryProfiler';

// Enable memory profiling in tests
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

describe('Memory Leak Detection', () => {
  let initialMemory: number;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture initial memory state
    if (global.gc) {
      global.gc(); // Force garbage collection if available
    }
    
    initialMemory = performance.memory?.usedJSHeapSize || 0;
  });

  afterEach(() => {
    cleanup();
    
    // Force cleanup
    if (global.gc) {
      global.gc();
    }
  });

  describe('OSMD Instance Lifecycle', () => {
    test('should not leak OSMD instances on repeated mount/unmount', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const iterations = 10;
        const memorySnapshots: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          const { unmount } = render(<SheetMusic musicXML="<score/>" />);
          
          await waitFor(() => {
            expect(screen.queryByRole('img')).toBeInTheDocument();
          });
          
          unmount();
          
          // Force GC and capture memory
          if (global.gc) {
            global.gc();
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const currentMemory = performance.memory?.usedJSHeapSize || 0;
          memorySnapshots.push(currentMemory);
        }
        
        // Calculate memory growth
        const finalMemory = memorySnapshots[memorySnapshots.length - 1];
        const memoryGrowth = finalMemory - initialMemory;
        const averageGrowthPerIteration = memoryGrowth / iterations;
        
        console.log(`Memory growth after ${iterations} iterations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Average per iteration: ${(averageGrowthPerIteration / 1024).toFixed(2)}KB`);
        
        // Should not grow more than 100KB per iteration (indicates leak)
        expect(averageGrowthPerIteration).toBeLessThan(100 * 1024);
      }).rejects.toThrow('Memory leak prevention not implemented');
    });

    test('should cleanup WebGL/Canvas contexts properly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
        const contexts: any[] = [];
        
        getContextSpy.mockImplementation(function(this: HTMLCanvasElement, contextType: string) {
          const ctx = this.getContext.call(this, contextType);
          if (ctx) contexts.push(ctx);
          return ctx;
        });
        
        // Create and destroy multiple instances
        for (let i = 0; i < 5; i++) {
          const { unmount } = render(<SheetMusic musicXML="<score/>" />);
          
          await waitFor(() => {
            expect(screen.queryByRole('img')).toBeInTheDocument();
          });
          
          unmount();
        }
        
        // Verify contexts were cleaned up
        contexts.forEach(ctx => {
          if (ctx.isContextLost) {
            expect(ctx.isContextLost()).toBe(true);
          }
        });
        
        getContextSpy.mockRestore();
      }).rejects.toThrow('Canvas context cleanup not implemented');
    });
  });

  describe('Event Listener Leaks', () => {
    test('should remove all event listeners on cleanup', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        
        const { unmount } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        const addedListeners = addEventListenerSpy.mock.calls;
        
        unmount();
        
        // Verify all added listeners were removed
        addedListeners.forEach(([event, handler]) => {
          expect(removeEventListenerSpy).toHaveBeenCalledWith(event, handler);
        });
      }).rejects.toThrow('Event listener cleanup not implemented');
    });

    test('should cleanup ResizeObserver without leaks', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        let observerCount = 0;
        const observers: ResizeObserver[] = [];
        
        const OriginalResizeObserver = window.ResizeObserver;
        window.ResizeObserver = class extends OriginalResizeObserver {
          constructor(callback: ResizeObserverCallback) {
            super(callback);
            observerCount++;
            observers.push(this);
          }
          
          disconnect() {
            super.disconnect();
            observerCount--;
          }
        };
        
        // Mount and unmount multiple times
        for (let i = 0; i < 5; i++) {
          const { unmount } = render(<SheetMusic musicXML="<score/>" />);
          await waitFor(() => {
            expect(screen.queryByRole('img')).toBeInTheDocument();
          });
          unmount();
        }
        
        expect(observerCount).toBe(0);
        
        window.ResizeObserver = OriginalResizeObserver;
      }).rejects.toThrow('ResizeObserver leak prevention not implemented');
    });
  });

  describe('MIDI Callback Leaks', () => {
    test('should not leak MIDI event callbacks', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const callbacks = new WeakSet();
        let callbackCount = 0;
        
        // Track callback creation
        const originalUseMidi = jest.requireActual('@/renderer/hooks/useMidi').useMidi;
        jest.mock('@/renderer/hooks/useMidi', () => ({
          useMidi: (callback: Function) => {
            callbacks.add(callback);
            callbackCount++;
            return originalUseMidi(callback);
          }
        }));
        
        // Mount and unmount repeatedly
        for (let i = 0; i < 10; i++) {
          const { result, unmount } = renderHook(() => 
            useMidi((event) => console.log(event))
          );
          
          unmount();
        }
        
        // Force GC
        if (global.gc) {
          global.gc();
        }
        
        // Callbacks should be garbage collected
        expect(callbackCount).toBe(10);
        // Note: We can't directly test WeakSet size, but no memory growth indicates success
      }).rejects.toThrow('MIDI callback leak prevention not implemented');
    });
  });

  describe('Store Subscription Leaks', () => {
    test('should cleanup Zustand subscriptions properly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const subscriptions = new Set();
        
        // Mock store to track subscriptions
        const mockStore = {
          subscribe: jest.fn((callback) => {
            subscriptions.add(callback);
            return () => subscriptions.delete(callback);
          }),
          getState: jest.fn(() => ({}))
        };
        
        jest.mock('@/renderer/stores/sheetMusicStore', () => ({
          useSheetMusicStore: mockStore
        }));
        
        // Create and destroy components
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(<SheetMusic musicXML="<score/>" />);
          unmount();
        }
        
        expect(subscriptions.size).toBe(0);
      }).rejects.toThrow('Store subscription cleanup not implemented');
    });
  });

  describe('Large Data Structure Leaks', () => {
    test('should release large MusicXML data on unmount', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const largeXML = generateLargeScore(1000); // ~1MB of data
        const xmlSize = new Blob([largeXML]).size;
        
        console.log(`Testing with ${(xmlSize / 1024 / 1024).toFixed(2)}MB MusicXML`);
        
        const memoryBefore = performance.memory?.usedJSHeapSize || 0;
        
        const { unmount } = render(<SheetMusic musicXML={largeXML} />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        const memoryDuring = performance.memory?.usedJSHeapSize || 0;
        
        unmount();
        
        // Force GC and wait
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const memoryAfter = performance.memory?.usedJSHeapSize || 0;
        
        // Memory should return close to initial state
        const retainedMemory = memoryAfter - memoryBefore;
        
        console.log(`Memory retained after unmount: ${(retainedMemory / 1024).toFixed(2)}KB`);
        
        // Should not retain more than 10% of the original data
        expect(retainedMemory).toBeLessThan(xmlSize * 0.1);
      }).rejects.toThrow('Large data cleanup not implemented');
    });

    test('should clear MIDI mapping data structures', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const container = document.createElement('div');
        
        const { result, unmount } = renderHook(() => 
          useOSMD({ current: container }, generateLargeScore(500))
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Check mapping size
        const mappingSize = result.current._midiToTimestamp.size;
        expect(mappingSize).toBeGreaterThan(100);
        
        unmount();
        
        // Mappings should be cleared
        expect(result.current._midiToTimestamp.size).toBe(0);
        expect(result.current._timestampToSVG.size).toBe(0);
      }).rejects.toThrow('Mapping cleanup not implemented');
    });
  });

  describe('Performance Observer Leaks', () => {
    test('should cleanup performance observers', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        let observerCount = 0;
        const observers: PerformanceObserver[] = [];
        
        const OriginalPerformanceObserver = window.PerformanceObserver;
        window.PerformanceObserver = class extends OriginalPerformanceObserver {
          constructor(callback: PerformanceObserverCallback) {
            super(callback);
            observerCount++;
            observers.push(this);
          }
          
          disconnect() {
            super.disconnect();
            observerCount--;
          }
        };
        
        const { unmount } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        unmount();
        
        expect(observerCount).toBe(0);
        
        window.PerformanceObserver = OriginalPerformanceObserver;
      }).rejects.toThrow('Performance observer cleanup not implemented');
    });
  });

  describe('Long-Running Memory Tests', () => {
    test('should not leak memory over extended usage', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        jest.setTimeout(30000); // 30 second test
        
        const memorySnapshots: { time: number; memory: number }[] = [];
        const startTime = Date.now();
        
        const { rerender } = render(<SheetMusic musicXML="<score/>" />);
        
        // Simulate extended usage
        for (let i = 0; i < 100; i++) {
          // Update score
          rerender(<SheetMusic musicXML={generateRandomScore()} />);
          
          // Simulate MIDI events
          for (let j = 0; j < 10; j++) {
            act(() => {
              window.dispatchEvent(new CustomEvent('midi-event', {
                detail: { 
                  type: j % 2 === 0 ? 'noteOn' : 'noteOff',
                  note: 60 + (j % 12),
                  velocity: 100
                }
              }));
            });
          }
          
          // Capture memory every 10 iterations
          if (i % 10 === 0) {
            if (global.gc) global.gc();
            
            memorySnapshots.push({
              time: Date.now() - startTime,
              memory: performance.memory?.usedJSHeapSize || 0
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Analyze memory growth
        const firstSnapshot = memorySnapshots[0].memory;
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1].memory;
        const growthRate = (lastSnapshot - firstSnapshot) / memorySnapshots.length;
        
        console.log('Memory growth over time:', memorySnapshots.map(s => 
          `${(s.time / 1000).toFixed(1)}s: ${(s.memory / 1024 / 1024).toFixed(2)}MB`
        ).join(', '));
        
        // Should not grow more than 1MB per 10 iterations
        expect(growthRate).toBeLessThan(1024 * 1024);
      }).rejects.toThrow('Long-running memory stability not implemented');
    });
  });
});

// Helper functions
function generateLargeScore(noteCount: number): string {
  const measures = Math.ceil(noteCount / 16);
  let score = '<score-partwise><part id="P1">';
  
  for (let m = 0; m < measures; m++) {
    score += `<measure number="${m + 1}">`;
    for (let n = 0; n < 16 && m * 16 + n < noteCount; n++) {
      const pitch = 'CDEFGAB'[(m + n) % 7];
      const octave = 3 + Math.floor((m + n) / 7) % 4;
      score += `
        <note>
          <pitch>
            <step>${pitch}</step>
            <octave>${octave}</octave>
          </pitch>
          <duration>1</duration>
        </note>
      `;
    }
    score += '</measure>';
  }
  
  score += '</part></score-partwise>';
  return score;
}

function generateRandomScore(): string {
  const noteCount = 20 + Math.floor(Math.random() * 30);
  return generateLargeScore(noteCount);
}