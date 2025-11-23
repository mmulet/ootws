import { MS_MINUTE } from "./constants.ts";

export const MAX_TIMESTAMP_DIFF_MS = 5 * MS_MINUTE;

/**
 * Check that the unix timestamp in the resource request is within
 * an acceptable range (e.g., +/- 5 minutes) of the current time to prevent
 * replay attacks
 */
export const is_valid_timestamp = (timestamp: number, now: number): boolean => {
  const ts_diff = Math.abs(now - timestamp);
  return ts_diff <= MAX_TIMESTAMP_DIFF_MS;
};
