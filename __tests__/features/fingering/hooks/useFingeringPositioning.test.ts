// Specific tests for the useFingeringPositioning hook
// Focus on position calculation, OSMD integration, and performance

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';

// These imports will fail until implementation
// import { useFingeringPositioning } from '@/renderer/features/fingering/hooks/useFingeringPositioning';
// import { useOSMDContext } from '@/renderer/contexts/OSMDContext';
// import { parseFingeringId } from '@/renderer/features/fingering/utils/fingeringId';

// Mock OSMD context
const mockGraphicalNoteMap = new Map();
const mockOSMDContext = {
  osmd: {
    GraphicSheet: { MeasureList: [] }
  },
  graphicalNoteMap: mockGraphicalNoteMap
};

jest.mock('@/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => mockOSMDContext
}));

jest.mock('@/renderer/features/fingering/utils/fingeringId');

describe('useFingeringPositioning Hook - Detailed Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphicalNoteMap.clear();
    // Reset window flag
    (window as any).__fingeringParseWarningShown = false;
  });

  describe('O(1) Position Lookup', () => {
    test('should use graphical note map for instant lookup', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: jest.fn().mockReturnValue({
            x: 100,
            y: 200,
            width: 20,
            height: 30
          })
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        // Should be instant lookup, not iteration
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        expect(position).toEqual({
          x: 110, // center: 100 + 20/2
          y: 190, // above: 200 - max(10, 30*0.3)
          noteElement: mockNote
        });
        
        // Should get from map, not iterate
        expect(mockNote.getBoundingBox).toHaveBeenCalledTimes(1);
      }).toThrow('O(1) lookup - not implemented yet');
    });

    test('should measure sub-millisecond performance', () => {
      expect(() => {
        // Setup 1000 notes in map
        for (let i = 0; i < 1000; i++) {
          mockGraphicalNoteMap.set(
            `t${i}-m${60 + (i % 88)}`,
            {
              getBoundingBox: () => ({
                x: i * 5,
                y: 100,
                width: 20,
                height: 30
              })
            }
          );
        }
        
        jest.mocked(parseFingeringId).mockImplementation((id) => {
          const match = id.match(/t(\d+)-m(\d+)/);
          return match ? {
            timestamp: parseInt(match[1]),
            midiValue: parseInt(match[2])
          } : null;
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        // Measure single lookup time
        const iterations = 100;
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          result.current.getFingeringPosition('t500-m80');
        }
        
        const avgTime = (performance.now() - startTime) / iterations;
        
        // Should be sub-millisecond per lookup
        expect(avgTime).toBeLessThan(0.1); // <0.1ms
      }).toThrow('Sub-millisecond performance - not implemented yet');
    });
  });

  describe('Error Handling', () => {
    test('should return null for missing notes', () => {
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        // Note not in map
        const position = result.current.getFingeringPosition('t1.5-m60');
        expect(position).toBeNull();
      }).toThrow('Missing note handling - not implemented yet');
    });

    test('should log parse errors once per session', () => {
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue(null);
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        // First invalid ID should warn
        result.current.getFingeringPosition('invalid-id-1');
        expect(warnSpy).toHaveBeenCalledWith(
          'Failed to parse fingering ID:',
          'invalid-id-1'
        );
        expect((window as any).__fingeringParseWarningShown).toBe(true);
        
        // Reset spy
        warnSpy.mockClear();
        
        // Subsequent invalid IDs should not warn
        result.current.getFingeringPosition('invalid-id-2');
        result.current.getFingeringPosition('invalid-id-3');
        expect(warnSpy).not.toHaveBeenCalled();
        
        warnSpy.mockRestore();
      }).toThrow('Parse error logging - not implemented yet');
    });

    test('should handle getBoundingBox errors gracefully', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: jest.fn().mockImplementation(() => {
            throw new Error('Bounding box error');
          })
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        expect(position).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          'Error getting fingering position:',
          expect.any(Error)
        );
        
        warnSpy.mockRestore();
      }).toThrow('Bounding box error handling - not implemented yet');
    });

    test('should handle missing OSMD context', () => {
      expect(() => {
        // Temporarily clear context
        mockOSMDContext.graphicalNoteMap = null as any;
        
        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        expect(position).toBeNull();
        
        // Restore
        mockOSMDContext.graphicalNoteMap = mockGraphicalNoteMap;
      }).toThrow('Missing context handling - not implemented yet');
    });
  });

  describe('Dynamic Positioning', () => {
    test('should position fingering below note for downward stems', () => {
      // COVERAGE VALIDATOR: Critical for bass clef notation
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue({ timestamp: 1.0, midiValue: 48 });

        // Mock a note with a downward stem (e.g., from bass clef)
        const noteWithDownwardStem = {
          getBoundingBox: () => ({ x: 150, y: 300, width: 20, height: 30 }),
          stemDirection: -1 // OSMD convention: 1 for up, -1 for down
        };
        mockGraphicalNoteMap.set('t1-m48', noteWithDownwardStem);

        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1-m48');

        // Position should be calculated BELOW the note's bounding box
        const expectedY = 300 + 30 + 10; // y + height + offset
        
        expect(position?.y).toBe(expectedY);
        expect(position?.x).toBe(160); // 150 + 20/2
      }).toThrow('Downward stem positioning - not implemented yet');
    });

    test('should default to above positioning when stemDirection is undefined', () => {
      // CLARITY INSPECTOR: Handle missing stemDirection field
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue({ timestamp: 1.0, midiValue: 60 });

        // Note without stemDirection (common in OSMD)
        const noStemNote = {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
          // No stemDirection property
        };
        mockGraphicalNoteMap.set('t1-m60', noStemNote);

        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1-m60');

        // Should default to above positioning
        expect(position?.y).toBe(190); // 200 - 10 (above note)
        expect(position?.x).toBe(110); // 100 + 20/2
      }).toThrow('Default stem positioning - not implemented yet');
    });

    test('should calculate offset based on note height', () => {
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        // Small note
        const smallNote = {
          getBoundingBox: () => ({ x: 100, y: 200, width: 10, height: 15 })
        };
        mockGraphicalNoteMap.set('t1.5-m60', smallNote);
        
        // Large note
        const largeNote = {
          getBoundingBox: () => ({ x: 200, y: 100, width: 30, height: 50 })
        };
        mockGraphicalNoteMap.set('t2.5-m62', largeNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 2.5,
          midiValue: 62
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        const pos1 = result.current.getFingeringPosition('t1.5-m60');
        const pos2 = result.current.getFingeringPosition('t2.5-m62');
        
        // Small note: 200 - max(10, 15*0.3) = 200 - 10 = 190
        expect(pos1?.y).toBe(190);
        
        // Large note: 100 - max(10, 50*0.3) = 100 - 15 = 85
        expect(pos2?.y).toBe(85);
      }).toThrow('Dynamic offset calculation - not implemented yet');
    });

    test('should center horizontally on note', () => {
      expect(() => {
        const notes = [
          { id: 't1-m60', x: 100, width: 20 },
          { id: 't2-m62', x: 200, width: 40 },
          { id: 't3-m64', x: 300, width: 15 }
        ];
        
        notes.forEach(({ id, x, width }) => {
          mockGraphicalNoteMap.set(id, {
            getBoundingBox: () => ({ x, y: 100, width, height: 30 })
          });
        });
        
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        
        const pos1 = result.current.getFingeringPosition('t1-m60');
        expect(pos1?.x).toBe(110); // 100 + 20/2
        
        const pos2 = result.current.getFingeringPosition('t2-m62');
        expect(pos2?.x).toBe(220); // 200 + 40/2
        
        const pos3 = result.current.getFingeringPosition('t3-m64');
        expect(pos3?.x).toBe(307.5); // 300 + 15/2
      }).toThrow('Horizontal centering - not implemented yet');
    });
  });

  describe('Hook Stability', () => {
    test('should memoize getFingeringPosition function', () => {
      expect(() => {
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result, rerender } = renderHook(() => useFingeringPositioning());
        
        const fn1 = result.current.getFingeringPosition;
        
        // Re-render hook
        rerender();
        
        const fn2 = result.current.getFingeringPosition;
        
        // Function should be stable (memoized)
        expect(fn1).toBe(fn2);
      }).toThrow('Function memoization - not implemented yet');
    });

    test('should update when OSMD context changes', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 })
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result, rerender } = renderHook(() => useFingeringPositioning());
        
        const pos1 = result.current.getFingeringPosition('t1.5-m60');
        expect(pos1).toBeDefined();
        
        // Clear map (simulate OSMD change)
        mockGraphicalNoteMap.clear();
        
        // Should trigger update
        rerender();
        
        const pos2 = result.current.getFingeringPosition('t1.5-m60');
        expect(pos2).toBeNull();
      }).toThrow('Context dependency - not implemented yet');
    });
  });

  describe('Chord Positioning', () => {
    test('should apply horizontal offsets to prevent fingering overlap in chords', () => {
      // COVERAGE VALIDATOR: Essential for chord notation
      expect(() => {
        // Mock two notes of a chord at the same timestamp
        const chordNote1 = {
          getBoundingBox: () => ({ x: 200, y: 250, width: 20, height: 30 }),
          stemDirection: 1,
          chordMembership: ['t1.5-m60', 't1.5-m64'] 
        };
        const chordNote2 = {
          getBoundingBox: () => ({ x: 200, y: 220, width: 20, height: 30 }),
          stemDirection: 1,
          chordMembership: ['t1.5-m60', 't1.5-m64']
        };
        mockGraphicalNoteMap.set('t1.5-m60', chordNote1);
        mockGraphicalNoteMap.set('t1.5-m64', chordNote2);

        const { result } = renderHook(() => useFingeringPositioning());
        
        // API needs chord context to handle collisions
        const position1 = result.current.getFingeringPosition('t1.5-m60', ['t1.5-m60', 't1.5-m64']);
        const position2 = result.current.getFingeringPosition('t1.5-m64', ['t1.5-m60', 't1.5-m64']);

        // They should be offset to avoid overlap
        expect(position1.x).not.toEqual(position2.x);
        expect(position1.x).toBeLessThan(210); // offset left
        expect(position2.x).toBeGreaterThan(210); // offset right
        
        // CLARITY INSPECTOR: Ensure API handles optional chord array
        const spy = jest.spyOn(result.current, 'getFingeringPosition');
        result.current.getFingeringPosition('t1.5-m60', ['t1.5-m60','t1.5-m64']);
        expect(spy).toHaveBeenCalledWith('t1.5-m60', ['t1.5-m60','t1.5-m64']);
      }).toThrow('Chord collision avoidance - not implemented yet');
    });
  });

  describe('Edge Cases', () => {
    test('should handle notes with null bounding box', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: () => null
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        expect(position).toBeNull();
      }).toThrow('Null bounding box - not implemented yet');
    });

    test('should handle extremely large coordinate values', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: () => ({
            x: 999999,
            y: 888888,
            width: 77777,
            height: 66666
          })
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        // Should handle large values without overflow
        expect(position?.x).toBe(999999 + 77777/2);
        expect(position?.y).toBe(888888 - Math.max(10, 66666 * 0.3));
      }).toThrow('Large coordinates - not implemented yet');
    });

    test('should include note element reference for future use', () => {
      expect(() => {
        const mockNote = {
          getBoundingBox: () => ({ x: 100, y: 200, width: 20, height: 30 }),
          id: 'unique-note-id',
          otherData: 'preserved'
        };
        
        mockGraphicalNoteMap.set('t1.5-m60', mockNote);
        jest.mocked(parseFingeringId).mockReturnValue({
          timestamp: 1.5,
          midiValue: 60
        });
        
        const { result } = renderHook(() => useFingeringPositioning());
        const position = result.current.getFingeringPosition('t1.5-m60');
        
        // Should include reference to note element
        expect(position?.noteElement).toBe(mockNote);
      }).toThrow('Note element reference - not implemented yet');
    });
  });
});