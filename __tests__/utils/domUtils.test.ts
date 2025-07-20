/**
 * Tests for domUtils - Cross-platform DOM manipulation utilities
 * Ensures proper handling of HTML and SVG elements
 */

import { elementHasClass, getElementClasses, isSVGElement, debugElement } from '@/renderer/utils/domUtils';

// Mock console methods for testing
const originalConsole = console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    log: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

describe('elementHasClass', () => {
  describe('HTML Elements', () => {
    test('should return true for existing class', () => {
      const div = document.createElement('div');
      div.className = 'cursor test-class';
      
      expect(elementHasClass(div, 'cursor')).toBe(true);
      expect(elementHasClass(div, 'test-class')).toBe(true);
    });

    test('should return false for non-existing class', () => {
      const div = document.createElement('div');
      div.className = 'other-class';
      
      expect(elementHasClass(div, 'cursor')).toBe(false);
    });

    test('should handle empty className', () => {
      const div = document.createElement('div');
      div.className = '';
      
      expect(elementHasClass(div, 'cursor')).toBe(false);
    });

    test('should handle element without className', () => {
      const div = document.createElement('div');
      // Remove className property to simulate edge case
      delete (div as any).className;
      
      expect(elementHasClass(div, 'cursor')).toBe(false);
    });
  });

  describe('SVG Elements', () => {
    test('should handle SVG elements with classList', () => {
      // Create SVG element with proper namespace
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      // Add class using classList (modern browsers)
      path.classList.add('cursor', 'vf-cursor');
      
      expect(elementHasClass(path, 'cursor')).toBe(true);
      expect(elementHasClass(path, 'vf-cursor')).toBe(true);
      expect(elementHasClass(path, 'nonexistent')).toBe(false);
    });

    test('should handle SVGAnimatedString className fallback', () => {
      const mockSVGElement = {
        tagName: 'path',
        classList: null, // Simulate no classList support
        className: {
          baseVal: 'cursor vf-cursor',
          animVal: 'cursor vf-cursor'
        },
        getAttribute: jest.fn().mockReturnValue(null)
      } as unknown as Element;

      expect(elementHasClass(mockSVGElement, 'cursor')).toBe(true);
      expect(elementHasClass(mockSVGElement, 'vf-cursor')).toBe(true);
      expect(elementHasClass(mockSVGElement, 'nonexistent')).toBe(false);
    });

    test('should handle malformed SVGAnimatedString', () => {
      const mockSVGElement = {
        tagName: 'path',
        classList: null,
        className: {
          baseVal: null // Malformed
        },
        getAttribute: jest.fn().mockReturnValue(null)
      } as unknown as Element;

      expect(elementHasClass(mockSVGElement, 'cursor')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null className gracefully', () => {
      const mockElement = {
        tagName: 'div',
        classList: null,
        className: null,
        getAttribute: jest.fn().mockReturnValue(null)
      } as unknown as Element;

      expect(elementHasClass(mockElement, 'cursor')).toBe(false);
    });

    test('should handle classList throwing error', () => {
      const mockElement = {
        get classList() {
          throw new Error('classList access failed');
        },
        className: 'cursor test',
        getAttribute: jest.fn().mockReturnValue(null)
      } as unknown as Element;

      // Should fall back to string check
      expect(elementHasClass(mockElement, 'cursor')).toBe(true);
      
      // Should log warning in development
      process.env.NODE_ENV = 'development';
      elementHasClass(mockElement, 'test');
      expect(console.warn).toHaveBeenCalledWith(
        'elementHasClass: classList access failed',
        expect.any(Error)
      );
    });

    test('should handle complete failure gracefully', () => {
      const mockElement = {
        get classList() {
          throw new Error('classList error');
        },
        get className() {
          throw new Error('className error');
        }
      } as unknown as Element;

      expect(elementHasClass(mockElement, 'cursor')).toBe(false);
    });
  });
});

describe('getElementClasses', () => {
  test('should return classList as string for HTML elements', () => {
    const div = document.createElement('div');
    div.classList.add('cursor', 'test-class');
    
    expect(getElementClasses(div)).toBe('cursor test-class');
  });

  test('should return empty string for element without classes', () => {
    const div = document.createElement('div');
    
    expect(getElementClasses(div)).toBe('');
  });

  test('should handle SVG elements', () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('cursor');
    
    expect(getElementClasses(path)).toBe('cursor');
  });

  test('should handle SVGAnimatedString fallback', () => {
    const mockSVGElement = {
      classList: null,
      className: {
        baseVal: 'cursor vf-cursor'
      }
    } as unknown as Element;

    expect(getElementClasses(mockSVGElement)).toBe('cursor vf-cursor');
  });
});

describe('isSVGElement', () => {
  test('should identify SVG elements correctly', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const div = document.createElement('div');

    expect(isSVGElement(svg)).toBe(true);
    expect(isSVGElement(path)).toBe(true);
    expect(isSVGElement(div)).toBe(false);
  });
});

describe('debugElement', () => {
  test('should log element info in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const div = document.createElement('div');
    div.classList.add('cursor');
    div.setAttribute('data-test', 'value');

    debugElement(div, 'test context');

    expect(console.log).toHaveBeenCalledWith(
      '[DOM Debug - test context]',
      expect.objectContaining({
        tagName: 'DIV',
        isSVG: false,
        classes: 'cursor',
        attributes: expect.objectContaining({
          'data-test': 'value'
        })
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  test('should not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const div = document.createElement('div');
    debugElement(div);

    expect(console.log).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});

// Performance test for classList vs string methods
describe('Performance Characteristics', () => {
  test('classList.contains should be faster than string.includes', () => {
    const div = document.createElement('div');
    div.className = 'class1 class2 class3 class4 class5 cursor class7 class8 class9 class10';

    const iterations = 10000;
    
    // Test classList approach
    const classListStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      div.classList.contains('cursor');
    }
    const classListTime = performance.now() - classListStart;

    // Test string approach
    const stringStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      div.className.includes('cursor');
    }
    const stringTime = performance.now() - stringStart;

    // classList should be faster or comparable
    console.log('classList time:', classListTime, 'string time:', stringTime);
    expect(classListTime).toBeLessThanOrEqual(stringTime * 2); // Allow some variance
  });
});