import { ReactNode } from 'react';
import { propCount } from '../../api/props.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, H3, Li, Link, Span, Ul } from '../../src/components/semantics';
import { ComponentApi, ComponentProp, keyboardModes, sectionId } from '../site/componentApi';
import Mono from './mono';
import SiteLink from './siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from './table';

/**
 * A component's reference: props, keyboard, accessibility and style tree, every one of them read from
 * `api/components/<name>.json` — which is generated from the component's own types, JSDoc and doc tags,
 * from the axe fixtures and from `boxComponents.ts`. Nothing here is written by hand, which is the point:
 * a table typed out beside a component is a table that stops being true.
 */
export default function ApiReference({ api }: { api: ComponentApi }) {
  return (
    <Flex d="column" gap={10}>
      <Section id={sectionId(api, 'props')} title={`${api.name} props`}>
        <PropsTable api={api} />
      </Section>

      {api.keyboard.length > 0 && (
        <Section id={sectionId(api, 'keyboard')} title={`${api.name} keyboard`}>
          <Flex d="column" gap={6}>
            {keyboardModes(api).map(({ mode, rows }) => (
              <Box key={mode ?? 'default'}>
                {mode && <Subheading>{mode}</Subheading>}
                <Table>
                  <TableHead>
                    <TableRow>
                      <HeadCell>Key</HeadCell>
                      <HeadCell>Result</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.keys}>
                        <Cell whiteSpace="nowrap">
                          <Mono>{row.keys}</Mono>
                        </Cell>
                        <Cell>
                          <Prose text={row.action} />
                        </Cell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Flex>
        </Section>
      )}

      <Section id={sectionId(api, 'a11y')} title={`${api.name} accessibility`}>
        <Accessibility api={api} />
      </Section>

      {api.styleTree.length > 0 && (
        <Section id={sectionId(api, 'styles')} title={`${api.name} style tree`}>
          <StyleTree api={api} />
        </Section>
      )}
    </Flex>
  );
}

function PropsTable({ api }: { api: ComponentApi }) {
  return (
    <Flex d="column" gap={6}>
      <Box>
        Everything below is this component&rsquo;s own. All {propCount} of Box&rsquo;s style props work on it too, and those are on{' '}
        <SiteLink to="/box" display="inline" textDecoration="underline">
          /box
        </SiteLink>{' '}
        rather than repeated here.
      </Box>

      {api.props.length > 0 ? (
        <PropRows props={api.props} />
      ) : (
        <Box>
          <Mono>{api.name}</Mono> adds no props of its own — it is a Box with one thing decided for it.
        </Box>
      )}

      {api.parts.map((part) => (
        <Box key={part.name}>
          <Subheading>{part.name}</Subheading>
          {part.description && (
            <Box mb={3}>
              <Prose text={part.description} />
            </Box>
          )}
          <PropRows props={part.props} />
        </Box>
      ))}
    </Flex>
  );
}

function PropRows({ props }: { props: ComponentProp[] }) {
  return (
    <Box overflowX="auto">
      <Table>
        <TableHead>
          <TableRow>
            <HeadCell>Prop</HeadCell>
            <HeadCell>Type</HeadCell>
            <HeadCell>Default</HeadCell>
            <HeadCell>What it does</HeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.map((prop) => (
            <TableRow key={prop.name}>
              <Cell whiteSpace="nowrap">
                <Mono>{prop.name}</Mono>
                {prop.required && (
                  <Span
                    display="inline"
                    ml={2}
                    fontSize={11}
                    fontWeight={600}
                    theme={{ dark: { color: 'amber-400' }, light: { color: 'amber-600' } }}
                  >
                    required
                  </Span>
                )}
              </Cell>
              <Cell>
                <Mono whiteSpace="normal">{prop.type}</Mono>
              </Cell>
              <Cell whiteSpace="nowrap">{prop.default ? <Mono>{prop.default}</Mono> : '—'}</Cell>
              <Cell>
                <Prose text={prop.description} />
              </Cell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function Accessibility({ api }: { api: ComponentApi }) {
  const { fixtures, knownViolations } = api.axe;

  return (
    <Flex d="column" gap={4}>
      {api.pattern && (
        <Box>
          Implements{' '}
          <Link props={{ href: api.pattern, target: '_blank', rel: 'noreferrer' }} display="inline" textDecoration="underline">
            the WAI-ARIA APG pattern
          </Link>
          .
        </Box>
      )}

      {api.a11y.length > 0 && (
        <Ul>
          {api.a11y.map((line) => (
            <Li key={line} display="list-item" listStyle="disc" ml={5} mb={2}>
              <Prose text={line} />
            </Li>
          ))}
        </Ul>
      )}

      <Box fontSize={14}>
        {fixtures.length > 0 ? (
          <>
            Swept with axe on every release, in {fixtures.length === 1 ? 'this state' : `${fixtures.length} states`}:{' '}
            {fixtures.map((fixture, index) => (
              <Span key={fixture} display="inline">
                {index > 0 && ', '}
                <Mono>{fixture}</Mono>
              </Span>
            ))}
            .{' '}
            {knownViolations.length > 0 ? (
              <>
                Known to still fail <Mono>{knownViolations.join(', ')}</Mono>, which is tracked rather than hidden.
              </>
            ) : (
              <>No violations, with contrast and landmark rules left to a human. </>
            )}
            Screen-reader results are not published yet.
          </>
        ) : (
          <>Not in the automated sweep yet, and screen-reader results are not published.</>
        )}
      </Box>
    </Flex>
  );
}

function StyleTree({ api }: { api: ComponentApi }) {
  return (
    <Flex d="column" gap={4}>
      <Box>
        Every part the component draws is a node with a name, so a default can be restyled with <Mono>Box.components()</Mono> instead of a
        selector — and a variant is a name too.
      </Box>
      <Flex d="column" gap={1}>
        {api.styleTree.map((node) => (
          <Box key={node.path} ml={node.depth * 4} fontSize={14}>
            <Mono>{node.path}</Mono>
            {node.extends && (
              <Span display="inline" ml={2} fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                extends <Mono>{node.extends}</Mono>
              </Span>
            )}
            {node.variants.length > 0 && (
              <Span display="inline" ml={2} fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                variants: {node.variants.join(', ')}
              </Span>
            )}
          </Box>
        ))}
      </Flex>
    </Flex>
  );
}

/**
 * The generated prose is JSDoc, so a prop name in it is written in backticks. Rendering it raw put
 * literal backticks on the page; the markdown mirror wants them, and a reader wants `<Mono>`.
 */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) =>
        index % 2 === 1 ? (
          <Mono key={index} whiteSpace="normal">
            {part}
          </Mono>
        ) : (
          part
        ),
      )}
    </>
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

function Subheading({ children }: { children: ReactNode }) {
  return (
    <H3 fontSize={15} fontWeight={600} mb={3} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
      {children}
    </H3>
  );
}
