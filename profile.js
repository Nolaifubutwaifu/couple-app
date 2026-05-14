import { app } from "./state.js";
import { setStatus, hapticLight, nativeClipboardWrite } from "./utils.js";

var profileAvatarImg = document.getElementById("profileAvatarImg");
var profileAvatarPlaceholder = document.getElementById("profileAvatarPlaceholder");
var profileAvatarInitials = document.getElementById("profileAvatarInitials");
var profileAvatarEditBtn = document.getElementById("profileAvatarEditBtn");
var profileAvatarInput = document.getElementById("profileAvatarInput");
var profileNameInput = document.getElementById("profileNameInput");
var profileNameEditBtn = document.getElementById("profileNameEditBtn");
var profileNameSaveBtn = document.getElementById("profileNameSaveBtn");
var profilePartnerName = document.getElementById("profilePartnerName");
var profileSignOutBtn = document.getElementById("profileSignOutBtn");
var profileMessage = document.getElementById("profileMessage");
var signedInText = document.getElementById("signedInText");

export function renderProfileTab() {
  if (!app.currentProfile) return;

  var name = app.currentProfile.display_name || "";
  profileNameInput.value = name;

  if (app.currentProfile.avatar_url) {
    profileAvatarImg.src = app.currentProfile.avatar_url;
    profileAvatarImg.style.display = "";
    profileAvatarPlaceholder.style.display = "none";
  } else {
    profileAvatarImg.style.display = "none";
    profileAvatarPlaceholder.style.display = "";
    var initials = name.split(" ").map(function (w) { return w.charAt(0).toUpperCase(); }).join("").slice(0, 2);
    profileAvatarInitials.textContent = initials || "?";
  }

  if (app.currentCouple && app.currentCouple.partnerName) {
    profilePartnerName.textContent = app.currentCouple.partnerName;
  } else {
    profilePartnerName.textContent = "No partner yet";
  }
}

export function initProfile(logout, renderGreeting) {
  profileAvatarEditBtn.addEventListener("click", function () {
    profileAvatarInput.click();
  });

  profileAvatarInput.addEventListener("change", async function () {
    var file = profileAvatarInput.files[0];
    if (!file || !app.currentUser) return;

    setStatus(profileMessage, "Uploading...", "");

    var ext = file.name.split(".").pop() || "jpg";
    var path = app.currentUser.id + "/avatar." + ext;

    var uploadResult = await app.supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadResult.error) {
      setStatus(profileMessage, "Upload failed: " + uploadResult.error.message, "error");
      profileAvatarInput.value = "";
      return;
    }

    var urlResult = app.supabase.storage.from("avatars").getPublicUrl(path);
    var publicUrl = urlResult.data.publicUrl + "?t=" + Date.now();

    var updateResult = await app.supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", app.currentUser.id);

    if (updateResult.error) {
      setStatus(profileMessage, "Failed to save: " + updateResult.error.message, "error");
      profileAvatarInput.value = "";
      return;
    }

    app.currentProfile.avatar_url = publicUrl;
    renderProfileTab();
    renderGreeting();
    setStatus(profileMessage, "Photo updated!", "success");
    profileAvatarInput.value = "";
  });

  profileNameEditBtn.addEventListener("click", function () {
    profileNameInput.removeAttribute("readonly");
    profileNameInput.focus();
    profileNameEditBtn.style.display = "none";
    profileNameSaveBtn.style.display = "";
  });

  profileNameSaveBtn.addEventListener("click", async function () {
    var newName = profileNameInput.value.trim();
    if (!newName || !app.currentUser) return;

    profileNameSaveBtn.disabled = true;

    var result = await app.supabase
      .from("profiles")
      .update({ display_name: newName })
      .eq("id", app.currentUser.id);

    if (result.error) {
      setStatus(profileMessage, "Failed to save name.", "error");
      profileNameSaveBtn.disabled = false;
      return;
    }

    app.currentProfile.display_name = newName;
    signedInText.textContent = "Signed in as " + newName;
    renderGreeting();
    profileNameInput.setAttribute("readonly", "");
    profileNameEditBtn.style.display = "";
    profileNameSaveBtn.style.display = "none";
    profileNameSaveBtn.disabled = false;
    setStatus(profileMessage, "Name updated!", "success");
  });

  profileSignOutBtn.addEventListener("click", logout);
}

// Settings

var notificationSettingsOverlay = document.getElementById("notificationSettingsOverlay");
var privacySettingsOverlay = document.getElementById("privacySettingsOverlay");

export function loadSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem("coupleAppSettings"));
    if (saved) {
      for (var key in app.settingToggles) {
        if (saved[key] !== undefined) app.settingToggles[key] = saved[key];
      }
    }
  } catch (e) {}

  for (var key in app.settingToggles) {
    var el = document.getElementById(key);
    if (el) el.checked = app.settingToggles[key];
  }
}

function saveSetting(key, value) {
  app.settingToggles[key] = value;
  localStorage.setItem("coupleAppSettings", JSON.stringify(app.settingToggles));
}

export function initSettings() {
  for (var key in app.settingToggles) {
    (function (k) {
      var el = document.getElementById(k);
      if (el) {
        el.addEventListener("change", function () {
          saveSetting(k, this.checked);
        });
      }
    })(key);
  }

  document.getElementById("openNotificationSettings").addEventListener("click", function () {
    loadSettings();
    requestAnimationFrame(function () {
      notificationSettingsOverlay.classList.add("settings-overlay-visible");
    });
  });

  document.getElementById("openPrivacySettings").addEventListener("click", function () {
    loadSettings();
    requestAnimationFrame(function () {
      privacySettingsOverlay.classList.add("settings-overlay-visible");
    });
  });

  document.getElementById("notifSettingsBack").addEventListener("click", function () {
    notificationSettingsOverlay.classList.remove("settings-overlay-visible");
  });

  document.getElementById("privacySettingsBack").addEventListener("click", function () {
    privacySettingsOverlay.classList.remove("settings-overlay-visible");
  });

  loadSettings();
}

export function initInviteButtons(coupleMessage) {
  document.getElementById("copyInviteBtn").addEventListener("click", async function () {
    if (!app.currentCouple) return;
    var ok = await nativeClipboardWrite(app.currentCouple.inviteCode);
    if (ok) {
      hapticLight();
      this.textContent = "Copied!";
      setTimeout(function () {
        document.getElementById("copyInviteBtn").textContent = "Copy code";
      }, 1800);
    } else {
      setStatus(coupleMessage, "Copy failed. Select the code and copy manually.", "error");
    }
  });

  document.getElementById("shareInviteBtn").addEventListener("click", async function () {
    if (!app.currentCouple) return;
    var code = app.currentCouple.inviteCode;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Couple",
          text: "Join me on Couple! Use this invite code: " + code
        });
      } catch (e) {}
    } else {
      var ok = await nativeClipboardWrite("Join me on Couple! Use this invite code: " + code);
      if (ok) {
        hapticLight();
        this.textContent = "Copied!";
        var btn = this;
        setTimeout(function () { btn.textContent = "Share"; }, 1800);
      }
    }
  });
}
