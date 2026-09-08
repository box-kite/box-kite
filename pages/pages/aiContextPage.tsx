import { Bot, CheckCircle2, Code2, FileText, Lightbulb, MessageSquare, Rocket, Sparkles, Zap } from 'lucide-react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import { SITE_URL } from '../site/site';

export default function AiContextPage() {
  return (
    <Box>
      <PageHeader
        icon={Bot}
        title="AI Assistant Context"
        description="The instructions the package ships for whatever writes the code: the rules, the formatter traps, and every prop with the CSS it emits."
      />

      {/* Hero Message */}
      <Reveal delay={0.1}>
        <Flex
          d="column"
          ai="center"
          textAlign="center"
          py={10}
          px={6}
          mb={10}
          theme={{ dark: { bgImage: 'gradient-hero-dark' }, light: { bgImage: 'gradient-hero' } }}
          borderRadius={4}
        >
          <Flex ai="center" gap={3} mb={4}>
            <Box fontSize={40}>
              <Sparkles size={40} color="#a78bfa" />
            </Box>
          </Flex>
          <Box
            tag="h2"
            fontSize={24}
            sm={{ fontSize: 28 }}
            fontWeight={700}
            theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}
            mb={4}
          >
            The instructions ship with the library.
          </Box>
          <Box fontSize={16} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} maxWidth={140} lineHeight={26}>
            AGENTS.md and a docs folder are inside the package, generated from the prop registry itself — so the file an agent finds is
            never a version behind the library it describes.
          </Box>
        </Flex>
      </Reveal>

      {/* Why This Matters */}
      <Reveal delay={0.2}>
        <Box mb={12}>
          <Box tag="h3" fontSize={20} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={6}>
            Why does this matter?
          </Box>
          <Flex d="column" gap={4}>
            <ReasonCard
              icon={<Zap size={20} />}
              title="AI assistants don't know your library"
              description="Without context, AI tools make mistakes. They might use wrong prop names, incorrect values, or miss important patterns. BOX_KITE_AI_CONTEXT.md fixes this."
            />
            <ReasonCard
              icon={<Lightbulb size={20} />}
              title="Teaching is faster than fixing"
              description="Instead of correcting AI mistakes over and over, give it the knowledge upfront. One-time setup, permanent improvement."
            />
            <ReasonCard
              icon={<Rocket size={20} />}
              title="Write code 10x faster"
              description="When your AI assistant truly understands Box Kite, it generates production-ready code on the first try. Every time."
            />
          </Flex>
        </Box>
      </Reveal>

      {/* How to Use - Highlighted Section */}
      <Reveal delay={0.3}>
        <Box
          mb={12}
          p={6}
          borderRadius={4}
          theme={{
            dark: { bgImage: 'gradient-hero-dark', borderColor: 'indigo-800' },
            light: { bgImage: 'gradient-hero', borderColor: 'indigo-200' },
          }}
          b={2}
        >
          <Flex ai="center" gap={3} mb={6}>
            <Box width={10} height={10} display="flex" ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
              <Rocket size={20} />
            </Box>
            <Box>
              <Box tag="h3" fontSize={22} fontWeight={700} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
                How to use it
              </Box>
              <Box fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                3 simple steps to supercharge your AI
              </Box>
            </Box>
          </Flex>

          <Flex d="column" gap={6}>
            <StepCard
              step={1}
              title="Copy AGENTS.md to your repo root"
              description="Every file below is already in the package. AGENTS.md is the one an agent reads on its own: Codex, Cursor, Copilot, VS Code, Windsurf, Cline and Zed read a root AGENTS.md natively, and Claude Code reads CLAUDE.md — one line saying @AGENTS.md points it at the same file."
            >
              <Code language="shell" code="cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md" />
            </StepCard>

            <StepCard
              step={2}
              title="Point your assistant at the rest"
              description="AGENTS.md carries the rules and the traps; the reference is what it reads for a prop it has not seen. Most tools take a file reference in the prompt."
            >
              <Flex d="column" gap={4}>
                <ToolExample
                  tool="Claude Code / Cursor"
                  example="Type @AGENTS.md, or @node_modules/@box-kite/react/docs/props.md for the whole prop surface"
                />
                <ToolExample tool="GitHub Copilot Chat" example="Attach AGENTS.md to your conversation or paste the content" />
                <ToolExample tool="ChatGPT / Claude Web" example="Copy and paste BOX_KITE_AI_CONTEXT.md into your first message" />
              </Flex>
            </StepCard>

            <StepCard
              step={3}
              title="Start coding"
              description="Your AI assistant now understands Box Kite deeply. Just describe what you want to build."
            >
              <Box
                p={4}
                borderRadius={2}
                theme={{
                  dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
                  light: { bgColor: 'slate-50', borderColor: 'slate-200' },
                }}
                b={1}
              >
                <Box fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} mb={3}>
                  Example prompt:
                </Box>
                <Box
                  fontSize={15}
                  lineHeight={24}
                  theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}
                  fontStyle="italic"
                >
                  "Create a responsive card component with a header, body, and footer. It should have a subtle shadow, rounded corners, and
                  look good in both light and dark themes."
                </Box>
              </Box>
            </StepCard>
          </Flex>
        </Box>
      </Reveal>

      {/* What ships in the package */}
      <Reveal delay={0.35}>
        <Box mb={12}>
          <Box tag="h3" fontSize={20} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={3}>
            What ships in the package
          </Box>
          <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} mb={5}>
            All of it generated from this repository during the build — the prop reference from the registry itself, the component table
            from the built chunks' own exports — because a stale instruction file is worse than none: an agent trusts it over its own
            priors.
          </Box>
          <Code
            language="shell"
            code={`node_modules/@box-kite/react/
  AGENTS.md                the rules, and the block that argues with the model's priors
  docs/props.md            every prop, the CSS it writes and one measured example
  docs/components.md       every component, its import, and whether it renders on a server
  docs/a11y.md             the behaviour hooks, for a pattern this library does not ship
  BOX_KITE_AI_CONTEXT.md   the long-form reference
  .claude/skills/box-kite/ the same rules as a skill, with four references beside it
  .cursor/rules/           and as a Cursor rule, to copy into .cursor/rules/`}
          />
        </Box>
      </Reveal>

      {/* Install it instead of copying it */}
      <Reveal delay={0.36}>
        <Box mb={12}>
          <Box tag="h3" fontSize={20} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={3}>
            Or install the rules as a skill
          </Box>
          <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} mb={5}>
            Agent Skills are an open standard about forty-five coding agents read, so one <Mono>SKILL.md</Mono> reaches nearly all of them —
            and unlike a file you copy, an install command keeps it current. It is the same rules file as <Mono>AGENTS.md</Mono>, with a
            measured table of the dividers and four references it loads only when the question needs them.
          </Box>
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
        </Box>
      </Reveal>

      {/* The docs, as markdown */}
      <Reveal delay={0.375}>
        <Box mb={12}>
          <Box tag="h3" fontSize={20} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={3}>
            And the docs site answers in markdown
          </Box>
          <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} mb={5}>
            An agent that fetches a documentation page gets an HTML shell and a JavaScript bundle it has no reason to parse. Every page here
            is also served as markdown at its own address with <Mono>.md</Mono> appended, and <Mono>llms.txt</Mono> is the index of all of
            them — one line per page, with the block of facts to read before writing any props. The files are converted from the pages
            themselves during the build, so nothing here is a second copy that can fall behind.
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
        </Box>
      </Reveal>

      {/* What's Inside */}
      <Reveal delay={0.4}>
        <Box mb={12}>
          <Box tag="h3" fontSize={20} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={6}>
            What's inside BOX_KITE_AI_CONTEXT.md?
          </Box>

          <Flex d="column" gap={3}>
            <FeatureItem
              icon={<Code2 size={18} />}
              title="Complete prop reference"
              description="All 212 props with their CSS mappings and accepted values"
            />
            <FeatureItem
              icon={<Zap size={18} />}
              title="Critical gotchas"
              description="Like fontSize using divider 16 (not 4) - saves hours of debugging"
            />
            <FeatureItem
              icon={<FileText size={18} />}
              title="Component catalog"
              description="All pre-built components: Flex, Grid, Button, Textbox, and more"
            />
            <FeatureItem
              icon={<Sparkles size={18} />}
              title="Theme system"
              description="How to create light/dark themes with nested pseudo-classes"
            />
            <FeatureItem
              icon={<MessageSquare size={18} />}
              title="Common patterns"
              description="Ready-to-use code snippets for cards, layouts, forms"
            />
            <FeatureItem icon={<Bot size={18} />} title="Extension system" description="How to add custom colors, props, and components" />
          </Flex>
        </Box>
      </Reveal>

      {/* Pro Tip */}
      <Reveal delay={0.5}>
        <Flex
          gap={4}
          p={5}
          mb={10}
          theme={{
            dark: { bgColor: 'indigo-950', borderColor: 'indigo-800' },
            light: { bgColor: 'indigo-50', borderColor: 'indigo-200' },
          }}
          b={1}
          borderRadius={3}
        >
          <Box flexShrink={0}>
            <Box width={10} height={10} display="flex" ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
              <Lightbulb size={20} />
            </Box>
          </Box>
          <Box>
            <Box fontSize={16} fontWeight={600} theme={{ dark: { color: 'indigo-200' }, light: { color: 'indigo-900' } }} mb={2}>
              Pro tip: Keep it in your project root
            </Box>
            <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'indigo-300' }, light: { color: 'indigo-700' } }}>
              A file in the root is read on every run; one referenced by hand is read when somebody remembers. AGENTS.md is the one to copy
              there — it is the file agents look for — and BOX_KITE_AI_CONTEXT.md beside it for the depth.
            </Box>
          </Box>
        </Flex>
      </Reveal>

      {/* Bottom CTA */}
      <Reveal delay={0.6}>
        <Flex
          d="column"
          ai="center"
          textAlign="center"
          py={10}
          px={6}
          theme={{ dark: { bgImage: 'gradient-hero-dark' }, light: { bgImage: 'gradient-hero' } }}
          borderRadius={4}
        >
          <Box width={14} height={14} display="flex" ai="center" jc="center" bgColor="emerald-500" borderRadius={10} color="white" mb={5}>
            <CheckCircle2 size={28} />
          </Box>
          <Box tag="h3" fontSize={22} fontWeight={700} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={3}>
            That's it. Seriously.
          </Box>
          <Box fontSize={15} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} maxWidth={120} lineHeight={24}>
            Your AI assistant is now a Box Kite expert. Go build something amazing.
          </Box>
        </Flex>
      </Reveal>
    </Box>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <Box
      tag="code"
      display="inline"
      px={1}
      borderRadius={1}
      fontSize={13}
      theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' }, light: { bgColor: 'slate-100', color: 'slate-800' } }}
    >
      {children}
    </Box>
  );
}

