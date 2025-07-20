const { Transform } = require('stream');

/**
 * Custom Transform stream that monitors data size to prevent zip bomb attacks
 * Throws an error if the accumulated data size exceeds the specified limit
 */
class SizeCheckStream extends Transform {
  constructor(maxSize) {
    super();
    if (typeof maxSize !== 'number' || maxSize <= 0) {
      throw new Error('SizeCheckStream: maxSize must be a positive number');
    }
    this.accumulatedSize = 0;
    this.maxSize = maxSize;
  }

  _transform(chunk, encoding, callback) {
    this.accumulatedSize += chunk.length;

    if (this.accumulatedSize > this.maxSize) {
      // This will destroy the entire pipeline and trigger cleanup
      const error = new Error(
        `Uncompressed file exceeds limit of ${Math.round(this.maxSize / 1024 / 1024)}MB (current: ${Math.round(this.accumulatedSize / 1024 / 1024)}MB)`
      );
      callback(error);
      return;
    }

    // Pass the data through to the next stream in the pipeline
    callback(null, chunk);
  }

  /**
   * Get the current accumulated size (useful for progress tracking)
   */
  getCurrentSize() {
    return this.accumulatedSize;
  }
}

// Factory function for easier usage
function createSizeCheckStream(maxSize) {
  return new SizeCheckStream(maxSize);
}

module.exports = {
  SizeCheckStream,
  createSizeCheckStream
};