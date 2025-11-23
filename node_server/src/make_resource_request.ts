import { DID } from "@dep/dids";
import { ResourceRequest } from "@common/ResourceRequest.ts";

export const make_resource_request = async (private_did: DID, url: string) => {
  // console.log("Making resource request for URL:", url);
  /**
   * @TODO based on the url size determine the byte size of the request
   */
  // console.log("Estimating request size...");
  // console.log("Estimated request size: 1024 bytes");

  const cost_in_bytes = 1024;
  /**
   * @TODO based on the url determine what the limit should be.
   * Or make the limit configurable per site, etc
   */
  const request: ResourceRequest = {
    resource_url: url,
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "bandwitdth",
        bytes: 2048,
        per_ms: 1000,
      },
    ],
    request_size_in_bytes: cost_in_bytes,
    request_id: crypto.randomUUID(),
  };
  // console.log("Resource request constructed:", request);
  return await private_did.createJWS(request);
};
