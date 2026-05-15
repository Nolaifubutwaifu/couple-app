import { app } from "./state.js";
import { setStatus, showToast, hapticLight } from "./utils.js";
import { loadGameState, saveGameState } from "./games.js";
import { recordEngagement, addBonusHearts } from "./extras.js";
import { dateNightSteps, dateThemes } from "./data.js";

var dateChannel = null;
var datePeerConnection = null;
var dateLocalStream = null;
var dateTimerInterval = null;
var dateCurrentStep = 0;
var dateIsActive = false;
var shuffledSteps = [];
var dateMode = "full";
var dateTheme = null;
var selectedThemeId = null;

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function buildShuffledDate(theme, stepCount) {
  var pool = dateNightSteps;
  if (theme) {
    pool = dateNightSteps.filter(function (s) {
      return s.themes && s.themes.indexOf(theme) >= 0;
    });
  }

  var qs = shuffleArray(pool.filter(function (s) { return s.type === "question"; }));
  var cs = shuffleArray(pool.filter(function (s) { return s.type === "challenge"; }));
  var ws = shuffleArray(pool.filter(function (s) { return s.type === "wouldyourather"; }));

  var total = stepCount || 20;
  var result = [];

  if (total <= 5) {
    var qi = 0, ci = 0, wi = 0;
    if (cs.length > 0) result.push(cs[ci++]);
    if (qs.length > qi) result.push(qs[qi++]);
    if (qs.length > qi) result.push(qs[qi++]);
    if (ws.length > 0) result.push(ws[wi++]);
    if (qs.length > qi) result.push(qs[qi++]);
    return result.slice(0, total);
  }

  var qi2 = 0, ci2 = 0, wi2 = 0;
  for (var i = 0; i < total; i++) {
    if (i % 5 === 3 && ci2 < cs.length) {
      result.push(cs[ci2++]);
    } else if (i % 5 === 0 && i > 0 && wi2 < ws.length) {
      result.push(ws[wi2++]);
    } else if (qi2 < qs.length) {
      result.push(qs[qi2++]);
    } else if (ci2 < cs.length) {
      result.push(cs[ci2++]);
    } else if (wi2 < ws.length) {
      result.push(ws[wi2++]);
    }
  }
  return result;
}

// ─── DOM Elements ───

var dateScreenLanding = document.getElementById("dateLanding");
var dateScreenInvite = document.getElementById("dateInvite");
var dateScreenActive = document.getElementById("dateActive");
var dateScreenEnd = document.getElementById("dateEnd");
var dateThemeModal = document.getElementById("dateThemeModal");

var dateStartMessage = document.getElementById("dateStartMessage");
var dateJoinBtn = document.getElementById("dateJoinBtn");
var dateDeclineBtn = document.getElementById("dateDeclineBtn");
var dateMuteBtn = document.getElementById("dateMuteBtn");
var dateCameraBtn = document.getElementById("dateCameraBtn");
var dateEndBtn = document.getElementById("dateEndBtn");
var datePrevBtn = document.getElementById("datePrevBtn");
var dateNextBtn = document.getElementById("dateNextBtn");
var dateDoneBtn = document.getElementById("dateDoneBtn");
var dateRemoteVideo = document.getElementById("dateRemoteVideo");
var dateLocalVideo = document.getElementById("dateLocalVideo");
var dateNoVideo = document.getElementById("dateNoVideo");
var dateStepProgress = document.getElementById("dateStepProgress");
var dateStepText = document.getElementById("dateStepText");
var dateChallengeTitle = document.getElementById("dateChallengeTitle");
var dateChallengeDesc = document.getElementById("dateChallengeDesc");
var dateTimer = document.getElementById("dateTimer");
var dateTimerValue = document.getElementById("dateTimerValue");
var dateStepQuestion = document.getElementById("dateStepQuestion");
var dateStepChallenge = document.getElementById("dateStepChallenge");
var dateStepWYR = document.getElementById("dateStepWYR");
var dateWYROptionA = document.getElementById("dateWYROptionA");
var dateWYROptionB = document.getElementById("dateWYROptionB");

