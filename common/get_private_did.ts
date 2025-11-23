import { DID } from "@dep/dids";
import { Ed25519Provider } from "@dep/key-did-provider-ed25519";
import * as KeyResolver from "@dep/key-did-resolver";
import { get_or_make_private_key } from "@common/get_or_make_private_key.ts";

export const get_private_did = async (
  service_name: string,
  account: string
) => {
  const private_key = await get_or_make_private_key(service_name, account);
  const provider = new Ed25519Provider(private_key);
  const did = new DID({ provider, resolver: KeyResolver.getResolver() });

  await did.authenticate();
  return did;
};
