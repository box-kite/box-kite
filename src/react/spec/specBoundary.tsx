/**
 * One node's error boundary. A generated tree is written by something that has never run it, so a
 * component that throws on the props it was handed is an ordinary event rather than a bug in the app —
 * and the tree around it is still the answer the user asked for. A boundary per node is what keeps the
 * blast radius at one node.
 *
 * A class, because React has no hook for this. It is the only one in the library.
 */
import { Component, ReactNode } from 'react';
import { SpecIssue } from '../../utils/spec/specTypes';

export interface SpecBoundaryProps {
  /** Where the node sits in the spec, for the issue this reports. */
  path: string;
  component: string;
  /** A new spec resets the boundary: the next version of a node deserves its own chance to render. */
  resetKey: unknown;
  fallback: (issue: SpecIssue) => ReactNode;
  onError?: (issue: SpecIssue) => void;
  children: ReactNode;
}

interface SpecBoundaryState {
  message: string | null;
  resetKey: unknown;
}

export default class SpecBoundary extends Component<SpecBoundaryProps, SpecBoundaryState> {
  state: SpecBoundaryState = { message: null, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: SpecBoundaryProps, state: SpecBoundaryState): Partial<SpecBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { message: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: unknown): Partial<SpecBoundaryState> {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(this.issue(error instanceof Error ? error.message : String(error)));
  }

  private issue(message: string): SpecIssue {
    return { code: 'render-error', path: this.props.path, component: this.props.component, message };
  }

  render() {
    return this.state.message === null ? this.props.children : this.props.fallback(this.issue(this.state.message));
  }
}
