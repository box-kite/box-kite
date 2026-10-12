import { ArrowDown, ArrowRight, Bot, Check, Copy, FolderOpen, MessageSquareText, Server, TerminalSquare, Zap } from 'lucide-react';
import { ReactNode, useEffect, useId, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H1, H2, H3, Label, Li, Link, P, Ul } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import VisuallyHidden from '../../src/components/visuallyHidden';
import IconSwap from '../components/iconSwap';
import Mono from '../components/mono';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import {
  landingPrompt,
  PRODUCT_EXAMPLES,
  PRODUCT_PLACEHOLDER,
  PRODUCT_STORAGE_KEY,
  productPrompt,
  productText,
  setupPrompt,
  START_FAQ,
  STEP_OUTCOMES,
} from './start';

export default function StartPage() {
  useTableOfContents(sidebarLinks);
  const [product, setProduct] = useProduct();

  return (
    <Box>
      <Hero product={product} onProductChange={setProduct} />

      <Reveal delay={0.2}>
        <Flex d="column" gap={14}>
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

          <Step id="setup" number={1} title="Set up the app" outcomes={STEP_OUTCOMES.setup}>
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

          <Step id="landing" number={2} title="Build a landing page" outcomes={STEP_OUTCOMES.landing}>
            <P mb={5}>
              The page a product is introduced on, with real copy written for <ProductMention product={product} />, in a light and a dark
              theme, on every screen size.
            </P>
            <Prompt label="Landing page prompt" prompt={landingPrompt(product)} />
          </Step>

          <Step id="product" number={3} title="Add a product page" outcomes={STEP_OUTCOMES.product}>
            <P mb={5}>
              The page a product is bought on. Use it after the landing page, or on its own after step 1 — it adds a router if the app has
              none yet.
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
                <strong>Set up another agent by hand.</strong> The{' '}
                <SiteLink to="/ai-context" {...linkStyles}>
                  Built for AI
                </SiteLink>{' '}
                page has the rules file, the skill and the MCP server for each agent, one command at a time.
              </Li>
            </Ul>
          </Section>

          <Section id="faq" title="Questions">
            <Box display="grid" gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={6}>
              {START_FAQ.map(({ question, answer }) => (
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
  { id: 'before', label: 'Before you start' },
  { id: 'setup', label: '1. Set up the app' },
  { id: 'landing', label: '2. A landing page' },
  { id: 'product', label: '3. A product page' },
  { id: 'next', label: 'After that' },
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

/**
 * The reader's product, remembered between visits: step 1 takes minutes, and whoever comes back for step 2 should
 * not have to say it again. Read after mount, since the prerendered page was built with the box empty.
 */
function useProduct(): [string, (product: string) => void] {
  const [product, setProduct] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is unreadable during the prerender
      if (stored) setProduct(stored);
    } catch {
      // Storage blocked: the box simply starts empty.
    }
  }, []);

  function update(next: string) {
    setProduct(next);
    try {
      localStorage.setItem(PRODUCT_STORAGE_KEY, next);
    } catch {
      // Remembering is a convenience; the prompts work without it.
    }
  }

  return [product, update];
}

/** A copy action whose label says "Copied!" for two seconds, so a reader knows the paste will work. */
function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  return [
    copied,
    () => {
      if (copied) return;
      navigator.clipboard.writeText(text);
      setCopied(true);
    },
  ];
}

/** The first screen asks one question and offers one action — what you are building, and the prompt that starts it. */
function Hero({ product, onProductChange }: { product: string; onProductChange: (product: string) => void }) {
  const productId = useId();
  const [copied, copy] = useCopy(setupPrompt);

  return (
    <Box mb={14}>
      <Reveal>
        <Flex
          props={{ 'data-md': 'skip' }}
          ai="center"
          gap={2}
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
          For Claude Code · Cursor · Codex · Copilot · Windsurf
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
            Build a React app with AI,{' '}
          </Box>
          <Box
            tag="span"
            display="inline"
            bgGradient={{ linear: 'r', colors: ['indigo-500', 'violet-500', 'pink-500'] }}
            bgClip="text"
            color="transparent"
          >
            in three prompts
          </Box>
        </H1>
        <P fontSize={16} sm={{ fontSize: 18 }} lineHeight={28} maxWidth={170} mb={8} theme={textTheme}>
          Copy a prompt, paste it into your AI coding agent, and it does the rest — the project, the pages, and the checks that its styles
          really work. No experience needed.
        </P>
      </Reveal>

      <Reveal delay={0.1}>
        <Box props={{ 'data-md': 'skip' }} b={1} borderRadius={3} shadow="lg" p={5} sm={{ p: 6 }} theme={cardTheme}>
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
            fontSize={16}
            placeholder={PRODUCT_EXAMPLES[0]}
            value={product}
            onChange={(event) => onProductChange(event.target.value)}
            id={productId}
            props={{ autoComplete: 'off' }}
          />
          <Flex ai="center" gap={2} flexWrap="wrap" mt={3} fontSize={13} theme={textTheme}>
            <Box tag="span">Try:</Box>
            {PRODUCT_EXAMPLES.map((example) => (
              <Button
                key={example}
                variant="secondary"
                px={3}
                py={1}
                fontSize={13}
                borderRadius={10}
                props={{ 'aria-pressed': product === example }}
                ariaAttr={{ pressed: { borderColor: 'indigo-500', bgColor: 'indigo-500/10' } }}
                onClick={() => onProductChange(example)}
              >
                {example}
              </Button>
            ))}
          </Flex>
          <P mt={3} fontSize={13} lineHeight={20} theme={textTheme}>
            One sentence is enough. Steps 2 and 3 are written for it — or leave it empty and replace the bracketed part yourself.
          </P>

          <Flex gap={3} mt={6} d="column" sm={{ d: 'row', ai: 'center' }} flexWrap="wrap">
            <Button {...ctaStyles} onClick={copy}>
              <IconSwap key={copied ? 'check' : 'copy'} motion="grow">
                <Icon size={4.5}>{copied ? <Check /> : <Copy />}</Icon>
              </IconSwap>
              {copied ? 'Copied — paste it into your agent' : 'Copy the setup prompt'}
            </Button>
            <Link props={{ href: '#setup' }} component="button" variant="secondary" {...ctaStyles}>
              See the three steps
              <Icon size={4}>
                <ArrowDown />
              </Icon>
            </Link>
          </Flex>
        </Box>

        <Ul display="flex" flexWrap="wrap" gap={5} rowGap={2} mt={6} p={0} listStyle="none" fontSize={13} theme={textTheme}>
          {['Free and MIT licensed', 'No account, no API key', 'Light and dark themes', 'Works on every screen size'].map((point) => (
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

/** The product as the prompts will spell it, or a plain stand-in while the box is empty. */
function ProductMention({ product }: { product: string }) {
  const text = productText(product);

  return text === PRODUCT_PLACEHOLDER ? <>what you are building</> : <strong>{text}</strong>;
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

interface StepProps {
  id: string;
  number: number;
  title: string;
  outcomes: readonly string[];
  children: ReactNode;
}

function Step({ id, number, title, outcomes, children }: StepProps) {
  return (
    <Box id={id} css={{ scrollMarginTop: '5rem' }}>
      <Flex ai="center" gap={3} mb={3}>
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
      <Ul
        props={{ 'aria-label': 'What you get', 'data-md': 'inline' }}
        display="flex"
        flexWrap="wrap"
        gap={2}
        p={0}
        m={0}
        mb={4}
        listStyle="none"
      >
        {outcomes.map((outcome) => (
          <Li
            key={outcome}
            display="flex"
            ai="center"
            gap={1}
            px={2.5}
            py={0.5}
            borderRadius={10}
            fontSize={12}
            fontWeight={500}
            theme={{ dark: { bgColor: 'slate-800', color: 'slate-300' }, light: { bgColor: 'slate-100', color: 'slate-700' } }}
          >
            <Icon size={3} color="emerald-500">
              <Check />
            </Icon>
            {outcome}
          </Li>
        ))}
      </Ul>
      <Box fontSize={15} lineHeight={26} theme={textTheme}>
        {children}
      </Box>
    </Box>
  );
}

function Need({ icon: NeedIcon, title, children }: { icon: typeof Zap; title: string; children: ReactNode }) {
  return (
    <Flex d="column" gap={2} p={4} b={1} borderRadius={3} theme={cardTheme}>
      <Flex ai="center" gap={2}>
        <Flex width={8} height={8} flexShrink={0} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white">
          <NeedIcon size={16} />
        </Flex>
        <H3 fontSize={15} fontWeight={600} theme={headingTheme}>
          {title}
        </H3>
      </Flex>
      <Box fontSize={14} lineHeight={22} theme={textTheme}>
        {children}
      </Box>
    </Flex>
  );
}

/** A prompt is prose, so unlike a `Code` block it wraps and shows in full — a reader should see all of what they paste. */
function Prompt({ label, prompt }: { label: string; prompt: string }) {
  const [copied, copy] = useCopy(prompt);

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
          <Button component="code.action" variant={{ done: copied }} onClick={copy}>
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

/** The page's own question, asked once more for whoever read to the end before trying anything. */
function ClosingCta() {
  const [copied, copy] = useCopy(setupPrompt);

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
          Your app is one paste away
        </H2>
        <P fontSize={15} lineHeight={24} color="white/80">
          Copy the setup prompt, open an empty folder in your agent, and paste.
        </P>
      </Box>
      <Flex gap={3} d="column" sm={{ d: 'row' }} flexShrink={0} props={{ 'data-md': 'skip' }}>
        <Button variant="secondary" {...ctaStyles} onClick={copy}>
          <Icon size={4.5}>{copied ? <Check /> : <Copy />}</Icon>
          {copied ? 'Copied!' : 'Copy the setup prompt'}
        </Button>
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
          <Icon size={4}>
            <ArrowRight />
          </Icon>
        </SiteLink>
      </Flex>
    </Flex>
  );
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link props={{ href, target: '_blank', rel: 'noopener noreferrer' }} {...linkStyles}>
      {children}
    </Link>
  );
}
