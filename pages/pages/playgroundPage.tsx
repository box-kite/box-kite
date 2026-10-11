import {
  Braces,
  Check,
  ChevronDown,
  ChevronsLeftRight,
  ChevronsRightLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutTemplate,
  Link2,
  Maximize,
  Minimize,
  Moon,
  PlayCircle,
  RotateCcw,
  Sun,
  WandSparkles,
} from 'lucide-react';
import { CSSProperties, ReactElement, ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box, { BoxProps } from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Menu from '../../src/components/menu';
import { H2 } from '../../src/components/semantics';
import { useHydrated } from '../app/hydration';
import PageHeader from '../components/pageHeader';
import PlaygroundEditor from '../components/playgroundEditor';
import { PlaygroundMessage, PlaygroundPreview, PlaygroundRule, usePreviewRules } from '../components/playgroundPreview';
import PlaygroundSplitter from '../components/playgroundSplitter';
import useFullscreen from '../hooks/useFullscreen';
import { decodeSnippet, encodeSnippet, SNIPPET_PARAM } from '../site/playground';
import { ruleText } from '../site/playgroundCss';
import { PLAYGROUND_EXAMPLES, STARTER } from '../site/playgroundExamples';
import formatPlaygroundSnippet from '../site/playgroundFormat';
import { PlaygroundLayout, readLayout, writeLayout } from '../site/playgroundLayout';
import { stackblitzForm, STACKBLITZ_URL } from '../site/playgroundProject';
import loadPlaygroundScope, { PlaygroundScope } from '../site/playgroundScope';
import { compileSnippet, CompiledSnippet } from '../site/playgroundSource';
import type { PlaygroundCompletions } from '../site/playgroundVocabulary';

/** How long a reader stops typing before the snippet is compiled and the address bar catches up. */
const SETTLE = 250;

/** `data-page-width="full"` is what the layout's `<main>` drops its reading width for (`app/layout.tsx`). */
const FULL_WIDTH = { 'data-page-width': 'full' };

export default function PlaygroundPage() {
  const [params, setParams] = useSearchParams();
  // Not while the prerendered HTML is being adopted: that copy was built with no query on it, so reading
  // one on the first render is a hydration mismatch (React #418, the same trap /box's finder has).
  const shared = useHydrated() ? decodeSnippet(params.get(SNIPPET_PARAM)) : null;

  const [typed, setTyped] = useState<string | null>(null);
  const source = typed ?? shared ?? STARTER;

  // Every keystroke recompiles and remounts the preview, and a snippet may be a whole data grid, so the
  // work waits for a pause rather than racing the typing.
  const [settled, setSettled] = useState(source);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(source), SETTLE);

    return () => clearTimeout(timer);
  }, [source]);

  const scope = usePlaygroundScope();

  return (
    <Box>
      <PageHeader
        icon={PlayCircle}
        title="Playground"
        description="Edit the props and watch the CSS. The snippet runs against the real library, and the pane below it is every rule the engine wrote for what you typed."
        badge="NEW"
      />

      {scope ? (
        <Workbench scope={scope} source={source} settled={settled} onChange={setTyped} onShare={setParams} />
      ) : (
        <PlaygroundMessage kind="quiet" text="Loading the compiler and the component library…" />
      )}
    </Box>
  );
}

/**
 * What the completion popup offers, fetched beside the compiler rather than before it: the editor works
 * without it, and the catalog is the heavier half of the two.
 */
function useCompletions(): PlaygroundCompletions | null {
  const [completions, setCompletions] = useState<PlaygroundCompletions | null>(null);

  useEffect(() => {
    let live = true;

    import('../site/playgroundVocabulary').then((module) => live && setCompletions(module.default()));

    return () => void (live = false);
  }, []);

  return completions;
}

