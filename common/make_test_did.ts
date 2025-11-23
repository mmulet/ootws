import { Ed25519Provider } from "@dep/key-did-provider-ed25519";
import { DID } from "@dep/dids";
import * as KeyResolver from "@dep/key-did-resolver";

export const make_test_did = async () => {
  const provider = new Ed25519Provider(
    crypto.getRandomValues(new Uint8Array(32))
  );
  const did = new DID({ provider, resolver: KeyResolver.getResolver() });
  await did.authenticate();
  return did;
};
