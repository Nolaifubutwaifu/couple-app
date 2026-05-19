# Push Notifications Setup

The app code is done. You still need to provision certs and deploy the Edge
Function. This guide walks through it.

## What's already wired

- ✅ `@capacitor/push-notifications` plugin installed
- ✅ `push.js` requests permission, stores the device token in Supabase
- ✅ `user_push_tokens` table with RLS + `get_partner_push_tokens` RPC
- ✅ Edge Function `supabase/functions/send-push/index.ts` (APNs + FCM)
- ✅ iOS: `UIBackgroundModes` includes `remote-notification`
- ✅ iOS: `App.entitlements` declares `aps-environment`
- ✅ iOS: `AppDelegate.swift` forwards device token to Capacitor
- ✅ On logout, the user's push tokens are deleted

## Manual steps you need to do

### 1. Run the new SQL schema

Open Supabase → SQL Editor and re-run the bottom of `supabase-schema.sql`
(everything below the comment `PUSH NOTIFICATION TOKENS`). Or just run the
whole file — every statement is `create … if not exists` / `create or replace`.

### 2. Apple Developer — create an APNs Auth Key

This is a one-time setup. The same key works for development and production,
across all your apps.

1. Sign in to https://developer.apple.com → Certificates, Identifiers & Profiles
2. **Keys** → click ＋ to create a new key
3. Name: `Twosome APNs`
4. Tick **Apple Push Notifications service (APNs)**
5. Continue → Register → **Download** the `.p8` file (you can only download it once)
6. Copy the **Key ID** (10 chars, shown next to the key) — you'll need it
7. From the top of the page, copy your **Team ID** (10 chars)

### 3. Enable Push capability on the App ID

1. Same page → **Identifiers** → click your app's identifier (`com.twosome.app`)
2. Tick **Push Notifications** → Save
3. Re-download your provisioning profile (if you're not using Xcode automatic signing)

### 4. Xcode — enable Push Notifications capability

1. Open `ios/App/App.xcworkspace`
2. Select the App target → **Signing & Capabilities**
3. Click **+ Capability** → **Push Notifications**
4. Click **+ Capability** → **Background Modes** → tick **Remote notifications**
5. Build & run on a real device (push does not work in the Simulator on older OS;
   on iOS 16+ it works in Simulator too)

### 5. Set secrets on Supabase

```bash
supabase secrets set APNS_TEAM_ID="ABCDE12345"
supabase secrets set APNS_KEY_ID="ABCDE12345"
supabase secrets set APNS_BUNDLE_ID="com.twosome.app"
supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_ABCDE12345.p8)"
supabase secrets set APNS_PRODUCTION="false"   # flip to "true" for TestFlight + App Store
```

When you ship to TestFlight or the App Store, change `APNS_PRODUCTION` to `true`
and change `App.entitlements` `aps-environment` from `development` to `production`.

### 6. Deploy the Edge Function

```bash
supabase functions deploy send-push --no-verify-jwt
```

Note the URL it prints — something like
`https://<project>.functions.supabase.co/send-push`.

### 7. Create Database Webhooks

In Supabase Dashboard → **Database** → **Webhooks**:

**Webhook 1 — new messages**
- Name: `push-on-message`
- Table: `messages`
- Events: `INSERT`
- Type: `HTTP Request`
- URL: `https://<project>.functions.supabase.co/send-push`
- HTTP Method: `POST`
- HTTP Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (or use the auto-generated
    `supabase-functions` auth header)

**Webhook 2 — new moments**
- Same as above, but Table: `moments`

### 8. Android (optional, can ship iOS only)

1. Create a Firebase project, add your Android app (`com.twosome.app`)
2. Download `google-services.json` → place in `android/app/`
3. Generate a Server Key in Firebase → Cloud Messaging settings
4. `supabase secrets set FCM_SERVER_KEY="<server-key>"`
5. `npm install` will pull the Capacitor Android push plugin in `cap:android`

### 9. Test

1. Sign in on two devices (or one device + one simulator with iOS 16+) as
   two different accounts paired in the same couple.
2. Background the receiving device.
3. Send a message from the other device.
4. The banner should appear within ~1 second.

If nothing arrives:
- Check the Edge Function logs: `supabase functions logs send-push`
- Check that `user_push_tokens` has rows (Supabase Table Editor)
- Check that `aps-environment` matches `APNS_PRODUCTION` (development ↔ false, production ↔ true)
- Confirm the device granted notification permission (Settings → Twosome)

## Architecture summary

```
   Sender device                Supabase                    Receiver device
   ─────────────                ────────                    ───────────────
   sendMessage()
       ↓
   INSERT messages   ───────►   Postgres
                                   ↓ (webhook trigger)
                                Edge Function "send-push"
                                   ↓
                                get_partner_push_tokens(sender_id)
                                   ↓
                                APNs / FCM   ───────────►   📱 banner
                                                            tap → push.js → navigateToTab
```
