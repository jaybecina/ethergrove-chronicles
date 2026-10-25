/** The lesson marker's projected screen position, written by LessonMarker each frame (CSS px). */
export const markerScreen = { visible: false, onScreen: false, x: 0, y: 0, behind: false };

/**
 * Where on the viewport edge (inset by `inset`) to draw an arrow toward `p`, and the arrow's
 * angle in radians. Points behind the camera project mirrored, so they are flipped first.
 */
export function edgePoint(
  p: { x: number; y: number },
  view: { w: number; h: number },
  inset: number,
  behind = false,
): { x: number; y: number; angle: number } {
  const cx = view.w / 2;
  const cy = view.h / 2;
  const dx = behind ? cx - p.x : p.x - cx;
  const dy = behind ? cy - p.y : p.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy, angle: 0 };
  const hx = cx - inset;
  const hy = cy - inset;
  const scale = Math.min(
    dx === 0 ? Infinity : hx / Math.abs(dx),
    dy === 0 ? Infinity : hy / Math.abs(dy),
  );
  return { x: cx + dx * scale, y: cy + dy * scale, angle: Math.atan2(dy, dx) };
}
