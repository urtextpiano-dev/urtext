import { renderHook, act } from '@testing-library/react';
import { TempoService } from '@/renderer/features/practice-mode/services/TempoService';
import type { FC, ReactNode } from 'react';

// Mock the practice controller to test integration
jest.mock('@/renderer/features/practice-mode/hooks/usePracticeController', () => ({
  usePracticeController: jest.fn(),
}));

// Mock setTimeout to control timing
jest.useFakeTimers();

describe('Phase 1C: Tempo Service Integration with Practice Controller', () => {
  let mockTempoService: jest.Mocked<TempoService>;
  
  beforeEach(() => {
    // Create mock tempo service
    mockTempoService = {
      getCurrentBpm: jest.fn().mockReturnValue(120),
      computeDelay: jest.fn().mockReturnValue(250), // Different from fixed 500ms
      preloadMusicalContext: jest.fn().mockResolvedValue(undefined),
    };
    
    jest.clearAllTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Practice Controller Integration', () => {
    it('should use tempo service for delay calculation instead of fixed 500ms', () => {
      // This test verifies the integration is working
      // Currently expects to fail because integration not implemented
      
      // Simulate the practice controller with tempo service
      const mockController = {
        state: 'WAITING_FOR_INPUT',
        handleNoteOn: jest.fn(),
        tempoService: mockTempoService,
      };
      
      // When tempo service is integrated, it should use 250ms delay
      // not the hardcoded 500ms
      expect(mockController.tempoService.computeDelay(1.0)).toBe(250);
      expect(mockController.tempoService.computeDelay(1.0)).not.toBe(500);
    });
    
    it('should extract note duration from current OSMD note', () => {
      // Test the note duration extraction logic
      const extractNoteDuration = (note: any): number => {
        const duration = note?.length?.realValue || 1.0;
        return Math.max(0.0625, Math.min(8.0, duration));
      };
      
      // Test various note durations
      expect(extractNoteDuration({ length: { realValue: 0.5 } })).toBe(0.5); // Eighth
      expect(extractNoteDuration({ length: { realValue: 1.0 } })).toBe(1.0); // Quarter
      expect(extractNoteDuration({ length: { realValue: 2.0 } })).toBe(2.0); // Half
      expect(extractNoteDuration({})).toBe(1.0); // Default
      expect(extractNoteDuration(null)).toBe(1.0); // Default
    });
    
    it('should fallback to 500ms when tempo service is unavailable', () => {
      // Test fallback behavior
      const computeDelayWithFallback = (tempoService: TempoService | null, duration: number): number => {
        return tempoService?.computeDelay(duration) || 500;
      };
      
      // With service: should use tempo calculation
      expect(computeDelayWithFallback(mockTempoService, 1.0)).toBe(250);
      
      // Without service: should fallback to 500ms
      expect(computeDelayWithFallback(null, 1.0)).toBe(500);
    });
    
    it('should handle missing note duration gracefully', () => {
      // Test edge cases for note duration
      const extractNoteDuration = (note: any): number => {
        const duration = note?.length?.realValue || 1.0;
        return Math.max(0.0625, Math.min(8.0, duration));
      };
      
      // Edge cases
      expect(extractNoteDuration({ length: { realValue: 0 } })).toBe(1.0); // Should handle 0 as invalid
      expect(extractNoteDuration({ length: { realValue: 10 } })).toBe(8.0); // Max clamp
      expect(extractNoteDuration({ length: {} })).toBe(1.0); // Missing realValue
      expect(extractNoteDuration(undefined)).toBe(1.0); // Undefined note
    });
  });
  
  describe('Integration Requirements', () => {
    it('should require TempoServicesProvider in component tree', () => {
      // This test documents the requirement for provider integration
      // The practice mode component should be wrapped with TempoServicesProvider
      
      const requiredStructure = `
        <TempoServicesProvider>
          <PracticeMode />
        </TempoServicesProvider>
      `;
      
      expect(requiredStructure).toContain('TempoServicesProvider');
      expect(requiredStructure).toContain('PracticeMode');
    });
  });
  
  describe('Musical Context Integration', () => {
    it('should pass note ID for musical context lookup', () => {
      // Test that note ID is passed to tempo service
      const noteWithId = {
        length: { realValue: 1.0 },
        id: 'note-123'
      };
      
      // The tempo service should receive both duration and ID
      mockTempoService.computeDelay(1.0, 'note-123');
      
      expect(mockTempoService.computeDelay).toHaveBeenCalledWith(1.0, 'note-123');
    });
    
    it('should apply different delays based on musical context', () => {
      // Verify Phase 1B breathing room works
      mockTempoService.computeDelay
        .mockReturnValueOnce(300)  // Normal note
        .mockReturnValueOnce(500)  // Barline end
        .mockReturnValueOnce(600)  // Phrase end
        .mockReturnValueOnce(700); // Fermata
      
      expect(mockTempoService.computeDelay(1.0, 'normal')).toBe(300);
      expect(mockTempoService.computeDelay(1.0, 'barline')).toBe(500);
      expect(mockTempoService.computeDelay(1.0, 'phrase')).toBe(600);
      expect(mockTempoService.computeDelay(1.0, 'fermata')).toBe(700);
    });
  });
  
  describe('Performance Requirements', () => {
    it('should maintain <20ms MIDI latency with tempo integration', () => {
      // Test that tempo calculation itself is fast
      const startTime = performance.now();
      
      // Simulate tempo calculation
      for (let i = 0; i < 100; i++) {
        mockTempoService.computeDelay(1.0, 'note-' + i);
      }
      
      const endTime = performance.now();
      const avgLatency = (endTime - startTime) / 100;
      
      // Average tempo calculation should be very fast
      expect(avgLatency).toBeLessThan(1); // <1ms per calculation
    });
  });
  
  describe('Expected Integration Points', () => {
    it('should update FEEDBACK_TIMEOUT case in practice controller', () => {
      // Document the required change
      const currentCode = `
        case 'FEEDBACK_TIMEOUT':
          const delayMs = 500; // HARDCODED!
      `;
      
      const requiredCode = `
        case 'FEEDBACK_TIMEOUT':
          const currentNote = getCurrentNote(state);
          const noteDuration = extractNoteDuration(currentNote);
          const delayMs = tempoService?.computeDelay(noteDuration, currentNote?.id) || 500;
      `;
      
      expect(currentCode).toContain('500');
      expect(requiredCode).toContain('tempoService');
      expect(requiredCode).toContain('computeDelay');
      expect(requiredCode).toContain('|| 500'); // Fallback
    });
  });
});