import { Check, Copy, FolderOpen, MessageSquareText, Server, TerminalSquare, Zap } from 'lucide-react';
import { ReactNode, useEffect, useId, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2, H3, Label, Li, Link, P, Ul } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import VisuallyHidden from '../../src/components/visuallyHidden';
import IconSwap from '../components/iconSwap';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { landingPrompt, productPrompt, setupPrompt } from './start';

export default function StartPage() {
  useTableOfContents(sidebarLinks);
  const [product, setProduct] = useState('');
  const productId = useId();

  return (
    <Box>
      <PageHeader
        icon={Zap}
        title="Start with AI"
        description="A new web app in three steps. Copy a prompt, paste it into an AI coding agent, and it does the rest — the project, the library, the server that checks its work."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={12}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            No experience needed. Each step below is one prompt written for the agent rather than for you: it says which commands to run,
            which files to write and how to check the result, so the only thing left for you is to read what it did. The first prompt sets
            up a React app with Box Kite and connects the agent to its MCP server; the next two build real pages on top of it.
          </Box>

          <Section id="before" title="Before you start">
            <Box display="grid" gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={4}>
              <Need icon={Server} title="Node.js 22 or newer">
                The runtime the project and the MCP server run on. The LTS download from{' '}
                <External href="https://nodejs.org">nodejs.org</External> is the one to take.
              </Need>
              <Need icon={TerminalSquare} title="An agent that runs commands">
                <External href="https://claude.com/claude-code">Claude Code</External>,{' '}
                <External href="https://cursor.com">Cursor</External>, <External href="https://openai.com/codex">Codex</External>, VS Code
                with Copilot in agent mode, or Windsurf. A chat in a browser tab cannot: it has no terminal.
              </Need>
              <Need icon={FolderOpen} title="An empty folder">
                Make one named after your app and open it in the agent. Everything it creates goes there, so nothing else on your computer
                is touched.
              </Need>
            </Box>
          </Section>

          <Step id="setup" number={1} title="Set up the app">
            <P mb={5}>
              Paste this as the first message. The agent scaffolds a React and TypeScript project with Vite, installs Box Kite, copies the
              library&rsquo;s instructions into <Mono>AGENTS.md</Mono> where it reads them on every run, and connects the{' '}
              <SiteLink to="/ai-context" {...linkStyles}>
                MCP server
              </SiteLink>{' '}
              that answers whether a style it wrote actually works. It finishes by building the app and giving you an address to open.
            </P>
            <Prompt label="Setup prompt" prompt={setupPrompt} />
          </Step>

          {/* For the reader only: an agent reading the markdown mirror gets the bracketed placeholder. */}
          <Box props={{ 'data-md': 'skip' }}>
            <Label
              props={{ htmlFor: productId }}
              display="block"
              fontSize={15}
              fontWeight={600}
              mb={2}
              theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-700' } }}
            >
              What are you building?
            </Label>
            <Textbox
              width="fit"
              placeholder="A coffee subscription for small offices"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              id={productId}
              props={{ autoComplete: 'off' }}
            />
            <P mt={2} fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
              One sentence is enough. Both prompts below fill it in — or copy them as they are and replace the bracketed part yourself.
            </P>
          </Box>

          <Step id="landing" number={2} title="Build a landing page">
            <P mb={5}>
              The page a product is introduced on: a hero, the features, how it works, testimonials, pricing and a FAQ, with real copy
              written for what you described, in a light and a dark theme, on every screen size.
            </P>
            <Prompt label="Landing page prompt" prompt={landingPrompt(product)} />
          </Step>

          <Step id="product" number={3} title="Add a product page">
            <P mb={5}>
              The page a product is bought on: a gallery, the price, the options, an add-to-cart button that confirms with a toast, and tabs
              for the details. Use it after the landing page, or on its own after step 1.
            </P>
            <Prompt label="Product page prompt" prompt={productPrompt(product)} />
          </Step>

          <Section id="next" title="After that">
            <Ul display="flex" d="column" gap={3} listStyle="disc" ps={5} m={0}>
              <Li display="list-item">
                <strong>Keep talking to it in plain words.</strong> &ldquo;Make the hero shorter&rdquo;, &ldquo;use green instead of
                blue&rdquo;, &ldquo;add a contact form&rdquo; — the same rules travel with every request, because they live in{' '}
                <Mono>AGENTS.md</Mono>.
              </Li>
              <Li display="list-item">
                <strong>When something looks wrong, say so and ask it to check.</strong> A style value Box Kite does not accept writes
                nothing at all, and the MCP server&rsquo;s <Mono>check_styles</Mono> is how the agent finds out which one it was.
              </Li>
              <Li display="list-item">
                <strong>Start from a finished section.</strong>{' '}
                <SiteLink to="/registry" {...linkStyles}>
                  Blocks
                </SiteLink>{' '}
                installs a data grid page, a settings form or a dashboard shell into the project, and the{' '}
                <SiteLink to="/showcase" {...linkStyles}>
                  Showcase
                </SiteLink>{' '}
                is every component there is to ask for.
              </Li>
              <Li display="list-item">
                <strong>Already have a project?</strong> The setup prompt keeps an existing React app and adds Box Kite to it; the{' '}
                <SiteLink to="/ai-context" {...linkStyles}>
                  Built for AI
                </SiteLink>{' '}
                page has the same setup per agent, by hand.
              </Li>
            </Ul>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'before', label: 'Before you start' },
  { id: 'setup', label: '1. Set up the app' },
  { id: 'landing', label: '2. A landing page' },
  { id: 'product', label: '3. A product page' },
  { id: 'next', label: 'After that' },
];

