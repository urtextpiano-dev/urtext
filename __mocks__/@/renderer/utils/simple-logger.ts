// Mock for simple-logger module
export const logger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  practice: jest.fn()
};

export type LogCategory = 'midi' | 'osmd' | 'practice' | 'performance' | 'general';