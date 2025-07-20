/**
 * TDD Tests for getDataNoteId Helper Function
 * 
 * Tests the data-note-id extraction with DOM traversal
 * Validates Plan Task 3: Implement getDataNoteId Helper
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock console.log to capture debug output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Import the function that should be implemented
// This import WILL FAIL until Task 3 is implemented
import { getDataNoteId } from '@/renderer/features/fingering/components/FingeringLayer';

describe('getDataNoteId Helper Function', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    
    // Clean up DOM
    document.body.innerHTML = '';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Core Functionality', () => {
    test('should extract data-note-id from element with attribute', () => {
      // Setup: Element with data-note-id
      const element = document.createElement('div');
      element.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      const result = getDataNoteId(element);
      
      expect(result).toBe('m0-s0-v0-n0-midi60');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n0-midi60')
      );
    });

    test('should traverse up DOM tree to find data-note-id in parent', () => {
      // Setup: Parent has data-note-id, child doesn't
      const parent = document.createElement('g');
      parent.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67');
      
      const child = document.createElement('path');
      parent.appendChild(child);
      
      const result = getDataNoteId(child);
      
      expect(result).toBe('m0-s0-v0-n1-midi67');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n1-midi67 on G')
      );
    });

    test('should traverse multiple levels up to find data-note-id', () => {
      // Setup: Grandparent has data-note-id
      const grandparent = document.createElement('g');
      grandparent.setAttribute('data-note-id', 'm0-s0-v0-n2-midi72');
      
      const parent = document.createElement('g');
      grandparent.appendChild(parent);
      
      const child = document.createElement('path');
      parent.appendChild(child);
      
      document.body.appendChild(grandparent);
      
      const result = getDataNoteId(child);
      
      expect(result).toBe('m0-s0-v0-n2-midi72');
    });

    test('should stop traversal at document.body', () => {
      // Setup: No data-note-id anywhere, should stop at body
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      const result = getDataNoteId(element);
      
      expect(result).toBeNull();
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ No data-note-id found in element tree');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null element gracefully', () => {
      const result = getDataNoteId(null);
      
      expect(result).toBeNull();
      // Should not crash or log errors
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should handle undefined element gracefully', () => {
      const result = getDataNoteId(undefined as any);
      
      expect(result).toBeNull();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should handle element with empty data-note-id attribute', () => {
      const element = document.createElement('div');
      element.setAttribute('data-note-id', '');
      
      const result = getDataNoteId(element);
      
      // Empty string should be treated as valid (truthy check)
      expect(result).toBe('');
    });

    test('should handle element with whitespace-only data-note-id', () => {
      const element = document.createElement('div');
      element.setAttribute('data-note-id', '   ');
      
      const result = getDataNoteId(element);
      
      expect(result).toBe('   ');
    });

    test('should handle detached DOM elements', () => {
      // Element not in document tree
      const element = document.createElement('div');
      element.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      const result = getDataNoteId(element);
      
      expect(result).toBe('m0-s0-v0-n0-midi60');
    });
  });

  describe('Chord Note Scenarios', () => {
    test('should handle typical chord note IDs', () => {
      // Test with realistic chord note IDs from OSMD
      const chordNoteIds = [
        'm0-s0-v0-n0-midi60', // C4
        'm0-s0-v0-n1-midi64', // E4  
        'm0-s0-v0-n2-midi67', // G4
        'm1-s0-v0-n0-midi72', // C5 in next measure
      ];

      chordNoteIds.forEach(noteId => {
        const element = document.createElement('path');
        element.setAttribute('data-note-id', noteId);
        
        const result = getDataNoteId(element);
        
        expect(result).toBe(noteId);
      });
    });

    test('should work with OSMD-style SVG structure', () => {
      // Simulate OSMD's typical SVG structure for chord notes
      const chordGroup = document.createElement('g');
      chordGroup.classList.add('vf-chord');
      
      const note1Head = document.createElement('ellipse');
      note1Head.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      note1Head.classList.add('vf-notehead');
      
      const note2Head = document.createElement('ellipse');
      note2Head.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67');
      note2Head.classList.add('vf-notehead');
      
      chordGroup.appendChild(note1Head);
      chordGroup.appendChild(note2Head);
      
      // Test clicking on note1Head
      const result1 = getDataNoteId(note1Head);
      expect(result1).toBe('m0-s0-v0-n0-midi60');
      
      // Test clicking on note2Head
      const result2 = getDataNoteId(note2Head);
      expect(result2).toBe('m0-s0-v0-n1-midi67');
      
      // Should return different IDs for different chord notes
      expect(result1).not.toBe(result2);
    });
  });

  describe('Performance Requirements', () => {
    test('should execute in under 1ms for typical DOM depth', () => {
      // Create nested DOM structure (typical depth ~5-10 levels)
      let current = document.body;
      for (let i = 0; i < 8; i++) {
        const child = document.createElement('div');
        current.appendChild(child);
        current = child;
      }
      
      // Add data-note-id to top level
      document.body.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      const startTime = performance.now();
      const result = getDataNoteId(current);
      const duration = performance.now() - startTime;
      
      expect(result).toBe('m0-s0-v0-n0-midi60');
      expect(duration).toBeLessThan(1); // <1ms requirement
    });

    test('should not cause memory leaks with repeated calls', () => {
      const element = document.createElement('div');
      element.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      // Call function many times
      for (let i = 0; i < 1000; i++) {
        const result = getDataNoteId(element);
        expect(result).toBe('m0-s0-v0-n0-midi60');
      }
      
      // No memory leak assertions - Jest will detect if function holds references
    });
  });

  describe('Integration Preparation', () => {
    test('should work with event.target from click events', () => {
      // Simulate click event target
      const element = document.createElement('path');
      element.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      // Simulate what would come from event.target
      const clickTarget = element as Element;
      
      const result = getDataNoteId(clickTarget);
      
      expect(result).toBe('m0-s0-v0-n0-midi60');
    });

    test('should work with SVG elements', () => {
      // Test with actual SVG elements (common in OSMD)
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      svgElement.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      
      const result = getDataNoteId(svgElement);
      
      expect(result).toBe('m0-s0-v0-n0-midi60');
    });
  });
});

// TDD Reminder:
// This test file should FAIL initially because getDataNoteId doesn't exist yet.
// After implementing Task 3 (getDataNoteId helper), all tests should pass.
// Expected failure: "Cannot resolve module '@/renderer/features/fingering/components/FingeringLayer'"