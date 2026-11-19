/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: '<rootDir>/src/test/jsdomEnvironment.cjs',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  // Every test starts with fresh mocks (no leaked mockResolvedValueOnce queues)
  resetMocks: true,
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test/styleMock.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: { '^.+\\.[cm]?[jt]sx?$': 'babel-jest' },
  // react-router (and its deps) ship ESM only, so they must be transpiled too
  transformIgnorePatterns: ['/node_modules/(?!(react-router|@remix-run|cookie-es)/)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/test/**', '!src/**/__mocks__/**', '!src/**/*.d.ts'],
}
