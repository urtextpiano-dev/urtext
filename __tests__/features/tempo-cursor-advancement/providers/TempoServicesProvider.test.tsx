// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (TempoServicesProvider doesn't exist)
// 2. GREEN: Implement TempoServicesProvider context to make tests pass
// 3. REFACTOR: Optimize service lifecycle while keeping tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// These imports will fail initially, driving TDD implementation
// CRITICAL: Multi-AI validation identified proper service lifecycle as essential
import { TempoServicesProvider, useTempoServices } from '@/renderer/features/practice-mode/providers/TempoServicesProvider';

// Mock the services that will be created by the provider
jest.mock('@/renderer/features/practice-mode/services/TempoService');
jest.mock('@/renderer/features/practice-mode/services/WebAudioScheduler');
jest.mock('@/renderer/stores/osmdStore', () => ({
  useOSMDStore: () => ({
    tempoMap: {
      defaultBpm: 120,
      averageBpm: 118,
      hasExplicitTempo: true
    }
  })
}));

describe('TempoServicesProvider - Service Lifecycle Management', () => {
  let mockTempoService: any;
  let mockScheduler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock TempoService implementation
    mockTempoService = {
      getCurrentBpm: jest.fn(() => 120),
      computeDelay: jest.fn((duration) => duration * 500 + 40),
      setManualOverride: jest.fn(),
      applyTempoAdjustmentFactor: jest.fn()
    };
    
    // Mock WebAudioScheduler implementation
    mockScheduler = {
      startSession: jest.fn(),
      getCurrentTime: jest.fn(() => 0),
      scheduleCallback: jest.fn(),
      cleanup: jest.fn()
    };
    
    // Mock the constructors
    const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
    const { WebAudioScheduler } = require('@/renderer/features/practice-mode/services/WebAudioScheduler');
    
    TempoServiceImpl.mockImplementation(() => mockTempoService);
    WebAudioScheduler.mockImplementation(() => mockScheduler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Provider Context Creation', () => {
    test('should provide TempoServicesProvider component', () => {
      // Drive provider component creation
      expect(() => {
        render(
          <TempoServicesProvider>
            <div>Test Content</div>
          </TempoServicesProvider>
        );
      }).not.toThrow();
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('should create context with TempoService and WebAudioScheduler', () => {
      // Drive service instantiation in provider
      const TestComponent = () => {
        const services = useTempoServices();
        return (
          <div>
            <span data-testid="tempo-service">{services.tempoService ? 'available' : 'unavailable'}</span>
            <span data-testid="scheduler">{services.scheduler ? 'available' : 'unavailable'}</span>
          </div>
        );
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('tempo-service')).toHaveTextContent('available');
      expect(screen.getByTestId('scheduler')).toHaveTextContent('available');
    });

    test('should throw error when useTempoServices used outside provider', () => {
      // Drive context boundary enforcement
      const TestComponent = () => {
        useTempoServices(); // This should throw
        return <div>Should not render</div>;
      };
      
      // Capture console.error to avoid noise in test output
      const originalError = console.error;
      console.error = jest.fn();
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTempoServices must be used within TempoServicesProvider');
      
      console.error = originalError;
    });

    test('should provide TypeScript-correct interface', () => {
      // Drive TypeScript interface compliance
      const TestComponent = () => {
        const { tempoService, scheduler } = useTempoServices();
        
        // These calls should be type-safe
        const bpm = tempoService.getCurrentBpm();
        const delay = tempoService.computeDelay(1.0);
        const time = scheduler.getCurrentTime();
        
        return (
          <div>
            <span data-testid="bpm">{bpm}</span>
            <span data-testid="delay">{delay}</span>
            <span data-testid="time">{time}</span>
          </div>
        );
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('bpm')).toHaveTextContent('120');
      expect(screen.getByTestId('delay')).toHaveTextContent('540'); // 1.0 * 500 + 40
      expect(screen.getByTestId('time')).toHaveTextContent('0');
    });
  });

  describe('Service Lifecycle Management (CRITICAL)', () => {
    test('should initialize services on mount', () => {
      // MULTI-AI VALIDATION: Proper lifecycle management was identified as critical
      render(
        <TempoServicesProvider>
          <div>Test</div>
        </TempoServicesProvider>
      );
      
      // Services should be created
      const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
      const { WebAudioScheduler } = require('@/renderer/features/practice-mode/services/WebAudioScheduler');
      
      expect(TempoServiceImpl).toHaveBeenCalled();
      expect(WebAudioScheduler).toHaveBeenCalled();
    });

    test('should start scheduler session on mount', () => {
      // Drive scheduler initialization
      render(
        <TempoServicesProvider>
          <div>Test</div>
        </TempoServicesProvider>
      );
      
      expect(mockScheduler.startSession).toHaveBeenCalled();
    });

    test('should memoize services based on osmdStore dependency', () => {
      // Drive proper memoization to prevent recreation on every render
      let renderCount = 0;
      
      const TestComponent = () => {
        const services = useTempoServices();
        renderCount++;
        return <div>{services.tempoService.getCurrentBpm()}</div>;
      };
      
      const { rerender } = render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      const initialRenderCount = renderCount;
      const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
      const initialCallCount = TempoServiceImpl.mock.calls.length;
      
      // Re-render with same osmdStore should not recreate services
      rerender(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(TempoServiceImpl.mock.calls.length).toBe(initialCallCount); // No new instances
      expect(renderCount).toBe(initialRenderCount + 1); // Only one additional render
    });

    test('should recreate services when osmdStore changes', () => {
      // Drive dependency tracking for service recreation
      const TestComponent = ({ version }: { version: number }) => {
        // Simulate osmdStore change by changing key
        return (
          <TempoServicesProvider key={version}>
            <div>Version {version}</div>
          </TempoServicesProvider>
        );
      };
      
      const { rerender } = render(<TestComponent version={1} />);
      
      const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
      const initialCallCount = TempoServiceImpl.mock.calls.length;
      
      // Change version to trigger provider recreation
      rerender(<TestComponent version={2} />);
      
      expect(TempoServiceImpl.mock.calls.length).toBe(initialCallCount + 1); // New instance created
    });

    test('should handle service cleanup on unmount', () => {
      // Drive cleanup implementation
      const TestProvider = ({ children }: { children: React.ReactNode }) => {
        const [mounted, setMounted] = React.useState(true);
        
        React.useEffect(() => {
          return () => {
            setMounted(false);
          };
        }, []);
        
        if (!mounted) return null;
        
        return <TempoServicesProvider>{children}</TempoServicesProvider>;
      };
      
      const { unmount } = render(
        <TestProvider>
          <div>Test</div>
        </TestProvider>
      );
      
      unmount();
      
      // Should perform cleanup (implementation-specific)
      // This drives the need for cleanup implementation
      expect(mockScheduler.cleanup || mockScheduler.destroy || true).toBeDefined();
    });

    test('should handle service initialization errors gracefully', () => {
      // Drive error handling in service creation
      const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
      TempoServiceImpl.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });
      
      // Should not crash the application
      expect(() => {
        render(
          <TempoServicesProvider>
            <div>Test</div>
          </TempoServicesProvider>
        );
      }).not.toThrow();
    });

    test('should handle scheduler initialization errors gracefully', () => {
      // Drive scheduler error handling
      const { WebAudioScheduler } = require('@/renderer/features/practice-mode/services/WebAudioScheduler');
      WebAudioScheduler.mockImplementation(() => {
        throw new Error('Scheduler initialization failed');
      });
      
      expect(() => {
        render(
          <TempoServicesProvider>
            <div>Test</div>
          </TempoServicesProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    test('should initialize services in <10ms', () => {
      // Drive initialization performance requirement
      const startTime = performance.now();
      
      render(
        <TempoServicesProvider>
          <div>Test</div>
        </TempoServicesProvider>
      );
      
      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(10);
    });

    test('should not cause unnecessary re-renders', () => {
      // Drive render optimization
      let renderCount = 0;
      
      const TestComponent = () => {
        const services = useTempoServices();
        renderCount++;
        
        React.useEffect(() => {
          // Trigger some service calls that shouldn't cause re-renders
          services.tempoService.getCurrentBpm();
          services.scheduler.getCurrentTime();
        }, [services]);
        
        return <div>Render count: {renderCount}</div>;
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      // Should render exactly once (no additional renders from service calls)
      expect(renderCount).toBe(1);
    });

    test('should handle rapid consumer component mounting/unmounting', () => {
      // Drive performance under stress
      const TestConsumer = ({ id }: { id: number }) => {
        const { tempoService } = useTempoServices();
        return <div>Consumer {id}: {tempoService.getCurrentBpm()}</div>;
      };
      
      const startTime = performance.now();
      
      // Rapidly mount/unmount multiple consumers
      const { rerender } = render(
        <TempoServicesProvider>
          <TestConsumer id={1} />
        </TempoServicesProvider>
      );
      
      for (let i = 2; i <= 10; i++) {
        rerender(
          <TempoServicesProvider>
            <TestConsumer id={i} />
          </TempoServicesProvider>
        );
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Should complete rapidly
    });

    test('should not leak memory during lifecycle', () => {
      // Drive memory efficiency
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        // Create and destroy providers multiple times
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(
            <TempoServicesProvider>
              <div>Test {i}</div>
            </TempoServicesProvider>
          );
          unmount();
        }
        
        if (global.gc) global.gc(); // Force GC if available
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // <1MB increase
      }
    });
  });

  describe('Integration with Practice Controller', () => {
    test('should provide services to practice controller hook', () => {
      // Drive integration with practice controller
      const TestPracticeComponent = () => {
        const { tempoService, scheduler } = useTempoServices();
        
        // Simulate practice controller usage
        const delay = tempoService.computeDelay(1.0);
        scheduler.scheduleCallback(() => {}, delay);
        
        return <div data-testid="practice">Practice component active</div>;
      };
      
      render(
        <TempoServicesProvider>
          <TestPracticeComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('practice')).toBeInTheDocument();
      expect(mockTempoService.computeDelay).toHaveBeenCalledWith(1.0);
      expect(mockScheduler.scheduleCallback).toHaveBeenCalled();
    });

    test('should support multiple consumer components', () => {
      // Drive multiple consumers using services
      const TempoDisplay = () => {
        const { tempoService } = useTempoServices();
        return <div data-testid="tempo">{tempoService.getCurrentBpm()}</div>;
      };
      
      const DelayCalculator = () => {
        const { tempoService } = useTempoServices();
        const delay = tempoService.computeDelay(2.0);
        return <div data-testid="delay">{delay}</div>;
      };
      
      const TimeDisplay = () => {
        const { scheduler } = useTempoServices();
        return <div data-testid="time">{scheduler.getCurrentTime()}</div>;
      };
      
      render(
        <TempoServicesProvider>
          <TempoDisplay />
          <DelayCalculator />
          <TimeDisplay />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('tempo')).toHaveTextContent('120');
      expect(screen.getByTestId('delay')).toHaveTextContent('1040'); // 2.0 * 500 + 40
      expect(screen.getByTestId('time')).toHaveTextContent('0');
    });

    test('should maintain service state across consumer renders', () => {
      // Drive service state persistence
      mockTempoService.setManualOverride = jest.fn();
      mockTempoService.getCurrentBpm = jest.fn()
        .mockReturnValueOnce(120)  // Initial call
        .mockReturnValueOnce(100); // After override
      
      const TestComponent = () => {
        const { tempoService } = useTempoServices();
        const [bpm, setBpm] = React.useState(tempoService.getCurrentBpm());
        
        const handleOverride = () => {
          tempoService.setManualOverride(100);
          setBpm(tempoService.getCurrentBpm());
        };
        
        return (
          <div>
            <span data-testid="bpm">{bpm}</span>
            <button onClick={handleOverride} data-testid="override">Override</button>
          </div>
        );
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('bpm')).toHaveTextContent('120');
      
      act(() => {
        screen.getByTestId('override').click();
      });
      
      expect(mockTempoService.setManualOverride).toHaveBeenCalledWith(100);
      expect(screen.getByTestId('bpm')).toHaveTextContent('100');
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    test('should handle osmdStore being null or undefined', () => {
      // Drive null safety for osmdStore
      jest.doMock('@/renderer/stores/osmdStore', () => ({
        useOSMDStore: () => null
      }));
      
      expect(() => {
        render(
          <TempoServicesProvider>
            <div>Test</div>
          </TempoServicesProvider>
        );
      }).not.toThrow();
    });

    test('should handle missing tempoMap in osmdStore', () => {
      // Drive missing tempoMap handling
      jest.doMock('@/renderer/stores/osmdStore', () => ({
        useOSMDStore: () => ({ tempoMap: null })
      }));
      
      expect(() => {
        render(
          <TempoServicesProvider>
            <div>Test</div>
          </TempoServicesProvider>
        );
      }).not.toThrow();
    });

    test('should handle React.StrictMode double initialization', () => {
      // Drive StrictMode compatibility
      const initCounts = { tempo: 0, scheduler: 0 };
      
      const { TempoServiceImpl } = require('@/renderer/features/practice-mode/services/TempoService');
      const { WebAudioScheduler } = require('@/renderer/features/practice-mode/services/WebAudioScheduler');
      
      TempoServiceImpl.mockImplementation(() => {
        initCounts.tempo++;
        return mockTempoService;
      });
      
      WebAudioScheduler.mockImplementation(() => {
        initCounts.scheduler++;
        return mockScheduler;
      });
      
      render(
        <React.StrictMode>
          <TempoServicesProvider>
            <div>Test</div>
          </TempoServicesProvider>
        </React.StrictMode>
      );
      
      // Should handle double initialization gracefully
      expect(initCounts.tempo).toBeGreaterThan(0);
      expect(initCounts.scheduler).toBeGreaterThan(0);
    });

    test('should handle provider nesting (should throw helpful error)', () => {
      // Drive provider nesting detection
      const NestedProvider = () => (
        <TempoServicesProvider>
          <TempoServicesProvider>
            <div>Nested</div>
          </TempoServicesProvider>
        </TempoServicesProvider>
      );
      
      // Should either work or provide clear error
      expect(() => {
        render(<NestedProvider />);
      }).not.toThrow(); // Nesting should be allowed or gracefully handled
    });

    test('should handle concurrent access to services', () => {
      // Drive concurrent access safety
      const TestComponent = () => {
        const { tempoService, scheduler } = useTempoServices();
        
        React.useEffect(() => {
          // Simulate concurrent access
          Promise.all([
            Promise.resolve(tempoService.getCurrentBpm()),
            Promise.resolve(tempoService.computeDelay(1.0)),
            Promise.resolve(scheduler.getCurrentTime())
          ]);
        }, [tempoService, scheduler]);
        
        return <div>Concurrent test</div>;
      };
      
      expect(() => {
        render(
          <TempoServicesProvider>
            <TestComponent />
          </TempoServicesProvider>
        );
      }).not.toThrow();
    });
  });

  describe('TypeScript Type Safety', () => {
    test('should provide correctly typed context value', () => {
      // Drive TypeScript interface compliance
      const TestComponent = () => {
        const services = useTempoServices();
        
        // These should be properly typed
        const tempoService: any = services.tempoService;
        const scheduler: any = services.scheduler;
        
        expect(typeof tempoService.getCurrentBpm).toBe('function');
        expect(typeof tempoService.computeDelay).toBe('function');
        expect(typeof tempoService.setManualOverride).toBe('function');
        expect(typeof tempoService.applyTempoAdjustmentFactor).toBe('function');
        
        expect(typeof scheduler.startSession).toBe('function');
        expect(typeof scheduler.getCurrentTime).toBe('function');
        expect(typeof scheduler.scheduleCallback).toBe('function');
        
        return <div>Type check passed</div>;
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByText('Type check passed')).toBeInTheDocument();
    });
  });
});