/**
 * useOSMD Hook - Core OSMD integration with performance-critical fast path
 * 
 * IMPORTANT: This hook CREATES and manages a NEW OSMD instance.
 * - Use this hook ONLY in components that need to render sheet music (e.g., SheetMusic component)
 * - Requires a containerRef parameter pointing to the DOM element where OSMD will render
 * 
 * For accessing a SHARED OSMD instance (e.g., in dialogs, controls, or other components):
 * - Use useOSMDContext() instead
 * - Do NOT use this hook without a proper containerRef
 * 
 * Combines architectural patterns from multi-AI collaboration:
 * - Gemini: Component lifecycle + hybrid state management
 * - Code review:: Velocity-based visual feedback + innovation patterns  
 * - Code review:: Robust error handling + testing strategies
 */

// BUILD VERIFICATION - Development only
if (process.env.NODE_ENV === 'development') {
  perfLogger.debug('useOSMD.ts loaded', { timestamp: new Date().toISOString(), buildVersion: Math.random() });
}

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { OpenSheetMusicDisplay, IOSMDOptions, Cursor } from 'opensheetmusicdisplay';
import type { PracticeStepResult, PracticeNote } from '@/renderer/features/practice-mode/types';
import { extractNoteNameFromPitch } from '@/renderer/utils/noteUtils';
import { calculateVisualFeedback } from '@/renderer/utils/osmd/visualFeedback';
import { Flags } from '@/shared/featureFlags';
import { PracticeSequenceBuilder } from '@/renderer/features/practice-mode/services/PracticeSequenceBuilder';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import { useTheme } from '@/renderer/features/theme';
import { getOSMDThemeOptions, useOSMDTheme } from '@/renderer/features/theme/lib/osmd-theme-integration';
import { useOSMDStore } from '@/renderer/stores/osmdStore';
import { logRenderLatency, perfLogger } from '@/renderer/utils/performance-logger';
import { logger } from '@/renderer/utils/simple-logger';
import { createFullFingeringId } from '@/renderer/features/fingering/utils/fingeringId';
import { injectFingeringsIntoMusicXML, benchmarkFingeringInjection } from '@/renderer/utils/musicxml-fingering-injector';
import { debounce } from '@/renderer/utils/timing/debounce';
// Removed complex cursor utilities - using OSMD native API only

// Performance monitoring (following existing PianoKeyboard patterns)
const PERFORMANCE_CONFIG = {
  HIGHLIGHT_DEBOUNCE_MS: 16, // ~60fps for smooth updates
  MAX_CONCURRENT_HIGHLIGHTS: 50, // Prevent DOM overload
  CLEANUP_INTERVAL_MS: 30000, // Cleanup unused mappings
} as const;

// Note mapping for MIDI coordination
interface NoteMapping {
  timestamp: number;
  svgElements: SVGGElement[];
  noteId: string;
  midiNote?: number; // MIDI note number for fast lookup
}

// For fingering feature - extend refs structure
interface NoteMappingRef {
  noteMapping: Map<number, NoteMapping>;
  midiToTimestamp: Map<number, number[]>;
  graphicalNoteMap: Map<string, any>; // noteId -> graphicalNote for O(1) fingering lookups
}


interface OSMDControls {
  highlightNote: (noteNumber: number, velocity?: number) => void;
  unhighlightNote: (noteNumber: number) => void;
  clearAllHighlights: () => void;
  updatePlaybackPosition: (timestamp: number) => void;
  getVisibleNotes: () => number[];
  // Simple cursor control - using OSMD native API
  cursor: any; // Direct access to OSMD cursor for simple operations
  // Practice mode
  getExpectedNotesAtCursor: () => PracticeStepResult;
}


interface UseOSMDReturn {
  osmd: OpenSheetMusicDisplay | null;
  isLoading: boolean;
  isReady: boolean;
  osmdReady: boolean;
  error: Error | null;
  controls: OSMDControls;
  noteMapping: Map<number, NoteMapping>;
  graphicalNoteMap: Map<string, any>;
  detectRepeats: () => any; // Function for detecting musical repeats
}

