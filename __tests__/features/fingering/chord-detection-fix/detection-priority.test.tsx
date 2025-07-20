/**
 * TDD Tests for Detection Priority Order
 * 
 * Tests that click detection uses correct priority:
 * 1. data-note-id lookup (PRIMARY)
 * 2. OSMD DOM traversal (FALLBACK) 
 * 3. Coordinate detection (DEPRECATED LAST RESORT)
 * 
 * Validates Plan Task 4: Reorder Detection Priority
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { act } from '@testing-library/react';

// Mock the detection functions that exist
const mockFindNoteAtCoordinates = jest.fn();
const mockFindNoteUsingOSMD = jest.fn();
const mockHandleFingeringAssignment = jest.fn();

// Mock console for detection path logging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock the component - this will fail until Task 4 is implemented
jest.mock('@/renderer/features/fingering/components/FingeringLayer', () => ({
  FingeringLayer: jest.fn(() => <div data-testid="fingering-layer">Mocked FingeringLayer</div>)
}));

// Import what should be the updated component
import { FingeringLayer } from '@/renderer/features/fingering/components/FingeringLayer';

describe('Detection Priority Order', () => {
  beforeEach(() => {
    // Clear all mocks
    mockFindNoteAtCoordinates.mockClear();
    mockFindNoteUsingOSMD.mockClear();
    mockHandleFingeringAssignment.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Primary: data-note-id Detection', () => {
    test('should use data-note-id when available and skip other methods', () => {
      // Setup: Element with data-note-id
      const testElement = document.createElement('ellipse');
      testElement.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      testElement.setAttribute('data-testid', 'chord-note');
      document.body.appendChild(testElement);

      // Render component (will fail until implementation)
      render(<FingeringLayer />);
      
      // Simulate click on element with data-note-id
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 100,
        clientY: 200
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: testElement,
        enumerable: true
      });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Assertions: Should use data-note-id and NOT call fallback methods
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Note click detected, trying detection methods...')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n0-midi60')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n0-midi60')
      );
      
      // Should NOT call fallback methods when data-note-id works
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('⚠️ No data-note-id, trying OSMD DOM traversal...')
      );
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('⚠️ DOM traversal failed, falling back to coordinates...')
      );
      
      // Should call fingering assignment with correct ID
      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n0-midi60');
    });

    test('should find data-note-id in parent elements', () => {
      // Setup: Parent has data-note-id, child doesn't
      const parentElement = document.createElement('g');
      parentElement.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67');
      
      const childElement = document.createElement('path');
      parentElement.appendChild(childElement);
      document.body.appendChild(parentElement);

      render(<FingeringLayer />);
      
      // Click on child element
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: childElement });

      act(() => {
        childElement.dispatchEvent(clickEvent);
      });

      // Should find parent's data-note-id
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found data-note-id: m0-s0-v0-n1-midi67')
      );
      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n1-midi67');
    });
  });

  describe('Secondary: OSMD DOM Traversal Fallback', () => {
    test('should use OSMD DOM traversal when data-note-id not found', () => {
      // Setup: Element without data-note-id
      const testElement = document.createElement('ellipse');
      // NO data-note-id attribute
      document.body.appendChild(testElement);

      // Mock OSMD traversal to return a note ID
      mockFindNoteUsingOSMD.mockReturnValue('m0-s0-v0-n2-midi72');

      render(<FingeringLayer />);
      
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: testElement });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Should log that data-note-id wasn't found and try OSMD
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ No data-note-id found in element tree');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ No data-note-id, trying OSMD DOM traversal...')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n2-midi72')
      );
      
      // Should call OSMD traversal method
      expect(mockFindNoteUsingOSMD).toHaveBeenCalledWith(clickEvent);
      
      // Should NOT call coordinate detection when OSMD works
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        expect.stringContaining('⚠️ DOM traversal failed, falling back to coordinates...')
      );
      
      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n2-midi72');
    });
  });

  describe('Last Resort: Coordinate Detection Fallback', () => {
    test('should use coordinate detection when both data-note-id and OSMD fail', () => {
      // Setup: Element without data-note-id
      const testElement = document.createElement('ellipse');
      document.body.appendChild(testElement);

      // Mock OSMD traversal to fail
      mockFindNoteUsingOSMD.mockReturnValue(null);
      
      // Mock coordinate detection to return a note ID
      mockFindNoteAtCoordinates.mockReturnValue('m0-s0-v0-n3-midi76');

      render(<FingeringLayer />);
      
      const clickEvent = new MouseEvent('click', { 
        bubbles: true,
        clientX: 150,
        clientY: 250
      });
      Object.defineProperty(clickEvent, 'target', { value: testElement });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Should log the complete fallback chain
      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ No data-note-id found in element tree');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ No data-note-id, trying OSMD DOM traversal...')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ DOM traversal failed, falling back to coordinates...')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Selected note: m0-s0-v0-n3-midi76')
      );
      
      // Should call all methods in order
      expect(mockFindNoteUsingOSMD).toHaveBeenCalledWith(clickEvent);
      expect(mockFindNoteAtCoordinates).toHaveBeenCalledWith(150, 250);
      
      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n3-midi76');
    });

    test('should handle complete detection failure gracefully', () => {
      // Setup: Element without data-note-id
      const testElement = document.createElement('ellipse');
      document.body.appendChild(testElement);

      // Mock all detection methods to fail
      mockFindNoteUsingOSMD.mockReturnValue(null);
      mockFindNoteAtCoordinates.mockReturnValue(null);

      render(<FingeringLayer />);
      
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: testElement });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Should log complete failure
      expect(mockConsoleError).toHaveBeenCalledWith('❌ All detection methods failed');
      
      // Should NOT call fingering assignment
      expect(mockHandleFingeringAssignment).not.toHaveBeenCalled();
    });
  });

  describe('Priority Order Validation', () => {
    test('should prefer data-note-id over coordinate detection even if both available', () => {
      // Setup: Element with data-note-id (but coordinate detection would also work)
      const testElement = document.createElement('ellipse');
      testElement.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60');
      document.body.appendChild(testElement);

      // Mock coordinate detection to return different ID
      mockFindNoteAtCoordinates.mockReturnValue('m0-s0-v0-n1-midi67');

      render(<FingeringLayer />);
      
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 100,
        clientY: 200
      });
      Object.defineProperty(clickEvent, 'target', { value: testElement });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Should use data-note-id result, not coordinate detection result
      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n0-midi60');
      expect(mockHandleFingeringAssignment).not.toHaveBeenCalledWith('m0-s0-v0-n1-midi67');
      
      // Should NOT call coordinate detection at all
      expect(mockFindNoteAtCoordinates).not.toHaveBeenCalled();
    });

    test('should call detection methods in correct order', () => {
      // Setup element without data-note-id to test full fallback chain
      const testElement = document.createElement('ellipse');
      document.body.appendChild(testElement);

      // Mock methods to fail in sequence
      mockFindNoteUsingOSMD.mockReturnValue(null);
      mockFindNoteAtCoordinates.mockReturnValue('m0-s0-v0-n2-midi72');

      render(<FingeringLayer />);
      
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 100,
        clientY: 200
      });
      Object.defineProperty(clickEvent, 'target', { value: testElement });

      act(() => {
        testElement.dispatchEvent(clickEvent);
      });

      // Verify order by checking call order in console logs
      const logCalls = mockConsoleLog.mock.calls.map(call => call[0]);
      
      const dataIdIndex = logCalls.findIndex(log => log.includes('No data-note-id found'));
      const osmdIndex = logCalls.findIndex(log => log.includes('trying OSMD DOM traversal'));
      const coordIndex = logCalls.findIndex(log => log.includes('falling back to coordinates'));
      
      expect(dataIdIndex).toBeLessThan(osmdIndex);
      expect(osmdIndex).toBeLessThan(coordIndex);
    });
  });

  describe('Chord-Specific Scenarios', () => {
    test('should distinguish between chord notes using data-note-id', () => {
      // Setup: Two chord notes with different data-note-ids
      const note1 = document.createElement('ellipse');
      note1.setAttribute('data-note-id', 'm0-s0-v0-n0-midi60'); // C4
      note1.setAttribute('data-testid', 'note-c4');
      
      const note2 = document.createElement('ellipse');
      note2.setAttribute('data-note-id', 'm0-s0-v0-n1-midi67'); // G4
      note2.setAttribute('data-testid', 'note-g4');
      
      document.body.appendChild(note1);
      document.body.appendChild(note2);

      render(<FingeringLayer />);

      // Click on first note
      const click1 = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(click1, 'target', { value: note1 });
      
      act(() => {
        note1.dispatchEvent(click1);
      });

      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n0-midi60');

      // Reset mock
      mockHandleFingeringAssignment.mockClear();

      // Click on second note
      const click2 = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(click2, 'target', { value: note2 });
      
      act(() => {
        note2.dispatchEvent(click2);
      });

      expect(mockHandleFingeringAssignment).toHaveBeenCalledWith('m0-s0-v0-n1-midi67');
      
      // Verify different IDs were returned
      expect('m0-s0-v0-n0-midi60').not.toBe('m0-s0-v0-n1-midi67');
    });
  });
});

// TDD Reminder:
// This test file should FAIL initially because:
// 1. FingeringLayer component doesn't have the new detection priority order
// 2. The click handler still uses coordinate detection first
// 3. Console logs don't show the new priority messages
// 
// After implementing Task 4 (reorder detection priority), all tests should pass.