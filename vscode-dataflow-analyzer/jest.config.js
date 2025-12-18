module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2020',
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }],
  },
  // Exclude compiled output directory to avoid duplicate mocks and syntax errors
  testPathIgnorePatterns: ['<rootDir>/out/', '<rootDir>/node_modules/'],
  modulePathIgnorePatterns: ['<rootDir>/out/'],
  // Ensure Jest doesn't try to transform files in out directory
  transformIgnorePatterns: ['<rootDir>/out/'],
  // Exclude out directory from Jest's haste map to prevent duplicate mock detection
  watchPathIgnorePatterns: ['<rootDir>/out/'],
  // Explicitly tell Jest to ignore the out directory
  haste: {
    ignorePattern: /out\//,
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  testTimeout: 30000, // 30 seconds timeout for tests
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Note: Jest automatically sets NODE_ENV=test, which is used by LoggingConfig
  // to suppress warnings during test runs
};

