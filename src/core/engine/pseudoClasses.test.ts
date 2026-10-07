import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';
import { pseudoClasses } from '../boxStyles';

/**
 * The states a browser knows about and this library had no key for. Each is an ordinary pseudo-class
 * key, so the composition every other one gets — breakpoints, themes, groups, pseudo-elements, `not` —
 * comes with it and needs no test of its own here.
 */
describe('the extended pseudo-classes', () => {
  it('writes one compound selector per state', () => {
    const engine = makeEngine('pseudo-classes-extended');

    renderStyles(engine, {
      visited: { color: 'purple-500' },
      target: { bgColor: 'amber-100' },
      open: { rotate: 180 },
      placeholderShown: { color: 'gray-400' },
      autofill: { bgColor: 'yellow-100' },
      inRange: { borderColor: 'green-500' },
      outOfRange: { borderColor: 'red-500' },
      inert: { opacity: 0.5 },
    });

    expect(ruleList(engine)).toEqual([
      '.inert-opacity-0\\.5:is([inert],[inert] *){opacity:0.5}',
      '.open-rotate-180:is([open],:popover-open,:open){rotate:180deg}',
      '.visited-color-purple-500:visited{color:var(--purple-500,oklch(62.7% .265 303.9))}',
      '.placeholderShown-color-gray-400:placeholder-shown{color:var(--gray-400,oklch(70.7% .022 261.3))}',
      '.target-bgColor-amber-100:target{background-color:var(--amber-100,oklch(96.2% .059 95.6))}',
      '.autofill-bgColor-yellow-100:autofill{background-color:var(--yellow-100,oklch(97.3% .071 103.2))}',
      '.inRange-borderColor-green-500:in-range{border-color:var(--green-500,oklch(72.3% .219 149.6))}',
      '.outOfRange-borderColor-red-500:out-of-range{border-color:var(--red-500,oklch(63.7% .237 25.3))}',
    ]);
  });

  it('negates each of them, since the state vocabulary is one list', () => {
    const engine = makeEngine('pseudo-classes-not');

    renderStyles(engine, { not: { open: { opacity: 0.5 }, inRange: { borderColor: 'red-500' } } });

    expect(ruleList(engine)).toEqual([
      '.not-open-opacity-0\\.5:not(:is([open],:popover-open,:open)){opacity:0.5}',
      '.not-inRange-borderColor-red-500:not(:in-range){border-color:var(--red-500,oklch(63.7% .237 25.3))}',
    ]);
  });

  it('leaves the bitmask room, which is the only reason it is a bitmask', () => {
    // A weight is `2 ** index` summed, and `weight & …` is a 32-bit operation: past 31 keys a rule
    // would silently take the wrong set of states.
    expect(Object.keys(pseudoClasses).length).toBeLessThanOrEqual(31);
  });
});

/**
 * `nth` is a variant rather than a pseudo-class key: its selector carries an argument, so it cannot be
 * one bit of a mask — and as a variant it costs the mask nothing at all.
 */
describe('nth', () => {
  it('positions the element among its siblings', () => {
    const engine = makeEngine('nth-basics');

    const classNames = renderStyles(engine, { nth: { first: { pt: 0 }, 'last 1': { pb: 0 }, odd: { bgColor: 'gray-50' } } });

    expect(classNames).toEqual(['_b', 'nth-first-pt-0', 'nth-last_1-pb-0', 'nth-odd-bgColor-gray-50']);
    expect(ruleList(engine)).toEqual([
      '.nth-first-pt-0:first-child{padding-top:0rem}',
      '.nth-last_1-pb-0:nth-last-child(1){padding-bottom:0rem}',
      '.nth-odd-bgColor-gray-50:nth-child(odd){background-color:var(--gray-50,oklch(98.5% .002 247.8))}',
    ]);
  });

  it('composes with the other variants on the same compound selector', () => {
    const engine = makeEngine('nth-variants');

    renderStyles(engine, { nth: { '2n+1': { hover: { opacity: 1 }, dataAttr: { active: { opacity: 0.5 } } } } });

    expect(ruleList(engine)).toEqual([
      '.hover-nth-2n\\+1-opacity-1:nth-child(2n+1):hover{opacity:1}',
      '.dataAttr-active-nth-2n\\+1-opacity-0\\.5[data-active]:nth-child(2n+1){opacity:0.5}',
    ]);
  });
});
