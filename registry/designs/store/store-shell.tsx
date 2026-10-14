'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Icon from '@box-kite/react/components/icon';
import { Footer, H2, Header, Li, Link, Main, Nav, P, Span, Ul } from '@box-kite/react/components/semantics';
import { Path, Svg } from '@box-kite/react/components/svg';
import { Lock, Moon, ShoppingBag, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { STORE_NAME } from './store-data';
import { SERIF, StoreTheme, useStoreLinks } from './store-design';

export interface StoreShellProps {
  /** The number on the cart link. */
  cartCount?: number;
  /** A checkout's header: the brand and a padlock, with nothing to wander off through. */
  checkout?: boolean;
  /** Opens in this theme rather than the reader's saved or system one. */
  theme?: string;
  children: ReactNode;
}

const muted = { color: 'stone-600', theme: { dark: { color: 'stone-400' } } } as const;
const navLink = {
  color: 'stone-700',
  fontSize: 15,
  textDecoration: 'none',
  hover: { color: 'stone-950', textDecoration: 'underline' },
  theme: { dark: { color: 'stone-300', hover: { color: 'white' } } },
} as const;

/** The frame every store page shares: the header, the page, the footer, and the theme switch. */
export default function StoreShell({ cartCount = 0, checkout, theme, children }: StoreShellProps) {
  const links = useStoreLinks();

  return (
    <StoreTheme theme={theme}>
      <Header
        position="sticky"
        top={0}
        zIndex={10}
        bb={1}
        borderColor="stone-200"
        bgColor="stone-50/85"
        backdropBlur="md"
        theme={{ dark: { borderColor: 'stone-800', bgColor: 'stone-950/85' } }}
      >
        <Flex ai="center" gap={6} maxWidth={300} mx="auto" px={5} md={{ px: 8 }} height={16}>
          <Wordmark href={links.shop} />
          {checkout ? (
            <Flex ai="center" gap={2} ms="auto" fontSize={14} {...muted}>
              <Icon size={4}>
                <Lock />
              </Icon>
              Secure checkout
            </Flex>
          ) : (
            <>
              <Nav props={{ 'aria-label': 'Store' }} display="none" sm={{ display: 'block' }}>
                <Ul listStyle="none" m={0} p={0} display="flex" gap={6}>
                  <Li>
                    <Link props={{ href: `${links.shop}#collection` }} {...navLink}>
                      Shop all
                    </Link>
                  </Li>
                  <Li>
                    <Link props={{ href: `${links.shop}#studio` }} {...navLink}>
                      The studio
                    </Link>
                  </Li>
                </Ul>
              </Nav>
              <Flex ai="center" gap={1} ms="auto">
                <ThemeToggle />
                <Link
                  props={{ href: links.cart, 'aria-label': `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` }}
                  position="relative"
                  display="flex"
                  p={2}
                  borderRadius={999}
                  color="stone-800"
                  hover={{ bgColor: 'stone-100' }}
                  focusVisible={{ outline: 2, outlineColor: 'orange-600', outlineOffset: 2 }}
                  theme={{ dark: { color: 'stone-200', hover: { bgColor: 'stone-800' } } }}
                >
                  <Icon size={5}>
                    <ShoppingBag />
                  </Icon>
                  {cartCount > 0 && (
                    <Span
                      position="absolute"
                      top={0}
                      insetEnd={0}
                      minWidth={4.5}
                      height={4.5}
                      px={1}
                      display="flex"
                      ai="center"
                      jc="center"
                      borderRadius={999}
                      fontSize={11}
                      fontWeight={700}
                      bgColor="orange-700"
                      color="white"
                      theme={{ dark: { bgColor: 'orange-500', color: 'stone-950' } }}
                    >
                      {cartCount}
                    </Span>
                  )}
                </Link>
              </Flex>
            </>
          )}
        </Flex>
      </Header>

      <Main maxWidth={300} mx="auto" px={5} md={{ px: 8 }} py={10}>
        {children}
      </Main>

      <Footer bt={1} borderColor="stone-200" theme={{ dark: { borderColor: 'stone-800' } }}>
        <Grid maxWidth={300} mx="auto" px={5} md={{ px: 8, gridTemplateColumns: 4 }} py={12} gap={8} gridTemplateColumns={1} fontSize={14}>
          <Box md={{ gridColumn: 2 }}>
            <Wordmark href={links.shop} />
            <P mt={3} maxWidth={80} lineHeight={22} {...muted}>
              Stoneware thrown, trimmed and glazed by four potters in a converted boathouse. Every piece is a little different from the
              photograph — there is no photograph.
            </P>
          </Box>
          <FooterLinks
            title="Shop"
            links={[
              { label: 'Shop all', href: `${links.shop}#collection` },
              { label: 'Your cart', href: links.cart },
              { label: 'Checkout', href: links.checkout },
            ]}
          />
          <FooterLinks
            title="Help"
            links={[
              { label: 'Care and cleaning', href: `${links.product('tide-mug')}#details` },
              { label: 'Shipping and returns', href: `${links.product('tide-mug')}#details` },
              { label: 'The studio', href: `${links.shop}#studio` },
            ]}
          />
        </Grid>
        <P maxWidth={300} mx="auto" px={5} md={{ px: 8 }} pb={8} fontSize={13} {...muted}>
          © 2026 {STORE_NAME} Ceramics. A fictional studio — nothing here is for sale.
        </P>
      </Footer>
    </StoreTheme>
  );
}

function Wordmark({ href }: { href: string }) {
  return (
    <Link
      props={{ href }}
      display="flex"
      ai="center"
      gap={2}
      color="stone-900"
      textDecoration="none"
      focusVisible={{ outline: 2, outlineColor: 'orange-600', outlineOffset: 4, borderRadius: 1 }}
      theme={{ dark: { color: 'stone-50' } }}
    >
      <Svg viewBox="0 0 24 24" width={24} height={24}>
        <Path d="M3 10 Q4 21 12 21 Q20 21 21 10 Z" fill="orange-700" theme={{ dark: { fill: 'orange-400' } }} />
        <Path
          d="M7 7 Q9 4 7 2 M12 7 Q14 4 12 2 M17 7 Q19 4 17 2"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
      <Span fontSize={21} fontWeight={600} letterSpacing={-0.5} css={{ fontFamily: SERIF }}>
        {STORE_NAME}
      </Span>
    </Link>
  );
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <Box>
      <H2 fontSize={13} fontWeight={600} letterSpacing={1} textTransform="uppercase" mb={3}>
        {title}
      </H2>
      <Ul listStyle="none" m={0} p={0} display="flex" d="column" gap={2}>
        {links.map((link) => (
          <Li key={link.label}>
            <Link props={{ href: link.href }} {...navLink} fontSize={14}>
              {link.label}
            </Link>
          </Li>
        ))}
      </Ul>
    </Box>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = Box.useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      px={2}
      py={2}
      borderRadius={999}
      onClick={() => setTheme(next)}
      props={{ 'aria-label': `Switch to the ${next} theme` }}
    >
      <Icon size={5}>{theme === 'dark' ? <Sun /> : <Moon />}</Icon>
    </Button>
  );
}
