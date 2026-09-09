import { MousePointer2 } from 'lucide-react';
import { useState } from 'react';
import buttonApi from '../../api/components/button.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function ButtonPage() {
  useTableOfContents(sidebarLinks);
  const [counter, setCounter] = useState(0);

  return (
    <Box>
      <PageHeader
        icon={MousePointer2}
        title="Button"
        description="Interactive button component with multiple variants, states, and customization options."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Button from '@box-kite/react/components/button';" />

          <Code id="basic" label="Basic Button" language="jsx">
            <Flex gap={4} flexWrap="wrap">
              <Button>Click me!</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </Flex>
          </Code>

          <Code id="disabled" label="Disabled State" language="jsx">
            <Flex gap={4}>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </Flex>
          </Code>

          <Code id="counter" label="With Counter" language="jsx">
            <Flex gap={4} ai="center">
              <Button onClick={() => setCounter((c) => c + 1)}>Clicked {counter} times</Button>
              <Button variant="secondary" onClick={() => setCounter(0)}>
                Reset
              </Button>
            </Flex>
          </Code>

          <Code id="custom" label="Custom Styling" language="jsx">
            <Flex gap={4} flexWrap="wrap">
              <Button
                bgColor="emerald-500"
                hover={{ bgColor: 'emerald-600' }}
                theme={{ dark: { bgColor: 'emerald-500', hover: { bgColor: 'emerald-600' } } }}
              >
                Success
              </Button>
              <Button
                bgColor="rose-500"
                hover={{ bgColor: 'rose-600' }}
                theme={{ dark: { bgColor: 'rose-500', hover: { bgColor: 'rose-600' } } }}
              >
                Danger
              </Button>
              <Button bgImage="gradient-accent">Gradient</Button>
            </Flex>
          </Code>

          <Code id="sizes" label="Sizes" language="jsx">
            <Flex gap={4} ai="center" flexWrap="wrap">
              <Button py={2} px={3} fontSize={12}>
                Small
              </Button>
              <Button>Default</Button>
              <Button py={4} px={8} fontSize={16}>
                Large
              </Button>
            </Flex>
          </Code>
          <ApiReference api={buttonApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'basic', label: 'Basic Button' },
  { id: 'disabled', label: 'Disabled State' },
  { id: 'counter', label: 'With Counter' },
  { id: 'custom', label: 'Custom Styling' },
  { id: 'sizes', label: 'Sizes' },
  ...apiSections(buttonApi),
];
