import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useFingeringStore } from '../stores/fingeringStore';
import { useOSMDStore } from '@/renderer/stores/osmdStore';
import { useFingeringPositioning } from '../hooks/useFingeringPositioning';
import { useFingeringInteraction } from '../hooks/useFingeringInteraction';
import { useCoordinateBasedNoteDetection } from '../hooks/useCoordinateBasedNoteDetection';
import { FingeringInlineInput } from './FingeringInlineInput';
import { createFingeringId } from '../utils/fingeringId';
import { perfLogger } from '../utils/simple-perf-logger';

interface FingeringLayerProps {
  scoreId: string;
  /** Viewport optimization - only render visible fingerings */
  visibleTimeRange?: { start: number; end: number };
  /** Direct access to graphicalNoteMap from parent */
  graphicalNoteMap?: Map<string, any>;
  /** Phase 3 escape hatch: onClick handler for fingering interaction */
  onFingeringClick?: (noteId: string, finger: number) => void;
  /** Phase 3 escape hatch: Enable interaction mode */
  interactive?: boolean;
  /** Container ref from parent for coordinate detection */
  containerRef?: React.RefObject<HTMLDivElement>;
}

// Configurable performance limit
// Can be overridden via MAX_FINGERING_RENDER_LIMIT environment variable
const MAX_FINGERING_RENDER_LIMIT = process.env.MAX_FINGERING_RENDER_LIMIT 
  ? parseInt(process.env.MAX_FINGERING_RENDER_LIMIT) 
  : 300;

/**
 * Extract data-note-id from clicked element or its parents
 * PRIMARY detection method - replaces coordinate detection for chord support
 * 
 * @param element - The clicked element or any child of a note element
 * @returns The data-note-id value if found, null otherwise
 * 
 * This is now the primary detection method because:
 * - Works reliably with chords (each note has unique ID)
 * - O(1) performance vs O(n) coordinate calculations
 * - No complex math or normalization issues
 * - Already injected by OSMD rendering pipeline
 */
export function getDataNoteId(element: Element | null): string | null {
  if (!element) return null;
  
  console.log('[DEBUG #9] getDataNoteId called on element:', element.tagName, 'class:', (element.className as any)?.baseVal || element.className || 'no-class');
  
  let current: Element | null = element;
  let level = 0;
  
  // SIMPLIFIED: Direct traversal to find data-note-id (now on individual noteheads)
  while (current && level < 10) {
    const dataNoteId = current.getAttribute('data-note-id');
    
    console.log(`[DEBUG #9] Level ${level}: Checking ${current.tagName}.${(current.className as any)?.baseVal || current.className || ''} - data-note-id: ${dataNoteId || 'none'}`);
    
    if (dataNoteId) {
      const noteId = dataNoteId.trim(); // Now single, unique ID
      console.log(`[DEBUG #9] FOUND NOTE at level ${level}: '${noteId}' on ${current.tagName}.${(current.className as any)?.baseVal || ''}`);
      
      // Check if this is a comma-separated chord ID
      if (noteId.includes(',')) {
        console.log('[DEBUG #9] WARNING: Found comma-separated IDs (chord):', noteId);
        console.log('[DEBUG #9] This means multiple notes share this element!');
      }
      
      return noteId;
    }
    current = current.parentElement;
    level++;
  }
  
  console.log('[DEBUG #9] No data-note-id found after traversing', level, 'levels');
  return null;
}

