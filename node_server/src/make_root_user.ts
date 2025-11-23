import { DID_STRING } from "@common/OotwsTree.ts";
import { user_path } from "./add_user.ts";
/**
 * Used for testing and initial setup to create the root user
 */
export const make_root_user = async (
  kv: Deno.Kv,
  root_did: DID_STRING,
  unix_timestamp: number
): Promise<void> => {
  await kv.set(user_path(root_did), {
    children: [],
    is_trusted: true,
    added_at_unix_timestamp: unix_timestamp,
  });
};
