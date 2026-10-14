import { Blocks } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, Link } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { installCommand, itemPath, REGISTRY_NAMESPACE, registryTemplate } from '../site/registry';
import { SITE_URL } from '../site/site';
import { BLOCKS_PATH, blockPath, blocks, registryItemFor } from '../site/templates';

/** The docs site's own prose-link colours, the pair every other page uses. */
const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

const componentsJson = `{
  "registries": {
    "${REGISTRY_NAMESPACE}": "${registryTemplate()}"
  }
}`;

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
        title="Install React blocks with the shadcn CLI"
        description="Every block on this site is a registry item: one command installs it into your own repository, as code you then own."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            A shadcn registry is JSON over HTTP, and the CLI that reads it does not care which library the code imports. Each item installs
            the <Mono>@box-kite/react</Mono> package and drop wired code beside it — so the parts you will change are yours from the first
            commit, and the parts you will not stay a dependency you can upgrade.
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
              The CLI expects a <Mono>components.json</Mono> carrying a <Mono>tailwind</Mono> key, and empty strings satisfy it — these
              blocks write no CSS file and import no stylesheet, because every style in them is a prop.
            </Box>
          </Section>

          <Section id="blocks" title="The blocks">
            <Box mb={4}>
              Each one has a page of its own with the block running in light and dark and every file it writes —{' '}
              <SiteLink to={BLOCKS_PATH} display="inline" theme={linkTheme}>
                all of them
              </SiteLink>{' '}
              are in the gallery.
            </Box>
            <Flex d="column" gap={5}>
              {blocks.map((block) => (
                <Box key={block.slug}>
                  <SiteLink to={blockPath(block.slug)} fontWeight={600} theme={linkTheme}>
                    {block.name}
                  </SiteLink>
                  <Box mt={1} mb={3}>
                    {block.description}
                  </Box>
                  <Code language="shell" code={installCommand(registryItemFor(block).name)} />
                </Box>
              ))}
            </Flex>
          </Section>

          <Section id="how" title="Where the JSON comes from">
            <Box mb={4}>
              The blocks are ordinary sources in the library&apos;s own repository, under <Mono>registry/blocks/</Mono>. They are
              type-checked by the same <Mono>tsc</Mono> run as the library, rendered on their pages from those same files, and inlined into{' '}
              <Link props={{ href: itemPath('data-grid'), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
                the item JSON
              </Link>{' '}
              at build time. A block that stops compiling cannot be published, and what you install is what is running on its page.
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
              <SiteLink to="/installation" display="inline" theme={linkTheme}>
                install @box-kite/react
              </SiteLink>{' '}
              and import <Mono>Button</Mono>, <Mono>Dialog</Mono> or <Mono>DataGrid</Mono> directly. A block is for the composition above
              them — the part that is always half yours.
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'install', label: 'Two ways in' },
  { id: 'blocks', label: 'The blocks' },
  { id: 'how', label: 'Where the JSON comes from' },
];
