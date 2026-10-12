import { ArrowRight, Bot, Check, CirclePlay, FileCode2, PlugZap, Radar, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { ReactNode, useId, useMemo, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H1, H2, H3, Label, Li, Link, P, Ul } from '../../src/components/semantics';
import Tabs from '../../src/components/tabs';
import Textarea from '../../src/components/textarea';
import Code from '../components/code';
import Mono from '../components/mono';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { MONO_FONT } from '../site/fonts';
import { playgroundHref } from '../site/playground';
import { SITE_URL } from '../site/site';
import {
  CHECK_EXAMPLES,
  checkProps,
  CURSOR_INSTALL_URL,
  FAQ,
  parseProps,
  playgroundSnippet,
  PropCheck,
  Verdict,
  VSCODE_INSTALL_URL,
} from './aiContext';
import { agentTools, shipped, totals } from './home';
import { MCP_SERVER } from './start';

export default function AiContextPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <Hero />

      <Reveal delay={0.2}>
        <Flex d="column" gap={14}>
          <Section
            id="try"
            title="Try it: the check your agent runs"
            lead="A value Box Kite does not accept writes no CSS and says nothing — so an agent cannot tell a typo from a style that worked. This is the MCP server's check_styles, running the real engine in this tab. Edit the props, or pick an example."
          >
            <StyleChecker />
          </Section>

          <Section id="why" title="Why agents get it right">
            <Box mb={6}>
              A model writing against a library it has not seen guesses, and the guesses that compile are the expensive ones. Box
              Kite&rsquo;s prop names collide with other libraries&rsquo; while the numbers mean different things —{' '}
              <Mono>p=&#123;4&#125;</Mono> is a rem, <Mono>fontSize=&#123;14&#125;</Mono> is pixels, <Mono>b=&#123;1&#125;</Mono> is one
              pixel — so none of it is left to be guessed.
            </Box>
            <Grid3>
              <Reason
                icon={FileCode2}
                title="The instructions travel with the code"
                description="Installing the package installs AGENTS.md, the whole prop reference and a docs folder beside it. There is nothing to fetch, nothing to keep in sync and no version skew: the files were generated from the same registry the code was built from."
              />
              <Reason
                icon={ShieldCheck}
                title="The compiler catches the rest"
                description={`${totals.props} props are typed unions, so a value a model invented is an error in the editor rather than an element that renders with no background — and the diagnostic names the nearest real value, which is a repair an agent can apply on its own.`}
              />
              <Reason
                icon={Radar}
                title="One question needs the engine"
                description="A value this library refuses writes no CSS and says nothing about it, which is right and is invisible. The MCP server runs the real engine so the answer to “did that work?” is measured rather than recalled."
              />
            </Grid3>
          </Section>

          <Section id="setup" title="Every route, by hand">
            <Box mb={6}>
              Three routes in, and they compose — an <Mono>AGENTS.md</Mono> in the root for the rules, the MCP server for the questions that
              come up mid-task. Pick the first one that fits your agent — or, for a new project,{' '}
              <SiteLink to="/start-with-ai" {...linkStyles}>
                one prompt
              </SiteLink>{' '}
              that has the agent do all of it.
            </Box>

            <Flex d="column" gap={6}>
              <Route
                icon={FileCode2}
                title="A file in your repository root"
                description="Codex, Cursor, Copilot, VS Code, Windsurf, Cline and Zed read a root AGENTS.md natively; Claude Code reads CLAUDE.md, so one line saying @AGENTS.md points it at the same file. A file in the root is read on every run — one referenced by hand is read when somebody remembers."
              >
                <Code
                  language="shell"
                  code={`cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md
echo '@AGENTS.md' > CLAUDE.md   # Claude Code reads this one`}
                />
              </Route>

              <Route
                icon={Terminal}
                title="As a skill, in roughly forty-five agents"
                description="Agent Skills are an open standard, so one SKILL.md reaches nearly all of them — and unlike a file you copy, an install command keeps it current. Same rules as AGENTS.md, with a measured table of the dividers and four references it loads only when the question needs them."
              >
                <Flex d="column" gap={4}>
                  <Code
                    language="shell"
                    label="Any agent — Claude Code, Cursor, Codex, Copilot, Gemini CLI, Zed…"
                    code={`npx skills add box-kite/box-kite
npx skills add box-kite/box-kite -a cursor -g   # one agent, and globally`}
                  />
                  <Code
                    language="shell"
                    label="Claude Code, as a plugin"
                    code={`/plugin marketplace add box-kite/box-kite
/plugin install box-kite@box-kite`}
                  />
                  <Code
                    language="shell"
                    label="Cursor, as a rule file"
                    code={`mkdir -p .cursor/rules
cp node_modules/@box-kite/react/.cursor/rules/box-kite.mdc .cursor/rules/
curl -O ${SITE_URL}/box-kite.mdc   # or without the package installed`}
                  />
                </Flex>
              </Route>

              <Route
                icon={PlugZap}
                title="As an MCP server, with the engine behind it"
                description="A file is read once, at the start. A server is asked mid-task, which is when the question actually comes up. No key and no network: the references and the engine are built into the package."
              >
                <Flex d="column" gap={4}>
                  <Code language="shell" label="Claude Code" code={`claude mcp add box-kite -- ${MCP_SERVER}`} />
                  <Code
                    language="json"
                    label="Cursor, VS Code, Codex, Zed — anything that speaks stdio"
                    code={`{
  "mcpServers": {
    "box-kite": { "command": "npx", "args": ["-y", "@box-kite/mcp"] }
  }
}`}
                  />
                </Flex>
              </Route>
            </Flex>
          </Section>

          <Section id="package" title="What is in the package">
            <Box mb={6}>
              All of it generated during the build — the prop reference from the registry itself, the component table from the built
              chunks&rsquo; own exports — because a stale instruction file is worse than none: an agent trusts it over its own priors. The
              build fails if a generated file comes out empty, if a component no longer loads, or if the reference disagrees with itself
              about the prop count.
            </Box>

            <Box overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell>File</HeadCell>
                    <HeadCell>What it is</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shipped.map((file) => (
                    <TableRow key={file.path}>
                      <Cell whiteSpace="nowrap">
                        <Mono>{file.path}</Mono>
                      </Cell>
                      <Cell>{file.what}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="check" title="The MCP server's six tools">
            <Box mb={6}>
              <Mono>check_styles</Mono> is the one{' '}
              <Link props={{ href: '#try' }} {...linkStyles}>
                you tried above
              </Link>
              : no reference can settle whether a value worked, because a value this library refuses writes{' '}
              <strong>no rule and no class name</strong>, silently. The other five answer what a goal needs without already knowing its name
              — capability level rather than one tool per document.
            </Box>

            <Box overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell>Tool</HeadCell>
                    <HeadCell>What it answers</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agentTools.map((tool) => (
                    <TableRow key={tool.name}>
                      <Cell whiteSpace="nowrap">
                        <Mono>{tool.name}</Mono>
                      </Cell>
                      <Cell>{tool.what}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="markdown" title="The docs site answers in markdown">
            <Box mb={6}>
              An agent that fetches a documentation page gets an HTML shell and a JavaScript bundle it has no reason to parse. Every page
              here is also served as markdown at its own address with <Mono>.md</Mono> appended, and <Mono>llms.txt</Mono> is the index of
              all of them — one line per page, with the block of facts to read before writing any props. The files are converted from the
              pages themselves during the build, so nothing here is a second copy that can fall behind.
            </Box>
            <Code
              language="shell"
              code={`curl ${SITE_URL}/llms.txt      # the index: every page, and what each one covers
curl ${SITE_URL}/box.md        # any page, as markdown — append .md to the address
curl ${SITE_URL}/props.md      # every prop, the CSS it writes, one measured example
curl ${SITE_URL}/skill.md      # the skill itself, for an agent with no install command
curl ${SITE_URL}/box-kite.mdc  # and the Cursor rule
curl ${SITE_URL}/llms-full.txt # all of it in one file, for a tool that indexes a site`}
            />
          </Section>

          <Section id="runtime" title="And what an AI may build at runtime">
            <Box mb={6}>
              Everything above is for whatever writes your code. <Mono>catalog()</Mono> is the other half: what a model is allowed to
              compose while your app is running. It describes every component and every value its props take, as JSON Schema — so a
              generated tree can be validated before it renders, and a colour it asks for has to be one the theme has. The prop registry is
              read live, so a <Mono>Box.extend()</Mono> prop is in the catalog with nothing regenerated. <Mono>&lt;SpecRenderer&gt;</Mono>{' '}
              renders the answer: a name the app did not register renders nothing, a prop the schema refuses is dropped, and the only prop
              that can become a function is one the catalog calls an event.
            </Box>
            <Code
              language="javascript"
              code={`import { catalog } from '@box-kite/react/catalog';
import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';

// The allow-list is yours: the library ships everything it can render.
const allowed = catalog({ include: ['Flex', 'H2', 'P', 'Sparkline'], styleProps: ['d', 'gap', 'p', 'bgColor', 'fontSize'] });

allowed.components.Flex.props;   // a strict JSON Schema, ready for a structured-output API
allowed.rules;                   // the dividers — what a schema cannot say and a prompt must

// And the other half: render what came back, against the components this app allows.
const registry = createSpecRegistry({ catalog: allowed, components: { Flex, H2, P, Sparkline } });

<SpecRenderer spec={spec} registry={registry} data={data} onAction={(action) => run(action)} />;`}
            />

            <Ul display="flex" d="column" gap={2} listStyle="none" p={0} mt={6} m={0}>
              <Next to="/generative-ui">The catalog and the renderer, in full</Next>
              <Next to="/interop">AI SDK, assistant-ui, CopilotKit, AG-UI and A2UI, in one vocabulary</Next>
              <Next to="/agent">The components an agent&rsquo;s turn needs: the tool call, the approval, the reasoning</Next>
              <Next to="/box">Every prop, with the CSS the engine writes for it</Next>
            </Ul>
          </Section>

          <Section id="faq" title="Questions">
            <Box display="grid" gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={6}>
              {FAQ.map(({ question, answer }) => (
                <Box key={question}>
                  <H3 fontSize={15} fontWeight={600} mb={2} theme={headingTheme}>
                    {question}
                  </H3>
                  <P fontSize={14} lineHeight={22}>
                    {answer}
                  </P>
                </Box>
              ))}
            </Box>
          </Section>

          <ClosingCta />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'try', label: 'Try it' },
  { id: 'why', label: 'Why it works' },
  { id: 'setup', label: 'Every route, by hand' },
  { id: 'package', label: "What's in the package" },
  { id: 'check', label: 'The MCP server' },
  { id: 'markdown', label: 'Docs as markdown' },
  { id: 'runtime', label: 'At runtime' },
  { id: 'faq', label: 'Questions' },
];

const headingTheme = { dark: { color: 'white' }, light: { color: 'slate-900' } } as const;
const textTheme = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const cardTheme = {
  dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
  light: { bgColor: 'white', borderColor: 'slate-200' },
} as const;
const linkStyles = {
  display: 'inline',
  theme: { dark: { color: 'violet-400' }, light: { color: 'violet-600' } },
  hover: { textDecoration: 'underline' },
} as const;
const ctaStyles = { display: 'inline-flex', ai: 'center', jc: 'center', gap: 2, px: 5, py: 2.5, fontSize: 15 } as const;

/** The first screen does one job: get the reader's agent set up, or get them trying it — reading comes after. */
function Hero() {
  return (
    <Box mb={14}>
      <Reveal>
        <Flex
          ai="center"
          gap={2}
          props={{ 'data-md': 'skip' }}
          width="fit-content"
          px={3}
          py={1.5}
          mb={5}
          borderRadius={10}
          fontSize={13}
          fontWeight={500}
          theme={{ dark: { bgColor: 'slate-800', color: 'indigo-300' }, light: { bgColor: 'indigo-50', color: 'indigo-700' } }}
        >
          <Icon size={3.5}>
            <Bot />
          </Icon>
          Claude Code · Cursor · Copilot · Codex · Windsurf · Zed
        </Flex>
      </Reveal>

      <Reveal delay={0.05}>
        <H1
          fontSize={32}
          lineHeight={40}
          sm={{ fontSize: 44, lineHeight: 52 }}
          fontWeight={800}
          letterSpacing={-1}
          textWrap="balance"
          maxWidth={190}
          mb={4}
        >
          <Box tag="span" display="inline" theme={headingTheme}>
            Teach your AI agent Box&nbsp;Kite{' '}
          </Box>
          <Box
            tag="span"
            display="inline"
            bgGradient={{ linear: 'r', colors: ['indigo-500', 'violet-500', 'pink-500'] }}
            bgClip="text"
            color="transparent"
          >
            in one command
          </Box>
        </H1>
        <P fontSize={16} sm={{ fontSize: 18 }} lineHeight={28} maxWidth={170} mb={8} theme={textTheme}>
          The rules, all {totals.props} props and an MCP server that runs the real engine ship inside the package. Pick your agent, paste
          one line, and it writes Box Kite right the first time — then checks its own work.
        </P>
      </Reveal>

      <Reveal delay={0.1}>
        <AgentSetup />

        <Flex props={{ 'data-md': 'skip' }} gap={3} mt={6} d="column" sm={{ d: 'row' }} flexWrap="wrap">
          <SiteLink to="/start-with-ai" component="button" {...ctaStyles}>
            <Icon size={4.5}>
              <Zap />
            </Icon>
            Start a new app with AI
            <Icon size={4}>
              <ArrowRight />
            </Icon>
          </SiteLink>
          <Link props={{ href: '#try' }} component="button" variant="secondary" {...ctaStyles}>
            <Icon size={4.5}>
              <Radar />
            </Icon>
            Try the checker
          </Link>
          <SiteLink to="/playground" component="button" variant="secondary" {...ctaStyles}>
            <Icon size={4.5}>
              <CirclePlay />
            </Icon>
            Open the playground
          </SiteLink>
        </Flex>

        <Ul display="flex" flexWrap="wrap" gap={5} rowGap={2} mt={6} p={0} listStyle="none" fontSize={13} theme={textTheme}>
          {['No API key', 'Runs on your machine', 'Generated from the engine', 'Free and MIT licensed'].map((point) => (
            <Li key={point} display="flex" ai="center" gap={1.5}>
              <Icon size={4} color="emerald-500">
                <Check />
              </Icon>
              {point}
            </Li>
          ))}
        </Ul>
      </Reveal>
    </Box>
  );
}

/**
 * One tab per agent, each with the shortest setup that agent has — a button where it takes an install link.
 * Skipped in the markdown mirror: an agent cannot click an install link, and "Every route, by hand" repeats the rest.
 */
function AgentSetup() {
  return (
    <Box props={{ 'data-md': 'skip' }} b={1} borderRadius={3} shadow="lg" p={4} sm={{ p: 5 }} theme={cardTheme}>
      <Tabs defaultValue="claude" keepMounted>
        <Tabs.List label="Your agent" css={{ overflowX: 'auto' }}>
          <Tabs.Tab value="claude">Claude Code</Tabs.Tab>
          <Tabs.Tab value="cursor">Cursor</Tabs.Tab>
          <Tabs.Tab value="vscode">VS Code</Tabs.Tab>
          <Tabs.Tab value="any">Any agent</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="claude">
          <SetupNote>The MCP server checks every style it writes; the skill teaches it the rules before it starts.</SetupNote>
          <Code
            language="shell"
            code={`claude mcp add box-kite -- ${MCP_SERVER}
npx skills add box-kite/box-kite`}
          />
        </Tabs.Panel>

        <Tabs.Panel value="cursor">
          <SetupNote>One click adds the MCP server; the command adds the rules as a Cursor skill.</SetupNote>
          <InstallButton href={CURSOR_INSTALL_URL}>Add to Cursor</InstallButton>
          <Code language="shell" code="npx skills add box-kite/box-kite -a cursor" />
        </Tabs.Panel>

        <Tabs.Panel value="vscode">
          <SetupNote>One click adds the MCP server to Copilot&rsquo;s agent mode; the command adds the rules.</SetupNote>
          <InstallButton href={VSCODE_INSTALL_URL}>Install in VS Code</InstallButton>
          <Code language="shell" code="npx skills add box-kite/box-kite" />
        </Tabs.Panel>

        <Tabs.Panel value="any">
          <SetupNote>
            Codex, Windsurf, Cline, Zed, Gemini CLI — every agent that reads <Mono>AGENTS.md</Mono> or installs a skill.{' '}
            <Link props={{ href: '#setup' }} {...linkStyles}>
              The MCP config for each
            </Link>{' '}
            is below.
          </SetupNote>
          <Code
            language="shell"
            code={`npx skills add box-kite/box-kite
# or, with the package installed:
cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md`}
          />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}

function SetupNote({ children }: { children: ReactNode }) {
  return (
    <P fontSize={14} lineHeight={22} mb={4} theme={textTheme}>
      {children}
    </P>
  );
}

/** An editor's own install link, so it opens the editor rather than a page. */
function InstallButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link props={{ href }} component="button" {...ctaStyles} mb={4}>
      <Icon size={4.5}>
        <PlugZap />
      </Icon>
      {children}
    </Link>
  );
}

const VERDICTS = {
  ok: { mark: '✓', label: 'wrote CSS', dark: 'emerald-400', light: 'emerald-600' },
  misread: { mark: '!', label: 'wrote the wrong unit', dark: 'amber-400', light: 'amber-600' },
  rejected: { mark: '✕', label: 'wrote nothing', dark: 'red-400', light: 'red-600' },
  attribute: { mark: '!', label: 'dropped', dark: 'amber-400', light: 'amber-600' },
  unknown: { mark: '✕', label: 'not a prop', dark: 'red-400', light: 'red-600' },
} as const satisfies Record<Verdict, { mark: string; label: string; dark: string; light: string }>;

/** `check_styles` in the page: the same engine and diagnostics the MCP server and the console use. */
function StyleChecker() {
  const [source, setSource] = useState<string>(CHECK_EXAMPLES[0].source);
  const parsed = useMemo(() => parseProps(source), [source]);
  // Half-typed props are not valid JSX yet, so the last answer stays up rather than the card collapsing per keystroke.
  const [lastValid, setLastValid] = useState(parsed);
  if (parsed.ok && parsed !== lastValid) setLastValid(parsed);
  const checks = useMemo(() => (lastValid.ok ? checkProps(lastValid.props) : []), [lastValid]);
  const inputId = useId();
  const problems = checks.filter((check) => check.verdict !== 'ok').length;

  return (
    <Box b={1} borderRadius={3} overflow="hidden" shadow="lg" theme={cardTheme}>
      <Flex
        props={{ 'data-md': 'skip' }}
        ai="center"
        jc="space-between"
        gap={3}
        flexWrap="wrap"
        px={4}
        py={3}
        bb={1}
        theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
      >
        <Flex ai="center" gap={2} fontSize={13} fontWeight={600} theme={headingTheme}>
          <Icon size={4}>
            <Radar />
          </Icon>
          <Mono>check_styles</Mono>
        </Flex>
        <Flex gap={2} flexWrap="wrap" props={{ role: 'group', 'aria-label': 'Examples' }}>
          {CHECK_EXAMPLES.map((example) => (
            <Button
              key={example.label}
              variant="secondary"
              px={3}
              py={1}
              fontSize={13}
              borderRadius={10}
              props={{ 'aria-pressed': source === example.source }}
              ariaAttr={{ pressed: { borderColor: 'indigo-500', bgColor: 'indigo-500/10' } }}
              onClick={() => setSource(example.source)}
            >
              {example.label}
            </Button>
          ))}
        </Flex>
      </Flex>

      <Box p={4} props={{ 'data-md': 'skip' }}>
        <Label props={{ htmlFor: inputId }} display="block" fontSize={13} fontWeight={500} mb={2} theme={textTheme}>
          Props to check — JSX, as an agent writes it
        </Label>
        <Textarea
          id={inputId}
          width="fit"
          rows={2}
          fontSize={14}
          css={{ fontFamily: MONO_FONT }}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          props={{ spellCheck: false, autoCapitalize: 'off', autoComplete: 'off' }}
        />
      </Box>

      <Box px={4} pb={4}>
        {!parsed.ok && (
          <P fontSize={14} mb={3} theme={{ dark: { color: 'amber-400' }, light: { color: 'amber-700' } }}>
            {parsed.error}
          </P>
        )}
        <Ul display="flex" d="column" gap={2} p={0} m={0} listStyle="none" opacity={parsed.ok ? 1 : 0.5}>
          {checks.map((check, index) => (
            <CheckRow key={`${index}-${check.name}`} check={check} />
          ))}
        </Ul>
      </Box>

      <Flex
        props={{ 'data-md': 'skip' }}
        ai="center"
        jc="space-between"
        gap={3}
        flexWrap="wrap"
        px={4}
        py={3}
        bt={1}
        fontSize={13}
        theme={{
          dark: { borderColor: 'slate-700', bgColor: 'slate-900', color: 'slate-400' },
          light: { borderColor: 'slate-200', bgColor: 'slate-50', color: 'slate-600' },
        }}
      >
        <Box>
          {problems ? `${problems} of ${checks.length} would ship silently broken. ` : ''}
          Your agent gets these answers mid-task from the MCP server.
        </Box>
        <SiteLink to={playgroundHref(playgroundSnippet(source))} {...linkStyles} display="inline-flex" ai="center" gap={1}>
          Render it in the playground
          <Icon size={3.5}>
            <ArrowRight />
          </Icon>
        </SiteLink>
      </Flex>
    </Box>
  );
}

function CheckRow({ check }: { check: PropCheck }) {
  const verdict = VERDICTS[check.verdict];

  return (
    <Li
      display="flex"
      gap={3}
      ai="flex-start"
      p={3}
      borderRadius={2}
      theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'slate-50' } }}
    >
      <Flex
        flexShrink={0}
        width={6}
        height={6}
        ai="center"
        jc="center"
        borderRadius={10}
        fontSize={13}
        fontWeight={700}
        color="white"
        theme={{ dark: { bgColor: verdict.dark }, light: { bgColor: verdict.light } }}
        props={{ 'aria-hidden': true }}
      >
        {verdict.mark}
      </Flex>
      <Box minWidth={0} flex1>
        <Flex gap={2} ai="baseline" flexWrap="wrap" mb={1}>
          <Mono>{check.written}</Mono>{' '}
          <Box tag="span" fontSize={13} fontWeight={600} theme={{ dark: { color: verdict.dark }, light: { color: verdict.light } }}>
            {verdict.label}
          </Box>
        </Flex>
        {check.note && (
          <P fontSize={14} lineHeight={22} theme={textTheme}>
            {check.note}
          </P>
        )}
        {check.css && (
          <Box
            tag="code"
            display="block"
            mt={1}
            fontSize={12}
            lineHeight={18}
            css={{ fontFamily: MONO_FONT, overflowWrap: 'anywhere' }}
            theme={textTheme}
          >
            {check.css}
          </Box>
        )}
      </Box>
    </Li>
  );
}

