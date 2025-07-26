#!/usr/bin/env npx tsx

/**
 * Telemetry Validation Test
 * Validate telemetry implementation
 */

import { Worker } from 'worker_threads';
import * as path from 'path';

async function testTelemetry() {
  console.log('🔍 Testing Telemetry System');
  console.log('===========================');
  
  // Set development environment to enable telemetry
  process.env.NODE_ENV = 'development';
  
  const workerPath = path.join(__dirname, '../src/main/workers/fileProcessor.ts');
  const testFilePath = path.join(__dirname, '../__fixtures__/corpus/small.xml');
  
  console.log(`Worker path: ${workerPath}`);
  console.log(`Test file: ${testFilePath}`);
  
  const worker = new Worker(workerPath, {
    workerData: { filePath: testFilePath, jobId: 'telemetry-test' },
    execArgv: ['--require', 'ts-node/register']
  });

  let telemetryReceived = false;

  worker.on('message', (result) => {
    if (result.__telemetry) {
      console.log('✅ Telemetry message received:', result.type);
      telemetryReceived = true;
    } else {
      console.log('📄 Worker result:', result.success ? 'SUCCESS' : 'FAILED');
    }
  });

  worker.on('error', (error) => {
    console.error('❌ Worker error:', error.message);
  });

  worker.on('exit', (code) => {
    console.log(`🏁 Worker exited with code: ${code}`);
    console.log(`📊 Telemetry working: ${telemetryReceived ? 'YES' : 'NO'}`);
    
    if (telemetryReceived) {
      console.log('🎉 Telemetry fix successful - validated!');
    } else {
      console.log('⚠️  Telemetry still not working - needs investigation');
    }
  });

  // Wait a few seconds for the test
  setTimeout(() => {
    worker.terminate();
  }, 5000);
}

if (require.main === module) {
  testTelemetry().catch(console.error);
}