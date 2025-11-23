
import keytar from "@dep/keytar";
import { Buffer } from "node:buffer";
/**
 * Get or make a private key stored in the system's secure credential storage using keytar which on "macOS the passwords are managed by the Keychain, on Linux they are managed by the Secret Service API/libsecret, and on Windows they are managed by Credential Vault.""
 */
export const get_or_make_private_key = async (
  service: string,
  account: string
): Promise<Uint8Array> => {
  const existing_in_hex = await keytar.getPassword(service, account);
  if (existing_in_hex != null) {
    return Uint8Array.from(Buffer.from(existing_in_hex, "hex"));
  }

  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  await keytar.setPassword(service, account, Buffer.from(seed).toString("hex"));
  return seed;
};
