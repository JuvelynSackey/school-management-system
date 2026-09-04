// Both puppeteer (local dev) and puppeteer-core (production) ship as ESM
// packages, which Jest's default CommonJS transform can't parse when pulled
// in transitively (fees/terminalReports controllers -> pdf.service.js ->
// require('puppeteer-core')). None of this test suite exercises actual PDF
// generation, so this one stub satisfies pdf.service.js's module-level
// require and the shape it calls (launch -> newPage -> setContent/pdf ->
// close) for both packages, without ever needing a real browser in CI/test
// runs.
module.exports = {
  launch: async () => ({
    newPage: async () => ({
      setContent: async () => {},
      pdf: async () => Buffer.from('%PDF-mock%'),
    }),
    close: async () => {},
  }),
};
