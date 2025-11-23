import * as z from "@dep/zod";

/**
 *  @see ResourceRequestSchema
 */
export const AuthorizeRequestSchema = z.object({
  resource_request_jws: z.unknown(),
  unix_timestamp: z.number().int(),
  authorize_id: z.string().uuid(),
});

export type AuthorizeRequest = z.infer<typeof AuthorizeRequestSchema>;
