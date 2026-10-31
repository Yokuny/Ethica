import puppeteer, { type Browser } from 'puppeteer-core';

// HTML → PDF com Chromium headless (AD-119). Um navegador por processo, aberto na primeira
// geração e reaproveitado; cada documento usa uma página própria, fechada ao terminar.
export type PdfDocument = { html: string; headerTemplate: string; footerTemplate: string };

export type PdfRenderer = { render: (document: PdfDocument) => Promise<Buffer> };

export const createChromiumPdfRenderer = (executablePath: string): PdfRenderer => {
  let browser: Promise<Browser> | undefined;

  const getBrowser = (): Promise<Browser> => {
    browser ??= puppeteer
      // Root no container: sem sandbox; /dev/shm do Docker é pequeno demais para o Chromium.
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
        // O HTML já vem escapado; sem JavaScript, nada do conteúdo do tenant executa.
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