export const useOSMD = (
  containerRef: React.RefObject<HTMLDivElement | null>, 
  musicXML?: string,
  autoShowCursor: boolean = true, // Default to showing cursor
  scoreId?: string // Optional scoreId for fingering injection
): UseOSMDReturn => {
  if (process.env.NODE_ENV === 'development') {
    perfLogger.debug('useOSMD hook executed', {
      timestamp: Date.now(),
      hasContainer: !!containerRef.current,
      hasMusicXML: !!musicXML,
      autoShowCursor
    });
  }

  // Access theme for OSMD color integration
  const { theme } = useTheme();
  // Access practice store for pre-computed sequence integration
  const { setOptimizedSequence } = usePracticeStore();
  // Access zoom level from OSMD store
  const { zoomLevel } = useOSMDStore();
  // Core OSMD instance (Gemini's lifecycle pattern)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const noteMappingRef = useRef<NoteMappingRef>({
    noteMapping: new Map(),
    midiToTimestamp: new Map(),
    graphicalNoteMap: new Map()
  });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteMappingBuiltRef = useRef(false); // Track if mapping built for current score
  
  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [osmdReady, setOsmdReady] = useState(false); // Flag to signal OSMD instance creation
  
  // Performance monitoring (following existing patterns)
  const performanceRef = useRef<{
    initStart?: number;
    renderStart?: number;
    highlightCount: number;
  }>({ highlightCount: 0 });



  // Re-inject data-note-id attributes after OSMD re-renders
  const injectNoteIdAttributes = useCallback(() => {
    if (!osmdRef.current?.GraphicSheet || !containerRef.current) return;
    
    const graphicalNoteMap = noteMappingRef.current.graphicalNoteMap;
    if (!graphicalNoteMap || graphicalNoteMap.size === 0) return;
    
    let injected = 0;
    
    // Re-inject attributes for all notes with correct musical relationships
    for (const [fingeringNoteId, graphicalNote] of graphicalNoteMap) {
      try {
        const svgElement = graphicalNote.getSVGGElement?.();
        if (svgElement) {
          // AI CONSENSUS FIX: Use comma-separated IDs to handle shared SVG elements in chords
          const existingIds = svgElement.getAttribute('data-note-id');
          if (!existingIds) {
            svgElement.setAttribute('data-note-id', fingeringNoteId);
          } else if (!existingIds.split(',').includes(fingeringNoteId)) {
            // Append new ID if not already present (prevents duplicates)
            svgElement.setAttribute('data-note-id', `${existingIds},${fingeringNoteId}`);
          }
          
          // Set pointer-events for better click detection
          svgElement.style.pointerEvents = 'auto';
          svgElement.style.cursor = 'pointer';
          
          injected++;
        }
      } catch (error) {
        // Silently continue - some notes may not have accessible SVG elements
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('Re-injected data-note-id attributes', { injected, total: graphicalNoteMap.size });
    }
  }, []);

  // Render with zoom support (following o3's advice on stabilization)
  const renderWithZoom = useCallback(() => {
    if (!osmdRef.current || !isReady) return;
    
    const renderStart = performance.now();
    
    try {
      // Track if this is a zoom-triggered render
      const previousZoom = osmdRef.current.zoom;
      const isZoomChange = Math.abs(previousZoom - zoomLevel) > 0.01;
      
      // Optimize: Skip re-render if zoom hasn't actually changed
      if (!isZoomChange) return;
      
      // Save scroll position before render
      const scrollContainer = containerRef.current?.parentElement;
      const scrollPercent = scrollContainer 
        ? scrollContainer.scrollTop / scrollContainer.scrollHeight
        : 0;
      
      // Set zoom property on OSMD instance
      osmdRef.current.zoom = zoomLevel;
      
      // Call render without parameters
      osmdRef.current.render();
      
      // Restore scroll position proportionally
      requestAnimationFrame(() => {
        if (scrollContainer && scrollPercent > 0) {
          scrollContainer.scrollTop = scrollPercent * scrollContainer.scrollHeight;
        }
        
        // Re-inject note attributes after render
        injectNoteIdAttributes();
      });
      
      // Performance monitoring
      const renderTime = performance.now() - renderStart;
      logRenderLatency(renderTime);
      
      if (renderTime > 100) {
        perfLogger.warn('Slow zoom render', { 
          renderTime, 
          zoomLevel,
          measureCount: osmdRef.current?.GraphicSheet?.MeasureList?.length 
        });
      }
    } catch (error) {
      perfLogger.error('Zoom render failed:', error);
    }
  }, [zoomLevel, isReady, injectNoteIdAttributes]);

  // Debounced zoom handler (stabilized with useMemo to prevent recreation)
  const debouncedZoomRender = useMemo(
    () => debounce(renderWithZoom, 16),
    [renderWithZoom]
  );

  // Create OSMD instance (once on mount)
  const createOSMDInstance = useCallback(async () => {
    // Remove verbose initialization logging
    
    if (!containerRef.current || osmdRef.current) return;


    try {
      setError(null);
      
      // Performance tracking and dimension validation
      const rect = containerRef.current.getBoundingClientRect();
      if (process.env.NODE_ENV === 'development') {
        performanceRef.current.initStart = performance.now();
      }

      // Get theme-specific options
      const themeOptions = getOSMDThemeOptions();
      
      // OSMD configuration optimized for performance
      const options: IOSMDOptions = {
        // autoResize disabled: We use manual ResizeObserver (setupResizeObserver) 
        // to control timing and ensure cursor updates after render completion.
        // See lines 321-394 for implementation. Re-test if upgrading OSMD.
        autoResize: false,
        backend: 'svg', // Required for SVG manipulation
        drawTitle: true,
        drawComposer: true,
        drawingParameters: 'compact', // Better for screen display
        pageFormat: 'Endless', // Better for scrolling interfaces
        
        // Performance optimizations
        drawSlurs: true,
        // PROTOTYPE: Native fingering support per Code review: instructions
        drawFingerings: process.env.USE_NATIVE_FINGERINGS === 'true' || process.env.DEBUG_NATIVE_FINGERINGS === 'true',
        drawMeasureNumbers: false, // Reduce visual clutter for MVP
        drawPartNames: false,
        
        // Additional rendering options that might affect cursor
        renderSingleHorizontalStaffline: false,
        
        // No cursor options - use OSMD defaults
        
        // Merge with theme options (theme options take precedence)
        ...themeOptions
      };

      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, options);
      
      // Signal that OSMD instance is ready
      setOsmdReady(true);
      
      // OSMD instance created - log consolidated later
    } catch (err) {
      const error = err as Error;
      setError(error);
      perfLogger.error(' OSMD instance creation failed:', error);
    }
  }, []);

  // Build optimized note mapping for fast MIDI lookup (Code review:'s strategy)
  const buildNoteMapping = useCallback(() => {
    if (!osmdRef.current?.GraphicSheet) {
      perfLogger.warn(' OSMD GraphicSheet not available for note mapping');
      return;
    }
    
    // CRITICAL FIX: Prevent rebuilding note mapping multiple times
    if (noteMappingBuiltRef.current) {
      perfLogger.debug('Note mapping already built, skipping rebuild');
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('Building note mapping', { timestamp: new Date().toISOString() });
    }
    noteMappingBuiltRef.current = false;

    const noteMapping = new Map<number, NoteMapping>();
    const midiToTimestamp = new Map<number, number[]>();
    const graphicalNoteMap = new Map<string, any>();

    try {
      let mappingCount = 0;
      
      // Track collisions for development debugging
      const collisions: Array<{
        noteId: string;
        indices: string;
        timestamp: number;
        midiNote: number;
      }> = [];
      
      // OSMD 1.9.0 uses GraphicSheet.MeasureList (capital G)
      const measureList = osmdRef.current.GraphicSheet.MeasureList;
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Note mapping build starting', {
          timestamp: new Date().toISOString(),
          measureCount: measureList?.length || 0
        });
      }
      
      if (!measureList || !Array.isArray(measureList) || measureList.length === 0) {
        perfLogger.warn(' No measures available for note mapping');
        return;
      }
      
      // Iterate through all staves and measures
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Starting measureList iteration', { measureListLength: measureList.length });
      }
      measureList.forEach((staffMeasures: any[], staffIndex: number) => {
        if (!Array.isArray(staffMeasures)) return;
        
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('Processing staff measures', {
            staffIndex,
            measuresCount: staffMeasures.length
          });
        }
        staffMeasures.forEach((measure: any, measureIndex: number) => {
          if (!measure || !measure.staffEntries) {
            if (process.env.NODE_ENV === 'development') {
              perfLogger.debug('Skipping measure - no staffEntries', { measureIndex });
            }
            return;
          }
          
          // Process each staff entry in the measure
          measure.staffEntries.forEach((staffEntry: any, entryIndex: number) => {
            // Add more defensive checks for different possible structures
            const sourceStaffEntry = staffEntry.sourceStaffEntry || staffEntry.SourceStaffEntry;
            if (!sourceStaffEntry) return;
            
            const absoluteTimestamp = sourceStaffEntry.absoluteTimestamp || sourceStaffEntry.AbsoluteTimestamp;
            if (!absoluteTimestamp) return;
            
            const timestamp = absoluteTimestamp.realValue || absoluteTimestamp.RealValue || 0;
            const svgElements: SVGGElement[] = [];
            const midiNotes: number[] = [];
            
            // 🚨 GROK DEBUG: Track chord detection
            const notesAtThisTimestamp: number[] = [];
            
            // Log first few timestamps for development debugging
            if (process.env.NODE_ENV === 'development' && mappingCount < 10) {
              perfLogger.debug('Processing timestamp', { timestamp, measureIndex, mappingCount });
            }

            // Process voice entries - check both lowercase and uppercase
            const graphicalVoiceEntries = staffEntry.graphicalVoiceEntries || staffEntry.GraphicalVoiceEntries;
            if (graphicalVoiceEntries && Array.isArray(graphicalVoiceEntries)) {
              // Debug chord detection - ALWAYS CHECK
              const isChord = graphicalVoiceEntries.length > 1 || (graphicalVoiceEntries[0]?.notes?.length > 1);
              
              
              graphicalVoiceEntries.forEach((voiceEntry: any, voiceIndex: number) => {
                const notes = voiceEntry.notes || voiceEntry.Notes;
                if (notes && Array.isArray(notes)) {
                  notes.forEach((note: any, noteIndex: number) => {
                    // Debug note processing in development
                    if (process.env.NODE_ENV === 'development' && mappingCount < 10) {
                      perfLogger.debug('Processing note', {
                        noteIndex,
                        totalNotes: notes.length,
                        hasGetSVGGElement: typeof note.getSVGGElement === 'function',
                        hasGetSVGElement: typeof note.getSVGElement === 'function',
                        hasSvgElement: !!(note.svgElement || note.SVGElement)
                      });
                    }
                    
                    // Check for SVG element getter - OSMD 1.9.0 might use different method names
                    let svgElement = null;
                    
                    // 🔴 DEBUG: Track chord note SVG element status
                    const isChord = notes.length > 1;
                    const debugInfo = {
                      noteIndex,
                      totalNotes: notes.length,
                      isChord,
                      isFirstNote: noteIndex === 0,
                      isLastNote: noteIndex === notes.length - 1,
                      hasSvgElement: false
                    };
                    
                    if (typeof note.getSVGGElement === 'function') {
                      try {
                        svgElement = note.getSVGGElement();
                      } catch (err) {
                        // Silent catch
                      }
                    } else if (typeof note.getSVGElement === 'function') {
                      try {
                        svgElement = note.getSVGElement();
                      } catch (err) {
                        // Silent catch
                      }
                    } else if (note.svgElement || note.SVGElement) {
                      svgElement = note.svgElement || note.SVGElement;
                    }
                    
                    // 🔴 DEBUG: Log SVG element status for each chord note
                    debugInfo.hasSvgElement = !!svgElement;
                    if (isChord && process.env.NODE_ENV === 'development') {
                      perfLogger.debug(`🎵 CHORD NOTE ${noteIndex + 1}/${notes.length}:`, {
                        ...debugInfo,
                        svgElementId: svgElement?.id || 'NO_ELEMENT'
                      });
                    }
                    
                    if (svgElement) {
                      // Extract MIDI note number early to create note ID
                      // REVERTED: Using sourceNote approach that was working
                      const sourceNote = note.sourceNote || note.SourceNote;
                      const halfTone = sourceNote?.halfTone ?? sourceNote?.HalfTone;
                      
                      
                        
                      if (halfTone !== null && typeof halfTone === 'number') {
                          const midiNote = halfTone + 12; // OSMD uses C4=48, MIDI uses C4=60
                          
                          // Create fingering note ID for data attribute
                          const fingeringNoteId = createFullFingeringId(
                            measureIndex, staffIndex, voiceIndex, noteIndex, midiNote
                          );
                          
                          
                          // Visual debugging for chord notes (development only)
                          if (process.env.NODE_ENV === 'development' && isChord) {
                            // Color code based on position in chord
                            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00'];
                            const debugColor = colors[noteIndex % colors.length];
                            
                            // Check for VexFlow noteheads
                            const vfNoteheads = svgElement.querySelectorAll('.vf-notehead');
                            const pathNoteheads = svgElement.querySelectorAll('path[class*="notehead"]');
                            const allPaths = svgElement.querySelectorAll('path');
                            
                            perfLogger.debug('Chord note visual debug', {
                              fingeringNoteId,
                              notePosition: `${noteIndex + 1}/${notes.length}`,
                              vfNoteheads: vfNoteheads.length,
                              pathNoteheads: pathNoteheads.length,
                              totalPaths: allPaths.length,
                              svgElementTag: svgElement.tagName,
                              svgElementId: svgElement.id || 'NO_ID'
                            });
                            
                            // TEMPORARY: Enhanced DOM structure inspection for chord debugging
                            if (noteIndex === 0) { // Only log once per chord
                              perfLogger.debug('🔍 CHORD DOM STRUCTURE ANALYSIS:', {
                                svgElement: {
                                  tag: svgElement.tagName,
                                  className: svgElement.className?.baseVal || svgElement.className || 'NO_CLASS',
                                  id: svgElement.id || 'NO_ID',
                                  childCount: svgElement.children.length
                                },
                                children: Array.from(svgElement.children).map((child, i) => ({
                                  index: i,
                                  tag: child.tagName,
                                  className: child.className?.baseVal || child.className || 'NO_CLASS',
                                  id: child.id || 'NO_ID',
                                  attributes: Object.fromEntries(
                                    Array.from(child.attributes).map(attr => [attr.name, attr.value])
                                  ),
                                  hasChildren: child.children.length > 0,
                                  childTags: child.children.length > 0 ? 
                                    Array.from(child.children).map(c => c.tagName) : []
                                })),
                                vfNoteheadElements: Array.from(vfNoteheads).map((el, i) => ({
                                  index: i,
                                  tag: el.tagName,
                                  className: el.className?.baseVal || el.className,
                                  attributes: Object.fromEntries(
                                    Array.from(el.attributes).map(attr => [attr.name, attr.value])
                                  )
                                })),
                                allPathElements: Array.from(allPaths).map((el, i) => ({
                                  index: i,
                                  className: el.className?.baseVal || el.className || 'NO_CLASS',
                                  d: el.getAttribute('d')?.substring(0, 50) + '...', // Truncate path data
                                  attributes: Object.fromEntries(
                                    Array.from(el.attributes)
                                      .filter(attr => attr.name !== 'd') // Skip long path data
                                      .map(attr => [attr.name, attr.value])
                                  )
                                }))
                              });
                            }
                            
                            // Visual debugging - color the SVG element
                            svgElement.setAttribute('fill', debugColor);
                            svgElement.setAttribute('stroke', debugColor);
                            svgElement.setAttribute('data-debug-color', debugColor);
                            svgElement.setAttribute('data-debug-note-index', noteIndex.toString());
                          }
                          
                          // AI CONSENSUS FIX: Handle shared SVG elements by appending IDs
                          const existingIds = svgElement.getAttribute('data-note-id');
                          if (!existingIds) {
                            svgElement.setAttribute('data-note-id', fingeringNoteId);
                          } else if (!existingIds.split(',').includes(fingeringNoteId)) {
                            // Append new ID if not already present (prevents duplicates)
                            svgElement.setAttribute('data-note-id', `${existingIds},${fingeringNoteId}`);
                          }
                          
                          // Check for shared SVG elements in chords (development debugging)
                          if (process.env.NODE_ENV === 'development' && isChord && noteIndex > 0) {
                            const prevNoteId = svgElement.getAttribute('data-note-id');
                            if (prevNoteId) {
                              perfLogger.debug('Shared SVG element detected in chord', {
                                notePosition: `${noteIndex + 1}/${notes.length}`,
                                previousId: prevNoteId,
                                newId: fingeringNoteId,
                                warning: 'Previous note ID will be overwritten'
                              });
                            }
                          }
                          
                          
                          // MIDI calculation validation (development debugging)
                          if (process.env.NODE_ENV === 'development' && mappingCount < 20) {
                            const midiNoteOld = halfTone + 60; // Legacy calculation
                            perfLogger.debug('MIDI calculation analysis', {
                              halfTone,
                              midiNoteOld,
                              midiNoteNew: midiNote,
                              timestamp,
                              indices: `m${measureIndex}-s${staffIndex}-v${voiceIndex}-n${noteIndex}`,
                              warning: midiNoteOld > 100 ? 'MIDI value seems too high for piano range' : null
                            });
                          }
                          notesAtThisTimestamp.push(noteIndex);
                          
                          // Check for ID collisions BEFORE adding to map
                          if (graphicalNoteMap.has(fingeringNoteId)) {
                            if (process.env.NODE_ENV === 'development') {
                              perfLogger.warn('Fingering ID collision detected', {
                                collidingId: fingeringNoteId,
                                notePosition: `${noteIndex + 1}/${notes.length}`,
                                timestamp,
                                indices: `m${measureIndex}-s${staffIndex}-v${voiceIndex}-n${noteIndex}`
                              });
                            }
                            
                            collisions.push({
                              noteId: fingeringNoteId,
                              indices: `m${measureIndex}-s${staffIndex}-v${voiceIndex}-n${noteIndex}`,
                              timestamp,
                              midiNote
                            });
                          }
                          
                          // ALWAYS add to graphicalNoteMap for fingering click detection
                          if (process.env.NODE_ENV === 'development' && mappingCount < 10) {
                            perfLogger.debug('Setting graphicalNoteMap', { 
                              fingeringNoteId,
                              halfTone,
                              midiNote,
                              hasSourceNote: !!sourceNote
                            });
                          }
                          graphicalNoteMap.set(fingeringNoteId, note);
                          
                          // Only process MIDI-specific logic if in valid range
                          if (midiNote >= 0 && midiNote <= 127) { // Valid MIDI range
                            midiNotes.push(midiNote);
                            
                            // Build reverse lookup map
                            if (!midiToTimestamp.has(midiNote)) {
                              midiToTimestamp.set(midiNote, []);
                            }
                            midiToTimestamp.get(midiNote)!.push(timestamp);
                            
                            // Debug chord note IDs in development
                            if (process.env.NODE_ENV === 'development' && notes.length > 1) {
                              perfLogger.debug('Chord note processed', {
                                fingeringNoteId,
                                notePosition: `${noteIndex}/${notes.length}`,
                                midiNote,
                                halfTone,
                                targetIndex: noteIndex
                              });
                            }
                          }
                          
                          // Always push the svgElement to the array
                          svgElements.push(svgElement);
                      }
                    }
                  });
                }
              });
            }
            
            // Comprehensive chord analysis (development debugging)
            if (process.env.NODE_ENV === 'development' && notesAtThisTimestamp.length > 1) {
              const svgElementsFound = svgElements.filter(Boolean).length;
              const uniqueSvgElements = new Set(svgElements.filter(Boolean)).size;
              
              perfLogger.debug('Chord analysis summary', {
                timestamp,
                totalNotes: notesAtThisTimestamp.length,
                svgElementsFound,
                uniqueSvgElements,
                hasSharedElements: svgElementsFound !== uniqueSvgElements
              });
              
              // Check if multiple notes share the same SVG element
              const svgToNotes = new Map();
              notesAtThisTimestamp.forEach((noteData, idx) => {
                const svg = svgElements[idx];
                if (svg) {
                  const key = svg.id || svg;
                  if (!svgToNotes.has(key)) {
                    svgToNotes.set(key, []);
                  }
                  svgToNotes.get(key).push({
                    noteIndex: idx,
                    noteId: noteData
                  });
                }
              });
              
              // Report shared SVG elements
              svgToNotes.forEach((notes, svgKey) => {
                if (notes.length > 1) {
                  perfLogger.warn('Shared SVG element in chord', {
                    svgKey: typeof svgKey === 'string' ? svgKey : 'object',
                    sharedByNotes: notes.length,
                    warning: 'Only last note data-note-id will persist'
                  });
                }
              });
            }

            // Store mapping if we found SVG elements
            if (svgElements.length > 0) {
              noteMapping.set(timestamp, {
                timestamp,
                svgElements,
                noteId: `note-${timestamp}`,
                midiNote: midiNotes[0], // Primary MIDI note for this timestamp
              });
              mappingCount++;
            }
          });
        });
      });

      noteMappingRef.current = {
        noteMapping,
        midiToTimestamp,
        graphicalNoteMap
      };
      
      // Mark as built to prevent rebuilds
      noteMappingBuiltRef.current = true;
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('buildNoteMapping completed successfully');
      }
      perfLogger.debug('Built note mapping', {
        positions: mappingCount,
        uniqueMidiNotes: midiToTimestamp.size,
        fingeringNotes: graphicalNoteMap.size,
        mappingDifference: mappingCount - graphicalNoteMap.size
      });
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('Chord SVG element analysis completed', {
          totalPositions: mappingCount,
          uniqueMidiNotes: midiToTimestamp.size,
          fingeringNotes: graphicalNoteMap.size,
          potentialIssues: mappingCount - graphicalNoteMap.size,
          visualDebugInstructions: 'Check colored chord notes in sheet music for shared SVG elements'
        });
      }
      
      // Check for duplicate noteIds (should not happen if working correctly)
      const noteIds = Array.from(graphicalNoteMap.keys());
      const uniqueIds = new Set(noteIds);
      if (noteIds.length !== uniqueIds.size) {
        perfLogger.warn('Duplicate note IDs detected', {
          totalIds: noteIds.length,
          uniqueIds: uniqueIds.size,
          duplicates: noteIds.length - uniqueIds.size
        });
      } else if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('All note IDs are unique', { totalIds: noteIds.length });
      }
      
      // Analyze timestamps with multiple notes for potential collisions
      if (process.env.NODE_ENV === 'development') {
        const timestampCounts = new Map<number, number>();
        for (const [noteId] of graphicalNoteMap) {
          const match = noteId.match(/^t(.+)-m/);
          if (match) {
            const ts = parseFloat(match[1]);
            timestampCounts.set(ts, (timestampCounts.get(ts) || 0) + 1);
          }
        }
        const multiNoteTimestamps = Array.from(timestampCounts.entries())
          .filter(([_, count]) => count > 1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        if (multiNoteTimestamps.length > 0) {
          perfLogger.debug('Timestamps with multiple notes detected', {
            collisionProneTimestamps: multiNoteTimestamps.map(([ts, count]) => ({ timestamp: ts, noteCount: count }))
          });
        }
      }
      
      // Report ID collisions
      if (collisions.length > 0) {
        perfLogger.warn('Note ID collisions detected', {
          totalCollisions: collisions.length,
          firstCollisions: collisions.slice(0, 10).map(c => ({
            noteId: c.noteId,
            indices: c.indices,
            timestamp: c.timestamp,
            midiNote: c.midiNote
          })),
          suggestedFix: 'Use createFullFingeringId() instead of timestamp-based IDs'
        });
      } else if (process.env.NODE_ENV === 'development') {
        perfLogger.debug('No ID collisions detected - all noteIds are unique');
      }
      
    } catch (error) {
      perfLogger.error(' Failed to build note mapping:', error instanceof Error ? error : new Error(String(error)));
      if (error instanceof Error) {
        perfLogger.error('Error details:', error);
      }
    }
  }, []);

  // Handle resize with debouncing and scroll preservation
  const handleResize = useCallback(() => {
    if (!osmdRef.current || !isReady || !containerRef.current) return;

    // Clear any pending resize
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      try {
        // Save scroll position from parent section (new architecture)
        const parentSection = containerRef.current?.parentElement;
        const scrollPercent = parentSection 
          ? parentSection.scrollTop / parentSection.scrollHeight
          : 0;

        // Check dimensions before re-render
        const rect = containerRef.current?.getBoundingClientRect();
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug(`OSMD resize triggered. Container: ${rect?.width}x${rect?.height}`);
        }

        // Re-render OSMD with new dimensions and current zoom
        if (rect && rect.width > 0) {
          // Apply current zoom level before render
          if (osmdRef.current) {
            osmdRef.current.zoom = zoomLevel;
          }
          osmdRef.current?.render();
          
          // Re-inject data-note-id attributes after OSMD re-render
          // Use requestAnimationFrame to ensure DOM is fully updated
          requestAnimationFrame(() => {
            injectNoteIdAttributes();
          });
          
          // Note: We no longer rebuild note mappings on resize
          // The mapping is built once per score load

          // Re-show cursor after resize (fixes disappearing cursor issue)
          if (osmdRef.current?.cursor && autoShowCursor) {
            // Store current position before resize
            const currentPosition = osmdRef.current.cursor.iterator?.currentMeasureIndex || 0;
            
            // Ensure cursor stays visible after resize
            osmdRef.current.cursor.show();
            
            // Force cursor update to ensure visibility
            if (osmdRef.current.cursor.update) {
              osmdRef.current.cursor.update();
            }
            
            // Check and fix cursor element visibility
            requestAnimationFrame(() => {
              const cursorElement = containerRef.current?.querySelector('#selectionStartSymbol');
              if (cursorElement) {
                const style = (cursorElement as HTMLElement).style;
                if (style.display === 'none' || style.visibility === 'hidden') {
                  perfLogger.warn(' Cursor hidden after resize, forcing visibility');
                  style.display = 'block';
                  style.visibility = 'visible';
                }
              }
            });
            
            logger.osmd('Cursor re-shown after resize at measure:', currentPosition);
          }

          // Restore scroll position in parent section after next paint
          requestAnimationFrame(() => {
            if (parentSection && scrollPercent > 0) {
              parentSection.scrollTop = scrollPercent * parentSection.scrollHeight;
            }
          });

          if (process.env.NODE_ENV === 'development') {
            perfLogger.debug(' OSMD resized and re-rendered successfully');
          }
        }
      } catch (error) {
        perfLogger.error(' Resize render failed:', error instanceof Error ? error : new Error(String(error)));
      }
    }, 16); // One frame delay (16ms) for instant resize at 60fps
  }, [isReady, autoShowCursor, injectNoteIdAttributes, zoomLevel]);

  // Setup ResizeObserver for responsive behavior
  const setupResizeObserver = useCallback(() => {
    if (!containerRef.current || !osmdRef.current) return;

    // Clean up any existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (entries.length > 0 && entries[0].contentRect.width > 0) {
        handleResize();
      }
    });

    // Observe the parent container that actually changes size
    const observeTarget = containerRef.current.parentElement || containerRef.current;
    resizeObserverRef.current.observe(observeTarget);

    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug(' ResizeObserver setup for responsive sheet music');
    }
  }, [handleResize]);

  // Ensure ResizeObserver is set up when conditions are met
  useEffect(() => {
    if (isReady && osmdRef.current && containerRef.current) {
      setupResizeObserver();
      
      if (process.env.NODE_ENV === 'development') {
        perfLogger.debug(' ResizeObserver setup triggered by conditions');
      }
    }
  }, [isReady, setupResizeObserver]);
  
  // Effect to trigger re-render on zoom change
  useEffect(() => {
    if (isReady && osmdRef.current) {
      debouncedZoomRender();
    }
    
    // Cleanup on unmount (following o3's advice)
    return () => {
      debouncedZoomRender.cancel();
    };
  }, [zoomLevel, isReady, debouncedZoomRender]);
  
  // REMOVED: Order-based injection strategy (Strategy #3) - was actively harmful
  // This code assigned noteIds by DOM element order rather than musical relationships,
  // causing chord notes to get wrong IDs. Coordinate detection works as robust fallback.

  // Import the OSMD store to sync tempo extraction
  const { setOSMD: setOSMDInStore, setIsLoaded: setIsLoadedInStore } = useOSMDStore();

  // Load score into existing OSMD instance
  const loadScore = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      logger.osmd('loadScore called with', { 
        hasOSMD: !!osmdRef.current, 
        hasMusicXML: !!musicXML, 
        musicXMLLength: musicXML?.length 
      });
    }
    
    if (!osmdRef.current || !musicXML) return;
    
    try {
      setIsLoading(true);
      setError(null);
      noteMappingBuiltRef.current = false; // Reset when loading new score
      
      if (process.env.NODE_ENV === 'development') {
        logger.osmd('Loading new score into existing OSMD instance...');
      }
      
      // CRITICAL FIX: Properly dispose of previous score to prevent memory leak (120MB+ per song)
      if (osmdRef.current.GraphicSheet) {
        logger.osmd('Disposing previous score to prevent memory leak');
        
        // Clear all graphical music pages
        (osmdRef.current.GraphicSheet as any).MusicPages?.forEach((page: any) => {
          if (page && typeof page.clear === 'function') {
            page.clear();
          }
        });
        
        // Clear the OSMD instance
        osmdRef.current.clear();
        
        // Force clear the DOM container to remove detached nodes
        const svgContainer = containerRef.current?.querySelector('svg');
        if (svgContainer && svgContainer.parentNode) {
          svgContainer.parentNode.removeChild(svgContainer);
        }
      }
      
      // Reset note mappings to free memory
      noteMappingRef.current.noteMapping.clear();
      noteMappingRef.current.midiToTimestamp.clear();
      noteMappingRef.current.graphicalNoteMap.clear();
      
      // PROTOTYPE: Inject fingerings if native mode is enabled
      let xmlToLoad = musicXML;
      const useNativeFingerings = process.env.USE_NATIVE_FINGERINGS === 'true' || process.env.DEBUG_NATIVE_FINGERINGS === 'true';
      
      if (useNativeFingerings && scoreId) {
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('Native fingering mode enabled, injecting fingerings...');
        }
        
        // Benchmark the injection if in debug mode
        if (process.env.DEBUG_NATIVE_FINGERINGS === 'true') {
          const benchmark = await benchmarkFingeringInjection(musicXML, scoreId);
          perfLogger.debug('Fingering injection benchmark:', benchmark);
          
          if (!benchmark.success) {
            perfLogger.warn('Fingering injection exceeded 20ms threshold');
          }
        }
        
        // Inject fingerings into MusicXML
        try {
          xmlToLoad = await injectFingeringsIntoMusicXML(musicXML, scoreId);
        } catch (error) {
          perfLogger.error('Failed to inject fingerings, using original XML:', error);
          xmlToLoad = musicXML;
        }
      }
      
      // Load and render new score with separate timing
      const loadStart = performance.now();
      let loadTime = 0;
      let renderTime = 0;
      
      try {
        // Load phase
        await osmdRef.current.load(xmlToLoad);
        loadTime = performance.now() - loadStart;
        
        // Render phase with zoom
        const renderStart = performance.now();
        osmdRef.current.zoom = zoomLevel;
        osmdRef.current.render();
        renderTime = performance.now() - renderStart;
        
        // Log render time to ring buffer
        logRenderLatency(renderTime);
        
        // Debug: Check if render actually happened
        // Measure count captured above
        
        // Debug logging for slow operations
        const totalTime = loadTime + renderTime;
        if (totalTime > 1000) {
          perfLogger.debug(
            `Slow OSMD operation: ${totalTime.toFixed(0)}ms ` +
            `(load: ${loadTime.toFixed(0)}ms, render: ${renderTime.toFixed(0)}ms)`
          );
        }
        
        // Get measure count for consolidated log
        const measureCount = osmdRef.current?.GraphicSheet?.MeasureList?.length || 0;
      } catch (renderError) {
        perfLogger.error('OSMD render failed', renderError as Error);
        throw renderError;
      }
      
      // CRITICAL: Enable cursors after render
      if (autoShowCursor) {
        osmdRef.current.enableOrDisableCursors?.(true);
      }
      
      // Sync with OSMD store for tempo extraction
      setOSMDInStore(osmdRef.current);
      
      // Consolidated log for entire OSMD load operation
      const measureCount = osmdRef.current?.GraphicSheet?.MeasureList?.length || 0;
      if (measureCount > 0) {
        logger.osmd(`Score loaded (${measureCount} measures)`);
        
        // Inspect OSMD DOM structure (development debugging)
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('OSMD DOM inspection started');
          if (containerRef.current) {
            const svg = containerRef.current.querySelector('svg');
            
            if (svg) {
              // Find all text elements (potential fingerings)
              const textElements = svg.querySelectorAll('text');
              const fingeringTexts = svg.querySelectorAll('text.vf-fingering');
              
              // Sample first few text elements
              const sampleTexts = Array.from(textElements).slice(0, 5).map((text, i) => ({
                index: i,
                content: text.textContent,
                className: typeof text.className === 'string' ? text.className : (text.className as SVGAnimatedString).baseVal,
                parentClass: text.parentElement ? (typeof text.parentElement.className === 'string' ? text.parentElement.className : (text.parentElement.className as SVGAnimatedString).baseVal) : undefined
              }));
              
              // Check for various VexFlow classes
              const classCheck = {
                'vf-note': svg.querySelectorAll('.vf-note').length,
                'vf-notehead': svg.querySelectorAll('.vf-notehead').length,
                'vf-stavenote': svg.querySelectorAll('.vf-stavenote').length,
                'vf-modifiers': svg.querySelectorAll('.vf-modifiers').length,
                'vf-fingering': svg.querySelectorAll('.vf-fingering').length
              };
              
              perfLogger.debug('OSMD DOM structure analyzed', {
                svgFound: true,
                totalTextElements: textElements.length,
                fingeringTexts: fingeringTexts.length,
                sampleTexts,
                classCheck
              });
            } else {
              perfLogger.debug('OSMD DOM structure analyzed', { svgFound: false });
            }
          }
        }
      }
      
      // Let SVG content naturally determine height for proper scrolling
      // Note: Removed dynamic minHeight setting which interfered with flexbox scrolling

      // Setup manual ResizeObserver for responsive behavior and cursor positioning
      setupResizeObserver();
      
      // Wait for the next animation frame to ensure SVG elements are rendered
      requestAnimationFrame(() => {
        // Build note-to-MIDI mapping for fast path (critical for <30ms latency)
        buildNoteMapping();
        
        // IMMEDIATE DOM CHECK - What exists right after render?
        if (process.env.NODE_ENV === 'development') {
          perfLogger.debug('Post-render DOM check', {
            timestamp: Date.now(),
            containerChildren: containerRef.current?.children.length,
            svgExists: !!containerRef.current?.querySelector('svg'),
            noteHeads: containerRef.current?.querySelectorAll('.vf-notehead').length || 0,
            anyG: containerRef.current?.querySelectorAll('g').length || 0
          });
        }
        
        // AI CONSENSUS FIX: Inject data-note-id attributes after initial render
        // Use nested requestAnimationFrame to ensure DOM is fully committed
        requestAnimationFrame(() => {
          injectNoteIdAttributes();
        });
        
        //  MINIMAL CURSOR IMPLEMENTATION
        if (process.env.NODE_ENV === 'development') {
          logger.osmd('Cursor init check', {
            hasOSMD: !!osmdRef.current,
            autoShowCursor,
            hasCursor: !!osmdRef.current?.cursor
          });
        }
        
        try {
          if (osmdRef.current && autoShowCursor) {
            // Ensure cursor exists before trying to use it
            if (!osmdRef.current.cursor) {
              perfLogger.debug(' Cursor not ready yet, will retry...');
              setTimeout(() => {
                if (osmdRef.current?.cursor) {
                  osmdRef.current.cursor.reset();
                  osmdRef.current.cursor.show();
                  const cursor = osmdRef.current.cursor as any;
                  if (cursor.update) {
                    cursor.update();
                  }
                  
                  // Fix cursor z-index for delayed showing
                  requestAnimationFrame(() => {
                    const cursorElements = containerRef.current?.querySelectorAll('[id^="cursorImg"]');
                    if (cursorElements && cursorElements.length > 0) {
                      cursorElements.forEach((element) => {
                        const cursorEl = element as HTMLElement;
                        cursorEl.style.zIndex = '1000';
                        cursorEl.style.display = 'block';
                        cursorEl.style.visibility = 'visible';
                      });
                    }
                  });
                  
                  perfLogger.debug(' OSMD cursor shown (delayed)');
                }
              }, 100);
            } else {
              osmdRef.current.cursor.reset(); // Position at start
              osmdRef.current.cursor.show();  // Make visible
              
              // Force cursor update to ensure visibility
              const cursor = osmdRef.current.cursor as any;
              if (cursor.update) {
                cursor.update();
              }
              
              // Fix cursor z-index immediately after showing
              requestAnimationFrame(() => {
                const cursorElements = containerRef.current?.querySelectorAll('[id^="cursorImg"]');
                if (cursorElements && cursorElements.length > 0) {
                  cursorElements.forEach((element) => {
                    const cursorEl = element as HTMLElement;
                    cursorEl.style.zIndex = '1000';
                    cursorEl.style.display = 'block';
                    cursorEl.style.visibility = 'visible';
                  });
                }
              });
              
              perfLogger.debug(' OSMD cursor shown');
            }
          }
        } catch (err) {
          perfLogger.error(' Cursor initialization error:', err instanceof Error ? err : new Error(String(err)));
        }
        
        setIsReady(true);
        
        // Mark as loaded in the store to trigger tempo extraction
        perfLogger.debug(' Marking OSMD as loaded in store to trigger tempo extraction...');
        setIsLoadedInStore(true);
        
        // Phase 1 optimization: Generate pre-computed practice sequence
        if (Flags.preComputedSequence && osmdRef.current) {
          try {
            // Generate pre-computed practice sequence
            const result = PracticeSequenceBuilder.build(osmdRef.current);
            
            // Sequence generation complete
            
            // Store sequence in practice store for O(1) access during practice
            setOptimizedSequence(result.steps);
            
            // CRITICAL FIX: Reset auto-created cursor after pre-computation
            // PracticeSequenceBuilder traverses the entire score, leaving cursor at the end
            if (osmdRef.current.cursor && autoShowCursor) {
              // Debug: Log cursor state before reset
              const cursorBefore = osmdRef.current.cursor as any;
              if (process.env.NODE_ENV === 'development') {
                perfLogger.debug('[DEBUG] Cursor state BEFORE reset:', {
                  hasIterator: !!cursorBefore.iterator,
                  endReached: cursorBefore.iterator?.EndReached,
                  position: cursorBefore.iterator?.currentMeasureIndex,
                  voiceEntry: cursorBefore.iterator?.currentVoiceEntryIndex
                });
              }
              
              // Force a complete cursor reset and visibility restoration
              osmdRef.current.cursor.reset();
              perfLogger.debug(' OSMD cursor reset after pre-computation');
              
              // Debug: Log cursor state after reset
              const cursorAfter = osmdRef.current.cursor as any;
              if (process.env.NODE_ENV === 'development') {
                perfLogger.debug('[DEBUG] Cursor state AFTER reset:', {
                  hasIterator: !!cursorAfter.iterator,
                  endReached: cursorAfter.iterator?.EndReached,
                  position: cursorAfter.iterator?.currentMeasureIndex,
                  voiceEntry: cursorAfter.iterator?.currentVoiceEntryIndex
                });
              }
              
              // CRITICAL: Ensure cursor is truly reset
              // PracticeSequenceBuilder can leave EndReached=true even after reset
              if (cursorAfter.iterator?.EndReached) {
                perfLogger.warn('[useOSMD] Cursor still at end after reset, forcing clean state');
                cursorAfter.iterator.EndReached = false;
                osmdRef.current.cursor.reset();
                if (process.env.NODE_ENV === 'development') {
                  perfLogger.debug('[DEBUG] Forced EndReached=false and reset again');
                }
              }
              
              // Ensure cursor is shown and properly rendered
              osmdRef.current.cursor.show();
              
              // Force cursor update to ensure visibility
              // Note: update() exists but may not be in TypeScript definitions
              const cursor = osmdRef.current.cursor as any;
              if (cursor.update) {
                cursor.update();
              }
              
              // Additional safeguard: Fix cursor z-index and visibility
              requestAnimationFrame(() => {
                // OSMD uses dynamic cursor IDs like cursorImg-0, cursorImg-1, etc.
                const cursorElements = containerRef.current?.querySelectorAll('[id^="cursorImg"]');
                if (cursorElements && cursorElements.length > 0) {
                  cursorElements.forEach((element) => {
                    const cursorEl = element as HTMLElement;
                    // Fix z-index issue (cursor was behind sheet music with z-index: -1)
                    cursorEl.style.zIndex = '1000';
                    cursorEl.style.display = 'block';
                    cursorEl.style.visibility = 'visible';
                    // Fixed cursor element z-index and visibility
                  });
                } else {
                  perfLogger.warn(' No cursor elements found with ID pattern cursorImg*');
                }
                // OSMD cursor visibility restored
              });
            }
            
          } catch (error) {
            perfLogger.error('[useOSMD] Failed to generate practice sequence:', error instanceof Error ? error : new Error(String(error)));
            // Fallback to legacy real-time extraction
            setOptimizedSequence([]); // Clear any existing sequence
          }
        }
      });
      
      // Performance logging already handled by performance-logger

    } catch (err) {
      const error = err as Error;
      setError(error);
      perfLogger.error(' Score loading failed:', error);
      
      // Don't destroy or clear the instance on error
      // OSMD will handle its own state when loading the next score
      
      // Reset store state on error
      setOSMDInStore(null);
      setIsLoadedInStore(false);
    } finally {
      setIsLoading(false);
    }
  }, [musicXML, autoShowCursor, setupResizeObserver, buildNoteMapping]);

  // Fast path note highlighting (critical for <30ms latency)
  const highlightNote = useCallback((noteNumber: number, velocity: number = 100) => {
    if (!isReady || !osmdRef.current) return;

    const timestamps = noteMappingRef.current.midiToTimestamp.get(noteNumber);
    if (!timestamps || timestamps.length === 0) return;

    // Calculate visual feedback based on velocity (Code review:'s innovation)
    const feedback = calculateVisualFeedback(velocity);
    
    // Performance tracking
    const highlightStart = performance.now();
    
    // Batch all DOM operations in a single animation frame for better performance
    requestAnimationFrame(() => {
      // Pre-calculate style values to avoid string allocations in the loop
      const strokeWidthValue = feedback.strokeWidth + 'px';
      const opacityValue = String(feedback.opacity);
      const filterValue = feedback.glowIntensity && feedback.glowIntensity > 5 
        ? `drop-shadow(0 0 ${feedback.glowIntensity}px ${feedback.color})`
        : '';
      
      // Apply highlighting to all timestamps for this MIDI note
      timestamps.forEach(timestamp => {
        const mapping = noteMappingRef.current.noteMapping.get(timestamp);
        if (mapping) {
          // Direct SVG manipulation for maximum performance
          mapping.svgElements.forEach(element => {
            // Batch style changes for better performance
            element.style.cssText += `fill: ${feedback.color}; stroke-width: ${strokeWidthValue}; opacity: ${opacityValue};${filterValue ? ` filter: ${filterValue};` : ''}`;
            element.classList.add('note-highlighted');
          });
        }
      });
    });

    // Performance monitoring
    if (process.env.NODE_ENV === 'development') {
      const highlightTime = performance.now() - highlightStart;
      performanceRef.current.highlightCount++;
      
      if (highlightTime > 30) {
        perfLogger.warn(` Highlight latency: ${highlightTime.toFixed(2)}ms (target: <30ms)`);
      }
    }
  }, [isReady, calculateVisualFeedback]);

  // Remove note highlighting
  const unhighlightNote = useCallback((noteNumber: number) => {
    if (!isReady) return;

    const timestamps = noteMappingRef.current.midiToTimestamp.get(noteNumber);
    if (!timestamps) return;

    // Batch all DOM operations in a single animation frame
    requestAnimationFrame(() => {
      timestamps.forEach(timestamp => {
        const mapping = noteMappingRef.current.noteMapping.get(timestamp);
        if (mapping) {
          mapping.svgElements.forEach(element => {
            // Reset styles efficiently by removing inline styles
            element.style.removeProperty('fill');
            element.style.removeProperty('stroke-width');
            element.style.removeProperty('opacity');
            element.style.removeProperty('filter');
            element.classList.remove('note-highlighted');
          });
        }
      });
    });
  }, [isReady]);

  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    if (!containerRef.current) return;

    requestAnimationFrame(() => {
      // More efficient: get highlighted elements once and batch operations
      const highlightedElements = containerRef.current!.getElementsByClassName('note-highlighted');
      // Convert to array once to avoid live collection performance issues
      const elementsArray = Array.from(highlightedElements) as HTMLElement[];
      
      elementsArray.forEach(el => {
        // Remove inline styles efficiently
        el.style.removeProperty('fill');
        el.style.removeProperty('stroke-width');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
        el.classList.remove('note-highlighted');
      });
    });

    performanceRef.current.highlightCount = 0;
  }, []);

  // Update playback position (for future playback features)
  const updatePlaybackPosition = useCallback((timestamp: number) => {
    if (!isReady || !osmdRef.current) return;
    
    // Future: Implement cursor movement for playback
    perfLogger.debug(` Playback position: ${timestamp}`);
  }, [isReady]);

  // Get currently visible notes (for optimization)
  const getVisibleNotes = useCallback((): number[] => {
    if (!isReady) return [];
    
    // Future: Implement viewport-based optimization
    return Array.from(noteMappingRef.current.midiToTimestamp.keys());
  }, [isReady]);

  // Helper function to extract notes from voice entry
  const extractNotesFromVoiceEntry = useCallback((voiceEntry: any): PracticeNote[] => {
    const notes: PracticeNote[] = [];
    
    if (!voiceEntry || !voiceEntry.Notes) {
      return notes;
    }
    
    for (const note of voiceEntry.Notes) {
      // Skip tied note continuations
      if (note.Tie && note.Tie.StartNote !== note) continue;
      
      const pitch = note.Pitch;
      if (!pitch) continue;
      
      // Calculate MIDI value from OSMD's halfTone
      const sourceNote = note.sourceNote || note.SourceNote;
      const halfTone = sourceNote?.halfTone ?? sourceNote?.HalfTone;
      if (halfTone === undefined) continue;
      
      // OSMD's halfTone is offset from C0 (MIDI 12)
      const midiValue = Math.max(0, Math.min(127, halfTone + 12));
      
      notes.push({
        midiValue,
        pitchName: extractNoteNameFromPitch(pitch, midiValue),
        octave: pitch.Octave ?? Math.floor(midiValue / 12) - 1
      });
    }
    
    return notes;
  }, []);

  //  CLEAN CURSOR API: Simple access to OSMD cursor
  // getExpectedNotesAtCursor - simplified for practice mode
  const getExpectedNotesAtCursor = useCallback((): PracticeStepResult => {
    if (!osmdRef.current) {
      perfLogger.error('getExpectedNotesAtCursor: No OSMD instance');
      return { type: 'END_OF_SCORE' };
    }
    
    try {
      // Simple cursor access - trust OSMD native implementation
      if (!osmdRef.current.cursor) {
        return { type: 'END_OF_SCORE' };
      }
      const cursor = osmdRef.current.cursor;
      if (!cursor || !cursor.iterator) {
        return { type: 'END_OF_SCORE' };
      }
      
      // Get current cursor position
      const iterator = cursor.iterator;
      const currentVoiceEntry = (iterator as any).Current;
      
      if (!currentVoiceEntry || iterator.EndReached || iterator.endReached) {
        return { type: 'END_OF_SCORE' };
      }
      
      // Extract notes from current position
      const notes = extractNotesFromVoiceEntry(currentVoiceEntry);
      
      if (notes.length === 0) {
        // This is a rest
        return {
          notes: [],
          isChord: false,
          isRest: true,
          measureIndex: iterator.currentMeasureIndex || 0,
          timestamp: Date.now(),
        };
      }
      
      return {
        notes,
        isChord: notes.length > 1,
        isRest: false,
        measureIndex: iterator.currentMeasureIndex || 0,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      perfLogger.error('Error getting expected notes at cursor:', error instanceof Error ? error : new Error(String(error)));
      return { type: 'END_OF_SCORE' };
    }
  }, [isReady]);

  // Removed hideCursor - using OSMD native API directly

  // Removed nextCursorPosition - using OSMD native API directly (osmdRef.current.cursor.next())

  // Removed previousCursorPosition - using OSMD native API directly (osmdRef.current.cursor.previous())

  // Removed setCursorToMeasure - using OSMD native API directly (osmdRef.current.cursor.reset() + cursor.next())

  // Removed getCursorPosition - using OSMD native API directly (osmdRef.current.cursor.iterator.currentMeasureIndex)

  // Removed duplicate getExpectedNotesAtCursor - using clean implementation above

  //  CLEAN CURSOR: Memoized controls object with direct cursor access
  const controls = useMemo((): OSMDControls => ({
    highlightNote,
    unhighlightNote,
    clearAllHighlights,
    updatePlaybackPosition,
    getVisibleNotes,
    cursor: osmdRef.current?.cursor, // Direct access to OSMD auto-created cursor
    getExpectedNotesAtCursor,
  }), [highlightNote, unhighlightNote, clearAllHighlights, updatePlaybackPosition, getVisibleNotes, getExpectedNotesAtCursor, osmdReady]);

  // Create OSMD instance once on mount
  useEffect(() => {
    let cancelled = false;
    
    const initInstance = async () => {
      if (cancelled) return;
      try {
        await createOSMDInstance();
      } catch (error) {
        perfLogger.error('Failed to initialize OSMD instance:', error as Error);
        setError(error as Error);
      }
    };
    
    initInstance().catch((error) => {
      perfLogger.error('Uncaught error in OSMD initialization:', error);
      setError(error);
    });
    
    // Cleanup function
    return () => {
      cancelled = true;
      if (osmdRef.current) {
        osmdRef.current = null;
      }
      setOsmdReady(false);
    };
  }, [createOSMDInstance]);

  // Load score when OSMD instance is ready AND musicXML changes
  useEffect(() => {
    // Wait for OSMD instance to be ready
    if (!osmdReady) return;
    
    if (!musicXML) {
      // Clear the score display if musicXML is null/undefined
      if (osmdRef.current) {
        try {
          // Only clear the visual content, don't destroy the instance
          osmdRef.current.clear();
          // Clear mappings
          noteMappingRef.current.noteMapping.clear();
          noteMappingRef.current.midiToTimestamp.clear();
          noteMappingRef.current.graphicalNoteMap.clear();
          noteMappingBuiltRef.current = false; // Reset for next score
          setIsReady(false);
          
          // Reset store state when clearing
          setOSMDInStore(null);
          setIsLoadedInStore(false);
        } catch (err) {
          perfLogger.warn(' Failed to clear OSMD:', err);
        }
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      performance.mark('osmd-init-start');
    }
    
    loadScore().catch((error) => {
      perfLogger.error('Uncaught error in score loading:', error);
      setError(error);
    });
  }, [osmdReady, musicXML]); // Removed loadScore from deps to prevent double loading

  // Enable theme re-rendering with cursor preservation
  useOSMDTheme(osmdRef.current, theme);

  // Add global debug function
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).debugOSMDCursorPosition = () => {
        if (osmdRef.current && osmdRef.current.cursor) {
          const cursor = osmdRef.current.cursor;
          const iterator = cursor.iterator;
          return {
            measure: iterator?.currentMeasureIndex || 0,
            note: iterator?.currentVoiceEntryIndex || 0,
            endReached: iterator?.EndReached || iterator?.endReached || false
          };
        } else {
          perfLogger.warn('No OSMD instance available for debugging');
          return null;
        }
      };
      // Debug commands only with explicit debug flag
      const DEBUG_CURSOR = localStorage.getItem('debug:cursor') === 'true';
      if (DEBUG_CURSOR) {
        logger.osmd('Debug cursor position: run window.debugOSMDCursorPosition() in console');
        
        // Simple cursor debug function
        (window as any).showCursor = () => {
          if (osmdRef.current?.cursor) {
            osmdRef.current.cursor.reset();
            osmdRef.current.cursor.show();
            perfLogger.debug(' Cursor shown at start position');
          } else {
            perfLogger.debug(' No OSMD cursor available');
          }
        };
        logger.osmd('Show cursor: run window.showCursor() in console');
        
        // Monitor cursor mutations
        (window as any).monitorCursor = () => {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              const target = mutation.target as HTMLElement;
              if (target.id?.includes('cursor') || 
                  (mutation.removedNodes.length > 0 && 
                   Array.from(mutation.removedNodes).some((node: any) => 
                     node.id?.includes('cursor') || node.classList?.contains('cursor')))) {
                if (process.env.NODE_ENV === 'development') {
                  perfLogger.debug('Cursor mutation detected', {
                    type: mutation.type,
                    targetId: target.id,
                    removedNodes: mutation.removedNodes.length,
                    addedNodes: mutation.addedNodes.length,
                    timestamp: Date.now()
                  });
                }
              }
            });
          });
          
          const container = containerRef.current;
          if (container) {
            observer.observe(container, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['style', 'display', 'visibility']
            });
            perfLogger.debug(' Now monitoring cursor mutations in container');
          }
        };
        logger.osmd('Monitor cursor: run window.monitorCursor() in console');
      }
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        delete (window as any).debugOSMDCursorPosition;
        delete (window as any).showCursor;
        delete (window as any).monitorCursor;
      }
    };
  }, []);
  
  // Expose OSMD instance to window when it changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && osmdRef.current) {
      (window as any).osmd = osmdRef.current;
      // OSMD instance exposed to window.osmd
      
      // Add a global function to fix cursor visibility
      (window as any).fixOSMDCursor = () => {
        if (osmdRef.current?.cursor) {
          osmdRef.current.cursor.reset();
          osmdRef.current.cursor.show();
          const cursor = osmdRef.current.cursor as any;
          if (cursor.update) {
            cursor.update();
          }
          
          // Fix z-index for all cursor elements
          const cursorElements = document.querySelectorAll('[id^="cursorImg"]');
          cursorElements.forEach((element) => {
            const cursorEl = element as HTMLElement;
            cursorEl.style.zIndex = '1000';
            cursorEl.style.display = 'block';
            cursorEl.style.visibility = 'visible';
          });
          
          perfLogger.debug(' Cursor fixed via window.fixOSMDCursor()');
          return 'Cursor fixed!';
        }
        return 'No OSMD cursor found';
      };
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        delete (window as any).osmd;
        delete (window as any).fixOSMDCursor;
      }
    };
  }, [osmdReady, isReady]); // Update when OSMD instance is ready

  // Removed cursor visibility monitoring - using OSMD native API only

  // Cleanup effect (critical for memory management)
  useEffect(() => {
    return () => {
      // Cleanup ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Clear any pending resize timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      // CRITICAL: Proper OSMD disposal to prevent memory leaks
      if (osmdRef.current) {
        try {
          // Clear all graphical music pages first
          if ((osmdRef.current.GraphicSheet as any)?.MusicPages) {
            (osmdRef.current.GraphicSheet as any).MusicPages.forEach((page: any) => {
              if (page && typeof page.clear === 'function') {
                page.clear();
              }
            });
          }
          
          // Clear the OSMD instance
          osmdRef.current.clear();
          
          // Hint for garbage collection in dev mode
          if (process.env.NODE_ENV === 'development' && (window as any).performance?.memory) {
            perfLogger.debug(' Memory before cleanup', {
              memoryMB: (window as any).performance.memory.usedJSHeapSize / 1048576
            });
          }
        } catch (error) {
          perfLogger.warn(' OSMD cleanup warning:', error);
        }
        osmdRef.current = null;
      }

      // Clear DOM container completely
      if (containerRef.current) {
        // Remove all child nodes to ensure no detached DOM references
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      // Clear mappings
      noteMappingRef.current.noteMapping.clear();
      noteMappingRef.current.midiToTimestamp.clear();
      noteMappingRef.current.graphicalNoteMap.clear();

      perfLogger.debug(' OSMD hook cleaned up');
    };
  }, []);

  // DEBUG: Simplified DOM inspection
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      perfLogger.debug('🎯 DEBUG Effect triggered', { 
        isReady,
        hasGraphicalNoteMap: noteMappingRef.current.graphicalNoteMap.size,
        timestamp: Date.now()
      });
      
      if (!isReady || !containerRef.current) {
        perfLogger.debug('❌ DEBUG skipped: not ready');
        return;
      }
    
      // Simple DOM inspection after a short delay
      const timer = setTimeout(() => {
        perfLogger.debug('🔍 DEBUG: Checking OSMD DOM after render...');
        const svg = containerRef.current?.querySelector('svg');
        
        if (!svg) {
          perfLogger.debug('❌ No SVG found in container');
          return;
        }
        
        // Log what we find
        perfLogger.debug('✅ SVG found, inspecting structure...');
        perfLogger.debug('GraphicalNoteMap keys:', Array.from(noteMappingRef.current.graphicalNoteMap.keys()).slice(0, 5));
      
      // Find fingering elements
      const fingeringElements = svg.querySelectorAll('text');
      let fingeringCount = 0;
      
      fingeringElements.forEach((text) => {
        const content = text.textContent?.trim();
        if (content && /^[1-5]$/.test(content)) {
          fingeringCount++;
          if (fingeringCount <= 3) {
            const parentClass = (() => {
              const className = text.parentElement?.className;
              if (!className) return undefined;
              if (typeof className === 'string') return className;
              return (className as SVGAnimatedString).baseVal;
            })();
            
            perfLogger.debug(`Fingering found: "${content}"`, {
              class: typeof text.className === 'string' ? text.className : (text.className as SVGAnimatedString).baseVal,
              parent: text.parentElement?.tagName,
              parentClass
            });
          }
        }
      });
      
      perfLogger.debug(`Total fingering elements: ${fingeringCount}`);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // Detect repeats in the score
  const detectRepeats = useCallback(() => {
    if (!osmdRef.current) return [];
    
    const repeats: Array<{ type: string; measureIndex: number }> = [];
    
    try {
      // Use correct OSMD property name
      const musicSheet = (osmdRef.current as any).sheet || (osmdRef.current as any).Sheet;
      if (!musicSheet) return [];
      
      // Check each measure for repeat signs
      musicSheet.SourceMeasures?.forEach((measure: any, index: number) => {
        // Check for repeat barlines
        if (measure.FirstRepetitionInstructions && measure.FirstRepetitionInstructions.length > 0) {
          measure.FirstRepetitionInstructions.forEach((instruction: any) => {
            if (instruction.type === 0) { // RepeatStartInstruction
              repeats.push({ type: 'repeat_start', measureIndex: index });
            } else if (instruction.type === 1) { // RepeatEndInstruction
              repeats.push({ type: 'repeat_end', measureIndex: index });
            }
          });
        }
        
        // Check for D.C. al Fine, D.S. al Coda, etc.
        if (measure.LastRepetitionInstructions && measure.LastRepetitionInstructions.length > 0) {
          measure.LastRepetitionInstructions.forEach((instruction: any) => {
            if (instruction.type === 2) { // DaCapo
              repeats.push({ type: 'dc_al_fine', measureIndex: index });
            } else if (instruction.type === 3) { // DalSegno
              repeats.push({ type: 'ds_al_coda', measureIndex: index });
            }
          });
        }
      });
    } catch (error) {
      perfLogger.warn('Error detecting repeats:', error);
    }
    
    return repeats;
  }, []);

  return {
    osmd: osmdRef.current,
    isLoading,
    isReady,
    osmdReady,
    error,
    controls,
    noteMapping: noteMappingRef.current.noteMapping,
    graphicalNoteMap: noteMappingRef.current.graphicalNoteMap,
    detectRepeats,
  };
};