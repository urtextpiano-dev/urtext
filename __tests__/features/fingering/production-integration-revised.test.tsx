// Phase 4 Production Integration Tests - REVISED after AI Review
// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// These imports will fail until implementation
// import { FingeringSettings } from '@/renderer/features/fingering/components/FingeringSettings';
// import { FingeringErrorBoundary } from '@/renderer/features/fingering/components/FingeringErrorBoundary';
// import { useFingeringSettings, useFingeringSettingsStore } from '@/renderer/features/fingering/hooks/useFingeringSettings';
// import { useViewportOptimization } from '@/renderer/features/fingering/hooks/useViewportOptimization';
// import { usePracticeModeIntegration } from '@/renderer/features/fingering/hooks/usePracticeModeIntegration';
// import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';
// import { useFingeringStore } from '@/renderer/features/fingering/stores/fingeringStore';
// import { perfLogger } from '@/renderer/utils/performance-logger';

// Shared test utilities (CHATGPT 4.1: Centralized helpers)
import { 
  generateFingeringId,
  parseFingeringId,
  createMockAnnotation,
  createMockScore,
  setupMockDexie
} from '../../test-utils/fingering-test-helpers';

// Mock dependencies
jest.mock('@/renderer/contexts/OSMDContext');
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');
jest.mock('@/renderer/utils/performance-logger');
jest.mock('zustand/middleware', () => ({
  persist: jest.fn((config) => config)
}));

// Performance thresholds (CHATGPT O3: Quantified values)
const PERFORMANCE_THRESHOLDS = {
  viewportCalc: 2, // ms per scroll event
  memoryOverhead: 5 * 1024 * 1024, // 5MB for 1000 fingerings
  midiLatencyAddition: 1, // ms max additional latency
  settingsApply: 100, // ms for settings to take effect
  debounceInterval: 50, // ms for viewport updates
  scrollMargin: 50, // px for viewport visibility
  minFontSize: 8,
  maxFontSize: 16,
  defaultFontSize: 12
};

// Default settings values (CHATGPT O3: Explicit defaults)
const DEFAULT_SETTINGS = {
  isEnabled: true,
  showOnAllNotes: false,
  fontSize: 12,
  color: '#000080', // Blue
  clickToEdit: true,
  version: 1
};

