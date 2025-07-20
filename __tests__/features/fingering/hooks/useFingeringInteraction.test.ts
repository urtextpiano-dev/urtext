// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFingeringInteraction } from '@/renderer/features/fingering/hooks/useFingeringInteraction';
import { useFingeringStore } from '@/renderer/features/fingering/stores/fingeringStore';
import { generateFingeringId, parseFingeringId } from '@/renderer/features/fingering/utils/fingeringIdUtils';

// Mock dependencies
jest.mock('@/renderer/features/fingering/stores/fingeringStore');
jest.mock('@/renderer/contexts/OSMDContext');

// TypeScript interface for hook return type (CHATGPT Code review:)
interface UseFingeringInteractionReturn {
  // State
  selectedNoteId: string | null;
  isInputOpen: boolean;
  inputPosition: { x: number; y: number } | null;
  isEditingMode: boolean;
  error: string | null;
  currentFingering: number | null;
  
  // Actions
  handleNoteClick: (event: MouseEvent | TouchEvent, element?: HTMLElement) => void;
  handleInputSubmit: (value: string) => Promise<void>;
  handleInputCancel: () => void;
  handleKeyboardShortcut: (key: string) => void;
  handleClickOutside: () => void;
  setEditingMode: (enabled: boolean) => void;
  setActiveInput: (noteId: string, position: { x: number; y: number }, value?: number | null) => void;
  submitFingering: (value: number | null) => Promise<void>;
  getFingeringForNote: (noteId: string) => number | null;
}

