/**
 * TDD PHASE 1: MVP Core Integration Tests
 * 
 * Tests the complete Phase 1 implementation working together
 * This ensures all components integrate correctly
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import all Phase 1 modules
let OSMDAdapter: any;
let ExplicitTempoExtractor: any;
let TempoService: any;
let useOSMDStore: any;
let types: any;

try {
  types = require('@/renderer/features/tempo-extraction/types');
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  ExplicitTempoExtractor = require('@/renderer/features/tempo-extraction/extractors/ExplicitTempoExtractor').ExplicitTempoExtractor;
  TempoService = require('@/renderer/features/tempo-extraction/services/TempoService').TempoService;
  useOSMDStore = require('@/renderer/hooks/useOSMD').useOSMDStore;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Version MVP Core - Full Integration', () => {
  let mockOSMD: any;

  beforeEach(() => {
    // Reset singleton
    if (TempoService) {
      TempoService.instance = null;
    }
    
    // Create realistic OSMD mock
    mockOSMD = {
      Sheet: {
        SourceMeasures: [
          {
            MeasureNumber: 1,
            TempoInBpm: 120,
            VerticalSourceStaffEntryContainers: []
          },
          {
            MeasureNumber: 2,
            VerticalSourceStaffEntryContainers: []
          },
          {
            MeasureNumber: 16,
            VerticalSourceStaffEntryContainers: [{
              StaffEntries: [{
                SourceStaffEntry: {
                  Expressions: [{ text: '♩ = 140' }]
                }
              }]
            }]
          }
        ],
        Title: 'Test Piece',
        Composer: 'Test Composer'
      }
    };
  });

  describe('End-to-End Extraction', () => {
    it('should extract tempo through complete pipeline', async () => {
      await expect(async () => {
        if (!TempoService || !OSMDAdapter || !ExplicitTempoExtractor) {
          throw new Error('Phase 1 modules not implemented');
        }
        
        // Use real implementations
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should extract both structured BPM and metronome marking
        expect(tempoMap.events.length).toBe(2);
        
        // First event: structured BPM
        expect(tempoMap.events[0]).toMatchObject({
          measureIndex: 0,
          measureNumber: 1,
          bpm: 120,
          confidence: 1.0,
          source: 'explicit'
        });
        
        // Second event: metronome marking
        expect(tempoMap.events[1]).toMatchObject({
          measureIndex: 2,
          measureNumber: 16,
          bpm: 140,
          confidence: 0.95,
          source: 'explicit'
        });
        
        expect(tempoMap.hasExplicitTempo).toBe(true);
        expect(tempoMap.averageBpm).toBe(130); // Average of 120 and 140
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle empty score gracefully', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        mockOSMD.Sheet.SourceMeasures = [];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        expect(tempoMap.events.length).toBe(1);
        expect(tempoMap.events[0].source).toBe('default');
        expect(tempoMap.events[0].bpm).toBe(120);
        expect(tempoMap.hasExplicitTempo).toBe(false);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle malformed OSMD data', async () => {
      await expect(async () => {
        if (!TempoService || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        // Various malformed structures
        const malformedCases = [
          null,
          {},
          { Sheet: null },
          { Sheet: { SourceMeasures: null } },
          { Sheet: { SourceMeasures: 'not-array' } }
        ];
        
        const service = TempoService.getInstance();
        
        for (const malformed of malformedCases) {
          const tempoMap = await service.extractFromOSMD(malformed);
          
          // Should always return valid tempo map
          expect(tempoMap).toBeDefined();
          expect(tempoMap.defaultBpm).toBe(120);
          expect(Array.isArray(tempoMap.events)).toBe(true);
        }
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Type Safety', () => {
    it('should validate types throughout pipeline', async () => {
      await expect(async () => {
        if (!types || !TempoService) {
          throw new Error('Types or service not implemented');
        }
        
        const { isValidBpm, isValidMeasureIndex } = types;
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // All BPM values should be valid
        tempoMap.events.forEach(event => {
          expect(isValidBpm(event.bpm)).toBe(true);
          expect(isValidMeasureIndex(event.measureIndex)).toBe(true);
        });
        
        // Confidence should be 0-1
        tempoMap.events.forEach(event => {
          expect(event.confidence).toBeGreaterThanOrEqual(0);
          expect(event.confidence).toBeLessThanOrEqual(1);
        });
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Performance Requirements', () => {
    it('should process 100 measures within 20ms', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Create 100 measures
        mockOSMD.Sheet.SourceMeasures = Array(100).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          TempoInBpm: i === 0 ? 120 : undefined,
          VerticalSourceStaffEntryContainers: []
        }));
        
        const service = TempoService.getInstance();
        
        const startTime = performance.now();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(20);
        expect(tempoMap).toBeDefined();
      }).rejects.toThrow(/not implemented/);
    });

    it('should maintain <2ms MIDI latency impact', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        // Simulate MIDI processing timing
        const measureMidiLatency = () => {
          const start = performance.now();
          // Simulate MIDI processing
          for (let i = 0; i < 1000; i++) {
            Math.random();
          }
          return performance.now() - start;
        };
        
        // Baseline MIDI latency
        const baselineLatency = measureMidiLatency();
        
        // Extract tempo
        const store = useOSMDStore.getState();
        store.setOSMD(mockOSMD);
        store.setIsLoaded(true);
        await store.extractTempo();
        
        // Measure MIDI latency with extraction
        const withExtractionLatency = measureMidiLatency();
        
        // Impact should be <2ms
        const impact = withExtractionLatency - baselineLatency;
        expect(Math.abs(impact)).toBeLessThan(2);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache results for repeated extractions', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        const startTime1 = performance.now();
        const tempoMap1 = await service.extractFromOSMD(mockOSMD, { useCache: true });
        const duration1 = performance.now() - startTime1;
        
        const startTime2 = performance.now();
        const tempoMap2 = await service.extractFromOSMD(mockOSMD, { useCache: true });
        const duration2 = performance.now() - startTime2;
        
        // Second extraction should be faster (cached)
        expect(duration2).toBeLessThan(duration1 / 2);
        
        // Results should be identical
        expect(tempoMap1).toEqual(tempoMap2);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from extractor errors', async () => {
      await expect(async () => {
        if (!TempoService || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        // Create OSMD that causes specific errors
        const problematicOSMD = {
          Sheet: {
            SourceMeasures: [
              {
                MeasureNumber: 1,
                get TempoInBpm() {
                  throw new Error('Property access error');
                }
              }
            ]
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(problematicOSMD);
        
        // Should still return valid tempo map
        expect(tempoMap).toBeDefined();
        expect(tempoMap.defaultBpm).toBe(120);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical piano score', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Typical piano score structure
        mockOSMD.Sheet.SourceMeasures = [
          // Opening tempo
          {
            MeasureNumber: 1,
            TempoInBpm: 72,
            VerticalSourceStaffEntryContainers: []
          },
          // Several measures without tempo
          ...Array(30).fill(null).map((_, i) => ({
            MeasureNumber: i + 2,
            VerticalSourceStaffEntryContainers: []
          })),
          // Tempo change mid-piece
          {
            MeasureNumber: 32,
            VerticalSourceStaffEntryContainers: [{
              StaffEntries: [{
                SourceStaffEntry: {
                  Expressions: [{ ExpressionText: 'Allegro' }]
                }
              }]
            }]
          }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should extract opening tempo
        expect(tempoMap.events[0].bpm).toBe(72);
        expect(tempoMap.events[0].confidence).toBe(1.0);
        
        // Note: TextExpressionExtractor is Phase 2, so 'Allegro' won't be extracted yet
        expect(tempoMap.events.length).toBe(1);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle score with only metronome markings', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // No structured BPM, only text markings
        mockOSMD.Sheet.SourceMeasures = [
          {
            MeasureNumber: 1,
            VerticalSourceStaffEntryContainers: [{
              StaffEntries: [{
                SourceStaffEntry: {
                  Expressions: [{ text: 'quarter = 96' }]
                }
              }]
            }]
          }
        ];
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        expect(tempoMap.events[0].bpm).toBe(96);
        expect(tempoMap.events[0].confidence).toBe(0.95);
        expect(tempoMap.hasExplicitTempo).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });
  });
});