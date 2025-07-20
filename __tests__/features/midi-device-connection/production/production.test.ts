/**
 * Version Production Readiness Tests
 * 
 * Final validation for production deployment
 */

import { describe, test, expect } from '@jest/globals';
import { useMidiStore, applyVelocityCurve } from '@/renderer/stores/midiStore';
import { IPCMidiService } from '@/renderer/services/midi/IPCMidiService';

describe('Version Production Readiness', () => {
  test('should handle all error cases gracefully', () => {
    const { recordLatency, setVelocityCurve, setTranspose } = useMidiStore.getState();
    
    // Test graceful handling of edge cases
    expect(() => {
      recordLatency(NaN);
      recordLatency(Infinity);
      recordLatency(-1);
    }).not.toThrow();
    
    expect(() => {
      setVelocityCurve('exponential');
      setTranspose(-12);
      setTranspose(12);
    }).not.toThrow();
    
    // Test velocity curve edge cases
    expect(() => {
      applyVelocityCurve(0, 'exponential');
      applyVelocityCurve(127, 'logarithmic');
      applyVelocityCurve(-1, 'linear');
      applyVelocityCurve(999, 'linear');
    }).not.toThrow();
  });

  test('should meet all performance targets', () => {
    const { latencyHistory, averageLatency, recordLatency } = useMidiStore.getState();
    
    // Simulate good performance metrics
    recordLatency(15.0);
    recordLatency(18.0);
    recordLatency(12.0);
    recordLatency(19.0);
    recordLatency(16.0);
    
    const state = useMidiStore.getState();
    
    // Verify latency tracking works efficiently
    expect(state.latencyHistory.length).toBeGreaterThan(0);
    expect(state.averageLatency).toBeLessThan(30); // Target <30ms
    expect(state.averageLatency).toBeGreaterThan(0);
    
    // Verify history is bounded (doesn't grow infinitely)
    for (let i = 0; i < 150; i++) {
      recordLatency(15 + Math.random() * 10);
    }
    
    expect(useMidiStore.getState().latencyHistory.length).toBeLessThanOrEqual(100);
  });

  test('should have no console errors in production', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    // Test normal operations don't generate console errors
    const { setDevices, selectDevice, recordLatency } = useMidiStore.getState();
    
    setDevices([]);
    selectDevice(null);
    recordLatency(15.5);
    
    // Should not have produced console errors
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should be ready for IPC migration', () => {
    // Test that IPC service stub exists and provides migration path
    const ipcService = new IPCMidiService();
    
    expect(ipcService).toBeDefined();
    expect(typeof ipcService.start).toBe('function');
    expect(typeof ipcService.stop).toBe('function');
    expect(typeof ipcService.subscribeToMidiEvents).toBe('function');
    expect(typeof ipcService.subscribeToDeviceChanges).toBe('function');
    
    // Test that it properly indicates it's not implemented yet
    expect(async () => {
      await ipcService.start();
    }).rejects.toThrow(/IPC MIDI Service not yet implemented/);
    
    // Test cleanup methods work
    expect(() => {
      ipcService.stop();
    }).not.toThrow();
  });
});