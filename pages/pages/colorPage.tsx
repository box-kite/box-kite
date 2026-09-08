import { Palette as PaletteIcon } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, P } from '../../src/components/semantics';
import Palette from '../../src/core/palette';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

/**
 * Grouped off the palette itself rather than listed here: the hand-written list this page used to carry
 * had missed the four families Tailwind added, and every value under a swatch was a hex that no longer is.
 */
const groups = Object.keys(Palette.colors).reduce<Record<string, string[]>>((grouped, name) => {
  const family = /^(.+)-\d+$/.exec(name)?.[1] ?? 'keywords';

  (grouped[family] ??= []).push(name);

  return grouped;
}, {});

const alphaSteps = [100, 80, 60, 40, 20] as const;

export default function ColorPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={PaletteIcon}
        title="Colors"
        description="Every colour token in OKLCH — twenty-six families of eleven steps — and the one modifier a colour value takes."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="tokens" title="A colour is a variable">
            Every token is a CSS variable, declared in <Mono>:root</Mono> the first time something on the page asks for it, and used through{' '}
            <Mono>var()</Mono> everywhere after that. That is what makes a colour cheap to repeat and possible to override — and why the
            values below are <Mono>oklch()</Mono> rather than hex: the palette is Tailwind 4.3's, so a component copied from there keeps its
            colours.
          </Section>

          <Code
            id="tokens-code"
            label="What a token compiles to"
            language="css"
            codeOnly
            check={false}
            code={`:root {
  --blue-500: oklch(62.3% .214 259.8);   /* lightness, chroma, hue */
}

/* bgColor="blue-500" */
.bgColor-blue-500 {
  background-color: var(--blue-500);
}`}
          />

          <Section id="families" title="Twenty-six families, eleven steps">
            Five neutrals, the four Tailwind 4.3 added (<Mono>mauve</Mono>, <Mono>mist</Mono>, <Mono>olive</Mono>, <Mono>taupe</Mono>) and
            the seventeen hues. Hover a swatch for the value behind it.
          </Section>

          <Flex d="column" gap={6}>
            {Object.entries(groups).map(([family, tokens]) => (
              <Box key={family}>
                <Box
                  tag="h3"
                  fontSize={13}
                  fontWeight={600}
                  textTransform="capitalize"
                  mb={2}
                  theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}
                >
                  {family}
                </Box>
                {/* A family is one line in the markdown mirror — `50 · 100 · … · 950` under its
                    heading, rather than eleven paragraphs of a number each. */}
                <Flex gap={2} flexWrap="wrap" props={{ 'data-md': 'inline' }}>
                  {tokens.map((token) => (
                    <Box key={token} textAlign="center" props={{ title: `${token} — ${Palette.colors[token as Palette.Token]}` }}>
                      <Box
                        width={12}
                        height={12}
                        borderRadius={2}
                        bgColor={token as Palette.Token}
                        b={1}
                        theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
                        mb={1}
                      />
                      <Box fontSize={10} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                        {token.replace(`${family}-`, '')}
                      </Box>
                    </Box>
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>

          <Section id="alpha" title="An opacity modifier">
            A slash and a number on any colour value — <Mono>bgColor="blue-500/40"</Mono> — is the token at 40% opacity. It is Tailwind's
            spelling of the same thing, it works on every colour prop, and it nests wherever a colour does: inside a <Mono>hover</Mono>, a
            theme, a breakpoint, a <Mono>cq</Mono>.
          </Section>

          <Code
            id="alpha-demo"
            label="The same token, five opacities"
            language="jsx"
            code={`<Flex gap={3}>
  <Box width={16} height={16} borderRadius={2} bgColor="violet-500/100" />
  <Box width={16} height={16} borderRadius={2} bgColor="violet-500/80" />
  <Box width={16} height={16} borderRadius={2} bgColor="violet-500/60" />
  <Box width={16} height={16} borderRadius={2} bgColor="violet-500/40" />
  <Box width={16} height={16} borderRadius={2} bgColor="violet-500/20" />
</Flex>`}
          >
            {/* On a gradient rather than a flat panel: an opacity is only visible against something. */}
            <Flex gap={3} p={4} borderRadius={2} bgImage="gradient-accent" flexWrap="wrap">
              {alphaSteps.map((step) => (
                <Box key={step} textAlign="center">
                  <Box width={16} height={16} borderRadius={2} bgColor={`violet-500/${step}` as Palette.Alpha} mb={1} />
                  <Box fontSize={11} fontWeight={600} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
                    /{step}
                  </Box>
                </Box>
              ))}
            </Flex>
          </Code>

          <Section id="mix" title="The alpha lands on the colour, not on the element">
            <Mono>opacity</Mono> fades the whole element — its text, its border, its children. The modifier fades one declaration, because
            it compiles to a <Mono>color-mix()</Mono> against <Mono>transparent</Mono>: the token stays a <Mono>var()</Mono>, so a themed
            colour is still themed and every element asking for the same value still shares one class. The mix is done in <Mono>oklab</Mono>{' '}
            — mixing towards transparency in a polar space would drag the hue along with it.
          </Section>

          <Code
            id="mix-code"
            label="What the modifier compiles to"
            language="css"
            codeOnly
            check={false}
            code={`/* bgColor="blue-500/40" */
.bgColor-blue-500\\/40 {
  background-color: color-mix(in oklab, var(--blue-500) 40%, transparent);
}`}
          />

          <Section id="extend" title="Your own colours take it too">
            A variable declared through <Mono>Box.extend()</Mono> is a colour value on every one of those props, and the modifier applies to
            it unchanged — the mix reaches the variable, whatever it was declared as. A token the palette does not have (or a percentage
            outside 0–100) is not a colour: it produces no rule and no class name, the way every unmatched value does.
          </Section>

          <Code
            id="extend-code"
            label="A brand colour, and the modifier on it"
            language="jsx"
            codeOnly
            check={false}
            code={`// once, before the first render
Box.extend({ brand: 'oklch(62% 0.19 264)' });

<Box bgColor="brand" b={1} borderColor="brand/30">
  Brand, and its border at 30%
</Box>;`}
          />
        </Flex>
      </Reveal>
    </Box>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <P fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </P>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'tokens', label: 'A colour is a variable' },
  { id: 'families', label: 'The families' },
  { id: 'alpha', label: 'An opacity modifier' },
  { id: 'mix', label: 'Where the alpha lands' },
  { id: 'extend', label: 'Your own colours' },
];
