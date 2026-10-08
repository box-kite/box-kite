import { describe, expect, it } from 'vitest';
import { cssStyles } from './boxStyles';
import { BoxStyle } from './coreTypes';
import Diagnostics from './diagnostics';

const definitions = (key: string) => (cssStyles as unknown as Record<string, BoxStyle[]>)[key];

describe('Diagnostics.misread', () => {
  it('says what a fontSize on the spacing scale rendered, and what to write instead', () => {
    expect(Diagnostics.misread('fontSize', 4)).toBe(
      "fontSize={4} is 4px text: fontSize's divider is 16, not the spacing scale's 4, so the number is the pixel size. For 16px write fontSize={16}.",
    );
    // A rem-sized number reads as rem.
    expect(Diagnostics.misread('fontSize', 1.5)).toContain('For 24px write fontSize={24}.');
  });

  it('offers the three ways to write a line height for a unitless multiple', () => {
    const message = Diagnostics.misread('lineHeight', 1.5);

    expect(message).toContain('lineHeight={1.5} is a 1.5px line');
    expect(message).toContain('lineHeight="font-size"');
    expect(message).toContain('css={{ lineHeight: 1.5 }}');
  });

  it('reads a time in seconds and a filter as a multiplier', () => {
    expect(Diagnostics.misread('transitionDuration', 0.3)).toBe(
      'transitionDuration={0.3} is 0.3ms: times are milliseconds, not seconds. For 0.3s write transitionDuration={300}.',
    );
    expect(Diagnostics.misread('backdropOpacity', 0.5)).toContain('For 50% write backdropOpacity={50}.');
    expect(Diagnostics.misread('brightness', 1.1)).toContain('For 110% write brightness={110}.');
  });

  it('leaves the values anybody writes on purpose alone', () => {
    expect(Diagnostics.misread('fontSize', 14)).toBeNull();
    expect(Diagnostics.misread('fontSize', 0)).toBeNull();
    expect(Diagnostics.misread('lineHeight', 24)).toBeNull();
    expect(Diagnostics.misread('transitionDuration', 150)).toBeNull();
    expect(Diagnostics.misread('brightness', 110)).toBeNull();
    // `opacity` is the 0–1 one, and so is the spacing scale's small end.
    expect(Diagnostics.misread('opacity', 0.5)).toBeNull();
    expect(Diagnostics.misread('p', 1)).toBeNull();
    expect(Diagnostics.misread('fontSize', 'inherit')).toBeNull();
  });
});

describe('Diagnostics.rejected', () => {
  it('names the nearest value a typo was reaching for', () => {
    expect(Diagnostics.rejected('bgColor', 'bleu-500', definitions('bgColor'))).toBe(
      'bgColor="bleu-500" wrote no CSS: bgColor does not take that value, so the prop was dropped along with its class. Did you mean "blue-500"?',
    );
  });

  it('lists what a prop takes when nothing is close', () => {
    expect(Diagnostics.rejected('opacity', 50, definitions('opacity'))).toContain('It takes one of 0, 0.1, 0.2');
    expect(Diagnostics.rejected('fontSize', 'lg', definitions('fontSize'))).toContain('It takes a number, or one of "inherit".');
    expect(Diagnostics.rejected('aspectRatio', '4:3', definitions('aspectRatio'))).toContain('or a value its own grammar defines');
  });

  it('counts a long list rather than reciting it', () => {
    expect(Diagnostics.rejected('bgColor', 'banana', definitions('bgColor'))).toMatch(/one of its \d+ named values \("currentColor", /);
  });

  it('writes an object value the way JSX does, cut short', () => {
    expect(Diagnostics.rejected('bgGradient', { linear: 'r', colors: ['blue-500'] }, definitions('bgGradient'))).toContain(
      'bgGradient={{"linear":"r","colors":["blue-500"]}} wrote no CSS',
    );
  });
});

describe('Diagnostics.attribute', () => {
  it('sends an HTML attribute to props', () => {
    expect(Diagnostics.attribute('href')).toBe(
      'href is an HTML attribute, not a style prop, so at the top level it was dropped: write props={{ href: ... }}.',
    );
    expect(Diagnostics.attribute('data-state')).toContain('props={{ "data-state": ... }}');
    expect(Diagnostics.attribute('aria-label')).not.toBeNull();
    expect(Diagnostics.attribute('onClick')).not.toBeNull();
  });

  it('says nothing about the names Box itself takes', () => {
    for (const key of ['children', 'className', 'props', 'tag', 'component', 'variant', 'id', 'style', 'disabled', 'online']) {
      expect(Diagnostics.attribute(key)).toBeNull();
    }
  });
});
