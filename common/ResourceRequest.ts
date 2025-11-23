import * as z from "@dep/zod";

import { LimitSchema } from "./Limits.ts";

export const ResourceRequestSchema = z.object({
  resource_url: z.string(),
  request_unix_timestamp: z.number().int().nonnegative(),
  limits: z.array(LimitSchema),
  request_size_in_bytes: z.number().int().nonnegative(),
  request_id: z.string().uuid(),
});

export type ResourceRequest = z.infer<typeof ResourceRequestSchema>;
