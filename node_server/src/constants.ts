import { DID } from "@dep/dids";
import * as KeyResolver from "@dep/key-did-resolver";
import { join } from "jsr:@std/path";

export const SERVICE_NAME = "ootws_node_server";
export const DEFAULT_ACCOUNT = "default_account";

export const kv_store_path = join(
  import.meta.dirname ?? ".",
  "/../data/kv_store.sqlite"
);

export const did_without_private_key = new DID({
  resolver: KeyResolver.getResolver(),
});
