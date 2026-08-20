// Puppeteer ships as an ESM package (its entry re-exports puppeteer-core via
// `export * from`), which Jest's default CommonJS transform can't parse when
// it's pulled in transitively (fees/terminalReports controllers -> pdf.service.js
// -> require('puppeteer')). None of this test suite exercises actual PDF
// generation, so this stub satisfies pdf.service.js's module-level require
// and the shape it calls (launch -> newPage -> setContent/pdf -> close)
// without ever needing a real browser in CI/test runs.
module.exports = {
  launch: async () => ({
    newPage: async () => ({
      setContent: async () => {},
      pdf: async () => Buffer.from('%PDF-mock%'),
    }),
    close: async () => {},
  }),
};
