/**
 * Shared Dexie mock for all tests
 */

// Create mock table factory with storage
export const createMockTable = () => {
  const storage: any[] = [];
  let idCounter = 1;
  
  return {
    add: jest.fn().mockImplementation(async (item: any) => {
      const id = idCounter++;
      storage.push({ ...item, id });
      return id;
    }),
    get: jest.fn().mockImplementation(async (id: number) => {
      return storage.find(item => item.id === id);
    }),
    put: jest.fn().mockImplementation(async (item: any) => {
      const existingIndex = storage.findIndex(
        stored => stored.scoreId === item.scoreId && stored.noteId === item.noteId
      );
      if (existingIndex >= 0) {
        storage[existingIndex] = { ...storage[existingIndex], ...item };
      } else {
        const id = item.id || idCounter++;
        storage.push({ ...item, id });
      }
      return item.id || idCounter - 1;
    }),
    bulkPut: jest.fn().mockImplementation(async (items: any[]) => {
      items.forEach(item => {
        const existingIndex = storage.findIndex(
          stored => stored.scoreId === item.scoreId && stored.noteId === item.noteId
        );
        if (existingIndex >= 0) {
          storage[existingIndex] = { ...storage[existingIndex], ...item };
        } else {
          const id = item.id || idCounter++;
          storage.push({ ...item, id });
        }
      });
      return items.map(item => item.id || idCounter - 1);
    }),
    where: jest.fn().mockImplementation((field: string) => ({
      equals: jest.fn().mockImplementation((value: any) => ({
        toArray: jest.fn().mockImplementation(async () => {
          // Handle compound index format [scoreId+noteId]
          if (field === '[scoreId+noteId]' && Array.isArray(value)) {
            const [scoreId, noteId] = value;
            return storage.filter(item => item.scoreId === scoreId && item.noteId === noteId);
          }
          return storage.filter(item => item[field] === value);
        }),
        first: jest.fn().mockImplementation(async () => {
          // Handle compound index format [scoreId+noteId]
          if (field === '[scoreId+noteId]' && Array.isArray(value)) {
            const [scoreId, noteId] = value;
            return storage.find(item => item.scoreId === scoreId && item.noteId === noteId);
          }
          return storage.find(item => item[field] === value);
        }),
        delete: jest.fn().mockImplementation(async () => {
          let toDelete: any[];
          // Handle compound index format [scoreId+noteId]
          if (field === '[scoreId+noteId]' && Array.isArray(value)) {
            const [scoreId, noteId] = value;
            toDelete = storage.filter(item => item.scoreId === scoreId && item.noteId === noteId);
          } else {
            toDelete = storage.filter(item => item[field] === value);
          }
          toDelete.forEach(item => {
            const index = storage.indexOf(item);
            if (index >= 0) storage.splice(index, 1);
          });
          return toDelete.length;
        }),
        count: jest.fn().mockImplementation(async () => {
          // Handle compound index format [scoreId+noteId]
          if (field === '[scoreId+noteId]' && Array.isArray(value)) {
            const [scoreId, noteId] = value;
            return storage.filter(item => item.scoreId === scoreId && item.noteId === noteId).length;
          }
          return storage.filter(item => item[field] === value).length;
        }),
        reverse: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
      }))
    })),
    reverse: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(storage[0]),
    toArray: jest.fn().mockResolvedValue(storage),
    update: jest.fn().mockImplementation(async (id: number, updates: any) => {
      const index = storage.findIndex(item => item.id === id);
      if (index >= 0) {
        storage[index] = { ...storage[index], ...updates };
        return 1;
      }
      return 0;
    }),
    bulkDelete: jest.fn().mockImplementation(async (ids: number[]) => {
      ids.forEach(id => {
        const index = storage.findIndex(item => item.id === id);
        if (index >= 0) storage.splice(index, 1);
      });
    }),
    bulkAdd: jest.fn().mockImplementation(async (items: any[]) => {
      const ids: number[] = [];
      items.forEach(item => {
        const id = idCounter++;
        storage.push({ ...item, id });
        ids.push(id);
      });
      return ids;
    }),
    filter: jest.fn().mockReturnThis(),
    delete: jest.fn().mockImplementation(async () => {
      const count = storage.length;
      storage.length = 0;
      return count;
    }),
    count: jest.fn().mockResolvedValue(storage.length),
    clear: jest.fn().mockImplementation(async () => {
      storage.length = 0;
    }),
  };
};

// Mock Dexie class
export default class MockDexie {
  sessions: any;
  fingeringAnnotations: any;
  private static instances: Map<string, MockDexie> = new Map();
  
  constructor(name: string) {
    // Return existing instance for singleton pattern
    const existing = MockDexie.instances.get(name);
    if (existing) {
      return existing;
    }
    
    // Initialize tables in constructor
    this.sessions = createMockTable();
    this.fingeringAnnotations = createMockTable();
    
    // Store instance
    MockDexie.instances.set(name, this);
  }
  
  version() { 
    // Chain support
    return this; 
  }
  
  stores() { 
    // Chain support - also ensure tables are initialized
    if (!this.sessions) {
      this.sessions = createMockTable();
    }
    if (!this.fingeringAnnotations) {
      this.fingeringAnnotations = createMockTable();
    }
    return this; 
  }
  
  table(name: string) {
    if (name === 'sessions') return this.sessions;
    if (name === 'fingeringAnnotations') return this.fingeringAnnotations;
    return createMockTable();
  }
  
  open() { 
    // Ensure tables are initialized on open
    if (!this.sessions) {
      this.sessions = createMockTable();
    }
    if (!this.fingeringAnnotations) {
      this.fingeringAnnotations = createMockTable();
    }
    return Promise.resolve(); 
  }
}

// Export mock Table class
export class Table {}

// Helper to reset mock state between tests
export const resetMockDexie = () => {
  MockDexie.instances.clear();
};