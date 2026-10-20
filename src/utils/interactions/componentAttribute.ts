// On `globalThis`, so every copy of the package writes `data-bk` or none does; apart from the channel, so a server render
// carries these flags and not the queue.
const flags = ((globalThis as Record<symbol, unknown>)[Symbol.for('box-kite.componentAttribute')] ??= { on: false, warnings: true }) as {
  on: boolean;
  warnings: boolean;
};

/** Whether a Box with a `component` writes `data-bk="<key>"` — what lets the channel name a click. */
export const marksComponents = (): boolean => flags.on;

/** Whether the channel may say, in development, that it cannot name a click: `Box.configure({ warnings })`. */
export const warnsWithoutAttribute = (): boolean => flags.warnings;

export function setComponentAttribute(enabled: boolean): void {
  flags.on = enabled;
}

export function setAttributeWarnings(enabled: boolean): void {
  flags.warnings = enabled;
}
