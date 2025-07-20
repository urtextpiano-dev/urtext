/**
 * Version MockMidiService Implementation Tests
 * 
 * TDD Cycle:
 * 1. RED: Tests fail - MockMidiService doesn't exist
 * 2. GREEN: Implement MockMidiService with deterministic sequence
 * 3. REFACTOR: Optimize timing and event generation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// These imports will fail until implementation
import { MockMidiService } from '@/renderer/services/midi/MockMidiService';
import type { IMidiService } from '@/renderer/services/midi/IMidiService';
import type { MidiEvent, MidiDevice, MidiEventHandler } from '@/renderer/types/midi';

describe('Version MockMidiService Implementation', () => {
  let service: MockMidiService;
  let mockCallback: jest.Mock<MidiEventHandler>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCallback = jest.fn();
    service = new MockMidiService();
  });

  afterEach(() => {
    service?.stop();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Service Lifecycle', () => {
    test('should implement IMidiService interface', () => {
      const service = new MockMidiService();
      
      // Verify all interface methods exist
      expect(typeof service.start).toBe('function');
      expect(typeof service.stop).toBe('function');
      expect(typeof service.subscribeToMidiEvents).toBe('function');
      expect(typeof service.subscribeToDeviceChanges).toBe('function');
      expect(typeof service.getDevices).toBe('function');
    });

    test('should start service and log initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const service = new MockMidiService();
      
      await service.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('🎹 Mock MIDI Service started');
      consoleSpy.mockRestore();
    });

    test('should stop service and clean up resources', async () => {
      const service = new MockMidiService();
      await service.start();
      const unsubscribe = service.subscribeToMidiEvents(mockCallback);
      
      service.stop();
      
      // Should clear all handlers
      jest.advanceTimersByTime(5000);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Mock Device Management', () => {
    test('should provide mock device in device list', () => {
      const service = new MockMidiService();
      const devices = service.getDevices();
      
      expect(devices).toHaveLength(1);
      expect(devices[0]).toMatchObject({
        id: 'mock-piano-1',
        name: 'Virtual Piano (Mock)',
        manufacturer: 'Urtext Piano Dev',
        type: 'input',
        state: 'connected'
      });
    });

    test('should notify device change handlers immediately with current devices', async () => {
      const service = new MockMidiService();
      const deviceCallback = jest.fn();
      
      await service.start();
      service.subscribeToDeviceChanges(deviceCallback);
      
      expect(deviceCallback).toHaveBeenCalledTimes(1);
      expect(deviceCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'mock-piano-1',
          name: 'Virtual Piano (Mock)'
        })
      ]);
    });
  });

  describe('Deterministic Event Generation', () => {
    test('should generate events in predictable sequence', async () => {
      const service = new MockMidiService();
      
      const events: MidiEvent[] = [];
      service.subscribeToMidiEvents(event => events.push(event));
      
      await service.start();
      
      // First note: C4 (60)
      expect(events[0]).toMatchObject({
        type: 'noteOn',
        note: 60,
        velocity: 80,
        channel: 0
      });
      
      // Note off after 450ms (90% of 500ms duration)
      jest.advanceTimersByTime(450);
      expect(events[1]).toMatchObject({
        type: 'noteOff',
        note: 60,
        velocity: 0
      });
      
      // Next note: D4 (62) after 500ms total
      jest.advanceTimersByTime(50);
      expect(events[2]).toMatchObject({
        type: 'noteOn',
        note: 62,
        velocity: 80
      });
    });

    test('should loop sequence after completion', async () => {
      const service = new MockMidiService();
      
      const events: MidiEvent[] = [];
      service.subscribeToMidiEvents(event => events.push(event));
      
      await service.start();
      
      jest.advanceTimersByTime(1); // Get initial note
      
      // Play through entire sequence (5 notes)
      // C4(500ms) + D4(500ms) + E4(500ms) + F4(500ms) + G4(1000ms) = 3000ms
      jest.advanceTimersByTime(3000);
      
      // Should start over with C4
      jest.advanceTimersByTime(1);
      const noteOnEvents = events.filter(e => e.type === 'noteOn');
      const lastNoteOn = noteOnEvents[noteOnEvents.length - 1];
      expect(lastNoteOn.note).toBe(60); // C4 again
    });

    test('should include accurate timestamps using performance.now()', async () => {
      const service = new MockMidiService();
      const perfNowSpy = jest.spyOn(performance, 'now').mockReturnValue(1234.5);
      
      const events: MidiEvent[] = [];
      service.subscribeToMidiEvents(event => events.push(event));
      
      await service.start();
      
      expect(events[0].timestamp).toBe(1234.5);
      perfNowSpy.mockRestore();
    });
  });

  describe('Event Subscription Management', () => {
    test('should support multiple event subscribers', async () => {
      const service = new MockMidiService();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      service.subscribeToMidiEvents(callback1);
      service.subscribeToMidiEvents(callback2);
      
      await service.start();
      
      jest.advanceTimersByTime(1);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith(callback2.mock.calls[0][0]);
    });

    test('should unsubscribe individual handlers', async () => {
      const service = new MockMidiService();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsub1 = service.subscribeToMidiEvents(callback1);
      service.subscribeToMidiEvents(callback2);
      
      await service.start();
      
      jest.advanceTimersByTime(1);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      // Unsubscribe first callback
      unsub1();
      
      jest.advanceTimersByTime(500);
      
      expect(callback1).toHaveBeenCalledTimes(1); // No more calls
      expect(callback2).toHaveBeenCalledTimes(3); // Got noteOff for C4 and noteOn for D4
    });
  });

  describe('Timing and Performance', () => {
    test('should maintain consistent timing for sequence', async () => {
      const service = new MockMidiService();
      
      let noteCount = 0;
      const startTime = Date.now();
      const timestamps: number[] = [];
      
      service.subscribeToMidiEvents(event => {
        if (event.type === 'noteOn') {
          timestamps.push(Date.now() - startTime);
          noteCount++;
        }
      });
      
      await service.start();
      
      jest.advanceTimersByTime(1); // Get first note
      
      // Advance through 4 more notes
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(500);
      }
      
      // We should have 5 timestamps (0, 500, 1000, 1500, 2000)
      expect(timestamps).toHaveLength(5);
      
      // Check intervals (approximately 500ms each)
      for (let i = 0; i < 4; i++) {
        const interval = timestamps[i + 1] - timestamps[i];
        expect(interval).toBe(500);
      }
    });

    test('should not block with synchronous callbacks', async () => {
      const service = new MockMidiService();
      
      // Slow callback that takes 100ms
      const slowCallback = jest.fn(() => {
        const start = Date.now();
        while (Date.now() - start < 100) { /* block */ }
      });
      
      service.subscribeToMidiEvents(slowCallback);
      
      await service.start();
      
      jest.advanceTimersByTime(1); // Trigger first event
      
      const startTime = Date.now();
      const elapsed = Date.now() - startTime;
      
      // Should not actually block for 100ms in test
      expect(elapsed).toBeLessThan(10);
      expect(slowCallback).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle stop() before start()', () => {
      const service = new MockMidiService();
      
      // Should not throw
      expect(() => service.stop()).not.toThrow();
    });

    test('should handle multiple start() calls', async () => {
      const service = new MockMidiService();
      
      const events: MidiEvent[] = [];
      service.subscribeToMidiEvents(event => events.push(event));
      
      await service.start();
      await service.start(); // Second call
      
      jest.advanceTimersByTime(1); // Get initial C4
      
      // Advance to get D4
      jest.advanceTimersByTime(499);
      
      // Should not generate duplicate events
      const noteOnEvents = events.filter(e => e.type === 'noteOn');
      expect(noteOnEvents).toHaveLength(2); // Initial C4 and D4 after 500ms
    });
  });
});