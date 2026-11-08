import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { H1, P, Span } from './semantics';

/**
 * The key is generic per call, as on Box. Fixed at the factory, it was emitted into the published `.d.ts`
 * as a literal union of the built-in names, so an app's augmented components never matched (the
 * published-types half is `npm run check:types`); and `variant` took every component's variants at once.
 */
describe('semantic components', () => {
  afterEach(cleanup);

  it('take a component and only that component’s variants', () => {
    const { container } = render(
      <>
        <H1 component="button" variant="secondary">
          Title
        </H1>
        <Span component="skeleton" variant="circle" />
        {/* @ts-expect-error a button variant on a skeleton */}
        <Span component="skeleton" variant="secondary" />
        {/* @ts-expect-error a component nobody registered */}
        <P component="nope">Text</P>
      </>,
    );

    expect(container.querySelector('h1')).toBeTruthy();
  });
});