/** The compiler and every component the library ships, fetched once and only on this route. */
function usePlaygroundScope(): PlaygroundScope | null {
  const [scope, setScope] = useState<PlaygroundScope | null>(null);

  useEffect(() => {
    let live = true;

    loadPlaygroundScope().then((loaded) => live && setScope(loaded));

    return () => void (live = false);
  }, []);

  return scope;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The reader's width and divider, kept between visits. The workbench mounts after the compiler loads, so never during hydration. */
function usePlaygroundLayout(): [PlaygroundLayout, (change: Partial<PlaygroundLayout>) => void] {
  const [layout, setLayout] = useState(() => readLayout(storage()));

  // Written only on a change the reader made, so a better default still reaches everyone who never touched it.
  return [
    layout,
    (change) => {
      const next = { ...layout, ...change };

      setLayout(next);
      writeLayout(storage(), next);
    },
  ];
}

interface WorkbenchProps {
  scope: PlaygroundScope;
  source: string;
  settled: string;
  onChange: (source: string) => void;
  onShare: (params: URLSearchParams, options: { replace: boolean }) => void;
}

const border = { theme: { dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } } } satisfies BoxProps;

function Workbench({ scope, source, settled, onChange, onShare }: WorkbenchProps) {
  const compiled = useMemo(() => compileSnippet(settled, scope), [settled, scope]);
  const [readRules, rules] = usePreviewRules();
  const completions = useCompletions();

  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const editorId = useId();
  const [layout, setLayout] = usePlaygroundLayout();
  const fullscreen = useFullscreen(root);
  const panes = layout.preview || layout.css;
  // The preview follows the site until the reader flips it, which full screen has no other way to do.
  const [siteTheme] = Box.useTheme();
  const [chosenTheme, setPreviewTheme] = useState<string | null>(null);
  const previewTheme = chosenTheme ?? siteTheme;

  // The address is the share, so it follows the snippet rather than waiting for a button. `replace`, or
  // every pause while typing would be a place the back button stops at.
  useEffect(() => {
    onShare(new URLSearchParams({ [SNIPPET_PARAM]: encodeSnippet(settled) }), { replace: true });
  }, [settled, onShare]);

  const { Component } = compiled;

  return (
    <Flex
      ref={root}
      d="column"
      gap={3}
      // The divider moves with the pointer, so its position is per frame: inline, like a slider thumb's.
      style={{ '--playground-split': `${layout.split}%` } as CSSProperties}
      props={layout.wide ? FULL_WIDTH : undefined}
      // The browser's full screen positions the element itself; the fallback, where there is none, is this.
      position={fullscreen.full ? 'fixed' : undefined}
      inset={fullscreen.full ? 0 : undefined}
      zIndex={fullscreen.full ? 100 : undefined}
      p={fullscreen.full ? 3 : undefined}
      theme={fullscreen.full ? { dark: { bgColor: 'slate-950' }, light: { bgColor: 'slate-50' } } : undefined}
    >
      <Toolbar
        source={source}
        body={compiled.body}
        onChange={onChange}
        layout={layout}
        onLayoutChange={setLayout}
        fullscreen={fullscreen}
      />

      <Flex
        ref={body}
        d="column"
        // On the page the rows take the window's height less the bar above them; full screen, whatever is left.
        lg={fullscreen.full ? undefined : { minHeight: 120, css: { height: 'calc(100vh - 9rem)' } }}
        flex1={fullscreen.full || undefined}
        minHeight={0}
        b={1}
        borderRadius={3}
        overflow="hidden"
        {...border}
      >
        <Flex
          id={editorId}
          d="column"
          minHeight={0}
          height={100}
          flexShrink={0}
          // With nothing below it the editor takes the whole workbench; otherwise its share is the divider's.
          lg={panes ? { height: 'auto', css: { flexBasis: 'var(--playground-split)' } } : { height: 'auto', flex1: true }}
          // The base class transitions `all`, which would leave the row trailing the divider it is dragged by.
          transition="none"
        >
          <PaneHeader title="Snippet">
            <Flex ai="center" gap={1}>
              <PaneButton
                label="Format — Ctrl+S"
                onClick={() => formatPlaygroundSnippet(source).then((formatted) => formatted !== null && onChange(formatted))}
              >
                <WandSparkles />
              </PaneButton>
              <PaneButton label="Copy the snippet" done="Copied" onClick={() => navigator.clipboard.writeText(source)}>
                <Copy />
              </PaneButton>
            </Flex>
          </PaneHeader>
          <Box flex1 minHeight={0} position="relative">
            <PlaygroundEditor value={source} onChange={onChange} label="Snippet to run, as JSX" completions={completions} />
            {/* A hidden pane comes back from where the reader is looking — the editor it was hidden to make room for. */}
            {layout.preview && layout.css ? null : (
              <Flex position="absolute" bottom={3} right={6} zIndex={1} gap={2}>
                {layout.preview ? null : (
                  <ShowButton label="Show preview" onClick={() => setLayout({ preview: true })}>
                    <Eye />
                  </ShowButton>
                )}
                {layout.css ? null : (
                  <ShowButton label="Show CSS" onClick={() => setLayout({ css: true })}>
                    <Braces />
                  </ShowButton>
                )}
              </Flex>
            )}
          </Box>
        </Flex>

        {panes ? (
          <PlaygroundSplitter split={layout.split} onSplitChange={(split) => setLayout({ split })} container={body} controls={editorId} />
        ) : null}

        {/* Rendered with both panes hidden too: the preview has to run for the CSS pane to have rules to show. */}
        <Flex display={panes ? 'flex' : 'none'} d="column" lg={{ d: 'row' }} flex1 minHeight={0} bt={1} {...border}>
          <Flex display={layout.preview ? 'flex' : 'none'} d="column" flex1 minWidth={0} minHeight={0}>
            <PaneHeader title="Preview">
              <Flex ai="center" gap={1}>
                <PaneButton
                  label={previewTheme === 'dark' ? 'Preview in the light theme' : 'Preview in the dark theme'}
                  onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                >
                  {previewTheme === 'dark' ? <Sun /> : <Moon />}
                </PaneButton>
                <PaneButton label="Hide the preview" onClick={() => setLayout({ preview: false })}>
                  <EyeOff />
                </PaneButton>
              </Flex>
            </PaneHeader>
            {/* A theme of its own, the way a local `Box.Theme` is one — the class and the `data-theme` that ends
                the site's — written here because that component's wrapper would sit between this flex column
                and its child. */}
            <Flex className={previewTheme} d="column" flex1 minHeight={40} lg={{ minHeight: 0 }} props={{ 'data-theme': previewTheme }}>
              <Box
                flex1
                overflow="auto"
                p={6}
                theme={{ dark: { bgColor: 'slate-900', color: 'slate-100' }, light: { bgColor: 'white', color: 'slate-900' } }}
              >
                <Status compiled={compiled} />
                {/* Keyed by the snippet, so a new one remounts and the ref reads the rules it wrote. */}
                <Box key={compiled.body} ref={readRules}>
                  {Component ? (
                    <PlaygroundPreview resetKey={Component}>
                      <Component />
                    </PlaygroundPreview>
                  ) : null}
                </Box>
              </Box>
            </Flex>
          </Flex>

          {layout.css ? (
            <Flex
              d="column"
              flex1
              minWidth={0}
              minHeight={0}
              bt={layout.preview ? 1 : 0}
              lg={{ bt: 0, bl: layout.preview ? 1 : 0 }}
              {...border}
            >
              <PaneHeader title={`Generated CSS${rules.length ? ` · ${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}` : ''}`}>
                <Flex ai="center" gap={1}>
                  <PaneButton
                    label="Copy the CSS"
                    done="Copied"
                    onClick={() => navigator.clipboard.writeText(rules.map(ruleText).join('\n\n'))}
                  >
                    <Copy />
                  </PaneButton>
                  <PaneButton label="Hide the CSS" onClick={() => setLayout({ css: false })}>
                    <EyeOff />
                  </PaneButton>
                </Flex>
              </PaneHeader>
              <Box component="code" flex1 maxHeight={100} lg={{ maxHeight: 'fit' }} minHeight={0} overflow="auto" p={4}>
                {rules.length ? (
                  <Flex d="column" gap={3}>
                    {rules.map((rule) => (
                      <PlaygroundRule key={`${rule.context.join('')}${rule.selector}`} rule={rule} />
                    ))}
                  </Flex>
                ) : (
                  <Box color="slate-400" fontSize={13}>
                    No rules yet — the preview has not rendered anything the engine had to write CSS for.
                  </Box>
                )}
              </Box>
            </Flex>
          ) : null}
        </Flex>
      </Flex>

      <Box fontSize={12} color="slate-500">
        Suggestions open as you type a prop or a value — <Key>Ctrl</Key> <Key>Space</Key> asks for them anywhere. <Key>Ctrl</Key>{' '}
        <Key>S</Key> formats the snippet. Tab indents, so <Key>Esc</Key> then <Key>Tab</Key> is the way out of the editor.
      </Box>
    </Flex>
  );
}

