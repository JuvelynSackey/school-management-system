const puppeteer = require('puppeteer');

// Renders an HTML string to a PDF buffer. A fresh headless Chromium instance
// is launched per call — acceptable at this app's scale (a school office,
// not high traffic); not pooled/reused in this phase.
const renderHtmlToPdfBuffer = async (html, {
  format = 'A5', landscape = false, displayHeaderFooter = false, headerTemplate = '<span></span>', footerTemplate = '<span></span>',
} = {}) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
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
