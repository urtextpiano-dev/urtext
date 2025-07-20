/**
 * Quick implementation check for Phase 1
 * This test verifies that our basic implementation is working
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SheetMusic } from '../../../src/renderer/components/SheetMusic';
import { useOSMD } from '../../../src/renderer/hooks/useOSMD';

// Mock the useOSMD hook for isolated component testing
jest.mock('../../../src/renderer/hooks/useOSMD');

describe('SheetMusic Component Implementation Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    (useOSMD as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      isReady: true,
      controls: {
        highlightNote: jest.fn(),
        unhighlightNote: jest.fn(),
        clearAllHighlights: jest.fn(),
        updatePlaybackPosition: jest.fn(),
        getVisibleNotes: jest.fn()
      }
    });
  });

  test('should render without crashing', () => {
    const { container } = render(<SheetMusic />);
    expect(container.querySelector('.sheet-music-wrapper')).toBeInTheDocument();
  });

  test('should show empty state when no musicXML provided', () => {
    render(<SheetMusic />);
    expect(screen.getByText('Load a music score to begin')).toBeInTheDocument();
  });

  test('should show loading state', () => {
    (useOSMD as jest.Mock).mockReturnValue({
      isLoading: true,
      error: null,
      isReady: false,
      controls: {}
    });
    
    render(<SheetMusic musicXML="<score/>" />);
    expect(screen.getByText('Loading sheet music...')).toBeInTheDocument();
  });

  test('should show error state', () => {
    (useOSMD as jest.Mock).mockReturnValue({
      isLoading: false,
      error: new Error('Test error'),
      isReady: false,
      controls: {}
    });
    
    render(<SheetMusic musicXML="<score/>" />);
    expect(screen.getByText('Failed to load sheet music')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('should render sheet music container with proper attributes', () => {
    const { container } = render(<SheetMusic musicXML="<score/>" />);
    const sheetContainer = container.querySelector('.sheet-music-container');
    
    expect(sheetContainer).toBeInTheDocument();
    expect(sheetContainer).toHaveAttribute('role', 'img');
    expect(sheetContainer).toHaveAttribute('aria-label', 'Sheet music display');
  });

  test('should apply custom className', () => {
    const { container } = render(<SheetMusic musicXML="<score/>" className="custom-class" />);
    const wrapper = container.querySelector('.sheet-music-wrapper');
    expect(wrapper).toHaveClass('custom-class');
  });
});