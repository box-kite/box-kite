import { Blocks } from 'lucide-react';
import { ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import { H2, Link, Ul, Li } from '../../src/components/semantics';
import Toaster from '../../src/components/toaster';
import type { FamilyPageProps } from '../app/routePages';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { installCommand, itemPath, v0Url } from '../site/registry';
import { registrySources } from '../site/registrySources';
import { blockDemoPath, blockFor, ContentProps, registryItemFor, SnapshotTheme, templatePath, templatesUsing } from '../site/templates';
import NotFoundPage from './notFoundPage';

const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

const prose = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const heading = { dark: { color: 'white' }, light: { color: 'slate-900' } } as const;

/** One block: `/blocks/<slug>/`, its preview handed over by the route's loader as `Content`. */
export default function BlockPage({ Content }: FamilyPageProps) {
  const block = blockFor(useLocation().pathname);
  const usedIn = block ? templatesUsing(block.slug) : [];

  useTableOfContents([
    { id: 'install', label: 'Install' },
    { id: 'preview', label: 'Light and dark' },
    { id: 'source', label: 'Source' },
    ...(usedIn.length ? [{ id: 'used-in', label: 'Used in' }] : []),
  ]);

  if (!block || !Content) return <NotFoundPage />;

  const item = registryItemFor(block);

  return (
    <Box>
      <PageHeader icon={Blocks} title={block.name} description={block.description} />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box id="install">
            <H2 fontSize={20} fontWeight={600} mb={3} theme={heading}>
              Install
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              One command copies the files into your project, as code you then own. It needs a <Mono>components.json</Mono>, and{' '}
              <SiteLink to="/registry" display="inline" theme={linkTheme}>
                the shadcn registry page
              </SiteLink>{' '}
              has the one-time setup.
            </Box>
            <Code language="shell" code={installCommand(item.name)} />
            <Flex gap={4} mt={3} fontSize={14} flexWrap="wrap" ai="center">
              <Link props={{ href: v0Url(item.name), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
                Open in v0
              </Link>
              <Link props={{ href: itemPath(item.name), target: '_blank', rel: 'noreferrer' }} theme={linkTheme}>
                The item JSON
              </Link>
              <Box color="slate-500">
                {item.files.length} file{item.files.length === 1 ? '' : 's'} · installs {item.dependencies.join(', ')}
              </Box>
            </Flex>
          </Box>

          <Box id="preview">
            <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
              Light and dark
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              The same component twice, each half in a theme of its own — nothing in it is written for either.{' '}
              <SiteLink to={blockDemoPath(block.slug)} display="inline" theme={linkTheme}>
                Open it full screen
              </SiteLink>{' '}
              to see it in yours.
            </Box>
            <Grid
              gridTemplateColumns={1}
              md={block.wide ? undefined : { gridTemplateColumns: 2 }}
              b={1}
              borderRadius={3}
              overflow="hidden"
              theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
            >
              <Half theme="light" wide={block.wide} Content={Content} />
              <Half theme="dark" wide={block.wide} Content={Content} />
            </Grid>
          </Box>

          <Box id="source">
            <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
              Source
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              The files the command writes, exactly as the preview above runs them. Every style is a prop, so there is no stylesheet to copy
              with them.
            </Box>
            <Flex d="column" gap={4}>
              {item.files.map((file) => (
                <Code
                  key={file.path}
                  language="jsx"
                  code={registrySources[file.path]}
                  codeOnly
                  label={file.target.replace('@components/', '')}
                />
              ))}
            </Flex>
          </Box>

          {usedIn.length > 0 && (
            <Box id="used-in">
              <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
                Used in
              </H2>
              <Ul fontSize={15} lineHeight={26} theme={prose}>
                {usedIn.map((template) => (
                  <Li key={template.slug}>
                    <SiteLink to={templatePath(template.slug)} display="inline" theme={linkTheme}>
                      {template.name}
                    </SiteLink>
                  </Li>
                ))}
              </Ul>
            </Box>
          )}
        </Flex>
      </Reveal>

      {/* A block may report through `toast()`, which needs a viewport on the page. */}
      <Toaster />
    </Box>
  );
}

/**
 * The block in one theme. `data-preview` marks it as a document of its own — its headings are the ones it
 * will have on the page it is installed in, so the heading audit leaves them out — and `data-snapshot` is
 * what `npm run snapshot:templates` shoots.
 */
function Half({ theme, wide, Content }: { theme: SnapshotTheme; wide?: boolean; Content: ComponentType<ContentProps> }) {
  const divider = theme === 'dark' ? (wide ? { bt: 1 } : { bt: 1, md: { bt: 0, bl: 1 } }) : {};

  return (
    <Box.Theme use="local" theme={theme}>
      <Box
        height="fit"
        p={5}
        pt={9}
        position="relative"
        props={{ 'data-md': 'skip', 'data-preview': '', 'data-snapshot': theme }}
        {...divider}
        theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
      >
        <Box
          position="absolute"
          top={3}
          insetStart={5}
          fontSize={10}
          fontWeight={600}
          letterSpacing={1}
          textTransform="uppercase"
          theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}
        >
          {theme}
        </Box>
        <Content theme={theme} />
      </Box>
    </Box.Theme>
  );
}
