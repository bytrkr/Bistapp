import { SelfHealer } from '../services/selfHealer.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('--- Running Test 2: Self-Healer Diagnosis ---');
  
  // Mock error payload
  const mockError = {
    message: 'Test error',
    stack: 'Error: Test error at test.ts:1:1'
  };
  
  const logPath = path.join(process.cwd(), 'forensicToon.json');
  fs.writeFileSync(logPath, JSON.stringify([{ status: 'REQUIRES_REPAIR', error: mockError }]));
  
  try {
    await SelfHealer.diagnoseAndPatch();
    console.log('PASSED: Self-Healer diagnosis completed without errors.');
  } catch (e) {
    console.error('FAILED: Self-Healer diagnosis failed:', e);
  }
}

runTest();
