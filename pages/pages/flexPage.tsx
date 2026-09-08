import { Rows3 } from 'lucide-react';
import flexApi from '../../api/components/flex.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function FlexPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader icon={Rows3} title="Flex" description="A shortcut component for display: flex with alignment and spacing props." />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Flex from '@box-kite/react/components/flex';" />

          <Code
            id="basic"
            label="Basic Flex"
            language="jsx"
            code={`<Flex gap={4} ai="center">
  <Box p={4} bgColor="violet-400" borderRadius={1} color="white">Item 1</Box>
  <Box p={4} bgColor="violet-500" borderRadius={1} color="white">Item 2</Box>
  <Box p={4} bgColor="violet-600" borderRadius={1} color="white">Item 3</Box>
</Flex>`}
          >
            <Flex gap={4} ai="center">
              <Box p={4} bgColor="violet-400" borderRadius={1} color="white">
                Item 1
              </Box>
              <Box p={4} bgColor="violet-500" borderRadius={1} color="white">
                Item 2
              </Box>
              <Box p={4} bgColor="violet-600" borderRadius={1} color="white">
                Item 3
              </Box>
            </Flex>
          </Code>

          <Code
            id="column"
            label="Column Direction"
            language="jsx"
            code={`<Flex d="column" gap={4}>
  <Box p={4} bgColor="indigo-400" borderRadius={1} color="white">Row 1</Box>
  <Box p={4} bgColor="indigo-500" borderRadius={1} color="white">Row 2</Box>
  <Box p={4} bgColor="indigo-600" borderRadius={1} color="white">Row 3</Box>
</Flex>`}
          >
            <Flex d="column" gap={4}>
              <Box p={4} bgColor="indigo-400" borderRadius={1} color="white">
                Row 1
              </Box>
              <Box p={4} bgColor="indigo-500" borderRadius={1} color="white">
                Row 2
              </Box>
              <Box p={4} bgColor="indigo-600" borderRadius={1} color="white">
                Row 3
              </Box>
            </Flex>
          </Code>

          <Code
            id="justify"
            label="Justify Content"
            language="jsx"
            code={`<Flex jc="space-between" ai="center" p={4} bgColor="slate-100" borderRadius={1}>
  <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">Start</Box>
  <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">Middle</Box>
  <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">End</Box>
</Flex>`}
          >
            <Flex jc="space-between" ai="center" p={4} bgColor="slate-100" borderRadius={1}>
              <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">
                Start
              </Box>
              <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">
                Middle
              </Box>
              <Box p={3} bgColor="emerald-500" borderRadius={1} color="white">
                End
              </Box>
            </Flex>
          </Code>

          <Code
            id="wrap"
            label="Flex Wrap"
            language="jsx"
            code={`<Flex gap={4} flexWrap="wrap">
  {[1, 2, 3, 4, 5, 6].map(i => (
    <Box key={i} p={4} width={24} bgColor="sky-500" borderRadius={1} color="white" textAlign="center">
      {i}
    </Box>
  ))}
</Flex>`}
          >
            <Flex gap={4} flexWrap="wrap">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Box key={i} p={4} width={24} bgColor="sky-500" borderRadius={1} color="white" textAlign="center">
                  {i}
                </Box>
              ))}
            </Flex>
          </Code>
          <ApiReference api={flexApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'basic', label: 'Basic' },
  { id: 'column', label: 'Column Direction' },
  { id: 'justify', label: 'Justify Content' },
  { id: 'wrap', label: 'Flex Wrap' },
  ...apiSections(flexApi),
];
