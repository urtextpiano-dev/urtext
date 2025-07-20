/**
 * Phase 2: Tiered Hint System Tests
 * 
 * Requirements:
 * - Progressive hints after incorrect attempts
 * - Three levels: note names → keyboard position → play sample
 * - 3 attempts between hint levels
 * - Audio hints use Web Audio API
 * - Visual hints integrate with piano highlighting
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Component to be implemented
import { HintSystem } from '@/renderer/features/practice-mode/components/HintSystem';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { PracticeStep } from '@/renderer/features/practice-mode/types';

// Mock dependencies
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');

// Mock Web Audio API
let oscillatorCount = 0;
const oscillators: any[] = [];

const createMockOscillator = () => {
  const osc = {
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 },
    type: 'sine'
  };
  oscillators.push(osc);
  return osc;
};

const mockGainNode = {
  connect: jest.fn(),
  gain: { 
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  }
};

const mockAudioContextInstance = {
  createOscillator: jest.fn(createMockOscillator),
  createGain: jest.fn(() => mockGainNode),
  destination: {},
  currentTime: 0,
  close: jest.fn()
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContextInstance);

describe('Phase 2: Tiered Hint System', () => {
  let mockStore: any;
  let mockAudioContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    oscillators.length = 0; // Clear oscillators array
    
    // Setup mock store
    mockStore = {
      isActive: false,
      status: 'idle',
      currentStep: null,
      attemptCount: 0,
      lastResult: null,
    };
    (usePracticeStore as jest.MockedFunction<typeof usePracticeStore>).mockReturnValue(mockStore);
    
    // Get mocked audio context
    mockAudioContext = mockAudioContextInstance;
  });

  test('should not show hints before 3 incorrect attempts', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 2;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    expect(screen.queryByTestId('hint-display')).not.toBeInTheDocument();
  });

  test('should show Level 1 hint (note names) after 3 attempts', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 3;
    mockStore.currentStep = {
      notes: [
        { midiValue: 60, pitchName: 'C4', octave: 4 },
        { midiValue: 64, pitchName: 'E4', octave: 4 }
      ],
      isChord: true,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    const hintDisplay = screen.getByTestId('hint-display');
    expect(hintDisplay).toBeInTheDocument();
    expect(screen.getByText('Hint: Play C4 and E4')).toBeInTheDocument();
    expect(hintDisplay).toHaveClass('hint--level-1');
  });

  test('should show Level 2 hint (keyboard position) after 6 attempts', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 6;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    const hintDisplay = screen.getByTestId('hint-display');
    expect(hintDisplay).toHaveClass('hint--level-2');
    
    // Should show visual keyboard position
    const keyboardHint = screen.getByTestId('keyboard-position-hint');
    expect(keyboardHint).toBeInTheDocument();
    
    // Should highlight the correct key visually
    const highlightedKey = screen.getByTestId('hint-key-60');
    expect(highlightedKey).toHaveClass('hint-key--highlighted');
  });

  test('should show Level 3 hint (play sample) after 9 attempts', async () => {
    const user = userEvent.setup();
    
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 9;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    const hintDisplay = screen.getByTestId('hint-display');
    expect(hintDisplay).toHaveClass('hint--level-3');
    
    // Should show play button
    const playButton = screen.getByRole('button', { name: /play example/i });
    expect(playButton).toBeInTheDocument();
    
    // Click play button
    await user.click(playButton);
    
    // Should create and play oscillator
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    
    // Check that the oscillator was started
    expect(oscillators[0].start).toHaveBeenCalled();
    expect(oscillators[0].stop).toHaveBeenCalled();
  });

  test('should play correct frequencies for multiple notes', async () => {
    const user = userEvent.setup();
    
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 9;
    mockStore.currentStep = {
      notes: [
        { midiValue: 60, pitchName: 'C4', octave: 4 }, // 261.63 Hz
        { midiValue: 64, pitchName: 'E4', octave: 4 }  // 329.63 Hz
      ],
      isChord: true,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    const playButton = screen.getByRole('button', { name: /play example/i });
    await user.click(playButton);
    
    // Should create oscillator for each note
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    
    // Check frequencies (A4 = 440Hz, each semitone is 2^(1/12) ratio)
    expect(oscillators[0].frequency.value).toBeCloseTo(261.63, 1);
    expect(oscillators[1].frequency.value).toBeCloseTo(329.63, 1);
  });

  test('should reset hints when moving to new step', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 5;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const { rerender } = render(<HintSystem />);
    
    // Should show hint
    expect(screen.getByTestId('hint-display')).toBeInTheDocument();
    
    // Move to new step
    mockStore.currentStep = {
      notes: [{ midiValue: 62, pitchName: 'D4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 1,
      timestamp: Date.now()
    };
    mockStore.attemptCount = 0;
    mockStore.status = 'listening';
    
    rerender(<HintSystem />);
    
    // Hint should be gone
    expect(screen.queryByTestId('hint-display')).not.toBeInTheDocument();
  });

  test('should not show hints for rest steps', () => {
    mockStore.isActive = true;
    mockStore.status = 'listening';
    mockStore.attemptCount = 10; // Many attempts
    mockStore.currentStep = {
      notes: [],
      isChord: false,
      isRest: true,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    expect(screen.queryByTestId('hint-display')).not.toBeInTheDocument();
  });

  test('should animate hint appearance', async () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 2;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const { rerender } = render(<HintSystem />);
    
    // No hint yet
    expect(screen.queryByTestId('hint-display')).not.toBeInTheDocument();
    
    // Trigger hint
    mockStore.attemptCount = 3;
    rerender(<HintSystem />);
    
    const hintDisplay = screen.getByTestId('hint-display');
    expect(hintDisplay).toHaveClass('hint--entering');
    
    // Wait for animation
    await waitFor(() => {
      expect(hintDisplay).not.toHaveClass('hint--entering');
    });
  });

  test('should handle chord hints appropriately', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 6;
    mockStore.currentStep = {
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
    
    render(<HintSystem />);
    
    // Level 2 hint should show all chord notes
    const highlightedKeys = screen.getAllByTestId(/hint-key-/);
    expect(highlightedKeys).toHaveLength(3);
    expect(screen.getByTestId('hint-key-60')).toHaveClass('hint-key--highlighted');
    expect(screen.getByTestId('hint-key-64')).toHaveClass('hint-key--highlighted');
    expect(screen.getByTestId('hint-key-67')).toHaveClass('hint-key--highlighted');
  });

  test('should be accessible with ARIA labels', () => {
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 3;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    render(<HintSystem />);
    
    const hintDisplay = screen.getByTestId('hint-display');
    expect(hintDisplay).toHaveAttribute('role', 'alert');
    expect(hintDisplay).toHaveAttribute('aria-live', 'polite');
    expect(hintDisplay).toHaveAttribute('aria-label', expect.stringContaining('Practice hint'));
  });

  test('should clean up audio resources on unmount', async () => {
    const user = userEvent.setup();
    
    mockStore.isActive = true;
    mockStore.status = 'feedback_incorrect';
    mockStore.attemptCount = 9;
    mockStore.currentStep = {
      notes: [{ midiValue: 60, pitchName: 'C4', octave: 4 }],
      isChord: false,
      isRest: false,
      measureIndex: 0,
      timestamp: Date.now()
    };
    
    const { unmount } = render(<HintSystem />);
    
    // Play audio
    const playButton = screen.getByRole('button', { name: /play example/i });
    await user.click(playButton);
    
    const oscillator = mockAudioContext.createOscillator();
    
    // Unmount component
    unmount();
    
    // Should close audio context
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});