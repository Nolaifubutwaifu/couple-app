import { app } from "./state.js";
import { hapticLight, showToast } from "./utils.js";

var callChannel = null;
var callPeerConnection = null;
var callLocalStream = null;
var callTimerInterval = null;
var callStartTime = null;
var callActive = false;
var callMode = "voice";
var isMuted = false;
var isCameraOff = false;
var pendingIncomingMode = null;

var overlay = document.getElementById("callOverlay");
var remoteVideo = document.getElementById("callRemoteVideo");
var localVideo = document.getElementById("callLocalVideo");
var partnerNameEl = document.getElementById("callPartnerName");
var statusEl = document.getElementById("callStatus");
var timerEl = document.getElementById("callTimer");
var muteBtn = document.getElementById("callMuteBtn");
var endBtn = document.getElementById("callEndBtn");
var cameraBtn = document.getElementById("callCameraBtn");
var incomingBackdrop = document.getElementById("callIncomingBackdrop");
var incomingLabel = document.getElementById("callIncomingLabel");
var incomingName = document.getElementById("callIncomingName");
var acceptBtn = document.getElementById("callAcceptBtn");
var declineBtn = document.getElementById("callDeclineBtn");

function getPartnerName() {
  return (app.currentCouple && app.currentCouple.partnerName || "Partner").split(" ")[0];
}

async function getMediaStream(mode) {
  var constraints = mode === "video"
    ? { audio: true, video: true }
    : { audio: true, video: false };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (mode === "video") {
      try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch (e) {}
    }
    return null;
  }
}

function setupCallChannel() {
  if (!app.currentCouple) return;
  if (callChannel) app.supabase.removeChannel(callChannel);

  callChannel = app.supabase.channel("call-" + app.currentCouple.id);

  callChannel.on("broadcast", { event: "call-signal" }, function (msg) {
    handleSignaling(msg.payload);
  });

  callChannel.on("broadcast", { event: "call-invite" }, function (msg) {
    if (!callActive) showIncomingCall(msg.payload);
  });

  callChannel.on("broadcast", { event: "call-accept" }, function () {
    statusEl.textContent = "Connecting...";
    createOffer();
  });

  callChannel.on("broadcast", { event: "call-decline" }, function () {
    showToast("Call declined");
    cleanupCall();
  });

  callChannel.on("broadcast", { event: "call-end" }, function () {
    if (callActive) {
      showToast("Call ended");
      cleanupCall();
    }
  });

  callChannel.subscribe();
}

function createPeerConnection() {
  var pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });

  pc.onicecandidate = function (event) {
    if (event.candidate && callChannel) {
      callChannel.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "ice-candidate", candidate: event.candidate }
      });
    }
  };

  pc.ontrack = function (event) {
    remoteVideo.srcObject = event.streams[0];
    statusEl.textContent = "";
    startTimer();
  };

  pc.onconnectionstatechange = function () {
    if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      showToast("Call disconnected");
      cleanupCall();
    }
  };

  if (callLocalStream) {
    callLocalStream.getTracks().forEach(function (track) {
      pc.addTrack(track, callLocalStream);
    });
  }

  callPeerConnection = pc;
  return pc;
}

async function createOffer() {
  var pc = createPeerConnection();
  var offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  callChannel.send({
    type: "broadcast",
    event: "call-signal",
    payload: { type: "offer", sdp: offer.sdp }
  });
}

async function handleSignaling(msg) {
  if (msg.type === "offer") {
    var pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: msg.sdp }));
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    callChannel.send({
      type: "broadcast",
      event: "call-signal",
      payload: { type: "answer", sdp: answer.sdp }
    });
  } else if (msg.type === "answer") {
    if (callPeerConnection) {
      await callPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: msg.sdp }));
    }
  } else if (msg.type === "ice-candidate") {
    if (callPeerConnection) {
      await callPeerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }
}

function startTimer() {
  callStartTime = Date.now();
  timerEl.textContent = "0:00";
  callTimerInterval = setInterval(function () {
    var elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    var min = Math.floor(elapsed / 60);
    var sec = elapsed % 60;
    timerEl.textContent = min + ":" + (sec < 10 ? "0" : "") + sec;
  }, 1000);
}

