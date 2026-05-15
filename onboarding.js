import { app } from "./state.js";
import { nativeClipboardWrite, hapticLight } from "./utils.js";

var overlay = null;
var steps = {};
var coupleData = null;
var joinedViaInvite = false;
var onCompleteCallback = null;

var STEP_ORDER = ["welcome", "name", "spaceName", "invite", "firstAction"];
var currentStepIndex = 0;

var TOUR_STOPS = [
  { tab: "tabMoments", title: "Our Day", text: "Share moments, moods, and little updates from your day." },
  { tab: "tabChats", title: "Questions", text: "Pick prompts to start meaningful conversations — silly to deep." },
  { tab: "tabDate", title: "Date Night", text: "Plan dates together, even when you're apart." },
  { tab: "tabMore", title: "More", text: "Games, memories, achievements, settings, and more." }
];
var tourIndex = 0;

export function needsOnboarding() {
  return !localStorage.getItem("couple_onboarding_done");
}

export function startOnboarding(callbacks) {
  onCompleteCallback = callbacks.onComplete;

  overlay = document.getElementById("onboardingOverlay");
  steps = {
    welcome: document.getElementById("obStepWelcome"),
    name: document.getElementById("obStepName"),
    spaceName: document.getElementById("obStepSpaceName"),
    invite: document.getElementById("obStepInvite"),
    firstAction: document.getElementById("obStepFirstAction")
  };

  var savedStep = localStorage.getItem("ob_step");
  if (savedStep && STEP_ORDER.indexOf(savedStep) > 0) {
    currentStepIndex = STEP_ORDER.indexOf(savedStep);
  } else {
    currentStepIndex = 0;
  }

  overlay.style.display = "";
  showStep(STEP_ORDER[currentStepIndex]);
  wireButtons();
}

function showStep(stepId) {
  for (var key in steps) {
    steps[key].style.display = "none";
    steps[key].classList.remove("onboarding-step-entering");
  }
  steps[stepId].style.display = "";
  steps[stepId].classList.add("onboarding-step-entering");
  localStorage.setItem("ob_step", stepId);

  if (stepId === "spaceName") {
    populateSuggestions();
  }
}

function goNext() {
  currentStepIndex++;
  if (currentStepIndex >= STEP_ORDER.length) {
    finishSetup();
    return;
  }
  showStep(STEP_ORDER[currentStepIndex]);
}

function goToStep(stepId) {
  var idx = STEP_ORDER.indexOf(stepId);
  if (idx >= 0) {
    currentStepIndex = idx;
    showStep(stepId);
  }
}

function wireButtons() {
  // Welcome
  document.getElementById("obWelcomeNext").addEventListener("click", function () {
    goNext();
  });

  var inviteToggle = document.getElementById("obInviteToggle");
  var inviteJoinForm = document.getElementById("obJoinForm");
  if (inviteToggle && inviteJoinForm) {
    inviteToggle.addEventListener("click", function () {
      inviteJoinForm.style.display = inviteJoinForm.style.display === "none" ? "" : "none";
    });
  }

  var joinBtn = document.getElementById("obJoinBtn");
  if (joinBtn) {
    joinBtn.addEventListener("click", handleJoinCouple);
  }

  // Name
  var nameInput = document.getElementById("obNameInput");
  var nameBtn = document.getElementById("obNameNext");
  nameInput.addEventListener("input", function () {
    nameBtn.disabled = this.value.trim().length === 0;
  });
  nameBtn.addEventListener("click", handleNameContinue);

  // Space name
  var spaceInput = document.getElementById("obSpaceNameInput");
  var spaceBtn = document.getElementById("obSpaceNameNext");
  spaceInput.addEventListener("input", function () {
    spaceBtn.disabled = this.value.trim().length === 0;
  });
  spaceBtn.addEventListener("click", handleSpaceNameContinue);

  // Invite
  document.getElementById("obCopyInviteBtn").addEventListener("click", handleInviteCopy);
  document.getElementById("obShareInviteBtn").addEventListener("click", handleInviteShare);
  document.getElementById("obInviteSkip").addEventListener("click", function () {
    goNext();
  });

  // First action
  var actionInput = document.getElementById("obFirstActionInput");
  var actionBtn = document.getElementById("obFirstActionSave");
  actionInput.addEventListener("input", function () {
    actionBtn.disabled = this.value.trim().length === 0;
  });
  actionBtn.addEventListener("click", handleFirstActionSave);
  document.getElementById("obFirstActionSkip").addEventListener("click", function () {
    finishSetup();
  });

  // Tour
  document.getElementById("tourNextBtn").addEventListener("click", advanceTour);
  document.getElementById("tourCompleteBtn").addEventListener("click", finishTour);
}

