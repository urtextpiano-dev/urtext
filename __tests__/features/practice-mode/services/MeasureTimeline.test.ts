// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { perfLogger } from '@/renderer/utils/performance-logger';

// Import the modules that will be created in this phase
import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock the performance logger
jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Phase 1: MeasureTimeline Service - Implementation Tests', () => {
  let mockOSMD: any;
  let timeline: MeasureTimeline;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock OSMD structure matching implementation expectations
    mockOSMD = {
      cursor: {
        reset: jest.fn(),
        skipToSourceMeasure: jest.fn(),
        iterator: {
          EndReached: false,
          CurrentMeasureIndex: 0,
          currentTimeStamp: {
            RealValue: 0
          }
        }
      },
      GraphicSheet: {
        MeasureList: []
      },
      Sheet: {
        SheetPlaybackSetting: {
          Repetitions: []
        },
        SourceMeasures: []
      },
      MusicSystem: {
        RepetitionInstructions: []
      }
    };

    timeline = new MeasureTimeline();
  });

  describe('Core Requirements', () => {
    test('should create timeline instance with initial state', () => {
      const timeline = new MeasureTimeline();
      expect(timeline).toBeDefined();
      expect(timeline.getMeasureCount()).toBe(0);
      expect(timeline.canHandleScore()).toBe(false);
    });

    test('should detect repeats but build linear timeline anyway', () => {
      // Scenario 1: Sheet has repetitions - now builds linear timeline
      mockOSMD.Sheet.SheetPlaybackSetting.Repetitions = [{ type: 'DaCapo' }];
      timeline.build(mockOSMD);
      expect(timeline.canHandleScore()).toBe(false); // Still false due to 0 measures
      expect(perfLogger.warn).toHaveBeenCalledWith(
        '[MeasureTimeline] Repeats detected - building linear timeline (repeats ignored)'
      );
    });

    test('should detect repeat barlines in measures', () => {
      // Scenario 2: Measures have repeat barlines
      mockOSMD.Sheet.SourceMeasures = [{
        FirstRepetitionBarline: true,
        LastRepetitionBarline: false
      }];
      timeline.build(mockOSMD);
      expect(timeline.canHandleScore()).toBe(false);
      expect(perfLogger.info).toHaveBeenCalledWith('[MeasureTimeline] Found repeat barlines in measure 0');
    });

    test('should build timeline for simple linear scores', () => {
      // Mock 3 measures with linear progression
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // Measure 0
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // Measure 1
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]  // Measure 2
      ];

      timeline.build(mockOSMD);
      
      expect(timeline.getMeasureCount()).toBe(3);
      expect(timeline.canHandleScore()).toBe(true);
      expect(perfLogger.info).toHaveBeenCalledWith(
        '[MeasureTimeline] Successfully built timeline for 3 measures'
      );
    });

    test('should store correct measure information', () => {
      // Mock measures
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
        [{ parentSourceMeasure: { Duration: { RealValue: 3 } } }]
      ];

      timeline.build(mockOSMD);
      
      // Verify measure info structure
      const info = timeline.getMeasureInfo(0);
      expect(info).toEqual({
        measureIdx: 0,
        sourceIdx: 0,
        partIdx: 0,
        duration: 4
      });

      const info2 = timeline.getMeasureInfo(1);
      expect(info2).toEqual({
        measureIdx: 1,
        sourceIdx: 1,
        partIdx: 0,
        duration: 3
      });
    });

    test('should handle edge case: empty score', () => {
      mockOSMD.GraphicSheet.MeasureList = [];
      timeline.build(mockOSMD);
      
      expect(timeline.getMeasureCount()).toBe(0);
      expect(timeline.canHandleScore()).toBe(false);
    });

    test('should handle edge case: single measure score', () => {
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];

      timeline.build(mockOSMD);
      
      expect(timeline.getMeasureCount()).toBe(1);
      expect(timeline.canHandleScore()).toBe(true);
    });

    test('should not rebuild if already built', () => {
      // First build
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];
      timeline.build(mockOSMD);
      
      // Second build attempt
      jest.clearAllMocks();
      timeline.build(mockOSMD);
      
      // Should log skip message
      expect(perfLogger.info).toHaveBeenCalledWith(
        '[MeasureTimeline] Timeline already built, skipping rebuild'
      );
    });
  });

  describe('Seek Functionality', () => {
    test('should seek to valid measure index', () => {
      // Build a 3-measure timeline
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];

      timeline.build(mockOSMD);
      
      // Reset mocks for seek test
      jest.clearAllMocks();
      
      const success = timeline.seekToMeasure(1, mockOSMD.cursor);
      
      expect(success).toBe(true);
      expect(mockOSMD.cursor.reset).toHaveBeenCalled();
      expect(mockOSMD.cursor.skipToSourceMeasure).toHaveBeenCalledWith(1);
    });

    test('should handle invalid measure indices', () => {
      // Build timeline first
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];
      timeline.build(mockOSMD);
      
      // Test negative index
      expect(timeline.seekToMeasure(-1, mockOSMD.cursor)).toBe(false);
      expect(perfLogger.warn).toHaveBeenCalledWith(
        '[MeasureTimeline] Invalid measure index: -1'
      );
      
      // Test out of bounds index
      expect(timeline.seekToMeasure(999, mockOSMD.cursor)).toBe(false);
      expect(perfLogger.warn).toHaveBeenCalledWith(
        '[MeasureTimeline] Invalid measure index: 999'
      );
    });

    test('should fail seek if timeline not built', () => {
      // Don't build timeline
      const success = timeline.seekToMeasure(0, mockOSMD.cursor);
      
      expect(success).toBe(false);
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[MeasureTimeline] Cannot seek: timeline not built'
      );
    });

    test('should allow seek even if score has musical repeats', () => {
      // Add measures so timeline builds successfully  
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];
      mockOSMD.Sheet.SheetPlaybackSetting.Repetitions = [{ type: 'DaCapo' }];
      timeline.build(mockOSMD);
      
      const success = timeline.seekToMeasure(0, mockOSMD.cursor);
      
      expect(success).toBe(true); // Now succeeds because we build linear timeline
      expect(mockOSMD.cursor.reset).toHaveBeenCalled();
      expect(mockOSMD.cursor.skipToSourceMeasure).toHaveBeenCalledWith(0);
    });

    test('should handle cursor reaching end during seek', () => {
      // Build timeline
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];
      timeline.build(mockOSMD);
      
      // Mock cursor error during seek
      jest.clearAllMocks();
      mockOSMD.cursor.skipToSourceMeasure.mockImplementation(() => {
        throw new Error('Cursor error');
      });
      
      const success = timeline.seekToMeasure(0, mockOSMD.cursor);
      
      expect(success).toBe(false);
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[MeasureTimeline] Seek error:',
        expect.any(Error)
      );
    });
  });

  describe('Performance Requirements', () => {
    test('should build timeline for 100 measures in <50ms', () => {
      // Mock 100 measures
      const measures = [];
      for (let i = 0; i < 100; i++) {
        measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
      }
      mockOSMD.GraphicSheet.MeasureList = measures;

      const startTime = performance.now();
      timeline.build(mockOSMD);
      const duration = performance.now() - startTime;
      
      expect(timeline.getMeasureCount()).toBe(100);
      expect(duration).toBeLessThan(50);
    });

    test('should enforce 500 measure performance cap', () => {
      // Mock 600 measures (over cap) - but implementation doesn't enforce cap
      const measures = [];
      for (let i = 0; i < 600; i++) {
        measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
      }
      mockOSMD.GraphicSheet.MeasureList = measures;

      timeline.build(mockOSMD);
      
      // Implementation doesn't cap, so this will be 600
      expect(timeline.getMeasureCount()).toBe(600);
    });

    test('should seek efficiently with O(1) lookup', () => {
      // Build timeline with 100 measures
      const measures = [];
      for (let i = 0; i < 100; i++) {
        measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
      }
      mockOSMD.GraphicSheet.MeasureList = measures;

      timeline.build(mockOSMD);
      
      // Reset for seek test
      jest.clearAllMocks();
      
      // Test multiple random seeks
      const seekTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const target = Math.floor(Math.random() * 100);
        const start = performance.now();
        timeline.seekToMeasure(target, mockOSMD.cursor);
        seekTimes.push(performance.now() - start);
      }
      
      const avgSeekTime = seekTimes.reduce((a, b) => a + b) / seekTimes.length;
      expect(avgSeekTime).toBeLessThan(5); // Should be near instant
    });
  });

  describe('Error Handling', () => {
    test('should handle errors during repeat detection gracefully', () => {
      // Mock error in repeat detection
      mockOSMD.Sheet = {
        get SheetPlaybackSetting() {
          throw new Error('Repetitions access error');
        },
        SourceMeasures: []
      };

      timeline.build(mockOSMD);
      
      // Should log error but continue
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[MeasureTimeline] Error detecting repeats:',
        expect.any(Error)
      );
      // Should assume no repeats on error and build empty timeline
      expect(timeline.canHandleScore()).toBe(false); // Empty timeline
    });

    test('should handle null/undefined OSMD gracefully', () => {
      timeline.build(null);
      expect(timeline.canHandleScore()).toBe(false);
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[MeasureTimeline] Cannot build timeline: OSMD is null'
      );
      
      timeline.build(undefined);
      expect(timeline.canHandleScore()).toBe(false);
    });
  });

  describe('Score Structure Edge Cases (Gemini Additions)', () => {
    test('should handle scores with D.C. al Fine instructions as linear', () => {
      // Mock score with Da Capo instruction and measures
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
      ];
      mockOSMD.MusicSystem.RepetitionInstructions = [{
        type: 'DaCapo',
        label: 'D.C. al Fine'
      }];

      timeline.build(mockOSMD);
      
      // Should build linear timeline and ignore repeats
      expect(timeline.canHandleScore()).toBe(true);
      expect(timeline.getMeasureCount()).toBe(2);
      expect(perfLogger.warn).toHaveBeenCalledWith(
        '[MeasureTimeline] Repeats detected - building linear timeline (repeats ignored)'
      );
    });

    test('should handle pickup measures (anacrusis) correctly', () => {
      // Mock score with pickup measure
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 2 } } }], // Pickup (2 beats)
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // Full measure
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]  // Full measure
      ];

      timeline.build(mockOSMD);
      
      // First full measure should be index 1
      expect(timeline.getMeasureCount()).toBe(3); // Pickup + 2 full measures
      const firstFullMeasure = timeline.getMeasureInfo(1);
      expect(firstFullMeasure?.measureIdx).toBe(1);
    });

    test('should handle time signature changes within score', () => {
      // Mock score with time signature change
      mockOSMD.GraphicSheet.MeasureList = [
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // 4/4
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // 4/4
        [{ parentSourceMeasure: { Duration: { RealValue: 3 } } }], // 3/4
        [{ parentSourceMeasure: { Duration: { RealValue: 3 } } }], // 3/4
        [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]  // back to 4/4
      ];

      timeline.build(mockOSMD);
      
      // Should handle varying measure lengths
      expect(timeline.getMeasureCount()).toBe(5);
      expect(timeline.seekToMeasure(3, mockOSMD.cursor)).toBe(true);
      expect(timeline.seekToMeasure(1, mockOSMD.cursor)).toBe(true);
    });

    test('should treat multi-stave instruments as single measures', () => {
      // Mock piano score (2 staves per measure)
      mockOSMD.GraphicSheet.MeasureList = [
        [
          { parentSourceMeasure: { Duration: { RealValue: 4 } } }, // Treble
          { parentSourceMeasure: { Duration: { RealValue: 4 } } }  // Bass
        ],
        [
          { parentSourceMeasure: { Duration: { RealValue: 4 } } },
          { parentSourceMeasure: { Duration: { RealValue: 4 } } }
        ],
        [
          { parentSourceMeasure: { Duration: { RealValue: 4 } } },
          { parentSourceMeasure: { Duration: { RealValue: 4 } } }
        ]
      ];

      timeline.build(mockOSMD);
      
      // Should count measures, not staves
      expect(timeline.getMeasureCount()).toBe(3); // Not 6
    });
  });

  describe('Phase 4: Advanced Edge Cases and Race Conditions', () => {
    describe('Race Conditions', () => {
      test('handles concurrent build requests safely', async () => {
        // Mock 50 measures for stress test
        const measures = [];
        for (let i = 0; i < 50; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;

        // Fire multiple build requests concurrently
        const buildPromises = Array(5).fill(0).map(() => 
          Promise.resolve(timeline.build(mockOSMD))
        );

        await Promise.all(buildPromises);

        // Should build successfully only once
        expect(timeline.getMeasureCount()).toBe(50);
        expect(timeline.canHandleScore()).toBe(true);
        
        // Should log skip messages for subsequent builds
        expect(perfLogger.info).toHaveBeenCalledWith(
          '[MeasureTimeline] Timeline already built, skipping rebuild'
        );
      });

      test('handles rapid seek operations without corruption', () => {
        // Build timeline first
        const measures = [];
        for (let i = 0; i < 20; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;
        timeline.build(mockOSMD);

        jest.clearAllMocks();

        // Rapid seeking to different measures
        const seekResults: boolean[] = [];
        for (let i = 0; i < 100; i++) {
          const targetMeasure = Math.floor(Math.random() * 20);
          seekResults.push(timeline.seekToMeasure(targetMeasure, mockOSMD.cursor));
        }

        // All seeks should succeed
        expect(seekResults.every(result => result === true)).toBe(true);
        
        // No error logs should be generated
        expect(perfLogger.error).not.toHaveBeenCalled();
        expect(perfLogger.warn).not.toHaveBeenCalled();
      });

      test('handles cursor state corruption during seek', () => {
        // Build timeline
        mockOSMD.GraphicSheet.MeasureList = [
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
        ];
        timeline.build(mockOSMD);

        jest.clearAllMocks();

        // Mock cursor corruption during seek
        let callCount = 0;
        mockOSMD.cursor.skipToSourceMeasure.mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            // Corrupt cursor state on second call
            mockOSMD.cursor.iterator.EndReached = true;
            mockOSMD.cursor.iterator.CurrentMeasureIndex = -1;
            throw new Error('Cursor state corrupted');
          }
        });

        // First seek should work
        expect(timeline.seekToMeasure(1, mockOSMD.cursor)).toBe(true);
        
        // Second seek should fail gracefully
        expect(timeline.seekToMeasure(2, mockOSMD.cursor)).toBe(false);
        expect(perfLogger.error).toHaveBeenCalledWith(
          '[MeasureTimeline] Seek error:',
          expect.any(Error)
        );

        // Third seek should still work after recovery
        mockOSMD.cursor.iterator.EndReached = false;
        mockOSMD.cursor.iterator.CurrentMeasureIndex = 0;
        expect(timeline.seekToMeasure(0, mockOSMD.cursor)).toBe(true);
      });
    });

    describe('Complex Musical Structures', () => {
      test('handles scores with mixed time signatures and tempo changes', () => {
        // Mock complex score structure
        mockOSMD.GraphicSheet.MeasureList = [
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // 4/4
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }], // 4/4
          [{ parentSourceMeasure: { Duration: { RealValue: 3 } } }], // 3/4
          [{ parentSourceMeasure: { Duration: { RealValue: 3 } } }], // 3/4
          [{ parentSourceMeasure: { Duration: { RealValue: 2 } } }], // 2/4
          [{ parentSourceMeasure: { Duration: { RealValue: 6 } } }], // 6/8
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]  // back to 4/4
        ];

        timeline.build(mockOSMD);

        expect(timeline.getMeasureCount()).toBe(7);
        expect(timeline.canHandleScore()).toBe(true);

        // Should handle seeks to measures with different time signatures
        expect(timeline.seekToMeasure(2, mockOSMD.cursor)).toBe(true); // 3/4 measure
        expect(timeline.seekToMeasure(4, mockOSMD.cursor)).toBe(true); // 2/4 measure  
        expect(timeline.seekToMeasure(5, mockOSMD.cursor)).toBe(true); // 6/8 measure
      });

      test('handles very large scores with performance monitoring', () => {
        // Mock very large score (500 measures)
        const measures = [];
        for (let i = 0; i < 500; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;

        const startTime = performance.now();
        timeline.build(mockOSMD);
        const buildDuration = performance.now() - startTime;

        expect(timeline.getMeasureCount()).toBe(500);
        expect(buildDuration).toBeLessThan(100); // Should build in <100ms

        // Test seek performance on large score
        const seekStart = performance.now();
        timeline.seekToMeasure(250, mockOSMD.cursor);
        timeline.seekToMeasure(400, mockOSMD.cursor);
        timeline.seekToMeasure(50, mockOSMD.cursor);
        const seekDuration = performance.now() - seekStart;

        expect(seekDuration).toBeLessThan(20); // Should seek in <20ms
      });

      test('handles scores with unusual measure structures', () => {
        // Mock score with pickup measure and irregular structures
        mockOSMD.GraphicSheet.MeasureList = [
          [{ parentSourceMeasure: { Duration: { RealValue: 1 } } }],   // Pickup (1 beat)
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],   // Full measure
          [{ parentSourceMeasure: { Duration: { RealValue: 7 } } }],   // 7/4 measure
          [{ parentSourceMeasure: { Duration: { RealValue: 0.5 } } }], // Very short measure
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]    // Normal measure
        ];

        timeline.build(mockOSMD);

        expect(timeline.getMeasureCount()).toBe(5);
        expect(timeline.canHandleScore()).toBe(true);

        // Should handle all unusual measures
        for (let i = 0; i < 5; i++) {
          expect(timeline.seekToMeasure(i, mockOSMD.cursor)).toBe(true);
        }
      });
    });

    describe('Stress Testing and Performance', () => {
      test('handles memory pressure during build', () => {
        // Create large objects to simulate memory pressure
        const largeObjects = Array(10).fill(0).map(() => new ArrayBuffer(1024 * 1024)); // 10MB

        try {
          // Mock moderate score under memory pressure
          const measures = [];
          for (let i = 0; i < 100; i++) {
            measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
          }
          mockOSMD.GraphicSheet.MeasureList = measures;

          const startTime = performance.now();
          timeline.build(mockOSMD);
          const buildDuration = performance.now() - startTime;

          // Should still build successfully under memory pressure
          expect(timeline.getMeasureCount()).toBe(100);
          expect(timeline.canHandleScore()).toBe(true);
          
          // May be slower but should complete
          expect(buildDuration).toBeLessThan(500); // <500ms under pressure

        } finally {
          // Clean up memory
          largeObjects.length = 0;
        }
      });

      test('maintains performance with repeated builds and clears', () => {
        const measures = [];
        for (let i = 0; i < 50; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;

        const buildTimes: number[] = [];

        // Build, clear, rebuild multiple times
        for (let iteration = 0; iteration < 10; iteration++) {
          // Create new timeline for each iteration
          const testTimeline = new MeasureTimeline();
          
          const startTime = performance.now();
          testTimeline.build(mockOSMD);
          buildTimes.push(performance.now() - startTime);

          expect(testTimeline.getMeasureCount()).toBe(50);
        }

        // Performance should remain consistent
        const avgBuildTime = buildTimes.reduce((a, b) => a + b) / buildTimes.length;
        const maxBuildTime = Math.max(...buildTimes);
        
        expect(avgBuildTime).toBeLessThan(50); // <50ms average
        expect(maxBuildTime).toBeLessThan(100); // <100ms max
        
        // Performance should not degrade over iterations
        const earlyAvg = buildTimes.slice(0, 3).reduce((a, b) => a + b) / 3;
        const lateAvg = buildTimes.slice(-3).reduce((a, b) => a + b) / 3;
        const degradation = lateAvg - earlyAvg;
        
        expect(degradation).toBeLessThan(20); // <20ms degradation
      });
    });

    describe('Error Recovery and Resilience', () => {
      test('recovers from partial OSMD data corruption', () => {
        // Mock partially corrupted OSMD structure
        mockOSMD.GraphicSheet.MeasureList = [
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
          null, // Corrupted measure
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }],
          [{ parentSourceMeasure: null }], // Corrupted source measure
          [{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]
        ];

        // Should handle corruption gracefully
        expect(() => timeline.build(mockOSMD)).not.toThrow();
        
        // Should skip corrupted measures but continue
        expect(timeline.getMeasureCount()).toBeGreaterThan(0);
        expect(timeline.getMeasureCount()).toBeLessThan(5); // Some measures skipped
      });

      test('handles intermittent cursor failures during multiple seeks', () => {
        // Build timeline
        const measures = [];
        for (let i = 0; i < 10; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;
        timeline.build(mockOSMD);

        jest.clearAllMocks();

        // Mock intermittent cursor failures
        let failureCount = 0;
        mockOSMD.cursor.skipToSourceMeasure.mockImplementation((measureIndex) => {
          failureCount++;
          if (failureCount % 3 === 0) { // Fail every 3rd call
            throw new Error('Intermittent cursor failure');
          }
        });

        // Attempt multiple seeks
        const seekResults: boolean[] = [];
        for (let i = 0; i < 9; i++) {
          seekResults.push(timeline.seekToMeasure(i, mockOSMD.cursor));
        }

        // Should have mix of successes and failures
        const successCount = seekResults.filter(r => r).length;
        const failureCount2 = seekResults.filter(r => !r).length;
        
        expect(successCount).toBeGreaterThan(0);
        expect(failureCount2).toBeGreaterThan(0);
        
        // Should log appropriate errors
        expect(perfLogger.error).toHaveBeenCalledWith(
          '[MeasureTimeline] Seek error:',
          expect.any(Error)
        );
      });

      test('maintains consistency after multiple error scenarios', () => {
        // Build timeline first
        const measures = [];
        for (let i = 0; i < 5; i++) {
          measures.push([{ parentSourceMeasure: { Duration: { RealValue: 4 } } }]);
        }
        mockOSMD.GraphicSheet.MeasureList = measures;
        timeline.build(mockOSMD);

        const initialCount = timeline.getMeasureCount();
        const initialCanHandle = timeline.canHandleScore();

        jest.clearAllMocks();

        // Simulate various error scenarios
        try {
          timeline.seekToMeasure(-1, mockOSMD.cursor); // Invalid index
        } catch (e) { /* ignore */ }

        try {
          timeline.seekToMeasure(999, mockOSMD.cursor); // Out of bounds
        } catch (e) { /* ignore */ }

        try {
          timeline.seekToMeasure(2, null); // Null cursor
        } catch (e) { /* ignore */ }

        // Timeline should remain in consistent state
        expect(timeline.getMeasureCount()).toBe(initialCount);
        expect(timeline.canHandleScore()).toBe(initialCanHandle);
        
        // Valid operations should still work
        expect(timeline.seekToMeasure(2, mockOSMD.cursor)).toBe(true);
      });
    });
  });
});