/**
 * Piano State Store - Real-time MIDI key highlighting
 * 
 * Architectural patterns:
 * - Counter-based note tracking for overlapping events
 * - Performance-optimized with fine-grained selectors
 * - Edge case handling for rapid sequences and disconnections
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Practice highlighting types
export interface PracticeHighlight {
  type: 'expected' | 'correct' | 'incorrect' | 'upcoming';
  hand?: 'left' | 'right';
  fingering?: number;
  options?: {
    opacity?: number;
    intensity?: number;
    glow?: boolean;
  };
}

interface PianoState {
  // Note tracking with counters to handle overlapping noteOn events
  activeNotes: Map<number, number>;  // MIDI note -> count of active noteOn events
  noteVelocities: Map<number, number>;  // MIDI note -> latest velocity (0-127)
  
  // Practice mode highlighting
  practiceHighlights: Map<number, PracticeHighlight>;  // MIDI note -> practice highlight info
  
  // Actions - MIDI
  pressNote: (note: number, velocity: number) => void;
  releaseNote: (note: number) => void;
  resetAllNotes: () => void;  // For MIDI disconnection cleanup
  
  // Actions - Practice highlighting
  setPracticeHighlight: (note: number, highlight: PracticeHighlight) => void;
  clearPracticeHighlight: (note: number) => void;
  clearAllPracticeHighlights: () => void;
  
  // Selectors for performance optimization
  isNoteActive: (note: number) => boolean;
  getNoteVelocity: (note: number) => number;
  getPracticeHighlight: (note: number) => PracticeHighlight | undefined;
  hasPracticeHighlight: (note: number) => boolean;
}

export const usePianoStore = create<PianoState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeNotes: new Map(),
      noteVelocities: new Map(),
      practiceHighlights: new Map(),
      
      // Actions
      pressNote: (note: number, velocity: number) => {
        set((state) => {
          const newActiveNotes = new Map(state.activeNotes);
          const newVelocities = new Map(state.noteVelocities);
          
          // Increment counter for overlapping noteOn events
          const currentCount = newActiveNotes.get(note) || 0;
          newActiveNotes.set(note, currentCount + 1);
          
          // Update velocity (use latest)
          newVelocities.set(note, velocity);
          
          return {
            activeNotes: newActiveNotes,
            noteVelocities: newVelocities
          };
        });
      },
      
      releaseNote: (note: number) => {
        set((state) => {
          const newActiveNotes = new Map(state.activeNotes);
          const newVelocities = new Map(state.noteVelocities);
          
          const currentCount = newActiveNotes.get(note) || 0;
          if (currentCount <= 1) {
            // Last noteOff - remove note completely
            newActiveNotes.delete(note);
            newVelocities.delete(note);
          } else {
            // Decrement counter for overlapping events
            newActiveNotes.set(note, currentCount - 1);
          }
          
          return {
            activeNotes: newActiveNotes,
            noteVelocities: newVelocities
          };
        });
      },
      
      resetAllNotes: () => {
        set({
          activeNotes: new Map(),
          noteVelocities: new Map()
        });
      },
      
      // Practice highlighting actions
      setPracticeHighlight: (note: number, highlight: PracticeHighlight) => {
        set((state) => {
          const newPracticeHighlights = new Map(state.practiceHighlights);
          newPracticeHighlights.set(note, highlight);
          return { practiceHighlights: newPracticeHighlights };
        });
      },
      
      clearPracticeHighlight: (note: number) => {
        set((state) => {
          const newPracticeHighlights = new Map(state.practiceHighlights);
          newPracticeHighlights.delete(note);
          return { practiceHighlights: newPracticeHighlights };
        });
      },
      
      clearAllPracticeHighlights: () => {
        set((state) => ({
          ...state,
          practiceHighlights: new Map()
        }));
      },
      
      // Performance-optimized selectors
      isNoteActive: (note: number) => {
        const state = get();
        return (state.activeNotes.get(note) || 0) > 0;
      },
      
      getNoteVelocity: (note: number) => {
        const state = get();
        return state.noteVelocities.get(note) || 0;
      },
      
      getPracticeHighlight: (note: number) => {
        const state = get();
        return state.practiceHighlights.get(note);
      },
      
      hasPracticeHighlight: (note: number) => {
        const state = get();
        return state.practiceHighlights.has(note);
      }
    }),
    {
      name: 'piano-state',
      // Don't persist active notes - they should reset on app restart
      partialize: () => ({})
    }
  )
);

/**
 * MIDI Note to Piano Key ID Mapping
 * Converts MIDI note numbers (60=C4) to piano key IDs ("C4")
 */
export function midiNoteToKeyId(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * Piano Key ID to MIDI Note Mapping  
 * Converts piano key IDs ("C4") to MIDI note numbers (60)
 */
export function keyIdToMidiNote(keyId: string): number {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Parse key ID (e.g., "C4", "F#3")
  const match = keyId.match(/^([A-G]#?)(\d+)$/);
  if (!match) return -1;
  
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = noteNames.indexOf(noteName);
  
  if (noteIndex === -1) return -1;
  
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Velocity to CSS Class Mapping
 * Maps MIDI velocity (0-127) to discrete CSS classes for performance
 */
export function velocityToClass(velocity: number): string {
  if (velocity === 0) return '';
  
  // Map to 5 discrete levels for CSS optimization
  const level = Math.floor((velocity - 1) / 25) + 1; // 1-5
  return `velocity-level-${Math.min(level, 5)}`;
}

/**
 * Practice Highlight to CSS Classes
 * Converts practice highlight info to CSS class names
 */
export function practiceHighlightToClasses(highlight: PracticeHighlight): string[] {
  const classes: string[] = [];
  
  // Base practice class
  classes.push(`piano-key--practice-${highlight.type}`);
  
  // Hand differentiation
  if (highlight.hand) {
    classes.push(`piano-key--hand-${highlight.hand}`);
  }
  
  return classes;
}

/**
 * Get all CSS classes for a piano key
 * Combines MIDI active state and practice highlighting
 */
export function getPianoKeyClasses(
  midiNote: number,
  isWhiteKey: boolean,
  isActive: boolean,
  velocity: number,
  practiceHighlight?: PracticeHighlight,
  isLandmark?: boolean
): string[] {
  const classes: string[] = [];
  
  // Base classes
  classes.push('piano-key');
  classes.push(isWhiteKey ? 'piano-key--white' : 'piano-key--black');
  
  // Landmark highlighting
  if (isLandmark) {
    classes.push('piano-key--landmark');
  }
  
  // MIDI active state
  if (isActive) {
    classes.push('piano-key--active');
    if (velocity > 0) {
      classes.push(velocityToClass(velocity));
    }
  }
  
  // Practice highlighting (takes precedence)
  if (practiceHighlight) {
    classes.push(...practiceHighlightToClasses(practiceHighlight));
  }
  
  return classes;
}