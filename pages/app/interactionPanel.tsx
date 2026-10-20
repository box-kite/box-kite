import { useEffect, useRef, useSyncExternalStore } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { Aside, Span } from '../../src/components/semantics';
import { forgetLog, interactionFeed } from './interactionLog';

const NO_LINES: never[] = [];

/**
 * The site eating its own `Box.onInteraction`: every change a component reports, every press that changed nothing
 * (named by `data-bk`) and every navigation, newest first. Opened by `?interactions`, loaded only then, and nothing
 * in it leaves the page.
 */
export default function InteractionPanel({ onClose }: { onClose(): void }) {
  const lines = useSyncExternalStore(interactionFeed.subscribe, interactionFeed.snapshot, () => NO_LINES);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    interactionFeed.ignore((target) => !!target && !!panelRef.current?.contains(target));
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
          <Button variant="ghost" px={2} py={1} fontSize={12} onClick={interactionFeed.clear}>
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
