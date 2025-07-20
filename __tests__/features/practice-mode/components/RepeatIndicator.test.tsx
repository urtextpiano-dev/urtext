// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import the component that will be created in this phase
import { RepeatIndicator } from '@/renderer/features/practice-mode/components/RepeatIndicator';

// Mock dependencies
jest.mock('@/renderer/utils/env', () => ({
  IS_DEVELOPMENT: false
}));

// Mock the practice controller hook
jest.mock('@/renderer/features/practice-mode/hooks', () => ({
  usePracticeController: jest.fn(() => ({
    repeatActive: false,
    toggleRepeat: jest.fn()
  }))
}));

describe('Phase 3: RepeatIndicator Component - Accessible UI Tests', () => {
  let mockToggleRepeat: jest.Mock;
  let mockUsePracticeController: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockToggleRepeat = jest.fn();
    // @ts-ignore - Mock module
    mockUsePracticeController = require('@/renderer/features/practice-mode/hooks').usePracticeController;
    mockUsePracticeController.mockReturnValue({
      repeatActive: false,
      toggleRepeat: mockToggleRepeat
    });
  });

  describe('Core Rendering', () => {
    test('should render repeat button with proper structure', () => {
              render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        
        // Should have icon and text
        expect(screen.getByText('🔁')).toBeInTheDocument();
        expect(screen.getByText('Repeat')).toBeInTheDocument();
    });

    test('should show active state when repeat is on', () => {
              mockUsePracticeController.mockReturnValue({
          repeatActive: true,
          toggleRepeat: mockToggleRepeat
        });
        
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('active');
        expect(screen.getByText('Repeat On')).toBeInTheDocument();
    });

    test('should show inactive state when repeat is off', () => {
              render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).not.toHaveClass('active');
        expect(screen.getByText('Repeat')).toBeInTheDocument();
    });
  });

  describe('Accessibility Requirements', () => {
    test('should have proper ARIA attributes', () => {
              render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        
        // ARIA pressed state
        expect(button).toHaveAttribute('aria-pressed', 'false');
        
        // Descriptive label
        expect(button).toHaveAttribute('aria-label', 'Repeat mode off, press to turn on');
        
        // Tooltip
        expect(button).toHaveAttribute('title', 'Toggle repeat (L)');
    });

    test('should update ARIA attributes when active', () => {
              mockUsePracticeController.mockReturnValue({
          repeatActive: true,
          toggleRepeat: mockToggleRepeat
        });
        
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button).toHaveAttribute('aria-label', 'Repeat mode on, press to turn off');
    });

    test('should mark icon as decorative', () => {
              render(<RepeatIndicator />);
        
        const icon = screen.getByText('🔁');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('should be keyboard focusable', () => {
              render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        
        // Should be in tab order
        expect(button).not.toHaveAttribute('tabindex', '-1');
        
        // Should show focus indicator
        button.focus();
        expect(button).toHaveFocus();
    });
  });

  describe('User Interactions', () => {
    test('should call toggleRepeat on click', async () => {
              const user = userEvent.setup();
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        await user.click(button);
        
        expect(mockToggleRepeat).toHaveBeenCalledTimes(1);
    });

    test('should call toggleRepeat on Enter key', async () => {
              const user = userEvent.setup();
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        button.focus();
        await user.keyboard('{Enter}');
        
        expect(mockToggleRepeat).toHaveBeenCalledTimes(1);
    });

    test('should call toggleRepeat on Space key', async () => {
              const user = userEvent.setup();
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        button.focus();
        await user.keyboard(' ');
        
        expect(mockToggleRepeat).toHaveBeenCalledTimes(1);
    });

    test('should show hover state', async () => {
              const user = userEvent.setup();
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        await user.hover(button);
        
        // Should have hover styles applied
        expect(button).toHaveStyle({ background: expect.stringContaining('#e0e0e0') });
    });
  });

  describe('Visual Styling', () => {
    test('should have proper inactive styling', () => {
              render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('repeat-indicator');
        expect(button).not.toHaveClass('active');
        
        // Default gray background
        expect(button).toHaveStyle({
          background: '#f0f0f0',
          color: '#333'
        });
    });

    test('should have proper active styling', () => {
              mockUsePracticeController.mockReturnValue({
          repeatActive: true,
          toggleRepeat: mockToggleRepeat
        });
        
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('active');
        
        // Green active background
        expect(button).toHaveStyle({
          background: '#4CAF50',
          color: 'white'
        });
    });

    test('should support high contrast mode', () => {
              // Mock high contrast mode
        window.matchMedia = jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }));
        
        mockUsePracticeController.mockReturnValue({
          repeatActive: true,
          toggleRepeat: mockToggleRepeat
        });
        
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        // Should have thicker border in high contrast
        expect(button).toHaveStyle({ borderWidth: '3px' });
    });
  });

  describe('Screen Reader Support', () => {
    test('should have descriptive text for screen readers', () => {
              render(<RepeatIndicator />);
        
        // Should have text content readable by screen readers
        expect(screen.getByRole('button')).toHaveTextContent('Repeat');
        
        // But icon should be hidden from screen readers
        const icon = screen.getByText('🔁');
        expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true');
    });

    test('should work without CSS (screen reader only)', () => {
              render(<RepeatIndicator />);
        
        // Remove all CSS classes to simulate screen reader
        const button = screen.getByRole('button');
        button.removeAttribute('class');
        
        // Should still be functional
        fireEvent.click(button);
        expect(mockToggleRepeat).toHaveBeenCalled();
        
        // Should still have semantic meaning
        expect(button).toHaveAttribute('aria-pressed');
        expect(button).toHaveTextContent(/repeat/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid clicks gracefully', async () => {
              const user = userEvent.setup({ delay: null }); // No delay between actions
        render(<RepeatIndicator />);
        
        const button = screen.getByRole('button');
        
        // Rapid fire clicks
        await user.click(button);
        await user.click(button);
        await user.click(button);
        await user.click(button);
        await user.click(button);
        
        // Should call toggle for each click
        expect(mockToggleRepeat).toHaveBeenCalledTimes(5);
    });

    test('should handle missing toggleRepeat gracefully', () => {
              mockUsePracticeController.mockReturnValue({
          repeatActive: false,
          toggleRepeat: undefined // Missing function
        });
        
        render(<RepeatIndicator />);
        
        // Should still render
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        
        // Click should not throw
        fireEvent.click(button);
    });
  });
});