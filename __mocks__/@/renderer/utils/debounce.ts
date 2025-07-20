// Mock for debounce utility
export const useDebounce = jest.fn((value, delay) => {
  // Return the value directly for tests - no actual debouncing
  return value;
});