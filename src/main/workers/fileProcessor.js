// JavaScript wrapper for TypeScript worker
// This allows Worker threads to load TypeScript files in development

// Enable ts-node for this worker thread
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'CommonJS'
    }
  });
  // Load TypeScript source in development
  module.exports = require('./fileProcessor.ts');
} else {
  // Load compiled JavaScript in production
  module.exports = require('../../../dist/main/workers/fileProcessor.js');
}