import { ExternalLink, LayoutTemplate } from 'lucide-react';
import { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import { H2, H3, Li, Link, Ul } from '../../src/components/semantics';
import type { FamilyPageProps } from '../app/routePages';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import Snapshot from '../components/snapshot';
import useTableOfContents from '../hooks/useTableOfContents';
import { installCommand, RegistryItem } from '../site/registry';
import { designsOf } from '../site/routeSources';
import { REPO_URL } from '../site/site';
import { blockPath, blocks, registryItemFor, templateDemoPath, templateFor } from '../site/templates';
import NotFoundPage from './notFoundPage';

const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'accent-600', hover: { color: 'accent-500' } },
} as const;

const prose = { dark: { color: 'base-400' }, light: { color: 'base-600' } } as const;
const heading = { dark: { color: 'white' }, light: { color: 'base-900' } } as const;

/** One template: `/templates/<slug>/`, the search target. Its files arrive as text from the route's loader. */
export default function TemplatePage({ sources = {} }: FamilyPageProps) {
  const template = templateFor(useLocation().pathname);
  const sections = template ? blocks.filter((block) => template.blocks.includes(block.slug)) : [];

  useTableOfContents([
    { id: 'preview', label: 'Light and dark' },
    { id: 'install', label: 'Install' },
    ...(sections.length ? [{ id: 'sections', label: 'Sections' }] : []),
    { id: 'source', label: 'Source' },
    { id: 'design', label: 'Design' },
  ]);

  if (!template) return <NotFoundPage />;

  const item = registryItemFor(template);
  const designs = designsOf(template);

  return (
    <Box>
      <PageHeader icon={LayoutTemplate} title={template.name} description={template.description} />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box id="preview">
            <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
              Light and dark
            </H2>
            <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={4}>
              {(['light', 'dark'] as const).map((theme) => (
                <Box
                  key={theme}
                  b={1}
                  borderRadius={3}
                  overflow="hidden"
                  theme={{ dark: { borderColor: 'base-700' }, light: { borderColor: 'base-200' } }}
                >
                  <Snapshot slug={template.slug} name={template.name} theme={theme} />
                </Box>
              ))}
            </Grid>
            <SiteLink
              to={templateDemoPath(template.slug)}
              display="inline-flex"
              ai="center"
              gap={2}
              mt={4}
              px={4}
              py={2}
              borderRadius={2}
              fontSize={14}
              fontWeight={600}
              textDecoration="none"
              theme={{
                dark: { bgColor: 'white', color: 'base-900', hover: { bgColor: 'base-200' } },
                light: { bgColor: 'base-900', color: 'white', hover: { bgColor: 'base-700' } },
              }}
            >
              Live demo
              <Icon size={4}>
                <ExternalLink />
              </Icon>
            </SiteLink>
          </Box>

          <Box id="install">
            <H2 fontSize={20} fontWeight={600} mb={3} theme={heading}>
              Install
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              One command writes the page, its design and its {sections.length} section{sections.length === 1 ? '' : 's'} into your project,
              as code you then own. It needs a <Mono>components.json</Mono>, and{' '}
              <SiteLink to="/registry" display="inline" theme={linkTheme}>
                the shadcn registry page
              </SiteLink>{' '}
              has the one-time setup.
            </Box>
            <Code language="shell" code={installCommand(item.name)} />
          </Box>

          {sections.length > 0 && (
            <Box id="sections">
              <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
                Sections
              </H2>
              <Box fontSize={15} lineHeight={26} mb={3} theme={prose}>
                Each section is a block of its own, with its own page and its own install command.
              </Box>
              <Ul fontSize={15} lineHeight={26} theme={prose}>
                {sections.map((block) => (
                  <Li key={block.slug}>
                    <SiteLink to={blockPath(block.slug)} display="inline" theme={linkTheme}>
                      {block.name}
                    </SiteLink>
                  </Li>
                ))}
              </Ul>
            </Box>
          )}

          <Box id="source">
            <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
              Source
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              The page itself. Every style is a prop, so there is no stylesheet to copy with it, and each section it imports is on its own
              page above.
            </Box>
            <Files item={item} sources={sources} />
          </Box>

          <Box id="design">
            <H2 fontSize={20} fontWeight={600} mb={4} theme={heading}>
              Design
            </H2>
            <Box fontSize={15} lineHeight={26} mb={4} theme={prose}>
              What every page of this template shares: the built-in components restyled with <Mono>Box.createComponents()</Mono>, applied to
              the subtree with <Mono>&lt;Box.Components&gt;</Mono>, so it stops at the edge of the store and the rest of your app keeps its
              own look.
            </Box>
            {designs.map((design) => (
              <Box key={design.name} mt={4}>
                <H3 fontSize={16} fontWeight={600} mb={3} theme={heading}>
                  {design.title}
                </H3>
                <Code
                  language="jsx"
                  code={sources[design.files[0].path]}
                  codeOnly
                  label={design.files[0].target.replace('@components/', '')}
                />
                <Box fontSize={15} lineHeight={26} mt={4} theme={prose}>
                  The command installs the rest of it beside that file —{' '}
                  {design.files.slice(1).map((file, index) => (
                    <Fragment key={file.path}>
                      {index ? ', ' : ''}
                      <Mono>{file.path.split('/').pop()}</Mono>
                    </Fragment>
                  ))}{' '}
                  — and{' '}
                  <Link
                    props={{ href: `${REPO_URL}/tree/main/${design.files[0].path.split('/').slice(0, -1).join('/')}` }}
                    display="inline"
                    theme={linkTheme}
                  >
                    the repository
                  </Link>{' '}
                  has every file.
                </Box>
              </Box>
            ))}
          </Box>
        </Flex>
      </Reveal>
    </Box>
  );
}

function Files({ item, sources }: { item: RegistryItem; sources: Readonly<Record<string, string>> }) {
  return (
    <Flex d="column" gap={4}>
      {item.files.map((file) => (
        <Code key={file.path} language="jsx" code={sources[file.path]} codeOnly label={file.target.replace('@components/', '')} />
      ))}
    </Flex>
  );
}
