import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import type { NextApiRequest, NextApiResponse } from 'next';

export const maxDuration = 300;
const isDev = process.env.NODE_ENV === 'development';

// Path to chrome executable on different platforms
const chromeExecutables = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/chromium-browser',
  win32: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
};

const getOptions = async () => {
  // During development use local chrome executable
  if (isDev) {
    return {
      args: [],
      executablePath:
        chromeExecutables[process.platform as keyof typeof chromeExecutables] ||
        chromeExecutables.darwin,
      headless: true,
    };
  }
  // Else, use the path of chrome-aws-lambda and its args
  const executablePath = await chromium.executablePath(
    'https://www.datocms-assets.com/61479/1736585984-chromium-v131-0-1-pack.tar',
  );

  return {
    args: chromium.args,
    executablePath,
    headless: true,
  };
};

const getPdf = async (url: string) => {
  const options = await getOptions();
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });

  await page.emulateMediaType('print');
  const buffer = await page.pdf({
    format: 'a4',
    margin: {
      top: '1.6cm',
      right: '1.6cm',
      bottom: '1.6cm',
      left: '1.6cm',
    },
    printBackground: true
  });

  await browser.close();
  return buffer;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { url = 'https://www.google.com' } = req.body;

  if (!url) {
    return res.status(400).send('Missing url');
  }

  try {
    if (url === 'favicon.ico') {
      return res.status(404).end();
    }

    const pdfBuffer = await getPdf(url);

    res.setHeader('Content-type', 'application/pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).send('Error: Please try again.');
  }
};

export default handler;
