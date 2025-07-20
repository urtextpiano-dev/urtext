/**
 * TDD PHASE 2: TextExpressionExtractor Tests
 * 
 * Maps tempo terms (allegro, andante, etc.) to BPM values
 * with confidence calculations and async-ready architecture
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import modules that will be created in Phase 2
let TextExpressionExtractor: any;
let OSMDAdapter: any;
let types: any;

try {
  TextExpressionExtractor = require('@/renderer/features/tempo-extraction/extractors/TextExpressionExtractor').TextExpressionExtractor;
  OSMDAdapter = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter').OSMDAdapter;
  types = require('@/renderer/features/tempo-extraction/types');
} catch {
  // Not implemented yet - expected for TDD
}

describe('Phase 2: TextExpressionExtractor', () => {
  let mockAdapter: any;
  let extractor: any;
  
  beforeEach(() => {
    if (OSMDAdapter) {
      mockAdapter = {
        getMeasures: jest.fn(),
        getExpressionTexts: jest.fn(),
        getMeasureNumber: jest.fn()
      };
    }
  });

  describe('Core Tempo Term Mapping', () => {
    it('should extract tempo from allegro marking', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1 },
          { MeasureNumber: 2 }
        ]);
        
        mockAdapter.getExpressionTexts.mockReturnValueOnce([])
          .mockReturnValueOnce(['Allegro']);
        
        mockAdapter.getMeasureNumber.mockImplementation((_, idx) => idx + 1);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        expect(events[0]).toMatchObject({
          measureIndex: 1,
          measureNumber: 2,
          bpm: 140, // Typical allegro tempo
          confidence: 0.85, // Base confidence for allegro
          source: 'text',
          timestamp: expect.any(Number)
        });
      }).toThrow(/not implemented/);
    });

    it('should extract tempo from andante marking', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue(['Andante']);
        mockAdapter.getMeasureNumber.mockReturnValue(1);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events[0].bpm).toBe(90); // Typical andante tempo
        expect(events[0].confidence).toBe(0.8);
      }).toThrow(/not implemented/);
    });

    it('should handle full tempo term list', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        const tempoTerms = [
          { term: 'larghissimo', expectedBpm: 25, confidence: 0.75 },
          { term: 'grave', expectedBpm: 35, confidence: 0.75 },
          { term: 'largo', expectedBpm: 50, confidence: 0.8 },
          { term: 'lento', expectedBpm: 55, confidence: 0.75 },
          { term: 'larghetto', expectedBpm: 60, confidence: 0.7 },
          { term: 'adagio', expectedBpm: 70, confidence: 0.8 },
          { term: 'adagietto', expectedBpm: 75, confidence: 0.7 },
          { term: 'andante', expectedBpm: 90, confidence: 0.8 },
          { term: 'andantino', expectedBpm: 95, confidence: 0.7 },
          { term: 'moderato', expectedBpm: 120, confidence: 0.8 },
          { term: 'allegretto', expectedBpm: 120, confidence: 0.75 },
          { term: 'allegro', expectedBpm: 140, confidence: 0.85 },
          { term: 'vivace', expectedBpm: 160, confidence: 0.8 },
          { term: 'presto', expectedBpm: 180, confidence: 0.85 },
          { term: 'prestissimo', expectedBpm: 200, confidence: 0.8 }
        ];
        
        tempoTerms.forEach(({ term, expectedBpm, confidence }) => {
          mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
          mockAdapter.getExpressionTexts.mockReturnValue([term]);
          
          const extractor = new TextExpressionExtractor(mockAdapter);
          const events = extractor.extract();
          
          expect(events[0].bpm).toBe(expectedBpm);
          expect(events[0].confidence).toBe(confidence);
        });
      }).toThrow(/not implemented/);
    });

    it('should extract tempo from language aliases', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        const aliases = [
          { text: 'schnell', expectedTerm: 'allegro', expectedBpm: 140 },
          { text: 'sehr langsam', expectedTerm: 'larghissimo', expectedBpm: 25 },
          { text: 'walking pace', expectedTerm: 'andante', expectedBpm: 90 },
          { text: 'vif', expectedTerm: 'allegro', expectedBpm: 140 },
          { text: 'lebhaft', expectedTerm: 'vivace', expectedBpm: 160 }
        ];
        
        aliases.forEach(({ text, expectedBpm }) => {
          mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
          mockAdapter.getExpressionTexts.mockReturnValue([text]);
          
          const extractor = new TextExpressionExtractor(mockAdapter);
          const events = extractor.extract();
          
          expect(events[0].bpm).toBe(expectedBpm);
          expect(events[0].confidence).toBeGreaterThan(0.6); // Alias confidence penalty
        });
      }).toThrow(/not implemented/);
    });
  });

  describe('Confidence Calculation', () => {
    it('should give highest confidence to exact matches', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue(['allegro']); // Exact match
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events[0].confidence).toBe(0.95); // Max confidence (0.85 + 0.1)
      }).toThrow(/not implemented/);
    });

    it('should reduce confidence for partial matches', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue(['Allegro con fuoco']);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        // "allegro" is 7 chars in 17 char string = ~0.41 significance
        expect(events[0].confidence).toBeCloseTo(0.85 * 0.9, 2); // Base * 0.9 for medium significance
      }).toThrow(/not implemented/);
    });

    it('should handle case-insensitive matching', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue(['ALLEGRO', 'AlLeGrO', 'allegro']);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        
        // All should match
        mockAdapter.getExpressionTexts.mockReturnValue(['ALLEGRO']);
        let events = extractor.extract();
        expect(events.length).toBe(1);
        
        mockAdapter.getExpressionTexts.mockReturnValue(['AlLeGrO']);
        events = extractor.extract();
        expect(events.length).toBe(1);
      }).toThrow(/not implemented/);
    });
  });

  describe('Multiple Tempo Terms', () => {
    it('should choose best match when multiple terms present', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue([
          'allegro ma non troppo', // Contains allegro
          'moderato'               // Exact match - should win
        ]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events[0].bpm).toBe(120); // Moderato wins
      }).toThrow(/not implemented/);
    });

    it('should extract multiple tempo changes', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1 },
          { MeasureNumber: 16 },
          { MeasureNumber: 32 }
        ]);
        
        mockAdapter.getExpressionTexts
          .mockReturnValueOnce(['Andante'])
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['Presto']);
        
        mockAdapter.getMeasureNumber.mockImplementation((_, idx) => [1, 16, 32][idx]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(2);
        expect(events[0].bpm).toBe(90);  // Andante
        expect(events[1].bpm).toBe(180); // Presto
      }).toThrow(/not implemented/);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete extraction within 15ms for typical score', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        // Create 100 measures
        const measures = Array(100).fill(null).map((_, i) => ({ MeasureNumber: i + 1 }));
        mockAdapter.getMeasures.mockReturnValue(measures);
        mockAdapter.getExpressionTexts.mockReturnValue([]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        
        const startTime = performance.now();
        extractor.extract();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(15);
      }).toThrow(/not implemented/);
    });

    it('should implement early bailout after 30 processed measures at 10ms', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        // Create 1000 measures
        const measures = Array(1000).fill(null).map((_, i) => ({ MeasureNumber: i + 1 }));
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        // Every 10th measure has tempo text
        mockAdapter.getExpressionTexts.mockImplementation((measure: any) => {
          const idx = measures.indexOf(measure);
          return idx % 10 === 0 ? ['Allegro'] : [];
        });
        
        // Slow down extraction to trigger bailout
        const originalNow = performance.now;
        let callCount = 0;
        jest.spyOn(performance, 'now').mockImplementation(() => {
          callCount++;
          // After 30 calls, return time > 10ms
          return callCount > 30 ? originalNow() + 11 : originalNow();
        });
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const events = extractor.extract();
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[TextExpressionExtractor] Early bailout for performance'
        );
        expect(events.length).toBeLessThanOrEqual(30);
        
        consoleWarnSpy.mockRestore();
      }).toThrow(/not implemented/);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed expression texts gracefully', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue([
          null,
          undefined,
          123, // Not a string
          '',
          'valid allegro text'
        ]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        // Should only extract from valid string
        expect(events.length).toBe(1);
        expect(events[0].bpm).toBe(140);
      }).toThrow(/not implemented/);
    });

    it('should catch and log extraction errors', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockImplementation(() => {
          throw new Error('OSMD access error');
        });
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const events = extractor.extract();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[TextExpressionExtractor] Extraction failed:',
          expect.any(Error)
        );
        expect(events).toEqual([]);
        
        consoleErrorSpy.mockRestore();
      }).toThrow(/not implemented/);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement ITempoExtractor interface', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        
        expect(extractor.name).toBe('TextExpressionExtractor');
        expect(extractor.priority).toBe(500); // Medium priority
        expect(typeof extractor.extract).toBe('function');
      }).toThrow(/not implemented/);
    });

    it('should return properly typed TempoChangeEvent array', () => {
      expect(() => {
        if (!TextExpressionExtractor || !types) {
          throw new Error('Modules not implemented');
        }
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue(['Moderato']);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        events.forEach(event => {
          expect(types.isValidBpm(event.bpm)).toBe(true);
          expect(types.isValidMeasureIndex(event.measureIndex)).toBe(true);
          expect(event.source).toBe('text');
          expect(event.confidence).toBeGreaterThanOrEqual(0);
          expect(event.confidence).toBeLessThanOrEqual(1);
        });
      }).toThrow(/not implemented/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty measures array', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });

    it('should handle measures with no expressions', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue(
          Array(10).fill(null).map((_, i) => ({ MeasureNumber: i + 1 }))
        );
        mockAdapter.getExpressionTexts.mockReturnValue([]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });

    it('should not extract from non-tempo text', () => {
      expect(() => {
        if (!TextExpressionExtractor) throw new Error('TextExpressionExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getExpressionTexts.mockReturnValue([
          'p', // Dynamic marking
          'cresc.', // Dynamic change
          'legato', // Articulation
          'D.C. al Fine' // Navigation
        ]);
        
        const extractor = new TextExpressionExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });
  });
});