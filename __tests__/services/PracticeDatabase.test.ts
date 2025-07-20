/**
 * Tests for shared Practice Database
 */

import { practiceDatabase } from '@/renderer/services/PracticeDatabase';
import { fingeringPersistence } from '@/renderer/features/fingering/services/FingeringPersistence';
import { SessionPersistence } from '@/renderer/features/practice-mode/services/SessionPersistence';

// Mock Dexie
jest.mock('dexie');

describe('PracticeDatabase', () => {
  it('should be a singleton instance', () => {
    // Both services should use the same database instance
    const sessionPersistence = new SessionPersistence();
    const fingeringPersistenceDb = fingeringPersistence.getDatabase();
    
    // They should reference the same database instance
    expect(fingeringPersistenceDb).toBe(practiceDatabase);
  });
  
  it('should have both sessions and fingeringAnnotations tables', () => {
    expect(practiceDatabase.sessions).toBeDefined();
    expect(practiceDatabase.fingeringAnnotations).toBeDefined();
  });
  
  it('should allow FingeringPersistence to access fingeringAnnotations table (new record)', async () => {
    const scoreId = 'test-score';
    const noteId = 'test-note';
    const finger = 3;
    
    // Mock the where().equals().first() chain to return no existing record
    const mockWhereChain = {
      equals: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(null)
      })
    };
    practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);
    
    // This should not throw an error
    await expect(
      fingeringPersistence.saveFingering(scoreId, noteId, finger)
    ).resolves.not.toThrow();
    
    // Verify the new upsert pattern was used
    expect(practiceDatabase.fingeringAnnotations.where).toHaveBeenCalledWith('[scoreId+noteId]');
    expect(mockWhereChain.equals).toHaveBeenCalledWith([scoreId, noteId]);
    expect(practiceDatabase.fingeringAnnotations.add).toHaveBeenCalledWith({
      scoreId,
      noteId,
      finger
    });
  });

  it('should allow FingeringPersistence to update existing records', async () => {
    const scoreId = 'test-score';
    const noteId = 'test-note';
    const finger = 4;
    const existingRecord = { id: 123, scoreId, noteId, finger: 2 };
    
    // Mock the where().equals().first() chain to return an existing record
    const mockWhereChain = {
      equals: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(existingRecord)
      })
    };
    practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);
    
    // This should not throw an error
    await expect(
      fingeringPersistence.saveFingering(scoreId, noteId, finger)
    ).resolves.not.toThrow();
    
    // Verify the update path was used
    expect(practiceDatabase.fingeringAnnotations.where).toHaveBeenCalledWith('[scoreId+noteId]');
    expect(mockWhereChain.equals).toHaveBeenCalledWith([scoreId, noteId]);
    expect(practiceDatabase.fingeringAnnotations.update).toHaveBeenCalledWith(existingRecord.id, { finger });
  });
  
  it('should allow SessionPersistence to access sessions table', async () => {
    const sessionPersistence = new SessionPersistence();
    const scoreId = 'test-score';
    
    // This should not throw an error
    await expect(
      sessionPersistence.startSession(scoreId)
    ).resolves.toBe(1);
    
    // Verify the mock was called
    expect(practiceDatabase.sessions.add).toHaveBeenCalled();
  });
});