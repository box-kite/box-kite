import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { makeEngine } from '../../../dev/engineHarness';
import { warningsSettled as settled } from '../../../dev/tests';

describe('development warnings', () => {
  let warn: MockInstance<typeof console.warn>;
  const messages = () => warn.mock.calls.map(([message]) => String(message));

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    vi.unstubAllEnvs();
  });

  it('says what each of the three silent drops did, once per value', async () => {
    const engine = makeEngine('warnings-three');

    engine.classNames({ fontSize: 4, bgColor: 'bleu-500', href: '/about' } as never);
    engine.classNames({ fontSize: 4, hover: { bgColor: 'bleu-500' } } as never);
    await settled();

    expect(messages()).toEqual([
      expect.stringMatching(/^\[box-kite\] fontSize=\{4\} is 4px text/),
      expect.stringMatching(/^\[box-kite\] bgColor="bleu-500" wrote no CSS.* Did you mean "blue-500"\?$/),
      expect.stringMatching(/^\[box-kite\] href is an HTML attribute/),
    ]);
  });

  it('still writes the misread value, since it is a valid one', () => {
    const engine = makeEngine('warnings-written');

    expect(engine.classNames({ fontSize: 4 })).toBe('_b fontSize-4');
  });

  it('is quiet about a value dropped for its context rather than for itself', async () => {
    const engine = makeEngine('warnings-context');

    engine.addGlobalStyles({ group: { 'card/hover': { bgColor: 'red-500' } } }, 'html');
    await settled();

    expect(warn).not.toHaveBeenCalled();
  });

  it('is off in production, and when configured off', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    makeEngine('warnings-production').classNames({ fontSize: 4 });
    vi.unstubAllEnvs();

    const engine = makeEngine('warnings-off', { warnings: false });
    engine.classNames({ fontSize: 4 });
    engine.configure({ warnings: true });
    engine.classNames({ lineHeight: 1.5 });
    await settled();

    expect(messages()).toEqual([expect.stringMatching(/^\[box-kite\] lineHeight=\{1.5\}/)]);
  });
});
