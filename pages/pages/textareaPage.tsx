import { AlignLeft } from 'lucide-react';
import textareaApi from '../../api/components/textarea.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Textarea from '../../src/components/textarea';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function TextareaPage() {
  useTableOfContents([...apiSections(textareaApi)]);
  return (
    <Box>
      <PageHeader icon={AlignLeft} title="Textarea" description="Use Textarea component to enter and edit multiline user data." />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Textarea from '@box-kite/react/components/textarea';" />

          <Code label="Basic Textarea" language="jsx" code='<Textarea placeholder="ex. description" />'>
            <Textarea placeholder="ex. description" theme={{ dark: { bgColor: 'slate-800', color: 'white' } }} />
          </Code>

          <Code label="Disabled Textarea" language="jsx" code='<Textarea disabled defaultValue="Disabled" />'>
            <Textarea disabled defaultValue="Disabled" />
          </Code>
          <ApiReference api={textareaApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}
