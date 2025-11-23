import type { DagJWS } from "@dep/dids";
import { AddUserRequestSchema } from "@common/AddUserRequest.ts";
import { verify_jws } from "@common/verify_jws.ts";
import type { OootwsTreeNode, DID_STRING } from "@common/OotwsTree.ts";
import { is_valid_timestamp } from "@common/is_valid_timestamp.ts";
import { user_in_good_standing } from "./user_in_good_standing.ts";

export const user_path = (did: DID_STRING) => {
  return ["user", did];
};
/**
 * Adds a user to the OOTWS tree
 */
export const add_user = async (
  kv: Deno.Kv,
  adduser_request_jwd: DagJWS
): Promise<AddUserResult> => {
  const { signerDid, payload: resource_request } = await verify_jws(
    adduser_request_jwd,
    AddUserRequestSchema
  );
  const now = Date.now();

  if (!is_valid_timestamp(resource_request.unix_timestamp, now)) {
    return {
      status: 400,
      error: "Invalid Timestamp",
    };
  }

  /**
   * First check that the signerDid is in good standing
   */
  const maybe_node = await user_in_good_standing(kv, signerDid);
  if (maybe_node == null) {
    return {
      status: 400,
      error: "User not eligible to authorize requests.",
    };
  }
  const node = maybe_node.value;

  const new_user_did = resource_request.user_id as DID_STRING;

  /**
   * Then check if the user has already been added
   */
  const existing_user = await kv.get<OootwsTreeNode>(user_path(new_user_did));
  if (existing_user.value != null) {
    return {
      status: 400,
      error: "User already exists",
    };
  }

  const atomic_set = await kv
    .atomic()
    .set(user_path(new_user_did), {
      children: [],
      is_trusted: true,
      added_at_unix_timestamp: resource_request.unix_timestamp,
      parent: signerDid,
    } satisfies OootwsTreeNode)
    .check(maybe_node)
    .set(user_path(signerDid), {
      ...node,
      children: [...node.children, new_user_did],
    } satisfies OootwsTreeNode)
    .commit();
  if (!atomic_set.ok) {
    return {
      status: 400,
      error: "Failed to add user due to concurrent modification",
    };
  }
  return {
    status: 200,
  };
};

export type AddUserResult = AddUserSuccess | AddUserError;

export interface AddUserSuccess {
  status: 200;
}

export interface AddUserError {
  status: 400;
  error: string;
}
