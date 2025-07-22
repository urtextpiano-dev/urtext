/**
 * Pure function for selecting the appropriate note from chord ties
 * Fixes React hook stale closure issue in coordinate detection
 */

interface TiedNote {
  noteId: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distance: number;
  midiValue?: number;
}

/**
 * Selects the most appropriate note from a list of tied notes (chord)
 * based on the relative Y position of the click within the note bounds.
 * 
 * @param tiedNotes - Array of notes with identical bounds (chord notes)
 * @param relativeY - Y position relative to the average note position (0-1)
 * @returns Selected note or undefined if invalid input
 */
export function selectNoteFromTies(
  tiedNotes: TiedNote[], 
  relativeY: number
): TiedNote | undefined {
  
  // Defensive checks
  if (!tiedNotes || tiedNotes.length === 0) {
    return undefined;
  }
  
  // Single note - no selection needed
  if (tiedNotes.length === 1) {
    return tiedNotes[0];
  }

  // Extract and validate MIDI values
  const notesWithMidi = tiedNotes.map(note => {
    const midiMatch = note.noteId.match(/midi(\d+)$/);
    const midiValue = midiMatch ? parseInt(midiMatch[1]) : 0;
    return { ...note, midiValue };
  }).filter(note => note.midiValue > 0);

  // Fallback if no valid MIDI values
  if (notesWithMidi.length === 0) {
    return tiedNotes[0];
  }

  // Sort by MIDI value (low to high pitch)
  const sortedByMidi = [...notesWithMidi].sort((a, b) => a.midiValue - b.midiValue);

  // Calculate selection zones (expanded tolerance for easier use)
  const lowerZoneThreshold = 0.4; // Click below 40% = lower note
  const upperZoneThreshold = 0.6; // Click above 60% = upper note

  // Clamp relativeY to valid range
  const clampedY = Math.max(0, Math.min(1, relativeY));

  // Select note based on click position
  let selectedNote: TiedNote;
  let selectionReason: string;
  
  if (clampedY < lowerZoneThreshold) {
    // Lower zone - select lowest pitch
    selectedNote = sortedByMidi[0];
    selectionReason = `Lower zone (Y < ${lowerZoneThreshold}) - selected lowest pitch`;
  } else if (clampedY > upperZoneThreshold) {
    // Upper zone - select highest pitch
    selectedNote = sortedByMidi[sortedByMidi.length - 1];
    selectionReason = `Upper zone (Y > ${upperZoneThreshold}) - selected highest pitch`;
  } else {
    // Middle zone - default to lowest pitch for predictable behavior
    selectedNote = sortedByMidi[0];
    selectionReason = `Middle zone (${lowerZoneThreshold} <= Y <= ${upperZoneThreshold}) - defaulted to lowest pitch`;
  }
  
  
  return selectedNote;
}