/** Fixed simulation step. */
export const STEP_MS = 50;
/** Longest frame we simulate; longer gaps (tab hidden, phone locked) are dropped. */
export const MAX_FRAME_MS = 250;
/** 10 game minutes per 7 real seconds (spec §2.3). */
export const GAME_MINUTES_PER_REAL_MS = 10 / 7000;
