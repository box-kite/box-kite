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
                      bgGradient={{ linear: 'br', colors: ['orange-600', 'rose-700'] }}
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
      <Flex
        width={8}
        height={8}
        ai="center"
        jc="center"
        borderRadius={2.5}
        bgGradient={{ linear: 'br', colors: ['amber-400', 'orange-500', 'rose-600'] }}
        shadow="sm"
        shadowColor="orange-700/30"
      >
        <Svg viewBox="0 0 24 24" width={20} height={20}>
          <Path d="M4 11 Q5 20 12 20 Q19 20 20 11 Z" fill="white" />
          <Path
            d="M8.5 8 Q10 6 8.5 4 M12 8 Q13.5 6 12 4 M15.5 8 Q17 6 15.5 4"
            fill="none"
            stroke="white"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </Svg>
      </Flex>
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
