import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style as StatusBarStyle } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { promptCategorySections, questions, dateThemes } from "./data.js";
import { app } from "./state.js";
import {
  hapticLight,
  setStatus,
  getReadableError,
  showToast,
  sendLocalNotification,
  requestNotificationPermission,
  scheduleDailyPromptReminder,
  nativeClipboardWrite,
  nativePickPhoto,
  escapeHTML
} from "./utils.js";
import { subscribeToPresence, cleanupPresence, isPartnerOnline, setPresenceChangeCallback } from "./presence.js";
import { getMyGameRole, subscribeToGameStates } from "./games.js";
import {
  loadStreak,
  loadCoupleStats,
  saveCoupleStats,
  recordEngagement,
  clearCountdownInterval,
  clearStreakTimerInterval,
  setHugCount,
  getLongestStreak
} from "./extras.js";
import { addOrReplaceMessage, formatMessageRow, uploadAndSendPhoto, dataUrlToBlob } from "./chat.js";
import { cleanupDateCall, onDateStateFromDB, checkExistingDateSession, loadScheduledDate, renderDateLanding, loadDateHistory } from "./date-night.js";
import { renderProfileTab, initProfile, loadSettings, initSettings, initInviteButtons } from "./profile.js";
import { initMoments, loadTodayMoments, getMomentsCount, cleanupMomentsChannel } from "./moments.js";
import { initShop, updateShopBalance, applyEquippedEffects, renderInventory } from "./shop.js";
import { renderAchievements } from "./achievements.js";
import { startCall, initCallListener, cleanupCallChannel } from "./call.js";
import { needsOnboarding, startOnboarding } from "./onboarding.js";


// ─── Supabase ───

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);
app.supabase = supabase;

// ─── Capacitor Native Bridge ───

app.isNative = Capacitor.isNativePlatform();

async function initNative() {
  if (!app.isNative) return;

  try {
    await StatusBar.setStyle({ style: StatusBarStyle.Light });
    await StatusBar.setBackgroundColor({ color: "#faf5f0" });
  } catch (e) {}

  try {
    await SplashScreen.hide();
  } catch (e) {}

  try {
    Keyboard.addListener("keyboardWillShow", function () {
      document.body.classList.add("keyboard-open");
      var chatEl = document.getElementById("promptChatMessages");
      if (chatEl) setTimeout(function () { chatEl.scrollTop = chatEl.scrollHeight; }, 100);
    });
    Keyboard.addListener("keyboardWillHide", function () {
      document.body.classList.remove("keyboard-open");
    });
  } catch (e) {}
}

initNative();

// ─── Offline Detection ───

var offlineBanner = document.getElementById("offlineBanner");

function updateOfflineStatus() {
  if (navigator.onLine) {
    offlineBanner.classList.remove("offline-banner-visible");
  } else {
    offlineBanner.classList.add("offline-banner-visible");
  }
}

window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);
updateOfflineStatus();

// ─── DOM Elements ───

var topicsSection = document.getElementById("topicsSection");
var activeChatsList = document.getElementById("activeChatsList");
var activeChatsSection = document.getElementById("activeChatsSection");

var promptChatOverlay = document.getElementById("promptChatOverlay");
var promptChatBack = document.getElementById("promptChatBack");
var promptChatAvatar = document.getElementById("promptChatAvatar");
var promptChatPartnerName = document.getElementById("promptChatPartnerName");
var promptChatLabel = document.getElementById("promptChatLabel");
var promptChatMessages = document.getElementById("promptChatMessages");
var promptMessageInput = document.getElementById("promptMessageInput");
var promptSendButton = document.getElementById("promptSendButton");
var promptPhotoButton = document.getElementById("promptPhotoButton");
var promptPhotoInput = document.getElementById("promptPhotoInput");
var questionPopupBackdrop = document.getElementById("questionPopupBackdrop");
var questionPopupClose = document.getElementById("questionPopupClose");
var questionPopupLabel = document.getElementById("questionPopupLabel");
var questionPopupText = document.getElementById("questionPopupText");
var questionPopupInput = document.getElementById("questionPopupInput");
var questionPopupSend = document.getElementById("questionPopupSend");
var questionPopupSkip = document.getElementById("questionPopupSkip");
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const authMessage = document.getElementById("authMessage");
const signedInText = document.getElementById("signedInText");
const coupleStatusText = document.getElementById("coupleStatusText");
const logoutButton = document.getElementById("logoutButton");
const coupleSetup = document.getElementById("coupleSetup");
const mainExperience = document.getElementById("mainExperience");
const createCoupleButton = document.getElementById("createCoupleButton");
const inviteCard = document.getElementById("inviteCard");
const inviteCodeText = document.getElementById("inviteCodeText");
const inviteCodeInput = document.getElementById("inviteCodeInput");
const joinCoupleButton = document.getElementById("joinCoupleButton");
const coupleMessage = document.getElementById("coupleMessage");
const appStatusMessage = document.getElementById("appStatusMessage");
const homeGreetingText = document.getElementById("homeGreetingText");
const homeGreetingTitle = document.getElementById("homeGreetingTitle");
const homeConnectedText = document.getElementById("homeConnectedText");
const homeGreetingAvatar = document.getElementById("homeGreetingAvatar");
const timezoneCard = document.getElementById("timezoneCard");
const tzYourLabel = document.getElementById("tzYourLabel");
const tzYourTime = document.getElementById("tzYourTime");
const tzPartnerLabel = document.getElementById("tzPartnerLabel");
const tzPartnerTime = document.getElementById("tzPartnerTime");

let currentCategoryId = promptCategorySections[0].categories[0].id;
let currentQuestionId = getQuestionsForCategory(currentCategoryId)[0].id;

app.allMessages = createEmptyMessages();

function createEmptyMessages() {
  const messages = {};

  for (let i = 0; i < questions.length; i++) {
    messages[questions[i].id] = [];
  }

  return messages;
}

function setAuthBusy(isBusy) {
  loginButton.disabled = isBusy;
  signupButton.disabled = isBusy;
}

function setCoupleBusy(isBusy) {
  createCoupleButton.disabled = isBusy;
  joinCoupleButton.disabled = isBusy;
}

function getCategoryById(categoryId) {
  for (let i = 0; i < promptCategorySections.length; i++) {
    for (let j = 0; j < promptCategorySections[i].categories.length; j++) {
      if (promptCategorySections[i].categories[j].id === categoryId) {
        return promptCategorySections[i].categories[j];
      }
    }
  }

  return null;
}

function getQuestionById(questionId) {
  for (let i = 0; i < questions.length; i++) {
    if (questions[i].id === questionId) {
      return questions[i];
    }
  }

  return null;
}

function getQuestionsForCategory(categoryId) {
  const matchingQuestions = [];

  for (let i = 0; i < questions.length; i++) {
    if (questions[i].categoryId === categoryId) {
      matchingQuestions.push(questions[i]);
    }
  }

  return matchingQuestions;
}

function getCategoryProgress(categoryId) {
  const questionsForCategory = getQuestionsForCategory(categoryId);
  let answeredQuestions = 0;

  if (questionsForCategory.length === 0) {
    return 0;
  }

  for (let i = 0; i < questionsForCategory.length; i++) {
    const messages = app.allMessages[questionsForCategory[i].id];

    if (Array.isArray(messages) && messages.length > 0) {
      answeredQuestions++;
    }
  }

  return Math.round((answeredQuestions / questionsForCategory.length) * 100);
}

