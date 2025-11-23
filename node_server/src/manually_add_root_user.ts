import { kv_store_path } from "./constants.ts";
import { make_root_user } from "./make_root_user.ts";
import { DID_STRING } from "@common/OotwsTree.ts";

if (import.meta.main) {
  const kv = await Deno.openKv(kv_store_path);
  if (Deno.args.length < 1) {
    console.error(
      "Usage: deno run --allow-read --allow-write src/manually_add_root_user.ts <ROOT_DID_STRING>"
    );
    Deno.exit(1);
  }
  await make_root_user(
    kv,
    Deno.args[Deno.args.length - 1] as DID_STRING,
    Date.now()
  );
  console.log("Root user added.");
  kv.close();
}