describe('Version useFingeringInteraction Hook Tests', () => {
  let cleanupFunctions: Array<() => void> = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // For debounce testing
    
    // Reset store mock
    (useFingeringStore as jest.Mock).mockReturnValue({
      annotations: {},
      setFingering: jest.fn(),
      removeFingering: jest.fn(),
      loadFingerings: jest.fn(),
    });
  });
  
  afterEach(() => {
    jest.useRealTimers();
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions = [];
  });

  describe('Hook API (CHATGPT Code review:: explicit interface)', () => {
    test('should provide complete interaction API', () => {
      expect(() => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Validate complete API shape
        const api: UseFingeringInteractionReturn = result.current;
        
        // State properties
        expect(api.selectedNoteId).toBe(null);
        expect(api.isInputOpen).toBe(false);
        expect(api.inputPosition).toBe(null);
        expect(api.isEditingMode).toBe(false);
        expect(api.error).toBe(null);
        expect(api.currentFingering).toBe(null);
        
        // Action functions
        expect(typeof api.handleNoteClick).toBe('function');
        expect(typeof api.handleInputSubmit).toBe('function');
        expect(typeof api.handleInputCancel).toBe('function');
        expect(typeof api.handleKeyboardShortcut).toBe('function');
        expect(typeof api.handleClickOutside).toBe('function');
        expect(typeof api.setEditingMode).toBe('function');
        expect(typeof api.setActiveInput).toBe('function');
        expect(typeof api.submitFingering).toBe('function');
        expect(typeof api.getFingeringForNote).toBe('function');
      }).toThrow('useFingeringInteraction hook API - not implemented yet');
    });
  });

  describe('Click Handling with ID Validation (CHATGPT 4.1)', () => {
    test('should handle note clicks with canonical ID format validation', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Enable editing mode first
        act(() => {
          result.current.setEditingMode(true);
        });
        
        const noteElement = document.createElement('div');
        noteElement.setAttribute('data-note-id', 't1.5-m60'); // Canonical format
        noteElement.getBoundingClientRect = () => ({
          left: 100,
          top: 200,
          right: 120,
          bottom: 230,
          width: 20,
          height: 30,
          x: 100,
          y: 200,
        });
        
        const clickEvent = new MouseEvent('click', {
          clientX: 110,
          clientY: 215,
          bubbles: true
        });
        
        await act(async () => {
          result.current.handleNoteClick(clickEvent, noteElement);
        });
        
        expect(result.current.selectedNoteId).toBe('t1.5-m60');
        expect(result.current.isInputOpen).toBe(true);
        
        // Validate ID parsing
        const parsedId = parseFingeringId('t1.5-m60');
        expect(parsedId).toEqual({ timestamp: 1.5, midiValue: 60 });
      }).toThrow('Note click with ID validation - not implemented yet');
    });

    test('should reject invalid note ID formats', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        const invalidIdCases = [
          'invalid-id',
          'm60-t1', // Wrong order
          't1m60', // Missing separator
          't1-m', // Missing MIDI value
          't-m60', // Missing timestamp
        ];
        
        for (const invalidId of invalidIdCases) {
          const noteElement = document.createElement('div');
          noteElement.setAttribute('data-note-id', invalidId);
          
          await act(async () => {
            result.current.handleNoteClick(new MouseEvent('click'), noteElement);
          });
          
          expect(result.current.error).toMatch(/Invalid note ID format/);
          expect(result.current.isInputOpen).toBe(false);
          
          // Clear error for next test
          act(() => {
            result.current.error = null;
          });
        }
      }).toThrow('Invalid ID rejection - not implemented yet');
    });

    test('should handle clicks outside to close input', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // First open input
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 }, 2);
        });
        
        expect(result.current.isInputOpen).toBe(true);
        
        // Click outside
        const outsideEvent = new MouseEvent('click', {
          clientX: 500,
          clientY: 500,
          bubbles: true
        });
        
        document.dispatchEvent(outsideEvent);
        
        await waitFor(() => {
          expect(result.current.isInputOpen).toBe(false);
          expect(result.current.selectedNoteId).toBe(null);
        });
      }).toThrow('Click outside handling - not implemented yet');
    });
  });

  describe('Input Position Calculation (CHATGPT Code review: + GEMINI)', () => {
    test('should calculate position with viewport awareness', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Mock viewport dimensions
        window.innerHeight = 768;
        window.innerWidth = 1024;
        
        // Note near bottom edge
        const noteElement = document.createElement('div');
        noteElement.setAttribute('data-note-id', 't1-m60');
        noteElement.getBoundingClientRect = () => ({
          left: 500,
          top: 700, // Near bottom
          right: 520,
          bottom: 730,
          width: 20,
          height: 30,
          x: 500,
          y: 700,
        });
        
        await act(async () => {
          result.current.handleNoteClick(new MouseEvent('click'), noteElement);
        });
        
        // Should position above note due to viewport constraint
        expect(result.current.inputPosition).toEqual({
          x: 510, // Center of note
          y: 660  // Above note (700 - 40px input height)
        });
      }).toThrow('Viewport-aware positioning - not implemented yet');
    });

    test('should handle scrolled containers correctly', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Create scrolled container
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.overflow = 'auto';
        container.scrollTop = 200;
        
        const noteElement = document.createElement('div');
        noteElement.setAttribute('data-note-id', 't2-m62');
        container.appendChild(noteElement);
        
        // Mock getBoundingClientRect for scrolled position
        noteElement.getBoundingClientRect = () => ({
          left: 100,
          top: 150, // Viewport position after scroll
          right: 120,
          bottom: 180,
          width: 20,
          height: 30,
          x: 100,
          y: 150,
        });
        
        await act(async () => {
          result.current.handleNoteClick(new MouseEvent('click'), noteElement);
        });
        
        // Position should be relative to viewport, not document
        expect(result.current.inputPosition).toEqual({
          x: 110,
          y: 150 // At note top in viewport coords
        });
      }).toThrow('Scrolled container positioning - not implemented yet');
    });
  });

  describe('Input Submission with Store Integration', () => {
    test('should submit valid fingering to store with parsed values', async () => {
      expect(async () => {
        const mockSetFingering = jest.fn();
        const mockStore = {
          annotations: { 'test-score': {} },
          setFingering: mockSetFingering,
          removeFingering: jest.fn(),
        };
        
        (useFingeringStore as jest.Mock).mockReturnValue(mockStore);
        
        const { result } = renderHook(() => useFingeringInteraction({
          scoreId: 'test-score'
        }));
        
        // Set active input
        act(() => {
          result.current.setActiveInput('t2.5-m64', { x: 100, y: 200 }, null);
        });
        
        // Submit fingering
        await act(async () => {
          await result.current.submitFingering(3);
        });
        
        // Verify store called with parsed values
        expect(mockSetFingering).toHaveBeenCalledWith(
          'test-score',
          2.5, // Parsed timestamp
          64,  // Parsed MIDI value
          3    // Finger value
        );
        
        expect(result.current.isInputOpen).toBe(false);
        expect(result.current.error).toBe(null);
      }).toThrow('Input submission with parsing - not implemented yet');
    });

    test('should handle store update failures gracefully (GROK3)', async () => {
      expect(async () => {
        const mockError = new Error('IndexedDB quota exceeded');
        const mockSetFingering = jest.fn().mockRejectedValue(mockError);
        
        (useFingeringStore as jest.Mock).mockReturnValue({
          annotations: {},
          setFingering: mockSetFingering,
        });
        
        const { result } = renderHook(() => useFingeringInteraction());
        
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 }, 2);
        });
        
        // Attempt submission
        await act(async () => {
          await result.current.submitFingering(4);
        });
        
        // Should show error but keep input open
        expect(result.current.error).toBe('Failed to save. Please try again.');
        expect(result.current.isInputOpen).toBe(true);
        expect(result.current.selectedNoteId).toBe('t1-m60');
        
        // Can retry
        mockSetFingering.mockResolvedValue(undefined);
        
        await act(async () => {
          await result.current.submitFingering(4);
        });
        
        expect(result.current.error).toBe(null);
        expect(result.current.isInputOpen).toBe(false);
      }).toThrow('Store failure recovery - not implemented yet');
    });

    test('should reject invalid fingering values', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 });
        });
        
        // Test invalid values
        const invalidValues = ['0', '6', 'a', '', ' ', '1.5', '-1'];
        
        for (const value of invalidValues) {
          await act(async () => {
            await result.current.handleInputSubmit(value);
          });
          
          expect(result.current.error).toBe('Invalid fingering: use 1-5');
          expect(result.current.isInputOpen).toBe(true); // Stay open
          
          // Clear error
          act(() => {
            result.current.error = null;
          });
        }
      }).toThrow('Input validation in hook - not implemented yet');
    });
  });

  describe('Keyboard Shortcuts (CHATGPT Code review:: specific navigation)', () => {
    test('should handle number key shortcuts when note selected', async () => {
      expect(async () => {
        const mockSetFingering = jest.fn();
        (useFingeringStore as jest.Mock).mockReturnValue({
          annotations: { 'test-score': {} },
          setFingering: mockSetFingering,
        });
        
        const { result } = renderHook(() => useFingeringInteraction({
          scoreId: 'test-score'
        }));
        
        // Select a note first
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 });
        });
        
        // Press number key
        const keyEvent = new KeyboardEvent('keydown', {
          key: '2',
          code: 'Digit2',
          bubbles: true
        });
        
        document.dispatchEvent(keyEvent);
        
        await waitFor(() => {
          expect(mockSetFingering).toHaveBeenCalledWith('test-score', 1, 60, 2);
          expect(result.current.isInputOpen).toBe(false);
        });
      }).toThrow('Keyboard shortcut handling - not implemented yet');
    });

    test('should handle Tab navigation between notes in DOM order', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Create notes in DOM
        const notes = [
          { id: 't1-m60', tabIndex: 0 },
          { id: 't2-m62', tabIndex: 1 },
          { id: 't3-m64', tabIndex: 2 }
        ].map(({ id, tabIndex }) => {
          const el = document.createElement('div');
          el.setAttribute('data-note-id', id);
          el.setAttribute('tabindex', tabIndex.toString());
          document.body.appendChild(el);
          return el;
        });
        
        // Focus first note
        notes[0].focus();
        act(() => {
          result.current.selectedNoteId = 't1-m60';
        });
        
        // Tab to next note
        const tabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          bubbles: true
        });
        
        document.dispatchEvent(tabEvent);
        
        await waitFor(() => {
          expect(result.current.selectedNoteId).toBe('t2-m62');
        });
        
        // Shift+Tab to previous
        const shiftTabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          shiftKey: true,
          bubbles: true
        });
        
        document.dispatchEvent(shiftTabEvent);
        
        await waitFor(() => {
          expect(result.current.selectedNoteId).toBe('t1-m60');
        });
        
        // Cleanup
        notes.forEach(el => el.remove());
      }).toThrow('Tab navigation - not implemented yet');
    });
  });

  describe('Performance Optimizations', () => {
    test('should debounce rapid clicks with 150ms interval (CHATGPT Code review:)', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        let processedClicks = 0;
        const originalHandleClick = result.current.handleNoteClick;
        
        // Wrap to count actual processing
        result.current.handleNoteClick = jest.fn((event, element) => {
          processedClicks++;
          return originalHandleClick(event, element);
        });
        
        const noteElement = document.createElement('div');
        noteElement.setAttribute('data-note-id', 't1-m60');
        
        // Rapid clicks
        for (let i = 0; i < 5; i++) {
          await act(async () => {
            result.current.handleNoteClick(new MouseEvent('click'), noteElement);
          });
          
          // Advance time but less than debounce
          act(() => {
            jest.advanceTimersByTime(50);
          });
        }
        
        // Not processed yet due to debounce
        expect(processedClicks).toBe(5); // All calls made
        expect(result.current.isInputOpen).toBe(false); // But not processed
        
        // Advance past debounce
        act(() => {
          jest.advanceTimersByTime(150);
        });
        
        // Now should be processed
        await waitFor(() => {
          expect(result.current.isInputOpen).toBe(true);
          expect(result.current.selectedNoteId).toBe('t1-m60');
        });
      }).toThrow('Click debouncing at 150ms - not implemented yet');
    });

    test('should cleanup all event listeners on unmount', () => {
      expect(() => {
        const { unmount } = renderHook(() => useFingeringInteraction());
        
        const removeDocumentSpy = jest.spyOn(document, 'removeEventListener');
        const removeWindowSpy = jest.spyOn(window, 'removeEventListener');
        
        unmount();
        
        // Document listeners
        expect(removeDocumentSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(removeDocumentSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(removeDocumentSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
        
        // Window listeners
        expect(removeWindowSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeWindowSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
        
        removeDocumentSpy.mockRestore();
        removeWindowSpy.mockRestore();
      }).toThrow('Event cleanup - not implemented yet');
    });

    test('should use O(1) Map lookups for fingering retrieval', () => {
      expect(() => {
        const annotations = new Map<string, number>();
        
        // Add 1000 annotations
        for (let i = 0; i < 1000; i++) {
          annotations.set(`t${i}-m${60 + (i % 12)}`, (i % 5) + 1);
        }
        
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Mock internal Map usage
        result.current._annotationMap = annotations;
        
        const startTime = performance.now();
        
        // Lookup should be O(1)
        for (let i = 0; i < 100; i++) {
          const fingering = result.current.getFingeringForNote(`t${i * 10}-m${60 + (i % 12)}`);
          expect(typeof fingering).toBe('number');
        }
        
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(1); // 100 lookups in <1ms
      }).toThrow('O(1) Map lookup performance - not implemented yet');
    });
  });

  describe('Accessibility Features', () => {
    test('should announce state changes to screen readers', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Create live region
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.id = 'fingering-announcer';
        document.body.appendChild(liveRegion);
        
        // Mock announcement function
        result.current._announce = (message: string) => {
          liveRegion.textContent = message;
        };
        
        // Add fingering
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 });
        });
        
        await act(async () => {
          await result.current.submitFingering(3);
        });
        
        expect(liveRegion.textContent).toBe('Fingering 3 added to note C4');
        
        // Remove fingering
        act(() => {
          result.current.setActiveInput('t1-m60', { x: 100, y: 200 }, 3);
        });
        
        await act(async () => {
          await result.current.submitFingering(null);
        });
        
        expect(liveRegion.textContent).toBe('Fingering removed from note C4');
        
        liveRegion.remove();
      }).toThrow('Screen reader announcements - not implemented yet');
    });

    test('should handle rapid keyboard input gracefully (GROK3)', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        const announcements: string[] = [];
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        
        // Track announcements
        const observer = new MutationObserver(() => {
          if (liveRegion.textContent) {
            announcements.push(liveRegion.textContent);
          }
        });
        
        observer.observe(liveRegion, {
          childList: true,
          characterData: true,
          subtree: true
        });
        
        document.body.appendChild(liveRegion);
        result.current._announce = (msg: string) => {
          liveRegion.textContent = msg;
        };
        
        // Enable editing
        act(() => {
          result.current.setEditingMode(true);
        });
        
        // Rapid number presses
        for (let i = 1; i <= 5; i++) {
          const event = new KeyboardEvent('keydown', {
            key: i.toString(),
            code: `Digit${i}`
          });
          
          document.dispatchEvent(event);
          
          act(() => {
            jest.advanceTimersByTime(30); // Less than debounce
          });
        }
        
        // Advance to process
        act(() => {
          jest.advanceTimersByTime(200);
        });
        
        // Should have coherent announcements
        await waitFor(() => {
          expect(announcements.length).toBeLessThan(5); // Debounced
          expect(announcements[announcements.length - 1]).toMatch(/Fingering .* set/);
        });
        
        observer.disconnect();
        liveRegion.remove();
      }).toThrow('Accessibility stress test - not implemented yet');
    });
  });

  describe('Integration with Store State', () => {
    test('should sync with store state updates', async () => {
      expect(async () => {
        const mockStore = {
          annotations: {
            'test-score': {
              't1-m60': 3,
              't2-m62': 1,
              't3-m64': 5,
            }
          },
          setFingering: jest.fn(),
          subscribe: jest.fn()
        };
        
        (useFingeringStore as jest.Mock).mockReturnValue(mockStore);
        
        const { result } = renderHook(() => useFingeringInteraction({
          scoreId: 'test-score'
        }));
        
        // Should reflect initial store state
        expect(result.current.getFingeringForNote('t1-m60')).toBe(3);
        expect(result.current.getFingeringForNote('t2-m62')).toBe(1);
        expect(result.current.getFingeringForNote('t3-m64')).toBe(5);
        
        // Store update should sync
        act(() => {
          mockStore.annotations['test-score']['t1-m60'] = 4;
          // Trigger subscription callback
          const callback = mockStore.subscribe.mock.calls[0][0];
          callback({ annotations: mockStore.annotations });
        });
        
        await waitFor(() => {
          expect(result.current.getFingeringForNote('t1-m60')).toBe(4);
        });
      }).toThrow('Store sync - not implemented yet');
    });

    test('should handle multi-score scenarios (CHATGPT 4.1)', async () => {
      expect(async () => {
        const mockStore = {
          annotations: {
            'score-1': { 't1-m60': 1 },
            'score-2': { 't1-m60': 2 }, // Same note ID, different score
          },
          setFingering: jest.fn()
        };
        
        (useFingeringStore as jest.Mock).mockReturnValue(mockStore);
        
        // Hook for score 1
        const { result: result1 } = renderHook(() => 
          useFingeringInteraction({ scoreId: 'score-1' })
        );
        
        // Hook for score 2
        const { result: result2 } = renderHook(() => 
          useFingeringInteraction({ scoreId: 'score-2' })
        );
        
        // Should have different values for same note ID
        expect(result1.current.getFingeringForNote('t1-m60')).toBe(1);
        expect(result2.current.getFingeringForNote('t1-m60')).toBe(2);
        
        // Update should affect only the right score
        await act(async () => {
          result1.current.setActiveInput('t1-m60', { x: 100, y: 200 }, 1);
          await result1.current.submitFingering(5);
        });
        
        expect(mockStore.setFingering).toHaveBeenCalledWith('score-1', 1, 60, 5);
        expect(mockStore.setFingering).not.toHaveBeenCalledWith('score-2', expect.anything(), expect.anything(), expect.anything());
      }).toThrow('Multi-score isolation - not implemented yet');
    });
  });

  describe('Touch Support (GROK3)', () => {
    test('should handle touch events with proper coordinates', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        act(() => {
          result.current.setEditingMode(true);
        });
        
        const noteElement = document.createElement('div');
        noteElement.setAttribute('data-note-id', 't1-m60');
        noteElement.getBoundingClientRect = () => ({
          left: 100,
          top: 200,
          right: 140,
          bottom: 240,
          width: 40,
          height: 40,
          x: 100,
          y: 200
        });
        
        const touchEvent = new TouchEvent('touchend', {
          changedTouches: [
            {
              identifier: 1,
              target: noteElement,
              clientX: 120,
              clientY: 220,
            } as Touch
          ],
          bubbles: true
        });
        
        await act(async () => {
          result.current.handleNoteClick(touchEvent, noteElement);
        });
        
        expect(result.current.selectedNoteId).toBe('t1-m60');
        expect(result.current.isInputOpen).toBe(true);
        expect(result.current.inputPosition).toEqual({
          x: 120,
          y: 220
        });
      }).toThrow('Touch event handling - not implemented yet');
    });
  });

  describe('Focus Management (GEMINI)', () => {
    test('should track and restore focus after input closes', async () => {
      expect(async () => {
        const { result } = renderHook(() => useFingeringInteraction());
        
        // Create focusable note element
        const noteElement = document.createElement('button');
        noteElement.setAttribute('data-note-id', 't1-m60');
        noteElement.textContent = 'C4';
        document.body.appendChild(noteElement);
        
        // Click to open input
        noteElement.focus();
        const originalActiveElement = document.activeElement;
        
        await act(async () => {
          result.current.handleNoteClick(new MouseEvent('click'), noteElement);
        });
        
        // Input should have focus (mocked)
        const mockInput = document.createElement('input');
        mockInput.focus();
        
        // Submit to close
        await act(async () => {
          await result.current.submitFingering(3);
        });
        
        // Focus should return
        expect(document.activeElement).toBe(originalActiveElement);
        
        noteElement.remove();
      }).toThrow('Focus management - not implemented yet');
    });
  });
});