function showDateScreen(screen) {
  dateScreenLanding.style.display = "none";
  dateScreenInvite.style.display = "none";
  dateScreenActive.style.display = "none";
  dateScreenEnd.style.display = "none";
  dateThemeModal.style.display = "none";
  screen.style.display = "";
}

// ─── Video / WebRTC ───

async function startLocalVideo() {
  try {
    dateLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    dateLocalVideo.srcObject = dateLocalStream;
    dateNoVideo.style.display = "none";
  } catch (err) {
    console.warn("Camera/mic not available:", err);
    dateNoVideo.style.display = "flex";
  }
}

function setupDateChannel() {
  if (!app.currentCouple) return;

  if (dateChannel) {
    app.supabase.removeChannel(dateChannel);
  }

  dateChannel = app.supabase.channel("date-" + app.currentCouple.id);

  dateChannel.on("broadcast", { event: "signal" }, function (msg) {
    handleSignalingMessage(msg.payload);
  });

  dateChannel.on("broadcast", { event: "date-end" }, function () {
    onPartnerEndedDate();
  });

  dateChannel.subscribe();
}

function createPeerConnection() {
  var pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });

  pc.onicecandidate = function (event) {
    if (event.candidate && dateChannel) {
      dateChannel.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "ice-candidate", candidate: event.candidate }
      });
    }
  };

  pc.ontrack = function (event) {
    dateRemoteVideo.srcObject = event.streams[0];
  };

  if (dateLocalStream) {
    dateLocalStream.getTracks().forEach(function (track) {
      pc.addTrack(track, dateLocalStream);
    });
  }

  datePeerConnection = pc;
  return pc;
}

async function createOffer() {
  var pc = createPeerConnection();
  var offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  dateChannel.send({
    type: "broadcast",
    event: "signal",
    payload: { type: "offer", sdp: offer.sdp }
  });
}

async function handleSignalingMessage(msg) {
  if (msg.type === "offer") {
    var pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: msg.sdp }));
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    dateChannel.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "answer", sdp: answer.sdp }
    });
  } else if (msg.type === "answer") {
    if (datePeerConnection) {
      await datePeerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: msg.sdp }));
    }
  } else if (msg.type === "ice-candidate") {
    if (datePeerConnection) {
      await datePeerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }
}

export function cleanupDateCall() {
  clearDateTimer();

  if (datePeerConnection) {
    datePeerConnection.close();
    datePeerConnection = null;
  }

  if (dateLocalStream) {
    dateLocalStream.getTracks().forEach(function (t) { t.stop(); });
    dateLocalStream = null;
  }

  dateLocalVideo.srcObject = null;
  dateRemoteVideo.srcObject = null;

  if (dateChannel) {
    app.supabase.removeChannel(dateChannel);
    dateChannel = null;
  }

  dateIsActive = false;
  dateCurrentStep = 0;
}

// ─── Start / Join / End ───

async function startDateNight(mode, theme) {
  if (!app.currentCouple || app.currentCouple.memberCount < 2) {
    setStatus(dateStartMessage, "You need a partner to start a date.", "error");
    return;
  }

  dateMode = mode || "full";
  dateTheme = theme || null;

  var stepCount = dateMode === "quick" ? 5 : 20;
  shuffledSteps = buildShuffledDate(dateTheme, stepCount);

  setStatus(dateStartMessage, "", "");
  await startLocalVideo();
  setupDateChannel();

  dateCurrentStep = 0;
  dateIsActive = true;

  await saveGameState("date", {
    status: "waiting",
    currentStep: 0,
    initiatedBy: app.currentUser.id,
    startedAt: new Date().toISOString(),
    mode: dateMode,
    theme: dateTheme
  });

  removeScheduledDate(0);
  showDateScreen(dateScreenActive);
  renderDateStep(0);
}

