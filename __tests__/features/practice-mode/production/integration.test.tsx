/**
 * Version Production Features Integration Tests
 * 
 * Tests the complete integration of all Phase 3 components:
 * - Web Worker score analysis
 * - IndexedDB session persistence  
 * - Statistics dashboard
 * - Adaptive difficulty
 * 
 * Performance requirements:
 * - Score analysis <100ms
 * - Session saves don't block UI
 * - Real-time statistics updates
 * - Memory usage <10MB increase
 */

import React from 'react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { performance } from 'perf_hooks';

// Mock all Phase 3 services
jest.mock('@/renderer/features/practice-mode/services/ScoreAnalyzerService');
jest.mock('@/renderer/features/practice-mode/services/SessionPersistence');
jest.mock('@/renderer/features/practice-mode/services/AdaptiveDifficulty');
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');

// Import types
import type { DifficultyMetrics, PracticeSession } from '@/renderer/features/practice-mode/types';

// Import components (will be created in implementation)
import { ProductionPracticeMode } from '@/renderer/features/practice-mode/components/ProductionPracticeMode';

describe('Version Production Features Integration', () => {
  let mockWorker: any;
  let mockPersistence: any;
  let mockAdaptive: any;
  let mockPracticeStore: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup mocks
    mockWorker = {
      analyzeDifficulty: jest.fn().mockResolvedValue({
        noteCount: 200,
        chordComplexity: 3.2,
        rhythmicComplexity: 4.5,
        keySignatureChanges: 2,
        tempoChanges: 1,
        overallDifficulty: 'intermediate'
      }),
      terminate: jest.fn()
    };
    
    mockPersistence = {
      startSession: jest.fn().mockResolvedValue(1),
      updateProgress: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
      getRecentSessions: jest.fn().mockResolvedValue([]),
      enableAutoSave: jest.fn().mockReturnValue(() => {})
    };
    
    mockAdaptive = {
      updatePerformance: jest.fn(),
      getSettings: jest.fn().mockReturnValue({
        waitForCorrectNote: true,
        showHintsAfterAttempts: 3,
        autoAdvanceRests: true,
        highlightExpectedNotes: true,
        playbackSpeed: 1.0,
        sectionLooping: false
      }),
      setSettings: jest.fn()
    };
    
    mockPracticeStore = {
      isActive: false,
      statistics: {
        correctNotes: 0,
        incorrectAttempts: 0,
        averageReactionTime: 0,
        practiceTimeMs: 0
      },
      startPractice: jest.fn(),
      stopPractice: jest.fn(),
      setDifficultySettings: jest.fn()
    };
    
    // Apply mocks
    require('@/renderer/features/practice-mode/services/ScoreAnalyzerService').ScoreAnalyzerService = jest.fn(() => mockWorker);
    require('@/renderer/features/practice-mode/services/SessionPersistence').SessionPersistence = jest.fn(() => mockPersistence);
    require('@/renderer/features/practice-mode/services/AdaptiveDifficulty').AdaptiveDifficulty = jest.fn(() => mockAdaptive);
    require('@/renderer/features/practice-mode/stores/practiceStore').usePracticeStore.mockReturnValue(mockPracticeStore);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should analyze score difficulty on load without blocking UI', async () => {
    const scoreData = '<score>Complex MusicXML</score>';
    
    const startTime = performance.now();
    render(<ProductionPracticeMode scoreData={scoreData} />);
    const renderTime = performance.now() - startTime;
    
    // UI should render immediately
    expect(renderTime).toBeLessThan(50);
    expect(screen.getByText('Analyzing score...')).toBeInTheDocument();
    
    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Difficulty: Intermediate')).toBeInTheDocument();
      expect(screen.getByText('200 notes')).toBeInTheDocument();
    });
    
    expect(mockWorker.analyzeDifficulty).toHaveBeenCalledWith(scoreData);
  });
  
  test('should start and persist practice session', async () => {
    const user = userEvent.setup({ delay: null });
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    // Wait for analysis
    await waitFor(() => {
      expect(screen.getByText('Start Practice')).toBeEnabled();
    });
    
    // Start practice
    await user.click(screen.getByText('Start Practice'));
    
    expect(mockPersistence.startSession).toHaveBeenCalledWith(expect.any(String));
    expect(mockPracticeStore.startPractice).toHaveBeenCalled();
    
    // Auto-save should be enabled
    expect(mockPersistence.enableAutoSave).toHaveBeenCalled();
  });
  
  test('should display real-time statistics during practice', async () => {
    mockPracticeStore.isActive = true;
    mockPracticeStore.statistics = {
      correctNotes: 25,
      incorrectAttempts: 5,
      averageReactionTime: 380,
      practiceTimeMs: 120000
    };
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    // Statistics should be visible
    expect(screen.getByText('Current Accuracy')).toBeInTheDocument();
    expect(screen.getByText('83.3%')).toBeInTheDocument(); // 25/(25+5)
    expect(screen.getByText('25')).toBeInTheDocument(); // Correct notes
    expect(screen.getByText('380ms')).toBeInTheDocument(); // Reaction time
  });
  
  test('should auto-save progress every 30 seconds', async () => {
    mockPracticeStore.isActive = true;
    const getStateSpy = jest.fn(() => ({
      progress: { measureIndex: 10, noteIndex: 50 },
      statistics: mockPracticeStore.statistics
    }));
    
    mockPersistence.enableAutoSave.mockImplementation((getState: any) => {
      const interval = setInterval(() => {
        mockPersistence.updateProgress(getState());
      }, 30000);
      return () => clearInterval(interval);
    });
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    expect(mockPersistence.updateProgress).toHaveBeenCalled();
    
    // Fast-forward another 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    expect(mockPersistence.updateProgress).toHaveBeenCalledTimes(2);
  });
  
  test('should adapt difficulty based on performance', async () => {
    mockPracticeStore.isActive = true;
    
    const { rerender } = render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    // Simulate good performance
    act(() => {
      mockPracticeStore.statistics = {
        correctNotes: 50,
        incorrectAttempts: 5,
        averageReactionTime: 300,
        practiceTimeMs: 180000
      };
    });
    
    rerender(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    // Should update adaptive difficulty
    await waitFor(() => {
      const accuracy = 50 / (50 + 5) * 100; // 90.9%
      expect(mockAdaptive.updatePerformance).toHaveBeenCalledWith(expect.closeTo(accuracy, 1));
    });
    
    // Difficulty settings should be applied
    expect(mockPracticeStore.setDifficultySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForCorrectNote: true,
        showHintsAfterAttempts: 3
      })
    );
  });
  
  test('should show session history in statistics', async () => {
    const mockSessions: PracticeSession[] = [
      {
        id: 1,
        scoreId: 'test-score',
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3000000,
        progress: { measureIndex: 20, noteIndex: 100, completedNotes: 100, totalNotes: 200 },
        statistics: {
          correctNotes: 85,
          incorrectAttempts: 15,
          averageReactionTime: 420,
          practiceTimeMs: 600000
        }
      }
    ];
    
    mockPersistence.getRecentSessions.mockResolvedValue(mockSessions);
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    await waitFor(() => {
      expect(screen.getByText('Session History')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // Historical accuracy
      expect(screen.getByText('10m')).toBeInTheDocument(); // Session duration
    });
  });
  
  test('should handle session recovery after refresh', async () => {
    const incompleteSession: PracticeSession = {
      id: 1,
      scoreId: 'test-score',
      startTime: Date.now() - 300000,
      progress: { measureIndex: 15, noteIndex: 75, completedNotes: 75, totalNotes: 200 },
      statistics: {
        correctNotes: 60,
        incorrectAttempts: 15,
        averageReactionTime: 400,
        practiceTimeMs: 300000
      }
    };
    
    mockPersistence.recoverLastSession = jest.fn().mockResolvedValue(incompleteSession);
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    await waitFor(() => {
      expect(screen.getByText('Resume Practice')).toBeInTheDocument();
      expect(screen.getByText('You have an incomplete session')).toBeInTheDocument();
    });
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Resume Practice'));
    
    expect(mockPracticeStore.startPractice).toHaveBeenCalled();
    // Should restore previous progress
    expect(screen.getByText('75')).toBeInTheDocument(); // Completed notes
  });
  
  test('should maintain performance under load', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Render with large score
    render(<ProductionPracticeMode scoreData="<score>Large score with 1000 notes</score>" />);
    
    // Simulate extended practice session
    for (let i = 0; i < 100; i++) {
      act(() => {
        mockPracticeStore.statistics.correctNotes = i;
        mockPracticeStore.statistics.practiceTimeMs = i * 1000;
      });
      
      // Force re-render
      if (i % 10 === 0) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    // Memory increase should be minimal
    expect(memoryIncrease).toBeLessThan(10);
  });
  
  test('should coordinate all Phase 3 features seamlessly', async () => {
    const user = userEvent.setup({ delay: null });
    
    // 1. Initial render with score analysis
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    await waitFor(() => {
      expect(screen.getByText('Difficulty: Intermediate')).toBeInTheDocument();
    });
    
    // 2. Start practice with session persistence
    await user.click(screen.getByText('Start Practice'));
    
    expect(mockPersistence.startSession).toHaveBeenCalled();
    expect(mockPracticeStore.startPractice).toHaveBeenCalled();
    
    // 3. Practice with real-time stats
    act(() => {
      mockPracticeStore.isActive = true;
      mockPracticeStore.statistics = {
        correctNotes: 30,
        incorrectAttempts: 10,
        averageReactionTime: 400,
        practiceTimeMs: 240000
      };
    });
    
    // 4. Auto-save triggers
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    expect(mockPersistence.updateProgress).toHaveBeenCalled();
    
    // 5. Adaptive difficulty adjusts
    expect(mockAdaptive.updatePerformance).toHaveBeenCalled();
    
    // 6. Stop practice
    await user.click(screen.getByText('Stop Practice'));
    
    expect(mockPersistence.endSession).toHaveBeenCalled();
    expect(mockPracticeStore.stopPractice).toHaveBeenCalled();
    
    // 7. View statistics
    expect(screen.getByText('Practice Complete')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument(); // Final accuracy
  });
  
  test('should handle errors gracefully', async () => {
    // Simulate worker error
    mockWorker.analyzeDifficulty.mockRejectedValueOnce(new Error('Worker failed'));
    
    render(<ProductionPracticeMode scoreData="<score>Test</score>" />);
    
    await waitFor(() => {
      // Should show error but allow practice
      expect(screen.getByText('Score analysis failed')).toBeInTheDocument();
      expect(screen.getByText('Start Practice')).toBeEnabled();
    });
    
    // Simulate persistence error
    mockPersistence.startSession.mockRejectedValueOnce(new Error('IndexedDB error'));
    
    const user = userEvent.setup();
    await user.click(screen.getByText('Start Practice'));
    
    // Should show error but continue without persistence
    expect(screen.getByText('Session saving disabled')).toBeInTheDocument();
    expect(mockPracticeStore.startPractice).toHaveBeenCalled();
  });
});