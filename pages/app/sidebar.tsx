import {
  AlignLeft,
  Anchor,
  BellRing,
  Blend,
  BookOpen,
  Bot,
  Box as BoxIcon,
  ChartSpline,
  CheckSquare,
  ChevronDown,
  Circle,
  Columns3,
  DoorOpen,
  Download,
  Highlighter,
  Languages,
  Layers,
  LayoutGrid,
  ListChecks,
  ListCollapse,
  LoaderCircle,
  MessageSquare,
  Moon,
  MousePointer2,
  Package as PackageIcon,
  Paintbrush,
  Palette,
  PanelTop,
  Proportions,
  Rocket,
  Rows3,
  Search,
  Server,
  Shapes,
  SlidersHorizontal,
  SlidersVertical,
  Sparkles,
  Spline,
  SquareMenu,
  SquareStack,
  Sun,
  Table,
  TextCursor,
  ToggleLeft,
  Type,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { version } from '../../package.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { prefetchPage } from './routePages';

interface SidebarProps {
  toggleTheme: () => void;
  onClose?: () => void;
}

export default function Sidebar({ toggleTheme, onClose }: SidebarProps) {
  const [theme] = Box.useTheme();

  return (
    <Box
      height="fit-screen"
      theme={{
        dark: { bgImage: 'gradient-sidebar-dark', bgColor: 'slate-900', borderColor: 'slate-800' },
        light: { bgImage: 'gradient-sidebar', borderColor: 'slate-200' },
      }}
      br={1}
      display="flex"
      d="column"
      overflow="hidden"
    >
      {/* Header */}
      <Flex ai="center" jc="space-between" p={4} bb={1} theme={{ dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-100' } }}>
        <NavLink to="/">
          <Flex ai="center" gap={3}>
            <Box width={10} height={10} borderRadius={2} bgImage="gradient-primary" display="flex" ai="center" jc="center" shadow="medium">
              <Icon size={5} color="white" strokeWidth={2.5}>
                <BoxIcon />
              </Icon>
            </Box>
            <Box>
              <Box fontWeight={700} fontSize={16} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
                Box Kite
              </Box>
              <Box fontSize={11} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
                v{version}
              </Box>
            </Box>
          </Flex>
        </NavLink>
        <Button
          clean
          p={2}
          borderRadius={2}
          lg={{ display: 'none' }}
          theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}
          onClick={onClose}
        >
          <Icon size={4.5} label="Close the menu">
            <X />
          </Icon>
        </Button>
      </Flex>

      {/* Navigation */}
      <Box flex1 overflow="auto" py={4} px={3}>
        {/* Getting Started */}
        <MenuSection label="Getting Started">
          <MenuItem to="/" icon={<BookOpen />}>
            Introduction
          </MenuItem>
          <MenuItem to="/installation" icon={<Download />}>
            Installation
          </MenuItem>
          <MenuItem to="/migrating" icon={<PackageIcon />}>
            Migrating
          </MenuItem>
          <MenuItem to="/releases" icon={<Rocket />}>
            Releases
          </MenuItem>
          <MenuItem to="/theme-setup" icon={<Paintbrush />}>
            Theme Setup
          </MenuItem>
          <MenuItem to="/server-components" icon={<Server />}>
            Server Components
          </MenuItem>
        </MenuSection>

        {/* AI Context - Highlighted */}
        <Box mb={4}>
          <NavLink to="/ai-context">
            {({ isActive }) => (
              <Flex
                ai="center"
                gap={3}
                py={2.5}
                px={3}
                borderRadius={2}
                cursor={isActive ? 'default' : 'pointer'}
                bgImage={isActive ? 'gradient-primary' : 'none'}
                theme={{
                  dark: {
                    bgColor: isActive ? undefined : 'indigo-950',
                    color: isActive ? 'white' : 'indigo-300',
                    borderColor: 'indigo-800',
                  },
                  light: {
                    bgColor: isActive ? undefined : 'indigo-50',
                    color: isActive ? 'white' : 'indigo-600',
                    borderColor: 'indigo-200',
                  },
                }}
                b={isActive ? 0 : 1}
                fontWeight={500}
                fontSize={14}
              >
                <Icon
                  size={4}
                  theme={{
                    dark: { color: isActive ? 'white' : 'indigo-400' },
                    light: { color: isActive ? 'white' : 'indigo-500' },
                  }}
                >
                  <Bot />
                </Icon>
                <Box flex1>AI Context</Box>
                <Box
                  px={2}
                  py={0.5}
                  borderRadius={10}
                  fontSize={10}
                  fontWeight={600}
                  theme={{
                    dark: { bgColor: isActive ? 'white' : 'indigo-800', color: isActive ? 'indigo-600' : 'indigo-300' },
                    light: { bgColor: isActive ? 'white' : 'indigo-200', color: 'indigo-600' },
                  }}
                >
                  NEW
                </Box>
              </Flex>
            )}
          </NavLink>
        </Box>

        {/* Core */}
        <MenuSection label="Core" defaultOpen>
          <MenuItem to="/box" icon={<BoxIcon />}>
            Box
          </MenuItem>
          <MenuItem to="/svg" icon={<Spline />}>
            SVG
          </MenuItem>
          <MenuItem to="/icon" icon={<Shapes />}>
            Icon
          </MenuItem>
          <MenuItem to="/charts" icon={<ChartSpline />}>
            Charts
          </MenuItem>
          <MenuItem to="/animation" icon={<Sparkles />}>
            Animation
          </MenuItem>
          <MenuItem to="/variants" icon={<SlidersHorizontal />}>
            State Variants
          </MenuItem>
          <MenuItem to="/pseudo-elements" icon={<Highlighter />}>
            Pseudo-Elements
          </MenuItem>
          <MenuItem to="/container-queries" icon={<Proportions />}>
            Container Queries
          </MenuItem>
          <MenuItem to="/anchor" icon={<Anchor />}>
            Anchor Positioning
          </MenuItem>
          <MenuItem to="/gradients-shadows" icon={<Blend />}>
            Gradients & Effects
          </MenuItem>
          <MenuItem to="/rtl" icon={<Languages />}>
            Right to Left
          </MenuItem>
          <MenuItem to="/tailwind-parity" icon={<ListChecks />}>
            Tailwind Parity
          </MenuItem>
          <MenuItem to="/escape-hatch" icon={<DoorOpen />}>
            Escape Hatch
          </MenuItem>
        </MenuSection>

        {/* Components */}
        <MenuSection label="Components" defaultOpen>
          <MenuItem to="/button" icon={<MousePointer2 />}>
            Button
          </MenuItem>
          <MenuItem to="/textbox" icon={<TextCursor />}>
            Textbox
          </MenuItem>
          <MenuItem to="/textarea" icon={<AlignLeft />}>
            Textarea
          </MenuItem>
          <MenuItem to="/checkbox" icon={<CheckSquare />}>
            Checkbox
          </MenuItem>
          <MenuItem to="/radiobutton" icon={<Circle />}>
            Radio Button
          </MenuItem>
          <MenuItem to="/switch" icon={<ToggleLeft />}>
            Switch
          </MenuItem>
          <MenuItem to="/tooltip" icon={<MessageSquare />}>
            Tooltip
          </MenuItem>
          <MenuItem to="/popover" icon={<PanelTop />}>
            Popover
          </MenuItem>
          <MenuItem to="/dialog" icon={<SquareStack />}>
            Dialog
          </MenuItem>
          <MenuItem to="/menu" icon={<SquareMenu />}>
            Menu
          </MenuItem>
          <MenuItem to="/tabs" icon={<Columns3 />}>
            Tabs
          </MenuItem>
          <MenuItem to="/accordion" icon={<ListCollapse />}>
            Accordion
          </MenuItem>
          <MenuItem to="/slider" icon={<SlidersVertical />}>
            Slider
          </MenuItem>
          <MenuItem to="/progress" icon={<LoaderCircle />}>
            Progress
          </MenuItem>
          <MenuItem to="/toaster" icon={<BellRing />}>
            Toaster
          </MenuItem>
          <MenuItem to="/overlay" icon={<Layers />}>
            Overlay
          </MenuItem>
          <MenuItem to="/combobox" icon={<Search />}>
            Combobox
          </MenuItem>
          <MenuItem to="/dropdown" icon={<ChevronDown />}>
            Dropdown
          </MenuItem>
          <MenuItem to="/datagrid" icon={<Table />}>
            Data Grid
          </MenuItem>
        </MenuSection>

        {/* Layout */}
        <MenuSection label="Layout" defaultOpen>
          <MenuItem to="/flex" icon={<Rows3 />}>
            Flex
          </MenuItem>
          <MenuItem to="/grid" icon={<LayoutGrid />}>
            Grid
          </MenuItem>
        </MenuSection>

        {/* Extensions */}
        <MenuSection label="Extensions" defaultOpen>
          <MenuItem to="/style-grouping" icon={<Type />}>
            Style Grouping
          </MenuItem>
        </MenuSection>

        {/* Resources */}
        <MenuSection label="Resources">
          <MenuItem to="/colors" icon={<Palette />}>
            Colors
          </MenuItem>
        </MenuSection>
      </Box>

      {/* Footer */}
      <Box p={4} bt={1} theme={{ dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-100' } }}>
        <Flex ai="center" jc="space-between">
          <Box fontSize={12} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
            <Flex ai="center" gap={2}>
              <Icon size={3.5}>
                <Layers />
              </Icon>
              Theme
            </Flex>
          </Box>
          <Button
            clean
            p={2}
            px={3}
            borderRadius={2}
            theme={{
              dark: { bgColor: 'slate-800', color: 'slate-300' },
              light: { bgColor: 'slate-100', color: 'slate-600' },
            }}
            onClick={toggleTheme}
            transitionDuration={150}
          >
            <Flex ai="center" gap={2}>
              <Icon size={3.5}>{theme === 'dark' ? <Sun /> : <Moon />}</Icon>
              <Box fontSize={12}>{theme === 'dark' ? 'Light' : 'Dark'}</Box>
            </Flex>
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}

interface MenuSectionProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function MenuSection({ label, children, defaultOpen = true }: MenuSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // `interpolateSize` inherits, so declaring it on the group is what lets the panel below animate to
  // `height: auto`. Chromium-only; elsewhere the group snaps open.
  return (
    <Box mb={4} interpolateSize="allow-keywords">
      <Flex
        ai="center"
        jc="space-between"
        py={2}
        px={3}
        cursor="pointer"
        borderRadius={2}
        props={{ onClick: () => setIsOpen(!isOpen) }}
        transitionDuration={150}
      >
        <Box
          fontSize={11}
          fontWeight={600}
          textTransform="uppercase"
          letterSpacing={1}
          theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}
        >
          {label}
        </Box>
        <Box rotate={isOpen ? 0 : -90} transition="transform" transitionDuration={200}>
          <Icon size={3.5} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
            <ChevronDown />
          </Icon>
        </Box>
      </Flex>
      {/* No `transition` group: the height *and* the opacity move, which is what the base `all` is. */}
      <Box height={isOpen ? 'auto' : 0} opacity={isOpen ? 1 : 0} overflow="hidden" transitionDuration={200}>
        <Box mt={1}>{children}</Box>
      </Box>
    </Box>
  );
}

interface MenuItemProps {
  to: string;
  icon: React.ReactElement;
  children: React.ReactNode;
}

function MenuItem({ to, icon, children }: MenuItemProps) {
  // A page is a dynamic import now, and /datagrid's chunk is nearly a megabyte — so it starts
  // downloading when the pointer arrives, not when the click does. On intent only: prefetching every
  // route on idle would put the whole site back in front of every reader.
  const prefetch = () => prefetchPage(to);

  return (
    <NavLink to={to} onPointerEnter={prefetch} onFocus={prefetch}>
      {({ isActive }) => (
        <Flex
          ai="center"
          gap={3}
          py={2}
          px={3}
          my={0.5}
          borderRadius={2}
          cursor={isActive ? 'default' : 'pointer'}
          bgImage={isActive ? 'gradient-primary' : 'none'}
          theme={{
            dark: { color: isActive ? 'white' : 'slate-300' },
            light: { color: isActive ? 'white' : 'slate-600' },
          }}
          fontWeight={isActive ? 500 : 400}
          fontSize={14}
        >
          <Icon
            size={4}
            theme={{
              dark: { color: isActive ? 'white' : 'slate-500' },
              light: { color: isActive ? 'white' : 'slate-400' },
            }}
          >
            {icon}
          </Icon>
          {children}
        </Flex>
      )}
    </NavLink>
  );
}
