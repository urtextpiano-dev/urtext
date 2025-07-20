// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';

// Import the hook that will be modified in this phase
import { useKeyboardShortcuts } from '@/renderer/features/practice-mode/hooks/useKeyboardShortcuts';
import { announceToScreenReader } from '@/renderer/utils/accessibility';

// Mock dependencies
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: false
}));

jest.mock('@/renderer/features/practice-mode/hooks', () => ({
  usePracticeController: jest.fn(() => ({
    toggleRepeat: jest.fn(),
    repeatActive: false,
    practiceState: {
      status: 'practiceListening'
    },
    state: {
      status: 'practiceListening'
    }
  }))
}));

jest.mock('@/renderer/utils/accessibility', () => ({
  announceToScreenReader: jest.fn()
}));

describe('Version useKeyboardShortcuts - Repeat Feature Integration Tests', () => {
  let mockToggleRepeat: jest.Mock;
  let mockAnnounceToScreenReader: jest.Mock;
  let mockUsePracticeController: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockToggleRepeat = jest.fn();
    // @ts-ignore - Mock module
    mockAnnounceToScreenReader = require('@/renderer/utils/accessibility').announceToScreenReader;
    // @ts-ignore - Mock module
    mockUsePracticeController = require('@/renderer/features/practice-mode/hooks').usePracticeController;
    
    mockUsePracticeController.mockReturnValue({
      toggleRepeat: mockToggleRepeat,
      repeatActive: false,
      state: {
        status: 'practiceListening'
      },
      practiceState: {
        status: 'practiceListening'
      }
    });
  });

  afterEach(() => {
    // Clean up any active input elements
    document.body.innerHTML = '';
  });

  describe('L Key Handler', () => {
    test('should toggle repeat on L key press', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Simulate L key press
        fireEvent.keyDown(document, { key: 'l' });
        
        expect(mockToggleRepeat).toHaveBeenCalledTimes(1);
    });

    test('should toggle repeat on uppercase L key press', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Simulate uppercase L (with shift)
        fireEvent.keyDown(document, { key: 'L', shiftKey: true });
        
        expect(mockToggleRepeat).toHaveBeenCalledTimes(1);
    });

    test('should only work when practice is active', () => {
              mockUsePracticeController.mockReturnValue({
          toggleRepeat: mockToggleRepeat,
          repeatActive: false,
          state: {
            status: 'idle' // Not in practice mode
          },
          practiceState: {
            status: 'idle'
          }
        });
        
        renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'l' });
        
        // Should NOT toggle when not practicing
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should prevent default action', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Mock preventDefault
        const preventDefault = jest.fn();
        const event = { key: 'l', preventDefault, ctrlKey: false, metaKey: false };
        
        fireEvent.keyDown(document, event);
        
        expect(preventDefault).toHaveBeenCalled();
        expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('Focus Protection', () => {
    test('should NOT toggle when typing in input field', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Create and focus an input
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        
        fireEvent.keyDown(input, { key: 'l' });
        
        // Should not toggle when typing
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should NOT toggle when typing in textarea', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Create and focus a textarea
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();
        
        fireEvent.keyDown(textarea, { key: 'l' });
        
        // Should not toggle when typing
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should NOT toggle when typing in contenteditable', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Create and focus a contenteditable div
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        div.focus();
        
        fireEvent.keyDown(div, { key: 'l' });
        
        // Should not toggle when typing
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should work when focus is on non-editable element', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Focus on a button (non-editable)
        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();
        
        fireEvent.keyDown(button, { key: 'l' });
        
        // Should toggle on non-editable elements
        expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('Modifier Key Protection', () => {
    test('should NOT toggle with Ctrl+L', () => {
              renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'l', ctrlKey: true });
        
        // Should not toggle with Ctrl
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should NOT toggle with Cmd+L (Mac)', () => {
              renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'l', metaKey: true });
        
        // Should not toggle with Cmd
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should work with Shift+L', () => {
              renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'L', shiftKey: true });
        
        // Should work with shift (uppercase L)
        expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Announcements', () => {
    test('should announce "Repeat mode on" when activating', () => {
              mockUsePracticeController.mockReturnValue({
          toggleRepeat: mockToggleRepeat,
          repeatActive: false, // Currently off
          state: { status: 'practiceListening' },
          practiceState: { status: 'practiceListening' }
        });
        
        renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'l' });
        
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Repeat mode on');
    });

    test('should announce "Repeat mode off" when deactivating', () => {
              mockUsePracticeController.mockReturnValue({
          toggleRepeat: mockToggleRepeat,
          repeatActive: true, // Currently on
          state: { status: 'practiceListening' },
          practiceState: { status: 'practiceListening' }
        });
        
        renderHook(() => useKeyboardShortcuts());
        
        fireEvent.keyDown(document, { key: 'l' });
        
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Repeat mode off');
    });
  });

  describe('Integration with Other Shortcuts', () => {
    test('should not interfere with existing shortcuts', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Test that other keys still work
        const otherKeyEvent = new KeyboardEvent('keydown', { 
          key: 'Space',
          code: 'Space'
        });
        
        // Should not prevent other shortcuts
        const defaultPrevented = !document.dispatchEvent(otherKeyEvent);
        expect(defaultPrevented).toBe(false); // Space not prevented by L handler
        
        // L key should not be triggered
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });

    test('should work alongside help shortcut', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Press ? for help (existing shortcut)
        fireEvent.keyDown(document, { key: '?', shiftKey: true });
        
        // Then press L
        fireEvent.keyDown(document, { key: 'l' });
        
        // Both should work independently
        expect(mockToggleRepeat).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid L key presses', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Rapid fire L presses
        for (let i = 0; i < 10; i++) {
          fireEvent.keyDown(document, { key: 'l' });
        }
        
        // Should toggle each time
        expect(mockToggleRepeat).toHaveBeenCalledTimes(10);
    });

    test('should handle key repeat (holding L)', () => {
              renderHook(() => useKeyboardShortcuts());
        
        // Simulate key repeat
        fireEvent.keyDown(document, { key: 'l', repeat: true });
        fireEvent.keyDown(document, { key: 'l', repeat: true });
        fireEvent.keyDown(document, { key: 'l', repeat: true });
        
        // Should toggle on each repeat
        expect(mockToggleRepeat).toHaveBeenCalledTimes(3);
    });

    test('should cleanup event listeners on unmount', () => {
              const { unmount } = renderHook(() => useKeyboardShortcuts());
        
        unmount();
        
        // After unmount, shortcuts should not work
        fireEvent.keyDown(document, { key: 'l' });
        
        expect(mockToggleRepeat).not.toHaveBeenCalled();
    });
  });
});