async function joinDateNight() {
  await startLocalVideo();
  setupDateChannel();

  dateIsActive = true;
  var existing = await loadGameState("date");
  dateCurrentStep = existing ? (existing.currentStep || 0) : 0;
  dateMode = existing && existing.mode ? existing.mode : "full";
  dateTheme = existing && existing.theme ? existing.theme : null;

  if (shuffledSteps.length === 0) {
    var stepCount = dateMode === "quick" ? 5 : 20;
    shuffledSteps = buildShuffledDate(dateTheme, stepCount);
  }

  await saveGameState("date", {
    status: "active",
    currentStep: dateCurrentStep,
    initiatedBy: existing ? existing.initiatedBy : app.currentUser.id,
    startedAt: existing ? existing.startedAt : new Date().toISOString(),
    mode: dateMode,
    theme: dateTheme
  });

  showDateScreen(dateScreenActive);
  renderDateStep(dateCurrentStep);

  setTimeout(function () {
    createOffer();
  }, 500);
}

function getHeartsForMode(mode) {
  return mode === "quick" ? 5 : 10;
}

function showEndScreen() {
  var hearts = getHeartsForMode(dateMode);
  var totalSteps = shuffledSteps.length || (dateMode === "quick" ? 5 : 20);
  var stepsCompleted = Math.min(dateCurrentStep + 1, totalSteps);

  document.getElementById("dateEndSteps").textContent = stepsCompleted + "/" + totalSteps;
  document.getElementById("dateEndHearts").textContent = "+" + hearts + " ❤️";

  var badge = document.getElementById("dateEndThemeBadge");
  if (dateTheme) {
    var themeObj = dateThemes.find(function (t) { return t.id === dateTheme; });
    if (themeObj) {
      badge.textContent = themeObj.emoji + " " + themeObj.name;
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  } else {
    badge.style.display = "none";
  }

  showDateScreen(dateScreenEnd);
}

function onPartnerEndedDate() {
  var hearts = getHeartsForMode(dateMode);
  saveDateToHistory();
  cleanupDateCall();
  showEndScreen();
  recordEngagement();
  addBonusHearts(hearts);
}

async function endDateNight() {
  if (dateChannel) {
    dateChannel.send({
      type: "broadcast",
      event: "date-end",
      payload: {}
    });
  }

  var hearts = getHeartsForMode(dateMode);
  saveDateToHistory();

  await saveGameState("date", {
    status: "ended",
    currentStep: dateCurrentStep,
    initiatedBy: null,
    startedAt: null
  });

  cleanupDateCall();
  showEndScreen();
  recordEngagement();
  addBonusHearts(hearts);
}

async function closeDateEnd() {
  if (app.currentCouple) {
    await app.supabase
      .from("game_states")
      .delete()
      .eq("couple_id", app.currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenLanding);
  renderDateLanding();
}

async function declineDateNight() {
  if (app.currentCouple) {
    await app.supabase
      .from("game_states")
      .delete()
      .eq("couple_id", app.currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenLanding);
}

export function onDateStateFromDB(state) {
  if (!state) return;

  if (state.status === "waiting" && state.initiatedBy !== app.currentUser.id) {
    dateMode = state.mode || "full";
    dateTheme = state.theme || null;
    showDateScreen(dateScreenInvite);
    switchToDateTab();
    return;
  }

  if (state.status === "active" && dateIsActive) {
    if (state.initiatedBy === app.currentUser.id && !datePeerConnection) {
      createOffer();
    }
    dateCurrentStep = state.currentStep || 0;
    renderDateStep(dateCurrentStep);
    return;
  }

  if (state.status === "ended") {
    if (dateIsActive) {
      onPartnerEndedDate();
    }
    return;
  }
}

function switchToDateTab() {
  var tabs = document.querySelectorAll(".tab-content");
  var navTabs = document.querySelectorAll(".nav-tab");

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("tab-active");
  }
  for (var j = 0; j < navTabs.length; j++) {
    navTabs[j].classList.remove("nav-tab-active");
  }

  var dateTab = document.getElementById("tabDate");
  if (dateTab) dateTab.classList.add("tab-active");

  for (var k = 0; k < navTabs.length; k++) {
    if (navTabs[k].getAttribute("data-tab") === "tabDate") {
      navTabs[k].classList.add("nav-tab-active");
      break;
    }
  }
}

// ─── Step Navigation & Rendering ───

async function navigateDateStep(direction) {
  var newStep = dateCurrentStep + direction;
  var steps = shuffledSteps.length > 0 ? shuffledSteps : dateNightSteps;
  if (newStep < 0 || newStep >= steps.length) return;

  dateCurrentStep = newStep;
  renderDateStep(dateCurrentStep);

  var existing = await loadGameState("date");
  await saveGameState("date", {
    status: existing ? existing.status : "active",
    currentStep: dateCurrentStep,
    initiatedBy: existing ? existing.initiatedBy : app.currentUser.id,
    startedAt: existing ? existing.startedAt : new Date().toISOString(),
    mode: dateMode,
    theme: dateTheme
  });
}

function renderDateStep(index) {
  var steps = shuffledSteps.length > 0 ? shuffledSteps : dateNightSteps;
  if (index < 0 || index >= steps.length) return;

  var step = steps[index];
  dateStepProgress.textContent = (index + 1) + " / " + steps.length;

  dateStepQuestion.style.display = "none";
  dateStepChallenge.style.display = "none";
  dateStepWYR.style.display = "none";
  clearDateTimer();

  datePrevBtn.disabled = index === 0;

  if (index >= steps.length - 1) {
    dateNextBtn.textContent = "Finish";
  } else {
    dateNextBtn.textContent = "Next";
  }

  if (step.type === "question") {
    dateStepText.textContent = step.text;
    dateStepQuestion.style.display = "";
  } else if (step.type === "challenge") {
    dateChallengeTitle.textContent = step.title;
    dateChallengeDesc.textContent = step.description;
    dateStepChallenge.style.display = "";
    if (step.timerSeconds) {
      startChallengeTimer(step.timerSeconds);
    }
  } else if (step.type === "wouldyourather") {
    dateWYROptionA.textContent = step.optionA;
    dateWYROptionB.textContent = step.optionB;
    dateWYROptionA.classList.remove("selected");
    dateWYROptionB.classList.remove("selected");
    dateStepWYR.style.display = "";
  }
}

function startChallengeTimer(seconds) {
  clearDateTimer();
  var remaining = seconds;
  dateTimerValue.textContent = remaining;
  dateTimerValue.classList.remove("warning");
  dateTimer.style.display = "";

  dateTimerInterval = setInterval(function () {
    remaining--;
    dateTimerValue.textContent = remaining;

    if (remaining <= 10) {
      dateTimerValue.classList.add("warning");
    }

    if (remaining <= 0) {
      clearInterval(dateTimerInterval);
      dateTimerInterval = null;
      dateTimerValue.textContent = "Time!";
    }
  }, 1000);
}

function clearDateTimer() {
  if (dateTimerInterval) {
    clearInterval(dateTimerInterval);
    dateTimerInterval = null;
  }
  dateTimer.style.display = "none";
  dateTimerValue.classList.remove("warning");
}

function toggleDateMute() {
  if (!dateLocalStream) return;
  var audioTrack = dateLocalStream.getAudioTracks()[0];
  if (!audioTrack) return;

  audioTrack.enabled = !audioTrack.enabled;
  dateMuteBtn.classList.toggle("muted", !audioTrack.enabled);
  dateMuteBtn.textContent = audioTrack.enabled ? "🎙" : "🔇";
}

function toggleDateCamera() {
  if (!dateLocalStream) return;
  var videoTrack = dateLocalStream.getVideoTracks()[0];
  if (!videoTrack) return;

  videoTrack.enabled = !videoTrack.enabled;
  dateCameraBtn.classList.toggle("muted", !videoTrack.enabled);
  dateCameraBtn.textContent = videoTrack.enabled ? "📷" : "🚫";
}

export async function checkExistingDateSession() {
  var state = await loadGameState("date");
  if (!state) return;

  dateMode = state.mode || "full";
  dateTheme = state.theme || null;

  if (state.status === "waiting") {
    if (state.initiatedBy === app.currentUser.id) {
      var stepCount = dateMode === "quick" ? 5 : 20;
      shuffledSteps = buildShuffledDate(dateTheme, stepCount);
      await startLocalVideo();
      setupDateChannel();
      dateIsActive = true;
      dateCurrentStep = 0;
      showDateScreen(dateScreenActive);
      renderDateStep(0);
      switchToDateTab();
    } else {
      showDateScreen(dateScreenInvite);
      switchToDateTab();
    }
  } else if (state.status === "active") {
    var stepCount2 = dateMode === "quick" ? 5 : 20;
    shuffledSteps = buildShuffledDate(dateTheme, stepCount2);
    dateCurrentStep = state.currentStep || 0;
    await startLocalVideo();
    setupDateChannel();
    dateIsActive = true;
    showDateScreen(dateScreenActive);
    renderDateStep(dateCurrentStep);
    switchToDateTab();
    setTimeout(function () {
      createOffer();
    }, 500);
  }
}

// ─── Scheduling ───

function loadAllScheduledDates() {
  try {
    var raw = localStorage.getItem("couple_scheduled_dates");
    if (raw) return JSON.parse(raw);
    var legacy = localStorage.getItem("couple_scheduled_date");
    if (legacy) {
      var obj = JSON.parse(legacy);
      if (obj && obj.datetime) return [obj];
    }
    return [];
  } catch (e) { return []; }
}

function saveAllScheduledDates(list) {
  localStorage.setItem("couple_scheduled_dates", JSON.stringify(list));
  localStorage.removeItem("couple_scheduled_date");
}

function scheduleDate(datetime, theme) {
  var list = loadAllScheduledDates();
  list.push({ datetime: datetime, theme: theme || null });
  list.sort(function (a, b) { return new Date(a.datetime) - new Date(b.datetime); });
  saveAllScheduledDates(list);
  renderScheduledDates();
  showToast("Date scheduled!");
}

export function loadScheduledDate() {
  var list = loadAllScheduledDates();
  return list.length > 0 ? list[0] : null;
}

function removeScheduledDate(index) {
  var list = loadAllScheduledDates();
  list.splice(index, 1);
  saveAllScheduledDates(list);
  renderScheduledDates();
}

function formatScheduledDateStr(scheduled) {
  var d = new Date(scheduled.datetime);
  var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var hours = d.getHours();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  var minutes = d.getMinutes();
  var timeStr = hours + ":" + (minutes < 10 ? "0" : "") + minutes + " " + ampm;
  var dateStr = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + " at " + timeStr;

  if (scheduled.theme) {
    var t = dateThemes.find(function (th) { return th.id === scheduled.theme; });
    if (t) dateStr += " · " + t.emoji + " " + t.name;
  }
  return dateStr;
}

function renderScheduledDates() {
  var container = document.getElementById("dateScheduledIndicator");
  var list = loadAllScheduledDates();

  if (list.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  var html = "";
  for (var i = 0; i < list.length; i++) {
    html += '<div class="date-scheduled-row" data-index="' + i + '">' +
      '<span class="date-scheduled-icon">📅</span>' +
      '<span class="date-scheduled-text">' + formatScheduledDateStr(list[i]) + '</span>' +
      '<button type="button" class="date-scheduled-cancel">✕</button>' +
      '</div>';
  }
  container.innerHTML = html;
  container.style.display = "";
}

// ─── Date History ───

async function saveDateToHistory() {
  if (!app.currentUser || !app.currentCouple) return;

  var hearts = getHeartsForMode(dateMode);
  var totalSteps = shuffledSteps.length || (dateMode === "quick" ? 5 : 20);
  var stepsCompleted = Math.min(dateCurrentStep + 1, totalSteps);

  app.supabase.from("date_history").insert({
    couple_id: app.currentCouple.id,
    completed_by: app.currentUser.id,
    date_mode: dateMode,
    theme: dateTheme,
    steps_completed: stepsCompleted,
    total_steps: totalSteps,
    hearts_earned: hearts
  });
}

export async function loadDateHistory() {
  if (!app.currentCouple) return;

  var result = await app.supabase
    .from("date_history")
    .select("id, date_mode, theme, steps_completed, total_steps, hearts_earned, completed_at")
    .eq("couple_id", app.currentCouple.id)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (result.error || !result.data) {
    renderDateHistory([]);
    return;
  }

  renderDateHistory(result.data);
}

function renderDateHistory(rows) {
  var list = document.getElementById("dateHistoryList");
  var empty = document.getElementById("dateHistoryEmpty");
  var emptyHint = document.getElementById("dateHistoryEmptyHint");

  if (!rows || rows.length === 0) {
    list.innerHTML = "";
    list.appendChild(empty);
    if (emptyHint) list.appendChild(emptyHint);
    empty.style.display = "";
    if (emptyHint) emptyHint.style.display = "";
    return;
  }

  list.innerHTML = "";
  empty.style.display = "none";
  if (emptyHint) emptyHint.style.display = "none";

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var d = new Date(row.completed_at);
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var dateStr = months[d.getMonth()] + " " + d.getDate();

    var themeBadge = "";
    if (row.theme) {
      var t = dateThemes.find(function (th) { return th.id === row.theme; });
      if (t) themeBadge = '<span class="date-history-badge">' + t.emoji + " " + t.name + '</span>';
    }

    var modeLabel = row.date_mode === "quick" ? "Quick Date" : "Full Date Night";

    var el = document.createElement("div");
    el.className = "date-history-row";
    el.innerHTML =
      '<span class="date-history-date">' + dateStr + '</span>' +
      '<div class="date-history-body">' +
        '<div class="date-history-title">' + themeBadge + modeLabel + '</div>' +
        '<div class="date-history-meta">' + row.steps_completed + '/' + row.total_steps + ' steps</div>' +
      '</div>' +
      '<span class="date-history-hearts">+' + row.hearts_earned + ' ❤️</span>';
    list.appendChild(el);
  }
}

// ─── Landing Page Rendering ───

export function renderDateLanding() {
  renderThemeCards();
  renderScheduledDates();
  populateThemeSelect();
  loadDateHistory();
}

function renderThemeCards() {
  var scroll = document.getElementById("dateThemesScroll");
  scroll.innerHTML = "";

  for (var i = 0; i < dateThemes.length; i++) {
    var t = dateThemes[i];
    var card = document.createElement("div");
    card.className = "date-theme-card";
    card.dataset.theme = t.id;
    card.innerHTML =
      '<span class="date-theme-card-emoji">' + t.emoji + '</span>' +
      '<p class="date-theme-card-name">' + t.name + '</p>' +
      '<p class="date-theme-card-tagline">' + t.tagline + '</p>' +
      '<span class="date-theme-card-selected-label">Selected</span>';

    (function (themeId) {
      card.addEventListener("click", function () {
        hapticLight();
        if (selectedThemeId === themeId) {
          selectedThemeId = null;
        } else {
          selectedThemeId = themeId;
        }
        updateThemeSelection();
      });
    })(t.id);

    scroll.appendChild(card);
  }
}

function updateThemeSelection() {
  var cards = document.querySelectorAll(".date-theme-card");
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].dataset.theme === selectedThemeId) {
      cards[i].classList.add("date-theme-card-active");
    } else {
      cards[i].classList.remove("date-theme-card-active");
    }
  }
}

