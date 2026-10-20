import { useEffect, useRef, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { Aside, Span } from '../../src/components/semantics';
import { clickLine, forgetLog, InteractionLine, interactionLine } from './interactionLog';

const KEEP = 50;

/**
 * The site eating its own `Box.onInteraction`: every change a component reports, plus every press `data-bk`
 * names, newest first. Opened by `?interactions`, loaded only then, and nothing in it leaves the page.
 */
export default function InteractionPanel({ onClose }: { onClose(): void }) {
  const [lines, setLines] = useState<InteractionLine[]>([]);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const add = (line: InteractionLine | null) => line && setLines((current) => [line, ...current].slice(0, KEEP));
    const stop = Box.onInteraction((event) => add(interactionLine(event)));
    // Capture, so a press a component stops from bubbling is still heard.
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) add(clickLine(event.target));
    };

    document.addEventListener('click', onClick, true);

    return () => {
      stop();
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <Aside
      ref={panelRef}
      position="fixed"
      bottom={4}
      insetEnd={4}
      zIndex={100}
      width={88}
      css={{ maxWidth: 'calc(100vw - 2rem)' }}
      b={1}
      borderRadius={3}
      shadow="lg"
      fontSize={12}
      theme={{ dark: { bgColor: 'base-900', borderColor: 'base-700' }, light: { bgColor: 'white', borderColor: 'base-200' } }}
      props={{ 'aria-label': 'Interaction log', 'data-md': 'skip' }}
    >
      <Flex
        ai="center"
        jc="space-between"
        gap={2}
        px={3}
        py={2}
        bb={1}
        theme={{ dark: { borderColor: 'base-700' }, light: { borderColor: 'base-200' } }}
      >
        <Span fontWeight={600}>Box.onInteraction</Span>
        <Flex gap={1}>
          <Button variant="ghost" px={2} py={1} fontSize={12} onClick={() => setLines([])}>
            Clear
          </Button>
          <Button
            variant="ghost"
            px={2}
            py={1}
            fontSize={12}
            onClick={() => {
              forgetLog();
              onClose();
            }}
          >
            Close
          </Button>
        </Flex>
      </Flex>
      <Box
        css={{ maxHeight: '45vh', fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace" }}
        overflowY="auto"
        px={3}
        py={2}
        props={{ role: 'log', 'aria-live': 'off' }}
      >
        {lines.length === 0 ? (
          <Box color="base-500">Use the page: open a menu, pick a tab, sort a grid.</Box>
        ) : (
          lines.map((line) => (
            <Box key={line.id} py={1}>
              <Span color="base-500" me={2}>
                {line.time}
              </Span>
              <Span theme={{ dark: { color: 'accent-300' }, light: { color: 'accent-700' } }}>{line.name}</Span>
              {line.detail && <Box color="base-500">{line.detail}</Box>}
            </Box>
          ))
        )}
      </Box>
    </Aside>
  );
}