function showCategories() {
  topicsSection.innerHTML = "";

  var sectionColors = ["rose", "lavender", "mint", "peach", "sky", "rose", "lavender"];

  for (var i = 0; i < promptCategorySections.length; i++) {
    var section = promptCategorySections[i];

    var headingRow = document.createElement("div");
    headingRow.classList.add("topics-heading-row");

    var heading = document.createElement("h2");
    heading.classList.add("topics-heading");
    heading.textContent = section.title;
    headingRow.appendChild(heading);

    var seeAll = document.createElement("span");
    seeAll.classList.add("topics-see-all");
    seeAll.textContent = "See all";
    headingRow.appendChild(seeAll);

    topicsSection.appendChild(headingRow);

    var grid = document.createElement("div");
    grid.classList.add("topic-pill-grid");

    for (var j = 0; j < section.categories.length; j++) {
      var cat = section.categories[j];
      var pill = document.createElement("button");
      pill.type = "button";
      pill.classList.add("topic-pill-btn");
      pill.classList.add("topic-pill--" + sectionColors[i % sectionColors.length]);
      pill.textContent = cat.label;

      (function (categoryId) {
        pill.addEventListener("click", function () {
          hapticLight();
          currentCategoryId = categoryId;
          var qs = getQuestionsForCategory(categoryId);
          var unanswered = [];
          for (var k = 0; k < qs.length; k++) {
            var msgs = app.allMessages[qs[k].id] || [];
            var iAnswered = false;
            for (var m = 0; m < msgs.length; m++) {
              if (msgs[m].sender === "me") { iAnswered = true; break; }
            }
            if (!iAnswered) unanswered.push(qs[k]);
          }
          var target = unanswered.length > 0 ? unanswered[0] : qs[0];
          currentQuestionId = target.id;
          if (unanswered.length > 0) {
            openQuestionPopup(currentQuestionId);
          } else {
            openPromptChat(currentQuestionId);
          }
        });
      })(cat.id);

      grid.appendChild(pill);
    }

    topicsSection.appendChild(grid);
  }
}




