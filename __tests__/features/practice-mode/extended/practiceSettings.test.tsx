/**
 * Phase 4 Task 4.3: Practice Settings UI Tests
 * 
 * Tests the practice mode settings interface and user preferences.
 * Verifies UI interactions, state updates, and data export.
 */

import React from 'react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { DifficultySettings } from '@/renderer/features/practice-mode/types';

// Mock stores and services
const mockSettings: DifficultySettings = {
  waitForCorrectNote: true,
  showHintsAfterAttempts: 3,
  autoAdvanceRests: true,
  highlightExpectedNotes: true,
  playbackSpeed: 1.0,
  sectionLooping: false,
  adaptiveDifficulty: false
};

const mockUpdateSettings = jest.fn();
const mockExportAnalytics = jest.fn();

// Set up window mock
(window as any).mockExportAnalytics = mockExportAnalytics;

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings
  })
}));

jest.mock('@/renderer/features/practice-mode/services/AnalyticsService', () => ({
  AnalyticsService: jest.fn().mockImplementation(() => ({
    exportToJSON: jest.fn().mockReturnValue('{"test": "data"}'),
    exportToCSV: jest.fn().mockReturnValue('test,data')
  }))
}));

// Import component after mocks
import { PracticeSettings } from '@/renderer/features/practice-mode/components/PracticeSettings';

