/**
 * Production Practice Mode Component
 * 
 * Integration component that combines all Phase 3 production features.
 * This is primarily for integration testing purposes.
 */

import React, { useEffect } from 'react';
import { PracticeStats } from './PracticeStats';
import { SessionPersistence } from '../services/SessionPersistence';
import { SimpleAdaptiveDifficulty } from '../services/SimpleAdaptiveDifficulty';
import { usePracticeStore } from '../stores/practiceStore';

export function ProductionPracticeMode() {
  const { isActive } = usePracticeStore();
  const [sessionId, setSessionId] = React.useState<number | null>(null);
  
  // Initialize services
  const persistenceRef = React.useRef(new SessionPersistence());
  const adaptiveRef = React.useRef(new SimpleAdaptiveDifficulty());
  
  // Start session when practice mode activates
  useEffect(() => {
    if (isActive && !sessionId) {
      persistenceRef.current.startSession('test-score').then(id => {
        setSessionId(id);
      });
    } else if (!isActive && sessionId) {
      persistenceRef.current.endSession();
      setSessionId(null);
    }
  }, [isActive, sessionId]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Services cleanup if needed
    };
  }, []);
  
  return (
    <div className="production-practice-mode">
      <PracticeStats />
      {/* Other production components would go here */}
    </div>
  );
}