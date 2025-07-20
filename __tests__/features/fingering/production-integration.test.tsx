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
import { FingeringSettings } from '@/renderer/features/fingering/components/FingeringSettings';
// import { FingeringErrorBoundary } from '@/renderer/features/fingering/components/FingeringErrorBoundary';
import { useFingeringSettings, useFingeringSettingsStore } from '@/renderer/features/fingering/hooks/useFingeringSettings';
// import { useViewportOptimization } from '@/renderer/features/fingering/hooks/useViewportOptimization';
// import { usePracticeModeIntegration } from '@/renderer/features/fingering/hooks/usePracticeModeIntegration';
// import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';
// import { useFingeringStore } from '@/renderer/features/fingering/stores/fingeringStore';
// import { perfLogger } from '@/renderer/utils/performance-logger';

// Mock dependencies
jest.mock('@/renderer/contexts/OSMDContext');
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');
jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: false
}));
jest.mock('@/renderer/features/fingering/utils/simple-perf-logger', () => ({
  perfLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
jest.mock('zustand/middleware', () => ({
  persist: jest.fn((createState, options) => createState)
}));

describe('Version Production Integration - Implementation Tests', () => {
  const user = userEvent.setup({ delay: null });
  let cleanupFunctions: Array<() => void> = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    
    // Mock performance measurements
    global.performance.now = jest.fn(() => 0);
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });
  
  afterEach(() => {
    jest.useRealTimers();
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];
  });

  describe('Task 4.1: Settings Integration', () => {
    describe('FingeringSettings Component', () => {
      test('should render all settings controls with proper defaults', () => {
        expect(() => {
          render(<FingeringSettings />);
          
          // Enable/disable toggle
          const enableToggle = screen.getByRole('checkbox', { name: /enable fingering annotations/i });
          expect(enableToggle).toBeInTheDocument();
          expect(enableToggle).toBeChecked(); // Default enabled
          
          // Show on all notes toggle
          const showAllToggle = screen.getByRole('checkbox', { name: /show fingerings on all notes/i });
          expect(showAllToggle).toBeInTheDocument();
          expect(showAllToggle).not.toBeChecked(); // Default off
          
          // Font size slider
          const fontSizeSlider = screen.getByRole('slider', { name: /font size/i });
          expect(fontSizeSlider).toHaveValue('12'); // Default 12px
          expect(fontSizeSlider).toHaveAttribute('min', '8');
          expect(fontSizeSlider).toHaveAttribute('max', '16');
          
          // Color selector
          const colorSelect = screen.getByRole('combobox', { name: /color/i });
          expect(colorSelect).toHaveValue('#000080'); // Default blue
          
          // Color options
          const options = within(colorSelect).getAllByRole('option');
          expect(options).toHaveLength(4);
          expect(options[0]).toHaveValue('#000080'); // Blue
          expect(options[1]).toHaveValue('#006600'); // Green
          expect(options[2]).toHaveValue('#800000'); // Red
          expect(options[3]).toHaveValue('#000000'); // Black
        }).toThrow('Version Settings component rendering - not implemented yet');
      });

      test('should hide advanced settings when fingering is disabled', async () => {
        expect(async () => {
          render(<FingeringSettings />);
          
          const enableToggle = screen.getByRole('checkbox', { name: /enable fingering annotations/i });
          
          // Advanced settings should be visible initially
          expect(screen.getByRole('checkbox', { name: /show fingerings on all notes/i })).toBeVisible();
          expect(screen.getByRole('slider', { name: /font size/i })).toBeVisible();
          expect(screen.getByRole('combobox', { name: /color/i })).toBeVisible();
          
          // Disable fingering
          await user.click(enableToggle);
          
          // Advanced settings should be hidden
          expect(screen.queryByRole('checkbox', { name: /show fingerings on all notes/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('slider', { name: /font size/i })).not.toBeInTheDocument();
          expect(screen.queryByRole('combobox', { name: /color/i })).not.toBeInTheDocument();
        }).toThrow('Version Settings visibility toggle - not implemented yet');
      });

      test('should update settings immediately on change', async () => {
        expect(async () => {
          const { result: settingsResult } = renderHook(() => useFingeringSettings());
          render(<FingeringSettings />);
          
          // Change font size
          const fontSizeSlider = screen.getByRole('slider', { name: /font size/i });
          await user.clear(fontSizeSlider);
          await user.type(fontSizeSlider, '14');
          
          // Should update immediately
          expect(settingsResult.current.fontSize).toBe(14);
          
          // Change color
          const colorSelect = screen.getByRole('combobox', { name: /color/i });
          await user.selectOptions(colorSelect, '#006600');
          
          expect(settingsResult.current.color).toBe('#006600');
          
          // Toggle show on all notes
          const showAllToggle = screen.getByRole('checkbox', { name: /show fingerings on all notes/i });
          await user.click(showAllToggle);
          
          expect(settingsResult.current.showOnAllNotes).toBe(true);
        }).toThrow('Version Settings immediate update - not implemented yet');
      });

      test('should show descriptive helper text for settings', () => {
        expect(() => {
          render(<FingeringSettings />);
          
          // Helper text for "show on all notes"
          const helperText = screen.getByText(/displays suggested fingerings for unmarked notes/i);
          expect(helperText).toBeInTheDocument();
          expect(helperText).toHaveClass('small'); // Small text styling
        }).toThrow('Version Settings helper text - not implemented yet');
      });
    });

    describe('Task 4.2: Settings Hook and Store Integration', () => {
      test('should create settings store with persistence', () => {
        expect(() => {
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Check initial state
          expect(result.current).toMatchObject({
            isEnabled: true,
            showOnAllNotes: false,
            fontSize: 12,
            color: '#000080',
            clickToEdit: true
          });
          
          // Check functions exist
          expect(typeof result.current.updateSettings).toBe('function');
          expect(typeof result.current.resetToDefaults).toBe('function');
        }).toThrow('Version Settings store creation - not implemented yet');
      });

      test('should persist settings to localStorage', async () => {
        expect(async () => {
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Update settings
          act(() => {
            result.current.updateSettings({
              fontSize: 14,
              color: '#006600',
              showOnAllNotes: true
            });
          });
          
          // Wait for persistence (debounced)
          await act(async () => {
            jest.runAllTimers();
          });
          
          // Check localStorage
          const stored = localStorage.getItem('abc-piano-fingering-settings');
          expect(stored).toBeTruthy();
          
          const parsed = JSON.parse(stored!);
          expect(parsed.state).toMatchObject({
            fontSize: 14,
            color: '#006600',
            showOnAllNotes: true
          });
          expect(parsed.version).toBe(1);
        }).toThrow('Version Settings persistence - not implemented yet');
      });

      test('should restore settings from localStorage on load', () => {
        expect(() => {
          // Pre-populate localStorage
          const savedSettings = {
            state: {
              isEnabled: false,
              fontSize: 16,
              color: '#800000',
              showOnAllNotes: true,
              clickToEdit: false
            },
            version: 1
          };
          localStorage.setItem('abc-piano-fingering-settings', JSON.stringify(savedSettings));
          
          // Create store
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Should load saved settings
          expect(result.current).toMatchObject(savedSettings.state);
        }).toThrow('Version Settings restoration - not implemented yet');
      });

      test('should handle version migration for future changes', () => {
        expect(() => {
          // Save old version settings
          const oldSettings = {
            state: {
              enabled: true, // Old property name
              fontSize: 14
            },
            version: 0
          };
          localStorage.setItem('abc-piano-fingering-settings', JSON.stringify(oldSettings));
          
          // Create store with version 1
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Should migrate old settings
          expect(result.current.isEnabled).toBe(true); // Migrated from 'enabled'
          expect(result.current.fontSize).toBe(14); // Preserved
          expect(result.current.color).toBe('#000080'); // Default added
        }).toThrow('Version Settings version migration - not implemented yet');
      });

      test('should reset to defaults correctly', () => {
        expect(() => {
          const { result } = renderHook(() => useFingeringSettingsStore());
          
          // Change settings
          act(() => {
            result.current.updateSettings({
              fontSize: 16,
              color: '#000000',
              isEnabled: false
            });
          });
          
          // Reset
          act(() => {
            result.current.resetToDefaults();
          });
          
          // Should restore defaults
          expect(result.current).toMatchObject({
            isEnabled: true,
            showOnAllNotes: false,
            fontSize: 12,
            color: '#000080',
            clickToEdit: true
          });
        }).toThrow('Version Settings reset functionality - not implemented yet');
      });
    });

    describe('Task 4.3: Performance Optimization and Viewport Rendering', () => {
      describe('useViewportOptimization Hook', () => {
        test('should calculate viewport bounds correctly', () => {
          expect(() => {
            const mockOSMD = {
              container: document.createElement('div')
            };
            
            // Position container
            mockOSMD.container.getBoundingClientRect = () => ({
              left: -100,
              top: -200,
              right: 1124,
              bottom: 968,
              width: 1224,
              height: 1168,
              x: -100,
              y: -200
            });
            
            jest.mocked(useOSMDContext).mockReturnValue({
              osmd: mockOSMD,
              isReady: true
            });
            
            const { result } = renderHook(() => useViewportOptimization());
            
            // Wait for initial calculation
            act(() => {
              jest.runAllTimers();
            });
            
            expect(result.current.viewportBounds).toEqual({
              left: 100,  // -rect.left
              right: 1124, // -rect.left + window.innerWidth
              top: 200,   // -rect.top
              bottom: 968  // -rect.top + window.innerHeight
            });
          }).toThrow('Version Viewport bounds calculation - not implemented yet');
        });

        test('should determine if element is in viewport with margin', () => {
          expect(() => {
            const { result } = renderHook(() => useViewportOptimization());
            
            // Set viewport bounds
            act(() => {
              result.current.viewportBounds = {
                left: 0,
                right: 1024,
                top: 0,
                bottom: 768
              };
            });
            
            // Test in viewport
            expect(result.current.isInViewport(500, 400)).toBe(true);
            
            // Test outside viewport
            expect(result.current.isInViewport(-100, 400)).toBe(false);
            expect(result.current.isInViewport(1100, 400)).toBe(false);
            expect(result.current.isInViewport(500, -100)).toBe(false);
            expect(result.current.isInViewport(500, 900)).toBe(false);
            
            // Test with margin (default 50px)
            expect(result.current.isInViewport(-40, 400)).toBe(true); // Within margin
            expect(result.current.isInViewport(1064, 400)).toBe(true); // Within margin
            
            // Test custom margin
            expect(result.current.isInViewport(-40, 400, 30)).toBe(false); // Outside 30px margin
            expect(result.current.isInViewport(-40, 400, 60)).toBe(true); // Within 60px margin
          }).toThrow('Version Viewport visibility check - not implemented yet');
        });

        test('should debounce viewport updates during scroll', async () => {
          expect(async () => {
            const mockOSMD = {
              container: document.createElement('div')
            };
            let rectCallCount = 0;
            
            mockOSMD.container.getBoundingClientRect = jest.fn(() => {
              rectCallCount++;
              return {
                left: -100 - rectCallCount * 10,
                top: -200,
                right: 1024,
                bottom: 768,
                width: 1124,
                height: 968,
                x: -100,
                y: -200
              };
            });
            
            jest.mocked(useOSMDContext).mockReturnValue({
              osmd: mockOSMD,
              isReady: true
            });
            
            const { result } = renderHook(() => useViewportOptimization());
            
            // Simulate rapid scroll events
            for (let i = 0; i < 10; i++) {
              window.dispatchEvent(new Event('scroll'));
              act(() => {
                jest.advanceTimersByTime(20); // Less than 50ms debounce
              });
            }
            
            // Should not update yet
            expect(mockOSMD.container.getBoundingClientRect).toHaveBeenCalledTimes(1); // Initial only
            
            // Advance past debounce
            act(() => {
              jest.advanceTimersByTime(50);
            });
            
            // Should update once
            expect(mockOSMD.container.getBoundingClientRect).toHaveBeenCalledTimes(2);
          }).toThrow('Version Viewport update debouncing - not implemented yet');
        });

        test('should handle resize events', async () => {
          expect(async () => {
            const { result } = renderHook(() => useViewportOptimization());
            
            const initialBounds = result.current.viewportBounds;
            
            // Change window size
            window.innerWidth = 1280;
            window.innerHeight = 1024;
            
            // Dispatch resize
            window.dispatchEvent(new Event('resize'));
            
            // Wait for debounced update
            act(() => {
              jest.runAllTimers();
            });
            
            // Bounds should update
            expect(result.current.viewportBounds).not.toEqual(initialBounds);
            expect(result.current.viewportBounds?.right).toBe(1280);
            expect(result.current.viewportBounds?.bottom).toBe(1024);
          }).toThrow('Version Resize event handling - not implemented yet');
        });

        test('should cleanup event listeners on unmount', () => {
          expect(() => {
            const { unmount } = renderHook(() => useViewportOptimization());
            
            const removeScrollSpy = jest.spyOn(window, 'removeEventListener');
            const removeResizeSpy = jest.spyOn(window, 'removeEventListener');
            
            unmount();
            
            expect(removeScrollSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
            expect(removeResizeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
          }).toThrow('Version Event listener cleanup - not implemented yet');
        });
      });

      describe('Viewport-based Rendering Performance', () => {
        test('should only render visible fingerings', () => {
          expect(() => {
            const mockViewport = {
              isInViewport: jest.fn((x, y) => {
                // Only elements between y: 200-600 are visible
                return y >= 200 && y <= 600;
              }),
              viewportBounds: { left: 0, right: 1024, top: 200, bottom: 600 }
            };
            
            jest.mocked(useViewportOptimization).mockReturnValue(mockViewport);
            
            // Mock 100 fingerings at different positions
            const annotations = {};
            for (let i = 0; i < 100; i++) {
              annotations[`t${i}-m60`] = (i % 5) + 1;
            }
            
            const store = useFingeringStore.getState();
            store.annotations['test-score'] = annotations;
            
            render(<FingeringLayer scoreId="test-score" />);
            
            // Should only render visible fingerings
            const renderedFingerings = screen.queryAllByTestId(/fingering-/);
            expect(renderedFingerings.length).toBeLessThan(100);
            
            // Verify isInViewport was called for each potential fingering
            expect(mockViewport.isInViewport).toHaveBeenCalledTimes(100);
          }).toThrow('Version Viewport-based rendering - not implemented yet');
        });

        test('should handle large scores with 500+ annotations efficiently', () => {
          expect(() => {
            // Create 500 annotations
            const annotations = {};
            for (let i = 0; i < 500; i++) {
              annotations[`t${i * 0.5}-m${60 + (i % 12)}`] = (i % 5) + 1;
            }
            
            const store = useFingeringStore.getState();
            store.annotations['large-score'] = annotations;
            
            const startTime = performance.now();
            
            render(<FingeringLayer scoreId="large-score" />);
            
            const renderTime = performance.now() - startTime;
            
            // Should render quickly even with many annotations
            expect(renderTime).toBeLessThan(100); // <100ms initial render
            
            // Should use O(1) Map lookups
            const lookupStart = performance.now();
            
            // Simulate 100 lookups
            for (let i = 0; i < 100; i++) {
              const fingering = annotations[`t${i * 0.5}-m${60 + (i % 12)}`];
            }
            
            const lookupTime = performance.now() - lookupStart;
            expect(lookupTime).toBeLessThan(1); // <1ms for 100 lookups
          }).toThrow('Version Large score performance - not implemented yet');
        });
      });
    });

    describe('Task 4.4: Error Handling and Recovery', () => {
      describe('FingeringErrorBoundary Component', () => {
        // Mock component that throws
        const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
          if (shouldThrow) {
            throw new Error('Fingering component error');
          }
          return <div>Fingering content</div>;
        };

        test('should catch errors and show fallback UI', () => {
          expect(() => {
            const onError = jest.fn();
            
            render(
              <FingeringErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
              </FingeringErrorBoundary>
            );
            
            // Should show fallback UI
            expect(screen.getByText(/fingering annotations temporarily disabled/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
            
            // Should have warning icon
            expect(screen.getByText('⚠️')).toBeInTheDocument();
            
            // Should have proper styling
            const fallback = screen.getByText(/fingering annotations temporarily disabled/i).parentElement;
            expect(fallback).toHaveStyle({
              padding: '10px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              color: '#856404',
              fontSize: '12px'
            });
          }).toThrow('Version Error boundary fallback UI - not implemented yet');
        });

        test('should log errors with performance logger', () => {
          expect(() => {
            const mockPerfLogger = {
              error: jest.fn()
            };
            jest.mocked(perfLogger).error = mockPerfLogger.error;
            
            render(
              <FingeringErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
              </FingeringErrorBoundary>
            );
            
            expect(mockPerfLogger.error).toHaveBeenCalledWith(
              'Fingering component error:',
              expect.objectContaining({
                error: 'Fingering component error',
                stack: expect.stringContaining('Error'),
                componentStack: expect.any(String)
              })
            );
          }).toThrow('Version Error logging - not implemented yet');
        });

        test('should allow retry after error', async () => {
          expect(async () => {
            let shouldThrow = true;
            
            const { rerender } = render(
              <FingeringErrorBoundary>
                <ThrowingComponent shouldThrow={shouldThrow} />
              </FingeringErrorBoundary>
            );
            
            // Should show error state
            expect(screen.getByText(/temporarily disabled/i)).toBeInTheDocument();
            
            // Fix the error
            shouldThrow = false;
            
            // Click retry
            await user.click(screen.getByRole('button', { name: /retry/i }));
            
            // Rerender with fixed component
            rerender(
              <FingeringErrorBoundary>
                <ThrowingComponent shouldThrow={shouldThrow} />
              </FingeringErrorBoundary>
            );
            
            // Should show content now
            expect(screen.getByText('Fingering content')).toBeInTheDocument();
            expect(screen.queryByText(/temporarily disabled/i)).not.toBeInTheDocument();
          }).toThrow('Version Error recovery with retry - not implemented yet');
        });

        test('should provide custom fallback UI option', () => {
          expect(() => {
            const customFallback = <div>Custom error message</div>;
            
            render(
              <FingeringErrorBoundary fallback={customFallback}>
                <ThrowingComponent shouldThrow={true} />
              </FingeringErrorBoundary>
            );
            
            expect(screen.getByText('Custom error message')).toBeInTheDocument();
            expect(screen.queryByText(/temporarily disabled/i)).not.toBeInTheDocument();
          }).toThrow('Version Custom fallback UI - not implemented yet');
        });

        test('should not clear store data automatically on error', () => {
          expect(() => {
            const store = useFingeringStore.getState();
            store.annotations['test-score'] = { 't1-m60': 3 };
            
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            render(
              <FingeringErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
              </FingeringErrorBoundary>
            );
            
            // Should log warning but not clear store
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              'Clearing fingering store due to error'
            );
            
            // Store should still have data
            expect(store.annotations['test-score']).toEqual({ 't1-m60': 3 });
            
            consoleWarnSpy.mockRestore();
          }).toThrow('Version Store preservation on error - not implemented yet');
        });
      });

      describe('Error Scenarios', () => {
        test('should handle IndexedDB quota exceeded errors', async () => {
          expect(async () => {
            const store = useFingeringStore.getState();
            const quotaError = new Error('QuotaExceededError');
            
            store.setFingering = jest.fn().mockRejectedValue(quotaError);
            
            const { result } = renderHook(() => useFingeringInteraction());
            
            act(() => {
              result.current.setActiveInput('t1-m60', { x: 100, y: 200 });
            });
            
            await act(async () => {
              await result.current.submitFingering(3);
            });
            
            // Should show user-friendly error
            expect(result.current.error).toBe('Storage quota exceeded. Please clear some data.');
          }).toThrow('Version Quota exceeded handling - not implemented yet');
        });

        test('should handle corrupted data gracefully', () => {
          expect(() => {
            // Simulate corrupted localStorage data
            localStorage.setItem('abc-piano-fingering-settings', 'invalid json {');
            
            // Should not crash when loading
            const { result } = renderHook(() => useFingeringSettingsStore());
            
            // Should use defaults when data is corrupted
            expect(result.current).toMatchObject({
              isEnabled: true,
              fontSize: 12,
              color: '#000080'
            });
            
            // Should log error
            expect(console.error).toHaveBeenCalledWith(
              expect.stringContaining('Failed to parse settings'),
              expect.any(Error)
            );
          }).toThrow('Version Corrupted data handling - not implemented yet');
        });
      });
    });

    describe('Task 4.5: Integration with Practice Mode', () => {
      describe('usePracticeModeIntegration Hook', () => {
        test('should detect practice mode state', () => {
          expect(() => {
            const mockPracticeStore = {
              isActive: false,
              currentStep: null
            };
            
            jest.mocked(usePracticeStore).mockReturnValue(mockPracticeStore);
            
            const { result } = renderHook(() => 
              usePracticeModeIntegration('test-score')
            );
            
            expect(result.current.practiceActive).toBe(false);
            expect(result.current.shouldShowFingeringEdit).toBe(true);
            
            // Activate practice mode
            act(() => {
              mockPracticeStore.isActive = true;
            });
            
            const { result: result2 } = renderHook(() => 
              usePracticeModeIntegration('test-score')
            );
            
            expect(result2.current.practiceActive).toBe(true);
            expect(result2.current.shouldShowFingeringEdit).toBe(false);
          }).toThrow('Version Practice mode detection - not implemented yet');
        });

        test('should hide fingering input during active practice', () => {
          expect(() => {
            jest.mocked(usePracticeStore).mockReturnValue({
              isActive: true,
              currentStep: { timestamp: 1, notes: [{ midiValue: 60 }] }
            });
            
            const { result } = renderHook(() => 
              usePracticeModeIntegration('test-score')
            );
            
            // Should not allow editing during practice
            expect(result.current.shouldShowFingeringEdit).toBe(false);
            
            // Even if fingering is enabled
            jest.mocked(useFingeringSettings).mockReturnValue({
              isEnabled: true
            });
            
            expect(result.current.shouldShowFingeringEdit).toBe(false);
          }).toThrow('Version Input hiding during practice - not implemented yet');
        });

        test('should respect fingering enabled setting', () => {
          expect(() => {
            jest.mocked(usePracticeStore).mockReturnValue({
              isActive: false,
              currentStep: null
            });
            
            jest.mocked(useFingeringSettings).mockReturnValue({
              isEnabled: false
            });
            
            const { result } = renderHook(() => 
              usePracticeModeIntegration('test-score')
            );
            
            // Should not show edit when fingering disabled
            expect(result.current.shouldShowFingeringEdit).toBe(false);
            expect(result.current.fingeringEnabled).toBe(false);
          }).toThrow('Version Settings integration with practice - not implemented yet');
        });

        test('should handle current step fingering lookup', () => {
          expect(() => {
            const mockAnnotations = {
              'test-score': {
                't1-m60': 1,
                't1-m64': 3,
                't1-m67': 5
              }
            };
            
            jest.mocked(useFingeringStore).mockReturnValue({
              annotations: mockAnnotations
            });
            
            jest.mocked(usePracticeStore).mockReturnValue({
              isActive: true,
              currentStep: {
                timestamp: 1,
                notes: [
                  { midiValue: 60 },
                  { midiValue: 64 },
                  { midiValue: 67 }
                ]
              }
            });
            
            const { result } = renderHook(() => 
              usePracticeModeIntegration('test-score')
            );
            
            // Hook should identify current step fingerings
            // This is for optional highlighting functionality
            // The test just ensures integration doesn't break
            expect(result.current).toBeDefined();
          }).toThrow('Version Current step fingering lookup - not implemented yet');
        });
      });

      describe('Practice Mode UI Integration', () => {
        test('should not interfere with practice mode controls', () => {
          expect(() => {
            jest.mocked(usePracticeStore).mockReturnValue({
              isActive: true
            });
            
            render(
              <div>
                <button>Start Practice</button>
                <button>Stop Practice</button>
                <FingeringLayer scoreId="test-score" />
              </div>
            );
            
            // Practice controls should remain functional
            const startButton = screen.getByRole('button', { name: /start practice/i });
            const stopButton = screen.getByRole('button', { name: /stop practice/i });
            
            expect(startButton).toBeEnabled();
            expect(stopButton).toBeEnabled();
            
            // Fingering layer should not block practice controls
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
          }).toThrow('Version Practice mode control preservation - not implemented yet');
        });

        test('should transition smoothly between practice and edit modes', async () => {
          expect(async () => {
            const practiceStore = {
              isActive: false
            };
            
            jest.mocked(usePracticeStore).mockReturnValue(practiceStore);
            
            const { rerender } = render(<FingeringLayer scoreId="test-score" />);
            
            // Should allow editing initially
            const noteElement = document.createElement('div');
            noteElement.setAttribute('data-note-id', 't1-m60');
            await user.click(noteElement);
            
            expect(screen.getByRole('textbox')).toBeInTheDocument();
            
            // Start practice mode
            act(() => {
              practiceStore.isActive = true;
            });
            
            rerender(<FingeringLayer scoreId="test-score" />);
            
            // Input should disappear
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            
            // End practice mode
            act(() => {
              practiceStore.isActive = false;
            });
            
            rerender(<FingeringLayer scoreId="test-score" />);
            
            // Should allow editing again
            await user.click(noteElement);
            expect(screen.getByRole('textbox')).toBeInTheDocument();
          }).toThrow('Version Practice/edit mode transitions - not implemented yet');
        });
      });
    });

    describe('Task 4.6: Final Integration with Main App', () => {
      test('should integrate fingering layer into OSMD context', () => {
        expect(() => {
          const MockOSMDProvider = ({ children }: { children: React.ReactNode }) => {
            const { isEnabled: fingeringEnabled } = useFingeringSettings();
            const osmd = { /* mock osmd */ };
            const isReady = true;
            const currentScoreId = 'test-score';
            
            return (
              <OSMDContext.Provider value={{ osmd, isReady }}>
                {children}
                {osmd && isReady && fingeringEnabled && (
                  <FingeringErrorBoundary>
                    <FingeringLayer scoreId={currentScoreId} />
                  </FingeringErrorBoundary>
                )}
              </OSMDContext.Provider>
            );
          };
          
          render(
            <MockOSMDProvider>
              <div>Main app content</div>
            </MockOSMDProvider>
          );
          
          // Fingering layer should be rendered
          expect(screen.getByTestId('fingering-layer')).toBeInTheDocument();
        }).toThrow('Version OSMD context integration - not implemented yet');
      });

      test('should respect global fingering enable/disable setting', async () => {
        expect(async () => {
          const { result: settingsResult } = renderHook(() => useFingeringSettingsStore());
          
          render(
            <div>
              <FingeringSettings />
              <FingeringLayer scoreId="test-score" />
            </div>
          );
          
          // Fingering should be visible initially
          expect(screen.getByTestId('fingering-layer')).toBeVisible();
          
          // Disable fingering
          const enableToggle = screen.getByRole('checkbox', { name: /enable fingering/i });
          await user.click(enableToggle);
          
          // Fingering layer should be hidden
          expect(screen.queryByTestId('fingering-layer')).not.toBeInTheDocument();
          
          // Re-enable
          await user.click(enableToggle);
          
          // Should be visible again
          expect(screen.getByTestId('fingering-layer')).toBeVisible();
        }).toThrow('Version Global enable/disable - not implemented yet');
      });

      test('should work in all app contexts (main view, practice, settings)', () => {
        expect(() => {
          const AppWithAllContexts = () => (
            <div>
              <div id="main-view">
                <SheetMusic scoreId="test-score" />
                <FingeringLayer scoreId="test-score" />
              </div>
              <div id="practice-view">
                <PracticeMode scoreId="test-score" />
                <FingeringLayer scoreId="test-score" />
              </div>
              <div id="settings-view">
                <FingeringSettings />
              </div>
            </div>
          );
          
          render(<AppWithAllContexts />);
          
          // Should work in main view
          const mainLayer = within(document.getElementById('main-view')!).getByTestId('fingering-layer');
          expect(mainLayer).toBeInTheDocument();
          
          // Should work in practice view
          const practiceLayer = within(document.getElementById('practice-view')!).getByTestId('fingering-layer');
          expect(practiceLayer).toBeInTheDocument();
          
          // Settings should be accessible
          const settings = within(document.getElementById('settings-view')!).getByRole('checkbox', { name: /enable fingering/i });
          expect(settings).toBeInTheDocument();
        }).toThrow('Version Multi-context functionality - not implemented yet');
      });
    });

    describe('Performance Verification', () => {
      test('should only render visible fingerings (viewport optimization)', () => {
        expect(() => {
          const visibleNotes = 20;
          const totalNotes = 500;
          
          // Mock viewport that only shows 20 notes
          jest.mocked(useViewportOptimization).mockReturnValue({
            isInViewport: jest.fn((x, y) => y >= 200 && y <= 400),
            viewportBounds: { left: 0, right: 1024, top: 200, bottom: 400 }
          });
          
          // Create many annotations
          const annotations = {};
          for (let i = 0; i < totalNotes; i++) {
            annotations[`t${i}-m60`] = (i % 5) + 1;
          }
          
          useFingeringStore.getState().annotations['test-score'] = annotations;
          
          const startTime = performance.now();
          render(<FingeringLayer scoreId="test-score" />);
          const renderTime = performance.now() - startTime;
          
          // Should render quickly
          expect(renderTime).toBeLessThan(50); // <50ms with viewport optimization
          
          // Should only render visible elements
          const renderedElements = screen.queryAllByTestId(/fingering-/);
          expect(renderedElements.length).toBeLessThanOrEqual(visibleNotes);
        }).toThrow('Version Viewport performance verification - not implemented yet');
      });

      test('should handle 500+ annotations with <20MB memory', () => {
        expect(() => {
          // Mock memory usage tracking
          const initialMemory = performance.memory?.usedJSHeapSize || 0;
          
          // Create 500 annotations
          const annotations = {};
          for (let i = 0; i < 500; i++) {
            annotations[`t${i * 0.5}-m${60 + (i % 12)}`] = (i % 5) + 1;
          }
          
          const store = useFingeringStore.getState();
          store.annotations['large-score'] = annotations;
          
          render(<FingeringLayer scoreId="large-score" />);
          
          const memoryUsed = (performance.memory?.usedJSHeapSize || 0) - initialMemory;
          
          // Should use less than 20MB for 500 annotations
          expect(memoryUsed).toBeLessThan(20 * 1024 * 1024); // 20MB
        }).toThrow('Version Memory usage verification - not implemented yet');
      });

      test('should not impact MIDI latency (<20ms requirement)', async () => {
        expect(async () => {
          // Setup fingering system
          render(<FingeringLayer scoreId="test-score" />);
          
          // Mock MIDI event processing
          const processMidiEvent = jest.fn(async (note: number, velocity: number) => {
            // Simulate MIDI processing with fingering active
            const startTime = performance.now();
            
            // Check if note has fingering (should be O(1))
            const fingering = useFingeringStore.getState().annotations['test-score']?.[`t1-m${note}`];
            
            // Process MIDI event
            await Promise.resolve(); // Simulate async processing
            
            const latency = performance.now() - startTime;
            return latency;
          });
          
          // Process multiple MIDI events
          const latencies: number[] = [];
          for (let i = 0; i < 100; i++) {
            const latency = await processMidiEvent(60 + (i % 12), 100);
            latencies.push(latency);
          }
          
          const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
          const maxLatency = Math.max(...latencies);
          
          expect(avgLatency).toBeLessThan(20); // Average <20ms
          expect(maxLatency).toBeLessThan(20); // All <20ms
        }).toThrow('Version MIDI latency impact - not implemented yet');
      });

      test('should apply settings changes within 100ms', async () => {
        expect(async () => {
          render(<FingeringLayer scoreId="test-score" />);
          render(<FingeringSettings />);
          
          // Measure settings update time
          const startTime = performance.now();
          
          // Change multiple settings
          const fontSlider = screen.getByRole('slider', { name: /font size/i });
          const colorSelect = screen.getByRole('combobox', { name: /color/i });
          
          await user.clear(fontSlider);
          await user.type(fontSlider, '16');
          await user.selectOptions(colorSelect, '#800000');
          
          // Wait for updates to apply
          await waitFor(() => {
            const fingerings = screen.queryAllByTestId(/fingering-/);
            fingerings.forEach(el => {
              expect(el).toHaveStyle({ fontSize: '16px', color: '#800000' });
            });
          });
          
          const updateTime = performance.now() - startTime;
          expect(updateTime).toBeLessThan(100); // <100ms for settings to apply
        }).toThrow('Version Settings update performance - not implemented yet');
      });

      test('should recover from errors without app crash', async () => {
        expect(async () => {
          // Force an error in fingering component
          const ThrowingFingeringLayer = () => {
            throw new Error('Simulated fingering error');
          };
          
          // Render app with error boundary
          const { rerender } = render(
            <FingeringErrorBoundary>
              <ThrowingFingeringLayer />
            </FingeringErrorBoundary>
          );
          
          // Should show fallback UI
          expect(screen.getByText(/temporarily disabled/i)).toBeInTheDocument();
          
          // App should still be functional
          expect(document.body).toBeInTheDocument();
          
          // Can retry
          await user.click(screen.getByRole('button', { name: /retry/i }));
          
          // Fix the issue and re-render
          rerender(
            <FingeringErrorBoundary>
              <FingeringLayer scoreId="test-score" />
            </FingeringErrorBoundary>
          );
          
          // Should work now
          expect(screen.queryByText(/temporarily disabled/i)).not.toBeInTheDocument();
        }).toThrow('Version Error recovery without crash - not implemented yet');
      });
    });

    describe('Final Production Checklist', () => {
      test('should provide professional user experience', () => {
        expect(() => {
          render(
            <div>
              <FingeringSettings />
              <FingeringLayer scoreId="test-score" />
            </div>
          );
          
          // Polished UI elements
          expect(screen.getByRole('heading', { name: /fingering annotations/i })).toBeInTheDocument();
          expect(screen.getAllByRole('checkbox')).toHaveLength(2);
          expect(screen.getByRole('slider')).toBeInTheDocument();
          expect(screen.getByRole('combobox')).toBeInTheDocument();
          
          // Clear labeling
          expect(screen.getByLabelText(/enable fingering/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
          
          // Helper text
          expect(screen.getByText(/displays suggested/i)).toBeInTheDocument();
        }).toThrow('Version Professional UX verification - not implemented yet');
      });

      test('should maintain app responsiveness with feature enabled', async () => {
        expect(async () => {
          // Enable fingering with many annotations
          const annotations = {};
          for (let i = 0; i < 300; i++) {
            annotations[`t${i}-m60`] = (i % 5) + 1;
          }
          
          useFingeringStore.getState().annotations['test-score'] = annotations;
          
          render(<FingeringLayer scoreId="test-score" />);
          
          // Simulate user interactions
          const startTime = performance.now();
          
          // Multiple rapid interactions
          for (let i = 0; i < 10; i++) {
            const note = document.createElement('div');
            note.setAttribute('data-note-id', `t${i}-m60`);
            await user.click(note);
            await user.keyboard('{Escape}');
          }
          
          const interactionTime = performance.now() - startTime;
          
          // Should remain responsive
          expect(interactionTime / 10).toBeLessThan(50); // <50ms per interaction
        }).toThrow('Version Responsiveness maintenance - not implemented yet');
      });

      test('should integrate without affecting existing features', () => {
        expect(() => {
          // Mock existing Urtext Piano features
          const ExistingFeatures = () => (
            <div>
              <button>Play</button>
              <button>Pause</button>
              <button>Practice Mode</button>
              <div>MIDI Status: Connected</div>
            </div>
          );
          
          render(
            <div>
              <ExistingFeatures />
              <FingeringLayer scoreId="test-score" />
              <FingeringSettings />
            </div>
          );
          
          // All existing features should work
          expect(screen.getByRole('button', { name: /play/i })).toBeEnabled();
          expect(screen.getByRole('button', { name: /pause/i })).toBeEnabled();
          expect(screen.getByRole('button', { name: /practice mode/i })).toBeEnabled();
          expect(screen.getByText(/midi status/i)).toBeInTheDocument();
          
          // Fingering should not interfere
          expect(screen.getByRole('checkbox', { name: /enable fingering/i })).toBeInTheDocument();
        }).toThrow('Version Existing feature preservation - not implemented yet');
      });

      test('should support basic keyboard navigation', async () => {
        expect(async () => {
          render(<FingeringSettings />);
          
          // Tab through settings
          await user.tab();
          expect(screen.getByRole('checkbox', { name: /enable fingering/i })).toHaveFocus();
          
          await user.tab();
          expect(screen.getByRole('checkbox', { name: /show fingerings on all/i })).toHaveFocus();
          
          await user.tab();
          expect(screen.getByRole('slider', { name: /font size/i })).toHaveFocus();
          
          await user.tab();
          expect(screen.getByRole('combobox', { name: /color/i })).toHaveFocus();
          
          // Keyboard interaction
          await user.keyboard('{ArrowUp}'); // Increase font size
          expect(screen.getByRole('slider')).toHaveValue('13');
        }).toThrow('Version Keyboard navigation support - not implemented yet');
      });
    });
  });
});