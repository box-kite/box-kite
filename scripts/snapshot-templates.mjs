/**
 * Shoots every template's and block's demo in headless Chrome, light and dark, into `pages/public/snapshots/`:
 * the gallery card (`<slug>-light.webp`, `<slug>-dark.webp`, 960×600) and the shared-link card
 * (`<slug>-og.jpg`, 1200×630, light). It writes into the working tree and nothing else — committing the
 * images is approving them, so look at them first.
 *
 *   npm run build:pages && npm run snapshot:templates
 *   npm run snapshot:templates -- react-settings-form     # just the ones named
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluate, launchChrome, startPreview, wait } from './headlessChrome.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'pages', 'public');
// Off the benchmark's 4273 and Vite's 4173, so a preview left running elsewhere does not collide.
const PREVIEW_PORT = 4283;
const DEBUG_PORT = 9335;
const VIEWPORT = { width: 1440, height: 900 };

// The prerender pass leaves its server bundle behind, and the lists and sizes come out of it rather than a copy here.
const { snapshotTargets, snapshotPath, ogImagePath, SNAPSHOT_SIZE, OG_SIZE } = await import(
  pathToFileURL(join(ROOT, 'dist-pages-ssr', 'entry-server.mjs')).href
).catch(() => {
  throw new Error('No server bundle in dist-pages-ssr/. Run `npm run build:pages` first.');
});

const only = process.argv.slice(2);
const targets = snapshotTargets().filter((target) => !only.length || only.includes(target.slug));

if (!targets.length) throw new Error(only.length ? `Nothing is called ${only.join(', ')}.` : 'There is nothing to shoot.');

const { server, address } = await startPreview(PREVIEW_PORT);
const { send, on, close } = await launchChrome({ port: DEBUG_PORT, windowSize: `${VIEWPORT.width},${VIEWPORT.height}` });
const errors = [];
let current = '';

// A demo that throws would be shot as whatever it managed to draw, so a throw fails the run instead.
on('Runtime.exceptionThrown', ({ exceptionDetails }) =>
  errors.push(`${current}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`),
);

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });

  for (const { slug, path } of targets) {
    for (const theme of ['light', 'dark']) {
      // The demo follows the reader's scheme; reduced motion means nothing is caught halfway through an entrance.
      await send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-color-scheme', value: theme },
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ],
      });
      await load(`${address}${path}/`);

      const card = await shoot('webp', 80, 0, VIEWPORT.height, SNAPSHOT_SIZE.width);
      await save(snapshotPath(slug, theme), card);

      if (theme === 'light') {
        const height = (VIEWPORT.width * OG_SIZE.height) / OG_SIZE.width;
        const og = await shoot('jpeg', 85, await ogTop(height), height, OG_SIZE.width);
        await save(ogImagePath(slug), og);
      }
    }

    console.log(`  ${slug}`);
  }
} finally {
  await close();
  server.kill();
}

if (errors.length) {
  console.error(`\nThe demos threw while they were shot:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(
  `\nShot ${targets.length} demo${targets.length === 1 ? '' : 's'} into pages/public/snapshots/. Look at them before committing them.`,
);

/** A fresh load, then a wait for the fonts and two frames, so what is captured is what a reader sees settle. */
async function load(url) {
  current = url;
  await send('Page.navigate', { url });

  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(send, 'document.readyState === "complete" && document.fonts.status === "loaded"')) break;
    await wait(100);
  }

  await evaluate(send, 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))');
  // An image or a lazily measured chart can land a moment after the second frame.
  await wait(400);
}

/**
 * Where the wide, short crop starts. A block sits inside a frame, so the crop is placed on it; a template
 * is a page, and the top of a page is the part that says what it is.
 */
async function ogTop(height) {
  const block = await evaluate(
    send,
    `(() => {
    const box = document.querySelector('[data-preview] > *')?.getBoundingClientRect();
    return box ? { top: box.top, height: box.height } : null;
  })()`,
  );

  if (!block) return 0;

  // One taller than the crop keeps its top, with the frame's own margin above it; a shorter one is centred.
  const top = block.height > height ? block.top - 24 : block.top + block.height / 2 - height / 2;

  return Math.round(Math.min(Math.max(top, 0), VIEWPORT.height - height));
}

/** `height` CSS pixels of the viewport from `y`, scaled down to `width`. */
async function shoot(format, quality, y, height, width) {
  const { data } = await send('Page.captureScreenshot', {
    format,
    quality,
    clip: { x: 0, y, width: VIEWPORT.width, height, scale: width / VIEWPORT.width },
  });

  return Buffer.from(data, 'base64');
}

async function save(path, bytes) {
  const file = join(OUT, path.slice(1));

  await mkdir(resolve(file, '..'), { recursive: true });
  await writeFile(file, bytes);
}
