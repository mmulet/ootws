import { DID_STRING, OootwsTreeNode } from "@common/OotwsTree.ts";
import { user_path } from "./add_user.ts";

export const user_in_good_standing = async (
  ootws_kv: Deno.Kv,
  did: DID_STRING
): Promise<Deno.KvEntry<OootwsTreeNode> | null> => {
  /**
   * First check that the signerDid is in good standing
   */
  const maybe_node = await ootws_kv.get<OootwsTreeNode>(user_path(did));
  if (maybe_node.value == null) {
    return null;
  }
  const node = maybe_node.value;
  if (!node.is_trusted) {
    return null;
  }
  return maybe_node;
};
