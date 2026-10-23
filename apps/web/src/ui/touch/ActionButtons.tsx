import type { ReactNode } from 'react';
import type { TouchSource } from '../../input/touch';

const MIN = 56;

interface Props {
  source: TouchSource;
  actionIcon?: ReactNode;
}

function TouchButton(props: {
  label: string;
  className: string;
  size: number;
  onDown: () => void;
  onUp?: () => void;
  children: ReactNode;
}) {
  const style = { minWidth: `${props.size}px`, minHeight: `${props.size}px` };
  return (
    <button
      type="button"
      aria-label={props.label}
      className={`touch-btn ${props.className}`}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault();
        props.onDown();
      }}
      onPointerUp={props.onUp}
      onPointerCancel={props.onUp}
      onPointerLeave={props.onUp}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {props.children}
    </button>
  );
}

export function ActionButtons({ source, actionIcon }: Props) {
  return (
    <div className="touch-actions">
      <TouchButton
        label="Use tool"
        className="touch-primary"
        size={88}
        onDown={() => {
          source.press('primary');
        }}
        onUp={() => {
          source.release('primary');
        }}
      >
        {actionIcon ?? '✦'}
      </TouchButton>
      <TouchButton
        label="Interact"
        className="touch-secondary"
        size={MIN + 8}
        onDown={() => {
          source.press('secondary');
        }}
      >
        ✋
      </TouchButton>
      <TouchButton
        label="Next tool"
        className="touch-tool"
        size={MIN}
        onDown={() => {
          source.pulse({ cycle: 1 });
        }}
      >
        ⇄
      </TouchButton>
      <TouchButton
        label="Rotate camera left"
        className="touch-rot-l"
        size={MIN}
        onDown={() => {
          source.pulse({ rotate: -1 });
        }}
      >
        ⟲
      </TouchButton>
      <TouchButton
        label="Rotate camera right"
        className="touch-rot-r"
        size={MIN}
        onDown={() => {
          source.pulse({ rotate: 1 });
        }}
      >
        ⟳
      </TouchButton>
      <TouchButton
        label="Menu"
        className="touch-menu"
        size={MIN}
        onDown={() => {
          source.pulse({ menu: true });
        }}
      >
        ☰
      </TouchButton>
    </div>
  );
}
