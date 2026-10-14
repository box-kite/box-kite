'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Checkbox from '@box-kite/react/components/checkbox';
import Dropdown from '@box-kite/react/components/dropdown';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { H2, P, Section, Span } from '@box-kite/react/components/semantics';
import { type ReactNode, useId, useMemo, useState } from 'react';
import ProductCard from './product-card';
import { categories, glazes, type Product, products as catalogue } from './store-data';
import { SERIF } from './store-design';

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name';

const sorts: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'Name' },
];

const order: Record<Sort, (a: Product, b: Product) => number> = {
  featured: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name),
};

export interface ProductGridProps {
  products?: readonly Product[];
  title?: string;
}

/**
 * A product grid with filters: categories and glazes as checkboxes, a sort, and a count that is announced
 * as it changes. Filtering is a `useMemo` over the list it is given — hand it the page your API returned.
 */
export default function ProductGrid({ products = catalogue, title = 'Shop the collection' }: ProductGridProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [glaze, setGlaze] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('featured');
  const headingId = useId();

  const shown = useMemo(
    () =>
      [...products]
        .filter((product) => !chosen.length || chosen.includes(product.category))
        .filter((product) => !glaze.length || product.glazes.some((id) => glaze.includes(id)))
        .sort(order[sort]),
    [products, chosen, glaze, sort],
  );

  const toggle = (list: string[], value: string, on: boolean) => (on ? [...list, value] : list.filter((entry) => entry !== value));

  return (
    <Section props={{ 'aria-labelledby': headingId }}>
      <Flex jc="space-between" ai="end" gap={4} flexWrap="wrap" mb={6}>
        <Box>
          <H2 id={headingId} fontSize={30} fontWeight={500} letterSpacing={-0.5} css={{ fontFamily: SERIF }}>
            {title}
          </H2>
          <P mt={1} fontSize={14} color="stone-600" theme={{ dark: { color: 'stone-400' } }} props={{ 'aria-live': 'polite' }}>
            {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}
          </P>
        </Box>
        <Dropdown<Sort>
          label="Sort by"
          value={sort}
          onValueChange={(value) => setSort((value as Sort) ?? 'featured')}
          labelProps={{ minWidth: 52 }}
        >
          {sorts.map((option) => (
            <Dropdown.Item key={option.value} value={option.value}>
              {option.label}
            </Dropdown.Item>
          ))}
        </Dropdown>
      </Flex>

      <Grid gridTemplateColumns={1} md={{ css: { gridTemplateColumns: '14rem minmax(0, 1fr)' } }} gap={8}>
        <Flex d="column" gap={6} fontSize={14}>
          <Filter legend="Category">
            {categories.map((category) => (
              <Checkbox
                key={category}
                label={category}
                checked={chosen.includes(category)}
                onChange={(event) => setChosen(toggle(chosen, category, event.target.checked))}
              />
            ))}
          </Filter>
          <Filter legend="Glaze">
            {Object.values(glazes).map((entry) => (
              <Checkbox
                key={entry.id}
                label={entry.name}
                checked={glaze.includes(entry.id)}
                onChange={(event) => setGlaze(toggle(glaze, entry.id, event.target.checked))}
              />
            ))}
          </Filter>
          {(chosen.length > 0 || glaze.length > 0) && (
            <Button
              variant="secondary"
              alignSelf="start"
              py={1.5}
              px={4}
              fontSize={13}
              onClick={() => {
                setChosen([]);
                setGlaze([]);
              }}
            >
              Clear filters
            </Button>
          )}
        </Flex>

        {shown.length ? (
          <Grid gridTemplateColumns={2} lg={{ gridTemplateColumns: 3 }} columnGap={5} rowGap={8}>
            {shown.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </Grid>
        ) : (
          <Flex
            d="column"
            ai="center"
            jc="center"
            gap={2}
            p={10}
            borderRadius={4}
            bgColor="stone-100"
            theme={{ dark: { bgColor: 'stone-900' } }}
          >
            <Span fontWeight={600}>Nothing matches those filters.</Span>
            <Span fontSize={14} color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
              Try another glaze, or clear them all.
            </Span>
          </Flex>
        )}
      </Grid>
    </Section>
  );
}

/** A group of checkboxes under one caption: a real `<fieldset>`, so the caption is read with each box. */
function Filter({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <Box tag="fieldset" b={0} p={0} m={0}>
      <Box
        tag="legend"
        mb={3}
        fontSize={12}
        fontWeight={600}
        letterSpacing={1}
        textTransform="uppercase"
        color="stone-600"
        theme={{ dark: { color: 'stone-400' } }}
      >
        {legend}
      </Box>
      <Flex d="column" gap={2.5}>
        {children}
      </Flex>
    </Box>
  );
}
