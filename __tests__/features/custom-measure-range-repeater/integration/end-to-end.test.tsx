/**
 * End-to-End Integration Tests
 * 
 * TDD CYCLE REMINDER:
 * 1. RED: Run these tests - they should fail with "not implemented" errors
 * 2. GREEN: Implement complete feature across all phases
 * 3. REFACTOR: Optimize while keeping tests green
 * 
 * These tests validate the COMPLETE custom measure range repeater feature
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, renderHook } from '@testing-library/react';

// Imports will fail initially - this drives implementation
// import { App } from '@/renderer/App';
// import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
// import { MeasureTimeline } from '@/renderer/features/practice-mode/services/MeasureTimeline';

// Complete mock environment
const mockElectronAPI = {
  invoke: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  loadFile: jest.fn(),
  getMidiDevices: jest.fn(() => Promise.resolve([])),
  connectMidiDevice: jest.fn(() => Promise.resolve(true))
};

global.window.electronAPI = mockElectronAPI;

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  currentTime: 0,
  state: 'running'
}));

describe('End-to-End: Custom Measure Range Repeater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Feature Flow', () => {
    test('should complete full workflow from file load to practice loop', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Step 1: Load a MusicXML file
        const fileContent = `<?xml version="1.0" encoding="UTF-8"?>
          <score-partwise>
            <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
            <part id="P1">
              ${Array.from({ length: 20 }, (_, i) => `
                <measure number="${i + 1}">
                  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
                </measure>
              `).join('')}
            </part>
          </score-partwise>`;
        
        const file = new File([fileContent], 'test-piece.xml', { 
          type: 'application/xml' 
        });
        
        const fileInput = screen.getByLabelText('Load MusicXML file');
        await user.upload(fileInput, file);
        
        // Wait for OSMD to render
        await waitFor(() => {
          expect(screen.getByTestId('sheet-music-display')).toBeInTheDocument();
          expect(screen.getByText('test-piece.xml')).toBeInTheDocument();
        }, { timeout: 3000 });
        
        // Step 2: Start practice mode
        const practiceButton = screen.getByRole('button', { name: /start practice/i });
        await user.click(practiceButton);
        
        // Verify practice started
        expect(screen.getByRole('button', { name: /stop practice/i })).toBeInTheDocument();
        
        // Step 3: MeasureRangeSelector should appear
        await waitFor(() => {
          expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        });
        
        // Step 4: Set custom range (measures 5-10)
        const startInput = screen.getByLabelText('Start measure');
        const endInput = screen.getByLabelText('End measure');
        
        await user.clear(startInput);
        await user.type(startInput, '5');
        
        await user.clear(endInput);
        await user.type(endInput, '10');
        
        // Verify inputs updated
        expect(startInput).toHaveValue(5);
        expect(endInput).toHaveValue(10);
        
        // Step 5: Enable custom range
        const enableButton = screen.getByRole('button', { name: /enable range/i });
        await user.click(enableButton);
        
        // Verify range enabled
        expect(enableButton).toHaveTextContent('Disable Range');
        expect(enableButton).toHaveAttribute('aria-pressed', 'true');
        
        // Step 6: Verify cursor is at start of range
        const cursor = screen.getByTestId('practice-cursor');
        expect(cursor).toHaveAttribute('data-measure', '5');
        
        // Step 7: Simulate playing through the range
        for (let measure = 5; measure <= 10; measure++) {
          // Simulate correct note played
          act(() => {
            const midiHandler = mockElectronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1];
            
            midiHandler?.({ note: 60, velocity: 100, type: 'noteOn' });
          });
          
          // Wait for advancement
          await waitFor(() => {
            if (measure < 10) {
              expect(cursor).toHaveAttribute('data-measure', String(measure + 1));
            }
          });
        }
        
        // Step 8: Verify loop back to start
        await waitFor(() => {
          expect(cursor).toHaveAttribute('data-measure', '5');
        });
        
        // Step 9: Continue practicing (verify continuous loop)
        for (let i = 0; i < 3; i++) { // 3 more iterations
          act(() => {
            const midiHandler = mockElectronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1];
            
            midiHandler?.({ note: 60, velocity: 100, type: 'noteOn' });
          });
          
          await waitFor(() => {
            const currentMeasure = parseInt(cursor.getAttribute('data-measure')!);
            expect(currentMeasure).toBeGreaterThanOrEqual(5);
            expect(currentMeasure).toBeLessThanOrEqual(10);
          });
        }
        
        // Step 10: Stop practice
        const stopButton = screen.getByRole('button', { name: /stop practice/i });
        await user.click(stopButton);
        
        // Verify practice stopped and range selector hidden
        await waitFor(() => {
          expect(screen.queryByText('Practice Range:')).not.toBeInTheDocument();
          expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
        });
      }).toThrow('End-to-End: Complete feature flow not implemented');
    });

    test('should handle complex practice scenarios', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Load file and start practice (abbreviated)
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File(['<musicxml>...</musicxml>'], 'complex.xml')
        );
        
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        
        // Scenario 1: Change range while practicing
        await user.type(screen.getByLabelText('Start measure'), '3');
        await user.type(screen.getByLabelText('End measure'), '7');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Practice a bit
        const playNotes = async (count: number) => {
          for (let i = 0; i < count; i++) {
            act(() => {
              const handler = mockElectronAPI.on.mock.calls
                .find(call => call[0] === 'midi:event')?.[1];
              handler?.({ note: 60 + i, velocity: 100, type: 'noteOn' });
            });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        };
        
        await playNotes(5);
        
        // Change range mid-practice
        await user.clear(screen.getByLabelText('End measure'));
        await user.type(screen.getByLabelText('End measure'), '12');
        
        // Verify range updated
        const state = usePracticeStore.getState();
        expect(state.customEndMeasure).toBe(12);
        
        // Scenario 2: Disable and re-enable quickly
        const toggleButton = screen.getByRole('button', { name: /disable range/i });
        await user.click(toggleButton); // Disable
        await user.click(toggleButton); // Re-enable
        
        // Should maintain range
        expect(screen.getByLabelText('Start measure')).toHaveValue(3);
        expect(screen.getByLabelText('End measure')).toHaveValue(12);
        
        // Scenario 3: Use keyboard shortcuts
        await user.keyboard('{Alt>}5{/Alt}'); // Quick range 1-5
        
        expect(screen.getByLabelText('Start measure')).toHaveValue(1);
        expect(screen.getByLabelText('End measure')).toHaveValue(5);
        
        // Scenario 4: Error recovery
        await user.clear(screen.getByLabelText('Start measure'));
        await user.type(screen.getByLabelText('Start measure'), '999');
        
        // Should show error
        expect(screen.getByRole('alert')).toHaveTextContent(/cannot exceed/i);
        
        // Fix error
        await user.clear(screen.getByLabelText('Start measure'));
        await user.type(screen.getByLabelText('Start measure'), '1');
        
        // Error should clear
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      }).toThrow('End-to-End: Complex scenarios not handled');
    });
  });

  describe('Cross-Phase Integration', () => {
    test('should verify Phase 1 → Phase 2 → Phase 3 integration', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const { usePracticeStore } = require('@/renderer/features/practice-mode/stores/practiceStore');
        const { usePracticeController } = require('@/renderer/features/practice-mode/hooks/usePracticeController');
        
        render(<App />);
        
        // Phase 1: Store state properly initialized
        const initialState = usePracticeStore.getState();
        expect(initialState).toMatchObject({
          customRangeActive: false,
          customStartMeasure: 1,
          customEndMeasure: 1
        });
        
        // Phase 1: Component renders and updates store
        const { result: controllerResult } = renderHook(() => usePracticeController());
        
        act(() => {
          usePracticeStore.getState().setCustomRange(4, 8);
          usePracticeStore.getState().toggleCustomRange();
        });
        
        expect(usePracticeStore.getState().customRangeActive).toBe(true);
        
        // Phase 2: Practice controller detects range
        act(() => {
          controllerResult.current.startPractice();
        });
        
        // Simulate reaching end of range
        act(() => {
          // Mock cursor at end
          controllerResult.current.osmdControls.cursor.iterator.currentMeasureIndex = 7;
          controllerResult.current.handlePracticeAdvance();
        });
        
        // Should loop back (Phase 2 functionality)
        await waitFor(() => {
          expect(controllerResult.current.currentMeasure).toBe(4);
        });
        
        // Phase 3: UI properly integrated
        const rangeSelector = screen.getByText('Practice Range:').parentElement;
        expect(rangeSelector).toHaveClass('top-controls-item');
        
        // All phases working together
        expect(screen.getByRole('button', { name: /disable range/i })).toBeInTheDocument();
      }).toThrow('End-to-End: Cross-phase integration not verified');
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with rapid looping', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Setup small range for rapid looping
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '1');
        await user.type(screen.getByLabelText('End measure'), '2');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        const latencies: number[] = [];
        let loopCount = 0;
        
        // Simulate 100 rapid loops
        for (let i = 0; i < 200; i++) {
          const startTime = performance.now();
          
          act(() => {
            const handler = mockElectronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1];
            
            handler?.({ note: 60, velocity: 100, type: 'noteOn' });
          });
          
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          if (i % 2 === 1) loopCount++;
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Calculate performance metrics
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
        
        expect(loopCount).toBe(100);
        expect(avgLatency).toBeLessThan(20); // <20ms average
        expect(maxLatency).toBeLessThan(50); // <50ms max
        expect(p95Latency).toBeLessThan(30); // <30ms 95th percentile
      }).toThrow('End-to-End: Performance under load not verified');
    });

    test('should not leak memory during extended sessions', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        const initialMemory = performance.memory?.usedJSHeapSize || 0;
        
        // Setup practice
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '1');
        await user.type(screen.getByLabelText('End measure'), '5');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Simulate 30 minutes of practice (300 loops)
        for (let loop = 0; loop < 300; loop++) {
          for (let measure = 0; measure < 5; measure++) {
            act(() => {
              const handler = mockElectronAPI.on.mock.calls
                .find(call => call[0] === 'midi:event')?.[1];
              
              handler?.({ note: 60, velocity: 100, type: 'noteOn' });
            });
            
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          
          // Periodic GC hint
          if (loop % 50 === 0 && global.gc) {
            global.gc();
          }
        }
        
        const finalMemory = performance.memory?.usedJSHeapSize || 0;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Should not leak more than 5MB in 30 minutes
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      }).toThrow('End-to-End: Memory leak prevention not verified');
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle teacher-student workflow', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Teacher loads a piece
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File(['<musicxml>...</musicxml>'], 'lesson-piece.xml')
        );
        
        // Teacher identifies difficult section (measures 15-22)
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        await user.type(screen.getByLabelText('Start measure'), '15');
        await user.type(screen.getByLabelText('End measure'), '22');
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        
        // Student practices the section
        let correctNotes = 0;
        let totalNotes = 0;
        
        for (let i = 0; i < 50; i++) {
          totalNotes++;
          
          // Simulate varying accuracy
          const isCorrect = Math.random() > 0.3;
          const note = isCorrect ? 60 : 61;
          
          act(() => {
            const handler = mockElectronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1];
            
            handler?.({ note, velocity: 100, type: 'noteOn' });
          });
          
          if (isCorrect) correctNotes++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Check practice statistics
        const accuracy = (correctNotes / totalNotes) * 100;
        expect(accuracy).toBeGreaterThan(50); // Some progress
        
        // Teacher adjusts range to focus on harder part
        await user.clear(screen.getByLabelText('Start measure'));
        await user.type(screen.getByLabelText('Start measure'), '18');
        await user.clear(screen.getByLabelText('End measure'));
        await user.type(screen.getByLabelText('End measure'), '20');
        
        // Continue focused practice...
      }).toThrow('End-to-End: Teacher-student workflow not supported');
    });

    test('should support performance preparation workflow', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Pianist preparing for performance
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File(['<musicxml>...</musicxml>'], 'concert-piece.xml')
        );
        
        // Practice difficult passages
        const difficultSections = [
          { start: 45, end: 52, tempo: 60 },  // Slow practice
          { start: 78, end: 85, tempo: 80 },  // Medium tempo
          { start: 120, end: 135, tempo: 100 } // Near performance tempo
        ];
        
        for (const section of difficultSections) {
          // Set tempo
          const tempoSlider = screen.getByLabelText('Tempo');
          fireEvent.change(tempoSlider, { target: { value: section.tempo } });
          
          // Set range
          await user.clear(screen.getByLabelText('Start measure'));
          await user.type(screen.getByLabelText('Start measure'), String(section.start));
          await user.clear(screen.getByLabelText('End measure'));
          await user.type(screen.getByLabelText('End measure'), String(section.end));
          
          // Practice section 5 times
          for (let rep = 0; rep < 5; rep++) {
            // Simulate practice...
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Increase tempo gradually
          fireEvent.change(tempoSlider, { 
            target: { value: section.tempo + 10 } 
          });
        }
        
        // Full run-through
        await user.click(screen.getByRole('button', { name: /disable range/i }));
        
        // Verify ready for full performance
        expect(screen.getByLabelText('Tempo')).toHaveValue(120); // Performance tempo
      }).toThrow('End-to-End: Performance preparation workflow not supported');
    });
  });

  describe('Complete Feature Verification', () => {
    test('should demonstrate entire feature working end-to-end', async () => {
      expect(async () => {
        const { App } = require('@/renderer/App');
        const user = userEvent.setup();
        
        render(<App />);
        
        // Complete workflow verification
        
        // 1. File loading works
        await user.upload(
          screen.getByLabelText('Load MusicXML file'),
          new File(['<musicxml>...</musicxml>'], 'complete-test.xml')
        );
        expect(screen.getByTestId('sheet-music-display')).toBeInTheDocument();
        
        // 2. Practice mode integration works
        await user.click(screen.getByRole('button', { name: /start practice/i }));
        expect(screen.getByText('Practice Range:')).toBeInTheDocument();
        
        // 3. State management works (Phase 1)
        await user.type(screen.getByLabelText('Start measure'), '10');
        await user.type(screen.getByLabelText('End measure'), '15');
        
        // 4. UI updates work (Phase 1)
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        expect(screen.getByRole('button', { name: /disable range/i })).toBeInTheDocument();
        
        // 5. Practice flow works (Phase 2)
        const cursor = screen.getByTestId('practice-cursor');
        expect(cursor).toHaveAttribute('data-measure', '10');
        
        // 6. Loop detection works (Phase 2)
        // Simulate playing to end
        for (let i = 0; i < 6; i++) {
          act(() => {
            const handler = mockElectronAPI.on.mock.calls
              .find(call => call[0] === 'midi:event')?.[1];
            handler?.({ note: 60, velocity: 100, type: 'noteOn' });
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Should loop back
        await waitFor(() => {
          expect(cursor).toHaveAttribute('data-measure', '10');
        });
        
        // 7. App integration works (Phase 3)
        expect(screen.getByText('Practice Range:').parentElement).toHaveClass('top-controls-item');
        
        // 8. Keyboard shortcuts work (Phase 3)
        await user.keyboard('{Control>}r{/Control}');
        expect(screen.getByRole('button', { name: /enable range/i })).toBeInTheDocument();
        
        // 9. Accessibility works (Phase 3)
        const startInput = screen.getByLabelText('Start measure');
        expect(startInput).toHaveAttribute('aria-describedby');
        
        // 10. Performance maintained
        const startTime = performance.now();
        await user.click(screen.getByRole('button', { name: /enable range/i }));
        expect(performance.now() - startTime).toBeLessThan(50);
        
        // FEATURE COMPLETE!
      }).toThrow('End-to-End: Complete feature not implemented');
    });
  });
});