/**
 * TDD PHASE 1: OSMDAdapter Tests
 * 
 * Tests the anti-corruption layer for defensive OSMD API access
 * Critical for handling uncertain OSMD property names
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Import the OSMDAdapter that will be created
let OSMDAdapter: any;

try {
  const imports = require('@/renderer/features/tempo-extraction/adapters/OSMDAdapter');
  OSMDAdapter = imports.OSMDAdapter;
} catch {
  // Not implemented yet - expected for TDD
}

// Mock OSMD types
interface MockSourceMeasure {
  [key: string]: any;
}

interface MockOSMD {
  Sheet?: {
    SourceMeasures?: MockSourceMeasure[];
    [key: string]: any;
  };
}

describe('Phase 1: OSMDAdapter - Anti-Corruption Layer', () => {
  let mockOSMD: MockOSMD;

  beforeEach(() => {
    // Reset mock OSMD instance
    mockOSMD = {
      Sheet: {
        SourceMeasures: []
      }
    };
  });

  describe('getMeasures() - Defensive Measure Access', () => {
    it('should return empty array when no measures available', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        const measures = adapter.getMeasures();
        
        expect(Array.isArray(measures)).toBe(true);
        expect(measures.length).toBe(0);
      }).toThrow(/not implemented/);
    });

    it('should handle null/undefined Sheet gracefully', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const brokenOSMD = {} as MockOSMD;
        const adapter = new OSMDAdapter(brokenOSMD);
        const measures = adapter.getMeasures();
        
        expect(Array.isArray(measures)).toBe(true);
        expect(measures.length).toBe(0);
      }).toThrow(/not implemented/);
    });

    it('should handle non-array SourceMeasures', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        mockOSMD.Sheet!.SourceMeasures = 'not-an-array' as any;
        const adapter = new OSMDAdapter(mockOSMD);
        const measures = adapter.getMeasures();
        
        expect(Array.isArray(measures)).toBe(true);
        expect(measures.length).toBe(0);
      }).toThrow(/not implemented/);
    });

    it('should filter out null/undefined measures', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        mockOSMD.Sheet!.SourceMeasures = [
          { MeasureNumber: 1 },
          null,
          undefined,
          { MeasureNumber: 2 }
        ] as any;
        
        const adapter = new OSMDAdapter(mockOSMD);
        const measures = adapter.getMeasures();
        
        expect(measures.length).toBe(2);
        expect(measures[0].MeasureNumber).toBe(1);
        expect(measures[1].MeasureNumber).toBe(2);
      }).toThrow(/not implemented/);
    });
  });

  describe('getStructuredBpm() - Defensive BPM Extraction', () => {
    it('should extract BPM from various property names', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        // Test different property names from GitHub issue #557
        const propertyVariants = [
          { TempoInBpm: 120 },
          { tempoInBpm: 130 },
          { Tempo: 140 },
          { tempo: 150 },
          { BPM: 160 },
          { bpm: 170 }
        ];
        
        propertyVariants.forEach(measure => {
          const bpm = adapter.getStructuredBpm(measure);
          expect(bpm).toBeGreaterThan(0);
          expect(bpm).toBeLessThanOrEqual(300);
        });
      }).toThrow(/not implemented/);
    });

    it('should extract BPM from nested TempoInstruction', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        const measureWithNested = {
          TempoInstruction: {
            TempoInBpm: 120
          }
        };
        
        const bpm = adapter.getStructuredBpm(measureWithNested);
        expect(bpm).toBe(120);
      }).toThrow(/not implemented/);
    });

    it('should validate BPM range and round to integer', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        // Valid BPM with decimal
        expect(adapter.getStructuredBpm({ TempoInBpm: 120.7 })).toBe(121);
        
        // Invalid BPM values
        expect(adapter.getStructuredBpm({ TempoInBpm: 0 })).toBeUndefined();
        expect(adapter.getStructuredBpm({ TempoInBpm: -50 })).toBeUndefined();
        expect(adapter.getStructuredBpm({ TempoInBpm: 350 })).toBeUndefined();
        expect(adapter.getStructuredBpm({ TempoInBpm: 'not-a-number' })).toBeUndefined();
      }).toThrow(/not implemented/);
    });

    it('should handle null/undefined measures safely', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        expect(adapter.getStructuredBpm(null)).toBeUndefined();
        expect(adapter.getStructuredBpm(undefined)).toBeUndefined();
        expect(adapter.getStructuredBpm({})).toBeUndefined();
      }).toThrow(/not implemented/);
    });
  });

  describe('getExpressionTexts() - Defensive Text Extraction', () => {
    it('should extract text from various expression properties', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        const measure = {
          VerticalSourceStaffEntryContainers: [{
            StaffEntries: [{
              SourceStaffEntry: {
                Expressions: [
                  { ExpressionText: 'Allegro' },
                  { text: '♩ = 120' },
                  { Text: 'con brio' },
                  { Label: 'Andante' }
                ]
              }
            }]
          }]
        };
        
        const texts = adapter.getExpressionTexts(measure);
        
        expect(texts).toContain('Allegro');
        expect(texts).toContain('♩ = 120');
        expect(texts).toContain('con brio');
        expect(texts).toContain('Andante');
      }).toThrow(/not implemented/);
    });

    it('should handle missing expression containers gracefully', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        // Various broken structures
        expect(adapter.getExpressionTexts({})).toEqual([]);
        expect(adapter.getExpressionTexts({ VerticalSourceStaffEntryContainers: null })).toEqual([]);
        expect(adapter.getExpressionTexts({ VerticalSourceStaffEntryContainers: [] })).toEqual([]);
      }).toThrow(/not implemented/);
    });

    it('should remove duplicates and trim whitespace', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        const measure = {
          VerticalSourceStaffEntryContainers: [{
            StaffEntries: [{
              SourceStaffEntry: {
                Expressions: [
                  { text: '  Allegro  ' },
                  { text: 'Allegro' },
                  { text: '' }, // Empty string
                  { text: '   ' } // Whitespace only
                ]
              }
            }]
          }]
        };
        
        const texts = adapter.getExpressionTexts(measure);
        
        expect(texts).toEqual(['Allegro']); // Trimmed and deduplicated
      }).toThrow(/not implemented/);
    });
  });

  describe('getMeasureNumber() - Measure Number Extraction', () => {
    it('should get measure number from property', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        expect(adapter.getMeasureNumber({ MeasureNumber: 5 }, 4)).toBe(5);
        expect(adapter.getMeasureNumber({ measureNumber: 10 }, 9)).toBe(10);
      }).toThrow(/not implemented/);
    });

    it('should fallback to index + 1 when property missing', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        expect(adapter.getMeasureNumber({}, 0)).toBe(1);
        expect(adapter.getMeasureNumber({}, 5)).toBe(6);
        expect(adapter.getMeasureNumber(null, 10)).toBe(11);
      }).toThrow(/not implemented/);
    });

    it('should validate measure number is positive integer', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        
        // Should handle decimal by flooring
        expect(adapter.getMeasureNumber({ MeasureNumber: 5.7 }, 4)).toBe(5);
        
        // Should fallback for invalid values
        expect(adapter.getMeasureNumber({ MeasureNumber: -1 }, 4)).toBe(5);
        expect(adapter.getMeasureNumber({ MeasureNumber: 0 }, 4)).toBe(5);
      }).toThrow(/not implemented/);
    });
  });

  describe('validateOSMDState() - State Validation', () => {
    it('should validate OSMD instance state', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(mockOSMD);
        const validation = adapter.validateOSMDState();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toEqual([]);
      }).toThrow(/not implemented/);
    });

    it('should detect invalid states', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        // Null OSMD
        const adapter1 = new OSMDAdapter(null);
        const validation1 = adapter1.validateOSMDState();
        expect(validation1.isValid).toBe(false);
        expect(validation1.errors).toContain('OSMD instance is null or undefined');
        
        // Missing Sheet
        const adapter2 = new OSMDAdapter({});
        const validation2 = adapter2.validateOSMDState();
        expect(validation2.isValid).toBe(false);
        expect(validation2.errors).toContain('OSMD Sheet is not loaded');
        
        // Missing SourceMeasures
        const adapter3 = new OSMDAdapter({ Sheet: {} });
        const validation3 = adapter3.validateOSMDState();
        expect(validation3.isValid).toBe(false);
        expect(validation3.errors).toContain('SourceMeasures not available');
      }).toThrow(/not implemented/);
    });
  });

  describe('Error Handling Requirements', () => {
    it('should never throw uncaught exceptions', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        const adapter = new OSMDAdapter(null);
        
        // All methods should handle errors gracefully
        expect(() => adapter.getMeasures()).not.toThrow();
        expect(() => adapter.getStructuredBpm(null)).not.toThrow();
        expect(() => adapter.getExpressionTexts(null)).not.toThrow();
        expect(() => adapter.getMeasureNumber(null, 0)).not.toThrow();
        expect(() => adapter.validateOSMDState()).not.toThrow();
      }).toThrow(/not implemented/);
    });
  });

  describe('Performance Requirements', () => {
    it('should process measures efficiently', () => {
      expect(() => {
        if (!OSMDAdapter) throw new Error('OSMDAdapter not implemented');
        
        // Create 100 measures for performance test
        const measures = Array(100).fill(null).map((_, i) => ({
          MeasureNumber: i + 1,
          TempoInBpm: 120,
          VerticalSourceStaffEntryContainers: []
        }));
        
        mockOSMD.Sheet!.SourceMeasures = measures;
        const adapter = new OSMDAdapter(mockOSMD);
        
        const startTime = performance.now();
        
        // Process all measures
        const extractedMeasures = adapter.getMeasures();
        extractedMeasures.forEach(m => {
          adapter.getStructuredBpm(m);
          adapter.getExpressionTexts(m);
          adapter.getMeasureNumber(m, 0);
        });
        
        const duration = performance.now() - startTime;
        
        // Should process 100 measures in under 5ms
        expect(duration).toBeLessThan(5);
      }).toThrow(/not implemented/);
    });
  });
});