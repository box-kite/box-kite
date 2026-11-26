import { describe, expect, it } from 'vitest';
import { getComponent } from './tools';

describe('get_component', () => {
  it('prints each style node with its variants rather than [object Object] (bug #355)', () => {
    const answer = getComponent('button', ['styles']);

    expect(answer).toContain('## Style tree');
    expect(answer).toContain('- `button` — variants: `secondary`, `ghost`');
    expect(answer).toContain('`square`');
    expect(answer).not.toContain('[object Object]');
  });

  it('indents a child node by its depth and names what a node extends', () => {
    expect(getComponent('tabs', ['styles'])).toContain('\n  - `tabs.list` — variants: `vertical`, `sliding`');
    expect(getComponent('dateField', ['styles'])).toContain('- `dateField` extends `textbox` — variants:');
  });
});
