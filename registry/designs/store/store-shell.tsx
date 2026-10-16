'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Icon from '@box-kite/react/components/icon';
import { Footer, H2, Header, Li, Link, Main, Nav, P, Ul } from '@box-kite/react/components/semantics';
import { Lock, Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';
import { STORE_NAME } from './store-data';
import { eyebrow, muted, StoreTheme, useStoreLinks } from './store-design';

export interface StoreShellProps {
  /** The number on the cart link. */
  cartCount?: number;
  /** A checkout's header: the brand and a padlock, with nothing to wander off through. */
  checkout?: boolean;
  /** Opens in this theme rather than the reader's saved or system one. */
  theme?: string;
  children: ReactNode;
}

const navLink = {
  color: 'stone-600',
  fontSize: 14,
  textDecoration: 'none',
  hover: { color: 'stone-950' },
  focusVisible: { outline: 2, outlineColor: 'stone-900', outlineOffset: 4 },
  theme: { dark: { color: 'stone-400', hover: { color: 'white' }, focusVisible: { outlineColor: 'stone-100' } } },
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
        bgColor="white/90"
        backdropBlur="md"
        theme={{ dark: { borderColor: 'stone-800', bgColor: 'stone-950/90' } }}
      >
        <Flex ai="center" gap={10} maxWidth={300} mx="auto" px={5} md={{ px: 8 }} height={16}>
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
                <Ul listStyle="none" m={0} p={0} display="flex" gap={8}>
                  <Li>
                    <Link props={{ href: `${links.shop}#collection` }} {...navLink}>
                      Shop
                    </Link>
                  </Li>
                  <Li>
                    <Link props={{ href: `${links.shop}#studio` }} {...navLink}>
                      About
                    </Link>
                  </Li>
                </Ul>
              </Nav>
              <Flex ai="center" gap={4} ms="auto">
                <ThemeToggle />
                <Link
                  props={{ href: links.cart, 'aria-label': `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` }}
                  {...navLink}
                  color="stone-900"
                  theme={{ dark: { color: 'stone-100', hover: { color: 'white' }, focusVisible: { outlineColor: 'stone-100' } } }}
                >
                  Cart ({cartCount})
                </Link>
              </Flex>
            </>
          )}
        </Flex>
      </Header>

      <Main maxWidth={300} mx="auto" px={5} md={{ px: 8 }} py={10}>
        {children}
      </Main>

      <Footer bt={1} borderColor="stone-200" mt={16} theme={{ dark: { borderColor: 'stone-800' } }}>
        <Grid maxWidth={300} mx="auto" px={5} md={{ px: 8, gridTemplateColumns: 4 }} py={14} gap={10} gridTemplateColumns={1} fontSize={14}>
          <Box md={{ gridColumn: 2 }}>
            <Wordmark href={links.shop} />
            <P mt={4} maxWidth={80} lineHeight={22} {...muted}>
              Everyday objects, made to be used for a long time and noticed only when they are needed.
            </P>
          </Box>
          <FooterLinks
            title="Shop"
            links={[
              { label: 'All objects', href: `${links.shop}#collection` },
              { label: 'Your cart', href: links.cart },
              { label: 'Checkout', href: links.checkout },
            ]}
          />
          <FooterLinks
            title="Help"
            links={[
              { label: 'Care', href: `${links.product('table-lamp')}#details` },
              { label: 'Shipping and returns', href: `${links.product('table-lamp')}#details` },
              { label: 'About', href: `${links.shop}#studio` },
            ]}
          />
        </Grid>
        <P maxWidth={300} mx="auto" px={5} md={{ px: 8 }} pb={8} fontSize={13} {...muted}>
          © 2026 {STORE_NAME} Objects. A fictional shop — nothing here is for sale.
        </P>
      </Footer>
    </StoreTheme>
  );
}

function Wordmark({ href }: { href: string }) {
  return (
    <Link
      props={{ href }}
      fontSize={15}
      fontWeight={600}
      letterSpacing={5}
      textTransform="uppercase"
      color="stone-950"
      textDecoration="none"
      focusVisible={{ outline: 2, outlineColor: 'stone-900', outlineOffset: 4 }}
      theme={{ dark: { color: 'white', focusVisible: { outlineColor: 'stone-100' } } }}
    >
      {STORE_NAME}
    </Link>
  );
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <Box>
      <H2 mb={4} {...eyebrow} {...muted}>
        {title}
      </H2>
      <Ul listStyle="none" m={0} p={0} display="flex" d="column" gap={2.5}>
        {links.map((link) => (
          <Li key={link.label}>
            <Link props={{ href: link.href }} {...navLink}>
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
    <Button variant="ghost" px={2} py={2} onClick={() => setTheme(next)} props={{ 'aria-label': `Switch to the ${next} theme` }}>
      <Icon size={4}>{theme === 'dark' ? <Sun /> : <Moon />}</Icon>
    </Button>
  );
}
