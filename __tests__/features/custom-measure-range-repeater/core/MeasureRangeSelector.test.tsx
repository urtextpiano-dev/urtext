/**
 * Version MeasureRangeSelector Component Tests
 * 
 * 
 * PERFORMANCE TARGET: Component render <100ms, Input validation <50ms
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import will fail initially - this drives implementation
// import { MeasureRangeSelector } from '@/renderer/features/practice-mode/components/MeasureRangeSelector';

// Mock the practice store
const mockPracticeStore = {
  customRangeActive: false,
  customStartMeasure: 1,
  customEndMeasure: 1,
  setCustomRange: jest.fn(),
  toggleCustomRange: jest.fn(),
  clearCustomRange: jest.fn(),
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => mockPracticeStore,
}));

describe('Version MeasureRangeSelector Component', () => {
  const defaultProps = {
    totalMeasures: 20, // Code review:: required prop (not optional)
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store state
    mockPracticeStore.customRangeActive = false;
    mockPracticeStore.customStartMeasure = 1;
    mockPracticeStore.customEndMeasure = 1;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    test('should render with required elements', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        // Essential UI elements from plan
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        expect(screen.getByLabelText('Start measure')).toBeInTheDocument();
        expect(screen.getByLabelText('End measure')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enable custom range/i })).toBeInTheDocument();
        
        // SM: and EM: prefixes as specified
        expect(screen.getByText('SM:')).toBeInTheDocument();
        expect(screen.getByText('EM:')).toBeInTheDocument();
        
        // Separator as specified in plan
        expect(screen.getByText('|')).toBeInTheDocument();
      }).toThrow('Version MeasureRangeSelector component not implemented');
    });

    test('should use required totalMeasures prop (Code review:)', () => {
      // All AI models agreed: totalMeasures should be required, not optional
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure') as HTMLInputElement;
        const endInput = screen.getByLabelText('End measure') as HTMLInputElement;
        
        // Should use totalMeasures for max validation
        expect(startInput.max).toBe('20');
        expect(endInput.max).toBe('20');
        expect(startInput.min).toBe('1');
        expect(endInput.min).toBe('1');
      }).toThrow('Version Required totalMeasures prop not implemented');
    });

    test('should apply custom className prop', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const { container } = render(<MeasureRangeSelector {...defaultProps} />);
        
        expect(container.firstChild).toHaveClass('test-class');
        expect(container.firstChild).toHaveClass('measure-range-selector');
      }).toThrow('Version Component className props not implemented');
    });

    test('should render within performance budget (<100ms)', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const startTime = performance.now();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(100); // <100ms render budget
      }).toThrow('Version Component render performance test not implemented');
    });
  });

  describe('Store Integration', () => {
    test('should display current store values', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        // Update mock store state
        mockPracticeStore.customStartMeasure = 5;
        mockPracticeStore.customEndMeasure = 12;
        mockPracticeStore.customRangeActive = true;
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure') as HTMLInputElement;
        const endInput = screen.getByLabelText('End measure') as HTMLInputElement;
        const toggleButton = screen.getByRole('button');
        
        expect(startInput.value).toBe('5');
        expect(endInput.value).toBe('12');
        expect(toggleButton).toHaveTextContent('Disable Range');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      }).toThrow('Version Store value display not implemented');
    });

    test('should call store actions on user input', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        const toggleButton = screen.getByRole('button');
        
        // Test input changes
        await user.clear(startInput);
        await user.type(startInput, '3');
        
        expect(mockPracticeStore.setCustomRange).toHaveBeenCalledWith(3, 1);
        
        await user.clear(endInput);
        await user.type(endInput, '8');
        
        expect(mockPracticeStore.setCustomRange).toHaveBeenCalledWith(3, 8);
        
        // Test toggle button
        await user.click(toggleButton);
        
        expect(mockPracticeStore.toggleCustomRange).toHaveBeenCalled();
      }).toThrow('Version Store action integration not implemented');
    });

    // CRITICAL: Multiple components synchronization (Code review: Code review: o3)
    test('should synchronize multiple components to same store', () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const { container: c1 } = render(<MeasureRangeSelector {...defaultProps} />);
        const { container: c2 } = render(<MeasureRangeSelector {...defaultProps} />);
        
        const firstStart = within(c1).getByLabelText('Start measure');
        const secondStart = within(c2).getByLabelText('Start measure');
        
        expect(secondStart.value).toBe('1'); // Both start at 1
        
        act(() => {
          usePracticeStore.getState().setCustomRange(5, 10);
        });
        
        expect(firstStart.value).toBe('5');
        expect(secondStart.value).toBe('5'); // Both update
      }).toThrow('Version Multiple component synchronization not implemented');
    });

    // CRITICAL: Prevent memory leaks (Code review: Code review:)
    test('should clean up event listeners and store subscriptions on unmount', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const addEventListener = jest.spyOn(window, 'addEventListener');
        const removeEventListener = jest.spyOn(window, 'removeEventListener');
        
        const { unmount } = render(<MeasureRangeSelector {...defaultProps} />);
        
        // Should add event listeners
        const addedListeners = addEventListener.mock.calls.map(call => call[0]);
        
        // Unmount component
        unmount();
        
        // Should remove all added listeners
        const removedListeners = removeEventListener.mock.calls.map(call => call[0]);
        addedListeners.forEach(listener => {
          expect(removedListeners).toContain(listener);
        });
        
        addEventListener.mockRestore();
        removeEventListener.mockRestore();
      }).toThrow('Version Event listener cleanup not implemented');
    });
  });

  describe('Input Validation (AI Consensus)', () => {
    test('should validate range boundaries in real-time', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={10} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // Test invalid start measure (< 1)
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        expect(screen.getByText('Start measure must be at least 1')).toBeInTheDocument();
        expect(startInput).toHaveClass('error');
        
        // Test invalid end measure (> totalMeasures)
        await user.clear(endInput);
        await user.type(endInput, '15');
        
        expect(screen.getByText('End measure cannot exceed 10')).toBeInTheDocument();
        expect(endInput).toHaveClass('error');
        
        // Test invalid range (start >= end)
        await user.clear(startInput);
        await user.type(startInput, '8');
        await user.clear(endInput);
        await user.type(endInput, '5');
        
        expect(screen.getByText('End measure must be greater than start measure')).toBeInTheDocument();
      }).toThrow('Version Real-time validation not implemented');
    });

    test('should disable toggle button for invalid ranges', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const toggleButton = screen.getByRole('button');
        
        // Valid range initially
        expect(toggleButton).not.toBeDisabled();
        
        // Invalid range should disable button
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        expect(toggleButton).toBeDisabled();
      }).toThrow('Version Toggle button validation state not implemented');
    });

    // CRITICAL: Blank/NaN state handling (Code review: Code review: o3)
    test('should handle empty input on blur without causing NaN', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        await user.clear(startInput); // Now value === ''
        await user.tab(); // Trigger blur
        
        expect(screen.getByText('Start measure is required')).toBeInTheDocument();
        expect(mockPracticeStore.setCustomRange).not.toHaveBeenCalled();
      }).toThrow('Version Empty input handling not implemented');
    });

    // CRITICAL: XSS Prevention (Code review: Code review:)
    test('should prevent XSS by sanitizing input', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        await user.type(startInput, '<script>alert("xss")</script>');
        
        expect(startInput.value).not.toContain('<script>');
        expect(screen.queryByText(/script/i)).not.toBeInTheDocument();
      }).toThrow('Version XSS prevention not implemented');
    });

    test('should validate within performance budget (<50ms)', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        const startTime = performance.now();
        
        await user.clear(startInput);
        await user.type(startInput, '5');
        
        const validationTime = performance.now() - startTime;
        expect(validationTime).toBeLessThan(50); // <50ms validation budget
      }).toThrow('Version Validation performance test not implemented');
    });
  });

  describe('Accessibility (WCAG Compliance)', () => {
    test('should have proper ARIA labels and roles', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        const toggleButton = screen.getByRole('button');
        
        // ARIA labels
        expect(startInput).toHaveAttribute('aria-label', 'Start measure');
        expect(endInput).toHaveAttribute('aria-label', 'End measure');
        
        // Toggle button accessibility
        expect(toggleButton).toHaveAttribute('aria-pressed');
        expect(toggleButton).toHaveAttribute('aria-label');
      }).toThrow('Version ARIA accessibility not implemented');
    });

    test('should announce errors to screen readers', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        const errorElement = screen.getByText('Start measure must be at least 1');
        
        // Error should be announced to screen readers
        expect(errorElement).toHaveAttribute('role', 'alert');
        expect(startInput).toHaveAttribute('aria-describedby', 'start-error');
        expect(errorElement).toHaveAttribute('id', 'start-error');
      }).toThrow('Version Screen reader error announcements not implemented');
    });

    test('should support keyboard navigation', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        // Tab navigation should work
        await user.tab();
        expect(screen.getByLabelText('Start measure')).toHaveFocus();
        
        await user.tab();
        expect(screen.getByLabelText('End measure')).toHaveFocus();
        
        await user.tab();
        expect(screen.getByRole('button')).toHaveFocus();
        
        // Enter key should activate toggle button
        await user.keyboard('{Enter}');
        expect(mockPracticeStore.toggleCustomRange).toHaveBeenCalled();
      }).toThrow('Version Keyboard navigation not implemented');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing totalMeasures gracefully', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        // This should either require the prop or handle gracefully
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Test with missing totalMeasures
        render(<MeasureRangeSelector className="test" />);
        
        // Should either show error or have fallback
        expect(
          screen.queryByText('Invalid configuration') || 
          screen.getByLabelText('Start measure')
        ).toBeInTheDocument();
        
        consoleSpy.mockRestore();
      }).toThrow('Version Missing totalMeasures handling not implemented');
    });

    test('should handle store errors gracefully', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        // Mock store action that throws
        mockPracticeStore.setCustomRange.mockImplementation(() => {
          throw new Error('Store error');
        });
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Should not crash on store error
        expect(() => {
          fireEvent.change(startInput, { target: { value: '5' } });
        }).not.toThrow();
        
        consoleSpy.mockRestore();
      }).toThrow('Version Store error handling not implemented');
    });
  });

  describe('Component Styling Integration', () => {
    test('should apply Urtext Piano CSS variable system', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const { container } = render(<MeasureRangeSelector {...defaultProps} />);
        
        // Should have proper CSS classes for styling
        expect(container.querySelector('.measure-range-selector')).toBeInTheDocument();
        expect(container.querySelector('.measure-range__inputs')).toBeInTheDocument();
        expect(container.querySelector('.measure-input')).toBeInTheDocument();
        expect(container.querySelector('.range-toggle')).toBeInTheDocument();
      }).toThrow('Version CSS styling classes not implemented');
    });

    test('should show error states visually', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        // Input should have error styling
        expect(startInput).toHaveClass('error');
        
        // Error text should be visible
        expect(screen.getByText('Start measure must be at least 1')).toHaveClass('error-text');
      }).toThrow('Version Error state styling not implemented');
    });
  });

  describe('Edge Cases', () => {
    test('should handle extreme values gracefully', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={1000} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // Test maximum valid range
        await user.clear(startInput);
        await user.type(startInput, '1');
        await user.clear(endInput);
        await user.type(endInput, '1000');
        
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
      }).toThrow('Version Extreme value handling not implemented');
    });

    test('should handle rapid input changes', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector {...defaultProps} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Rapid typing should not cause issues
        for (let i = 0; i < 10; i++) {
          await user.clear(startInput);
          await user.type(startInput, String(i + 1));
        }
        
        // Should handle without crashing
        expect(startInput).toBeInTheDocument();
      }).toThrow('Version Rapid input handling not implemented');
    });
  });
});

// Integration test for Phase 1 complete functionality
describe('Version MeasureRangeSelector Integration', () => {
  test('should integrate component with store seamlessly', () => {
    expect(() => {
      const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
      
      // Test complete integration flow
      render(<MeasureRangeSelector totalMeasures={50} className="integration-test" />);
      
      // Component should render with store values
      expect(screen.getByLabelText('Start measure')).toHaveValue(1);
      expect(screen.getByLabelText('End measure')).toHaveValue(1);
      expect(screen.getByRole('button')).toHaveTextContent('Enable Range');
      
      // All validation and interaction should work
      expect(screen.getByText('Practice Range:')).toBeInTheDocument();
    }).toThrow('Version Complete component integration not implemented');
  });
});