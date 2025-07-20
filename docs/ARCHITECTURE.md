# Urtext Piano - Application Architecture

This document defines the architectural patterns, structure, and design decisions for the Urtext Piano Electron-based piano learning application.

## Architecture Philosophy

Urtext Piano follows a **Progressive Enhancement Architecture** that balances clean architectural principles with real-time performance requirements and developer productivity. The architecture evolves in phases:

- **Phase 1 (MVP)**: Pragmatic structure optimized for rapid development
- **Phase 2 (Production)**: Enhanced separation and security hardening 
- **Phase 3 (Scale)**: Performance optimization and advanced features

## Core Architectural Principles

### 1. Performance-First Design
Real-time audio applications have unique constraints that override traditional architectural purity:
- **Sub-20ms latency requirement** for MIDI input to audio output
- **Memory-conscious object creation** to prevent garbage collection pauses
- **Direct access patterns** for performance-critical code paths

### 2. Domain-Driven Features
Features are organized around musical learning concepts rather than technical layers:
- **Practice Session**: Complete practice workflow with timing and feedback
- **Sheet Music**: Display, navigation, and real-time highlighting
- **Performance Analysis**: Accuracy tracking and improvement suggestions
- **MIDI Integration**: Device management and event processing
- **Audio Engine**: Sound synthesis and playback

### 3. Progressive Abstraction
Abstractions are introduced only when they provide clear value:
- **Essential abstractions**: External dependencies (MIDI, Audio, File I/O)
- **Deferred abstractions**: Internal business logic until patterns emerge
- **Avoided abstractions**: Local data access and simple state management

## Project Structure

```
src/
├── main/                           # Electron Main Process
│   ├── main.ts                    # Application entry point
│   ├── preload.ts                 # Secure renderer bridge (Phase 2)
│   └── adapters/                  # OS-level integrations
│       ├── file-system.adapter.ts
│       └── native-midi.adapter.ts # Future native MIDI option
├── renderer/                      # Electron Renderer Process  
│   ├── main.tsx                   # React application entry
│   ├── App.tsx                    # Root component with providers
│   ├── features/                  # Domain-driven feature modules
│   │   ├── practice-session/
│   │   │   ├── components/        # UI components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── services/          # Business logic
│   │   │   ├── stores/            # Zustand state slices
│   │   │   └── types/             # TypeScript interfaces
│   │   ├── sheet-music/
│   │   │   ├── components/
│   │   │   │   ├── SheetMusicViewer.tsx
│   │   │   │   ├── NoteHighlighter.tsx
│   │   │   │   └── ProgressCursor.tsx
│   │   │   ├── services/
│   │   │   │   ├── osmd.service.ts
│   │   │   │   └── music-xml.parser.ts
│   │   │   └── stores/
│   │   ├── performance-analysis/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   │   ├── accuracy.analyzer.ts
│   │   │   │   ├── timing.analyzer.ts
│   │   │   │   └── grading.service.ts
│   │   │   └── stores/
│   │   ├── midi-integration/
│   │   │   ├── services/
│   │   │   │   ├── midi.service.ts        # Main MIDI abstraction
│   │   │   │   ├── jzz.adapter.ts         # JZZ.js implementation
│   │   │   │   └── device.manager.ts      # Device discovery/connection
│   │   │   ├── hooks/
│   │   │   │   ├── useMidiInput.ts
│   │   │   │   └── useMidiDevices.ts
│   │   │   └── stores/
│   │   └── audio-engine/
│   │       ├── services/
│   │       │   ├── audio.service.ts       # Web Audio API wrapper
│   │       │   ├── synth.engine.ts        # Sound synthesis
│   │       │   └── sample.loader.ts       # Audio sample management
│   │       └── stores/
│   ├── shared/                    # Cross-feature shared code
│   │   ├── components/            # Reusable UI components
│   │   ├── hooks/                 # Common React hooks
│   │   ├── services/              # Cross-cutting services
│   │   │   ├── logger.service.ts
│   │   │   ├── error.handler.ts
│   │   │   └── config.service.ts
│   │   ├── stores/                # Global app state
│   │   │   └── app.store.ts
│   │   ├── types/                 # Common TypeScript types
│   │   └── utils/                 # Pure utility functions
│   └── core/                      # Application infrastructure
│       ├── music-theory/          # Musical domain models
│       │   ├── note.ts            # Value object: Note(C4)
│       │   ├── interval.ts        # Value object: Interval(MajorThird)
│       │   ├── chord.ts           # Value object: Chord(CMaj7)
│       │   ├── scale.ts           # Value object: Scale(CMajor)
│       │   └── tempo.ts           # Value object: Tempo(120)
│       ├── ipc/                   # Inter-process communication (Phase 2)
│       │   ├── channels.ts        # IPC channel definitions
│       │   └── handlers.ts        # Message handlers
│       └── di/                    # Dependency injection (Phase 3)
└── __tests__/                     # Test files mirror src structure
    ├── features/
    ├── shared/
    └── core/
```

