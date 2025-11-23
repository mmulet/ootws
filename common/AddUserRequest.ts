import * as z from "@dep/zod";

export const AddUserRequestSchema = z.object({
  request_id: z.string().uuid(),
  user_id: z.string().min(1),
  unix_timestamp: z.number().int().nonnegative(),
});

export type AddUserRequest = z.infer<typeof AddUserRequestSchema>;