async function handleNameContinue() {
  var nameInput = document.getElementById("obNameInput");
  var nameBtn = document.getElementById("obNameNext");
  var name = nameInput.value.trim();
  if (!name || !app.currentUser) return;

  nameBtn.disabled = true;
  nameBtn.textContent = "Saving...";

  var { error } = await app.supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", app.currentUser.id);

  nameBtn.disabled = false;
  nameBtn.textContent = "Continue";

  if (error) {
    nameBtn.textContent = "Try again";
    return;
  }

  app.currentProfile.display_name = name;

  if (joinedViaInvite) {
    goToStep("firstAction");
  } else {
    goNext();
  }
}

function populateSuggestions() {
  var container = document.getElementById("obSpaceSuggestions");
  if (!container) return;
  container.innerHTML = "";

  var name = (app.currentProfile && app.currentProfile.display_name) || "";
  var suggestions = ["Us", "Our Space"];
  if (name) {
    suggestions.unshift(name + " & ...");
  }

  suggestions.forEach(function (text) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "onboarding-suggestion-chip";
    chip.textContent = text;
    chip.addEventListener("click", function () {
      var input = document.getElementById("obSpaceNameInput");
      input.value = text;
      input.dispatchEvent(new Event("input"));
    });
    container.appendChild(chip);
  });
}

async function handleSpaceNameContinue() {
  var input = document.getElementById("obSpaceNameInput");
  var btn = document.getElementById("obSpaceNameNext");
  var spaceName = input.value.trim();
  if (!spaceName) return;

  btn.disabled = true;
  btn.textContent = "Creating...";

  localStorage.setItem("couple_space_name", spaceName);

  var { data, error } = await app.supabase.rpc("create_couple");

  btn.disabled = false;
  btn.textContent = "Continue";

  if (error) {
    btn.textContent = "Try again";
    return;
  }

  var row = Array.isArray(data) ? data[0] : data;
  if (row) {
    coupleData = { coupleId: row.couple_id, inviteCode: row.invite_code };
    document.getElementById("obInviteCodeText").textContent = row.invite_code;
  }

  goNext();
}

async function handleJoinCouple() {
  var input = document.getElementById("obJoinCodeInput");
  var btn = document.getElementById("obJoinBtn");
  var msg = document.getElementById("obJoinMessage");
  var code = input.value.trim().toUpperCase();

  if (!code) {
    if (msg) msg.textContent = "Enter an invite code.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Joining...";
  if (msg) msg.textContent = "";

  var { error } = await app.supabase.rpc("join_couple_by_invite", {
    invite_code_arg: code
  });

  btn.disabled = false;
  btn.textContent = "Join";

  if (error) {
    if (msg) msg.textContent = "Invalid code. Check and try again.";
    return;
  }

  joinedViaInvite = true;
  goToStep("name");
}

async function handleInviteCopy() {
  var btn = document.getElementById("obCopyInviteBtn");
  if (!coupleData) return;
  var ok = await nativeClipboardWrite(coupleData.inviteCode);
  if (ok) {
    hapticLight();
    btn.textContent = "Copied!";
    setTimeout(function () { btn.textContent = "Copy code"; }, 1800);
  }
}

async function handleInviteShare() {
  var btn = document.getElementById("obShareInviteBtn");
  if (!coupleData) return;
  var code = coupleData.inviteCode;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join me on Twosome",
        text: "Join me on Twosome! Use this invite code: " + code
      });
    } catch (e) {}
  } else {
    var ok = await nativeClipboardWrite("Join me on Twosome! Use this invite code: " + code);
    if (ok) {
      hapticLight();
      btn.textContent = "Copied!";
      setTimeout(function () { btn.textContent = "Share"; }, 1800);
    }
  }
}