## Architectural Patterns

### State Management Strategy

**Global State (Zustand)**:
```typescript
// stores/app.store.ts
interface AppState {
  // Device connectivity
  midiDevice: MidiDevice | null;
  audioContext: AudioContext | null;
  
  // Current practice session
  activeSession: PracticeSession | null;
  currentScore: MusicScore | null;
  
  // Real-time practice state
  playbackState: 'stopped' | 'playing' | 'paused';
  currentMeasure: number;
  currentBeat: number;
  
  // User progress
  practiceHistory: PracticeSession[];
  userSettings: UserSettings;
}
```

**Feature State (Local Zustand slices)**:
```typescript
// features/midi-integration/stores/midi.store.ts
interface MidiState {
  devices: MidiDevice[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  inputEvents: MidiEvent[];
  latencyMetrics: LatencyStats;
}
```

### Service Layer Patterns

**Essential Abstractions (Interfaces)**:
```typescript
// MIDI Service - Essential for device switching and testing
interface IMidiService {
  getAvailableDevices(): Promise<MidiDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  onNoteOn(callback: (note: number, velocity: number) => void): void;
  onNoteOff(callback: (note: number) => void): void;
}

// Audio Service - Essential for testing and performance tuning  
interface IAudioService {
  playNote(note: number, velocity: number): void;
  stopNote(note: number): void;
  setInstrument(instrument: string): Promise<void>;
  getLatencyStats(): LatencyStats;
}
```

**Direct Implementation (No Abstraction)**:
```typescript
// Sheet Music Service - Direct OSMD integration
export class SheetMusicService {
  private osmd: OpenSheetMusicDisplay;
  
  async loadScore(musicXml: string): Promise<void> {
    await this.osmd.load(musicXml);
    this.osmd.render();
  }
  
  highlightNote(noteId: string): void {
    // Direct OSMD API calls
  }
}
```

### Error Handling & Recovery

**Centralized Error Management**:
```typescript
// shared/services/error.handler.ts
export class ErrorHandler {
  static handleMidiError(error: MidiError): void {
    logger.error('MIDI Error', { error, context: 'midi-integration' });
    
    // User-friendly recovery
    if (error.type === 'DEVICE_DISCONNECTED') {
      notificationService.show('MIDI device disconnected. Switching to virtual keyboard.');
      midiService.switchToVirtualKeyboard();
    }
  }
  
  static handleAudioError(error: AudioError): void {
    logger.error('Audio Error', { error, context: 'audio-engine' });
    
    // Audio context recovery
    if (error.type === 'CONTEXT_SUSPENDED') {
      audioService.resumeContext();
    }
  }
}
```

### Performance Monitoring

**Real-time Latency Tracking**:
```typescript
// shared/services/performance.monitor.ts
export class PerformanceMonitor {
  private latencyMeasurements: number[] = [];
  
  measureMidiLatency(inputTimestamp: number): void {
    const latency = performance.now() - inputTimestamp;
    this.latencyMeasurements.push(latency);
    
    if (latency > 20) {
      logger.warn(`High MIDI latency: ${latency}ms`);
    }
    
    // Keep rolling window of measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
  }
  
  getAverageLatency(): number {
    return this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
  }
}
```

## Electron Process Architecture

### Phase 1: Development-Optimized
```typescript
// main/main.ts - Simple development setup
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: true,        // Enabled for rapid development
    contextIsolation: false,      // Simplified for MVP
    webSecurity: false           // Local file access
  }
});
```

### Phase 2: Production-Hardened
```typescript
// main/main.ts - Secure production setup
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,       // Security requirement
    contextIsolation: true,       // Mandatory isolation
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true                // Renderer sandboxing
  }
});

// preload.ts - Secure API bridge
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openMusicFile: () => ipcRenderer.invoke('file:open-music'),
  savePracticeLog: (data) => ipcRenderer.invoke('file:save-practice', data),
  
  // System integration
  getMidiDevices: () => ipcRenderer.invoke('midi:get-devices'),
  onMidiEvent: (callback) => ipcRenderer.on('midi:event', callback)
});
```

## Data Flow Architecture

### Real-time Practice Flow
```
MIDI Device → JZZ.js → MidiService → PracticeSession → AudioService → Web Audio API
                                  ↓
                              SheetMusicService → OSMD → Visual Feedback
                                  ↓  
                          PerformanceAnalyzer → Accuracy Feedback
```

### State Update Flow
```
User Action → React Component → Zustand Action → Service Layer → External API/Storage
                                    ↓
                               Component Re-render ← State Change Subscription
```

