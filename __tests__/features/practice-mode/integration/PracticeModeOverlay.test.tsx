/**
 * Version Practice Mode UI Overlay Tests
 * 
 * Requirements:
 * - Display current practice status
 * - Show expected notes with visual feedback
 * - Provide clear success/failure indicators
 * - Support keyboard shortcuts (spacebar to pause/resume)
 * - Animate state transitions smoothly
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react';

// Component to be implemented
import { PracticeModeOverlay } from '@/renderer/features/practice-mode/components/PracticeModeOverlay';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { PracticeStatus, PracticeStep, ComparisonResult } from '@/renderer/features/practice-mode/types';

// Mock the store
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');

describe('Version Practice Mode UI Overlay', () => {
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock store state
    mockStore = {
      isActive: false,
      status: 'idle' as PracticeStatus,
      currentStep: null,
      lastResult: null,
      attemptCount: 0,
      startPractice: jest.fn(),
      stopPractice: jest.fn(),
    };
    
    (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue(mockStore);
  });

  test('should not render when practice mode is inactive', () => {
    render(<PracticeModeOverlay />);
    
    const overlay = screen.queryByTestId('practice-overlay');
    expect(overlay).not.toBeInTheDocument();
  });

  test('should render overlay when practice mode is active', () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    
    render(<PracticeModeOverlay />);
    
    const overlay = screen.getByTestId('practice-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('practice-overlay--active');
  });

  test('should display current practice status', () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText('Waiting for input...')).toBeInTheDocument();
    
    // Update status
    mockStore.status = 'evaluating';
    render(<PracticeModeOverlay />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    
    // Feedback states
    mockStore.status = 'feedback_correct';
    render(<PracticeModeOverlay />);
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    
    mockStore.status = 'feedback_incorrect';
    render(<PracticeModeOverlay />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  test('should display expected notes', () => {
    const expectedStep: PracticeStep = {
      notes: [
        { midiValue: 60, pitchName: 'C4', octave: 4 },
        { midiValue: 64, pitchName: 'E4', octave: 4 },
        { midiValue: 67, pitchName: 'G4', octave: 4 }
      ],
      isChord: true,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockStore.isActive = true;
    mockStore.status = 'listening';
    mockStore.currentStep = expectedStep;
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText('Play:')).toBeInTheDocument();
    expect(screen.getByText('C4 + E4 + G4')).toBeInTheDocument();
    expect(screen.getByText('(chord)')).toBeInTheDocument();
  });

  test('should display single note without chord indicator', () => {
    const expectedStep: PracticeStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockStore.isActive = true;
    mockStore.status = 'listening';
    mockStore.currentStep = expectedStep;
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText('Play:')).toBeInTheDocument();
    expect(screen.getByText('C4')).toBeInTheDocument();
    expect(screen.queryByText('(chord)')).not.toBeInTheDocument();
  });

  test('should display rest instruction', () => {
    const restStep: PracticeStep = {
      notes: [],
      isChord: false,
      isRest: true,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    mockStore.isActive = true;
    mockStore.status = 'listening';
    mockStore.currentStep = restStep;
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText('Rest')).toBeInTheDocument();
    expect(screen.getByText('Wait for the rest to complete')).toBeInTheDocument();
  });

  test('should show attempt counter after incorrect attempts', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 2;
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
  });

  test('should show wrong notes feedback', () => {
    const wrongResult: ComparisonResult = {
      type: 'WRONG_NOTES',
      wrong: [61, 65], // C# and F
      expected: [60, 64, 67] // C, E, G
    };
    
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.lastResult = wrongResult;
    
    render(<PracticeModeOverlay />);
    
    expect(screen.getByText(/Wrong notes:/)).toBeInTheDocument();
    // Note: Actual MIDI to note name conversion would be implemented
  });

  test('should handle spacebar to toggle practice', async () => {
    const user = userEvent.setup();
    
    mockStore.isActive = true;
    mockStore.status = 'listening';
    
    const { rerender } = render(<PracticeModeOverlay />);
    
    // Press spacebar
    await user.keyboard(' ');
    
    expect(mockStore.stopPractice).toHaveBeenCalled();
    
    // Simulate practice stopped
    mockStore.isActive = false;
    mockStore.status = 'idle';
    rerender(<PracticeModeOverlay />);
    
    // Should show start prompt
    expect(screen.getByText('Press spacebar to start practice')).toBeInTheDocument();
    
    // Press spacebar again
    await user.keyboard(' ');
    expect(mockStore.startPractice).toHaveBeenCalled();
  });

  test('should apply correct status classes for animations', () => {
    mockStore.isActive = true;
    
    // Test each status
    const statusClasses = {
      'listening': 'practice-overlay--listening',
      'evaluating': 'practice-overlay--evaluating',
      'feedback_correct': 'practice-overlay--correct',
      'feedback_incorrect': 'practice-overlay--incorrect'
    };
    
    Object.entries(statusClasses).forEach(([status, className]) => {
      mockStore.status = status as PracticeStatus;
      const { container } = render(<PracticeModeOverlay />);
      const overlay = container.querySelector('.practice-overlay');
      expect(overlay).toHaveClass(className);
    });
  });

  test('should fade in/out smoothly', async () => {
    const { rerender } = render(<PracticeModeOverlay />);
    
    // Initially inactive
    expect(screen.queryByTestId('practice-overlay')).not.toBeInTheDocument();
    
    // Activate practice
    mockStore.isActive = true;
    mockStore.status = 'listening';
    rerender(<PracticeModeOverlay />);
    
    const overlay = screen.getByTestId('practice-overlay');
    expect(overlay).toHaveClass('practice-overlay--entering');
    
    // Wait for animation
    await waitFor(() => {
      expect(overlay).not.toHaveClass('practice-overlay--entering');
    });
    
    // Deactivate
    mockStore.isActive = false;
    rerender(<PracticeModeOverlay />);
    
    expect(overlay).toHaveClass('practice-overlay--exiting');
  });

  test('should position overlay correctly without blocking piano', () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    
    render(<PracticeModeOverlay />);
    
    const overlay = screen.getByTestId('practice-overlay');
    const styles = window.getComputedStyle(overlay);
    
    // Should be positioned at top of screen
    expect(styles.position).toBe('fixed');
    expect(styles.top).toBe('0px');
    expect(styles.pointerEvents).toBe('none'); // Should not block piano interaction
  });

  test('should handle rapid status changes gracefully', async () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    
    const { rerender } = render(<PracticeModeOverlay />);
    
    // Rapid status changes
    mockStore.status = 'evaluating';
    rerender(<PracticeModeOverlay />);
    
    mockStore.status = 'feedback_correct';
    rerender(<PracticeModeOverlay />);
    
    mockStore.status = 'listening';
    rerender(<PracticeModeOverlay />);
    
    // Should not crash and display correct status
    expect(screen.getByText('Waiting for input...')).toBeInTheDocument();
  });

  test('should be accessible with proper ARIA attributes', () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<PracticeModeOverlay />);
    
    const overlay = screen.getByTestId('practice-overlay');
    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
    expect(overlay).toHaveAttribute('aria-label', 'Practice mode status');
  });
});