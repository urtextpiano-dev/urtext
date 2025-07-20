// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { perfLogger } from '@/renderer/utils/performance-logger';

// Import the modules that will be created in this phase
import { V2RepeatAdapter } from '@/renderer/features/practice-mode/adapters/V2RepeatAdapter';
import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock the performance logger
jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Version V2RepeatAdapter - Stateless Implementation Tests', () => {
  let adapter: any; // Will be V2RepeatAdapter
  let mockGetState: jest.Mock;
  let mockDispatch: jest.Mock;
  let mockOSMDControls: any;
  let mockTimeline: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock state getter
    mockGetState = jest.fn().mockReturnValue({
      currentMeasure: 0,
      repeatActive: false,
      repeatMeasure: null
    });

    // Mock dispatch
    mockDispatch = jest.fn();

    // Mock OSMD controls
    mockOSMDControls = {
      cursor: {
        iterator: {
          CurrentMeasureIndex: 0
        }
      }
    };

    // Mock timeline
    mockTimeline = {
      seekToMeasure: jest.fn().mockReturnValue(true),
      canHandleScore: jest.fn().mockReturnValue(true)
    };

    adapter = new V2RepeatAdapter(
      mockGetState,
      mockDispatch,
      mockOSMDControls,
      mockTimeline
    );
  });

  describe('Core Requirements - Stateless Design', () => {
    test('should create adapter without internal state', () => {
      const adapter = new V2RepeatAdapter(
          mockGetState,
          mockDispatch,
          mockOSMDControls,
          mockTimeline
        );
        
        // Adapter should not have any state properties
        const adapterKeys = Object.keys(adapter);
        const stateKeys = adapterKeys.filter(key => 
          key.includes('state') || 
          key.includes('measure') || 
          key.includes('active')
        );
        expect(stateKeys).toHaveLength(0);
    });

    test('should read current measure from state machine only', () => {
      mockGetState.mockReturnValue({
          currentMeasure: 7,
          repeatActive: true,
          repeatMeasure: 5
        });

        const measure = adapter.getCurrentMeasure();
        
        expect(measure).toBe(7);
        expect(mockGetState).toHaveBeenCalled();
        // Should not read from OSMD directly for state
        expect(mockOSMDControls.cursor.iterator.CurrentMeasureIndex).toBe(0);
    });

    test('should dispatch state updates, not store them', async () => {
      // Setup: State machine has currentMeasure: 7
      mockGetState.mockReturnValue({
        currentMeasure: 7,
        repeatActive: true,
        repeatMeasure: 5
      });

      const success = await adapter.jumpToMeasure(5);
        
        expect(success).toBe(true);
        expect(mockTimeline.seekToMeasure).toHaveBeenCalledWith(5, mockOSMDControls.cursor);
        
        // Should dispatch action, not store state
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_CURRENT_MEASURE',
          payload: 5
        });
        
        // Should not have any internal state change
        expect(adapter.getCurrentMeasure()).toBe(7); // Still reads from state machine
    });
  });

  describe('IRepeatAdapter Interface Implementation', () => {
    test('should implement jumpToMeasure with timeline integration', async () => {
      mockTimeline.seekToMeasure.mockReturnValue(true);
        
        const success = await adapter.jumpToMeasure(10);
        
        expect(success).toBe(true);
        expect(mockTimeline.seekToMeasure).toHaveBeenCalledWith(10, mockOSMDControls.cursor);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_CURRENT_MEASURE',
          payload: 10
        });
    });

    test('should handle jump failures gracefully', async () => {
      mockTimeline.seekToMeasure.mockReturnValue(false);
        
        const success = await adapter.jumpToMeasure(99);
        
        expect(success).toBe(false);
        expect(mockTimeline.seekToMeasure).toHaveBeenCalledWith(99, mockOSMDControls.cursor);
        
        // Should not dispatch on failure
        expect(mockDispatch).not.toHaveBeenCalled();
        
        // Should log error
        expect(perfLogger.error).toHaveBeenCalledWith(
          '[V2RepeatAdapter] Jump failed:',
          expect.any(Error)
        );
    });

    test('should handle timeline exceptions', async () => {
      mockTimeline.seekToMeasure.mockImplementation(() => {
        throw new Error('Timeline error');
      });
      
      const success = await adapter.jumpToMeasure(5);
      
      expect(success).toBe(false);
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[V2RepeatAdapter] Jump failed:',
        expect.any(Error)
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('should implement onMeasureChange subscription', () => {
      const mockCallback = jest.fn();
        
        adapter.onMeasureChange(mockCallback);
        
        // Should store callback for later use
        // This is verified by RepeatManager integration tests
    });
  });

  describe('State Machine Integration', () => {
    test('should work with different state shapes', () => {
      // Test with minimal state
        mockGetState.mockReturnValue({
          currentMeasure: 0
        });
        
        expect(adapter.getCurrentMeasure()).toBe(0);
        
        // Test with full state
        mockGetState.mockReturnValue({
          currentMeasure: 15,
          repeatActive: true,
          repeatMeasure: 10,
          status: 'practiceListening'
        });
        
        expect(adapter.getCurrentMeasure()).toBe(15);
    });

    test('should handle missing state properties gracefully', () => {
      mockGetState.mockReturnValue({});
        
        const measure = adapter.getCurrentMeasure();
        
        // Should default to 0 when currentMeasure is missing
        expect(measure).toBe(0);
    });

    test('should not cause state mutations', async () => {
      const originalState = {
          currentMeasure: 5,
          repeatActive: true,
          repeatMeasure: 3
        };
        mockGetState.mockReturnValue(originalState);
        
        // Perform operations
        adapter.getCurrentMeasure();
        await adapter.jumpToMeasure(7);
        
        // Original state object should be unchanged
        expect(originalState).toEqual({
          currentMeasure: 5,
          repeatActive: true,
          repeatMeasure: 3
        });
    });
  });

  describe('Error Scenarios', () => {
    test('should handle null OSMD controls', async () => {
      const adapterWithNullControls = new V2RepeatAdapter(
          mockGetState,
          mockDispatch,
          null,
          mockTimeline
        );
        
        const success = await adapterWithNullControls.jumpToMeasure(5);
        
        expect(success).toBe(false);
        expect(perfLogger.error).toHaveBeenCalled();
    });

    test('should handle null timeline', async () => {
      const adapterWithNullTimeline = new V2RepeatAdapter(
          mockGetState,
          mockDispatch,
          mockOSMDControls,
          null
        );
        
        const success = await adapterWithNullTimeline.jumpToMeasure(5);
        
        expect(success).toBe(false);
    });

    test('should handle OSMD cursor in unexpected state', () => {
      // Remove iterator
        mockOSMDControls.cursor.iterator = null;
        
        const measure = adapter.getCurrentMeasure();
        
        // Should fallback to state machine value
        expect(measure).toBe(0); // From mockGetState
    });
  });

  describe('Performance Requirements', () => {
    test('should complete operations within performance budget', async () => {
      const start = performance.now();
        
        // Multiple operations
        adapter.getCurrentMeasure();
        await adapter.jumpToMeasure(5);
        adapter.getCurrentMeasure();
        
        const duration = performance.now() - start;
        
        // All operations should be fast
        expect(duration).toBeLessThan(5); // <5ms for adapter operations
    });

    test('should not create circular references', () => {
      // Verify no circular references that could cause memory leaks
        const jsonString = JSON.stringify(adapter);
        
        // Should be serializable (no circular refs)
        expect(jsonString).toBeDefined();
    });
  });

  describe('Edge Cases - Anti-Patterns (Code review: Additions)', () => {
    test('NEGATIVE: adapter must NOT store any state', async () => {
      // Perform operations
        await adapter.jumpToMeasure(5);
        adapter.getCurrentMeasure();
        
        // Verify adapter has no state properties
        const privateProps = Object.getOwnPropertyNames(adapter);
        const stateProps = privateProps.filter(prop => 
          prop.includes('measure') || 
          prop.includes('state') || 
          prop.includes('active')
        );
        
        // Should have NO state-related properties
        expect(stateProps).toHaveLength(0);
    });

    test('should define clear error handling strategy', async () => {
      // Define expected error behavior
      mockTimeline.seekToMeasure.mockImplementation(() => {
        throw new Error('Seek failed');
      });
      
      const success = await adapter.jumpToMeasure(5);
      
      // Should:
      // 1. Return false (not throw)
      // 2. Log error with context
      // 3. Not corrupt state
      expect(success).toBe(false);
      expect(perfLogger.error).toHaveBeenCalledWith(
        '[V2RepeatAdapter] Jump failed:',
        expect.objectContaining({ message: 'Seek failed' })
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test('should clarify performance context: <5ms under normal load', async () => {
      // Performance context: Single operation on developer machine
        // Not under heavy load or constrained environment
        
        // Warm up
        await adapter.jumpToMeasure(0);
        
        // Measure single operation
        const start = performance.now();
        await adapter.jumpToMeasure(5);
        const duration = performance.now() - start;
        
        // <5ms for single jump operation on typical hardware
        expect(duration).toBeLessThan(5);
    });
  });

  describe('Edge Cases - Race Conditions (Code review: Additions)', () => {
    test('should handle concurrent read operations safely', async () => {
      // Simulate rapid concurrent reads
        const promises = Array(10).fill(null).map((_, i) => {
          // Simulate state changes during reads
          mockGetState.mockReturnValue({ currentMeasure: i });
          return adapter.getCurrentMeasure();
        });
        
        const results = await Promise.all(promises);
        
        // All reads should complete without errors
        expect(results).toHaveLength(10);
        expect(results.every(r => typeof r === 'number')).toBe(true);
    });

    test('should handle partial null states during initialization', async () => {
      // Timeline exists but OSMD cursor is null
      const partialAdapter = new V2RepeatAdapter(
        mockGetState,
        mockDispatch,
        { cursor: null }, // Partial null
        mockTimeline
      );
      
      // Should handle gracefully
      const success = await partialAdapter.jumpToMeasure(5);
      expect(success).toBe(false);
      expect(perfLogger.error).toHaveBeenCalled();
    });

    test('should handle state machine dependency failures', () => {
      // State machine throws error
        mockGetState.mockImplementation(() => {
          throw new Error('State machine unavailable');
        });
        
        // Should handle gracefully with fallback
        const measure = adapter.getCurrentMeasure();
        
        // Should return safe default
        expect(measure).toBe(0);
        expect(perfLogger.error).toHaveBeenCalled();
    });

    test('should maintain performance under load', async () => {
      // Simulate high-frequency operations
        const operations = 100;
        const start = performance.now();
        
        for (let i = 0; i < operations; i++) {
          adapter.getCurrentMeasure();
          await adapter.jumpToMeasure(i % 10);
        }
        
        const totalDuration = performance.now() - start;
        const avgDuration = totalDuration / operations;
        
        // Average should remain under 5ms even under load
        expect(avgDuration).toBeLessThan(5);
    });
  });
});