function renderActiveConversations() {
  activeChatsList.innerHTML = "";

  var answered = [];
  for (var i = 0; i < questions.length; i++) {
    var msgs = app.allMessages[questions[i].id] || [];
    if (msgs.length > 0) {
      answered.push({ question: questions[i], messages: msgs });
    }
  }

  var emptyEl = document.getElementById("activeChatsEmpty");
  if (answered.length === 0) {
    if (emptyEl) emptyEl.style.display = "";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  for (var i = 0; i < answered.length; i++) {
    var q = answered[i].question;
    var msgs = answered[i].messages;
    var cat = getCategoryById(q.categoryId);

    var hasMe = false;
    var hasPartner = false;
    var partnerName = "";
    for (var m = 0; m < msgs.length; m++) {
      if (msgs[m].sender === "me") hasMe = true;
      else { hasPartner = true; partnerName = msgs[m].senderName; }
    }

    var row = document.createElement("button");
    row.type = "button";
    row.classList.add("active-chat-row");

    var accent = document.createElement("span");
    accent.classList.add("active-chat-accent");
    if (cat) accent.classList.add("active-chat-accent--" + cat.theme);

    var body = document.createElement("div");
    body.classList.add("active-chat-body");

    var title = document.createElement("span");
    title.classList.add("active-chat-title");
    title.textContent = q.text;

    body.appendChild(title);

    if (!hasMe || !hasPartner) {
      var status = document.createElement("span");
      status.classList.add("active-chat-status");
      if (hasMe && !hasPartner) {
        var waitName = (app.currentCouple && app.currentCouple.partnerName)
          ? app.currentCouple.partnerName.split(" ")[0]
          : "partner";
        status.textContent = "Waiting for " + waitName;
      } else if (!hasMe && hasPartner) {
        status.textContent = "Your turn to answer";
        status.classList.add("active-chat-status-turn");
      }
      body.appendChild(status);
    } else {
      var status = document.createElement("span");
      status.classList.add("active-chat-status");
      status.classList.add("active-chat-status-done");
      status.textContent = "Both answered";
      body.appendChild(status);
    }

    var chevron = document.createElement("span");
    chevron.classList.add("active-chat-chevron");
    chevron.textContent = "›";

    row.appendChild(accent);
    row.appendChild(body);
    row.appendChild(chevron);
    activeChatsList.appendChild(row);

    (function (questionId) {
      row.addEventListener("click", function () {
        currentQuestionId = questionId;
        var qObj = getQuestionById(questionId);
        if (qObj) currentCategoryId = qObj.categoryId;
        openPromptChat(questionId);
      });
    })(q.id);
  }
}

// ─── Question Answer Popup ───

var popupFromDailyPrompts = false;

function openQuestionPopup(questionId, fromDaily) {
  currentQuestionId = questionId;
  popupFromDailyPrompts = !!fromDaily;
  var question = getQuestionById(questionId);
  var cat = getCategoryById(question ? question.categoryId : "");
  questionPopupLabel.textContent = cat ? cat.label : "";
  questionPopupText.textContent = question ? question.text : "";
  questionPopupInput.value = "";
  questionPopupBackdrop.classList.add("visible");
  setTimeout(function () { questionPopupInput.focus(); }, 350);
}

function closeQuestionPopup() {
  questionPopupBackdrop.classList.remove("visible");
  questionPopupInput.value = "";
}

function skipPopupQuestion() {
  var question = getQuestionById(currentQuestionId);
  if (!question) return;
  var qs = getQuestionsForCategory(question.categoryId);
  var currentIdx = -1;
  for (var i = 0; i < qs.length; i++) {
    if (qs[i].id === currentQuestionId) { currentIdx = i; break; }
  }
  var nextId = null;
  for (var j = 1; j < qs.length; j++) {
    var candidate = qs[(currentIdx + j) % qs.length];
    var msgs = app.allMessages[candidate.id] || [];
    var answered = msgs.some(function (m) { return m.sender === "me"; });
    if (!answered) { nextId = candidate.id; break; }
  }
  if (!nextId) nextId = qs[(currentIdx + 1) % qs.length].id;
  openQuestionPopup(nextId);
}

async function sendPopupAnswer() {
  var text = questionPopupInput.value.trim();
  if (text === "" || !app.currentUser || !app.currentCouple) return;

  questionPopupSend.disabled = true;

  var result = await supabase
    .from("messages")
    .insert({
      couple_id: app.currentCouple.id,
      question_id: currentQuestionId,
      sender_id: app.currentUser.id,
      text: text
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  questionPopupSend.disabled = false;

  if (result.error) {
    showToast("Could not send. Try again.");
    return;
  }

  questionPopupInput.value = "";

  if (result.data) {
    addOrReplaceMessage(result.data);
  }

  renderActiveConversations();
  currentTodayIndex = 0;
  renderTodayCard();
  renderHomeScreen();
  recordEngagement();
  scheduleMessagesReload();

  if (popupFromDailyPrompts) {
    var allPrompts = getTodayPrompts();
    var nextUnanswered = null;
    for (var i = 0; i < allPrompts.length; i++) {
      if (allPrompts[i].id === currentQuestionId) continue;
      var rev = getDailyRevealState(allPrompts[i].id);
      if (!rev.hasMe) { nextUnanswered = allPrompts[i]; break; }
    }
    if (nextUnanswered) {
      openQuestionPopup(nextUnanswered.id, true);
      return;
    }
  }
  closeQuestionPopup();
}

// ─── Prompt Chat Overlay ───

function openPromptChat(questionId) {
  currentQuestionId = questionId;
  var question = getQuestionById(questionId);

  var partnerName = (app.currentCouple && app.currentCouple.partnerName) || "Partner";
  var initial = partnerName.charAt(0).toUpperCase();
  promptChatAvatar.textContent = initial;
  promptChatPartnerName.textContent = partnerName.split(" ")[0];
  promptChatLabel.textContent = question ? question.text : "";

  renderPromptChatMessages();

  requestAnimationFrame(function () {
    promptChatOverlay.classList.add("prompt-chat-visible");
  });

  setTimeout(function () { promptMessageInput.focus(); }, 350);
}

function closePromptChat() {
  promptChatOverlay.classList.remove("prompt-chat-visible");
}

function renderPromptChatMessages() {
  var msgs = app.allMessages[currentQuestionId] || [];
  promptChatMessages.innerHTML = "";

  if (msgs.length === 0) {
    var emptyState = document.createElement("div");
    emptyState.classList.add("emotional-empty");

    if (isDailyPrompt(currentQuestionId)) {
      emptyState.innerHTML = '<span class="emotional-empty-icon">🤫</span><p class="emotional-empty-title">Today\'s prompt</p><p class="emotional-empty-text">Answer first — your partner\'s response will be revealed once you both reply.</p>';
    } else {
      emptyState.innerHTML = '<span class="emotional-empty-icon">✨</span><p class="emotional-empty-title">No answers yet</p><p class="emotional-empty-text">Be the first to share your thoughts — your partner will see them here.</p>';
    }
    promptChatMessages.appendChild(emptyState);
    return;
  }

  var isDaily = isDailyPrompt(currentQuestionId);
  var reveal = isDaily ? getDailyRevealState(currentQuestionId) : null;
  var shouldBlur = isDaily && reveal && !reveal.bothAnswered && !dailyRevealed[currentQuestionId];

  if (isDaily && reveal && reveal.bothAnswered && !dailyRevealed[currentQuestionId]) {
    dailyRevealed[currentQuestionId] = true;
  }

  if (isDaily && !shouldBlur) {
    var revealBanner = document.createElement("div");
    revealBanner.classList.add("reveal-banner");
    if (reveal && reveal.bothAnswered) {
      revealBanner.innerHTML = '<span class="reveal-banner-icon">💕</span> Both answered — here are your thoughts';
    }
    if (revealBanner.innerHTML) promptChatMessages.appendChild(revealBanner);
  }

  for (var i = 0; i < msgs.length; i++) {
    var message = msgs[i];
    var wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper");
    wrapper.classList.add(message.sender);

    var newMessage = document.createElement("div");
    newMessage.classList.add("message");
    newMessage.classList.add(message.sender);

    var isBlurred = shouldBlur && message.sender !== "me";

    if (message.imageUrl) {
      var img = document.createElement("img");
      img.src = message.imageUrl;
      img.alt = "Photo";
      img.loading = "lazy";
      img.classList.add("prompt-chat-photo");
      img.addEventListener("click", (function (src) {
        return function () { openGalleryViewerForPhoto(src); };
      })(message.imageUrl));
      newMessage.appendChild(img);
    } else {
      var messageParagraph = document.createElement("p");
      messageParagraph.textContent = message.text;
      if (isBlurred) {
        newMessage.classList.add("message-blurred");
      }
      newMessage.appendChild(messageParagraph);
    }

    wrapper.appendChild(newMessage);

    if (message.createdAt) {
      var timeEl = document.createElement("span");
      timeEl.classList.add("message-time");
      var d = new Date(message.createdAt);
      var hours = d.getHours();
      var minutes = d.getMinutes();
      var ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      timeEl.textContent = (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + " " + ampm;
      wrapper.appendChild(timeEl);
    }

    promptChatMessages.appendChild(wrapper);
  }

  if (isDaily && shouldBlur) {
    var hint = document.createElement("div");
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

function openGalleryViewerForPhoto(src) {
  var viewer = document.getElementById("galleryViewer");
  var viewerImg = document.getElementById("galleryViewerImg");
  var viewerSender = document.getElementById("galleryViewerSender");
  var viewerDate = document.getElementById("galleryViewerDate");
  viewerImg.src = src;
  viewerSender.textContent = "";
  viewerDate.textContent = "";
  viewer.style.display = "flex";
}

var dailyRevealed = {};

function isDailyPrompt(questionId) {
  var prompts = getTodayPrompts();
  return prompts.some(function (p) { return p.id === questionId; });
}

function getDailyRevealState(questionId) {
  var msgs = app.allMessages[questionId] || [];
  var hasMe = false;
  var hasPartner = false;
  for (var i = 0; i < msgs.length; i++) {
    if (msgs[i].sender === "me") hasMe = true;
    else hasPartner = true;
  }
  return { hasMe: hasMe, hasPartner: hasPartner, bothAnswered: hasMe && hasPartner };
}

function renderPromptExperience() {
  showCategories();
  renderActiveConversations();
  if (promptChatOverlay.classList.contains("prompt-chat-visible")) {
    renderPromptChatMessages();
  }
}

function showCoupleSetup() {
  coupleSetup.style.display = "block";
  mainExperience.style.display = "none";
  document.getElementById("onboardingStep1").style.display = "";
  document.getElementById("onboardingStep2").style.display = "none";
  setStatus(coupleMessage, "", "");
}

function showMainExperience() {
  coupleSetup.style.display = "none";
  mainExperience.style.display = "block";
  renderHomeScreen();
  updateFeatureLocks();
  setStatus(appStatusMessage, "", "");
}

function renderGreeting() {
  if (!app.currentProfile) return;

  var hour = new Date().getHours();
  var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  var firstName = (app.currentProfile.display_name || "").split(" ")[0];

  homeGreetingText.textContent = greeting + ", " + firstName + " 👋";

  if (app.currentCouple && app.currentCouple.partnerName) {
    homeGreetingTitle.textContent = "You & " + app.currentCouple.partnerName.split(" ")[0];
  } else {
    homeGreetingTitle.textContent = firstName;
  }

  var avatarImg = document.getElementById("homeGreetingAvatarImg");
  if (app.currentProfile.avatar_url) {
    avatarImg.src = app.currentProfile.avatar_url;
    avatarImg.style.display = "";
    homeGreetingAvatar.style.fontSize = "0";
  } else {
    avatarImg.style.display = "none";
    homeGreetingAvatar.style.fontSize = "";
    homeGreetingAvatar.childNodes.forEach(function (n) {
      if (n.nodeType === 3) n.remove();
    });
    homeGreetingAvatar.insertBefore(document.createTextNode(firstName.charAt(0).toUpperCase()), homeGreetingAvatar.firstChild);
  }
}

// ─── Home Dashboard Sections ───

var coupleCardDot = document.getElementById("coupleCardDot");
var coupleCardStatusText = document.getElementById("coupleCardStatusText");
var connectionLabel = document.getElementById("connectionLabel");
var connectionTitle = document.getElementById("connectionTitle");
var connectionSubtitle = document.getElementById("connectionSubtitle");
var connectionAction = document.getElementById("connectionAction");
var coupleLogSummary = document.getElementById("coupleLogSummary");
var coupleLogDate = document.getElementById("coupleLogDate");
var datePreviewStatus = document.getElementById("datePreviewStatus");
var activityFeedList = document.getElementById("activityFeedList");
var activityFeedEmpty = document.getElementById("activityFeedEmpty");

function renderCoupleCard() {
  renderGreeting();
  applyEquippedEffects();

  var online = isPartnerOnline();
  if (online) {
    coupleCardDot.classList.add("online");
    coupleCardStatusText.textContent = "Online now";
  } else {
    coupleCardDot.classList.remove("online");
    coupleCardStatusText.textContent = app.currentCouple && app.currentCouple.partnerName ? "Offline" : "";
  }
}

setPresenceChangeCallback(function () {
  renderCoupleCard();
});

var connectionActionType = null;

function setConnectionCard(type, label, title, subtitle, btn) {
  connectionActionType = type;
  connectionLabel.textContent = label;
  connectionTitle.textContent = title;
  connectionSubtitle.textContent = subtitle;
  connectionAction.innerHTML = btn + ' <span class="connection-card-btn-arrow">→</span>';
}

function renderTodayConnection() {
  var mc = getMomentsCount();
  if (mc.myCount === 0 && mc.partnerCount === 0) {
    setConnectionCard("moment", "tiny moment", "Share a tiny moment", "Even a small one makes the day brighter", "Capture now");
    return;
  }

  var allPrompts = getTodayPrompts();
  var unansweredCount = 0;
  for (var i = 0; i < allPrompts.length; i++) {
    var rev = getDailyRevealState(allPrompts[i].id);
    if (!rev.hasMe) unansweredCount++;
  }
  if (unansweredCount > 0) {
    setConnectionCard("prompt", "today's question", "Answer today's question", "You have " + unansweredCount + " unanswered prompt" + (unansweredCount > 1 ? "s" : "") + " waiting", "Let's go");
    return;
  }

  var scheduled = loadScheduledDate();
  if (!scheduled || !scheduled.datetime) {
    setConnectionCard("date", "date night", "Plan your next date", "Pick a night and make it yours", "Plan one");
    return;
  }

  setConnectionCard("chat", "little note", "Send a little note", "A few words go a long way", "Open chat");
}

function timeAgo(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  var days = Math.floor(hours / 24);
  return days + "d ago";
}

function renderCoupleLog() {
  var now = new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  coupleLogDate.textContent = months[now.getMonth()] + " " + now.getDate();

  var todayStr = now.toISOString().split("T")[0];
  var myCount = 0;
  var partnerCount = 0;
  var keys = Object.keys(app.allMessages);
  for (var i = 0; i < keys.length; i++) {
    var msgs = app.allMessages[keys[i]];
    for (var j = 0; j < msgs.length; j++) {
      if (msgs[j].createdAt && msgs[j].createdAt.startsWith(todayStr)) {
        if (msgs[j].sender === "me") myCount++;
        else partnerCount++;
      }
    }
  }

  var mc = getMomentsCount();
  myCount += mc.myCount;
  partnerCount += mc.partnerCount;

  coupleLogSummary.innerHTML = "";

  if (myCount === 0 && partnerCount === 0) {
    coupleLogSummary.innerHTML = '<p class="couple-log-empty">No moments today yet — be the first!</p>';
    return;
  }

  var myName = (app.currentProfile && app.currentProfile.display_name || "You").split(" ")[0];
  var partnerName = (app.currentCouple && app.currentCouple.partnerName || "Partner").split(" ")[0];

  if (myCount > 0) {
    var line = document.createElement("div");
    line.className = "couple-log-line";
    line.innerHTML = '<span class="couple-log-avatar">' + myName.charAt(0).toUpperCase() + '</span>' +
      '<span>' + myName + ': ' + myCount + ' moment' + (myCount > 1 ? 's' : '') + '</span>';
    coupleLogSummary.appendChild(line);
  }
  if (partnerCount > 0) {
    var line2 = document.createElement("div");
    line2.className = "couple-log-line";
    line2.innerHTML = '<span class="couple-log-avatar">' + partnerName.charAt(0).toUpperCase() + '</span>' +
      '<span>' + partnerName + ': ' + partnerCount + ' moment' + (partnerCount > 1 ? 's' : '') + '</span>';
    coupleLogSummary.appendChild(line2);
  }
}

function renderDateNightPreview() {
  var card = document.getElementById("datePreviewCard");
  var scheduledEl = document.getElementById("datePreviewScheduled");
  var iconEl = document.getElementById("datePreviewIcon");

  card.classList.remove("date-preview-has-scheduled");
  scheduledEl.style.display = "none";
  iconEl.textContent = "🌙";

  if (app.lastSavedGameState && app.lastSavedGameState.date) {
    datePreviewStatus.textContent = "Date night in progress!";
    document.getElementById("datePreviewAction").textContent = "Continue";
    return;
  }

  var scheduled = loadScheduledDate();
  if (scheduled && scheduled.datetime) {
    card.classList.add("date-preview-has-scheduled");
    iconEl.textContent = "📅";

    var d = new Date(scheduled.datetime);
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var hours = d.getHours();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    var minutes = d.getMinutes();

    document.getElementById("datePreviewDay").textContent = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate();
    document.getElementById("datePreviewTime").textContent = hours + ":" + (minutes < 10 ? "0" : "") + minutes + " " + ampm;

    var themeEl = document.getElementById("datePreviewTheme");
    if (scheduled.theme) {
      var t = dateThemes.find(function (th) { return th.id === scheduled.theme; });
      if (t) {
        themeEl.textContent = t.emoji + " " + t.name;
        themeEl.style.display = "";
      } else {
        themeEl.style.display = "none";
      }
    } else {
      themeEl.style.display = "none";
    }

    scheduledEl.style.display = "";
    datePreviewStatus.textContent = "You have a date coming up!";
    document.getElementById("datePreviewAction").textContent = "View";
    return;
  }

  datePreviewStatus.textContent = "Plan your next date night together";
  document.getElementById("datePreviewAction").textContent = "Start a date night";
}

function renderPartnerFeed() {
  var items = [];
  var keys = Object.keys(app.allMessages);
  for (var i = 0; i < keys.length; i++) {
    var questionId = keys[i];
    var msgs = app.allMessages[questionId];
    for (var j = 0; j < msgs.length; j++) {
      var msg = msgs[j];
      var name = msg.sender === "me"
        ? (app.currentProfile && app.currentProfile.display_name || "You").split(" ")[0]
        : (app.currentCouple && app.currentCouple.partnerName || "Partner").split(" ")[0];
      var action = msg.imageUrl ? "shared a photo" : "answered a prompt";
      items.push({ text: name + " " + action, time: msg.createdAt, type: msg.imageUrl ? "photo" : "prompt" });
    }
  }

  items.sort(function (a, b) { return new Date(b.time) - new Date(a.time); });

  var stacked = [];
  for (var s = 0; s < items.length; s++) {
    var prev = stacked.length > 0 ? stacked[stacked.length - 1] : null;
    if (prev && prev.text === items[s].text) {
      prev.count++;
    } else {
      stacked.push({ text: items[s].text, time: items[s].time, type: items[s].type, count: 1 });
    }
  }
  stacked = stacked.slice(0, 8);

  activityFeedList.innerHTML = "";
  if (stacked.length === 0) {
    activityFeedList.innerHTML = '<p class="activity-feed-empty">No activity yet — answer a prompt to get started!</p>';
    return;
  }

  for (var k = 0; k < stacked.length; k++) {
    var label = stacked[k].text + (stacked[k].count > 1 ? " " + stacked[k].count + "x" : "");
    var row = document.createElement("div");
    row.className = "activity-feed-row";
    row.innerHTML =
      '<span class="activity-feed-dot type-' + stacked[k].type + '"></span>' +
      '<span class="activity-feed-text">' + escapeHTML(label) + '</span>' +
      '<span class="activity-feed-time">' + timeAgo(stacked[k].time) + '</span>';
    activityFeedList.appendChild(row);
  }
}

function renderRelationshipStats() {
  var questionsAnswered = 0;
  var keys = Object.keys(app.allMessages);
  for (var i = 0; i < keys.length; i++) {
    var msgs = app.allMessages[keys[i]];
    if (msgs && msgs.length > 0) questionsAnswered++;
  }

  var mc = getMomentsCount();
  var totalMoments = mc.myCount + mc.partnerCount;

  document.getElementById("statQuestionsAnswered").textContent = questionsAnswered;
  document.getElementById("statDateNights").textContent = "0";
  document.getElementById("statMomentsShared").textContent = totalMoments;
  document.getElementById("statLongestStreak").textContent = getLongestStreak();
}

function renderHomeScreen() {
  renderCoupleCard();
  renderTodayConnection();
  renderTodayCard();
  renderCoupleLog();
  renderDateNightPreview();
  renderPartnerFeed();
  renderRelationshipStats();
}


function getTodayPrompts() {
  var today = new Date();
  var dayIndex = today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate();
  var prompts = [];
  for (var i = 0; i < 3; i++) {
    prompts.push(questions[(dayIndex * 3 + i) % questions.length]);
  }
  return prompts;
}

var currentTodayIndex = 0;

function renderTodayCard() {
  renderTodayCardInto("todayStack", "todayStackInner");
  renderChatsTodayCard();
}

function renderChatsTodayCard() {
  renderTodayCardInto("chatsTodayStack", "chatsTodayStackInner");
}

function renderTodayCardInto(stackId, innerId) {
  var stack = document.getElementById(stackId);
  var inner = document.getElementById(innerId);
  if (!stack || !inner) return;

  var allPrompts = getTodayPrompts();
  var unanswered = [];
  var answered = [];
  for (var p = 0; p < allPrompts.length; p++) {
    var rev = getDailyRevealState(allPrompts[p].id);
    if (rev.hasMe) {
      answered.push(allPrompts[p]);
    } else {
      unanswered.push(allPrompts[p]);
    }
  }

  if (unanswered.length === 0 && answered.length === 0) {
    stack.style.display = "none";
    return;
  }

  var now = new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var dateStr = months[now.getMonth()] + " " + now.getDate();

  inner.innerHTML = "";

  if (unanswered.length === 0) {
    var doneCard = document.createElement("section");
    doneCard.classList.add("today-card");
    doneCard.style.zIndex = "1";
    doneCard.innerHTML =
      '<div class="today-card-header">' +
        '<span class="today-card-label">today\'s progress</span>' +
        '<span class="today-card-date">' + dateStr + '</span>' +
      '</div>' +
      '<p class="today-card-prompt"><span class="today-card-check">✓</span> All done for today!</p>' +
      '<p class="today-card-status today-card-status-done">You answered all ' + answered.length + ' prompts. Come back tomorrow for new ones.</p>';
    inner.appendChild(doneCard);
    stack.style.display = "";
    return;
  }

  currentTodayIndex = Math.min(currentTodayIndex, unanswered.length - 1);

  for (var i = unanswered.length - 1; i >= 0; i--) {
    var prompt = unanswered[i];

    var card = document.createElement("section");
    card.classList.add("today-card");
    card.setAttribute("data-stack-index", i);

    var offset = i - currentTodayIndex;
    if (offset < 0) {
      card.classList.add("today-card-dismissed");
    } else {
      card.style.transform = "translateY(" + (offset * -8) + "px) scale(" + (1 - offset * 0.04) + ")";
      card.style.zIndex = 3 - offset;
      if (offset > 0) card.style.opacity = "1";
    }

    var answeredCount = answered.length;
    var totalCount = allPrompts.length;

    card.innerHTML =
      '<div class="today-card-header">' +
        '<span class="today-card-label">today\'s prompt <span class="today-card-counter">' + (answeredCount + i + 1) + ' of ' + totalCount + '</span></span>' +
        '<span class="today-card-date">' + dateStr + '</span>' +
      '</div>' +
      '<p class="today-card-prompt">' + prompt.text + '</p>' +
      '<div class="today-card-actions">' +
        '<button type="button" class="today-card-action" data-prompt-id="' + prompt.id + '" data-prompt-cat="' + prompt.categoryId + '">Answer</button>' +
      '</div>';

    inner.appendChild(card);
  }

  stack.style.display = "";

  inner.querySelectorAll(".today-card-action").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var promptId = this.getAttribute("data-prompt-id");
      var catId = this.getAttribute("data-prompt-cat");
      currentCategoryId = catId;
      currentQuestionId = promptId;
      openQuestionPopup(promptId, true);
    });
  });

  addStackSwipe();
}

function addStackSwipe() {
  var inner = document.getElementById("todayStackInner");
  var startX = 0;
  var startY = 0;

  inner.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  inner.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;

    if (dx < -50 && currentTodayIndex < 2) {
      currentTodayIndex++;
      renderTodayCard();
    } else if (dx > 50 && currentTodayIndex > 0) {
      currentTodayIndex--;
      renderTodayCard();
    }
  }, { passive: true });
}

