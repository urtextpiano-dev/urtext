// Shared test utilities and mocks for file loading performance tests

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Mock Worker class
export class MockWorker extends EventEmitter {
  constructor(public scriptPath: string, public options?: any) {
    super();
    setTimeout(() => this.emit('online'), 0);
  }
  
  postMessage(message: any): void {
    // Simulate processing
    setTimeout(() => {
      this.emit('message', {
        success: true,
        jobId: message.jobId || 'test-job',
        content: '<?xml version="1.0"?><score-partwise></score-partwise>',
        performance: {
          readTime: 50,
          parseTime: 10,
          totalTime: 60
        }
      });
    }, 50);
  }
  
  terminate(): Promise<void> {
    this.emit('exit', 0);
    return Promise.resolve();
  }
}

// Mock file system helpers
export async function createTestXMLFile(
  name: string, 
  sizeMB: number
): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abc-piano-test-'));
  const filePath = path.join(tmpDir, name);
  
  // Generate MusicXML content of approximate size
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;
  
  const footer = `  </part>
</score-partwise>`;
  
  const measureTemplate = `
    <measure number="{n}">
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>`;
  
  // Calculate how many measures needed for target size
  const targetBytes = sizeMB * 1024 * 1024;
  const measureSize = Buffer.byteLength(measureTemplate);
  const measuresNeeded = Math.floor(
    (targetBytes - Buffer.byteLength(header) - Buffer.byteLength(footer)) / measureSize
  );
  
  let content = header;
  for (let i = 1; i <= measuresNeeded; i++) {
    content += measureTemplate.replace('{n}', i.toString());
  }
  content += footer;
  
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

// Mock MXL file creation
export async function createTestMXLFile(
  name: string,
  sizeMB: number
): Promise<string> {
  // For now, just create an XML file
  // Real implementation would create a proper ZIP archive
  return createTestXMLFile(name.replace('.mxl', '.xml'), sizeMB);
}

// Mock performance logger
export class MockPerformanceLogger {
  private marks = new Map<string, number>();
  private measures: Array<{ name: string; duration: number }> = [];
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  measure(start: string, end: string, name?: string): number {
    const startTime = this.marks.get(start) || 0;
    const endTime = this.marks.get(end) || performance.now();
    const duration = endTime - startTime;
    
    this.measures.push({
      name: name || `${start} → ${end}`,
      duration
    });
    
    console.log(`[PERF] ${name || `${start} → ${end}`}: ${duration.toFixed(0)}ms`);
    return duration;
  }
  
  reset(): void {
    this.marks.clear();
    this.measures = [];
  }
  
  getReport(): string {
    return this.measures
      .map(m => `${m.name}: ${m.duration.toFixed(0)}ms`)
      .join('\n');
  }
}

// Mock Electron API
export function createMockElectronAPI() {
  const eventHandlers = new Map<string, Set<Function>>();
  
  return {
    openFile: jest.fn().mockResolvedValue({
      jobId: crypto.randomUUID(),
      status: 'processing'
    }),
    
    getFileContent: jest.fn().mockResolvedValue({
      success: true,
      content: '<?xml version="1.0"?><score-partwise></score-partwise>',
      fileName: 'test.xml',
      fileSize: 1024
    }),
    
    on: jest.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    }),
    
    off: jest.fn((event: string, handler: Function) => {
      eventHandlers.get(event)?.delete(handler);
    }),
    
    emit: (event: string, data: any) => {
      eventHandlers.get(event)?.forEach(handler => handler(data));
    }
  };
}

// Mock MIDI Service
export class MockMidiService extends EventEmitter {
  async simulateNoteOn(note: number, velocity: number, timestamp: number): Promise<void> {
    // Simulate small processing delay
    await new Promise(resolve => setTimeout(resolve, 1));
    
    this.emit('note-on', {
      note,
      velocity,
      timestamp,
      channel: 0
    });
  }
  
  async simulateNoteOff(note: number, timestamp: number): Promise<void> {
    this.emit('note-off', {
      note,
      timestamp,
      channel: 0
    });
  }
}

// Performance test helpers
export async function measureAsyncOperation<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
}

export function calculateStats(measurements: number[]): {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const sorted = [...measurements].sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    avg: measurements.reduce((a, b) => a + b, 0) / len,
    min: sorted[0],
    max: sorted[len - 1],
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)]
  };
}

// Memory usage helper
export function getMemoryUsageMB(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / (1024 * 1024);
}

// Test fixture cleanup
export async function cleanupTestFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.unlink(file);
      // Also try to remove parent directory if it's a temp dir
      const dir = path.dirname(file);
      if (dir.includes('abc-piano-test-')) {
        await fs.rmdir(dir);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}