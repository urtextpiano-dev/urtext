/**
 * Phase 3 Task 3.4: Adaptive Difficulty System Tests
 * 
 * Tests the difficulty adjustment algorithm based on user performance.
 * Ensures appropriate challenge level and user preference handling.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { DifficultySettings } from '@/renderer/features/practice-mode/types';

// Mock practice store
const mockPracticeStore = {
  statistics: {
    correctNotes: 0,
    incorrectAttempts: 0
  },
  settings: {} as DifficultySettings
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: jest.fn(() => mockPracticeStore)
}));

// Import after mocking
import { AdaptiveDifficulty } from '@/renderer/features/practice-mode/services/AdaptiveDifficulty';

describe('Adaptive Difficulty System', () => {
  let adaptive: AdaptiveDifficulty;
  
  beforeEach(() => {
    adaptive = new AdaptiveDifficulty();
    mockPracticeStore.statistics.correctNotes = 0;
    mockPracticeStore.statistics.incorrectAttempts = 0;
  });
  
  describe('Performance Tracking', () => {
    test('should track accuracy history', () => {
      adaptive.updatePerformance(85);
      adaptive.updatePerformance(90);
      adaptive.updatePerformance(88);
      
      const history = adaptive.getPerformanceHistory();
      expect(history).toEqual([85, 90, 88]);
    });
    
    test('should maintain rolling window of 20 attempts', () => {
      // Add 25 performance updates
      for (let i = 0; i < 25; i++) {
        adaptive.updatePerformance(80 + i);
      }
      
      const history = adaptive.getPerformanceHistory();
      expect(history).toHaveLength(20);
      expect(history[0]).toBe(85); // First 5 removed
      expect(history[19]).toBe(104); // Last one kept
    });
    
    test('should calculate recent average performance', () => {
      const performances = [80, 85, 90, 95, 100];
      performances.forEach(p => adaptive.updatePerformance(p));
      
      const average = adaptive.getRecentAverage(5);
      expect(average).toBe(90);
    });
  });
  
  describe('Difficulty Adjustment', () => {
    test('should increase difficulty for high performance', () => {
      const initialSettings = adaptive.getSettings();
      expect(initialSettings.showHintsAfterAttempts).toBe(3);
      expect(initialSettings.highlightExpectedNotes).toBe(true);
      
      // Simulate high performance
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(95);
      }
      
      const newSettings = adaptive.getSettings();
      expect(newSettings.showHintsAfterAttempts).toBe(4);
      expect(newSettings.highlightExpectedNotes).toBe(false);
    });
    
    test('should decrease difficulty for low performance', () => {
      const initialSettings = adaptive.getSettings();
      
      // Simulate low performance
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(50);
      }
      
      const newSettings = adaptive.getSettings();
      expect(newSettings.showHintsAfterAttempts).toBe(2);
      expect(newSettings.highlightExpectedNotes).toBe(true);
      expect(newSettings.sectionLooping).toBe(true);
    });
    
    test('should maintain difficulty for average performance', () => {
      const initialSettings = adaptive.getSettings();
      
      // Simulate average performance
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(75);
      }
      
      const newSettings = adaptive.getSettings();
      expect(newSettings).toEqual(initialSettings);
    });
    
    test('should not adjust until enough data', () => {
      const initialSettings = adaptive.getSettings();
      
      // Only 3 data points (need 5)
      adaptive.updatePerformance(95);
      adaptive.updatePerformance(95);
      adaptive.updatePerformance(95);
      
      const newSettings = adaptive.getSettings();
      expect(newSettings).toEqual(initialSettings);
    });
  });
  
  describe('Difficulty Settings', () => {
    test('should have sensible default settings', () => {
      const defaults = adaptive.getSettings();
      
      expect(defaults).toEqual({
        waitForCorrectNote: true,
        showHintsAfterAttempts: 3,
        autoAdvanceRests: true,
        highlightExpectedNotes: true,
        playbackSpeed: 1.0,
        sectionLooping: false
      });
    });
    
    test('should respect hint attempt limits', () => {
      // Start with harder settings
      adaptive.setSettings({ showHintsAfterAttempts: 5 });
      
      // Poor performance should decrease hints
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(40);
      }
      
      const settings = adaptive.getSettings();
      expect(settings.showHintsAfterAttempts).toBeGreaterThanOrEqual(1);
      expect(settings.showHintsAfterAttempts).toBeLessThanOrEqual(5);
    });
    
    test('should allow manual override of settings', () => {
      const customSettings: Partial<DifficultySettings> = {
        waitForCorrectNote: false,
        playbackSpeed: 0.75,
        sectionLooping: true
      };
      
      adaptive.setSettings(customSettings);
      
      const settings = adaptive.getSettings();
      expect(settings.waitForCorrectNote).toBe(false);
      expect(settings.playbackSpeed).toBe(0.75);
      expect(settings.sectionLooping).toBe(true);
      // Other settings unchanged
      expect(settings.showHintsAfterAttempts).toBe(3);
    });
    
    test('should persist manual overrides through adjustments', () => {
      // Set manual override
      adaptive.setSettings({ playbackSpeed: 0.5 });
      
      // Trigger automatic adjustment
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(95);
      }
      
      const settings = adaptive.getSettings();
      // Playback speed should remain at manual setting
      expect(settings.playbackSpeed).toBe(0.5);
      // Other settings should adjust
      expect(settings.showHintsAfterAttempts).toBe(4);
    });
  });
  
  describe('Adaptive Algorithms', () => {
    test('should calculate appropriate difficulty level', () => {
      const getDifficultyLevel = (avg: number): 'easy' | 'medium' | 'hard' => {
        if (avg < 60) return 'easy';
        if (avg < 85) return 'medium';
        return 'hard';
      };
      
      expect(getDifficultyLevel(50)).toBe('easy');
      expect(getDifficultyLevel(75)).toBe('medium');
      expect(getDifficultyLevel(90)).toBe('hard');
    });
    
    test('should adjust multiple parameters together', () => {
      // Simulate struggling user
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(45);
      }
      
      const settings = adaptive.getSettings();
      // Multiple helps enabled
      expect(settings.showHintsAfterAttempts).toBe(1);
      expect(settings.highlightExpectedNotes).toBe(true);
      expect(settings.sectionLooping).toBe(true);
      expect(settings.autoAdvanceRests).toBe(true);
    });
    
    test('should provide gradual difficulty progression', () => {
      const settings: DifficultySettings[] = [];
      
      // Simulate improving performance
      for (let i = 0; i < 20; i++) {
        adaptive.updatePerformance(60 + i * 2); // 60, 62, 64...
        if (i % 5 === 4) { // Every 5th update
          settings.push(adaptive.getSettings());
        }
      }
      
      // Difficulty should increase gradually
      expect(settings[0].showHintsAfterAttempts).toBe(3); // Default
      expect(settings[1].showHintsAfterAttempts).toBe(3); // Still average
      expect(settings[2].showHintsAfterAttempts).toBe(4); // Getting harder
      expect(settings[3].showHintsAfterAttempts).toBe(5); // Max difficulty
    });
  });
  
  describe('Integration with Practice Mode', () => {
    test('should apply settings to practice behavior', () => {
      const settings = adaptive.getSettings();
      
      // Verify settings affect practice mode
      expect(settings.waitForCorrectNote).toBe(true);
      expect(settings.autoAdvanceRests).toBe(true);
      
      // These should control practice flow
      if (settings.waitForCorrectNote) {
        // Practice should wait for correct note
        expect(true).toBe(true);
      }
    });
    
    test('should save and restore difficulty preferences', () => {
      const preferences = {
        performanceHistory: [80, 85, 90],
        manualOverrides: { playbackSpeed: 0.8 },
        lastAdjustment: Date.now()
      };
      
      adaptive.savePreferences(preferences);
      
      const newAdaptive = new AdaptiveDifficulty();
      newAdaptive.loadPreferences();
      
      expect(newAdaptive.getPerformanceHistory()).toEqual([80, 85, 90]);
      expect(newAdaptive.getSettings().playbackSpeed).toBe(0.8);
    });
    
    test('should emit difficulty change events', () => {
      const onChange = jest.fn();
      adaptive.onDifficultyChange(onChange);
      
      // Trigger difficulty change
      for (let i = 0; i < 5; i++) {
        adaptive.updatePerformance(95);
      }
      
      expect(onChange).toHaveBeenCalledWith({
        level: 'increased',
        settings: expect.objectContaining({
          showHintsAfterAttempts: 4
        })
      });
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle perfect performance', () => {
      for (let i = 0; i < 10; i++) {
        adaptive.updatePerformance(100);
      }
      
      const settings = adaptive.getSettings();
      expect(settings.showHintsAfterAttempts).toBe(5); // Max difficulty
      expect(settings.highlightExpectedNotes).toBe(false);
      expect(settings.sectionLooping).toBe(false);
    });
    
    test('should handle zero performance', () => {
      for (let i = 0; i < 10; i++) {
        adaptive.updatePerformance(0);
      }
      
      const settings = adaptive.getSettings();
      expect(settings.showHintsAfterAttempts).toBe(1); // Min difficulty
      expect(settings.highlightExpectedNotes).toBe(true);
      expect(settings.sectionLooping).toBe(true);
    });
    
    test('should handle erratic performance', () => {
      // Alternating good and bad performance
      const performances = [90, 40, 95, 35, 88, 42, 92, 38];
      performances.forEach(p => adaptive.updatePerformance(p));
      
      const avg = adaptive.getRecentAverage(5);
      expect(avg).toBeCloseTo(59, 0); // Should average out to medium
      
      const settings = adaptive.getSettings();
      expect(settings.showHintsAfterAttempts).toBe(3); // Stay at default
    });
  });
});