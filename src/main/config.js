// Centralized configuration for file operations
// This prevents magic numbers scattered throughout the codebase

const AppConfig = {
  limits: {
    // File size limits
    MAX_COMPRESSED_FILE_SIZE_BYTES: 10 * 1024 * 1024,    // 10MB compressed
    MAX_UNCOMPRESSED_FILE_SIZE_BYTES: 25 * 1024 * 1024,  // 25MB uncompressed
    
    // IPC performance thresholds
    IPC_TRANSFER_THRESHOLD_BYTES: 3 * 1024 * 1024,       // 3MB (switch to temp file approach)
    
    // Security and DoS protection
    XML_PARSE_TIMEOUT_MS: 10000,                         // 10 seconds parsing timeout
    MAX_MEMORY_INCREASE_BYTES: 100 * 1024 * 1024,        // 100MB memory increase limit
    
    // Queue management
    MAX_CONCURRENT_FILE_OPERATIONS: 1,                   // Serialize file operations
  },
  
  // Supported file formats
  supportedExtensions: ['xml', 'musicxml', 'mxl'],
  
  // Dialog filter configuration
  dialogFilters: [
    { name: 'MusicXML Files', extensions: ['xml', 'musicxml', 'mxl'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  
  // XML parser security configuration
  xmlParserOptions: {
    processEntities: false,        // Critical: Prevents XXE attacks
    ignoreAttributes: false,       // Keep attributes for MusicXML
    allowBooleanAttributes: true,
    // Additional security options can be added here
  },
  
  // Performance monitoring
  performance: {
    IPC_LATENCY_WARNING_MS: 100,   // Warn if IPC takes longer than 100ms
    FILE_PROCESSING_WARNING_MS: 5000, // Warn if file processing takes longer than 5s
  }
};

// Export individual constants for convenience
const {
  MAX_COMPRESSED_FILE_SIZE_BYTES,
  MAX_UNCOMPRESSED_FILE_SIZE_BYTES,
  IPC_TRANSFER_THRESHOLD_BYTES
} = AppConfig.limits;

module.exports = {
  AppConfig,
  MAX_COMPRESSED_FILE_SIZE_BYTES,
  MAX_UNCOMPRESSED_FILE_SIZE_BYTES,
  IPC_TRANSFER_THRESHOLD_BYTES
};