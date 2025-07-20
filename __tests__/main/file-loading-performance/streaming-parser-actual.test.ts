// Phase 2 Streaming Parser Tests - Testing actual functionality
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Readable, Transform } from 'stream';
import { StreamingMusicXMLParser } from '../../../src/main/parsers/streamingMusicXMLParser';

describe('Version Streaming MusicXML Parser - Actual Implementation Tests', () => {
  let parser: StreamingMusicXMLParser;
  let mockStream: Readable;
  
  beforeEach(() => {
    jest.clearAllMocks();
    parser = new StreamingMusicXMLParser({
      chunkSize: 64 * 1024,
      maxBufferSize: 10 * 1024 * 1024
    });
    mockStream = new Readable();
  });
  
  afterEach(() => {
    if (mockStream && !mockStream.destroyed) {
      mockStream.destroy();
    }
  });

  describe('Streaming Parser Creation', () => {
    test('should create streaming parser with configurable chunk size', () => {
      const customParser = new StreamingMusicXMLParser({
        chunkSize: 32 * 1024,
        maxBufferSize: 5 * 1024 * 1024
      });
      
      expect(customParser).toBeDefined();
      expect(customParser.getChunkSize()).toBe(32 * 1024);
    });

    test('should implement Transform stream interface', () => {
      expect(parser).toBeInstanceOf(Transform);
      expect(typeof parser.pipe).toBe('function');
      expect(typeof parser.on).toBe('function');
    });
  });

  describe('Progressive Parsing', () => {
    test('should emit measure events as they are parsed', async () => {
      const measures: any[] = [];
      
      parser.on('measure', (measure: any) => {
        measures.push(measure);
      });
      
      const xmlContent = `<?xml version="1.0"?>
<score-partwise>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch></note>
    </measure>
  </part>
</score-partwise>`;
      
      mockStream.push(xmlContent);
      mockStream.push(null); // End stream
      
      await new Promise((resolve, reject) => {
        mockStream
          .pipe(parser)
          .on('finish', resolve)
          .on('error', reject);
      });
      
      expect(measures).toHaveLength(2);
      expect(measures[0].number).toBe(1);
      expect(measures[1].number).toBe(2);
    });

    test('should emit first-chunk event with 4 measures', async () => {
      let firstChunk: any = null;
      
      parser.on('first-chunk', (data) => {
        firstChunk = data;
      });
      
      const xmlContent = `<?xml version="1.0"?>
<score-partwise>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1"><note/></measure>
    <measure number="2"><note/></measure>
    <measure number="3"><note/></measure>
    <measure number="4"><note/></measure>
    <measure number="5"><note/></measure>
  </part>
</score-partwise>`;
      
      mockStream.push(xmlContent);
      mockStream.push(null);
      
      await new Promise((resolve, reject) => {
        mockStream
          .pipe(parser)
          .on('finish', resolve)
          .on('error', reject);
      });
      
      expect(firstChunk).toBeDefined();
      expect(firstChunk.measureCount).toBe(4);
      expect(firstChunk.content).toContain('measure number="1"');
      expect(firstChunk.content).toContain('measure number="4"');
      expect(firstChunk.content).not.toContain('measure number="5"');
    });
  });

  describe('Memory Management', () => {
    test('should limit buffer size to prevent memory exhaustion', async () => {
      const smallParser = new StreamingMusicXMLParser({
        chunkSize: 1024,
        maxBufferSize: 2048 // Very small buffer
      });
      
      // Create content larger than buffer
      const largeContent = 'x'.repeat(3000);
      mockStream.push(largeContent);
      mockStream.push(null);
      
      await expect(new Promise((resolve, reject) => {
        mockStream
          .pipe(smallParser)
          .on('finish', resolve)
          .on('error', reject);
      })).rejects.toThrow('Buffer size exceeded');
    });
  });
});