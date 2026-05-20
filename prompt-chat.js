import { app } from "./state.js";
import { getQuestionById, getTodayPrompts } from "./data.js";

export function isDailyPrompt(questionId) {
  const prompts = getTodayPrompts();
  return prompts.some((p) => p.id === questionId);
}

export function getDailyRevealState(questionId) {
  const msgs = app.allMessages[questionId] || [];
  let hasMe = false;
  let hasPartner = false;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].sender === "me") hasMe = true;
    else hasPartner = true;
  }
  return { hasMe, hasPartner, bothAnswered: hasMe && hasPartner };
}

function openGalleryViewerForPhoto(src) {
  const viewer = document.getElementById("galleryViewer");
  const viewerImg = document.getElementById("galleryViewerImg");
  const viewerSender = document.getElementById("galleryViewerSender");
  const viewerDate = document.getElementById("galleryViewerDate");
  viewerImg.src = src;
  viewerSender.textContent = "";
  viewerDate.textContent = "";
  viewer.style.display = "flex";
}

export function openPromptChat(questionId) {
  app.currentQuestionId = questionId;
  const question = getQuestionById(questionId);

  const partnerName = (app.currentCouple && app.currentCouple.partnerName) || "Partner";
  const initial = partnerName.charAt(0).toUpperCase();
  document.getElementById("promptChatAvatar").textContent = initial;
  document.getElementById("promptChatPartnerName").textContent = partnerName.split(" ")[0];
  document.getElementById("promptChatLabel").textContent = question ? question.text : "";

  renderPromptChatMessages();

  const overlay = document.getElementById("promptChatOverlay");
  requestAnimationFrame(() => overlay.classList.add("prompt-chat-visible"));

  setTimeout(() => {
    const input = document.getElementById("promptMessageInput");
    if (input) input.focus();
  }, 350);
}

export function closePromptChat() {
  document.getElementById("promptChatOverlay").classList.remove("prompt-chat-visible");
}

export function renderPromptChatMessages() {
  const promptChatMessages = document.getElementById("promptChatMessages");
  if (!promptChatMessages) return;

  const qid = app.currentQuestionId;
  const msgs = app.allMessages[qid] || [];
  promptChatMessages.innerHTML = "";

  if (app.messagesLoading && msgs.length === 0) {
    const skel = document.createElement("div");
    skel.className = "skeleton-chat-container";
    skel.innerHTML =
      '<div class="skeleton skeleton-bubble skeleton-bubble-me"></div>' +
      '<div class="skeleton skeleton-bubble skeleton-bubble-partner"></div>' +
      '<div class="skeleton skeleton-bubble skeleton-bubble-me" style="width:40%"></div>' +
      '<div class="skeleton skeleton-bubble skeleton-bubble-partner" style="width:55%"></div>';
    promptChatMessages.appendChild(skel);
    return;
  }

  if (msgs.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("emotional-empty");
    if (isDailyPrompt(qid)) {
      emptyState.innerHTML = '<span class="emotional-empty-icon">🤫</span><p class="emotional-empty-title">Today\'s prompt</p><p class="emotional-empty-text">Answer first — your partner\'s response will be revealed once you both reply.</p>';
    } else {
      emptyState.innerHTML = '<span class="emotional-empty-icon">✨</span><p class="emotional-empty-title">No answers yet</p><p class="emotional-empty-text">Be the first to share your thoughts — your partner will see them here.</p>';
    }
    promptChatMessages.appendChild(emptyState);
    return;
  }

  const isDaily = isDailyPrompt(qid);
  const reveal = isDaily ? getDailyRevealState(qid) : null;
  const shouldBlur = isDaily && reveal && !reveal.bothAnswered && !app.dailyRevealed[qid];

  if (isDaily && reveal && reveal.bothAnswered && !app.dailyRevealed[qid]) {
    app.dailyRevealed[qid] = true;
  }

  if (isDaily && !shouldBlur) {
    const revealBanner = document.createElement("div");
    revealBanner.classList.add("reveal-banner");
    if (reveal && reveal.bothAnswered) {
      revealBanner.innerHTML = '<span class="reveal-banner-icon">💕</span> Both answered — here are your thoughts';
    }
    if (revealBanner.innerHTML) promptChatMessages.appendChild(revealBanner);
  }

  for (let i = 0; i < msgs.length; i++) {
    const message = msgs[i];
    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper");
    wrapper.classList.add(message.sender);

    const newMessage = document.createElement("div");
    newMessage.classList.add("message");
    newMessage.classList.add(message.sender);
    if (message.pending) newMessage.classList.add("is-pending");
    if (message.failed) newMessage.classList.add("is-failed");

    const isBlurred = shouldBlur && message.sender !== "me";

    if (message.imageUrl) {
      const img = document.createElement("img");
      img.src = message.imageUrl;
      img.alt = "Photo";
      img.loading = "lazy";
      img.classList.add("prompt-chat-photo");
      img.addEventListener("click", ((src) => () => openGalleryViewerForPhoto(src))(message.imageUrl));
      newMessage.appendChild(img);
    } else {
      const messageParagraph = document.createElement("p");
      messageParagraph.textContent = message.text;
      if (isBlurred) newMessage.classList.add("message-blurred");
      newMessage.appendChild(messageParagraph);
    }

    wrapper.appendChild(newMessage);

    if (message.failed) {
      const failedNote = document.createElement("span");
      failedNote.className = "message-status is-failed";
      failedNote.innerHTML = 'Couldn\'t send · ';
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "message-retry-btn";
      retry.textContent = "Retry";
      retry.dataset.qid = qid;
      retry.dataset.pid = message.id;
      retry.addEventListener("click", function () {
        window.retryPendingMessage(this.dataset.qid, this.dataset.pid);
      });
      failedNote.appendChild(retry);
      wrapper.appendChild(failedNote);
    } else if (message.pending) {
      const pendingNote = document.createElement("span");
      pendingNote.className = "message-status";
      pendingNote.textContent = "Sending...";
      wrapper.appendChild(pendingNote);
    } else if (message.createdAt) {
      const timeEl = document.createElement("span");
      timeEl.classList.add("message-time");
      const d = new Date(message.createdAt);
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      timeEl.textContent = (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + " " + ampm;
      wrapper.appendChild(timeEl);
    }

    promptChatMessages.appendChild(wrapper);
  }

  if (isDaily && shouldBlur) {
    const hint = document.createElement("div");
    hint.classList.add("reveal-hint");
    if (reveal.hasMe && !reveal.hasPartner) {
      hint.innerHTML = '<span class="reveal-hint-icon">⏳</span> Waiting for your partner to answer...';
    } else if (!reveal.hasMe && reveal.hasPartner) {
      hint.innerHTML = '<span class="reveal-hint-icon">🤫</span> Your partner answered — share yours to reveal!';
    }
    promptChatMessages.appendChild(hint);
  }

  promptChatMessages.scrollTop = promptChatMessages.scrollHeight;
}
