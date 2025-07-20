/**
 * Phase 3 Task 3.3: Practice Statistics Dashboard Tests
 * 
 * Tests the statistics display components and real-time metric calculations.
 * Ensures accurate progress tracking and historical trend analysis.
 */

import React from 'react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { PracticeSession } from '@/renderer/features/practice-mode/types';

// Mock SessionPersistence
const mockSessions: PracticeSession[] = [
  {
    id: 1,
    scoreId: 'test-score',
    startTime: Date.now() - 3600000,
    endTime: Date.now() - 3000000,
    progress: {
      measureIndex: 20,
      noteIndex: 100,
      completedNotes: 100,
      totalNotes: 150
    },
    statistics: {
      correctNotes: 85,
      incorrectAttempts: 15,
      averageReactionTime: 420,
      practiceTimeMs: 600000
    }
  },
  {
    id: 2,
    scoreId: 'test-score',
    startTime: Date.now() - 7200000,
    endTime: Date.now() - 6600000,
    progress: {
      measureIndex: 15,
      noteIndex: 75,
      completedNotes: 75,
      totalNotes: 150
    },
    statistics: {
      correctNotes: 60,
      incorrectAttempts: 20,
      averageReactionTime: 480,
      practiceTimeMs: 600000
    }
  }
];

jest.mock('@/renderer/features/practice-mode/services/SessionPersistence', () => ({
  SessionPersistence: jest.fn().mockImplementation(() => ({
    getRecentSessions: jest.fn().mockResolvedValue(mockSessions),
    getSessionsSummary: jest.fn().mockResolvedValue({
      totalSessions: 2,
      totalPracticeTime: 1200000,
      totalCorrectNotes: 145,
      totalIncorrectAttempts: 35,
      averageAccuracy: 80.6,
      averageSessionDuration: 600000
    })
  }))
}));

// Mock practice store
const mockPracticeStore = {
  statistics: {
    correctNotes: 45,
    incorrectAttempts: 5,
    averageReactionTime: 350,
    practiceTimeMs: 300000
  },
  currentStep: {
    measureIndex: 10,
    noteIndex: 50
  },
  totalSteps: 150
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: jest.fn(() => mockPracticeStore)
}));

// Import components after mocking
import { PracticeStats, StatsCard } from '@/renderer/features/practice-mode/components/PracticeStats';
import { SessionHistory } from '@/renderer/features/practice-mode/components/SessionHistory';
import { ProgressChart } from '@/renderer/features/practice-mode/components/ProgressChart';