// todayAnswerBtn listeners are now wired dynamically in renderTodayCard()

// ─── Timezone Widget ───

var timezoneInterval = null;

function startTimezoneWidget() {
  updateTimezoneDisplay();
  if (timezoneInterval) clearInterval(timezoneInterval);
  timezoneInterval = setInterval(updateTimezoneDisplay, 30000);
}

function updateTimezoneDisplay() {
  if (!app.currentProfile) return;

  var myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var now = new Date();
  var opts = { hour: "2-digit", minute: "2-digit", hour12: true };

  tzYourTime.textContent = now.toLocaleTimeString([], opts);

  var firstName = (app.currentProfile.display_name || "").split(" ")[0];
  tzYourLabel.textContent = firstName + "'s Time";

  if (app.currentCouple && app.currentCouple.partnerTimezone) {
    timezoneCard.style.display = "";
    var partnerFirst = (app.currentCouple.partnerName || "Partner").split(" ")[0];
    tzPartnerLabel.textContent = partnerFirst + "'s Time";
    try {
      tzPartnerTime.textContent = now.toLocaleTimeString([], Object.assign({}, opts, { timeZone: app.currentCouple.partnerTimezone }));
    } catch (e) {
      tzPartnerTime.textContent = now.toLocaleTimeString([], opts);
    }
  } else if (app.currentCouple && app.currentCouple.memberCount >= 2) {
    timezoneCard.style.display = "";
    var partnerFirst2 = (app.currentCouple.partnerName || "Partner").split(" ")[0];
    tzPartnerLabel.textContent = partnerFirst2 + "'s Time";
    tzPartnerTime.textContent = now.toLocaleTimeString([], opts);
  } else {
    timezoneCard.style.display = "none";
  }
}

