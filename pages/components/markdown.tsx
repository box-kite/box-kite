import { marked, Token, Tokens } from 'marked';
import { Fragment, ReactNode, useMemo } from 'react';
import Box, { BoxProps } from '../../src/box';
import { H2, H3, H4, Img, Li, Link, Ol, P, Ul } from '../../src/components/semantics';
import { SITE_URL } from '../site/site';
import { slugify } from '../utils/markdownUtils';
import Code from './code';

/**
 * Markdown rendered with Box components — the release notes, which are written once and read on GitHub
 * and here. Only the constructs the notes use: headings, paragraphs, fenced code, lists, tables, links,
 * emphasis and inline code. Raw HTML in the source renders nothing.
 */
export default function Markdown({ source, ...rest }: { source: string } & BoxProps) {
  const tokens = useMemo(() => marked.lexer(source), [source]);

  return <Box {...rest}>{blocks(tokens)}</Box>;
}

const LANGUAGES: Record<string, 'jsx' | 'shell' | 'css' | 'javascript'> = {
  tsx: 'jsx',
  ts: 'jsx',
  jsx: 'jsx',
  js: 'javascript',
  bash: 'shell',
  sh: 'shell',
  shell: 'shell',
  css: 'css',
};

// The lexer leaves entities as written; React would print them literally.
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const decode = (text: string) => text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);

const prose = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const strong = { dark: { color: 'slate-200' }, light: { color: 'slate-800' } } as const;
const heading = { dark: { color: 'white' }, light: { color: 'slate-900' } } as const;
const rule = { dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-200' } } as const;

function blocks(tokens: readonly Token[]): ReactNode {
  return tokens.map((token, index) => <Fragment key={index}>{block(token)}</Fragment>);
}

function block(token: Token): ReactNode {
  switch (token.type) {
    case 'heading':
      return headingFor(token as Tokens.Heading);
    case 'paragraph':
      return (
        <P fontSize={15} lineHeight={26} mb={4} theme={prose}>
          {inline((token as Tokens.Paragraph).tokens)}
        </P>
      );
    // A tight list item's line: block-level in the tree, inline in content.
    case 'text':
      return (token as Tokens.Text).tokens ? inline((token as Tokens.Text).tokens) : decode((token as Tokens.Text).text);
    case 'code': {
      const { lang, text } = token as Tokens.Code;

      return <Code language={LANGUAGES[lang ?? ''] ?? 'auto'} code={text} mb={6} />;
    }
    case 'list': {
      const { ordered, items } = token as Tokens.List;
      const List = ordered ? Ol : Ul;

      return (
        <List ps={6} mb={4} fontSize={15} lineHeight={26} theme={prose}>
          {items.map((item, index) => (
            <Li key={index} mb={1.5}>
              {blocks(item.tokens)}
            </Li>
          ))}
        </List>
      );
    }
    case 'table':
      return <Table token={token as Tokens.Table} />;
    case 'blockquote':
      return (
        <Box tag="blockquote" bs={2} ps={4} my={4} theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-300' } }}>
          {blocks((token as Tokens.Blockquote).tokens)}
        </Box>
      );
    case 'hr':
      return <Box tag="hr" my={8} b={0} bt={1} theme={rule} />;
    default:
      return null;
  }
}

function headingFor({ depth, text, tokens }: Tokens.Heading): ReactNode {
  const id = slugify(text);

  if (depth <= 2) {
    return (
      <H2 id={id} fontSize={22} fontWeight={600} mt={12} mb={4} theme={heading}>
        {inline(tokens)}
      </H2>
    );
  }
  if (depth === 3) {
    return (
      <H3 id={id} fontSize={17} fontWeight={600} mt={8} mb={3} theme={heading}>
        {inline(tokens)}
      </H3>
    );
  }

  return (
    <H4 id={id} fontSize={15} fontWeight={600} mt={6} mb={2} theme={heading}>
      {inline(tokens)}
    </H4>
  );
}

function Table({ token }: { token: Tokens.Table }) {
  return (
    <Box overflow="auto" mb={6}>
      {/* `border-collapse` has no prop; the one-off is the hatch's job. */}
      <Box tag="table" display="table" borderCollapse="collapse" width="fit" fontSize={14} lineHeight={22} theme={prose}>
        <Box tag="thead" display="table-header-group">
          <Box tag="tr" display="table-row">
            {token.header.map((cell, index) => (
              <Box
                key={index}
                tag="th"
                display="table-cell"
                textAlign="start"
                px={3}
                py={2}
                bb={1}
                fontWeight={600}
                theme={{ ...rule, ...strong }}
              >
                {inline(cell.tokens)}
              </Box>
            ))}
          </Box>
        </Box>
        <Box tag="tbody" display="table-row-group">
          {token.rows.map((row, rowIndex) => (
            <Box key={rowIndex} tag="tr" display="table-row">
              {row.map((cell, index) => (
                <Box key={index} tag="td" display="table-cell" px={3} py={2} bb={1} theme={rule}>
                  {inline(cell.tokens)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function inline(tokens: readonly Token[] | undefined): ReactNode {
  return tokens?.map((token, index) => <Fragment key={index}>{inlineToken(token)}</Fragment>);
}

function inlineToken(token: Token): ReactNode {
  switch (token.type) {
    case 'text':
      return (token as Tokens.Text).tokens ? inline((token as Tokens.Text).tokens) : decode((token as Tokens.Text).text);
    case 'escape':
      return (token as Tokens.Escape).text;
    case 'strong':
      return (
        <Box tag="strong" display="inline" fontWeight={600} theme={strong}>
          {inline((token as Tokens.Strong).tokens)}
        </Box>
      );
    case 'em':
      return (
        <Box tag="em" display="inline">
          {inline((token as Tokens.Em).tokens)}
        </Box>
      );
    case 'del':
      return (
        <Box tag="del" display="inline">
          {inline((token as Tokens.Del).tokens)}
        </Box>
      );
    case 'codespan':
      return (
        <Box
          tag="code"
          display="inline"
          fontSize={13}
          px={1.5}
          py={0.5}
          borderRadius={1}
          theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' }, light: { bgColor: 'slate-100', color: 'slate-800' } }}
        >
          {decode((token as Tokens.Codespan).text)}
        </Box>
      );
    case 'link': {
      const { href, tokens } = token as Tokens.Link;
      // The site's own pages and in-page anchors open here; anything else is somebody else's tab.
      const own = href.startsWith('#') || href.startsWith(SITE_URL);

      return (
        <Link
          props={own ? { href } : { href, target: '_blank', rel: 'noopener noreferrer' }}
          display="inline"
          textDecoration="underline"
          theme={{
            dark: { color: 'sky-400', hover: { color: 'sky-300' } },
            light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
          }}
        >
          {inline(tokens)}
        </Link>
      );
    }
    case 'image': {
      const { href, text } = token as Tokens.Image;

      return <Img props={{ src: href, alt: text }} maxWidth="fit" borderRadius={2} my={4} />;
    }
    case 'br':
      return <br />;
    default:
      return null;
  }
}
