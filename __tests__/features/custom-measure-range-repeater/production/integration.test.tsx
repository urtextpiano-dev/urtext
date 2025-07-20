/**
 * Version Complete App Integration Tests
 * 
 * 
 * This validates the complete feature integration into Urtext Piano
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Imports will fail initially - this drives implementation
// import { App } from '@/renderer/App';
// import { TopControlsMenu } from '@/renderer/components/TopControlsMenu/TopControlsMenu';

// Mock electron API
global.window.electronAPI = {
  invoke: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

describe('Version Complete App Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Full User Journey', () => {
    test('should complete full custom range workflow', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // 1. Load a music file
        const fileInput = screen.getByLabelText('Load MusicXML file');
        const file = new File(['<musicxml>...</musicxml>'], 'test.xml', { 
          type: 'application/xml' 
        });
        
        await user.upload(fileInput, file);
        
        // Wait for OSMD to load
        await waitFor(() => {
          expect(screen.getByTestId('sheet-music-display')).toBeInTheDocument();
        });
        
        // 2. Start practice mode
        const practiceButton = screen.getByRole('button', { name: /start practice/i });
        await user.click(practiceButton);
        
        // 3. Custom range selector should appear
        await waitFor(() => {
          expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        });
        
        // 4. Set custom range
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        await user.clear(startInput);
        await user.type(startInput, '5');
        await user.clear(endInput);
        await user.type(endInput, '10');
        
        // 5. Enable custom range
        const enableButton = screen.getByRole('button', { name: /enable range/i });
        await user.click(enableButton);
        
        // 6. Verify practice is constrained to range
        const practiceInfo = screen.getByTestId('practice-info');
        expect(practiceInfo).toHaveTextContent('Practicing measures 5-10');
        
        // 7. Stop practice
        const stopButton = screen.getByRole('button', { name: /stop practice/i });
        await user.click(stopButton);
        
        // Custom range selector should disappear
        await waitFor(() => {
          expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
        });
      }).toThrow('Version Full user journey not implemented');
    });

    test('should persist range preferences across sessions', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        // First session
        const { unmount } = render(<App />);
        
        // Set up custom range
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        const startInput = screen.getByLabelText('Start measure');
        await user.clear(startInput);
        await user.type(startInput, '3');
        
        const endInput = screen.getByLabelText('End measure');
        await user.clear(endInput);
        await user.type(endInput, '7');
        
        unmount();
        
        // Second session
        render(<App />);
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Range should be remembered
        expect(screen.getByLabelText('Start measure')).toHaveValue(3);
        expect(screen.getByLabelText('End measure')).toHaveValue(7);
      }).toThrow('Version Session persistence not implemented');
    });
  });

  describe('Integration with All Practice Features', () => {
    test('should work with tempo control', async () => {
      expect(async () => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        const user = userEvent.setup();
        
        render(<TopControlsMenu />);
        
        // Enable practice
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Both features visible
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        expect(screen.getByLabelText('Tempo')).toBeInTheDocument();
        
        // Set custom range
        const startInput = screen.getByLabelText('Start measure');
        await user.type(startInput, '5');
        
        // Adjust tempo
        const tempoSlider = screen.getByLabelText('Tempo');
        fireEvent.change(tempoSlider, { target: { value: '80' } });
        
        // Both should work together
        expect(startInput).toHaveValue(5);
        expect(tempoSlider).toHaveValue(80);
      }).toThrow('Version Tempo integration not verified');
    });

    test('should work with visual feedback', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Start practice with custom range
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        await user.type(startInput, '3');
        await user.type(endInput, '5');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Visual indicators should show range
        const sheetMusic = screen.getByTestId('sheet-music-display');
        const rangeBracket = within(sheetMusic).getByTestId('range-bracket');
        
        expect(rangeBracket).toBeInTheDocument();
        expect(rangeBracket).toHaveAttribute('data-start', '3');
        expect(rangeBracket).toHaveAttribute('data-end', '5');
      }).toThrow('Version Visual feedback integration not implemented');
    });

    test('should work with MIDI input', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Setup custom range practice
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '5');
        await user.type(screen.getByLabelText('End measure'), '7');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Simulate MIDI input
        window.electronAPI.invoke.mockImplementation((channel) => {
          if (channel === 'midi:event') {
            return { note: 60, velocity: 100, type: 'noteOn' };
          }
        });
        
        // Trigger MIDI event
        const midiHandler = window.electronAPI.on.mock.calls
          .find(call => call[0] === 'midi:event')[1];
        
        midiHandler({ note: 60, velocity: 100 });
        
        // Should evaluate within custom range
        await waitFor(() => {
          const feedback = screen.getByTestId('note-feedback');
          expect(feedback).toHaveTextContent('Correct!');
        });
      }).toThrow('Version MIDI integration not verified');
    });
  });

  describe('Performance with Full Integration', () => {
    test('should maintain performance with all features active', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        const startTime = performance.now();
        
        render(<App />);
        
        // Load file
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File(['<musicxml>...</musicxml>'], 'test.xml')
        );
        
        // Start practice
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Set custom range
        await user.type(screen.getByLabelText('Start measure'), '10');
        await user.type(screen.getByLabelText('End measure'), '20');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        const totalTime = performance.now() - startTime;
        
        // Complete workflow should be snappy
        expect(totalTime).toBeLessThan(2000); // <2s for full setup
      }).toThrow('Version Full integration performance not optimized');
    });

    test('should handle rapid feature toggling', async () => {
      expect(async () => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        const user = userEvent.setup();
        
        render(<TopControlsMenu />);
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        const toggleButton = screen.getByRole('button', { name: /enable range/i });
        
        // Rapid toggling
        for (let i = 0; i < 20; i++) {
          await user.click(toggleButton);
        }
        
        // Should remain responsive
        expect(toggleButton).not.toBeDisabled();
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
      }).toThrow('Version Rapid toggling handling not implemented');
    });
  });

  describe('Error Handling in Production', () => {
    test('should gracefully handle missing OSMD', async () => {
      expect(async () => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        
        // Mock OSMD not ready
        jest.mock('@/renderer/stores/osmdStore', () => ({
          useOSMDStore: () => ({ osmdReady: false, measureCount: 0 })
        }));
        
        render(<TopControlsMenu />);
        
        // Start practice without sheet music
        await userEvent.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Should not show range selector
        expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
        
        // Should show appropriate message
        expect(screen.getByText(/Load a score to use practice features/i)).toBeInTheDocument();
      }).toThrow('Version Missing OSMD handling not implemented');
    });

    test('should handle store errors without crashing', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        
        // Mock store error
        jest.mock('@/renderer/features/practice-mode/stores/practiceStore', () => ({
          usePracticeStore: () => {
            throw new Error('Store initialization failed');
          }
        }));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Should not crash app
        expect(() => {
          render(<App />);
        }).not.toThrow();
        
        // Should show error boundary
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        
        consoleSpy.mockRestore();
      }).toThrow('Version Store error recovery not implemented');
    });
  });

  describe('Accessibility of Complete Feature', () => {
    test('should pass accessibility audit with feature active', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        const { container } = render(<App />);
        
        // Activate all features
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Wait for dynamic content
        await waitFor(() => {
          expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        });
        
        // Full accessibility check
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }).toThrow('Version Full feature accessibility not verified');
    });

    test('should maintain keyboard navigation through all controls', async () => {
      expect(async () => {
        const { TopControlsMenu } = require('@/renderer/components/TopControlsMenu/TopControlsMenu');
        const user = userEvent.setup();
        
        render(<TopControlsMenu />);
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Tab through all controls
        await user.tab(); // Practice toggle
        await user.tab(); // Tempo slider
        await user.tab(); // Start measure input
        await user.tab(); // End measure input
        await user.tab(); // Enable range button
        
        // Should reach enable button
        expect(screen.getByRole('button', { name: /enable range/i })).toHaveFocus();
        
        // Shift+Tab back
        await user.keyboard('{Shift>}{Tab}{Tab}{Tab}{Tab}{/Shift}');
        
        // Should be back at practice toggle
        expect(screen.getByRole('button', { name: /stop practice/i })).toHaveFocus();
      }).toThrow('Version Complete keyboard navigation not implemented');
    });
  });

  describe('Phase 3 Complete Verification', () => {
    test('should demonstrate all Phase 3 features integrated', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // 1. MeasureRangeSelector in TopControlsMenu
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        
        // 2. Conflict resolution working
        // (Assume score has musical repeats)
        const enableButton = screen.getByRole('button', { name: /enable range/i });
        expect(enableButton).toHaveClass('has-conflict');
        
        await user.click(enableButton);
        expect(screen.getByRole('alert')).toBeInTheDocument();
        
        // 3. Accessibility compliant
        const startInput = screen.getByLabelText('Start measure');
        expect(startInput).toHaveAttribute('aria-describedby');
        
        // 4. Keyboard shortcuts working
        await user.keyboard('{Control>}r{/Control}');
        expect(screen.getByRole('button')).toHaveTextContent('Enable Range');
        
        // 5. Visual polish applied
        const rangeSelector = screen.getByText('Practice Range:').parentElement;
        expect(rangeSelector).toHaveClass('top-controls-item');
        
        // 6. Performance maintained
        const { rerender } = render(<App />);
        const startTime = performance.now();
        rerender(<App />);
        expect(performance.now() - startTime).toBeLessThan(50);
        
        // Phase 3 is complete!
      }).toThrow('Version Complete integration not implemented');
    });
  });
});