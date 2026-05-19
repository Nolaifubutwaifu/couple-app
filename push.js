// ─── Remote Push Notifications (Capacitor) ───
// Registers the device with APNs / FCM, stores the token in Supabase,
// and routes foreground taps back into the app.

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { app } from "./state.js";

var registered = false;
var pendingNavigation = null;

function platformName() {
  try {
    return Capacitor.getPlatform();
  } catch (e) {
    return "web";
  }
}

async function upsertPushToken(token) {
  if (!app.currentUser || !app.supabase) return;
  try {
    await app.supabase
      .from("user_push_tokens")
      .upsert({
        user_id: app.currentUser.id,
        token: token,
        platform: platformName(),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,token" });
  } catch (e) {
    // best-effort — push is optional
  }
}

export async function initPushNotifications(navigate) {
  if (!app.isNative || registered) return;
  if (platformName() === "web") return;

  registered = true;

  try {
    var perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      registered = false;
      return;
    }

    PushNotifications.addListener("registration", function (token) {
      if (token && token.value) upsertPushToken(token.value);
    });

    PushNotifications.addListener("registrationError", function () {
      registered = false;
    });

    PushNotifications.addListener("pushNotificationReceived", function () {
      // We rely on the OS banner — no in-app toast needed since Supabase
      // realtime already updates the UI when the app is in foreground.
    });

    PushNotifications.addListener("pushNotificationActionPerformed", function (action) {
      var data = (action && action.notification && action.notification.data) || {};
      if (navigate && data.tab) {
        try { navigate(data.tab); } catch (e) {}
      } else {
        pendingNavigation = data;
      }
    });

    await PushNotifications.register();
  } catch (e) {
    registered = false;
  }
}

export function consumePendingPushNavigation() {
  var p = pendingNavigation;
  pendingNavigation = null;
  return p;
}

export async function removeMyPushTokens() {
  if (!app.currentUser || !app.supabase) return;
  try {
    await app.supabase
      .from("user_push_tokens")
      .delete()
      .eq("user_id", app.currentUser.id);
  } catch (e) {}
}
