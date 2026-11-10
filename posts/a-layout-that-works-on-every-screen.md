# A layout that works on every screen

_10 November 2026 · Beginner_

Your page looks right on your laptop and scrolls sideways on your phone: this guide finds what is too wide and fixes the usual causes one at a time.

You will build a small travel page that breaks on a phone the way real pages do, look at it the way a phone does, find the parts that stick out, and fix each one. At the end the same page is one column on a phone and two columns on a laptop. You need a React app with Box Kite installed; if you do not have one yet, steps 1 and 2 of [Your first web page with Box Kite](https://www.box-kite.dev/blog/start-building-with-box-kite/) take two minutes.

## Step 1: build a page that breaks

Replace everything in `src/App.tsx` with this:

```tsx
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Aside, H1, Img, Li, Link, P, Ul } from '@box-kite/react/components/semantics';

const photo = 'https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export default function App() {
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
          <H1 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H1>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} />
          <P>Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4</P>
        </Box>
      </Flex>
    </Box>
  );
}
```

A row of links (indigo, and a lighter indigo in dark mode), a sidebar with a fixed width (`width={56}` is 224 pixels, because spacing is on a scale of four), and a story with a photo and a booking link. On a wide laptop screen most of it looks fine. Every part of it is a real cause of a page that scrolls sideways.

![The starting page: the sidebar keeps its width, and the photo runs past the edge of the frame.](https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/starting-page.png)

## Step 2: look at it the way a phone does

You do not need a phone yet. Open your browser's developer tools (F12, or Cmd+Option+I on a Mac) and turn on the device toolbar: Ctrl+Shift+M, or Cmd+Shift+M on a Mac, in Chrome and Edge, and "Responsive Design Mode" in Firefox and Safari. Pick a phone such as the iPhone 12 Pro, which is 390 pixels wide.

The page now scrolls sideways: drag it left and the photo and the booking link keep going. That sideways scroll is the bug. A phone shows the page at its own width only because Vite's `index.html` already carries the `<meta name="viewport">` line; keep it.

## Step 3: find what is too wide

Open the Console tab of the developer tools, paste this and press Enter:

```js nocheck
document.querySelectorAll('body *').forEach((el) => {
  if (el.getBoundingClientRect().right > innerWidth || el.scrollWidth > el.clientWidth) el.style.outline = '2px solid red';
});
```

Every element that runs past the right edge of the screen, or whose content runs past its own edge, gets a red outline. The outer boxes light up because something inside them is too wide; look for the innermost red box and you have found the culprit. On this page there are three: the row of links, the sidebar with its photo beside it, and the booking link. Reload the page to clear the outlines.

## Step 4: let the row of links wrap

A row keeps everything on one line unless you tell it otherwise. Add `flexWrap="wrap"` to the first `Flex`, so the links that do not fit move to a second line:

```tsx
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Aside, H1, Img, Li, Link, P, Ul } from '@box-kite/react/components/semantics';

const photo = 'https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export default function App() {
  return (
    <Box p={6}>
      <Flex gap={6} mb={6} flexWrap="wrap">
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
          <H1 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H1>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} />
          <P>Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4</P>
        </Box>
      </Flex>
    </Box>
  );
}
```

At phone width the last links now start a second line, and none of them is cut off at the edge. The page still scrolls, because of the other two culprits.

## Step 5: one column on a phone, two on a laptop

Two columns side by side do not fit in 390 pixels. Write the phone layout first and add the laptop layout on top of it: `d="column"` stacks the sidebar above the story, and `md={{ d: 'row' }}` puts them side by side from 768 pixels up. Every prop works this way: the plain prop is for every screen, and `sm`, `md`, `lg`, `xl` and `xxl` override it from 640, 768, 1024, 1280 and 1536 pixels.

The sidebar's fixed width goes the same way: no width on a phone, so it takes the whole column, and a quarter of the page from `md` up. `'1/4'` is a fraction of the parent's width, and `flexShrink: 0` keeps the sidebar at that quarter instead of letting a wide photo squeeze it.

```tsx
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Aside, H1, Img, Li, Link, P, Ul } from '@box-kite/react/components/semantics';

const photo = 'https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export default function App() {
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
          <H1 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H1>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} />
          <P>Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4</P>
        </Box>
      </Flex>
    </Box>
  );
}
```

At phone width the days now sit above the story. Switch the device toolbar to a laptop size and they move back beside it. Without `flexShrink: 0` the sidebar came out at 103 pixels instead of 193 on an 820-pixel screen.

## Step 6: let the photo shrink

A picture is as wide as its file unless you say otherwise, and this one is 1,200 pixels. `maxWidth="fit"` caps it at the width of its column (`fit` is 100%), and `height="auto"` keeps its proportions as it shrinks:

```tsx
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Aside, H1, Img, Li, Link, P, Ul } from '@box-kite/react/components/semantics';

const photo = 'https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export default function App() {
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
          <H1 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H1>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} maxWidth="fit" height="auto" />
          <P>Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4</P>
        </Box>
      </Flex>
    </Box>
  );
}
```

The photo now fits the screen. Run the snippet from step 3 again: one red box is left, around the booking link.

## Step 7: break the long link

A browser only breaks a line at a space or at certain punctuation, and the long code at the end of the booking link has neither. `overflow-wrap: anywhere` lets it break between any two letters when nothing else fits. Box Kite has no typed prop for it yet, so it goes in `css`, the escape hatch for a CSS property without a prop of its own. It still becomes a class, like every other prop:

```tsx
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Aside, H1, Img, Li, Link, P, Ul } from '@box-kite/react/components/semantics';

const photo = 'https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/coast.jpg';
const sections = ['Itinerary', 'Packing list', 'Budget', 'Photos', 'Contacts'];
const days = ['Day 1 · Lisbon', 'Day 4 · Sintra', 'Day 7 · Lagos'];

export default function App() {
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
          <H1 fontSize={32} fontWeight={700} mb={4}>
            Ten days in Portugal
          </H1>
          <Img props={{ src: photo, alt: 'The coast near Lagos' }} mb={4} maxWidth="fit" height="auto" />
          <P css={{ overflowWrap: 'anywhere' }}>
            Tickets: https://www.example.com/bookings/PT2026LISBONSINTRALAGOSK7Q2M9X4R8T1W6Z3N5V8B2C4
          </P>
        </Box>
      </Flex>
    </Box>
  );
}
```

The page no longer scrolls sideways. Run the snippet once more and nothing turns red. We checked this page at 390, 820 and 1280 pixels in Chrome, Firefox and Safari's engine: it fits all three, and the sidebar is exactly a quarter of the page from 768 pixels up.

![The finished page: one column on a phone, the days beside the story from 768 pixels up.](https://www.box-kite.dev/img/blog/a-layout-that-works-on-every-screen/finished-page.png)

## What you learned

| What sticks out                  | What fixes it                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| A row with too many things in it | `flexWrap="wrap"`                                                                      |
| Two columns side by side         | `d="column"` for the phone, `md={{ d: 'row' }}` for wider screens                      |
| A fixed width                    | no width on the phone, a fraction from `md` up: `md={{ width: '1/4', flexShrink: 0 }}` |
| A picture                        | `maxWidth="fit"` and `height="auto"`                                                   |
| A long word or link              | `css={{ overflowWrap: 'anywhere' }}`                                                   |

Two habits matter more than any one prop. Write the phone layout first and add `md` for bigger screens, because the plain prop applies everywhere. And when a page scrolls sideways, find the culprit with the snippet before you change anything: hiding the overflow on the whole page makes the scrollbar go away and leaves the cut-off content where it was.

Check on a real phone before you ship. The device toolbar gets the width right, but not everything a phone does, like the on-screen keyboard.

## Where to go next

- [Grid](https://www.box-kite.dev/grid) does columns that line up across rows: `gridTemplateColumns={1}` with `md={{ gridTemplateColumns: 3 }}` is the card row from the first guide.
- [Nesting](https://www.box-kite.dev/box/#nesting) shows every key a prop can sit under. A breakpoint, dark mode and hover combine, like `md={{ hover: { color: 'indigo-700' } }}`.
- [Container queries](https://www.box-kite.dev/container-queries) are for a card or a widget that should adapt to the space it is given rather than to the screen.
- [The escape hatch](https://www.box-kite.dev/escape-hatch) has more on `css`, for the next property without a prop of its own.
