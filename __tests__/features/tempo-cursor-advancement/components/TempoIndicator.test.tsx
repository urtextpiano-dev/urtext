// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail (TempoIndicator doesn't exist)
// 2. GREEN: Implement TempoIndicator component to make tests pass
// 3. REFACTOR: Improve styling and accessibility while keeping tests green

import { describe, test, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// This import will fail initially, driving TDD implementation
import { TempoIndicator } from '@/renderer/features/practice-mode/components/TempoIndicator';

describe('TempoIndicator - Tempo Display Component', () => {
  beforeEach(() => {
    // Clean up any existing styles/DOM state
    document.head.innerHTML = '';
  });

  describe('Basic Rendering', () => {
    test('should render tempo indicator with BPM display', () => {
      // Drive basic component rendering
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      expect(screen.getByText('♩ = 120')).toBeInTheDocument();
    });

    test('should display different BPM values correctly', () => {
      // Drive dynamic BPM rendering
      const testBpmValues = [60, 90, 120, 140, 180, 200];
      
      testBpmValues.forEach(bpm => {
        const { rerender } = render(
          <TempoIndicator currentBpm={bpm} isOverridden={false} />
        );
        
        expect(screen.getByText(`♩ = ${bpm}`)).toBeInTheDocument();
        
        rerender(<div />); // Clean up for next iteration
      });
    });

    test('should use musical note symbol (♩) for quarter note', () => {
      // Drive musical notation usage
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      const tempoText = screen.getByText('♩ = 120');
      expect(tempoText).toBeInTheDocument();
      expect(tempoText.textContent).toContain('♩'); // Musical quarter note symbol
    });

    test('should render with required tempo-indicator class', () => {
      // Drive CSS class structure
      const { container } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const indicator = container.querySelector('.tempo-indicator');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Override Status Display', () => {
    test('should show manual override status when isOverridden is true', () => {
      // Drive override status display
      render(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      expect(screen.getByText('♩ = 100')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    test('should not show manual status when isOverridden is false', () => {
      // Drive conditional rendering
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      expect(screen.getByText('♩ = 120')).toBeInTheDocument();
      expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    });

    test('should apply tempo-override class when overridden', () => {
      // Drive conditional CSS classes
      render(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      const tempoSpan = screen.getByText('♩ = 100');
      expect(tempoSpan).toHaveClass('tempo-override');
      expect(tempoSpan).not.toHaveClass('tempo-auto');
    });

    test('should apply tempo-auto class when not overridden', () => {
      // Drive automatic tempo styling
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      const tempoSpan = screen.getByText('♩ = 120');
      expect(tempoSpan).toHaveClass('tempo-auto');
      expect(tempoSpan).not.toHaveClass('tempo-override');
    });

    test('should handle override status changes dynamically', () => {
      // Drive dynamic class updates
      const { rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      let tempoSpan = screen.getByText('♩ = 120');
      expect(tempoSpan).toHaveClass('tempo-auto');
      expect(screen.queryByText('Manual')).not.toBeInTheDocument();
      
      // Change to override mode
      rerender(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      tempoSpan = screen.getByText('♩ = 100');
      expect(tempoSpan).toHaveClass('tempo-override');
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });
  });

  describe('Layout Stability', () => {
    test('should render without layout shift when BPM changes', () => {
      // Drive stable layout requirement from plan
      const { container, rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const initialHeight = container.firstElementChild?.clientHeight;
      const initialWidth = container.firstElementChild?.clientWidth;
      
      // Change BPM to different length number
      rerender(<TempoIndicator currentBpm={60} isOverridden={false} />);
      
      const newHeight = container.firstElementChild?.clientHeight;
      const newWidth = container.firstElementChild?.clientWidth;
      
      // Layout should remain stable
      expect(newHeight).toBe(initialHeight);
      // Width might change slightly but should be reasonable
      if (initialWidth && newWidth) {
        expect(Math.abs(newWidth - initialWidth)).toBeLessThan(50); // <50px change
      }
    });

    test('should render without layout shift when override status changes', () => {
      // Drive override mode layout stability
      const { container, rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const initialHeight = container.firstElementChild?.clientHeight;
      
      // Change to override mode
      rerender(<TempoIndicator currentBpm={120} isOverridden={true} />);
      
      const newHeight = container.firstElementChild?.clientHeight;
      
      // Height should remain stable when adding "Manual" text
      expect(newHeight).toBe(initialHeight);
    });

    test('should handle very large BPM numbers without overflow', () => {
      // Drive large number handling
      render(<TempoIndicator currentBpm={9999} isOverridden={false} />);
      
      const tempoText = screen.getByText('♩ = 9999');
      expect(tempoText).toBeInTheDocument();
      
      // Should not cause visual overflow
      const rect = tempoText.getBoundingClientRect();
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    });

    test('should handle very small BPM numbers consistently', () => {
      // Drive small number handling
      render(<TempoIndicator currentBpm={1} isOverridden={false} />);
      
      expect(screen.getByText('♩ = 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should provide accessible tempo information', () => {
      // Drive accessibility implementation
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      const indicator = screen.getByText('♩ = 120');
      
      // Should have accessible attributes or content
      expect(indicator).toBeInTheDocument();
      expect(indicator.textContent).toContain('120');
    });

    test('should be readable by screen readers', () => {
      // Drive screen reader compatibility
      render(<TempoIndicator currentBpm={120} isOverridden={true} />);
      
      // Manual override should be clearly indicated
      expect(screen.getByText('Manual')).toBeInTheDocument();
      
      // The musical note symbol and BPM should be readable
      const tempoDisplay = screen.getByText('♩ = 120');
      expect(tempoDisplay).toBeInTheDocument();
    });

    test('should provide context for manual override', () => {
      // Drive clear override indication
      render(<TempoIndicator currentBpm={85} isOverridden={true} />);
      
      const manualText = screen.getByText('Manual');
      expect(manualText).toBeInTheDocument();
      
      // Should be associated with the tempo display
      expect(screen.getByText('♩ = 85')).toBeInTheDocument();
    });

    test('should handle focus if interactive elements are added', () => {
      // Drive future extensibility for interactive features
      const { container } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      // Component should not trap focus unintentionally
      const focusableElements = container.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      // Basic indicator should not have focusable elements
      expect(focusableElements.length).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    test('should render quickly for real-time tempo updates', () => {
      // Drive render performance for real-time updates
      const startTime = performance.now();
      
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(10); // <10ms for basic component
    });

    test('should handle rapid BPM changes efficiently', () => {
      // Drive performance under rapid updates
      const { rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const startTime = performance.now();
      
      // Simulate rapid tempo changes
      for (let bpm = 120; bpm <= 180; bpm += 5) {
        rerender(<TempoIndicator currentBpm={bpm} isOverridden={false} />);
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // <50ms for 13 rapid updates
    });

    test('should not leak memory during frequent updates', () => {
      // Drive memory efficiency
      if (global.performance?.memory) {
        const beforeMemory = global.performance.memory.usedJSHeapSize;
        
        const { rerender } = render(
          <TempoIndicator currentBpm={120} isOverridden={false} />
        );
        
        // Perform many re-renders
        for (let i = 0; i < 100; i++) {
          rerender(
            <TempoIndicator 
              currentBpm={120 + (i % 60)} 
              isOverridden={i % 2 === 0} 
            />
          );
        }
        
        if (global.gc) global.gc(); // Force GC if available
        
        const afterMemory = global.performance.memory.usedJSHeapSize;
        const memoryIncrease = afterMemory - beforeMemory;
        
        expect(memoryIncrease).toBeLessThan(1024 * 100); // <100KB
      }
    });
  });

  describe('Integration with Tempo System', () => {
    test('should display tempo from TempoService correctly', () => {
      // Drive integration with tempo calculation system
      const bpmValues = [60, 90, 120, 140, 180]; // Common musical tempos
      
      bpmValues.forEach(bpm => {
        render(<TempoIndicator currentBpm={bpm} isOverridden={false} />);
        
        expect(screen.getByText(`♩ = ${bpm}`)).toBeInTheDocument();
        expect(screen.getByText(`♩ = ${bpm}`)).toHaveClass('tempo-auto');
      });
    });

    test('should handle manual tempo override display', () => {
      // Drive manual override integration
      render(<TempoIndicator currentBpm={100} isOverridden={true} />);
      
      const tempoDisplay = screen.getByText('♩ = 100');
      expect(tempoDisplay).toHaveClass('tempo-override');
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    test('should support practice mode tempo adjustments', () => {
      // Drive practice mode integration
      const { rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      // Simulate practice tempo adjustment (slower practice)
      rerender(<TempoIndicator currentBpm={90} isOverridden={true} />);
      
      expect(screen.getByText('♩ = 90')).toBeInTheDocument();
      expect(screen.getByText('♩ = 90')).toHaveClass('tempo-override');
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    test('should handle extreme tempo values gracefully', () => {
      // Drive edge case handling
      const extremeValues = [1, 30, 200, 300, 999];
      
      extremeValues.forEach(bpm => {
        render(<TempoIndicator currentBpm={bpm} isOverridden={false} />);
        
        expect(screen.getByText(`♩ = ${bpm}`)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid BPM values gracefully', () => {
      // Drive input validation and error handling
      const invalidValues = [NaN, 0, -1, Infinity, -Infinity];
      
      invalidValues.forEach(bpm => {
        expect(() => {
          render(<TempoIndicator currentBpm={bpm} isOverridden={false} />);
        }).not.toThrow();
        
        // Should display something reasonable or handle gracefully
        const container = document.body;
        expect(container).toBeInTheDocument();
      });
    });

    test('should handle missing props gracefully', () => {
      // Drive prop validation
      expect(() => {
        render(<TempoIndicator currentBpm={120} isOverridden={undefined as any} />);
      }).not.toThrow();
      
      expect(() => {
        render(<TempoIndicator currentBpm={undefined as any} isOverridden={false} />);
      }).not.toThrow();
    });

    test('should handle very frequent prop changes', () => {
      // Drive prop change handling
      const { rerender } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      // Rapid prop changes
      for (let i = 0; i < 50; i++) {
        rerender(
          <TempoIndicator 
            currentBpm={120 + i} 
            isOverridden={i % 3 === 0} 
          />
        );
      }
      
      // Should still be functional
      expect(screen.getByText(/♩ = \d+/)).toBeInTheDocument();
    });

    test('should handle CSS class conflicts gracefully', () => {
      // Drive CSS robustness
      const { container } = render(
        <TempoIndicator currentBpm={120} isOverridden={true} />
      );
      
      // Add conflicting classes to test robustness
      const indicator = container.querySelector('.tempo-indicator');
      if (indicator) {
        indicator.classList.add('conflicting-class');
      }
      
      // Should still render correctly
      expect(screen.getByText('♩ = 120')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });
  });

  describe('Future Extensibility', () => {
    test('should support additional tempo display modes', () => {
      // Drive extensibility for future features
      render(<TempoIndicator currentBpm={120} isOverridden={false} />);
      
      // Component should be structured to allow easy extension
      const tempoDisplay = screen.getByText('♩ = 120');
      expect(tempoDisplay).toBeInTheDocument();
      
      // Should be easy to add additional information in future
      expect(tempoDisplay.parentElement).toBeInTheDocument();
    });

    test('should maintain structure for potential click interactions', () => {
      // Drive future interactivity support
      const { container } = render(
        <TempoIndicator currentBpm={120} isOverridden={false} />
      );
      
      const indicator = container.querySelector('.tempo-indicator');
      expect(indicator).toBeInTheDocument();
      
      // Should be structured to easily add click handlers
      expect(indicator?.tagName).toBeDefined();
    });

    test('should support theming through CSS classes', () => {
      // Drive theme support
      render(<TempoIndicator currentBpm={120} isOverridden={true} />);
      
      const autoSpan = screen.getByText('♩ = 120');
      expect(autoSpan).toHaveClass('tempo-override');
      
      // Class structure should support theme variations
      expect(autoSpan.className).toContain('tempo-');
    });
  });
});