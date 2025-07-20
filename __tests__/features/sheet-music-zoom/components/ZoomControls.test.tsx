import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoomControls } from '@/renderer/components/ZoomControls/ZoomControls';
import { useOSMDStore } from '@/renderer/stores/osmdStore';

// Mock dependencies
jest.mock('@/renderer/stores/osmdStore');

describe('ZoomControls Component', () => {
  const mockZoomIn = jest.fn();
  const mockZoomOut = jest.fn();
  const mockResetZoom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (useOSMDStore as jest.Mock).mockReturnValue({
      zoomLevel: 1.0,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      resetZoom: mockResetZoom
    });
  });

  describe('Rendering', () => {
    test('should render all control elements', () => {
      render(<ZoomControls />);
      
      // Group container
      expect(screen.getByRole('group', { name: /zoom controls/i })).toBeInTheDocument();
      
      // Buttons
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      
      // Zoom level display
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should update percentage display based on zoom level', () => {
      const { rerender } = render(<ZoomControls />);
      
      // Update zoom level
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 1.25,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      rerender(<ZoomControls />);
      expect(screen.getByText('125%')).toBeInTheDocument();
      
      // Test rounding
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 0.666,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      rerender(<ZoomControls />);
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    test('should show SVG icons in buttons', () => {
      render(<ZoomControls />);
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      
      // Check for SVG elements
      expect(zoomOutButton.querySelector('svg')).toBeInTheDocument();
      expect(zoomInButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('should call store actions on button clicks', async () => {
      const user = userEvent.setup();
      render(<ZoomControls />);
      
      // Click zoom out
      await user.click(screen.getByRole('button', { name: /zoom out/i }));
      expect(mockZoomOut).toHaveBeenCalledTimes(1);
      
      // Click zoom in
      await user.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(mockZoomIn).toHaveBeenCalledTimes(1);
      
      // Click percentage to reset
      await user.click(screen.getByText('100%'));
      expect(mockResetZoom).toHaveBeenCalledTimes(1);
    });

    test('should disable buttons at limits', () => {
      // At minimum
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 0.5,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      const { rerender } = render(<ZoomControls />);
      
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeEnabled();
      
      // At maximum
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 2.0,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      rerender(<ZoomControls />);
      
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
    });

    test('should not call actions when buttons are disabled', async () => {
      const user = userEvent.setup();
      
      // At minimum zoom
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 0.5,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      render(<ZoomControls />);
      
      await user.click(screen.getByRole('button', { name: /zoom out/i }));
      expect(mockZoomOut).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Support', () => {
    test('should be fully keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ZoomControls />);
      
      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { name: /zoom out/i })).toHaveFocus();
      
      // Tab to percentage
      await user.tab();
      expect(screen.getByText('100%')).toHaveFocus();
      
      // Tab to last button
      await user.tab();
      expect(screen.getByRole('button', { name: /zoom in/i })).toHaveFocus();
    });

    test('should activate buttons with Enter/Space', async () => {
      const user = userEvent.setup();
      render(<ZoomControls />);
      
      // Focus and activate zoom out
      await user.tab();
      await user.keyboard('{Enter}');
      expect(mockZoomOut).toHaveBeenCalledTimes(1);
      
      // Reset percentage with Space
      await user.tab();
      await user.keyboard(' ');
      expect(mockResetZoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tooltips', () => {
    test('should show keyboard shortcuts in tooltips', () => {
      render(<ZoomControls />);
      
      expect(screen.getByRole('button', { name: /zoom out/i }))
        .toHaveAttribute('title', 'Zoom out (Ctrl+-)');
      
      expect(screen.getByRole('button', { name: /zoom in/i }))
        .toHaveAttribute('title', 'Zoom in (Ctrl++)');
      
      expect(screen.getByText('100%'))
        .toHaveAttribute('title', 'Reset zoom (Ctrl+0)');
    });
  });

  describe('Visual Feedback', () => {
    test('should animate zoom level changes', async () => {
      jest.useFakeTimers();
      const { rerender } = render(<ZoomControls />);
      
      // Change zoom level
      (useOSMDStore as jest.Mock).mockReturnValue({
        zoomLevel: 1.5,
        zoomIn: mockZoomIn,
        zoomOut: mockZoomOut,
        resetZoom: mockResetZoom
      });
      
      rerender(<ZoomControls />);
      
      const zoomDisplay = screen.getByText('150%');
      expect(zoomDisplay).toHaveClass('zoom-animating');
      
      // Animation should end after 300ms
      jest.advanceTimersByTime(300);
      waitFor(() => {
        expect(zoomDisplay).not.toHaveClass('zoom-animating');
      });
      
      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      render(<ZoomControls />);
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      
      // Rapid clicks
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      
      expect(mockZoomIn).toHaveBeenCalledTimes(3);
    });

    test('should handle store disconnection gracefully', () => {
      (useOSMDStore as jest.Mock).mockReturnValue(null);
      
      // Should not crash
      expect(() => render(<ZoomControls />)).not.toThrow();
    });
  });
});