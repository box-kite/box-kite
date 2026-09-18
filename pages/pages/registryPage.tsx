import { Blocks, ChevronDown } from 'lucide-react';
import { ReactNode } from 'react';
import DashboardShell from '../../registry/blocks/dashboard-shell/dashboard-shell';
import DashboardStats from '../../registry/blocks/dashboard-shell/dashboard-stats';
import InvoicesGrid from '../../registry/blocks/data-grid/invoices-grid';
import SettingsForm from '../../registry/blocks/settings-form/settings-form';
import Box from '../../src/box';
import { Collapsible } from '../../src/components/accordion';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2, Link } from '../../src/components/semantics';
import Toaster from '../../src/components/toaster';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import {
  installCommand,
  itemPath,
  REGISTRY_NAMESPACE,
  registryItems,
  type RegistryItem,
  type RegistryItemName,
  registryTemplate,
  v0Url,
} from '../site/registry';
import { registrySources } from '../site/registrySources';
import { SITE_URL } from '../site/site';

/** The docs site's own prose-link colours, the pair every other page uses. */
const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

/**
 * What each item renders as. A record keyed by the item name, so a block added to the registry with no
 * preview here does not compile — the same trick the route table uses.
 */
const previews: Record<RegistryItemName, ReactNode> = {
  'data-grid': <InvoicesGrid />,
  'settings-form': <SettingsForm />,
  'dashboard-shell': (
    <DashboardShell title="Overview" current="overview">
      <DashboardStats />
    </DashboardShell>
  ),
};

const componentsJson = `{
  "registries": {
    "${REGISTRY_NAMESPACE}": "${registryTemplate()}"
  }
}`;

function Frame({ children }: { children: ReactNode }) {
  return (
    <Box
      mt={5}
      p={4}
      borderRadius={3}
      b={1}
      overflow="auto"
      theme={{
        dark: { borderColor: 'slate-800', bgColor: 'slate-950' },
        light: { borderColor: 'slate-200', bgColor: 'slate-50' },
      }}
    >
      {children}
    </Box>
  );
}

function SourceFile({ path }: { path: string }) {
  const name = path.split('/').pop();

  return (
    <Collapsible
      mt={3}
      trigger={(trigger) => (
        <Button
          {...trigger}
          variant="ghost"
          display="flex"
          ai="center"
          gap={2}
          px={3}
          py={2}
          fontSize={13}
          theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}
        >
          <Icon size={4}>
            <ChevronDown />
          </Icon>
          <Mono>{name}</Mono>
        </Button>
      )}
    >
      <Code language="jsx" code={registrySources[path]} codeOnly label={name} />
    </Collapsible>
  );
}

function BlockSection({ item }: { item: RegistryItem }) {
  return (
    <Box id={item.name}>
      <H2 fontSize={20} fontWeight={600} mb={3} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {item.title}
      </H2>
      <Box fontSize={15} lineHeight={26} mb={4} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {item.description}
      </Box>
      <Code language="shell" code={installCommand(item.name)} />
      <Flex gap={4} mt={3} fontSize={14} flexWrap="wrap" ai="center">
        <Link props={{ href: v0Url(item.name), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
          Open in v0
        </Link>
        <Link props={{ href: itemPath(item.name), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
          The item JSON
        </Link>
        <Box theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
          {item.files.length} file{item.files.length === 1 ? '' : 's'} · installs {item.dependencies.join(', ')}
        </Box>
      </Flex>
      <Frame>{previews[item.name as RegistryItemName]}</Frame>
      {item.files.map((file) => (
        <SourceFile key={file.path} path={file.path} />
      ))}
    </Box>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

export default function RegistryPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Blocks}
        title="Blocks, installed by the shadcn CLI"
        description="Finished sections you install into your own repository and then own — a data grid, a settings form and a dashboard shell."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            A shadcn registry is JSON over HTTP, and the CLI that reads it does not care which library the code imports. These three items
            install the <Mono>@box-kite/react</Mono> package and drop wired code beside it — so the parts you will change are yours from the
            first commit, and the parts you will not stay a dependency you can upgrade.
          </Box>

          <Section id="install" title="Two ways in">
            <Box mb={4}>
              Point the CLI straight at an item, from any project that has a <Mono>components.json</Mono>:
            </Box>
            <Code language="shell" code={installCommand('data-grid')} />
            <Box my={4}>
              Or register the namespace once, and then name the block rather than its address. Add this to <Mono>components.json</Mono>:
            </Box>
            <Code language="javascript" check={false} code={componentsJson} />
            <Box mt={4} mb={4}>
              After that, <Mono>npx shadcn@latest add {REGISTRY_NAMESPACE}/data-grid</Mono> — and{' '}
              <Mono>npx shadcn@latest search {REGISTRY_NAMESPACE}</Mono> lists what is here.
            </Box>
            <Box>
              Nothing about this needs Tailwind. The CLI wants a <Mono>components.json</Mono> with a <Mono>tailwind</Mono> key in it, and
              empty strings satisfy it: these blocks write no CSS file and import no stylesheet, because every style in them is a prop.
            </Box>
          </Section>

          {registryItems.map((item) => (
            <BlockSection key={item.name} item={item} />
          ))}

          <Section id="how" title="Where the JSON comes from">
            <Box mb={4}>
              The three blocks are ordinary sources in the library&apos;s own repository, under <Mono>registry/blocks/</Mono>. They are
              type-checked by the same <Mono>tsc</Mono> run as the library, rendered on this page from those same files, and inlined into{' '}
              <Link props={{ href: itemPath('data-grid'), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
                the item JSON
              </Link>{' '}
              at build time. A block that stops compiling cannot be published, and what you install is what is running above.
            </Box>
            <Box mb={4}>
              The catalog is at{' '}
              <Link props={{ href: '/registry.json', target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
                {SITE_URL}/registry.json
              </Link>
              , and each item at <Mono>/r/&lt;name&gt;.json</Mono>.
            </Box>
            <Box>
              The components themselves are a package, not a registry item:{' '}
              <SiteLink to="/installation" theme={linkTheme}>
                install @box-kite/react
              </SiteLink>{' '}
              and import <Mono>Button</Mono>, <Mono>Dialog</Mono> or <Mono>DataGrid</Mono> directly. A block is for the composition above
              them — the part that is always half yours.
            </Box>
          </Section>
        </Flex>
      </Reveal>

      {/* The settings form reports a save through `toast()`, which needs a viewport on the page. */}
      <Toaster />
    </Box>
  );
}

const sidebarLinks = [
  { id: 'install', label: 'Two ways in' },
  ...registryItems.map((item) => ({ id: item.name, label: item.title })),
  { id: 'how', label: 'Where the JSON comes from' },
];