## Testing Strategy

### Unit Testing Focus
- **Music theory calculations** (pure functions)
- **Performance analysis algorithms** (isolated business logic)
- **Service layer methods** (with mocked dependencies)

### Integration Testing Approach
```typescript
// __tests__/features/practice-session/integration.test.tsx
describe('Practice Session Integration', () => {
  it('should provide real-time feedback during practice', async () => {
    const mockMidiService = new MockMidiService();
    const mockAudioService = new MockAudioService();
    
    render(<PracticeSession />, {
      providers: { midiService: mockMidiService, audioService: mockAudioService }
    });
    
    // Simulate MIDI input
    mockMidiService.simulateNoteOn(60, 100);
    
    // Verify audio output
    expect(mockAudioService.playNote).toHaveBeenCalledWith(60, 100);
    
    // Verify visual feedback
    expect(screen.getByTestId('note-feedback')).toHaveTextContent('Correct!');
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/latency.test.ts
describe('MIDI Latency Performance', () => {
  it('should maintain sub-20ms latency under load', async () => {
    const monitor = new PerformanceMonitor();
    const midiService = new JzzMidiAdapter();
    
    // Simulate rapid note input
    for (let i = 0; i < 100; i++) {
      const startTime = performance.now();
      await midiService.simulateNoteOn(60, 100);
      monitor.measureMidiLatency(startTime);
    }
    
    expect(monitor.getAverageLatency()).toBeLessThan(20);
    expect(monitor.getMaxLatency()).toBeLessThan(30);
  });
});
```

## Configuration Management

### Environment-Specific Settings
```typescript
// core/config/app.config.ts
interface AppConfig {
  isDevelopment: boolean;
  midiLatencyTarget: number;
  audioBufferSize: number;
  enableLogging: boolean;
  maxPracticeHistoryEntries: number;
}

export const appConfig: AppConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  midiLatencyTarget: parseInt(process.env.MIDI_LATENCY_TARGET || '20'),
  audioBufferSize: parseInt(process.env.AUDIO_BUFFER_SIZE || '128'),
  enableLogging: process.env.ENABLE_LOGGING === 'true',
  maxPracticeHistoryEntries: 1000
};
```

## Migration Strategy

### Phase 1 → Phase 2 Migration
1. **Security Hardening**:
   - Enable `contextIsolation: true`
   - Implement preload script API
   - Add Content Security Policy
   - Validate all IPC messages

2. **Performance Optimization**:
   - Move MIDI processing to main process if needed
   - Implement worker threads for heavy computations
   - Add performance monitoring dashboard

3. **Testing Enhancement**:
   - Add E2E tests with Playwright
   - Implement automated latency testing
   - Add device compatibility testing

### Phase 2 → Phase 3 Migration
1. **Advanced Features**:
   - Multi-instrument support
   - Collaborative practice sessions
   - Advanced analytics dashboard
   - Plugin architecture for custom instruments

2. **Scalability Improvements**:
   - Dependency injection container
   - Advanced caching strategies
   - Database integration for progress tracking
   - Cloud synchronization

## Architectural Decision Records (ADRs)

Key architectural decisions should be documented in `docs/adr/`:

- **ADR-001**: Progressive Enhancement vs Big Bang Architecture
- **ADR-002**: Zustand vs Redux for State Management  
- **ADR-003**: JZZ.js vs Native MIDI for Device Integration
- **ADR-004**: Feature-Sliced vs Layered Project Structure
- **ADR-005**: Direct Access vs Repository Pattern for Local Data

## Performance Targets

### Latency Requirements
- **MIDI Input to Audio Output**: <20ms (target), <30ms (acceptable)
- **Visual Feedback Delay**: <50ms for note highlighting
- **App Startup Time**: <3 seconds on target hardware
- **Memory Usage**: <200MB during active practice session

### Scalability Metrics
- **Concurrent Notes**: Support up to 10 simultaneous notes (polyphonic)
- **Practice Session Length**: No performance degradation up to 2 hours
- **File Size Support**: MusicXML files up to 5MB
- **Practice History**: Efficiently handle 1000+ practice sessions

## Security Considerations

### Development Phase
- Never commit API keys or sensitive configuration
- Use placeholder data for testing
- Document security debt in ADRs

### Production Phase  
- Mandatory Context Bridge for all main/renderer communication
- Input validation for all IPC messages
- Content Security Policy enforcement
- Regular dependency security audits

## Conclusion

This architecture balances theoretical best practices with the practical constraints of building a real-time musical application in Electron. It prioritizes performance where it matters most while maintaining clean separation of concerns and long-term maintainability.

The progressive enhancement approach allows the team to ship quickly while building toward a robust, scalable architecture that can evolve with the application's needs.