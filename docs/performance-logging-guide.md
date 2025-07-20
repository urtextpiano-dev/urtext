# Performance Logging Guide

## Overview

Urtext Piano uses a ring-buffer based performance logging system to maintain <20ms latency while providing debugging capabilities. The system is designed to have zero impact on hot paths while still capturing critical performance metrics.

## Quick Start

### Logging Performance Metrics

```typescript
import { logMidiLatency, logAudioLatency, logRenderLatency } from '@/renderer/utils/performance-logger';

// In MIDI handler
const processingStart = performance.now();
// ... process MIDI event ...
const processingTime = performance.now() - processingStart;
logMidiLatency(processingTime);

// In audio scheduling
const schedulingStart = performance.now();
// ... schedule audio ...
const schedulingTime = performance.now() - schedulingStart;
logAudioLatency(schedulingTime);

// In render code
const renderStart = performance.now();
// ... render operation ...
const renderTime = performance.now() - renderStart;
logRenderLatency(renderTime);
```

### Debug Logging (Dev Only)

```typescript
import { perfLogger } from '@/renderer/utils/performance-logger';

// Debug messages (compiled out in production)
if (process.env.NODE_ENV === 'development') {
  perfLogger.debug('Complex calculation', { input, output });
}

// Error logging (always enabled)
perfLogger.error('Critical failure', error);

// Warning logging (always enabled)
perfLogger.warn('Performance degradation detected', { latency });
```

### Viewing Performance Stats

1. Press `Ctrl+Shift+P` to toggle overlay (dev only)
2. Check console for warnings when latency exceeds thresholds
3. Use Chrome DevTools Performance tab for detailed analysis

## Best Practices

### DO:
- Use ring buffer logging in hot paths (MIDI, audio, render loops)
- Keep timing measurements simple (start → end)
- Log errors with context objects
- Use debug logging for complex operations
- Wrap debug logs in `NODE_ENV` checks
- Use appropriate log levels (debug/warn/error)

### DON'T:
- Log in tight loops without aggregation
- Format strings in hot paths
- Use console.log directly (ESLint will catch this)
- Create objects for logging in hot paths
- Log sensitive user data
- Leave temporary debug logs in production code

### Example: Hot Path Logging

```typescript
// ❌ BAD: Allocations in hot path
function processMidiEvent(event: MidiEvent) {
  console.log(`Processing MIDI: ${event.note} at ${Date.now()}`); // String allocation!
  const metrics = []; // Array allocation!
  metrics.push(performance.now() - event.timestamp);
}

// ✅ GOOD: Zero-allocation logging
function processMidiEvent(event: MidiEvent) {
  const latency = performance.now() - event.timestamp;
  logMidiLatency(latency); // Pre-allocated ring buffer
}
```

## Architecture

### Ring Buffer Design
- **Size**: Pre-allocated Float32Array(1000)
- **Zero allocations**: No memory allocation during logging
- **Async flushing**: Updates store every 100ms via requestIdleCallback
- **Automatic overflow**: Oldest entries overwritten when full

### Performance Thresholds
- **MIDI Input → Audio**: <20ms (error), <15ms (warning)
- **Practice Evaluation**: <5ms expected
- **OSMD Initial Render**: <1s expected
- **OSMD Re-render**: <100ms expected
- **Audio Scheduling**: <2ms expected

### Hybrid Flush Strategy
The logger uses a smart flush strategy that updates the UI when:
1. **Time-based**: 250ms have elapsed
2. **Event-based**: 20 events accumulated
3. **Change-based**: Max latency increased by 10%

This reduces React re-renders from 5000/second to ~4/second while maintaining real-time visibility.

## API Reference

### Performance Loggers

#### `logMidiLatency(latency: number): void`
Log MIDI processing latency to ring buffer. Use for MIDI event processing timing.

#### `logAudioLatency(latency: number): void`
Log audio scheduling latency. Use for Web Audio API timing measurements.

#### `logRenderLatency(latency: number): void`
Log render operation latency. Use for OSMD render timing.

### Debug Logger

#### `perfLogger.debug(message: string, data?: any): void`
Development-only debug logging. Automatically stripped in production builds.

#### `perfLogger.warn(message: string, data?: any): void`
Warning logging for unexpected conditions. Always enabled.

#### `perfLogger.error(message: string, error?: Error): void`
Error logging with stack traces. Always enabled.

## Testing

### Run Performance Tests
```bash
# Run performance benchmark
node scripts/bench-latency.js

# Run with performance monitoring
npm run dev
# Then press Ctrl+Shift+P to show overlay
```

### Verify Zero Console Usage
```bash
# Check for console.log statements (should be 0 in hot paths)
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -E "(useMidi|WebAudio|MidiService)"
```

## Migration from Console.log

If you're updating existing code:

```typescript
// Old pattern
console.log('MIDI event:', event);
console.error('Failed:', error);
console.log(`Latency: ${time}ms`);

// New pattern
perfLogger.debug('MIDI event received', event);
perfLogger.error('Operation failed', error);
logMidiLatency(time);
```

## Troubleshooting

### Performance Overlay Not Showing
- Ensure you're in development mode (`NODE_ENV=development`)
- Check that the overlay component is imported in App.tsx
- Try refreshing the page and pressing Ctrl+Shift+P

### Latency Measurements Seem Wrong
- Verify you're measuring the correct start/end points
- Check that timestamps are from the same time source (performance.now())
- Ensure you're not including unrelated operations in the measurement

### High Memory Usage
- Check ring buffer size in performance-logger.ts
- Verify flush cycle is running (should see periodic store updates)
- Look for memory leaks in event handlers

## Future Enhancements

Planned improvements:
- Remote performance monitoring
- Latency histograms
- Performance regression detection
- Automated performance reports