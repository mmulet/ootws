import { get_private_did } from "@common/get_private_did.ts";
/// <reference types="@types/express" />
import express from "@dep/express";
import { authorize_request } from "./authorize_request.ts";
import { DEFAULT_ACCOUNT, SERVICE_NAME } from "./constants.ts";

const app = express();
app.use(express.json());

const private_did = await get_private_did(SERVICE_NAME, DEFAULT_ACCOUNT);

app.use((req, res, next) => {
  // If using credentials, replace '*' with 'http://localhost:9533'
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Preflight OK
  }
  next();
});

app.post("/authorize_request", async (req, res) => {
  try {
    const result = await authorize_request(private_did, req.body);
    if (result.status === 200) {
      return res.status(200).json(result.out_authorizeRequest_jws);
    }
    return res.status(400).json({
      error: "Invalid AuthorizeRequest",
      issues: result.issues,
    });
  } catch (errors) {
    console.error("Error authorizing request:", errors);
    return res.status(400).json({
      error: "Invalid AuthorizeRequest",
      /**
       * @todo Don't use unknown type for errors
       */
      issues: errors,
    });
  }
});

const PORT = 3953;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(
    `This server authorizes resource requests using DID: ${private_did.id}`
  );
});
