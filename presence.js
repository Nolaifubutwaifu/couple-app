import { app } from "./state.js";
import { showToast, sendLocalNotification } from "./utils.js";

var partnerOnline = false;
var partnerTyping = false;
var typingTimeout = null;
var lastTypingBroadcast = 0;

export async function subscribeToPresence() {
  if (!app.currentCouple || !app.currentUser) return;

  if (app.presenceChannel) {
    await app.supabase.removeChannel(app.presenceChannel);
  }

  app.presenceChannel = app.supabase.channel("presence-" + app.currentCouple.id, {
    config: { presence: { key: app.currentUser.id } }
  });

  app.presenceChannel.on("presence", { event: "sync" }, function () {
    var state = app.presenceChannel.presenceState();
    var partnerPresent = false;
    var keys = Object.keys(state);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== app.currentUser.id) {
        partnerPresent = true;
        break;
      }
    }
    var wasOffline = !partnerOnline;
    partnerOnline = partnerPresent;
    if (wasOffline && partnerOnline && app.settingToggles.settingPartnerActivity) {
      showToast("Your partner is now online");
      sendLocalNotification("Partner Online", "Your partner just opened the app");
    }
  });

  app.presenceChannel.on("broadcast", { event: "typing" }, function (payload) {
    if (payload.payload && payload.payload.userId !== app.currentUser.id) {
      partnerTyping = true;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(function () {
        partnerTyping = false;
      }, 3000);
    }
  });

  await app.presenceChannel.subscribe(async function (status) {
    if (status === "SUBSCRIBED" && app.settingToggles.settingOnlineStatus) {
      await app.presenceChannel.track({ online_at: new Date().toISOString() });
    }
  });
}

export function broadcastTyping() {
  if (!app.presenceChannel || !app.currentUser) return;
  if (!app.settingToggles.settingTypingIndicators) return;
  var now = Date.now();
  if (now - lastTypingBroadcast < 2000) return;
  lastTypingBroadcast = now;
  app.presenceChannel.send({
    type: "broadcast",
    event: "typing",
    payload: { userId: app.currentUser.id }
  });
}

export async function cleanupPresence() {
  if (app.presenceChannel) {
    await app.supabase.removeChannel(app.presenceChannel);
    app.presenceChannel = null;
  }
  partnerOnline = false;
  partnerTyping = false;
}
