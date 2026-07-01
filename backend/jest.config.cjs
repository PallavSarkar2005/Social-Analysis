module.exports = {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
