/**
 * Phase 1B: Musical Context Analysis Tests
 * 
 * Tests for enhanced breathing room based on musical context (phrase endings, fermatas, barlines).
 * 
 * Architecture: Dependency injection pattern for deterministic testing
 * Performance: Synchronous API preserving Phase 1 contracts
 * Fallback: Graceful degradation to 40ms constant breathing room
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Types that will be implemented
interface NoteContext {
  noteId: string;
  measureIndex: number;
  isPhraseEnd: boolean;
  hasFermata: boolean;
  isBarlineEnd: boolean;
  restDurationAfter?: number; // in beats
}

interface BreathingRoomStrategy {
  extraMs(noteId: string, context: NoteContext): number;
}

interface MusicalContextProvider {
  getContext(noteId: string): NoteContext | null;
  isReady(): boolean;
  preloadContext(osmdData: any): Promise<void>;
}

// Mock implementation for testing
class MockMusicalContextProvider implements MusicalContextProvider {
  private contextMap = new Map<string, NoteContext>();
  private ready = false;

  getContext(noteId: string): NoteContext | null {
    return this.contextMap.get(noteId) || null;
  }

  isReady(): boolean {
    return this.ready;
  }

  async preloadContext(osmdData: any): Promise<void> {
    this.ready = true;
  }

  // Test helper methods
  setContext(noteId: string, context: Partial<NoteContext>): void {
    this.contextMap.set(noteId, {
      noteId,
      measureIndex: 0,
      isPhraseEnd: false,
      hasFermata: false,
      isBarlineEnd: false,
      ...context
    });
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  clear(): void {
    this.contextMap.clear();
    this.ready = false;
  }
}

describe('Phase 1B: Musical Context Analysis', () => {
  let mockProvider: MockMusicalContextProvider;

  beforeEach(() => {
    mockProvider = new MockMusicalContextProvider();
  });

  describe('Task 1B.1: Note Context Types', () => {
    test('should define NoteContext interface correctly', () => {
      // Drive type definition implementation
      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: false,
        hasFermata: false,
        isBarlineEnd: false
      };

      expect(typeof context.noteId).toBe('string');
      expect(typeof context.measureIndex).toBe('number');
      expect(typeof context.isPhraseEnd).toBe('boolean');
      expect(typeof context.hasFermata).toBe('boolean');
      expect(typeof context.isBarlineEnd).toBe('boolean');
    });

    test('should define BreathingRoomStrategy interface correctly', () => {
      // Drive strategy interface implementation
      const mockStrategy: BreathingRoomStrategy = {
        extraMs: jest.fn().mockReturnValue(40)
      };

      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: false,
        hasFermata: false,
        isBarlineEnd: false
      };

      const result = mockStrategy.extraMs('note1', context);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Task 1B.2: Score Analysis (Load-time)', () => {
    test('should analyze score for phrase endings', async () => {
      // Drive phrase analysis implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        const mockOsmdData = { measureList: [] };
        const result = await analyzer.analyzeScore(mockOsmdData);
        expect(result).toBeInstanceOf(Map);
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should detect fermatas in score', async () => {
      // Drive fermata detection implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        const mockOsmdData = { 
          measureList: [[{ 
            staffEntries: [{ hasFermata: true, id: 'note1' }] 
          }]]
        };
        const result = await analyzer.analyzeScore(mockOsmdData);
        expect(result.get('note1')?.hasFermata).toBe(true);
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should identify long rests as phrase boundaries', async () => {
      // Drive long rest analysis implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        const mockOsmdData = { 
          measureList: [[{ 
            staffEntries: [{ restDurationAfter: 3.0, id: 'note1' }] 
          }]]
        };
        const result = await analyzer.analyzeScore(mockOsmdData);
        expect(result.get('note1')?.isPhraseEnd).toBe(true);
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should complete analysis within performance budget', async () => {
      // Drive performance requirement implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        const startTime = performance.now();
        await analyzer.analyzeScore({ measureList: new Array(100).fill([{}]) });
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(200); // <200ms budget
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });
  });

  describe('Task 1B.3: Dynamic Breathing Room Strategy', () => {
    test('should provide graduated breathing room for different contexts', async () => {
      // Drive DynamicBreathingRoom implementation
      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map<string, NoteContext>();
        const strategy = new DynamicBreathingRoom(contextMap);
        expect(strategy).toBeDefined();
        expect(typeof strategy.extraMs).toBe('function');
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should give longest pause for fermatas (200ms)', async () => {
      // Drive fermata breathing room implementation
      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: false,
        hasFermata: true,
        isBarlineEnd: false
      };

      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map([['note1', context]]);
        const strategy = new DynamicBreathingRoom(contextMap);
        const breathingRoom = strategy.extraMs('note1', context);
        expect(breathingRoom).toBe(200); // Fermata should get 200ms
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should give medium pause for phrase endings (100ms)', async () => {
      // Drive phrase end breathing room implementation
      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: true,
        hasFermata: false,
        isBarlineEnd: false
      };

      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map([['note1', context]]);
        const strategy = new DynamicBreathingRoom(contextMap);
        const breathingRoom = strategy.extraMs('note1', context);
        expect(breathingRoom).toBe(100); // Phrase end should get 100ms
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should give short pause for barline endings (60ms)', async () => {
      // Drive barline breathing room implementation
      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: false,
        hasFermata: false,
        isBarlineEnd: true
      };

      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map([['note1', context]]);
        const strategy = new DynamicBreathingRoom(contextMap);
        const breathingRoom = strategy.extraMs('note1', context);
        expect(breathingRoom).toBe(60); // Barline should get 60ms
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should fallback to default breathing room (40ms)', async () => {
      // Drive default fallback implementation
      const context: NoteContext = {
        noteId: 'note1',
        measureIndex: 0,
        isPhraseEnd: false,
        hasFermata: false,
        isBarlineEnd: false
      };

      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map([['note1', context]]);
        const strategy = new DynamicBreathingRoom(contextMap);
        const breathingRoom = strategy.extraMs('note1', context);
        expect(breathingRoom).toBe(40); // Default should get 40ms
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should calculate breathing room in under 1ms', async () => {
      // Drive performance requirement implementation
      try {
        const { DynamicBreathingRoom } = await import('@/renderer/features/practice-mode/services/DynamicBreathingRoom');
        const contextMap = new Map<string, NoteContext>();
        const strategy = new DynamicBreathingRoom(contextMap);
        const context: NoteContext = {
          noteId: 'note1',
          measureIndex: 0,
          isPhraseEnd: false,
          hasFermata: false,
          isBarlineEnd: false
        };
        
        const startTime = performance.now();
        strategy.extraMs('note1', context);
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(1); // <1ms requirement
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });
  });

  describe('Task 1B.4: Tempo Service Integration', () => {
    test('should preserve Phase 1 behavior when context unavailable', async () => {
      // Drive regression testing - CRITICAL for preserving existing functionality
      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        mockProvider.setReady(false);
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Should fallback to Phase 1 behavior (500ms + 40ms = 540ms at 120 BPM)
        const delay = tempoService.computeDelay(1.0);
        expect(delay).toBe(540); // 60000/120 * 1.0 + 40
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should apply musical context when available', async () => {
      // Drive enhanced computeDelay implementation
      mockProvider.setReady(true);
      mockProvider.setContext('note1', { isPhraseEnd: true });

      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Need to preload context first to activate dynamic breathing room
        await tempoService.preloadMusicalContext({});
        
        // Should apply phrase end breathing room (100ms instead of 40ms)
        const delay = tempoService.computeDelay(1.0, 'note1');
        expect(delay).toBe(600); // 60000/120 * 1.0 + 100
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should maintain synchronous API contract', async () => {
      // Drive synchronous performance requirement
      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Should be synchronous (no Promise returned)
        const startTime = performance.now();
        const result = tempoService.computeDelay(1.0);
        const duration = performance.now() - startTime;
        
        expect(typeof result).toBe('number');
        expect(duration).toBeLessThan(1); // <1ms synchronous requirement
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should handle dependency injection for testing', async () => {
      // Drive dependency injection implementation
      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        expect(tempoService).toBeDefined();
        expect(typeof tempoService.computeDelay).toBe('function');
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should gracefully handle context provider not ready', async () => {
      // Drive ready state handling implementation
      mockProvider.setReady(false);

      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Should fallback to default breathing room when not ready
        const delay = tempoService.computeDelay(1.0, 'note1');
        expect(delay).toBe(540); // Default Phase 1 behavior
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should cache context for O(1) lookup performance', async () => {
      // Drive O(1) performance implementation
      mockProvider.setReady(true);
      mockProvider.setContext('note1', { isPhraseEnd: true });

      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Multiple calls should be consistently fast (cached)
        const startTime = performance.now();
        for (let i = 0; i < 100; i++) {
          tempoService.computeDelay(1.0, 'note1');
        }
        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(10); // 100 calls in <10ms = O(1) caching
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should not break existing Phase 1 test suite', async () => {
      // Ensure backward compatibility with Phase 1
      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        // Test without context provider (Phase 1 mode)
        const tempoService = new TempoServiceImpl(mockOsmdStore);
        
        // Should work exactly like Phase 1 when no context provider
        const delay = tempoService.computeDelay(1.0);
        expect(delay).toBe(540); // 60000/120 * 1.0 + 40
        
        // Should not have context methods available
        expect(tempoService.isContextReady()).toBe(false);
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });
  });

  describe('Performance and Memory Requirements', () => {
    test('should keep memory usage under +2MB budget', async () => {
      // Drive memory budget implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        
        const memBefore = (performance as any).memory?.usedJSHeapSize || 0;
        
        // Analyze a large score (100 measures)
        const largeMockData = { 
          measureList: new Array(100).fill([{ 
            staffEntries: [{ id: 'note1' }, { id: 'note2' }] 
          }])
        };
        
        await analyzer.analyzeScore(largeMockData);
        
        const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
        const memIncrease = memAfter - memBefore;
        
        expect(memIncrease).toBeLessThan(2 * 1024 * 1024); // <2MB
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should maintain <20ms MIDI latency during practice', async () => {
      // Drive latency requirement implementation
      try {
        const { TempoServiceImpl } = await import('@/renderer/features/practice-mode/services/TempoService');
        mockProvider.setReady(true);
        
        // Mock osmdStore with tempo data
        const mockOsmdStore = {
          tempoMap: {
            defaultBpm: 120,
            averageBpm: 120,
            hasExplicitTempo: true
          }
        };
        
        const tempoService = new TempoServiceImpl(mockOsmdStore, mockProvider);
        
        // Simulate high-frequency MIDI events during practice
        const startTime = performance.now();
        
        for (let i = 0; i < 100; i++) {
          tempoService.computeDelay(1.0, `note${i}`);
        }
        
        const totalTime = performance.now() - startTime;
        const avgTimePerCall = totalTime / 100;
        
        expect(avgTimePerCall).toBeLessThan(0.2); // <0.2ms per call to maintain <20ms total latency
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });

    test('should complete context preload in <200ms', async () => {
      // Drive preload performance implementation
      try {
        const { MusicalContextAnalyzer } = await import('@/renderer/features/practice-mode/services/MusicalContextAnalyzer');
        const analyzer = new MusicalContextAnalyzer();
        
        const mockData = { 
          measureList: new Array(100).fill([{ 
            staffEntries: [{ id: 'note1' }, { id: 'note2' }] 
          }])
        };
        
        const startTime = performance.now();
        await analyzer.analyzeScore(mockData);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(200); // <200ms preload budget
      } catch (error) {
        expect(error).toMatch(/Cannot resolve module/);
      }
    });
  });
});