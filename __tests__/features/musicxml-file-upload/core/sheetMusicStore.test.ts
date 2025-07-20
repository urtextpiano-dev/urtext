// TDD Cycle Reminder:
// 1. RED: Run these tests - they should fail
// 2. GREEN: Write minimum code to make tests pass
// 3. REFACTOR: Improve code while keeping tests green

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// Import the actual implementation
import { useSheetMusicStore } from '../../../../src/renderer/stores/sheetMusicStore';

// Mock dependencies
jest.mock('../../../../src/renderer/services/FileLoaderService', () => ({
  getFileLoader: jest.fn(() => ({
    loadFile: jest.fn()
  }))
}));

// Expected types from implementation
interface RecentFile {
  name: string;
  path: string;
  date: string;
  size: number;
}

interface SheetMusicState {
  // Current file state
  musicXML: string | null;
  fileName: string | null;
  fileSize: number | null;
  
  // Loading states
  loadState: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  
  // Recent files (persisted)
  recentFiles: RecentFile[];
  maxRecentFiles: number;
  
  // Actions
  loadFromDialog: () => Promise<void>;
  loadFromFile: (fileName: string, content: string, size: number) => Promise<void>;
  clearScore: () => void;
  clearError: () => void;
  addToRecent: (file: RecentFile) => void;
  removeFromRecent: (path: string) => void;
  loadFromRecent: (path: string) => Promise<void>;
  clearRecentFiles: () => void;
}

