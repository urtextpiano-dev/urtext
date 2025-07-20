/**
 * Simple Logger with Deduplication for Urtext Piano
 * 
 * Solves React StrictMode duplicate logs and provides clean categorized output.
 * No external dependencies, no configuration - just clean logs.
 * 
 * To bypass deduplication for a specific log:
 * logger.log('MIDI', `Message ${Date.now()}`) // Dynamic content won't dedupe
 */

import { IS_DEVELOPMENT } from './env';

const ENABLE_LOGGING = IS_DEVELOPMENT;

// Simple deduplication for StrictMode
let lastLogKey = '';
let lastLogTime = 0;
const DEDUPE_WINDOW = 50; // ms

export type LogCategory = 'SYSTEM' | 'MIDI' | 'OSMD' | 'PRACTICE' | 'AUDIO';

class SimpleLogger {
  private shouldLog(category: LogCategory, message: string): boolean {
    if (!ENABLE_LOGGING) return false;
    
    // Skip deduplication for messages with dynamic content (numbers)
    const hasDynamicContent = /\d/.test(message);
    if (hasDynamicContent) return true;
    
    // Create key with partial hash to prevent collisions
    const key = `${category}:${message}:${this.simpleHash(message)}`;
    const now = Date.now();
    
    if (key === lastLogKey && now - lastLogTime < DEDUPE_WINDOW) {
      return false; // Skip duplicate
    }
    
    lastLogKey = key;
    lastLogTime = now;
    return true;
  }
  
  // Simple hash to prevent category:message collisions
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  log(category: LogCategory, message: string, data?: any) {
    if (!this.shouldLog(category, message)) return;
    
    const prefix = `[${category}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  // Convenience methods for common categories
  midi(message: string, data?: any) {
    this.log('MIDI', message, data);
  }

  osmd(message: string, data?: any) {
    this.log('OSMD', message, data);
  }

  practice(message: string, data?: any) {
    this.log('PRACTICE', message, data);
  }

  audio(message: string, data?: any) {
    this.log('AUDIO', message, data);
  }

  system(message: string, data?: any) {
    this.log('SYSTEM', message, data);
  }
}

export const logger = new SimpleLogger();