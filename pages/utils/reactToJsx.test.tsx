import { describe, expect, it } from 'vitest';
import Button from '../../src/components/button';
import reactToJsx from './reactToJsx';

describe('reactToJsx', () => {
  it('prints a function prop the same way whatever the bundler did to its source', () => {
    const minified = new Function('t', 'return () => t(1)')(() => null) as () => void;

    expect(reactToJsx(<Button onClick={() => console.log('readable source')}>Go</Button>)).toContain('onClick={() => {}}');
    expect(reactToJsx(<Button onClick={minified}>Go</Button>)).toContain('onClick={() => {}}');
  });
});
