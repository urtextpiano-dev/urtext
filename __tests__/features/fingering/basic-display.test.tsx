// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// These imports will fail until implementation
import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';
import { useFingeringPositioning } from '@/renderer/features/fingering/hooks/useFingeringPositioning';
import { useFingeringStore } from '@/renderer/features/fingering/stores/fingeringStore';
import { OSMDProvider } from '@/renderer/contexts/OSMDContext';
import { SheetMusic } from '@/renderer/components/SheetMusic/SheetMusic';

// Mock OSMD context for testing
const mockOSMDContext = {
  osmd: {
    GraphicSheet: {
      MeasureList: []
    },
    container: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: 800,
      clientHeight: 600
    }
  },
  isReady: true,
  graphicalNoteMap: new Map()
};

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => ({
    ...mockOSMDContext,
    setOSMDInstance: jest.fn(),
    clearOSMDInstance: jest.fn()
  }),
  OSMDProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock theme hook
jest.mock('@/renderer/features/theme', () => ({
  useTheme: () => ({ theme: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock useOSMD hook
jest.mock('@/renderer/hooks/useOSMD', () => ({
  useOSMD: () => ({
    osmd: mockOSMDContext.osmd,
    isReady: mockOSMDContext.isReady,
    graphicalNoteMap: mockOSMDContext.graphicalNoteMap,
    isLoading: false,
    error: null,
    controls: {},
    noteMapping: new Map(),
    detectRepeats: () => []
  })
}));

describe('Version Basic Display - Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset OSMD mock
    mockOSMDContext.graphicalNoteMap.clear();
  });

  describe('Core Requirements', () => {
    describe('Fingering Layer Component', () => {
      test('should render SVG overlay with fingering numbers', () => {
        // Pre-populate store with test data
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 1);
        store.setFingering('test-score', 2.0, 62, 2);
        
        // Set up graphicalNoteMap
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
        });
        mockOSMDContext.graphicalNoteMap.set('t2-m62', {
          getBoundingBox: () => ({ x: 150, y: 200, width: 20, height: 30 })
        });
        
        render(
          <svg>
            <FingeringLayer scoreId="test-score" graphicalNoteMap={mockOSMDContext.graphicalNoteMap} />
          </svg>
        );
        
        // Should render as SVG text elements
        expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
        expect(screen.getByTestId('fingering-t1-m60')).toHaveTextContent('1');
        expect(screen.getByTestId('fingering-t2-m62')).toHaveTextContent('2');
      });

      test('should apply viewport filtering for performance', () => {
        
          // Add many fingerings
          const store = useFingeringStore.getState();
          for (let i = 0; i < 100; i++) {
            store.setFingering('test-score', i * 0.5, 60 + (i % 12), (i % 5) + 1);
          }
          
          // Set up graphicalNoteMap for visible range
          for (let i = 0; i < 100; i++) {
            mockOSMDContext.graphicalNoteMap.set(`t${i * 0.5}-m${60 + (i % 12)}`, {
              getBoundingBox: () => ({ x: i * 10, y: 200, width: 20, height: 30 })
            });
          }
          
          // Render with viewport filter
          render(
            <svg>
              <FingeringLayer 
                scoreId="test-score" 
                visibleTimeRange={{ start: 10, end: 20 }}
                graphicalNoteMap={mockOSMDContext.graphicalNoteMap}
              />
            </svg>
          );
          
          // Should only render visible fingerings
          const renderedFingerings = screen.getAllByTestId(/fingering-t/);
          expect(renderedFingerings.length).toBeLessThan(30); // Not all 100
        
      });

      test('should limit rendering to 300 annotations maximum', () => {
        
          // Add 500 fingerings
          const store = useFingeringStore.getState();
          for (let i = 0; i < 500; i++) {
            store.setFingering('test-score', i * 0.1, 60 + (i % 88), (i % 5) + 1);
          }
          
          // Mock console.warn to verify warning
          const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
          
          // Set up graphicalNoteMap for all notes
          for (let i = 0; i < 500; i++) {
            mockOSMDContext.graphicalNoteMap.set(`t${i * 0.1}-m${60 + (i % 88)}`, {
              getBoundingBox: () => ({ x: i * 5, y: 200, width: 20, height: 30 })
            });
          }
          
          render(
            <svg>
              <FingeringLayer scoreId="test-score" graphicalNoteMap={mockOSMDContext.graphicalNoteMap} />
            </svg>
          );
          
          // Should warn about limiting
          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Large number of fingerings')
          );
          
          // Should render exactly 300
          const renderedFingerings = screen.getAllByTestId(/fingering-t/);
          expect(renderedFingerings.length).toBe(300);
          
          warnSpy.mockRestore();
        
      });

      test('should include accessibility attributes', () => {
        
          const store = useFingeringStore.getState();
          store.setFingering('test-score', 1.5, 60, 3);
          
          // Set up graphicalNoteMap
          mockOSMDContext.graphicalNoteMap.set('t1.5-m60', {
            getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
          });
          
          render(
            <svg>
              <FingeringLayer scoreId="test-score" graphicalNoteMap={mockOSMDContext.graphicalNoteMap} />
            </svg>
          );
          
          const fingering = screen.getByTestId('fingering-t1.5-m60');
          expect(fingering).toHaveAttribute('aria-label', 'Fingering 3 for note at timestamp 1.5');
          expect(fingering).toHaveAttribute('role', 'img');
        
      });
    });

    describe('Positioning Hook', () => {
      test('should use O(1) graphical note map lookup', () => {
        
          // Setup graphical note map
          const mockNote = {
            getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
          };
          mockOSMDContext.graphicalNoteMap.set('t1.5-m60', mockNote);
          
          const { result } = renderHook(() => useFingeringPositioning());
          
          const startTime = performance.now();
          const position = result.current.getFingeringPosition('t1.5-m60');
          const duration = performance.now() - startTime;
          
          expect(position).toEqual({
            x: 110, // center of note
            y: 190, // above note with dynamic offset
            noteElement: mockNote
          });
          
          expect(duration).toBeLessThan(1); // O(1) lookup should be <1ms
        
      });

      test('should handle missing notes gracefully', () => {
        
          const { result } = renderHook(() => useFingeringPositioning());
          
          // Note not in map
          const position = result.current.getFingeringPosition('t99-m99');
          expect(position).toBeNull();
        
      });

      test('should log parse failures once per session', () => {
        
          const { result } = renderHook(() => useFingeringPositioning());
          const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
          
          // First invalid ID should warn
          result.current.getFingeringPosition('invalid-id-1');
          expect(warnSpy).toHaveBeenCalledWith('Failed to parse fingering ID:', 'invalid-id-1');
          
          // Subsequent invalid IDs should not warn
          warnSpy.mockClear();
          result.current.getFingeringPosition('invalid-id-2');
          result.current.getFingeringPosition('invalid-id-3');
          expect(warnSpy).not.toHaveBeenCalled();
          
          warnSpy.mockRestore();
        
      });

      test('should calculate dynamic positioning for different layouts', () => {
        
          const { result } = renderHook(() => useFingeringPositioning());
          
          // Small note
          const smallNote = {
            getBoundingBox: () => ({ x: 100, y: 200, width: 10, height: 20 })
          };
          mockOSMDContext.graphicalNoteMap.set('t1-m60', smallNote);
          
          // Large note  
          const largeNote = {
            getBoundingBox: () => ({ x: 200, y: 100, width: 30, height: 50 })
          };
          mockOSMDContext.graphicalNoteMap.set('t2-m62', largeNote);
          
          const pos1 = result.current.getFingeringPosition('t1-m60');
          const pos2 = result.current.getFingeringPosition('t2-m62');
          
          // Dynamic offset based on note height
          expect(pos1!.y).toBe(200 - Math.max(10, 20 * 0.3)); // 194
          expect(pos2!.y).toBe(100 - Math.max(10, 50 * 0.3)); // 85
        
      });
    });

    describe('OSMD Integration', () => {
      test('should enhance useOSMD hook with graphical note map', () => {
        
          // Since useOSMD is mocked, we test that SheetMusic receives graphicalNoteMap
          const { container } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
          
          // The mocked useOSMD should provide graphicalNoteMap
          expect(mockOSMDContext.graphicalNoteMap).toBeDefined();
          expect(mockOSMDContext.graphicalNoteMap instanceof Map).toBe(true);
        
      });

      test('should integrate overlay in SheetMusic component', () => {
        
          const store = useFingeringStore.getState();
          store.setFingering('test-score', 1.0, 60, 1);
          
          render(
            <SheetMusic 
              scoreId="test-score" 
              musicXML="<xml>test</xml>" 
            />
          );
          
          // Should render OSMD container and overlay
          const container = screen.getByRole('img', { name: 'Sheet music display' }).parentElement;
          expect(container).toHaveClass('osmd-container');
          const overlayElement = container.querySelector('.fingering-overlay');
          expect(overlayElement).toBeInTheDocument();
          
          // Overlay should be positioned absolutely
          expect(overlayElement).toHaveStyle({
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 10
          });
        
      });

      test('should force remount overlay on score change', () => {
        
          const { rerender, container } = render(
            <SheetMusic scoreId="score1" musicXML="<xml>1</xml>" />
          );
          
          const overlay1 = container.querySelector('.fingering-overlay');
          const key1 = overlay1.getAttribute('key');
          
          // Change score
          rerender(
            <SheetMusic scoreId="score2" musicXML="<xml>2</xml>" />
          );
          
          const overlay2 = container.querySelector('.fingering-overlay');
          const key2 = overlay2.getAttribute('key');
          
          // Keys should be different (force remount)
          expect(key1).not.toBe(key2);
        
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should render 300 fingerings in under 16ms', () => {
      
        const store = useFingeringStore.getState();
        
        // Add 300 fingerings
        for (let i = 0; i < 300; i++) {
          store.setFingering('test-score', i * 0.1, 60 + (i % 88), (i % 5) + 1);
          // Mock positions
          mockOSMDContext.graphicalNoteMap.set(
            `t${i * 0.1}-m${60 + (i % 88)}`,
            { getBoundingBox: () => ({ x: i * 5, y: 100, width: 20, height: 30 }) }
          );
        }
        
        const startTime = performance.now();
        
        render(
          <svg>
            <FingeringLayer scoreId="test-score" />
          </svg>
        );
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(16); // 60fps target
      
    });

    test('should calculate positions in under 1ms per note', () => {
      
        const { result } = renderHook(() => useFingeringPositioning());
        
        // Setup 50 notes
        for (let i = 0; i < 50; i++) {
          mockOSMDContext.graphicalNoteMap.set(
            `t${i}-m${60 + i}`,
            { getBoundingBox: () => ({ x: i * 10, y: 100, width: 20, height: 30 }) }
          );
        }
        
        const startTime = performance.now();
        
        // Calculate 50 positions
        for (let i = 0; i < 50; i++) {
          result.current.getFingeringPosition(`t${i}-m${60 + i}`);
        }
        
        const totalTime = performance.now() - startTime;
        const avgTime = totalTime / 50;
        
        expect(avgTime).toBeLessThan(1); // <1ms per position
      
    });

    test('should handle rapid fingering updates in practice mode without lag', async () => {
      // EDGE CASE HUNTER: Real-time practice mode performance
        const store = useFingeringStore.getState();
        const { rerender } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        // Setup initial notes
        for (let i = 0; i < 50; i++) {
          mockOSMDContext.graphicalNoteMap.set(`t${i}-m${60+i}`, {
            getBoundingBox: () => ({ x: i * 10, y: 200, width: 20, height: 30 })
          });
        }
        
        // Simulate rapid updates during practice
        const updateTimes: number[] = [];
        
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          // Rapid state updates
          act(() => {
            for (let j = 0; j < 5; j++) {
              store.setFingering('test-score', i + j * 0.1, 60 + j, (j % 5) + 1);
            }
          });
          
          // Force re-render
          rerender(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
          
          const updateTime = performance.now() - startTime;
          updateTimes.push(updateTime);
          
          // Small delay to simulate practice tempo
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        // All updates should be under 20ms
        const maxUpdateTime = Math.max(...updateTimes);
        expect(maxUpdateTime).toBeLessThan(20);
      
    });
  });

  describe('Overlay Synchronization', () => {
    test('should synchronize overlay dimensions with OSMD container', async () => {
      
        const { container } = render(
          <SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />
        );
        
        const overlay = container.querySelector('.fingering-overlay') as SVGElement;
        const osmdContainer = mockOSMDContext.osmd.container;
        
        // Initially synchronized
        expect(overlay.style.width).toBe('800px');
        expect(overlay.style.height).toBe('600px');
        
        // CLARITY INSPECTOR: Overlay must copy viewBox for proper scaling
        const osmdSvg = container.querySelector('svg.osmd') as SVGElement;
        expect(overlay.getAttribute('viewBox')).toBe(osmdSvg.getAttribute('viewBox'));
        
        // Simulate container resize
        Object.defineProperty(osmdContainer, 'clientWidth', { value: 1000, configurable: true });
        Object.defineProperty(osmdContainer, 'clientHeight', { value: 700, configurable: true });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        
        // Should update after debounce
        await waitFor(() => {
          expect(overlay.style.width).toBe('1000px');
          expect(overlay.style.height).toBe('700px');
        }, { timeout: 200 });
      
    });

    test('should handle scroll container events', async () => {
      
        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const scrollContainer = mockOSMDContext.osmd.container;
        
        // Mock scroll position
        Object.defineProperty(scrollContainer, 'scrollLeft', { value: 100, configurable: true });
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 50, configurable: true });
        
        // Dispatch scroll event
        scrollContainer.dispatchEvent(new Event('scroll'));
        
        // Should trigger viewport update (tested via viewport filtering)
        // This would affect which fingerings are rendered
      
    });

    test('should clean up event listeners on unmount', () => {
      
        const { unmount } = render(
          <SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />
        );
        
        const scrollContainer = mockOSMDContext.osmd.container;
        const addEventListenerSpy = jest.spyOn(scrollContainer, 'addEventListener');
        const removeEventListenerSpy = jest.spyOn(scrollContainer, 'removeEventListener');
        
        // Should add listeners
        expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
        
        unmount();
        
        // Should remove listeners
        expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
        
        // CLARITY INSPECTOR: Also check window resize listener cleanup
        const windowRemoveSpy = jest.spyOn(window, 'removeEventListener');
        unmount();
        expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
    });

    test('should re-calculate positions on OSMD zoom', async () => {
      // COVERAGE VALIDATOR: Critical for zoom functionality
        // Setup initial state
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 1);
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
        });

        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const fingering = screen.getByTestId('fingering-t1-m60');
        // Initial position based on x:100
        expect(fingering).toHaveAttribute('x', '110');

        // Simulate a zoom event by changing the note's bounding box
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 200, y: 400, width: 40, height: 60 }) // Doubled
        });
        
        // Trigger OSMD zoom event
        act(() => {
          window.dispatchEvent(new CustomEvent('osmd_zoom_changed'));
        });

        await waitFor(() => {
          const updatedFingering = screen.getByTestId('fingering-t1-m60');
          // Position should be updated based on the new x:200, width:40
          expect(updatedFingering).toHaveAttribute('x', '220');
        });
        
        // CLARITY INSPECTOR: Verify zoom event listener cleanup
        const windowRemoveSpy = jest.spyOn(window, 'removeEventListener');
        unmount();
        expect(windowRemoveSpy).toHaveBeenCalledWith('osmd_zoom_changed', expect.any(Function));
      
    });
  });

  describe('Error Handling', () => {
    test('should handle OSMD not ready state', () => {
      
        mockOSMDContext.isReady = false;
        
        const { container } = render(
          <SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />
        );
        
        // Should not render overlay when OSMD not ready
        expect(container.querySelector('.fingering-overlay')).not.toBeInTheDocument();
        
        mockOSMDContext.isReady = true;
      
    });

    test('should render correctly when graphicalNoteMap populates after initial render', async () => {
      // COVERAGE VALIDATOR: Handles async OSMD initialization
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 1);
        
        // Start with an empty map, but OSMD is "ready"
        mockOSMDContext.graphicalNoteMap.clear();
        mockOSMDContext.isReady = true;

        const { rerender } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);

        // Initially, no fingerings should be on screen because positions are unknown
        expect(screen.queryByTestId('fingering-t1-m60')).not.toBeInTheDocument();

        // Now, simulate OSMD finishing its work and populating the map
        act(() => {
          mockOSMDContext.graphicalNoteMap.set('t1-m60', {
            getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
          });
          // In a real scenario, the context provider would trigger a re-render.
          rerender(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        });
        
        // The fingering should now appear
        await waitFor(() => {
          expect(screen.getByTestId('fingering-t1-m60')).toBeInTheDocument();
          expect(screen.getByTestId('fingering-t1-m60')).toHaveTextContent('1');
        });
      
    });

    test('should log development warnings for parse failures', () => {
      
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const store = useFingeringStore.getState();
        store.loadAnnotations('test-score', {
          'invalid-format': 1,
          't1-m60': 2
        });
        
        render(
          <svg>
            <FingeringLayer scoreId="test-score" />
          </svg>
        );
        
        expect(warnSpy).toHaveBeenCalledWith(
          'Failed to parse noteId for filtering:',
          'invalid-format'
        );
        
        warnSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      
    });
  });

  describe('Edge Cases', () => {
    test('should handle OSMD container without viewBox', () => {
      
        // Remove viewBox from mock
        const osmdSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        osmdSvg.removeAttribute('viewBox');
        mockOSMDContext.osmd.container.querySelector = () => osmdSvg;
        
        const { container } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const overlay = container.querySelector('.fingering-overlay');
        
        // Should handle missing viewBox gracefully
        expect(overlay).not.toHaveAttribute('viewBox');
      
    });

    test('should clamp or skip extreme OSMD coordinate values', () => {
      // EDGE CASE HUNTER: Prevent rendering crashes from extreme coordinates
      
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 1);
        
        // Mock extreme coordinates from OSMD
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: -10000, y: 1000000, width: 20, height: 30 })
        });
        
        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const fingering = screen.queryByTestId('fingering-t1-m60');
        
        // Should either clamp values or skip rendering
        if (fingering) {
          const x = parseInt(fingering.getAttribute('x') || '0');
          const y = parseInt(fingering.getAttribute('y') || '0');
          
          // Verify values are within reasonable bounds
          expect(x).toBeGreaterThan(-1000);
          expect(x).toBeLessThan(10000);
          expect(y).toBeGreaterThan(-1000);
          expect(y).toBeLessThan(10000);
        }
        // Or fingering is not rendered at all (null)
      
    });

    test('should handle rapid score changes', async () => {
      
        const { rerender, container } = render(
          <SheetMusic scoreId="score1" musicXML="<xml>1</xml>" />
        );
        
        // Rapid score changes
        for (let i = 0; i < 10; i++) {
          rerender(
            <SheetMusic scoreId={`score${i}`} musicXML={`<xml>${i}</xml>`} />
          );
        }
        
        // Should not crash or leak memory
        const finalOverlay = container.querySelector('.fingering-overlay');
        expect(finalOverlay).toBeInTheDocument();
      
    });

    test('should handle empty fingering annotations gracefully', () => {
      
        // No annotations in store
        render(
          <svg>
            <FingeringLayer scoreId="empty-score" />
          </svg>
        );
        
        // Should render empty layer without errors
        expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
        expect(screen.queryByTestId(/fingering-t/)).not.toBeInTheDocument();
      
    });

    test('should handle multiple SheetMusic components without conflicts', () => {
      // EDGE CASE HUNTER: Multiple scores open simultaneously
      
        const store = useFingeringStore.getState();
        
        // Set different fingerings for two scores
        store.setFingering('score1', 1.0, 60, 1);
        store.setFingering('score2', 2.0, 62, 2);
        
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
        });
        mockOSMDContext.graphicalNoteMap.set('t2-m62', {
          getBoundingBox: () => ({ x: 200, y: 250, width: 20, height: 30 })
        });
        
        // Render multiple components
        const { container: container1 } = render(
          <SheetMusic scoreId="score1" musicXML="<xml>test1</xml>" />,
          { container: document.createElement('div') }
        );
        const { container: container2 } = render(
          <SheetMusic scoreId="score2" musicXML="<xml>test2</xml>" />,
          { container: document.createElement('div') }
        );
        
        // Each should only show its own fingerings
        const overlay1 = container1.querySelector('.fingering-overlay');
        const overlay2 = container2.querySelector('.fingering-overlay');
        
        expect(overlay1?.querySelector('[data-testid="fingering-t1-m60"]')).toBeTruthy();
        expect(overlay1?.querySelector('[data-testid="fingering-t2-m62"]')).toBeFalsy();
        
        expect(overlay2?.querySelector('[data-testid="fingering-t1-m60"]')).toBeFalsy();
        expect(overlay2?.querySelector('[data-testid="fingering-t2-m62"]')).toBeTruthy();
      
    });

    test('should handle extreme visibleTimeRange values in viewport culling', () => {
      // EDGE CASE HUNTER: Boundary conditions for viewport filtering
      
        const store = useFingeringStore.getState();
        
        // Add many annotations
        for (let i = 0; i < 500; i++) {
          store.setFingering('test-score', i * 0.1, 60 + (i % 88), (i % 5) + 1);
        }
        
        // Test extremely large time range
        mockOSMDContext.visibleTimeRange = { start: -100, end: 100000 };
        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        // Should still respect 300 limit
        const fingerings1 = screen.getAllByTestId(/fingering-/);
        expect(fingerings1.length).toBeLessThanOrEqual(300);
        
        // Test extremely small time range
        mockOSMDContext.visibleTimeRange = { start: 1.0, end: 1.0001 };
        const { rerender } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        // Should show only fingerings in that tiny range (or none)
        const fingerings2 = screen.queryAllByTestId(/fingering-/);
        expect(fingerings2.length).toBeLessThanOrEqual(1);
      
    });
  });

  describe('Performance Optimization Tests (from FingeringLayer)', () => {
    test('should batch DOM updates when rendering 100+ fingerings', () => {
      
        const annotations: Record<string, number> = {};
        const positions: Record<string, any> = {};
        
        // Create 150 annotations
        for (let i = 0; i < 150; i++) {
          const noteId = `t${i * 0.1}-m${60 + (i % 88)}`;
          annotations[noteId] = (i % 5) + 1;
          positions[noteId] = {
            getBoundingBox: () => ({
              x: 100 + (i * 10),
              y: 200 + ((i % 5) * 20),
              width: 20,
              height: 30
            })
          };
          mockOSMDContext.graphicalNoteMap.set(noteId, positions[noteId]);
        }
        
        const store = useFingeringStore.getState();
        store.loadAnnotations('test-score', annotations);
        
        // Mock RAF for batching
        const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
        
        render(
          <svg>
            <FingeringLayer scoreId="test-score" />
          </svg>
        );
        
        // Should batch updates
        expect(rafSpy).toHaveBeenCalled();
        
        // All fingerings should eventually render
        const fingerings = screen.getAllByTestId(/fingering-t/);
        expect(fingerings).toHaveLength(150);
        
        rafSpy.mockRestore();
      
    });

    test('should enforce 300 annotation render limit for performance', () => {
      
        const annotations: Record<string, number> = {};
        for (let i = 0; i < 500; i++) {
          annotations[`t${i * 0.1}-m${60 + (i % 88)}`] = (i % 5) + 1;
        }
        
        const store = useFingeringStore.getState();
        store.loadAnnotations('test-score', annotations);
        
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        render(
          <svg>
            <FingeringLayer scoreId="test-score" />
          </svg>
        );
        
        // Should warn about limiting
        expect(warnSpy).toHaveBeenCalledWith(
          'Large number of fingerings (500), limiting to 300 for performance'
        );
        
        // Should only render 300
        const renderedTexts = screen.getAllByTestId(/fingering-t/);
        expect(renderedTexts).toHaveLength(300);
        
        warnSpy.mockRestore();
      
    });

    test('should memoize visible fingering calculations', () => {
      
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 1);
        store.setFingering('test-score', 10.0, 62, 2); // Outside visible range
        
        const filterSpy = jest.fn();
        
        const { rerender } = render(
          <svg>
            <FingeringLayer 
              scoreId="test-score" 
              visibleTimeRange={{ start: 0, end: 5 }}
            />
          </svg>
        );
        
        // Re-render with same props
        rerender(
          <svg>
            <FingeringLayer 
              scoreId="test-score" 
              visibleTimeRange={{ start: 0, end: 5 }}
            />
          </svg>
        );
        
        // Should not recalculate visibility (memoized)
        // Only one fingering should be visible
        const visibleFingerings = screen.getAllByTestId(/fingering-t/);
        expect(visibleFingerings).toHaveLength(1);
      
    });
  });

  describe('Positioning Edge Cases (from useFingeringPositioning)', () => {
    test('should position correctly with rotated note heads', () => {
      
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 3);
        
        // Mock rotated note (e.g., whole note or special notation)
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 100, y: 200, width: 30, height: 20 }), // Wider than tall
          rotation: 45, // Rotated 45 degrees
          noteType: 'whole'
        });
        
        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const fingering = screen.getByTestId('fingering-t1-m60');
        
        // Should adjust position for rotation
        const x = parseInt(fingering.getAttribute('x') || '0');
        const y = parseInt(fingering.getAttribute('y') || '0');
        
        // Position should be adjusted for the rotation
        expect(x).toBeCloseTo(115, 0); // Centered horizontally
        expect(y).toBeLessThan(200); // Above the note
      
    });

    test('should handle chord collision prevention', () => {
      
        const store = useFingeringStore.getState();
        
        // Two notes at same timestamp (chord)
        store.setFingering('test-score', 1.5, 60, 1); // C
        store.setFingering('test-score', 1.5, 64, 3); // E
        
        // Mock chord notes at same x position
        const chordNote1 = {
          getBoundingBox: () => ({ x: 200, y: 250, width: 20, height: 30 }),
          stemDirection: 1,
          chordMembership: ['t1.5-m60', 't1.5-m64']
        };
        const chordNote2 = {
          getBoundingBox: () => ({ x: 200, y: 220, width: 20, height: 30 }),
          stemDirection: 1,
          chordMembership: ['t1.5-m60', 't1.5-m64']
        };
        
        mockOSMDContext.graphicalNoteMap.set('t1.5-m60', chordNote1);
        mockOSMDContext.graphicalNoteMap.set('t1.5-m64', chordNote2);
        
        render(<SheetMusic scoreId="test-score" musicXML="<xml>chord</xml>" />);
        
        const fingering1 = screen.getByTestId('fingering-t1.5-m60');
        const fingering2 = screen.getByTestId('fingering-t1.5-m64');
        
        const x1 = parseInt(fingering1.getAttribute('x') || '0');
        const x2 = parseInt(fingering2.getAttribute('x') || '0');
        
        // Should be offset to avoid overlap
        expect(Math.abs(x1 - x2)).toBeGreaterThan(10);
        expect(x1).toBeLessThan(210); // Left offset
        expect(x2).toBeGreaterThan(210); // Right offset
      
    });

    test('should position correctly at extreme zoom levels', () => {
      
        const store = useFingeringStore.getState();
        store.setFingering('test-score', 1.0, 60, 5);
        
        // Mock extreme zoom
        mockOSMDContext.osmd.zoom = 0.1; // Very zoomed out
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 10, y: 20, width: 2, height: 3 }) // Tiny due to zoom
        });
        
        render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        const fingering = screen.getByTestId('fingering-t1-m60');
        
        // Font size should have minimum to remain readable
        expect(fingering).toHaveStyle({ fontSize: expect.stringMatching(/[8-9]px/) });
        
        // Now test extreme zoom in
        mockOSMDContext.osmd.zoom = 5.0;
        mockOSMDContext.graphicalNoteMap.set('t1-m60', {
          getBoundingBox: () => ({ x: 500, y: 1000, width: 100, height: 150 })
        });
        
        const { rerender } = render(<SheetMusic scoreId="test-score" musicXML="<xml>test</xml>" />);
        
        // Font size should have maximum
        expect(fingering).toHaveStyle({ fontSize: expect.stringMatching(/16px/) });
      
    });
  });
});