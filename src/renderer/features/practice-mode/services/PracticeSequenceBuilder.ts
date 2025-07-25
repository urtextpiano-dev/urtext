/**
 * Practice Sequence Builder
 * 
 * Pre-computes practice sequences from OSMD scores for O(1) lookup during practice.
 * Replaces real-time OSMD traversal that caused 10-15ms latency penalties.
 * 
 * Architecture: One-time complex traversal on score load → simple array access during practice
 * Performance Target: <2ms sequence generation time, <1.5MB memory per 1-hour score
 * Security: Memory safeguards against OOM attacks, bounded computation
 */

import { OpenSheetMusicDisplay, Cursor } from 'opensheetmusicdisplay';
import type { PracticeNote } from '../types';
import { perfLogger } from '@/renderer/utils/performance-logger';

export interface OptimizedPracticeStep {
  /** Unique identifier for React keys and debugging */
  id: string;
  /** Pre-computed MIDI notes for O(1) lookup */
  midiNotes: Set<number>;
  /** Pre-calculated boolean flags */
  isChord: boolean;
  isRest: boolean;
  /** OSMD element IDs for visual highlighting */
  visualElements: string[];
  /** Position metadata */
  measureIndex: number;
  stepIndex: number;
  /** Musical timing information */
  timestamp?: number;
}

export interface SequenceBuildResult {
  steps: OptimizedPracticeStep[];
  metadata: {
    totalSteps: number;
    totalNotes: number;
    memoryUsage: number; // Estimated memory usage in bytes
    buildTime: number;   // Time taken to build sequence in ms
  };
}

export class PracticeSequenceBuilder {
  // Memory safeguards (from Code review:'s security audit)
  private static readonly MAX_STEPS = 50000;      // Prevent OOM from malicious scores
  private static readonly MAX_NOTES_PER_STEP = 32; // Reasonable chord limit
  private static readonly MIDI_C0_VALUE = 12;      // C0 = MIDI 12
  
