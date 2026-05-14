import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Clipboard } from "@capacitor/clipboard";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { LocalNotifications } from "@capacitor/local-notifications";
import { app } from "./state.js";

export function hapticLight() {
  if (!app.isNative) return;
  try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
}

export function hapticMedium() {
  if (!app.isNative) return;
  try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) {}
}

export async function nativeClipboardWrite(text) {
  if (app.isNative) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch (e) {}
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

export async function nativePickPhoto() {
  if (!app.isNative) return null;
  try {
    var result = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      quality: 80,
      width: 1200,
    });
    return result.dataUrl || null;
  } catch (e) {
    return null;
  }
}

export async function nativeTakePhoto() {
  if (!app.isNative) return null;
  try {
    var result = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 80,
      width: 1200,
    });
    return result.dataUrl || null;
  } catch (e) {
    return null;
  }
}

var notificationsPermitted = false;
var notifIdCounter = 1;

export async function requestNotificationPermission() {
  if (!app.isNative) return;
  try {
    var perm = await LocalNotifications.checkPermissions();
    if (perm.display === "granted") {
      notificationsPermitted = true;
      return;
    }
    if (perm.display === "denied") return;
    var result = await LocalNotifications.requestPermissions();
    notificationsPermitted = result.display === "granted";
  } catch (e) {}
}

export function sendLocalNotification(title, body) {
  if (!app.isNative || !notificationsPermitted) return;
  try {
    LocalNotifications.schedule({
      notifications: [{
        title: title,
        body: body,
        id: notifIdCounter++,
        schedule: { at: new Date(Date.now() + 100) },
        sound: "default"
      }]
    });
  } catch (e) {}
}

export function scheduleDailyPromptReminder() {
  if (!app.isNative || !notificationsPermitted) return;
  try {
    LocalNotifications.schedule({
      notifications: [{
        title: "Daily Prompt",
        body: "A new question is waiting for you and your partner",
        id: 9999,
        schedule: {
          on: { hour: 9, minute: 0 },
          repeats: true
        },
        sound: "default"
      }]
    });
  } catch (e) {}
}

export function escapeHTML(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.toggle("error", type === "error");
  element.classList.toggle("success", type === "success");
}

export function getReadableError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  if (error.code === "PGRST202" || error.message.includes("relation") || error.message.includes("function")) {
    return "Supabase is connected, but the database is not set up yet. Run supabase-schema.sql in your Supabase SQL editor.";
  }

  if (error.message.includes("already full")) {
    return "This invite code already has two people in it.";
  }

  if (error.message.includes("already in a couple space")) {
    return "You are already in a couple space. Log out and use another account to join a different one.";
  }

  return error.message || "Something went wrong.";
}

export function showToast(message) {
  var container = document.getElementById("toastContainer");
  if (!container) return;
  var toast = document.createElement("div");
  toast.classList.add("toast");
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", function () {
      toast.remove();
    });
  }, 3000);
}

export function shuffleArray(array) {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}
