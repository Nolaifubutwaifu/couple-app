import { app } from "./state.js";
import { nativePickPhoto } from "./utils.js";

var pendingUploadBlob = null;

export async function compressImage(file, maxDimension) {
  maxDimension = maxDimension || 1200;
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round(h * (maxDimension / w));
            w = maxDimension;
          } else {
            w = Math.round(w * (maxDimension / h));
            h = maxDimension;
          }
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          resolve(blob || file);
        }, "image/jpeg", 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadAndSendPhoto(fileOrBlob, questionId, callbacks) {
  if (!app.currentUser || !app.currentCouple) return;

  pendingUploadBlob = fileOrBlob;
  pendingUploadBlob._questionId = questionId;
  pendingUploadBlob._callbacks = callbacks;

  var msgContainer = callbacks.getMessageContainer ? callbacks.getMessageContainer() : null;
  if (msgContainer) {
    showUploadBubble("uploading", msgContainer, questionId, callbacks);
  }

  var compressed = await compressImage(fileOrBlob);

  var ext = "jpg";
  if (fileOrBlob.name) {
    var parts = fileOrBlob.name.split(".");
    if (parts.length > 1) ext = parts.pop().toLowerCase();
  }
  var filename = app.currentUser.id + "_" + Date.now() + "." + ext;
  var path = app.currentCouple.id + "/" + filename;

  var uploadResult = await app.supabase.storage
    .from("photos")
    .upload(path, compressed, { contentType: compressed.type || "image/jpeg" });

  if (uploadResult.error) {
    if (msgContainer) showUploadBubble("error", msgContainer, questionId, callbacks);
    return;
  }

  var urlResult = app.supabase.storage.from("photos").getPublicUrl(path);
  var publicUrl = urlResult.data.publicUrl;

  var result = await app.supabase
    .from("messages")
    .insert({
      couple_id: app.currentCouple.id,
      question_id: questionId,
      sender_id: app.currentUser.id,
      text: "[photo]",
      image_url: publicUrl
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  if (result.error) {
    if (msgContainer) showUploadBubble("error", msgContainer, questionId, callbacks);
    return;
  }

  removeUploadBubble();
  pendingUploadBlob = null;

  if (result.data) {
    addOrReplaceMessage(result.data);
    if (callbacks.renderMessages) callbacks.renderMessages();
    if (callbacks.renderGallery) callbacks.renderGallery();
  }

  if (callbacks.recordEngagement) callbacks.recordEngagement();
  if (callbacks.scheduleMessagesReload) callbacks.scheduleMessagesReload();
}

function showUploadBubble(state, container, questionId, callbacks) {
  removeUploadBubble();

  var bubble = document.createElement("div");
  bubble.id = "uploadProgressBubble";
  bubble.className = "upload-bubble" + (state === "error" ? " upload-bubble-error" : "");

  if (state === "uploading") {
    bubble.innerHTML = '<div class="upload-bubble-spinner"></div> Sending photo...';
  } else if (state === "error") {
    bubble.innerHTML = 'Upload failed ';
    var retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "upload-bubble-retry";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", function () {
      if (pendingUploadBlob) {
        uploadAndSendPhoto(pendingUploadBlob, pendingUploadBlob._questionId, pendingUploadBlob._callbacks);
      }
    });
    bubble.appendChild(retryBtn);
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function removeUploadBubble() {
  var existing = document.getElementById("uploadProgressBubble");
  if (existing) existing.remove();
}

export function addOrReplaceMessage(row) {
  if (!Array.isArray(app.allMessages[row.question_id])) {
    return;
  }

  var formattedMessage = formatMessageRow(row);
  var existingIndex = -1;
  for (var i = 0; i < app.allMessages[row.question_id].length; i++) {
    if (app.allMessages[row.question_id][i].id === formattedMessage.id) {
      existingIndex = i;
      break;
    }
  }

  if (existingIndex >= 0) {
    app.allMessages[row.question_id][existingIndex] = formattedMessage;
  } else {
    app.allMessages[row.question_id].push(formattedMessage);
  }

  app.allMessages[row.question_id].sort(function (a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function formatMessageRow(row) {
  return {
    id: row.id,
    text: row.text,
    imageUrl: row.image_url || null,
    sender: row.sender_id === app.currentUser.id ? "me" : "partner",
    senderName: row.sender_id === app.currentUser.id && app.currentProfile ? app.currentProfile.display_name : getSenderName(row),
    createdAt: row.created_at
  };
}

function getSenderName(row) {
  if (!row.profiles) return "Partner";
  if (Array.isArray(row.profiles)) return row.profiles[0] ? row.profiles[0].display_name : "Partner";
  return row.profiles.display_name || "Partner";
}

export function dataUrlToBlob(dataUrl) {
  var parts = dataUrl.split(",");
  var mime = parts[0].match(/:(.*?);/)[1];
  var bstr = atob(parts[1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);
  for (var i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