async function autoDetectTimezone() {
  if (!app.currentUser || !app.currentProfile) return;
  var detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (app.currentProfile.timezone === detectedTz) return;

  await supabase.from("profiles").update({ timezone: detectedTz }).eq("id", app.currentUser.id);
  app.currentProfile.timezone = detectedTz;
}

async function loadPartnerTimezone() {
  if (!app.currentCouple || !app.currentCouple.partnerId) return;
  var result = await supabase.from("profiles").select("timezone").eq("id", app.currentCouple.partnerId).maybeSingle();
  if (result.data && result.data.timezone) {
    app.currentCouple.partnerTimezone = result.data.timezone;
  }
}

// ─── Auth + Profile ───

async function ensureProfile(user) {
  const metadataName = user.user_metadata && user.user_metadata.display_name;
  const fallbackName = user.email ? user.email.split("@")[0] : "You";
  const profileName = metadataName || fallbackName;

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, timezone")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: profileName }, { onConflict: "id" })
    .select("id, display_name, avatar_url, timezone")
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

// ─── Couple Loading ───

async function loadCouple() {
  const { data, error } = await supabase.rpc("get_my_couple");

  if (error) {
    throw error;
  }

  const coupleRow = Array.isArray(data) ? data[0] : data;

  if (!coupleRow) {
    if (app.messagesChannel !== null) {
      await supabase.removeChannel(app.messagesChannel);
      app.messagesChannel = null;
    }

    app.currentCouple = null;
    app.allMessages = createEmptyMessages();
    renderPromptExperience();
    setStatus(appStatusMessage, "", "");
    showCoupleSetup();
    return;
  }

  app.currentCouple = {
    id: coupleRow.couple_id,
    inviteCode: coupleRow.invite_code,
    memberCount: coupleRow.member_count || 1,
    partnerName: coupleRow.partner_name || "",
    partnerId: coupleRow.partner_id || null
  };

  app.myTttRole = getMyGameRole();
  app.myMemoryRole = getMyGameRole();

  // TEMP: skip partner check for testing — remove later
  // if (app.currentCouple.memberCount < 2) {
  //   coupleSetup.style.display = "block";
  //   mainExperience.style.display = "none";
  //   document.getElementById("onboardingStep1").style.display = "none";
  //   document.getElementById("onboardingStep2").style.display = "";
  //   inviteCodeText.textContent = app.currentCouple.inviteCode;
  //   setStatus(coupleMessage, "", "");
  //   return;
  // }

  showMainExperience();
  renderProfileTab();
  await loadPartnerTimezone();
  renderHomeScreen();
  startTimezoneWidget();
  await loadCoupleStats();
  updateShopBalance();
  applyEquippedEffects();
  renderInventory();
  var moreHeartsEl = document.getElementById("moreHeartsCount");
  if (moreHeartsEl) moreHeartsEl.textContent = localStorage.getItem("couple_streak_hearts") || "0";
  renderAchievements();

  var profileInviteCode = document.getElementById("profileInviteCode");
  if (profileInviteCode && app.currentCouple) {
    profileInviteCode.textContent = app.currentCouple.inviteCode;
  }
  var settingsAccountInfo = document.getElementById("settingsAccountInfo");
  if (settingsAccountInfo && app.currentProfile) {
    settingsAccountInfo.textContent = "Signed in as " + app.currentProfile.display_name;
  }

  await loadMessages();

  if (app.settingToggles.settingDailyReminder) {
    var todayPrompts = getTodayPrompts();
    var hasUnanswered = todayPrompts.some(function (p) {
      var msgs = app.allMessages[p.id] || [];
      return !msgs.some(function (m) { return m.sender === "me"; });
    });
    if (hasUnanswered) {
      showToast("You have unanswered daily prompts waiting for you");
      sendLocalNotification("Daily Prompts", "Answer today's questions — your partner is waiting");
    }
  }

  await subscribeToMessages();
  await subscribeToGameStates(onDateStateFromDB);
  await subscribeToPresence();
  await checkExistingDateSession();
  await loadTodayMoments();
  renderDateLanding();
  initCallListener();
}

async function loadMessages() {
  if (!app.currentCouple) {
    return;
  }

  const loadId = app.latestMessagesLoadId + 1;
  const coupleId = app.currentCouple.id;
  app.latestMessagesLoadId = loadId;

  const { data, error } = await supabase
    .from("messages")
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: true });

  if (!app.currentCouple || app.currentCouple.id !== coupleId || loadId !== app.latestMessagesLoadId) {
    return;
  }

  if (error) {
    setStatus(appStatusMessage, getReadableError(error), "error");
    return;
  }

  app.allMessages = createEmptyMessages();

  for (let i = 0; i < (data || []).length; i++) {
    const row = data[i];

    if (!Array.isArray(app.allMessages[row.question_id])) {
      continue;
    }

    app.allMessages[row.question_id].push(formatMessageRow(row));
  }

  renderPromptExperience();
  renderHomeScreen();
  renderAchievements();
}

