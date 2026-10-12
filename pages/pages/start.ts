/**
 * The three prompts /start hands a reader to paste into a coding agent. Written for the agent, not the reader,
 * and kept out of the page so `start.test.ts` can hold every command and component they name to the real thing.
 */

/** The MCP server as a command line, the one `mcp/README.md` documents. */
export const MCP_SERVER = 'npx -y @box-kite/mcp';

/** What stands in the prompts until the reader says what they are building. */
export const PRODUCT_PLACEHOLDER = '[describe your product in one sentence]';

/**
 * The reader's sentence, tidied to sit mid-prompt: one line, no trailing full stop, the placeholder when empty.
 * Only a leading article is lower-cased — a product name is capitalised on purpose.
 */
export function productText(product: string): string {
  const text = product
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!]+$/, '')
    .replace(/^(A|An|The) /, (article) => article.toLowerCase());

  return text || PRODUCT_PLACEHOLDER;
}

export const setupPrompt = `Set up a new web app in this folder with React, TypeScript, Vite and the Box Kite UI library (@box-kite/react). Run every command yourself, one step at a time; if a command asks a question, take the default.

1. Scaffold. If this folder has no package.json, run \`npm create vite@latest . -- --template react-ts --no-interactive\`, then \`npm install\`. If it already holds a React project, keep it and go to step 2.
2. Install the library: \`npm install @box-kite/react\`.
3. Give yourself its instructions. Copy \`node_modules/@box-kite/react/AGENTS.md\` to \`./AGENTS.md\`, and create \`CLAUDE.md\` containing the single line \`@AGENTS.md\`. Read AGENTS.md now, before writing any code: this library is newer than your training data, and its numbers do not mean what they mean in libraries with similar prop names.
4. Connect its MCP server, which runs the real styling engine and tells you whether a prop value works. The server is \`${MCP_SERVER}\` over stdio; add it at project level the way your tool does it — Claude Code: \`claude mcp add --scope project box-kite -- ${MCP_SERVER}\`; Cursor: \`.cursor/mcp.json\`; VS Code: \`.vscode/mcp.json\`. If I have to restart you before you can use it, tell me.
5. Remove the template's styling: delete \`src/index.css\` and \`src/App.css\` and the lines importing them. Box Kite writes all the CSS itself, so the app needs no stylesheet.
6. Replace \`src/App.tsx\` with a small welcome page built only from Box Kite components (\`<Flex>\`, \`<H1>\`, \`<P>\`, \`<Button>\`), wrapped in \`<Box.Theme use="global">\` so it follows the system's light or dark mode.
7. Check your work: \`npm run build\` must pass with no errors. Then start \`npm run dev\` and give me the address to open.

Finish with a short summary of what you did, in plain words.`;

const rules = `Read AGENTS.md before you write anything, and use Box Kite for every part of the page: no CSS files, no \`style\` attribute and no other UI or CSS library. When you are unsure what a prop or a component takes, ask the box-kite MCP server (\`get_component\`, \`get_props\`, \`check_styles\`) instead of guessing.`;

const finish = `When it is done, run \`npm run build\` and fix every error, then open the page and fix every \`[box-kite]\` warning in the browser console.`;

export function landingPrompt(product: string): string {
  return `Build a landing page for ${productText(product)}.

${rules}

The page, top to bottom:
- A header with the product's name and links that scroll to the sections below.
- A hero: a headline saying what it is, one sentence on who it is for, a main call-to-action button and a secondary one.
- Three or four features, each with an icon (from lucide-react, inside Box Kite's \`<Icon>\`), a title and a sentence.
- How it works, in three steps.
- Three short testimonials.
- Pricing: three plans, with the middle one highlighted.
- Frequently asked questions, as an \`<Accordion>\`.
- A closing call to action, then a footer.

Write real, specific copy for this product — no lorem ipsum. Make it look finished: one consistent palette from Box Kite's colour tokens, generous spacing, light and dark themes that both read well, and a layout that works on a phone, a tablet and a desktop. Use the semantic components (\`<Header>\`, \`<Nav>\`, \`<Main>\`, \`<Section>\`, \`<Footer>\`, a single \`<H1>\`) so the page is accessible.

${finish} Then tell me what you built.`;
}

export function productPrompt(product: string): string {
  return `Add a product page for ${productText(product)}, at its own address in the app (add react-router if there is no router yet), and link to it from the home page.

${rules}

The page:
- A gallery: one large image with clickable thumbnails under it. Use placeholder photos from https://picsum.photos until I give you real ones.
- The name, a one-line pitch, the price and a star rating.
- The options as a \`<RadioGroup>\` (a size, a colour or a plan — whatever fits this product) and a quantity.
- A main \`<Button>\` ("Add to cart", or whatever fits) that confirms with a toast: \`<Toaster>\` once in the app, \`toast.success()\` on the press.
- \`<Tabs>\` for the description, the specifications and the reviews.
- Shipping and returns, as an \`<Accordion>\`.
- Related products, as a row of cards.

Write realistic content for this product, and keep the look of the rest of the app: both themes, every screen size.

${finish} Then tell me the address of the new page.`;
}

/** One click fills the product box, for a reader who wants to see the prompts change before deciding. */
export const PRODUCT_EXAMPLES = [
  'A coffee subscription for small offices',
  'A booking app for a yoga studio',
  'A portfolio for a wedding photographer',
] as const;

/** Where the product box is kept between visits — step 1 takes a while, and the reader comes back for step 2. */
export const PRODUCT_STORAGE_KEY = 'box-kite:start-product';

/** What each prompt leaves behind, as the chips under its step. */
export const STEP_OUTCOMES = {
  setup: ['React + TypeScript + Vite', 'Box Kite installed', 'AGENTS.md', 'MCP server connected', 'A running app'],
  landing: ['Hero', 'Features', 'How it works', 'Testimonials', 'Pricing', 'FAQ', 'Light and dark'],
  product: ['Gallery', 'Options and quantity', 'Add to cart with a toast', 'Tabs', 'Shipping and returns', 'Related products'],
} as const;

export const START_FAQ = [
  {
    question: 'Do I need to know how to code?',
    answer:
      'No. Each prompt tells the agent which commands to run, which files to write and how to check the result. You read what it did, open the address it gives you, and ask for changes in plain words.',
  },
  {
    question: 'Which AI agent should I use?',
    answer:
      'Any agent that can run commands in a folder: Claude Code, Cursor, Codex, VS Code with Copilot in agent mode, or Windsurf. A chat in a browser tab cannot do it, because it has no terminal.',
  },
  {
    question: 'What does it cost?',
    answer: 'Box Kite and its MCP server are free and MIT licensed. The agent is billed by whoever provides it.',
  },
  {
    question: 'Can I use the prompts in an existing project?',
    answer:
      'Yes. The setup prompt keeps a React app that is already there and adds Box Kite to it; the landing and product page prompts work on any app the first one has set up.',
  },
  {
    question: 'What if something looks wrong?',
    answer:
      'Say so and ask the agent to check. A style value Box Kite does not accept writes nothing at all, and the MCP server it connected in step 1 is how it finds out which one it was.',
  },
] as const;
