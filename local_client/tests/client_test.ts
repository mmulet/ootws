import type { ResourceRequest } from "@common/ResourceRequest.ts";
import { authorize_request } from "@client/authorize_request.ts";
import { get_private_did } from "@common/get_private_did.ts";
import { assertEquals } from "jsr:@std/assert";
import { DEFAULT_ACCOUNT, SERVICE_NAME } from "@client/constants.ts";
import { make_test_did } from "@common/make_test_did.ts";

const private_did = await get_private_did(SERVICE_NAME, DEFAULT_ACCOUNT);

Deno.test("No Limit pass test", async () => {
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const authorize_test_result = await authorize_request(
    private_did,
    await private_did.createJWS(req)
  );
  assertEquals(authorize_test_result.status, 200);
});

Deno.test("Duplicate Request ID test", async () => {
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const _ = await authorize_request(
    private_did,
    await private_did.createJWS(req)
  );
  assertEquals(_.status, 200);
  const authorize_test_result_2 = await authorize_request(
    private_did,
    await private_did.createJWS(req)
  );
  assertEquals(authorize_test_result_2.status, 400);
});

Deno.test("Rate limit test", async () => {
  const did = await make_test_did();
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "rate_limit",
        max_requests: 1,
        per_ms: 1000,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const _ = await authorize_request(private_did, await did.createJWS(req));
  assertEquals(_.status, 200);

  const req2: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "rate_limit",
        max_requests: 1,
        per_ms: 1000,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };

  const authorize_test_result_2 = await authorize_request(
    private_did,
    await did.createJWS(req2)
  );
  assertEquals(authorize_test_result_2.status, 400);
});

Deno.test("Rate limit expires test", async () => {
  const did = await make_test_did();
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "rate_limit",
        max_requests: 1,
        per_ms: 50,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const _ = await authorize_request(private_did, await did.createJWS(req));
  assertEquals(_.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 60));

  const req2: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "rate_limit",
        max_requests: 1,
        per_ms: 50,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };

  const authorize_test_result_2 = await authorize_request(
    private_did,
    await did.createJWS(req2)
  );
  assertEquals(authorize_test_result_2.status, 200);
});

Deno.test("Bandwidth limit test", async () => {
  const did = await make_test_did();
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "bandwitdth",
        bytes: 1500,
        per_ms: 1000,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const _ = await authorize_request(private_did, await did.createJWS(req));
  assertEquals(_.status, 200);

  const req2: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "bandwitdth",
        bytes: 1500,
        per_ms: 1000,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };

  const authorize_test_result_2 = await authorize_request(
    private_did,
    await did.createJWS(req2)
  );
  assertEquals(authorize_test_result_2.status, 400);
});

Deno.test("Bandwidth limit expires test", async () => {
  const did = await make_test_did();
  const req: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "bandwitdth",
        bytes: 1500,
        per_ms: 50,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };
  const _ = await authorize_request(private_did, await did.createJWS(req));
  assertEquals(_.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 60));

  const req2: ResourceRequest = {
    resource_url: "https://example.com/resource",
    request_unix_timestamp: Date.now(),
    limits: [
      {
        kind: "bandwitdth",
        bytes: 1500,
        per_ms: 50,
      },
    ],
    request_size_in_bytes: 1024,
    request_id: crypto.randomUUID(),
  };

  const authorize_test_result_2 = await authorize_request(
    private_did,
    await did.createJWS(req2)
  );
  assertEquals(authorize_test_result_2.status, 200);
});
