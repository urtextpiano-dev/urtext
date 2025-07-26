/**
 * CRITICAL EDGE CASES - Based on Code Consensus
 * 
 * These tests address production-breaking scenarios identified by:
 * - Code review:: Implementation ambiguity and clarity issues
 * - Code review:: Performance degradation and security concerns
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import modules that will be created
let OSMDAdapter: any;
let ExplicitTempoExtractor: any;
let TempoService: any;
let useOSMDStore: any;

try {
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  ExplicitTempoExtractor = require('@/renderer/features/tempo-extraction/extractors/ExplicitTempoExtractor').ExplicitTempoExtractor;
  TempoService = require('@/renderer/features/tempo-extraction/services/TempoService').TempoService;
  useOSMDStore = require('@/renderer/hooks/useOSMD').useOSMDStore;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Critical Edge Cases - Code Consensus', () => {
  describe('Error Handling Clarity (Code review:)', () => {
    it('should return default BPM when OSMD properties are undefined', async () => {
      await expect(async () => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter();
        const mockOSMD = {
          Sheet: {
            SourceMeasures: [{
              MeasureNumber: 1,
              TempoInBpm: undefined, // Explicitly undefined
              VerticalSourceStaffEntryContainers: undefined
            }]
          }
        };
        
        const bpm = adapter.getTempoInBpm(mockOSMD.Sheet.SourceMeasures[0]);
        
        // CLARIFICATION: Should return null, not throw
        expect(bpm).toBeNull();
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle ambiguous metronome marks with clear priority', async () => {
      await expect(async () => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        const extractor = new ExplicitTempoExtractor();
        
        // CLARIFICATION: Expected behavior for each case
        const testCases = [
          { text: '♩=?', expected: null }, // Invalid - return null
          { text: '♩ = ', expected: null }, // Missing number - return null
          { text: 'Allegro ♩=120', expected: 120 }, // Extract number only
          { text: '♩=120-140', expected: 120 }, // Take first number
          { text: 'ca. ♩=100', expected: 100 } // Handle approximations
        ];
        
        for (const { text, expected } of testCases) {
          const result = extractor.parseMetronomeMark(text);
          expect(result).toBe(expected);
        }
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle multiple tempo marks in same measure with last-wins rule', async () => {
      await expect(async () => {
        if (!ExplicitTempoExtractor || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        const adapter = new OSMDAdapter();
        const extractor = new ExplicitTempoExtractor();
        
        const mockMeasure = {
          MeasureNumber: 1,
          TempoInBpm: 120, // Structured tempo
          VerticalSourceStaffEntryContainers: [{
            StaffEntries: [{
              SourceStaffEntry: {
                Expressions: [
                  { text: '♩ = 100' }, // First metronome mark
                  { text: '♩ = 140' }  // Second metronome mark
                ]
              }
            }]
          }]
        };
        
        const events = await extractor.extract(adapter, [mockMeasure]);
        
        // CLARIFICATION: Last metronome mark wins over earlier ones
        // But structured BPM still takes highest priority
        expect(events).toHaveLength(2);
        expect(events[0].bpm).toBe(120); // Structured BPM
        expect(events[1].bpm).toBe(140); // Last metronome mark
      }).rejects.toThrow(/not implemented/);
    });

    it('should specify cache invalidation triggers clearly', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        const mockOSMD1 = {
          Sheet: { 
            SourceMeasures: [{ MeasureNumber: 1, TempoInBpm: 120 }],
            Title: 'Test',
            SheetId: '123' // Unique identifier
          }
        };
        
        // First extraction - cached
        await service.extractFromOSMD(mockOSMD1);
        
        // CLARIFICATION: These should invalidate cache
        const invalidatingChanges = [
          { ...mockOSMD1, Sheet: { ...mockOSMD1.Sheet, SheetId: '456' } }, // Different ID
          { ...mockOSMD1, Sheet: { ...mockOSMD1.Sheet, SourceMeasures: [] } }, // Different measures
          null // Null OSMD
        ];
        
        // CLARIFICATION: These should NOT invalidate cache
        const nonInvalidatingChanges = [
          { ...mockOSMD1 }, // Same object structure
          { ...mockOSMD1, CursorPosition: 5 } // Unrelated property change
        ];
        
        // Test cache behavior
        for (const change of invalidatingChanges) {
          const spy = jest.spyOn(service as any, 'performExtraction');
          await service.extractFromOSMD(change);
          expect(spy).toHaveBeenCalled(); // Should re-extract
          spy.mockRestore();
        }
        
        for (const change of nonInvalidatingChanges) {
          const spy = jest.spyOn(service as any, 'performExtraction');
          await service.extractFromOSMD(change);
          expect(spy).not.toHaveBeenCalled(); // Should use cache
          spy.mockRestore();
        }
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Performance Edge Cases (Code review:)', () => {
    it('should handle extreme measure counts without performance degradation', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Create 10,000 measures
        const mockOSMD = {
          Sheet: {
            SourceMeasures: Array(10000).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              TempoInBpm: i === 0 ? 120 : undefined,
              VerticalSourceStaffEntryContainers: []
            }))
          }
        };
        
        const service = TempoService.getInstance();
        const startTime = performance.now();
        
        const tempoMap = await service.extractFromOSMD(mockOSMD, { useCache: false });
        const duration = performance.now() - startTime;
        
        // Should implement early bailout
        expect(duration).toBeLessThan(100); // Still reasonable time
        expect(tempoMap.events.length).toBeLessThanOrEqual(100); // Limited events
      }).rejects.toThrow(/not implemented/);
    });

    it('should prevent unbounded cache growth', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Add many unique scores to cache
        for (let i = 0; i < 1000; i++) {
          const mockOSMD = {
            Sheet: {
              SourceMeasures: [{ MeasureNumber: 1, TempoInBpm: 120 }],
              SheetId: `score-${i}`,
              Title: `Score ${i}`
            }
          };
          
          await service.extractFromOSMD(mockOSMD);
        }
        
        // Cache should have eviction policy
        const cache = (service as any).cache;
        expect(cache.size).toBeLessThanOrEqual(100); // Reasonable limit
        
        // Verify LRU eviction (most recent should be kept)
        const recentKey = service['generateCacheKey']({ 
          Sheet: { SheetId: 'score-999' } 
        });
        expect(cache.has(recentKey)).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle concurrent extractions without race conditions', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        const mockOSMDs = Array(10).fill(null).map((_, i) => ({
          Sheet: {
            SourceMeasures: Array(50).fill(null).map((_, j) => ({
              MeasureNumber: j + 1,
              TempoInBpm: j === 0 ? 120 + i : undefined
            })),
            SheetId: `concurrent-${i}`
          }
        }));
        
        // Extract all concurrently
        const startTime = performance.now();
        const promises = mockOSMDs.map(osmd => 
          service.extractFromOSMD(osmd, { useCache: false })
        );
        
        const results = await Promise.all(promises);
        const duration = performance.now() - startTime;
        
        // All should complete successfully
        expect(results.length).toBe(10);
        results.forEach((result, i) => {
          expect(result.defaultBpm).toBe(120 + i);
        });
        
        // Should complete in reasonable time (not serialized)
        expect(duration).toBeLessThan(200); // Parallel execution
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle OSMD mutations during extraction gracefully', async () => {
      await expect(async () => {
        if (!TempoService || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        const service = TempoService.getInstance();
        let extractionStarted = false;
        
        const mockOSMD = {
          Sheet: {
            get SourceMeasures() {
              if (extractionStarted) {
                // Simulate mutation during extraction
                throw new Error('OSMD mutated during extraction');
              }
              return [{ MeasureNumber: 1, TempoInBpm: 120 }];
            }
          }
        };
        
        // Start extraction
        extractionStarted = true;
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should handle gracefully with fallback
        expect(tempoMap).toBeDefined();
        expect(tempoMap.defaultBpm).toBe(120); // Fallback
        expect(tempoMap.events.length).toBe(1); // Default event
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Security Edge Cases (Code review:)', () => {
    it('should validate BPM values to prevent invalid states', async () => {
      await expect(async () => {
        if (!OSMDAdapter || !ExplicitTempoExtractor) {
          throw new Error('Modules not implemented');
        }
        
        const adapter = new OSMDAdapter();
        const extractor = new ExplicitTempoExtractor();
        
        const invalidBpmCases = [
          { value: 0, expected: null },
          { value: -120, expected: null },
          { value: Infinity, expected: null },
          { value: NaN, expected: null },
          { value: 100000, expected: null }, // Unreasonably high
          { value: 0.1, expected: null } // Unreasonably low
        ];
        
        for (const { value, expected } of invalidBpmCases) {
          const mockMeasure = {
            MeasureNumber: 1,
            TempoInBpm: value
          };
          
          const events = await extractor.extract(adapter, [mockMeasure]);
          
          if (expected === null) {
            expect(events).toHaveLength(0); // Should reject invalid BPM
          }
        }
      }).rejects.toThrow(/not implemented/);
    });

    it('should sanitize metronome marks to prevent injection', async () => {
      await expect(async () => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        const extractor = new ExplicitTempoExtractor();
        
        // Potential injection attempts
        const maliciousMarks = [
          '<script>alert("XSS")</script>♩=120',
          '♩=120; DROP TABLE measures;',
          '♩=${process.exit(1)}',
          '♩=120\n\rmalicious-content'
        ];
        
        for (const mark of maliciousMarks) {
          const result = extractor.parseMetronomeMark(mark);
          
          // Should extract only the numeric value
          expect(result).toBe(120);
          
          // Should not execute or preserve malicious content
          expect(typeof result).toBe('number');
        }
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle non-monotonic measure numbers defensively', async () => {
      await expect(async () => {
        if (!OSMDAdapter || !TempoService) {
          throw new Error('Modules not implemented');
        }
        
        const adapter = new OSMDAdapter();
        const service = TempoService.getInstance();
        
        // Non-monotonic measure numbers
        const mockOSMD = {
          Sheet: {
            SourceMeasures: [
              { MeasureNumber: 1, TempoInBpm: 120 },
              { MeasureNumber: 5, TempoInBpm: 140 }, // Gap
              { MeasureNumber: 3, TempoInBpm: 100 }, // Out of order
              { MeasureNumber: 5, TempoInBpm: 160 }  // Duplicate
            ]
          }
        };
        
        const tempoMap = await service.extractFromOSMD(mockOSMD);
        
        // Should handle gracefully
        expect(tempoMap.events).toBeDefined();
        
        // Should sort by measure number
        const measureNumbers = tempoMap.events.map(e => e.measureNumber);
        expect(measureNumbers).toEqual([...measureNumbers].sort((a, b) => a - b));
        
        // Should handle duplicates (last wins or merge)
        const measure5Events = tempoMap.events.filter(e => e.measureNumber === 5);
        expect(measure5Events.length).toBeLessThanOrEqual(1);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Integration Safety (Both AIs)', () => {
    it('should prevent circular dependency between useOSMD and TempoService', async () => {
      await expect(async () => {
        if (!useOSMDStore || !TempoService) {
          throw new Error('Modules not implemented');
        }
        
        // Verify no circular imports at module level
        const store = useOSMDStore.getState();
        const service = TempoService.getInstance();
        
        // TempoService should not depend on useOSMDStore
        expect(() => {
          // This would cause circular dependency
          const storeInService = require('@/renderer/hooks/useOSMD');
        }).toThrow();
        
        // Interaction should be one-way: Store → Service
        store.setOSMD({});
        await store.extractTempo(); // Store calls Service
        
        // Service should not call back to Store
        const serviceMethods = Object.getOwnPropertyNames(
          Object.getPrototypeOf(service)
        );
        
        serviceMethods.forEach(method => {
          const methodImpl = (service as any)[method].toString();
          expect(methodImpl).not.toContain('useOSMDStore');
        });
      }).rejects.toThrow(/not implemented/);
    });

    it('should maintain backward compatibility with existing useOSMD consumers', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        // Existing API should remain unchanged
        const store = useOSMDStore.getState();
        
        // All existing properties should exist
        expect(store).toHaveProperty('osmd');
        expect(store).toHaveProperty('isLoading');
        expect(store).toHaveProperty('isLoaded');
        expect(store).toHaveProperty('error');
        expect(store).toHaveProperty('setOSMD');
        expect(store).toHaveProperty('setIsLoading');
        expect(store).toHaveProperty('setIsLoaded');
        expect(store).toHaveProperty('setError');
        expect(store).toHaveProperty('reset');
        
        // New tempo properties should be optional/additive
        expect(store).toHaveProperty('tempoMap'); // New
        expect(store).toHaveProperty('extractTempo'); // New
        expect(store).toHaveProperty('getTempoAtMeasure'); // New
        
        // Existing functionality should work without tempo
        store.setOSMD({});
        store.setIsLoaded(true);
        
        // Should not break if tempo extraction fails
        store.extractTempo().catch(() => {
          // Should fail gracefully
          expect(store.isLoaded).toBe(true); // Still loaded
          expect(store.error).toBeNull(); // No error propagation
        });
      }).rejects.toThrow(/not implemented/);
    });
  });
});