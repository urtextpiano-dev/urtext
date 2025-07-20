/**
 * Phase 2 Implementation Verification Tests
 * 
 * Quick verification that our implementation works correctly.
 * This replaces the complex phase-2-ui-controls.test.tsx that has structural issues.
 */

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopControlsMenu } from '@/renderer/components/TopControlsMenu';
import { ZoomControls } from '@/renderer/components/ZoomControls/ZoomControls';
import { useOSMDStore } from '@/renderer/stores/osmdStore';
import { announceToScreenReader } from '@/renderer/utils/accessibility';

// Mock dependencies
jest.mock('@/renderer/stores/osmdStore');
jest.mock('@/renderer/contexts/MidiContext', () => ({
  useMidiContext: () => ({
    devices: [],
    isConnected: false,
    status: 'idle'
  })
}));
jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => ({
    osmd: {},
    measureTimeline: null
  })
}));
jest.mock('@/renderer/stores/sheetMusicStore', () => ({
  useSheetMusicStore: () => ({
    musicXML: '<score>test</score>'
  })
}));
jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => ({
    hasRepeats: false
  })
}));
jest.mock('@/renderer/features/fingering/hooks/useFingeringStore', () => ({
  useFingeringStore: () => ({
    isEditingMode: false,
    setEditingMode: jest.fn()
  })
}));
jest.mock('@/renderer/features/fingering/hooks/usePracticeModeIntegration', () => ({
  usePracticeModeIntegration: () => ({
    shouldShowFingeringEdit: () => true
  })
}));

// Mock announceToScreenReader
jest.mock('@/renderer/utils/accessibility', () => ({
  announceToScreenReader: jest.fn()
}));

describe('Phase 2 Implementation Verification', () => {
  const mockZoomIn = jest.fn();
  const mockZoomOut = jest.fn();
  const mockResetZoom = jest.fn();
  const mockGetState = jest.fn();
  const mockAnnounceToScreenReader = jest.mocked(announceToScreenReader);

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnnounceToScreenReader.mockClear();
    
    // Setup default mock implementation
    (useOSMDStore as jest.Mock).mockReturnValue({
      zoomLevel: 1.0,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      resetZoom: mockResetZoom
    });
    
    // Mock getState for keyboard shortcuts
    mockGetState.mockReturnValue({
      zoomLevel: 1.0,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      resetZoom: mockResetZoom
    });
    
    (useOSMDStore as any).getState = mockGetState;
  });

  describe('ZoomControls Component', () => {
    test('should render with all required elements', () => {
      render(<ZoomControls />);
      
      // Should have zoom out button
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
      
      // Should have zoom level display
      expect(screen.getByRole('button', { name: /reset zoom to 100%/i })).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      
      // Should have zoom in button
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    });

    test('should call zoom actions when buttons clicked', async () => {
      const user = userEvent.setup();
      render(<ZoomControls />);
      
      // Click zoom in
      await user.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(mockZoomIn).toHaveBeenCalledTimes(1);
      
      // Click zoom out
      await user.click(screen.getByRole('button', { name: /zoom out/i }));
      expect(mockZoomOut).toHaveBeenCalledTimes(1);
      
      // Click reset (percentage display)
      await user.click(screen.getByRole('button', { name: /reset zoom to 100%/i }));
      expect(mockResetZoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('TopControlsMenu Integration', () => {
    test('should show ZoomControls in TopControlsMenu when score is loaded', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Should have View section
      expect(screen.getByText('View')).toBeInTheDocument();
      
      // Should contain zoom controls
      expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should zoom in with Ctrl+Plus', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Simulate Ctrl+Plus
      fireEvent.keyDown(window, { key: '+', ctrlKey: true });
      
      expect(mockZoomIn).toHaveBeenCalledTimes(1);
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(expect.stringContaining('Zoom'));
    });

    test('should zoom out with Ctrl+Minus', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Simulate Ctrl+Minus
      fireEvent.keyDown(window, { key: '-', ctrlKey: true });
      
      expect(mockZoomOut).toHaveBeenCalledTimes(1);
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(expect.stringContaining('Zoom'));
    });

    test('should reset zoom with Ctrl+0', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Simulate Ctrl+0
      fireEvent.keyDown(window, { key: '0', ctrlKey: true });
      
      expect(mockResetZoom).toHaveBeenCalledTimes(1);
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Zoom reset to 100%');
    });

    test('should work with Cmd key on Mac', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Simulate Cmd+Plus (Mac)
      fireEvent.keyDown(window, { key: '+', metaKey: true });
      
      expect(mockZoomIn).toHaveBeenCalledTimes(1);
    });

    test('should handle equals key as plus', () => {
      render(<TopControlsMenu osmdReady={true} />);
      
      // Simulate Ctrl+= (same key as +, but without shift)
      fireEvent.keyDown(window, { key: '=', ctrlKey: true });
      
      expect(mockZoomIn).toHaveBeenCalledTimes(1);
    });
  });
});