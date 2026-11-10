import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Box from '../box';
import Button from './button';

// The assertions that matter are the types: `npm run compile` checks this file (bug #353).
describe('Button variants', () => {
  afterEach(cleanup);

  it('combine a look with a size in an array, a record or nested arrays', () => {
    const { container } = render(
      <>
        <Button variant="square">a</Button>
        <Button variant={['square', 'compact']}>b</Button>
        <Button variant={{ square: true, compact: true }}>c</Button>
        <Button variant={['secondary', ['compact']]}>d</Button>
        <Box component="button" variant={['square', 'compact']} />
        {/* @ts-expect-error not a button variant */}
        <Button variant={['square', 'nope']}>e</Button>
        {/* @ts-expect-error not a button variant */}
        <Button variant={{ nope: true }}>f</Button>
        {/* @ts-expect-error a Box with no component has no variants */}
        <Box variant="square" />
      </>,
    );
    const [square, array, record] = [...container.querySelectorAll('button')].map((button) => button.className);

    expect(array).not.toBe(square);
    expect(record).toBe(array);
  });
});
