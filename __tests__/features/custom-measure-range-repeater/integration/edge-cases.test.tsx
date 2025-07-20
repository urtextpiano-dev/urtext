/**
 * Edge Cases Integration Tests
 * 
 * 
 * These tests cover unusual scenarios and boundary conditions
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, renderHook } from '@testing-library/react';

// Imports will fail initially - this drives implementation
// import { App } from '@/renderer/App';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { MeasureRangeSelector } from '@/renderer/features/practice-mode/components/MeasureRangeSelector';

describe('Edge Cases: Custom Measure Range Repeater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Extreme Values', () => {
    test('should handle single measure pieces', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Load piece with only 1 measure
        const singleMeasureXML = `<?xml version="1.0"?>
          <score-partwise>
            <part id="P1">
              <measure number="1">
                <note><pitch><step>C</step><octave>4</octave></pitch></note>
              </measure>
            </part>
          </score-partwise>`;
        
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File([singleMeasureXML], 'single.xml')
        );
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Range selector should handle single measure
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        expect(startInput).toHaveAttribute('max', '1');
        expect(endInput).toHaveAttribute('max', '1');
        
        // Can only set 1-1 range
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Should practice single measure repeatedly
        for (let i = 0; i < 5; i++) {
          act(() => {
            window.electronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1]
              ?.({ note: 60, velocity: 100 });
          });
          
          await waitFor(() => {
            const cursor = screen.getByTestId('practice-cursor');
            expect(cursor).toHaveAttribute('data-measure', '1');
          });
        }
      }).toThrow('Edge case: Single measure piece not handled');
    });

    test('should handle extremely long pieces (1000+ measures)', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={1500} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // Should handle large numbers
        await user.type(startInput, '999');
        await user.type(endInput, '1234');
        
        expect(startInput).toHaveValue(999);
        expect(endInput).toHaveValue(1234);
        
        // Should validate correctly
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        
        // Performance should remain good
        const startTime = performance.now();
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        expect(performance.now() - startTime).toBeLessThan(50);
      }).toThrow('Edge case: Large measure counts not handled');
    });

    test('should handle maximum integer values gracefully', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Try to input huge number
        await user.type(startInput, '999999999999');
        
        // Should cap at totalMeasures
        expect(startInput).toHaveValue(20);
        
        // Try negative (should be prevented)
        await user.clear(startInput);
        await user.type(startInput, '-5');
        
        expect(startInput).toHaveValue(5); // Should ignore minus
      }).toThrow('Edge case: Integer overflow not handled');
    });

    // CRITICAL: JavaScript max safe integer edge case (Code review: Code review:)
    test('should prevent JavaScript MAX_SAFE_INTEGER overflow', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={100} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // Try MAX_SAFE_INTEGER
        await user.type(startInput, String(Number.MAX_SAFE_INTEGER));
        
        // Should not accept values beyond safe range
        expect(Number(startInput.value)).toBeLessThanOrEqual(100);
        expect(Number.isSafeInteger(Number(startInput.value))).toBe(true);
        
        // Try programmatic setting
        act(() => {
          const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
          usePracticeStore.getState().setCustomRange(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1);
        });
        
        // Store should reject unsafe integers
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        expect(usePracticeStore.getState().customStartMeasure).toBeLessThanOrEqual(100);
        expect(usePracticeStore.getState().customEndMeasure).toBeLessThanOrEqual(100);
      }).toThrow('Edge case: MAX_SAFE_INTEGER overflow not prevented');
    });
  });

  describe('Rapid State Changes', () => {
    test('should handle toggle spamming', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        const toggleButton = screen.getByRole('button', { name: /enable range/i });
        
        // Spam toggle 50 times rapidly
        const startTime = performance.now();
        
        for (let i = 0; i < 50; i++) {
          await user.click(toggleButton);
        }
        
        const duration = performance.now() - startTime;
        
        // Should handle without errors
        expect(toggleButton).toBeInTheDocument();
        expect(duration).toBeLessThan(1000); // <1s for 50 toggles
        
        // Final state should be consistent
        const finalText = toggleButton.textContent;
        expect(['Enable Range', 'Disable Range']).toContain(finalText);
      }).toThrow('Edge case: Toggle spamming not handled');
    });

    test('should handle range changes during active practice', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        const user = userEvent.setup();
        
        render(<App />);
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Enable range
        await user.type(screen.getByLabelText('Start measure'), '5');
        await user.type(screen.getByLabelText('End measure'), '10');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Start playing notes
        const playNote = () => {
          act(() => {
            window.electronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1]
              ?.({ note: 60, velocity: 100 });
          });
        };
        
        // Play and change range simultaneously
        const promises = [
          // Playing notes
          (async () => {
            for (let i = 0; i < 20; i++) {
              playNote();
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          })(),
          
          // Changing range
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await user.clear(screen.getByLabelText('End measure'));
            await user.type(screen.getByLabelText('End measure'), '15');
            
            await new Promise(resolve => setTimeout(resolve, 200));
            await user.clear(screen.getByLabelText('Start measure'));
            await user.type(screen.getByLabelText('Start measure'), '8');
          })()
        ];
        
        await Promise.all(promises);
        
        // Should handle gracefully without crashes
        expect(screen.getByLabelText('Start measure')).toHaveValue(8);
        expect(screen.getByLabelText('End measure')).toHaveValue(15);
      }).toThrow('Edge case: Concurrent state changes not handled');
    });
  });

  describe('Invalid Input Combinations', () => {
    test('should handle non-numeric input attempts', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Try various non-numeric inputs
        const invalidInputs = ['abc', '!@#', '1.5', '2e10', 'NaN', '∞'];
        
        for (const invalid of invalidInputs) {
          await user.clear(startInput);
          await user.type(startInput, invalid);
          
          // Should either ignore or show error
          const value = startInput.value;
          expect(value).toMatch(/^\d*$/); // Only digits
        }
      }).toThrow('Edge case: Non-numeric input not handled');
    });

    // CRITICAL: DOM injection prevention (Code review: Code review:)
    test('should prevent DOM injection through crafted inputs', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Attempt various injection attacks
        const maliciousInputs = [
          '<img src=x onerror=alert(1)>',
          '<script>alert("XSS")</script>',
          'javascript:alert(1)',
          '"><script>alert(String.fromCharCode(88,83,83))</script>',
          '<iframe src="javascript:alert(1)">',
          '<svg onload=alert(1)>',
          '${alert(1)}',
          '{{constructor.constructor("alert(1)")()"}}',
        ];
        
        for (const malicious of maliciousInputs) {
          await user.clear(startInput);
          await user.type(startInput, malicious);
          
          // Value should be sanitized
          expect(startInput.value).not.toContain('<');
          expect(startInput.value).not.toContain('>');
          expect(startInput.value).not.toContain('script');
          
          // No scripts should execute
          expect(window.alert).not.toHaveBeenCalled();
          
          // DOM should not be modified
          expect(document.querySelector('script[injected]')).toBeNull();
          expect(document.querySelector('img[onerror]')).toBeNull();
        }
      }).toThrow('Edge case: DOM injection not prevented');
    });

    test('should handle paste events with invalid data', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Paste invalid data
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData?.setData('text/plain', 'invalid123data');
        
        fireEvent.paste(startInput, pasteEvent);
        
        // Should extract valid number or reject
        expect(startInput.value).toMatch(/^\d*$/);
      }).toThrow('Edge case: Paste validation not handled');
    });
  });

  describe('Browser and System Edge Cases', () => {
    test('should handle browser back/forward navigation', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Set up practice state
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '5');
        await user.type(screen.getByLabelText('End measure'), '10');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Simulate browser navigation
        window.history.pushState({}, '', '/practice');
        window.history.back();
        
        // Should maintain state
        await waitFor(() => {
          expect(screen.getByLabelText('Start measure')).toHaveValue(5);
          expect(screen.getByLabelText('End measure')).toHaveValue(10);
        });
      }).toThrow('Edge case: Browser navigation not handled');
    });

    test('should handle system sleep/wake', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        
        render(<App />);
        
        // Simulate system sleep
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        });
        
        // Wait (simulating sleep)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate wake
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
        
        // Should resume normally
        expect(screen.getByRole('button', { name: /start practice/i })).toBeEnabled();
      }).toThrow('Edge case: Sleep/wake cycle not handled');
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle file loading during active practice', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Start practice with range
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '5');
        await user.type(screen.getByLabelText('End measure'), '10');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Load new file while practicing
        const newFile = new File(['<musicxml>...</musicxml>'], 'new.xml');
        await user.upload(screen.getByLabelText('Load MusicXML file'), newFile);
        
        // Should stop practice and reset
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
          expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
        });
      }).toThrow('Edge case: Concurrent file loading not handled');
    });

    test('should handle MIDI device disconnection during practice', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Setup practice
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Simulate MIDI disconnect
        act(() => {
          window.electronAPI.on.mock.calls
            .find(call => call[0] === 'midi:device-disconnected')?.[1]
            ?.({ deviceId: 'test-device' });
        });
        
        // Should show warning but continue practice
        expect(screen.getByRole('alert')).toHaveTextContent(/MIDI device disconnected/i);
        expect(screen.getByRole('button', { name: /stop practice/i })).toBeInTheDocument();
      }).toThrow('Edge case: MIDI disconnection not handled');
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    test('should handle memory pressure gracefully', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        
        // Mock memory pressure
        const originalMemory = performance.memory;
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: 1.9 * 1024 * 1024 * 1024, // 1.9GB
            totalJSHeapSize: 2 * 1024 * 1024 * 1024,   // 2GB
            jsHeapSizeLimit: 2 * 1024 * 1024 * 1024   // 2GB
          },
          writable: true
        });
        
        render(<App />);
        
        // Should still function under memory pressure
        const button = screen.getByRole('button', { name: /start practice/i });
        expect(button).toBeEnabled();
        
        // Restore
        Object.defineProperty(performance, 'memory', {
          value: originalMemory,
          writable: true
        });
      }).toThrow('Edge case: Memory pressure not handled');
    });

    test('should handle storage quota exceeded', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        // Mock localStorage quota exceeded
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = jest.fn(() => {
          throw new Error('QuotaExceededError');
        });
        
        render(<App />);
        
        // Try to save preferences
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '5');
        
        // Should handle gracefully
        expect(screen.getByLabelText('Start measure')).toHaveValue(5);
        
        // Restore
        Storage.prototype.setItem = originalSetItem;
      }).toThrow('Edge case: Storage quota exceeded not handled');
    });
  });

  describe('Accessibility Edge Cases', () => {
    test('should handle screen reader navigation during range changes', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        // Simulate screen reader navigation
        const startInput = screen.getByLabelText('Start measure');
        
        // Screen reader announces while typing
        await user.type(startInput, '5');
        
        const liveRegion = screen.getByRole('status', { hidden: true });
        expect(liveRegion).toHaveTextContent(/Start measure changed to 5/i);
        
        // Rapid changes should debounce announcements
        for (let i = 6; i <= 10; i++) {
          await user.clear(startInput);
          await user.type(startInput, String(i));
        }
        
        // Should announce final value, not all intermediates
        await waitFor(() => {
          expect(liveRegion).toHaveTextContent(/Start measure changed to 10/i);
        });
      }).toThrow('Edge case: Screen reader rapid announcements not handled');
    });

    test('should handle high contrast mode', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        // Mock high contrast mode
        window.matchMedia = jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }));
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        // Should have high contrast styles
        const inputs = screen.getAllByRole('spinbutton');
        inputs.forEach(input => {
          const styles = window.getComputedStyle(input);
          expect(styles.borderWidth).toBe('2px'); // Thicker borders
        });
      }).toThrow('Edge case: High contrast mode not supported');
    });
  });
});