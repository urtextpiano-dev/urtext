// Simple Phase 2 layout test
import { describe, test, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import React from 'react';
import { AppLayout } from '../../src/renderer/components/Layout/AppLayout';

describe('Phase 2 Layout - Simple Tests', () => {
  test('AppLayout creates proper flexbox structure', () => {
    const { container } = render(
      <AppLayout>
        <div style={{ height: '2000px' }}>Tall content</div>
      </AppLayout>
    );

    const layoutRoot = container.querySelector('.app-layout-root');
    const layoutContent = container.querySelector('.app-layout-content');
    
    // Verify structure exists
    expect(layoutRoot).toBeTruthy();
    expect(layoutContent).toBeTruthy();
    
    // Verify CSS classes
    expect(layoutRoot?.className).toBe('app-layout-root');
    expect(layoutContent?.className).toBe('app-layout-content');
    
    // Check computed styles
    const rootStyles = window.getComputedStyle(layoutRoot!);
    expect(rootStyles.display).toBe('flex');
    expect(rootStyles.flexDirection).toBe('column');
    expect(rootStyles.overflow).toBe('hidden');
    
    const contentStyles = window.getComputedStyle(layoutContent!);
    expect(contentStyles.flex).toBe('1');
    expect(contentStyles.minHeight).toBe('0'); // Critical for flexbox
  });

  test('body styles are properly set', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );
    
    const bodyStyles = window.getComputedStyle(document.body);
    expect(bodyStyles.margin).toBe('0px');
    expect(bodyStyles.padding).toBe('0px');
    expect(bodyStyles.overflow).toBe('hidden');
  });
});