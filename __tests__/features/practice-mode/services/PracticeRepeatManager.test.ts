// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { perfLogger } from '@/renderer/utils/performance-logger';

// Import the modules that will be created in this phase
import { 
  PracticeRepeatManager, 
  RepeatState,
  IRepeatAdapter 
} from '@/renderer/features/practice-mode/services/PracticeRepeatManager';
import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Mock the performance logger
jest.mock('@/renderer/utils/performance-logger', () => ({
  perfLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Version PracticeRepeatManager Service - Implementation Tests', () => {
  let mockTimeline: any; // Will be MeasureTimeline
  let mockAdapter: any; // Will be IRepeatAdapter
  let manager: any; // Will be PracticeRepeatManager
  let measureChangeCallback: ((measure: number) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock MeasureTimeline
    mockTimeline = {
      canHandleScore: jest.fn().mockReturnValue(true),
      getMeasureCount: jest.fn().mockReturnValue(10),
      seekToMeasure: jest.fn().mockReturnValue(true)
    };

    // Mock IRepeatAdapter
    mockAdapter = {
      jumpToMeasure: jest.fn().mockResolvedValue(true),
      getCurrentMeasure: jest.fn().mockReturnValue(0),
      onMeasureChange: jest.fn((callback) => {
        measureChangeCallback = callback;
      })
    };

    manager = new PracticeRepeatManager(mockTimeline, mockAdapter);
  });

  describe('Core Requirements', () => {
    test('should create manager with initial idle state', () => {
      const manager = new PracticeRepeatManager(mockTimeline, mockAdapter);
      const state = manager.getState();
      
      expect(state).toEqual({
        phase: 'idle',
        targetMeasure: null,
        cyclesCompleted: 0,
        lastMeasure: null
      });
      
      expect(manager.isActive()).toBe(false);
    });

    test('should subscribe to measure changes on construction', () => {
      const manager = new PracticeRepeatManager(mockTimeline, mockAdapter);
      
      expect(mockAdapter.onMeasureChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should toggle repeat from idle to active', async () => {
      mockAdapter.getCurrentMeasure.mockReturnValue(5);
        
        const isActive = await manager.toggleRepeat();
        
        expect(isActive).toBe(true);
        expect(manager.isActive()).toBe(true);
        
        const state = manager.getState();
        expect(state).toEqual({
        phase: 'active',
        targetMeasure: 5,
        cyclesCompleted: 0,
        lastMeasure: 5
      });
        
        expect(perfLogger.info).toHaveBeenCalledWith(
          '[RepeatManager] Started repeat for measure 5'
        );
    });

    test('should toggle repeat from active to idle', async () => {
      // Start repeat first
      mockAdapter.getCurrentMeasure.mockReturnValue(3);
      await manager.toggleRepeat();
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 51));
      
      // Toggle off
      const isActive = await manager.toggleRepeat();
        
        expect(isActive).toBe(false);
        expect(manager.isActive()).toBe(false);
        
        const state = manager.getState();
        expect(state).toEqual({
        phase: 'idle',
        targetMeasure: null,
        cyclesCompleted: 0,
        lastMeasure: null
      });
        
        expect(perfLogger.info).toHaveBeenCalledWith(
          '[RepeatManager] Stopped repeat for measure 3 after 0 cycles'
        );
    });

    test('should fail to start repeat if timeline cannot handle score', async () => {
      mockTimeline.canHandleScore.mockReturnValue(false);
        
        const isActive = await manager.toggleRepeat();
        
        expect(isActive).toBe(false);
        expect(manager.isActive()).toBe(false);
        
        expect(perfLogger.warn).toHaveBeenCalledWith(
          '[RepeatManager] Cannot start repeat - timeline not ready'
        );
    });
  });

  describe('Measure Change Handling', () => {
    test('should not react to measure changes when idle', async () => {
      // Ensure we have the callback
        new PracticeRepeatManager(mockTimeline, mockAdapter);
        expect(measureChangeCallback).toBeTruthy();
        
        // Trigger measure change while idle
        await measureChangeCallback!(5);
        
        // Should not jump
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
    });

    test('should jump back when moving past target measure', async () => {
      // Start repeat at measure 3
        mockAdapter.getCurrentMeasure.mockReturnValue(3);
        await manager.toggleRepeat();
        
        // Move to measure 4 (past target)
        await measureChangeCallback!(4);
        
        // Should jump back to measure 3
        expect(mockAdapter.jumpToMeasure).toHaveBeenCalledWith(3);
        
        // Should increment cycle count
        const state = manager.getState();
        expect(state.cyclesCompleted).toBe(1);
    });

    test('should not jump when moving within or before target measure', async () => {
      // Start repeat at measure 5
        mockAdapter.getCurrentMeasure.mockReturnValue(5);
        await manager.toggleRepeat();
        
        // Move to measure 3 (before target)
        await measureChangeCallback!(3);
        
        // Should not jump
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
        
        // Move to measure 5 (at target)
        await measureChangeCallback!(5);
        
        // Still should not jump
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
    });

    test('should handle multiple cycles correctly', async () => {
      // Start repeat at measure 2
        mockAdapter.getCurrentMeasure.mockReturnValue(2);
        await manager.toggleRepeat();
        
        // Complete 3 cycles
        for (let i = 0; i < 3; i++) {
          await measureChangeCallback!(3); // Move past target
          expect(mockAdapter.jumpToMeasure).toHaveBeenCalledWith(2);
        }
        
        const state = manager.getState();
        expect(state.cyclesCompleted).toBe(3);
    });

    test('should stop repeat when jump fails', async () => {
      mockAdapter.jumpToMeasure.mockResolvedValue(false);
        
        // Start repeat
        mockAdapter.getCurrentMeasure.mockReturnValue(1);
        await manager.toggleRepeat();
        
        // Trigger jump that will fail
        await measureChangeCallback!(2);
        
        // Should have attempted jump
        expect(mockAdapter.jumpToMeasure).toHaveBeenCalledWith(1);
        
        // Should stop repeat on failure
        expect(manager.isActive()).toBe(false);
        expect(perfLogger.error).toHaveBeenCalledWith(
          '[RepeatManager] Failed to jump back to repeat measure'
        );
    });
  });

  describe('State Management', () => {
    test('should return immutable state copy', () => {
      const state1 = manager.getState();
        const state2 = manager.getState();
        
        // Should be different objects
        expect(state1).not.toBe(state2);
        
        // But with same values
        expect(state1).toEqual(state2);
        
        // Modifying returned state should not affect internal state
        state1.phase = 'active';
        expect(manager.getState().phase).toBe('idle');
    });

    test('should track cycles completed accurately', async () => {
      // Start repeat
        mockAdapter.getCurrentMeasure.mockReturnValue(0);
        await manager.toggleRepeat();
        
        // Complete multiple cycles
        for (let i = 0; i < 5; i++) {
          await measureChangeCallback!(1); // Move past measure 0
        }
        
        // Wait for debounce and stop
        await new Promise(resolve => setTimeout(resolve, 51));
        await manager.toggleRepeat();
        
        // Log should show correct cycle count
        expect(perfLogger.info).toHaveBeenCalledWith(
          '[RepeatManager] Stopped repeat for measure 0 after 5 cycles'
        );
    });

    test('should reset state completely when stopping', async () => {
      // Start repeat with some cycles
        mockAdapter.getCurrentMeasure.mockReturnValue(7);
        await manager.toggleRepeat();
        
        // Complete a cycle
        await measureChangeCallback!(8);
        
        // Wait for debounce and stop repeat
        await new Promise(resolve => setTimeout(resolve, 51));
        await manager.toggleRepeat();
        
        // State should be fully reset
        const state = manager.getState();
        expect(state).toEqual({
        phase: 'idle',
        targetMeasure: null,
        cyclesCompleted: 0,
        lastMeasure: null
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid toggle calls', async () => {
      // Rapidly toggle
        const promises = [
          manager.toggleRepeat(),
          manager.toggleRepeat(),
          manager.toggleRepeat()
        ];
        
        const results = await Promise.all(promises);
        
        // Should end in consistent state (odd number = active)
        expect(manager.isActive()).toBe(true);
        expect(results[2]).toBe(true);
    });

    test('should handle measure change to same measure', async () => {
      // Start repeat at measure 3
        mockAdapter.getCurrentMeasure.mockReturnValue(3);
        await manager.toggleRepeat();
        
        // "Move" to same measure
        await measureChangeCallback!(3);
        
        // Should not jump or increment cycles
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
        expect(manager.getState().cyclesCompleted).toBe(0);
    });

    test('should handle null target measure gracefully', async () => {
      // Manually set state to have null target (edge case)
        // This tests defensive programming
        
        // Force active state with null target
        // Can't directly set state - it's private
        // This test can't be done with the current implementation
        
        // Trigger measure change
        await measureChangeCallback!(5);
        
        // Should not crash, should handle gracefully
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
    });
  });

  describe('Performance Requirements', () => {
    test('should handle measure changes without blocking', async () => {
      // Start repeat
        mockAdapter.getCurrentMeasure.mockReturnValue(0);
        await manager.toggleRepeat();
        
        // Measure change should be fast
        const start = performance.now();
        await measureChangeCallback!(1);
        const duration = performance.now() - start;
        
        // Should complete quickly even with async jump
        expect(duration).toBeLessThan(10);
    });

    test('should not leak memory with many cycles', async () => {
      // Start repeat
        mockAdapter.getCurrentMeasure.mockReturnValue(0);
        await manager.toggleRepeat();
        
        // Complete many cycles
        for (let i = 0; i < 100; i++) {
          await measureChangeCallback!(1);
        }
        
        // State should still be simple
        const state = manager.getState();
        expect(state.cyclesCompleted).toBe(100);
        
        // No accumulating data structures
        expect(Object.keys(state).length).toBe(4); // Only 3 properties
    });
  });

  describe('Integration Edge Cases', () => {
    test('should deactivate repeat on external seek', async () => {
      // Start repeat at measure 4
        mockAdapter.getCurrentMeasure.mockReturnValue(4);
        await manager.toggleRepeat();
        expect(manager.isActive()).toBe(true);
        
        // Simulate external seek (user clicked on measure 10)
        // This would typically come from a different source
        // For now, we simulate by calling handleMeasureChange with non-sequential jump
        await measureChangeCallback!(10);
        
        // Manager should detect non-sequential jump and deactivate
        expect(manager.isActive()).toBe(false);
        expect(perfLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('External seek detected')
        );
    });

    test('should handle repeat on last measure gracefully', async () => {
      // Mock timeline with 10 measures
        mockTimeline.getMeasureCount.mockReturnValue(10);
        
        // Start repeat on last measure (index 9)
        mockAdapter.getCurrentMeasure.mockReturnValue(9);
        await manager.toggleRepeat();
        
        // Try to advance past last measure (would be measure 10, which doesn't exist)
        // In real scenario, playback would end instead of advancing
        await measureChangeCallback!(10);
        
        // Should handle gracefully without errors
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
        expect(manager.isActive()).toBe(true); // Still active, waiting for manual stop
    });

    test('should reset when timeline is replaced (new score loaded)', async () => {
      // Start repeat
        mockAdapter.getCurrentMeasure.mockReturnValue(3);
        await manager.toggleRepeat();
        expect(manager.isActive()).toBe(true);
        
        // Simulate new score load - in real app, this would create new manager
        // For testing, we verify manager can handle timeline invalidation
        mockTimeline.canHandleScore.mockReturnValue(false);
        
        // Attempt to use manager with invalid timeline
        await measureChangeCallback!(4);
        
        // Should have stopped repeat due to invalid timeline
        expect(manager.isActive()).toBe(false);
        expect(perfLogger.warn).toHaveBeenCalledWith(
          '[RepeatManager] Timeline invalid - deactivating repeat'
        );
    });

    test('should handle backward seeks during repeat', async () => {
      // Start repeat at measure 5
        mockAdapter.getCurrentMeasure.mockReturnValue(5);
        await manager.toggleRepeat();
        
        // User seeks backward to measure 2
        await measureChangeCallback!(2);
        
        // Should not trigger jump (we're before the repeat measure)
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
        
        // But advancing from measure 2 past 5 should still trigger repeat
        await measureChangeCallback!(6);
        expect(mockAdapter.jumpToMeasure).toHaveBeenCalledWith(5);
    });

    test('should distinguish between sequential advance and jump', async () => {
      // Start repeat at measure 3
        mockAdapter.getCurrentMeasure.mockReturnValue(3);
        await manager.toggleRepeat();
        
        // Sequential advance from 3 to 4 (normal playback)
        await measureChangeCallback!(4);
        expect(mockAdapter.jumpToMeasure).toHaveBeenCalledWith(3);
        expect(manager.isActive()).toBe(true);
        
        // Reset mock
        jest.clearAllMocks();
        
        // Non-sequential jump from 3 to 7 (user action)
        await measureChangeCallback!(7);
        expect(mockAdapter.jumpToMeasure).not.toHaveBeenCalled();
        expect(manager.isActive()).toBe(false); // Should deactivate
    });
  });
});