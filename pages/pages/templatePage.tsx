import { ExternalLink, LayoutTemplate } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import { H2, Li, Ul } from '../../src/components/semantics';
import type { FamilyPageProps } from '../app/routePages';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import Snapshot from '../components/snapshot';
import useTableOfContents from '../hooks/useTableOfContents';
import { blockPath, blocks, templateDemoPath, templateFor } from '../site/templates';
import NotFoundPage from './notFoundPage';

const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

const prose = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const heading = { dark: { color: 'white' }, light: { color: 'slate-900' } } as const;

/** One template: `/templates/<slug>/`, the search target. Its files arrive as text from the route's loader. */
export default function TemplatePage({ sources = {} }: FamilyPageProps) {
  const template = templateFor(useLocation().pathname);
  const sections = template ? blocks.filter((block) => template.blocks.includes(block.slug)) : [];

  useTableOfContents([
    { id: 'preview', label: 'Light and dark' },
    ...(sections.length ? [{ id: 'sections', label: 'Sections' }] : []),
    { id: 'source', label: 'Source' },
  ]);

  if (!template) return <NotFoundPage />;

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
                  theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
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
                dark: { bgColor: 'white', color: 'slate-900', hover: { bgColor: 'slate-200' } },
                light: { bgColor: 'slate-900', color: 'white', hover: { bgColor: 'slate-700' } },
              }}
            >
              Live demo
              <Icon size={4}>
                <ExternalLink />
              </Icon>
            </SiteLink>
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
              The whole template, file by file: the design is one set of component styles and variables, and every style is a prop, so there
              is no stylesheet to copy with it.
            </Box>
            <Flex d="column" gap={4}>
              {Object.entries(sources).map(([path, code]) => (
                <Code key={path} language="jsx" code={code} codeOnly label={path.split('/').pop()} />
              ))}
            </Flex>
          </Box>
        </Flex>
      </Reveal>
    </Box>
  );
}
