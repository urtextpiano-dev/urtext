/**
 * PracticeSequenceBuilder Tests
 * 
 * Validates pre-computation architecture for O(1) note extraction.
 * Tests performance, memory safety, and OSMD integration.
 * 
 * Performance Requirements:
 * - Build time: <2ms per step for complex scores
 * - Memory usage: <1.5MB for 1-hour score (~10k notes)
 * - Validation: <1ms for sequence validation
 */

import { PracticeSequenceBuilder, OptimizedPracticeStep, SequenceBuildResult } from '@/renderer/features/practice-mode/services/PracticeSequenceBuilder';

// Mock OSMD structures
interface MockNote {
  halfTone?: number;
  HalfTone?: number;
  IsTiedFromPrevious?: boolean;
  IsGrace?: boolean;
  graphicalNote?: { id: string };
}

interface MockVoiceEntry {
  Notes?: MockNote[];
  notes?: MockNote[];
  IsGrace?: boolean;
}

interface MockIterator {
  EndReached: boolean;
  CurrentVoiceEntries: MockVoiceEntry[];
  currentMeasureIndex?: number;
}

interface MockCursor {
  Iterator: MockIterator;
  reset: jest.Mock;
  next: jest.Mock;
}

interface MockOSMD {
  cursor: MockCursor;
}

// Mock performance.memory for memory testing
const mockMemory = {
  usedJSHeapSize: 1000000, // 1MB initial
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  writable: true,
});