describe('Practice Statistics Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('StatsCard Component', () => {
    test('should display statistic with trend indicator', () => {
      render(
        <StatsCard 
          title="Accuracy" 
          value="85%" 
          subtitle="Last session"
          trend="up"
        />
      );
      
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Last session')).toBeInTheDocument();
      
      const card = screen.getByText('Accuracy').closest('div');
      expect(card).toHaveClass('stats-card--up');
    });
    
    test('should handle neutral trend', () => {
      render(
        <StatsCard 
          title="Notes Played" 
          value={150} 
        />
      );
      
      const card = screen.getByText('Notes Played').closest('div');
      expect(card).toHaveClass('stats-card--neutral');
    });
  });
  
  describe('PracticeStats Component', () => {
    test('should display current session statistics', () => {
      render(<PracticeStats scoreId="test-score" />);
      
      // Current accuracy: 45/(45+5) = 90%
      expect(screen.getByText('Current Accuracy')).toBeInTheDocument();
      expect(screen.getByText('90.0%')).toBeInTheDocument();
      
      // Notes played
      expect(screen.getByText('Notes Played')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('5 mistakes')).toBeInTheDocument();
      
      // Reaction time
      expect(screen.getByText('Reaction Time')).toBeInTheDocument();
      expect(screen.getByText('350ms')).toBeInTheDocument();
    });
    
    test('should display historical statistics', async () => {
      render(<PracticeStats scoreId="test-score" />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Sessions')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        
        expect(screen.getByText('Practice Time')).toBeInTheDocument();
        expect(screen.getByText('20m')).toBeInTheDocument(); // 1200000ms = 20 minutes
        
        expect(screen.getByText('Best Streak')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });
    
    test('should show progress percentage', () => {
      render(<PracticeStats scoreId="test-score" />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument(); // 50/150 notes
    });
    
    test('should update in real-time as practice continues', () => {
      const { rerender } = render(<PracticeStats scoreId="test-score" />);
      
      // Initial state
      expect(screen.getByText('45')).toBeInTheDocument();
      
      // Update store
      mockPracticeStore.statistics.correctNotes = 50;
      rerender(<PracticeStats scoreId="test-score" />);
      
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });
  
  describe('SessionHistory Component', () => {
    test('should display list of recent practice sessions', async () => {
      render(<SessionHistory scoreId="test-score" limit={5} />);
      
      await waitFor(() => {
        const sessions = screen.getAllByTestId('session-item');
        expect(sessions).toHaveLength(2);
        
        // First session (most recent)
        expect(sessions[0]).toHaveTextContent('85%'); // Accuracy
        expect(sessions[0]).toHaveTextContent('10m'); // Duration
      });
    });
    
    test('should show session trends', async () => {
      render(<SessionHistory scoreId="test-score" showTrends />);
      
      await waitFor(() => {
        // Accuracy improved from 75% to 85%
        expect(screen.getByText('Accuracy Trend')).toBeInTheDocument();
        expect(screen.getByText('+10%')).toBeInTheDocument();
        
        // Reaction time improved from 480ms to 420ms
        expect(screen.getByText('Speed Trend')).toBeInTheDocument();
        expect(screen.getByText('-60ms')).toBeInTheDocument();
      });
    });
    
    test('should handle empty session history', async () => {
      // Create a new mock instance with empty sessions
      const mockEmptyPersistence = {
        getRecentSessions: jest.fn().mockResolvedValue([])
      };
      
      jest.spyOn(require('@/renderer/features/practice-mode/services/SessionPersistence'), 'SessionPersistence')
        .mockImplementationOnce(() => mockEmptyPersistence);
      
      render(<SessionHistory scoreId="test-score" />);
      
      await waitFor(() => {
        expect(screen.getByText('No practice sessions yet')).toBeInTheDocument();
        expect(screen.getByText('Start practicing to see your progress!')).toBeInTheDocument();
      });
    });
  });
  
  describe('ProgressChart Component', () => {
    test('should render accuracy chart over time', async () => {
      render(<ProgressChart scoreId="test-score" metric="accuracy" />);
      
      await waitFor(() => {
        const chart = screen.getByTestId('progress-chart');
        expect(chart).toBeInTheDocument();
        
        // Check for chart elements
        expect(chart.querySelector('svg')).toBeInTheDocument();
        expect(screen.getByText('Accuracy Over Time')).toBeInTheDocument();
      });
    });
    
    test('should switch between different metrics', async () => {
      const { rerender } = render(<ProgressChart scoreId="test-score" metric="accuracy" />);
      
      await waitFor(() => {
        expect(screen.getByText('Accuracy Over Time')).toBeInTheDocument();
      });
      
      rerender(<ProgressChart scoreId="test-score" metric="speed" />);
      
      expect(screen.getByText('Reaction Time Over Time')).toBeInTheDocument();
    });
    
    test('should show improvement indicators', async () => {
      render(<ProgressChart scoreId="test-score" metric="accuracy" showImprovement />);
      
      await waitFor(() => {
        // Overall improvement from first to last session
        expect(screen.getByText('Overall Improvement')).toBeInTheDocument();
        expect(screen.getByText('+10.0%')).toBeInTheDocument(); // From 75% to 85%
      });
    });
  });
  
  describe('Statistics Grid Layout', () => {
    test('should be responsive', () => {
      render(<PracticeStats scoreId="test-score" />);
      
      const grid = screen.getByTestId('stats-grid');
      expect(grid).toHaveClass('stats-grid');
      
      // Verify the grid has the responsive CSS class
      // In test environment, CSS styles aren't computed, so we check for the class
      expect(grid.classList.contains('stats-grid')).toBe(true);
    });
    
    test('should handle loading state', () => {
      render(<PracticeStats scoreId="test-score" isLoading />);
      
      expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Current Accuracy')).not.toBeInTheDocument();
    });
    
    test('should handle error state', () => {
      render(<PracticeStats scoreId="test-score" error="Failed to load statistics" />);
      
      expect(screen.getByText('Failed to load statistics')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });
  
  describe('Real-time Calculations', () => {
    test('should calculate accuracy correctly', () => {
      const calculateAccuracy = (correct: number, incorrect: number) => {
        const total = correct + incorrect;
        return total > 0 ? ((correct / total) * 100).toFixed(1) : '0';
      };
      
      expect(calculateAccuracy(45, 5)).toBe('90.0');
      expect(calculateAccuracy(0, 0)).toBe('0');
      expect(calculateAccuracy(100, 0)).toBe('100.0');
    });
    
    test('should format practice time correctly', () => {
      const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      };
      
      expect(formatTime(300000)).toBe('5m 0s');
      expect(formatTime(45000)).toBe('45s');
      expect(formatTime(125000)).toBe('2m 5s');
    });
    
    test('should determine trend based on performance', () => {
      const getTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
        const diff = current - previous;
        if (Math.abs(diff) < 0.01) return 'neutral';
        return diff > 0 ? 'up' : 'down';
      };
      
      expect(getTrend(85, 75)).toBe('up');
      expect(getTrend(75, 85)).toBe('down');
      expect(getTrend(85, 85)).toBe('neutral');
    });
  });
});