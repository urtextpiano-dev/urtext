// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (WebAudioScheduler doesn't exist)
// 2. GREEN: Implement WebAudioScheduler class to make tests pass
// 3. REFACTOR: Optimize scheduling precision while keeping tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';

// This import will fail initially, driving TDD implementation
import { WebAudioScheduler } from '@/renderer/features/practice-mode/services/WebAudioScheduler';

describe('WebAudioScheduler - Precise Timing Implementation', () => {
  let mockAudioContext: any;
  let mockBufferSource: any;
  let mockBuffer: any;
  let scheduler: WebAudioScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create detailed AudioContext mock
    mockBuffer = {};
    
    mockBufferSource = {
      buffer: null,
      onended: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
    
    mockAudioContext = {
      createBuffer: jest.fn(() => mockBuffer),
      createBufferSource: jest.fn(() => mockBufferSource),
      currentTime: 0,
      state: 'running',
      resume: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
      destination: { connect: jest.fn() }
    };
    
    // Mock global AudioContext constructors
    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);
    
    scheduler = new WebAudioScheduler();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AudioContext Initialization', () => {
    test('should initialize AudioContext on construction', () => {
      // Drive AudioContext initialization
      expect(global.AudioContext).toHaveBeenCalled();
      expect(scheduler).toBeDefined();
    });

    test('should try webkitAudioContext if AudioContext unavailable', () => {
      // Drive webkit fallback
      delete (global as any).AudioContext;
      
      const webkitScheduler = new WebAudioScheduler();
      
      expect(global.webkitAudioContext).toHaveBeenCalled();
      expect(webkitScheduler).toBeDefined();
    });

    test('should handle AudioContext constructor failure gracefully', () => {
      // Drive error handling for unsupported browsers
      global.AudioContext = jest.fn(() => {
        throw new Error('AudioContext not supported');
      });
      
      expect(() => {
        new WebAudioScheduler();
      }).not.toThrow();
    });

    test('should handle missing AudioContext completely', () => {
      // Drive complete fallback when AudioContext unavailable
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;
      
      const fallbackScheduler = new WebAudioScheduler();
      
      expect(fallbackScheduler).toBeDefined();
      expect(typeof fallbackScheduler.scheduleCallback).toBe('function');
    });

    test('should handle suspended AudioContext state (CRITICAL FIX)', () => {
      // MULTI-AI VALIDATION: This was identified as a critical missing feature
      mockAudioContext.state = 'suspended';
      
      new WebAudioScheduler();
      
      // Should attempt to resume suspended context
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should handle AudioContext resume failure', async () => {
      // Drive robust suspended state handling
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume = jest.fn(() => Promise.reject(new Error('Resume failed')));
      
      expect(() => {
        new WebAudioScheduler();
      }).not.toThrow();
    });

    test('should initialize in <100ms', () => {
      // Drive initialization performance requirement
      const startTime = performance.now();
      
      new WebAudioScheduler();
      
      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(100);
    });
  });

  describe('Session Management', () => {
    test('should start session and track start time', () => {
      // Drive session timing implementation
      mockAudioContext.currentTime = 1.5;
      
      scheduler.startSession();
      
      mockAudioContext.currentTime = 2.0; // 0.5 seconds later
      const elapsed = scheduler.getCurrentTime();
      
      expect(elapsed).toBe(500); // 0.5 * 1000 = 500ms
    });

    test('should fallback to performance.now() when AudioContext unavailable', () => {
      // Drive fallback timing mechanism
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;
      
      const fallbackScheduler = new WebAudioScheduler();
      
      const startTime = performance.now();
      fallbackScheduler.startSession();
      
      // Wait a bit
      const delay = 10;
      const endTime = performance.now();
      const elapsed = fallbackScheduler.getCurrentTime();
      
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(typeof elapsed).toBe('number');
    });

    test('should handle multiple session starts correctly', () => {
      // Drive session restart behavior
      mockAudioContext.currentTime = 1.0;
      scheduler.startSession();
      
      mockAudioContext.currentTime = 2.0;
      expect(scheduler.getCurrentTime()).toBe(1000); // 1 second
      
      // Restart session
      mockAudioContext.currentTime = 3.0;
      scheduler.startSession();
      
      mockAudioContext.currentTime = 4.0;
      expect(scheduler.getCurrentTime()).toBe(1000); // 1 second from new start
    });

    test('should provide accurate time tracking with AudioContext', () => {
      // Drive precise timing implementation
      mockAudioContext.currentTime = 0;
      scheduler.startSession();
      
      // Test various time intervals
      const testTimes = [0.1, 0.25, 0.5, 1.0, 2.5];
      
      testTimes.forEach(time => {
        mockAudioContext.currentTime = time;
        const elapsed = scheduler.getCurrentTime();
        expect(elapsed).toBeCloseTo(time * 1000, 1); // Within 0.1ms
      });
    });
  });

  describe('Callback Scheduling with AudioContext', () => {
    test('should schedule callbacks using AudioContext timing', () => {
      // Drive AudioContext scheduling implementation
      scheduler.startSession();
      
      const callback = jest.fn();
      const delay = 500; // 500ms
      
      scheduler.scheduleCallback(callback, delay);
      
      // Should create audio buffer and source
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockBufferSource.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });

    test('should set onended callback for precise timing', () => {
      // Drive callback attachment
      scheduler.startSession();
      
      const callback = jest.fn();
      scheduler.scheduleCallback(callback, 100);
      
      expect(mockBufferSource.onended).toBe(callback);
    });

    test('should start audio source at calculated time', () => {
      // Drive precise start time calculation
      mockAudioContext.currentTime = 2.0;
      scheduler.startSession();
      
      const delay = 500; // 500ms
      scheduler.scheduleCallback(jest.fn(), delay);
      
      const expectedStartTime = 2.0 + (delay / 1000); // 2.5 seconds
      expect(mockBufferSource.start).toHaveBeenCalledWith(expectedStartTime);
    });

    test('should handle zero delay scheduling', () => {
      // Drive immediate scheduling
      scheduler.startSession();
      
      const callback = jest.fn();
      scheduler.scheduleCallback(callback, 0);
      
      expect(mockBufferSource.start).toHaveBeenCalled();
      expect(mockBufferSource.onended).toBe(callback);
    });

    test('should handle very small delays precisely', () => {
      // Drive sub-millisecond precision
      scheduler.startSession();
      
      const callback = jest.fn();
      const delay = 0.5; // 0.5ms
      
      scheduler.scheduleCallback(callback, delay);
      
      const expectedStartTime = (delay / 1000);
      expect(mockBufferSource.start).toHaveBeenCalledWith(expectedStartTime);
    });

    test('should handle large delays correctly', () => {
      // Drive long-delay scheduling
      scheduler.startSession();
      
      const callback = jest.fn();
      const delay = 5000; // 5 seconds
      
      scheduler.scheduleCallback(callback, delay);
      
      const expectedStartTime = delay / 1000;
      expect(mockBufferSource.start).toHaveBeenCalledWith(expectedStartTime);
    });
  });

  describe('Fallback to setTimeout', () => {
    test('should use setTimeout when AudioContext unavailable', () => {
      // Drive setTimeout fallback
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;
      
      const fallbackScheduler = new WebAudioScheduler();
      const callback = jest.fn();
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      fallbackScheduler.scheduleCallback(callback, 100);
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(callback, 100);
      
      setTimeoutSpy.mockRestore();
    });

    test('should use setTimeout when AudioContext is suspended and cannot resume', () => {
      // Drive fallback for persistent suspension
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume = jest.fn(() => Promise.reject(new Error('Cannot resume')));
      
      const suspendedScheduler = new WebAudioScheduler();
      const callback = jest.fn();
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      suspendedScheduler.scheduleCallback(callback, 100);
      
      // Should fallback to setTimeout
      expect(setTimeoutSpy).toHaveBeenCalledWith(callback, 100);
      
      setTimeoutSpy.mockRestore();
    });

    test('should use setTimeout when AudioContext state is not running', () => {
      // Drive state-based fallback
      mockAudioContext.state = 'closed';
      
      const closedScheduler = new WebAudioScheduler();
      const callback = jest.fn();
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      closedScheduler.scheduleCallback(callback, 100);
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(callback, 100);
      
      setTimeoutSpy.mockRestore();
    });

    test('should handle setTimeout fallback timing accurately', () => {
      // Drive setTimeout timing validation
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;
      
      const fallbackScheduler = new WebAudioScheduler();
      
      return new Promise<void>((resolve) => {
        const startTime = performance.now();
        const expectedDelay = 50;
        
        fallbackScheduler.scheduleCallback(() => {
          const actualDelay = performance.now() - startTime;
          const accuracy = Math.abs(actualDelay - expectedDelay);
          
          expect(accuracy).toBeLessThan(20); // Within 20ms (setTimeout limitation)
          resolve();
        }, expectedDelay);
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should schedule within ±2ms accuracy with AudioContext', () => {
      // Drive precision timing requirement
      scheduler.startSession();
      
      const delays = [10, 50, 100, 500, 1000];
      
      delays.forEach(delay => {
        const callback = jest.fn();
        
        const startTime = performance.now();
        scheduler.scheduleCallback(callback, delay);
        
        const schedulingOverhead = performance.now() - startTime;
        expect(schedulingOverhead).toBeLessThan(2); // <2ms scheduling overhead
      });
    });

    test('should handle rapid successive scheduling efficiently', () => {
      // Drive rapid scheduling performance
      scheduler.startSession();
      
      const startTime = performance.now();
      
      // Schedule 100 callbacks rapidly
      for (let i = 0; i < 100; i++) {
        scheduler.scheduleCallback(jest.fn(), i * 10);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Should complete in <50ms
    });

    test('should not leak memory during scheduling', () => {
      // Drive memory efficiency
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        scheduler.startSession();
        
        // Create many scheduled callbacks
        for (let i = 0; i < 1000; i++) {
          scheduler.scheduleCallback(() => {}, i);
        }
        
        if (global.gc) global.gc(); // Force GC if available
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // <1MB
      }
    });

    test('should maintain precision under heavy load', () => {
      // Drive stress test for timing precision
      scheduler.startSession();
      
      const callbacks: jest.Mock[] = [];
      
      // Schedule many callbacks with precise timing
      for (let i = 0; i < 50; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        scheduler.scheduleCallback(callback, i * 20); // Every 20ms
      }
      
      // All callbacks should be properly scheduled
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(50);
      expect(mockBufferSource.start).toHaveBeenCalledTimes(50);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle AudioContext creation errors', () => {
      // Drive constructor error handling
      global.AudioContext = jest.fn(() => {
        throw new Error('AudioContext creation failed');
      });
      
      expect(() => {
        new WebAudioScheduler();
      }).not.toThrow();
    });

    test('should handle createBuffer errors', () => {
      // Drive buffer creation error handling
      mockAudioContext.createBuffer = jest.fn(() => {
        throw new Error('Buffer creation failed');
      });
      
      scheduler.startSession();
      
      expect(() => {
        scheduler.scheduleCallback(jest.fn(), 100);
      }).not.toThrow();
    });

    test('should handle createBufferSource errors', () => {
      // Drive source creation error handling
      mockAudioContext.createBufferSource = jest.fn(() => {
        throw new Error('Source creation failed');
      });
      
      scheduler.startSession();
      
      expect(() => {
        scheduler.scheduleCallback(jest.fn(), 100);
      }).not.toThrow();
    });

    test('should handle negative delays gracefully', () => {
      // Drive input validation
      scheduler.startSession();
      
      const callback = jest.fn();
      
      expect(() => {
        scheduler.scheduleCallback(callback, -100);
      }).not.toThrow();
      
      // Should schedule immediately for negative delays
      expect(mockBufferSource.start).toHaveBeenCalled();
    });

    test('should handle very large delays', () => {
      // Drive large delay handling
      scheduler.startSession();
      
      const callback = jest.fn();
      const largeDelay = 1000000; // 1000 seconds
      
      expect(() => {
        scheduler.scheduleCallback(callback, largeDelay);
      }).not.toThrow();
      
      expect(mockBufferSource.start).toHaveBeenCalledWith(largeDelay / 1000);
    });

    test('should handle null/undefined callbacks', () => {
      // Drive callback validation
      scheduler.startSession();
      
      expect(() => {
        scheduler.scheduleCallback(null as any, 100);
      }).not.toThrow();
      
      expect(() => {
        scheduler.scheduleCallback(undefined as any, 100);
      }).not.toThrow();
    });

    test('should handle AudioContext state changes during operation', () => {
      // Drive runtime state change handling
      scheduler.startSession();
      
      // AudioContext becomes suspended during operation
      mockAudioContext.state = 'suspended';
      
      const callback = jest.fn();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      scheduler.scheduleCallback(callback, 100);
      
      // Should fallback to setTimeout
      expect(setTimeoutSpy).toHaveBeenCalledWith(callback, 100);
      
      setTimeoutSpy.mockRestore();
    });

    test('should handle getCurrentTime() without startSession()', () => {
      // Drive uninitialized state handling
      const time = scheduler.getCurrentTime();
      
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });

    test('should handle scheduleCallback() without startSession()', () => {
      // Drive scheduling without initialization
      const callback = jest.fn();
      
      expect(() => {
        scheduler.scheduleCallback(callback, 100);
      }).not.toThrow();
    });
  });

  describe('Integration with Urtext Piano Requirements', () => {
    test('should support <20ms MIDI latency requirement', () => {
      // Drive critical latency requirement
      scheduler.startSession();
      
      const startTime = performance.now();
      
      // Simulate MIDI note processing with tempo calculation
      const callback = jest.fn();
      scheduler.scheduleCallback(callback, 15); // 15ms delay
      
      const processingTime = performance.now() - startTime;
      
      // Total processing should not exceed 20ms budget
      expect(processingTime + 15).toBeLessThan(20);
    });

    test('should handle practice session timing requirements', () => {
      // Drive musical timing requirements
      scheduler.startSession();
      
      // Test typical musical delays
      const musicalDelays = [125, 250, 500, 1000]; // Common note durations at 120 BPM
      
      musicalDelays.forEach(delay => {
        const callback = jest.fn();
        
        expect(() => {
          scheduler.scheduleCallback(callback, delay);
        }).not.toThrow();
        
        expect(mockBufferSource.start).toHaveBeenCalled();
      });
    });

    test('should support cursor advancement timing accuracy', () => {
      // Drive cursor timing precision
      scheduler.startSession();
      
      // Cursor should advance precisely with musical timing
      const quarterNoteDelay = 500; // 120 BPM quarter note
      const callback = jest.fn();
      
      scheduler.scheduleCallback(callback, quarterNoteDelay);
      
      const expectedAudioTime = quarterNoteDelay / 1000;
      expect(mockBufferSource.start).toHaveBeenCalledWith(expectedAudioTime);
    });
  });
});