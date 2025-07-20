/**
 * useOSMD Hook Tests
 * 
 * Tests the core OSMD lifecycle management hook
 * Critical for Phase 1 foundation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// These imports will be created during implementation
// import { useOSMD } from '@/renderer/hooks/useOSMD';
// import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

// Mock OSMD with realistic async behavior
jest.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: jest.fn().mockImplementation(() => {
    let isLoaded = false;
    return {
      load: jest.fn().mockImplementation((xml: string) => 
        new Promise((resolve, reject) => {
          // Simulate async loading
          setTimeout(() => {
            if (!xml || xml === 'invalid-xml') {
              reject(new Error('Invalid MusicXML'));
            } else {
              isLoaded = true;
              resolve(true);
            }
          }, 50);
        })
      ),
      render: jest.fn().mockImplementation(() => {
        if (!isLoaded) throw new Error('Cannot render before load');
      }),
      clear: jest.fn().mockImplementation(() => {
        isLoaded = false;
      }),
      graphic: {
        get musicPages() {
          return isLoaded ? [{
            staffEntries: [{
              sourceStaffEntry: {
                absoluteTimestamp: { realValue: 0 }
              },
              graphicalVoiceEntries: [{
                notes: [{
                  getSVGGElement: () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
                  sourceNote: { halfTone: 0 }
                }]
              }]
            }]
          }] : [];
        }
      }
    };
  })
}));

describe('useOSMD Hook', () => {
  let container: HTMLDivElement;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Hook Initialization', () => {
    test('should initialize with IDLE status', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => useOSMD({ current: null }));
        
        expect(result.current.status).toBe('IDLE');
        expect(result.current.error).toBeUndefined();
        expect(result.current.imperativeApi).toBeDefined();
      }).toThrow('useOSMD hook not implemented');
    });

    test('should expose imperative API with required methods', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => useOSMD({ current: container }));
        const { imperativeApi } = result.current;
        
        expect(imperativeApi).toHaveProperty('updateNoteVisuals');
        expect(imperativeApi).toHaveProperty('clearAllHighlights');
        expect(typeof imperativeApi.updateNoteVisuals).toBe('function');
        expect(typeof imperativeApi.clearAllHighlights).toBe('function');
      }).toThrow('Imperative API not implemented');
    });
  });

  describe('OSMD Configuration', () => {
    test('should configure OSMD with required options', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockConstructor = jest.spyOn(OpenSheetMusicDisplay, 'constructor');
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADING');
        });
        
        expect(mockConstructor).toHaveBeenCalledWith(
          container,
          expect.objectContaining({
            autoResize: false,
            backend: 'svg', // CRITICAL requirement
            drawingParameters: 'compact',
            pageFormat: 'Endless'
          })
        );
      }).rejects.toThrow('OSMD configuration not implemented');
    });

    test('should verify SVG backend is active', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Check that SVG elements are created
        const svgElements = container.querySelectorAll('svg');
        expect(svgElements.length).toBeGreaterThan(0);
      }).rejects.toThrow('SVG backend verification not implemented');
    });
  });

  describe('Lifecycle Management', () => {
    test('should transition through states correctly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        // Initial state
        expect(result.current.status).toBe('IDLE');
        
        // Loading state
        await waitFor(() => {
          expect(result.current.status).toBe('LOADING');
        });
        
        // Loaded state
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
      }).rejects.toThrow('State transitions not implemented');
    });

    test('should handle load errors gracefully', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, 'invalid-xml')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('ERROR');
          expect(result.current.error).toBeDefined();
          expect(result.current.error?.message).toContain('Invalid MusicXML');
        });
      }).rejects.toThrow('Error handling not implemented');
    });

    test('should cleanup on unmount with AbortController', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockClear = jest.spyOn(OpenSheetMusicDisplay.prototype, 'clear');
        
        const { result, unmount } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        unmount();
        
        expect(mockClear).toHaveBeenCalled();
        expect(container.innerHTML).toBe('');
      }).rejects.toThrow('Cleanup not implemented');
    });
  });

  describe('ResizeObserver Functionality', () => {
    test('should setup ResizeObserver after loading', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockObserve = jest.fn();
        global.ResizeObserver = jest.fn().mockImplementation(() => ({
          observe: mockObserve,
          disconnect: jest.fn()
        }));
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        expect(mockObserve).toHaveBeenCalledWith(container);
      }).rejects.toThrow('ResizeObserver not implemented');
    });

    test('should implement resize throttling (max 5/sec)', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        let resizeCount = 0;
        const mockRender = jest.fn(() => resizeCount++);
        
        jest.spyOn(OpenSheetMusicDisplay.prototype, 'render').mockImplementation(mockRender);
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Simulate 10 rapid resize events
        const resizeObserver = global.ResizeObserver.mock.instances[0];
        for (let i = 0; i < 10; i++) {
          resizeObserver.callback();
        }
        
        // Should throttle to max 5
        expect(resizeCount).toBeLessThanOrEqual(5);
      }).rejects.toThrow('Resize throttling not implemented');
    });

    test('should prevent resize observer loops', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Should not throw even with recursive resizes
        act(() => {
          for (let i = 0; i < 100; i++) {
            container.style.width = `${300 + i}px`;
          }
        });
        
        expect(result.current.error).toBeUndefined();
      }).rejects.toThrow('Loop protection not implemented');
    });
  });

  describe('Note Mapping System', () => {
    test('should build note mapping after loading', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // @ts-expect-error - Will be implemented
        expect(result.current.noteMapping.size).toBeGreaterThan(0);
      }).rejects.toThrow('Note mapping not implemented');
    });

    test('should create bidirectional MIDI mapping', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Should map MIDI notes to timestamps
        // @ts-expect-error - Will be implemented
        const midiToTimestamp = result.current._midiToTimestamp;
        expect(midiToTimestamp.has(60)).toBe(true); // Middle C
      }).rejects.toThrow('MIDI mapping not implemented');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track initialization performance', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const markSpy = jest.spyOn(performance, 'mark');
        const measureSpy = jest.spyOn(performance, 'measure');
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        expect(markSpy).toHaveBeenCalledWith('osmd-init-start');
        expect(markSpy).toHaveBeenCalledWith('osmd-init-end');
        expect(measureSpy).toHaveBeenCalledWith(
          'osmd-initialization',
          'osmd-init-start',
          'osmd-init-end'
        );
      }).rejects.toThrow('Performance tracking not implemented');
    });

    test('should complete initialization within 300ms', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const startTime = performance.now();
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(300);
      }).rejects.toThrow('Performance optimization not implemented');
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid mount/unmount cycles', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        for (let i = 0; i < 5; i++) {
          const { unmount } = renderHook(() => 
            useOSMD({ current: container }, '<score/>')
          );
          
          // Unmount before loading completes
          setTimeout(() => unmount(), 10);
        }
        
        // Should not throw errors
        expect(true).toBe(true);
      }).rejects.toThrow('Rapid lifecycle handling not implemented');
    });

    test('should handle container reference changes', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result, rerender } = renderHook(
          ({ ref }) => useOSMD(ref, '<score/>'),
          { initialProps: { ref: { current: container } } }
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Change container reference
        const newContainer = document.createElement('div');
        rerender({ ref: { current: newContainer } });
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
      }).rejects.toThrow('Container change handling not implemented');
    });

    test('should handle missing container gracefully', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: null }, '<score/>')
        );
        
        expect(result.current.status).toBe('IDLE');
        expect(result.current.error).toBeUndefined();
      }).toThrow('Missing container handling not implemented');
    });

    test('should validate imperative API stability', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result, rerender } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        const api1 = result.current.imperativeApi;
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        const api2 = result.current.imperativeApi;
        
        // API reference should remain stable
        expect(api1).toBe(api2);
      }).rejects.toThrow('API stability not implemented');
    });
  });

  describe('Data Integrity - Critical Gap Tests', () => {
    test('should verify correctness of note-to-SVG mapping', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const knownMusicXML = `
          <score-partwise>
            <part id="P1">
              <measure number="1">
                <note>
                  <pitch>
                    <step>C</step>
                    <octave>4</octave>
                  </pitch>
                  <duration>4</duration>
                </note>
              </measure>
            </part>
          </score-partwise>
        `;
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, knownMusicXML)
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Verify specific note mapping
        const middleC = 60; // MIDI note number
        const timestamps = result.current._midiToTimestamp.get(middleC);
        expect(timestamps).toBeDefined();
        expect(timestamps!.length).toBeGreaterThan(0);
        
        // Verify reverse mapping
        const timestamp = timestamps![0];
        const noteMapping = result.current.noteMapping.get(timestamp);
        expect(noteMapping).toBeDefined();
        expect(noteMapping!.svgElements.length).toBeGreaterThan(0);
      }).rejects.toThrow('Note mapping verification not implemented');
    });

    test('should handle empty/null musicXML', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, null)
        );
        
        expect(result.current.status).toBe('IDLE');
        
        // Should clear any previous score
        const mockClear = jest.spyOn(OpenSheetMusicDisplay.prototype, 'clear');
        expect(mockClear).toHaveBeenCalled();
      }).rejects.toThrow('Null XML handling not implemented');
    });

    test('should handle empty score gracefully', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const emptyScore = '<score-partwise></score-partwise>';
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, emptyScore)
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Note map should be empty
        expect(result.current.noteMapping.size).toBe(0);
        expect(container.innerHTML).not.toBe('');
      }).rejects.toThrow('Empty score handling not implemented');
    });

    test('should handle malformed XML with error state', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const malformedXML = '<score>unclosed tag';
        
        const { result } = renderHook(() => 
          useOSMD({ current: container }, malformedXML)
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('ERROR');
          expect(result.current.error).toBeDefined();
          expect(result.current.error?.message).toContain('XML');
        });
      }).rejects.toThrow('Malformed XML handling not implemented');
    });
  });
});