interface ReasonCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ReasonCard({ icon, title, description }: ReasonCardProps) {
  return (
    <Flex
      gap={4}
      p={4}
      theme={{
        dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
        light: { bgColor: 'white', borderColor: 'slate-200' },
      }}
      b={1}
      borderRadius={2}
    >
      <Box flexShrink={0}>
        <Box width={10} height={10} display="flex" ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
          {icon}
        </Box>
      </Box>
      <Box>
        <Box fontSize={15} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }} mb={1}>
          {title}
        </Box>
        <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          {description}
        </Box>
      </Box>
    </Flex>
  );
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

function StepCard({ step, title, description, children }: StepCardProps) {
  return (
    <Box
      p={5}
      theme={{
        dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
        light: { bgColor: 'white', borderColor: 'slate-200' },
      }}
      b={1}
      borderRadius={3}
    >
      <Flex ai="center" gap={3} mb={3}>
        <Box
          width={8}
          height={8}
          display="flex"
          ai="center"
          jc="center"
          bgImage="gradient-primary"
          borderRadius={10}
          color="white"
          fontSize={14}
          fontWeight={700}
        >
          {step}
        </Box>
        <Box fontSize={17} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          {title}
        </Box>
      </Flex>
      <Box fontSize={14} lineHeight={22} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} mb={4}>
        {description}
      </Box>
      {children}
    </Box>
  );
}

interface ToolExampleProps {
  tool: string;
  example: string;
}

function ToolExample({ tool, example }: ToolExampleProps) {
  return (
    <Box
      p={3}
      borderRadius={2}
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-700' },
        light: { bgColor: 'slate-50', borderColor: 'slate-200' },
      }}
      b={1}
    >
      <Box
        tag="span"
        display="inline-block"
        px={2}
        py={0.5}
        borderRadius={1}
        fontSize={12}
        fontWeight={600}
        bgImage="gradient-primary"
        color="white"
        mb={2}
      >
        {tool}
      </Box>
      <Box fontSize={14} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
        {example}
      </Box>
    </Box>
  );
}

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <Flex
      ai="center"
      gap={4}
      py={3}
      px={4}
      theme={{
        dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
        light: { bgColor: 'white', borderColor: 'slate-200' },
      }}
      b={1}
      borderRadius={2}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} flexShrink={0}>
        {icon}
      </Box>
      <Box>
        <Flex ai="center" gap={2} flexWrap="wrap">
          <Box fontSize={14} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
            {title}
          </Box>
          <Box fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
            {description}
          </Box>
        </Flex>
      </Box>
    </Flex>
  );
}
