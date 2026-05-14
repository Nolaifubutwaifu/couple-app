import { uploadAndSendPhoto, dataUrlToBlob } from "./chat.js";

var cameraOverlay = document.getElementById("cameraOverlay");
var cameraVideo = document.getElementById("cameraVideo");
var cameraCanvas = document.getElementById("cameraCanvas");
var cameraPip = document.getElementById("cameraPip");
var cameraPipImg = document.getElementById("cameraPipImg");
var cameraCaptureBtn = document.getElementById("cameraCaptureBtn");
var cameraCloseBtn = document.getElementById("cameraCloseBtn");
var cameraRetakeBtn = document.getElementById("cameraRetakeBtn");
var cameraSendBtn = document.getElementById("cameraSendBtn");
var cameraStepLabel = document.getElementById("cameraStepLabel");
var cameraPreview = document.getElementById("cameraPreview");
var cameraPreviewImg = document.getElementById("cameraPreviewImg");

var cameraStream = null;
var backPhotoDataUrl = null;
var frontPhotoDataUrl = null;
var cameraPhase = "back";
var hasMultipleCameras = false;

var _getCurrentQuestionId = null;
var _callbacks = null;

export function initCamera(getCurrentQuestionId, callbacks) {
  _getCurrentQuestionId = getCurrentQuestionId;
  _callbacks = callbacks;
}

export async function openCameraOverlay() {
  cameraOverlay.style.display = "flex";
  cameraPhase = "back";
  backPhotoDataUrl = null;
  frontPhotoDataUrl = null;
  cameraPip.style.display = "none";
  cameraPreview.style.display = "none";
  cameraRetakeBtn.style.display = "none";
  cameraSendBtn.style.display = "none";
  cameraCaptureBtn.style.display = "";
  cameraVideo.style.display = "";
  cameraStepLabel.textContent = "Back camera";

  try {
    var devices = await navigator.mediaDevices.enumerateDevices();
    var videoInputs = devices.filter(function (d) { return d.kind === "videoinput"; });
    hasMultipleCameras = videoInputs.length > 1;
  } catch (e) {
    hasMultipleCameras = false;
  }

  await startCamera("environment");
}

async function startCamera(facingMode) {
  stopCamera();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1080 }, height: { ideal: 1440 } },
      audio: false
    });
    cameraVideo.srcObject = cameraStream;
    cameraVideo.style.display = "";
  } catch (err) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraVideo.srcObject = cameraStream;
      cameraVideo.style.display = "";
      hasMultipleCameras = false;
    } catch (err2) {
      closeCameraOverlay();
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (track) { track.stop(); });
    cameraStream = null;
  }
}

function captureFrame() {
  var w = cameraVideo.videoWidth;
  var h = cameraVideo.videoHeight;
  cameraCanvas.width = w;
  cameraCanvas.height = h;
  var ctx = cameraCanvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, w, h);
  return cameraCanvas.toDataURL("image/jpeg", 0.85);
}

cameraCaptureBtn.addEventListener("click", async function () {
  if (cameraPhase === "back") {
    backPhotoDataUrl = captureFrame();

    if (hasMultipleCameras) {
      cameraPhase = "front";
      cameraStepLabel.textContent = "Now your selfie!";
      cameraPip.style.display = "";
      cameraPipImg.src = backPhotoDataUrl;
      await startCamera("user");
    } else {
      showCameraPreview(backPhotoDataUrl);
    }
  } else if (cameraPhase === "front") {
    frontPhotoDataUrl = captureFrame();
    var compositeDataUrl = await compositeBeReal(backPhotoDataUrl, frontPhotoDataUrl);
    showCameraPreview(compositeDataUrl);
  }
});

async function compositeBeReal(backDataUrl, frontDataUrl) {
  return new Promise(function (resolve) {
    var backImg = new Image();
    backImg.onload = function () {
      var frontImg = new Image();
      frontImg.onload = function () {
        var w = backImg.width;
        var h = backImg.height;
        cameraCanvas.width = w;
        cameraCanvas.height = h;
        var ctx = cameraCanvas.getContext("2d");

        ctx.drawImage(backImg, 0, 0, w, h);

        var pipW = Math.round(w * 0.28);
        var pipH = Math.round(pipW * (frontImg.height / frontImg.width));
        var pipX = Math.round(w * 0.03);
        var pipY = Math.round(h * 0.03);
        var pipR = Math.round(w * 0.02);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pipX + pipR, pipY);
        ctx.lineTo(pipX + pipW - pipR, pipY);
        ctx.quadraticCurveTo(pipX + pipW, pipY, pipX + pipW, pipY + pipR);
        ctx.lineTo(pipX + pipW, pipY + pipH - pipR);
        ctx.quadraticCurveTo(pipX + pipW, pipY + pipH, pipX + pipW - pipR, pipY + pipH);
        ctx.lineTo(pipX + pipR, pipY + pipH);
        ctx.quadraticCurveTo(pipX, pipY + pipH, pipX, pipY + pipH - pipR);
        ctx.lineTo(pipX, pipY + pipR);
        ctx.quadraticCurveTo(pipX, pipY, pipX + pipR, pipY);
        ctx.closePath();
        ctx.clip();

        ctx.translate(pipX + pipW, pipY);
        ctx.scale(-1, 1);
        ctx.drawImage(frontImg, 0, 0, pipW, pipH);
        ctx.restore();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pipX + pipR, pipY);
        ctx.lineTo(pipX + pipW - pipR, pipY);
        ctx.quadraticCurveTo(pipX + pipW, pipY, pipX + pipW, pipY + pipR);
        ctx.lineTo(pipX + pipW, pipY + pipH - pipR);
        ctx.quadraticCurveTo(pipX + pipW, pipY + pipH, pipX + pipW - pipR, pipY + pipH);
        ctx.lineTo(pipX + pipR, pipY + pipH);
        ctx.quadraticCurveTo(pipX, pipY + pipH, pipX, pipY + pipH - pipR);
        ctx.lineTo(pipX, pipY + pipR);
        ctx.quadraticCurveTo(pipX, pipY, pipX + pipR, pipY);
        ctx.closePath();
        ctx.stroke();

        resolve(cameraCanvas.toDataURL("image/jpeg", 0.85));
      };
      frontImg.src = frontDataUrl;
    };
    backImg.src = backDataUrl;
  });
}

function showCameraPreview(dataUrl) {
  stopCamera();
  cameraVideo.style.display = "none";
  cameraPip.style.display = "none";
  cameraPreview.style.display = "";
  cameraPreviewImg.src = dataUrl;
  cameraCaptureBtn.style.display = "none";
  cameraRetakeBtn.style.display = "";
  cameraSendBtn.style.display = "";
  cameraStepLabel.textContent = "Preview";
}

cameraRetakeBtn.addEventListener("click", function () {
  openCameraOverlay();
});

cameraSendBtn.addEventListener("click", async function () {
  var dataUrl = cameraPreviewImg.src;
  var blob = dataUrlToBlob(dataUrl);
  closeCameraOverlay();
  var questionId = _getCurrentQuestionId ? _getCurrentQuestionId() : null;
  if (questionId && _callbacks) {
    await uploadAndSendPhoto(blob, questionId, _callbacks);
  }
});

function closeCameraOverlay() {
  stopCamera();
  cameraOverlay.style.display = "none";
  cameraVideo.style.display = "";
  cameraPreview.style.display = "none";
}

cameraCloseBtn.addEventListener("click", closeCameraOverlay);