describe('Practice Settings UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Basic Settings Display', () => {
    test('should render all basic settings', () => {
      render(<PracticeSettings />);
      
      expect(screen.getByText('Practice Settings')).toBeInTheDocument();
      expect(screen.getByText('Learning Assistance')).toBeInTheDocument();
      expect(screen.getByText('Playback')).toBeInTheDocument();
      
      // Learning settings
      expect(screen.getByText('Wait for Correct Note')).toBeInTheDocument();
      expect(screen.getByText('Highlight Expected Notes')).toBeInTheDocument();
      expect(screen.getByText('Show Hints After')).toBeInTheDocument();
      
      // Playback settings
      expect(screen.getByText('Auto-advance on Rests')).toBeInTheDocument();
      expect(screen.getByText('Practice Speed')).toBeInTheDocument();
    });
    
    test('should display current settings values', () => {
      render(<PracticeSettings />);
      
      const waitForCorrectCheckbox = screen.getByLabelText(/Wait for Correct Note/);
      expect(waitForCorrectCheckbox).toBeChecked();
      
      const highlightCheckbox = screen.getByLabelText(/Highlight Expected Notes/);
      expect(highlightCheckbox).toBeChecked();
      
      const hintsSelect = screen.getByLabelText(/Show Hints After/);
      expect(hintsSelect).toHaveValue('3');
      
      const speedSlider = screen.getByLabelText(/Practice Speed/);
      expect(speedSlider).toHaveValue('1');
    });
    
    test('should show descriptive text for settings', () => {
      render(<PracticeSettings />);
      
      expect(screen.getByText('Pause until you play the right note')).toBeInTheDocument();
      expect(screen.getByText('Show which keys to press')).toBeInTheDocument();
      expect(screen.getByText('Automatically continue past rest notes')).toBeInTheDocument();
    });
  });
  
  describe('Settings Interaction', () => {
    test('should update boolean settings on toggle', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      const checkbox = screen.getByLabelText(/Wait for Correct Note/);
      await user.click(checkbox);
      
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        waitForCorrectNote: false
      });
    });
    
    test('should update hint attempts setting', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      const select = screen.getByLabelText(/Show Hints After/);
      await user.selectOptions(select, '5');
      
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        showHintsAfterAttempts: 5
      });
    });
    
    test('should update playback speed with slider', async () => {
      render(<PracticeSettings />);
      
      const slider = screen.getByLabelText(/Practice Speed/);
      fireEvent.change(slider, { target: { value: '0.75' } });
      
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        playbackSpeed: 0.75
      });
    });
    
    test('should display current speed value', async () => {
      render(<PracticeSettings />);
      
      expect(screen.getByText('1x')).toBeInTheDocument();
      
      const slider = screen.getByLabelText(/Practice Speed/);
      fireEvent.change(slider, { target: { value: '0.75' } });
      
      // Re-render with updated value
      mockSettings.playbackSpeed = 0.75;
      render(<PracticeSettings />);
      
      expect(screen.getByText('0.75x')).toBeInTheDocument();
    });
  });
  
  describe('Advanced Settings', () => {
    test('should hide advanced settings by default', () => {
      render(<PracticeSettings />);
      
      expect(screen.queryByText('Section Looping')).not.toBeInTheDocument();
      expect(screen.queryByText('Adaptive Difficulty')).not.toBeInTheDocument();
    });
    
    test('should show advanced settings on toggle', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      const toggleButton = screen.getByText('Show Advanced Settings');
      await user.click(toggleButton);
      
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Section Looping')).toBeInTheDocument();
      expect(screen.getByText('Adaptive Difficulty')).toBeInTheDocument();
      expect(screen.getByText('Export Practice Data')).toBeInTheDocument();
    });
    
    test('should toggle advanced settings visibility', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      const toggleButton = screen.getByText('Show Advanced Settings');
      await user.click(toggleButton);
      
      expect(screen.getByText('Hide Advanced Settings')).toBeInTheDocument();
      
      await user.click(screen.getByText('Hide Advanced Settings'));
      
      expect(screen.queryByText('Section Looping')).not.toBeInTheDocument();
    });
    
    test('should update advanced settings', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByText('Show Advanced Settings'));
      
      const adaptiveCheckbox = screen.getByLabelText(/Adaptive Difficulty/);
      await user.click(adaptiveCheckbox);
      
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        adaptiveDifficulty: true
      });
    });
  });
  
  describe('Data Export', () => {
    test('should export analytics data on button click', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByText('Show Advanced Settings'));
      
      const exportButton = screen.getByText('Export Practice Data');
      await user.click(exportButton);
      
      // Click on Export as JSON
      await user.click(screen.getByText('Export as JSON'));
      
      await waitFor(() => {
        expect(mockExportAnalytics).toHaveBeenCalled();
      });
    });
    
    test('should show export format options', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByText('Show Advanced Settings'));
      await user.click(screen.getByText('Export Practice Data'));
      
      await waitFor(() => {
        expect(screen.getByText('Export as JSON')).toBeInTheDocument();
        expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      });
    });
    
    test('should handle export errors gracefully', async () => {
      mockExportAnalytics.mockRejectedValueOnce(new Error('Export failed'));
      
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByText('Show Advanced Settings'));
      await user.click(screen.getByText('Export Practice Data'));
      
      // Click on Export as JSON to trigger the error
      await user.click(screen.getByText('Export as JSON'));
      
      await waitFor(() => {
        expect(screen.getByText(/Export failed/)).toBeInTheDocument();
      });
    });
  });
  
  describe('Settings Persistence', () => {
    test('should save settings to localStorage', async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByLabelText(/Wait for Correct Note/));
      
      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(
          'abc-piano-practice-settings',
          expect.any(String)
        );
      });
      
      setItemSpy.mockRestore();
    });
    
    test('should load settings from localStorage on mount', () => {
      const mockStoredSettings = {
        waitForCorrectNote: false,
        playbackSpeed: 0.5
      };
      
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify(mockStoredSettings)
      );
      
      render(<PracticeSettings />);
      
      // Should merge stored settings with defaults
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining(mockStoredSettings)
      );
    });
  });
  
  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<PracticeSettings />);
      
      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle).toHaveAttribute('aria-label');
      });
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label');
      expect(slider).toHaveAttribute('aria-valuemin');
      expect(slider).toHaveAttribute('aria-valuemax');
      expect(slider).toHaveAttribute('aria-valuenow');
    });
    
    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      // Tab through controls
      await user.tab();
      expect(screen.getByLabelText(/Wait for Correct Note/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Highlight Expected Notes/)).toHaveFocus();
      
      // Space to toggle
      await user.keyboard(' ');
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
    
    test('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<PracticeSettings />);
      
      await user.click(screen.getByLabelText(/Wait for Correct Note/));
      
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/Setting updated/);
    });
  });
  
  describe('Responsive Design', () => {
    test('should stack sections on small screens', () => {
      // Mock small viewport
      global.innerWidth = 480;
      global.dispatchEvent(new Event('resize'));
      
      render(<PracticeSettings />);
      
      const container = screen.getByText('Practice Settings').parentElement;
      expect(container).toHaveClass('practice-settings--mobile');
    });
    
    test('should show condensed controls on mobile', () => {
      global.innerWidth = 480;
      global.dispatchEvent(new Event('resize'));
      
      render(<PracticeSettings />);
      
      // Should use more compact layout
      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle.parentElement).toHaveClass('setting-toggle--compact');
      });
    });
  });
});