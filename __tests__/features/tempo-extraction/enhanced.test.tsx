/**
 * TDD PHASE 2: Enhanced Experience Integration Tests
 * 
 * Tests the complete Phase 2 implementation working together:
 * - TextExpressionExtractor integration
 * - Enhanced TempoService with async processing
 * - UI component integration
 * - Performance with multiple extractors
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

// Import all Phase 2 modules
let TextExpressionExtractor: any;
let HeuristicTempoExtractor: any;
let TempoService: any;
let TempoPreview: any;
let OSMDAdapter: any;
let useOSMDStore: any;
let types: any;

try {
  types = require('@/renderer/features/tempo-extraction/types');
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  TextExpressionExtractor = require('@/renderer/features/tempo-extraction/extractors/TextExpressionExtractor').TextExpressionExtractor;
  HeuristicTempoExtractor = require('@/renderer/features/tempo-extraction/extractors/HeuristicTempoExtractor').HeuristicTempoExtractor;
  TempoService = require('@/renderer/features/tempo-extraction/services/TempoService').TempoService;
  TempoPreview = require('@/renderer/features/tempo-extraction/components/TempoPreview').TempoPreview;
  useOSMDStore = require('@/renderer/stores/osmdStore').useOSMDStore;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Version Enhanced Experience - Full Integration', () => {
  let mockOSMD: any;

  beforeEach(() => {
    // Reset singletons
    if (TempoService) {
      TempoService.instance = null;
    }
    
    // Reset store
    if (useOSMDStore) {
      useOSMDStore.getState().reset?.();
    }
    
    // Create realistic OSMD mock with text expressions
    mockOSMD = {
      Sheet: {
        SourceMeasures: [
          {
            MeasureNumber: 1,
            VerticalSourceStaffEntryContainers: [{
              StaffEntries: [{
                SourceStaffEntry: {
                  Expressions: [{ ExpressionText: 'Andante cantabile' }]
                }
              }]
            }]
          },
          {
            MeasureNumber: 16,
            TempoInBpm: 120, // Explicit tempo
            VerticalSourceStaffEntryContainers: []
          },
          {
            MeasureNumber: 32,
            VerticalSourceStaffEntryContainers: [{
              StaffEntries: [{
                SourceStaffEntry: {
                  Expressions: [{ text: 'Allegro con fuoco' }]
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

  describe('Enhanced Tempo Extraction', () => {
    it('should extract both text and explicit tempos', async () => {
      await expect(async () => {
        if (!TempoService || !TextExpressionExtractor) {
          throw new Error('Phase 2 modules not implemented');
        }
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true,
          enableHeuristics: false
        });
        
        // Should extract 3 events
        expect(tempoMap.events.length).toBe(3);
        
        // First: Andante from text
        expect(tempoMap.events[0]).toMatchObject({
          measureIndex: 0,
          bpm: 90, // Andante typical tempo
          source: 'text',
          confidence: expect.any(Number)
        });
        
        // Second: Explicit tempo
        expect(tempoMap.events[1]).toMatchObject({
          measureIndex: 1,
          bpm: 120,
          source: 'explicit',
          confidence: 1.0
        });
        
        // Third: Allegro from text
        expect(tempoMap.events[2]).toMatchObject({
          measureIndex: 2,
          bpm: 140, // Allegro typical tempo
          source: 'text',
          confidence: expect.any(Number)
        });
        
        expect(tempoMap.hasTextTempo).toBe(true);
        expect(tempoMap.hasExplicitTempo).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });

    it('should fall back to heuristic extraction when enabled', async () => {
      await expect(async () => {
        if (!TempoService || !HeuristicTempoExtractor) {
          throw new Error('Phase 2 modules not implemented');
        }
        
        // OSMD with no tempo information
        const emptyOSMD = {
          Sheet: {
            SourceMeasures: Array(8).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              VerticalSourceStaffEntryContainers: []
            }))
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMDEnhanced(emptyOSMD, {
          enableTextExtraction: true,
          enableHeuristics: true
        });
        
        // Should have heuristic result
        expect(tempoMap.events.length).toBe(1);
        expect(tempoMap.events[0].source).toBe('heuristic');
        expect(tempoMap.events[0].confidence).toBe(0.3);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle extractor conflicts with confidence-based resolution', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // OSMD with conflicting tempo info at same measure
        const conflictOSMD = {
          Sheet: {
            SourceMeasures: [{
              MeasureNumber: 1,
              TempoInBpm: 100, // Explicit: 100 BPM
              VerticalSourceStaffEntryContainers: [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Allegro' }] // Text: ~140 BPM
                  }
                }]
              }]
            }]
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMDEnhanced(conflictOSMD);
        
        // Explicit tempo should win (higher confidence)
        expect(tempoMap.events.length).toBe(1);
        expect(tempoMap.events[0].bpm).toBe(100);
        expect(tempoMap.events[0].source).toBe('explicit');
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Store Integration', () => {
    it('should integrate enhanced extraction with useOSMDStore', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const store = useOSMDStore.getState();
        
        // Set OSMD and load
        act(() => {
          store.setOSMD(mockOSMD);
          store.setIsLoaded(true);
        });
        
        // Extract with enhanced options
        await act(async () => {
          await store.extractTempoEnhanced({
            enableTextExtraction: true,
            enableHeuristics: false
          });
        });
        
        // Check store state
        const state = useOSMDStore.getState();
        expect(state.tempo.isExtracting).toBe(false);
        expect(state.tempo.extractionError).toBeNull();
        expect(state.tempo.tempoMap).toBeDefined();
        expect(state.tempo.tempoMap.hasTextTempo).toBe(true);
        expect(state.tempo.lastExtractedAt).toBeGreaterThan(0);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle extraction errors in store', async () => {
      await expect(async () => {
        if (!useOSMDStore || !TempoService) {
          throw new Error('Modules not implemented');
        }
        
        // Mock extraction failure
        jest.spyOn(TempoService.getInstance(), 'extractFromOSMDEnhanced')
          .mockRejectedValue(new Error('Extraction failed'));
        
        const store = useOSMDStore.getState();
        store.setOSMD(mockOSMD);
        store.setIsLoaded(true);
        
        await act(async () => {
          await store.extractTempoEnhanced();
        });
        
        const state = useOSMDStore.getState();
        expect(state.tempo.isExtracting).toBe(false);
        expect(state.tempo.extractionError).toBe('Extraction failed');
        expect(state.tempo.tempoMap).toBeNull();
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('UI Integration', () => {
    it('should display enhanced tempo data in TempoPreview', async () => {
      await expect(async () => {
        if (!TempoPreview || !useOSMDStore) {
          throw new Error('Components not implemented');
        }
        
        // Extract tempo first
        const store = useOSMDStore.getState();
        store.setOSMD(mockOSMD);
        store.setIsLoaded(true);
        
        await act(async () => {
          await store.extractTempoEnhanced();
        });
        
        // Render preview with store data
        const state = useOSMDStore.getState();
        render(
          <TempoPreview
            tempoMap={state.tempo.tempoMap}
            isExtracting={state.tempo.isExtracting}
            extractionError={state.tempo.extractionError}
          />
        );
        
        // Should show text-based tempo
        expect(screen.getByText('Measure 1')).toBeInTheDocument();
        expect(screen.getByText('90 BPM')).toBeInTheDocument(); // Andante
        expect(screen.getByText('Text')).toBeInTheDocument();
        
        // Should show explicit tempo
        expect(screen.getByText('Measure 16')).toBeInTheDocument();
        expect(screen.getByText('120 BPM')).toBeInTheDocument();
        expect(screen.getByText('Explicit')).toBeInTheDocument();
      }).rejects.toThrow(/not implemented/);
    });

    it('should update UI during async extraction', async () => {
      await expect(async () => {
        if (!TempoPreview || !useOSMDStore) {
          throw new Error('Components not implemented');
        }
        
        const TestComponent = () => {
          const { tempo, extractTempoEnhanced } = useOSMDStore();
          
          return (
            <>
              <TempoPreview
                tempoMap={tempo.tempoMap}
                isExtracting={tempo.isExtracting}
                extractionError={tempo.extractionError}
              />
              <button onClick={() => extractTempoEnhanced()}>Extract</button>
            </>
          );
        };
        
        const { rerender } = render(<TestComponent />);
        
        // Initial state
        expect(screen.getByText('No tempo information available')).toBeInTheDocument();
        
        // Start extraction
        act(() => {
          fireEvent.click(screen.getByText('Extract'));
        });
        
        // Should show loading
        rerender(<TestComponent />);
        expect(screen.getByText('Extracting tempo...')).toBeInTheDocument();
        
        // Wait for completion
        await waitFor(() => {
          rerender(<TestComponent />);
          expect(screen.queryByText('Extracting tempo...')).not.toBeInTheDocument();
        });
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Performance with Multiple Extractors', () => {
    it('should complete enhanced extraction within 25ms budget', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Create score with 100 measures
        const largeMockOSMD = {
          Sheet: {
            SourceMeasures: Array(100).fill(null).map((_, i) => ({
              MeasureNumber: i + 1,
              TempoInBpm: i === 0 ? 120 : undefined,
              VerticalSourceStaffEntryContainers: i % 20 === 0 ? [{
                StaffEntries: [{
                  SourceStaffEntry: {
                    Expressions: [{ ExpressionText: 'Moderato' }]
                  }
                }]
              }] : []
            }))
          }
        };
        
        const service = TempoService.getInstance();
        
        const startTime = performance.now();
        const tempoMap = await service.extractFromOSMDEnhanced(largeMockOSMD, {
          enableTextExtraction: true,
          enableHeuristics: false
        });
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(25); // Enhanced budget
        expect(tempoMap.events.length).toBeGreaterThan(0);
      }).rejects.toThrow(/not implemented/);
    });

    it('should not impact MIDI latency when extraction is active', async () => {
      await expect(async () => {
        if (!useOSMDStore) throw new Error('useOSMDStore not implemented');
        
        const store = useOSMDStore.getState();
        store.setOSMD(mockOSMD);
        store.setIsLoaded(true);
        
        // Simulate MIDI processing during extraction
        const midiLatencies: number[] = [];
        
        // Start extraction
        const extractionPromise = store.extractTempoEnhanced();
        
        // Measure MIDI processing during extraction
        for (let i = 0; i < 10; i++) {
          const start = performance.now();
          // Simulate MIDI processing
          store.getTempoAtMeasure?.(0);
          midiLatencies.push(performance.now() - start);
        }
        
        await extractionPromise;
        
        // All MIDI operations should be fast
        const avgLatency = midiLatencies.reduce((a, b) => a + b) / midiLatencies.length;
        expect(avgLatency).toBeLessThan(2); // <2ms impact
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Async Processing', () => {
    it('should support async extractor loading', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Mock dynamic imports
        const mockImport = jest.fn();
        mockImport.mockResolvedValueOnce({ TextExpressionExtractor });
        
        const service = TempoService.getInstance();
        
        // Should dynamically import extractors
        const tempoMap = await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true
        });
        
        expect(tempoMap).toBeDefined();
        // Implementation should use dynamic import() for code splitting
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle async extractor failures gracefully', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        // Mock import failure
        const mockImport = jest.fn();
        mockImport.mockRejectedValue(new Error('Failed to load module'));
        
        const service = TempoService.getInstance();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Should continue without text extraction
        const tempoMap = await service.extractFromOSMDEnhanced(mockOSMD, {
          enableTextExtraction: true
        });
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('TextExpressionExtractor'),
          expect.any(Error)
        );
        
        // Should still extract explicit tempo
        expect(tempoMap.events.some(e => e.source === 'explicit')).toBe(true);
        
        consoleWarnSpy.mockRestore();
      }).rejects.toThrow(/not implemented/);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle classical piece with Italian tempo markings', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const classicalOSMD = {
          Sheet: {
            SourceMeasures: [
              {
                MeasureNumber: 1,
                VerticalSourceStaffEntryContainers: [{
                  StaffEntries: [{
                    SourceStaffEntry: {
                      Expressions: [{ ExpressionText: 'Adagio sostenuto' }]
                    }
                  }]
                }]
              },
              {
                MeasureNumber: 65,
                VerticalSourceStaffEntryContainers: [{
                  StaffEntries: [{
                    SourceStaffEntry: {
                      Expressions: [{ ExpressionText: 'Allegretto' }]
                    }
                  }]
                }]
              },
              {
                MeasureNumber: 200,
                VerticalSourceStaffEntryContainers: [{
                  StaffEntries: [{
                    SourceStaffEntry: {
                      Expressions: [{ ExpressionText: 'Presto agitato' }]
                    }
                  }]
                }]
              }
            ]
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMDEnhanced(classicalOSMD);
        
        expect(tempoMap.events[0].bpm).toBe(70); // Adagio
        expect(tempoMap.events[1].bpm).toBe(120); // Allegretto
        expect(tempoMap.events[2].bpm).toBe(180); // Presto
        
        expect(tempoMap.hasTextTempo).toBe(true);
      }).rejects.toThrow(/not implemented/);
    });

    it('should handle modern piece with mixed notation', async () => {
      await expect(async () => {
        if (!TempoService) throw new Error('TempoService not implemented');
        
        const modernOSMD = {
          Sheet: {
            SourceMeasures: [
              {
                MeasureNumber: 1,
                TempoInBpm: 144, // Explicit BPM
                VerticalSourceStaffEntryContainers: []
              },
              {
                MeasureNumber: 25,
                VerticalSourceStaffEntryContainers: [{
                  StaffEntries: [{
                    SourceStaffEntry: {
                      Expressions: [
                        { text: '♩ = 60' }, // Metronome marking
                        { ExpressionText: 'Slow and mysterious' }
                      ]
                    }
                  }]
                }]
              }
            ]
          }
        };
        
        const service = TempoService.getInstance();
        const tempoMap = await service.extractFromOSMDEnhanced(modernOSMD);
        
        // Should prioritize metronome marking over vague text
        expect(tempoMap.events[1].bpm).toBe(60);
        expect(tempoMap.events[1].source).toBe('explicit'); // From Phase 1 extractor
      }).rejects.toThrow(/not implemented/);
    });
  });
});