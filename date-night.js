import { app } from "./state.js";
import { setStatus } from "./utils.js";
import { loadGameState, saveGameState } from "./games.js";
import { recordEngagement, addBonusHearts } from "./extras.js";
import { dateNightSteps } from "./data.js";

var dateChannel = null;
var datePeerConnection = null;
var dateLocalStream = null;
var dateTimerInterval = null;
var dateCurrentStep = 0;
var dateIsActive = false;

var dateStartBtn = document.getElementById("dateStartBtn");
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

var dateScreenStart = document.getElementById("dateStart");
var dateScreenInvite = document.getElementById("dateInvite");
var dateScreenActive = document.getElementById("dateActive");
var dateScreenEnd = document.getElementById("dateEnd");

function showDateScreen(screen) {
  dateScreenStart.style.display = "none";
  dateScreenInvite.style.display = "none";
  dateScreenActive.style.display = "none";
  dateScreenEnd.style.display = "none";
  screen.style.display = "";
}

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

async function startDateNight() {
  if (!app.currentCouple || app.currentCouple.memberCount < 2) {
    setStatus(dateStartMessage, "You need a partner to start a date.", "error");
    return;
  }

  dateStartBtn.disabled = true;
  setStatus(dateStartMessage, "", "");

  await startLocalVideo();
  setupDateChannel();

  dateCurrentStep = 0;
  dateIsActive = true;

  await saveGameState("date", {
    status: "waiting",
    currentStep: 0,
    initiatedBy: app.currentUser.id,
    startedAt: new Date().toISOString()
  });

  showDateScreen(dateScreenActive);
  renderDateStep(0);

  dateStartBtn.disabled = false;
}

async function joinDateNight() {
  await startLocalVideo();
  setupDateChannel();

  dateIsActive = true;

  var existing = await loadGameState("date");
  dateCurrentStep = existing ? (existing.currentStep || 0) : 0;

  await saveGameState("date", {
    status: "active",
    currentStep: dateCurrentStep,
    initiatedBy: existing ? existing.initiatedBy : app.currentUser.id,
    startedAt: existing ? existing.startedAt : new Date().toISOString()
  });

  showDateScreen(dateScreenActive);
  renderDateStep(dateCurrentStep);

  setTimeout(function () {
    createOffer();
  }, 500);
}

function onPartnerEndedDate() {
  cleanupDateCall();
  showDateScreen(dateScreenEnd);
  recordEngagement();
  addBonusHearts(5);
}

async function endDateNight() {
  if (dateChannel) {
    dateChannel.send({
      type: "broadcast",
      event: "date-end",
      payload: {}
    });
  }

  await saveGameState("date", {
    status: "ended",
    currentStep: dateCurrentStep,
    initiatedBy: null,
    startedAt: null
  });

  cleanupDateCall();
  showDateScreen(dateScreenEnd);
  recordEngagement();
  addBonusHearts(5);
}

async function closeDateEnd() {
  if (app.currentCouple) {
    await app.supabase
      .from("game_states")
      .delete()
      .eq("couple_id", app.currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenStart);
}

async function declineDateNight() {
  if (app.currentCouple) {
    await app.supabase
      .from("game_states")
      .delete()
      .eq("couple_id", app.currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenStart);
}

export function onDateStateFromDB(state) {
  if (!state) return;

  if (state.status === "waiting" && state.initiatedBy !== app.currentUser.id) {
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

async function navigateDateStep(direction) {
  var newStep = dateCurrentStep + direction;
  if (newStep < 0 || newStep >= dateNightSteps.length) return;

  dateCurrentStep = newStep;
  renderDateStep(dateCurrentStep);

  var existing = await loadGameState("date");
  await saveGameState("date", {
    status: existing ? existing.status : "active",
    currentStep: dateCurrentStep,
    initiatedBy: existing ? existing.initiatedBy : app.currentUser.id,
    startedAt: existing ? existing.startedAt : new Date().toISOString()
  });
}

function renderDateStep(index) {
  if (index < 0 || index >= dateNightSteps.length) return;

  var step = dateNightSteps[index];
  dateStepProgress.textContent = (index + 1) + " / " + dateNightSteps.length;

  dateStepQuestion.style.display = "none";
  dateStepChallenge.style.display = "none";
  dateStepWYR.style.display = "none";
  clearDateTimer();

  datePrevBtn.disabled = index === 0;

  if (index >= dateNightSteps.length - 1) {
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

  if (state.status === "waiting") {
    if (state.initiatedBy === app.currentUser.id) {
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

dateStartBtn.addEventListener("click", startDateNight);
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
  if (dateCurrentStep >= dateNightSteps.length - 1) {
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
