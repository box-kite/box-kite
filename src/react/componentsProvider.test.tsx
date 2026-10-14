import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Box from '../box';
import Button from '../components/button';

describe('Box.Components', () => {
  ignoreLogs();

  afterEach(cleanup);

  const pill = Box.createComponents({ scopedCard: { styles: { borderRadius: 999 } }, button: { styles: { borderRadius: 999 } } } as never);
  const square = Box.createComponents({ scopedCard: { styles: { borderRadius: 0 } } } as never);

  const classesOf = (id: string) => [...document.getElementById(id)!.classList];

  it('gives two sibling subtrees two designs, and leaves the rest of the page on the app’s', () => {
    render(
      <>
        <Box.Components value={pill}>
          <Box id="pill" component={'scopedCard' as never} />
        </Box.Components>
        <Box.Theme theme="dark" components={square}>
          <Box id="square" component={'scopedCard' as never} />
        </Box.Theme>
        <Box id="outside" component={'scopedCard' as never} />
      </>,
    );

    expect(classesOf('pill')).toContain('borderRadius-999');
    expect(classesOf('square')).toContain('borderRadius-0');
    expect(classesOf('outside')).not.toContain('borderRadius-999');
    expect(classesOf('outside')).not.toContain('borderRadius-0');
  });

  it('reaches the pre-built components, with their own props still winning', () => {
    render(
      <Box.Components value={pill}>
        <Box id="designed">
          <Button>Save</Button>
        </Box>
        <Box id="overridden">
          <Button borderRadius={2}>Save</Button>
        </Box>
      </Box.Components>,
    );

    const buttonIn = (id: string) => [...document.getElementById(id)!.firstElementChild!.classList];

    expect(buttonIn('designed')).toContain('borderRadius-999');
    expect(buttonIn('overridden')).toContain('borderRadius-2');
    expect(buttonIn('overridden')).not.toContain('borderRadius-999');
  });

  it('lets an inner provider hand a subtree back to the app’s design', () => {
    render(
      <Box.Components value={pill}>
        <Box.Components value={undefined}>
          <Box id="reset" component={'scopedCard' as never} />
        </Box.Components>
      </Box.Components>,
    );

    expect(classesOf('reset')).not.toContain('borderRadius-999');
  });
});
