// Basic integration test for AppLayout
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { AppLayout } from '../../src/renderer/components/Layout/AppLayout';

describe('AppLayout Basic Integration', () => {
  test('renders children correctly', () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="test-child">Test Content</div>
      </AppLayout>
    );

    // Check child is rendered
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Check layout structure exists
    const layoutRoot = container.querySelector('.app-layout-root');
    const layoutContent = container.querySelector('.app-layout-content');
    
    expect(layoutRoot).toBeInTheDocument();
    expect(layoutContent).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const layoutRoot = container.querySelector('.app-layout-root');
    const layoutContent = container.querySelector('.app-layout-content');

    expect(layoutRoot).toHaveClass('app-layout-root');
    expect(layoutContent).toHaveClass('app-layout-content');
  });

  test('maintains viewport height', () => {
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    const layoutRoot = container.querySelector('.app-layout-root');
    const styles = window.getComputedStyle(layoutRoot!);
    
    // Check flexbox properties
    expect(styles.display).toBe('flex');
    expect(styles.flexDirection).toBe('column');
    expect(styles.overflow).toBe('hidden');
  });
});