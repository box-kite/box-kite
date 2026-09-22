/**
 * The site's syntax highlighting, in one module so every caller shares one Prism and one set of grammars.
 * `./prism` comes first on purpose — see the note there.
 */
import Prism from './prism';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-jsx';

/** The code as highlighted markup, or null for a language Prism does not know (`auto`, `shell`). */
export default function highlight(code: string, language: string): string | null {
  const grammar = Prism.languages[language];

  return grammar ? Prism.highlight(code, grammar, language) : null;
}
