import { useRef, type ReactNode } from 'react';
import { useMenuNavigation } from '../focus';

interface Props {
  title: string;
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
  wide?: boolean;
}

/** Parchment dialog with a carved wooden frame. */
export function Panel({ title, onClose, closeLabel = 'Close', children, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useMenuNavigation(ref);
  return (
    <div className="overlay-backdrop">
      <div
        ref={ref}
        className={`panel${wide ? ' panel-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="panel-head">
          <h2>{title}</h2>
          {onClose && (
            <button type="button" className="icon-btn" aria-label={closeLabel} onClick={onClose}>
              ✕
            </button>
          )}
        </header>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}
