import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import { catalog } from '../../src/catalog';
import { createStyleEngine } from '../../src/core';
import { categoryOf, props } from '../pages/box';
import { ApiComponent, buildVocabulary, classifierOf, createMeasure, Vocabulary } from './playgroundCompletion';
import { TokenKind, tokenize, toHtml } from './playgroundTokens';

const components = Object.values(import.meta.glob<ApiComponent>('../../api/components/*.json', { eager: true, import: 'default' }));

/**
 * What the editor loads after it has painted: the completion vocabulary, the measuring engine and the
 * Lezer highlighter. One chunk, on demand — the catalog, the prop reference and the parser are ~60 KB
 * gzipped, and the route chunk would otherwise hold the page's first paint back for them.
 */
export interface PlaygroundCompletions {
  vocabulary: Vocabulary;
  /** The declarations a prop writes for a value, measured on an engine of its own. */
  measure: (name: string, value: unknown) => string;
  /** The snippet as VS Code-coloured markup, each token carrying the class `classes` gives its kind. */
  highlight: (source: string, classes: Readonly<Record<TokenKind, string>>) => string;
}

export default function createCompletions(): PlaygroundCompletions {
  const vocabulary = buildVocabulary({
    catalog: catalog(),
    props,
    scope: Object.keys(SNIPPET_SCOPE),
    components,
    category: (prop) => categoryOf(prop).label,
  });
  const classifier = classifierOf(vocabulary);

  return {
    vocabulary,
    // A throwaway engine per measurement, so nothing it writes reaches the page or the CSS pane.
    measure: createMeasure(() => createStyleEngine({ classNames: 'readable', sink: 'string' })),
    highlight: (source, classes) => toHtml(source, tokenize(source, classifier), classes),
  };
}
