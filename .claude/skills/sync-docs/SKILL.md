---
name: sync-docs
description: Update the Box Kite usage documentation an agent reads — BOX_KITE_AI_CONTEXT.md, the rules file and the skill's references — and regenerate everything written from them
argument-hint: <description of what to add or change>
---

Update the documentation that teaches an AI assistant to use Box Kite. Since AI3 most of it is **generated**: there are three
hand-written sources and a command that rewrites everything downstream of them, so the job is to pick the right source.

## Which file to change

| Source (hand-written)                     | Holds                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `.claude/rules/box-kite-rules.md`         | the numbered rules — the shortest complete answer, and the one an agent reads first |
| `.claude/skills/box-kite/references/*.md` | `styling.md`, `components.md`, `extending.md`, `patterns.md` — the skill's depth    |
| `src/BOX_KITE_AI_CONTEXT.md`              | the long-form reference: prop tables, the DataGrid API, debugging tips              |
| `AGENTS.md` (its lead block)              | the four facts that fight the model's priors                                        |

**Generated — never edit these:** `.claude/skills/box-kite/SKILL.md`, `.cursor/rules/box-kite.mdc`,
`.claude-plugin/marketplace.json` (all from `scripts/skill-docs.mjs`), the tarball's `AGENTS.md` and `docs/`
(`scripts/agent-docs.mjs`), every prop's `@example` and `api/props.json` (`npm run docs:props`). `npm run check:agents` and
`npm run check:props` fail in CI when one has been edited by hand.

## Steps

1. **Read the sources the change touches.** If it involves a new or changed prop or component, read the source under `src/`
   too — a doc that disagrees with the code is worse than no doc, because an agent trusts it over its priors.
2. **Put each fact in one place.** A rule belongs in the rules file, which the skill, the Cursor rule and the tarball's
   `AGENTS.md` all quote. Depth belongs in a reference or in `BOX_KITE_AI_CONTEXT.md`. Never state the same thing twice.
3. **Rules file:** keep the numbered form and the voice — one bold claim per rule, then the trap that makes it worth a rule.
   Adding a rule means renumbering nothing: append it.
4. **References:** dense inline prop lists, one code example per feature and only where the prop list alone is not obvious.
   Each file opens with an H1 and one line saying when to read it — `SKILL.md`'s table of contents is built from that H1.
5. **`BOX_KITE_AI_CONTEXT.md`:** the detailed voice — markdown tables, 2–4 examples per feature, TypeScript signatures,
   `---` between major sections. Follow the Dropdown section's shape for a new component; keep "Key Reminders for AI
   Assistants" and "Debugging Tips" current.
6. **Regenerate:** `npm run docs:agents`, then `npm run check:props` (and `npm run docs:props` if a prop changed).
7. **Verify:** `npm test scripts/skill-docs.test.mjs` and `npx prettier --write` on what you touched.

## Important

- Never remove existing documentation unless asked to.
- A new component belongs in the shortcuts table in `references/components.md` and in `BOX_KITE_AI_CONTEXT.md`.
- A changed divider or formatter is a rules-file change and a `npm run docs:props` run — the numbers are the trap this whole
  set of files exists for.
- If the request is ambiguous, ask before writing.
