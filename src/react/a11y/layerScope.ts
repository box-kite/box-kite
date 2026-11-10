import { createContext, createElement, ReactNode, useContext, useMemo } from 'react';

/** The events a scope can keep inside its layers: the gesture starters, the wheel, and the keyboard. */
export type LayerEvent = 'pointer' | 'wheel' | 'key';

export interface LayerScopeProps {
  /** Added to the root of every layer inside, the opt-out vocabulary of a surface: `'nodrag nowheel nokey'` for React Flow. */
  className?: string;
  /** HTML attributes merged onto every layer root (`data-*` for a surface that reads one); the layer's own win. */
  props?: Record<string, unknown>;
  /**
   * Stops these events at each layer's root, after the layer's own handlers ran. It stops them in React's tree, so a
   * handler on any React ancestor and a listener on `document` or `window` never see them; a native listener on a DOM
   * element between the layer and React's root still does, which is what `className` is for.
   */
  isolate?: readonly LayerEvent[];
  children?: ReactNode;
}

type Handler = (event: React.SyntheticEvent) => void;

interface LayerScopeValue {
  className?: string;
  props?: Record<string, unknown>;
  isolate: readonly LayerEvent[];
}

export interface LayerScopeBinding {
  className: string | undefined;
  /** The layer's own root props with the scope's merged in: attributes under them, handlers after them. */
  merge<const T extends object>(own: T): T;
}

const LayerScopeContext = createContext<LayerScopeValue | null>(null);

// Only the starters: a stopped `pointerup` or `pointermove` would strand a drag that began outside the layer.
const POINTER_HANDLERS = ['onPointerDown', 'onMouseDown', 'onTouchStart', 'onClick', 'onDoubleClick', 'onContextMenu'];

const stop: Handler = (event) => event.stopPropagation();

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;

  return (
    target instanceof HTMLInputElement &&
    !['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'].includes(target.type)
  );
}

function handlersFor(isolate: readonly LayerEvent[], portal: boolean): Record<string, Handler> {
  const handlers: Record<string, Handler> = {};

  if (isolate.includes('pointer')) POINTER_HANDLERS.forEach((name) => (handlers[name] = stop));
  if (isolate.includes('wheel')) handlers.onWheel = stop;
  if (isolate.includes('key')) {
    handlers.onKeyDown = (event) => {
      const { key } = event as React.KeyboardEvent;
      // WebKit navigates back on a Backspace nothing consumed, and React Flow skips `preventDefault` on a button (bug #232).
      if (key === 'Backspace' && !event.defaultPrevented && !isEditable(event.target)) event.preventDefault();
      // A portalled layer is dismissed by `useDismiss`, which hears Escape on `document`.
      if (!(portal && key === 'Escape')) event.stopPropagation();
    };
    handlers.onKeyUp = stop;
  }

  return handlers;
}

/**
 * One opt-out for every layer declared inside a surface that owns the gestures — a React Flow canvas, a map, a board.
 * The top layer changes where a panel paints, not where it sits in the tree, so its presses, wheels and keys still
 * bubble to the node behind it; `Overlay`, `Popover`, `Menu`, `Dialog`, `Tooltip`, `Dropdown`, `Combobox`, the date
 * pickers and the DataGrid menus all read the nearest scope. `<LayerScope>` with nothing set clears an outer one.
 */
export function LayerScope({ className, props, isolate, children }: LayerScopeProps) {
  const key = isolate?.join(' ') ?? '';
  // Keyed on the list's contents: an inline array is a new one every render.
  const value = useMemo<LayerScopeValue>(
    () => ({ className, props, isolate: key ? (key.split(' ') as LayerEvent[]) : [] }),
    [className, props, key],
  );

  return createElement(LayerScopeContext.Provider, { value }, children);
}

/** What a layer puts on its root. `portal` is the fallback path, where Escape has to reach `useDismiss` on `document`. */
export function useLayerScope(portal = false): LayerScopeBinding {
  const scope = useContext(LayerScopeContext);

  return useMemo<LayerScopeBinding>(() => {
    if (!scope || (!scope.className && !scope.props && scope.isolate.length === 0)) return { className: undefined, merge: (own) => own };

    const handlers = handlersFor(scope.isolate, portal);

    return {
      className: scope.className,
      merge: (own) => {
        const merged: Record<string, unknown> = { ...scope.props, ...own };

        Object.entries(handlers).forEach(([name, handler]) => {
          const ownHandler = (own as Record<string, unknown>)[name] as Handler | undefined;
          merged[name] = ownHandler
            ? (event: React.SyntheticEvent) => {
                ownHandler(event);
                handler(event);
              }
            : handler;
        });

        return merged as typeof own;
      },
    };
  }, [scope, portal]);
}
