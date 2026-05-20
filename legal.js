import { app } from "./state.js";
import { showToast } from "./utils.js";

export function initLegal(callbacks) {
  const onSignedOut = callbacks.onSignedOut;
  const supabase = app.supabase;

  const privacyPolicyOverlay = document.getElementById("privacyPolicyOverlay");
  const termsOfServiceOverlay = document.getElementById("termsOfServiceOverlay");

  document.getElementById("openPrivacyPolicy").addEventListener("click", function () {
    privacyPolicyOverlay.classList.add("visible");
  });
  document.getElementById("privacyPolicyBack").addEventListener("click", function () {
    privacyPolicyOverlay.classList.remove("visible");
  });
  document.getElementById("openTermsOfService").addEventListener("click", function () {
    termsOfServiceOverlay.classList.add("visible");
  });
  document.getElementById("termsOfServiceBack").addEventListener("click", function () {
    termsOfServiceOverlay.classList.remove("visible");
  });

  // ─── Account Deletion ───

  const deleteAccountDialog = document.getElementById("deleteAccountDialog");

  document.getElementById("deleteAccountBtn").addEventListener("click", function () {
    deleteAccountDialog.style.display = "flex";
  });

  document.getElementById("deleteAccountCancel").addEventListener("click", function () {
    deleteAccountDialog.style.display = "none";
  });

  document.getElementById("deleteAccountConfirm").addEventListener("click", async function () {
    this.disabled = true;
    this.textContent = "Deleting...";

    const storageKeys = [
      "couple_countdown_date", "couple_achievement_claimed", "couple_scheduled_dates",
      "couple_hug_count", "couple_streak_count", "couple_streak_hearts",
      "couple_streak_last_date", "couple_streak_milestones_reached", "couple_longest_streak",
      "couple_shop_purchased", "couple_shop_equipped", "couple_onboarding_done",
      "couple_tour_done", "couple_space_name", "coupleAppSettings"
    ];

    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
    } catch (err) {
      this.disabled = false;
      this.textContent = "Delete My Account";
      deleteAccountDialog.style.display = "none";
      showToast("Failed to delete account. Please try again.");
      return;
    }

    storageKeys.forEach(function (key) { localStorage.removeItem(key); });
    deleteAccountDialog.style.display = "none";

    await supabase.auth.signOut();
    if (onSignedOut) await onSignedOut();
    showToast("Your account has been deleted.");
  });

  // ─── Leave Couple ───

  const leaveCoupleDialog = document.getElementById("leaveCoupleDialog");

  document.getElementById("leaveCoupleBtn").addEventListener("click", function () {
    if (!app.currentCouple) {
      showToast("You are not in a couple space.");
      return;
    }
    leaveCoupleDialog.style.display = "flex";
  });

  document.getElementById("leaveCoupleCancel").addEventListener("click", function () {
    leaveCoupleDialog.style.display = "none";
  });

  document.getElementById("leaveCoupleConfirm").addEventListener("click", async function () {
    this.disabled = true;
    this.textContent = "Leaving...";

    try {
      const { error } = await supabase.rpc("leave_couple");
      if (error) throw error;
    } catch (err) {
      this.disabled = false;
      this.textContent = "Leave Space";
      leaveCoupleDialog.style.display = "none";
      showToast("Failed to leave space. Please try again.");
      return;
    }

    leaveCoupleDialog.style.display = "none";
    this.disabled = false;
    this.textContent = "Leave Space";
    window.location.reload();
  });

  // ─── Report ───

  const reportDialog = document.getElementById("reportDialog");

  document.getElementById("reportProblemBtn").addEventListener("click", function () {
    reportDialog.style.display = "flex";
  });

  document.getElementById("reportCancel").addEventListener("click", function () {
    reportDialog.style.display = "none";
    document.getElementById("reportTextarea").value = "";
  });

  document.getElementById("reportSubmit").addEventListener("click", function () {
    const text = document.getElementById("reportTextarea").value.trim();
    const category = document.getElementById("reportCategory").value;

    if (!text) {
      showToast("Please describe the problem.");
      return;
    }

    const subject = encodeURIComponent("Twosome Report: " + category);
    const body = encodeURIComponent(
      "Category: " + category + "\n\n" + text + "\n\nUser: " + (app.currentUser ? app.currentUser.email : "unknown")
    );
    window.open("mailto:support@twosome.app?subject=" + subject + "&body=" + body);

    reportDialog.style.display = "none";
    document.getElementById("reportTextarea").value = "";
    showToast("Thank you for your report.");
  });
}
