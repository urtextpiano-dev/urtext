import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useOSMDStore } from '@/renderer/stores/osmdStore';

// Mock dependencies  
jest.mock('@/renderer/features/tempo-extraction/services/TempoService');
jest.mock('@/renderer/utils/performance-logger');
jest.mock('@/renderer/utils/simple-logger');

describe('osmdStore - Zoom State Management', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useOSMDStore.getState();
    if (store.reset) {
      store.reset();
    }
    jest.clearAllMocks();
  });

  describe('Initial Zoom State', () => {
    test('should initialize with zoomLevel of 1.0', () => {
      const state = useOSMDStore.getState();
      expect(state.zoomLevel).toBe(1.0);
    });
  });

  describe('Zoom Actions', () => {
    test('setZoomLevel should update zoom and clamp to valid range', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Test normal value
      act(() => {
        result.current.setZoomLevel(1.5);
      });
      expect(result.current.zoomLevel).toBe(1.5);
      
      // Test minimum clamping
      act(() => {
        result.current.setZoomLevel(0.2);
      });
      expect(result.current.zoomLevel).toBe(0.5);
      
      // Test maximum clamping
      act(() => {
        result.current.setZoomLevel(3.0);
      });
      expect(result.current.zoomLevel).toBe(2.0);
    });

    test('zoomIn should increase zoom by 0.1 up to maximum', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      act(() => {
        result.current.zoomIn();
      });
      expect(result.current.zoomLevel).toBe(1.1);
      
      // Set near maximum
      act(() => {
        result.current.setZoomLevel(1.95);
      });
      
      act(() => {
        result.current.zoomIn();
      });
      expect(result.current.zoomLevel).toBe(2.0); // Should cap at max
      
      // Try to zoom in again
      act(() => {
        result.current.zoomIn();
      });
      expect(result.current.zoomLevel).toBe(2.0); // Should remain at max
    });

    test('zoomOut should decrease zoom by 0.1 down to minimum', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      act(() => {
        result.current.zoomOut();
      });
      expect(result.current.zoomLevel).toBe(0.9);
      
      // Set near minimum
      act(() => {
        result.current.setZoomLevel(0.55);
      });
      
      act(() => {
        result.current.zoomOut();
      });
      expect(result.current.zoomLevel).toBe(0.5); // Should cap at min
      
      // Try to zoom out again
      act(() => {
        result.current.zoomOut();
      });
      expect(result.current.zoomLevel).toBe(0.5); // Should remain at min
    });

    test('resetZoom should set zoom back to 1.0', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Change zoom first
      act(() => {
        result.current.setZoomLevel(1.7);
      });
      expect(result.current.zoomLevel).toBe(1.7);
      
      // Reset
      act(() => {
        result.current.resetZoom();
      });
      expect(result.current.zoomLevel).toBe(1.0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid zoom changes', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Simulate rapid zoom in
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.zoomIn();
        }
      });
      expect(result.current.zoomLevel).toBeCloseTo(1.5, 1);
    });

    test('should handle floating point precision', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Multiple operations that could cause precision issues
      act(() => {
        result.current.setZoomLevel(0.7);
        result.current.zoomIn();
        result.current.zoomIn();
        result.current.zoomIn();
      });
      expect(result.current.zoomLevel).toBeCloseTo(1.0, 1);
    });

    test('should validate zoom values', () => {
      const { result } = renderHook(() => useOSMDStore());
      const originalZoom = result.current.zoomLevel;
      
      // Invalid values should be ignored or use fallback
      act(() => {
        result.current.setZoomLevel(NaN);
      });
      expect(result.current.zoomLevel).toBe(originalZoom);
      
      act(() => {
        result.current.setZoomLevel(Infinity);
      });
      expect(result.current.zoomLevel).toBe(2.0); // Clamped to max
      
      act(() => {
        result.current.setZoomLevel(-Infinity);
      });
      expect(result.current.zoomLevel).toBe(0.5); // Clamped to min
    });
  });

  describe('Store Integration', () => {
    test('zoom state should not affect other store properties', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Set some other state
      act(() => {
        result.current.setIsLoading(true);
        result.current.setError('Test error');
      });
      
      // Change zoom
      act(() => {
        result.current.setZoomLevel(1.5);
      });
      
      // Other state should remain unchanged
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
    });

    test('reset should reset zoom to default', () => {
      const { result } = renderHook(() => useOSMDStore());
      
      // Change various state
      act(() => {
        result.current.setZoomLevel(1.8);
        result.current.setIsLoading(true);
      });
      
      // Reset
      act(() => {
        result.current.reset();
      });
      
      // Everything should be reset
      expect(result.current.zoomLevel).toBe(1.0);
      expect(result.current.isLoading).toBe(false);
    });
  });
});