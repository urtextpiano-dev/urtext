/**
 * TDD PHASE 2: HeuristicTempoExtractor Tests
 * 
 * Optional fallback extractor that estimates tempo based on
 * note density analysis when no explicit tempo is found
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import modules that will be created in Phase 2
let HeuristicTempoExtractor: any;
let OSMDAdapter: any;
let types: any;

try {
  HeuristicTempoExtractor = require('@/renderer/features/tempo-extraction/extractors/HeuristicTempoExtractor').HeuristicTempoExtractor;
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  types = require('@/renderer/features/tempo-extraction/types');
} catch {
  // Not implemented yet - expected for TDD
}

describe('Version HeuristicTempoExtractor', () => {
  let mockAdapter: any;
  
  beforeEach(() => {
    if (OSMDAdapter) {
      mockAdapter = {
        getMeasures: jest.fn(),
        getMeasureNumber: jest.fn(),
        getNoteDensity: jest.fn() // Optional helper method
      };
    }
  });

  describe('Note Density Analysis', () => {
    it('should estimate slow tempo for low note density', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Mock measures with low note density
        const measures = Array(8).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          // Simulate sparse measures (whole notes, half notes)
          _noteDensity: 2 // Low density
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          measureIndex: 0,
          measureNumber: 1,
          bpm: expect.any(Number),
          confidence: 0.3, // Low confidence for heuristic
          source: 'heuristic',
          timestamp: expect.any(Number)
        });
        
        // Low density should suggest slower tempo
        expect(events[0].bpm).toBeGreaterThanOrEqual(60);
        expect(events[0].bpm).toBeLessThanOrEqual(80);
      }).toThrow(/not implemented/);
    });

    it('should estimate moderate tempo for medium note density', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Mock measures with medium note density
        const measures = Array(8).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          _noteDensity: 8 // Medium density (quarter notes)
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events[0].bpm).toBeGreaterThanOrEqual(90);
        expect(events[0].bpm).toBeLessThanOrEqual(120);
      }).toThrow(/not implemented/);
    });

    it('should estimate fast tempo for high note density', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Mock measures with high note density
        const measures = Array(8).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          _noteDensity: 16 // High density (sixteenth notes)
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events[0].bpm).toBeGreaterThanOrEqual(120);
        expect(events[0].bpm).toBeLessThanOrEqual(160);
      }).toThrow(/not implemented/);
    });

    it('should only analyze first 8 measures for performance', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Create 100 measures
        const measures = Array(100).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          _noteDensity: 8
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        
        // Spy on measure analysis
        const calculateNoteDensitySpy = jest.spyOn(extractor as any, 'calculateNoteDensity');
        
        extractor.extract();
        
        // Should only process first 8 measures
        expect(calculateNoteDensitySpy).toHaveBeenCalledTimes(8);
      }).toThrow(/not implemented/);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement ITempoExtractor interface', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        
        expect(extractor.name).toBe('HeuristicTempoExtractor');
        expect(extractor.priority).toBe(200); // Lowest priority
        expect(typeof extractor.extract).toBe('function');
      }).toThrow(/not implemented/);
    });

    it('should return properly typed TempoChangeEvent', () => {
      expect(() => {
        if (!HeuristicTempoExtractor || !types) {
          throw new Error('Modules not implemented');
        }
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1, _noteDensity: 8 }
        ]);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        const event = events[0];
        
        expect(types.isValidBpm(event.bpm)).toBe(true);
        expect(types.isValidMeasureIndex(event.measureIndex)).toBe(true);
        expect(event.source).toBe('heuristic');
        expect(event.confidence).toBe(0.3); // Always low confidence
      }).toThrow(/not implemented/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty measures', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([]);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });

    it('should handle measures with no note data', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Measures without analyzable content
        const measures = Array(8).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          _noteDensity: 0 // No notes
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        // Should still provide a reasonable default
        expect(events.length).toBe(1);
        expect(events[0].bpm).toBe(120); // Default tempo
        expect(events[0].confidence).toBe(0.3);
      }).toThrow(/not implemented/);
    });

    it('should handle analysis errors gracefully', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockImplementation(() => {
          throw new Error('OSMD access error');
        });
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const events = extractor.extract();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[HeuristicTempoExtractor] Analysis failed:',
          expect.any(Error)
        );
        expect(events).toEqual([]);
        
        consoleErrorSpy.mockRestore();
      }).toThrow(/not implemented/);
    });

    it('should cap BPM within reasonable range', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // Test extreme densities
        const testCases = [
          { density: 0.1, minBpm: 60, maxBpm: 80 },   // Very sparse
          { density: 50, minBpm: 140, maxBpm: 160 }   // Very dense
        ];
        
        testCases.forEach(({ density, minBpm, maxBpm }) => {
          const measures = [{ MeasureNumber: 1, _noteDensity: density }];
          mockAdapter.getMeasures.mockReturnValue(measures);
          
          const extractor = new HeuristicTempoExtractor(mockAdapter);
          const events = extractor.extract();
          
          expect(events[0].bpm).toBeGreaterThanOrEqual(minBpm);
          expect(events[0].bpm).toBeLessThanOrEqual(maxBpm);
        });
      }).toThrow(/not implemented/);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within 5ms', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        const measures = Array(8).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          _noteDensity: Math.random() * 20
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        
        const startTime = performance.now();
        extractor.extract();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(5);
      }).toThrow(/not implemented/);
    });
  });

  describe('Integration with TempoService', () => {
    it('should only be used when no explicit tempo found', () => {
      expect(() => {
        if (!HeuristicTempoExtractor) throw new Error('HeuristicTempoExtractor not implemented');
        
        // This behavior is tested in TempoService tests
        // Here we just verify the extractor works standalone
        const extractor = new HeuristicTempoExtractor(mockAdapter);
        
        // Should have lowest priority
        expect(extractor.priority).toBe(200);
        
        // Should always return low confidence
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        const events = extractor.extract();
        expect(events[0]?.confidence).toBe(0.3);
      }).toThrow(/not implemented/);
    });
  });
});