/** The last thing on a long page is the first thing it asked for, for whoever read it all first. */
function ClosingCta() {
  return (
    <Flex
      d="column"
      md={{ d: 'row', ai: 'center', p: 8 }}
      jc="space-between"
      gap={6}
      p={6}
      borderRadius={4}
      color="white"
      bgGradient={{ linear: 'r', colors: ['indigo-600', 'violet-600'] }}
    >
      <Box>
        <H2 fontSize={22} fontWeight={700} mb={2}>
          Ready when your agent is
        </H2>
        <P fontSize={15} lineHeight={24} color="white/80">
          Start a new app from one prompt, or add Box Kite to the project you already have.
        </P>
      </Box>
      <Flex gap={3} d="column" sm={{ d: 'row' }} flexShrink={0}>
        <SiteLink to="/start-with-ai" component="button" variant="secondary" {...ctaStyles}>
          Start with AI
          <Icon size={4}>
            <ArrowRight />
          </Icon>
        </SiteLink>
        <SiteLink
          to="/installation"
          {...ctaStyles}
          borderRadius={2}
          b={1}
          borderColor="white/40"
          hover={{ bgColor: 'white/10' }}
          fontWeight={500}
        >
          Install by hand
        </SiteLink>
      </Flex>
    </Flex>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <Box id={id} css={{ scrollMarginTop: '5rem' }}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={headingTheme}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={textTheme}>
        {lead && <P mb={6}>{lead}</P>}
        {children}
      </Box>
    </Box>
  );
}

