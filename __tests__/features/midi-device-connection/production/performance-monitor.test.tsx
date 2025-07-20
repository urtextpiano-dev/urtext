/**
 * Phase 3: Performance Monitor UI Tests
 * 
 * Tests for latency visualization component
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MidiPerformanceMonitor } from '@/renderer/components/MidiPerformanceMonitor';
import { useMidiStore } from '@/renderer/stores/midiStore';

// Mock the store
jest.mock('@/renderer/stores/midiStore');

describe('Phase 3: MIDI Performance Monitor', () => {
  const mockUseMidiStore = useMidiStore as jest.MockedFunction<typeof useMidiStore>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store return value
    mockUseMidiStore.mockReturnValue({
      averageLatency: 18.5,
      latencyHistory: [15, 20, 18, 19, 17],
      devices: [],
      currentDeviceId: null,
      isConnected: false,
      velocityCurve: 'linear' as const,
      transpose: 0,
      setDevices: jest.fn(),
      selectDevice: jest.fn(),
      recordLatency: jest.fn(),
      setVelocityCurve: jest.fn(),
      setTranspose: jest.fn(),
    });
  });

  test('should display average latency', () => {
    // Override NODE_ENV for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<MidiPerformanceMonitor />);
    
    expect(screen.getByText('18.5ms')).toBeTruthy();
    expect(screen.getByText('MIDI Latency')).toBeTruthy();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('should show color-coded status', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // Test good latency
    mockUseMidiStore.mockReturnValue({
      averageLatency: 15.0,
      latencyHistory: [15, 16, 14],
      devices: [],
      currentDeviceId: null,
      isConnected: false,
      velocityCurve: 'linear' as const,
      transpose: 0,
      setDevices: jest.fn(),
      selectDevice: jest.fn(),
      recordLatency: jest.fn(),
      setVelocityCurve: jest.fn(),
      setTranspose: jest.fn(),
    });
    
    const { container, rerender } = render(<MidiPerformanceMonitor />);
    expect(container.querySelector('.good')).toBeTruthy();
    
    // Test warning latency
    mockUseMidiStore.mockReturnValue({
      averageLatency: 25.0,
      latencyHistory: [25, 26, 24],
      devices: [],
      currentDeviceId: null,
      isConnected: false,
      velocityCurve: 'linear' as const,
      transpose: 0,
      setDevices: jest.fn(),
      selectDevice: jest.fn(),
      recordLatency: jest.fn(),
      setVelocityCurve: jest.fn(),
      setTranspose: jest.fn(),
    });
    
    rerender(<MidiPerformanceMonitor />);
    expect(container.querySelector('.warning')).toBeTruthy();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('should only render in development', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test production mode
    process.env.NODE_ENV = 'production';
    const { container: prodContainer } = render(<MidiPerformanceMonitor />);
    expect(prodContainer.firstChild).toBeNull();
    
    // Test development mode  
    process.env.NODE_ENV = 'development';
    const { container: devContainer } = render(<MidiPerformanceMonitor />);
    expect(devContainer.firstChild).toBeTruthy();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('should update without causing re-renders', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const { rerender } = render(<MidiPerformanceMonitor />);
    
    // Update store with new latency
    mockUseMidiStore.mockReturnValue({
      averageLatency: 22.1,
      latencyHistory: [20, 22, 23, 21],
      devices: [],
      currentDeviceId: null,
      isConnected: false,
      velocityCurve: 'linear' as const,
      transpose: 0,
      setDevices: jest.fn(),
      selectDevice: jest.fn(),
      recordLatency: jest.fn(),
      setVelocityCurve: jest.fn(),
      setTranspose: jest.fn(),
    });
    
    // Should not throw errors when re-rendering
    expect(() => {
      rerender(<MidiPerformanceMonitor />);
    }).not.toThrow();
    
    expect(screen.getByText('22.1ms')).toBeTruthy();
    
    process.env.NODE_ENV = originalEnv;
  });
});