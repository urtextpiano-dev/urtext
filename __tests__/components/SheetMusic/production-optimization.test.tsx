/**
 * Phase 3: Production Optimization & Resilience Tests
 * 
 * TDD Cycle Reminder:
 * 1. RED: Run these tests - they should fail
 * 2. GREEN: Implement phase-3-production-optimization.md until tests pass
 * 3. REFACTOR: Improve code while keeping tests green
 * 
 * Critical Production Requirements:
 * - Memory leak prevention
 * - Resilient error recovery
 * - Bundle size optimization
 * - Production monitoring
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';

// These imports will be created during implementation
// import { useOSMD } from '@/renderer/hooks/useOSMD';
// import { SheetMusic } from '@/renderer/components/SheetMusic';
// import { performanceMonitor } from '@/renderer/utils/performanceMonitor';
// import { memoryProfiler } from '@/renderer/utils/memoryProfiler';

describe('Phase 3: Production Optimization & Resilience', () => {
  let container: HTMLDivElement;
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
    
    // Mock console methods
    consoleError = jest.spyOn(console, 'error').mockImplementation();
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    document.body.removeChild(container);
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  describe('Task 3.1: Memory Leak Prevention', () => {
    test('should properly cleanup OSMD instance on unmount', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const destroySpy = jest.fn();
        
        // Mock OSMD with destroy method
        jest.mock('opensheetmusicdisplay', () => ({
          OpenSheetMusicDisplay: jest.fn().mockImplementation(() => ({
            load: jest.fn(),
            render: jest.fn(),
            destroy: destroySpy
          }))
        }));
        
        const { unmount } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        unmount();
        
        expect(destroySpy).toHaveBeenCalled();
      }).rejects.toThrow('Phase 3: OSMD cleanup not implemented');
    });

    test('should cleanup resize observer on unmount', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const disconnectSpy = jest.fn();
        const originalResizeObserver = window.ResizeObserver;
        
        window.ResizeObserver = jest.fn().mockImplementation(() => ({
          observe: jest.fn(),
          disconnect: disconnectSpy,
          unobserve: jest.fn()
        }));
        
        const { unmount } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        unmount();
        
        expect(disconnectSpy).toHaveBeenCalled();
        
        window.ResizeObserver = originalResizeObserver;
      }).rejects.toThrow('Phase 3: ResizeObserver cleanup not implemented');
    });

    test('should prevent memory leaks from event listeners', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        
        const { unmount } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.queryByRole('img')).toBeInTheDocument();
        });
        
        unmount();
        
        // Verify all event listeners were removed
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'midi-event',
          expect.any(Function)
        );
      }).rejects.toThrow('Phase 3: Event listener cleanup not implemented');
    });

    test('should clear MIDI note mappings on unmount', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result, unmount } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        await waitFor(() => {
          expect(result.current.status).toBe('LOADED');
        });
        
        // Verify mappings exist
        expect(result.current._midiToTimestamp.size).toBeGreaterThan(0);
        
        unmount();
        
        // Verify mappings are cleared
        expect(result.current._midiToTimestamp.size).toBe(0);
      }).rejects.toThrow('Phase 3: MIDI mapping cleanup not implemented');
    });

    test('should monitor memory usage patterns', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const memoryMonitor = {
          startMonitoring: jest.fn(),
          stopMonitoring: jest.fn(),
          getMemoryUsage: jest.fn(() => ({ heapUsed: 50 * 1024 * 1024 })) // 50MB
        };
        
        const { unmount } = render(
          <SheetMusic 
            musicXML="<score/>" 
            memoryMonitor={memoryMonitor}
          />
        );
        
        expect(memoryMonitor.startMonitoring).toHaveBeenCalled();
        
        unmount();
        
        expect(memoryMonitor.stopMonitoring).toHaveBeenCalled();
      }).rejects.toThrow('Phase 3: Memory monitoring not implemented');
    });
  });

  describe('Task 3.2: Error Resilience', () => {
    test('should recover from OSMD loading errors gracefully', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockRetry = jest.fn();
        
        jest.mock('opensheetmusicdisplay', () => ({
          OpenSheetMusicDisplay: jest.fn().mockImplementation(() => ({
            load: jest.fn().mockRejectedValueOnce(new Error('Parse error'))
                          .mockResolvedValueOnce(true),
            render: jest.fn()
          }))
        }));
        
        const { rerender } = render(
          <SheetMusic 
            musicXML="<score/>" 
            onError={mockRetry}
          />
        );
        
        await waitFor(() => {
          expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
        });
        
        // Retry button
        const retryButton = screen.getByRole('button', { name: /retry/i });
        await userEvent.click(retryButton);
        
        await waitFor(() => {
          expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
        });
      }).rejects.toThrow('Phase 3: Error recovery not implemented');
    });

    test('should handle corrupt MusicXML gracefully', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const corruptXML = '<score><invalid></corrupt>';
        
        render(<SheetMusic musicXML={corruptXML} />);
        
        await waitFor(() => {
          expect(screen.getByText(/Invalid MusicXML format/)).toBeInTheDocument();
          expect(consoleError).toHaveBeenCalledWith(
            expect.stringContaining('MusicXML parse error')
          );
        });
      }).rejects.toThrow('Phase 3: Corrupt XML handling not implemented');
    });

    test('should implement circuit breaker for repeated failures', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { result } = renderHook(() => 
          useOSMD({ current: container }, '<score/>')
        );
        
        // Simulate 5 consecutive failures
        for (let i = 0; i < 5; i++) {
          act(() => {
            result.current._handleError(new Error(`Failure ${i}`));
          });
        }
        
        // Circuit breaker should activate
        expect(result.current.status).toBe('CIRCUIT_BREAKER_OPEN');
        expect(consoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('Circuit breaker activated')
        );
        
        // Should reset after cooldown
        jest.advanceTimersByTime(30000); // 30 second cooldown
        
        expect(result.current.status).toBe('IDLE');
      }).rejects.toThrow('Phase 3: Circuit breaker not implemented');
    });

    test('should gracefully degrade when MIDI is unavailable', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        // Remove MIDI API
        const originalMIDI = navigator.requestMIDIAccess;
        delete navigator.requestMIDIAccess;
        
        render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          // Should still render sheet music
          expect(screen.getByRole('img')).toBeInTheDocument();
          
          // Should show MIDI unavailable indicator
          expect(screen.getByText(/MIDI unavailable/)).toBeInTheDocument();
        });
        
        navigator.requestMIDIAccess = originalMIDI;
      }).rejects.toThrow('Phase 3: MIDI degradation not implemented');
    });
  });

  describe('Task 3.3: Bundle Size Optimization', () => {
    test('should lazy load OSMD library', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const importSpy = jest.spyOn(global, 'import');
        
        render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(importSpy).toHaveBeenCalledWith(
            expect.stringContaining('opensheetmusicdisplay')
          );
        });
      }).rejects.toThrow('Phase 3: Lazy loading not implemented');
    });

    test('should tree-shake unused OSMD features', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        // This test verifies webpack configuration
        const webpackConfig = require('../../../../webpack.config.js');
        
        expect(webpackConfig.optimization).toMatchObject({
          usedExports: true,
          sideEffects: false
        });
        
        // Verify OSMD import optimization
        expect(webpackConfig.resolve.alias).toMatchObject({
          'opensheetmusicdisplay': 'opensheetmusicdisplay/build/opensheetmusicdisplay.min.js'
        });
      }).toThrow('Phase 3: Tree shaking not configured');
    });

    test('should use production OSMD build', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const packageJson = require('../../../../package.json');
        
        // Should use minified version in production
        expect(packageJson.dependencies['opensheetmusicdisplay']).toBe('^1.9.0');
        
        // Should have build optimization script
        expect(packageJson.scripts['build:optimize']).toContain('--optimize');
      }).toThrow('Phase 3: Production build not configured');
    });
  });

  describe('Task 3.4: Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const metrics = {
          trackLoadTime: jest.fn(),
          trackRenderTime: jest.fn(),
          trackMidiLatency: jest.fn()
        };
        
        render(
          <SheetMusic 
            musicXML="<score/>" 
            performanceMetrics={metrics}
          />
        );
        
        await waitFor(() => {
          expect(metrics.trackLoadTime).toHaveBeenCalledWith(
            expect.any(Number)
          );
          expect(metrics.trackRenderTime).toHaveBeenCalledWith(
            expect.any(Number)
          );
        });
      }).rejects.toThrow('Phase 3: Performance tracking not implemented');
    });

    test('should report performance degradation', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const onPerformanceWarning = jest.fn();
        
        // Mock slow performance
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(150); // 150ms render time
        
        render(
          <SheetMusic 
            musicXML="<score/>"
            onPerformanceWarning={onPerformanceWarning}
            performanceBudget={{ render: 100 }}
          />
        );
        
        await waitFor(() => {
          expect(onPerformanceWarning).toHaveBeenCalledWith({
            metric: 'render',
            value: 150,
            budget: 100,
            message: 'Render time exceeded budget by 50ms'
          });
        });
      }).rejects.toThrow('Phase 3: Performance reporting not implemented');
    });

    test('should collect long task metrics', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) {
              console.warn(`Long task detected: ${entry.duration}ms`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        
        render(<SheetMusic musicXML={generateLargeScore(500)} />);
        
        await waitFor(() => {
          expect(consoleWarn).toHaveBeenCalledWith(
            expect.stringContaining('Long task detected')
          );
        });
        
        observer.disconnect();
      }).rejects.toThrow('Phase 3: Long task monitoring not implemented');
    });
  });

  describe('Task 3.5: Production Logging', () => {
    test('should log errors to monitoring service', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const errorLogger = {
          logError: jest.fn(),
          logWarning: jest.fn(),
          logInfo: jest.fn()
        };
        
        const error = new Error('OSMD rendering failed');
        
        render(
          <SheetMusic 
            musicXML="<invalid/>"
            errorLogger={errorLogger}
          />
        );
        
        await waitFor(() => {
          expect(errorLogger.logError).toHaveBeenCalledWith(
            'OSMD_RENDER_ERROR',
            expect.objectContaining({
              error: error.message,
              stack: expect.any(String),
              musicXML: '<invalid/>',
              timestamp: expect.any(Number)
            })
          );
        });
      }).rejects.toThrow('Phase 3: Error logging not implemented');
    });

    test('should sanitize sensitive data in logs', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const errorLogger = {
          logError: jest.fn()
        };
        
        const musicXMLWithMetadata = `
          <score>
            <identification>
              <creator type="composer">John Doe</creator>
              <rights>Copyright 2024</rights>
            </identification>
          </score>
        `;
        
        render(
          <SheetMusic 
            musicXML={musicXMLWithMetadata}
            errorLogger={errorLogger}
          />
        );
        
        // Force an error
        act(() => {
          throw new Error('Test error');
        });
        
        await waitFor(() => {
          const loggedData = errorLogger.logError.mock.calls[0][1];
          
          // Should not contain sensitive metadata
          expect(loggedData.musicXML).not.toContain('John Doe');
          expect(loggedData.musicXML).not.toContain('Copyright');
          expect(loggedData.musicXML).toContain('[REDACTED]');
        });
      }).rejects.toThrow('Phase 3: Log sanitization not implemented');
    });
  });

  describe('Task 3.6: Accessibility Compliance', () => {
    test('should announce score changes to screen readers', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const { rerender } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument();
        });
        
        rerender(<SheetMusic musicXML="<score><new/></score>" />);
        
        await waitFor(() => {
          const announcement = screen.getByRole('status');
          expect(announcement).toHaveTextContent('Sheet music updated');
          expect(announcement).toHaveAttribute('aria-live', 'polite');
        });
      }).rejects.toThrow('Phase 3: Screen reader announcements not implemented');
    });

    test('should provide keyboard navigation hints', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          const container = screen.getByRole('img');
          expect(container).toHaveAttribute(
            'aria-description',
            'Use arrow keys to navigate measures, space to play/pause'
          );
        });
      }).rejects.toThrow('Phase 3: Keyboard hints not implemented');
    });

    test('should support high contrast mode', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        // Mock high contrast mode
        window.matchMedia = jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }));
        
        const { container } = render(<SheetMusic musicXML="<score/>" />);
        
        await waitFor(() => {
          const sheetContainer = container.querySelector('.sheet-music-container');
          expect(sheetContainer).toHaveClass('high-contrast');
        });
      }).rejects.toThrow('Phase 3: High contrast support not implemented');
    });
  });

  describe('Task 3.7: Integration Tests', () => {
    test('should integrate with production error boundary', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const errorBoundaryFallback = jest.fn();
        
        const ThrowError = () => {
          throw new Error('Catastrophic failure');
        };
        
        render(
          <ErrorBoundary onError={errorBoundaryFallback}>
            <SheetMusic musicXML="<score/>">
              <ThrowError />
            </SheetMusic>
          </ErrorBoundary>
        );
        
        await waitFor(() => {
          expect(errorBoundaryFallback).toHaveBeenCalledWith(
            expect.any(Error),
            expect.any(Object)
          );
          expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
        });
      }).rejects.toThrow('Phase 3: Error boundary integration not implemented');
    });

    test('should work with production build optimizations', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        // Verify production build removes dev warnings
        process.env.NODE_ENV = 'production';
        
        const warn = jest.spyOn(console, 'warn');
        
        render(<SheetMusic musicXML="<score/>" />);
        
        // Development warnings should be stripped
        expect(warn).not.toHaveBeenCalledWith(
          expect.stringContaining('[DEV]')
        );
        
        process.env.NODE_ENV = 'test';
      }).toThrow('Phase 3: Production build optimization not implemented');
    });
  });
});

// Helper functions for tests
function generateLargeScore(noteCount: number): string {
  const notes = Array.from({ length: noteCount }, (_, i) => 
    `<note><pitch><step>${'CDEFGAB'[i % 7]}</step><octave>${Math.floor(i / 7) % 8}</octave></pitch></note>`
  ).join('');
  
  return `<score-partwise><part id="P1"><measure number="1">${notes}</measure></part></score-partwise>`;
}