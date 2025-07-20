/**
 * Phase 1: IMidiService Interface Tests
 * 
 * TDD Cycle:
 * 1. RED: Run tests - should fail with module not found
 * 2. GREEN: Create interface in src/renderer/services/midi/IMidiService.ts
 * 3. REFACTOR: Add comprehensive JSDoc comments
 */

import { describe, test, expect, jest } from '@jest/globals';

// These imports will fail until implementation
import type { IMidiService } from '@/renderer/services/midi/IMidiService';
import type { MidiEvent, MidiDevice, MidiEventHandler, DeviceChangeHandler } from '@/renderer/types/midi';

describe('Phase 1: IMidiService Interface Contract', () => {
  describe('Interface Structure', () => {
    test('should define IMidiService with all required methods', () => {
      // TypeScript compile-time test
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      expect(mockService).toBeDefined();
      expect(mockService.start).toBeDefined();
      expect(mockService.stop).toBeDefined();
      expect(mockService.subscribeToMidiEvents).toBeDefined();
      expect(mockService.subscribeToDeviceChanges).toBeDefined();
      expect(mockService.getDevices).toBeDefined();
    });

    test('should enforce start() returns Promise<void>', () => {
      class TestService implements IMidiService {
        async start(): Promise<void> {
          // Implementation
        }
        
        stop(): void { }
        subscribeToMidiEvents(callback: MidiEventHandler): () => void {
          return () => { };
        }
        subscribeToDeviceChanges(callback: DeviceChangeHandler): () => void {
          return () => { };
        }
        getDevices(): MidiDevice[] {
          return [];
        }
      }
      
      const service = new TestService();
      expect(service.start()).toBeInstanceOf(Promise);
    });

    test('should enforce subscribeToMidiEvents returns unsubscribe function', () => {
      const mockCallback: MidiEventHandler = jest.fn();
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      const unsubscribe = mockService.subscribeToMidiEvents(mockCallback);
      expect(typeof unsubscribe).toBe('function');
    });

    test('should enforce subscribeToDeviceChanges returns unsubscribe function', () => {
      const mockCallback: DeviceChangeHandler = jest.fn();
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      const unsubscribe = mockService.subscribeToDeviceChanges(mockCallback);
      expect(typeof unsubscribe).toBe('function');
    });

    test('should enforce getDevices returns MidiDevice array', () => {
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      const devices = mockService.getDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe('Method Signatures', () => {
    test('should accept MidiEventHandler callback with correct signature', () => {
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: jest.fn((callback: MidiEventHandler) => () => { }),
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      // Should accept function that takes MidiEvent
      const handler = (event: MidiEvent) => {
        if (event.type === 'noteOn') {
          console.log(`Note ${event.note} velocity ${event.velocity}`);
        }
      };
      
      mockService.subscribeToMidiEvents(handler);
      expect(mockService.subscribeToMidiEvents).toHaveBeenCalledWith(handler);
    });

    test('should accept DeviceChangeHandler callback with correct signature', () => {
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: jest.fn((callback: DeviceChangeHandler) => () => { }),
        getDevices: () => []
      };
      
      // Should accept function that takes MidiDevice[]
      const handler = (devices: MidiDevice[]) => {
        console.log(`${devices.length} devices available`);
      };
      
      mockService.subscribeToDeviceChanges(handler);
      expect(mockService.subscribeToDeviceChanges).toHaveBeenCalledWith(handler);
    });
  });

  describe('Implementation Requirements', () => {
    test('should allow multiple event subscriptions', () => {
      const handler1: MidiEventHandler = jest.fn();
      const handler2: MidiEventHandler = jest.fn();
      const unsubscribe1 = jest.fn();
      const unsubscribe2 = jest.fn();
      
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: jest.fn((callback: MidiEventHandler) => {
          if (callback === handler1) return unsubscribe1;
          if (callback === handler2) return unsubscribe2;
          return () => { };
        }) as (callback: MidiEventHandler) => () => void,
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      const unsub1 = mockService.subscribeToMidiEvents(handler1);
      const unsub2 = mockService.subscribeToMidiEvents(handler2);
      
      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');
      expect(unsub1).not.toBe(unsub2); // Different unsubscribe functions
    });

    test('should support async initialization in start()', async () => {
      const mockService: IMidiService = {
        start: jest.fn(async () => { }) as () => Promise<void>,
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: () => []
      };
      
      // Start should be async for device detection, permissions, etc.
      await expect(mockService.start()).resolves.toBeUndefined();
      expect(mockService.start).toHaveBeenCalled();
    });

    test('should provide synchronous device list access', () => {
      const mockDevices: MidiDevice[] = [
        {
          id: 'test-1',
          name: 'Test Device',
          manufacturer: 'Test Mfg',
          type: 'input',
          state: 'connected'
        }
      ];
      
      const mockService: IMidiService = {
        start: async () => { },
        stop: () => { },
        subscribeToMidiEvents: (callback: MidiEventHandler) => () => { },
        subscribeToDeviceChanges: (callback: DeviceChangeHandler) => () => { },
        getDevices: jest.fn(() => mockDevices)
      };
      
      // getDevices should be synchronous for immediate UI updates
      const devices = mockService.getDevices();
      expect(devices).toBeDefined();
      expect(devices).toEqual(mockDevices);
      expect(() => mockService.getDevices()).not.toThrow();
    });
  });

  describe('Interface Extensibility', () => {
    test('should allow implementation-specific extensions', () => {
      // Services can add extra methods beyond interface
      class ExtendedService implements IMidiService {
        start(): Promise<void> { return Promise.resolve(); }
        stop(): void { }
        subscribeToMidiEvents(cb: MidiEventHandler): () => void { return () => { }; }
        subscribeToDeviceChanges(cb: DeviceChangeHandler): () => void { return () => { }; }
        getDevices(): MidiDevice[] { return []; }
        
        // Extra method not in interface
        setVelocityCurve(curve: string): void { }
      }
      
      const service = new ExtendedService();
      expect(service.setVelocityCurve).toBeDefined();
      expect(service.start).toBeDefined();
      expect(service.stop).toBeDefined();
      expect(service.subscribeToMidiEvents).toBeDefined();
      expect(service.subscribeToDeviceChanges).toBeDefined();
      expect(service.getDevices).toBeDefined();
    });
  });
});