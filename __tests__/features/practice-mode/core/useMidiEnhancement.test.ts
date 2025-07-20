/**
 * Phase 1: MIDI Hook Enhancement Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - pressed keys tracking doesn't exist
 * 2. GREEN: Enhance useMidi hook in src/renderer/hooks/useMidi.ts
 * 3. REFACTOR: Optimize debouncing and Set operations
 * 
 * CRITICAL: 50ms debounce window for chord detection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock MIDI services and stores before importing
jest.mock('@/renderer/services/midi/MockMidiService', () => ({
  MockMidiService: jest.fn()
}));

jest.mock('@/renderer/services/midi/JZZMidiService', () => ({
  JZZMidiService: jest.fn()
}));

jest.mock('@/renderer/stores/midiStore', () => ({
  useMidiStore: jest.fn(),
  applyVelocityCurve: jest.fn()
}));

// These imports will fail until implementation
import { useMidi } from '@/renderer/hooks/useMidi';
import type { MidiEvent } from '@/renderer/types/midi';

// Helper to create valid MidiEvent objects
const createMidiEvent = (type: 'noteOn' | 'noteOff', note: number, velocity: number): MidiEvent => ({
  type,
  note,
  velocity,
  channel: 0,
  timestamp: Date.now()
});

describe('Phase 1: MIDI Hook Enhancement for Practice Mode', () => {
  let mockMidiService: any;
  let onKeysChangedCallback: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    onKeysChangedCallback = jest.fn();

    // Mock MIDI service
    mockMidiService = {
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(),
      subscribeToMidiEvents: jest.fn(),
      subscribeToDeviceChanges: jest.fn().mockReturnValue(() => {}),
      getDevices: jest.fn().mockReturnValue([])
    };

    // Mock the service constructors to return our mockMidiService
    const MockMidiService = require('@/renderer/services/midi/MockMidiService').MockMidiService;
    MockMidiService.mockImplementation(() => mockMidiService);

    // Mock the store to return expected values
    const midiStore = require('@/renderer/stores/midiStore');
    midiStore.useMidiStore.mockImplementation(() => ({
      devices: [],
      status: 'initializing',
      currentDeviceId: null,
      error: null,
      setStatus: jest.fn(),
      setDevices: jest.fn(),
      selectDevice: jest.fn(),
      setError: jest.fn(),
      recordLatency: jest.fn(),
      transpose: 0,
      velocityCurve: 'linear'
    }));
    midiStore.applyVelocityCurve.mockImplementation((velocity: number) => velocity);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should expose pressedKeys Set', () => {
    const { result } = renderHook(() => 
      useMidi({ onKeysChanged: onKeysChangedCallback })
    );

    expect(result.current).toHaveProperty('pressedKeys');
    expect(result.current.pressedKeys).toBeInstanceOf(Set);
    expect(result.current.pressedKeys.size).toBe(0);
  });

  test('should track pressed keys on noteOn events', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Simulate noteOn event
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
      });

      // Should not update immediately (debouncing)
      expect(result.current.pressedKeys.size).toBe(0);

      // Fast forward past debounce window
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(true);
      expect(result.current.pressedKeys.size).toBe(1);
      expect(onKeysChangedCallback).toHaveBeenCalledWith([60]);
  });

  test('should remove keys on noteOff events', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Press key
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(true);

      // Release key
      act(() => {
        midiEventHandler!({
          type: 'noteOff',
          note: 60,
          velocity: 0,
          channel: 0,
          timestamp: Date.now()
        });
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(false);
      expect(result.current.pressedKeys.size).toBe(0);
      expect(onKeysChangedCallback).toHaveBeenLastCalledWith([]);
  });

  test('should handle velocity=0 as noteOff (compatibility)', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Press key
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(true);

      // Some keyboards send noteOn with velocity=0 instead of noteOff
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 0, // This should be treated as noteOff
          channel: 0,
          timestamp: Date.now()
        });
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(false);
  });

  test('should debounce chord detection within 50ms window', async () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Simulate chord (multiple notes within 50ms)
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
        
        jest.advanceTimersByTime(10); // 10ms later
        
        midiEventHandler!({
          type: 'noteOn',
          note: 64,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
        
        jest.advanceTimersByTime(10); // 20ms total
        
        midiEventHandler!({
          type: 'noteOn',
          note: 67,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
      });

      // Should not have called callback yet
      expect(onKeysChangedCallback).not.toHaveBeenCalled();

      // Advance to complete debounce window
      act(() => {
        jest.advanceTimersByTime(30); // Total 50ms
      });

      // Should now have all three notes
      await waitFor(() => {
        expect(result.current.pressedKeys.size).toBe(3);
        expect(onKeysChangedCallback).toHaveBeenCalledTimes(1);
        expect(onKeysChangedCallback).toHaveBeenCalledWith([60, 64, 67]);
      });
  });

  test('should maintain key order in callback', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Add keys in specific order
      act(() => {
        midiEventHandler!(createMidiEvent('noteOn', 67, 100));
        midiEventHandler!(createMidiEvent('noteOn', 60, 100));
        midiEventHandler!(createMidiEvent('noteOn', 64, 100));
        jest.advanceTimersByTime(50);
      });

      const calledKeys = onKeysChangedCallback.mock.calls[0][0];
      // Should be in numerical order (Set maintains insertion order, Array.from preserves it)
      expect(calledKeys).toEqual([67, 60, 64]);
  });

  test('should handle rapid key changes', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Rapid sequence
      act(() => {
        midiEventHandler!(createMidiEvent('noteOn', 60, 100));
        jest.advanceTimersByTime(50);
      });

      expect(onKeysChangedCallback).toHaveBeenCalledWith([60]);

      act(() => {
        midiEventHandler!(createMidiEvent('noteOn', 64, 100));
        jest.advanceTimersByTime(50);
      });

      expect(onKeysChangedCallback).toHaveBeenCalledWith([60, 64]);

      act(() => {
        midiEventHandler!(createMidiEvent('noteOff', 60, 0));
        jest.advanceTimersByTime(50);
      });

      expect(onKeysChangedCallback).toHaveBeenCalledWith([64]);
  });

  test('should not call onKeysChanged if not provided', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      // No onKeysChanged callback
      const { result } = renderHook(() => useMidi());

      // Should not throw
      act(() => {
        midiEventHandler!({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0,
          timestamp: Date.now()
        });
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.has(60)).toBe(true);
  });

  test('should clean up debounced function on unmount', () => {
    const { unmount } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      unmount();

      // Advance timers should not cause any callbacks
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onKeysChangedCallback).not.toHaveBeenCalled();
  });

  test('should handle multiple simultaneous key releases', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Press multiple keys
      act(() => {
        midiEventHandler!(createMidiEvent('noteOn', 60, 100));
        midiEventHandler!(createMidiEvent('noteOn', 64, 100));
        midiEventHandler!(createMidiEvent('noteOn', 67, 100));
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.size).toBe(3);

      // Release all at once (e.g., lifting hand from chord)
      act(() => {
        midiEventHandler!(createMidiEvent('noteOff', 60, 0));
        midiEventHandler!(createMidiEvent('noteOff', 64, 0));
        midiEventHandler!(createMidiEvent('noteOff', 67, 0));
        jest.advanceTimersByTime(50);
      });

      expect(result.current.pressedKeys.size).toBe(0);
      expect(onKeysChangedCallback).toHaveBeenLastCalledWith([]);
  });

  test('should maintain separate internal and exposed state', () => {
    let midiEventHandler: ((event: MidiEvent) => void) | null = null;

      mockMidiService.subscribeToMidiEvents.mockImplementation((handler: any) => {
        midiEventHandler = handler;
        return () => { midiEventHandler = null; };
      });

      const { result } = renderHook(() => 
        useMidi({ onKeysChanged: onKeysChangedCallback })
      );

      // Internal state should update immediately
      act(() => {
        midiEventHandler!(createMidiEvent('noteOn', 60, 100));
      });

      // External state not updated yet
      expect(result.current.pressedKeys.size).toBe(0);

      // After debounce
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Now external state is updated
      expect(result.current.pressedKeys.size).toBe(1);
  });
});