const headingTheme = { dark: { color: 'white' }, light: { color: 'slate-900' } } as const;
const textTheme = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const linkStyles = {
  display: 'inline',
  theme: { dark: { color: 'violet-400' }, light: { color: 'violet-600' } },
  hover: { textDecoration: 'underline' },
} as const;

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

function Step({ id, number, title, children }: { id: string; number: number; title: string; children: ReactNode }) {
  return (
    <Box id={id} css={{ scrollMarginTop: '5rem' }}>
      <Flex ai="center" gap={3} mb={4}>
        <Flex
          width={9}
          height={9}
          flexShrink={0}
          ai="center"
          jc="center"
          borderRadius={10}
          bgImage="gradient-primary"
          color="white"
          fontWeight={700}
          props={{ 'aria-hidden': true, 'data-md': 'skip' }}
        >
          {number}
        </Flex>
        {/* The badge is decoration, so the heading carries the number for a screen reader and the markdown mirror. */}
        <H2 fontSize={20} fontWeight={600} theme={headingTheme}>
          <VisuallyHidden tag="span">Step {number}: </VisuallyHidden>
          {title}
        </H2>
      </Flex>
      <Box fontSize={15} lineHeight={26} theme={textTheme}>
        {children}
      </Box>
    </Box>
  );
}

function Need({ icon: NeedIcon, title, children }: { icon: typeof Zap; title: string; children: ReactNode }) {
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
        <NeedIcon size={20} />
      </Flex>
      <H3 fontSize={15} fontWeight={600} theme={headingTheme}>
        {title}
      </H3>
      <Box fontSize={14} lineHeight={22} theme={textTheme}>
        {children}
      </Box>
    </Flex>
  );
}

/** A prompt is prose, so unlike a `Code` block it wraps and shows in full — a reader should see all of what they paste. */
function Prompt({ label, prompt }: { label: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  function copy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <Box
      shadow="large"
      borderRadius={3}
      overflow="hidden"
      b={1}
      theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
    >
      <Box component="code">
        <Box component="code.header" props={{ 'data-md': 'skip' }}>
          <Box component="code.label">
            <Icon size={3.5}>
              <MessageSquareText />
            </Icon>
            <Box>{label}</Box>
          </Box>
          <Button component="code.action" variant={{ done: copied }} onClick={() => !copied && copy()}>
            <IconSwap key={copied ? 'check' : 'copy'} motion="grow">
              <Icon size={3.5}>{copied ? <Check /> : <Copy />}</Icon>
            </IconSwap>
            {copied ? 'Copied!' : 'Copy prompt'}
          </Button>
        </Box>
        <Box tag="pre" component="code.content" className="language-markdown" whiteSpace="pre-wrap" css={{ maxHeight: 'none' }}>
          {prompt}
        </Box>
      </Box>
    </Box>
  );
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link props={{ href, target: '_blank', rel: 'noopener noreferrer' }} {...linkStyles}>
      {children}
    </Link>
  );
}