  /**
   * Build optimized practice sequence from OSMD instance
   * One-time pre-computation to replace real-time traversal
   */
  static build(osmd: OpenSheetMusicDisplay): SequenceBuildResult {
    const buildStartTime = performance.now();
    
    // Starting sequence generation
    
    let tiedNotesDetected = 0;
    let tiedContinuationsFiltered = 0;
    
    try {
      const sequence: OptimizedPracticeStep[] = [];
      let totalNotes = 0;
      
      // Create cursor for traversal
      const cursor = osmd.cursor;
      if (!cursor) {
        throw new Error('OSMD cursor not available');
      }
      
      // Reset to beginning
      cursor.reset();
      
      // Memory monitoring
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Traverse score once, building optimized steps
      let stepIndex = 0;
      
      while (!cursor.Iterator.EndReached && sequence.length < this.MAX_STEPS) {
        const step = this.extractStepFromCursor(cursor, stepIndex);
        
        if (step) {
          sequence.push(step);
          totalNotes += step.midiNotes.size;
          stepIndex++;
          
          // Memory safeguard: Check for runaway generation
          if (sequence.length % 1000 === 0) {
            const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
            const memoryDelta = currentMemory - startMemory;
            
            // Warn if memory usage is growing suspiciously fast
            if (memoryDelta > 50 * 1024 * 1024) { // 50MB
              perfLogger.warn(`[PracticeSequenceBuilder] High memory usage: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
            }
          }
        }
        
        // Advance cursor
        cursor.next();
      }
      
      // Check if we hit the safety limit
      if (sequence.length >= this.MAX_STEPS) {
        perfLogger.warn(`[PracticeSequenceBuilder] Hit max step limit (${this.MAX_STEPS}). Score may be truncated.`);
      }
      
      const buildTime = performance.now() - buildStartTime;
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsage = endMemory - startMemory;
      
      // Sequence generation complete
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('[TIED_NOTES] Sequence Build Summary', {
          stage: 'sequence_build_summary',
          totalSteps: sequence.length,
          totalNotes,
          tiedNotesDetected,
          tiedContinuationsFiltered,
          sampleSteps: sequence.slice(0, 5).map(step => ({ 
            measure: step.measureIndex, 
            stepIdx: step.stepIndex,
            notes: Array.from(step.midiNotes) 
          })),
          fullSequenceLength: sequence.length
        });
      }
      
      return {
        steps: sequence,
        metadata: {
          totalSteps: sequence.length,
          totalNotes,
          memoryUsage,
          buildTime,
        },
      };
      
    } catch (error) {
      perfLogger.error('[PracticeSequenceBuilder] Failed to build sequence:', error);
      throw error;
    }
  }
  
  /**
   * Extract practice step from current cursor position
   */
  private static extractStepFromCursor(cursor: Cursor, stepIndex: number): OptimizedPracticeStep | null {
    try {
      const notes = new Set<number>();
      const visualElements: string[] = [];
      
      // Get current measure index
      const measureIndex = cursor.Iterator.currentMeasureIndex || 0;
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('[PracticeSequenceBuilder] extractStepFromCursor start', {
          stepIndex,
          measureIndex,
          hasIterator: !!cursor.Iterator,
          hasVoiceEntries: !!cursor.Iterator?.CurrentVoiceEntries
        });
      }
      
      // Extract notes from all voice entries at current position
      const voiceEntries = cursor.Iterator.CurrentVoiceEntries;
      if (!voiceEntries || voiceEntries.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('[PracticeSequenceBuilder] No voice entries at step', stepIndex);
        }
        return null;
      }
      
      for (let voiceIndex = 0; voiceIndex < voiceEntries.length; voiceIndex++) {
        const voiceEntry = voiceEntries[voiceIndex];
        
        // Skip grace notes and tied notes (as per research recommendations)
        if (voiceEntry.IsGrace) continue;
        
        // Get notes from voice entry
        const entryNotes = voiceEntry.Notes || voiceEntry.notes || [];
        
        for (let noteIndex = 0; noteIndex < entryNotes.length; noteIndex++) {
          const note = entryNotes[noteIndex];
          
          // Skip grace notes at note level
          if (note.IsGrace) continue;
          
          if (process.env.NODE_ENV === 'development') {
            perfLogger.debug('[TIED_NOTES] Stage: Detection', {
              stage: 'sequence_build_detection',
              noteIndex,
              halfTone: note.halfTone !== undefined ? note.halfTone : note.HalfTone,
              hasTie: !!(note as any).NoteTie,
              isStartNote: (note as any).NoteTie ? (note as any).NoteTie.StartNote === note : 'no_tie',
              tieStartNote: (note as any).NoteTie ? ((note as any).NoteTie.StartNote ? 'exists' : 'null') : 'no_tie',
              isGrace: !!note.IsGrace,
              measureIndex,
              stepIndex,
              voiceIndex
            });
          }
          
          // Skip tied notes from previous - use OSMD's native tie handling
          if ((note as any).NoteTie && (note as any).NoteTie.StartNote !== note) {
            if (process.env.NODE_ENV === 'development') {
              perfLogger.debug('[TIED_NOTES] Decision: Skip tied continuation', {
                stage: 'sequence_build_skip',
                halfTone: note.halfTone !== undefined ? note.halfTone : note.HalfTone,
                reason: 'tied_continuation',
                measureIndex,
                stepIndex,
                noteIndex
              });
            }
            continue;
          }
          
          // Calculate MIDI value
          const halfTone = note.halfTone !== undefined ? note.halfTone : note.HalfTone;
          
          if (halfTone !== undefined) {
            const midiValue = halfTone + this.MIDI_C0_VALUE;
            
            // Only add notes within standard 88-key piano range (A0 to C8)
            if (midiValue >= 21 && midiValue <= 108) {
              notes.add(midiValue);
              
              // Store visual element ID for highlighting
              const elementId = note.graphicalNote?.id || `note_${measureIndex}_${stepIndex}_${midiValue}`;
              visualElements.push(elementId);
              
              if (process.env.NODE_ENV === 'development') {
                perfLogger.debug('[TIED_NOTES] Decision: Include note', {
                  stage: 'sequence_build_include',
                  midiValue,
                  isTieStart: !!(note as any).NoteTie,
                  measureIndex,
                  stepIndex,
                  noteIndex
                });
              }
            }
          }
        }
      }
      
      // Safeguard: Limit notes per step to prevent memory abuse
      if (notes.size > this.MAX_NOTES_PER_STEP) {
        perfLogger.warn(`[PracticeSequenceBuilder] Step ${stepIndex} has ${notes.size} notes, truncating to ${this.MAX_NOTES_PER_STEP}`);
        const limitedNotes = Array.from(notes).slice(0, this.MAX_NOTES_PER_STEP);
        notes.clear();
        limitedNotes.forEach(note => notes.add(note));
      }
      
      // Create optimized step
      const step: OptimizedPracticeStep = {
        id: `m${measureIndex}-s${stepIndex}`,
        midiNotes: notes,
        isChord: notes.size > 1,
        isRest: notes.size === 0,
        visualElements,
        measureIndex,
        stepIndex,
        // CRITICAL: Capture timestamp for precise intra-measure positioning
        timestamp: cursor.Iterator.currentTimeStamp?.RealValue ||
                   cursor.Iterator.currentTimeStamp?.realValue,
      };
      
      // Debug logging for first 5 steps
      if (stepIndex < 5) {
        perfLogger.debug('[PracticeSequenceBuilder] Step timestamp', {
          stepIndex,
          measureIndex,
          timestamp: step.timestamp,
          midiNotes: Array.from(notes)
        });
      }
      
      return step;
      
    } catch (error) {
      perfLogger.error(`[PracticeSequenceBuilder] Error extracting step ${stepIndex}:`, error);
      return null;
    }
  }
  
  /**
   * Validate that a sequence is safe to use
   */
  static validateSequence(steps: OptimizedPracticeStep[]): boolean {
    if (!Array.isArray(steps)) return false;
    if (steps.length === 0) return true; // Empty sequence is valid
    if (steps.length > this.MAX_STEPS) return false;
    
    // Check each step has required properties
    for (const step of steps) {
      if (!step.id || typeof step.id !== 'string') return false;
      if (!(step.midiNotes instanceof Set)) return false;
      if (typeof step.isChord !== 'boolean') return false;
      if (typeof step.isRest !== 'boolean') return false;
      if (!Array.isArray(step.visualElements)) return false;
      if (typeof step.measureIndex !== 'number') return false;
      if (typeof step.stepIndex !== 'number') return false;
      
      // Validate MIDI notes are in valid range
      for (const note of step.midiNotes) {
        if (typeof note !== 'number' || note < 0 || note > 127) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get memory estimation for a sequence
   */
  static estimateMemoryUsage(steps: OptimizedPracticeStep[]): number {
    let totalBytes = 0;
    
    for (const step of steps) {
      // Base object overhead
      totalBytes += 200; // Rough estimate for object overhead
      
      // String properties
      totalBytes += step.id.length * 2; // UTF-16
      
      // Set<number> - roughly 32 bytes per number + overhead
      totalBytes += step.midiNotes.size * 40;
      
      // Array of strings
      totalBytes += step.visualElements.reduce((sum, str) => sum + str.length * 2, 0);
      totalBytes += step.visualElements.length * 8; // Array overhead
    }
    
    return totalBytes;
  }
}