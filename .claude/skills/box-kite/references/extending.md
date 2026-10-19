# Extending Box

The two registries a consumer adds to: component styles with variants (`Box.components()`) and new props, new values or new variables (`Box.extend()`). Read this when a value is used twice, or when the prop needed does not exist.

## Component System

```tsx
<Box component="card" variant="bordered">
  <Box component="card.header">Title</Box>
</Box>;

export const components = Box.components({
  card: {
    styles: { display: 'flex', d: 'column', p: 4, bgColor: 'white', borderRadius: 8, shadow: 'medium' },
    variants: { bordered: { b: 1, borderColor: 'gray-200', shadow: 'none' } },
    children: { header: { styles: { fontSize: 18, fontWeight: 600 } } },
  },
  subgrid: { extends: 'datagrid', styles: { b: 0, shadow: 'none' } },
  // A part extends too: a component by name, or another part by its dotted path.
  picker: { children: { trigger: { extends: 'button', styles: { px: 3 } } } },
});
```

**A second design, chosen in CSS**: `Box.components(styles, { design: 'ember' })` merges `styles` over the app's components
and applies them under `data-design="ember"` — `<Box.Theme design="classic" designStorageKey="design">` writes the
attribute, `Box.useDesign()` switches it, and a pre-paint script that copies the stored value onto `<html>` means no flash
on a prerendered page. Each design rule is one class more specific than the app's, so every state is outranked; a design
cannot delete a key, so it writes `none` (`shadow: 'none'`, `bgGradient: 'none'`). Its colours are `Box.palette()` in a
root `dataAttr={{ 'design=ember': { vars: … } }}`, since every built-in component is drawn in `accent` and `base`. A
subtree whose design React decides is still `Box.createComponents()` + `<Box.Components value>`.

## Extension System

```tsx
export const { extendedProps, extendedPropTypes } = Box.extend(
  { 'brand-primary': '#ff6600' }, // CSS variables
  { imageRendering: [{ values: ['pixelated'] as const, styleName: 'image-rendering' }] }, // New props (`aspectRatio` is built in)
  {
    bgColor: [
      {
        values: ['brand-primary'] as const,
        styleName: 'background-color', // Extend existing
        valueFormat: (v, getVar) => getVar(v),
      },
    ],
  },
);
// TypeScript: declare module '@box-kite/core/types' { namespace Augmented {
//   interface BoxProps extends ExtractBoxStyles<typeof extendedProps> {}
//   interface BoxPropTypes extends ExtractBoxStyles<typeof extendedPropTypes> {}
//   interface ComponentsTypes extends ExtractComponentsAndVariants<typeof components> {} }}
```