function Status({ compiled }: { compiled: CompiledSnippet }) {
  const said = compiled.error
    ? { kind: 'error' as const, text: compiled.error }
    : compiled.unresolved.length
      ? { kind: 'error' as const, text: `The playground has nothing to give these names: ${compiled.unresolved.join(', ')}.` }
      : !compiled.renders
        ? { kind: 'quiet' as const, text: 'Nothing to render — this snippet is configuration, not an element.' }
        : null;

  return said ? <PlaygroundMessage {...said} /> : null;
}

/** A pill floating over the editor's corner, so it reads as a control rather than as code. */
function ShowButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactElement }) {
  return (
    <Button
      clean
      cursor="pointer"
      px={3}
      py={1.5}
      borderRadius={10}
      fontSize={12}
      fontWeight={500}
      b={1}
      shadow="md"
      onClick={onClick}
      theme={{
        light: { bgColor: 'white', color: 'slate-700', borderColor: 'slate-200', hover: { bgColor: 'slate-50', color: 'indigo-700' } },
        dark: { bgColor: 'slate-800', color: 'slate-200', borderColor: 'slate-700', hover: { bgColor: 'slate-700', color: 'white' } },
      }}
    >
      <Flex ai="center" gap={1.5}>
        <Icon size={3.5}>{children}</Icon>
        {label}
      </Flex>
    </Button>
  );
}

function PaneHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Flex ai="center" jc="space-between" gap={2} flexShrink={0} height={10} px={3} bb={1} {...border}>
      <H2 fontSize={12} fontWeight={600} color="slate-500" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
        {title}
      </H2>
      {children}
    </Flex>
  );
}

interface ToolbarProps {
  source: string;
  body: string;
  onChange: (source: string) => void;
  layout: PlaygroundLayout;
  onLayoutChange: (change: Partial<PlaygroundLayout>) => void;
  fullscreen: ReturnType<typeof useFullscreen>;
}

function Toolbar({ source, body, onChange, layout, onLayoutChange, fullscreen }: ToolbarProps) {
  const [copied, setCopied] = useCopied();
  const fork = useRef<HTMLFormElement>(null);

  function copyHandler() {
    navigator.clipboard.writeText(window.location.href);
    setCopied();
  }

  return (
    <Flex ai="center" jc="space-between" gap={2} flexWrap="wrap">
      <Flex ai="center" gap={2}>
        <Menu
          trigger={(trigger) => (
            <Button {...trigger} {...actionStyles}>
              <Flex ai="center" gap={2}>
                <Icon size={3.5}>
                  <LayoutTemplate />
                </Icon>
                Examples
                <Icon size={3}>
                  <ChevronDown />
                </Icon>
              </Flex>
            </Button>
          )}
        >
          {PLAYGROUND_EXAMPLES.map((example) => (
            <Menu.Item key={example.id} onSelect={() => onChange(example.source)}>
              {example.title}
            </Menu.Item>
          ))}
        </Menu>

        <Divider />

        <ActionButton onClick={() => onLayoutChange({ preview: !layout.preview })} label="Preview" pressed={layout.preview}>
          <Icon size={3.5}>
            <Eye />
          </Icon>
        </ActionButton>
        <ActionButton onClick={() => onLayoutChange({ css: !layout.css })} label="CSS" pressed={layout.css}>
          <Icon size={3.5}>
            <Braces />
          </Icon>
        </ActionButton>
      </Flex>

      <Flex ai="center" gap={2}>
        <ActionButton onClick={copyHandler} label={copied ? 'Link copied' : 'Copy link'}>
          <Icon size={3.5}>{copied ? <Check /> : <Link2 />}</Icon>
        </ActionButton>

        {/* A form rather than the StackBlitz SDK: the SDK is this POST, and a docs page does not need a
            dependency to write one. `_blank`, so the playground a reader is in is not the thing that leaves. */}
        <Box tag="form" ref={fork} display="none" props={{ action: STACKBLITZ_URL, method: 'POST', target: '_blank' }}>
          {stackblitzForm(source, body).map(([name, value]) => (
            <Box key={name} tag="input" props={{ type: 'hidden', name, value, readOnly: true }} />
          ))}
        </Box>
        <ActionButton onClick={() => fork.current?.submit()} label="StackBlitz">
          <Icon size={3.5}>
            <ExternalLink />
          </Icon>
        </ActionButton>

        <ActionButton onClick={() => onChange(STARTER)} label="Reset">
          <Icon size={3.5}>
            <RotateCcw />
          </Icon>
        </ActionButton>

        <Divider />

        {/* Only where the docs column is narrower than the window, and never over a full screen. */}
        {fullscreen.full ? null : (
          <ActionButton
            onClick={() => onLayoutChange({ wide: !layout.wide })}
            label="Full width"
            pressed={layout.wide}
            display="none"
            xl={{ display: 'block' }}
          >
            <Icon size={3.5}>{layout.wide ? <ChevronsRightLeft /> : <ChevronsLeftRight />}</Icon>
          </ActionButton>
        )}

        <ActionButton onClick={fullscreen.toggle} label={fullscreen.full ? 'Exit full screen' : 'Full screen'}>
          <Icon size={3.5}>{fullscreen.full ? <Minimize /> : <Maximize />}</Icon>
        </ActionButton>
      </Flex>
    </Flex>
  );
}

