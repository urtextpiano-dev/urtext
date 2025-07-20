// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { TopControlsMenu } from '@/renderer/components/TopControlsMenu';
import { ZoomControls } from '@/renderer/components/ZoomControls/ZoomControls';
import { useOSMDStore } from '@/renderer/stores/osmdStore';

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
const mockAnnounceToScreenReader = jest.fn();
jest.mock('@/renderer/utils/accessibility', () => ({
  announceToScreenReader: mockAnnounceToScreenReader
}));

describe('Phase 2: UI Controls & Keyboard Shortcuts - Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnnounceToScreenReader.mockClear();
    
    // Setup default mock implementation
    (useOSMDStore as jest.Mock).mockReturnValue({
      zoomLevel: 1.0,
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      resetZoom: jest.fn(),
      setZoomLevel: jest.fn()
    });
  });

  describe('Core Requirements - ZoomControls Component', () => {
    test('should render zoom controls with all required elements', () => {
      expect(() => {
        render(<ZoomControls />);
        
        // Should have zoom out button
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
        
        // Should have zoom level display
        expect(screen.getByRole('button', { name: /reset zoom to 100%/i })).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
        
        // Should have zoom in button
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      }).toThrow('Phase 2: ZoomControls component not implemented yet');
    });

    test('should display current zoom level as percentage', () => {
      expect(() => {
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 1.5,
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<ZoomControls />);
        
        expect(screen.getByText('150%')).toBeInTheDocument();
      }).toThrow('Phase 2: Zoom percentage display not implemented yet');
    });

    test('should call zoom actions when buttons clicked', async () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        const mockZoomOut = jest.fn();
        const mockResetZoom = jest.fn();
        
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: mockZoomOut,
          resetZoom: mockResetZoom
        });
        
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
      }).toThrow('Phase 2: Zoom button click handlers not implemented yet');
    });

    test('should disable buttons at zoom limits', () => {
      expect(() => {
        // At minimum zoom
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 0.5,
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        const { rerender } = render(<ZoomControls />);
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /zoom in/i })).not.toBeDisabled();
        
        // At maximum zoom
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 2.0,
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        rerender(<ZoomControls />);
        expect(screen.getByRole('button', { name: /zoom out/i })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
      }).toThrow('Phase 2: Zoom limit button disabling not implemented yet');
    });

    test('should show keyboard shortcut hints in tooltips', () => {
      expect(() => {
        render(<ZoomControls />);
        
        const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
        const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
        const resetButton = screen.getByRole('button', { name: /reset zoom/i });
        
        expect(zoomInButton).toHaveAttribute('title', expect.stringContaining('Ctrl++'));
        expect(zoomOutButton).toHaveAttribute('title', expect.stringContaining('Ctrl+-'));
        expect(resetButton).toHaveAttribute('title', expect.stringContaining('Ctrl+0'));
      }).toThrow('Phase 2: Keyboard shortcut tooltips not implemented yet');
    });
  });

  describe('TopControlsMenu Integration', () => {
    test('should show ZoomControls in TopControlsMenu when score is loaded', () => {
      expect(() => {
        render(<TopControlsMenu osmdReady={true} />);
        
        // Should have View section
        expect(screen.getByText('View')).toBeInTheDocument();
        
        // Should contain zoom controls
        expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
      }).toThrow('Phase 2: ZoomControls not integrated into TopControlsMenu yet');
    });

    test('should not show ZoomControls when no score is loaded', () => {
      expect(() => {
        jest.mocked(useSheetMusicStore).mockReturnValue({
          musicXML: null
        } as any);
        
        render(<TopControlsMenu osmdReady={false} />);
        
        // Should not have View section
        expect(screen.queryByText('View')).not.toBeInTheDocument();
        
        // Should not contain zoom controls
        expect(screen.queryByRole('group', { name: /zoom controls/i })).not.toBeInTheDocument();
      }).toThrow('Phase 2: Conditional ZoomControls rendering not implemented yet');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should zoom in with Ctrl/Cmd + Plus', async () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<TopControlsMenu />);
        
        // Simulate Ctrl+Plus
        fireEvent.keyDown(window, { key: '+', ctrlKey: true });
        
        expect(mockZoomIn).toHaveBeenCalledTimes(1);
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(expect.stringContaining('Zoom'));
      }).toThrow('Phase 2: Keyboard shortcut for zoom in not implemented yet');
    });

    test('should zoom out with Ctrl/Cmd + Minus', async () => {
      expect(() => {
        const mockZoomOut = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: jest.fn(),
          zoomOut: mockZoomOut,
          resetZoom: jest.fn()
        });
        
        render(<TopControlsMenu />);
        
        // Simulate Ctrl+Minus
        fireEvent.keyDown(window, { key: '-', ctrlKey: true });
        
        expect(mockZoomOut).toHaveBeenCalledTimes(1);
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(expect.stringContaining('Zoom'));
      }).toThrow('Phase 2: Keyboard shortcut for zoom out not implemented yet');
    });

    test('should reset zoom with Ctrl/Cmd + 0', async () => {
      expect(() => {
        const mockResetZoom = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.5,
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          resetZoom: mockResetZoom
        });
        
        render(<TopControlsMenu />);
        
        // Simulate Ctrl+0
        fireEvent.keyDown(window, { key: '0', ctrlKey: true });
        
        expect(mockResetZoom).toHaveBeenCalledTimes(1);
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Zoom reset to 100%');
      }).toThrow('Phase 2: Keyboard shortcut for zoom reset not implemented yet');
    });

    test('should work with Cmd key on Mac', async () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<TopControlsMenu />);
        
        // Simulate Cmd+Plus (Mac)
        fireEvent.keyDown(window, { key: '+', metaKey: true });
        
        expect(mockZoomIn).toHaveBeenCalledTimes(1);
      }).toThrow('Phase 2: Mac Cmd key support not implemented yet');
    });

    test('should prevent default browser zoom', async () => {
      expect(() => {
        render(<TopControlsMenu />);
        
        const preventDefaultSpy = jest.fn();
        const event = new KeyboardEvent('keydown', { 
          key: '+', 
          ctrlKey: true 
        });
        Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
        
        window.dispatchEvent(event);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
      }).toThrow('Phase 2: Browser zoom prevention not implemented yet');
    });

    test('should handle equals key as plus (without shift)', async () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<TopControlsMenu />);
        
        // Simulate Ctrl+= (same key as +, but without shift)
        fireEvent.keyDown(window, { key: '=', ctrlKey: true });
        
        expect(mockZoomIn).toHaveBeenCalledTimes(1);
      }).toThrow('Phase 2: Equals key handling not implemented yet');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      expect(() => {
        render(<ZoomControls />);
        
        const zoomControls = screen.getByRole('group', { name: /zoom controls/i });
        expect(zoomControls).toBeInTheDocument();
        
        expect(screen.getByRole('button', { name: /zoom in/i })).toHaveAttribute('aria-label');
        expect(screen.getByRole('button', { name: /zoom out/i })).toHaveAttribute('aria-label');
        expect(screen.getByRole('button', { name: /reset zoom/i })).toHaveAttribute('aria-label');
      }).toThrow('Phase 2: ARIA labels not implemented yet');
    });

    test('should be keyboard navigable', async () => {
      expect(() => {
        const user = userEvent.setup();
        render(<ZoomControls />);
        
        // Tab through controls
        await user.tab();
        expect(screen.getByRole('button', { name: /zoom out/i })).toHaveFocus();
        
        await user.tab();
        expect(screen.getByRole('button', { name: /reset zoom/i })).toHaveFocus();
        
        await user.tab();
        expect(screen.getByRole('button', { name: /zoom in/i })).toHaveFocus();
      }).toThrow('Phase 2: Keyboard navigation not implemented yet');
    });

    test('should announce zoom changes to screen readers', async () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        const user = userEvent.setup();
        render(<ZoomControls />);
        
        // After state update, should announce
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 1.1,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        await user.click(screen.getByRole('button', { name: /zoom in/i }));
        
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Zoom 110%');
      }).toThrow('Phase 2: Screen reader announcements not implemented yet');
    });
  });

  describe('Error Handling', () => {
    test('should handle store errors gracefully', () => {
      expect(() => {
        (useOSMDStore as jest.Mock).mockImplementation(() => {
          throw new Error('Store error');
        });
        
        // Should not crash
        expect(() => render(<ZoomControls />)).not.toThrow();
      }).toThrow('Phase 2: Error boundary not implemented yet');
    });
  });

  describe('Production Edge Cases', () => {
    test('should prevent browser zoom when using app shortcuts', () => {
      expect(() => {
        render(<TopControlsMenu />);
        
        const preventDefaultSpy = jest.fn();
        const stopPropagationSpy = jest.fn();
        
        // Create event with preventDefault
        const event = new KeyboardEvent('keydown', { 
          key: '+', 
          ctrlKey: true,
          cancelable: true
        });
        Object.defineProperty(event, 'preventDefault', { 
          value: preventDefaultSpy,
          writable: true 
        });
        Object.defineProperty(event, 'stopPropagation', { 
          value: stopPropagationSpy,
          writable: true 
        });
        
        window.dispatchEvent(event);
        
        // Should prevent browser zoom
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(stopPropagationSpy).toHaveBeenCalled();
      }).toThrow('Phase 2: Browser zoom prevention not implemented yet');
    });

    test('should handle rapid/held keyboard shortcuts gracefully', async () => {
      expect(() => {
        jest.useFakeTimers();
        const mockZoomIn = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<TopControlsMenu />);
        
        // Simulate holding down Ctrl++ (rapid fire)
        for (let i = 0; i < 20; i++) {
          fireEvent.keyDown(window, { key: '+', ctrlKey: true });
        }
        
        // Should be throttled/debounced
        jest.advanceTimersByTime(100);
        
        // Should not call zoomIn 20 times
        expect(mockZoomIn.mock.calls.length).toBeLessThan(20);
        expect(mockZoomIn.mock.calls.length).toBeGreaterThan(0);
        
        jest.useRealTimers();
      }).toThrow('Phase 2: Rapid keyboard input handling not implemented yet');
    });

    test('should work when browser zoom is applied', () => {
      expect(() => {
        // Simulate browser zoom
        document.documentElement.style.zoom = '1.5';
        
        render(<ZoomControls />);
        
        // Should render correctly despite browser zoom
        expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
        
        // Buttons should still work
        const user = userEvent.setup();
        const mockZoomIn = jest.fn();
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        await user.click(screen.getByRole('button', { name: /zoom in/i }));
        expect(mockZoomIn).toHaveBeenCalled();
        
        // Reset browser zoom
        document.documentElement.style.zoom = '';
      }).toThrow('Phase 2: Browser zoom compatibility not implemented yet');
    });

    test('should handle keyboard shortcuts when modal is open', () => {
      expect(() => {
        const mockZoomIn = jest.fn();
        (useOSMDStore.getState as jest.Mock).mockReturnValue({
          zoomLevel: 1.0,
          zoomIn: mockZoomIn,
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(
          <>
            <TopControlsMenu />
            {/* Simulate a modal that might capture events */}
            <div role="dialog" aria-modal="true">
              <input type="text" autoFocus />
            </div>
          </>
        );
        
        // Focus is in modal
        expect(document.activeElement).toHaveAttribute('type', 'text');
        
        // Zoom shortcut should still work (or be explicitly disabled)
        fireEvent.keyDown(window, { key: '+', ctrlKey: true });
        
        // Define expected behavior: either works or is blocked
        // For this test, assume shortcuts should be disabled when modal is open
        expect(mockZoomIn).not.toHaveBeenCalled();
      }).toThrow('Phase 2: Modal interaction handling not implemented yet');
    });

    test('should handle tooltips at extreme zoom levels', async () => {
      expect(() => {
        // At minimum zoom
        (useOSMDStore as jest.Mock).mockReturnValue({
          zoomLevel: 0.5,
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          resetZoom: jest.fn()
        });
        
        render(<ZoomControls />);
        
        const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
        
        // Hover to show tooltip
        const user = userEvent.setup();
        await user.hover(zoomOutButton);
        
        // Tooltip should be visible and positioned correctly
        await waitFor(() => {
          const tooltip = screen.queryByRole('tooltip') || 
                          screen.queryByText(/Ctrl\+-/);
          expect(tooltip).toBeInTheDocument();
          
          // Should not overflow or be cut off
          const rect = tooltip?.getBoundingClientRect();
          expect(rect?.left).toBeGreaterThanOrEqual(0);
          expect(rect?.right).toBeLessThanOrEqual(window.innerWidth);
        });
      }).toThrow('Phase 2: Tooltip positioning at extremes not implemented yet');
    });

    test('should handle conflicting platform shortcuts', () => {
      expect(() => {
        render(<TopControlsMenu />);
        
        // Test platform detection
        const isMac = navigator.platform.toLowerCase().includes('mac');
        
        if (isMac) {
          // On Mac, test Cmd key
          fireEvent.keyDown(window, { key: '+', metaKey: true });
        } else {
          // On Windows/Linux, test Ctrl key
          fireEvent.keyDown(window, { key: '+', ctrlKey: true });
        }
        
        // Should work on both platforms
        const mockZoomIn = jest.mocked(useOSMDStore.getState().zoomIn);
        expect(mockZoomIn).toHaveBeenCalled();
        
        // Test conflicting shortcuts (e.g., Ctrl+D might bookmark)
        const conflictEvent = new KeyboardEvent('keydown', {
          key: 'd',
          ctrlKey: true,
          cancelable: true
        });
        
        // App should not interfere with browser shortcuts it doesn't use
        window.dispatchEvent(conflictEvent);
        expect(conflictEvent.defaultPrevented).toBe(false);
      }).toThrow('Phase 2: Platform shortcut handling not implemented yet');
    });
  });
});