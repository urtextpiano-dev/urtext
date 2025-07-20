// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass  
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Import the modules that will be created in this phase
import { performanceLogger } from '../../../src/main/utils/performanceLogger';

describe('Version Performance Instrumentation - Implementation Tests', () => {
  beforeEach(() => {
    // Reset performance marks
    performance.clearMarks();
    performance.clearMeasures();
    jest.clearAllMocks();
    
    // Reset the performance logger state
    performanceLogger.reset();
  });

  describe('Core Requirements', () => {
    test('should create performance logger with required methods', () => {
      // Test that performanceLogger exists with required API
      expect(performanceLogger).toBeDefined();
      expect(performanceLogger.mark).toBeDefined();
      expect(performanceLogger.measure).toBeDefined();
      expect(performanceLogger.measureAsync).toBeDefined();
      expect(performanceLogger.getReport).toBeDefined();
      expect(performanceLogger.reset).toBeDefined();
    });

    test('should mark performance points with metadata', () => {
      performanceLogger.mark('test-mark', { fileSize: 1024 });
      
      // Verify mark was created with metadata
      const marks = performanceLogger.getMarks();
      expect(marks.get('test-mark')).toMatchObject({
        timestamp: expect.any(Number),
        metadata: { fileSize: 1024 }
      });
    });

    test('should measure between two marks', () => {
      performanceLogger.mark('start');
      // Simulate some work
      const work = Array(1000).fill(0).reduce((a, b) => a + b);
      performanceLogger.mark('end');
      
      const duration = performanceLogger.measure('start', 'end');
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    test('should handle missing marks gracefully', () => {
      const duration = performanceLogger.measure('non-existent-start', 'non-existent-end');
      
      expect(duration).toBe(-1);
      // Should log warning but not throw
    });
  });

  describe('Async Operation Measurement', () => {
    test('should measure async operations', async () => {
      const result = await performanceLogger.measureAsync(
        'async-operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'completed';
        }
      );
      
      expect(result).toBe('completed');
      
      const measures = performanceLogger.getMeasures();
      const measure = measures.find((m: any) => m.name === 'async-operation');
      expect(measure).toBeDefined();
      expect(measure!.duration).toBeGreaterThan(40);
      expect(measure!.duration).toBeLessThan(100);
    });

    test('should handle async operation errors', async () => {
      const error = new Error('Test error');
      
      await expect(
        performanceLogger.measureAsync('failing-operation', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
      
      // Should still record the measurement with error
      const measures = performanceLogger.getMeasures();
      const measure = measures.find((m: any) => m.name === 'failing-operation (failed)');
      expect(measure).toBeDefined();
      expect(measure!.metadata!.error).toBe('Test error');
    });
  });

  describe('Report Generation', () => {
    test('should generate performance report', () => {
      performanceLogger.mark('operation-1-start');
      performanceLogger.mark('operation-1-end');
      performanceLogger.measure('operation-1-start', 'operation-1-end', 'Operation 1');
      
      performanceLogger.mark('operation-2-start');
      performanceLogger.mark('operation-2-end');
      performanceLogger.measure('operation-2-start', 'operation-2-end', 'Operation 2');
      
      const report = performanceLogger.getReport();
      
      expect(report).toContain('Performance Report:');
      expect(report).toContain('Operation 1:');
      expect(report).toContain('Operation 2:');
      expect(report).toMatch(/\d+ms/);
    });

    test('should reset all measurements', () => {
      performanceLogger.mark('test-mark');
      performanceLogger.mark('test-mark-2');
      performanceLogger.measure('test-mark', 'test-mark-2');
      
      performanceLogger.reset();
      
      expect(performanceLogger.getMarks().size).toBe(0);
      expect(performanceLogger.getMeasures().length).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    test('should have minimal overhead (<1ms per operation)', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        performanceLogger.mark(`mark-${i}`);
      }
      
      const duration = performance.now() - start;
      const avgOverhead = duration / iterations;
      
      expect(avgOverhead).toBeLessThan(1); // <1ms per mark
    });
  });

  describe('Console Output', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('should log measurements to console', () => {
      performanceLogger.mark('start');
      performanceLogger.mark('end');
      performanceLogger.measure('start', 'end', 'Test Operation');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] Test Operation:')
      );
    });
  });

  describe('TypeScript Types', () => {
    test('should export proper TypeScript interfaces', () => {
      // This test verifies TypeScript compilation
      // It will pass when proper types are defined
      
      interface PerformanceMark {
        timestamp: number;
        metadata?: Record<string, any>;
      }
      
      interface PerformanceMeasure {
        name: string;
        duration: number;
        timestamp: number;
        metadata?: Record<string, any>;
      }
      
      interface IPerformanceLogger {
        mark(name: string, metadata?: Record<string, any>): void;
        measure(startMark: string, endMark: string, measureName?: string): number;
        measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T>;
        getReport(): string;
        reset(): void;
        getMarks?(): Map<string, PerformanceMark>;
        getMeasures?(): PerformanceMeasure[];
      }
      
      // Verify the logger implements the interface
      const logger: IPerformanceLogger = performanceLogger;
      expect(logger).toBeDefined();
    });
  });
});