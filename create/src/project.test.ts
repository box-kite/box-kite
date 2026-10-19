import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectPackageManager, runCommand } from './packageManager';
import { applyBoxKite, type Templates } from './project';

const designs = { classic: 'classic', ember: 'ember', azure: 'azure', mono: 'mono' };
const templates: Templates = {
  ts: { files: { 'src/main.tsx': 'main', 'src/App.tsx': 'app', 'src/index.css': 'css' }, designs },
  js: { files: { 'src/main.jsx': 'main', 'src/App.jsx': 'app', 'src/index.css': 'css' }, designs },
  fonts: { classic: [], ember: ['@fontsource-variable/fraunces'], azure: [], mono: ['@fontsource-variable/roboto'] },
};

let app: string;
const read = (path: string) => readFileSync(join(app, path), 'utf8');

/** What create-vite leaves behind, as far as the command cares. */
function scaffold(language: 'tsx' | 'jsx') {
  mkdirSync(join(app, 'src', 'assets'), { recursive: true });
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'my-app', dependencies: { react: '^19.3.1', 'react-dom': '^19.3.1' } }));
  for (const file of [
    `src/App.${language}`,
    `src/main.${language}`,
    'src/App.css',
    'src/index.css',
    'src/assets/react.svg',
    'src/assets/hero.png',
  ]) {
    writeFileSync(join(app, file), 'from the template');
  }
}

beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), 'box-kite-create-test-'));
});
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe('applyBoxKite', () => {
  it('adds the library and the design’s fonts, in the order npm would write them', () => {
    scaffold('tsx');
    applyBoxKite(app, templates, { template: 'react-ts', design: 'mono', boxKiteRange: '^2.2.7', fontRange: '^5.3.0' });
    const manifest = JSON.parse(read('package.json'));
    expect(Object.entries(manifest.dependencies)).toEqual([
      ['@box-kite/react', '^2.2.7'],
      ['@fontsource-variable/roboto', '^5.3.0'],
      ['react', '^19.3.1'],
      ['react-dom', '^19.3.1'],
    ]);
  });

  it('writes the design and the sample page, and takes the template’s own page away', () => {
    scaffold('tsx');
    const written = applyBoxKite(app, templates, { template: 'react-ts', design: 'ember', boxKiteRange: '^2', fontRange: '^5' });
    expect(written).toEqual(['package.json', 'src/main.tsx', 'src/App.tsx', 'src/index.css', 'src/design.tsx']);
    expect(read('src/design.tsx')).toBe('ember');
    expect(read('src/App.tsx')).toBe('app');
    expect(existsSync(join(app, 'src', 'App.css'))).toBe(false);
    // Emptied, so it goes too: the sample page imports none of the logos.
    expect(existsSync(join(app, 'src', 'assets'))).toBe(false);
  });

  it('writes JavaScript into a JavaScript template', () => {
    scaffold('jsx');
    applyBoxKite(app, templates, { template: 'react-compiler', design: 'classic', boxKiteRange: '^2', fontRange: '^5' });
    expect(read('src/design.jsx')).toBe('classic');
    expect(read('src/main.jsx')).toBe('main');
    expect(existsSync(join(app, 'src', 'design.tsx'))).toBe(false);
  });

  it('keeps an asset the template did not ship', () => {
    scaffold('tsx');
    writeFileSync(join(app, 'src', 'assets', 'mine.svg'), '<svg/>');
    applyBoxKite(app, templates, { template: 'react-ts', design: 'classic', boxKiteRange: '^2', fontRange: '^5' });
    expect(existsSync(join(app, 'src', 'assets', 'mine.svg'))).toBe(true);
  });
});

describe('package manager', () => {
  it('reads the manager that ran the command', () => {
    expect(detectPackageManager('pnpm/9.12.0 npm/? node/v22.12.0 win32 x64')).toBe('pnpm');
    expect(detectPackageManager('yarn/4.5.0 npm/? node/v22.12.0 darwin arm64')).toBe('yarn');
    expect(detectPackageManager('bun/1.2.0 npm/? node/v22.6.0 linux x64')).toBe('bun');
    expect(detectPackageManager('npm/11.6.0 node/v24.0.0 linux x64 workspaces/false')).toBe('npm');
    expect(detectPackageManager(undefined)).toBe('npm');
  });

  it('spells the dev command the way each manager does', () => {
    expect(runCommand('npm', 'dev')).toBe('npm run dev');
    expect(runCommand('pnpm', 'dev')).toBe('pnpm dev');
    expect(runCommand('yarn', 'dev')).toBe('yarn dev');
    expect(runCommand('bun', 'dev')).toBe('bun run dev');
  });
});
