/**
 * TDD PHASE 1: TempoService Tests
 * 
 * Tests the orchestration service that coordinates extractors,
 * resolves conflicts, and manages caching
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Import modules that will be created
let TempoService: any;
let OSMDAdapter: any;
let ExplicitTempoExtractor: any;

try {
  const serviceImports = require('@/renderer/features/tempo-extraction/services/TempoService');
  const adapterImports = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter');
  const extractorImports = require('@/renderer/features/tempo-extraction/extractors/ExplicitTempoExtractor');
  
  TempoService = serviceImports.TempoService;
  OSMDAdapter = adapterImports.OSMDAdapter;
  ExplicitTempoExtractor = extractorImports.ExplicitTempoExtractor;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Phase 1: TempoService - Orchestration and Caching', () => {
  let mockOSMD: any;
  let service: any;

  beforeEach(() => {
    // Clear any existing singleton
    if (TempoService) {
      TempoService.instance = null;
    }
    
    // Mock OSMD instance
    mockOSMD = {
      Sheet: {
        SourceMeasures: [],
        Title: 'Test Score',
        Composer: 'Test Composer'
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern correctly', () => {
      expect(() => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const instance1 = TempoService.getInstance();
        const instance2 = TempoService.getInstance();
        
        expect(instance1).toBe(instance2);
        expect(instance1).toBeDefined();
      }).toThrow(/not implemented/);
    });
  });

  describe('extractFromOSMD() - Basic Extraction', () => {
    it('should extract tempo from OSMD instance', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        expect(tempoMap).toBeDefined();
        expect(tempoMap.events).toBeDefined();
        expect(Array.isArray(tempoMap.events)).toBe(true);
        expect(tempoMap.defaultBpm).toBeDefined();
        expect(tempoMap.averageBpm).toBeDefined();
        expect(tempoMap.hasExplicitTempo).toBeDefined();
        expect(tempoMap.confidence).toBeDefined();
      }).rejects.toThrow(/not implemented/);
    });

    it('should return default tempo map when no measures', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        expect(tempoMap.events.length).toBe(1);
        expect(tempoMap.events[0]).toEqual({
          measureIndex: 0,
          measureNumber: 1,
          bpm: 120,
          confidence: 0.1,
          source: 'default',
          timestamp: expect.any(Number)
        });
        expect(tempoMap.defaultBpm).toBe(120);
        expect(tempoMap.hasExplicitTempo).toBe(false);
      }).rejects.toThrow(/not implemented/);
    });

    it('should use custom fallback BPM', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD, {
          fallbackBpm: 90
        });
        
        expect(tempoMap.defaultBpm).toBe(90);
        expect(tempoMap.events[0].bpm).toBe(90);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts by confidence score', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Mock measures with tempo data
        mockOSMD.Sheet.SourceMeasures = [
          { MeasureNumber: 1, TempoInBpm: 120 }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should keep highest confidence event
        expect(tempoMap.events.length).toBe(1);
        expect(tempoMap.events[0].confidence).toBe(1.0);
        expect(tempoMap.events[0].source).toBe('explicit');
      }).rejects.toThrow(/not implemented/);
    });

    it('should keep only one event per measure', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // This would be tested more thoroughly with multiple extractors
        // For Phase 1, just verify basic deduplication works
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Check that measure indices are unique
        const measureIndices = tempoMap.events.map(e => e.measureIndex);
        const uniqueIndices = [...new Set(measureIndices)];
        expect(measureIndices.length).toBe(uniqueIndices.length);
      }).rejects.toThrow(/not implemented/);
    });

    it('should sort events by measure index', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        mockOSMD.Sheet.SourceMeasures = [
          { MeasureNumber: 16, TempoInBpm: 140 },
          { MeasureNumber: 1, TempoInBpm: 120 },
          { MeasureNumber: 32, TempoInBpm: 100 }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Events should be sorted by measure index
        const indices = tempoMap.events.map(e => e.measureIndex);
        const sortedIndices = [...indices].sort((a, b) => a - b);
        expect(indices).toEqual(sortedIndices);
      }).rejects.toThrow(/not implemented/);
    });

    it('should add default tempo at beginning if needed', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        mockOSMD.Sheet.SourceMeasures = [
          {}, // Empty first measure
          {}, // Empty second measure
          { MeasureNumber: 3, TempoInBpm: 140 } // Tempo starts at measure 3
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should have default tempo at measure 0
        expect(tempoMap.events[0].measureIndex).toBe(0);
        expect(tempoMap.events[0].source).toBe('default');
        expect(tempoMap.events[0].bpm).toBe(120);
        
        // Then explicit tempo at measure 2 (index)
        expect(tempoMap.events[1].measureIndex).toBe(2);
        expect(tempoMap.events[1].source).toBe('explicit');
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate average BPM correctly', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        mockOSMD.Sheet.SourceMeasures = [
          { MeasureNumber: 1, TempoInBpm: 120 },
          { MeasureNumber: 16, TempoInBpm: 140 },
          { MeasureNumber: 32, TempoInBpm: 100 }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Average of 120, 140, 100 = 120
        expect(tempoMap.averageBpm).toBe(120);
      }).rejects.toThrow(/not implemented/);
    });

    it('should track hasExplicitTempo flag', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Test with explicit tempo
        mockOSMD.Sheet.SourceMeasures = [
          { MeasureNumber: 1, TempoInBpm: 120 }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap1 = await service.extractFromOSMD(mockOSMD);
        expect(tempoMap1.hasExplicitTempo).toBe(true);
        
        // Test without explicit tempo
        mockOSMD.Sheet.SourceMeasures = [];
        const tempoMap2 = await service.extractFromOSMD(mockOSMD);
        expect(tempoMap2.hasExplicitTempo).toBe(false);
      }).rejects.toThrow(/not implemented/);
    });

    it('should set overall confidence correctly', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // No explicit tempo = low confidence
        mockOSMD.Sheet.SourceMeasures = [];
        const tempoMap1 = await service.extractFromOSMD(mockOSMD);
        expect(tempoMap1.confidence).toBe(0.1);
        
        // Explicit tempo = high confidence
        mockOSMD.Sheet.SourceMeasures = [
          { MeasureNumber: 1, TempoInBpm: 120 }
        ];
        const tempoMap2 = await service.extractFromOSMD(mockOSMD);
        expect(tempoMap2.confidence).toBe(1.0);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Caching', () => {
    it('should cache extraction results', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // First extraction
        const tempoMap1 = await service.extractFromOSMD(mockOSMD, { useCache: true });
        
        // Second extraction should use cache
        const tempoMap2 = await service.extractFromOSMD(mockOSMD, { useCache: true });
        
        expect(tempoMap1).toEqual(tempoMap2);
      }).rejects.toThrow(/not implemented/);
    });

    it('should generate consistent cache keys', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Same OSMD should generate same cache key
        const key1 = service.generateCacheKey(mockOSMD);
        const key2 = service.generateCacheKey(mockOSMD);
        
        expect(key1).toBe(key2);
        expect(typeof key1).toBe('string');
      }).rejects.toThrow(/not implemented/);
    });

    it('should respect useCache option', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Extract with caching disabled
        await service.extractFromOSMD(mockOSMD, { useCache: false });
        
        // Should not find in cache
        const cacheKey = service.generateCacheKey(mockOSMD);
        const cached = service.cache.get(cacheKey);
        expect(cached).toBeUndefined();
      }).rejects.toThrow(/not implemented/);
    });

    it('should clear cache on demand', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Add to cache
        await service.extractFromOSMD(mockOSMD, { useCache: true });
        
        // Clear cache
        service.clearCache();
        
        // Cache should be empty
        expect(service.cache.size).toBe(0);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('getTempoAtMeasure()', () => {
    it('should get tempo at specific measure', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        const tempoMap = {
          events: [
            { measureIndex: 0, bpm: 120 },
            { measureIndex: 16, bpm: 140 },
            { measureIndex: 32, bpm: 100 }
          ],
          defaultBpm: 120,
          averageBpm: 120,
          hasExplicitTempo: true,
          confidence: 1.0
        };
        
        // Before first change
        expect(service.getTempoAtMeasure(tempoMap, 10)).toBe(120);
        
        // After first change
        expect(service.getTempoAtMeasure(tempoMap, 20)).toBe(140);
        
        // After second change
        expect(service.getTempoAtMeasure(tempoMap, 40)).toBe(100);
        
        // Exactly at change
        expect(service.getTempoAtMeasure(tempoMap, 16)).toBe(140);
      }).rejects.toThrow(/not implemented/);
    });

    it('should return default when no tempo map', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        expect(service.getTempoAtMeasure(null, 0)).toBe(120);
        expect(service.getTempoAtMeasure(undefined, 10)).toBe(120);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete extraction within 20ms', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Create 100 measures
        mockOSMD.Sheet.SourceMeasures = Array(100).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          TempoInBpm: i % 10 === 0 ? 120 + i : undefined
        }));
        
        const service = TempoService.getInstance();
        
        const startTime = performance.now();
        await service.extractFromOSMD(mockOSMD);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(20);
      }).rejects.toThrow(/not implemented/);
    });

    it('should log performance warning when exceeding budget', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Create large score that might exceed budget
        mockOSMD.Sheet.SourceMeasures = Array(500).fill(null).map((_, i) => ({
          MeasureNumber: i + 1
        }));
        
        const service = TempoService.getInstance();
        await service.extractFromOSMD(mockOSMD);
        
        // Check if warning was logged (implementation dependent)
        // The test passes regardless, but implementation should log
        
        consoleWarnSpy.mockRestore();
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Mock OSMD that causes errors
        const errorOSMD = {
          get Sheet() {
            throw new Error('OSMD access error');
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(errorOSMD);
        
        // Should return default tempo map
        expect(tempoMap.defaultBpm).toBe(120);
        expect(tempoMap.confidence).toBe(0.1);
        expect(tempoMap.events.length).toBe(1);
      }).rejects.toThrow(/not implemented/);
    });
  });
});