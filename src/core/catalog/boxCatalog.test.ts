import { describe, expect, it } from 'vitest';
import catalogManifest from '../../utils/catalog/catalogManifest';
import { cssStyles } from '../boxStyles';
import { Components } from '../extends/boxComponents';
import * as BoxCatalogs from './boxCatalog';
import { CatalogSource } from './boxCatalog';
import { CatalogSchema } from './catalogTypes';

const colors = ['sky-500', 'blue-500', 'currentColor'];

function source(overrides: Partial<CatalogSource> = {}): CatalogSource {
  return {
    styleProps: cssStyles,
    colors,
    animations: ['spin', 'pulse'],
    componentStyles: { button: { variants: { primary: {} }, children: { icon: {} } } } as Components,
    manifest: catalogManifest,
    ...overrides,
  };
}

/** The schema one component's prop resolves to, whichever alternative it landed in. */
function prop(name: string, component = 'Flex'): CatalogSchema {
  return BoxCatalogs.build(source(), { include: [component] }).components[component].props.properties![name];
}

describe('BoxCatalogs.build', () => {
  it('carries every component the manifest knows, with its import and its slots', () => {
    const catalog = BoxCatalogs.build(source());

    expect(Object.keys(catalog.components).length).toBe(Object.keys(catalogManifest.components).length);
    expect(catalog.components.H1.import).toContain('components/semantics');
    expect(catalog.components.H1.slots).toEqual(['default']);
    expect(catalog.version).toBe(1);
  });

  it('names the tokens a generated tree is held to', () => {
    const catalog = BoxCatalogs.build(source());

    expect(catalog.tokens.colors).toEqual(colors);
    expect(catalog.tokens.animations).toEqual(['spin', 'pulse']);
    // The style tree, flattened the way `Box.components()` addresses it.
    expect(catalog.tokens.components).toEqual(['button', 'button.icon']);
  });

  it('states the dividers, which no JSON Schema can', () => {
    expect(BoxCatalogs.build(source()).rules.join(' ')).toContain('fontSize divides by 16');
  });

  describe('style props', () => {
    /** The one colour grammar a component's colour props all point at. */
    function colorPattern(names = colors): RegExp {
      const props = BoxCatalogs.build(source({ colors: names }), { include: ['Flex'] }).components.Flex.props;

      return new RegExp(props.$defs!.color.pattern!);
    }

    it('points every colour prop at one grammar rather than carrying it twenty-six times', () => {
      const props = BoxCatalogs.build(source(), { include: ['Flex'] }).components.Flex.props;

      expect(props.properties!.bgColor.$ref).toBe('#/$defs/color');
      expect(props.properties!.color.$ref).toBe('#/$defs/color');
      expect(props.$defs!.color.pattern).toBeTruthy();
    });

    it('constrains a colour to the palette, with the opacity modifier on it', () => {
      const pattern = colorPattern();

      expect(pattern.test('sky-500')).toBe(true);
      expect(pattern.test('blue-500/40')).toBe(true);
      expect(pattern.test('sky-999')).toBe(false);
      expect(pattern.test('rebeccapurple')).toBe(false);
      // The modifier is a percentage, so past 100 it is not a colour this library has.
      expect(pattern.test('sky-500/140')).toBe(false);
    });

    it('folds the families back up rather than listing every token', () => {
      const pattern = colorPattern(['sky-500', 'sky-700', 'blue-500', 'blue-700', 'currentColor']);

      expect(pattern.source).toContain('(?:sky|blue)-(?:500|700)');
      expect(pattern.test('sky-700')).toBe(true);
      // A step the palette does not have is still refused: the grouping is by the steps a family owns.
      expect(pattern.test('sky-600')).toBe(false);
    });

    it('takes a colour declared by Box.extend() beside the palette', () => {
      expect(colorPattern([...colors, 'brand']).test('brand/60')).toBe(true);
    });

    it('lists a closed value set as an enum and a scale as a number', () => {
      expect(prop('position').enum).toContain('absolute');
      expect(prop('p').anyOf?.some((alternative) => alternative.type === 'number')).toBe(true);
    });

    it('carries the prop description, which is where the divider is written down', () => {
      expect(prop('fontSize').description).toBeTruthy();
    });

    it('gives a grammar its pattern rather than widening the prop to any string', () => {
      const ratio = prop('aspectRatio');
      const pattern = ratio.anyOf?.find((alternative) => alternative.pattern)?.pattern;

      expect(new RegExp(pattern!).test('4/3')).toBe(true);
      expect(new RegExp(pattern!).test('4:3')).toBe(false);
    });
  });

  describe('component props', () => {
    it("declares a component's own props before the style props, so it wins a name they share", () => {
      const catalog = BoxCatalogs.build(source(), { include: ['Slider'] });

      expect(catalog.components.Slider.props.properties!.step.type).toBe('number');
      expect(catalog.components.Slider.props.properties!.orientation.enum).toEqual(['horizontal', 'vertical']);
    });

    it('names a function prop as an event instead of describing a value for it', () => {
      const catalog = BoxCatalogs.build(source(), { include: ['Slider'] });

      expect(catalog.components.Slider.events).toContain('onValueChange');
      expect(catalog.components.Slider.props.properties!.onValueChange).toBeUndefined();
    });

    it('refuses a prop nobody offered', () => {
      expect(BoxCatalogs.build(source(), { include: ['Flex'] }).components.Flex.props.additionalProperties).toBe(false);
    });

    it('leaves the style props off a component that does not forward them', () => {
      const catalog = BoxCatalogs.build(source(), { include: ['Presence'] });

      expect(catalog.components.Presence.props.properties!.bgColor).toBeUndefined();
    });
  });

  describe('contracts', () => {
    const contracts = { Flex: { props: { layout: { type: 'object' } as CatalogSchema }, required: ['layout'] } };

    it('carries a prop the manifest could not describe', () => {
      const catalog = BoxCatalogs.build(source({ contracts }), { include: ['Flex'] });

      expect(catalog.components.Flex.props.properties!.layout.type).toBe('object');
      expect(catalog.components.Flex.props.required).toEqual(['layout']);
    });

    it('wins the name it shares with a style prop, since it is the narrower of the two', () => {
      const shared = { Flex: { props: { gap: { type: 'object' } as CatalogSchema } } };

      expect(BoxCatalogs.build(source({ contracts: shared }), { include: ['Flex'] }).components.Flex.props.properties!.gap.type).toBe(
        'object',
      );
    });

    it('leaves a component nothing was written for alone', () => {
      expect(BoxCatalogs.build(source({ contracts }), { include: ['Grid'] }).components.Grid.props.properties!.layout).toBeUndefined();
    });
  });

  describe('the allow-list is the app’s', () => {
    it('includes and excludes by name', () => {
      expect(Object.keys(BoxCatalogs.build(source(), { include: ['Flex', 'H1'] }).components)).toEqual(['H1', 'Flex']);
      expect(BoxCatalogs.build(source(), { exclude: ['DataGrid'] }).components.DataGrid).toBeUndefined();
    });

    it('narrows the style props to the ones named, and drops them all on false', () => {
      const narrow = BoxCatalogs.build(source(), { include: ['Flex'], styleProps: ['p', 'gap'] });
      const none = BoxCatalogs.build(source(), { include: ['Flex'], styleProps: false });

      // Registry order, not the order they were asked for, so two catalogs of the same set read the same.
      expect(Object.keys(narrow.components.Flex.props.properties!)).toEqual(['gap', 'p']);
      expect(Object.keys(none.components.Flex.props.properties!)).toEqual([]);
    });
  });
});
