import * as z from "@dep/zod";

/**
 * Bandwidth limit in bytes/ms
 * Can have multiple of these limits applied together
 *
 * For example 100 bytes per second and 1 MB per hour
 */
export const BandwidthSchema = z.object({
  kind: z.literal("bandwitdth"),
  bytes: z.number().int().nonnegative(),
  per_ms: z.number().int().positive(),
});

/**
 * Rate limit in requests/ms
 * Can have multiple of these limits applied together
 * For example 30 requests per minute and 1000 requests per day
 */
export const RateLimitSchema = z.object({
  kind: z.literal("rate_limit"),
  max_requests: z.number().int().nonnegative(),
  per_ms: z.number().int().positive(),
});

export const LimitSchema = z.union([BandwidthSchema, RateLimitSchema]);

export type Bandwidth = z.infer<typeof BandwidthSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
export type Limit = z.infer<typeof LimitSchema>;
