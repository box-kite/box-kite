import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { Link } from '../../src/components/semantics';
import type { TocEntry } from '../pageContext';
import { scrollToSection } from '../utils/scrollToSection';
import { activeIndex, keepInView } from '../utils/tocUtils';

// Where a heading counts as reached: below the sticky section bar, a little past where a hash link lands it (`scroll-padding-top`).
const READING_LINE = 96;
const FADE = 32;

// The fade grows on whichever edge has links past it, so a list that fits wears none — the timeline is inactive then.
// Two oversized mask layers, each sliding its own fade into view. Nothing moves, so it stays under reduced motion; Firefox has no fade.
const EDGE_MASK = `linear-gradient(to bottom, transparent, black ${FADE}px), linear-gradient(to bottom, black calc(100% - ${FADE}px), transparent)`;

Box.keyframes({
  'toc-edge-fade': {
    from: { css: { maskImage: EDGE_MASK, maskPosition: `0 -${FADE}px, 0 -${FADE}px` } },
    '12%': { css: { maskPosition: `0 0, 0 -${FADE}px` } },
    '88%': { css: { maskPosition: `0 0, 0 -${FADE}px` } },
    to: { css: { maskImage: EDGE_MASK, maskPosition: '0 0, 0 0' } },
  },
});

export default function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const links = entries.filter((entry) => 'id' in entry);
  const active = useActiveSection(links.map((entry) => entry.id));
  const marker = useMarker(listRef, active);

  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelectorAll('a')[active];
    if (!list || !link) return;

    const top = link.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    const target = keepInView(
      { top, height: link.offsetHeight },
      { scrollTop: list.scrollTop, height: list.clientHeight, scrollHeight: list.scrollHeight },
      FADE,
    );
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (target !== null) list.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  }, [active]);

  return (
    <Flex d="column" minHeight={0} gap={3}>
      <Box fontSize={12} fontWeight={600} theme={{ dark: { color: 'base-200' }, light: { color: 'base-900' } }}>
        On this page
      </Box>
      <Box
        ref={listRef}
        minHeight={0}
        overflowY="auto"
        scrollbarWidth="none"
        css={{
          overscrollBehavior: 'contain',
          maskSize: `100% calc(100% + ${FADE}px)`,
          maskRepeat: 'no-repeat',
          maskComposite: 'intersect',
        }}
        animationName="toc-edge-fade"
        animationTimeline="scroll(self)"
        animationTimingFunction="linear"
      >
        <Flex d="column" position="relative" pb={2}>
          {/* The rail, and the marker sliding along it to the section being read. */}
          <Box
            position="absolute"
            top={0}
            bottom={0}
            insetStart={0}
            width={0.25}
            theme={{ dark: { bgColor: 'base-800' }, light: { bgColor: 'base-200' } }}
          />
          <Box
            position="absolute"
            top={0}
            insetStart={0}
            width={0.5}
            borderRadius={1}
            bgColor="accent-500"
            opacity={marker ? 1 : 0}
            css={{ transitionProperty: 'translate, height, opacity' }}
            transitionDuration={200}
            transitionTimingFunction="ease-out"
            // Measured per section, so a class for it would be a rule per position.
            style={marker ? { translate: `0 ${marker.top}px`, height: `${marker.height}px` } : undefined}
            props={{ 'aria-hidden': true }}
          />
          {entries.map((entry) =>
            'section' in entry ? (
              <Box
                key={entry.label}
                fontSize={11}
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing={1}
                ps={3}
                mt={4}
                mb={1}
                theme={{ dark: { color: 'base-500' }, light: { color: 'base-400' } }}
              >
                {entry.label}
              </Box>
            ) : (
              <Link
                key={entry.id}
                props={{
                  href: `#${entry.id}`,
                  'aria-current': links[active] === entry ? 'location' : undefined,
                  onClick: (e) => {
                    const target = document.getElementById(entry.id);
                    if (!target) return;
                    e.preventDefault();
                    scrollToSection(target);
                    history.replaceState(null, '', `#${entry.id}`);
                    Box.reportInteraction({
                      component: 'toc',
                      type: 'jump',
                      reason: 'click',
                      value: entry.id,
                      event: e,
                      details: {
                        label: entry.label,
                        group: groupOf(entries, entry),
                        position: links.indexOf(entry) + 1,
                        of: links.length,
                        from: links[active]?.id,
                        page: location.pathname,
                      },
                    });
                  },
                }}
                fontSize={13}
                lineHeight={20}
                py={1}
                ps={3}
                pe={2}
                cursor="pointer"
                textDecoration="none"
                transition="colors"
                theme={{
                  dark: { color: 'base-400', hover: { color: 'base-100' }, ariaAttr: { 'current=location': { color: 'accent-300' } } },
                  light: { color: 'base-500', hover: { color: 'base-900' }, ariaAttr: { 'current=location': { color: 'accent-600' } } },
                }}
              >
                {entry.label}
              </Link>
            ),
          )}
        </Flex>
      </Box>
    </Flex>
  );
}

/** The section heading a link sits under, if the list has any. */
function groupOf(entries: TocEntry[], link: TocEntry): string | undefined {
  let group: string | undefined;
  for (const entry of entries) {
    if (entry === link) return group;
    if ('section' in entry) group = entry.label;
  }

  return undefined;
}

/** Which of `ids` the reader is in, followed on scroll — one read of the headings per frame at most. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(-1);
  const key = ids.join(' ');

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const tops = key.split(' ').map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      const root = document.documentElement;
      setActive(activeIndex(tops, READING_LINE, root.scrollTop + root.clientHeight >= root.scrollHeight - 2));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [key]);

  return active;
}

/** The active link's place inside the list, for the marker; null while no section is active. */
function useMarker(listRef: React.RefObject<HTMLDivElement | null>, active: number) {
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const link = listRef.current?.querySelectorAll('a')[active];
    setMarker(link ? { top: link.offsetTop, height: link.offsetHeight } : null);
  }, [listRef, active]);

  return marker;
}
