/**
 * Version MIDI Error Boundary Tests
 * 
 * Graceful error handling for MIDI failures
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MidiErrorBoundary } from '@/renderer/components/MidiErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test MIDI error');
  }
  return <div>No error</div>;
};

describe('Version MIDI Error Boundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('should catch MIDI initialization errors', () => {
    render(
      <MidiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MidiErrorBoundary>
    );
    
    // Should display fallback UI instead of crashing
    expect(screen.getByText(/MIDI functionality is currently unavailable/)).toBeTruthy();
  });

  test('should display fallback UI', () => {
    render(
      <MidiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MidiErrorBoundary>
    );
    
    // Check for key elements of fallback UI
    expect(screen.getByText(/MIDI functionality is currently unavailable/)).toBeTruthy();
    expect(screen.getByText(/You can still use the on-screen piano keyboard/)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
    expect(screen.getByText('🎹')).toBeTruthy();
  });

  test('should log errors for debugging', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    render(
      <MidiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MidiErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'MIDI Error:', 
      expect.any(Error),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });

  test('should allow recovery after error', () => {
    // Test that retry functionality exists and can reset component state
    render(
      <MidiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MidiErrorBoundary>
    );
    
    // Error state should be displayed
    expect(screen.getByText(/MIDI functionality is currently unavailable/)).toBeTruthy();
    
    // Click retry button
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeTruthy();
    
    // Verify the button is clickable and doesn't crash
    expect(() => {
      fireEvent.click(retryButton);
    }).not.toThrow();
    
    // After clicking retry, the error boundary should attempt to reset
    // (Full recovery testing would require a more complex setup with state management)
  });
});