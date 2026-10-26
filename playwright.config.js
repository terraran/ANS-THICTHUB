const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.js',
  use: { baseURL: 'http://localhost:8181', viewport: { width: 1366, height: 768 } },
  webServer: { command: 'node tests/serve.js 8181', url: 'http://localhost:8181/', reuseExistingServer: true }
});
