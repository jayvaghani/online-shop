/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/test' // Look for tests in the test directory
  ],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Collect coverage information
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  // Optional: Configure coverage thresholds
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: -10,
  //   },
  // },
};
