/**
 * Version MIDI Zustand Store Tests
 * 
 * Global state management for MIDI
 */

import { describe, test, expect } from '@jest/globals';
import { useMidiStore, applyVelocityCurve } from '@/renderer/stores/midiStore';
import type { MidiDevice } from '@/renderer/types/midi';

describe('Version MIDI Zustand Store', () => {
  test('should manage device list globally', () => {
    const { setDevices, devices } = useMidiStore.getState();
    
    const mockDevices: MidiDevice[] = [
      { id: 'device-1', name: 'Test Piano', manufacturer: 'Test Corp', type: 'input', state: 'connected' }
    ];
    
    setDevices(mockDevices);
    
    expect(useMidiStore.getState().devices).toEqual(mockDevices);
  });

  test('should persist user preferences', () => {
    const { setVelocityCurve, setTranspose, velocityCurve, transpose } = useMidiStore.getState();
    
    setVelocityCurve('exponential');
    setTranspose(3);
    
    const state = useMidiStore.getState();
    expect(state.velocityCurve).toBe('exponential');
    expect(state.transpose).toBe(3);
  });

  test('should track performance metrics', () => {
    const { recordLatency, latencyHistory, averageLatency } = useMidiStore.getState();
    
    recordLatency(15.5);
    recordLatency(18.2);
    recordLatency(12.1);
    
    const state = useMidiStore.getState();
    expect(state.latencyHistory).toContain(15.5);
    expect(state.latencyHistory).toContain(18.2);
    expect(state.latencyHistory).toContain(12.1);
    expect(state.averageLatency).toBeCloseTo(15.3, 1);
  });

  test('should handle velocity curves', () => {
    expect(applyVelocityCurve(64, 'linear')).toBe(64);
    expect(applyVelocityCurve(64, 'exponential')).toBeLessThan(64);
    expect(applyVelocityCurve(64, 'logarithmic')).toBeGreaterThan(64);
    
    // Test edge cases
    expect(applyVelocityCurve(0, 'exponential')).toBe(0);
    expect(applyVelocityCurve(127, 'linear')).toBe(127);
  });
});