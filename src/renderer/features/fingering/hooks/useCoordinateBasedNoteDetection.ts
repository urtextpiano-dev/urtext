/**
 * Coordinate-based note detection for fingering clicks
 * 
 * This is a workaround for the data-note-id injection issue.
 * Instead of relying on DOM attributes, we use the graphicalNoteMap
 * to find notes based on click coordinates.
 */

import { useCallback, useRef } from 'react';
import { selectNoteFromTies } from '../utils/selectNoteFromTies';
import { extractFirstDataNoteId } from '@/renderer/utils/noteUtils';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GraphicalNoteWithBounds {
  noteId: string;
  graphicalNote: any;
  bounds?: BoundingBox;
}

export const useCoordinateBasedNoteDetection = (
  graphicalNoteMap: Map<string, any> | undefined,
  containerRef: React.RefObject<HTMLElement>
) => {
  // Cache bounds for performance
  const boundsCache = useRef<Map<string, GraphicalNoteWithBounds>>(new Map());
  
  // Update bounds cache when graphicalNoteMap changes
  const updateBoundsCache = useCallback(() => {
    if (!graphicalNoteMap || !containerRef.current) return;
    
    boundsCache.current.clear();
    
    // 🔍 DEBUG: Track chord detection
    const notesByPosition = new Map<string, Array<{ noteId: string, bounds: any }>>();
    
    for (const [noteId, graphicalNote] of graphicalNoteMap) {
      try {
        // PRIORITY 1: Use PositionAndShape for accurate individual note bounds
        if (graphicalNote?.PositionAndShape?.AbsolutePosition && 
            graphicalNote?.PositionAndShape?.Size) {
          const { AbsolutePosition: pos, Size: size } = graphicalNote.PositionAndShape;
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // OSMD uses 10 pixels per staff unit at 100% zoom
          // Get current zoom from parent OSMD instance if available
          const osmdZoom = (window as any).osmd?.zoom || 1;
          const pixelScale = 10 * osmdZoom;
          
          // Convert OSMD coordinates to pixel coordinates
          // Fix NaN issue: Use size.width/height if available, fallback to typical notehead dimensions
          const bounds = {
            x: pos.x * pixelScale,
            y: pos.y * pixelScale,
            width: (size.width || size.x || 20) * pixelScale,  // Fallback to 20px typical notehead width
            height: (size.height || size.y || 15) * pixelScale  // Fallback to 15px typical notehead height
          };
          
          // Store bounds with high confidence
          boundsCache.current.set(noteId, {
            noteId,
            graphicalNote,
            bounds
          });
          
          // Track chord positions
          const yKey = Math.round(bounds.y);
          if (!notesByPosition.has(yKey.toString())) {
            notesByPosition.set(yKey.toString(), []);
          }
          notesByPosition.get(yKey.toString())!.push({ noteId, bounds });
          
          console.log(`✅ PositionAndShape bounds for ${noteId}:`, bounds);
          continue; // Skip SVG fallback
        }
        
        // FALLBACK: Original SVG element method
        let svgElement: SVGElement | null = null;
        
        if (typeof graphicalNote.getSVGGElement === 'function') {
          svgElement = graphicalNote.getSVGGElement();
        } else if (typeof graphicalNote.getSVGElement === 'function') {
          svgElement = graphicalNote.getSVGElement();
        }
        
        if (svgElement) {
          const rect = svgElement.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          const bounds = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
          };
          
          // 🔍 DEBUG: Detailed SVG element analysis
          console.log(`🎵 DEBUG SVG ELEMENT - ${noteId}:`, {
            noteId,
            svgElement: {
              tagName: svgElement.tagName,
              className: svgElement.className?.baseVal || svgElement.className,
              id: svgElement.id,
              children: svgElement.children.length,
              childTypes: Array.from(svgElement.children).map(child => ({
                tag: child.tagName,
                className: child.className?.baseVal || child.className
              }))
            },
            rawRect: {
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            },
            relativeBounds: bounds
          });
          
          // Store bounds relative to container
          boundsCache.current.set(noteId, {
            noteId,
            graphicalNote,
            bounds
          });
          
          // 🔍 DEBUG: Group notes by Y position to detect chords
          const yKey = Math.round(bounds.y);
          if (!notesByPosition.has(yKey.toString())) {
            notesByPosition.set(yKey.toString(), []);
          }
          notesByPosition.get(yKey.toString())!.push({ noteId, bounds });
        }
      } catch (error) {
        // Silent fail for individual notes
      }
    }
    
    // 🔍 DEBUG: Report chord groups
    notesByPosition.forEach((notes, yPos) => {
      if (notes.length > 1) {
        console.log(`🎹 CHORD DETECTED at Y=${yPos}:`, {
          noteCount: notes.length,
          notes: notes.map(n => ({
            id: n.noteId,
            x: n.bounds.x,
            sameY: notes.every(note => Math.abs(note.bounds.y - n.bounds.y) < 1),
            sameBounds: notes.every(note => 
              Math.abs(note.bounds.x - n.bounds.x) < 1 &&
              Math.abs(note.bounds.y - n.bounds.y) < 1 &&
              Math.abs(note.bounds.width - n.bounds.width) < 1 &&
              Math.abs(note.bounds.height - n.bounds.height) < 1
            )
          }))
        });
      }
    });
    
    console.log(`📍 Coordinate detection: Cached bounds for ${boundsCache.current.size} notes`);
  }, [graphicalNoteMap, containerRef]);
  
  // Find note at given coordinates
  const findNoteAtCoordinates = useCallback((clientX: number, clientY: number): string | null => {
    if (!containerRef.current) return null;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - containerRect.left;
    const relativeY = clientY - containerRect.top;
    
    // 🔍 DEBUG: Log click details
    console.log(`🎯 CLICK ANALYSIS - Click at (${clientX}, ${clientY}) -> Relative (${relativeX.toFixed(1)}, ${relativeY.toFixed(1)})`);
    
    // Add some padding for easier clicking
    const clickPadding = 5;
    
    // Collect all matching notes (fixes chord note overlap issue)
    const matchingNotes: Array<{ noteId: string; bounds: any; distance: number }> = [];
    
    for (const [noteId, noteData] of boundsCache.current) {
      const { bounds } = noteData;
      if (!bounds) continue;
      
      if (
        relativeX >= bounds.x - clickPadding &&
        relativeX <= bounds.x + bounds.width + clickPadding &&
        relativeY >= bounds.y - clickPadding &&
        relativeY <= bounds.y + bounds.height + clickPadding
      ) {
        // Calculate Euclidean distance from click to note center
        const noteCenterX = bounds.x + bounds.width / 2;
        const noteCenterY = bounds.y + bounds.height / 2;
        const distance = Math.pow(relativeX - noteCenterX, 2) + Math.pow(relativeY - noteCenterY, 2);
        
        // 🔍 DEBUG: Distance calculation breakdown
        console.log(`📐 DISTANCE CALC - ${noteId}:`, {
          bounds: bounds,
          center: { x: noteCenterX.toFixed(1), y: noteCenterY.toFixed(1) },
          clickToCenter: {
            xDiff: (relativeX - noteCenterX).toFixed(1),
            yDiff: (relativeY - noteCenterY).toFixed(1),
            xDistSq: Math.pow(relativeX - noteCenterX, 2).toFixed(1),
            yDistSq: Math.pow(relativeY - noteCenterY, 2).toFixed(1),
            totalDistSq: distance.toFixed(1),
            totalDist: Math.sqrt(distance).toFixed(1)
          }
        });
        
        matchingNotes.push({ noteId, bounds, distance });
      }
    }
    
    if (matchingNotes.length === 0) {
      console.log(`❌ NO NOTES FOUND - Click at (${relativeX.toFixed(1)}, ${relativeY.toFixed(1)}) with padding ${clickPadding}px`);
      return null;
    }
    
    // Defensive check - ensure all matching notes have valid structure
    const validNotes = matchingNotes.filter(note => note && note.noteId && note.bounds);
    if (validNotes.length === 0) {
      console.error('❌ NO VALID NOTES - All matching notes missing required properties');
      return null;
    }
    
    // Use only valid notes for further processing
    const processedNotes = validNotes;
    
    // 🔍 DEBUG: Show all matching notes before selection
    if (matchingNotes.length > 1) {
      console.log(`🎵 CHORD CLICK - Found ${matchingNotes.length} matching notes:`);
      matchingNotes.forEach((match, idx) => {
        console.log(`  ${idx + 1}. ${match.noteId} (distance=${Math.sqrt(match.distance).toFixed(1)}px, distSq=${match.distance.toFixed(1)}, y=${match.bounds.y.toFixed(1)}, x=${match.bounds.x.toFixed(1)})`);
      });
      
      // 🔍 DEBUG: Check if bounds are truly identical
      const firstBounds = matchingNotes[0].bounds;
      const allIdentical = matchingNotes.every(note => 
        Math.abs(note.bounds.x - firstBounds.x) < 0.1 &&
        Math.abs(note.bounds.y - firstBounds.y) < 0.1 &&
        Math.abs(note.bounds.width - firstBounds.width) < 0.1 &&
        Math.abs(note.bounds.height - firstBounds.height) < 0.1
      );
      console.log(`🔍 BOUNDS ANALYSIS - All bounds identical: ${allIdentical}`);
      
      // 🧪 NEW DEBUG: Test proposed solutions
      console.log(`🧪 TESTING CHORD SOLUTIONS:`);
      
      // Test 1: Extract MIDI values from note IDs
      const midiData = matchingNotes.map(note => {
        const midiMatch = note.noteId.match(/midi(\d+)$/);
        const midiValue = midiMatch ? parseInt(midiMatch[1]) : null;
        return { noteId: note.noteId, midiValue, bounds: note.bounds };
      });
      console.log(`  🎹 MIDI VALUES:`, midiData);
      
      // Test 2: Check if GraphicalNote objects are different
      const graphicalNotes = matchingNotes.map(note => boundsCache.current.get(note.noteId)?.graphicalNote);
      console.log(`  🎼 GRAPHICAL NOTE OBJECTS SAME:`, graphicalNotes[0] === graphicalNotes[1]);
      
      // Test 3: Try to access potential notehead data
      if (graphicalNotes[0] && graphicalNotes[1]) {
        console.log(`  📍 GRAPHICAL NOTE 1:`, {
          hasVfNote: !!graphicalNotes[0].vfnote,
          hasSourceNote: !!graphicalNotes[0].sourceNote,
          hasPositionAndShape: !!graphicalNotes[0].PositionAndShape
        });
        console.log(`  📍 GRAPHICAL NOTE 2:`, {
          hasVfNote: !!graphicalNotes[1].vfnote,
          hasSourceNote: !!graphicalNotes[1].sourceNote,
          hasPositionAndShape: !!graphicalNotes[1].PositionAndShape
        });
        
        // Try accessing PositionAndShape if available
        if (graphicalNotes[0].PositionAndShape && graphicalNotes[1].PositionAndShape) {
          console.log(`  🎯 POSITION DATA 1:`, graphicalNotes[0].PositionAndShape.AbsolutePosition);
          console.log(`  🎯 POSITION DATA 2:`, graphicalNotes[1].PositionAndShape.AbsolutePosition);
        }
      }
      
      // Test 4: Simulate X-position tiebreaker
      const xDistances = matchingNotes.map(note => ({
        noteId: note.noteId,
        xDistance: Math.abs(relativeX - (note.bounds.x + note.bounds.width / 2))
      }));
      const xWinner = xDistances.sort((a, b) => a.xDistance - b.xDistance)[0];
      console.log(`  🎯 X-POSITION TIEBREAKER: ${xWinner.noteId} (distances: ${xDistances.map(d => d.xDistance.toFixed(1)).join(', ')})`);
      
      // Test 5: Simulate MIDI tiebreaker with Y-position
      if (midiData.every(m => m.midiValue !== null)) {
        const sortedByMidi = [...midiData].sort((a, b) => a.midiValue! - b.midiValue!);
        const avgY = midiData.reduce((sum, n) => sum + n.bounds.y, 0) / midiData.length;
        const selectHigherPitch = relativeY > avgY;
        const midiWinner = selectHigherPitch ? sortedByMidi[sortedByMidi.length - 1] : sortedByMidi[0];
        console.log(`  🎵 MIDI TIEBREAKER: ${midiWinner.noteId} (click Y=${relativeY.toFixed(1)}, avgY=${avgY.toFixed(1)}, selectHigher=${selectHigherPitch})`);
      }
    }
    
    // Use tiebreaker logic when distances are equal (chord notes)
    const minDistance = Math.min(...processedNotes.map(n => n.distance));
    const tiedNotes = processedNotes.filter(n => Math.abs(n.distance - minDistance) < 1.0);
    
    let selectedNote;
    if (tiedNotes.length > 1) {
      // Calculate relative Y position for pure function
      const avgY = tiedNotes.reduce((sum, n) => sum + n.bounds.y, 0) / tiedNotes.length;
      const relativePosition = (relativeY - avgY + 25) / 50; // Normalize to 0-1 range
      
      // Use pure function to select note (fixes stale closure issue)
      selectedNote = selectNoteFromTies(tiedNotes, relativePosition);
      
      if (selectedNote) {
        console.log(`🎵 CHORD TIEBREAKER: Selected ${selectedNote.noteId} (relativeY=${relativeY.toFixed(1)}, position=${relativePosition.toFixed(2)})`);
      }
    } else {
      // Regular distance-based selection
      selectedNote = processedNotes.sort((a, b) => a.distance - b.distance)[0];
    }
    
    // Final safety check with defensive fallback
    if (!selectedNote) {
      console.error('❌ SELECTION ERROR: selectedNote is undefined, using first processed note as fallback');
      selectedNote = processedNotes[0];
    }
    
    // Additional defensive check - ensure we have a valid noteId
    if (!selectedNote || !selectedNote.noteId) {
      console.error('❌ CRITICAL ERROR: selectedNote missing noteId, cannot proceed');
      return null;
    }
    
    console.log(`✅ SELECTED NOTE: ${selectedNote.noteId}${processedNotes.length > 1 ? ` (chose from ${processedNotes.length} matches)` : ''}`);
    return selectedNote.noteId;
  }, [containerRef]);
  
  // Alternative: Find note using OSMD's internal hit testing
  const findNoteUsingOSMD = useCallback((event: MouseEvent): string | null => {
    if (!graphicalNoteMap || !containerRef.current) return null;
    
    // Get all potential note elements at click position
    const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
    
    // FIRST: Check ALL elements at click point for data-note-id
    // Start from the topmost element (first in array) which is the actual clicked element
    for (const element of elementsAtPoint) {
      if (element instanceof Element && element.hasAttribute('data-note-id')) {
        const noteId = extractFirstDataNoteId(element.getAttribute('data-note-id'));
        if (noteId) {
          return noteId;
        }
      }
    }
    
    // SECOND: If no direct hit, try closest() as fallback
    for (const element of elementsAtPoint) {
      if (element instanceof Element) {
        const noteElement = element.closest('[data-note-id]');
        if (noteElement && noteElement.hasAttribute('data-note-id')) {
          const noteId = extractFirstDataNoteId(noteElement.getAttribute('data-note-id'));
          if (noteId) {
            return noteId;
          }
        }
      }
    }
    
    // FALLBACK: Removed - causes wrong chord note selection
    // The primary data-note-id lookup should handle all cases
    // If it fails, the click detection has deeper issues that need investigation
    
    return null;
  }, [graphicalNoteMap, containerRef]);
  
  return {
    updateBoundsCache,
    findNoteAtCoordinates,
    findNoteUsingOSMD
  };
};