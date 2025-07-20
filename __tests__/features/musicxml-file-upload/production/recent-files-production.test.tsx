/**
 * Version Recent Files & Production Features Tests
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * 
 * This file tests the Phase 3 features:
 * - FileUploadButton recent files dropdown
 * - RecentFilesService localStorage abstraction
 * - Performance monitoring (dev-only)
 * - Production safety and edge cases
 * 
 * AI Validation: ✅ Gemini, Code review:, Code review: approved approach
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

// Version GREEN phase implementations now available
import { FileUploadButton } from '@/renderer/components/FileUpload/FileUploadButton';
import { recentFilesService, type RecentFileMetadata } from '@/renderer/services/RecentFilesService';
import { usePerformanceMonitor } from '@/renderer/hooks/usePerformanceMonitor';
import { useSheetMusicStore } from '@/renderer/stores/sheetMusicStore';

// Mock the store
jest.mock('@/renderer/stores/sheetMusicStore');

describe('Version Recent Files & Production Features', () => {
  let mockLocalStorage: { [key: string]: string };
  
  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => mockLocalStorage[key] || null),
        setItem: jest.fn((key, value) => { mockLocalStorage[key] = value; }),
        removeItem: jest.fn((key) => { delete mockLocalStorage[key]; }),
        clear: jest.fn(() => { mockLocalStorage = {}; })
      },
      writable: true
    });
    
    jest.clearAllMocks();
  });

  describe('Task 3.1: RecentFilesService Abstraction', () => {
    test('should create RecentFilesService with localStorage abstraction', () => {
      expect(recentFilesService.get).toBeDefined();
      expect(recentFilesService.add).toBeDefined(); 
      expect(recentFilesService.clear).toBeDefined();
    });

    test('should return empty array when no recent files exist', () => {
      const files = recentFilesService.get();
      expect(files).toEqual([]);
    });

    test('should add recent file to top of list', () => {
      const fileData: RecentFileMetadata = {
        name: 'test.xml',
        size: 1024,
        lastOpened: new Date().toISOString()
      };
      
      recentFilesService.add(fileData);
      const files = recentFilesService.get();
      
      expect(files).toHaveLength(1);
      expect(files[0]).toEqual(fileData);
    });

    test('should move duplicate file to top of list', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const service = new RecentFilesService();
        
        service.add({ name: 'file1.xml', size: 1000, lastOpened: '2024-01-01' });
        service.add({ name: 'file2.xml', size: 2000, lastOpened: '2024-01-02' });
        service.add({ name: 'file1.xml', size: 1000, lastOpened: '2024-01-03' }); // Duplicate
        
        const files = service.get();
        expect(files).toHaveLength(2);
        expect(files[0].name).toBe('file1.xml');
        expect(files[0].lastOpened).toBe('2024-01-03');
      }).toThrow('Version Duplicate handling not implemented');
    });

    test('should enforce maximum of 5 recent files', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const service = new RecentFilesService();
        
        // Add 6 files
        for (let i = 1; i <= 6; i++) {
          service.add({
            name: `file${i}.xml`,
            size: 1000 * i,
            lastOpened: `2024-01-0${i}`
          });
        }
        
        const files = service.get();
        expect(files).toHaveLength(5);
        expect(files[0].name).toBe('file6.xml'); // Most recent at top
        expect(files[4].name).toBe('file2.xml'); // file1.xml should be dropped
      }).toThrow('Version Max files limit not implemented');
    });

    test('should handle localStorage errors gracefully', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        // Mock localStorage.getItem to throw
        window.localStorage.getItem = jest.fn(() => {
          throw new Error('localStorage error');
        });
        
        const service = new RecentFilesService();
        const files = service.get();
        
        expect(files).toEqual([]); // Should return empty array on error
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse recent files')
        );
      }).toThrow('Version localStorage error handling not implemented');
    });

    test('should handle corrupted localStorage data', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        mockLocalStorage['abc-piano-recent-files'] = '{invalid json}';
        
        const service = new RecentFilesService();
        const files = service.get();
        
        expect(files).toEqual([]);
        expect(console.error).toHaveBeenCalled();
      }).toThrow('Version Corrupted data handling not implemented');
    });

    test('should clear all recent files', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const service = new RecentFilesService();
        
        service.add({ name: 'test.xml', size: 1000, lastOpened: '2024-01-01' });
        expect(service.get()).toHaveLength(1);
        
        service.clear();
        expect(service.get()).toHaveLength(0);
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('abc-piano-recent-files');
      }).toThrow('Version Clear functionality not implemented');
    });
  });

  describe('Task 3.2: Store Integration', () => {
    const mockStoreState = {
      recentFiles: [],
      loadRecentFiles: jest.fn(),
      addRecentFile: jest.fn(),
      clearRecentFiles: jest.fn(),
      loadFromDialog: jest.fn()
    };

    beforeEach(() => {
      (useSheetMusicStore as unknown as jest.Mock).mockReturnValue(mockStoreState);
    });

    test('should add recent files methods to store', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const store = useSheetMusicStore();
        expect(store.loadRecentFiles).toBeDefined();
        expect(store.addRecentFile).toBeDefined();
        expect(store.clearRecentFiles).toBeDefined();
        expect(store.recentFiles).toBeDefined();
      }).toThrow('Version Store methods not implemented');
    });

    test('should load recent files from service on store initialization', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const store = useSheetMusicStore();
        store.loadRecentFiles();
        
        // Should call RecentFilesService.get()
        expect(store.recentFiles).toBeDefined();
      }).toThrow('Version loadRecentFiles not implemented');
    });

    test('should add recent file through store', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const store = useSheetMusicStore();
        const fileData = { name: 'test.xml', size: 1000, lastOpened: '2024-01-01' };
        
        store.addRecentFile(fileData);
        
        // Should call RecentFilesService.add() and update state
        expect(mockStoreState.addRecentFile).toHaveBeenCalledWith(fileData);
      }).toThrow('Version addRecentFile not implemented');
    });

    test('should clear recent files through store', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const store = useSheetMusicStore();
        
        store.clearRecentFiles();
        
        // Should call RecentFilesService.clear() and update state
        expect(mockStoreState.clearRecentFiles).toHaveBeenCalled();
      }).toThrow('Version clearRecentFiles not implemented');
    });
  });

  describe('Task 3.3: FileUploadButton Recent Files UI', () => {
    const mockRecentFiles = [
      { name: 'song1.xml', size: 1024, lastOpened: new Date().toISOString() },
      { name: 'song2.mxl', size: 2048, lastOpened: new Date(Date.now() - 86400000).toISOString() },
      { name: 'symphony.xml', size: 4096, lastOpened: new Date(Date.now() - 172800000).toISOString() }
    ];

    beforeEach(() => {
      (useSheetMusicStore as unknown as jest.Mock).mockReturnValue({
        ...mockStoreState,
        recentFiles: mockRecentFiles,
        loadState: 'idle',
        error: null
      });
    });

    test('should not show dropdown trigger when no recent files', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        (useSheetMusicStore as unknown as jest.Mock).mockReturnValue({
          ...mockStoreState,
          recentFiles: []
        });

        render(<FileUploadButton />);
        
        expect(screen.queryByRole('button', { name: /show recent files/i })).not.toBeInTheDocument();
      }).toThrow('Version FileUploadButton recent files UI not implemented');
    });

    test('should show dropdown trigger when recent files exist', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        expect(screen.getByRole('button', { name: /show recent files/i })).toBeInTheDocument();
      }).toThrow('Version Dropdown trigger not implemented');
    });

    test('should open dropdown on trigger click', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByRole('menu', { name: /recent files/i })).toBeInTheDocument();
        expect(screen.getByText('song1.xml')).toBeInTheDocument();
        expect(screen.getByText('song2.mxl')).toBeInTheDocument();
      }).rejects.toThrow('Version Dropdown open not implemented');
    });

    test('should format file sizes correctly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByText(/1\.0 KB/)).toBeInTheDocument();
        expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument(); 
        expect(screen.getByText(/4\.0 KB/)).toBeInTheDocument();
      }).rejects.toThrow('Version File size formatting not implemented');
    });

    test('should format relative dates correctly', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
        expect(screen.getByText('2 days ago')).toBeInTheDocument();
      }).rejects.toThrow('Version Date formatting not implemented');
    });

    test('should close dropdown on outside click', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(
          <div>
            <FileUploadButton />
            <button>Outside button</button>
          </div>
        );
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByRole('menu')).toBeInTheDocument();
        
        // Click outside
        await userEvent.click(screen.getByText('Outside button'));
        
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      }).rejects.toThrow('Version Outside click handling not implemented');
    });

    test('should close dropdown on escape key', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByRole('menu')).toBeInTheDocument();
        
        fireEvent.keyDown(document, { key: 'Escape' });
        
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      }).rejects.toThrow('Version Escape key handling not implemented');
    });

    test('should provide clear recent files option', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        const clearButton = screen.getByText('Clear Recent Files');
        await userEvent.click(clearButton);
        
        expect(mockStoreState.clearRecentFiles).toHaveBeenCalled();
      }).rejects.toThrow('Version Clear recent files option not implemented');
    });

    test('should limit recent files to 5 items in dropdown', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const manyFiles = Array.from({ length: 8 }, (_, i) => ({
          name: `file${i + 1}.xml`,
          size: 1000,
          lastOpened: new Date().toISOString()
        }));

        (useSheetMusicStore as unknown as jest.Mock).mockReturnValue({
          ...mockStoreState,
          recentFiles: manyFiles
        });

        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        // Should only show 5 files plus the clear button
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems).toHaveLength(6); // 5 files + 1 clear button
      }).rejects.toThrow('Version Dropdown item limit not implemented');
    });

    test('should have proper ARIA attributes for accessibility', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        
        await userEvent.click(trigger);
        
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        
        const menu = screen.getByRole('menu');
        expect(menu).toHaveAttribute('aria-label', 'Recent files');
      }).rejects.toThrow('Version ARIA attributes not implemented');
    });
  });

  describe('Task 3.4: Performance Monitoring', () => {
    test('should provide performance monitoring hook', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const monitor = usePerformanceMonitor();
        expect(monitor.trackFileLoadStart).toBeDefined();
        expect(monitor.trackFileLoadEnd).toBeDefined();
      }).toThrow('Version usePerformanceMonitor not implemented');
    });

    test('should track file load times in development', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const monitor = usePerformanceMonitor();
        const markSpy = jest.spyOn(performance, 'mark');
        const measureSpy = jest.spyOn(performance, 'measure');
        
        monitor.trackFileLoadStart('test.xml');
        monitor.trackFileLoadEnd('test.xml');
        
        expect(markSpy).toHaveBeenCalledWith('load-test.xml-start');
        expect(markSpy).toHaveBeenCalledWith('load-test.xml-end');
        expect(measureSpy).toHaveBeenCalledWith(
          'File Load: test.xml',
          'load-test.xml-start',
          'load-test.xml-end'
        );
        
        process.env.NODE_ENV = originalEnv;
      }).toThrow('Version Performance tracking not implemented');
    });

    test('should be no-op in production', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        const monitor = usePerformanceMonitor();
        const markSpy = jest.spyOn(performance, 'mark');
        
        monitor.trackFileLoadStart('test.xml');
        monitor.trackFileLoadEnd('test.xml');
        
        expect(markSpy).not.toHaveBeenCalled();
        
        process.env.NODE_ENV = originalEnv;
      }).toThrow('Version Production no-op not implemented');
    });

    test('should monitor memory usage if available', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        // Mock performance.memory
        Object.defineProperty(performance, 'memory', {
          value: { usedJSHeapSize: 50 * 1024 * 1024 }, // 50MB
          writable: true
        });
        
        const monitor = usePerformanceMonitor();
        expect(monitor.getMemoryUsage).toBeDefined();
        
        const memUsage = monitor.getMemoryUsage();
        expect(memUsage).toBeCloseTo(50, 1); // ~50MB
      }).toThrow('Version Memory monitoring not implemented');
    });
  });

  describe('Task 3.5: Production Safety & Edge Cases', () => {
    test('should handle rapid dropdown toggles without errors', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        
        // Rapid clicking
        for (let i = 0; i < 10; i++) {
          await userEvent.click(trigger);
        }
        
        // Should not throw errors or get stuck
        expect(screen.queryByRole('menu')).toBeInTheDocument();
      }).rejects.toThrow('Version Rapid toggle handling not implemented');
    });

    test('should handle window resize during dropdown open', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        expect(screen.getByRole('menu')).toBeInTheDocument();
        
        // Simulate window resize
        fireEvent.resize(window);
        
        // Dropdown should still be functional
        expect(screen.getByRole('menu')).toBeInTheDocument();
      }).rejects.toThrow('Version Window resize handling not implemented');
    });

    test('should sanitize file names in display', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const maliciousFiles = [
          { name: '<script>alert("xss")</script>.xml', size: 1000, lastOpened: '2024-01-01' },
          { name: 'normal.xml', size: 2000, lastOpened: '2024-01-02' }
        ];

        (useSheetMusicStore as unknown as jest.Mock).mockReturnValue({
          ...mockStoreState,
          recentFiles: maliciousFiles
        });

        render(<FileUploadButton />);
        
        const trigger = screen.getByRole('button', { name: /show recent files/i });
        await userEvent.click(trigger);
        
        // Should not execute script, should be escaped
        expect(screen.queryByText('<script>alert("xss")</script>.xml')).not.toBeInTheDocument();
        expect(screen.getByText(/script.*xml/)).toBeInTheDocument(); // Escaped version
      }).rejects.toThrow('Version File name sanitization not implemented');
    });

    test('should handle localStorage quota exceeded error', () => {
      expect(() => {
        // @ts-expect-error - Will be implemented
        window.localStorage.setItem = jest.fn(() => {
          throw new DOMException('QuotaExceededError');
        });
        
        const service = new RecentFilesService();
        
        // Should not crash when adding file exceeds quota
        expect(() => {
          service.add({ name: 'test.xml', size: 1000, lastOpened: '2024-01-01' });
        }).not.toThrow();
        
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('localStorage quota exceeded')
        );
      }).toThrow('Version Quota exceeded handling not implemented');
    });
  });

  describe('Task 3.6: Integration with Existing Features', () => {
    test('should automatically add files to recent list on successful upload', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const mockFileData = {
          fileName: 'uploaded.xml',
          content: '<?xml version="1.0"?><score-partwise>...</score-partwise>',
          fileSize: 2048
        };

        window.electronAPI = {
          openFile: jest.fn().mockResolvedValue(mockFileData)
        };

        render(<FileUploadButton />);
        
        const uploadButton = screen.getByRole('button', { name: /load music score/i });
        await userEvent.click(uploadButton);
        
        await waitFor(() => {
          expect(mockStoreState.addRecentFile).toHaveBeenCalledWith({
            name: 'uploaded.xml',
            size: 2048,
            lastOpened: expect.any(String)
          });
        });
      }).rejects.toThrow('Version Auto-add to recent not implemented');
    });

    test('should integrate with drag-drop functionality', async () => {
      expect(async () => {
        // @ts-expect-error - Will be implemented
        const file = new File(['<?xml?>'], 'dropped.xml', { type: 'text/xml' });
        
        // Mock the MusicXMLDropZone component integration
        const dropEvent = new DragEvent('drop', {
          dataTransfer: { files: [file] } as any
        });
        
        render(<FileUploadButton />);
        
        // Simulate successful drop processing
        fireEvent.drop(document, dropEvent);
        
        await waitFor(() => {
          expect(mockStoreState.addRecentFile).toHaveBeenCalledWith({
            name: 'dropped.xml',
            size: file.size,
            lastOpened: expect.any(String)
          });
        });
      }).rejects.toThrow('Version Drag-drop integration not implemented');
    });
  });
});