import puppeteer, { type Browser } from 'puppeteer-core';

// HTML → PDF with headless Chromium (AD-119). One browser per process, opened on the first
// generation and reused; each document uses its own page, closed when done.
export type PdfDocument = { html: string; headerTemplate: string; footerTemplate: string };

export type PdfRenderer = { render: (document: PdfDocument) => Promise<Buffer> };

export const createChromiumPdfRenderer = (executablePath: string): PdfRenderer => {
  let browser: Promise<Browser> | undefined;

  const getBrowser = (): Promise<Browser> => {
    browser ??= puppeteer
      // Root in the container: no sandbox; Docker's /dev/shm is too small for Chromium.
      .launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
      .then((launched) => {
        launched.on('disconnected', () => {
          browser = undefined;
        });
        return launched;
      })
      .catch((error: unknown) => {
        browser = undefined;
        throw error;
      });
    return browser;
  };

  return {
    render: async ({ html, headerTemplate, footerTemplate }) => {
      const page = await (await getBrowser()).newPage();
      try {
        // The HTML already comes escaped; without JavaScript, none of the tenant content runs.
        await page.setJavaScriptEnabled(false);
        await page.setContent(html, { waitUntil: 'load' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate,
          margin: { top: '34mm', bottom: '22mm', left: '16mm', right: '16mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await page.close();
      }
    },
  };
};
