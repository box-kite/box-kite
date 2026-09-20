import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { createServer, instructions } from './server';

/**
 * Driven through the real protocol rather than by calling the tool functions, because the schema a
 * client reads is generated from the zod shapes and nothing else in the suite would compile it.
 */

let client: Client;

const call = async (name: string, args: Record<string, unknown>) => {
  const result = (await client.callTool({ name, arguments: args })) as { content: { type: string; text: string }[] };

  return result.content.map((part) => part.text).join('\n');
};

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test', version: '0' });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
});

describe('the server', () => {
  it('offers six tools, each with an input schema a client can read', async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'check_styles',
      'get_blocks',
      'get_component',
      'get_props',
      'get_rules',
      'search_docs',
    ]);
    expect(tools.every((tool) => tool.description && tool.inputSchema.type === 'object')).toBe(true);
  });

  it('states the facts a model gets wrong before it calls anything', async () => {
    expect(client.getInstructions()).toBe(instructions);
    expect(instructions).toContain('dividers are per prop');
    expect(instructions).toContain('check_styles');
  });

  it('searches', async () => {
    expect(await call('search_docs', { query: 'fade in when it mounts' })).toContain('startingStyle');
    expect(await call('search_docs', { query: 'zzzznothing' })).toContain('Nothing matched');
  });

  it('shows a divider rather than describing one', async () => {
    const answer = await call('get_props', { names: ['fontSize', 'p'] });

    expect(answer).toContain('`fontSize={14}` → `font-size: 0.875rem`');
    expect(answer).toContain('| `p={4}` | `padding:1rem` |');
    expect(answer).toContain('| `fontSize={4}` | `font-size:0.25rem` |');
  });

  it('answers for a component with its keyboard and its ARIA', async () => {
    const answer = await call('get_component', { name: 'tabs' });

    expect(answer).toContain("import Tabs from '@box-kite/react/components/tabs'");
    expect(answer).toContain('## Keyboard');
    expect(answer).toContain('aria-selected');
  });

  it('judges a prop bag with the engine', async () => {
    const answer = await call('check_styles', { props: { p: 4, bgColor: 'blue-550', href: '/about' } });

    expect(answer).toContain('.p-4{padding:1rem}');
    expect(answer).toContain('no rule and no class name');
    expect(answer).toContain('props={{ "href": … }}');
  });

  it('lists the rules and reads one in full', async () => {
    expect(await call('get_rules', {})).toMatch(/^The \d+ rules/m);
    expect(await call('get_rules', { numbers: [11] })).toContain('## Rule 11');
    expect(await call('get_rules', { numbers: [999] })).toContain('There is no rule 999');
  });

  it('gives a block its install command', async () => {
    expect(await call('get_blocks', {})).toContain('npx shadcn@latest add');
    expect(await call('get_blocks', { name: 'data-grid' })).toContain('Files:');
  });
});