function populateThemeSelect() {
  var select = document.getElementById("dateScheduleTheme");
  select.innerHTML = '<option value="">Any theme</option>';
  for (var i = 0; i < dateThemes.length; i++) {
    var opt = document.createElement("option");
    opt.value = dateThemes[i].id;
    opt.textContent = dateThemes[i].emoji + " " + dateThemes[i].name;
    select.appendChild(opt);
  }
}

function openThemeModal(themeId) {
  selectedThemeId = themeId;
  var t = dateThemes.find(function (th) { return th.id === themeId; });
  if (!t) return;

  document.getElementById("dateThemeModalEmoji").textContent = t.emoji;
  document.getElementById("dateThemeModalName").textContent = t.name;
  document.getElementById("dateThemeModalTagline").textContent = t.tagline;
  dateThemeModal.style.display = "flex";
}

function closeThemeModal() {
  dateThemeModal.style.display = "none";
}

// ─── Event Listeners ───

document.getElementById("dateStartQuick").addEventListener("click", function () {
  hapticLight();
  startDateNight("quick", selectedThemeId);
});

document.getElementById("dateStartFull").addEventListener("click", function () {
  hapticLight();
  startDateNight("full", selectedThemeId);
});

dateJoinBtn.addEventListener("click", joinDateNight);
dateDeclineBtn.addEventListener("click", declineDateNight);
dateMuteBtn.addEventListener("click", toggleDateMute);
dateCameraBtn.addEventListener("click", toggleDateCamera);
dateEndBtn.addEventListener("click", endDateNight);
dateDoneBtn.addEventListener("click", closeDateEnd);

