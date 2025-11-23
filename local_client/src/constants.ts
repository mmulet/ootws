import { DID } from "@dep/dids";
import * as KeyResolver from "@dep/key-did-resolver";

export const SERVICE_NAME = "ootws_local_client";
export const DEFAULT_ACCOUNT = "default_account";


export const did_without_private_key = new DID({
  resolver: KeyResolver.getResolver(),
});