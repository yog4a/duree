/** Gap above this starts a new session and counts as zero. */
export const SESSION_GAP_SECONDS = 15 * 60;

/** Non-write heartbeats for the same file are dropped inside this window. */
export const MIN_GAP_SECONDS = 2 * 60;