describe('PracticeSequenceBuilder', () => {
  let mockOSMD: MockOSMD;
  let mockCursor: MockCursor;
  let mockIterator: MockIterator;

  beforeEach(() => {
    // Create realistic OSMD mock
    mockIterator = {
      EndReached: false,
      CurrentVoiceEntries: [],
      currentMeasureIndex: 0,
    };

    mockCursor = {
      Iterator: mockIterator,
      reset: jest.fn(),
      next: jest.fn(),
    };

    mockOSMD = {
      cursor: mockCursor,
    };

    // Reset memory tracking
    mockMemory.usedJSHeapSize = 1000000;
  });

  describe('Performance Requirements (<2ms per step)', () => {
    test('should build simple sequence under target time', () => {
      // Create simple 4-note sequence
      const notes: MockNote[] = [
        { halfTone: 48 }, // C4
        { halfTone: 50 }, // D4
        { halfTone: 52 }, // E4
        { halfTone: 53 }, // F4
      ];

      let stepCount = 0;
      
      // Set up initial state
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{ Notes: [notes[0]] }];
      mockIterator.currentMeasureIndex = 0;
      
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        
        if (stepCount < 4) {
          mockIterator.CurrentVoiceEntries = [{ Notes: [notes[stepCount]] }];
          mockIterator.currentMeasureIndex = Math.floor(stepCount / 4);
        } else {
          mockIterator.EndReached = true;
          mockIterator.CurrentVoiceEntries = [];
        }
      });

      const startTime = performance.now();
      const result = PracticeSequenceBuilder.build(mockOSMD as any);
      const buildTime = performance.now() - startTime;

      expect(buildTime).toBeLessThan(50); // Allow for Jest overhead, real performance shown in 1000-step test
      expect(result.metadata.buildTime).toBeLessThan(50);
      expect(result.steps.length).toBe(4);
    });

    test('should handle complex score (1000 steps) efficiently', () => {
      // Simulate complex score with chords and various notes
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.currentMeasureIndex = Math.floor(stepCount / 16); // 16 steps per measure
        
        if (stepCount <= 1000) {
          // Create varied complexity: single notes, chords, rests
          if (stepCount % 10 === 0) {
            // Rest every 10th step
            mockIterator.CurrentVoiceEntries = [{ Notes: [] }];
          } else if (stepCount % 5 === 0) {
            // Chord every 5th step
            mockIterator.CurrentVoiceEntries = [{
              Notes: [
                { halfTone: 48 }, // C
                { halfTone: 52 }, // E
                { halfTone: 55 }, // G
              ]
            }];
          } else {
            // Single note
            mockIterator.CurrentVoiceEntries = [{
              Notes: [{ halfTone: 48 + (stepCount % 12) }]
            }];
          }
        } else {
          mockIterator.EndReached = true;
        }
      });

      const startTime = performance.now();
      const result = PracticeSequenceBuilder.build(mockOSMD as any);
      const buildTime = performance.now() - startTime;

      // Should build 1000 steps in under 2000ms (2ms per step)
      expect(buildTime).toBeLessThan(2000);
      expect(result.metadata.buildTime).toBeLessThan(2000);
      expect(result.steps.length).toBe(1000);
    });
  });

  describe('Memory Safety (Code review:\'s Security Audit)', () => {
    test('should enforce MAX_STEPS limit (50,000)', () => {
      // Create infinite sequence mock
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.currentMeasureIndex = Math.floor(stepCount / 16);
        
        // Never end (infinite sequence)
        mockIterator.EndReached = false;
        mockIterator.CurrentVoiceEntries = [{
          Notes: [{ halfTone: 60 }] // Always C4
        }];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      // Should be capped at MAX_STEPS
      expect(result.steps.length).toBeLessThanOrEqual(50000);
      expect(result.steps.length).toBe(50000); // Should hit the limit exactly
    });

    test('should enforce MAX_NOTES_PER_STEP limit (32)', () => {
      // Create step with too many notes
      const manyNotes: MockNote[] = [];
      for (let i = 0; i < 50; i++) {
        manyNotes.push({ halfTone: 48 + (i % 12) });
      }

      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        if (stepCount === 1) {
          mockIterator.CurrentVoiceEntries = [{ Notes: manyNotes }];
        } else {
          mockIterator.EndReached = true;
        }
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.size).toBeLessThanOrEqual(32);
    });

    test('should monitor memory usage during build', () => {
      // Simulate memory growth during build
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.currentMeasureIndex = Math.floor(stepCount / 100);
        
        // Simulate memory growth
        mockMemory.usedJSHeapSize += 1000; // 1KB per step
        
        if (stepCount <= 1000) {
          mockIterator.CurrentVoiceEntries = [{
            Notes: [{ halfTone: 60 }]
          }];
        } else {
          mockIterator.EndReached = true;
        }
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.metadata.memoryUsage).toBeGreaterThan(0);
      expect(result.metadata.memoryUsage).toBeLessThan(10 * 1024 * 1024); // <10MB for reasonable scores
    });

    test('should estimate memory usage accurately', () => {
      const steps: OptimizedPracticeStep[] = [
        {
          id: 'm0-s0',
          midiNotes: new Set([60, 64, 67]), // C major chord
          isChord: true,
          isRest: false,
          visualElements: ['note1', 'note2', 'note3'],
          measureIndex: 0,
          stepIndex: 0,
        },
        {
          id: 'm0-s1',
          midiNotes: new Set([72]), // C5
          isChord: false,
          isRest: false,
          visualElements: ['note4'],
          measureIndex: 0,
          stepIndex: 1,
        },
      ];

      const estimatedMemory = PracticeSequenceBuilder.estimateMemoryUsage(steps);
      
      expect(estimatedMemory).toBeGreaterThan(0);
      expect(typeof estimatedMemory).toBe('number');
      
      // Should be reasonable for 2 steps (rough estimate: <1KB)
      expect(estimatedMemory).toBeLessThan(1024);
    });
  });

  describe('Note Extraction Logic', () => {
    test('should extract single notes correctly', () => {
      // Set up initial state with the note
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{
        Notes: [{ halfTone: 60 }] // C4 = MIDI 72 (60 + 12)
      }];
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.has(72)).toBe(true);
      expect(result.steps[0].isChord).toBe(false);
      expect(result.steps[0].isRest).toBe(false);
    });

    test('should extract chords correctly', () => {
      // Set up initial state with chord
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{
        Notes: [
          { halfTone: 48 }, // C3 = MIDI 60
          { halfTone: 52 }, // E3 = MIDI 64
          { halfTone: 55 }, // G3 = MIDI 67
        ]
      }];
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.has(60)).toBe(true);
      expect(result.steps[0].midiNotes.has(64)).toBe(true);
      expect(result.steps[0].midiNotes.has(67)).toBe(true);
      expect(result.steps[0].isChord).toBe(true);
      expect(result.steps[0].isRest).toBe(false);
    });

    test('should detect rests correctly', () => {
      // Set up initial state with rest
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{ Notes: [] }]; // Empty = rest
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.size).toBe(0);
      expect(result.steps[0].isChord).toBe(false);
      expect(result.steps[0].isRest).toBe(true);
    });

    test('should skip grace notes and tied notes', () => {
      // Set up initial state with mixed note types
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [
        { IsGrace: true, Notes: [{ halfTone: 60 }] }, // Grace note - skip
        { 
          Notes: [
            { halfTone: 62, IsTiedFromPrevious: true }, // Tied note - skip
            { halfTone: 64 }, // Regular note - include
          ]
        }
      ];
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.has(72)).toBe(false); // Grace note excluded
      expect(result.steps[0].midiNotes.has(74)).toBe(false); // Tied note excluded
      expect(result.steps[0].midiNotes.has(76)).toBe(true);  // Regular note included
    });

    test('should handle both halfTone and HalfTone properties', () => {
      // Set up initial state with mixed property types
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{
        Notes: [
          { halfTone: 60 },    // Modern property
          { HalfTone: 62 },    // Legacy property
        ]
      }];
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.has(72)).toBe(true); // halfTone
      expect(result.steps[0].midiNotes.has(74)).toBe(true); // HalfTone
    });

    test('should validate MIDI range (0-127)', () => {
      // Set up initial state with mixed valid/invalid notes
      mockIterator.EndReached = false;
      mockIterator.CurrentVoiceEntries = [{
        Notes: [
          { halfTone: -20 },  // Invalid: would be negative MIDI
          { halfTone: 60 },   // Valid
          { halfTone: 120 },  // Invalid: would exceed 127
        ]
      }];
      mockIterator.currentMeasureIndex = 0;
      
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.EndReached = true; // End after first step
        mockIterator.CurrentVoiceEntries = [];
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.size).toBe(1); // Only valid note
      expect(result.steps[0].midiNotes.has(72)).toBe(true); // Valid note
    });
  });

  describe('Sequence Validation', () => {
    test('should validate correct sequences', () => {
      const validSteps: OptimizedPracticeStep[] = [
        {
          id: 'm0-s0',
          midiNotes: new Set([60, 64, 67]),
          isChord: true,
          isRest: false,
          visualElements: ['note1', 'note2', 'note3'],
          measureIndex: 0,
          stepIndex: 0,
        }
      ];

      expect(PracticeSequenceBuilder.validateSequence(validSteps)).toBe(true);
    });

    test('should reject invalid sequences', () => {
      // Test various invalid scenarios
      expect(PracticeSequenceBuilder.validateSequence(null as any)).toBe(false);
      expect(PracticeSequenceBuilder.validateSequence('invalid' as any)).toBe(false);
      
      // Empty sequence is valid
      expect(PracticeSequenceBuilder.validateSequence([])).toBe(true);
      
      // Invalid step structure
      const invalidSteps = [
        {
          // Missing required properties
          midiNotes: new Set([60]),
        }
      ] as any;
      
      expect(PracticeSequenceBuilder.validateSequence(invalidSteps)).toBe(false);
    });

    test('should reject sequences over MAX_STEPS', () => {
      const tooManySteps = new Array(60000).fill(null).map((_, i) => ({
        id: `m${Math.floor(i/100)}-s${i}`,
        midiNotes: new Set([60]),
        isChord: false,
        isRest: false,
        visualElements: [],
        measureIndex: Math.floor(i/100),
        stepIndex: i,
      }));

      expect(PracticeSequenceBuilder.validateSequence(tooManySteps)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing cursor gracefully', () => {
      const osmdWithoutCursor = {} as any;

      expect(() => {
        PracticeSequenceBuilder.build(osmdWithoutCursor);
      }).toThrow('OSMD cursor not available');
    });

    test('should handle OSMD errors gracefully', () => {
      mockCursor.reset.mockImplementation(() => {
        throw new Error('OSMD reset failed');
      });

      expect(() => {
        PracticeSequenceBuilder.build(mockOSMD as any);
      }).toThrow();
    });

    test('should skip steps with extraction errors', () => {
      let stepCount = 0;
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        mockIterator.currentMeasureIndex = stepCount - 1;
        
        if (stepCount === 1) {
          // First step: invalid data that causes error
          mockIterator.CurrentVoiceEntries = null as any;
        } else if (stepCount === 2) {
          // Second step: valid data
          mockIterator.CurrentVoiceEntries = [{
            Notes: [{ halfTone: 60 }]
          }];
        } else {
          mockIterator.EndReached = true;
        }
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      // Should skip invalid step and continue
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].midiNotes.has(72)).toBe(true);
    });
  });

  describe('Metadata and Performance Tracking', () => {
    test('should provide accurate metadata', () => {
      let stepCount = 0;
      let noteCount = 0;
      
      mockCursor.next.mockImplementation(() => {
        stepCount++;
        if (stepCount <= 5) {
          const notesInStep = stepCount % 2 === 0 ? 3 : 1; // Alternate single notes and chords
          noteCount += notesInStep;
          
          const notes = [];
          for (let i = 0; i < notesInStep; i++) {
            notes.push({ halfTone: 60 + i });
          }
          
          mockIterator.CurrentVoiceEntries = [{ Notes: notes }];
        } else {
          mockIterator.EndReached = true;
        }
      });

      const result = PracticeSequenceBuilder.build(mockOSMD as any);

      expect(result.metadata.totalSteps).toBe(5);
      expect(result.metadata.totalNotes).toBe(noteCount);
      expect(result.metadata.buildTime).toBeGreaterThan(0);
      expect(typeof result.metadata.memoryUsage).toBe('number');
    });
  });
});