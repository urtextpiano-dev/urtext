// Phase 1 Worker Implementation Tests - Testing actual functionality
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { validateXMLContent, processFileWithParams } from '../../../src/main/workers/fileProcessor';

// Mock fs module
jest.mock('fs/promises');
jest.mock('unzipper');
jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(() => Date.now())
  }
}));

describe('Version Worker Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateXMLContent', () => {
    test('should validate proper XML content', () => {
      const validXML = '<?xml version="1.0"?><score-partwise><part-list></part-list></score-partwise>';
      expect(() => validateXMLContent(validXML)).not.toThrow();
    });

    test('should reject XML without declaration', () => {
      const invalidXML = '<score-partwise></score-partwise>';
      expect(() => validateXMLContent(invalidXML)).toThrow('Invalid XML: Missing XML declaration');
    });

    test('should reject non-MusicXML content', () => {
      const nonMusicXML = '<?xml version="1.0"?><root></root>';
      expect(() => validateXMLContent(nonMusicXML)).toThrow('Invalid MusicXML: Missing score element');
    });
  });

  describe('processFileWithParams', () => {
    test('should process valid XML file', async () => {
      const filePath = '/test/valid.xml';
      const jobId = 'test-123';
      
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true
      });
      
      (fs.readFile as jest.Mock).mockResolvedValue(
        '<?xml version="1.0"?><score-partwise></score-partwise>'
      );
      
      const result = await processFileWithParams(filePath, jobId);
      
      expect(result.success).toBe(true);
      expect(result.jobId).toBe(jobId);
      expect(result.content).toContain('score-partwise');
      expect(result.fileName).toBe('valid.xml');
      expect(result.fileSize).toBe(1024);
    });

    test('should reject non-absolute paths', async () => {
      const relativePath = '../test/file.xml';
      const jobId = 'test-123';
      
      const result = await processFileWithParams(relativePath, jobId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path');
    });

    test('should enforce file size limit', async () => {
      const filePath = '/test/large.xml';
      const jobId = 'test-123';
      
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 101 * 1024 * 1024, // 101MB
        isFile: () => true
      });
      
      const result = await processFileWithParams(filePath, jobId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File too large');
    });

    test('should reject unsupported file types', async () => {
      const filePath = '/test/file.pdf';
      const jobId = 'test-123';
      
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true
      });
      
      const result = await processFileWithParams(filePath, jobId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported file type: .pdf');
    });

    test('should include performance metrics', async () => {
      const filePath = '/test/valid.xml';
      const jobId = 'test-123';
      
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true
      });
      
      (fs.readFile as jest.Mock).mockResolvedValue(
        '<?xml version="1.0"?><score-partwise></score-partwise>'
      );
      
      const result = await processFileWithParams(filePath, jobId);
      
      expect(result.success).toBe(true);
      expect(result.performance).toBeDefined();
      expect(result.performance?.readTime).toBeGreaterThanOrEqual(0);
      expect(result.performance?.parseTime).toBeGreaterThanOrEqual(0);
      expect(result.performance?.totalTime).toBeGreaterThanOrEqual(0);
    });
  });
});