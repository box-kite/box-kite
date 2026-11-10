import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { Aside, H2, Img, Li, Link, P, Ul } from '../../src/components/semantics';

// The article's first and last `App.tsx`, run. Identical to the code blocks except that the `H1` is an `H2` (the post owns the
// `<h1>`) and the photo is read from this site rather than by its absolute address.

const photo = '/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export function StartingPage() {
  return (
    <Box p={6}>
      <Flex gap={6} mb={6}>
        {sections.map((section) => (
          <Link key={section} props={{ href: '#' }} color="indigo-600" theme={{ dark: { color: 'indigo-300' } }}>
            {section}
          </Link>
        ))}
      </Flex>

      <Flex gap={8}>
        <Aside width={56} flexShrink={0}>
          <Ul>
            {days.map((day) => (
              <Li key={day}>{day}</Li>
            ))}
          </Ul>
        </Aside>

        <Box>
          <H2 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H2>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} />
          <P>Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4</P>
        </Box>
      </Flex>
    </Box>
  );
}

export function FinishedPage() {
  return (
    <Box p={6}>
      <Flex gap={6} mb={6} flexWrap="wrap">
        {sections.map((section) => (
          <Link key={section} props={{ href: '#' }} color="indigo-600" theme={{ dark: { color: 'indigo-300' } }}>
            {section}
          </Link>
        ))}
      </Flex>

      <Flex d="column" gap={8} md={{ d: 'row' }}>
        <Aside md={{ width: '1/4', flexShrink: 0 }}>
          <Ul>
            {days.map((day) => (
              <Li key={day}>{day}</Li>
            ))}
          </Ul>
        </Aside>

        <Box>
          <H2 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H2>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} maxWidth="fit" height="auto" />
          <P css={{ overflowWrap: 'anywhere' }}>
            Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4
          </P>
        </Box>
      </Flex>
    </Box>
  );
}
