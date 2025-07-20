// Simple test for AppLayout without custom matchers
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppLayout } from '../../src/renderer/components/Layout/AppLayout';

describe('AppLayout Simple Test', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="test-child">Test Content</div>
      </AppLayout>
    );

    // Basic checks using standard matchers
    const testChild = screen.getByTestId('test-child');
    expect(testChild).toBeTruthy();
    expect(testChild.textContent).toBe('Test Content');

    // Check layout structure exists
    const layoutRoot = container.querySelector('.app-layout-root');
    const layoutContent = container.querySelector('.app-layout-content');
    
    expect(layoutRoot).toBeTruthy();
    expect(layoutContent).toBeTruthy();
    
    // Check class names
    expect(layoutRoot?.className).toBe('app-layout-root');
    expect(layoutContent?.className).toBe('app-layout-content');
  });

  test('renders multiple children', () => {
    render(
      <AppLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AppLayout>
    );

    const child1 = screen.getByTestId('child-1');
    const child2 = screen.getByTestId('child-2');
    
    expect(child1).toBeTruthy();
    expect(child2).toBeTruthy();
    expect(child1.textContent).toBe('Child 1');
    expect(child2.textContent).toBe('Child 2');
  });
});