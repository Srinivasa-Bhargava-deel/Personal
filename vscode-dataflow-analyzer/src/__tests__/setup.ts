// Jest setup file for tests
// This file runs before all tests

// Ensure NODE_ENV is set to 'test' for proper test environment detection
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
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

