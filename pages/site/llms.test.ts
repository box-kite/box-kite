import { describe, expect, it } from 'vitest';
import { buildLlmsFull, buildLlmsTxt, LlmsInput } from './llms';
import { SiteRoute } from './site';

const SITE = 'https://example.test';

const routes: SiteRoute[] = [
  { path: '/', name: 'Introduction', description: 'Every CSS property is a typed prop.' },
  { path: '/box', name: 'Box', description: 'The foundational component.' },
  { path: '/releases/1.0.0', name: 'Box Kite 1.0.0', description: 'The rename.' },
];

const input: LlmsInput = {
  packageName: '@box-kite/react',
  version: '1.2.3',
  routes,
  facts: ['**The dividers are per prop.**', '**There is no `style` attribute.**'],
  deprecated: [{ name: 'hoverGroup', instead: "`group={{ 'card/hover': … }}`." }],
  siteUrl: SITE,
};

describe('buildLlmsTxt', () => {
  const llms = buildLlmsTxt(input);

  it('opens the way llms.txt asks: the name, then one blockquote summary', () => {
    const [title, summary] = llms.split('\n\n');

    expect(title).toBe('# Box Kite');
    expect(summary).toBe('> Every CSS property is a typed prop.');
  });

  it('states the version, the package and the facts a model gets wrong', () => {
    expect(llms).toContain('`@box-kite/react` on npm, version 1.2.3');
    expect(llms).toContain('- **The dividers are per prop.**');
    expect(llms).toContain('- **There is no `style` attribute.**');
  });

  it('names what still works under an older spelling', () => {
    expect(llms).toContain("- `hoverGroup` — `group={{ 'card/hover': … }}`.");
  });

  it('links every page to its markdown, releases apart from the docs', () => {
    const docs = llms.split('## Docs')[1].split('\n## ')[0];

    expect(docs).toContain(`- [Introduction](${SITE}/index.md): Every CSS property is a typed prop.`);
    expect(docs).toContain(`- [Box](${SITE}/box.md): The foundational component.`);
    expect(docs).not.toContain('/releases/1.0.0.md');
    expect(llms.split('## Optional')[1]).toContain(`- [Box Kite 1.0.0](${SITE}/releases/1.0.0.md): The rename.`);
  });

  it('sends a reader to the whole corpus last, and says what it is for', () => {
    expect(llms.indexOf('## Optional')).toBeGreaterThan(llms.indexOf('## Docs'));
    expect(llms).toContain(`- [llms-full.txt](${SITE}/llms-full.txt)`);
  });
});

describe('buildLlmsFull', () => {
  it('carries every page under the address it came from', () => {
    const full = buildLlmsFull(
      [
        { path: '/', markdown: '# Introduction\n\nEvery CSS property.' },
        { path: '/box', markdown: '# Box\n\nThe foundational component.' },
      ],
      input,
    );

    expect(full).toContain(`# ${SITE}/index.md`);
    expect(full).toContain(`# ${SITE}/box.md`);
    expect(full).toContain('Every CSS property.');
    expect(full).toContain('The foundational component.');
    // The index is what an agent should read first, so the file says where it is.
    expect(full).toContain(`${SITE}/llms.txt`);
  });
});
