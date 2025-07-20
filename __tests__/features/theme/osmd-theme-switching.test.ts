import { renderHook, act } from '@testing-library/react';
import { applyThemeToOSMD } from '@/renderer/features/theme/lib/osmd-theme-integration';

describe('OSMD Theme Switching', () => {
  // Mock OSMD instance
  const createMockOSMD = () => ({
    cursor: {
      iterator: {
        CurrentMeasureIndex: 5,
      },
      cursorElement: {
        style: {
          display: 'block',
        },
      },
      show: jest.fn(),
      hide: jest.fn(),
      reset: jest.fn(),
      next: jest.fn(),
    },
    setOptions: jest.fn(),
    render: jest.fn(),
    GraphicSheet: {},
  });

  beforeAll(() => {
    // Mock CSS variables
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        getPropertyValue: (prop: string) => {
          switch (prop) {
            case '--abc-sheet-bg': return '#ffffff';
            case '--abc-sheet-ink': return '#000000';
            default: return '';
          }
        },
      }),
    });
  });

  test('applyThemeToOSMD preserves cursor position', async () => {
    const mockOSMD = createMockOSMD();
    
    await applyThemeToOSMD(mockOSMD as any);
    
    // Verify theme was applied
    expect(mockOSMD.setOptions).toHaveBeenCalledWith({
      pageBackgroundColor: '#ffffff',
      defaultColorMusic: '#000000',
    });
    expect(mockOSMD.render).toHaveBeenCalled();
    
    // Verify cursor was restored with force recreation
    expect(mockOSMD.cursor.hide).toHaveBeenCalled();
    expect(mockOSMD.cursor.show).toHaveBeenCalled();
    expect(mockOSMD.cursor.reset).toHaveBeenCalled();
    expect(mockOSMD.cursor.next).toHaveBeenCalledTimes(5); // Current measure index was 5
  });

  test('applyThemeToOSMD handles hidden cursor', async () => {
    const mockOSMD = createMockOSMD();
    mockOSMD.cursor.cursorElement.style.display = 'none';
    
    await applyThemeToOSMD(mockOSMD as any);
    
    // Verify theme was applied
    expect(mockOSMD.render).toHaveBeenCalled();
    
    // Verify cursor was NOT restored (it was hidden)
    expect(mockOSMD.cursor.hide).not.toHaveBeenCalled();
    expect(mockOSMD.cursor.show).not.toHaveBeenCalled();
  });

  test('applyThemeToOSMD handles missing cursor gracefully', async () => {
    const mockOSMD = createMockOSMD();
    mockOSMD.cursor = null as any;
    
    await applyThemeToOSMD(mockOSMD as any);
    
    // Should complete without errors
    expect(mockOSMD.render).toHaveBeenCalled();
  });
});