function scheduleMessagesReload() {
  if (app.reloadMessagesTimer !== null) {
    window.clearTimeout(app.reloadMessagesTimer);
  }

  app.reloadMessagesTimer = window.setTimeout(function () {
    app.reloadMessagesTimer = null;
    loadMessages();
  }, 250);
}

async function subscribeToMessages() {
  if (!app.currentCouple) {
    return;
  }

  if (app.messagesChannel !== null) {
    await supabase.removeChannel(app.messagesChannel);
  }

  app.messagesChannel = supabase
    .channel("couple-messages-" + app.currentCouple.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: "couple_id=eq." + app.currentCouple.id
      },
      function (payload) {
        if (payload.eventType === "INSERT" && payload.new) {
          if (app.settingToggles.settingMsgNotif && payload.new.sender_id !== app.currentUser.id) {
            var isOnChat = document.getElementById("tabChat").classList.contains("tab-active");
            if (!isOnChat) {
              showToast("New message from your partner");
              sendLocalNotification("New Message", "Your partner sent you a message");
            }
          }
          scheduleMessagesReload();
          return;
        }

        scheduleMessagesReload();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "couple_members",
        filter: "couple_id=eq." + app.currentCouple.id
      },
      function () {
        loadCouple();
      }
    )
    .subscribe(function (status) {
      if (status === "SUBSCRIBED") {
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      }
    });
}

// ─── Auth Handlers ───

async function handleSignedIn(user) {
  app.currentUser = user;
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  setStatus(authMessage, "", "");
  setStatus(appStatusMessage, "Loading your shared space...", "");

  try {
    app.currentProfile = await ensureProfile(user);
    signedInText.textContent = "Signed in as " + app.currentProfile.display_name;
    renderGreeting();
    renderPromptExperience();
    renderProfileTab();
    autoDetectTimezone();
    await requestNotificationPermission();
    if (app.settingToggles.settingDailyReminder) {
      scheduleDailyPromptReminder();
    }

    if (needsOnboarding()) {
      setStatus(appStatusMessage, "", "");
      startOnboarding({
        onComplete: async function () {
          await loadCouple();
        }
      });
      return;
    }

    await loadCouple();
  } catch (error) {
    showCoupleSetup();
    setStatus(appStatusMessage, getReadableError(error), "error");
  }
}

async function handleSignedOut() {
  if (app.reloadMessagesTimer !== null) {
    window.clearTimeout(app.reloadMessagesTimer);
    app.reloadMessagesTimer = null;
  }

  if (app.messagesChannel !== null) {
    await supabase.removeChannel(app.messagesChannel);
    app.messagesChannel = null;
  }

  if (app.gameChannel !== null) {
    await supabase.removeChannel(app.gameChannel);
    app.gameChannel = null;
  }

  clearStreakTimerInterval();
  clearCountdownInterval();
  if (timezoneInterval) { clearInterval(timezoneInterval); timezoneInterval = null; }

  await cleanupPresence();
  cleanupDateCall();
  cleanupMomentsChannel();

  app.myTttRole = null;
  app.myMemoryRole = null;

  app.currentUser = null;
  app.currentProfile = null;
  app.currentCouple = null;
  app.allMessages = createEmptyMessages();
  passwordInput.value = "";
  loginScreen.style.display = "flex";
  appScreen.style.display = "none";
  var obOverlay = document.getElementById("onboardingOverlay");
  if (obOverlay) obOverlay.style.display = "none";
  var tourBackdrop = document.getElementById("tourBackdrop");
  if (tourBackdrop) tourBackdrop.style.display = "none";
  var tourTooltip = document.getElementById("tourTooltip");
  if (tourTooltip) tourTooltip.style.display = "none";
  var tourComplete = document.getElementById("tourCompleteOverlay");
  if (tourComplete) tourComplete.style.display = "none";
  setStatus(authMessage, "", "");
  setStatus(coupleMessage, "", "");
  renderPromptExperience();
}

function getAuthFields() {
  return {
    email: emailInput.value.trim(),
    password: passwordInput.value
  };
}

async function login() {
  const fields = getAuthFields();

  if (fields.email === "" || fields.password === "") {
    setStatus(authMessage, "Enter your email and password.", "error");
    return;
  }

  setAuthBusy(true);
  setStatus(authMessage, "Logging in...", "");

  const { error } = await supabase.auth.signInWithPassword({
    email: fields.email,
    password: fields.password
  });

  setAuthBusy(false);

  if (error) {
    setStatus(authMessage, getReadableError(error), "error");
    return;
  }

  setStatus(authMessage, "Logged in.", "success");
}

function isValidEmail(email) {
  var pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(email)) return false;

  var domain = email.split("@")[1].toLowerCase();
  var parts = domain.split(".");
  var tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 10) return false;
  if (parts.length < 2) return false;
  return true;
}

function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password needs at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password needs at least one number.";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return "Password needs at least one special character (!@#$%^&* etc).";
  }
  if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/.test(password)) {
    return "Password contains invalid characters.";
  }
  return null;
}