async function handleFirstActionSave() {
  var input = document.getElementById("obFirstActionInput");
  var btn = document.getElementById("obFirstActionSave");
  var text = input.value.trim();
  if (!text || !app.currentUser) return;

  btn.disabled = true;
  btn.textContent = "Saving...";

  var coupleId = coupleData ? coupleData.coupleId : null;
  if (!coupleId) {
    var { data } = await app.supabase.rpc("get_my_couple");
    var row = Array.isArray(data) ? data[0] : data;
    if (row) coupleId = row.couple_id;
  }

  if (coupleId) {
    await app.supabase.from("messages").insert({
      couple_id: coupleId,
      question_id: "daily-grateful",
      sender_id: app.currentUser.id,
      text: text
    });
  }

  btn.disabled = false;
  btn.textContent = "Save & continue";

  finishSetup();
}

function finishSetup() {
  localStorage.setItem("couple_onboarding_done", "1");
  localStorage.removeItem("ob_step");
  overlay.style.display = "none";

  if (onCompleteCallback) {
    onCompleteCallback().then(function () {
      if (!localStorage.getItem("couple_tour_done")) {
        startTour();
      }
    });
  }
}

// ─── Tour ───

function startTour() {
  tourIndex = 0;
  showTourStop(0);
}

function showTourStop(index) {
  var backdrop = document.getElementById("tourBackdrop");
  var tooltip = document.getElementById("tourTooltip");
  var titleEl = document.getElementById("tourTitle");
  var textEl = document.getElementById("tourText");
  var progressEl = document.getElementById("tourProgress");
  var nextBtn = document.getElementById("tourNextBtn");

  document.querySelectorAll(".tour-highlight").forEach(function (el) {
    el.classList.remove("tour-highlight");
  });

  if (index >= TOUR_STOPS.length) {
    backdrop.style.display = "none";
    tooltip.style.display = "none";
    showTourComplete();
    return;
  }

  var stop = TOUR_STOPS[index];
  var tab = document.querySelector('[data-tab="' + stop.tab + '"]');
  if (!tab) {
    tourIndex++;
    showTourStop(tourIndex);
    return;
  }

  backdrop.style.display = "";
  tooltip.style.display = "";
  tab.classList.add("tour-highlight");

  titleEl.textContent = stop.title;
  textEl.textContent = stop.text;
  progressEl.textContent = (index + 1) + " of " + TOUR_STOPS.length;
  nextBtn.textContent = index === TOUR_STOPS.length - 1 ? "Finish" : "Next";

  positionTooltip(tab, tooltip);
}

function positionTooltip(targetEl, tooltipEl) {
  var rect = targetEl.getBoundingClientRect();
  tooltipEl.style.position = "fixed";
  tooltipEl.style.top = "auto";
  tooltipEl.style.bottom = (window.innerHeight - rect.top + 12) + "px";

  var tooltipWidth = tooltipEl.offsetWidth;
  var left = rect.left + rect.width / 2 - tooltipWidth / 2;
  left = Math.max(24, Math.min(left, window.innerWidth - tooltipWidth - 24));
  tooltipEl.style.left = left + "px";
}

function advanceTour() {
  tourIndex++;
  showTourStop(tourIndex);
}

function showTourComplete() {
  document.getElementById("tourCompleteOverlay").style.display = "";
}

function finishTour() {
  localStorage.setItem("couple_tour_done", "1");
  document.getElementById("tourCompleteOverlay").style.display = "none";
}
