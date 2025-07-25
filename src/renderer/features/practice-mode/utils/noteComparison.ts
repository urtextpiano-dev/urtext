/**
 * Note Comparison Utilities
 * 
 * Pure functions for comparing played notes to expected notes.
 * Uses Set operations for O(n) performance.
 * Must complete comparison in <1ms for real-time responsiveness.
 */

import type { PracticeStep, ComparisonResult } from '../types';
export { debounce } from '@/renderer/utils/timing/debounce';

/**
 * Compare played notes against expected notes
 * @param played Array of MIDI note numbers actually played
 * @param expected The expected practice step
 * @returns Comparison result indicating correct/incorrect/missing notes
 */
export function compareNotes(
  played: number[], 
  expected: PracticeStep
): ComparisonResult {
  if (process.env.NODE_ENV === 'development') {
    console.log('[CompareNotes] Comparing:', {
      played: played.sort((a, b) => a - b),
      expected: expected.notes.map(n => n.midiValue).sort((a, b) => a - b),
      isRest: expected.isRest,
      isChord: expected.isChord
    });
    
    // Add tied notes specific logging
    console.log('[TIED_NOTES] Stage: Comparison', {
      stage: 'note_comparison',
      played: played,
      expected: expected.notes.map(n => n.midiValue),
      timestamp: Date.now()
    });
  }

  let result: ComparisonResult;
  
  // Auto-advance on rests
  if (expected.isRest) {
    result = { type: 'CORRECT' };
  } else {
    // Create sets for efficient comparison
    const playedSet = new Set(played);
    const expectedSet = new Set(expected.notes.map(n => n.midiValue));
    
    // Fast path: perfect match
    if (playedSet.size === expectedSet.size && 
        [...playedSet].every(note => expectedSet.has(note))) {
      result = { type: 'CORRECT' };
    } else {
      // Detailed analysis for feedback
      const missing = [...expectedSet].filter(n => !playedSet.has(n));
      const extra = [...playedSet].filter(n => !expectedSet.has(n));
      
      // Determine the type of error
      if (missing.length > 0 && extra.length === 0) {
        result = { type: 'MISSING_NOTES', missing };
      } else if (extra.length > 0) {
        result = { type: 'WRONG_NOTES', wrong: extra, expected: [...expectedSet] };
      } else {
        // Shouldn't reach here, but for completeness
        result = { type: 'CORRECT' };
      }
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[TIED_NOTES] Comparison Result', {
      stage: 'note_comparison_result',
      result: result.type,
      extra: result.type === 'WRONG_NOTES' ? result.wrong : undefined,
      missing: result.type === 'MISSING_NOTES' ? result.missing : undefined
    });
  }
  
  return result;
}

