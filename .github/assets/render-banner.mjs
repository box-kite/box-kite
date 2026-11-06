// Renders banner.html into banner.png at 2x. Needs playwright-core and a Chromium (PLAYWRIGHT_CHROMIUM overrides the path).
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const browsers = join(process.env.LOCALAPPDATA ?? join(homedir(), '.cache'), 'ms-playwright');
const build = readdirSync(browsers).find((name) => /^chromium-\d+$/.test(name));
const executablePath = process.env.PLAYWRIGHT_CHROMIUM ?? join(browsers, build, 'chrome-win64', 'chrome.exe');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(here, 'banner.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(here, 'banner.png') });
await browser.close();
