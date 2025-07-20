# Performance Logging Integration Guide

## Overview
This guide shows how to integrate the minimal performance logger into Urtext Piano without impacting the <20ms latency requirement.

## Integration Examples

### 1. MIDI Input Logging

```typescript
// In useMidiHandlers.ts or MidiService
import { logMidiLatency, perfLogger } from '@/renderer/utils/performance-logger';

const handleMidiNoteOn = (note: number, velocity: number) => {
  const startTime = performance.now();
  
  // Process MIDI event
  processNoteOn(note, velocity);
  
  // Log latency (hot path - just stores in buffer)
  const latency = performance.now() - startTime;
  logMidiLatency(latency);
};
```

### 2. Audio Scheduling Logging

```typescript
// In AudioEngine or audio scheduling code
import { logAudioLatency } from '@/renderer/utils/performance-logger';

const scheduleNote = (note: number, time: number) => {
  const startTime = performance.now();
  
  // Schedule audio
  audioContext.scheduleNote(note, time);
  
  // Log scheduling latency
  logAudioLatency(performance.now() - startTime);
};
```

### 3. Error Logging (Non-Hot Path)

```typescript
// In error boundaries or catch blocks
import { perfLogger } from '@/renderer/utils/performance-logger';

try {
  await connectMidiDevice(deviceId);
} catch (error) {
  perfLogger.error('Failed to connect MIDI device', error);
}
```

### 4. Debug Logging (Development Only)

```typescript
// In practice mode or OSMD integration
import { perfLogger } from '@/renderer/utils/performance-logger';

// This is completely removed in production builds
perfLogger.debug('OSMD cursor position', { 
  measure: cursor.currentMeasure,
  beat: cursor.currentBeat 
});
```

## Performance Dashboard (Optional)

```typescript
// Simple performance overlay component
import { perfLogger } from '@/renderer/utils/performance-logger';

const PerformanceOverlay: React.FC = () => {
  const [stats, setStats] = useState(perfLogger.getStats());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(perfLogger.getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="performance-overlay">
      <div>Avg: {stats.avgLatency.toFixed(1)}ms</div>
      <div>Max: {stats.maxLatency.toFixed(1)}ms</div>
      <div>Violations: {stats.violations}</div>
    </div>
  );
};
```

## Best Practices

### DO:
- Use `logMidiLatency()` for MIDI events
- Use `logAudioLatency()` for audio scheduling
- Use `perfLogger.error()` for critical errors only
- Keep measurements simple (start time → end time)

### DON'T:
- Don't log in tight loops
- Don't format strings in hot paths
- Don't log every event (sample if needed)
- Don't use `console.log()` in audio callbacks

## Production Build

The logger automatically:
- Disables all debug logging
- Stops buffer flushing
- Removes string formatting code
- Maintains zero overhead

## Testing Performance Impact

```bash
# Run with logging enabled
npm run dev

# Run with logging disabled (even in dev)
DISABLE_DEBUG=true npm run dev

# Compare latency measurements
```

## Migration from Current Logging

Replace:
```typescript
// Old
console.log('🎼 OSMD cursor shown');

// New (development only)
perfLogger.debug('OSMD cursor shown');
```

Replace:
```typescript
// Old
console.log(`MIDI latency: ${latency}ms`);

// New (high performance)
logMidiLatency(latency);
```

## Monitoring in Production

Since console logging is disabled in production, consider:
1. Periodic stats upload to analytics (if user consents)
2. Local storage of performance violations for support
3. User-triggered performance reports

Remember: The goal is invisible logging that helps development without impacting users.