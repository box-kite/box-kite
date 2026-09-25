import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import { catalog } from '../../src/catalog';
import { createStyleEngine } from '../../src/core';
import { categoryOf, props } from '../pages/box';
import type { Classifier } from './codeTokens';
import { ApiComponent, buildVocabulary, classifierOf, createMeasure, Vocabulary } from './playgroundCompletion';

const components = Object.values(import.meta.glob<ApiComponent>('../../api/components/*.json', { eager: true, import: 'default' }));

/**
 * What the editor loads after it has painted: the completion vocabulary and the measuring engine. One
 * chunk, on demand — the catalog and the prop reference are ~40 KB gzipped, and the route chunk would
 * otherwise hold the page's first paint back for them.
 */
export interface PlaygroundCompletions {
  vocabulary: Vocabulary;
  /** The declarations a prop writes for a value, measured on an engine of its own. */
  measure: (name: string, value: unknown) => string;
  /** Colours a name the way the completion reads it — the one that knows a component's own props, and flags the rest. */
  classifier: Classifier;
}

export default function createCompletions(): PlaygroundCompletions {
  const vocabulary = buildVocabulary({
    catalog: catalog(),
    props,
    scope: Object.keys(SNIPPET_SCOPE),
    components,
    category: (prop) => categoryOf(prop).label,
  });
  return {
    vocabulary,
    // A throwaway engine per measurement, so nothing it writes reaches the page or the CSS pane.
    measure: createMeasure(() => createStyleEngine({ classNames: 'readable', sink: 'string' })),
    classifier: classifierOf(vocabulary),
  };
}
