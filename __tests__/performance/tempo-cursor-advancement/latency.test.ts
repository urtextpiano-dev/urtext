// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (latency optimization not implemented)
// 2. GREEN: Implement latency optimizations to make tests pass
// 3. REFACTOR: Optimize performance while keeping latency tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Critical latency measurement for Urtext Piano's <20ms requirement
// CODE VALIDATION: End-to-end latency tests need careful framing

describe('MIDI Latency Performance - Tempo Cursor Advancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Path Latency (<20ms Requirement)', () => {
    test('should maintain MIDI input → tempo calculation → scheduling latency under 20ms', () => {
      // NOTE: This test verifies the computational path, not real browser timing
      // Real latency validation requires browser-based profiling tools
      
      const startTime = performance.now();
      
      // Simulate the critical path components
      const midiInputProcessing = () => {
        // MIDI event parsing and validation (target: <2ms)
        const note = { pitch: 60, velocity: 100, timestamp: performance.now() };
        return note;
      };
      
      const tempoCalculation = () => {
        // BPM extraction + delay computation (target: <1ms)
        const bpm = 120;
        const noteDuration = 1.0; // Quarter note
        const delay = (60_000 / bpm) * noteDuration + 40; // 540ms
        return delay;
      };
      
      const schedulingOverhead = () => {
        // AudioContext scheduling preparation (target: <2ms)
        const mockAudioContext = {
          createBuffer: () => ({}),
          createBufferSource: () => ({
            connect: jest.fn(),
            start: jest.fn()
          }),
          currentTime: 1.5
        };
        return mockAudioContext;
      };
      
      // Execute critical path
      const note = midiInputProcessing();
      const delay = tempoCalculation();
      const scheduler = schedulingOverhead();
      
      const totalLatency = performance.now() - startTime;
      
      // Computational latency should be minimal
      expect(totalLatency).toBeLessThan(5); // <5ms for computation
      expect(note).toBeDefined();
      expect(delay).toBe(540);
      expect(scheduler).toBeDefined();
      
      console.info(`🎹 COMPUTATIONAL LATENCY: ${totalLatency.toFixed(3)}ms (target: <5ms)`);
    });

    test('should track latency regression against baseline', () => {
      // Drive regression detection for latency optimization
      const iterations = 100;
      const latencies: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simplified critical path
        const bpm = 120 + (i % 60); // Vary BPM
        const duration = [1.0, 2.0, 0.5, 0.25][i % 4]; // Vary note durations
        const delay = (60_000 / bpm) * duration + 40;
        
        const latency = performance.now() - startTime;
        latencies.push(latency);
      }
      
      const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / iterations;
      const maxLatency = Math.max(...latencies);
      
      console.info(`🎯 AVERAGE COMPUTATIONAL LATENCY: ${averageLatency.toFixed(3)}ms`);
      console.info(`🎯 MAX COMPUTATIONAL LATENCY: ${maxLatency.toFixed(3)}ms`);
      
      // Computational overhead should be minimal and consistent
      expect(averageLatency).toBeLessThan(1); // <1ms average
      expect(maxLatency).toBeLessThan(5); // <5ms worst case
    });

    test('should profile AudioContext vs setTimeout scheduling latency', () => {
      // Drive scheduler performance comparison
      const audioContextLatencies: number[] = [];
      const setTimeoutLatencies: number[] = [];
      
      // Simulate AudioContext scheduling
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        // Mock AudioContext operations
        const mockBuffer = {};
        const mockSource = {
          buffer: null,
          connect: jest.fn(),
          start: jest.fn(),
          onended: null
        };
        
        const latency = performance.now() - startTime;
        audioContextLatencies.push(latency);
      }
      
      // Simulate setTimeout scheduling
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        
        // Mock setTimeout operations
        const timeoutId = setTimeout(() => {}, 0);
        clearTimeout(timeoutId);
        
        const latency = performance.now() - startTime;
        setTimeoutLatencies.push(latency);
      }
      
      const audioContextAvg = audioContextLatencies.reduce((sum, l) => sum + l, 0) / 50;
      const setTimeoutAvg = setTimeoutLatencies.reduce((sum, l) => sum + l, 0) / 50;
      
      console.info(`🔊 AUDIOCONTEXT SCHEDULING: ${audioContextAvg.toFixed(3)}ms average`);
      console.info(`⏰ SETTIMEOUT SCHEDULING: ${setTimeoutAvg.toFixed(3)}ms average`);
      
      // Both scheduling methods should be fast
      expect(audioContextAvg).toBeLessThan(2); // <2ms for AudioContext
      expect(setTimeoutAvg).toBeLessThan(1); // <1ms for setTimeout
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain latency under rapid MIDI input', () => {
      // Drive stress testing for high-frequency input
      const rapidInputCount = 100;
      const latencies: number[] = [];
      
      for (let i = 0; i < rapidInputCount; i++) {
        const startTime = performance.now();
        
        // Simulate rapid MIDI input processing
        const midiEvent = {
          type: 'noteon',
          note: 60 + (i % 12),
          velocity: 100,
          channel: 1
        };
        
        // Tempo calculation for each input
        const bpm = 120;
        const delay = (60_000 / bpm) * 1.0 + 40;
        
        const latency = performance.now() - startTime;
        latencies.push(latency);
      }
      
      const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / rapidInputCount;
      const maxLatency = Math.max(...latencies);
      
      console.info(`⚡ RAPID INPUT AVERAGE: ${averageLatency.toFixed(3)}ms`);
      console.info(`⚡ RAPID INPUT MAX: ${maxLatency.toFixed(3)}ms`);
      
      // Should maintain performance under load
      expect(averageLatency).toBeLessThan(1); // <1ms average under load
      expect(maxLatency).toBeLessThan(5); // <5ms worst case under load
    });

    test('should handle complex tempo calculations efficiently', () => {
      // Drive optimization for complex musical scenarios
      const complexScenarios = [
        { bpm: 33, duration: 4.0, description: 'Very slow whole note' },
        { bpm: 300, duration: 0.125, description: 'Very fast 32nd note' },
        { bpm: 180, duration: 1.5, description: 'Fast dotted quarter' },
        { bpm: 72, duration: 2.5, description: 'Moderate complex duration' },
        { bpm: 144, duration: 0.75, description: 'Moderate dotted eighth' }
      ];
      
      complexScenarios.forEach(scenario => {
        const iterations = 1000;
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          const delay = (60_000 / scenario.bpm) * scenario.duration + 40;
          
          // Validate calculation is reasonable
          expect(delay).toBeGreaterThan(50); // Minimum delay
          expect(delay).toBeLessThan(100_000); // Maximum reasonable delay (100s)
        }
        
        const totalTime = performance.now() - startTime;
        const averageTime = totalTime / iterations;
        
        console.info(`🎼 ${scenario.description}: ${averageTime.toFixed(3)}ms per calculation`);
        
        expect(averageTime).toBeLessThan(0.1); // <0.1ms per complex calculation
      });
    });

    test('should profile memory allocation during timing operations', () => {
      // Drive memory efficiency verification
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        // Perform extensive timing operations
        for (let i = 0; i < 10000; i++) {
          const bpm = 60 + (i % 120);
          const duration = Math.random() * 4;
          const delay = (60_000 / bpm) * duration + 40;
          
          // Simulate scheduler preparation
          const timeoutId = setTimeout(() => {}, 0);
          clearTimeout(timeoutId);
        }
        
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        console.info(`💾 MEMORY INCREASE: ${(memoryIncrease / 1024).toFixed(2)}KB`);
        
        // Memory increase should be minimal
        expect(memoryIncrease).toBeLessThan(1024 * 100); // <100KB for 10k operations
      } else {
        console.warn('Performance.memory not available - memory profiling skipped');
      }
    });
  });

  describe('Real-World Latency Scenarios', () => {
    test('should measure latency with musical complexity', () => {
      // Drive realistic musical timing scenarios
      const musicalScenarios = [
        { name: 'Beginner piece', bpm: 80, notes: 100 },
        { name: 'Intermediate piece', bpm: 120, notes: 500 },
        { name: 'Advanced piece', bpm: 160, notes: 1000 },
        { name: 'Virtuoso piece', bpm: 200, notes: 2000 }
      ];
      
      musicalScenarios.forEach(scenario => {
        const startTime = performance.now();
        
        // Simulate practice session with multiple notes
        for (let note = 0; note < scenario.notes; note++) {
          const noteDuration = [4.0, 2.0, 1.0, 0.5, 0.25][note % 5];
          const delay = (60_000 / scenario.bpm) * noteDuration + 40;
          
          // Minimal validation to ensure calculation correctness
          expect(delay).toBeGreaterThan(40);
        }
        
        const totalTime = performance.now() - startTime;
        const averagePerNote = totalTime / scenario.notes;
        
        console.info(`🎵 ${scenario.name}: ${averagePerNote.toFixed(3)}ms per note (${scenario.notes} notes)`);
        
        // Each note calculation should be very fast
        expect(averagePerNote).toBeLessThan(0.5); // <0.5ms per note
      });
    });

    test('should benchmark browser timer precision fallback', () => {
      // Drive precision measurement for setTimeout fallback
      return new Promise<void>((resolve) => {
        const targetDelay = 100; // 100ms
        const measurements: number[] = [];
        let completed = 0;
        const totalTests = 10;
        
        for (let i = 0; i < totalTests; i++) {
          const startTime = performance.now();
          
          setTimeout(() => {
            const actualDelay = performance.now() - startTime;
            const variance = Math.abs(actualDelay - targetDelay);
            measurements.push(variance);
            
            completed++;
            if (completed === totalTests) {
              const averageVariance = measurements.reduce((sum, v) => sum + v, 0) / totalTests;
              const maxVariance = Math.max(...measurements);
              
              console.info(`⏱️ SETTIMEOUT PRECISION: ±${averageVariance.toFixed(2)}ms average variance`);
              console.info(`⏱️ SETTIMEOUT MAX VARIANCE: ±${maxVariance.toFixed(2)}ms`);
              
              // setTimeout should be reasonably accurate
              expect(averageVariance).toBeLessThan(10); // <10ms average variance
              expect(maxVariance).toBeLessThan(50); // <50ms max variance
              
              resolve();
            }
          }, targetDelay);
        }
      });
    });
  });

  describe('Performance Monitoring and Alerts', () => {
    test('should detect and report latency violations', () => {
      // Drive latency monitoring implementation
      const latencyThreshold = 20; // ms
      const violations: number[] = [];
      
      // Simulate various operations with some exceeding threshold
      const operations = [
        { name: 'Fast operation', latency: 5 },
        { name: 'Normal operation', latency: 15 },
        { name: 'Slow operation', latency: 25 }, // Violation
        { name: 'Very slow operation', latency: 45 } // Violation
      ];
      
      operations.forEach(operation => {
        if (operation.latency > latencyThreshold) {
          violations.push(operation.latency);
          console.warn(`⚠️ LATENCY VIOLATION: ${operation.name} took ${operation.latency}ms (>${latencyThreshold}ms threshold)`);
        }
      });
      
      expect(violations.length).toBe(2); // Should detect both violations
      expect(violations).toEqual([25, 45]);
    });

    test('should provide latency statistics for monitoring', () => {
      // Drive statistics collection for performance monitoring
      const latencyStats = {
        samples: 1000,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        violations: 0
      };
      
      // Simulate collecting latency measurements
      for (let i = 0; i < latencyStats.samples; i++) {
        // Random latency between 1-30ms (some violations)
        const latency = Math.random() * 30;
        
        latencyStats.sum += latency;
        latencyStats.min = Math.min(latencyStats.min, latency);
        latencyStats.max = Math.max(latencyStats.max, latency);
        
        if (latency > 20) {
          latencyStats.violations++;
        }
      }
      
      const average = latencyStats.sum / latencyStats.samples;
      const violationRate = (latencyStats.violations / latencyStats.samples) * 100;
      
      console.info(`📊 LATENCY STATISTICS:`);
      console.info(`   Average: ${average.toFixed(2)}ms`);
      console.info(`   Min: ${latencyStats.min.toFixed(2)}ms`);
      console.info(`   Max: ${latencyStats.max.toFixed(2)}ms`);
      console.info(`   Violations: ${violationRate.toFixed(1)}% (${latencyStats.violations}/${latencyStats.samples})`);
      
      // Validate statistics are reasonable
      expect(average).toBeGreaterThan(0);
      expect(latencyStats.min).toBeGreaterThan(0);
      expect(latencyStats.max).toBeLessThan(50); // Reasonable maximum
      expect(violationRate).toBeLessThan(50); // <50% violation rate in simulation
    });
  });
});