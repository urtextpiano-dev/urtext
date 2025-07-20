/**
 * Version Score Warning for Repeats Tests
 * 
 * Requirements:
 * - Detect musical repeats in sheet music
 * - Show warning overlay when repeats are found
 * - Explain limitations to user
 * - Allow user to proceed or choose different score
 * - Dismissable with clear action buttons
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Component to be implemented
import { RepeatWarning } from '@/renderer/features/practice-mode/components/RepeatWarning';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import { useOSMD } from '@/renderer/hooks/useOSMD';

// Mock dependencies
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');
jest.mock('@/renderer/hooks/useOSMD');

describe('Version Score Warning for Repeats', () => {
  let mockPracticeStore: any;
  let mockOSMD: any;
  let mockOnProceed: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockPracticeStore = {
      isActive: false,
      hasRepeats: false,
      repeatWarningDismissed: false,
      dismissRepeatWarning: jest.fn(),
    };
    (usePracticeStore as jest.Mock).mockReturnValue(mockPracticeStore);
    
    mockOSMD = {
      osmd: null,
      detectRepeats: jest.fn().mockReturnValue([]),
    };
    (useOSMD as jest.Mock).mockReturnValue(mockOSMD);
    
    mockOnProceed = jest.fn();
    mockOnCancel = jest.fn();
  });

  test('should not render when no repeats are detected', () => {
    mockOSMD.detectRepeats.mockReturnValue([]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.queryByTestId('repeat-warning')).not.toBeInTheDocument();
  });

  test('should render warning when repeats are detected', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 },
      { type: 'repeat_end', measureIndex: 8 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    const warning = screen.getByTestId('repeat-warning');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveClass('repeat-warning--visible');
  });

  test('should not render if warning was already dismissed', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    mockPracticeStore.repeatWarningDismissed = true;
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.queryByTestId('repeat-warning')).not.toBeInTheDocument();
  });

  test('should show appropriate warning message', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 },
      { type: 'repeat_end', measureIndex: 8 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText(/Musical repeats detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Practice mode will play through once/i)).toBeInTheDocument();
    expect(screen.getByText(/Repeats found in measures: 4-8/i)).toBeInTheDocument();
  });

  test('should handle multiple repeat sections', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 },
      { type: 'repeat_end', measureIndex: 8 },
      { type: 'repeat_start', measureIndex: 12 },
      { type: 'repeat_end', measureIndex: 16 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText(/Repeats found in measures: 4-8, 12-16/i)).toBeInTheDocument();
  });

  test('should handle D.C. al Fine and D.S. al Coda', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'dc_al_fine', measureIndex: 20 },
      { type: 'ds_al_coda', measureIndex: 24 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText(/D\.C\. al Fine and D\.S\. al Coda/i)).toBeInTheDocument();
  });

  test('should call onProceed when proceed button is clicked', async () => {
    const user = userEvent.setup();
    
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
    await user.click(proceedButton);
    
    expect(mockOnProceed).toHaveBeenCalled();
    expect(mockPracticeStore.dismissRepeatWarning).toHaveBeenCalled();
  });

  test('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /choose different score/i });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('should close warning when escape key is pressed', async () => {
    const user = userEvent.setup();
    
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    await user.keyboard('{Escape}');
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('should focus on first button when opened', async () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    await waitFor(() => {
      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      expect(proceedButton).toHaveFocus();
    });
  });

  test('should trap focus within warning dialog', async () => {
    const user = userEvent.setup();
    
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
    const cancelButton = screen.getByRole('button', { name: /choose different score/i });
    
    // Wait for initial focus to be set
    await waitFor(() => {
      expect(proceedButton).toHaveFocus();
    });
    
    // Tab should cycle between buttons
    await user.tab();
    expect(cancelButton).toHaveFocus();
    
    await user.tab();
    expect(proceedButton).toHaveFocus();
  });

  test('should animate in and out smoothly', async () => {
    // Start with no repeats
    mockOSMD.detectRepeats.mockReturnValue([]);
    
    const { rerender } = render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    // Update mock to return repeats and create new mock instance to trigger re-render
    const newDetectRepeats = jest.fn().mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    (useOSMD as jest.Mock).mockReturnValue({
      osmd: null,
      detectRepeats: newDetectRepeats,
    });
    
    rerender(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    // Wait for component to appear
    await waitFor(() => {
      expect(screen.getByTestId('repeat-warning')).toBeInTheDocument();
    });
    
    const warning = screen.getByTestId('repeat-warning');
    expect(warning).toHaveClass('repeat-warning--entering');
    
    await waitFor(() => {
      expect(warning).not.toHaveClass('repeat-warning--entering');
    });
  });

  test('should be accessible with proper ARIA attributes', () => {
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    const warning = screen.getByTestId('repeat-warning');
    expect(warning).toHaveAttribute('role', 'alertdialog');
    expect(warning).toHaveAttribute('aria-modal', 'true');
    expect(warning).toHaveAttribute('aria-labelledby', 'repeat-warning-title');
    expect(warning).toHaveAttribute('aria-describedby', 'repeat-warning-description');
  });

  test('should prevent body scroll when open', () => {
    const originalOverflow = document.body.style.overflow;
    
    mockOSMD.detectRepeats.mockReturnValue([
      { type: 'repeat_start', measureIndex: 4 }
    ]);
    
    const { unmount } = render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    
    expect(document.body.style.overflow).toBe(originalOverflow);
  });

  test('should detect repeats automatically when OSMD loads', () => {
    const mockOSMDInstance = {
      GraphicSheet: {
        MeasureList: [] // Mock score data
      }
    };
    
    mockOSMD.osmd = mockOSMDInstance;
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    // detectRepeats doesn't take any parameters - it uses the OSMD instance internally
    expect(mockOSMD.detectRepeats).toHaveBeenCalled();
  });

  test('should not show for scores without complexity', () => {
    // Simple score with no repeats
    mockOSMD.detectRepeats.mockReturnValue([]);
    
    render(
      <RepeatWarning 
        onProceed={mockOnProceed}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.queryByTestId('repeat-warning')).not.toBeInTheDocument();
  });
});