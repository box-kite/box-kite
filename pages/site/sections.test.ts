import { describe, expect, it } from 'vitest';
import { sectionOf } from './sections';

describe('sectionOf', () => {
  it('puts the blog index and every article in the blog, with or without the trailing slash', () => {
    expect(sectionOf('/blog')).toBe('blog');
    expect(sectionOf('/blog/')).toBe('blog');
    expect(sectionOf('/blog/dark-mode-without-the-flash/')).toBe('blog');
  });

  it('names the AI start on its own, and leaves everything else to the docs', () => {
    expect(sectionOf('/start/')).toBe('start');
    expect(sectionOf('/')).toBe('docs');
    expect(sectionOf('/box')).toBe('docs');
    expect(sectionOf('/blogger')).toBe('docs');
  });
});
