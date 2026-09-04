const puppeteerCore = require('puppeteer-core');

// Render's free-tier containers are too constrained (missing Chromium's
// shared libs, and not enough RAM) to run puppeteer's own bundled full
// Chromium reliably — that's why every PDF endpoint returned a generic 500
// in production while working fine locally. In production this launches
// through puppeteer-core against @sparticuz/chromium instead, a Chromium
// build made specifically for constrained Linux containers; local dev keeps
// using the full `puppeteer` package, whose bundled Chromium is already
// known-good on this machine. @sparticuz/chromium ships ESM-only, so it's
// loaded via dynamic import() from this CommonJS file rather than require().
const launchBrowser = async () => {
  if (process.env.NODE_ENV === 'production') {
    const { default: chromium } = await import('@sparticuz/chromium');
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }
  // eslint-disable-next-line global-require
  const puppeteer = require('puppeteer');
  return puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
};

// Renders an HTML string to a PDF buffer. A fresh headless Chromium instance
// is launched per call — acceptable at this app's scale (a school office,
// not high traffic); not pooled/reused in this phase.
const renderHtmlToPdfBuffer = async (html, {
  format = 'A5', landscape = false, displayHeaderFooter = false, headerTemplate = '<span></span>', footerTemplate = '<span></span>',
} = {}) => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const bytes = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin: { top: displayHeaderFooter ? '40px' : '20px', bottom: displayHeaderFooter ? '40px' : '20px', left: '20px', right: '20px' },
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
    });
    return Buffer.from(bytes); // Puppeteer may return a Uint8Array; Express's res.send only special-cases a real Buffer, otherwise it JSON-stringifies it
  } finally {
    await browser.close();
  }
};

module.exports = { renderHtmlToPdfBuffer };
