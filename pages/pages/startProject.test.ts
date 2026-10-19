import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGN_IDS, designFonts, ROOT } from '../../scripts/createTemplates.mjs';
import { DESIGNS } from '../designs/designs';
import { createCommand, DESIGN_FONTS, designSource, INDEX_CSS, installCommand, templateSource } from './startProject';

describe('the Start a project page', () => {
  it('lists the fonts the command installs, for every design it offers', () => {
    expect(DESIGNS.map((design) => design.id)).toEqual(DESIGN_IDS);
    for (const id of DESIGN_IDS) expect(DESIGN_FONTS[id as keyof typeof DESIGN_FONTS]).toEqual(designFonts(id));
  });

  it('shows a file for every design and both languages', () => {
    for (const design of DESIGNS) {
      expect(designSource('ts', design.id)).toContain('export default function Design');
      expect(designSource('js', design.id)).not.toContain(': ReactNode');
    }
    expect(templateSource('js', 'src/main')).toContain("import Design from './design'");
    for (const language of ['ts', 'js']) {
      const committed = readFileSync(join(ROOT, 'create', 'templates', language, 'src', 'index.css'), 'utf8').replace(/\r\n/g, '\n');
      expect(INDEX_CSS).toBe(committed);
    }
  });

  it('puts the options after -- for npm only', () => {
    expect(createCommand('npm', 'mono', 'ts').split('\n')).toEqual([
      'npm create @box-kite@latest my-app -- --design mono',
      'cd my-app',
      'npm run dev',
    ]);
    expect(createCommand('pnpm', 'azure', 'js').split('\n')[0]).toBe('pnpm create @box-kite my-app --design azure --template react');
    expect(createCommand('yarn', 'ember', 'ts').split('\n')[2]).toBe('yarn dev');
  });

  it('installs the design’s fonts by hand too', () => {
    expect(installCommand('npm', 'mono')).toBe('npm install @box-kite/react @fontsource-variable/roboto');
    expect(installCommand('pnpm', 'classic')).toBe('pnpm add @box-kite/react');
  });
});
