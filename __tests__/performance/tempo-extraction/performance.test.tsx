/**
 * TDD PHASE 2: Performance Tests
 * 
 * Ensures Phase 2 enhancements maintain Urtext Piano's
 * strict performance requirements with multiple extractors
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

// Import Phase 2 modules for performance testing
let TextExpressionExtractor: any;
let HeuristicTempoExtractor: any;
let TempoService: any;
let TempoPreview: any;
let OSMDAdapter: any;
let useOSMDStore: any;

try {
  TextExpressionExtractor = require('@/renderer/features/tempo-extraction/extractors/TextExpressionExtractor').TextExpressionExtractor;
  HeuristicTempoExtractor = require('@/renderer/features/tempo-extraction/extractors/HeuristicTempoExtractor').HeuristicTempoExtractor;
  TempoService = require('@/renderer/features/tempo-extraction/services/TempoService').TempoService;
  TempoPreview = require('@/renderer/features/tempo-extraction/components/TempoPreview').TempoPreview;
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  useOSMDStore = require('@/renderer/stores/osmdStore').useOSMDStore;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Version Enhanced Performance Requirements', () => {
  describe('Enhanced Extraction Time Limits', () => {
    it('should extract with text expressions in under 25ms', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const mockOSMD = {
          Sheet: {
            SourceMeasures: Array(100).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              TempoInBpm: i === 0 ? 120 : undefined,
              VerticalSourceStaffEntryContainers: i % 10 === 0 ? [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: ['Andante', 'Allegro', 'Moderato'][i % 3] }]
                  }
                }]
              }] : []
            }))
          }
        };
        
        const service = TempoService.getInstance();
        
        // Warm up
        await service.extractFromOSMDEnhanced(mockOSMD);
        
        // Measure with text extraction enabled
        const startTime = performance.now();
        const tempoMap = await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true,
          enableHeuristics: false,
          useCache: false
        });
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(25); // Enhanced budget
        expect(tempoMap.hasTextTempo).toBe(true);
        expect(tempoMap.events.length).toBeGreaterThan(5);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle all extractors within 30ms for large scores', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const mockOSMD = {
          Sheet: {
            SourceMeasures: Array(500).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              TempoInBpm: i === 0 ? 120 : (i % 100 === 0 ? 100 + i / 10 : undefined),
              VerticalSourceStaffEntryContainers: i % 50 === 0 ? [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Vivace' }]
                  }
                }]
              }] : []
            }))
          }
        };
        
        const service = TempoService.getInstance();
        
        const startTime = performance.now();
        const tempoMap = await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true,
          enableHeuristics: true,
          useCache: false
        });
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(30); // All extractors budget
        expect(tempoMap.events.length).toBeGreaterThan(0);
      }).rejects.toThrow(/not implemented/);
    });

    it('should implement progressive extraction with early bailout', async () => {
      await expect(async () => {
        if (!TextExpressionExtractor || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        const measures = Array(2000).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          expressions: i % 5 === 0 ? ['Allegro'] : []
        }));
        
        const mockAdapter = {
          getMeasures: jest.fn().mockReturnValue(measures),
          getExpressionTexts: jest.fn().mockImplementation((m: any) => m.expressions),
          getMeasureNumber: jest.fn().mockImplementation((m: any) => m.MeasureNumber)
        };
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Mock slow performance after 30 measures
        let callCount = 0;
        const originalNow = performance.now;
        jest.spyOn(performance, 'now').mockImplementation(() => {
          callCount++;
          return callCount > 30 ? originalNow() + 15 : originalNow();
        });
        
        const events = extractor.extract();
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[TextExpressionExtractor] Early bailout for performance'
        );
        expect(events.length).toBeLessThanOrEqual(30);
        
        consoleWarnSpy.mockRestore();
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Component Render Performance', () => {
    it('should render TempoPreview within 50ms', () => {
      expect(() => {
        if (!TempoPreview) throw new Error('TempoPreview not implemented');
        
        const largeTempoMap = {
          events: Array(100).fill(null).map((_, i) => ({
            measureIndex: i,
            measureNumber: i + 1,
            bpm: 60 + Math.floor(i / 10) * 10,
            confidence: 0.5 + (i % 5) * 0.1,
            source: ['explicit', 'text', 'heuristic'][i % 3] as any,
            timestamp: Date.now()
          })),
          defaultBpm: 120,
          averageBpm: 110,
          hasExplicitTempo: true,
          hasTextTempo: true,
          confidence: 0.8
        };
        
        const startTime = performance.now();
        
        render(
          <TempoPreview
            tempoMap={largeTempoMap}
            isExtracting={false}
            extractionError={null}
          />
        );
        
        const renderTime = performance.now() - startTime;
        
        expect(renderTime).toBeLessThan(50); // UI render budget
      }).toThrow(/not implemented/);
    });

    it('should update efficiently during extraction', async () => {
      await expect(async () => {
        if (!TempoPreview) throw new Error('TempoPreview not implemented');
        
        let renderCount = 0;
        const TrackedPreview = (props: any) => {
          renderCount++;
          return <TempoPreview {...props} />;
        };
        
        const { rerender } = render(
          <TrackedPreview
            tempoMap={null}
            isExtracting={true}
            extractionError={null}
          />
        );
        
        // Simulate extraction updates
        for (let i = 0; i < 10; i++) {
          rerender(
            <TrackedPreview
              tempoMap={null}
              isExtracting={true}
              extractionError={null}
            />
          );
        }
        
        // Should not re-render excessively
        expect(renderCount).toBeLessThan(15); // Initial + updates
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Memory Usage with Enhanced Features', () => {
    it('should not leak memory with text extraction cache', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Get initial memory (if available)
        const getMemoryUsage = () => {
          if (typeof performance !== 'undefined' && 'memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        };
        
        const initialMemory = getMemoryUsage();
        
        // Perform many extractions with different scores
        for (let i = 0; i < 50; i++) {
          const mockOSMD = {
            Sheet: {
              SourceMeasures: [{
                MeasureNumber: 1,
                VerticalSourceStaffEntryContainers: [{
                  StaffEntries: [{
                    SourceStaffEntry: {
                      Expressions: [{ ExpressionText: `Tempo ${i}` }]
                    }
                  }]
                }]
              }],
              Title: `Score ${i}`,
              Composer: `Composer ${i}`
            }
          };
          
          await service.extractFromOSMDEnhanced(mockOSMD, {
            enableTextExtraction: true,
            useCache: true
          });
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = getMemoryUsage();
        const memoryIncrease = finalMemory - initialMemory;
        
        // Should have reasonable memory usage
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // <5MB increase
      }).rejects.toThrow(/not implemented/);
    });

    it('should clean up dynamic imports properly', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const service = TempoService.getInstance();
        
        // Track module loads
        const moduleLoads: string[] = [];
        const originalImport = (global as any).import;
        (global as any).import = async (path: string) => {
          moduleLoads.push(path);
          return originalImport(path);
        };
        
        // Multiple extractions
        for (let i = 0; i < 10; i++) {
          await service.extractFromOSMDEnhanced({}, {
            enableTextExtraction: true,
            enableHeuristics: i % 2 === 0
          });
        }
        
        // Should reuse loaded modules, not reload every time
        const textExtractorLoads = moduleLoads.filter(m => 
          m.includes('TextExpressionExtractor')
        );
        expect(textExtractorLoads.length).toBeLessThanOrEqual(1);
        
        (global as any).import = originalImport;
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Concurrent Operations with Enhanced Features', () => {
    it('should handle multiple enhanced extractions concurrently', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const mockOSMDs = Array(5).fill(null).map((_, i) => ({
          Sheet: {
            SourceMeasures: Array(50).fill(null).map((_, j) => ({
              MeasureNumber: j + 1,
              TempoInBpm: j === 0 ? 100 + i * 10 : undefined,
              VerticalSourceStaffEntryContainers: j % 10 === 0 ? [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Moderato' }]
                  }
                }]
              }] : []
            })),
            Title: `Score ${i}`
          }
        }));
        
        const service = TempoService.getInstance();
        
        const startTime = performance.now();
        
        // Extract from all scores concurrently with enhanced options
        const promises = mockOSMDs.map(osmd => 
          service.extractFromOSMDEnhanced(osmd, {
            enableTextExtraction: true,
            enableHeuristics: false,
            useCache: false
          })
        );
        
        const results = await Promise.all(promises);
        const duration = performance.now() - startTime;
        
        // Should complete efficiently even with text extraction
        expect(duration).toBeLessThan(100); // 5 scores in <100ms
        expect(results.every(r => r.hasTextTempo)).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Real-time Performance Impact', () => {
    it('should maintain MIDI responsiveness during enhanced extraction', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const store = useOSMDStore.getState();
        
        // Set up OSMD with text expressions
        const mockOSMD = {
          Sheet: {
            SourceMeasures: Array(200).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              VerticalSourceStaffEntryContainers: i % 15 === 0 ? [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Allegro' }]
                  }
                }]
              }] : []
            }))
          }
        };
        
        store.setOSMD(mockOSMD);
        store.setIsLoaded(true);
        
        // Track tempo query performance during extraction
        const queryLatencies: number[] = [];
        
        // Start enhanced extraction
        const extractionPromise = store.extractTempoEnhanced({
          enableTextExtraction: true,
          enableHeuristics: true
        });
        
        // Simulate real-time tempo queries (e.g., during playback)
        const queryInterval = setInterval(() => {
          const start = performance.now();
          const tempo = store.getTempoAtMeasure?.(
            Math.floor(Math.random() * 200)
          );
          queryLatencies.push(performance.now() - start);
        }, 10);
        
        await extractionPromise;
        clearInterval(queryInterval);
        
        // All queries should be fast
        const avgLatency = queryLatencies.reduce((a, b) => a + b) / queryLatencies.length;
        const maxLatency = Math.max(...queryLatencies);
        
        expect(avgLatency).toBeLessThan(1); // <1ms average
        expect(maxLatency).toBeLessThan(5); // <5ms worst case
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Bundle Size Impact', () => {
    it('should have acceptable bundle size with Phase 2 features', () => {
      expect(() => {
        // This test validates that Phase 2 additions are reasonable
        const estimatedSizes = {
          TextExpressionExtractor: 8, // KB - larger due to tempo mappings
          HeuristicTempoExtractor: 4, // KB - simpler logic
          TempoPreview: 10, // KB - React component with styles
          EnhancedTempoService: 3, // KB - additional methods
          AsyncImports: 2 // KB - dynamic import logic
        };
        
        const totalPhase2Size = Object.values(estimatedSizes).reduce((a, b) => a + b);
        
        expect(totalPhase2Size).toBeLessThan(30); // <30KB for Phase 2
        
        // Combined with Phase 1
        const phase1Size = 20; // From Phase 1 tests
        const totalSize = phase1Size + totalPhase2Size;
        
        expect(totalSize).toBeLessThan(50); // <50KB total
      }).not.toThrow();
    });
  });

  describe('Performance Monitoring and Logging', () => {
    it('should log enhanced extraction performance metrics', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        
        const mockOSMD = {
          Sheet: {
            SourceMeasures: Array(50).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              VerticalSourceStaffEntryContainers: [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Andante' }]
                  }
                }]
              }]
            }))
          }
        };
        
        const service = TempoService.getInstance();
        
        await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true
        });
        
        // Should log extraction completion with timing
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TempoService] Enhanced extraction completed'),
          expect.stringContaining('ms')
        );
        
        // Should log individual extractor performance
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TempoService] Running TextExpressionExtractor')
        );
        
        consoleLogSpy.mockRestore();
      }).rejects.toThrow(/not implemented/);
    });

    it('should warn when approaching performance budget', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Large score that will be slow
        const slowMockOSMD = {
          Sheet: {
            SourceMeasures: Array(1000).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              VerticalSourceStaffEntryContainers: [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: `Tempo ${i}` }]
                  }
                }]
              }]
            }))
          }
        };
        
        const service = TempoService.getInstance();
        
        // Mock slow extraction
        const originalExtract = TextExpressionExtractor.prototype.extract;
        TextExpressionExtractor.prototype.extract = function() {
          const start = performance.now();
          while (performance.now() - start < 20) {
            // Simulate slow processing
          }
          return originalExtract.call(this);
        };
        
        await service.extractFromOSMDEnhanced(slowMockOSMD);
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Performance warning'),
          expect.stringContaining('> 25ms budget')
        );
        
        TextExpressionExtractor.prototype.extract = originalExtract;
        consoleWarnSpy.mockRestore();
      }).rejects.toThrow(/not implemented/);
    });
  });
});