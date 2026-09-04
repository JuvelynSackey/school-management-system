module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // puppeteer (local dev) and puppeteer-core (production, via
  // @sparticuz/chromium) are both ESM packages Jest can't parse when pulled
  // in transitively via the results/fees controllers -> pdf.service.js;
  // nothing in this suite generates a real PDF, so both are stubbed out.
  moduleNameMapper: {
    '^puppeteer$': '<rootDir>/tests/mocks/puppeteer.js',
    '^puppeteer-core$': '<rootDir>/tests/mocks/puppeteer.js',
  },
  // Each test file starts its own in-memory MongoDB instance (see
  // tests/testServer.js) — running files in parallel is fine since they
  // never share a database, but a generous timeout accounts for the first
  // Puppeteer/Mongo binary warm-up in a fresh environment.
  testTimeout: 30000,
  verbose: true,
};
