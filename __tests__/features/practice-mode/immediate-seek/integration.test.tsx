/**
 * Integration Tests for Immediate Cursor Seek
 * 
 * These tests verify the complete feature works correctly
 * with all components integrated together.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeMode } from '@/renderer/features/practice-mode/components/PracticeMode';
import { OSMDProvider } from '@/renderer/contexts/OSMDContext';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import type { OSMDContext } from '@/renderer/contexts/OSMDContext';

// Mock OSMD context
const mockOSMDContext: OSMDContext = {
  osmd: {
    cursor: {
      hidden: false,
      show: jest.fn(),
      update: jest.fn(),
      next: jest.fn(),
      previous: jest.fn(),
      iterator: {
        currentMeasureIndex: 0,
        EndReached: false
      }
    },
    sheet: {
      MusicPages: [{ MusicSystems: [] }]
    },
    IsReadyToRender: () => true
  },
  osmdReady: true,
  osmdControls: {},
  measureTimeline: {
    seekToMeasure: jest.fn().mockResolvedValue(true),
    getTotalMeasures: jest.fn().mockReturnValue(50),
    getMeasureInfo: jest.fn().mockReturnValue({ index: 0, startTime: 0 })
  },
  loadScore: jest.fn(),
  clearScore: jest.fn()
};

describe('Immediate Cursor Seek - Full Integration', () => {
  beforeEach(() => {
    // Reset store
    usePracticeStore.setState({
      customRangeActive: false,
      customStartMeasure: 1,
      customEndMeasure: 10,
      isActive: false,
      currentStep: null
    });

    jest.clearAllMocks();
  });

  describe('User Interface Integration', () => {
    test('should seek when user activates custom range via UI', async () => {
      const user = userEvent.setup();

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      // Find and interact with range controls
      const startInput = screen.getByLabelText(/start measure/i);
      const endInput = screen.getByLabelText(/end measure/i);
      const activateButton = screen.getByRole('button', { name: /custom range/i });

      // Set range
      await user.clear(startInput);
      await user.type(startInput, '15');
      await user.clear(endInput);
      await user.type(endInput, '20');

      // Activate range
      await user.click(activateButton);

      // Verify seek was triggered
      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline.seekToMeasure)
          .toHaveBeenCalledWith(14, expect.any(Object)); // 0-based
      });
    });

    test('should show visual feedback during seek', async () => {
      const user = userEvent.setup();

      // Slow seek for testing
      mockOSMDContext.measureTimeline.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 100)
        ));

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      // Should show loading state during seek
      expect(screen.getByText(/seeking/i)).toBeInTheDocument();

      // Wait for seek to complete
      await waitFor(() => {
        expect(screen.queryByText(/seeking/i)).not.toBeInTheDocument();
      });
    });

    test('should update piano highlighting after seek', async () => {
      const user = userEvent.setup();

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      // Set and activate range
      const startInput = screen.getByLabelText(/start measure/i);
      await user.clear(startInput);
      await user.type(startInput, '10');

      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      await waitFor(() => {
        // Verify piano keys are highlighted for the new position
        const highlightedKeys = screen.getAllByTestId('highlighted-key');
        expect(highlightedKeys.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Practice Mode State Integration', () => {
    test('should stop active practice before seeking', async () => {
      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      // Start practice
      const startButton = screen.getByRole('button', { name: /start practice/i });
      await user.click(startButton);

      expect(usePracticeStore.getState().isActive).toBe(true);

      // Activate custom range
      const rangeButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(rangeButton);

      // Practice should stop first
      await waitFor(() => {
        expect(usePracticeStore.getState().isActive).toBe(false);
      });

      // Then seek should happen
      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline.seekToMeasure).toHaveBeenCalled();
      });
    });

    test('should maintain range settings across practice sessions', async () => {
      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      // Set custom range
      const startInput = screen.getByLabelText(/start measure/i);
      await user.clear(startInput);
      await user.type(startInput, '20');

      // Activate range
      const rangeButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(rangeButton);

      // Start practice
      const startButton = screen.getByRole('button', { name: /start practice/i });
      await user.click(startButton);

      // Stop practice
      const stopButton = screen.getByRole('button', { name: /stop/i });
      await user.click(stopButton);

      // Range should still be active
      expect(usePracticeStore.getState().customRangeActive).toBe(true);
      expect(usePracticeStore.getState().customStartMeasure).toBe(20);
    });
  });

  describe('Error Handling Integration', () => {
    test('should show error message on seek failure', async () => {
      // Mock seek failure
      mockOSMDContext.measureTimeline.seekToMeasure = jest.fn()
        .mockResolvedValue(false);

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      // Try to seek to invalid measure
      const startInput = screen.getByLabelText(/start measure/i);
      await user.clear(startInput);
      await user.type(startInput, '999');

      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/could not seek to measure/i)).toBeInTheDocument();
      });
    });

    test('should disable range inputs during seek', async () => {
      // Slow seek
      mockOSMDContext.measureTimeline.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 200)
        ));

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      const startInput = screen.getByLabelText(/start measure/i);
      const activateButton = screen.getByRole('button', { name: /custom range/i });

      await user.click(activateButton);

      // Inputs should be disabled during seek
      expect(startInput).toBeDisabled();

      // Wait for seek to complete
      await waitFor(() => {
        expect(startInput).not.toBeDisabled();
      });
    });
  });

  describe('Performance Integration', () => {
    test('should debounce rapid range changes via UI', async () => {
      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      const startInput = screen.getByLabelText(/start measure/i);
      
      // Activate range first
      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      // Rapid changes
      for (let i = 5; i <= 15; i++) {
        await user.clear(startInput);
        await user.type(startInput, i.toString());
      }

      // Wait for debounce
      await waitFor(() => {
        // Should only seek once to the last value
        expect(mockOSMDContext.measureTimeline.seekToMeasure)
          .toHaveBeenCalledTimes(1);
        expect(mockOSMDContext.measureTimeline.seekToMeasure)
          .toHaveBeenCalledWith(14, expect.any(Object)); // 15 - 1
      }, { timeout: 500 });
    });

    test('should not block UI during seek operation', async () => {
      // Slow seek
      mockOSMDContext.measureTimeline.seekToMeasure = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(true), 300)
        ));

      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      // Start seek
      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      // UI should remain responsive
      const otherButton = screen.getByRole('button', { name: /settings/i });
      await user.click(otherButton);

      // Settings should open despite ongoing seek
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    test('should announce seek completion to screen readers', async () => {
      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      const activateButton = screen.getByRole('button', { name: /custom range/i });
      await user.click(activateButton);

      // Check for ARIA live region update
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent(/navigated to measure/i);
      });
    });

    test('should support keyboard navigation for range controls', async () => {
      render(
        <OSMDProvider value={mockOSMDContext}>
          <PracticeMode />
        </OSMDProvider>
      );

      const user = userEvent.setup();

      // Tab to start input
      await user.tab();
      const startInput = screen.getByLabelText(/start measure/i);
      expect(startInput).toHaveFocus();

      // Change value with keyboard
      await user.clear(startInput);
      await user.type(startInput, '12');

      // Tab to activate button
      await user.tab();
      await user.tab();
      const activateButton = screen.getByRole('button', { name: /custom range/i });
      expect(activateButton).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOSMDContext.measureTimeline.seekToMeasure)
          .toHaveBeenCalledWith(11, expect.any(Object));
      });
    });
  });
});