async function signup() {
  const fields = getAuthFields();

  if (fields.email === "" || fields.password === "") {
    setStatus(authMessage, "Enter your email and password.", "error");
    return;
  }

  if (!isValidEmail(fields.email)) {
    setStatus(authMessage, "Enter a valid email address.", "error");
    return;
  }

  var passwordError = validatePassword(fields.password);
  if (passwordError) {
    setStatus(authMessage, passwordError, "error");
    return;
  }

  setAuthBusy(true);
  setStatus(authMessage, "Creating your account...", "");

  const { data, error } = await supabase.auth.signUp({
    email: fields.email,
    password: fields.password
  });

  setAuthBusy(false);

  if (error) {
    setStatus(authMessage, getReadableError(error), "error");
    return;
  }

  if (data.session) {
    await handleSignedIn(data.session.user);
    return;
  }

  setStatus(authMessage, "Check your email to confirm the account, then log in.", "success");
}

async function logout() {
  await supabase.auth.signOut();
  await handleSignedOut();
}

async function createCouple() {
  setCoupleBusy(true);
  setStatus(coupleMessage, "Creating shared space...", "");

  const { data, error } = await supabase.rpc("create_couple");

  setCoupleBusy(false);

  if (error) {
    setStatus(coupleMessage, getReadableError(error), "error");
    return;
  }

  const coupleRow = Array.isArray(data) ? data[0] : data;

  if (coupleRow) {
    inviteCodeText.textContent = coupleRow.invite_code;
    document.getElementById("onboardingStep1").style.display = "none";
    document.getElementById("onboardingStep2").style.display = "";
  }

  setStatus(coupleMessage, "", "");
  await loadCouple();
}

async function joinCouple() {
  const inviteCode = inviteCodeInput.value.trim().toUpperCase();

  if (inviteCode === "") {
    setStatus(coupleMessage, "Enter an invite code.", "error");
    return;
  }

  setCoupleBusy(true);
  setStatus(coupleMessage, "Joining shared space...", "");

  const { error } = await supabase.rpc("join_couple_by_invite", {
    invite_code_arg: inviteCode
  });

  setCoupleBusy(false);

  if (error) {
    setStatus(coupleMessage, getReadableError(error), "error");
    return;
  }

  inviteCodeInput.value = "";
  setStatus(coupleMessage, "Joined shared space.", "success");
  await loadCouple();
}

async function sendMessage() {
  var messageText = promptMessageInput.value.trim();
  if (messageText === "" || !app.currentUser || !app.currentCouple) return;

  promptSendButton.disabled = true;

  var result = await supabase
    .from("messages")
    .insert({
      couple_id: app.currentCouple.id,
      question_id: currentQuestionId,
      sender_id: app.currentUser.id,
      text: messageText
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  promptSendButton.disabled = false;

  if (result.error) {
    setStatus(appStatusMessage, getReadableError(result.error), "error");
    return;
  }

  promptMessageInput.value = "";

  if (result.data) {
    addOrReplaceMessage(result.data);
    renderPromptChatMessages();
    renderTodayCard();
  }

  recordEngagement();
  scheduleMessagesReload();
}

function changeCategory(categoryId) {
  const questionsForCategory = getQuestionsForCategory(categoryId);

  if (questionsForCategory.length === 0) {
    return;
  }

  currentCategoryId = categoryId;
  currentQuestionId = questionsForCategory[0].id;

  renderPromptExperience();
}

function changeQuestion(questionId) {
  currentQuestionId = questionId;
  renderPromptExperience();
  openPromptChat(questionId);
}


// ─── Tab Navigation ───

const bottomNav = document.getElementById("bottomNav");
const navTabs = bottomNav.querySelectorAll(".nav-tab");

navTabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    hapticLight();
    const targetId = tab.dataset.tab;

    navTabs.forEach(function (t) {
      t.classList.remove("nav-tab-active");
    });
    tab.classList.add("nav-tab-active");

    document.querySelectorAll(".tab-content").forEach(function (panel) {
      panel.classList.remove("tab-active");
    });
    document.getElementById(targetId).classList.add("tab-active");

    var fab = document.getElementById("momentsFab");
    if (fab) {
      fab.style.display = targetId === "tabMoments" ? "" : "none";
    }
  });
});

// ─── Swipe to Switch Tabs ───

var TAB_ORDER = ["tabChat", "tabMoments", "tabDate", "tabChats", "tabMore"];

(function () {
  var main = document.getElementById("mainExperience");
  var swipeStartX = 0;
  var swipeStartY = 0;
  var swiping = false;

  main.addEventListener("touchstart", function (e) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  main.addEventListener("touchend", function (e) {
    if (!swiping) return;
    swiping = false;

    var dx = e.changedTouches[0].clientX - swipeStartX;
    var dy = e.changedTouches[0].clientY - swipeStartY;

    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

    var activeTab = document.querySelector(".nav-tab-active");
    if (!activeTab) return;
    var currentId = activeTab.dataset.tab;
    var idx = TAB_ORDER.indexOf(currentId);
    if (idx === -1) return;

    var nextIdx = dx < 0 ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return;

    var targetBtn = document.querySelector('.nav-tab[data-tab="' + TAB_ORDER[nextIdx] + '"]');
    if (targetBtn) targetBtn.click();
  }, { passive: true });
})();


// ─── More Tab Sub-Nav ───

var moreSubNav = document.getElementById("moreSubNav");
var moreSubBtns = moreSubNav.querySelectorAll(".more-sub-btn");

moreSubBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    hapticLight();
    moreSubBtns.forEach(function (b) { b.classList.remove("more-sub-active"); });
    btn.classList.add("more-sub-active");
    document.querySelectorAll(".more-section").forEach(function (s) {
      s.classList.remove("more-section-active");
    });
    document.getElementById(btn.dataset.section).classList.add("more-section-active");
  });
});


// ─── Chats Tab Sub-Nav ───

var chatsSubNav = document.getElementById("chatsSubNav");
var chatsSubBtns = chatsSubNav.querySelectorAll(".chats-sub-btn");

chatsSubBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    hapticLight();
    chatsSubBtns.forEach(function (b) { b.classList.remove("chats-sub-active"); });
    btn.classList.add("chats-sub-active");
    document.querySelectorAll(".chats-section").forEach(function (s) {
      s.classList.remove("chats-section-active");
    });
    document.getElementById(btn.dataset.section).classList.add("chats-section-active");
  });
});

var chatsExploreBrowse = document.getElementById("chatsExploreBrowse");
if (chatsExploreBrowse) {
  chatsExploreBrowse.addEventListener("click", function () {
    hapticLight();
    chatsSubBtns.forEach(function (b) { b.classList.remove("chats-sub-active"); });
    chatsSubBtns[1].classList.add("chats-sub-active");
    document.querySelectorAll(".chats-section").forEach(function (s) {
      s.classList.remove("chats-section-active");
    });
    document.getElementById("chatsPrompts").classList.add("chats-section-active");
  });
}

var surpriseMeBtn = document.getElementById("surpriseMeBtn");
if (surpriseMeBtn) {
  surpriseMeBtn.addEventListener("click", function () {
    hapticLight();
    if (questions.length === 0) return;

    var byCat = {};
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var msgs = app.allMessages[q.id] || [];
      var iAnswered = false;
      for (var m = 0; m < msgs.length; m++) {
        if (msgs[m].sender === "me") { iAnswered = true; break; }
      }
      if (!iAnswered) {
        if (!byCat[q.categoryId]) byCat[q.categoryId] = [];
        byCat[q.categoryId].push(q);
      }
    }

    var catKeys = Object.keys(byCat);
    if (catKeys.length > 0) {
      var randomCat = catKeys[Math.floor(Math.random() * catKeys.length)];
      var pool = byCat[randomCat];
      var pick = pool[Math.floor(Math.random() * pool.length)];
      currentQuestionId = pick.id;
      currentCategoryId = pick.categoryId;
      openQuestionPopup(currentQuestionId);
    } else {
      var pick = questions[Math.floor(Math.random() * questions.length)];
      currentQuestionId = pick.id;
      currentCategoryId = pick.categoryId;
      openPromptChat(currentQuestionId);
    }
  });
}