export const FingeringLayer: React.FC<FingeringLayerProps> = ({ 
  scoreId, 
  visibleTimeRange,
  graphicalNoteMap,
  onFingeringClick,
  interactive = false,
  containerRef
}) => {
  // Initialize coordinate-based detection with parent's container ref
  const { updateBoundsCache, findNoteAtCoordinates, findNoteUsingOSMD } = 
    useCoordinateBasedNoteDetection(graphicalNoteMap, containerRef || { current: null } as unknown as React.RefObject<HTMLElement>);
  
  // Make OSMD image overlays transparent to clicks
  useEffect(() => {
    const styleId = 'osmd-img-click-through';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* RELEASE BLOCKER FIX: Chord fingering clicks intercepted by IMG overlays
         * 
         * PROBLEM: OSMD renders image overlays that capture clicks meant for SVG notes.
         * This prevents getDataNoteId from identifying the correct chord note.
         * 
         * SOLUTION: Make images transparent to pointer events, allowing clicks to
         * reach the underlying SVG elements with data-note-id attributes.
         * 
         * Tested with OSMD 1.9.0. If OSMD adds interactive images in future,
         * they'll need pointer-events: auto override.
         */
        .osmd-container img,
        .osmd-container image {
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      // Clean up on unmount
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);
  
  // DEBUG: Log initialization and test SVG element access
  useEffect(() => {
    if (interactive && graphicalNoteMap && containerRef?.current) {
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Fingering click detection ready', {
          notes: graphicalNoteMap.size,
          container: containerRef.current.className
        });
      }
      
      // Test if SVG element access works
      const firstNote = Array.from(graphicalNoteMap.values())[0];
      if (firstNote) {
        try {
          let svgElement: SVGElement | null = null;
          
          if (typeof firstNote.getSVGGElement === 'function') {
            svgElement = firstNote.getSVGGElement();
          } else if (typeof firstNote.getSVGElement === 'function') {
            svgElement = firstNote.getSVGElement();
          }
          
          if (process.env.NODE_ENV === 'development') {
            perfLogger.debug('First note SVG element test:', {
              noteObject: firstNote,
              hasSVGElement: !!svgElement,
              hasSVGGElement: typeof firstNote.getSVGGElement === 'function',
              hasSVGElementMethod: typeof firstNote.getSVGElement === 'function',
              bounds: svgElement ? svgElement.getBoundingClientRect() : null
            });
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            perfLogger.debug('SVG element access failed:', e);
          }
        }
      }
    }
  }, [interactive, graphicalNoteMap, containerRef]);
  const annotations = useFingeringStore(state => state.annotations[scoreId] || {});
  const { setFingering, removeFingering, setFingeringByNoteId, removeFingeringByNoteId } = useFingeringStore();
  
  // Get zoom level for damped scaling
  const zoomLevel = useOSMDStore(state => state.zoomLevel);
  
  // 📊 DEBUG: Log what annotations we have
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('DISPLAY: Annotations in store:', {
        scoreId,
        annotationCount: Object.keys(annotations).length,
        allAnnotations: annotations,
        annotationFormats: Object.keys(annotations).map(key => {
          const parts = key.split('-');
          return `${key} => format: ${parts.length} parts`;
        })
      });
    }
  }, [scoreId, annotations]);
  const { getFingeringPosition } = useFingeringPositioning();
  const { 
    selectedNoteId, 
    isInputOpen, 
    inputPosition, 
    isEditingMode,
    setEditingMode,
    setActiveInput,
    closeInput,
    handleNoteClick,
    submitFingering 
  } = useFingeringInteraction();

  // Enhanced filtering with viewport and performance limits
  const visibleFingerings = useMemo(() => {
    const startTime = performance.now();
    
    // DEBUG: Log what we're trying to filter
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('FINGERING DEBUG - visibleFingerings calculation:', {
        annotationsCount: Object.keys(annotations).length,
        visibleTimeRange,
        sampleNoteIds: Object.keys(annotations).slice(0, 3),
        // DEBUG: Show full annotations to see if chord notes both have fingerings
        allAnnotations: annotations
      });
    }
    
    const filtered = Object.entries(annotations).filter(([noteId, finger]) => {
      if (!visibleTimeRange) return true;
      
      // Parse timestamp from noteId (format: t{timestamp}-m{midiValue})
      const timestampMatch = noteId.match(/^t(.+)-m/);
      if (!timestampMatch) {
        // Non-timestamp IDs (e.g. m0-s0-v0-n0-midi60) should be visible
        // This handles the new position-based ID format
        return true;
      }
      
      const timestamp = parseFloat(timestampMatch[1]);
      return timestamp >= visibleTimeRange.start && timestamp <= visibleTimeRange.end;
    });
    
    // Limit rendering for performance (configurable)
    if (filtered.length > MAX_FINGERING_RENDER_LIMIT) {
      if (process.env.NODE_ENV === 'development') {
        perfLogger.warn(`Large number of fingerings (${filtered.length}), limiting to ${MAX_FINGERING_RENDER_LIMIT} for performance`);
      }
      const result = filtered.slice(0, MAX_FINGERING_RENDER_LIMIT);
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Fingering filtering performance', { 
          duration: performance.now() - startTime,
          totalAnnotations: Object.keys(annotations).length,
          filteredCount: filtered.length,
          renderedCount: result.length
        });
      }
      return result;
    }
    
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('Fingering filtering performance', { 
        duration: performance.now() - startTime,
        totalAnnotations: Object.keys(annotations).length,
        renderedCount: filtered.length
      });
    }
    
    return filtered;
  }, [annotations, visibleTimeRange]);

  // MINIMAL FIX: Track container version to force recalculation on resize
  const [containerVersion, setContainerVersion] = useState(0);

  // Calculate positions using graphicalNoteMap if provided
  // MOVED UP: Must be declared before chordGroupings that uses it
  const getPosition = useCallback((noteId: string) => {
    if (!graphicalNoteMap || !containerRef?.current) return null;
    
    // 👁️ DEBUG: Log lookup attempt
    const graphicalNote = graphicalNoteMap.get(noteId);
    if (!graphicalNote) {
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('DISPLAY: Looking for ID:', {
          noteId,
          mapSize: graphicalNoteMap.size,
          sampleMapKeys: Array.from(graphicalNoteMap.keys()).slice(0, 5),
          mismatch: `Expected format from map keys vs actual noteId`
        });
      }
      return null;
    }
    
    try {
      // Get SVG element from graphicalNote
      let svgElement: SVGElement | null = null;
      
      if (typeof graphicalNote.getSVGGElement === 'function') {
        svgElement = graphicalNote.getSVGGElement();
      } else if (typeof graphicalNote.getSVGElement === 'function') {
        svgElement = graphicalNote.getSVGElement();
      } else if (graphicalNote.svgElement || graphicalNote.SVGElement) {
        svgElement = graphicalNote.svgElement || graphicalNote.SVGElement;
      }
      
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Convert to container-relative coordinates
        const relativeX = rect.left - containerRect.left;
        const relativeY = rect.top - containerRect.top;
        
        // Dynamic offset calculation with bounds to prevent overlap and overreach
        const MIN_HEAD_H = 10;    // Min height to prevent overlap with staff lines
        const MAX_HEAD_H = 20;    // Max height to prevent overshooting due to note stems
        const EXTRA_MARGIN = 6;   // Safety margin above the calculated notehead position
        
        // Clamp the measured rect.height to our safe zone
        const effectiveHeadH = Math.min(Math.max(rect.height, MIN_HEAD_H), MAX_HEAD_H);
        const safeOffset = effectiveHeadH + EXTRA_MARGIN;
        
        const position = {
          x: relativeX + (rect.width / 2), // Center horizontally
          y: relativeY - safeOffset,       // Dynamic offset to avoid staff overlap
          noteElement: graphicalNote
        };
        
        // Enhanced position logging - DOM vs OSMD coords
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FINGERING_POSITIONS === 'true') {
          // Try to get OSMD's internal position data
          let osmdPosition = null;
          try {
            if (graphicalNote.PositionAndShape) {
              osmdPosition = {
                absolutePosition: graphicalNote.PositionAndShape.AbsolutePosition,
                relativePosition: graphicalNote.PositionAndShape.RelativePosition,
                boundingBox: graphicalNote.PositionAndShape.BoundingBox,
                size: graphicalNote.PositionAndShape.Size
              };
            } else if (graphicalNote.sourceNote) {
              // Try alternate OSMD API paths
              osmdPosition = {
                pitch: graphicalNote.sourceNote.Pitch,
                staff: graphicalNote.ParentStaffEntry?.ParentStaff?.idInMusicSheet
              };
            }
          } catch (e) {
            // OSMD API access failed
          }
          
          perfLogger.debug('DIAGNOSTIC: Position comparison', {
            noteId,
            domCoords: {
              svgBounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
              containerRelative: { x: relativeX, y: relativeY },
              fingeringPosition: { x: position.x, y: position.y }
            },
            osmdCoords: osmdPosition,
            clef: svgElement.closest('.vf-staff-bass') ? 'bass' : 
                  svgElement.closest('.vf-staff-treble') ? 'treble' : 'unknown',
            parentTransforms: (svgElement.parentElement as SVGElement)?.getAttribute?.('transform')
          });
        }
        
        // DEBUG: Log position calculation for chord analysis
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('FINGERING POSITION DEBUG:', {
            noteId,
            svgY: rect.top,
            relativeY,
            finalY: position.y,
            x: position.x,
            rectHeight: rect.height,      // Added to validate bounds
            effectiveHeadH: effectiveHeadH, // Added to confirm clamping effect
            containerVersion // Track when positions are recalculated
          });
        }
        
        return position;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        perfLogger.warn('Error getting fingering position', { 
          noteId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    return null;
  }, [graphicalNoteMap, containerRef, containerVersion]);

  // Build chord groupings and calculate vertical offsets
  // MOVED UP: Must be declared before any callbacks that use it
  const chordGroupings = useMemo(() => {
    // DIAGNOSTIC: Log container dimensions to detect resizing
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FINGERING_RESIZE === 'true') {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        perfLogger.debug('FINGERING CONTAINER DIMENSIONS:', {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          fingeringCount: visibleFingerings.length,
          timestamp: Date.now()
        });
      }
    }
    
    const positionMap = new Map<number, Array<{ noteId: string; x: number; y: number; finger: number }>>();
    
    // Group fingerings by Y position
    visibleFingerings.forEach(([noteId, finger]) => {
      const pos = graphicalNoteMap ? getPosition(noteId) : getFingeringPosition(noteId);
      if (pos) {
        const yKey = Math.round(pos.y);
        if (!positionMap.has(yKey)) positionMap.set(yKey, []);
        positionMap.get(yKey)!.push({ noteId, x: pos.x, y: pos.y, finger });
      }
    });
    
    // Calculate offsets for chord notes
    const offsetMap = new Map<string, { x: number; y: number }>();
    
    positionMap.forEach((notes, yKey) => {
      if (notes.length > 1) {
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('CHORD DETECTED at Y=' + yKey + ':', {
            noteCount: notes.length,
            notes: notes.map(n => ({ id: n.noteId, x: n.x }))
          });
        }
        
        // Sort by MIDI pitch (extracted from noteId)
        const sortedNotes = [...notes].sort((a, b) => {
          const midiA = parseInt(a.noteId.match(/midi(\d+)/)?.[1] || '0');
          const midiB = parseInt(b.noteId.match(/midi(\d+)/)?.[1] || '0');
          return midiA - midiB; // Lower pitch first
        });
        
        // Apply vertical spacing
        const VERTICAL_SPACING = 14; // pixels between fingerings
        const HORIZONTAL_OFFSET = -5; // slight left offset for chord fingerings
        const baseY = sortedNotes[0].y; // Use the Y position of the first note as base
        sortedNotes.forEach((note, index) => {
          // Invert the index to match musical notation (higher pitch = lower Y)
          const visualIndex = sortedNotes.length - 1 - index;
          offsetMap.set(note.noteId, {
            x: note.x + HORIZONTAL_OFFSET,
            y: baseY + (visualIndex * VERTICAL_SPACING)
          });
        });
      } else {
        // Single note - use original position
        notes.forEach(note => {
          offsetMap.set(note.noteId, { x: note.x, y: note.y });
        });
      }
    });
    
    return offsetMap;
  }, [visibleFingerings, graphicalNoteMap, getPosition, getFingeringPosition, containerRef, containerVersion]);

  // Handle click-to-edit functionality
  const handleFingeringSubmit = useCallback(async (value: number | null) => {
    if (!selectedNoteId) return;
    
    try {
      if (value === null) {
        await removeFingeringByNoteId(scoreId, selectedNoteId);
      } else {
        await setFingeringByNoteId(scoreId, selectedNoteId, value);
      }
      closeInput();
    } catch (error) {
      // Guard production logging
      if (process.env.NODE_ENV === 'development') {
        perfLogger.error('Failed to update fingering:', error instanceof Error ? error : new Error(String(error)));
      }
      // In production, could report to monitoring service if needed
    }
  }, [selectedNoteId, scoreId, setFingeringByNoteId, removeFingeringByNoteId, closeInput]);

  // Handle note clicks for editing
  const handleNoteElementClick = useCallback((noteId: string, event: React.MouseEvent) => {
    if (!interactive && !isEditingMode) return;
    
    event.stopPropagation(); // Prevent OSMD handling
    
    // Use adjusted position from chord groupings if available
    const adjustedPos = chordGroupings.get(noteId);
    const position = adjustedPos || (graphicalNoteMap ? getPosition(noteId) : getFingeringPosition(noteId));
    if (position) {
      const currentValue = annotations[noteId] || null;
      setActiveInput(noteId, position, currentValue);
    }
  }, [interactive, isEditingMode, graphicalNoteMap, getPosition, getFingeringPosition, annotations, setActiveInput, chordGroupings]);


  // Enable editing mode by default for interactive mode
  useEffect(() => {
    if (interactive && !isEditingMode) {
      setEditingMode(true);
    }
  }, [interactive, isEditingMode, setEditingMode]);

  // Update bounds cache when graphicalNoteMap changes
  useEffect(() => {
    if (graphicalNoteMap && graphicalNoteMap.size > 0 && containerRef?.current) {
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Updating bounds cache for coordinate detection...');
      }
      
      // Wait for noteheads to appear in DOM before building cache
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds max
      
      const checkAndBuildCache = () => {
        if (!containerRef?.current) return;
        
        const noteheads = containerRef.current.querySelectorAll('g.vf-notehead[data-note-id]');
        
        if (noteheads.length > 0) {
          updateBoundsCache();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkAndBuildCache, 100);
        }
      };
      
      // Start checking immediately
      checkAndBuildCache();
    }
  }, [graphicalNoteMap, updateBoundsCache, containerRef]);

  // MINIMAL FIX: Force position recalculation when container resizes
  useEffect(() => {
    if (!containerRef?.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FINGERING_RESIZE === 'true') {
          perfLogger.debug('CONTAINER RESIZED:', {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
            fingeringCount: Object.keys(annotations).length
          });
        }
        // Force recalculation of positions by incrementing version
        setContainerVersion(v => v + 1);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [containerRef, annotations]);

  /**
   * Note Click Detection Priority (Updated 2024-01-12)
   * 
   * 1. data-note-id attribute lookup (PRIMARY) - Most reliable for chords
   * 2. OSMD DOM traversal (FALLBACK) - When attributes missing  
   * 3. Coordinate detection (DEPRECATED) - Complex workaround, keep for compatibility
   * 
   * Previous coordinate-first approach failed for chords due to normalization
   * issues where both clicks would select same note despite different positions.
   * 
   * Research validation confirmed
   * data-note-id approach as industry best practice for SVG element identification.
   */
  useEffect(() => {
    if (!isEditingMode) return;

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target) return;

      // Skip if click is on fingering overlay elements or input
      if (target.closest('.fingering-layer') || 
          target.closest('.fingering-number') || 
          target.closest('.fingering-input-container') ||
          target.closest('.fingering-input')) {
        return;
      }

      // DEBUG: Log click coordinates
      console.log('[DEBUG #9] ===== CLICK EVENT =====');
      console.log('[DEBUG #9] Click coordinates:', { x: event.clientX, y: event.clientY });
      console.log('[DEBUG #9] Click target:', event.target);
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Click at:', { x: event.clientX, y: event.clientY });
        perfLogger.debug('Note click detected, trying detection methods...');
      }

      // Simplified click traversal
      let noteId = getDataNoteId(event.target as Element);
      
      if (!noteId) {
        console.log('[DEBUG #9] DOM traversal failed, trying coordinate fallback...');
        // COORDINATE FALLBACK: Use coordinate-based detection
        updateBoundsCache(); // Ensure bounds are fresh
        noteId = findNoteAtCoordinates(event.clientX, event.clientY);
        if (!noteId) {
          console.log('[DEBUG #9] Coordinate fallback also failed - no note found');
          return;
        }
        console.log('[DEBUG #9] Coordinate fallback succeeded, found:', noteId);
      } else {
        console.log('[DEBUG #9] DOM traversal succeeded, found:', noteId);
      }
      
      // TODO: Handle ties - Map to start of tie chain
      // For now, use the noteId as-is since selectNoteFromTies has different signature
      let finalNoteId = noteId;
      
      // Handle comma-separated chord IDs (backwards compatibility fallback)
      if (noteId && noteId.includes(',')) {
        console.log('[DEBUG #9] WARNING: Found comma-separated IDs (old format):', noteId);
        // Take the first ID as fallback
        finalNoteId = noteId.split(',')[0].trim();
      }

      if (finalNoteId) {
        console.log('[DEBUG #9] Final note ID for dialog:', finalNoteId);
        
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('CLICK: Found note with ID:', {
            noteId: finalNoteId,
            format: finalNoteId.split('-').length + ' parts',
            parts: finalNoteId.split('-')
          });
        }
        event.stopPropagation();
        
        // Get position for the input - use adjusted position from chord groupings
        const adjustedPos = chordGroupings.get(finalNoteId);
        const position = adjustedPos || (graphicalNoteMap ? getPosition(finalNoteId) : getFingeringPosition(finalNoteId));
        if (position) {
          // DEBUG: Log what we're getting from annotations (global click)
          const rawValue = annotations[finalNoteId];
          if (process.env.NODE_ENV === 'development') {
            perfLogger.debug('DEBUG currentValue access (global click):', {
              noteId: finalNoteId,
              rawValue,
              isArray: Array.isArray(rawValue),
              type: typeof rawValue
            });
          }
          const currentValue = rawValue || null;
          setActiveInput(finalNoteId, position, currentValue);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('All detection methods failed');
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [isEditingMode, interactive, annotations, setActiveInput, findNoteAtCoordinates, findNoteUsingOSMD, graphicalNoteMap, getPosition, getFingeringPosition, chordGroupings]);

  // Get the absolute position for the portal-rendered input
  const getAbsolutePosition = useCallback(() => {
    if (!inputPosition || !containerRef?.current) return null;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      x: containerRect.left + inputPosition.x,
      y: containerRect.top + inputPosition.y
    };
  }, [inputPosition, containerRef]);


  return (
    <>
      <g 
        className="fingering-layer" 
        data-testid="fingering-layer"
        style={{ pointerEvents: 'none' }}
      >
        {/* REMOVED: Debug log in render loop - threatens <20ms latency */}
        {visibleFingerings.map(([noteId, finger]) => {
          const adjustedPosition = chordGroupings.get(noteId);
          if (!adjustedPosition) {
            if (process.env.NODE_ENV === 'development') {
              perfLogger.debug('FINGERING DEBUG - No position for noteId:', noteId);
            }
            return null;
          }

          const isEditing = selectedNoteId === noteId;
          
          // REMOVED: Debug log in render loop - threatens <20ms latency
          
          return (
            <text
              key={`${noteId}-${finger}`}
              x={adjustedPosition.x}
              y={adjustedPosition.y}
              className={`fingering-number ${isEditing ? 'editing' : ''}`}
              aria-label={`Fingering ${finger} for note at timestamp ${noteId.split('-')[0].slice(1)}`}
              role="img"
              style={{
                // Damped scaling: text scales WITH zoom but slower
                fontSize: `${Math.min(20, Math.max(9, 12 / Math.sqrt(Math.max(0.25, zoomLevel ?? 1))))}px`,
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
                // Theme-aware colors with fallbacks
                fill: isEditing ? 'var(--abc-accent-primary, #0066cc)' : 'var(--abc-sheet-ink, #000080)',
                // Contrast stroke with background color
                stroke: 'var(--abc-bg-primary, #ffffff)',
                strokeWidth: `${Math.min(2.5, Math.max(0.75, 1.5 / Math.sqrt(Math.max(0.25, zoomLevel ?? 1))))}px`,
                paintOrder: 'stroke',
                textAnchor: 'middle',
                dominantBaseline: 'central',
                pointerEvents: (interactive || isEditingMode) ? 'auto' : 'auto',
                userSelect: 'none',
                cursor: (interactive || isEditingMode) ? 'pointer' : 'default'
              }}
              data-testid={`fingering-${noteId}-${finger}`}
              onClick={(e) => {
                if (process.env.NODE_ENV === 'development') {
                  perfLogger.debug('DIRECT FINGERING CLICK:', { noteId, finger });
                }
                if (onFingeringClick) {
                  onFingeringClick(noteId, finger);
                } else {
                  handleNoteElementClick(noteId, e);
                }
              }}
            >
              {finger}
            </text>
          );
        })}
      </g>
      
      {/* Render input outside SVG using Portal */}
      {isInputOpen && inputPosition && selectedNoteId && (() => {
        const absPos = getAbsolutePosition();
        if (!absPos) return null;
        
        return ReactDOM.createPortal(
          <FingeringInlineInput
            position={absPos}
            initialValue={null} // Always start empty to add new fingerings
            onSubmit={handleFingeringSubmit}
            onCancel={closeInput}
          />,
          document.body
        );
      })()}
    </>
  );
};