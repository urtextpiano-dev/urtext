// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (TempoService doesn't exist)
// 2. GREEN: Implement TempoService class to make tests pass
// 3. REFACTOR: Optimize tempo calculations while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// This import will fail initially, driving TDD implementation
import { TempoServiceImpl } from '@/renderer/features/practice-mode/services/TempoService';

describe('TempoService - Musical Timing Calculations', () => {
  let mockOSMDStore: any;
  let tempoService: TempoServiceImpl;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    mockOSMDStore = {
      tempoMap: {
        defaultBpm: 120,
        averageBpm: 118,
        hasExplicitTempo: true
      }
    };
    
    tempoService = new TempoServiceImpl(mockOSMDStore);
  });

  describe('BPM Extraction and Management', () => {
    test('should extract BPM from osmdStore tempoMap', () => {
      // Drive integration with existing tempo extraction system
      const bpm = tempoService.getCurrentBpm();
      
      expect(bpm).toBe(120); // Should use defaultBpm
      expect(typeof bpm).toBe('number');
      expect(bpm).toBeGreaterThan(0);
    });

    test('should fallback to 90 BPM when tempoMap is null', () => {
      // Drive robust fallback implementation
      const fallbackService = new TempoServiceImpl({ tempoMap: null });
      
      expect(fallbackService.getCurrentBpm()).toBe(90);
    });

    test('should fallback to 90 BPM when tempoMap is undefined', () => {
      // Drive handling of undefined tempoMap
      const fallbackService = new TempoServiceImpl({});
      
      expect(fallbackService.getCurrentBpm()).toBe(90);
    });

    test('should fallback to 90 BPM when defaultBpm is invalid', () => {
      // Drive validation of BPM values
      mockOSMDStore.tempoMap.defaultBpm = NaN;
      const invalidService = new TempoServiceImpl(mockOSMDStore);
      
      expect(invalidService.getCurrentBpm()).toBe(90);
      
      mockOSMDStore.tempoMap.defaultBpm = 0;
      const zeroService = new TempoServiceImpl(mockOSMDStore);
      
      expect(zeroService.getCurrentBpm()).toBe(90);
      
      mockOSMDStore.tempoMap.defaultBpm = -50;
      const negativeService = new TempoServiceImpl(mockOSMDStore);
      
      expect(negativeService.getCurrentBpm()).toBe(90);
    });
  });

  describe('Manual Tempo Override', () => {
    test('should store manual override in localStorage', () => {
      // Drive localStorage integration for manual tempo
      tempoService.setManualOverride(100);
      
      expect(localStorage.getItem('tempo-override')).toBe('100');
    });

    test('should use manual override over osmdStore BPM', () => {
      // Drive override precedence
      tempoService.setManualOverride(85);
      
      expect(tempoService.getCurrentBpm()).toBe(85);
      expect(localStorage.getItem('tempo-override')).toBe('85');
    });

    test('should clear manual override when set to null', () => {
      // Drive override clearing
      tempoService.setManualOverride(100);
      expect(tempoService.getCurrentBpm()).toBe(100);
      
      tempoService.setManualOverride(null);
      expect(localStorage.getItem('tempo-override')).toBeNull();
      expect(tempoService.getCurrentBpm()).toBe(120); // Back to osmdStore
    });

    test('should handle invalid manual override values', () => {
      // Drive input validation for manual overrides
      tempoService.setManualOverride(NaN);
      expect(tempoService.getCurrentBpm()).toBe(120); // Should ignore NaN
      
      tempoService.setManualOverride(0);
      expect(tempoService.getCurrentBpm()).toBe(120); // Should ignore 0
      
      tempoService.setManualOverride(-50);
      expect(tempoService.getCurrentBpm()).toBe(120); // Should ignore negative
    });

    test('should handle corrupted localStorage gracefully', () => {
      // Drive robust localStorage handling
      localStorage.setItem('tempo-override', 'not-a-number');
      
      expect(tempoService.getCurrentBpm()).toBe(120); // Should fall back to osmdStore
    });

    test('should validate manual override range (30-200 BPM)', () => {
      // Drive reasonable BPM range validation
      tempoService.setManualOverride(25); // Too slow
      expect(tempoService.getCurrentBpm()).toBe(120); // Should reject
      
      tempoService.setManualOverride(250); // Too fast
      expect(tempoService.getCurrentBpm()).toBe(120); // Should reject
      
      tempoService.setManualOverride(60); // Valid
      expect(tempoService.getCurrentBpm()).toBe(60); // Should accept
      
      tempoService.setManualOverride(180); // Valid
      expect(tempoService.getCurrentBpm()).toBe(180); // Should accept
    });
  });

  describe('Musical Delay Calculation (CRITICAL)', () => {
    test('should calculate quarter note delays correctly', () => {
      // Drive core musical timing calculation
      // 120 BPM = 500ms per beat
      // Quarter note = 1.0 beat
      const delay = tempoService.computeDelay(1.0);
      const expected = (60_000 / 120) * 1.0 + 40; // 500ms + 40ms breathing = 540ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(540);
    });

    test('should calculate half note delays correctly', () => {
      // Drive half note timing
      const delay = tempoService.computeDelay(2.0); // 2.0 = half note
      const expected = (60_000 / 120) * 2.0 + 40; // 1000ms + 40ms = 1040ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(1040);
    });

    test('should calculate eighth note delays correctly', () => {
      // Drive eighth note timing
      const delay = tempoService.computeDelay(0.5); // 0.5 = eighth note
      const expected = (60_000 / 120) * 0.5 + 40; // 250ms + 40ms = 290ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(290);
    });

    test('should calculate sixteenth note delays correctly', () => {
      // Drive sixteenth note timing
      const delay = tempoService.computeDelay(0.25); // 0.25 = sixteenth note
      const expected = (60_000 / 120) * 0.25 + 40; // 125ms + 40ms = 165ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(165);
    });

    test('should calculate whole note delays correctly', () => {
      // Drive whole note timing
      const delay = tempoService.computeDelay(4.0); // 4.0 = whole note
      const expected = (60_000 / 120) * 4.0 + 40; // 2000ms + 40ms = 2040ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(2040);
    });

    test('should handle dotted notes (1.5x duration)', () => {
      // Drive dotted note calculation
      // Dotted quarter = 1.0 * 1.5 = 1.5 beats
      const delay = tempoService.computeDelay(1.5);
      const expected = (60_000 / 120) * 1.5 + 40; // 750ms + 40ms = 790ms
      
      expect(delay).toBe(expected);
      expect(delay).toBe(790);
    });

    test('should add consistent 40ms breathing room', () => {
      // Drive breathing room constant
      const delay1 = tempoService.computeDelay(1.0);
      const delay2 = tempoService.computeDelay(2.0);
      
      const beatDuration1 = (60_000 / 120) * 1.0;
      const beatDuration2 = (60_000 / 120) * 2.0;
      
      expect(delay1 - beatDuration1).toBe(40);
      expect(delay2 - beatDuration2).toBe(40);
    });

    test('should enforce minimum 50ms delay for very fast tempos', () => {
      // Drive minimum delay enforcement
      mockOSMDStore.tempoMap.defaultBpm = 1000; // Extremely fast
      const fastService = new TempoServiceImpl(mockOSMDStore);
      
      const veryShortDelay = fastService.computeDelay(0.1);
      expect(veryShortDelay).toBeGreaterThanOrEqual(50);
    });

    test('should work with different BPM values', () => {
      // Drive BPM-responsive calculation
      // Test with 60 BPM (slower)
      mockOSMDStore.tempoMap.defaultBpm = 60;
      const slowService = new TempoServiceImpl(mockOSMDStore);
      
      const slowQuarter = slowService.computeDelay(1.0);
      const expectedSlow = (60_000 / 60) * 1.0 + 40; // 1000ms + 40ms = 1040ms
      expect(slowQuarter).toBe(expectedSlow);
      
      // Test with 180 BPM (faster)
      mockOSMDStore.tempoMap.defaultBpm = 180;
      const fastService = new TempoServiceImpl(mockOSMDStore);
      
      const fastQuarter = fastService.computeDelay(1.0);
      const expectedFast = (60_000 / 180) * 1.0 + 40; // 333.33ms + 40ms ≈ 373ms
      expect(Math.round(fastQuarter)).toBe(373);
    });

    test('should handle manual override in delay calculation', () => {
      // Drive integration of manual override with delay calculation
      tempoService.setManualOverride(90);
      
      const delay = tempoService.computeDelay(1.0);
      const expected = (60_000 / 90) * 1.0 + 40; // 666.67ms + 40ms ≈ 707ms
      
      expect(Math.round(delay)).toBe(707);
    });
  });

  describe('Tempo Adjustment Factor', () => {
    test('should apply tempo adjustment factor correctly', () => {
      // Drive tempo adjustment implementation
      const originalBpm = tempoService.getCurrentBpm(); // 120
      
      tempoService.applyTempoAdjustmentFactor(0.1); // 10% faster
      const adjustedBpm = tempoService.getCurrentBpm();
      
      expect(adjustedBpm).toBe(originalBpm * 1.1);
      expect(adjustedBpm).toBe(132);
    });

    test('should handle negative adjustment factors (slower)', () => {
      // Drive tempo reduction
      tempoService.applyTempoAdjustmentFactor(-0.2); // 20% slower
      const adjustedBpm = tempoService.getCurrentBpm();
      
      expect(adjustedBpm).toBe(120 * 0.8);
      expect(adjustedBpm).toBe(96);
    });

    test('should clamp adjustment factor to reasonable limits', () => {
      // Drive adjustment limits
      tempoService.applyTempoAdjustmentFactor(2.0); // 200% faster - should be limited
      const fastBpm = tempoService.getCurrentBpm();
      expect(fastBpm).toBeLessThanOrEqual(200); // Should not exceed reasonable maximum
      
      tempoService.setManualOverride(null); // Reset
      tempoService.applyTempoAdjustmentFactor(-0.9); // 90% slower - should be limited
      const slowBpm = tempoService.getCurrentBpm();
      expect(slowBpm).toBeGreaterThanOrEqual(30); // Should not go below reasonable minimum
    });

    test('should preserve adjustment across BPM source changes', () => {
      // Drive adjustment persistence
      tempoService.applyTempoAdjustmentFactor(0.1); // 10% faster
      
      // Change manual override
      tempoService.setManualOverride(100);
      expect(tempoService.getCurrentBpm()).toBe(110); // 100 * 1.1
      
      // Clear override - should still apply adjustment to osmdStore BPM
      tempoService.setManualOverride(null);
      expect(tempoService.getCurrentBpm()).toBe(132); // 120 * 1.1
    });
  });

  describe('Performance Requirements', () => {
    test('should initialize in <10ms', () => {
      // Drive initialization performance
      const startTime = performance.now();
      
      new TempoServiceImpl(mockOSMDStore);
      
      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(10);
    });

    test('should compute delays in <1ms', () => {
      // Drive calculation performance
      const startTime = performance.now();
      
      // Perform 100 calculations
      for (let i = 0; i < 100; i++) {
        tempoService.computeDelay(Math.random() * 4);
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / 100;
      
      expect(averageTime).toBeLessThan(1);
    });

    test('should not allocate memory during calculations', () => {
      // Drive memory efficiency
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        // Perform many calculations
        for (let i = 0; i < 1000; i++) {
          tempoService.computeDelay(Math.random() * 4);
          tempoService.getCurrentBpm();
        }
        
        if (global.gc) global.gc(); // Force GC if available
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        expect(memoryIncrease).toBeLessThan(100 * 1024); // <100KB
      }
    });

    test('should handle rapid successive calls efficiently', () => {
      // Drive rapid call handling
      const startTime = performance.now();
      
      // Rapid successive calls
      for (let i = 0; i < 1000; i++) {
        tempoService.getCurrentBpm();
        tempoService.computeDelay(1.0);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle extremely high BPM values', () => {
      // Drive high BPM handling
      mockOSMDStore.tempoMap.defaultBpm = 500;
      const extremeService = new TempoServiceImpl(mockOSMDStore);
      
      const delay = extremeService.computeDelay(1.0);
      expect(delay).toBeGreaterThanOrEqual(50); // Still respects minimum
      expect(typeof delay).toBe('number');
      expect(delay).not.toBeNaN();
    });

    test('should handle extremely low BPM values', () => {
      // Drive low BPM handling
      mockOSMDStore.tempoMap.defaultBpm = 10;
      const slowService = new TempoServiceImpl(mockOSMDStore);
      
      const delay = slowService.computeDelay(1.0);
      expect(delay).toBe((60_000 / 10) * 1.0 + 40); // 6040ms
      expect(typeof delay).toBe('number');
      expect(delay).not.toBeNaN();
    });

    test('should handle zero and negative note durations', () => {
      // Drive duration validation
      expect(tempoService.computeDelay(0)).toBe(50); // Minimum delay
      expect(tempoService.computeDelay(-1)).toBe(50); // Minimum delay
      expect(tempoService.computeDelay(-0.5)).toBe(50); // Minimum delay
    });

    test('should handle NaN and Infinity note durations', () => {
      // Drive invalid duration handling
      expect(tempoService.computeDelay(NaN)).toBe(50); // Minimum delay
      expect(tempoService.computeDelay(Infinity)).toBe(50); // Minimum delay
      expect(tempoService.computeDelay(-Infinity)).toBe(50); // Minimum delay
    });

    test('should handle missing osmdStore parameter', () => {
      // Drive null safety
      expect(() => {
        new TempoServiceImpl(null as any);
      }).not.toThrow();
      
      const nullService = new TempoServiceImpl(null as any);
      expect(nullService.getCurrentBpm()).toBe(90); // Should fallback
    });

    test('should handle localStorage quota exceeded', () => {
      // Drive storage error handling
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      expect(() => {
        tempoService.setManualOverride(100);
      }).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });
});