function showCallUI(mode) {
  callMode = mode;
  partnerNameEl.textContent = getPartnerName();
  statusEl.textContent = "Calling...";
  timerEl.textContent = "";
  overlay.style.display = "flex";

  if (mode === "video") {
    overlay.classList.add("call-video-mode");
    localVideo.style.display = "";
    cameraBtn.style.display = "";
  } else {
    overlay.classList.remove("call-video-mode");
    localVideo.style.display = "none";
    cameraBtn.style.display = "none";
  }

  isMuted = false;
  isCameraOff = false;
  muteBtn.classList.remove("call-control-active");
  cameraBtn.classList.remove("call-control-active");
}

export async function startCall(mode) {
  if (!app.currentCouple || app.currentCouple.memberCount < 2) {
    showToast("You need a partner to call");
    return;
  }
  if (callActive) return;

  callActive = true;
  callLocalStream = await getMediaStream(mode);
  if (!callLocalStream) {
    showToast("Could not access microphone");
    callActive = false;
    return;
  }

  setupCallChannel();
  showCallUI(mode);

  if (mode === "video" && callLocalStream) {
    localVideo.srcObject = callLocalStream;
  }

  callChannel.send({
    type: "broadcast",
    event: "call-invite",
    payload: { mode: mode, from: (app.currentProfile && app.currentProfile.display_name) || "Partner" }
  });
}

function showIncomingCall(payload) {
  pendingIncomingMode = payload.mode || "voice";
  incomingLabel.textContent = pendingIncomingMode === "video" ? "Incoming video call" : "Incoming voice call";
  incomingName.textContent = payload.from || getPartnerName();
  incomingBackdrop.style.display = "flex";
  hapticLight();
}

async function acceptIncomingCall() {
  incomingBackdrop.style.display = "none";
  callActive = true;
  var mode = pendingIncomingMode || "voice";

  callLocalStream = await getMediaStream(mode);
  if (!callLocalStream) {
    showToast("Could not access microphone");
    callActive = false;
    return;
  }

  setupCallChannel();
  showCallUI(mode);

  if (mode === "video" && callLocalStream) {
    localVideo.srcObject = callLocalStream;
  }

  statusEl.textContent = "Connecting...";

  callChannel.send({
    type: "broadcast",
    event: "call-accept",
    payload: {}
  });
}

function declineIncomingCall() {
  incomingBackdrop.style.display = "none";
  pendingIncomingMode = null;

  if (!callChannel) {
    var tempChannel = app.supabase.channel("call-" + app.currentCouple.id);
    tempChannel.subscribe(function () {
      tempChannel.send({ type: "broadcast", event: "call-decline", payload: {} });
      setTimeout(function () { app.supabase.removeChannel(tempChannel); }, 500);
    });
  } else {
    callChannel.send({ type: "broadcast", event: "call-decline", payload: {} });
  }
}

function cleanupCall() {
  if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }

  if (callPeerConnection) { callPeerConnection.close(); callPeerConnection = null; }

  if (callLocalStream) {
    callLocalStream.getTracks().forEach(function (t) { t.stop(); });
    callLocalStream = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  overlay.style.display = "none";

  if (callChannel) {
    app.supabase.removeChannel(callChannel);
    callChannel = null;
  }

  callActive = false;
  callStartTime = null;
  pendingIncomingMode = null;
}

function endCall() {
  if (callChannel) {
    callChannel.send({ type: "broadcast", event: "call-end", payload: {} });
  }
  cleanupCall();
}

// Subscribe to incoming calls when app loads
export function initCallListener() {
  if (!app.currentCouple) return;

  var listenChannel = app.supabase.channel("call-" + app.currentCouple.id);

  listenChannel.on("broadcast", { event: "call-invite" }, function (msg) {
    if (!callActive) showIncomingCall(msg.payload);
  });

  listenChannel.subscribe();
}

export function cleanupCallChannel() {
  cleanupCall();
}

// Controls
muteBtn.addEventListener("click", function () {
  hapticLight();
  isMuted = !isMuted;
  if (callLocalStream) {
    callLocalStream.getAudioTracks().forEach(function (t) { t.enabled = !isMuted; });
  }
  muteBtn.classList.toggle("call-control-active", isMuted);
});

cameraBtn.addEventListener("click", function () {
  hapticLight();
  isCameraOff = !isCameraOff;
  if (callLocalStream) {
    callLocalStream.getVideoTracks().forEach(function (t) { t.enabled = !isCameraOff; });
  }
  cameraBtn.classList.toggle("call-control-active", isCameraOff);
});

endBtn.addEventListener("click", function () {
  hapticLight();
  endCall();
});

acceptBtn.addEventListener("click", function () {
  hapticLight();
  acceptIncomingCall();
});

declineBtn.addEventListener("click", function () {
  hapticLight();
  declineIncomingCall();
});
