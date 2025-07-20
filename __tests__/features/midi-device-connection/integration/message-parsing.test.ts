/**
 * Phase 2: MIDI Message Parsing Tests
 * 
 * Tests for parsing various MIDI message types
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { JZZMidiService } from '@/renderer/services/midi/JZZMidiService';
import type { MidiEvent } from '@/renderer/types/midi';

// Access private method for testing
class TestableJZZMidiService extends JZZMidiService {
  public testParseMidiMessage(msg: any[]): MidiEvent | null {
    return (this as any).parseMidiMessage(msg);
  }
}

describe('Phase 2: MIDI Message Parsing', () => {
  let service: TestableJZZMidiService;
  
  beforeEach(() => {
    service = new TestableJZZMidiService();
  });
  
  test('should parse Note On messages', () => {
    // Note On: status=0x90, note=60 (middle C), velocity=100
    const msg = [0x90, 60, 100];
    const event = service.testParseMidiMessage(msg);
    
    expect(event).toBeDefined();
    expect(event?.type).toBe('noteOn');
    if (event?.type === 'noteOn') {
      expect(event.note).toBe(60);
      expect(event.velocity).toBe(100);
      expect(event.channel).toBe(0);
      expect(event.timestamp).toBeGreaterThan(0);
    }
  });

  test('should parse Note Off messages', () => {
    // Note Off: status=0x80, note=60, velocity=64
    const msg = [0x80, 60, 64];
    const event = service.testParseMidiMessage(msg);
    
    expect(event).toBeDefined();
    expect(event?.type).toBe('noteOff');
    if (event?.type === 'noteOff') {
      expect(event.note).toBe(60);
      expect(event.velocity).toBe(64);
      expect(event.channel).toBe(0);
    }
  });
  
  test('should treat Note On with velocity 0 as Note Off', () => {
    // Note On with velocity=0 should be treated as Note Off
    const msg = [0x90, 60, 0];
    const event = service.testParseMidiMessage(msg);
    
    expect(event).toBeDefined();
    expect(event?.type).toBe('noteOff');
    if (event?.type === 'noteOff') {
      expect(event.note).toBe(60);
      expect(event.velocity).toBe(0);
    }
  });

  test('should parse Control Change messages', () => {
    // Control Change: status=0xB0, controller=64 (sustain), value=127
    const msg = [0xB0, 64, 127];
    const event = service.testParseMidiMessage(msg);
    
    expect(event).toBeDefined();
    expect(event?.type).toBe('controlChange');
    if (event?.type === 'controlChange') {
      expect(event.controller).toBe(64);
      expect(event.value).toBe(127);
      expect(event.channel).toBe(0);
    }
  });
  
  test('should extract channel from status byte', () => {
    // Note On channel 5: status=0x95 (0x90 + 5)
    const msg = [0x95, 60, 100];
    const event = service.testParseMidiMessage(msg);
    
    expect(event?.channel).toBe(5);
  });
  
  test('should handle invalid messages gracefully', () => {
    expect(service.testParseMidiMessage([])).toBeNull();
    expect(service.testParseMidiMessage([0x90])).toBeNull(); // Too short
    expect(service.testParseMidiMessage(null as any)).toBeNull();
  });
  
  test('should ignore unhandled message types', () => {
    // Program Change (0xC0) - not handled yet
    const msg = [0xC0, 1];
    const event = service.testParseMidiMessage(msg);
    
    expect(event).toBeNull();
  });
});