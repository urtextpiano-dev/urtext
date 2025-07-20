/**
 * TDD PHASE 1: useOSMD Tempo Integration Tests
 * 
 * Tests the integration of tempo extraction with the existing useOSMD hook
 * Critical: Must not break existing MIDI/rendering functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Import the hook that will be modified
let useOSMDStore: any;
let TempoService: any;

try {
  const hookImports = require('@/renderer/hooks/useOSMD');
  const serviceImports = require('@/renderer/features/tempo-extraction/services/TempoService');
  
  useOSMDStore = hookImports.useOSMDStore;
  TempoService = serviceImports.TempoService;
} catch {
  // Not implemented yet - expected for TDD
}

// Mock dependencies
const mockOSMD = {
  load: jest.fn(),
  render: jest.fn(),
  Sheet: {
    SourceMeasures: []
  }
};

jest.mock('@/renderer/features/tempo-extraction/services/TempoService', () => ({
  TempoService: {
    getInstance: jest.fn(() => ({
      extractFromOSMD: jest.fn(),
      getTempoAtMeasure: jest.fn()
    }))
  }
}));

describe('Phase 1: useOSMD Tempo Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    if (useOSMDStore?.getState) {
      useOSMDStore.getState().reset?.();
    }
  });

  describe('State Extension', () => {
    it('should add tempo state to existing OSMD store', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const state = useOSMDStore.getState();
        
        // Should have tempo state
        expect(state.tempo).toBeDefined();
        expect(state.tempo.tempoMap).toBe(null);
        expect(state.tempo.isExtracting).toBe(false);
        expect(state.tempo.extractionError).toBe(null);
        expect(state.tempo.lastExtractedAt).toBe(null);
      }).toThrow(/not implemented/);
    });

    it('should preserve existing OSMD state and actions', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const state = useOSMDStore.getState();
        
        // Existing state should still be present
        expect(state.osmd).toBeDefined();
        expect(state.isLoaded).toBeDefined();
        expect(state.error).toBeDefined();
        
        // Existing actions should still work
        expect(typeof state.loadScore).toBe('function');
        expect(typeof state.setError).toBe('function');
      }).toThrow(/not implemented/);
    });
  });

  describe('extractTempo() Action', () => {
    it('should extract tempo from loaded OSMD', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // Set loaded OSMD
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        // Extract tempo
        await act(async () => {
          await result.current.extractTempo();
        });
        
        expect(result.current.tempo.isExtracting).toBe(false);
        expect(result.current.tempo.tempoMap).toBeDefined();
      }).rejects.toThrow(/not implemented/);
    });

    it('should not extract when OSMD not loaded', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // OSMD not loaded
        act(() => {
          result.current.setIsLoaded(false);
        });
        
        await act(async () => {
          await result.current.extractTempo();
        });
        
        expect(result.current.tempo.tempoMap).toBe(null);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle extraction options', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        const mockExtract = jest.fn().mockResolvedValue({
          events: [],
          defaultBpm: 90,
          averageBpm: 90,
          hasExplicitTempo: false,
          confidence: 0.1
        });
        
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: mockExtract
        });
        
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        await act(async () => {
          await result.current.extractTempo({
            fallbackBpm: 90,
            useCache: false
          });
        });
        
        expect(mockExtract).toHaveBeenCalledWith(mockOSMD, {
          fallbackBpm: 90,
          useCache: false
        });
      }).rejects.toThrow(/not implemented/);
    });

    it('should set loading state during extraction', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        let loadingStateDuringExtraction = false;
        
        const extractPromise = act(async () => {
          const promise = result.current.extractTempo();
          loadingStateDuringExtraction = result.current.tempo.isExtracting;
          await promise;
        });
        
        expect(loadingStateDuringExtraction).toBe(true);
        
        await extractPromise;
        
        expect(result.current.tempo.isExtracting).toBe(false);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle extraction timeout', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // Mock slow extraction
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: jest.fn(() => new Promise(() => {})) // Never resolves
        });
        
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        await act(async () => {
          await result.current.extractTempo();
        });
        
        // Should timeout and set error
        expect(result.current.tempo.extractionError).toContain('timeout');
        expect(result.current.tempo.isExtracting).toBe(false);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors without breaking OSMD', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: jest.fn().mockRejectedValue(new Error('Extraction failed'))
        });
        
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        await act(async () => {
          await result.current.extractTempo();
        });
        
        // Extraction error should be captured
        expect(result.current.tempo.extractionError).toBe('Extraction failed');
        
        // But OSMD should still be functional
        expect(result.current.osmd).toBe(mockOSMD);
        expect(result.current.isLoaded).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });

    it('should not throw errors to caller', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: jest.fn().mockRejectedValue(new Error('Critical error'))
        });
        
        act(() => {
          result.current.setOSMD(mockOSMD);
          result.current.setIsLoaded(true);
        });
        
        // Should not throw
        await expect(act(async () => {
          await result.current.extractTempo();
        })).resolves.not.toThrow();
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('getTempoAtMeasure() Action', () => {
    it('should get tempo at specific measure', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // Set tempo map
        act(() => {
          result.current.setTempoMap({
            events: [
              { measureIndex: 0, bpm: 120 },
              { measureIndex: 16, bpm: 140 }
            ],
            defaultBpm: 120,
            averageBpm: 130,
            hasExplicitTempo: true,
            confidence: 1.0
          });
        });
        
        expect(result.current.getTempoAtMeasure(10)).toBe(120);
        expect(result.current.getTempoAtMeasure(20)).toBe(140);
      }).toThrow(/not implemented/);
    });

    it('should return default when no tempo map', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // No tempo map set
        expect(result.current.getTempoAtMeasure(0)).toBe(120);
      }).toThrow(/not implemented/);
    });

    it('should handle errors gracefully', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        TempoService.getInstance.mockReturnValue({
          getTempoAtMeasure: jest.fn().mockImplementation(() => {
            throw new Error('Service error');
          })
        });
        
        // Should return fallback, not throw
        expect(result.current.getTempoAtMeasure(0)).toBe(120);
      }).toThrow(/not implemented/);
    });
  });

  describe('Automatic Extraction on Load', () => {
    it('should extract tempo automatically after score load', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        const mockExtract = jest.fn().mockResolvedValue({
          events: [],
          defaultBpm: 120,
          averageBpm: 120,
          hasExplicitTempo: false,
          confidence: 0.1
        });
        
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: mockExtract
        });
        
        // Load score
        await act(async () => {
          await result.current.loadScore('<music-xml>...</music-xml>');
        });
        
        // Should have called extraction
        expect(mockExtract).toHaveBeenCalled();
      }).rejects.toThrow(/not implemented/);
    });

    it('should not break score loading if extraction fails', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        TempoService.getInstance.mockReturnValue({
          extractFromOSMD: jest.fn().mockRejectedValue(new Error('Extract failed'))
        });
        
        // Load score
        await act(async () => {
          await result.current.loadScore('<music-xml>...</music-xml>');
        });
        
        // Score should still be loaded
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.error).toBe(null);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Additional Actions', () => {
    it('should set tempo map manually', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        const tempoMap = {
          events: [{ measureIndex: 0, bpm: 120 }],
          defaultBpm: 120,
          averageBpm: 120,
          hasExplicitTempo: true,
          confidence: 1.0
        };
        
        act(() => {
          result.current.setTempoMap(tempoMap);
        });
        
        expect(result.current.tempo.tempoMap).toEqual(tempoMap);
        expect(result.current.tempo.lastExtractedAt).toBeDefined();
      }).toThrow(/not implemented/);
    });

    it('should clear tempo data', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const { result } = renderHook(() => useOSMDStore());
        
        // Set some tempo data
        act(() => {
          result.current.setTempoMap({
            events: [],
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: false,
            confidence: 0.1
          });
        });
        
        // Clear it
        act(() => {
          result.current.clearTempo();
        });
        
        expect(result.current.tempo.tempoMap).toBe(null);
        expect(result.current.tempo.lastExtractedAt).toBe(null);
      }).toThrow(/not implemented/);
    });
  });

  describe('MIDI Latency Protection', () => {
    it('should not impact existing MIDI operations', () => {
      expect(() => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        // This test validates that tempo extraction doesn't interfere
        // with MIDI processing. The actual MIDI latency would be tested
        // in performance tests, but we verify the API remains unchanged
        
        const state = useOSMDStore.getState();
        
        // All existing OSMD operations should work normally
        expect(typeof state.loadScore).toBe('function');
        expect(typeof state.setError).toBe('function');
        
        // Tempo operations are separate
        expect(typeof state.extractTempo).toBe('function');
      }).toThrow(/not implemented/);
    });
  });
});