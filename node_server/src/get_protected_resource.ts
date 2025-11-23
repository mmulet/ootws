import { DagJWS, DID } from "@dep/dids";
import { verify_jws } from "@common/verify_jws.ts";
import { AuthorizeRequestSchema } from "@common/AuthorizeRequest.ts";
import { ResourceRequestSchema } from "@common/ResourceRequest.ts";
import { is_valid_timestamp } from "@common/is_valid_timestamp.ts";
import { distrust_user } from "./distrust_user.ts";
import { user_in_good_standing } from "./user_in_good_standing.ts";

export interface UsageOverTime {
  last_second: number;
  last_minute: number;
  last_hour: number;
  last_day: number;
  last_week: number;
  last_month: number;
  last_year: number;
  all_time: number;
}

export interface UserUsageInfo {
  last_update_unix_timestamp: number;
  total_bytes: UsageOverTime;
  total_requests: UsageOverTime;
  /**
   * jws of @see AuthorizeRequest
   */
  signed_request_history: string[];
  request_id_history: string[];
}

/**
 * null on replay attack
 */
const update_info = (
  info: UserUsageInfo,
  now: number,
  bytes: number,
  request_jws: string,
  request_id: string
): UserUsageInfo | null => {
  const seconds_diff = Math.floor(
    (now - info.last_update_unix_timestamp) / 1000
  );
  const minutes_diff = Math.floor(seconds_diff / 60);
  const hours_diff = Math.floor(minutes_diff / 60);
  const days_diff = Math.floor(hours_diff / 24);
  const weeks_diff = Math.floor(days_diff / 7);
  const months_diff = Math.floor(days_diff / 30);
  const years_diff = Math.floor(days_diff / 365);

  for (const id in info.request_id_history) {
    if (info.request_id_history[id] === request_id) {
      return null;
    }
  }

  const new_info: UserUsageInfo = {
    last_update_unix_timestamp: now,
    total_bytes: { ...info.total_bytes },
    total_requests: { ...info.total_requests },
    signed_request_history: [...info.signed_request_history, request_jws],
    request_id_history: [...info.request_id_history, request_id],
  };

  if (seconds_diff >= 1) {
    new_info.total_bytes.last_second = 0;
    new_info.total_requests.last_second = 0;
  }
  if (minutes_diff >= 1) {
    new_info.total_bytes.last_minute = 0;
    new_info.total_requests.last_minute = 0;
  }
  if (hours_diff >= 1) {
    new_info.total_bytes.last_hour = 0;
    new_info.total_requests.last_hour = 0;
  }
  if (days_diff >= 1) {
    new_info.total_bytes.last_day = 0;
    new_info.total_requests.last_day = 0;
  }
  if (weeks_diff >= 1) {
    new_info.total_bytes.last_week = 0;
    new_info.total_requests.last_week = 0;
  }
  if (months_diff >= 1) {
    new_info.total_bytes.last_month = 0;
    new_info.total_requests.last_month = 0;
  }
  if (years_diff >= 1) {
    new_info.total_bytes.last_year = 0;
    new_info.total_requests.last_year = 0;
  }

  new_info.total_bytes.last_second += bytes;
  new_info.total_bytes.last_minute += bytes;
  new_info.total_bytes.last_hour += bytes;
  new_info.total_bytes.last_day += bytes;
  new_info.total_bytes.last_week += bytes;
  new_info.total_bytes.last_month += bytes;
  new_info.total_bytes.last_year += bytes;
  new_info.total_bytes.all_time += bytes;

  new_info.total_requests.last_second += 1;
  new_info.total_requests.last_minute += 1;
  new_info.total_requests.last_hour += 1;
  new_info.total_requests.last_day += 1;
  new_info.total_requests.last_week += 1;
  new_info.total_requests.last_month += 1;
  new_info.total_requests.last_year += 1;
  new_info.total_requests.all_time += 1;

  return new_info;
};

export const get_protected_resource = async (
  private_did: DID,
  ootws_kv: Deno.Kv,
  authorized_requst_jws: DagJWS
) => {
  // console.log("get_protected_resource called");
  const { signerDid, payload: authorizeRequest } = await verify_jws(
    authorized_requst_jws,
    AuthorizeRequestSchema
  );
  const now = Date.now();
  // console.log("Request is signed an authorized by:", signerDid);

  if (!is_valid_timestamp(authorizeRequest.unix_timestamp, now)) {
    return {
      status: 400,
      error: "Invalid Timestamp",
    };
  }

  const maybe_user = await user_in_good_standing(ootws_kv, signerDid);
  if (maybe_user == null) {
    return {
      status: 400,
      error: "User not eligible to authorize requests.",
    };
  }
  // console.log("User is in good standing:", signerDid);

  const { signerDid: asResourceRequestDid, payload: rescourceRequest } =
    await verify_jws(
      authorizeRequest.resource_request_jws as DagJWS,
      ResourceRequestSchema
    );
  if (asResourceRequestDid !== private_did.id) {
    return {
      status: 400,
      error: "Resource request JWS not signed by this server.",
    };
  }

  // console.log("Resource request is valid and from this server:",);


  const info: UserUsageInfo = JSON.parse(
    localStorage.getItem("user_usage_info_" + signerDid) ??
      JSON.stringify({
        last_update_unix_timestamp: now,
        total_bytes: {
          last_second: 0,
          last_minute: 0,
          last_hour: 0,
          last_day: 0,
          last_week: 0,
          last_month: 0,
          last_year: 0,
          all_time: 0,
        },
        total_requests: {
          last_second: 0,
          last_minute: 0,
          last_hour: 0,
          last_day: 0,
          last_week: 0,
          last_month: 0,
          last_year: 0,
          all_time: 0,
        },
        signed_request_history: [],
        request_id_history: [],
      } satisfies UserUsageInfo)
  );

  const new_info = update_info(
    info,
    now,
    rescourceRequest.request_size_in_bytes,
    JSON.stringify(authorized_requst_jws),
    rescourceRequest.request_id
  );
  if (new_info == null) {
    /**
     * don't ban because an intermediary could be replaying requests
     */
    return {
      status: 400,
      error: "Replay attack detected",
    };
  }
  localStorage.setItem(
    "user_usage_info_" + signerDid,
    JSON.stringify(new_info)
  );

  /**
   * @TODO configurable limits
   */
  const MAX_BYTES_PER_SECOND = 2048;
  if (new_info.total_bytes.last_second > MAX_BYTES_PER_SECOND) {
    await distrust_user(
      ootws_kv,
      signerDid,
      new_info.request_id_history.join("\n")
    );
    return {
      status: 400,
      error: "Rate limit exceeded. You are now banned.",
    };
  }
  // console.log("User is within usage limits:", signerDid);

  /**
   * @TODO switch the resource fetching logic below to actually fetch the resource
   * from the server based on resource_url, when not in a hackathon and have more
   * time :)
   */
  rescourceRequest.resource_url;
  const text_encoder = new TextEncoder();
  // console.log("Providing protected resource to:", signerDid);

  return {
    status: 200,
    data: text_encoder.encode("You have accessed a protected resource! This is the protecte data! You are looking at it right now! Please enjoy! Thanks for obying the rulse of ootws!")
  };
};
