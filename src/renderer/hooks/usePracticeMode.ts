/**
 * Practice Mode Hook
 * 
 * Manages practice mode initialization and repeat warnings.
 * Extracted from App.tsx to isolate practice-specific logic.
 */

import { useState } from 'react';
import { usePracticeStore } from '@/renderer/features/practice-mode/stores/practiceStore';
import { usePracticeController } from '@/renderer/features/practice-mode/hooks';
import { useOSMDContext } from '@/renderer/contexts/OSMDContext';
import { perfLogger } from '@/renderer/utils/performance-logger';

interface UsePracticeModeReturn {
  isPracticeActive: boolean;
  osmdReady: boolean;
  practiceController: ReturnType<typeof usePracticeController>;
  showRepeatWarning: boolean;
  handleStartPractice: () => void;
  handleRepeatWarningProceed: () => void;
  handleRepeatWarningCancel: () => void;
  debugButtonState: () => Record<string, any>;
}

export function usePracticeMode(): UsePracticeModeReturn {
  const [showRepeatWarning, setShowRepeatWarning] = useState(false);
  const { isReady: osmdReady, controls: osmdControls, osmd, detectRepeats, validateState } = useOSMDContext();
  const { isActive: isPracticeActive } = usePracticeStore();
  const practiceController = usePracticeController();

  const debugButtonState = () => {
    const state = {
      osmdReady,
      hasControls: !!osmdControls,
      isPracticeActive,
      hasOsmd: !!osmd,
      practiceStoreState: usePracticeStore.getState()
    };
    perfLogger.debug('[App] Button state debug:', state);
    return state;
  };

  const handleStartPractice = () => {
    perfLogger.debug('[App] handleStartPractice called');
    
    const currentState = {
      osmdReady,
      hasControls: !!osmdControls,
      controlsKeys: osmdControls ? Object.keys(osmdControls) : [],
      isPracticeActive,
      osmdInstance: !!osmd
    };
    perfLogger.debug('[App] Current state:', currentState);
    
    if (!osmdReady) {
      perfLogger.error('[App] OSMD not ready yet');
      return;
    }
    
    if (!osmdControls) {
      perfLogger.error('[App] OSMD controls not available');
      
      const isStateValid = validateState();
      perfLogger.debug('[App] State validation result:', isStateValid);
      
      if (osmd) {
        perfLogger.debug('[App] OSMD instance exists, attempting recovery...');
        setTimeout(() => {
          const newState = validateState();
          if (newState && osmdControls) {
            perfLogger.debug('[App] State recovered, retrying start practice');
            handleStartPractice();
          } else {
            perfLogger.error('[App] Failed to recover state');
          }
        }, 100);
      }
      return;
    }
    
    try {
      if (detectRepeats && typeof detectRepeats === 'function') {
        const repeats = detectRepeats();
        
        if (repeats && repeats.length > 0) {
          const practiceState = usePracticeStore.getState();
          const { repeatsEnabled, repeatsFailed } = practiceState;
          
          if (practiceState.repeatWarningDismissed && repeatsEnabled && !repeatsFailed) {
            practiceController.startPractice();
          } else if (!practiceState.repeatWarningDismissed && (!repeatsEnabled || repeatsFailed)) {
            setShowRepeatWarning(true);
          } else {
            practiceController.startPractice();
          }
        } else {
          practiceController.startPractice();
        }
      } else {
        practiceController.startPractice();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      perfLogger.error('[App] Error in handleStartPractice:', error);
      throw err; // Let parent handle the error
    }
  };

  const handleRepeatWarningProceed = () => {
    setShowRepeatWarning(false);
    practiceController.startPractice();
  };

  const handleRepeatWarningCancel = () => {
    setShowRepeatWarning(false);
  };

  return {
    isPracticeActive,
    osmdReady,
    practiceController,
    showRepeatWarning,
    handleStartPractice,
    handleRepeatWarningProceed,
    handleRepeatWarningCancel,
    debugButtonState
  };
}