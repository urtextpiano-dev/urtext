/**
 * TDD PHASE 1: ExplicitTempoExtractor Tests
 * 
 * Tests extraction of explicit tempo markings (BPM properties and metronome marks)
 * This is the core MVP functionality with highest confidence
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import the modules that will be created
let ExplicitTempoExtractor: any;
let OSMDAdapter: any;

try {
  const extractorImports = require('@/renderer/features/tempo-extraction/extractors/ExplicitTempoExtractor');
  const adapterImports = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter');
  ExplicitTempoExtractor = extractorImports.ExplicitTempoExtractor;
  OSMDAdapter = adapterImports.OSMDAdapter;
} catch {
  // Not implemented yet - expected for TDD
}

describe('Phase 1: ExplicitTempoExtractor - MVP Core', () => {
  let mockAdapter: any;
  let mockOSMD: any;

  beforeEach(() => {
    // Mock adapter methods
    mockAdapter = {
      getMeasures: jest.fn(() => []),
      getStructuredBpm: jest.fn(() => undefined),
      getExpressionTexts: jest.fn(() => []),
      getMeasureNumber: jest.fn((measure, index) => index + 1),
      validateOSMDState: jest.fn(() => ({ isValid: true, errors: [] }))
    };

    mockOSMD = {
      Sheet: {
        SourceMeasures: []
      }
    };
  });

  describe('Basic Functionality', () => {
    it('should implement ITempoExtractor interface', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        
        expect(extractor.name).toBe('ExplicitTempoExtractor');
        expect(extractor.priority).toBe(1000); // Highest priority
        expect(typeof extractor.extract).toBe('function');
      }).toThrow(/not implemented/);
    });

    it('should return empty array when no measures available', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBe(0);
      }).toThrow(/not implemented/);
    });
  });

  describe('Structured BPM Extraction', () => {
    it('should extract tempo from structured BPM property', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1 },
          { MeasureNumber: 2 },
          { MeasureNumber: 3 }
        ]);
        
        mockAdapter.getStructuredBpm.mockImplementation((measure) => {
          if (measure.MeasureNumber === 1) return 120;
          return undefined;
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        expect(events[0]).toEqual({
          measureIndex: 0,
          measureNumber: 1,
          bpm: 120,
          confidence: 1.0, // Highest confidence
          source: 'explicit',
          timestamp: expect.any(Number)
        });
      }).toThrow(/not implemented/);
    });

    it('should extract multiple tempo changes', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1 },
          { MeasureNumber: 16 },
          { MeasureNumber: 32 }
        ]);
        
        mockAdapter.getStructuredBpm.mockImplementation((measure) => {
          if (measure.MeasureNumber === 1) return 120;
          if (measure.MeasureNumber === 16) return 140;
          if (measure.MeasureNumber === 32) return 100;
          return undefined;
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(3);
        expect(events.map(e => e.bpm)).toEqual([120, 140, 100]);
        expect(events.every(e => e.source === 'explicit')).toBe(true);
        expect(events.every(e => e.confidence === 1.0)).toBe(true);
      }).toThrow(/not implemented/);
    });
  });

  describe('Metronome Marking Extraction', () => {
    it('should parse quarter note metronome markings', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getStructuredBpm.mockReturnValue(undefined);
        mockAdapter.getExpressionTexts.mockReturnValue(['♩ = 120']);
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        expect(events[0].bpm).toBe(120);
        expect(events[0].confidence).toBe(0.95); // Slightly lower than structured
        expect(events[0].source).toBe('explicit');
      }).toThrow(/not implemented/);
    });

    it('should parse various metronome marking formats', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        const testCases = [
          { text: '♩ = 96', expected: 96 },
          { text: '♪ = 180', expected: 180 },
          { text: 'quarter = 120', expected: 120 },
          { text: 'Quarter = 100', expected: 100 },
          { text: 'q = 140', expected: 140 },
          { text: 'Q = 80', expected: 80 },
          { text: '= 110', expected: 110 },
          { text: '120 BPM', expected: 120 },
          { text: 'BPM 120', expected: 120 },
          { text: 'Tempo: 90', expected: 90 }
        ];
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        
        testCases.forEach(({ text, expected }) => {
          mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
          mockAdapter.getExpressionTexts.mockReturnValue([text]);
          
          const events = extractor.extract();
          expect(events[0]?.bpm).toBe(expected);
        });
      }).toThrow(/not implemented/);
    });

    it('should validate BPM range for metronome markings', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        
        // Invalid BPM values should be ignored
        const invalidCases = ['♩ = 350', '♩ = 0', '♩ = -50', '♩ = 15'];
        
        invalidCases.forEach(text => {
          mockAdapter.getExpressionTexts.mockReturnValue([text]);
          const extractor = new ExplicitTempoExtractor(mockAdapter);
          const events = extractor.extract();
          expect(events.length).toBe(0);
        });
        
        // Valid range: 20-300
        const validCases = ['♩ = 20', '♩ = 300', '♩ = 150'];
        
        validCases.forEach(text => {
          mockAdapter.getExpressionTexts.mockReturnValue([text]);
          const extractor = new ExplicitTempoExtractor(mockAdapter);
          const events = extractor.extract();
          expect(events.length).toBe(1);
        });
      }).toThrow(/not implemented/);
    });

    it('should prefer structured BPM over text markings', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([{ MeasureNumber: 1 }]);
        mockAdapter.getStructuredBpm.mockReturnValue(120);
        mockAdapter.getExpressionTexts.mockReturnValue(['♩ = 96']); // Different value
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events.length).toBe(1);
        expect(events[0].bpm).toBe(120); // Structured BPM wins
        expect(events[0].confidence).toBe(1.0);
      }).toThrow(/not implemented/);
    });
  });

  describe('State Validation', () => {
    it('should validate OSMD state before extraction', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.validateOSMDState.mockReturnValue({
          isValid: false,
          errors: ['OSMD Sheet is not loaded']
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(mockAdapter.validateOSMDState).toHaveBeenCalled();
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });
  });

  describe('Performance Requirements', () => {
    it('should extract tempo within 15ms budget', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        // Create 100 measures
        const measures = Array(100).fill(null).map((_, i) => ({
          MeasureNumber: i + 1
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        mockAdapter.getStructuredBpm.mockImplementation(m => 
          m.MeasureNumber % 10 === 0 ? 120 : undefined
        );
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        
        const startTime = performance.now();
        const events = extractor.extract();
        const duration = performance.now() - startTime;
        
        expect(events.length).toBe(10); // Every 10th measure
        expect(duration).toBeLessThan(15); // Under 15ms budget
      }).toThrow(/not implemented/);
    });

    it('should implement early bailout for large scores', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        // Create 1000 measures (large score)
        const measures = Array(1000).fill(null).map((_, i) => ({
          MeasureNumber: i + 1
        }));
        
        mockAdapter.getMeasures.mockReturnValue(measures);
        
        // Slow processing simulation
        mockAdapter.getStructuredBpm.mockImplementation(() => {
          // Simulate 1ms processing per measure
          const start = performance.now();
          while (performance.now() - start < 1) {
            // Busy wait
          }
          return undefined;
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        
        const startTime = performance.now();
        const events = extractor.extract();
        const duration = performance.now() - startTime;
        
        // Should bail out early, not process all 1000 measures
        expect(duration).toBeLessThan(20); // Well under 1000ms
      }).toThrow(/not implemented/);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors per measure without failing entire extraction', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockReturnValue([
          { MeasureNumber: 1 },
          { MeasureNumber: 2 },
          { MeasureNumber: 3 }
        ]);
        
        mockAdapter.getStructuredBpm.mockImplementation((measure) => {
          if (measure.MeasureNumber === 2) {
            throw new Error('Simulated measure error');
          }
          return measure.MeasureNumber === 3 ? 120 : undefined;
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        // Should continue after error on measure 2
        expect(events.length).toBe(1);
        expect(events[0].measureNumber).toBe(3);
        expect(events[0].bpm).toBe(120);
      }).toThrow(/not implemented/);
    });

    it('should handle extraction failure gracefully', () => {
      expect(() => {
        if (!ExplicitTempoExtractor) throw new Error('ExplicitTempoExtractor not implemented');
        
        mockAdapter.getMeasures.mockImplementation(() => {
          throw new Error('Critical OSMD error');
        });
        
        const extractor = new ExplicitTempoExtractor(mockAdapter);
        const events = extractor.extract();
        
        expect(events).toEqual([]);
      }).toThrow(/not implemented/);
    });
  });

  describe('Integration with OSMDAdapter', () => {
    it('should work with real OSMDAdapter instance', () => {
      expect(() => {
        if (!ExplicitTempoExtractor || !OSMDAdapter) {
          throw new Error('Modules not implemented');
        }
        
        const adapter = new OSMDAdapter(mockOSMD);
        const extractor = new ExplicitTempoExtractor(adapter);
        
        const events = extractor.extract();
        expect(Array.isArray(events)).toBe(true);
      }).toThrow(/not implemented/);
    });
  });
});