import { get_private_did } from "@common/get_private_did.ts";
/// <reference types="@types/express" />
import express from "@dep/express";

// import { authorize_request } from "./authorize_request.ts";
import { DEFAULT_ACCOUNT, kv_store_path, SERVICE_NAME } from "./constants.ts";
import { join } from "jsr:@std/path";
import { add_user } from "./add_user.ts";
import { get_protected_resource } from "./get_protected_resource.ts";
import { make_resource_request } from "./make_resource_request.ts";
import open from "npm:open";

const app = express();
app.use(express.json());

const private_did = await get_private_did(SERVICE_NAME, DEFAULT_ACCOUNT);
export const kv = await Deno.openKv(kv_store_path);
const on_exit = () => {
  kv.close();
  Deno.exit();
};

Deno.addSignalListener("SIGINT", on_exit);
Deno.addSignalListener("SIGTERM", on_exit);
app.get("/", (req, res) => {
  console.log("Serving index.html");
  res.sendFile(join(import.meta.dirname ?? ".", "../static/index.html"));
});

app.post("/add_user", async (req, res) => {
  try {
    const result = await add_user(kv, req.body);
    if (result.status === 200) {
      return res.status(200).json({ message: "User added successfully" });
    }
    return res.status(400).json({
      error: "Invalid AddUserRequest",
      details: result.error,
    });
  } catch (errors) {
    return res.status(500).json({
      error: "Server Error AddUserRequest",
      /**
       * @todo Don't use unknown type for errors
       */
      issues: errors,
    });
  }
});

app.get("/example_expensive_resource", async (req, res) => {
  try {
    const result = await make_resource_request(private_did, req.url);
    res.status(200).json(result);
  } catch (errors) {
    return res.status(500).json({
      error: "Server Error AddUserRequest",
      /**
       * @todo Don't use unknown type for errors
       */
      issues: errors,
    });
  }
});

app.post("/get_protected_resource", async (req, res) => {
  try {
    const result = await get_protected_resource(private_did, kv, req.body);
    if (result.status === 200) {
      return res.status(200).send(result.data);
    }
    return res.status(400).json({
      error: "Invalid GetProtectedResourceRequest",
      details: result.error,
    });
  } catch (errors) {
    return res.status(500).json({
      error: "Server Error GetProtectedResourceRequest",
      /**
       * @todo Don't use unknown type for errors
       */
      issues: errors,
    });
  }
});

const PORT = 9533;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
