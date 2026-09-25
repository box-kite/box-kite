/**
 * Highlighted code, as React: one span per token, each carrying the class of its `code.token.<kind>` part
 * in `pages/extends.ts`. Rendered rather than injected as markup, so a prerendered page and the page that
 * hydrates it are the same tree, and a theme switch is one class on an ancestor.
 */
import { ReactNode, useMemo } from 'react';
import { useClassNames } from '../../src/box';
import { registryClassifier } from '../site/codeClassifier';
import { Classifier, CodeLanguage, TOKEN_KINDS, TokenKind, tokenize } from '../site/codeTokens';

/** One class per token kind: a hook per kind, in a fixed order, since the kinds are a constant. */
export function useCodeClasses(): Readonly<Record<TokenKind, string>> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const names = TOKEN_KINDS.map((kind) => useClassNames({ component: `code.token.${kind}` }).className ?? '');
  const key = names.join(' ');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Object.fromEntries(TOKEN_KINDS.map((kind, index) => [kind, names[index]])) as Record<TokenKind, string>, [key]);
}

interface Props {
  source: string;
  language?: CodeLanguage;
  /** What decides a name's colour. The live registry by default; the playground passes its vocabulary. */
  classifier?: Classifier;
}

export default function CodeHighlight({ source, language = 'jsx', classifier = registryClassifier() }: Props) {
  const classes = useCodeClasses();
  const tokens = useMemo(() => tokenize(source, language, classifier), [source, language, classifier]);

  const pieces: ReactNode[] = [];
  let at = 0;

  for (const token of tokens) {
    if (token.from > at) pieces.push(source.slice(at, token.from));
    pieces.push(
      <span key={token.from} className={classes[token.kind]}>
        {source.slice(token.from, token.to)}
      </span>,
    );
    at = token.to;
  }
  if (at < source.length) pieces.push(source.slice(at));

  return <>{pieces}</>;
}
