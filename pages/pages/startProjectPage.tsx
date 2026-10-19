import { ChevronDown, Rocket } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import { Collapsible } from '../../src/components/accordion';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import RadioGroup from '../../src/components/radioGroup';
import { H2, Li, P, Span, Ul } from '../../src/components/semantics';
import Tabs from '../../src/components/tabs';
import Code from '../components/code';
import { DesignCards } from '../components/designPicker';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import { DesignId, designOf } from '../designs/designs';
import useTableOfContents from '../hooks/useTableOfContents';
import { createCommand, designPath, designSource, installCommand, Language, Manager, MANAGERS, templateSource } from './startProject';

const headingTheme = { dark: { color: 'white' }, light: { color: 'base-900' } } as const;
const textTheme = { dark: { color: 'base-400' }, light: { color: 'base-600' } } as const;
const linkStyles = {
  display: 'inline',
  theme: { dark: { color: 'accent-400' }, light: { color: 'accent-600' } },
  hover: { textDecoration: 'underline' },
} as const;

const OPTIONS: readonly [string, ReactNode][] = [
  ['-d, --design NAME', 'classic, ember, azure or mono. Asks when it is not given.'],
  ['-t, --template NAME', 'react-ts (the default), react-compiler-ts, react or react-compiler. The last two are JavaScript.'],
  ['--no-install', 'Writes the files and skips the install.'],
  ['--overwrite', 'Empties the directory first when it already has files in it.'],
  ['--eslint', 'Uses ESLint instead of Oxlint. Passed to create-vite.'],
  ['--no-interactive', 'Never asks; anything not given takes its default. It asks by default when run in a terminal.'],
];

const sidebarLinks = [
  { id: 'command', label: 'One command' },
  { id: 'what-you-get', label: 'What you get' },
  { id: 'options', label: 'Options' },
  { id: 'by-hand', label: 'By hand' },
  { id: 'next', label: 'Make it yours' },
];

