import { isDevelopment } from '../environment/environmentUtils';
import { marksComponents, warnsWithoutAttribute } from './componentAttribute';
import type { Listening } from './interactionChannel';

// The events a change can be caused by, followed in capture so a handler that stops propagation is still seen.
const CAUSES = ['click', 'dblclick', 'keydown', 'pointerdown', 'pointerup', 'change', 'submit', 'copy', 'paste', 'focusout'];

/**
 * The half of the channel that watches the page, fetched with the first subscription: which event is being
 * dispatched, so a change made inside a handler names it unasked, and a press on anything a component styled.
 */
export default function listen({ channel, enqueue, element, controlOf, flush }: Listening): void {
  if (typeof addEventListener !== 'function') return;

  const press = (event: Event) => {
    const node = element(event.target);
    if (!node) return;

    if (!marksComponents()) {
      if (isDevelopment() && warnsWithoutAttribute() && !channel.warned) {
        channel.warned = true;
        console.warn('[box-kite] Box.onInteraction hears no clicks without data-bk: write Box.configure({ componentAttribute: true }).');
      }

      return;
    }

    const control = controlOf(node);
    const part = (control ?? node).closest('[data-bk]');
    if (!part) return;

    const checkable = node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio');
    enqueue('dom', {
      component: part.getAttribute('data-bk') ?? '',
      type: event.type,
      value: event.type === 'change' && checkable ? node.checked : undefined,
      details: { interactive: control !== undefined },
      event,
      target: control ?? part,
      source: event.isTrusted ? 'user' : 'app',
    });
  };

  const follow = (event: Event) => {
    channel.dispatching = event;
    // Released as it reaches `window`; one a handler stopped short of it is released when the task ends.
    if (!channel.releasing) {
      channel.releasing = true;
      setTimeout(() => {
        channel.releasing = false;
        channel.dispatching = undefined;
      }, 0);
    }
    if (event.type === 'click' || event.type === 'change') press(event);
  };

  CAUSES.forEach((type) => {
    document.addEventListener(type, follow, true);
    addEventListener(type, (event) => {
      if (channel.dispatching === event) channel.dispatching = undefined;
    });
  });
  // A press that navigates away unloads the page before a background task runs; the queue goes out first.
  addEventListener('pagehide', flush);
}
