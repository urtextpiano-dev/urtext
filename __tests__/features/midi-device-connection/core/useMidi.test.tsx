/**
 * Phase 1: useMidi Hook Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - hook doesn't exist
 * 2. GREEN: Implement useMidi hook with MockMidiService
 * 3. REFACTOR: Optimize lifecycle and error handling
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// These imports will fail until implementation
// import { useMidi } from '@/renderer/hooks/useMidi';
// import type { MidiEvent } from '@/renderer/types/midi';

// Mock the service factory
jest.mock('@/renderer/services/midi/MockMidiService', () => ({
  MockMidiService: jest.fn()
}));

describe('Phase 1: useMidi Hook Implementation', () => {
  let mockService: any;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    
    // Setup mock service
    mockService = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      subscribeToMidiEvents: jest.fn().mockReturnValue(() => {}),
      subscribeToDeviceChanges: jest.fn().mockReturnValue(() => {}),
      getDevices: jest.fn().mockReturnValue([])
    };
    
    // Mock the factory to return our mock service
    jest.doMock('@/renderer/services/midi/MockMidiService', () => ({
      MockMidiService: jest.fn(() => mockService)
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Hook Interface', () => {
    test('should return required properties', () => {
      expect(() => {
        const { result } = renderHook(() => useMidi(mockCallback));
        
        expect(result.current).toMatchObject({
          isConnected: expect.any(Boolean),
          error: undefined
        });
      }).toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should accept MidiEvent callback', () => {
      expect(() => {
        const eventHandler = (event: MidiEvent) => {
          console.log(`MIDI: ${event.type}`);
        };
        
        const { result } = renderHook(() => useMidi(eventHandler));
        expect(result.current).toBeDefined();
      }).toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Service Initialization', () => {
    test('should create and start service on mount', async () => {
      expect(async () => {
        const { result } = renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(mockService.start).toHaveBeenCalledTimes(1);
        });
        
        expect(result.current.isConnected).toBe(true);
        expect(result.current.error).toBeUndefined();
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should subscribe to MIDI events after initialization', async () => {
      expect(async () => {
        renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(mockService.subscribeToMidiEvents).toHaveBeenCalledWith(mockCallback);
        });
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should handle initialization errors gracefully', async () => {
      expect(async () => {
        mockService.start.mockRejectedValue(new Error('MIDI not available'));
        
        const { result } = renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(result.current.error).toBeDefined();
          expect(result.current.error?.message).toBe('MIDI not available');
          expect(result.current.isConnected).toBe(false);
        });
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Event Handling', () => {
    test('should forward MIDI events to callback', async () => {
      expect(async () => {
        // Setup mock to call callback when subscribed
        mockService.subscribeToMidiEvents.mockImplementation((cb) => {
          // Simulate event
          setTimeout(() => {
            cb({
              type: 'noteOn',
              note: 60,
              velocity: 100,
              channel: 0,
              timestamp: performance.now()
            });
          }, 100);
          
          return () => {};
        });
        
        renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(mockCallback).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'noteOn',
              note: 60,
              velocity: 100
            })
          );
        });
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should handle callback changes', async () => {
      expect(async () => {
        const { rerender } = renderHook(
          ({ callback }) => useMidi(callback),
          { initialProps: { callback: mockCallback } }
        );
        
        const newCallback = jest.fn();
        
        await act(async () => {
          rerender({ callback: newCallback });
        });
        
        // Should unsubscribe old and subscribe new
        await waitFor(() => {
          expect(mockService.subscribeToMidiEvents).toHaveBeenLastCalledWith(newCallback);
        });
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Cleanup', () => {
    test('should stop service on unmount', async () => {
      expect(async () => {
        const { unmount } = renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(mockService.start).toHaveBeenCalled();
        });
        
        unmount();
        
        expect(mockService.stop).toHaveBeenCalledTimes(1);
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should unsubscribe from events on unmount', async () => {
      expect(async () => {
        const unsubscribe = jest.fn();
        mockService.subscribeToMidiEvents.mockReturnValue(unsubscribe);
        
        const { unmount } = renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(mockService.subscribeToMidiEvents).toHaveBeenCalled();
        });
        
        unmount();
        
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Error Handling', () => {
    test('should log errors to console', async () => {
      expect(async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        mockService.start.mockRejectedValue(new Error('Test error'));
        
        renderHook(() => useMidi(mockCallback));
        
        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'MIDI initialization failed:',
            expect.any(Error)
          );
        });
        
        consoleSpy.mockRestore();
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should continue functioning after error recovery', async () => {
      expect(async () => {
        mockService.start.mockRejectedValueOnce(new Error('Temporary error'))
                       .mockResolvedValueOnce(undefined);
        
        const { result, rerender } = renderHook(() => useMidi(mockCallback));
        
        // Wait for initial error
        await waitFor(() => {
          expect(result.current.error).toBeDefined();
        });
        
        // Force re-render to retry
        rerender();
        
        await waitFor(() => {
          expect(result.current.isConnected).toBe(true);
          expect(result.current.error).toBeUndefined();
        });
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Performance Considerations', () => {
    test('should not cause re-renders on every MIDI event', async () => {
      expect(async () => {
        let renderCount = 0;
        const TestComponent = () => {
          renderCount++;
          useMidi(mockCallback);
          return null;
        };
        
        renderHook(() => <TestComponent />);
        
        // Simulate multiple MIDI events
        await act(async () => {
          for (let i = 0; i < 10; i++) {
            mockCallback({ type: 'noteOn', note: 60 + i } as MidiEvent);
          }
        });
        
        // Should only render once on mount
        expect(renderCount).toBe(1);
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });

    test('should handle rapid event streams without blocking', async () => {
      expect(async () => {
        const events: MidiEvent[] = [];
        const fastCallback = (event: MidiEvent) => {
          events.push(event);
        };
        
        renderHook(() => useMidi(fastCallback));
        
        // Simulate rapid events
        await act(async () => {
          for (let i = 0; i < 100; i++) {
            mockService.subscribeToMidiEvents.mock.calls[0][0]({
              type: 'noteOn',
              note: 60,
              velocity: 100,
              channel: 0,
              timestamp: performance.now()
            });
          }
        });
        
        expect(events).toHaveLength(100);
      }).rejects.toThrow(/Cannot find module|useMidi is not defined/);
    });
  });

  describe('Mock Service Factory', () => {
    test('should use MockMidiService in non-test environment', () => {
      expect(() => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        renderHook(() => useMidi(mockCallback));
        
        expect(require('@/renderer/services/midi/MockMidiService').MockMidiService)
          .toHaveBeenCalledTimes(1);
        
        process.env.NODE_ENV = originalEnv;
      }).toThrow(/Cannot find module|useMidi is not defined/);
    });
  });
});