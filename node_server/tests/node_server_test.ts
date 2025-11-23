import type { AddUserRequest } from "@common/AddUserRequest.ts";
import { add_user } from "@node/add_user.ts";
import { get_private_did } from "@common/get_private_did.ts";
import { assertEquals } from "jsr:@std/assert";
import { DEFAULT_ACCOUNT, SERVICE_NAME } from "@node/constants.ts";
import { make_test_did } from "@common/make_test_did.ts";
import { make_root_user } from "@node/make_root_user.ts";
import { DID_STRING } from "@common/OotwsTree.ts";
import { distrust_user } from "@node/distrust_user.ts";
import { make_resource_request } from "@node/make_resource_request.ts";
import {
  authorize_request,
  AuthorizeRequestError,
} from "@client/authorize_request.ts";
import { get_protected_resource } from "@node/get_protected_resource.ts";
import { DagJWS } from "@dep/dids";
import { user_in_good_standing } from "@node/user_in_good_standing.ts";

const private_did = await get_private_did(SERVICE_NAME, DEFAULT_ACCOUNT);

let kv: Deno.Kv;
const root_did = await make_test_did();

Deno.test.beforeEach(async () => {
  kv = await Deno.openKv(":memory:");
  await make_root_user(kv, root_did.id as DID_STRING, Date.now());
});

Deno.test.afterEach(() => {
  kv.close();
  localStorage.clear();
});

Deno.test("Test adding user.", async () => {
  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: (await make_test_did()).id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 200);
});

Deno.test("Test adding duplicate user.", async () => {
  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: root_did.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 400);
});

Deno.test("Test adding user, but root doesn't exist", async () => {
  const new_did = await make_test_did();

  const result = await add_user(
    kv,
    await new_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: (await make_test_did()).id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 400);
});

Deno.test("Test adding child of child", async () => {
  const new_user_1 = await make_test_did();
  const new_user_2 = await make_test_did();

  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: new_user_1.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 200);

  const result2 = await add_user(
    kv,
    await new_user_1.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: new_user_2.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result2.status, 200);
});

Deno.test("Test adding user when signing user is not trusted", async () => {
  const new_user_1 = await make_test_did();
  await distrust_user(kv, root_did.id as DID_STRING);

  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: new_user_1.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 400);
});

Deno.test("Test adding child of child", async () => {
  const new_user_1 = await make_test_did();
  const new_user_2 = await make_test_did();

  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: new_user_1.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 200);

  await distrust_user(kv, root_did.id as DID_STRING);
  /**
   * Should fail because we no longer trust new_user_1
   * because we distrusted root_did above.
   */
  const result2 = await add_user(
    kv,
    await new_user_1.createJWS({
      unix_timestamp: Date.now(),
      request_id: crypto.randomUUID(),
      user_id: new_user_2.id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result2.status, 400);
});

Deno.test("Test adding user with invalid timestamp", async () => {
  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      request_id: crypto.randomUUID(),
      user_id: (await make_test_did()).id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 400);
});

Deno.test("Test adding user with replayed request ID", async () => {
  const request_id = crypto.randomUUID();
  const add_user_jws = await root_did.createJWS({
    unix_timestamp: Date.now(),
    request_id,
    user_id: (await make_test_did()).id as DID_STRING,
  } satisfies AddUserRequest);

  const result1 = await add_user(kv, add_user_jws);
  assertEquals(result1.status, 200);

  const result2 = await add_user(kv, add_user_jws);
  assertEquals(result2.status, 400);
});

Deno.test("Test adding user with future timestamp", async () => {
  const result = await add_user(
    kv,
    await root_did.createJWS({
      unix_timestamp: Date.now() + 1000 * 60 * 10, // 10 minutes in the future
      request_id: crypto.randomUUID(),
      user_id: (await make_test_did()).id as DID_STRING,
    } satisfies AddUserRequest)
  );
  assertEquals(result.status, 400);
});

Deno.test("Test getting protected resouce", async () => {
  const resource_request_jws = await make_resource_request(
    private_did,
    "https://example.com/data"
  );

  const authorize_request_result = await authorize_request(
    root_did,
    resource_request_jws
  );
  assertEquals(authorize_request_result.status, 200);
  if (authorize_request_result.status !== 200) {
    return;
  }
  const protected_resource = await get_protected_resource(
    private_did,
    kv,
    authorize_request_result.out_authorizeRequest_jws as DagJWS
  );
  assertEquals(protected_resource.status, 200, protected_resource.error);
});

Deno.test(
  "Test getting protected resouce, when client is not trusted",
  async () => {
    await distrust_user(kv, root_did.id as DID_STRING);
    const resource_request_jws = await make_resource_request(
      private_did,
      "https://example.com/data"
    );

    const authorize_request_result = await authorize_request(
      root_did,
      resource_request_jws
    );
    assertEquals(authorize_request_result.status, 200);
    if (authorize_request_result.status !== 200) {
      return;
    }
    const protected_resource = await get_protected_resource(
      private_did,
      kv,
      authorize_request_result.out_authorizeRequest_jws as DagJWS
    );
    assertEquals(protected_resource.status, 400, protected_resource.error);
  }
);

Deno.test(
  "Test getting protected resouce, when client is not added",
  async () => {
    const unknown_newuser = await make_test_did();
    const resource_request_jws = await make_resource_request(
      private_did,
      "https://example.com/data"
    );

    const authorize_request_result = await authorize_request(
      unknown_newuser,
      resource_request_jws
    );
    assertEquals(authorize_request_result.status, 200);
    if (authorize_request_result.status !== 200) {
      return;
    }
    const protected_resource = await get_protected_resource(
      private_did,
      kv,
      authorize_request_result.out_authorizeRequest_jws as DagJWS
    );
    assertEquals(protected_resource.status, 400, protected_resource.error);
  }
);

Deno.test("Test getting going over limit", async () => {
  for (let i = 0; i < 3; i++) {
    const resource_request_jws = await make_resource_request(
      private_did,
      "https://example.com/data"
    );

    const authorize_request_result = await authorize_request(
      root_did,
      resource_request_jws,
      /**
       * ignore limits. If we don't do this the authorize request
       * will be good, and it won't make the request above the limit.
       */
      true
    );
    assertEquals(
      authorize_request_result.status,
      200,
      (authorize_request_result as AuthorizeRequestError).error +
        "\n" +
        JSON.stringify(
          (authorize_request_result as AuthorizeRequestError).issues,
          null,
          2
        )
    );
    if (authorize_request_result.status !== 200) {
      return;
    }
    const protected_resource = await get_protected_resource(
      private_did,
      kv,
      authorize_request_result.out_authorizeRequest_jws as DagJWS
    );
    if (i < 2) {
      assertEquals(protected_resource.status, 200, protected_resource.error);
    } else {
      assertEquals(
        protected_resource.status,
        400,
        "on the third request, we should be over the limit and it should fail." +
          protected_resource.error
      );
    }
  }
  const root_user = await user_in_good_standing(kv, root_did.id as DID_STRING);
  assertEquals(
    root_user,
    null,
    "User should be banned after exceeding rate limit."
  );
});
