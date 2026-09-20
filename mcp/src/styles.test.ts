import { describe, expect, it } from 'vitest';
import { checkStyles } from './styles';

const verdict = (bag: Record<string, unknown>, name: string) => checkStyles(bag).checks.find((check) => check.name === name);

describe('check_styles', () => {
  it('reports the CSS a prop writes, dividers and all', () => {
    expect(verdict({ p: 4 }, 'p')).toMatchObject({ verdict: 'ok', css: '.p-4{padding:1rem}' });
    expect(verdict({ fontSize: 14 }, 'fontSize')?.css).toBe('.fontSize-14{font-size:0.875rem}');
    expect(verdict({ b: 1 }, 'b')?.css).toBe('.b-1{border-width:1px}');
    expect(verdict({ borderRadius: 2 }, 'borderRadius')?.css).toBe('.borderRadius-2{border-radius:0.5rem}');
  });

  it('calls a value the engine rejects what it is: nothing written at all', () => {
    const check = verdict({ bgColor: 'blue-550' }, 'bgColor');

    expect(check?.verdict).toBe('rejected-value');
    expect(check?.css).toBe('');
    expect(check?.note).toContain('no rule and no class name');
  });

  it('names the prop a Tailwind habit meant', () => {
    expect(verdict({ padding: 4 }, 'padding')).toMatchObject({ verdict: 'unknown-prop', suggestions: expect.arrayContaining(['p']) });
  });

  it('sends an HTML attribute to the `props` bag it is silently dropped from', () => {
    expect(verdict({ href: '/about' }, 'href')?.verdict).toBe('html-attribute');
    expect(verdict({ 'data-state': 'open' }, 'data-state')?.verdict).toBe('html-attribute');
    expect(verdict({ onClick: 'x' }, 'onClick')?.verdict).toBe('html-attribute');
  });

  it('resolves a nesting key, and reports one whose block wrote nothing', () => {
    expect(verdict({ hover: { bgColor: 'blue-600' } }, 'hover')?.css).toBe(
      '.hover-bgColor-blue-600:hover{background-color:var(--blue-600)}',
    );
    expect(verdict({ hover: { bgColor: 'bleu-600' } }, 'hover')?.verdict).toBe('rejected-value');
    expect(verdict({ md: { p: 8 } }, 'md')?.css).toContain('@media');
  });

  it('leaves the four reserved names alone', () => {
    const result = checkStyles({ children: 'x', props: { href: '/a' }, tag: 'section', p: 2 });

    expect(result.ok).toBe(true);
    expect(result.checks.filter((check) => check.verdict === 'reserved')).toHaveLength(3);
    // A reserved name is not a style, so it must not reach the engine or the class list.
    expect(result.className).toBe('_b p-2');
  });

  it('judges each prop on its own, so a good one cannot cover for a bad one', () => {
    const result = checkStyles({ p: 4, bgColor: 'blue-550', fontSize: 14 });

    expect(result.ok).toBe(false);
    expect(result.checks.map((check) => check.verdict)).toEqual(['ok', 'rejected-value', 'ok']);
    expect(result.className).toBe('_b p-4 fontSize-14');
  });

  it('accepts the opacity modifier, which is part of the colour and not a second prop', () => {
    expect(verdict({ bgColor: 'blue-500/40' }, 'bgColor')?.css).toContain('color-mix(in oklab');
    expect(verdict({ bgColor: 'blue-500/140' }, 'bgColor')?.verdict).toBe('rejected-value');
  });
});