function Divider() {
  return <Box width={0.25} height={5} mx={1} bgColor="slate-300" theme={{ dark: { bgColor: 'slate-700' } }} />;
}

function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  return [copied, () => setCopied(true)];
}

interface PaneButtonProps {
  label: string;
  onClick: () => void;
  /** What the button says for two seconds after a press, with a tick in place of its icon — for a copy. */
  done?: string;
  children: ReactElement;
}

/** An icon-only control in a pane's header; the label is its name and its tooltip. */
function PaneButton({ label, onClick, done, children }: PaneButtonProps) {
  const [pressed, setPressed] = useCopied();
  const confirming = pressed && done;

  return (
    <Button
      clean
      cursor="pointer"
      p={1.5}
      borderRadius={1.5}
      color="slate-500"
      hover={{ color: 'slate-700', bgColor: 'slate-500/10' }}
      theme={{ dark: { hover: { color: 'slate-200' } } }}
      onClick={() => {
        onClick();
        setPressed();
      }}
      props={{ 'aria-label': confirming ? done : label, title: label }}
    >
      <Icon size={3.5}>{confirming ? <Check /> : children}</Icon>
    </Button>
  );
}

const actionStyles = {
  clean: true,
  cursor: 'pointer',
  py: 2,
  px: 3,
  borderRadius: 2,
  fontSize: 12,
  theme: {
    dark: { bgColor: 'slate-800', color: 'slate-300', hover: { bgColor: 'slate-700' } },
    light: { bgColor: 'slate-100', color: 'slate-600', hover: { bgColor: 'slate-200' } },
  },
} satisfies BoxProps;

/** A toggle that is on wears the accent, so the panes showing can be read off the toolbar at a glance. */
const pressedTheme = {
  dark: { bgColor: 'indigo-500/20', color: 'indigo-200', hover: { bgColor: 'indigo-500/30' } },
  light: { bgColor: 'indigo-50', color: 'indigo-700', hover: { bgColor: 'indigo-100' } },
} satisfies BoxProps['theme'];

interface ActionButtonProps extends Pick<BoxProps, 'display' | 'xl'> {
  onClick: () => void;
  label: string;
  /** A toggle keeps one name and says which way it is set, so a screen reader hears "pressed". */
  pressed?: boolean;
  children: ReactNode;
}

/** The label is the button's name whether or not it is drawn: below `md` the row does not fit a phone. */
function ActionButton({ onClick, label, pressed, children, ...rest }: ActionButtonProps) {
  return (
    <Button
      {...actionStyles}
      theme={pressed ? pressedTheme : actionStyles.theme}
      {...rest}
      onClick={onClick}
      props={{ 'aria-label': label, 'aria-pressed': pressed }}
    >
      <Flex ai="center" gap={2}>
        {children}
        <Box display="none" md={{ display: 'block' }} whiteSpace="nowrap">
          {label}
        </Box>
      </Flex>
    </Button>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="kbd"
      display="inline"
      px={1.5}
      py={0.5}
      borderRadius={1}
      fontSize={11}
      b={1}
      theme={{ dark: { borderColor: 'slate-700', bgColor: 'slate-800' }, light: { borderColor: 'slate-200', bgColor: 'slate-50' } }}
    >
      {children}
    </Box>
  );
}
