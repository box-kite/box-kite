import React from 'react';
import { StyleElementDescriptor } from '../core';

/**
 * The engine's style-element descriptors as React elements. `<style href precedence>` is React 19's
 * hoistable style: lifted into `<head>`, one copy per `href`, grouped by precedence. Nothing here touches
 * the DOM or waits for an effect, which is what makes it work in a Server Component and in streaming SSR.
 */

// Hoisting arrived in React 19. Below that the elements render inline where the Box sits: the CSS
// still applies and the cascade still holds (rules are layered in this mode), but the tags stay in
// the markup and are not deduped, so element mode is the wrong choice there.
const canHoist = parseInt(React.version, 10) >= 19;
let warned = false;

// An RSC payload sends an object it has already sent as a reference and a fresh one in full, so a new
// element per Box put the whole base stylesheet in the payload once per Box (bug #256). Same objects, then.
const elementCache = new WeakMap<StyleElementDescriptor, React.ReactElement>();
const listCache = new WeakMap<readonly StyleElementDescriptor[], React.ReactElement[]>();

function styleElementOf(descriptor: StyleElementDescriptor): React.ReactElement {
  let element = elementCache.get(descriptor);

  if (!element) {
    const { href, css, precedence } = descriptor;
    // Raw HTML rather than a text child: React escapes text, and a `>` in a child selector would
    // reach the browser as `&gt;` and take its rule down with it.
    element = React.createElement('style', { key: href, href, precedence, dangerouslySetInnerHTML: { __html: css } });
    elementCache.set(descriptor, element);
  }

  return element;
}

export default function styleElementsOf(descriptors: readonly StyleElementDescriptor[] | undefined): React.ReactElement[] | undefined {
  if (!descriptors?.length) return undefined;

  if (!canHoist && !warned) {
    warned = true;
    console.warn(
      `[box-kite] Box.configure({ sink: 'element' }) needs React 19 to hoist and dedupe its <style> elements; React ${React.version} will render them inline. Use the default sink instead.`,
    );
  }

  let elements = listCache.get(descriptors);

  if (!elements) {
    elements = descriptors.map(styleElementOf);
    listCache.set(descriptors, elements);
  }

  return elements;
}
