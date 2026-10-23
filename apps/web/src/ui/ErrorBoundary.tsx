import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  onReset?: () => void;
}

/** Keeps one broken part (the 3D view, a menu) from taking down the whole game. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Hearthvale UI error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ failed: false });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
