// Supabase Edge Function: send-push
// Triggered by Postgres webhooks on inserts to `messages` and `moments`.
// Looks up the partner's push tokens and dispatches a push via APNs + FCM.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Required env (set with: supabase secrets set KEY=VALUE):
//   SUPABASE_URL              (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)
//   APNS_TEAM_ID              Apple Developer Team ID
//   APNS_KEY_ID               Auth Key ID (10 chars)
//   APNS_BUNDLE_ID            com.twosome.app
//   APNS_PRIVATE_KEY          The .p8 file contents (PEM)
//   APNS_PRODUCTION           "true" once on TestFlight/App Store
//   FCM_SERVER_KEY            (optional) For Android. Use legacy server key
//                              or migrate to FCM v1 OAuth.
//
// Webhook setup (run once per table, in Supabase Dashboard → Database → Webhooks):
//   - Table: messages, Event: INSERT, Type: HTTP, URL: <function url>
//   - Table: moments,  Event: INSERT, Type: HTTP, URL: <function url>
//   - HTTP Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create as jwtCreate, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: "messages" | "moments";
  record: Record<string, any>;
  old_record: Record<string, any> | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.twosome.app";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
const APNS_PRODUCTION = (Deno.env.get("APNS_PRODUCTION") ?? "false") === "true";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── APNs JWT signing (ES256) ────────────────────────────────────
async function importApnsKey(): Promise<CryptoKey | null> {
  if (!APNS_PRIVATE_KEY) return null;
  // .p8 keys are PEM-encoded PKCS#8
  const pem = APNS_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

let cachedApnsJwt: { token: string; expires: number } | null = null;

async function getApnsJwt(): Promise<string | null> {
  if (cachedApnsJwt && cachedApnsJwt.expires > Date.now() + 60_000) {
    return cachedApnsJwt.token;
  }
  const key = await importApnsKey();
  if (!key || !APNS_TEAM_ID || !APNS_KEY_ID) return null;

  const token = await jwtCreate(
    { alg: "ES256", typ: "JWT", kid: APNS_KEY_ID },
    { iss: APNS_TEAM_ID, iat: getNumericDate(0) },
    key
  );
  cachedApnsJwt = { token, expires: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function sendApns(token: string, payload: any): Promise<void> {
  const jwt = await getApnsJwt();
  if (!jwt) return;
  const host = APNS_PRODUCTION
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
  await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      "authorization": `bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function sendFcm(token: string, title: string, body: string, data: Record<string, string>): Promise<void> {
  if (!FCM_SERVER_KEY) return;
  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "authorization": `key=${FCM_SERVER_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body, sound: "default" },
      data,
    }),
  });
}

// ─── Compose notification copy ───────────────────────────────────
function composeNotification(payload: WebhookPayload, partnerName: string): {
  title: string;
  body: string;
  tab: string;
} {
  if (payload.table === "messages") {
    const r = payload.record;
    if (r.image_url) {
      return { title: partnerName || "Your partner", body: "📷 sent you a photo", tab: "tabChats" };
    }
    const text: string = (r.text ?? "").toString();
    const trimmed = text.length > 80 ? text.slice(0, 80) + "…" : text;
    return { title: partnerName || "Your partner", body: trimmed || "sent you a message", tab: "tabChats" };
  }
  // moments
  const r = payload.record;
  if (r.moment_type === "photo") {
    return { title: partnerName || "Your partner", body: "📸 added a photo to today's moments", tab: "tabMoments" };
  }
  if (r.moment_type === "mood") {
    return { title: partnerName || "Your partner", body: `is feeling ${r.mood ?? "something"} right now`, tab: "tabMoments" };
  }
  return { title: partnerName || "Your partner", body: "shared a moment with you", tab: "tabMoments" };
}

async function getPartnerName(senderUserId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", senderUserId)
    .single();
  return data?.display_name ?? "";
}

// ─── HTTP handler ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (payload.type !== "INSERT") return new Response("skip", { status: 200 });
  const senderId: string | undefined = payload.record?.sender_id;
  if (!senderId) return new Response("no sender", { status: 200 });

  // partner push tokens via secured DB function (uses service role)
  const { data: tokens, error: tokErr } = await supabase.rpc("get_partner_push_tokens", {
    p_user_id: senderId,
  });
  if (tokErr || !tokens || tokens.length === 0) {
    return new Response("no tokens", { status: 200 });
  }

  const senderName = await getPartnerName(senderId);
  const note = composeNotification(payload, senderName);

  const apnsPayload = {
    aps: {
      alert: { title: note.title, body: note.body },
      sound: "default",
      "thread-id": payload.table,
      badge: 1,
    },
    tab: note.tab,
    table: payload.table,
  };

  await Promise.all(
    tokens.map((t: { token: string; platform: string }) => {
      if (t.platform === "ios") {
        return sendApns(t.token, apnsPayload).catch(() => null);
      }
      if (t.platform === "android") {
        return sendFcm(t.token, note.title, note.body, {
          tab: note.tab,
          table: payload.table,
        }).catch(() => null);
      }
      return null;
    })
  );

  return new Response("sent", { status: 200 });
});
