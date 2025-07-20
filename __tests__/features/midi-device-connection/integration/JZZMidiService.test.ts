/**
 * Version JZZMidiService Implementation Tests
 * 
 * TDD for real MIDI device connectivity using JZZ.js
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JZZMidiService } from '@/renderer/services/midi/JZZMidiService';
import type { MidiDevice, MidiEvent } from '@/renderer/types/midi';

// Mock JZZ module
const mockJZZConstructor = jest.fn();
jest.mock('jzz', () => mockJZZConstructor);

// Type for MIDI callback
type MidiCallback = (msg: number[]) => void;

// Mock types - simplified for Jest compatibility
interface MockMidiIn {
  connect: jest.Mock;
  close: jest.Mock;
}

interface MockJZZ {
  info: jest.Mock;
  openMidiIn: jest.Mock;
  openMidiOut: jest.Mock;
}

describe('Version JZZMidiService - Real MIDI Implementation', () => {
  let service: JZZMidiService;
  let mockJZZ: MockJZZ;
  let mockMidiIn: MockMidiIn;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock MIDI input
    mockMidiIn = {
      connect: jest.fn(),
      close: jest.fn()
    };
    
    // Setup mock JZZ instance
    mockJZZ = {
      info: jest.fn().mockReturnValue({
        inputs: [
          { id: 'device-1', name: 'Test Piano', manufacturer: 'Test Corp' },
          { id: 'device-2', name: 'USB MIDI', manufacturer: 'Generic' }
        ],
        outputs: []
      }),
      openMidiIn: (jest.fn() as any).mockResolvedValue(mockMidiIn),
      openMidiOut: jest.fn()
    };
    
    // Make JZZ return our mock
    (mockJZZConstructor as any).mockResolvedValue(mockJZZ);
    
    service = new JZZMidiService();
  });
  
  afterEach(() => {
    if (service && service.stop) {
      service.stop();
    }
  });

  describe('JZZ Integration', () => {
    test('should initialize JZZ.js library', async () => {
      await service.start();
      
      expect(mockJZZConstructor).toHaveBeenCalled();
    });

    test('should handle JZZ initialization errors gracefully', async () => {
      (mockJZZConstructor as any).mockRejectedValueOnce(new Error('MIDI not available'));
      
      await expect(service.start()).rejects.toThrow('MIDI not available');
    });
    
    test('should auto-connect to first available device', async () => {
      await service.start();
      
      expect(mockJZZ.openMidiIn).toHaveBeenCalledWith('device-1');
      expect(mockMidiIn.connect).toHaveBeenCalled();
    });
    
    test('should handle no devices gracefully', async () => {
      mockJZZ.info.mockReturnValue({ inputs: [], outputs: [] });
      
      await service.start();
      
      expect(mockJZZ.openMidiIn).not.toHaveBeenCalled();
    });
  });

  describe('Device Management', () => {
    test('should detect real MIDI devices', async () => {
      await service.start();
      
      const devices = service.getDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices[0]).toMatchObject({
        id: 'device-1',
        name: 'Test Piano',
        manufacturer: 'Test Corp',
        type: 'input',
        state: 'connected'
      });
    });

    test('should notify device change handlers', async () => {
      const deviceHandler = jest.fn();
      
      await service.start();
      service.subscribeToDeviceChanges(deviceHandler);
      
      expect(deviceHandler).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'device-1', name: 'Test Piano' }),
        expect.objectContaining({ id: 'device-2', name: 'USB MIDI' })
      ]);
    });
    
    test('should support unsubscribing from device changes', async () => {
      const deviceHandler = jest.fn();
      
      await service.start();
      const unsubscribe = service.subscribeToDeviceChanges(deviceHandler);
      
      deviceHandler.mockClear();
      unsubscribe();
      
      // Trigger a device change
      mockJZZ.info.mockReturnValue({ inputs: [], outputs: [] });
      await (service as any).refreshDevices();
      
      expect(deviceHandler).not.toHaveBeenCalled();
    });
  });

  describe('MIDI Message Handling', () => {
    test('should broadcast parsed MIDI messages to handlers', async () => {
      const eventHandler = jest.fn();
      let midiCallback: MidiCallback | null = null;
      
      // Capture the callback passed to connect
      mockMidiIn.connect.mockImplementation((cb: any) => {
        midiCallback = cb;
      });
      
      await service.start();
      service.subscribeToMidiEvents(eventHandler);
      
      // Simulate MIDI message  
      if (midiCallback) {
        (midiCallback as MidiCallback)([0x90, 60, 100]); // Note On
      }
      
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          channel: 0
        })
      );
    });
    
    test('should support multiple event handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      let midiCallback: MidiCallback | null = null;
      
      mockMidiIn.connect.mockImplementation((cb: any) => {
        midiCallback = cb;
      });
      
      await service.start();
      service.subscribeToMidiEvents(handler1);
      service.subscribeToMidiEvents(handler2);
      
      // Simulate MIDI message
      if (midiCallback) {
        (midiCallback as MidiCallback)([0x90, 60, 100]);
      }
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
    
    test('should support unsubscribing from events', async () => {
      const eventHandler = jest.fn();
      let midiCallback: MidiCallback | null = null;
      
      mockMidiIn.connect.mockImplementation((cb: any) => {
        midiCallback = cb;
      });
      
      await service.start();
      const unsubscribe = service.subscribeToMidiEvents(eventHandler);
      
      unsubscribe();
      
      // Simulate MIDI message
      if (midiCallback) {
        (midiCallback as MidiCallback)([0x90, 60, 100]);
      }
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });
  
  describe('Cleanup', () => {
    test('should properly cleanup on stop', async () => {
      await service.start();
      service.stop();
      
      expect(mockMidiIn.close).toHaveBeenCalled();
    });
    
    test('should prevent multiple starts', async () => {
      await service.start();
      await service.start(); // Second call
      
      expect(mockJZZConstructor).toHaveBeenCalledTimes(1);
    });
  });
});