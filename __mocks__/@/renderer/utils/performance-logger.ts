// Mock for performance-logger module
export const perfLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

export const logMidiLatency = jest.fn();
export const logAudioLatency = jest.fn();
export const logRenderLatency = jest.fn();