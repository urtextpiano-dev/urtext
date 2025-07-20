// Phase 2 Streaming Integration Tests - Testing actual functionality
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkerManager } from '../../../src/main/services/workerManager';
import { fileCache } from '../../../src/main/services/fileCache';
import * as fs from 'fs';
import * as path from 'path';

// Mock worker_threads module
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn()
  })),
  parentPort: null,
  workerData: {}
}));

// Mock the worker file resolution
jest.mock('module', () => {
  const actualModule = jest.requireActual('module') as any;
  return {
    ...actualModule,
    Module: {
      ...actualModule.Module,
      _resolveFilename: jest.fn((request: string) => {
        if (request.includes('fileProcessor')) {
          return '/mocked/path/fileProcessor.js';
        }
        return actualModule.Module._resolveFilename(request);
      })
    }
  };
});

describe('Phase 2: Streaming Integration - Actual Implementation Tests', () => {
  let workerManager: WorkerManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    workerManager = new WorkerManager();
  });
  
  afterEach(async () => {
    if (workerManager) {
      await workerManager.shutdown();
    }
  });

  describe('Worker Manager Integration', () => {
    test('should emit chunk events from worker', (done) => {
      const chunkEvents: any[] = [];
      
      workerManager.on('chunk', (event) => {
        chunkEvents.push(event);
        
        if (event.data.type === 'complete') {
          expect(chunkEvents).toHaveLength(2); // first + complete
          expect(chunkEvents[0].data.type).toBe('first');
          expect(chunkEvents[1].data.type).toBe('complete');
          done();
        }
      });
      
      // Simulate worker posting chunk messages
      const mockWorker = {
        on: jest.fn((event: string, handler: (message: any) => void) => {
          if (event === 'message') {
            // Simulate first chunk
            setTimeout(() => handler({
              type: 'chunk',
              jobId: 'test-job',
              data: {
                type: 'first',
                content: '<xml>first</xml>',
                measureCount: 4,
                isComplete: false
              }
            }), 10);
            
            // Simulate complete chunk
            setTimeout(() => handler({
              type: 'chunk',
              jobId: 'test-job',
              data: {
                type: 'complete',
                content: '<xml>complete</xml>',
                measureCount: 10,
                isComplete: true
              }
            }), 20);
          }
        }),
        postMessage: jest.fn(),
        terminate: jest.fn()
      };
      
      // Mock Worker constructor
      (require('worker_threads').Worker as jest.Mock).mockImplementation(() => mockWorker);
      
      // Start processing
      workerManager.processFile('/test/file.xml', 'test-job', 2 * 1024 * 1024).catch(() => {});
    });
  });

  describe('File Cache Integration', () => {
    test('should cache file content after processing', () => {
      const jobId = 'test-job-123';
      const testData = {
        content: '<?xml version="1.0"?><score-partwise></score-partwise>',
        fileName: 'test.xml',
        fileSize: 1024
      };
      
      fileCache.set(jobId, testData);
      
      const cached = fileCache.get(jobId);
      expect(cached).toBeDefined();
      expect(cached?.content).toBe(testData.content);
      expect(cached?.fileName).toBe(testData.fileName);
      expect(cached?.fileSize).toBe(testData.fileSize);
      expect(cached?.version).toBeDefined();
      expect(cached?.timestamp).toBeDefined();
    });
    
    test('should expire cache entries after 5 minutes', () => {
      jest.useFakeTimers();
      
      const jobId = 'test-job-456';
      fileCache.set(jobId, {
        content: 'test',
        fileName: 'test.xml',
        fileSize: 100
      });
      
      expect(fileCache.get(jobId)).toBeDefined();
      
      // Advance time by 5 minutes + 1 second
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
      
      expect(fileCache.get(jobId)).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Memory Management', () => {
    test('should handle concurrent operations', async () => {
      const jobs: Promise<void>[] = [];
      
      // Mock Worker to resolve immediately
      (require('worker_threads').Worker as jest.Mock).mockImplementation(() => ({
        on: jest.fn((event: string, handler: (message: any) => void) => {
          if (event === 'message') {
            setTimeout(() => handler({
              success: true,
              jobId: 'job-x',
              content: 'test'
            }), 1);
          }
        }),
        postMessage: jest.fn(),
        terminate: jest.fn()
      }));
      
      // Try to create 10 concurrent jobs (should be limited by maxWorkers)
      for (let i = 0; i < 10; i++) {
        try {
          const promise = workerManager.processFile(`/test/file${i}.xml`, `job-${i}`);
          jobs.push(promise);
        } catch (error) {
          // Expected to throw after reaching max workers
          expect((error as Error).message).toBe('Too many concurrent file operations');
        }
      }
      
      // Should have created maxWorkers jobs
      expect(jobs.length).toBeLessThanOrEqual(4); // Default max is 4
      expect(jobs.length).toBeGreaterThan(0);
      
      // Wait for all jobs to complete
      await Promise.all(jobs);
    });
  });
});