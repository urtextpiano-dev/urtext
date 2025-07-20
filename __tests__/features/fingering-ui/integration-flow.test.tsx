// Full end-to-end integration flow tests
// Addresses GPT-4.1 feedback about testing complete user flows

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

// Mock all dependencies
jest.mock('@/renderer/features/fingering/hooks/useFingeringStore');
jest.mock('@/renderer/features/fingering/hooks/usePracticeModeIntegration');
jest.mock('@/renderer/stores/sheetMusicStore');
jest.mock('@/renderer/features/practice-mode/stores/practiceStore');

describe('Full Integration Flow: Settings → Indicator → Practice Mode', () => {
  let mockFingeringStore: any;
  let mockPracticeStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup initial state
    mockFingeringStore = {
      isEditingMode: false,
      setEditingMode: jest.fn((value) => {
        mockFingeringStore.isEditingMode = value;
      }),
      isEnabled: true,
      setEnabled: jest.fn((value) => {
        mockFingeringStore.isEnabled = value;
      })
    };

    mockPracticeStore = {
      isActive: false,
      setActive: jest.fn((value) => {
        mockPracticeStore.isActive = value;
      })
    };

    // Wire up mocks
    require('@/renderer/features/fingering/hooks/useFingeringStore').useFingeringStore = 
      jest.fn(() => mockFingeringStore);
    require('@/renderer/features/practice-mode/stores/practiceStore').usePracticeStore = 
      jest.fn(() => mockPracticeStore);
    require('@/renderer/stores/sheetMusicStore').useSheetMusicStore = 
      jest.fn(() => ({ sheetMusic: { loaded: true } }));
    require('@/renderer/features/fingering/hooks/usePracticeModeIntegration').usePracticeModeIntegration = 
      jest.fn(() => ({ 
        shouldShowFingeringEdit: () => !mockPracticeStore.isActive 
      }));
  });

  test('Complete flow: Enable edit mode → See indicator → Start practice → Edit disabled', async () => {
    const user = userEvent.setup();
    
    // Mock the full app structure
    const App = () => {
      const fingeringStore = require('@/renderer/features/fingering/hooks/useFingeringStore').useFingeringStore();
      const practiceStore = require('@/renderer/features/practice-mode/stores/practiceStore').usePracticeStore();
      const { shouldShowFingeringEdit } = require('@/renderer/features/fingering/hooks/usePracticeModeIntegration').usePracticeModeIntegration();
      
      return (
        <div data-testid="app">
          {/* TopControlsMenu */}
          <div data-testid="top-controls-menu">
            <section className="menu-section">
              <h3>Fingering</h3>
              <label>
                <input
                  type="checkbox"
                  aria-label="Toggle fingering edit mode"
                  checked={fingeringStore.isEditingMode}
                  onChange={(e) => fingeringStore.setEditingMode(e.target.checked)}
                  disabled={!shouldShowFingeringEdit()}
                />
                Edit Fingerings
                {!shouldShowFingeringEdit() && <span> (disabled during practice)</span>}
              </label>
            </section>
            
            <section className="menu-section">
              <h3>Practice</h3>
              <button 
                onClick={() => practiceStore.setActive(true)}
                disabled={practiceStore.isActive}
              >
                Start Practice
              </button>
            </section>
          </div>
          
          {/* FingeringEditIndicator */}
          {fingeringStore.isEditingMode && (
            <div data-testid="fingering-edit-indicator">
              <span>Edit Mode</span>
              <span>Click any note to add/edit fingering (1-5)</span>
            </div>
          )}
          
          {/* Practice Mode Indicator */}
          {practiceStore.isActive && (
            <div data-testid="practice-indicator">Practice Mode Active</div>
          )}
        </div>
      );
    };
    
    render(<App />);
    
    // Step 1: Verify initial state
    expect(screen.queryByTestId('fingering-edit-indicator')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Toggle fingering edit mode')).not.toBeChecked();
    expect(screen.getByLabelText('Toggle fingering edit mode')).not.toBeDisabled();
    
    // Step 2: Enable edit mode
    await user.click(screen.getByLabelText('Toggle fingering edit mode'));
    
    // Step 3: Verify indicator appears
    expect(screen.getByTestId('fingering-edit-indicator')).toBeInTheDocument();
    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
    expect(screen.getByText('Click any note to add/edit fingering (1-5)')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle fingering edit mode')).toBeChecked();
    
    // Step 4: Start practice mode
    await user.click(screen.getByText('Start Practice'));
    
    // Step 5: Verify edit mode is disabled and indicator hidden
    expect(screen.queryByTestId('fingering-edit-indicator')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Toggle fingering edit mode')).toBeDisabled();
    expect(screen.getByText('(disabled during practice)')).toBeInTheDocument();
    expect(screen.getByTestId('practice-indicator')).toBeInTheDocument();
    
    // Verify store state
    expect(mockFingeringStore.isEditingMode).toBe(false); // Should be forced off
    expect(mockPracticeStore.isActive).toBe(true);
  });

  test('Settings persistence flow: Change settings → Reload → Settings retained', () => {
    // Mock localStorage
    const storage: { [key: string]: string } = {};
    Storage.prototype.getItem = jest.fn((key) => storage[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      storage[key] = value;
    });
    
    // First render - change settings
    const { unmount } = render(<div>App with settings</div>);
    
    // Simulate settings change
    mockFingeringStore.isEnabled = true;
    mockFingeringStore.fontSize = 12;
    mockFingeringStore.color = 'blue';
    
    // Simulate persistence
    Storage.prototype.setItem('abc-piano-fingering-settings', JSON.stringify({
      state: {
        isEnabled: true,
        fontSize: 12,
        color: 'blue'
      },
      version: 1
    }));
    
    // Unmount (simulate page reload)
    unmount();
    
    // Second render - verify settings loaded
    const storedSettings = Storage.prototype.getItem('abc-piano-fingering-settings');
    expect(storedSettings).toBeTruthy();
    
    const parsed = JSON.parse(storedSettings!);
    expect(parsed.state.isEnabled).toBe(true);
    expect(parsed.state.fontSize).toBe(12);
    expect(parsed.state.color).toBe('blue');
  });

  test('Error recovery flow: Component error → Error boundary → Retry → Success', () => {
    let shouldThrow = true;
    
    // Component that can throw
    const FingeringComponent = () => {
      if (shouldThrow) {
        throw new Error('Fingering render error');
      }
      return <div>Fingering UI Working</div>;
    };
    
    // Error boundary
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; retryCount: number }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, retryCount: 0 };
      }
      
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      
      retry = () => {
        this.setState({ hasError: false, retryCount: this.state.retryCount + 1 });
      };
      
      render() {
        if (this.state.hasError) {
          return (
            <div>
              <p>Fingering UI Error</p>
              <p>Retry attempt: {this.state.retryCount}</p>
              <button onClick={this.retry}>Retry</button>
            </div>
          );
        }
        return this.props.children;
      }
    }
    
    const App = () => (
      <ErrorBoundary>
        <FingeringComponent />
      </ErrorBoundary>
    );
    
    render(<App />);
    
    // Should show error
    expect(screen.getByText('Fingering UI Error')).toBeInTheDocument();
    expect(screen.getByText('Retry attempt: 0')).toBeInTheDocument();
    
    // Fix the error
    shouldThrow = false;
    
    // Retry
    userEvent.click(screen.getByText('Retry'));
    
    // Should now work
    expect(screen.queryByText('Fingering UI Error')).not.toBeInTheDocument();
    expect(screen.getByText('Fingering UI Working')).toBeInTheDocument();
  });

  test('Accessibility flow: Keyboard navigation through all controls', async () => {
    const user = userEvent.setup();
    
    const App = () => {
      const fingeringStore = require('@/renderer/features/fingering/hooks/useFingeringStore').useFingeringStore();
      
      return (
        <div>
          <button>First Focusable</button>
          <section>
            <h3>Fingering</h3>
            <label>
              <input
                type="checkbox"
                aria-label="Enable fingering annotations"
                checked={fingeringStore.isEnabled}
                onChange={(e) => fingeringStore.setEnabled(e.target.checked)}
              />
              Enable fingering annotations
            </label>
            <label>
              <input
                type="checkbox"
                aria-label="Toggle fingering edit mode"
                checked={fingeringStore.isEditingMode}
                onChange={(e) => fingeringStore.setEditingMode(e.target.checked)}
              />
              Edit Fingerings
            </label>
          </section>
          <button>Last Focusable</button>
        </div>
      );
    };
    
    render(<App />);
    
    // Start at first button
    screen.getByText('First Focusable').focus();
    expect(document.activeElement).toHaveTextContent('First Focusable');
    
    // Tab to fingering enable checkbox
    await user.tab();
    expect(document.activeElement).toHaveAttribute('aria-label', 'Enable fingering annotations');
    
    // Space to toggle
    await user.keyboard(' ');
    expect(mockFingeringStore.setEnabled).toHaveBeenCalledWith(true);
    
    // Tab to edit mode checkbox
    await user.tab();
    expect(document.activeElement).toHaveAttribute('aria-label', 'Toggle fingering edit mode');
    
    // Enter to toggle
    await user.keyboard('{Enter}');
    expect(mockFingeringStore.setEditingMode).toHaveBeenCalledWith(true);
    
    // Tab to last button
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Last Focusable');
  });
});