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
import { heading, StoreTheme, useStoreLinks } from './store-design';

export interface StoreShellProps {
  /** The number on the cart link. */
  cartCount?: number;
  /** A checkout's header: the brand and a padlock, with nothing to wander off through. */
  checkout?: boolean;
  /** Opens in this theme rather than the reader's saved or system one. */
  theme?: string;
  children: ReactNode;
}

const muted = { color: 'slate-600', theme: { dark: { color: 'slate-400' } } } as const;
const navLink = {
  color: 'slate-700',
  fontSize: 15,
  textDecoration: 'none',
  hover: { color: 'slate-950', textDecoration: 'underline' },
  theme: { dark: { color: 'slate-300', hover: { color: 'white' } } },
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
        borderColor="slate-200"
        bgColor="slate-50/85"
        backdropBlur="md"
        theme={{ dark: { borderColor: 'slate-800', bgColor: 'slate-950/85' } }}
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
                  color="slate-800"
                  hover={{ bgColor: 'slate-100' }}
                  focusVisible={{ outline: 2, outlineColor: 'violet-600', outlineOffset: 2 }}
                  theme={{ dark: { color: 'slate-200', hover: { bgColor: 'slate-800' } } }}
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
                      bgGradient={{ linear: 'br', colors: ['violet-600', 'fuchsia-700'] }}
                      color="white"
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

      <Footer bt={1} borderColor="slate-200" theme={{ dark: { borderColor: 'slate-800' } }}>
        <Grid maxWidth={300} mx="auto" px={5} md={{ px: 8, gridTemplateColumns: 4 }} py={12} gap={8} gridTemplateColumns={1} fontSize={14}>
          <Box md={{ gridColumn: 2 }}>
            <Wordmark href={links.shop} />
            <P mt={3} maxWidth={80} lineHeight={22} {...muted}>
              Glossy vinyl desk toys, designed by three people in a very small studio and cast in numbered runs. Every one is hand-finished,
              so no two blush quite the same.
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
              { label: 'Care and cleaning', href: `${links.product('bolt-robot')}#details` },
              { label: 'Shipping and returns', href: `${links.product('bolt-robot')}#details` },
              { label: 'The studio', href: `${links.shop}#studio` },
            ]}
          />
        </Grid>
        <P maxWidth={300} mx="auto" px={5} md={{ px: 8 }} pb={8} fontSize={13} {...muted}>
          © 2026 {STORE_NAME} Toys. A fictional studio — nothing here is for sale.
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
      color="slate-900"
      textDecoration="none"
      focusVisible={{ outline: 2, outlineColor: 'violet-600', outlineOffset: 4, borderRadius: 1 }}
      theme={{ dark: { color: 'slate-50' } }}
    >
      <Flex
        width={8}
        height={8}
        ai="center"
        jc="center"
        borderRadius={2.5}
        bgGradient={{ linear: 'br', colors: ['violet-500', 'fuchsia-500', 'pink-400'] }}
        shadow="sm"
        shadowColor="violet-700/30"
      >
        <Svg viewBox="0 0 24 24" width={20} height={20}>
          <Path d="M14.5 4.5 A8 8 0 1 0 19.5 16.5 A6.5 6.5 0 1 1 14.5 4.5 Z" fill="white" />
          <Path d="M18 3 L18.8 5.2 L21 6 L18.8 6.8 L18 9 L17.2 6.8 L15 6 L17.2 5.2 Z" fill="white" />
        </Svg>
      </Flex>
      <Span fontSize={21} letterSpacing={-0.5} {...heading}>
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
