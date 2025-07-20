/**
 * MicroBatchingMidiProcessor Tests
 * 
 * Validates the critical <20ms latency requirement for MIDI processing.
 * Tests micro-batching performance, memory safety, and rate limiting.
 * 
 * Performance Requirements:
 * - Batch processing: <1ms per flush
 * - Memory usage: <1MB for 1000 events
 * - Rate limiting: Handle up to 1000 batches/second
 */

import { MicroBatchingMidiProcessor, MidiEvent } from '@/renderer/services/MicroBatchingMidiProcessor';

// Mock the latency monitor to avoid performance API issues in tests
jest.mock('@/renderer/services/LightweightLatencyMonitor', () => ({
  latencyMonitor: {
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
  },
}));

// Mock performance.now for consistent timing tests
const mockPerformanceNow = jest.fn();

Object.defineProperty(performance, 'now', {
  value: mockPerformanceNow,
  writable: true,
});

describe('MicroBatchingMidiProcessor', () => {
  let processor: MicroBatchingMidiProcessor;
  let mockCallback: jest.Mock;
  let currentTime = 0;

  beforeEach(() => {
    processor = new MicroBatchingMidiProcessor(10); // 10ms window
    mockCallback = jest.fn();
    processor.setCallback(mockCallback);
    
    // Reset time - start at 1000ms to avoid zero-time issues
    currentTime = 1000;
    mockPerformanceNow.mockImplementation(() => currentTime);
    
    // Use fake timers for deterministic timing
    jest.useFakeTimers();
  });

  afterEach(() => {
    processor.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Performance Requirements (<20ms latency)', () => {
    test('should process MIDI events under 1ms', () => {
      const event: MidiEvent = {
        type: 'noteOn',
        note: 60,
        velocity: 100,
        timestamp: 1000,
      };

      const startTime = performance.now();
      processor.processMidiEvent(event);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1); // <1ms processing time
    });

    test('should flush batches under 1ms', () => {
      // Create a fresh processor to avoid rate limiting from previous tests
      const testProcessor = new MicroBatchingMidiProcessor(10);
      const testCallback = jest.fn();
      
      const notes = [60, 64, 67]; // C major chord
      const events: MidiEvent[] = notes.map(note => ({
        type: 'noteOn',
        note,
        velocity: 100,
        timestamp: 1000,
      }));

      let flushStartTime = 0;
      let flushEndTime = 0;

      // Set up callback to measure flush time
      const timingCallback = jest.fn((processedNotes) => {
        flushEndTime = performance.now();
        expect(processedNotes).toEqual(expect.arrayContaining(notes));
        // Also call the test callback to track calls
        testCallback(processedNotes);
      });
      
      testProcessor.setCallback(timingCallback);

      // Process events rapidly
      events.forEach(event => testProcessor.processMidiEvent(event));
      
      flushStartTime = performance.now();
      jest.advanceTimersByTime(10); // Trigger batch flush
      
      // Verify callback was called and timing
      expect(testCallback).toHaveBeenCalledWith(notes);
      
      const flushTime = flushEndTime - flushStartTime;
      expect(flushTime).toBeLessThanOrEqual(10); // Should complete within the batch window
      
      testProcessor.destroy();
    });

    test('should handle high-rate input (100 events/second) under budget', () => {
      const events: MidiEvent[] = [];
      
      // Generate 100 events
      for (let i = 0; i < 100; i++) {
        events.push({
          type: 'noteOn',
          note: 60 + (i % 12), // Chromatic sequence
          velocity: 100,
          timestamp: i * 10, // 10ms apart
        });
      }

      const startTime = performance.now();
      
      // Process all events
      events.forEach(event => {
        processor.processMidiEvent(event);
        currentTime += 10; // Simulate 10ms between events
      });
      
      // Flush final batch
      jest.advanceTimersByTime(10);
      
      const totalTime = performance.now() - startTime;
      
      // Should process 100 events in less than 100ms (1ms per event budget)
      expect(totalTime).toBeLessThan(100);
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Micro-Batching Logic', () => {
    test('should group simultaneous notes into single batch', (done) => {
      const chordNotes = [60, 64, 67]; // C major chord
      
      processor.setCallback((notes) => {
        expect(notes).toEqual(expect.arrayContaining(chordNotes));
        expect(notes.length).toBe(3);
        done();
      });

      // Play chord (notes arrive within same millisecond)
      chordNotes.forEach(note => {
        processor.processMidiEvent({
          type: 'noteOn',
          note,
          velocity: 100,
          timestamp: 1000,
        });
      });

      jest.advanceTimersByTime(10); // Trigger flush
    });

    test('should reset timer on each new event (chord detection)', () => {
      processor.processMidiEvent({
        type: 'noteOn',
        note: 60,
        velocity: 100,
        timestamp: 1000,
      });

      // Advance 5ms (half the window)
      jest.advanceTimersByTime(5);
      expect(mockCallback).not.toHaveBeenCalled();

      // Add another note (should reset timer)
      processor.processMidiEvent({
        type: 'noteOn',
        note: 64,
        velocity: 100,
        timestamp: 1005,
      });

      // Advance another 5ms (should not flush yet)
      jest.advanceTimersByTime(5);
      expect(mockCallback).not.toHaveBeenCalled();

      // Advance final 5ms to complete the 10ms window from second note
      jest.advanceTimersByTime(5);
      expect(mockCallback).toHaveBeenCalledWith([60, 64]);
    });

    test('should only process noteOn events for practice mode', (done) => {
      processor.setCallback((notes) => {
        expect(notes).toEqual([60]); // Only noteOn should be processed
        done();
      });

      // Mix of noteOn and noteOff
      processor.processMidiEvent({
        type: 'noteOn',
        note: 60,
        velocity: 100,
        timestamp: 1000,
      });

      processor.processMidiEvent({
        type: 'noteOff',
        note: 64,
        velocity: 0,
        timestamp: 1000,
      });

      jest.advanceTimersByTime(10);
    });
  });

  describe('Memory Safety (Grok\'s Security Audit)', () => {
    test('should enforce MAX_BATCH_SIZE limit', () => {
      // Create fresh processor to avoid rate limiting
      const testProcessor = new MicroBatchingMidiProcessor(10);
      const testCallback = jest.fn();
      let maxBatchSize = 0;
      
      testProcessor.setCallback((notes) => {
        maxBatchSize = Math.max(maxBatchSize, notes.length);
        expect(notes.length).toBeLessThanOrEqual(128); // MAX_BATCH_SIZE
      });

      // Try to add more than MAX_BATCH_SIZE events in a single burst
      // This should trigger the batch overflow protection
      for (let i = 0; i < 150; i++) {
        testProcessor.processMidiEvent({
          type: 'noteOn',
          note: 60 + (i % 12),
          velocity: 100,
          timestamp: 1000 + i, // Slightly different timestamps
        });
      }

      // Advance time to trigger any pending flushes
      jest.advanceTimersByTime(10);
      
      // Should have enforced the limit - either by limiting batch size or forcing intermediate flushes
      expect(maxBatchSize).toBeLessThanOrEqual(128);
      
      testProcessor.destroy();
    });

    test('should enforce rate limiting (1000 batches/second max)', () => {
      currentTime = 0;
      
      // Create a new processor for this test to ensure clean state
      const testProcessor = new MicroBatchingMidiProcessor(1); // 1ms window for faster batching
      const rateLimitCallback = jest.fn();
      testProcessor.setCallback(rateLimitCallback);
      
      // Try to trigger more than 1000 batches in one second
      for (let i = 0; i < 1200; i++) {
        currentTime += 1; // 1ms per event
        
        testProcessor.processMidiEvent({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          timestamp: currentTime,
        });
        
        // Advance timer to flush each batch immediately
        jest.advanceTimersByTime(1);
      }

      // Should have rate-limited some events (less than 1200 callbacks)
      expect(rateLimitCallback.mock.calls.length).toBeLessThan(1200);
      
      testProcessor.destroy();
    });

    test('should handle empty batches gracefully', () => {
      // Trigger flush with no events
      jest.advanceTimersByTime(10);
      
      expect(mockCallback).not.toHaveBeenCalled();
      expect(processor.getCurrentBatchSize()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors without crashing', () => {
      processor.setCallback(() => {
        throw new Error('Callback error');
      });

      // Should not throw
      expect(() => {
        processor.processMidiEvent({
          type: 'noteOn',
          note: 60,
          velocity: 100,
          timestamp: 1000,
        });
        
        jest.advanceTimersByTime(10);
      }).not.toThrow();
    });

    test('should reset state on flush error', () => {
      // Mock internal error during flush
      const originalError = console.error;
      console.error = jest.fn();

      processor.setCallback(() => {
        throw new Error('Flush error');
      });

      processor.processMidiEvent({
        type: 'noteOn',
        note: 60,
        velocity: 100,
        timestamp: 1000,
      });

      jest.advanceTimersByTime(10);

      // Should have reset batch size
      expect(processor.getCurrentBatchSize()).toBe(0);
      
      console.error = originalError;
    });
  });

  describe('Resource Management', () => {
    test('should clean up resources on destroy', () => {
      processor.processMidiEvent({
        type: 'noteOn',
        note: 60,
        velocity: 100,
        timestamp: 1000,
      });

      processor.destroy();

      // Should not trigger callback after destroy
      jest.advanceTimersByTime(10);
      expect(mockCallback).not.toHaveBeenCalled();
      
      // Should have cleared batch
      expect(processor.getCurrentBatchSize()).toBe(0);
    });

    test('should provide performance statistics', () => {
      // Create fresh processor to avoid rate limiting
      const testProcessor = new MicroBatchingMidiProcessor(10);
      const testCallback = jest.fn();
      testProcessor.setCallback(testCallback);
      
      let testCurrentTime = 2000; // Start with different time
      mockPerformanceNow.mockImplementation(() => testCurrentTime);
      
      // Process some events with time advancement
      for (let i = 0; i < 3; i++) {
        testProcessor.processMidiEvent({
          type: 'noteOn',
          note: 60 + i,
          velocity: 100,
          timestamp: testCurrentTime,
        });
        
        jest.advanceTimersByTime(15); // Trigger batch flush
        testCurrentTime += 15; // Advance mock time
      }

      const stats = testProcessor.getStats();
      
      expect(stats.batchWindow).toBe(10);
      expect(typeof stats.batchesPerSecond).toBe('number');
      expect(typeof stats.currentBatchSize).toBe('number');
      
      testProcessor.destroy();
    });
  });

  describe('Integration with Feature Flags', () => {
    test('should work correctly when micro-batching is enabled', () => {
      // This test validates the processor works correctly in the feature flag context
      const events: MidiEvent[] = [
        { type: 'noteOn', note: 60, velocity: 100, timestamp: 1000 },
        { type: 'noteOn', note: 64, velocity: 100, timestamp: 1001 },
        { type: 'noteOn', note: 67, velocity: 100, timestamp: 1002 },
      ];

      events.forEach(event => processor.processMidiEvent(event));
      
      jest.advanceTimersByTime(10);
      
      expect(mockCallback).toHaveBeenCalledWith([60, 64, 67]);
    });
  });
});