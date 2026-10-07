import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../dev/tests';
import Box from './box';
import BaseSvg from './components/baseSvg';
import Flex from './components/flex';
import { renderToStaticMarkup } from './ssg';

describe('SSG', () => {
  ignoreLogs();

  it('generates static html', () => {
    const el = <Box>test</Box>;

    const result = renderToStaticMarkup(el);

    expect(result.html).toEqual('<div class="_b">test</div>');
  });

  it('generates static html with hoverGroup', () => {
    const el = (
      <Box className="parent">
        <Box hoverGroup={{ parent: { display: 'grid' } }}>test</Box>
      </Box>
    );

    const result = renderToStaticMarkup(el);

    expect(result.html).toEqual('<div class="_b parent"><div class="_b hover-parent-display-grid">test</div></div>');
  });

  it('generates static html with hoverGroup2', () => {
    const el = (
      <html>
        <head>
          <title>my website</title>
        </head>
        <Flex ai="center" position="relative" cursor="pointer" pb={2} pl={2} className="parent">
          <Flex
            bgColor="white"
            position="absolute"
            right={0}
            top={6}
            borderRadius={2}
            d="column"
            display="none"
            hoverGroup={{ parent: { display: 'block' } }}
          >
            <Box>test</Box>
          </Flex>
        </Flex>
      </html>
    );

    const result = renderToStaticMarkup(el);

    // Check for required CSS rules (order may vary due to incremental generation)
    expect(result.styles).not.includes('--white:');
    expect(result.styles).includes(':root{--borderColor: black;');
    expect(result.styles).includes('._b{display: block;');
    expect(result.styles).includes('._s{display: block;');
    expect(result.styles).includes('.borderRadius-2{border-radius:0.5rem}');
    expect(result.styles).includes('.display-flex{display:flex}');
    expect(result.styles).includes('.ai-center{align-items:center}');
    expect(result.styles).includes('.position-relative{position:relative}');
    expect(result.styles).includes('.position-absolute{position:absolute}');
    expect(result.styles).includes('.cursor-pointer{cursor:pointer}');
    expect(result.styles).includes('.pb-2{padding-bottom:0.5rem}');
    expect(result.styles).includes('.pl-2{padding-left:0.5rem}');
    expect(result.styles).includes('.bgColor-white{background-color:var(--white,#fff)}');
    expect(result.styles).includes('.parent:hover .hover-parent-display-block{display:block}');

    // Check HTML structure
    expect(result.html).includes('<style id="box-kite-styles">');
    expect(result.html).includes('<title>my website</title>');
    expect(result.html).includes('class="_b display-flex ai-center position-relative cursor-pointer pb-2 pl-2 parent"');
    expect(result.html).includes(
      'class="_b display-none bgColor-white position-absolute right-0 top-6 borderRadius-2 d-column hover-parent-display-block"',
    );
  });

  it('multiple generations of static html', () => {
    const el = (
      <Box className="parent">
        <Box hoverGroup={{ parent: { display: 'grid' } }}>test</Box>
      </Box>
    );
    const el2 = (
      <Box inline>
        <Box width={20}>test</Box>
      </Box>
    );

    const result = renderToStaticMarkup(el);
    const result2 = renderToStaticMarkup(el2);

    const expected1 = '<div class="_b parent"><div class="_b hover-parent-display-grid">test</div></div>';
    const expected2 = '<div class="_b inline-true"><div class="_b width-20">test</div></div>';

    expect(result.html).toEqual(expected1);
    expect(result2.html).toEqual(expected2);

    expect(result.styles).includes('display:grid');
    expect(result2.styles).not.includes('display:grid');
    expect(result2.styles).includes('display:inline-block');
  });

  it('renders the SVG paint props into the static stylesheet', () => {
    const el = (
      <BaseSvg
        fill="none"
        stroke="violet-500"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="8 4"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M4 12h16" />
      </BaseSvg>
    );

    const result = renderToStaticMarkup(el);

    expect(result.styles).includes('.stroke-violet-500{stroke:var(--violet-500,oklch(60.6% .25 292.7))}');
    expect(result.styles).includes('.strokeWidth-2{stroke-width:2}');
    expect(result.styles).includes('.strokeLinecap-round{stroke-linecap:round}');
    expect(result.styles).includes('.strokeDasharray-8_4{stroke-dasharray:8 4}');
    expect(result.styles).includes('.vectorEffect-non-scaling-stroke,.vectorEffect-non-scaling-stroke *{vector-effect:non-scaling-stroke}');
    // The class attribute is what the descendant selector hangs off, so it has to survive the space.
    expect(result.html).includes('strokeDasharray-8_4 vectorEffect-non-scaling-stroke');
  });

  it('renders the SVG geometry and text props into the static stylesheet', () => {
    const el = (
      <BaseSvg viewBox="0 0 64 64" textAnchor="middle" dominantBaseline="central">
        <Box tag="circle" cx={32} cy={32} r={20} fill="sky-500" />
        <Box tag="rect" x={8} y={8} rx={4} ry={4} fill="none" stroke="sky-700" />
      </BaseSvg>
    );

    const result = renderToStaticMarkup(el);

    // Geometry is in user units, so the numbers reach CSS exactly as they were written.
    expect(result.styles).includes('.cx-32{cx:32}');
    expect(result.styles).includes('.cy-32{cy:32}');
    expect(result.styles).includes('.r-20{r:20}');
    expect(result.styles).includes('.x-8{x:8}');
    expect(result.styles).includes('.y-8{y:8}');
    expect(result.styles).includes('.rx-4{rx:4}');
    expect(result.styles).includes('.ry-4{ry:4}');
    expect(result.styles).includes('.textAnchor-middle{text-anchor:middle}');
    expect(result.styles).includes('.dominantBaseline-central,.dominantBaseline-central *{dominant-baseline:central}');
  });
});
