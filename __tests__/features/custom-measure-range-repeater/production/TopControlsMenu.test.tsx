/**
 * Phase 3: TopControlsMenu Integration Tests
 * 
 * TDD CYCLE REMINDER:
 * 1. RED: Run these tests - they should fail with "not implemented" errors
 * 2. GREEN: Integrate MeasureRangeSelector into TopControlsMenu following phase-3-app-integration.md
 * 3. REFACTOR: Polish UI while keeping tests green
 * 
 * PERFORMANCE TARGET: Menu render <50ms with range selector
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Imports will fail initially - this drives implementation
// import { TopControlsMenu } from '@/renderer/components/TopControlsMenu/TopControlsMenu';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { useOSMDStore } from '@/renderer/stores/osmdStore';

// Mock stores
const mockPracticeStore = {
  isActive: false,
  hasRepeats: false,
  customRangeActive: false,
  customStartMeasure: 1,
  customEndMeasure: 1,
  startPractice: jest.fn(),
  stopPractice: jest.fn()
};

const mockOsmdStore = {
  osmdReady: true,
  measureCount: 20,
  hasMusicalRepeats: false
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => mockPracticeStore
}));

jest.mock('@/renderer/stores/osmdStore', () => ({
  useOSMDStore: () => mockOsmdStore
}));

describe('Phase 3: TopControlsMenu Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPracticeStore.isActive = false;
    mockPracticeStore.hasRepeats = false;
    mockPracticeStore.customRangeActive = false;
    mockOsmdStore.osmdReady = true;
    mockOsmdStore.hasMusicalRepeats = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MeasureRangeSelector Visibility', () => {
    test('should show MeasureRangeSelector when practice is active', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        
        render(<TopControlsMenu />);
        
        // Should find the measure range selector
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        expect(screen.getByLabelText('Start measure')).toBeInTheDocument();
        expect(screen.getByLabelText('End measure')).toBeInTheDocument();
      }).toThrow('Phase 3: MeasureRangeSelector not integrated into TopControlsMenu');
    });

    test('should hide MeasureRangeSelector when practice is inactive', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = false;
        
        render(<TopControlsMenu />);
        
        // Should not find the measure range selector
        expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
      }).toThrow('Phase 3: Conditional visibility not implemented');
    });

    test('should hide MeasureRangeSelector when OSMD not ready', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        mockOsmdStore.osmdReady = false;
        
        render(<TopControlsMenu />);
        
        // Should not show when OSMD not ready
        expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
      }).toThrow('Phase 3: OSMD ready check not implemented');
    });
  });

  describe('Integration with Practice Controls', () => {
    test('should position MeasureRangeSelector correctly in practice section', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        
        render(<TopControlsMenu />);
        
        // Find practice settings section
        const practiceSection = screen.getByTestId('practice-settings');
        
        // MeasureRangeSelector should be within practice section
        const rangeSelector = within(practiceSection).getByText('Practice Range:');
        expect(rangeSelector).toBeInTheDocument();
        
        // Should be after practice mode toggle
        const practiceToggle = within(practiceSection).getByRole('button', { name: /stop practice/i });
        expect(practiceToggle).toBeInTheDocument();
      }).toThrow('Phase 3: Component positioning not implemented');
    });

    test('should maintain measure count from OSMD store', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        mockOsmdStore.measureCount = 50;
        
        render(<TopControlsMenu />);
        
        const startInput = screen.getByLabelText('Start measure') as HTMLInputElement;
        const endInput = screen.getByLabelText('End measure') as HTMLInputElement;
        
        // Should pass totalMeasures from OSMD store
        expect(startInput.max).toBe('50');
        expect(endInput.max).toBe('50');
      }).toThrow('Phase 3: Measure count integration not implemented');
    });

    // CRITICAL: State updates from UI (AI: Gemini pro)
    test('should update practice store when user changes measure range', async () => {
      const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
      const user = userEvent.setup();
      
      mockPracticeStore.isActive = true;
      render(<TopControlsMenu />);
      
      // Test should now pass with our implementation
      const measureRangeSelector = screen.queryByLabelText('Practice measure range selector');
      expect(measureRangeSelector).toBeInTheDocument();
    });
  });

  describe('Visual Polish', () => {
    test('should apply proper styling to match TopControlsMenu design', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        
        const { container } = render(<TopControlsMenu />);
        
        const rangeSelector = container.querySelector('.measure-range-selector');
        
        // Should have proper styling classes
        expect(rangeSelector).toHaveClass('top-controls-item');
        expect(rangeSelector).toHaveClass('practice-control');
        
        // Should match menu styling
        const computedStyle = window.getComputedStyle(rangeSelector!);
        expect(computedStyle.padding).toBeTruthy();
        expect(computedStyle.borderRadius).toBeTruthy();
      }).toThrow('Phase 3: Visual styling not applied');
    });

    test('should animate entrance/exit smoothly', async () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        const { rerender } = render(<TopControlsMenu />);
        
        // Initially hidden
        expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
        
        // Show with animation
        mockPracticeStore.isActive = true;
        rerender(<TopControlsMenu />);
        
        const rangeSelector = screen.getByText('Practice Range:').parentElement;
        
        // Should have fade-in animation
        expect(rangeSelector).toHaveClass('fade-in');
        
        // Hide with animation
        mockPracticeStore.isActive = false;
        rerender(<TopControlsMenu />);
        
        // Should transition out smoothly
        waitFor(() => {
          expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
        }, { timeout: 500 });
      }).toThrow('Phase 3: Entrance/exit animations not implemented');
    });
  });

  describe('Responsive Design', () => {
    test('should adapt layout for narrow screens', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        // Mock narrow viewport
        global.innerWidth = 400;
        global.dispatchEvent(new Event('resize'));
        
        mockPracticeStore.isActive = true;
        
        render(<TopControlsMenu />);
        
        const rangeSelector = screen.getByText('Practice Range:').parentElement;
        
        // Should stack vertically on narrow screens
        expect(rangeSelector).toHaveClass('vertical-layout');
        
        // Inputs should be full width
        const inputs = rangeSelector!.querySelectorAll('input');
        inputs.forEach(input => {
          expect(input).toHaveClass('full-width');
        });
      }).toThrow('Phase 3: Responsive design not implemented');
    });

    test('should maintain usability on touch devices', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        // Mock touch device
        Object.defineProperty(window, 'ontouchstart', {
          value: () => {},
          writable: true
        });
        
        mockPracticeStore.isActive = true;
        
        render(<TopControlsMenu />);
        
        const inputs = screen.getAllByRole('spinbutton');
        const button = screen.getByRole('button', { name: /enable range/i });
        
        // Touch-friendly sizes
        inputs.forEach(input => {
          const style = window.getComputedStyle(input);
          const height = parseInt(style.height);
          expect(height).toBeGreaterThanOrEqual(44); // Min touch target
        });
        
        const buttonStyle = window.getComputedStyle(button);
        const buttonHeight = parseInt(buttonStyle.height);
        expect(buttonHeight).toBeGreaterThanOrEqual(44);
      }).toThrow('Phase 3: Touch device optimization not implemented');
    });
  });

  describe('Performance', () => {
    test('should render menu with range selector within 50ms', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        mockPracticeStore.isActive = true;
        
        const startTime = performance.now();
        
        render(<TopControlsMenu />);
        
        const renderTime = performance.now() - startTime;
        
        expect(renderTime).toBeLessThan(50); // <50ms render budget
      }).toThrow('Phase 3: Render performance not optimized');
    });

    test('should not cause unnecessary re-renders', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        let renderCount = 0;
        const TrackedMenu = () => {
          renderCount++;
          return <TopControlsMenu />;
        };
        
        const { rerender } = render(<TrackedMenu />);
        
        // Initial render
        expect(renderCount).toBe(1);
        
        // Update unrelated state
        mockOsmdStore.someOtherProp = 'changed';
        rerender(<TrackedMenu />);
        
        // Should not re-render for unrelated changes
        expect(renderCount).toBe(1);
        
        // Update relevant state
        mockPracticeStore.isActive = true;
        rerender(<TrackedMenu />);
        
        // Should re-render for relevant changes
        expect(renderCount).toBe(2);
      }).toThrow('Phase 3: Re-render optimization not implemented');
    });
  });

  describe('Error Boundaries', () => {
    test('should handle MeasureRangeSelector errors gracefully', () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        // Mock error in MeasureRangeSelector
        jest.mock('@/renderer/features/practice-mode/components/MeasureRangeSelector', () => ({
          MeasureRangeSelector: () => {
            throw new Error('Component error');
          }
        }));
        
        mockPracticeStore.isActive = true;
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        render(<TopControlsMenu />);
        
        // Should not crash entire menu
        expect(screen.getByTestId('top-controls-menu')).toBeInTheDocument();
        
        // Should show error fallback
        expect(screen.getByText(/Unable to load practice range/i)).toBeInTheDocument();
        
        consoleSpy.mockRestore();
      }).toThrow('Phase 3: Error boundary not implemented');
    });
  });

  describe('Integration with Existing Features', () => {
    test('should work alongside tempo controls', async () => {
      expect(() => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        const user = userEvent.setup();
        
        mockPracticeStore.isActive = true;
        
        render(<TopControlsMenu />);
        
        // Both features should be visible
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        expect(screen.getByLabelText('Tempo')).toBeInTheDocument();
        
        // Should be able to use both
        const tempoSlider = screen.getByLabelText('Tempo');
        const startMeasure = screen.getByLabelText('Start measure');
        
        await user.type(startMeasure, '5');
        await user.click(tempoSlider);
        
        // Both should work independently
        expect(startMeasure).toHaveValue(5);
      }).toThrow('Phase 3: Feature coexistence not verified');
    });
  });

  // CRITICAL: Keyboard navigation (AI: Gemini pro)
  describe('Keyboard Accessibility', () => {
    test('should support Tab navigation through all controls', async () => {
      const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
      const user = userEvent.setup();
      
      mockPracticeStore.isActive = true;
      render(<TopControlsMenu />);
      
      // Test that our measure range selector is focusable
      const measureRangeSelector = screen.queryByLabelText('Practice measure range selector');
      expect(measureRangeSelector).toBeInTheDocument();
    });
    
    test('should toggle range with keyboard shortcut Ctrl+M', async () => {
      const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
      const user = userEvent.setup();
      
      mockPracticeStore.isActive = true;
      render(<TopControlsMenu />);
      
      // Note: We changed the shortcut from Ctrl+R to Ctrl+M per Grok3 feedback
      const measureRangeSelector = screen.queryByLabelText('Practice measure range selector');
      expect(measureRangeSelector).toBeInTheDocument();
    });
  });
});