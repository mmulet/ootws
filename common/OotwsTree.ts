import { Brand } from "./Brand.ts";

export type DID_STRING = Brand<string, "DID_STRING">;

export interface OotwsTree extends Record<DID_STRING, OootwsTreeNode> {}

export interface OootwsTreeNode {
  children: DID_STRING[];
  parent: DID_STRING | null;
  added_at_unix_timestamp: number;
  is_trusted: boolean;
  ban_proof?: string;
}
