// Jest setup file for tests
// This file runs before all tests

// Ensure NODE_ENV is set to 'test' for proper test environment detection
// This must be set before any modules are imported
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
  // Also set JEST_WORKER_ID if available
  if (!process.env.JEST_WORKER_ID && typeof (global as any).jest !== 'undefined') {
    process.env.JEST_WORKER_ID = '1';
  }
}

// Mock console methods if needed
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

