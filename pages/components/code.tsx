import { Check, Copy, PlayCircle, Terminal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { canOpenInPlayground, playgroundHref } from '../site/playground';
import reactToJsx from '../utils/reactToJsx';
import CodeHighlight from './codeHighlight';
import IconSwap from './iconSwap';
import SiteLink from './siteLink';

interface Props extends BoxProps {
  language?: 'javascript' | 'shell' | 'jsx' | 'css' | 'json' | 'auto';
  label?: string;
  /** Optional explicit code string. If not provided, children will be converted to JSX string. */
  code?: string;
  /** If true, only show code block without rendering the children demo */
  codeOnly?: boolean;
  /**
   * `false` for a block that is deliberately not compilable code — an outline with `...` in it, two files
   * shown at once. Read by `scripts/check-docs-snippets.mjs`, which compiles every other `code` string.
   */
  check?: boolean;
  /**
   * Hold the live demo back until the block is near the viewport: /datagrid mounts ten grids, four
   * hundred rows between them, and nine are off screen. The snippet is never deferred — it is the part
   * a reader (and a crawler) came for.
   */
  defer?: boolean;
  /**
   * Declarations the snippet is written against but does not show — the row type a DataGrid infers its
   * cells from. Compiled with the snippet, never displayed, so keep it to what the page genuinely owns.
   */
  context?: string;
}

export default function Code(props: Props) {
  // `check` and `context` are metadata for scripts/check-docs-snippets.mjs — pulled out of the
  // props so they never reach the DOM, and never read here.
  const { children, language = 'jsx', label, code: codeProp, codeOnly, defer, check, context: _context, ...restProps } = props;
  const [copied, setCopied] = useState(false);

  // Convert children to JSX string if no explicit code prop
  const code = useMemo(() => {
    if (codeProp) return codeProp;
    if (!children) return '';
    return reactToJsx(children as React.ReactNode);
  }, [codeProp, children]);

  const demoRef = useRef<HTMLDivElement>(null);
  const [demoReady, setDemoReady] = useState(!defer);

  useEffect(() => {
    const element = demoRef.current;
    if (demoReady || !element) return;

    // A generous margin: the demo is built well before it is on screen, so scrolling never waits for it.
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setDemoReady(true), {
      rootMargin: '600px',
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [demoReady]);

  function copyHandler() {
    navigator.clipboard.writeText(code);
    setCopied(true);
  }

  useEffect(() => {
    copied && setTimeout(() => setCopied(false), 2000);
  }, [copied]);

  const isShell = language === 'shell';
  const playable = useMemo(() => Boolean(code) && canOpenInPlayground(code, { language, check }), [code, language, check]);

  return (
    <Box {...restProps}>
      {label && (
        <Box
          fontSize={15}
          fontWeight={600}
          theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-700' } }}
          mb={3}
          props={{ 'data-md': 'label' }}
        >
          {label}
        </Box>
      )}
      <Box
        shadow="large"
        borderRadius={3}
        overflow="hidden"
        b={1}
        theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
      >
        {/* Demo Area — `data-md` because the markdown mirror wants the snippet, not the rendered
            markup it produces: a grid demo is four hundred rows of mock data as text. */}
        {children && !codeOnly && (
          <Box
            ref={demoRef}
            props={{ 'data-md': 'skip' }}
            p={6}
            // Reserved while the demo is held back, so the page does not jump as it fills in.
            minHeight={demoReady ? undefined : 100}
            theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-700' }, light: { bgColor: 'slate-50', borderColor: 'slate-200' } }}
            bb={1}
          >
            {demoReady ? children : null}
          </Box>
        )}

        {/* Code Block — every colour in it is a part of the `code` style tree in pages/extends.ts. */}
        <Box component="code" position="relative">
          {/* Header */}
          <Box component="code.header" props={{ 'data-md': 'skip' }}>
            <Box component="code.label">
              {isShell ? <Terminal size={14} /> : <Box width={3} height={3} borderRadius={10} bgColor="emerald-500" />}
              <Box>{isShell ? 'Terminal' : language.toUpperCase()}</Box>
            </Box>

            <Flex ai="center" gap={2} props={{ 'data-md': 'skip' }}>
              {/* Only where the snippet would actually run: the test beside it agrees with the compiler on
                  every block the site shows, so a link offered here is never one that opens on nothing. */}
              {playable && (
                <SiteLink to={playgroundHref(code)} component="code.action">
                  <Icon size={3.5}>
                    <PlayCircle />
                  </Icon>
                  Playground
                </SiteLink>
              )}

              {code && (
                <Button component="code.action" variant={{ done: copied }} onClick={() => !copied && copyHandler()}>
                  <IconSwap key={copied ? 'check' : 'copy'} scale={0.8}>
                    <Icon size={3.5}>{copied ? <Check /> : <Copy />}</Icon>
                  </IconSwap>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
            </Flex>
          </Box>

          {/* Code Content — the `language-` class is what the markdown mirror reads the fence's language from. */}
          <Box tag="pre" component="code.content" className={`language-${language}`}>
            <Box tag="code" display="inline">
              <CodeHighlight source={code} language={language} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