describe('Version SheetMusicStore - Zustand State Management', () => {
  let mockFileLoader: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset file loader mock
    mockFileLoader = {
      loadFile: jest.fn()
    };
    
    const { getFileLoader } = require('../../../../src/renderer/services/FileLoaderService');
    (getFileLoader as jest.Mock).mockReturnValue(mockFileLoader);
  });

  afterEach(() => {
    // Clean up store state
    act(() => {
      useSheetMusicStore?.getState?.()?.clearScore?.();
    });
  });

  describe('Store Initialization', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSheetMusicStore());
      const state = result.current;
      
      expect(state).toMatchObject({
        musicXML: null,
        fileName: null,
        fileSize: null,
        loadState: 'idle',
        error: null,
        recentFiles: [],
        maxRecentFiles: 10
      });
    });

    test('should provide all required actions', () => {
      const { result } = renderHook(() => useSheetMusicStore());
      const state = result.current;
      
      expect(typeof state.loadFromDialog).toBe('function');
      expect(typeof state.loadFromFile).toBe('function');
      expect(typeof state.clearScore).toBe('function');
      expect(typeof state.clearError).toBe('function');
      expect(typeof state.addToRecent).toBe('function');
      expect(typeof state.removeFromRecent).toBe('function');
      expect(typeof state.loadFromRecent).toBe('function');
      expect(typeof state.clearRecentFiles).toBe('function');
    });
  });

  describe('loadFromDialog Action', () => {
    test('should set loading state when starting file dialog', async () => {
      mockFileLoader.loadFile.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 100))
      );
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        const loadPromise = act(async () => {
          result.current.loadFromDialog();
        });
        
        // Should be loading immediately
        expect(result.current.loadState).toBe('loading');
        expect(result.current.error).toBeNull();
        
        await loadPromise;
      }).rejects.toThrow('Version Loading state management not implemented yet');
    });

    test('should handle successful file load', async () => {
      const mockFileData = {
        fileName: 'test-score.xml',
        content: '<?xml version="1.0"?><score-partwise>...</score-partwise>',
        fileSize: 1024
      };
      
      mockFileLoader.loadFile.mockResolvedValue(mockFileData);
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        expect(result.current).toMatchObject({
          musicXML: mockFileData.content,
          fileName: mockFileData.fileName,
          fileSize: mockFileData.fileSize,
          loadState: 'success',
          error: null
        });
      }).rejects.toThrow('Version File loading not implemented yet');
    });

    test('should handle user cancellation (null return)', async () => {
      mockFileLoader.loadFile.mockResolvedValue(null);
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        // Should return to idle state
        expect(result.current.loadState).toBe('idle');
        expect(result.current.musicXML).toBeNull();
      }).rejects.toThrow('Version Cancellation handling not implemented yet');
    });

    test('should handle file loading errors', async () => {
      mockFileLoader.loadFile.mockRejectedValue(new Error('File too large'));
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        expect(result.current).toMatchObject({
          loadState: 'error',
          error: 'File too large',
          musicXML: null
        });
      }).rejects.toThrow('Version Error handling not implemented yet');
    });

    test('should validate file content in renderer', async () => {
      const invalidFileData = {
        fileName: 'test.xml',
        content: 'Not valid XML',
        fileSize: 13
      };
      
      mockFileLoader.loadFile.mockResolvedValue(invalidFileData);
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        expect(result.current.loadState).toBe('error');
        expect(result.current.error).toContain('valid XML');
      }).rejects.toThrow('Version Content validation not implemented yet');
    });

    test('should check uncompressed size limit (25MB)', async () => {
      const largeContent = 'x'.repeat(26 * 1024 * 1024); // 26MB string
      const fileData = {
        fileName: 'large.xml',
        content: largeContent,
        fileSize: 1024 // Compressed size was small
      };
      
      mockFileLoader.loadFile.mockResolvedValue(fileData);
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        expect(result.current.loadState).toBe('error');
        expect(result.current.error).toContain('exceeds maximum size');
      }).rejects.toThrow('Version Uncompressed size check not implemented yet');
    });

    test('should add successfully loaded file to recent files', async () => {
      const mockFileData = {
        fileName: 'test-score.xml',
        content: '<?xml version="1.0"?><score-partwise>...</score-partwise>',
        fileSize: 1024
      };
      
      mockFileLoader.loadFile.mockResolvedValue(mockFileData);
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromDialog();
        });
        
        expect(result.current.recentFiles).toHaveLength(1);
        expect(result.current.recentFiles[0]).toMatchObject({
          name: 'test-score.xml',
          size: 1024
        });
      }).rejects.toThrow('Version Recent files tracking not implemented yet');
    });
  });

  describe('loadFromFile Action (for drag-drop)', () => {
    test('should load file content directly', async () => {
      const fileName = 'dropped.xml';
      const content = '<?xml version="1.0"?><score-partwise>Test</score-partwise>';
      const size = content.length;
      
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromFile(fileName, content, size);
        });
        
        expect(result.current).toMatchObject({
          musicXML: content,
          fileName: fileName,
          fileSize: size,
          loadState: 'success'
        });
      }).rejects.toThrow('Version Direct file loading not implemented yet');
    });

    test('should validate MusicXML format for dropped files', async () => {
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromFile('bad.xml', 'not xml', 7);
        });
        
        expect(result.current.loadState).toBe('error');
        expect(result.current.error).toContain('Invalid MusicXML');
      }).rejects.toThrow('Version Drop validation not implemented yet');
    });
  });

  describe('State Management Actions', () => {
    test('should clear score and reset to idle state', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        // Set some state first
        act(() => {
          result.current.loadFromFile('test.xml', '<xml/>', 6);
        });
        
        // Clear it
        act(() => {
          result.current.clearScore();
        });
        
        expect(result.current).toMatchObject({
          musicXML: null,
          fileName: null,
          fileSize: null,
          loadState: 'idle',
          error: null
        });
      }).toThrow('Version Clear score action not implemented yet');
    });

    test('should clear error state only', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        // Set error state
        act(() => {
          result.current.loadState = 'error';
          result.current.error = 'Some error';
        });
        
        // Clear error
        act(() => {
          result.current.clearError();
        });
        
        expect(result.current.error).toBeNull();
        // Other state should remain unchanged
      }).toThrow('Version Clear error action not implemented yet');
    });
  });

  describe('Recent Files Management', () => {
    test('should add file to recent files list', () => {
      const recentFile: RecentFile = {
        name: 'song.xml',
        path: 'song.xml',
        date: new Date().toISOString(),
        size: 2048
      };
      
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        act(() => {
          result.current.addToRecent(recentFile);
        });
        
        expect(result.current.recentFiles).toHaveLength(1);
        expect(result.current.recentFiles[0]).toEqual(recentFile);
      }).toThrow('Version Add to recent not implemented yet');
    });

    test('should prevent duplicate recent files', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        const file: RecentFile = {
          name: 'song.xml',
          path: 'song.xml',
          date: new Date().toISOString(),
          size: 1024
        };
        
        act(() => {
          result.current.addToRecent(file);
          result.current.addToRecent(file); // Add same file again
        });
        
        expect(result.current.recentFiles).toHaveLength(1);
      }).toThrow('Version Duplicate prevention not implemented yet');
    });

    test('should limit recent files to maxRecentFiles', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        // Add 11 files (max is 10)
        act(() => {
          for (let i = 0; i < 11; i++) {
            result.current.addToRecent({
              name: `file${i}.xml`,
              path: `file${i}.xml`,
              date: new Date().toISOString(),
              size: 1024
            });
          }
        });
        
        expect(result.current.recentFiles).toHaveLength(10);
        // Oldest file should be removed
        expect(result.current.recentFiles[0].name).toBe('file10.xml');
      }).toThrow('Version Recent files limit not implemented yet');
    });

    test('should remove file from recent list', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        const file: RecentFile = {
          name: 'song.xml',
          path: 'song.xml',
          date: new Date().toISOString(),
          size: 1024
        };
        
        act(() => {
          result.current.addToRecent(file);
          result.current.removeFromRecent('song.xml');
        });
        
        expect(result.current.recentFiles).toHaveLength(0);
      }).toThrow('Version Remove from recent not implemented yet');
    });

    test('should clear all recent files', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        // Add some files
        act(() => {
          result.current.addToRecent({
            name: 'file1.xml',
            path: 'file1.xml',
            date: new Date().toISOString(),
            size: 1024
          });
          result.current.addToRecent({
            name: 'file2.xml',
            path: 'file2.xml',
            date: new Date().toISOString(),
            size: 2048
          });
        });
        
        act(() => {
          result.current.clearRecentFiles();
        });
        
        expect(result.current.recentFiles).toHaveLength(0);
      }).toThrow('Version Clear recent files not implemented yet');
    });

    test('should placeholder for loadFromRecent (Phase 3)', async () => {
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        await act(async () => {
          await result.current.loadFromRecent('path/to/file.xml');
        });
        
        expect(result.current.loadState).toBe('error');
        expect(result.current.error).toContain('not yet implemented');
      }).rejects.toThrow('Version Load from recent placeholder not implemented yet');
    });
  });

  describe('State Persistence', () => {
    test('should persist only recent files to localStorage', async () => {
      expect(async () => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        const recentFile: RecentFile = {
          name: 'persisted.xml',
          path: 'persisted.xml',
          date: new Date().toISOString(),
          size: 1024
        };
        
        act(() => {
          result.current.addToRecent(recentFile);
        });
        
        // Wait for persistence (if debounced)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stored = localStorage.getItem('sheet-music-storage');
        expect(stored).toBeTruthy();
        
        const parsed = JSON.parse(stored!);
        expect(parsed.state).toMatchObject({
          recentFiles: [recentFile],
          maxRecentFiles: 10
        });
        
        // Should NOT persist current file data
        expect(parsed.state.musicXML).toBeUndefined();
        expect(parsed.state.fileName).toBeUndefined();
      }).rejects.toThrow('Version Persistence not implemented yet');
    });

    test('should restore recent files on initialization', () => {
      const persistedData = {
        state: {
          recentFiles: [
            {
              name: 'restored.xml',
              path: 'restored.xml',
              date: new Date().toISOString(),
              size: 2048
            }
          ],
          maxRecentFiles: 10
        },
        version: 0
      };
      
      localStorage.setItem('sheet-music-storage', JSON.stringify(persistedData));
      
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        expect(result.current.recentFiles).toHaveLength(1);
        expect(result.current.recentFiles[0].name).toBe('restored.xml');
      }).toThrow('Version Persistence restoration not implemented yet');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete store operations in less than 10ms', () => {
      expect(() => {
        const { result } = renderHook(() => useSheetMusicStore());
        
        const operations = [
          () => result.current.clearScore(),
          () => result.current.clearError(),
          () => result.current.addToRecent({
            name: 'perf.xml',
            path: 'perf.xml',
            date: new Date().toISOString(),
            size: 1024
          })
        ];
        
        operations.forEach(op => {
          const start = performance.now();
          act(() => op());
          const duration = performance.now() - start;
          
          expect(duration).toBeLessThan(10);
        });
      }).toThrow('Version Performance requirements not met yet');
    });

    test('should initialize store in less than 5ms', () => {
      expect(() => {
        const start = performance.now();
        const { result } = renderHook(() => useSheetMusicStore());
        const duration = performance.now() - start;
        
        expect(duration).toBeLessThan(5);
      }).toThrow('Version Store initialization performance not optimized yet');
    });
  });
});

// Export test utilities
export const SheetMusicStoreTestUtils = {
  createMockRecentFile: (overrides?: Partial<RecentFile>): RecentFile => ({
    name: 'test.xml',
    path: 'test.xml',
    date: new Date().toISOString(),
    size: 1024,
    ...overrides
  })
};