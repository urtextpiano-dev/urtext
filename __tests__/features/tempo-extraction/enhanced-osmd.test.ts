// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import the modules that will be created in this phase
import { TempoWithPosition } from '@/renderer/features/tempo-extraction/types';
import { OSMDAdapter } from '@/renderer/features/tempo-extraction/adapters/OSMDAdapter';

describe('Version Enhanced OSMD Extraction - Implementation Tests', () => {
  // Mock OSMD object structure for testing
  const mockOSMDWithMultipleTempos = {
    Sheet: {
      Title: { TextString: 'Un Sospiro' },
      Composer: { TextString: 'Liszt' }
    },
    GraphicSheet: {
      MeasureList: [
        [{
          MeasureNumber: 1,
          TempoExpressions: [
            {
              instantaneousTempo: {
                tempoInBpm: 25
              },
              label: 'Andantino'
            },
            {
              instantaneousTempo: {
                tempoInBpm: 50
              },
              label: 'Moderato',
              offset: 384
            },
            {
              instantaneousTempo: {
                tempoInBpm: 85
              },
              label: 'Allegro',
              offset: 768
            }
          ]
        }]
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Requirements - Fix the Bug', () => {
    test('should return ALL tempos in a measure, not just the first one', () => {
      // This is THE core bug we're fixing
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      const tempos = adapter.getTemposInMeasure(measure);
      
      // Should return 3 tempos, not 1
      expect(tempos).toHaveLength(3);
      expect(tempos[0].bpm).toBe(25);
      expect(tempos[1].bpm).toBe(50);
      expect(tempos[2].bpm).toBe(85);
    });

    test('should include offset information when available', () => {
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      const tempos = adapter.getTemposInMeasure(measure);
      
      expect(tempos[0].offset).toBeUndefined(); // First tempo has no offset
      expect(tempos[1].offset).toBe(384);
      expect(tempos[2].offset).toBe(768);
    });

    test('should handle empty TempoExpressions array gracefully', () => {
      const emptyMeasure = {
        MeasureNumber: 1,
        TempoExpressions: []
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(emptyMeasure);
      expect(tempos).toHaveLength(0);
    });
  });

  describe('New Method: getTemposInMeasure', () => {
    test('should be added to IOSMDAdapter interface', () => {
      // This tests that the interface is updated
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      expect(adapter.getTemposInMeasure).toBeDefined();
    });

    test('should return TempoWithPosition array with proper structure', () => {
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      const tempos = adapter.getTemposInMeasure(measure);
      
      // Each tempo should have required properties
      tempos.forEach(tempo => {
        expect(tempo).toMatchObject({
          bpm: expect.any(Number),
          confidence: expect.any(Number),
          source: expect.any(String)
        });
      });
    });

    test('should sort tempos by offset when multiple exist', () => {
      const unsortedMeasure = {
        TempoExpressions: [
          { instantaneousTempo: { tempoInBpm: 85 }, offset: 768 },
          { instantaneousTempo: { tempoInBpm: 25 } }, // No offset = 0
          { instantaneousTempo: { tempoInBpm: 50 }, offset: 384 }
        ]
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(unsortedMeasure);
      
      // Should be sorted by offset
      expect(tempos[0].bpm).toBe(25); // offset 0
      expect(tempos[1].bpm).toBe(50); // offset 384
      expect(tempos[2].bpm).toBe(85); // offset 768
    });
  });

  describe('Performance Requirements', () => {
    test('should extract tempos from a measure in less than 1ms', () => {
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      
      const startTime = performance.now();
      const tempos = adapter.getTemposInMeasure(measure);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1); // <1ms per measure
      expect(tempos).toHaveLength(3); // Verify it actually worked
    });

    test('should handle up to 50 tempos per measure without issues', () => {
      const manyTemposMeasure = {
        TempoExpressions: Array.from({ length: 50 }, (_, i) => ({
          instantaneousTempo: { tempoInBpm: 60 + i },
          offset: i * 100
        }))
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(manyTemposMeasure);
      expect(tempos).toHaveLength(50);
    });

    test('should reject more than 50 tempos per measure', () => {
      const tooManyTemposMeasure = {
        TempoExpressions: Array.from({ length: 51 }, (_, i) => ({
          instantaneousTempo: { tempoInBpm: 60 + i }
        }))
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(tooManyTemposMeasure);
      expect(tempos).toHaveLength(50); // Should cap at 50
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain getTempoInBpm for existing code', () => {
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      const tempo = adapter.getTempoInBpm(measure);
      expect(tempo).toBe(25); // Should return first tempo for compatibility
    });

    test('should not break when TempoExpressions is missing', () => {
      const noTempoMeasure = {
        MeasureNumber: 1
        // No TempoExpressions property
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(noTempoMeasure);
      expect(tempos).toHaveLength(0);
    });
  });

  describe('Edge Cases from Multi-AI Review', () => {
    test('should validate offset values are non-negative', () => {
      const negativeOffsetMeasure = {
        TempoExpressions: [
          { instantaneousTempo: { tempoInBpm: 60, offset: -100 } }
        ]
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(negativeOffsetMeasure);
      expect(tempos[0].offset).toBe(0); // Should clamp to 0
    });

    test('should cap offset values at 10000', () => {
      const hugeOffsetMeasure = {
        TempoExpressions: [
          { instantaneousTempo: { tempoInBpm: 60, offset: 99999 } }
        ]
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(hugeOffsetMeasure);
      expect(tempos[0].offset).toBe(10000); // Should cap at 10000
    });

    test('should use stable sort for equal offsets', () => {
      const equalOffsetMeasure = {
        TempoExpressions: [
          { instantaneousTempo: { tempoInBpm: 60 }, label: 'first', offset: 100 },
          { instantaneousTempo: { tempoInBpm: 70 }, label: 'second', offset: 100 },
          { instantaneousTempo: { tempoInBpm: 80 }, label: 'third', offset: 100 }
        ]
      };
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const tempos = adapter.getTemposInMeasure(equalOffsetMeasure);
      
      // Should maintain original order when offsets are equal
      expect(tempos[0].bpm).toBe(60);
      expect(tempos[1].bpm).toBe(70);
      expect(tempos[2].bpm).toBe(80);
    });
  });

  describe('Debug Logging', () => {
    test('should log tempo extraction details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const adapter = new OSMDAdapter(mockOSMDWithMultipleTempos);
      const measure = mockOSMDWithMultipleTempos.GraphicSheet.MeasureList[0][0];
      adapter.getTemposInMeasure(measure);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TEMPO DEBUG]',
        expect.objectContaining({
          measureNumber: 1,
          tempoCount: 3
        })
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});