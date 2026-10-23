/** Camera shake impulse, decayed by the camera rig. */
let amount = 0;

export function addShake(strength: number): void {
  amount = Math.min(0.25, amount + strength);
}

export function takeShake(delta: number): number {
  amount = Math.max(0, amount - delta * 1.2);
  return amount;
}
