import { describe, expect, it } from 'vitest';
import { parseOptions } from './options';

describe('parseOptions', () => {
  it('reads the command the docs give', () => {
    const { options, errors } = parseOptions(['my-app', '--design', 'mono']);
    expect(errors).toEqual([]);
    expect(options).toMatchObject({ directory: 'my-app', design: 'mono', template: undefined, install: true, overwrite: false });
  });

  it('takes the short flags, the = spelling and a name in capitals', () => {
    expect(parseOptions(['-d', 'Azure', '-t', 'react']).options).toMatchObject({ design: 'azure', template: 'react' });
    expect(parseOptions(['--design=ember', '--template=react-compiler-ts']).options).toMatchObject({
      design: 'ember',
      template: 'react-compiler-ts',
    });
  });

  it('leaves what was not given unset, so the command can ask', () => {
    const { options } = parseOptions([]);
    expect(options.directory).toBeUndefined();
    expect(options.design).toBeUndefined();
    expect(options.interactive).toBeUndefined();
  });

  it('reads the negations', () => {
    expect(parseOptions(['--no-install', '--no-interactive', '--no-eslint']).options).toMatchObject({
      install: false,
      interactive: false,
      eslint: false,
    });
  });

  it('refuses a template that is not React, saying why', () => {
    const { options, errors } = parseOptions(['--template', 'vue-ts']);
    expect(options.template).toBeUndefined();
    expect(errors).toEqual([expect.stringContaining('Box Kite is a React library')]);
  });

  it('refuses a design that does not exist, and a flag with no name after it', () => {
    expect(parseOptions(['--design', 'neon']).errors).toEqual([expect.stringContaining('classic, ember, azure, mono')]);
    expect(parseOptions(['my-app', '--design']).errors).toEqual(['--design needs a name: classic, ember, azure, mono.']);
  });

  it('refuses an unknown option and a second directory', () => {
    expect(parseOptions(['--desing', 'mono']).errors).toContain('Unknown option --desing.');
    expect(parseOptions(['one', 'two']).errors).toEqual([expect.stringContaining('One directory')]);
  });

  it('drops a trailing slash, which a shell completes a directory with', () => {
    expect(parseOptions(['my-app/']).options.directory).toBe('my-app');
    expect(parseOptions(['.']).options.directory).toBe('.');
  });
});