// ─── Feature Locks ───
// All features stay unlocked — hearts unlock bonus extras only, never gate core features

var lockIds = ["lockMore", "lockDate"];

function updateFeatureLocks() {
  for (var i = 0; i < lockIds.length; i++) {
    var el = document.getElementById(lockIds[i]);
    if (el) el.classList.remove("locked");
  }
}


// ─── Wire up modules ───

import { initGames } from "./games.js";
import { initCamera } from "./camera.js";

initSettings();
initMoments({ recordEngagement: recordEngagement, onMomentAdded: renderHomeScreen });
initGames(recordEngagement);
initProfile(logout, renderGreeting);
initInviteButtons(coupleMessage);
initShop();

var moreHubMap = [
  ["moreHubGames", "moreGames"],
  ["moreHubShop", "moreShop"],
  ["moreMenuShop", "moreShop"],
  ["moreHubAchievements", "moreAchievements"],
  ["moreHubProfile", "moreProfile"],
  ["moreHubSettings", "moreSettings"]
];

var tabMore = document.getElementById("tabMore");

function showMoreDetail(sectionId) {
  hapticLight();
  tabMore.classList.add("more-detail-active");
  var target = document.querySelector('.more-sub-btn[data-section="' + sectionId + '"]');
  if (target) target.click();
}

function showMoreLanding() {
  hapticLight();
  tabMore.classList.remove("more-detail-active");
}

moreHubMap.forEach(function (pair) {
  var btn = document.getElementById(pair[0]);
  if (btn) {
    btn.addEventListener("click", function () {
      showMoreDetail(pair[1]);
    });
  }
});

var moreBackBtn = document.getElementById("moreBackBtn");
if (moreBackBtn) {
  moreBackBtn.addEventListener("click", showMoreLanding);
}

var moreGoToShop = document.getElementById("moreGoToShop");
if (moreGoToShop) {
  moreGoToShop.addEventListener("click", function () {
    showMoreDetail("moreShop");
  });
}

var profileCopyInviteBtn = document.getElementById("profileCopyInviteBtn");
if (profileCopyInviteBtn) {
  profileCopyInviteBtn.addEventListener("click", async function () {
    if (!app.currentCouple) return;
    var ok = await nativeClipboardWrite(app.currentCouple.inviteCode);
    if (ok) {
      hapticLight();
      profileCopyInviteBtn.textContent = "✓";
      setTimeout(function () { profileCopyInviteBtn.textContent = "📋"; }, 1800);
    }
  });
}
initCamera(
  function () { return currentQuestionId; },
  {
    recordEngagement: recordEngagement,
    scheduleMessagesReload: scheduleMessagesReload,
    renderMessages: renderPromptChatMessages,
    getMessageContainer: function () { return promptChatMessages; }
  }
);


// ─── Event Listeners ───

loginButton.addEventListener("click", login);
signupButton.addEventListener("click", signup);
logoutButton.addEventListener("click", logout);
createCoupleButton.addEventListener("click", createCouple);
joinCoupleButton.addEventListener("click", joinCouple);
promptSendButton.addEventListener("click", sendMessage);

// Home dashboard buttons
connectionAction.addEventListener("click", function () {
  hapticLight();
  if (connectionActionType === "prompt") {
    var allPrompts = getTodayPrompts();
    for (var i = 0; i < allPrompts.length; i++) {
      var rev = getDailyRevealState(allPrompts[i].id);
      if (!rev.hasMe) {
        currentCategoryId = allPrompts[i].categoryId;
        currentQuestionId = allPrompts[i].id;
        openQuestionPopup(allPrompts[i].id, true);
        return;
      }
    }
  } else if (connectionActionType === "hug") {
    document.querySelector('[data-tab="tabMore"]').click();
    setTimeout(function () {
      var hugBtn = document.getElementById("hugButton");
      if (hugBtn) hugBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  } else if (connectionActionType === "moment") {
    document.querySelector('[data-tab="tabMoments"]').click();
  } else if (connectionActionType === "date") {
    document.querySelector('[data-tab="tabDate"]').click();
  } else if (connectionActionType === "game") {
    document.querySelector('[data-tab="tabMore"]').click();
  } else if (connectionActionType === "chat") {
    document.querySelector('[data-tab="tabChats"]').click();
  } else if (connectionActionType === "streak") {
    var allPrompts2 = getTodayPrompts();
    for (var j = 0; j < allPrompts2.length; j++) {
      var rev2 = getDailyRevealState(allPrompts2[j].id);
      if (!rev2.hasMe) {
        currentCategoryId = allPrompts2[j].categoryId;
        currentQuestionId = allPrompts2[j].id;
        openQuestionPopup(allPrompts2[j].id);
        return;
      }
    }
    document.querySelector('[data-tab="tabMore"]').click();
  }
});

document.getElementById("coupleLogAction").addEventListener("click", function () {
  hapticLight();
  document.querySelector('[data-tab="tabMoments"]').click();
});

document.getElementById("datePreviewAction").addEventListener("click", function () {
  hapticLight();
  document.querySelector('[data-tab="tabDate"]').click();
});

questionPopupSend.addEventListener("click", sendPopupAnswer);
questionPopupInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") sendPopupAnswer();
});
questionPopupClose.addEventListener("click", closeQuestionPopup);
questionPopupSkip.addEventListener("click", skipPopupQuestion);
questionPopupBackdrop.addEventListener("click", function (event) {
  if (event.target === questionPopupBackdrop) closeQuestionPopup();
});

passwordInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    login();
  }
});

inviteCodeInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    joinCouple();
  }
});

inviteCodeInput.addEventListener("input", function () {
  inviteCodeInput.value = inviteCodeInput.value.toUpperCase().replace(/\s/g, "");
});

promptMessageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});

promptChatBack.addEventListener("click", closePromptChat);

document.getElementById("callVoiceBtn").addEventListener("click", function () {
  hapticLight();
  startCall("voice");
});

document.getElementById("callVideoBtn").addEventListener("click", function () {
  hapticLight();
  startCall("video");
});

// Swipe right to go back
(function () {
  var touchStartX = 0;
  var touchStartY = 0;

  promptChatOverlay.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  promptChatOverlay.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (touchStartX < 40 && dx > 80 && dy < 100) {
      closePromptChat();
    }
  }, { passive: true });
})();

// Photo upload in prompt chat
function getPhotoCallbacks() {
  return {
    recordEngagement: recordEngagement,
    scheduleMessagesReload: scheduleMessagesReload,
    renderMessages: renderPromptChatMessages,
    getMessageContainer: function () { return promptChatMessages; }
  };
}

promptPhotoButton.addEventListener("click", async function () {
  if (app.isNative) {
    var dataUrl = await nativePickPhoto();
    if (dataUrl) {
      var blob = dataUrlToBlob(dataUrl);
      await uploadAndSendPhoto(blob, currentQuestionId, getPhotoCallbacks());
    }
  } else {
    promptPhotoInput.click();
  }
});

promptPhotoInput.addEventListener("change", async function () {
  if (promptPhotoInput.files && promptPhotoInput.files[0]) {
    await uploadAndSendPhoto(promptPhotoInput.files[0], currentQuestionId, getPhotoCallbacks());
    promptPhotoInput.value = "";
  }
});

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible" && app.currentCouple) {
    loadCouple();
    loadMessages();
    loadTodayMoments();
  }
});


// ─── Init ───

async function init() {
  renderPromptExperience();
  loadStreak();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    setStatus(authMessage, getReadableError(error), "error");
    return;
  }

  if (data.session) {
    await handleSignedIn(data.session.user);
  } else {
    await handleSignedOut();
  }

  supabase.auth.onAuthStateChange(function (_event, session) {
    if (session && session.user) {
      handleSignedIn(session.user);
    } else {
      handleSignedOut();
    }
  });
}

init();
