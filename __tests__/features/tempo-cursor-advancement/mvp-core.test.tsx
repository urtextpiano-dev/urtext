// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (no tempo-aware implementation exists)
// 2. GREEN: Implement Phase 1 MVP Core to make tests pass (1-2.5 days complexity)
// 3. REFACTOR: Improve code while keeping critical functionality tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';

// These imports will fail initially, driving TDD implementation
// CRITICAL: Multi-AI validation identified these exact integration points
import { TempoServiceImpl } from '@/renderer/features/practice-mode/services/TempoService';
import { WebAudioScheduler } from '@/renderer/features/practice-mode/services/WebAudioScheduler';
import { TempoServicesProvider, useTempoServices } from '@/renderer/features/practice-mode/providers/TempoServicesProvider';
import { TempoIndicator } from '@/renderer/features/practice-mode/components/TempoIndicator';
import { usePracticeController } from '@/renderer/features/practice-mode/hooks/usePracticeController.v2';

// Mock dependencies that exist
jest.mock('@/renderer/stores/osmdStore', () => ({
  useOSMDStore: () => ({
    tempoMap: {
      defaultBpm: 120,
      averageBpm: 118,
      hasExplicitTempo: true
    }
  })
}));

describe('Version MVP Core - Basic Tempo-Aware Advancement', () => {
  let mockAudioContext: any;

  beforeEach(() => {
    // Clear localStorage for tempo overrides
    localStorage.clear();
    jest.clearAllMocks();
    
    // Mock AudioContext for testing
    mockAudioContext = {
      createBuffer: jest.fn(() => ({})),
      createBufferSource: jest.fn(() => ({
        buffer: null,
        onended: null,
        connect: jest.fn(),
        start: jest.fn()
      })),
      currentTime: 0,
      state: 'running',
      resume: jest.fn(() => Promise.resolve()),
      close: jest.fn()
    };
    
    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Task 1.1: TempoService Implementation', () => {
    test('should implement TempoService interface with required methods', () => {
      // Drive creation of TempoService interface and implementation
      expect(() => {
        const mockOSMDStore = {
          tempoMap: { defaultBpm: 120, averageBpm: 118 }
        };
        
        const tempoService = new TempoServiceImpl(mockOSMDStore);
        
        // Interface compliance verification
        expect(typeof tempoService.getCurrentBpm).toBe('function');
        expect(typeof tempoService.computeDelay).toBe('function');
        expect(typeof tempoService.setManualOverride).toBe('function');
        expect(typeof tempoService.applyTempoAdjustmentFactor).toBe('function');
      }).not.toThrow();
    });

    test('should extract BPM from osmdStore tempoMap', () => {
      // Drive integration with existing tempo extraction
      const mockOSMDStore = {
        tempoMap: { defaultBpm: 120, averageBpm: 118 }
      };
      
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      const bpm = tempoService.getCurrentBpm();
      
      expect(bpm).toBe(120); // Should use defaultBpm
      expect(typeof bpm).toBe('number');
      expect(bpm).toBeGreaterThan(0);
    });

    test('should handle missing tempoMap with 90 BPM default', () => {
      // Drive fallback implementation for missing tempo data
      const mockOSMDStore = { tempoMap: null };
      
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      const bpm = tempoService.getCurrentBpm();
      
      expect(bpm).toBe(90); // Moderate default as specified
    });

    test('should support manual tempo override via localStorage', () => {
      // Drive manual override implementation
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      // Set manual override
      tempoService.setManualOverride(100);
      expect(localStorage.getItem('tempo-override')).toBe('100');
      
      // Override should take precedence
      const bpm = tempoService.getCurrentBpm();
      expect(bpm).toBe(100);
      
      // Clear override
      tempoService.setManualOverride(null);
      expect(localStorage.getItem('tempo-override')).toBeNull();
      expect(tempoService.getCurrentBpm()).toBe(120); // Back to original
    });

    test('should compute musical delays correctly (CRITICAL: Fixed note duration units)', () => {
      // Drive correct musical timing calculation
      // MULTI-AI VALIDATION: This was identified as a critical units issue
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      // Test quarter note at 120 BPM
      // 120 BPM = 500ms per beat
      // Quarter note = 1.0 beat (NOT 0.25!)
      const quarterNoteDelay = tempoService.computeDelay(1.0); // 1.0 = quarter note
      const expectedDelay = (60_000 / 120) * 1.0 + 40; // 500ms + 40ms breathing = 540ms
      
      expect(quarterNoteDelay).toBe(expectedDelay);
      expect(quarterNoteDelay).toBe(540);
      
      // Test half note
      const halfNoteDelay = tempoService.computeDelay(2.0); // 2.0 = half note
      expect(halfNoteDelay).toBe(1040); // 1000ms + 40ms
      
      // Test eighth note
      const eighthNoteDelay = tempoService.computeDelay(0.5); // 0.5 = eighth note
      expect(eighthNoteDelay).toBe(290); // 250ms + 40ms
    });

    test('should enforce minimum 50ms delay', () => {
      // Drive minimum delay enforcement for very fast tempos
      const mockOSMDStore = { tempoMap: { defaultBpm: 300 } }; // Very fast
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      const veryShortNote = tempoService.computeDelay(0.1); // Very short note
      expect(veryShortNote).toBeGreaterThanOrEqual(50);
    });

    test('should add 40ms breathing room constant', () => {
      // Drive breathing room implementation
      const mockOSMDStore = { tempoMap: { defaultBpm: 60 } }; // Slow tempo
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      const quarterNote = tempoService.computeDelay(1.0);
      // 60 BPM = 1000ms per beat + 40ms breathing = 1040ms
      expect(quarterNote).toBe(1040);
    });

    test('should initialize service in <10ms', () => {
      // Drive performance requirement
      const startTime = performance.now();
      
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      new TempoServiceImpl(mockOSMDStore);
      
      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(10);
    });
  });

  describe('Task 1.2: WebAudioScheduler Implementation', () => {
    test('should implement WebAudioScheduler with AudioContext initialization', () => {
      // Drive AudioContext-based scheduler implementation
      expect(() => {
        const scheduler = new WebAudioScheduler();
        
        expect(scheduler).toBeDefined();
        expect(typeof scheduler.startSession).toBe('function');
        expect(typeof scheduler.getCurrentTime).toBe('function');
        expect(typeof scheduler.scheduleCallback).toBe('function');
      }).not.toThrow();
    });

    test('should handle AudioContext suspended state (CRITICAL FIX)', () => {
      // Drive proper suspended state handling
      mockAudioContext.state = 'suspended';
      
      const scheduler = new WebAudioScheduler();
      scheduler.startSession();
      
      // Should attempt to resume suspended context
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should fallback to setTimeout when AudioContext unavailable', () => {
      // Drive fallback implementation
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;
      
      const scheduler = new WebAudioScheduler();
      const callback = jest.fn();
      
      // Should not throw when AudioContext unavailable
      expect(() => {
        scheduler.scheduleCallback(callback, 100);
      }).not.toThrow();
      
      // Callback should be scheduled via setTimeout
      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, 110);
    });

    test('should provide accurate timing with AudioContext', () => {
      // Drive ±2ms accuracy requirement
      mockAudioContext.currentTime = 1.5; // 1.5 seconds
      
      const scheduler = new WebAudioScheduler();
      scheduler.startSession();
      
      mockAudioContext.currentTime = 1.75; // 0.25 seconds later
      const currentTime = scheduler.getCurrentTime();
      
      expect(currentTime).toBe(250); // 0.25 * 1000 = 250ms
    });

    test('should schedule callbacks with precise AudioContext timing', () => {
      // Drive AudioContext scheduling implementation
      const scheduler = new WebAudioScheduler();
      scheduler.startSession();
      
      const callback = jest.fn();
      scheduler.scheduleCallback(callback, 500);
      
      // Should use AudioContext for scheduling
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    test('should handle AudioContext initialization errors gracefully', () => {
      // Drive error handling
      global.AudioContext = jest.fn(() => {
        throw new Error('AudioContext not supported');
      });
      
      expect(() => {
        const scheduler = new WebAudioScheduler();
        scheduler.startSession();
      }).not.toThrow();
    });
  });

  describe('Task 1.3: Practice Controller Integration (CRITICAL)', () => {
    test('should implement extractNoteDuration function (MISSING IMPLEMENTATION)', () => {
      // MULTI-AI VALIDATION: This function was completely missing
      expect(() => {
        // This should be available in the practice controller
        const { result } = renderHook(() => usePracticeController());
        
        // Test quarter note
        const quarterDuration = result.current.extractNoteDuration({
          note: { duration: 'quarter', isDotted: false }
        });
        expect(quarterDuration).toBe(1.0);
        
        // Test half note
        const halfDuration = result.current.extractNoteDuration({
          note: { duration: 'half', isDotted: false }
        });
        expect(halfDuration).toBe(2.0);
        
        // Test dotted quarter (1.5x)
        const dottedQuarter = result.current.extractNoteDuration({
          note: { duration: 'quarter', isDotted: true }
        });
        expect(dottedQuarter).toBe(1.5);
        
        // Test fallback
        const unknownDuration = result.current.extractNoteDuration({
          note: { duration: 'unknown' }
        });
        expect(unknownDuration).toBe(1.0); // Default to quarter note
      }).not.toThrow();
    });

    test('should use FEEDBACK_TIMEOUT action not ADVANCE_CURSOR (CRITICAL FIX)', () => {
      // MULTI-AI VALIDATION: ADVANCE_CURSOR doesn't exist
      const { result } = renderHook(() => usePracticeController());
      
      act(() => {
        // Should be able to dispatch FEEDBACK_TIMEOUT
        result.current.dispatch({ type: 'FEEDBACK_TIMEOUT' });
      });
      
      // Should NOT attempt to use non-existent ADVANCE_CURSOR
      expect(() => {
        result.current.dispatch({ type: 'ADVANCE_CURSOR' });
      }).toThrow(); // This action should not exist
    });

    test('should integrate tempo services via context not direct instantiation', () => {
      // Drive proper service lifecycle management
      const TestComponent = () => {
        const { tempoService, scheduler } = useTempoServices();
        return (
          <div>
            <span data-testid="bpm">{tempoService.getCurrentBpm()}</span>
            <span data-testid="scheduler">{scheduler ? 'available' : 'unavailable'}</span>
          </div>
        );
      };
      
      // Should fail without provider
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTempoServices must be used within TempoServicesProvider');
      
      // Should work with provider
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('bpm')).toHaveTextContent('120');
      expect(screen.getByTestId('scheduler')).toHaveTextContent('available');
    });

    test('should remove duplicate timeout effects (CRITICAL FIX)', () => {
      // Drive elimination of duplicate timeouts
      const { result } = renderHook(() => usePracticeController());
      
      // Mock multiple rapid state changes
      act(() => {
        result.current.dispatch({ 
          type: 'NOTE_PLAYED', 
          payload: { note: 60 } 
        });
      });
      
      // Should not create multiple overlapping timeouts
      const timeoutSpy = jest.spyOn(global, 'setTimeout');
      
      act(() => {
        // Rapid state changes
        result.current.dispatch({ type: 'FEEDBACK_CORRECT' });
        result.current.dispatch({ type: 'FEEDBACK_CORRECT' });
        result.current.dispatch({ type: 'FEEDBACK_CORRECT' });
      });
      
      // Should clear previous timeouts before setting new ones
      expect(global.clearTimeout).toHaveBeenCalled();
      
      timeoutSpy.mockRestore();
    });

    test('should maintain existing state machine behavior', () => {
      // Drive requirement that tempo enhancement doesn't break existing flow
      const { result } = renderHook(() => usePracticeController());
      
      // All existing state transitions should still work
      act(() => {
        result.current.dispatch({ type: 'START_PRACTICE' });
      });
      
      expect(result.current.practiceState.status).not.toBe('idle');
      
      act(() => {
        result.current.dispatch({ 
          type: 'NOTE_PLAYED', 
          payload: { note: 60 } 
        });
      });
      
      // State machine should handle notes
      expect(result.current.practiceState.lastNote).toBe(60);
    });

    test('should integrate with performance instrumentation', () => {
      // Drive integration with Phase 0 instrumentation
      const { result } = renderHook(() => usePracticeController());
      
      act(() => {
        result.current.dispatch({ type: 'FEEDBACK_CORRECT' });
      });
      
      // Should provide timing measurements
      expect(result.current.measureAdvancementLatency).toBeDefined();
      
      const timing = result.current.measureAdvancementLatency();
      expect(typeof timing.markComplete).toBe('function');
    });
  });

  describe('Task 1.4: TempoServicesProvider Implementation', () => {
    test('should provide TempoServicesProvider with proper lifecycle', () => {
      // Drive context provider implementation
      const TestComponent = () => {
        const services = useTempoServices();
        return <div data-testid="services">{JSON.stringify(!!services)}</div>;
      };
      
      render(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(screen.getByTestId('services')).toHaveTextContent('true');
    });

    test('should initialize services on mount', () => {
      // Drive proper service initialization
      const startSessionSpy = jest.fn();
      
      // Mock scheduler to track initialization
      jest.doMock('@/renderer/features/practice-mode/services/WebAudioScheduler', () => ({
        WebAudioScheduler: jest.fn(() => ({
          startSession: startSessionSpy
        }))
      }));
      
      render(
        <TempoServicesProvider>
          <div>Test</div>
        </TempoServicesProvider>
      );
      
      expect(startSessionSpy).toHaveBeenCalled();
    });

    test('should memoize services based on osmdStore changes', () => {
      // Drive proper memoization
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
      
      // Re-render with same props should not recreate services
      rerender(
        <TempoServicesProvider>
          <TestComponent />
        </TempoServicesProvider>
      );
      
      expect(renderCount).toBe(initialRenderCount + 1); // Only one additional render
    });

    test('should handle service cleanup on unmount', () => {
      // Drive cleanup implementation
      const cleanupSpy = jest.fn();
      
      const TestProvider = ({ children }: { children: React.ReactNode }) => {
        React.useEffect(() => {
          return cleanupSpy;
        }, []);
        
        return <TempoServicesProvider>{children}</TempoServicesProvider>;
      };
      
      const { unmount } = render(
        <TestProvider>
          <div>Test</div>
        </TestProvider>
      );
      
      unmount();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Task 1.5: TempoIndicator Component', () => {
    test('should render tempo indicator with BPM display', () => {
      // Drive basic tempo indicator component
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      expect(screen.getByText('♩ = 120')).toBeInTheDocument();
    });

    test('should show manual override status', () => {
      // Drive override status display
      render(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      expect(screen.getByText('♩ = 100')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    test('should apply correct CSS classes for override state', () => {
      // Drive conditional styling
      const { rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const tempoSpan = screen.getByText('♩ = 120');
      expect(tempoSpan).toHaveClass('tempo-auto');
      
      rerender(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      const overrideSpan = screen.getByText('♩ = 100');
      expect(overrideSpan).toHaveClass('tempo-override');
    });

    test('should render without layout shift', () => {
      // Drive stable layout requirement
      const { container } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const initialHeight = container.firstChild?.clientHeight;
      
      // Change to override mode shouldn't affect layout
      render(
        <TempoIndicator currentBpm={100} isOverridden={true} />,
        { container }
      );
      
      const newHeight = container.firstChild?.clientHeight;
      expect(newHeight).toBe(initialHeight);
    });
  });

  describe('Performance Requirements Verification', () => {
    test('should maintain <20ms MIDI latency with tempo calculations', async () => {
      // Drive critical latency requirement
      const { result } = renderHook(() => usePracticeController());
      
      const startTime = performance.now();
      
      await act(async () => {
        result.current.dispatch({ 
          type: 'NOTE_PLAYED', 
          payload: { note: 60 } 
        });
        
        // Tempo calculation should not add significant latency
        await new Promise(resolve => setTimeout(resolve, 1));
      });
      
      const totalLatency = performance.now() - startTime;
      expect(totalLatency).toBeLessThan(20);
    });

    test('should compute tempo delays in <1ms', () => {
      // Drive tempo calculation performance
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      const startTime = performance.now();
      
      // Perform multiple calculations
      for (let i = 0; i < 100; i++) {
        tempoService.computeDelay(1.0);
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / 100;
      
      expect(averageTime).toBeLessThan(1); // <1ms per calculation
    });

    test('should not leak memory during tempo calculations', () => {
      // Drive memory efficiency requirement
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
        const tempoService = new TempoServiceImpl(mockOSMDStore);
        
        // Perform many calculations
        for (let i = 0; i < 1000; i++) {
          tempoService.computeDelay(Math.random() * 4);
        }
        
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        // Should not significantly increase memory
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // <1MB
      }
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle invalid BPM values gracefully', () => {
      // Drive robust error handling
      const mockOSMDStore = { tempoMap: { defaultBpm: NaN } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      expect(tempoService.getCurrentBpm()).toBe(90); // Should fallback
    });

    test('should handle negative or zero note durations', () => {
      // Drive input validation
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      expect(tempoService.computeDelay(-1)).toBe(50); // Minimum delay
      expect(tempoService.computeDelay(0)).toBe(50); // Minimum delay
    });

    test('should handle localStorage corruption gracefully', () => {
      // Drive storage error handling
      localStorage.setItem('tempo-override', 'invalid-number');
      
      const mockOSMDStore = { tempoMap: { defaultBpm: 120 } };
      const tempoService = new TempoServiceImpl(mockOSMDStore);
      
      expect(tempoService.getCurrentBpm()).toBe(120); // Should ignore invalid override
    });
  });
});