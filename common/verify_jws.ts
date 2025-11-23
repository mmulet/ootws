import type { DagJWS } from "@dep/dids";
import { did_without_private_key } from "../local_client/src/constants.ts";
import { z, type SafeParseReturnType, type ZodTypeAny } from "@dep/zod";
import { DID_STRING } from "./OotwsTree.ts";

export interface Verified_Payload<S extends ZodTypeAny> {
  payload: Exclude<
    SafeParseReturnType<z.input<S>, z.output<S>>["data"],
    undefined
  >;
  signerDid: DID_STRING;
  kid: string;
}

export const verify_jws = async <S extends ZodTypeAny>(
  jws: DagJWS,
  schema: S
): Promise<Verified_Payload<S>> => {
  const { payload, kid } = await did_without_private_key.verifyJWS(jws);
  const signerDid = kid.slice(0, kid.indexOf("#"));
  const parsedPayload = await schema.safeParseAsync(payload);
  if (!parsedPayload.success) {
    throw new Error(
      `JWS payload failed schema validation: ${JSON.stringify(
        parsedPayload.error.issues
      )}`
    );
  }
  return {
    payload: parsedPayload.data,
    signerDid: signerDid as DID_STRING,
    kid,
  };
};
