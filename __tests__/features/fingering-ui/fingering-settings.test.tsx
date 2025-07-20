// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

// Imports for implemented components
import { TopControlsMenu } from '@/renderer/components/TopControlsMenu/TopControlsMenu';
import { FingeringSettings } from '@/renderer/features/fingering/components/FingeringSettings';

// Mock the stores and hooks
jest.mock('@/renderer/features/fingering/hooks/useFingeringStore');
jest.mock('@/renderer/features/fingering/hooks/usePracticeModeIntegration');
jest.mock('@/renderer/stores/sheetMusicStore');
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');
jest.mock('@/renderer/contexts/MidiContext');
jest.mock('@/renderer/contexts/OSMDContext');
jest.mock('@/renderer/features/fingering/hooks/useFingeringSettings');

// Mock child components that aren't the focus of this test
jest.mock('@/renderer/components/FileUpload', () => ({
  FileUploadButton: React.forwardRef(() => <button>Upload File</button>)
}));
jest.mock('@/renderer/components/MidiDeviceSelector/MidiDeviceSelector', () => ({
  MidiDeviceSelector: () => <div>MIDI Device Selector</div>
}));
jest.mock('@/renderer/features/practice-mode/components/AssistModeSelector', () => ({
  AssistModeSelector: () => <div>Assist Mode</div>
}));
jest.mock('@/renderer/features/practice-mode/components/RepeatIndicator', () => ({
  RepeatIndicator: () => <div>Repeat Indicator</div>
}));
jest.mock('@/renderer/features/practice-mode/components/MeasureRangeSelector', () => ({
  MeasureRangeSelector: () => <div>Measure Range</div>
}));
jest.mock('@/renderer/features/theme', () => ({
  ThemeSwitcher: () => <div>Theme Switcher</div>
}));

describe('Phase 2: Task 1 - FingeringSettings in TopControlsMenu', () => {
  const mockFingeringStore = {
    isEditingMode: false,
    setEditingMode: jest.fn(),
    isEnabled: true,
    setEnabled: jest.fn()
  };

  const mockPracticeModeIntegration = {
    shouldShowFingeringEdit: jest.fn(() => true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
    require('@/renderer/features/fingering/hooks/useFingeringStore').useFingeringStore = 
      jest.fn(() => mockFingeringStore);
    require('@/renderer/features/fingering/hooks/usePracticeModeIntegration').usePracticeModeIntegration = 
      jest.fn(() => mockPracticeModeIntegration);
    require('@/renderer/stores/sheetMusicStore').useSheetMusicStore = 
      jest.fn(() => ({ musicXML: '<xml>test</xml>' }));
    require('@/renderer/features/practice-mode/stores/practiceStore').usePracticeStore = 
      jest.fn(() => ({ hasRepeats: false }));
    require('@/renderer/contexts/MidiContext').useMidiContext = 
      jest.fn(() => ({ devices: [], isConnected: false, status: 'idle' }));
    require('@/renderer/contexts/OSMDContext').useOSMDContext = 
      jest.fn(() => ({ osmd: null, measureTimeline: null }));
    require('@/renderer/features/fingering/hooks/useFingeringSettings').useFingeringSettings = 
      jest.fn(() => ({
        isEnabled: true,
        showOnAllNotes: false,
        fontSize: 12,
        color: '#000080',
        clickToEdit: true,
        updateSettings: jest.fn()
      }));
  });

  describe('Core Requirements', () => {
    test('should add Fingering section to TopControlsMenu when sheet music is loaded', () => {
      render(<TopControlsMenu />);
      
      // Check Fingering section exists
      const fingeringSection = screen.queryByText('Fingering');
      expect(fingeringSection).toBeInTheDocument();
      
      const sectionHeading = screen.queryByRole('heading', { name: 'Fingering' });
      expect(sectionHeading).toHaveClass('menu-section-title');
    });

    test('should include FingeringSettings component in the section', () => {
      render(<TopControlsMenu />);
      
      // These assertions show what FingeringSettings should contain
      expect(screen.queryByLabelText('Enable fingering annotations')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Font size:/)).toBeInTheDocument(); 
      expect(screen.queryByLabelText('Fingering color')).toBeInTheDocument();
    });

    test('should show Edit Fingerings toggle with correct state', () => {
      render(<TopControlsMenu />);
      
      const toggle = screen.queryByLabelText('Toggle fingering edit mode');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('type', 'checkbox');
      expect(toggle).not.toBeChecked(); // mockFingeringStore.isEditingMode is false
    });

    test('should call setEditingMode when toggle is clicked', async () => {
      const user = userEvent.setup();
      
      render(<TopControlsMenu />);
      
      const toggle = screen.getByLabelText('Toggle fingering edit mode');
      await user.click(toggle);
      
      expect(mockFingeringStore.setEditingMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Conditional Rendering', () => {
    test('should not show Fingering section when sheet music is not loaded', () => {
      require('@/renderer/stores/sheetMusicStore').useSheetMusicStore = 
        jest.fn(() => ({ musicXML: null }));
      
      render(<TopControlsMenu />);
      
      // Section should not exist
      expect(screen.queryByText('Fingering')).not.toBeInTheDocument();
    });

    test('should show when sheet music is loaded', () => {
      require('@/renderer/stores/sheetMusicStore').useSheetMusicStore = 
        jest.fn(() => ({ musicXML: '<xml>test</xml>' }));
      
      render(<TopControlsMenu />);
      
      expect(screen.getByText('Fingering')).toBeInTheDocument();
    });
  });

  describe('Practice Mode Integration', () => {
    test('should disable edit toggle during practice mode', () => {
      mockPracticeModeIntegration.shouldShowFingeringEdit.mockReturnValue(false);
      
      render(<TopControlsMenu />);
      
      const toggle = screen.getByLabelText('Toggle fingering edit mode');
      expect(toggle).toBeDisabled();
    });

    test('should show disabled hint during practice mode', () => {
      mockPracticeModeIntegration.shouldShowFingeringEdit.mockReturnValue(false);
      
      render(<TopControlsMenu />);
      
      expect(screen.getByText('(disabled during practice)')).toBeInTheDocument();
    });

    test('should enable edit toggle when not in practice mode', () => {
      mockPracticeModeIntegration.shouldShowFingeringEdit.mockReturnValue(true);
      
      render(<TopControlsMenu />);
      
      const toggle = screen.getByLabelText('Toggle fingering edit mode');
      expect(toggle).not.toBeDisabled();
    });
  });

  describe('Help Text', () => {
    test('should include help text in FingeringSettings', () => {
      render(<TopControlsMenu />);
      
      // Check for the help text in the FingeringSettings component
      const helpText = screen.getByText(/How to use:/);
      expect(helpText).toBeInTheDocument();
      expect(screen.getByText(/Enable 'Edit Fingerings' above, then click on any note to add a fingering number/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<TopControlsMenu />);
      
      // Toggle should have aria-label
      const toggle = screen.getByLabelText('Toggle fingering edit mode');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle fingering edit mode');
    });

    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<TopControlsMenu />);
      
      // Get the toggle
      const toggle = screen.getByLabelText('Toggle fingering edit mode');
      
      // Focus on it
      toggle.focus();
      expect(toggle).toHaveFocus();
      
      // Space should toggle
      await user.keyboard(' ');
      expect(mockFingeringStore.setEditingMode).toHaveBeenCalled();
    });
  });
});

// Export mocks for use in other test files
export { mockFingeringStore, mockPracticeModeIntegration };