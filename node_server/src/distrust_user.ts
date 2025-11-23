import { DID_STRING, OootwsTreeNode } from "@common/OotwsTree.ts";
import { user_path } from "./add_user.ts";

/**
 * Distrust a user in the OOTWS tree, and recursively distrust all their children.
 * If user is not found, no action is taken.
 */
export const distrust_user = async (
  kv: Deno.Kv,
  user_id: DID_STRING,
  proof?: string
) => {
  const user = await kv.get<OootwsTreeNode>(user_path(user_id));
  if (user.value == null) {
    return;
  }
  user.value.is_trusted = false;
  if (proof) {
    user.value.ban_proof = proof;
  }
  await kv.set(user_path(user_id), user.value);

  await Promise.all(
    user.value.children.map((child_id) =>
      distrust_user(kv, child_id as DID_STRING)
    )
  );
};
