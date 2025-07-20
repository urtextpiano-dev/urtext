/**
 * Phase 1: Integration Tests - Store & Component Together
 * 
 * TDD CYCLE REMINDER:
 * 1. RED: Run these tests - they should fail with "not implemented" errors
 * 2. GREEN: Integrate components following phase-1-mvp-core.md
 * 3. REFACTOR: Improve integration while keeping tests green
 * 
 * PERFORMANCE TARGET: Full feature interaction <100ms
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Imports will fail initially - this drives implementation
// import { MeasureRangeSelector } from '@/renderer/features/practice-mode/components/MeasureRangeSelector';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';

describe('Phase 1: Custom Range Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset store if it exists
    try {
      const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
      usePracticeStore.getState().clearCustomRange?.();
    } catch {
      // Expected during RED phase
    }
  });

  afterEach(() => {
    cleanup();
  });

  describe('Store & Component Integration', () => {
    test('should synchronize component with store state', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Render component
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        // Initial state should match store defaults
        const startInput = screen.getByLabelText('Start measure') as HTMLInputElement;
        const endInput = screen.getByLabelText('End measure') as HTMLInputElement;
        
        expect(startInput.value).toBe('1');
        expect(endInput.value).toBe('1');
        
        // Update store directly
        const store = usePracticeStore.getState();
        store.setCustomRange(5, 10);
        
        // Component should reflect store changes
        expect(startInput.value).toBe('5');
        expect(endInput.value).toBe('10');
      }).toThrow('Phase 1: Store-Component synchronization not implemented');
    });

    test('should update store when user interacts with component', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // User updates inputs
        await user.clear(startInput);
        await user.type(startInput, '3');
        
        await user.clear(endInput);
        await user.type(endInput, '8');
        
        // Store should be updated
        const state = usePracticeStore.getState();
        expect(state.customStartMeasure).toBe(3);
        expect(state.customEndMeasure).toBe(8);
      }).toThrow('Phase 1: Component-Store updates not implemented');
    });

    test('should toggle custom range through UI and reflect in store', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const toggleButton = screen.getByRole('button', { name: /enable custom range/i });
        
        // Initial state
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
        
        // Click toggle
        await user.click(toggleButton);
        
        // Store should be updated
        expect(usePracticeStore.getState().customRangeActive).toBe(true);
        expect(toggleButton).toHaveTextContent('Disable Range');
        
        // Click again
        await user.click(toggleButton);
        
        expect(usePracticeStore.getState().customRangeActive).toBe(false);
        expect(toggleButton).toHaveTextContent('Enable Range');
      }).toThrow('Phase 1: Toggle integration not implemented');
    });
  });

  describe('Validation Integration', () => {
    test('should prevent invalid ranges from being enabled', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={10} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const toggleButton = screen.getByRole('button');
        
        // Set invalid range
        await user.clear(startInput);
        await user.type(startInput, '8');
        
        // End is still 1, so range is invalid (start > end)
        expect(toggleButton).toBeDisabled();
        expect(screen.getByText('End measure must be greater than start measure')).toBeInTheDocument();
        
        // Fix the range
        const endInput = screen.getByLabelText('End measure');
        await user.clear(endInput);
        await user.type(endInput, '10');
        
        // Should be enabled now
        expect(toggleButton).not.toBeDisabled();
        expect(screen.queryByText(/must be greater than/)).not.toBeInTheDocument();
      }).toThrow('Phase 1: Validation integration not implemented');
    });

    test('should show real-time validation feedback', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        // Type invalid start measure
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        // Should show error immediately
        await waitFor(() => {
          expect(screen.getByText('Start measure must be at least 1')).toBeInTheDocument();
        });
        
        // Type invalid end measure
        await user.clear(endInput);
        await user.type(endInput, '25');
        
        // Should show error immediately
        await waitFor(() => {
          expect(screen.getByText('End measure cannot exceed 20')).toBeInTheDocument();
        });
      }).toThrow('Phase 1: Real-time validation feedback not implemented');
    });
  });

  describe('Performance Integration', () => {
    test('should handle rapid input changes without lag', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={100} />);
        
        const startInput = screen.getByLabelText('Start measure');
        const startTime = performance.now();
        
        // Rapid typing simulation
        for (let i = 1; i <= 20; i++) {
          await user.clear(startInput);
          await user.type(startInput, String(i));
        }
        
        const duration = performance.now() - startTime;
        
        // Should handle 20 rapid changes in reasonable time
        expect(duration).toBeLessThan(1000); // <1s for 20 updates
        
        // Final state should be correct
        expect(usePracticeStore.getState().customStartMeasure).toBe(20);
      }).toThrow('Phase 1: Rapid input handling not implemented');
    });

    test('should render complete feature within budget', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        
        const startTime = performance.now();
        
        const { rerender } = render(<MeasureRangeSelector totalMeasures={50} />);
        
        // Trigger re-render
        rerender(<MeasureRangeSelector totalMeasures={100} />);
        
        const duration = performance.now() - startTime;
        
        // Complete render + re-render should be fast
        expect(duration).toBeLessThan(100); // <100ms budget
      }).toThrow('Phase 1: Render performance not optimized');
    });
  });

  describe('Error Recovery', () => {
    test('should recover gracefully from store errors', () => {
      expect(() => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        
        // Mock store to throw error
        const originalSetCustomRange = usePracticeStore.getState().setCustomRange;
        usePracticeStore.getState().setCustomRange = jest.fn(() => {
          throw new Error('Store error');
        });
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const startInput = screen.getByLabelText('Start measure');
        
        // Should not crash when store throws
        expect(() => {
          fireEvent.change(startInput, { target: { value: '5' } });
        }).not.toThrow();
        
        // Should log error appropriately
        expect(consoleSpy).toHaveBeenCalled();
        
        // Restore
        usePracticeStore.getState().setCustomRange = originalSetCustomRange;
        consoleSpy.mockRestore();
      }).toThrow('Phase 1: Error recovery not implemented');
    });
  });

  describe('Accessibility Integration', () => {
    test('should announce state changes to screen readers', async () => {
      expect(async () => {
        const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
        const user = userEvent.setup();
        
        render(<MeasureRangeSelector totalMeasures={20} />);
        
        const toggleButton = screen.getByRole('button');
        
        // Toggle should update aria-pressed
        expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
        
        await user.click(toggleButton);
        
        expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
        
        // Errors should be announced
        const startInput = screen.getByLabelText('Start measure');
        await user.clear(startInput);
        await user.type(startInput, '0');
        
        const errorElement = screen.getByText('Start measure must be at least 1');
        expect(errorElement).toHaveAttribute('role', 'alert');
      }).toThrow('Phase 1: Accessibility integration not implemented');
    });
  });
});

// Integration test to verify Phase 1 is complete
describe('Phase 1: Complete Integration Verification', () => {
  test('should demonstrate full Phase 1 functionality', () => {
    expect(() => {
      const { MeasureRangeSelector } = require('@/renderer/features/practice-mode/components/MeasureRangeSelector');
      const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
      
      // 1. Component renders with store integration
      render(<MeasureRangeSelector totalMeasures={30} />);
      
      // 2. All UI elements present
      expect(screen.getByText('Practice Range:')).toBeInTheDocument();
      expect(screen.getByLabelText('Start measure')).toBeInTheDocument();
      expect(screen.getByLabelText('End measure')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      // 3. Store state properly initialized
      const state = usePracticeStore.getState();
      expect(state.customRangeActive).toBe(false);
      expect(state.customStartMeasure).toBe(1);
      expect(state.customEndMeasure).toBe(1);
      
      // 4. Validation working
      expect(typeof state.setCustomRange).toBe('function');
      expect(typeof state.toggleCustomRange).toBe('function');
      expect(typeof state.clearCustomRange).toBe('function');
      
      // Phase 1 is complete!
    }).toThrow('Phase 1: Complete integration not implemented');
  });
});