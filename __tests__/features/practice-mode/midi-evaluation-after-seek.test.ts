/**
 * Test: MIDI Evaluation After Seek Fix
 * 
 * Verifies that the critical fix ensures proper state machine synchronization
 * after seeking to a measure, enabling MIDI input evaluation to work correctly.
 */

import { renderHook, act } from '@testing-library/react';
import { usePracticeControllerV2 } from '../../../src/renderer/features/practice-mode/hooks/usePracticeController.v2';

// Mock the OSMD context
const mockOSMDContext = {
  osmd: {
    cursor: {
      hidden: false,
      show: jest.fn(),
      update: jest.fn(),
      iterator: {
        currentMeasureIndex: 0
      },
      NotesUnderCursor: jest.fn(() => [{ pitch: { fundamentalNote: 'G', octave: 4 } }])
    }
  },
  controls: {},
  isReady: true,
  measureTimeline: {
    seekToMeasure: jest.fn(() => true),
    getMeasureCount: jest.fn(() => 10)
  }
};

jest.mock('../../../src/renderer/contexts/OSMDContext', () => ({
  useOSMDContext: () => mockOSMDContext
}));

// Mock the MIDI context
jest.mock('../../../src/renderer/contexts/MidiContext', () => ({
  useMidiContext: () => ({
    subscribeMidiEvents: jest.fn()
  })
}));

// Mock practice store
const mockPracticeStore = {
  setCurrentStep: jest.fn(),
  setCurrentMeasure: jest.fn(),
  setLastValidMeasureIndex: jest.fn(),
  getCurrentOptimizedStep: jest.fn(() => ({
    id: 'm2-s1',
    notes: [{ midiValue: 67 }],
    measureIndex: 1,
    isChord: false,
    isRest: false
  }))
};

jest.mock('../../../src/renderer/features/practice-mode/stores/practiceStore', () => ({
  usePracticeStore: {
    getState: () => mockPracticeStore
  }
}));

// Mock other dependencies
jest.mock('../../../src/renderer/utils/simple-logger', () => ({
  logger: { practice: jest.fn() }
}));

jest.mock('../../../src/renderer/utils/performance-logger', () => ({
  perfLogger: { 
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../../../src/renderer/features/practice-mode/providers/TempoServicesProvider', () => ({
  useTempoServices: () => ({
    scheduler: { scheduleCallback: jest.fn() }
  })
}));

jest.mock('../../../src/renderer/utils/practice/typeGuards', () => ({
  isPracticeStep: jest.fn(() => true)
}));

jest.mock('@/renderer/utils/env', () => ({
  isDev: false
}));

describe('MIDI Evaluation After Seek Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should dispatch ADVANCE_DONE to state machine after successful seek', async () => {
    const { result } = renderHook(() => usePracticeControllerV2());
    
    // Capture the dispatch function calls
    const dispatchCalls: any[] = [];
    const originalDispatch = result.current.dispatch;
    
    // Mock dispatch to capture calls
    result.current.dispatch = jest.fn((action) => {
      dispatchCalls.push(action);
      return originalDispatch(action);
    });

    await act(async () => {
      // Call seekToMeasureAndSync (the fixed function)
      const success = await result.current.seekToMeasureAndSync(1);
      
      // Should succeed
      expect(success).toBe(true);
    });

    // Verify ADVANCE_DONE was dispatched with the step
    const advanceDoneCall = dispatchCalls.find(call => call.type === 'ADVANCE_DONE');
    expect(advanceDoneCall).toBeDefined();
    expect(advanceDoneCall.payload.nextStep).toBeDefined();
    expect(advanceDoneCall.payload.nextStep.id).toBe('m2-s1');
  });

  test('should update both Zustand store and state machine', async () => {
    const { result } = renderHook(() => usePracticeControllerV2());

    await act(async () => {
      await result.current.seekToMeasureAndSync(1);
    });

    // Verify Zustand store was updated
    expect(mockPracticeStore.setCurrentStep).toHaveBeenCalled();
    expect(mockPracticeStore.setCurrentMeasure).toHaveBeenCalledWith(1);
    
    // Verify measure timeline was called  
    expect(mockOSMDContext.measureTimeline.seekToMeasure).toHaveBeenCalledWith(1, expect.any(Object));
  });
});