datePrevBtn.addEventListener("click", function () {
  navigateDateStep(-1);
});

dateNextBtn.addEventListener("click", function () {
  var steps = shuffledSteps.length > 0 ? shuffledSteps : dateNightSteps;
  if (dateCurrentStep >= steps.length - 1) {
    endDateNight();
  } else {
    navigateDateStep(1);
  }
});

dateWYROptionA.addEventListener("click", function () {
  dateWYROptionA.classList.add("selected");
  dateWYROptionB.classList.remove("selected");
});

dateWYROptionB.addEventListener("click", function () {
  dateWYROptionB.classList.add("selected");
  dateWYROptionA.classList.remove("selected");
});

// Theme modal
document.getElementById("dateThemeQuickBtn").addEventListener("click", function () {
  hapticLight();
  closeThemeModal();
  startDateNight("quick", selectedThemeId);
});

document.getElementById("dateThemeFullBtn").addEventListener("click", function () {
  hapticLight();
  closeThemeModal();
  startDateNight("full", selectedThemeId);
});

document.getElementById("dateThemeCancelBtn").addEventListener("click", function () {
  closeThemeModal();
});

dateThemeModal.addEventListener("click", function (e) {
  if (e.target === dateThemeModal) closeThemeModal();
});

// Schedule
var dateScheduleInput = document.getElementById("dateScheduleInput");
var dateScheduleBtn = document.getElementById("dateScheduleBtn");

dateScheduleInput.addEventListener("change", function () {
  dateScheduleBtn.style.display = this.value ? "" : "none";
});

dateScheduleInput.addEventListener("input", function () {
  dateScheduleBtn.style.display = this.value ? "" : "none";
});

dateScheduleBtn.addEventListener("click", function () {
  if (!dateScheduleInput.value) return;
  hapticLight();
  var theme = document.getElementById("dateScheduleTheme").value || null;
  scheduleDate(dateScheduleInput.value, theme);
  dateScheduleInput.value = "";
  dateScheduleBtn.style.display = "none";
});

document.getElementById("dateScheduledIndicator").addEventListener("click", function (e) {
  var cancelBtn = e.target.closest(".date-scheduled-cancel");
  if (!cancelBtn) return;
  var row = cancelBtn.closest(".date-scheduled-row");
  if (!row) return;
  hapticLight();
  removeScheduledDate(parseInt(row.dataset.index));
});

renderDateLanding();