describe('Phase 4: Production Integration - Revised Implementation Tests', () => {
  const user = userEvent.setup({ delay: null });
  let cleanupFunctions: Array<() => void> = [];
  let mockOSMD: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    
    // Mock performance measurements
    global.performance.now = jest.fn(() => 0);
    global.performance.memory = { usedJSHeapSize: 0 };
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    
    // Setup shared mock OSMD (GEMINI: OSMD integration)
    mockOSMD = {
      container: document.createElement('div'),
      render: jest.fn().mockResolvedValue(undefined),
      zoom: 1.0,
      EngravingRules: { PageHeight: 1000 }
    };
  });
  
  afterEach(() => {
    jest.useRealTimers();
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];
  });

  describe('Task 4.1: Settings Integration (Enhanced)', () => {
    describe('FingeringSettings Component with Exact Specifications', () => {
      test('should render all controls with exact default values and DOM structure', () => {
        expect(() => {
          render(<FingeringSettings />);
          
          // Enable/disable toggle
          const enableToggle = screen.getByRole('checkbox', { 
            name: /enable fingering annotations/i 
          });
          expect(enableToggle).toBeInTheDocument();
          expect(enableToggle).toBeChecked();
          expect(enableToggle).toHaveAttribute('id', 'fingering-enabled');
          
          // Show on all notes toggle
          const showAllToggle = screen.getByRole('checkbox', { 
            name: /show fingerings on all notes/i 
          });
          expect(showAllToggle).toBeInTheDocument();
          expect(showAllToggle).not.toBeChecked();
          expect(showAllToggle).toHaveAttribute('aria-describedby', 'show-all-help');
          
          // Font size slider with exact range
          const fontSizeSlider = screen.getByRole('slider', { 
            name: /font size: 12px/i // Include current value in label
          });
          expect(fontSizeSlider).toHaveValue('12');
          expect(fontSizeSlider).toHaveAttribute('min', '8');
          expect(fontSizeSlider).toHaveAttribute('max', '16');
          expect(fontSizeSlider).toHaveAttribute('step', '1');
          
          // Color selector with exact options
          const colorSelect = screen.getByRole('combobox', { name: /color:/i });
          expect(colorSelect).toHaveValue('#000080');
          const colorOptions = [
            { value: '#000080', label: 'Blue' },
            { value: '#006600', label: 'Green' },
            { value: '#800000', label: 'Red' },
            { value: '#000000', label: 'Black' }
          ];
          
          const options = within(colorSelect).getAllByRole('option');
          options.forEach((option, index) => {
            expect(option).toHaveValue(colorOptions[index].value);
            expect(option).toHaveTextContent(colorOptions[index].label);
          });
          
          // Helper text (CHATGPT O3: Exact copy)
          const helperText = screen.getByText(
            'Displays suggested fingerings for unmarked notes'
          );
          expect(helperText).toHaveAttribute('id', 'show-all-help');
          expect(helperText).toHaveClass('small', 'text-muted');
        }).toThrow('Phase 4: Settings exact specifications - not implemented yet');
      });

      test('should apply settings changes to rendered fingerings immediately', async () => {
        expect(async () => {
          // GEMINI: Settings changes actually render on score
          const { result: settingsResult } = renderHook(() => useFingeringSettings());
          const store = useFingeringStore.getState();
          
          // Setup score with fingerings
          store.annotations['test-score'] = {
            't1-m60': 1,
            't2-m62': 2
          };
          
          render(
            <div>
              <FingeringSettings />
              <FingeringLayer scoreId="test-score" />
            </div>
          );
          
          // Verify initial rendering
          const fingerings = screen.getAllByTestId(/fingering-/);
          fingerings.forEach(el => {
            expect(el).toHaveStyle({
              fontSize: '12px',
              color: '#000080'
            });
          });
          
          // Change color
          const colorSelect = screen.getByRole('combobox', { name: /color:/i });
          await user.selectOptions(colorSelect, '#800000');
          
          // Verify immediate visual update
          await waitFor(() => {
            fingerings.forEach(el => {
              expect(el).toHaveStyle({ color: '#800000' });
            });
          }, { timeout: PERFORMANCE_THRESHOLDS.settingsApply });
          
          // Change font size
          const fontSlider = screen.getByRole('slider', { name: /font size/i });
          await user.clear(fontSlider);
          await user.type(fontSlider, '14');
          
          await waitFor(() => {
            fingerings.forEach(el => {
              expect(el).toHaveStyle({ fontSize: '14px' });
            });
          });
          
          // Disable fingering
          const enableToggle = screen.getByRole('checkbox', { 
            name: /enable fingering/i 
          });
          await user.click(enableToggle);
          
          // All fingerings should disappear
          await waitFor(() => {
            expect(screen.queryAllByTestId(/fingering-/)).toHaveLength(0);
          });
        }).toThrow('Phase 4: Settings render integration - not implemented yet');
      });

      test('should handle rapid settings changes without race conditions', async () => {
        expect(async () => {
          // GROK3: Rapid settings changes
          render(<FingeringSettings />);
          const fontSlider = screen.getByRole('slider', { name: /font size/i });
          
          // Rapid changes
          const rapidChanges = async () => {
            for (let i = 0; i < 20; i++) {
              const size = 8 + (i % 9); // 8-16
              await user.clear(fontSlider);
              await user.type(fontSlider, size.toString());
              // No delay between changes
            }
          };
          
          await rapidChanges();
          
          // Final value should be consistent
          const { fontSize } = useFingeringSettings();
          expect(fontSize).toBe(15); // Last value in sequence
          
          // No memory leaks or excessive timers
          const timers = jest.getTimerCount();
          expect(timers).toBeLessThan(5); // Reasonable timer count
        }).toThrow('Phase 4: Rapid settings changes - not implemented yet');
      });

      test('should validate and sanitize extreme/malicious settings values', async () => {
        expect(async () => {
          // GROK3: Extreme values and security
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Test extreme font sizes
          act(() => {
            result.current.updateSettings({ fontSize: 0 });
          });
          expect(result.current.fontSize).toBe(PERFORMANCE_THRESHOLDS.minFontSize);
          
          act(() => {
            result.current.updateSettings({ fontSize: 100 });
          });
          expect(result.current.fontSize).toBe(PERFORMANCE_THRESHOLDS.maxFontSize);
          
          // Test malicious color input (XSS attempt)
          act(() => {
            result.current.updateSettings({ 
              color: '<script>alert("xss")</script>' 
            });
          });
          expect(result.current.color).toBe('#000080'); // Fallback to default
          
          // Test invalid hex color
          act(() => {
            result.current.updateSettings({ color: 'not-a-color' });
          });
          expect(result.current.color).toBe('#000080'); // Fallback
          
          // Test valid but unusual color formats
          act(() => {
            result.current.updateSettings({ color: '#FFF' });
          });
          expect(result.current.color).toBe('#FFFFFF'); // Normalized
        }).toThrow('Phase 4: Settings validation and security - not implemented yet');
      });

      test('should maintain accessibility with high contrast mode', () => {
        expect(() => {
          // GROK3: Accessibility conflicts
          window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-contrast: high)',
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }));
          
          render(<FingeringSettings />);
          
          // Controls should have increased contrast
          const controls = screen.getAllByRole(/checkbox|slider|combobox/);
          controls.forEach(control => {
            const styles = window.getComputedStyle(control);
            expect(styles.borderWidth).toBe('2px');
            expect(styles.outline).toContain('solid');
          });
          
          // Labels should be clearly visible
          const labels = screen.getAllByText(/font size|color|enable/i);
          labels.forEach(label => {
            expect(label).toHaveStyle({
              fontWeight: 'bold'
            });
          });
        }).toThrow('Phase 4: High contrast accessibility - not implemented yet');
      });
    });

    describe('Task 4.2: Settings Store with localStorage Edge Cases', () => {
      test('should handle localStorage unavailable or full gracefully', async () => {
        expect(async () => {
          // GEMINI & GROK3: Storage failure handling
          const originalSetItem = Storage.prototype.setItem;
          
          // Test localStorage disabled
          Storage.prototype.setItem = jest.fn(() => {
            throw new Error('localStorage is disabled');
          });
          
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Should initialize with defaults
          expect(result.current).toMatchObject(DEFAULT_SETTINGS);
          
          // Should handle update without crashing
          act(() => {
            result.current.updateSettings({ fontSize: 14 });
          });
          
          expect(result.current.fontSize).toBe(14); // In-memory update works
          
          // Should log warning
          expect(console.warn).toHaveBeenCalledWith(
            'Failed to persist settings:',
            expect.any(Error)
          );
          
          // Test quota exceeded
          Storage.prototype.setItem = jest.fn(() => {
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
          });
          
          act(() => {
            result.current.updateSettings({ color: '#006600' });
          });
          
          // Should notify user
          expect(window.api.notify).toHaveBeenCalledWith({
            type: 'warning',
            message: 'Settings storage full. Some preferences may not persist.',
            action: 'Clear Storage'
          });
          
          Storage.prototype.setItem = originalSetItem;
        }).toThrow('Phase 4: localStorage failure handling - not implemented yet');
      });

      test('should handle cross-tab synchronization correctly', async () => {
        expect(async () => {
          // GROK3: Cross-tab conflicts
          const { result: tab1 } = renderHook(() => useFingeringSettingsStore());
          const { result: tab2 } = renderHook(() => useFingeringSettingsStore());
          
          // Simulate storage event from another tab
          const storageEvent = new StorageEvent('storage', {
            key: 'abc-piano-fingering-settings',
            newValue: JSON.stringify({
              state: { ...DEFAULT_SETTINGS, fontSize: 16 },
              version: 1
            }),
            storageArea: localStorage
          });
          
          window.dispatchEvent(storageEvent);
          
          // Both tabs should sync
          await waitFor(() => {
            expect(tab1.current.fontSize).toBe(16);
            expect(tab2.current.fontSize).toBe(16);
          });
          
          // Rapid cross-tab updates
          for (let i = 0; i < 10; i++) {
            const event = new StorageEvent('storage', {
              key: 'abc-piano-fingering-settings',
              newValue: JSON.stringify({
                state: { ...DEFAULT_SETTINGS, fontSize: 8 + i },
                version: 1
              })
            });
            window.dispatchEvent(event);
          }
          
          // Should handle without errors
          expect(tab1.current.fontSize).toBe(17); // Last value
          expect(tab2.current.fontSize).toBe(17);
        }).toThrow('Phase 4: Cross-tab synchronization - not implemented yet');
      });

      test('should migrate settings across versions with specific scenarios', () => {
        expect(() => {
          // CHATGPT O3: Version migration matrix
          const migrationTests = [
            {
              from: {
                version: 0,
                state: { enabled: true, fontSize: 14 } // v0 schema
              },
              to: {
                version: 1,
                state: { 
                  isEnabled: true, // renamed
                  fontSize: 14,
                  showOnAllNotes: false, // added
                  color: '#000080', // added
                  clickToEdit: true // added
                }
              }
            },
            {
              from: {
                version: 1,
                state: { ...DEFAULT_SETTINGS, customProp: 'test' }
              },
              to: {
                version: 2,
                state: {
                  ...DEFAULT_SETTINGS,
                  // customProp removed in v2
                  advancedMode: false // added in v2
                }
              }
            }
          ];
          
          migrationTests.forEach(({ from, to }) => {
            localStorage.setItem(
              'abc-piano-fingering-settings',
              JSON.stringify(from)
            );
            
            const { result } = renderHook(() => useFingeringSettingsStore());
            
            expect(result.current).toMatchObject(to.state);
            
            // Verify version updated
            const stored = JSON.parse(
              localStorage.getItem('abc-piano-fingering-settings')!
            );
            expect(stored.version).toBe(to.version);
            
            localStorage.clear();
          });
        }).toThrow('Phase 4: Version migration scenarios - not implemented yet');
      });
    });

    describe('Task 4.3: Enhanced Viewport Optimization', () => {
      describe('OSMD Integration and Re-render Handling', () => {
        test('should survive OSMD re-render and maintain fingering positions', async () => {
          expect(async () => {
            // GEMINI: OSMD re-render integration
            jest.mocked(useOSMDContext).mockReturnValue({
              osmd: mockOSMD,
              isReady: true
            });
            
            const { result } = renderHook(() => useViewportOptimization());
            
            // Set initial viewport
            act(() => {
              result.current.viewportBounds = {
                left: 0, right: 1024, top: 0, bottom: 768
              };
            });
            
            // Track fingering positions before re-render
            const fingeringsBefore = [
              { id: 't1-m60', x: 100, y: 200 },
              { id: 't2-m62', x: 200, y: 200 }
            ];
            
            // Trigger OSMD re-render
            act(() => {
              mockOSMD.render();
            });
            
            // Hook should re-calculate after OSMD render promise
            await waitFor(() => {
              expect(result.current.viewportBounds).toBeDefined();
            });
            
            // Fingerings should be recalculated
            expect(mockOSMD.render).toHaveBeenCalled();
            
            // Viewport bounds should update based on new container position
            expect(result.current.viewportBounds).toEqual({
              left: expect.any(Number),
              right: expect.any(Number),
              top: expect.any(Number),
              bottom: expect.any(Number)
            });
          }).toThrow('Phase 4: OSMD re-render survival - not implemented yet');
        });

        test('should handle auto-scroll during practice mode efficiently', async () => {
          expect(async () => {
            // GEMINI: Auto-scroll during practice
            const mockPracticeStore = {
              isActive: true,
              currentMeasure: 5,
              scrollToMeasure: jest.fn()
            };
            
            jest.mocked(usePracticeStore).mockReturnValue(mockPracticeStore);
            
            const { result } = renderHook(() => useViewportOptimization());
            
            // Simulate practice auto-scroll
            act(() => {
              // Measure 5 scrolls into view
              mockOSMD.container.scrollTop = 500;
              mockPracticeStore.currentMeasure = 6;
            });
            
            // Pre-render fingerings for upcoming measure
            const upcomingFingerings = result.current.getVisibleFingeringsWithLookahead(
              100 // 100px lookahead
            );
            
            // Should include measure 6 fingerings before fully visible
            expect(upcomingFingerings).toContain('t6-m65');
            expect(upcomingFingerings).toContain('t6.5-m67');
            
            // Performance: calculation should be fast
            const start = performance.now();
            result.current.getVisibleFingeringsWithLookahead(100);
            const duration = performance.now() - start;
            
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.viewportCalc);
          }).toThrow('Phase 4: Practice auto-scroll optimization - not implemented yet');
        });

        test('should handle device orientation changes smoothly', async () => {
          expect(async () => {
            // GROK3: Device orientation
            const { result } = renderHook(() => useViewportOptimization());
            
            // Portrait orientation
            window.innerWidth = 768;
            window.innerHeight = 1024;
            
            act(() => {
              window.dispatchEvent(new Event('orientationchange'));
            });
            
            await waitFor(() => {
              expect(result.current.viewportBounds?.right).toBe(768);
              expect(result.current.viewportBounds?.bottom).toBe(1024);
            });
            
            // Switch to landscape
            window.innerWidth = 1024;
            window.innerHeight = 768;
            
            act(() => {
              window.dispatchEvent(new Event('orientationchange'));
            });
            
            await waitFor(() => {
              expect(result.current.viewportBounds?.right).toBe(1024);
              expect(result.current.viewportBounds?.bottom).toBe(768);
            });
            
            // No flicker or multiple recalculations
            expect(mockOSMD.container.getBoundingClientRect).toHaveBeenCalledTimes(2);
          }).toThrow('Phase 4: Orientation change handling - not implemented yet');
        });

        test('should optimize background tab behavior', async () => {
          expect(async () => {
            // GROK3: Background tab optimization
            const { result } = renderHook(() => useViewportOptimization());
            
            // Simulate background tab
            Object.defineProperty(document, 'hidden', {
              writable: true,
              value: true
            });
            
            // Fire multiple scroll events while backgrounded
            for (let i = 0; i < 100; i++) {
              window.dispatchEvent(new Event('scroll'));
            }
            
            // Should not calculate while hidden
            expect(mockOSMD.container.getBoundingClientRect).not.toHaveBeenCalled();
            
            // Return to foreground
            Object.defineProperty(document, 'hidden', { value: false });
            document.dispatchEvent(new Event('visibilitychange'));
            
            // Should recalculate once
            await waitFor(() => {
              expect(mockOSMD.container.getBoundingClientRect).toHaveBeenCalledTimes(1);
            });
          }).toThrow('Phase 4: Background tab optimization - not implemented yet');
        });

        test('should handle rapid scroll with 1000+ annotations efficiently', async () => {
          expect(async () => {
            // GROK3: Large dataset performance
            const annotations = {};
            for (let i = 0; i < 1000; i++) {
              annotations[generateFingeringId(i * 0.5, 60 + (i % 12))] = (i % 5) + 1;
            }
            
            const store = useFingeringStore.getState();
            store.annotations['large-score'] = annotations;
            
            const { result } = renderHook(() => useViewportOptimization());
            
            // Simulate rapid erratic scrolling
            const scrollPositions = [0, 500, 100, 800, 200, 1000, 300];
            const measurements: number[] = [];
            
            for (const position of scrollPositions) {
              const start = performance.now();
              
              act(() => {
                mockOSMD.container.scrollTop = position;
                window.dispatchEvent(new Event('scroll'));
              });
              
              // Let debounce settle
              act(() => {
                jest.advanceTimersByTime(PERFORMANCE_THRESHOLDS.debounceInterval);
              });
              
              const duration = performance.now() - start;
              measurements.push(duration);
            }
            
            // All calculations should be fast
            measurements.forEach(duration => {
              expect(duration).toBeLessThan(20); // Well under 20ms requirement
            });
            
            // Average should be very fast
            const avg = measurements.reduce((a, b) => a + b) / measurements.length;
            expect(avg).toBeLessThan(10);
          }).toThrow('Phase 4: Rapid scroll performance - not implemented yet');
        });
      });
    });

    describe('Task 4.4: Enhanced Error Handling', () => {
      test('should scope errors to fingering feature only', async () => {
        expect(async () => {
          // GEMINI: Feature-scoped failure
          const ThrowingFingeringComponent = () => {
            throw new Error('Fingering render error');
          };
          
          const WorkingMIDIComponent = () => (
            <div data-testid="midi-controls">
              <button>Play</button>
              <button>Stop</button>
            </div>
          );
          
          const WorkingSheetMusic = () => (
            <div data-testid="sheet-music">Sheet Music Content</div>
          );
          
          render(
            <div>
              <WorkingMIDIComponent />
              <WorkingSheetMusic />
              <FingeringErrorBoundary>
                <ThrowingFingeringComponent />
              </FingeringErrorBoundary>
            </div>
          );
          
          // Fingering shows error
          expect(screen.getByText(/temporarily disabled/i)).toBeInTheDocument();
          
          // Other features still work
          expect(screen.getByTestId('midi-controls')).toBeInTheDocument();
          expect(screen.getByTestId('sheet-music')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /play/i })).toBeEnabled();
          expect(screen.getByRole('button', { name: /stop/i })).toBeEnabled();
        }).toThrow('Phase 4: Feature-scoped error boundary - not implemented yet');
      });

      test('should handle transposition without breaking fingerings', async () => {
        expect(async () => {
          // GEMINI: Cross-feature interaction
          const store = useFingeringStore.getState();
          store.annotations['test-score'] = {
            't1-m60': 1, // C4
            't2-m62': 2, // D4
            't3-m64': 3  // E4
          };
          
          const mockTransposition = {
            transpose: jest.fn((semitones: number) => {
              // Simulate transposition clearing fingerings
              store.clearAnnotations('test-score');
            })
          };
          
          render(
            <div>
              <FingeringLayer scoreId="test-score" />
              <button onClick={() => mockTransposition.transpose(2)}>
                Transpose +2
              </button>
            </div>
          );
          
          // Verify fingerings exist
          expect(screen.getAllByTestId(/fingering-/)).toHaveLength(3);
          
          // Transpose
          await user.click(screen.getByRole('button', { name: /transpose/i }));
          
          // Fingerings should be cleared (safest option)
          expect(screen.queryAllByTestId(/fingering-/)).toHaveLength(0);
          
          // Should notify user
          expect(window.api.notify).toHaveBeenCalledWith({
            type: 'info',
            message: 'Fingerings cleared after transposition. Please re-add as needed.'
          });
        }).toThrow('Phase 4: Transposition interaction - not implemented yet');
      });

      test('should handle network-dependent features gracefully', async () => {
        expect(async () => {
          // GROK3: Network failures
          // Mock font loading failure
          const originalFetch = global.fetch;
          global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
          
          render(<FingeringLayer scoreId="test-score" />);
          
          // Should use fallback font
          const fingerings = screen.queryAllByTestId(/fingering-/);
          fingerings.forEach(el => {
            expect(el).toHaveStyle({
              fontFamily: expect.stringContaining('sans-serif') // Fallback
            });
          });
          
          // Should not block UI
          expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
          
          global.fetch = originalFetch;
        }).toThrow('Phase 4: Network failure handling - not implemented yet');
      });
    });

    describe('Task 4.5: Enhanced Practice Mode Integration', () => {
      test('should handle rapid mode switching without state corruption', async () => {
        expect(async () => {
          // GROK3: Rapid mode switching
          const practiceStore = {
            isActive: false,
            setActive: jest.fn()
          };
          
          jest.mocked(usePracticeStore).mockReturnValue(practiceStore);
          
          const { result } = renderHook(() => 
            usePracticeModeIntegration('test-score')
          );
          
          // Rapid toggles
          for (let i = 0; i < 20; i++) {
            act(() => {
              practiceStore.isActive = i % 2 === 0;
              practiceStore.setActive(practiceStore.isActive);
            });
          }
          
          // State should be consistent
          expect(result.current.practiceActive).toBe(false); // Last state
          expect(result.current.shouldShowFingeringEdit).toBe(true);
          
          // No memory leaks
          expect(jest.getTimerCount()).toBeLessThan(5);
        }).toThrow('Phase 4: Rapid mode switching - not implemented yet');
      });

      test('should integrate with practice mode auto-scroll and timing', async () => {
        expect(async () => {
          // CHATGPT 4.1: End-to-end practice flow
          const mockPractice = {
            isActive: true,
            currentStep: {
              measureIndex: 5,
              timestamp: 10.5,
              notes: [
                { midiValue: 60, timestamp: 10.5 },
                { midiValue: 64, timestamp: 10.5 },
                { midiValue: 67, timestamp: 10.5 }
              ]
            },
            tempo: 120,
            startPractice: jest.fn(),
            stopPractice: jest.fn()
          };
          
          jest.mocked(usePracticeStore).mockReturnValue(mockPractice);
          
          // Setup fingerings for practice section
          const store = useFingeringStore.getState();
          store.annotations['test-score'] = {
            [generateFingeringId(10.5, 60)]: 1,
            [generateFingeringId(10.5, 64)]: 3,
            [generateFingeringId(10.5, 67)]: 5
          };
          
          render(
            <div>
              <PracticeMode scoreId="test-score" />
              <FingeringLayer scoreId="test-score" />
            </div>
          );
          
          // Fingerings should be visible but not editable
          const fingerings = screen.getAllByTestId(/fingering-/);
          expect(fingerings).toHaveLength(3);
          
          // Click on fingering during practice should not open input
          await user.click(fingerings[0]);
          expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
          
          // Current step fingerings could be highlighted (optional)
          fingerings.forEach((el, index) => {
            const expectedFinger = [1, 3, 5][index];
            expect(el).toHaveTextContent(expectedFinger.toString());
            // Could have highlight class
            expect(el).toHaveClass('fingering--current-step');
          });
        }).toThrow('Phase 4: Practice mode integration flow - not implemented yet');
      });
    });

    describe('Task 4.6: Production Performance & Stress Tests', () => {
      test('should maintain MIDI latency under stress with fingerings', async () => {
        expect(async () => {
          // GROK3: MIDI latency under stress
          // Setup high load scenario
          const annotations = {};
          for (let i = 0; i < 500; i++) {
            annotations[generateFingeringId(i * 0.1, 60 + (i % 24))] = (i % 5) + 1;
          }
          
          useFingeringStore.getState().annotations['stress-test'] = annotations;
          
          render(<FingeringLayer scoreId="stress-test" />);
          
          // Simulate MIDI processing with fingering lookups
          const midiLatencies: number[] = [];
          
          for (let i = 0; i < 100; i++) {
            const note = 60 + (i % 24);
            const timestamp = i * 0.1;
            const start = performance.now();
            
            // Simulate MIDI event processing
            const noteId = generateFingeringId(timestamp, note);
            const fingering = annotations[noteId];
            
            // Simulate visual feedback update
            if (fingering) {
              // Would trigger re-render
              act(() => {
                const element = document.querySelector(
                  `[data-testid="fingering-${noteId}"]`
                );
                if (element) {
                  element.classList.add('active');
                }
              });
            }
            
            const latency = performance.now() - start;
            midiLatencies.push(latency);
          }
          
          // Verify latency requirements
          const avgLatency = midiLatencies.reduce((a, b) => a + b) / midiLatencies.length;
          const maxLatency = Math.max(...midiLatencies);
          const p95Latency = midiLatencies.sort((a, b) => a - b)[95];
          
          expect(avgLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.midiLatencyAddition);
          expect(maxLatency).toBeLessThan(20); // Hard limit
          expect(p95Latency).toBeLessThan(5); // 95th percentile
        }).toThrow('Phase 4: MIDI latency under stress - not implemented yet');
      });

      test('should work on low-end devices with reduced features', () => {
        expect(() => {
          // GROK3: Low-end device support
          // Simulate low-end device
          navigator.hardwareConcurrency = 2; // 2 CPU cores
          performance.memory = { 
            usedJSHeapSize: 200 * 1024 * 1024, // 200MB used
            totalJSHeapSize: 512 * 1024 * 1024, // 512MB total
            jsHeapSizeLimit: 512 * 1024 * 1024
          };
          
          const { result } = renderHook(() => useFingeringSettings());
          
          // Should auto-detect and reduce features
          expect(result.current.autoReduceQuality).toBe(true);
          expect(result.current.maxVisibleFingerings).toBe(50); // Reduced from unlimited
          expect(result.current.disableAnimations).toBe(true);
          
          render(<FingeringLayer scoreId="test-score" />);
          
          // Should use simplified rendering
          const fingerings = screen.queryAllByTestId(/fingering-/);
          fingerings.forEach(el => {
            // No transitions or animations
            expect(el).toHaveStyle({
              transition: 'none',
              animation: 'none'
            });
          });
        }).toThrow('Phase 4: Low-end device optimization - not implemented yet');
      });

      test('should handle touch input edge cases on mobile', async () => {
        expect(async () => {
          // GROK3: Touch edge cases
          render(<FingeringLayer scoreId="test-score" />);
          
          const noteElement = screen.getByTestId('note-t1-m60');
          
          // Multi-touch (two fingers)
          const multiTouchEvent = new TouchEvent('touchstart', {
            touches: [
              { identifier: 1, clientX: 100, clientY: 200 } as Touch,
              { identifier: 2, clientX: 150, clientY: 200 } as Touch
            ]
          });
          
          noteElement.dispatchEvent(multiTouchEvent);
          
          // Should ignore multi-touch for fingering
          expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
          
          // Accidental touch during scroll
          const scrollingTouch = new TouchEvent('touchstart', {
            touches: [{ identifier: 1, clientX: 100, clientY: 200 } as Touch]
          });
          
          // Set scroll flag
          document.body.dataset.scrolling = 'true';
          noteElement.dispatchEvent(scrollingTouch);
          
          // Should not open input during scroll
          expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
          
          // Valid single touch after scroll stops
          delete document.body.dataset.scrolling;
          
          const validTouch = new TouchEvent('touchend', {
            changedTouches: [{ identifier: 1, clientX: 100, clientY: 200 } as Touch]
          });
          
          noteElement.dispatchEvent(validTouch);
          
          // Now should open
          await waitFor(() => {
            expect(screen.getByRole('textbox')).toBeInTheDocument();
          });
        }).toThrow('Phase 4: Touch input edge cases - not implemented yet');
      });

      test('should validate against malicious input in all user inputs', async () => {
        expect(async () => {
          // GROK3: Security validation
          const maliciousInputs = [
            '<script>alert("xss")</script>',
            '"><script>alert("xss")</script>',
            'javascript:alert("xss")',
            '<img src=x onerror=alert("xss")>',
            '${alert("xss")}',
            '{{constructor.constructor("alert(1)")()}}',
            '\'; DROP TABLE fingerings; --',
            '../../../etc/passwd',
            'data:text/html,<script>alert("xss")</script>'
          ];
          
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          for (const input of maliciousInputs) {
            // Try to inject via color setting
            act(() => {
              result.current.updateSettings({ color: input });
            });
            
            // Should sanitize or reject
            expect(result.current.color).toMatch(/^#[0-9A-F]{6}$/i);
            
            // Try to inject via font size (as string)
            act(() => {
              result.current.updateSettings({ fontSize: input as any });
            });
            
            // Should coerce to valid number
            expect(typeof result.current.fontSize).toBe('number');
            expect(result.current.fontSize).toBeGreaterThanOrEqual(
              PERFORMANCE_THRESHOLDS.minFontSize
            );
            expect(result.current.fontSize).toBeLessThanOrEqual(
              PERFORMANCE_THRESHOLDS.maxFontSize
            );
          }
          
          // No XSS in rendered output
          render(<FingeringSettings />);
          
          const dangerousElements = document.querySelectorAll('script, iframe, object, embed');
          expect(dangerousElements).toHaveLength(0);
        }).toThrow('Phase 4: Security input validation - not implemented yet');
      });
    });

    describe('Cross-Phase Integration Tests', () => {
      test('should complete full user journey from settings to persistence', async () => {
        expect(async () => {
          // CHATGPT 4.1: Cross-phase integration
          // 1. User opens settings
          render(<FingeringSettings />);
          
          // 2. User customizes settings
          const colorSelect = screen.getByRole('combobox', { name: /color/i });
          const fontSlider = screen.getByRole('slider', { name: /font size/i });
          
          await user.selectOptions(colorSelect, '#006600');
          await user.clear(fontSlider);
          await user.type(fontSlider, '14');
          
          // 3. Settings persist
          await act(async () => {
            jest.runAllTimers(); // Flush persistence
          });
          
          const stored = localStorage.getItem('abc-piano-fingering-settings');
          expect(JSON.parse(stored!).state).toMatchObject({
            color: '#006600',
            fontSize: 14
          });
          
          // 4. User adds fingering with new settings
          const noteElement = document.createElement('div');
          noteElement.setAttribute('data-note-id', generateFingeringId(1, 60));
          document.body.appendChild(noteElement);
          
          await user.click(noteElement);
          const input = await screen.findByRole('textbox');
          await user.type(input, '3');
          await user.keyboard('{Enter}');
          
          // 5. Fingering renders with custom settings
          const fingering = await screen.findByTestId('fingering-t1-m60');
          expect(fingering).toHaveStyle({
            color: '#006600',
            fontSize: '14px'
          });
          
          // 6. Survives page reload
          const reloadedSettings = JSON.parse(
            localStorage.getItem('abc-piano-fingering-settings')!
          );
          expect(reloadedSettings.state.color).toBe('#006600');
        }).toThrow('Phase 4: Full user journey integration - not implemented yet');
      });

      test('should handle error propagation from store to UI gracefully', async () => {
        expect(async () => {
          // CHATGPT 4.1: Error propagation
          const mockDexie = setupMockDexie();
          
          // Inject failure at database level
          mockDexie.fingerings.put = jest.fn().mockRejectedValue(
            new Error('Database connection lost')
          );
          
          render(
            <FingeringErrorBoundary>
              <FingeringLayer scoreId="test-score" />
            </FingeringErrorBoundary>
          );
          
          // Try to add fingering
          const noteElement = document.createElement('div');
          noteElement.setAttribute('data-note-id', generateFingeringId(1, 60));
          await user.click(noteElement);
          
          const input = await screen.findByRole('textbox');
          await user.type(input, '3');
          await user.keyboard('{Enter}');
          
          // Should show user-friendly error
          await waitFor(() => {
            expect(screen.getByText(/unable to save/i)).toBeInTheDocument();
          });
          
          // Should offer retry
          const retryButton = screen.getByRole('button', { name: /retry/i });
          
          // Fix database
          mockDexie.fingerings.put = jest.fn().mockResolvedValue(undefined);
          
          // Retry should work
          await user.click(retryButton);
          await waitFor(() => {
            expect(screen.queryByText(/unable to save/i)).not.toBeInTheDocument();
          });
        }).toThrow('Phase 4: Error propagation integration - not implemented yet');
      });
    });
  });
});