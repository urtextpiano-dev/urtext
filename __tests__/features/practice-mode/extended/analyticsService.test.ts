/**
 * Phase 4 Task 4.1: Analytics Service Tests
 * 
 * Tests comprehensive practice analytics tracking and reporting.
 * Verifies event recording, metric calculation, and export functionality.
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { PracticeEvent, AnalyticsReport } from '@/renderer/features/practice-mode/types';

// Import after type definitions
import { AnalyticsService } from '@/renderer/features/practice-mode/services/AnalyticsService';

describe('Analytics Service', () => {
  let analytics: AnalyticsService;
  
  beforeEach(() => {
    analytics = new AnalyticsService();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Event Recording', () => {
    test('should start a new session', () => {
      analytics.startSession();
      
      const report = analytics.generateReport();
      expect(report.sessionId).toMatch(/^session_\d+$/);
      expect(report.events).toHaveLength(1);
      expect(report.events[0].type).toBe('SESSION_START');
    });
    
    test('should record practice events', () => {
      analytics.startSession();
      
      analytics.recordEvent('NOTE_PLAYED', { 
        note: 60, 
        velocity: 80,
        measureIndex: 0 
      });
      
      analytics.recordEvent('NOTE_CORRECT', { 
        note: 60, 
        reactionTimeMs: 250,
        measureIndex: 0 
      });
      
      const report = analytics.generateReport();
      expect(report.events).toHaveLength(3); // Start + 2 events
      expect(report.events[1].type).toBe('NOTE_PLAYED');
      expect(report.events[2].type).toBe('NOTE_CORRECT');
    });
    
    test('should limit event history to prevent memory issues', () => {
      analytics.startSession();
      
      // Record 11000 events
      for (let i = 0; i < 11000; i++) {
        analytics.recordEvent('NOTE_PLAYED', { note: 60 });
      }
      
      const report = analytics.generateReport();
      expect(report.events.length).toBeLessThanOrEqual(5001); // 5000 + session start
    });
    
    test('should track event timestamps accurately', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);
      
      analytics.startSession();
      
      jest.advanceTimersByTime(1000);
      analytics.recordEvent('NOTE_PLAYED', { note: 60 });
      
      jest.advanceTimersByTime(500);
      analytics.recordEvent('NOTE_CORRECT', { note: 60 });
      
      const report = analytics.generateReport();
      expect(report.events[1].timestamp).toBe(startTime + 1000);
      expect(report.events[2].timestamp).toBe(startTime + 1500);
    });
  });
  
  describe('Metric Calculation', () => {
    test('should calculate basic practice metrics', () => {
      analytics.startSession();
      
      // Simulate practice session
      analytics.recordEvent('NOTE_CORRECT', { note: 60, measureIndex: 0 });
      analytics.recordEvent('NOTE_INCORRECT', { note: 62, measureIndex: 0 });
      analytics.recordEvent('NOTE_CORRECT', { note: 64, measureIndex: 1 });
      analytics.recordEvent('NOTE_CORRECT', { note: 65, measureIndex: 1 });
      
      const report = analytics.generateReport();
      const { metrics } = report;
      
      expect(metrics.totalNotes).toBe(4);
      expect(metrics.correctNotes).toBe(3);
      expect(metrics.accuracy).toBeCloseTo(0.75, 2);
    });
    
    test('should identify difficult measures', () => {
      analytics.startSession();
      
      // Measure 0: 1 correct, 3 incorrect (75% error rate)
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 0 });
      analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 0 });
      analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 0 });
      analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 0 });
      
      // Measure 1: 3 correct, 1 incorrect (25% error rate)
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 1 });
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 1 });
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 1 });
      analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 1 });
      
      // Measure 2: all correct (0% error rate)
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 2 });
      analytics.recordEvent('NOTE_CORRECT', { measureIndex: 2 });
      
      const report = analytics.generateReport();
      const difficultMeasures = report.metrics.difficultMeasures;
      
      expect(difficultMeasures).toHaveLength(2); // Only measures with >20% error
      expect(difficultMeasures[0].measureIndex).toBe(0);
      expect(difficultMeasures[0].errorRate).toBe(0.75);
      expect(difficultMeasures[1].measureIndex).toBe(1);
      expect(difficultMeasures[1].errorRate).toBe(0.25);
    });
    
    test('should calculate accuracy progression over time', () => {
      analytics.startSession();
      
      // Start with poor accuracy
      for (let i = 0; i < 10; i++) {
        analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 0 });
      }
      for (let i = 0; i < 10; i++) {
        analytics.recordEvent('NOTE_CORRECT', { measureIndex: 0 });
      }
      
      // Improve over time
      for (let i = 0; i < 15; i++) {
        analytics.recordEvent('NOTE_CORRECT', { measureIndex: 1 });
      }
      for (let i = 0; i < 5; i++) {
        analytics.recordEvent('NOTE_INCORRECT', { measureIndex: 1 });
      }
      
      const report = analytics.generateReport();
      const progression = report.metrics.accuracyProgression;
      
      expect(progression.length).toBeGreaterThan(0);
      expect(progression[0].accuracy).toBeLessThan(progression[progression.length - 1].accuracy);
    });
    
    test('should calculate note-specific metrics', () => {
      analytics.startSession();
      
      // Note 60: played 5 times, 1 error
      for (let i = 0; i < 4; i++) {
        analytics.recordEvent('NOTE_CORRECT', { 
          note: 60, 
          reactionTimeMs: 200 + i * 50 
        });
      }
      analytics.recordEvent('NOTE_INCORRECT', { note: 60 });
      
      // Note 62: played 2 times, 1 error
      analytics.recordEvent('NOTE_CORRECT', { note: 62, reactionTimeMs: 300 });
      analytics.recordEvent('NOTE_INCORRECT', { note: 62 });
      
      const report = analytics.generateReport();
      const noteMetrics = report.metrics.noteMetrics;
      
      expect(noteMetrics.get(60)).toEqual({
        playCount: 5,
        errorCount: 1,
        avgReactionTime: 275 // (200 + 250 + 300 + 350) / 4
      });
      
      expect(noteMetrics.get(62)).toEqual({
        playCount: 2,
        errorCount: 1,
        avgReactionTime: 300
      });
    });
    
    test('should calculate average reaction time', () => {
      analytics.startSession();
      
      analytics.recordEvent('NOTE_CORRECT', { reactionTimeMs: 200 });
      analytics.recordEvent('NOTE_CORRECT', { reactionTimeMs: 300 });
      analytics.recordEvent('NOTE_CORRECT', { reactionTimeMs: 400 });
      analytics.recordEvent('NOTE_INCORRECT', { reactionTimeMs: 500 }); // Should include errors too
      
      const report = analytics.generateReport();
      expect(report.metrics.averageReactionTime).toBe(350);
    });
  });
  
  describe('Session Duration', () => {
    test('should track session duration accurately', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);
      
      analytics.startSession();
      
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      
      const report = analytics.generateReport();
      expect(report.duration).toBe(5 * 60 * 1000);
    });
    
    test('should end session and finalize metrics', () => {
      analytics.startSession();
      analytics.recordEvent('NOTE_CORRECT', { note: 60 });
      analytics.recordEvent('SESSION_END', {});
      
      const report = analytics.generateReport();
      expect(report.events[report.events.length - 1].type).toBe('SESSION_END');
    });
  });
  
  describe('Export Functionality', () => {
    test('should export analytics data as JSON', () => {
      analytics.startSession();
      analytics.recordEvent('NOTE_CORRECT', { note: 60, measureIndex: 0 });
      analytics.recordEvent('NOTE_INCORRECT', { note: 62, measureIndex: 1 });
      
      const json = analytics.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('duration');
      expect(parsed).toHaveProperty('events');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed.events).toHaveLength(3); // Start + 2 events
    });
    
    test('should export analytics data as CSV', () => {
      const startTime = new Date('2025-01-01T10:00:00Z').getTime();
      jest.setSystemTime(startTime);
      
      analytics.startSession();
      analytics.recordEvent('NOTE_CORRECT', { 
        note: 60, 
        reactionTimeMs: 250,
        measureIndex: 0 
      });
      analytics.recordEvent('NOTE_INCORRECT', { 
        note: 62,
        measureIndex: 1 
      });
      
      const csv = analytics.exportToCSV();
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Timestamp,Event Type,Note,Reaction Time (ms),Measure');
      expect(lines[1]).toContain('SESSION_START');
      expect(lines[2]).toContain('NOTE_CORRECT,60,250,0');
      expect(lines[3]).toContain('NOTE_INCORRECT,62,,1');
    });
    
    test('should handle empty sessions gracefully', () => {
      analytics.startSession();
      
      const report = analytics.generateReport();
      expect(report.metrics.accuracy).toBe(0);
      expect(report.metrics.totalNotes).toBe(0);
      expect(report.metrics.difficultMeasures).toHaveLength(0);
      
      const json = analytics.exportToJSON();
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
  
  describe('Real-time Analytics', () => {
    test('should provide real-time metrics during practice', () => {
      analytics.startSession();
      
      // First check
      analytics.recordEvent('NOTE_CORRECT', { note: 60 });
      let report = analytics.generateReport();
      expect(report.metrics.accuracy).toBe(1.0);
      
      // After some errors
      analytics.recordEvent('NOTE_INCORRECT', { note: 62 });
      analytics.recordEvent('NOTE_INCORRECT', { note: 64 });
      report = analytics.generateReport();
      expect(report.metrics.accuracy).toBeCloseTo(0.33, 2);
      
      // After improvement
      analytics.recordEvent('NOTE_CORRECT', { note: 65 });
      analytics.recordEvent('NOTE_CORRECT', { note: 67 });
      report = analytics.generateReport();
      expect(report.metrics.accuracy).toBe(0.6);
    });
    
    test('should track hints and practice assists', () => {
      analytics.startSession();
      
      analytics.recordEvent('HINT_SHOWN', { 
        note: 60,
        attemptNumber: 3,
        measureIndex: 0
      });
      
      const report = analytics.generateReport();
      const hintEvents = report.events.filter(e => e.type === 'HINT_SHOWN');
      
      expect(hintEvents).toHaveLength(1);
      expect(hintEvents[0].data.attemptNumber).toBe(3);
    });
  });
});