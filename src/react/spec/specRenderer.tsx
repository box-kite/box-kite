/**
 * The component around `renderSpec`. Everything it adds is about time: a spec arrives in pieces, so the
 * boundaries reset with each one, and the issues of the last render reach the host from an effect
 * rather than from the middle of a render.
 */
import { useEffect, useRef } from 'react';
import { SpecIssue } from '../../utils/spec/specTypes';
import { useIsomorphicLayoutEffect } from '../effects';
import { SpecRenderOptions, renderSpec } from './renderSpec';

export interface SpecRendererProps extends Omit<SpecRenderOptions, 'onError' | 'resetKey'> {
  /** Whatever arrived. Every field of it is checked, so a partial object from a stream is welcome. */
  spec: unknown;
  /** Called after each render whose issues changed, and again when a node throws during a commit. */
  onIssues?: (issues: SpecIssue[]) => void;
}

/**
 * The latest value, read from an effect. Local rather than `/a11y`'s: importing that one would put the
 * whole behaviour chunk — roving focus, dismissal, controllable state — inside this entry.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);

  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

/** A generated spec, rendered against what the app allows. */
export default function SpecRenderer({ spec, onIssues, ...options }: SpecRendererProps) {
  // The spec itself is the reset key: a stream delivers a new object per chunk, so a node that threw on
  // half a prop is tried again on the next one, and a spec standing still keeps its fallback. `onError`
  // is the handler of this render, called from a commit, so it needs no ref to stay current.
  const { element, issues } = renderSpec(spec, { ...options, resetKey: spec, onError: (issue) => onIssues?.([issue]) });
  const reportRef = useLatest(onIssues);
  const issuesRef = useLatest(issues);
  const digest = issues.map((issue) => `${issue.code} ${issue.path} ${issue.message}`).join('\n');

  useEffect(() => {
    reportRef.current?.(issuesRef.current);
  }, [digest, issuesRef, reportRef]);

  return element;
}
