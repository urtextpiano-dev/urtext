# Test Execution Guide - 88-Key Visual Piano

## Quick Start

### Initial Test Run (Verify RED State)
```bash
# Run all piano tests - expect all to fail
npm test __tests__/features/88-key-visual-piano

# You should see ~40+ failing tests
# This confirms we're in the RED phase of TDD
```

## Phase 1 Implementation Guide

### Step 1: Core Utilities
```bash
# Start with the foundation
npm test __tests__/features/88-key-visual-piano/phase-1/pianoUtils.test.ts -- --watch
```

**Implementation Path**:
1. Create `src/renderer/utils/pianoUtils.ts`
2. Implement `generatePianoKeys()` function
3. Tests should turn GREEN one by one

### Step 2: React Hook
```bash
# After pianoUtils is GREEN
npm test __tests__/features/88-key-visual-piano/phase-1/usePiano.test.ts -- --watch
```

**Implementation Path**:
1. Create `src/renderer/hooks/usePiano.ts`
2. Import and use `generatePianoKeys()`
3. Add `useMemo` for performance

### Step 3: PianoKey Component
```bash
# Component test
npm test __tests__/features/88-key-visual-piano/phase-1/PianoKey.test.tsx -- --watch
```

**Implementation Path**:
1. Create `src/renderer/components/PianoKey.tsx`
2. Implement accessible button with proper ARIA
3. Apply BEM CSS classes

### Step 4: PianoKeyboard Container
```bash
# Main component test
npm test __tests__/features/88-key-visual-piano/phase-1/PianoKeyboard.test.tsx -- --watch
```

**Implementation Path**:
1. Create `src/renderer/components/PianoKeyboard.tsx`
2. Create `src/renderer/components/PianoKeyboard.css`
3. Implement CSS Grid layout (52 columns)

### Step 5: Integration & Edge Cases
```bash
# Run integration tests
npm test __tests__/features/88-key-visual-piano/phase-1/integration.test.tsx
npm test __tests__/features/88-key-visual-piano/phase-1/edge-cases.test.tsx
```

## Phase 2 Implementation Guide

### Prerequisites
- All Phase 1 tests must be GREEN
- Phase 1 refactoring complete

### Execution Order
```bash
# 1. Landmark identification
npm test __tests__/features/88-key-visual-piano/phase-2/landmarks.test.ts -- --watch

# 2. Navigation implementation
npm test __tests__/features/88-key-visual-piano/phase-2/navigation.test.tsx -- --watch

# 3. Visual feedback
npm test __tests__/features/88-key-visual-piano/phase-2/visual-feedback.test.tsx -- --watch

# 4. Phase 2 integration
npm test __tests__/features/88-key-visual-piano/phase-2/integration.test.tsx
```

## Phase 3 Implementation Guide

### Prerequisites
- Phases 1 & 2 complete and GREEN
- Performance baseline established

### Execution Order
```bash
# 1. Performance optimization
npm test __tests__/features/88-key-visual-piano/phase-3/optimization.test.tsx -- --watch

# 2. Responsive design
npm test __tests__/features/88-key-visual-piano/phase-3/responsive.test.tsx -- --watch

# 3. Production safety
npm test __tests__/features/88-key-visual-piano/phase-3/production-safety.test.tsx -- --watch

# 4. Bundle size verification
npm test __tests__/features/88-key-visual-piano/phase-3/bundle.test.ts
```

## Continuous Integration

### Full Test Suite
```bash
# Run all tests with coverage
npm test -- --coverage --coveragePathPattern="src/renderer/(components|hooks|utils)/[Pp]iano"

# Generate coverage report
npm test -- --coverage --coverageReporters=html
```

### Performance Testing
```bash
# Run performance benchmarks
npm test __tests__/features/88-key-visual-piano/phase-3/optimization.test.tsx -- --verbose
```

## Debugging Failed Tests

### Common Issues

1. **Import Errors**
   ```bash
   # Check that implementation files exist
   ls -la src/renderer/components/Piano*
   ls -la src/renderer/hooks/usePiano*
   ls -la src/renderer/utils/pianoUtils*
   ```

2. **CSS Not Loading**
   ```bash
   # Verify CSS is imported in component
   grep -n "import.*\.css" src/renderer/components/PianoKeyboard.tsx
   ```

3. **Type Errors**
   ```bash
   # Run TypeScript check
   npm run type-check
   ```

## Test Patterns

### Running Specific Test Cases
```bash
# Run a single test by name
npm test -- -t "should generate exactly 88 keys"

# Run tests matching pattern
npm test -- -t "black key"
```

### Updating Snapshots (if any)
```bash
# Update snapshots after intentional changes
npm test -- -u
```

## Verification Checklist

### After Each Phase
- [ ] All tests GREEN
- [ ] No console errors/warnings
- [ ] Coverage meets targets
- [ ] TypeScript compilation clean
- [ ] Lint passes

### Before Moving to Next Phase
- [ ] Refactoring complete
- [ ] Code review done
- [ ] Documentation updated
- [ ] Performance verified

## Tips for TDD Success

1. **Stay in RED until ready**
   - Don't implement until all tests are written
   - Verify tests fail for the right reason

2. **Make it GREEN quickly**
   - Write minimal code to pass
   - Don't over-engineer

3. **REFACTOR immediately**
   - Clean up once GREEN
   - Keep tests passing

4. **Small steps**
   - One test at a time
   - Frequent commits

5. **Trust the process**
   - Tests guide the design
   - Simple implementation emerges