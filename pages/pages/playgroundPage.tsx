import { Check, ExternalLink, Link2, PlayCircle, RotateCcw } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2 } from '../../src/components/semantics';
import Tabs from '../../src/components/tabs';
import { useHydrated } from '../app/hydration';
import PageHeader from '../components/pageHeader';
import PlaygroundEditor from '../components/playgroundEditor';
import { PlaygroundMessage, PlaygroundPreview, PlaygroundRule, usePreviewRules } from '../components/playgroundPreview';
import { decodeSnippet, encodeSnippet, SNIPPET_PARAM } from '../site/playground';
import { UsedRule } from '../site/playgroundCss';
import { stackblitzForm, STACKBLITZ_URL } from '../site/playgroundProject';
import loadPlaygroundScope, { PlaygroundScope } from '../site/playgroundScope';
import { compileSnippet, CompiledSnippet } from '../site/playgroundSource';
import type { PlaygroundCompletions } from '../site/playgroundVocabulary';

/** What the page opens on when the URL carries nothing — small enough to read, and every line is a prop. */
const STARTER = `<Flex d="column" gap={4} p={6} borderRadius={3} b={1} borderColor="slate-200" theme={{ dark: { borderColor: 'slate-700' } }}>
  <H2 fontSize={20} fontWeight={600}>Every value is a prop</H2>

  <Flex gap={3} flexWrap="wrap">
    <Box px={4} py={2} borderRadius={2} bgColor="sky-500/15" color="sky-600" fontSize={14}>
      A token at 15%
    </Box>
    <Box px={4} py={2} borderRadius={2} bgColor="violet-500" color="white" fontSize={14} hover={{ scale: 1.05 }} transition="transform">
      Hover me
    </Box>
  </Flex>
</Flex>`;

/** How long a reader stops typing before the snippet is compiled and the address bar catches up. */
const SETTLE = 250;

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
        description="Edit the props and watch the CSS. The snippet runs against the real library, and the pane beside it is every rule the engine wrote for what you typed."
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

interface WorkbenchProps {
  scope: PlaygroundScope;
  source: string;
  settled: string;
  onChange: (source: string) => void;
  onShare: (params: URLSearchParams, options: { replace: boolean }) => void;
}

function Workbench({ scope, source, settled, onChange, onShare }: WorkbenchProps) {
  const compiled = useMemo(() => compileSnippet(settled, scope), [settled, scope]);
  const [readRules, rules] = usePreviewRules();
  const completions = useCompletions();

  // The address is the share, so it follows the snippet rather than waiting for a button. `replace`, or
  // every pause while typing would be a place the back button stops at.
  useEffect(() => {
    onShare(new URLSearchParams({ [SNIPPET_PARAM]: encodeSnippet(settled) }), { replace: true });
  }, [settled, onShare]);

  const { Component } = compiled;

  return (
    <Flex d="column" gap={5}>
      <Flex d="column" lg={{ d: 'row' }} gap={5} ai="stretch">
        <Flex d="column" gap={3} flex1 minWidth={0}>
          <Flex ai="center" jc="space-between" gap={3}>
            <H2 fontSize={15} fontWeight={600}>
              Snippet
            </H2>
            <Actions source={source} body={compiled.body} onReset={() => onChange(STARTER)} />
          </Flex>

          <Box
            height={140}
            borderRadius={3}
            overflow="hidden"
            b={1}
            theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
          >
            <PlaygroundEditor value={source} onChange={onChange} label="Snippet to run, as JSX" completions={completions} />
          </Box>

          <Box fontSize={12} color="slate-500">
            Suggestions open as you type a prop or a value — <Key>Ctrl</Key> <Key>Space</Key> asks for them anywhere. Tab indents, so{' '}
            <Key>Esc</Key> then <Key>Tab</Key> is the way out of the editor.
          </Box>
        </Flex>

        <Flex d="column" gap={3} flex1 minWidth={0}>
          <Panes compiled={compiled} rules={rules}>
            {/* Keyed by the snippet, so a new one remounts and the ref reads the rules it wrote. */}
            <Box key={compiled.body} ref={readRules}>
              {Component ? (
                <PlaygroundPreview resetKey={Component}>
                  <Component />
                </PlaygroundPreview>
              ) : null}
            </Box>
          </Panes>
        </Flex>
      </Flex>
    </Flex>
  );
}

function Panes({ compiled, rules, children }: { compiled: CompiledSnippet; rules: UsedRule[]; children: ReactNode }) {
  const said = compiled.error
    ? { kind: 'error' as const, text: compiled.error }
    : compiled.unresolved.length
      ? { kind: 'error' as const, text: `The playground has nothing to give these names: ${compiled.unresolved.join(', ')}.` }
      : !compiled.renders
        ? { kind: 'quiet' as const, text: 'Nothing to render — this snippet is configuration, not an element.' }
        : null;

  return (
    // `keepMounted`, because the CSS pane is about what the *preview* rendered: an unmounted panel never
    // renders the snippet, so reading the rules while this tab was showing reported the last snippet's.
    <Tabs defaultValue="preview" keepMounted>
      <Tabs.List label="What the snippet produced">
        <Tabs.Tab value="preview">Preview</Tabs.Tab>
        <Tabs.Tab value="css">Generated CSS{rules.length ? ` (${rules.length})` : ''}</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="preview">
        <Box
          minHeight={80}
          p={6}
          borderRadius={3}
          b={1}
          theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
        >
          {said ? <PlaygroundMessage {...said} /> : null}
          {children}
        </Box>
      </Tabs.Panel>

      <Tabs.Panel value="css">
        <Box
          component="code"
          minHeight={80}
          maxHeight={140}
          overflow="auto"
          p={4}
          borderRadius={3}
          b={1}
          theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
        >
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
      </Tabs.Panel>
    </Tabs>
  );
}

function Actions({ source, body, onReset }: { source: string; body: string; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const fork = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  function copyHandler() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
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
      <ActionButton onClick={() => fork.current?.submit()} label="Open in StackBlitz">
        <Icon size={3.5}>
          <ExternalLink />
        </Icon>
      </ActionButton>

      <ActionButton onClick={onReset} label="Reset to the starting snippet">
        <Icon size={3.5}>
          <RotateCcw />
        </Icon>
      </ActionButton>
    </Flex>
  );
}

/** The label is the button's name whether or not it is drawn: below `md` three of them do not fit a phone. */
function ActionButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <Button
      clean
      p={2}
      px={3}
      borderRadius={2}
      fontSize={12}
      onClick={onClick}
      props={{ 'aria-label': label }}
      theme={{
        dark: { bgColor: 'slate-800', color: 'slate-300', hover: { bgColor: 'slate-700' } },
        light: { bgColor: 'slate-100', color: 'slate-600', hover: { bgColor: 'slate-200' } },
      }}
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
