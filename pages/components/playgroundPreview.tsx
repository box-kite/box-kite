/**
 * What the snippet renders, and the rules it renders with. The error boundary is the point of the first
 * half: a reader is editing, so a component that throws on half-typed props is an ordinary event — the
 * message belongs on screen, not in the console, and the next keystroke deserves a fresh attempt.
 */
import { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { StylesContext } from '../../src/react/useStyles';
import usedRules, { classesOf, UsedRule } from '../site/playgroundCss';

interface BoundaryProps {
  /** A new snippet resets the boundary: the next thing a reader typed deserves its own chance to render. */
  resetKey: unknown;
  children: ReactNode;
}

class PreviewBoundary extends Component<BoundaryProps, { message: string | null; resetKey: unknown }> {
  state = { message: null as string | null, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: BoundaryProps, state: { message: string | null; resetKey: unknown }) {
    return props.resetKey === state.resetKey ? null : { message: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  // React logs a caught error to the console anyway; this is here so the overload is deliberate.
  componentDidCatch(_error: unknown, _info: ErrorInfo) {}

  render() {
    return this.state.message === null ? this.props.children : <PlaygroundMessage kind="error" text={this.state.message} />;
  }
}

export function PlaygroundMessage({ kind, text }: { kind: 'error' | 'quiet'; text: string }) {
  const tone = kind === 'error' ? 'rose' : 'slate';

  return (
    <Box
      props={{ role: kind === 'error' ? 'alert' : undefined }}
      p={4}
      borderRadius={2}
      fontSize={13}
      whiteSpace="pre-wrap"
      theme={{
        dark: { bgColor: `${tone}-950`, color: `${tone}-300`, borderColor: `${tone}-900` },
        light: { bgColor: `${tone}-50`, color: `${tone}-700`, borderColor: `${tone}-200` },
      }}
      b={1}
    >
      {text}
    </Box>
  );
}

/** The snippet, rendered. `resetKey` is the source, so every edit gets a boundary that has not tripped. */
export function PlaygroundPreview({ resetKey, children }: BoundaryProps) {
  return <PreviewBoundary resetKey={resetKey}>{children}</PreviewBoundary>;
}

/**
 * The rules the preview is using, and the ref that reads them. A callback ref rather than an effect,
 * because the read has to happen *after* the engine has written its pending rules — it flushes them from
 * an insertion effect, and a ref is attached in the layout phase that follows. `flushSync()` closes the
 * gap for anything still queued. The caller keys the element it goes on by the snippet, so a new one
 * remounts and the ref fires again.
 */
export function usePreviewRules(): [(element: HTMLElement | null) => void, UsedRule[]] {
  const [rules, setRules] = useState<UsedRule[]>([]);

  const read = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    StylesContext.flushSync();

    const sheet = (document.getElementById(StylesContext.styleElementId()) as HTMLStyleElement | null)?.sheet;

    setRules(sheet ? usedRules(sheet.cssRules, classesOf(element)) : []);
  }, []);

  return [read, rules];
}

/** One rule, printed the way the sheet holds it — the at-rules it sits in first, outermost first. */
export function PlaygroundRule({ rule }: { rule: UsedRule }) {
  return (
    <Box tag="pre" m={0} fontSize={12} lineHeight={20} whiteSpace="pre-wrap" color="slate-300">
      {rule.context.map((prelude) => (
        <Box key={prelude} color="violet-400">
          {prelude} &#123;
        </Box>
      ))}
      <Flex d="column" ps={rule.context.length ? 4 : 0}>
        <Box color="sky-400">{rule.selector} &#123;</Box>
        <Box ps={4} color="slate-300">
          {rule.declarations}
        </Box>
        <Box color="sky-400">&#125;</Box>
      </Flex>
      {rule.context.map((prelude) => (
        <Box key={prelude} color="violet-400">
          &#125;
        </Box>
      ))}
    </Box>
  );
}