/** Three across on a desktop, stacked on a phone. */
function Grid3({ children }: { children: ReactNode }) {
  return (
    <Box display="grid" gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={4}>
      {children}
    </Box>
  );
}

function Reason({ icon: ReasonIcon, title, description }: { icon: typeof Bot; title: string; description: string }) {
  return (
    <Flex d="column" gap={3} p={4} b={1} borderRadius={3} theme={cardTheme}>
      <Flex width={10} height={10} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
        <ReasonIcon size={20} />
      </Flex>
      <H3 fontSize={15} fontWeight={600} theme={headingTheme}>
        {title}
      </H3>
      <Box fontSize={14} lineHeight={22} theme={textTheme}>
        {description}
      </Box>
    </Flex>
  );
}

interface RouteProps {
  icon: typeof Bot;
  title: string;
  description: string;
  children: ReactNode;
}

function Route({ icon: RouteIcon, title, description, children }: RouteProps) {
  return (
    <Box p={5} b={1} borderRadius={3} theme={cardTheme}>
      <Flex ai="center" gap={3} mb={3}>
        <Flex width={9} height={9} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white" flexShrink={0}>
          <RouteIcon size={18} />
        </Flex>
        <H3 fontSize={16} fontWeight={600} theme={headingTheme}>
          {title}
        </H3>
      </Flex>
      <P fontSize={14} lineHeight={22} mb={4} theme={textTheme}>
        {description}
      </P>
      {children}
    </Box>
  );
}

function Next({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Li fontSize={14} lineHeight={24}>
      <SiteLink to={to} {...linkStyles}>
        {children}
      </SiteLink>
    </Li>
  );
}
