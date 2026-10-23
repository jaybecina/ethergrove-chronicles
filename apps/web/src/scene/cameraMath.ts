export const CAMERA_PITCH_DEG = 50;
export const ZOOM_DISTANCES = [9, 12, 16] as const;
const PITCH = (CAMERA_PITCH_DEG * Math.PI) / 180;

/** Camera position relative to its target for a yaw angle (radians) and distance. */
export function offsetAt(yawRad: number, distance: number): [number, number, number] {
  const h = distance * Math.cos(PITCH);
  return [h * Math.sin(yawRad), distance * Math.sin(PITCH), h * Math.cos(yawRad)];
}

export function cameraOffset(
  yawSteps: 0 | 1 | 2 | 3,
  zoomStep: 0 | 1 | 2,
): [number, number, number] {
  return offsetAt((yawSteps * Math.PI) / 2, ZOOM_DISTANCES[zoomStep]);
}

export function tileToWorld(x: number, y: number): [number, number, number] {
  return [x + 0.5, 0, y + 0.5];
}
