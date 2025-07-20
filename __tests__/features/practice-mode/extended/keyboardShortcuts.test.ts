/**
 * Phase 4 Task 4.4: Keyboard Shortcuts & Accessibility Tests
 * 
 * Tests keyboard navigation, shortcuts, and screen reader support.
 * Verifies accessibility features and keyboard-only interaction.
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import type { KeyboardEvent } from 'react';

// Mock practice store
const mockStoreState = {
  isActive: false,
  togglePractice: jest.fn(),
  resetCurrentStep: jest.fn(),
  skipCurrentStep: jest.fn(),
  previousStep: jest.fn(),
  showHint: jest.fn(),
  togglePause: jest.fn(),
  showKeyboardHelp: jest.fn()
};

jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: () => mockStoreState
}));

// Import after mocks
import { useKeyboardShortcuts } from '@/renderer/features/practice-mode/hooks/useKeyboardShortcuts';

describe('Keyboard Shortcuts', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let keydownHandler: (e: KeyboardEvent) => void;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clean up any existing announcements from previous tests
    document.querySelectorAll('[role="status"]').forEach(el => el.remove());
    
    // Capture event listener
    addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as any;
      }
    });
    
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });
  
  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
  
  const createKeyEvent = (key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent => ({
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: jest.fn(),
    target: document.body,
    ...options
  } as any);
  
  describe('Shortcut Registration', () => {
    test('should register keyboard event listener on mount', () => {
      renderHook(() => useKeyboardShortcuts());
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
    
    test('should unregister keyboard event listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
  
  describe('Practice Mode Toggle', () => {
    test('should toggle practice mode with Ctrl+P', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('p', { ctrlKey: true });
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.togglePractice).toHaveBeenCalled();
    });
    
    test('should toggle practice mode with Cmd+P on Mac', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('p', { metaKey: true });
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.togglePractice).toHaveBeenCalled();
    });
    
    test('should not toggle when typing in input field', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const input = document.createElement('input');
      const event = createKeyEvent('p', { ctrlKey: true, target: input });
      act(() => keydownHandler(event));
      
      expect(mockStoreState.togglePractice).not.toHaveBeenCalled();
    });
  });
  
  describe('Practice Navigation Shortcuts', () => {
    beforeEach(() => {
      mockStoreState.isActive = true;
    });
    
    test('should skip to next step with right arrow', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('ArrowRight');
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.skipCurrentStep).toHaveBeenCalled();
    });
    
    test('should go to previous step with left arrow', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('ArrowLeft');
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.previousStep).toHaveBeenCalled();
    });
    
    test('should pause/resume with spacebar', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent(' ');
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.togglePause).toHaveBeenCalled();
    });
    
    test('should not respond to navigation when practice mode is inactive', () => {
      mockStoreState.isActive = false;
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('ArrowRight');
      act(() => keydownHandler(event));
      
      expect(mockStoreState.skipCurrentStep).not.toHaveBeenCalled();
    });
  });
  
  describe('Help and Hints', () => {
    test('should show hint with Ctrl+H', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('h', { ctrlKey: true });
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.showHint).toHaveBeenCalled();
    });
    
    test('should show keyboard help with ?', () => {
      mockStoreState.isActive = true;
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('?');
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.showKeyboardHelp).toHaveBeenCalled();
    });
    
    test('should reset current step with Ctrl+R', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('r', { ctrlKey: true });
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockStoreState.resetCurrentStep).toHaveBeenCalled();
    });
  });
  
  describe('Accessibility Announcements', () => {
    test('should provide announceStatus function', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      expect(result.current.announceStatus).toBeDefined();
      expect(typeof result.current.announceStatus).toBe('function');
    });
    
    test('should create aria-live region for announcements', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      act(() => {
        result.current.announceStatus('Practice mode started');
      });
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeTruthy();
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveTextContent('Practice mode started');
    });
    
    test('should remove announcement after delay', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      act(() => {
        result.current.announceStatus('Test announcement');
      });
      
      expect(document.querySelector('[role="status"]')).toBeTruthy();
      
      act(() => {
        jest.runAllTimers();
      });
      
      expect(document.querySelector('[role="status"]')).toBeFalsy();
      
      jest.useRealTimers();
    });
    
    test('should handle multiple announcements', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      act(() => {
        result.current.announceStatus('First announcement');
        result.current.announceStatus('Second announcement');
      });
      
      const announcements = document.querySelectorAll('[role="status"]');
      expect(announcements).toHaveLength(2);
    });
  });
  
  describe('Keyboard Help Display', () => {
    test('should return help content structure', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      const helpContent = result.current.getKeyboardHelp();
      
      expect(helpContent).toHaveProperty('global');
      expect(helpContent).toHaveProperty('practiceMode');
      expect(helpContent).toHaveProperty('navigation');
    });
    
    test('should include all keyboard shortcuts in help', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      const help = result.current.getKeyboardHelp();
      
      // Global shortcuts
      expect(help.global).toContainEqual({
        keys: ['Ctrl', 'P'],
        description: 'Toggle practice mode'
      });
      
      // Practice mode shortcuts
      expect(help.practiceMode).toContainEqual({
        keys: ['Space'],
        description: 'Pause/Resume'
      });
      
      // Navigation shortcuts
      expect(help.navigation).toContainEqual({
        keys: ['→'],
        description: 'Next step'
      });
    });
    
    test('should show Mac-specific shortcuts on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true
      });
      
      const { result } = renderHook(() => useKeyboardShortcuts());
      const help = result.current.getKeyboardHelp();
      
      expect(help.global).toContainEqual({
        keys: ['⌘', 'P'],
        description: 'Toggle practice mode'
      });
    });
  });
  
  describe('Focus Management', () => {
    test('should trap focus in help modal when open', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      act(() => {
        result.current.showHelpModal();
      });
      
      const modal = document.querySelector('[role="dialog"]');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      
      // Test focus trap
      const focusableElements = modal?.querySelectorAll(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusableElements?.length).toBeGreaterThan(0);
    });
    
    test('should restore focus after closing help', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      
      const { result } = renderHook(() => useKeyboardShortcuts());
      
      act(() => {
        result.current.showHelpModal();
      });
      
      act(() => {
        result.current.closeHelpModal();
      });
      
      expect(document.activeElement).toBe(button);
      
      document.body.removeChild(button);
    });
  });
  
  describe('Conflict Prevention', () => {
    test('should not interfere with text input', () => {
      renderHook(() => useKeyboardShortcuts());
      
      const textarea = document.createElement('textarea');
      const event = createKeyEvent('p', { ctrlKey: true, target: textarea });
      
      act(() => keydownHandler(event));
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockStoreState.togglePractice).not.toHaveBeenCalled();
    });
    
    test('should not trigger shortcuts when modals are open', () => {
      renderHook(() => useKeyboardShortcuts());
      
      // Simulate modal open
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      document.body.appendChild(modal);
      
      const event = createKeyEvent('ArrowRight');
      act(() => keydownHandler(event));
      
      expect(mockStoreState.skipCurrentStep).not.toHaveBeenCalled();
      
      document.body.removeChild(modal);
    });
    
    test('should respect disabled shortcuts setting', () => {
      mockStoreState.keyboardShortcutsEnabled = false;
      renderHook(() => useKeyboardShortcuts());
      
      const event = createKeyEvent('p', { ctrlKey: true });
      act(() => keydownHandler(event));
      
      expect(mockStoreState.togglePractice).not.toHaveBeenCalled();
    });
  });
  
  describe('Custom Shortcut Configuration', () => {
    test('should allow custom shortcut mapping', () => {
      const customShortcuts = {
        togglePractice: { key: 't', modifiers: ['ctrl'] },
        nextStep: { key: 'n', modifiers: [] }
      };
      
      const { result } = renderHook(() => 
        useKeyboardShortcuts({ customShortcuts })
      );
      
      expect(result.current.shortcuts).toEqual(customShortcuts);
    });
    
    test('should validate custom shortcuts for conflicts', () => {
      const conflictingShortcuts = {
        action1: { key: 'p', modifiers: ['ctrl'] },
        action2: { key: 'p', modifiers: ['ctrl'] } // Conflict
      };
      
      const { result } = renderHook(() => 
        useKeyboardShortcuts({ customShortcuts: conflictingShortcuts })
      );
      
      expect(result.current.conflicts).toContain('action2');
    });
  });
});