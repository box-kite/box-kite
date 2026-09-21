import { Bot, FileCode2, PlugZap, Radar, ShieldCheck, Terminal } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, H3, Li, P, Ul } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { SITE_URL } from '../site/site';
import { agentTools, shipped, totals } from './home';

export default function AiContextPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Bot}
        title="Built for AI"
        description="The instructions an agent needs ship inside the package, generated from the engine itself — so what it reads is never a version behind what it writes."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            A model writing against a library it has not seen guesses, and the guesses that compile are the expensive ones. This library was
            renamed at 1.0.0 and its prop surface nearly doubled on the way, so a plausible-looking memory of it is a memory of something
            else — and the prop names collide with other libraries&rsquo; while the numbers mean different things.{' '}
            <Mono>p=&#123;4&#125;</Mono> is a rem, <Mono>fontSize=&#123;14&#125;</Mono> is a pixel size and <Mono>b=&#123;1&#125;</Mono> is
            one pixel. None of that is guessable, so none of it is left to be guessed.
          </Box>

          <Section id="why" title="Three things make it work">
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

          <Section id="setup" title="Setting it up">
            <Box mb={6}>
              Three routes in, and they compose — an <Mono>AGENTS.md</Mono> in the root for the rules, the MCP server for the questions that
              come up mid-task. Pick the first one that fits your agent.
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
                  <Code language="shell" label="Claude Code" code="claude mcp add box-kite -- npx -y @box-kite/mcp" />
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

          <Section id="check" title="The answer a file cannot give">
            <Box mb={6}>
              This library accepts a closed set of values per prop, and a value it does not accept writes{' '}
              <strong>no rule and no class name</strong>, silently — because a typo must never emit a broken declaration. That is the right
              behaviour and it is invisible, which makes &ldquo;did that actually work?&rdquo; the one question no reference can settle.{' '}
              <Mono>check_styles</Mono> hands your props to the real engine and reports what each one wrote.
            </Box>

            <Code
              language="shell"
              label="What check_styles answers"
              code={`check_styles { "props": { "p": 4, "bgColor": "blue-550", "fontSize": 14, "href": "/about" } }

✅ p         → .p-4{padding:1rem}
❌ bgColor     does not accept "blue-550" — no rule and no class name were written.
✅ fontSize  → .fontSize-14{font-size:0.875rem}
⚠️ href        an HTML attribute, not a style prop. It goes in props={{ "href": … }}.`}
            />

            <Box mt={6} mb={6}>
              Six tools, at capability level rather than one per document — so a goal finds the answer without already knowing its name.
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
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'why', label: 'Why it works' },
  { id: 'setup', label: 'Setting it up' },
  { id: 'package', label: "What's in the package" },
  { id: 'check', label: 'The MCP server' },
  { id: 'markdown', label: 'Docs as markdown' },
  { id: 'runtime', label: 'At runtime' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id} css={{ scrollMarginTop: '5rem' }}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

/** Three across on a desktop, stacked on a phone — the `Grid` import would shadow nothing else here. */
function Grid3({ children }: { children: ReactNode }) {
  return (
    <Box display="grid" gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={4}>
      {children}
    </Box>
  );
}

function Reason({ icon: ReasonIcon, title, description }: { icon: typeof Bot; title: string; description: string }) {
  return (
    <Flex
      d="column"
      gap={3}
      p={4}
      b={1}
      borderRadius={3}
      theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
    >
      <Flex width={10} height={10} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
        <ReasonIcon size={20} />
      </Flex>
      <H3 fontSize={15} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H3>
      <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
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
    <Box
      p={5}
      b={1}
      borderRadius={3}
      theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
    >
      <Flex ai="center" gap={3} mb={3}>
        <Flex width={9} height={9} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white" flexShrink={0}>
          <RouteIcon size={18} />
        </Flex>
        <H3 fontSize={16} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          {title}
        </H3>
      </Flex>
      <P fontSize={14} lineHeight={22} mb={4} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {description}
      </P>
      {children}
    </Box>
  );
}

function Next({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Li fontSize={14} lineHeight={24}>
      <SiteLink to={to} theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }} hover={{ textDecoration: 'underline' }}>
        {children}
      </SiteLink>
    </Li>
  );
}
