/**
 * Test to verify that the ConstraintError fix works for Dexie compound unique indexes
 */

import { fingeringPersistence } from '@/renderer/features/fingering/services/FingeringPersistence';
import { practiceDatabase } from '@/renderer/services/PracticeDatabase';

// Mock Dexie
jest.mock('dexie');

describe('FingeringPersistence ConstraintError Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all methods to default mocks
    practiceDatabase.fingeringAnnotations.where = jest.fn();
    practiceDatabase.fingeringAnnotations.add = jest.fn().mockResolvedValue(undefined);
    practiceDatabase.fingeringAnnotations.update = jest.fn().mockResolvedValue(undefined);
    practiceDatabase.fingeringAnnotations.put = jest.fn().mockResolvedValue(undefined);
    
    // Mock the onReady method
    jest.spyOn(fingeringPersistence, 'onReady').mockResolvedValue(undefined);
  });

  describe('saveFingering method - upsert behavior', () => {
    it('should add new record when none exists', async () => {
      const scoreId = 'test-score';
      const noteId = 'test-note';
      const finger = 3;

      // Mock the query to return no existing record
      const mockWhereChain = {
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      };
      practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);

      await fingeringPersistence.saveFingering(scoreId, noteId, finger);

      expect(practiceDatabase.fingeringAnnotations.where).toHaveBeenCalledWith('[scoreId+noteId]');
      expect(mockWhereChain.equals).toHaveBeenCalledWith([scoreId, noteId]);
      expect(practiceDatabase.fingeringAnnotations.add).toHaveBeenCalledWith({
        scoreId,
        noteId,
        finger
      });
      expect(practiceDatabase.fingeringAnnotations.update).not.toHaveBeenCalled();
    });

    it('should update existing record when one exists', async () => {
      const scoreId = 'test-score';
      const noteId = 'test-note';
      const finger = 4;
      const existingRecord = { id: 123, scoreId, noteId, finger: 2 };

      // Mock the query to return an existing record
      const mockWhereChain = {
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(existingRecord)
        })
      };
      practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);

      await fingeringPersistence.saveFingering(scoreId, noteId, finger);

      expect(practiceDatabase.fingeringAnnotations.where).toHaveBeenCalledWith('[scoreId+noteId]');
      expect(mockWhereChain.equals).toHaveBeenCalledWith([scoreId, noteId]);
      expect(practiceDatabase.fingeringAnnotations.update).toHaveBeenCalledWith(existingRecord.id, { finger });
      expect(practiceDatabase.fingeringAnnotations.add).not.toHaveBeenCalled();
    });

    it('should NOT call put() method which caused ConstraintError', async () => {
      const scoreId = 'test-score';
      const noteId = 'test-note';
      const finger = 3;

      // Mock the query to return no existing record
      const mockWhereChain = {
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      };
      practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);

      await fingeringPersistence.saveFingering(scoreId, noteId, finger);

      // Verify that put() is never called (this was causing ConstraintError)
      expect(practiceDatabase.fingeringAnnotations.put).not.toHaveBeenCalled();
    });
  });

  describe('saveFingeringsBatch method - behavior verification', () => {
    it('should not use put() method which caused ConstraintError', async () => {
      const scoreId = 'test-score';
      const fingerings = {
        'note1': 1,
        'note2': 2,
        'note3': 3
      };

      // Mock the query chain to return no existing records
      const mockWhereChain = {
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      };
      practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);

      // Mock the transaction method
      practiceDatabase.transaction = jest.fn().mockImplementation(async (mode, table, callback) => {
        return await callback();
      });

      await fingeringPersistence.saveFingeringsBatch(scoreId, fingerings);

      // The key test: put() should NEVER be called (this was causing ConstraintError)
      expect(practiceDatabase.fingeringAnnotations.put).not.toHaveBeenCalled();
      
      // We should use add() and/or update() instead
      expect(practiceDatabase.fingeringAnnotations.add).toHaveBeenCalled();
    });

    it('should demonstrate the fix works by using manual upsert pattern', async () => {
      const scoreId = 'test-score';
      const noteId = 'test-note';
      const finger = 3;

      // Mock to simulate what would have caused ConstraintError with put()
      const mockWhereChain = {
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null) // No existing record
        })
      };
      practiceDatabase.fingeringAnnotations.where = jest.fn().mockReturnValue(mockWhereChain);

      await fingeringPersistence.saveFingering(scoreId, noteId, finger);

      // Verify manual upsert pattern is used instead of put()
      expect(practiceDatabase.fingeringAnnotations.where).toHaveBeenCalledWith('[scoreId+noteId]');
      expect(mockWhereChain.equals).toHaveBeenCalledWith([scoreId, noteId]);
      expect(practiceDatabase.fingeringAnnotations.add).toHaveBeenCalledWith({
        scoreId,
        noteId,
        finger
      });
      
      // Critical: put() should never be called
      expect(practiceDatabase.fingeringAnnotations.put).not.toHaveBeenCalled();
    });
  });
});