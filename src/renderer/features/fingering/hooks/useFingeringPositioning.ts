import { useCallback } from 'react';
import { useOSMDContext } from '@/renderer/contexts/OSMDContext';
import { parseFingeringId } from '../utils/fingeringId';

// Track parse warnings to avoid spam
declare global {
  interface Window {
    __fingeringParseWarningShown?: boolean;
  }
}

export interface FingeringPosition {
  x: number;
  y: number;
  noteElement: any; // GraphicalNote from OSMD
}

export const useFingeringPositioning = () => {
  const { osmd } = useOSMDContext();

  const getFingeringPosition = useCallback((noteId: string): FingeringPosition | null => {
    // This hook is primarily for future use when we need centralized positioning logic
    // Currently, FingeringLayer uses graphicalNoteMap directly for performance
    
    const parsed = parseFingeringId(noteId);
    if (!parsed) {
      // Log parse failures once per session
      if (!window.__fingeringParseWarningShown) {
        console.warn('Failed to parse fingering ID:', noteId);
        window.__fingeringParseWarningShown = true;
      }
      return null;
    }

    // Hook available for Phase 3 when we need more complex positioning logic
    // (e.g., collision detection, smart positioning, etc.)
    return null;
  }, [osmd]);

  return { getFingeringPosition };
};