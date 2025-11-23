import type { DagJWS, DID } from "@dep/dids";
import type { AuthorizeRequest } from "@common/AuthorizeRequest.ts";
import { ResourceRequestSchema } from "@common/ResourceRequest.ts";
import { verify_jws } from "@common/verify_jws.ts";

import type { Limit } from "@common/Limits.ts";
import { never_default } from "@common/never_default.ts";
import { MAX_WINDOW_MS } from "@common/constants.ts";
import {
  is_valid_timestamp,
  MAX_TIMESTAMP_DIFF_MS,
} from "@common/is_valid_timestamp.ts";

export interface DidUsageRecord {
  events: { ts: number; bytes: number; request_id: string }[];
}

const usage_key = (did: string) => `usage:${did}`;
const load_usage = (did: string): DidUsageRecord => {
  const raw = localStorage.getItem(usage_key(did));
  if (!raw) {
    return { events: [] };
  }
  return JSON.parse(raw);
};

const save_usage = (did: string, record: DidUsageRecord) => {
  localStorage.setItem(usage_key(did), JSON.stringify(record));
};

const prune_old = (record: DidUsageRecord, now: number): DidUsageRecord => {
  record.events = record.events.filter((e) => e.ts >= now - MAX_WINDOW_MS);
  return record;
};

const found_duplicate = (
  events: DidUsageRecord["events"],
  now: number,
  windowMs: number,
  request_id: string
) => {
  const cutoff = now - windowMs;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.request_id === request_id) {
      return true;
    }
    if (ev.ts < cutoff) {
      break;
    }
  }
  return false;
};

const count_in_window = (
  events: DidUsageRecord["events"],
  now: number,
  windowMs: number,
  current_request_id: string
) => {
  let requests = 0;
  let bytes = 0;
  const cutoff = now - windowMs;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.request_id === current_request_id) {
      return null;
    }
    if (ev.ts < cutoff) {
      break;
    }

    requests++;
    bytes += ev.bytes;
  }
  return { requests, bytes };
};

export const authorize_request = async (
  client_did: DID,
  resource_request_jws: DagJWS,
  /**
   * for testing purposes only (will get you banned in production)
   */
  ignore_limits = false
): Promise<AuthorizeRequestResult> => {
  const { signerDid, payload: resource_request } = await verify_jws(
    resource_request_jws,
    ResourceRequestSchema
  );

  const limits: Limit[] = resource_request.limits;
  const now = Date.now();
  const usage = prune_old(load_usage(signerDid), now);
  // console.log("Usage for DID", signerDid, usage);

  if (!is_valid_timestamp(resource_request.request_unix_timestamp, now)) {
    return {
      status: 400,
      error: "Invalid Timestamp",
      issues: [{ provided: resource_request.request_unix_timestamp, now }],
    };
  }
  if (
    found_duplicate(
      usage.events,
      now,
      MAX_TIMESTAMP_DIFF_MS,
      resource_request.request_id
    )
  ) {
    return {
      status: 400,
      error: "Duplicate Request",
      issues: [{ request_id: resource_request.request_id }],
    };
  }
  if (!ignore_limits) {
    /**
     * @TODO sort the limits so that the most restrictive are checked first
     * to save processing time
     */
    for (const limit of limits) {
      const windowMs = limit.per_ms;
      const windowStats = count_in_window(
        usage.events,
        now,
        windowMs,
        resource_request.request_id
      );

      if (windowStats === null) {
        return {
          status: 400,
          error: "Duplicate Request",
          issues: [{ request_id: resource_request.request_id }],
        };
      }
      switch (limit.kind) {
        case "bandwitdth": {
          const projectedBytes =
            windowStats.bytes + resource_request.request_size_in_bytes;
          if (projectedBytes > limit.bytes) {
            return {
              status: 400,
              error: "Bandwidth Limit Exceeded",
              issues: [
                {
                  limit,
                  window_bytes: windowStats.bytes,
                  projected_bytes: projectedBytes,
                },
              ],
            };
          }
          break;
        }
        case "rate_limit":
          if (windowStats.requests >= limit.max_requests) {
            return {
              status: 400,
              error: "Rate Limit Exceeded",
              issues: [{ limit, window_requests: windowStats.requests }],
            };
          }
          break;
        default:
          never_default(limit);
      }
    }
  }

  usage.events.push({
    ts: now,
    bytes: resource_request.request_size_in_bytes,
    request_id: resource_request.request_id,
  });
  save_usage(signerDid, usage);

  const authorized_request: AuthorizeRequest = {
    resource_request_jws,
    unix_timestamp: now,
    authorize_id: crypto.randomUUID(),
  };

  const authorized_request_jws = await client_did.createJWS(authorized_request);

  return {
    status: 200,
    out_authorizeRequest_jws: authorized_request_jws,
  };
};

export type AuthorizeRequestResult =
  | AuthorizeRequestSuccess
  | AuthorizeRequestError;

export interface AuthorizeRequestSuccess {
  status: 200;
  /**
   * @see AuthorizeRequest
   */
  out_authorizeRequest_jws: unknown;
}

export interface AuthorizeRequestError {
  status: 400;
  error: string;
  issues: unknown;
}