export default function StartProjectPage() {
  useTableOfContents(sidebarLinks);
  const [design, setDesign] = useState<DesignId>('mono');
  const [language, setLanguage] = useState<Language>('ts');
  const [manager, setManager] = useState<Manager>('npm');
  const name = designOf(design).name;
  const ext = language === 'ts' ? 'tsx' : 'jsx';

  return (
    <Box>
      <PageHeader
        icon={Rocket}
        title="Start a project"
        description="One command creates a Vite + React app with Box Kite, a design and a sample page in it, ready for npm run dev."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={14}>
          <Section id="command" title="One command">
            <P mb={5}>
              Pick a design and a language, then copy the command. Each card is drawn in its own design, so what you see is what the app
              starts as, in light and dark.
            </P>
            <DesignCards name="start-design" value={design} onChange={setDesign} />
            <RadioGroup
              label="Language"
              orientation="horizontal"
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
              mt={6}
              mb={5}
            >
              <RadioGroup.Item value="ts" label="TypeScript" />
              <RadioGroup.Item value="js" label="JavaScript" />
            </RadioGroup>
            <Tabs value={manager} onValueChange={(value) => setManager(value as Manager)}>
              <Tabs.List label="Package manager">
                {MANAGERS.map((id) => (
                  <Tabs.Tab key={id} value={id}>
                    {id}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {MANAGERS.map((id) => (
                <Tabs.Panel key={id} value={id} pt={4}>
                  <Code
                    language="shell"
                    label={`${name}, in ${language === 'ts' ? 'TypeScript' : 'JavaScript'}`}
                    code={createCommand(id, design, language)}
                  />
                </Tabs.Panel>
              ))}
            </Tabs>
            <P mt={4} fontSize={14} lineHeight={22}>
              It needs Node 22.12 or later. Run it without <Mono>--design</Mono> and it asks which design you want.
            </P>
          </Section>

          <Section id="what-you-get" title="What you get">
            <P mb={4}>
              The command runs Vite&rsquo;s own <Mono>create-vite</Mono>, so the project is the one Vite gives you, with these changes:
            </P>
            <Ul display="flex" d="column" gap={2} listStyle="disc" ps={5} m={0} mb={6}>
              <Li display="list-item">
                <Mono>@box-kite/react</Mono> and the design&rsquo;s fonts are added to <Mono>package.json</Mono> and installed.
              </Li>
              <Li display="list-item">
                <Mono>{designPath(language)}</Mono> is the design: the two colour families every component is drawn in, the page&rsquo;s
                colours and fonts, and each component&rsquo;s styles, in light and dark.
              </Li>
              <Li display="list-item">
                <Mono>src/main.{ext}</Mono> wraps the app in it, and <Mono>src/index.css</Mono> keeps one rule.
              </Li>
              <Li display="list-item">
                <Mono>src/App.{ext}</Mono> is a sample page: buttons, a dialog, fields, choices, tabs and a data grid, with a switch for
                dark mode. The template&rsquo;s own <Mono>App.css</Mono> and logos are removed.
              </Li>
            </Ul>
            <Flex d="column" gap={3}>
              <FileDisclosure label={`${designPath(language)}, the ${name} design`} code={designSource(language, design)} />
              <FileDisclosure label={`src/App.${ext}, the sample page`} code={templateSource(language, 'src/App')} />
            </Flex>
          </Section>

          <Section id="options" title="Options">
            <P mb={4}>
              With npm the options go after <Mono>--</Mono>; pnpm and yarn take them as they are.
            </P>
            <Box overflowX="auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Option</HeadCell>
                    <HeadCell>What it does</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {OPTIONS.map(([option, description]) => (
                    <TableRow key={option}>
                      <Cell whiteSpace="nowrap">
                        <Mono>{option}</Mono>
                      </Cell>
                      <Cell>{description}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="by-hand" title="By hand">
            <P mb={5}>
              The same result in a Vite app you already have, or one you would rather set up yourself. It uses the design and language
              picked above.
            </P>
            <Flex d="column" gap={6}>
              <HandStep number={1} title="Install Box Kite and the design's fonts">
                <Code language="shell" code={installCommand(manager, design)} />
              </HandStep>
              <HandStep number={2} title={`Save the design as ${designPath(language)}`}>
                <FileDisclosure label={`${designPath(language)}, the ${name} design`} code={designSource(language, design)} />
              </HandStep>
              <HandStep number={3} title={`Wrap the app in it, in src/main.${ext}`}>
                <Code language="jsx" codeOnly check={false} label={`src/main.${ext}`} code={templateSource(language, 'src/main')} />
              </HandStep>
              <HandStep number={4} title="Let the design paint the page">
                <P mb={3}>
                  Replace <Mono>src/index.css</Mono> with this, and delete <Mono>src/App.css</Mono> and its import: the template&rsquo;s
                  styles would fight the design.
                </P>
                <Code language="css" codeOnly label="src/index.css" code={templateSource(language, 'src/index.css')} />
              </HandStep>
            </Flex>
          </Section>

          <Section id="next" title="Make it yours">
            <Ul display="flex" d="column" gap={3} listStyle="disc" ps={5} m={0}>
              <Li display="list-item">
                <strong>Change the colours.</strong> <Mono>Box.palette()</Mono> in the design file points the two families at a palette name
                (<Mono>&apos;emerald&apos;</Mono>) or at a ramp of your own, and every component follows.
              </Li>
              <Li display="list-item">
                <strong>Restyle one component.</strong> Each entry in the design&rsquo;s <Mono>Box.components()</Mono> is one component, in
                light and dark; the{' '}
                <SiteLink to="/theme-setup" {...linkStyles}>
                  theme setup
                </SiteLink>{' '}
                page explains the shape.
              </Li>
              <Li display="list-item">
                <strong>Switch designs later.</strong> Replace the design file with another one from this page and install its fonts.
              </Li>
              <Li display="list-item">
                <strong>Build with an agent.</strong>{' '}
                <SiteLink to="/start-with-ai" {...linkStyles}>
                  Start with AI
                </SiteLink>{' '}
                has prompts that build a landing page and a product page on top of this.
              </Li>
            </Ul>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id} css={{ scrollMarginTop: '5rem' }}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={headingTheme}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={textTheme}>
        {children}
      </Box>
    </Box>
  );
}

function HandStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <Box>
      <Flex ai="center" gap={3} mb={3}>
        <Flex
          ai="center"
          jc="center"
          width={7}
          height={7}
          flexShrink={0}
          borderRadius={999}
          fontSize={13}
          fontWeight={700}
          theme={{ dark: { bgColor: 'base-800', color: 'accent-300' }, light: { bgColor: 'accent-50', color: 'accent-700' } }}
        >
          {number}
        </Flex>
        <Box fontSize={16} fontWeight={600} theme={headingTheme}>
          {title}
        </Box>
      </Flex>
      {children}
    </Box>
  );
}

/** A file too long to read in passing: one line until it is asked for. The copy button works either way. */
function FileDisclosure({ label, code }: { label: string; code: string }) {
  const lines = code.trimEnd().split('\n').length;

  return (
    <Collapsible
      trigger={(trigger) => (
        <Button variant="secondary" width="fit" jc="space-between" {...trigger}>
          <Span>
            {label}{' '}
            <Span fontWeight={400} theme={textTheme}>
              · {lines} lines
            </Span>
          </Span>
          <Icon size={4}>
            <ChevronDown />
          </Icon>
        </Button>
      )}
    >
      <Code language="jsx" codeOnly check={false} label={label.split(',')[0]} code={code} mt={3} />
    </Collapsible>
  );
}
