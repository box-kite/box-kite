'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Icon from '@box-kite/react/components/icon';
import Menu from '@box-kite/react/components/menu';
import { H1, Header, Li, Link, Main, Nav, Span, Ul } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import { LayoutDashboard, Moon, Receipt, Search, Settings, Sun, Users } from 'lucide-react';
import { type ReactElement, type ReactNode } from 'react';

/**
 * The frame an admin app hangs off: a sidebar, a header with search, a theme toggle and an account
 * menu, and the page itself. The sidebar sticks to the top of its column and folds away below the `md`
 * breakpoint; nothing here is measured or positioned by script.
 *
 * `Box.Theme` is `use="local"` here, so the theme lands on this element and the block can sit inside a
 * page that has its own. Move it to your root layout as `use="global"` for an app-wide switch.
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: ReactElement;
}

const dashboardNav: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '#overview', icon: <LayoutDashboard /> },
  { id: 'invoices', label: 'Invoices', href: '#invoices', icon: <Receipt /> },
  { id: 'customers', label: 'Customers', href: '#customers', icon: <Users /> },
  { id: 'settings', label: 'Settings', href: '#settings', icon: <Settings /> },
];

function ThemeToggle() {
  const [theme, setTheme] = Box.useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button variant="ghost" p={2} borderRadius={2} onClick={() => setTheme(next)} props={{ 'aria-label': `Switch to the ${next} theme` }}>
      <Icon size={4}>{theme === 'dark' ? <Sun /> : <Moon />}</Icon>
    </Button>
  );
}

interface SidebarProps {
  current: string;
}

function Sidebar({ current }: SidebarProps) {
  return (
    <Nav
      display="none"
      md={{ display: 'block' }}
      width={64}
      flexShrink={0}
      be={1}
      borderColor="slate-200"
      theme={{ dark: { borderColor: 'slate-800' } }}
      props={{ 'aria-label': 'Sections' }}
    >
      <Box position="sticky" top={0} p={4}>
        <Flex ai="center" gap={2} px={2} py={3} mb={2}>
          <Box width={6} height={6} borderRadius={2} bgGradient={{ linear: 'br', colors: ['violet-500', 'sky-400'] }} />
          <Span fontWeight={600}>Acme Ops</Span>
        </Flex>
        <Ul listStyle="none" m={0} p={0}>
          {dashboardNav.map((item) => (
            <Li key={item.id}>
              <Link
                props={{ href: item.href, 'aria-current': item.id === current ? 'page' : undefined }}
                display="flex"
                ai="center"
                gap={3}
                px={3}
                py={2}
                my={0.5}
                borderRadius={2}
                fontSize={14}
                textDecoration="none"
                color={item.id === current ? 'violet-700' : 'slate-600'}
                bgColor={item.id === current ? 'violet-50' : 'transparent'}
                hover={{ bgColor: item.id === current ? 'violet-50' : 'slate-100' }}
                theme={{
                  dark: {
                    color: item.id === current ? 'violet-300' : 'slate-400',
                    bgColor: item.id === current ? 'violet-950' : 'transparent',
                    hover: { bgColor: item.id === current ? 'violet-950' : 'slate-900' },
                  },
                }}
              >
                <Icon size={4}>{item.icon}</Icon>
                {item.label}
              </Link>
            </Li>
          ))}
        </Ul>
      </Box>
    </Nav>
  );
}

export interface DashboardShellProps {
  /** The heading above the page, and the `id` of the nav item that is marked as current. */
  title: string;
  current?: string;
  children: ReactNode;
}

export default function DashboardShell({ title, current = 'overview', children }: DashboardShellProps) {
  return (
    <Box.Theme storageKey="dashboard-theme">
      <Flex
        minHeight="fit"
        bgColor="slate-50"
        color="slate-900"
        theme={{ dark: { bgColor: 'slate-950', color: 'slate-100' } }}
        overflow="hidden"
        borderRadius={3}
      >
        <Sidebar current={current} />
        <Flex d="column" flexGrow={1} minWidth={0}>
          <Header
            display="flex"
            ai="center"
            gap={3}
            px={5}
            py={3}
            bb={1}
            borderColor="slate-200"
            theme={{ dark: { borderColor: 'slate-800' } }}
          >
            <H1 fontSize={16} fontWeight={600} flexGrow={1}>
              {title}
            </H1>
            {/* Away below `md`, with the sidebar: a fixed-width field is what pushes the header past a
                phone's width, and search deserves a screen of its own there rather than a sliver. */}
            <Flex ai="center" gap={2} position="relative" display="none" md={{ display: 'flex' }}>
              <Icon size={4} position="absolute" insetStart={3} color="slate-400" pointerEvents="none">
                <Search />
              </Icon>
              <Textbox type="search" ps={9} py={2} width={56} placeholder="Search…" props={{ 'aria-label': 'Search' }} />
            </Flex>
            <ThemeToggle />
            <Menu
              trigger={(trigger) => (
                <Button {...trigger} variant="ghost" p={2} borderRadius={2}>
                  AL
                </Button>
              )}
            >
              <Menu.Item>Profile</Menu.Item>
              <Menu.Item>Billing</Menu.Item>
              <Menu.Separator />
              <Menu.Item>Sign out</Menu.Item>
            </Menu>
          </Header>
          <Main p={5} flexGrow={1}>
            {children}
          </Main>
        </Flex>
      </Flex>
    </Box.Theme>
  );
}
