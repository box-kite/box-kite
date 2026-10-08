import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import Box from '../../src/box';
import * as semantics from '../../src/components/semantics';
import { toast } from '../../src/components/toaster';
import { agentTools, shipped } from './home';
import { landingPrompt, MCP_SERVER, PRODUCT_PLACEHOLDER, productPrompt, productText, setupPrompt } from './start';

const root = process.cwd();
const prompts = [setupPrompt, landingPrompt('a coffee subscription'), productPrompt('a coffee subscription')];

/** A reader pastes these into an agent that trusts them, so a name in one that no longer exists sends it hunting. */
describe('the /start prompts', () => {
  it('start the MCP server the way its README does', () => {
    const readme = readFileSync(resolve(root, 'mcp/README.md'), 'utf8');

    expect(readme).toContain(MCP_SERVER);
    expect(setupPrompt).toContain(`claude mcp add --scope project box-kite -- ${MCP_SERVER}`);
  });

  it('copy an AGENTS.md the package ships', () => {
    expect(shipped.map((file) => file.path)).toContain('AGENTS.md');
    expect(setupPrompt).toContain('node_modules/@box-kite/react/AGENTS.md');
  });

  it('name only components the library exports', () => {
    const generated = readdirSync(resolve(root, 'api/components')).map(
      (file) => JSON.parse(readFileSync(resolve(root, 'api/components', file), 'utf8')).name as string,
    );
    const known = new Set([...generated, ...Object.keys(semantics)]);
    const named = new Set(prompts.flatMap((prompt) => [...prompt.matchAll(/`<([A-Z][\w.]*)[\s>]/g)].map((match) => match[1])));
    const unknown = [...named].filter((name) => (name === 'Box.Theme' ? typeof Box.Theme !== 'function' : !known.has(name)));

    expect(named.size).toBeGreaterThan(10);
    expect(unknown).toEqual([]);
    expect(typeof toast.success).toBe('function');
  });

  it('name only tools the MCP server has', () => {
    const tools = new Set(agentTools.map((tool) => tool.name));
    const named = prompts.flatMap((prompt) => [...prompt.matchAll(/`((?:get|check|search)_\w+)`/g)].map((match) => match[1]));

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !tools.has(name))).toEqual([]);
  });
});

describe('productText', () => {
  it('stands in a placeholder until the reader says what they are building', () => {
    expect(productText('   ')).toBe(PRODUCT_PLACEHOLDER);
    expect(landingPrompt('')).toContain(`landing page for ${PRODUCT_PLACEHOLDER}.`);
  });

  it('puts the sentence on one line, without a full stop of its own', () => {
    expect(productText('  a coffee\nsubscription for offices.  ')).toBe('a coffee subscription for offices');
  });

  it('lower-cases a leading article and leaves a name alone', () => {
    expect(productText('A coffee subscription')).toBe('a coffee subscription');
    expect(productText('Bean There, a coffee subscription')).toBe('Bean There, a coffee subscription');
    expect(productText('Another app')).toBe('Another app');
  });
});
