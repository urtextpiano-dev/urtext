/**
 * Simple integration test to verify Phase 2 is working
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ZoomControls } from '@/renderer/components/ZoomControls/ZoomControls';

// Mock just what we need
jest.mock('@/renderer/stores/osmdStore', () => ({
  useOSMDStore: () => ({
    zoomLevel: 1.0,
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    resetZoom: jest.fn()
  })
}));

describe('Zoom Integration - Basic Functionality', () => {
  test('ZoomControls component renders without errors', () => {
    expect(() => {
      render(<ZoomControls />);
    }).not.toThrow();
  });
  
  test('ZoomControls component exports correctly', () => {
    // This verifies the component is properly exported and can be imported
    expect(ZoomControls).toBeDefined();
    expect(typeof ZoomControls).toBe('function');
  });
});