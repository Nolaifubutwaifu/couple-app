import { createClient } from "@supabase/supabase-js";
import {
  promptCategorySections,
  questions,
  memoryMatchEmojis,
  truthPrompts,
  darePrompts,
  loveQuizQuestions,
  fortuneCookies,
  diceActivities,
  diceMoods,
  dateNightSteps
} from "./data.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);

// ─── DOM Elements ───

const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const questionList = document.getElementById("questionList");
const categorySectionsContainer = document.getElementById("categorySections");
const selectedCategoryLabel = document.getElementById("selectedCategoryLabel");
const selectedCategoryTitle = document.getElementById("selectedCategoryTitle");
const currentQuestionTitle = document.getElementById("currentQuestionTitle");
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const displayNameInput = document.getElementById("displayNameInput");
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
const syncStatusText = document.getElementById("syncStatusText");
const homeGreetingText = document.getElementById("homeGreetingText");
const homeGreetingTitle = document.getElementById("homeGreetingTitle");
const homeConnectedText = document.getElementById("homeConnectedText");
const timezoneCard = document.getElementById("timezoneCard");
const tzYourLabel = document.getElementById("tzYourLabel");
const tzYourTime = document.getElementById("tzYourTime");
const tzPartnerLabel = document.getElementById("tzPartnerLabel");
const tzPartnerTime = document.getElementById("tzPartnerTime");

let currentUser = null;
let currentProfile = null;
let currentCouple = null;
let messagesChannel = null;
let reloadMessagesTimer = null;
let latestMessagesLoadId = 0;
let currentCategoryId = promptCategorySections[0].categories[0].id;
let currentQuestionId = getQuestionsForCategory(currentCategoryId)[0].id;
let allMessages = createEmptyMessages();

function createEmptyMessages() {
  const messages = {};
  messages["direct"] = [];

  for (let i = 0; i < questions.length; i++) {
    messages[questions[i].id] = [];
  }

  return messages;
}

function getReadableError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  if (error.code === "PGRST202" || error.message.includes("relation") || error.message.includes("function")) {
    return "Supabase is connected, but the database is not set up yet. Run supabase-schema.sql in your Supabase SQL editor.";
  }

  if (error.message.includes("already full")) {
    return "This invite code already has two people in it.";
  }

  if (error.message.includes("already in a couple space")) {
    return "You are already in a couple space. Log out and use another account to join a different one.";
  }

  return error.message || "Something went wrong.";
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.toggle("error", type === "error");
  element.classList.toggle("success", type === "success");
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
    const messages = allMessages[questionsForCategory[i].id];

    if (Array.isArray(messages) && messages.length > 0) {
      answeredQuestions++;
    }
  }

  return Math.round((answeredQuestions / questionsForCategory.length) * 100);
}

function showCategories() {
  categorySectionsContainer.innerHTML = "";

  for (let i = 0; i < promptCategorySections.length; i++) {
    var section = promptCategorySections[i];
    var sectionElement = document.createElement("section");
    sectionElement.classList.add("category-section");

    var activeCategory = null;
    for (var j = 0; j < section.categories.length; j++) {
      if (section.categories[j].id === currentCategoryId) {
        activeCategory = section.categories[j];
        break;
      }
    }
    var displayCategory = activeCategory || section.categories[0];

    var card = document.createElement("button");
    card.type = "button";
    card.classList.add("category-card");
    card.classList.add("category-card--" + displayCategory.theme);
    card.dataset.sectionIndex = i;
    if (activeCategory) card.classList.add("active");

    var iconEl = document.createElement("span");
    iconEl.classList.add("category-icon");
    iconEl.textContent = displayCategory.icon;

    var body = document.createElement("div");
    body.classList.add("category-card-body");

    var sectionLabel = document.createElement("span");
    sectionLabel.classList.add("category-section-label");
    sectionLabel.textContent = section.title;

    var label = document.createElement("span");
    label.classList.add("category-label");
    label.textContent = displayCategory.label;

    var title = document.createElement("span");
    title.classList.add("category-title");
    title.textContent = displayCategory.title;

    body.appendChild(sectionLabel);
    body.appendChild(label);
    body.appendChild(title);

    var chevron = document.createElement("span");
    chevron.classList.add("category-card-chevron");
    chevron.textContent = "⋯";

    card.appendChild(iconEl);
    card.appendChild(body);
    card.appendChild(chevron);
    sectionElement.appendChild(card);
    categorySectionsContainer.appendChild(sectionElement);

    (function (sectionIdx, cardEl) {
      var longPressTimer = null;
      var didLongPress = false;

      function startLongPress(e) {
        didLongPress = false;
        longPressTimer = setTimeout(function () {
          didLongPress = true;
          openWheelMenu(sectionIdx);
        }, 400);
      }

      function cancelLongPress() {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      cardEl.addEventListener("pointerdown", startLongPress);
      cardEl.addEventListener("pointerup", function () {
        cancelLongPress();
        if (!didLongPress) {
          openWheelMenu(sectionIdx);
        }
      });
      cardEl.addEventListener("pointerleave", cancelLongPress);
      cardEl.addEventListener("pointercancel", cancelLongPress);
      cardEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    })(i, card);
  }
}

var wheelOverlay = null;

function openWheelMenu(sectionIndex) {
  var section = promptCategorySections[sectionIndex];
  if (!section) return;
  closeWheelMenu();

  wheelOverlay = document.createElement("div");
  wheelOverlay.classList.add("wheel-overlay");

  var container = document.createElement("div");
  container.classList.add("wheel-container");

  var center = document.createElement("div");
  center.classList.add("wheel-center");
  center.textContent = section.title;
  container.appendChild(center);

  var categories = section.categories;
  var count = categories.length;
  var radius = 90;
  var startAngle = -90;

  for (var i = 0; i < count; i++) {
    var cat = categories[i];
    var angle = startAngle + (i * (360 / count));
    var rad = angle * (Math.PI / 180);
    var x = 130 + radius * Math.cos(rad) - 40;
    var y = 130 + radius * Math.sin(rad) - 40;

    var item = document.createElement("button");
    item.type = "button";
    item.classList.add("wheel-item");
    item.classList.add("category-card--" + cat.theme);
    item.style.left = x + "px";
    item.style.top = y + "px";
    item.dataset.categoryId = cat.id;

    if (cat.id === currentCategoryId) {
      item.style.transform = "scale(1.15)";
      item.style.boxShadow = "0 0 0 2px #1a1a2e, 0 6px 24px rgba(0,0,0,0.18)";
    }

    var itemIcon = document.createElement("span");
    itemIcon.classList.add("wheel-item-icon");
    itemIcon.textContent = cat.icon;

    var itemLabel = document.createElement("span");
    itemLabel.classList.add("wheel-item-label");
    itemLabel.textContent = cat.label;

    item.appendChild(itemIcon);
    item.appendChild(itemLabel);
    container.appendChild(item);

    (function (categoryId) {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        changeCategory(categoryId);
        closeWheelMenu();
      });
    })(cat.id);
  }

  wheelOverlay.appendChild(container);
  document.body.appendChild(wheelOverlay);

  requestAnimationFrame(function () {
    wheelOverlay.classList.add("wheel-visible");
  });

  wheelOverlay.addEventListener("click", function (e) {
    if (e.target === wheelOverlay) {
      closeWheelMenu();
    }
  });
}

function closeWheelMenu() {
  if (wheelOverlay) {
    wheelOverlay.remove();
    wheelOverlay = null;
  }
}

function showSelectedCategory() {
  const selectedCategory = getCategoryById(currentCategoryId);

  if (selectedCategory === null) {
    return;
  }

  selectedCategoryLabel.textContent = selectedCategory.label;
  selectedCategoryTitle.textContent = selectedCategory.title;
}

function showQuestions() {
  questionList.innerHTML = "";

  const questionsForCurrentCategory = getQuestionsForCategory(currentCategoryId);

  for (let i = 0; i < questionsForCurrentCategory.length; i++) {
    const questionCard = document.createElement("button");
    questionCard.type = "button";
    questionCard.classList.add("question-card");

    if (questionsForCurrentCategory[i].id === currentQuestionId) {
      questionCard.classList.add("active");
    }

    questionCard.dataset.questionId = questionsForCurrentCategory[i].id;

    const questionLabel = document.createElement("span");
    questionLabel.classList.add("small-text");
    questionLabel.textContent = questionsForCurrentCategory[i].label;

    const questionTitle = document.createElement("span");
    questionTitle.classList.add("question-title");
    questionTitle.textContent = questionsForCurrentCategory[i].text;

    questionCard.appendChild(questionLabel);
    questionCard.appendChild(questionTitle);
    questionList.appendChild(questionCard);

    questionCard.addEventListener("click", function () {
      changeQuestion(questionsForCurrentCategory[i].id);
    });
  }
}

function showCurrentQuestionTitle() {
  const currentQuestion = getQuestionById(currentQuestionId);

  if (currentQuestion !== null) {
    currentQuestionTitle.textContent = currentQuestion.text;
  }
}

function showMessages() {
  chat.innerHTML = "";

  const messagesForCurrentQuestion = allMessages[currentQuestionId] || [];

  if (messagesForCurrentQuestion.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.classList.add("empty-chat");
    emptyState.textContent = "No answers yet.";
    chat.appendChild(emptyState);
    return;
  }

  for (let i = 0; i < messagesForCurrentQuestion.length; i++) {
    const message = messagesForCurrentQuestion[i];
    const newMessage = document.createElement("div");
    newMessage.classList.add("message");
    newMessage.classList.add(message.sender);

    if (message.sender !== "me") {
      const senderName = document.createElement("span");
      senderName.classList.add("message-sender");
      senderName.textContent = message.senderName;
      newMessage.appendChild(senderName);
    }

    const messageParagraph = document.createElement("p");
    messageParagraph.textContent = message.text;

    newMessage.appendChild(messageParagraph);
    chat.appendChild(newMessage);
  }
}

function renderPromptExperience() {
  showCategories();
  showSelectedCategory();
  showQuestions();
  showCurrentQuestionTitle();
  showMessages();
}

function showCoupleSetup() {
  coupleSetup.style.display = "block";
  mainExperience.style.display = "none";
  inviteCard.style.display = "none";
  coupleStatusText.textContent = "No couple space yet";
  setStatus(syncStatusText, "", "");
}

function showMainExperience() {
  coupleSetup.style.display = "none";
  mainExperience.style.display = "block";
  renderGreeting();
  setStatus(appStatusMessage, "", "");
}

function renderGreeting() {
  if (!currentProfile) return;

  var hour = new Date().getHours();
  var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  var firstName = (currentProfile.display_name || "").split(" ")[0];

  homeGreetingText.textContent = greeting + ", " + firstName;

  if (currentCouple && currentCouple.partnerName) {
    homeGreetingTitle.textContent = firstName + " & " + currentCouple.partnerName.split(" ")[0];
    homeConnectedText.textContent = "Connected with " + currentCouple.partnerName;
  } else {
    homeGreetingTitle.textContent = firstName;
    homeConnectedText.textContent = "";
  }
}

var timezoneInterval = null;

function startTimezoneWidget() {
  updateTimezoneDisplay();
  if (timezoneInterval) clearInterval(timezoneInterval);
  timezoneInterval = setInterval(updateTimezoneDisplay, 30000);
}

function updateTimezoneDisplay() {
  if (!currentProfile) return;

  var myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var now = new Date();
  var opts = { hour: "2-digit", minute: "2-digit", hour12: true };

  tzYourTime.textContent = now.toLocaleTimeString([], opts);

  var firstName = (currentProfile.display_name || "").split(" ")[0];
  tzYourLabel.textContent = firstName + "'s Time";

  if (currentCouple && currentCouple.partnerTimezone) {
    timezoneCard.style.display = "";
    var partnerFirst = (currentCouple.partnerName || "Partner").split(" ")[0];
    tzPartnerLabel.textContent = partnerFirst + "'s Time";
    try {
      tzPartnerTime.textContent = now.toLocaleTimeString([], Object.assign({}, opts, { timeZone: currentCouple.partnerTimezone }));
    } catch (e) {
      tzPartnerTime.textContent = now.toLocaleTimeString([], opts);
    }
  } else if (currentCouple && currentCouple.memberCount >= 2) {
    timezoneCard.style.display = "";
    var partnerFirst2 = (currentCouple.partnerName || "Partner").split(" ")[0];
    tzPartnerLabel.textContent = partnerFirst2 + "'s Time";
    tzPartnerTime.textContent = now.toLocaleTimeString([], opts);
  } else {
    timezoneCard.style.display = "none";
  }
}

async function autoDetectTimezone() {
  if (!currentUser || !currentProfile) return;
  var detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (currentProfile.timezone === detectedTz) return;

  await supabase.from("profiles").update({ timezone: detectedTz }).eq("id", currentUser.id);
  currentProfile.timezone = detectedTz;
}

async function loadPartnerTimezone() {
  if (!currentCouple || !currentCouple.partnerId) return;
  var result = await supabase.from("profiles").select("timezone").eq("id", currentCouple.partnerId).maybeSingle();
  if (result.data && result.data.timezone) {
    currentCouple.partnerTimezone = result.data.timezone;
  }
}

async function ensureProfile(user) {
  const typedName = displayNameInput.value.trim();
  const metadataName = user.user_metadata && user.user_metadata.display_name;
  const fallbackName = user.email ? user.email.split("@")[0] : "You";
  const profileName = typedName || metadataName || fallbackName;

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, timezone")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile && !typedName) {
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

async function loadCouple() {
  const { data, error } = await supabase.rpc("get_my_couple");

  if (error) {
    throw error;
  }

  const coupleRow = Array.isArray(data) ? data[0] : data;

  if (!coupleRow) {
    if (messagesChannel !== null) {
      await supabase.removeChannel(messagesChannel);
      messagesChannel = null;
    }

    currentCouple = null;
    allMessages = createEmptyMessages();
    renderPromptExperience();
    setStatus(appStatusMessage, "", "");
    showCoupleSetup();
    return;
  }

  currentCouple = {
    id: coupleRow.couple_id,
    inviteCode: coupleRow.invite_code,
    memberCount: coupleRow.member_count || 1,
    partnerName: coupleRow.partner_name || "",
    partnerId: coupleRow.partner_id || null
  };

  myTttRole = getMyGameRole();
  myMemoryRole = getMyGameRole();

  showMainExperience();
  renderProfileTab();
  updateDirectChatHeader();
  await loadPartnerTimezone();
  renderGreeting();
  startTimezoneWidget();
  await loadMessages();
  await subscribeToMessages();
  await subscribeToGameStates();
  await checkExistingDateSession();
}

async function loadMessages() {
  if (!currentCouple) {
    return;
  }

  const loadId = latestMessagesLoadId + 1;
  const coupleId = currentCouple.id;
  latestMessagesLoadId = loadId;

  const { data, error } = await supabase
    .from("messages")
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: true });

  if (!currentCouple || currentCouple.id !== coupleId || loadId !== latestMessagesLoadId) {
    return;
  }

  if (error) {
    setStatus(appStatusMessage, getReadableError(error), "error");
    return;
  }

  allMessages = createEmptyMessages();

  for (let i = 0; i < (data || []).length; i++) {
    const row = data[i];

    if (!Array.isArray(allMessages[row.question_id])) {
      continue;
    }

    allMessages[row.question_id].push(formatMessageRow(row));
  }

  renderPromptExperience();
  renderDirectChat();
  renderGallery();
}

function getSenderName(row) {
  if (!row.profiles) {
    return "Partner";
  }

  if (Array.isArray(row.profiles)) {
    return row.profiles[0] ? row.profiles[0].display_name : "Partner";
  }

  return row.profiles.display_name || "Partner";
}

function formatMessageRow(row) {
  return {
    id: row.id,
    text: row.text,
    imageUrl: row.image_url || null,
    sender: row.sender_id === currentUser.id ? "me" : "partner",
    senderName: row.sender_id === currentUser.id && currentProfile ? currentProfile.display_name : getSenderName(row),
    createdAt: row.created_at
  };
}

function addOrReplaceMessage(row) {
  if (!Array.isArray(allMessages[row.question_id])) {
    return;
  }

  const formattedMessage = formatMessageRow(row);
  const existingIndex = allMessages[row.question_id].findIndex(function (message) {
    return message.id === formattedMessage.id;
  });

  if (existingIndex >= 0) {
    allMessages[row.question_id][existingIndex] = formattedMessage;
  } else {
    allMessages[row.question_id].push(formattedMessage);
  }

  allMessages[row.question_id].sort(function (firstMessage, secondMessage) {
    return new Date(firstMessage.createdAt).getTime() - new Date(secondMessage.createdAt).getTime();
  });
}

function scheduleMessagesReload() {
  if (reloadMessagesTimer !== null) {
    window.clearTimeout(reloadMessagesTimer);
  }

  reloadMessagesTimer = window.setTimeout(function () {
    reloadMessagesTimer = null;
    loadMessages();
  }, 250);
}

async function subscribeToMessages() {
  if (!currentCouple) {
    return;
  }

  if (messagesChannel !== null) {
    await supabase.removeChannel(messagesChannel);
  }

  messagesChannel = supabase
    .channel("couple-messages-" + currentCouple.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: "couple_id=eq." + currentCouple.id
      },
      function (payload) {
        if (payload.eventType === "INSERT" && payload.new) {
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
        filter: "couple_id=eq." + currentCouple.id
      },
      function () {
        loadCouple();
      }
    )
    .subscribe(function (status) {
      if (status === "SUBSCRIBED") {
        setStatus(syncStatusText, "Live sync is on.", "success");
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setStatus(syncStatusText, "Live sync paused. Refresh if messages feel delayed.", "error");
      }
    });
}

async function handleSignedIn(user) {
  currentUser = user;
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  setStatus(authMessage, "", "");
  setStatus(appStatusMessage, "Loading your shared space...", "");

  try {
    currentProfile = await ensureProfile(user);
    signedInText.textContent = "Signed in as " + currentProfile.display_name;
    renderGreeting();
    renderPromptExperience();
    renderProfileTab();
    autoDetectTimezone();
    await loadCouple();
  } catch (error) {
    showCoupleSetup();
    setStatus(appStatusMessage, getReadableError(error), "error");
  }
}

async function handleSignedOut() {
  if (reloadMessagesTimer !== null) {
    window.clearTimeout(reloadMessagesTimer);
    reloadMessagesTimer = null;
  }

  if (messagesChannel !== null) {
    await supabase.removeChannel(messagesChannel);
    messagesChannel = null;
  }

  if (gameChannel !== null) {
    await supabase.removeChannel(gameChannel);
    gameChannel = null;
  }

  cleanupDateCall();

  myTttRole = null;
  myMemoryRole = null;

  currentUser = null;
  currentProfile = null;
  currentCouple = null;
  allMessages = createEmptyMessages();
  passwordInput.value = "";
  loginScreen.style.display = "flex";
  appScreen.style.display = "none";
  setStatus(authMessage, "", "");
  setStatus(coupleMessage, "", "");
  renderPromptExperience();
}

function getAuthFields() {
  return {
    displayName: displayNameInput.value.trim(),
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

  if (fields.displayName === "" || fields.email === "" || fields.password === "") {
    setStatus(authMessage, "Enter your name, email, and password.", "error");
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
    password: fields.password,
    options: {
      data: {
        display_name: fields.displayName
      }
    }
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
    inviteCard.style.display = "block";
  }

  setStatus(coupleMessage, "Shared space ready.", "success");
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

async function copyInviteCode() {
  if (!currentCouple) return;

  try {
    await navigator.clipboard.writeText(currentCouple.inviteCode);
    setStatus(appStatusMessage, "Invite code copied.", "success");
  } catch (error) {
    setStatus(appStatusMessage, "Copy failed. Select the invite code and copy it manually.", "error");
  }
}

async function sendMessage() {
  const messageText = messageInput.value.trim();

  if (messageText === "" || !currentUser || !currentCouple) {
    return;
  }

  sendButton.disabled = true;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      couple_id: currentCouple.id,
      question_id: currentQuestionId,
      sender_id: currentUser.id,
      text: messageText
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  sendButton.disabled = false;

  if (error) {
    setStatus(appStatusMessage, getReadableError(error), "error");
    return;
  }

  messageInput.value = "";

  if (data) {
    addOrReplaceMessage(data);
    renderPromptExperience();
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
}


// ═══════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════

const bottomNav = document.getElementById("bottomNav");
const navTabs = bottomNav.querySelectorAll(".nav-tab");

navTabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    const targetId = tab.dataset.tab;

    navTabs.forEach(function (t) {
      t.classList.remove("nav-tab-active");
    });
    tab.classList.add("nav-tab-active");

    document.querySelectorAll(".tab-content").forEach(function (panel) {
      panel.classList.remove("tab-active");
    });
    document.getElementById(targetId).classList.add("tab-active");
  });
});


// ═══════════════════════════════════════════════
// SHARED GAME UTILITIES
// ═══════════════════════════════════════════════

function shuffleArray(array) {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

var gameChannel = null;
var myTttRole = null;
var myMemoryRole = null;
var lastSavedGameState = { tictactoe: null, memory: null, date: null };

function getMyGameRole() {
  if (!currentUser || !currentCouple || !currentCouple.partnerId) return null;
  var ids = [currentUser.id, currentCouple.partnerId].sort();
  return ids[0] === currentUser.id ? "P1" : "P2";
}

async function loadGameState(gameType) {
  if (!currentCouple) return null;

  var result = await supabase
    .from("game_states")
    .select("state")
    .eq("couple_id", currentCouple.id)
    .eq("game_type", gameType)
    .maybeSingle();

  if (result.error) {
    console.error("loadGameState error:", result.error);
    return null;
  }

  return result.data ? result.data.state : null;
}

async function saveGameState(gameType, state) {
  if (!currentCouple || !currentUser) return;

  lastSavedGameState[gameType] = JSON.stringify(state);

  await supabase
    .from("game_states")
    .upsert(
      {
        couple_id: currentCouple.id,
        game_type: gameType,
        state: state,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "couple_id,game_type" }
    );
}

async function subscribeToGameStates() {
  if (!currentCouple) return;

  if (gameChannel) {
    await supabase.removeChannel(gameChannel);
  }

  gameChannel = supabase
    .channel("game-states-" + currentCouple.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_states",
        filter: "couple_id=eq." + currentCouple.id
      },
      function (payload) {
        if (!payload.new) return;
        var gameType = payload.new.game_type;
        var stateStr = JSON.stringify(payload.new.state);

        if (stateStr === lastSavedGameState[gameType]) {
          lastSavedGameState[gameType] = null;
          return;
        }

        if (gameType === "tictactoe") {
          onTTTStateFromDB(payload.new.state);
        } else if (gameType === "memory") {
          onMemoryStateFromDB(payload.new.state);
        } else if (gameType === "date") {
          onDateStateFromDB(payload.new.state);
        }
      }
    )
    .subscribe();
}


// ═══════════════════════════════════════════════
// TIC TAC TOE (PERSISTENT)
// ═══════════════════════════════════════════════

const tttGrid = document.getElementById("tttGrid");
const tttCells = tttGrid.querySelectorAll(".ttt-cell");
const tttStatusEl = document.getElementById("tttStatus");
const tttRestartBtn = document.getElementById("tttRestart");
const tttScoreXEl = document.getElementById("tttScoreX");
const tttScoreOEl = document.getElementById("tttScoreO");
const tttScoreDEl = document.getElementById("tttScoreD");
const tttOnlineBar = document.getElementById("tttOnlineBar");
const tttMyRoleEl = document.getElementById("tttMyRole");
const tttTurnTextEl = document.getElementById("tttTurnText");
const tttWaiting = document.getElementById("tttWaiting");

const TTT_X = "❤️";
const TTT_O = "💜";
const TTT_WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let tttBoard = ["","","","","","","","",""];
let tttCurrentPlayer = TTT_X;
let tttGameOver = false;
let tttScores = { x: 0, o: 0, d: 0 };

function initTTT(saveToDb) {
  tttBoard = ["","","","","","","","",""];
  tttCurrentPlayer = TTT_X;
  tttGameOver = false;

  tttCells.forEach(function (cell) {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("winner");
  });

  renderTTTStatus();

  if (saveToDb !== false) {
    saveTTTState(null, null);
  }
}

function renderTTTStatus() {
  if (!currentCouple || currentCouple.memberCount < 2 || !myTttRole) {
    tttOnlineBar.style.display = "none";
    tttWaiting.style.display = "block";
    tttWaiting.textContent = "You need a partner to play!";
    tttGrid.classList.add("game-board-disabled");
    tttStatusEl.textContent = "";
    return;
  }

  tttWaiting.style.display = "none";
  tttOnlineBar.style.display = "flex";

  var mySymbol = myTttRole === "P1" ? TTT_X : TTT_O;
  tttMyRoleEl.textContent = "You are " + mySymbol;

  if (tttGameOver) {
    tttGrid.classList.add("game-board-disabled");
    return;
  }

  var isMyTurn = tttCurrentPlayer === mySymbol;
  tttGrid.classList.toggle("game-board-disabled", !isMyTurn);
  tttTurnTextEl.textContent = isMyTurn ? "Your turn!" : "Partner's turn...";
  tttTurnTextEl.className = isMyTurn ? "your-turn" : "their-turn";
  tttStatusEl.textContent = tttCurrentPlayer + "'s turn";
}

function checkTTTWinner() {
  for (let i = 0; i < TTT_WINS.length; i++) {
    const a = TTT_WINS[i][0];
    const b = TTT_WINS[i][1];
    const c = TTT_WINS[i][2];

    if (tttBoard[a] && tttBoard[a] === tttBoard[b] && tttBoard[a] === tttBoard[c]) {
      return { winner: tttBoard[a], line: TTT_WINS[i] };
    }
  }

  if (tttBoard.every(function (cell) { return cell !== ""; })) {
    return { winner: "draw", line: null };
  }

  return null;
}

function applyTTTResult(result) {
  if (!result) return;

  tttGameOver = true;

  if (result.winner === "draw") {
    tttStatusEl.textContent = "It's a draw!";
    tttTurnTextEl.textContent = "Draw!";
    tttTurnTextEl.className = "";
    tttScores.d++;
    tttScoreDEl.textContent = tttScores.d;
  } else {
    var mySymbol = myTttRole === "P1" ? TTT_X : TTT_O;
    var iWon = result.winner === mySymbol;
    tttStatusEl.textContent = result.winner + " wins!";
    tttTurnTextEl.textContent = iWon ? "You win!" : "Partner wins!";
    tttTurnTextEl.className = iWon ? "your-turn" : "their-turn";

    result.line.forEach(function (idx) {
      tttCells[idx].classList.add("winner");
    });

    if (result.winner === TTT_X) {
      tttScores.x++;
      tttScoreXEl.textContent = tttScores.x;
    } else {
      tttScores.o++;
      tttScoreOEl.textContent = tttScores.o;
    }
  }

  tttCells.forEach(function (cell) { cell.disabled = true; });
}

function saveTTTState(winner, winLine) {
  saveGameState("tictactoe", {
    board: tttBoard.slice(),
    currentPlayer: tttCurrentPlayer,
    gameOver: tttGameOver,
    scores: { x: tttScores.x, o: tttScores.o, d: tttScores.d },
    winner: winner,
    winLine: winLine
  });
}

function handleTTTClick(index) {
  if (tttGameOver || tttBoard[index] !== "") return;
  if (!currentCouple || currentCouple.memberCount < 2) return;

  var mySymbol = myTttRole === "P1" ? TTT_X : TTT_O;
  if (tttCurrentPlayer !== mySymbol) return;

  tttBoard[index] = tttCurrentPlayer;
  tttCells[index].textContent = tttCurrentPlayer;

  var result = checkTTTWinner();
  var winner = null;
  var winLine = null;

  if (result) {
    applyTTTResult(result);
    winner = result.winner;
    winLine = result.line;
  } else {
    tttCurrentPlayer = tttCurrentPlayer === TTT_X ? TTT_O : TTT_X;
  }

  renderTTTStatus();
  saveTTTState(winner, winLine);
}

function onTTTStateFromDB(state) {
  if (!state) return;

  tttBoard = state.board || ["","","","","","","","",""];
  tttCurrentPlayer = state.currentPlayer || TTT_X;
  tttGameOver = state.gameOver || false;
  tttScores = {
    x: (state.scores && state.scores.x) || 0,
    o: (state.scores && state.scores.o) || 0,
    d: (state.scores && state.scores.d) || 0
  };

  tttCells.forEach(function (cell, i) {
    cell.textContent = tttBoard[i];
    cell.disabled = tttGameOver;
    cell.classList.remove("winner");
  });

  tttScoreXEl.textContent = tttScores.x;
  tttScoreOEl.textContent = tttScores.o;
  tttScoreDEl.textContent = tttScores.d;

  if (tttGameOver && state.winner) {
    var mySymbol = myTttRole === "P1" ? TTT_X : TTT_O;
    if (state.winner === "draw") {
      tttStatusEl.textContent = "It's a draw!";
      tttTurnTextEl.textContent = "Draw!";
      tttTurnTextEl.className = "";
    } else {
      var iWon = state.winner === mySymbol;
      tttStatusEl.textContent = state.winner + " wins!";
      tttTurnTextEl.textContent = iWon ? "You win!" : "Partner wins!";
      tttTurnTextEl.className = iWon ? "your-turn" : "their-turn";
    }

    if (state.winLine) {
      state.winLine.forEach(function (idx) {
        tttCells[idx].classList.add("winner");
      });
    }
  }

  renderTTTStatus();
}

tttCells.forEach(function (cell) {
  cell.addEventListener("click", function () {
    handleTTTClick(parseInt(cell.dataset.index));
  });
});

tttRestartBtn.addEventListener("click", function () {
  initTTT(true);
});


// ═══════════════════════════════════════════════
// MEMORY MATCH (PERSISTENT)
// ═══════════════════════════════════════════════

const memoryGrid = document.getElementById("memoryGrid");
const memoryPairsEl = document.getElementById("memoryPairs");
const memoryMyScoreEl = document.getElementById("memoryMyScore");
const memoryPartnerScoreEl = document.getElementById("memoryPartnerScore");
const memoryRestartBtn = document.getElementById("memoryRestart");
const memoryOnlineBar = document.getElementById("memoryOnlineBar");
const memoryMyRoleEl = document.getElementById("memoryMyRole");
const memoryTurnTextEl = document.getElementById("memoryTurnText");
const memoryWaiting = document.getElementById("memoryWaiting");
const memoryStatsEl = document.getElementById("memoryStats");

let memoryCards = [];
let memoryFlipped = [];
let memoryMatchedIndices = [];
let memoryTotalMatched = 0;
let memoryScores = { P1: 0, P2: 0 };
let memoryCurrentTurn = "P1";
let memoryLocked = false;
let memoryInitialized = false;

function initMemoryGame(saveToDb) {
  memoryFlipped = [];
  memoryMatchedIndices = [];
  memoryTotalMatched = 0;
  memoryScores = { P1: 0, P2: 0 };
  memoryCurrentTurn = "P1";
  memoryLocked = false;
  memoryInitialized = false;

  if (!currentCouple || currentCouple.memberCount < 2 || !myMemoryRole) {
    renderMemoryStatus();
    return;
  }

  var pairs = memoryMatchEmojis.concat(memoryMatchEmojis);
  memoryCards = shuffleArray(pairs);
  buildMemoryGrid();
  memoryInitialized = true;

  renderMemoryStatus();

  if (saveToDb !== false) {
    saveMemoryState();
  }
}

function buildMemoryGrid() {
  memoryGrid.innerHTML = "";

  for (var i = 0; i < memoryCards.length; i++) {
    var card = document.createElement("button");
    card.type = "button";
    card.classList.add("memory-card");
    card.dataset.index = i;

    var back = document.createElement("span");
    back.classList.add("memory-card-back");
    back.textContent = "?";

    var emoji = document.createElement("span");
    emoji.classList.add("memory-card-emoji");
    emoji.textContent = memoryCards[i];

    card.appendChild(back);
    card.appendChild(emoji);

    (function (idx, cardEl) {
      cardEl.addEventListener("click", function () {
        handleMemoryCardClick(idx, cardEl);
      });
    })(i, card);

    memoryGrid.appendChild(card);
  }

  updateMemoryScoreDisplay();
}

function renderMemoryStatus() {
  if (!currentCouple || currentCouple.memberCount < 2 || !myMemoryRole) {
    memoryOnlineBar.style.display = "none";
    memoryWaiting.style.display = "block";
    memoryWaiting.textContent = "You need a partner to play!";
    memoryGrid.classList.add("game-board-disabled");
    memoryStatsEl.style.display = "none";
    return;
  }

  memoryWaiting.style.display = "none";
  memoryOnlineBar.style.display = "flex";
  memoryStatsEl.style.display = "flex";

  memoryMyRoleEl.textContent = myMemoryRole === "P1" ? "Player 1" : "Player 2";

  if (memoryTotalMatched >= 8) {
    memoryGrid.classList.add("game-board-disabled");
    return;
  }

  var isMyTurn = memoryCurrentTurn === myMemoryRole;
  memoryGrid.classList.toggle("game-board-disabled", !isMyTurn || memoryLocked);
  memoryTurnTextEl.textContent = isMyTurn ? "Your turn!" : "Partner's turn...";
  memoryTurnTextEl.className = isMyTurn ? "your-turn" : "their-turn";
}

function updateMemoryScoreDisplay() {
  var myScore = memoryScores[myMemoryRole] || 0;
  var partnerRole = myMemoryRole === "P1" ? "P2" : "P1";
  var partnerScore = memoryScores[partnerRole] || 0;

  memoryMyScoreEl.textContent = myScore;
  memoryPartnerScoreEl.textContent = partnerScore;
  memoryPairsEl.textContent = "Pairs: " + memoryTotalMatched + " / 8";
}

function saveMemoryState() {
  saveGameState("memory", {
    cards: memoryCards,
    matched: memoryMatchedIndices.slice(),
    flipped: memoryFlipped.map(function (f) { return f.index; }),
    totalMatched: memoryTotalMatched,
    scores: { P1: memoryScores.P1, P2: memoryScores.P2 },
    currentTurn: memoryCurrentTurn,
    initialized: memoryInitialized
  });
}

function handleMemoryCardClick(index, cardElement) {
  if (memoryLocked) return;
  if (!currentCouple || currentCouple.memberCount < 2 || !memoryInitialized) return;
  if (memoryCurrentTurn !== myMemoryRole) return;
  if (cardElement.classList.contains("flipped")) return;
  if (cardElement.classList.contains("matched")) return;

  flipMemoryCard(index, cardElement);

  if (memoryFlipped.length === 2) {
    evaluateMemoryPair();
  } else {
    saveMemoryState();
  }
}

function flipMemoryCard(index, cardElement) {
  if (!cardElement) {
    cardElement = memoryGrid.querySelectorAll(".memory-card")[index];
  }
  if (!cardElement || cardElement.classList.contains("flipped") || cardElement.classList.contains("matched")) return;

  cardElement.classList.add("flipped");
  memoryFlipped.push({ index: index, element: cardElement });
}

function evaluateMemoryPair() {
  memoryLocked = true;
  var first = memoryFlipped[0];
  var second = memoryFlipped[1];

  if (memoryCards[first.index] === memoryCards[second.index]) {
    first.element.classList.add("matched");
    second.element.classList.add("matched");
    memoryMatchedIndices.push(first.index, second.index);
    memoryScores[memoryCurrentTurn]++;
    memoryTotalMatched++;
    memoryFlipped = [];
    memoryLocked = false;

    updateMemoryScoreDisplay();
    renderMemoryStatus();
    saveMemoryState();

    if (memoryTotalMatched >= 8) {
      showMemoryEndState();
    }
  } else {
    window.setTimeout(function () {
      first.element.classList.remove("flipped");
      second.element.classList.remove("flipped");
      memoryFlipped = [];
      memoryCurrentTurn = memoryCurrentTurn === "P1" ? "P2" : "P1";
      memoryLocked = false;
      renderMemoryStatus();
      saveMemoryState();
    }, 700);
  }
}

function showMemoryEndState() {
  var myScore = memoryScores[myMemoryRole] || 0;
  var partnerRole = myMemoryRole === "P1" ? "P2" : "P1";
  var partnerScore = memoryScores[partnerRole] || 0;

  if (myScore > partnerScore) {
    memoryTurnTextEl.textContent = "You win!";
    memoryTurnTextEl.className = "your-turn";
  } else if (partnerScore > myScore) {
    memoryTurnTextEl.textContent = "Partner wins!";
    memoryTurnTextEl.className = "their-turn";
  } else {
    memoryTurnTextEl.textContent = "It's a tie!";
    memoryTurnTextEl.className = "";
  }
}

function onMemoryStateFromDB(state) {
  if (!state || !state.initialized) return;

  memoryCards = state.cards;
  memoryTotalMatched = state.totalMatched || 0;
  memoryScores = { P1: (state.scores && state.scores.P1) || 0, P2: (state.scores && state.scores.P2) || 0 };
  memoryCurrentTurn = state.currentTurn || "P1";
  memoryMatchedIndices = state.matched || [];
  memoryInitialized = true;
  memoryLocked = false;

  buildMemoryGrid();

  var cardElements = memoryGrid.querySelectorAll(".memory-card");

  memoryMatchedIndices.forEach(function (idx) {
    cardElements[idx].classList.add("flipped", "matched");
  });

  memoryFlipped = [];
  if (state.flipped && state.flipped.length > 0) {
    state.flipped.forEach(function (idx) {
      cardElements[idx].classList.add("flipped");
      memoryFlipped.push({ index: idx, element: cardElements[idx] });
    });

    if (memoryFlipped.length === 2) {
      evaluateMemoryPair();
      return;
    }
  }

  updateMemoryScoreDisplay();
  renderMemoryStatus();

  if (memoryTotalMatched >= 8) {
    showMemoryEndState();
  }
}

memoryRestartBtn.addEventListener("click", function () {
  initMemoryGame(true);
});


// ═══════════════════════════════════════════════
// TRUTH OR DARE
// ═══════════════════════════════════════════════

const truthBtn = document.getElementById("truthBtn");
const dareBtn = document.getElementById("dareBtn");
const tdResult = document.getElementById("tdResult");
const tdResultLabel = document.getElementById("tdResultLabel");
const tdResultText = document.getElementById("tdResultText");
const tdNextBtn = document.getElementById("tdNext");

let tdLastType = null;

function showTruthOrDare(type) {
  const prompts = type === "truth" ? truthPrompts : darePrompts;
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  tdResultLabel.textContent = type.toUpperCase();
  tdResultText.textContent = prompt;
  tdLastType = type;

  tdResult.classList.remove("td-result-truth", "td-result-dare");
  tdResult.classList.add("td-result-" + type);
  tdNextBtn.style.display = "block";
}

truthBtn.addEventListener("click", function () {
  showTruthOrDare("truth");
});

dareBtn.addEventListener("click", function () {
  showTruthOrDare("dare");
});

tdNextBtn.addEventListener("click", function () {
  if (tdLastType) {
    showTruthOrDare(tdLastType);
  }
});


// ═══════════════════════════════════════════════
// LOVE QUIZ
// ═══════════════════════════════════════════════

const quizContent = document.getElementById("quizContent");
const quizEnd = document.getElementById("quizEnd");
const quizProgressEl = document.getElementById("quizProgress");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizNoteEl = document.getElementById("quizNote");
const quizEndScoreEl = document.getElementById("quizEndScore");
const quizRestartBtn = document.getElementById("quizRestart");

let quizCurrentIndex = 0;
let quizAnswered = 0;
let quizShuffled = [];

function initQuiz() {
  quizShuffled = shuffleArray(loveQuizQuestions);
  quizCurrentIndex = 0;
  quizAnswered = 0;
  quizContent.style.display = "block";
  quizEnd.style.display = "none";
  showQuizQuestion();
}

function showQuizQuestion() {
  if (quizCurrentIndex >= quizShuffled.length) {
    quizContent.style.display = "none";
    quizEnd.style.display = "block";
    quizEndScoreEl.textContent = "You answered " + quizAnswered + " out of " + quizShuffled.length + " questions together. Compare your answers and see how well you really know each other!";
    return;
  }

  const q = quizShuffled[quizCurrentIndex];
  quizProgressEl.textContent = "Question " + (quizCurrentIndex + 1) + " / " + quizShuffled.length;
  quizQuestionEl.textContent = q.question;
  quizNoteEl.textContent = q.note;
  quizNoteEl.classList.remove("visible");

  quizOptionsEl.innerHTML = "";

  for (let i = 0; i < q.options.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("quiz-option");
    btn.textContent = q.options[i];

    btn.addEventListener("click", function () {
      quizOptionsEl.querySelectorAll(".quiz-option").forEach(function (b) {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      quizNoteEl.classList.add("visible");
      quizAnswered++;

      window.setTimeout(function () {
        quizCurrentIndex++;
        showQuizQuestion();
      }, 1800);
    });

    quizOptionsEl.appendChild(btn);
  }
}

quizRestartBtn.addEventListener("click", initQuiz);


// ═══════════════════════════════════════════════
// GAME LAUNCHER / BACK BUTTONS
// ═══════════════════════════════════════════════

const gamesGrid = document.getElementById("gamesGrid");
const gamePanels = {
  memory: document.getElementById("gameMemory"),
  tictactoe: document.getElementById("gameTictactoe"),
  truthdare: document.getElementById("gameTruthdare"),
  quiz: document.getElementById("gameQuiz")
};

const gameInitFunctions = {
  truthdare: function () {},
  quiz: initQuiz
};

gamesGrid.querySelectorAll(".game-launcher").forEach(function (btn) {
  btn.addEventListener("click", async function () {
    var gameId = btn.dataset.game;
    gamesGrid.style.display = "none";
    gamePanels[gameId].style.display = "block";

    if (gameId === "tictactoe") {
      var tttState = await loadGameState("tictactoe");
      if (tttState) {
        onTTTStateFromDB(tttState);
      } else {
        initTTT(true);
      }
    } else if (gameId === "memory") {
      var memState = await loadGameState("memory");
      if (memState && memState.initialized) {
        onMemoryStateFromDB(memState);
      } else {
        initMemoryGame(true);
      }
    } else {
      gameInitFunctions[gameId]();
    }

    recordEngagement();
  });
});

document.querySelectorAll(".game-back-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var gameId = btn.dataset.close;
    gamePanels[gameId].style.display = "none";
    gamesGrid.style.display = "grid";
  });
});


// ═══════════════════════════════════════════════
// VISIT COUNTDOWN
// ═══════════════════════════════════════════════

const countdownDateInput = document.getElementById("countdownDate");
const countdownSetBtn = document.getElementById("countdownSet");
const countdownClearBtn = document.getElementById("countdownClear");
const countdownTimer = document.getElementById("countdownTimer");
const countdownMessage = document.getElementById("countdownMessage");
const cdDays = document.getElementById("cdDays");
const cdHours = document.getElementById("cdHours");
const cdMinutes = document.getElementById("cdMinutes");
const cdSeconds = document.getElementById("cdSeconds");

let countdownInterval = null;

function loadCountdown() {
  const savedDate = localStorage.getItem("couple_countdown_date");

  if (savedDate) {
    countdownDateInput.value = savedDate;
    startCountdown(savedDate);
  }
}

function startCountdown(dateStr) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const target = new Date(dateStr + "T00:00:00").getTime();

  countdownMessage.style.display = "none";
  countdownTimer.style.display = "flex";
  countdownSetBtn.style.display = "none";
  countdownClearBtn.style.display = "block";

  function updateCountdown() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      cdDays.textContent = "0";
      cdHours.textContent = "0";
      cdMinutes.textContent = "0";
      cdSeconds.textContent = "0";
      countdownMessage.textContent = "The day is here!";
      countdownMessage.style.display = "block";
      clearInterval(countdownInterval);
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    cdDays.textContent = days;
    cdHours.textContent = hours;
    cdMinutes.textContent = minutes;
    cdSeconds.textContent = seconds;
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

countdownSetBtn.addEventListener("click", function () {
  const dateVal = countdownDateInput.value;
  if (!dateVal) return;

  localStorage.setItem("couple_countdown_date", dateVal);
  startCountdown(dateVal);
});

countdownClearBtn.addEventListener("click", function () {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  localStorage.removeItem("couple_countdown_date");
  countdownTimer.style.display = "none";
  countdownMessage.textContent = "Set a date to start counting down!";
  countdownMessage.style.display = "block";
  countdownSetBtn.style.display = "block";
  countdownClearBtn.style.display = "none";
  countdownDateInput.value = "";
});


// ═══════════════════════════════════════════════
// LOVE DICE
// ═══════════════════════════════════════════════

const die1 = document.getElementById("die1");
const die2 = document.getElementById("die2");
const diceResultEl = document.getElementById("diceResult");
const rollDiceBtn = document.getElementById("rollDice");

const diceEmojis = ["🎲", "🎯", "💫", "🌟", "🎪", "🎭"];

rollDiceBtn.addEventListener("click", function () {
  rollDiceBtn.disabled = true;
  die1.classList.add("rolling");
  die2.classList.add("rolling");

  const activityIndex = Math.floor(Math.random() * diceActivities.length);
  const moodIndex = Math.floor(Math.random() * diceMoods.length);

  window.setTimeout(function () {
    die1.classList.remove("rolling");
    die2.classList.remove("rolling");
    die1.textContent = diceEmojis[activityIndex % diceEmojis.length];
    die2.textContent = diceEmojis[(moodIndex + 3) % diceEmojis.length];
    diceResultEl.textContent = diceActivities[activityIndex] + " " + diceMoods[moodIndex];
    rollDiceBtn.disabled = false;
    recordEngagement();
  }, 500);
});


// ═══════════════════════════════════════════════
// HUG BUTTON
// ═══════════════════════════════════════════════

const hugButton = document.getElementById("hugButton");
const hugParticles = document.getElementById("hugParticles");
const hugCountEl = document.getElementById("hugCount");

let hugCount = parseInt(localStorage.getItem("couple_hug_count") || "0");
hugCountEl.textContent = hugCount;

const hugEmojis = ["❤️", "💕", "💗", "💖", "💘", "💝", "🥰", "😘", "✨", "💫"];

hugButton.addEventListener("click", function () {
  hugCount++;
  hugCountEl.textContent = hugCount;
  localStorage.setItem("couple_hug_count", hugCount.toString());
  recordEngagement();

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement("span");
    particle.classList.add("hug-particle");
    particle.textContent = hugEmojis[Math.floor(Math.random() * hugEmojis.length)];

    const angle = (Math.PI * 2 * i) / 12;
    const distance = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    particle.style.setProperty("--dx", dx + "px");
    particle.style.setProperty("--dy", dy + "px");

    hugParticles.appendChild(particle);

    window.setTimeout(function () {
      particle.remove();
    }, 900);
  }
});


// ═══════════════════════════════════════════════
// FORTUNE COOKIE
// ═══════════════════════════════════════════════

const fortuneCookie = document.getElementById("fortuneCookie");
const fortuneText = document.getElementById("fortuneText");
const newFortuneBtn = document.getElementById("newFortune");

function revealFortune() {
  const fortune = fortuneCookies[Math.floor(Math.random() * fortuneCookies.length)];
  recordEngagement();

  fortuneCookie.classList.add("cracked");
  window.setTimeout(function () {
    fortuneCookie.classList.remove("cracked");
  }, 600);

  fortuneText.textContent = fortune;
  fortuneText.classList.add("revealed");
  newFortuneBtn.style.display = "block";
}

fortuneCookie.addEventListener("click", revealFortune);

newFortuneBtn.addEventListener("click", revealFortune);


// ═══════════════════════════════════════════════
// STREAK SYSTEM
// ═══════════════════════════════════════════════

const streakBar = document.getElementById("streakBar");
const streakCountEl = document.getElementById("streakCount");
const heartsCountEl = document.getElementById("heartsCount");
const streakFireEl = document.getElementById("streakFire");
const streakStatusEl = document.getElementById("streakStatus");
const streakDetailCountEl = document.getElementById("streakDetailCount");
const streakDetailHeartsEl = document.getElementById("streakDetailHearts");
const streakDetailStatusEl = document.getElementById("streakDetailStatus");
const streakBarTimerEl = document.getElementById("streakBarTimer");
const streakDetailTimerEl = document.getElementById("streakDetailTimer");
const nextMilestoneNameEl = document.getElementById("nextMilestoneName");
const nextMilestoneTargetEl = document.getElementById("nextMilestoneTarget");
const streakProgressFillEl = document.getElementById("streakProgressFill");
const streakProgressTextEl = document.getElementById("streakProgressText");
const streakBadgeList = document.getElementById("streakBadgeList");
const milestoneOverlay = document.getElementById("milestoneOverlay");
const milestoneEmojiEl = document.getElementById("milestoneEmoji");
const milestoneTitleEl = document.getElementById("milestoneTitle");
const milestoneSubtitleEl = document.getElementById("milestoneSubtitle");
const milestoneDismissBtn = document.getElementById("milestoneDismiss");

const MILESTONES = [
  { days: 7, bonus: 5, name: "Week of Love", emoji: "🌱" },
  { days: 14, bonus: 10, name: "Fortnight of Fire", emoji: "🔥" },
  { days: 30, bonus: 25, name: "Monthly Magic", emoji: "✨" },
  { days: 50, bonus: 50, name: "Golden Couple", emoji: "💛" },
  { days: 100, bonus: 100, name: "Century of Love", emoji: "💎" },
  { days: 365, bonus: 365, name: "Soulmates", emoji: "👑" }
];

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

var streakTimerInterval = null;

function loadStreak() {
  updateStreakUI();
  startStreakTimer();
}

function getTimeUntilMidnight() {
  var now = new Date();
  var midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function formatCountdown(ms) {
  var totalSec = Math.floor(ms / 1000);
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  return h + "h " + (m < 10 ? "0" : "") + m + "m " + (s < 10 ? "0" : "") + s + "s";
}

function updateStreakTimer() {
  var ms = getTimeUntilMidnight();
  var lastDate = localStorage.getItem("couple_streak_last_date") || "";
  var today = getTodayString();
  var engagedToday = lastDate === today;
  var formatted = formatCountdown(ms);

  if (engagedToday) {
    streakBarTimerEl.textContent = "Resets in " + formatted;
    streakDetailTimerEl.textContent = "Next streak window opens in " + formatted;
  } else {
    streakBarTimerEl.textContent = formatted + " left";
    streakDetailTimerEl.textContent = "Interact within " + formatted + " to keep your streak!";
  }

  if (ms <= 0) {
    updateStreakUI();
  }
}

function startStreakTimer() {
  if (streakTimerInterval) clearInterval(streakTimerInterval);
  updateStreakTimer();
  streakTimerInterval = setInterval(updateStreakTimer, 1000);
}

function recordEngagement() {
  const today = getTodayString();
  const lastDate = localStorage.getItem("couple_streak_last_date") || "";
  const currentStreak = parseInt(localStorage.getItem("couple_streak_count") || "0");
  const totalHearts = parseInt(localStorage.getItem("couple_streak_hearts") || "0");

  if (lastDate === today) {
    return;
  }

  var newStreak;
  if (lastDate === getYesterdayString()) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1;
  }

  var heartsEarned = 1;
  var milestoneHit = null;

  for (var i = 0; i < MILESTONES.length; i++) {
    if (newStreak === MILESTONES[i].days) {
      heartsEarned += MILESTONES[i].bonus;
      milestoneHit = MILESTONES[i];
      break;
    }
  }

  localStorage.setItem("couple_streak_last_date", today);
  localStorage.setItem("couple_streak_count", newStreak.toString());
  localStorage.setItem("couple_streak_hearts", (totalHearts + heartsEarned).toString());

  updateStreakUI();

  if (milestoneHit) {
    showMilestoneCelebration(milestoneHit);
  }
}

function addBonusHearts(amount) {
  var totalHearts = parseInt(localStorage.getItem("couple_streak_hearts") || "0");
  localStorage.setItem("couple_streak_hearts", (totalHearts + amount).toString());
  updateStreakUI();
}

function updateStreakUI() {
  var streak = parseInt(localStorage.getItem("couple_streak_count") || "0");
  var hearts = parseInt(localStorage.getItem("couple_streak_hearts") || "0");
  var lastDate = localStorage.getItem("couple_streak_last_date") || "";
  var today = getTodayString();
  var yesterday = getYesterdayString();
  var engagedToday = lastDate === today;

  if (lastDate !== today && lastDate !== yesterday) {
    streak = 0;
  }

  streakCountEl.textContent = streak;
  heartsCountEl.textContent = hearts;
  streakDetailCountEl.textContent = streak;
  streakDetailHeartsEl.textContent = hearts;

  if (engagedToday) {
    streakBar.classList.add("active-today");
    streakStatusEl.textContent = "Done today!";
    streakDetailStatusEl.textContent = "You've already engaged today. Come back tomorrow to keep it going!";
    streakDetailStatusEl.classList.add("done-today");
  } else {
    streakBar.classList.remove("active-today");
    streakStatusEl.textContent = "Do something today!";
    streakDetailStatusEl.textContent = streak > 0
      ? "Don't break your streak! Do something today."
      : "Use the app today to start your streak!";
    streakDetailStatusEl.classList.remove("done-today");
  }

  var nextMilestone = null;
  for (var i = 0; i < MILESTONES.length; i++) {
    if (streak < MILESTONES[i].days) {
      nextMilestone = MILESTONES[i];
      break;
    }
  }

  if (nextMilestone) {
    nextMilestoneNameEl.textContent = nextMilestone.name;
    nextMilestoneTargetEl.textContent = nextMilestone.days + " days";
    var progress = Math.round((streak / nextMilestone.days) * 100);
    streakProgressFillEl.style.width = progress + "%";
    streakProgressTextEl.textContent = streak + " / " + nextMilestone.days + " days";
  } else {
    nextMilestoneNameEl.textContent = "All unlocked!";
    nextMilestoneTargetEl.textContent = "";
    streakProgressFillEl.style.width = "100%";
    streakProgressTextEl.textContent = "You've earned every badge.";
  }

  var badges = streakBadgeList.querySelectorAll(".streak-badge");
  badges.forEach(function (badge) {
    var requiredDays = parseInt(badge.dataset.days);
    if (streak >= requiredDays || hearts > 0 && wasStreakEverReached(requiredDays)) {
      badge.classList.remove("locked");
      badge.classList.add("unlocked");
    } else {
      badge.classList.add("locked");
      badge.classList.remove("unlocked");
    }
  });
}

function wasStreakEverReached(days) {
  var reached = JSON.parse(localStorage.getItem("couple_streak_milestones_reached") || "[]");
  return reached.indexOf(days) >= 0;
}

function markMilestoneReached(days) {
  var reached = JSON.parse(localStorage.getItem("couple_streak_milestones_reached") || "[]");
  if (reached.indexOf(days) < 0) {
    reached.push(days);
    localStorage.setItem("couple_streak_milestones_reached", JSON.stringify(reached));
  }
}

function showMilestoneCelebration(milestone) {
  markMilestoneReached(milestone.days);
  milestoneEmojiEl.textContent = milestone.emoji;
  milestoneTitleEl.textContent = milestone.name + "!";
  milestoneSubtitleEl.textContent = milestone.days + "-day streak! You earned +" + milestone.bonus + " bonus hearts.";
  milestoneOverlay.classList.add("visible");

  var autoClose = window.setTimeout(function () {
    milestoneOverlay.classList.remove("visible");
  }, 4000);

  milestoneDismissBtn.onclick = function () {
    window.clearTimeout(autoClose);
    milestoneOverlay.classList.remove("visible");
  };
}


// ═══════════════════════════════════════════════
// DATE NIGHT (WebRTC + Guided Steps)
// ═══════════════════════════════════════════════

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
  if (!currentCouple) return;

  if (dateChannel) {
    supabase.removeChannel(dateChannel);
  }

  dateChannel = supabase.channel("date-" + currentCouple.id);

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

function cleanupDateCall() {
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
    supabase.removeChannel(dateChannel);
    dateChannel = null;
  }

  dateIsActive = false;
  dateCurrentStep = 0;
}

async function startDateNight() {
  if (!currentCouple || currentCouple.memberCount < 2) {
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
    initiatedBy: currentUser.id,
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
    initiatedBy: existing ? existing.initiatedBy : currentUser.id,
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
  if (currentCouple) {
    await supabase
      .from("game_states")
      .delete()
      .eq("couple_id", currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenStart);
}

async function declineDateNight() {
  if (currentCouple) {
    await supabase
      .from("game_states")
      .delete()
      .eq("couple_id", currentCouple.id)
      .eq("game_type", "date");
  }

  showDateScreen(dateScreenStart);
}

function onDateStateFromDB(state) {
  if (!state) return;

  if (state.status === "waiting" && state.initiatedBy !== currentUser.id) {
    showDateScreen(dateScreenInvite);
    switchToDateTab();
    return;
  }

  if (state.status === "active" && dateIsActive) {
    if (state.initiatedBy === currentUser.id && !datePeerConnection) {
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
    initiatedBy: existing ? existing.initiatedBy : currentUser.id,
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

async function checkExistingDateSession() {
  var state = await loadGameState("date");
  if (!state) return;

  if (state.status === "waiting") {
    if (state.initiatedBy === currentUser.id) {
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


// ═══════════════════════════════════════════════
// DIRECT CHAT
// ═══════════════════════════════════════════════

var directChatView = document.getElementById("directChatView");
var promptsChatView = document.getElementById("promptsChatView");
var chatModeDirectBtn = document.getElementById("chatModeDirectBtn");
var chatModePromptsBtn = document.getElementById("chatModePromptsBtn");
var directChatMessages = document.getElementById("directChatMessages");
var directMessageInput = document.getElementById("directMessageInput");
var directSendButton = document.getElementById("directSendButton");
var directChatName = document.getElementById("directChatName");
var directChatStatus = document.getElementById("directChatStatus");
var directChatOnlineDot = document.getElementById("directChatOnlineDot");
var directChatAvatar = document.getElementById("directChatAvatar");
var directChatAvatarPlaceholder = document.getElementById("directChatAvatarPlaceholder");
var directChatInitials = document.getElementById("directChatInitials");

chatModeDirectBtn.addEventListener("click", function () {
  chatModeDirectBtn.classList.add("chat-mode-active");
  chatModePromptsBtn.classList.remove("chat-mode-active");
  directChatView.style.display = "";
  promptsChatView.style.display = "none";
});

chatModePromptsBtn.addEventListener("click", function () {
  chatModePromptsBtn.classList.add("chat-mode-active");
  chatModeDirectBtn.classList.remove("chat-mode-active");
  promptsChatView.style.display = "";
  directChatView.style.display = "none";
});

function renderDirectChat() {
  var msgs = allMessages["direct"] || [];

  if (msgs.length === 0) {
    directChatMessages.innerHTML = '<p class="direct-chat-empty">No messages yet. Say hi!</p>';
    return;
  }

  var html = "";
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var isMe = m.sender === "me";
    var cls = isMe ? "direct-msg-me" : "direct-msg-partner";
    var timeCls = isMe ? "direct-msg-time time-right" : "direct-msg-time";
    var timeStr = formatMessageTime(m.createdAt);

    if (m.imageUrl) {
      html += '<div class="direct-msg direct-msg-photo ' + cls + '">';
      html += '<img src="' + escapeAttr(m.imageUrl) + '" alt="Photo" loading="lazy" data-full="' + escapeAttr(m.imageUrl) + '">';
      html += '</div>';
    } else {
      html += '<div class="direct-msg ' + cls + '">' + escapeHTML(m.text) + '</div>';
    }
    html += '<div class="' + timeCls + '">' + timeStr + '</div>';
  }

  directChatMessages.innerHTML = html;
  directChatMessages.scrollTop = directChatMessages.scrollHeight;
}

function formatMessageTime(isoStr) {
  if (!isoStr) return "";
  var d = new Date(isoStr);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
}

function escapeHTML(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateDirectChatHeader() {
  if (currentCouple && currentCouple.partnerName) {
    directChatName.textContent = currentCouple.partnerName;
    directMessageInput.placeholder = "Message " + currentCouple.partnerName + "...";

    var initials = currentCouple.partnerName.split(" ").map(function (w) { return w.charAt(0).toUpperCase(); }).join("").slice(0, 2);
    directChatInitials.textContent = initials || "?";
  } else {
    directChatName.textContent = "Partner";
    directMessageInput.placeholder = "Message...";
    directChatInitials.textContent = "?";
  }

  directChatAvatar.style.display = "none";
  directChatAvatarPlaceholder.style.display = "";
}

async function sendDirectMessage() {
  var text = directMessageInput.value.trim();
  if (!text || !currentUser || !currentCouple) return;

  directSendButton.disabled = true;

  var result = await supabase
    .from("messages")
    .insert({
      couple_id: currentCouple.id,
      question_id: "direct",
      sender_id: currentUser.id,
      text: text
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  directSendButton.disabled = false;

  if (result.error) {
    setStatus(appStatusMessage, getReadableError(result.error), "error");
    return;
  }

  directMessageInput.value = "";

  if (result.data) {
    addOrReplaceMessage(result.data);
    renderDirectChat();
  }

  recordEngagement();
  scheduleMessagesReload();
}

directSendButton.addEventListener("click", sendDirectMessage);

directMessageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    sendDirectMessage();
  }
});

directChatMessages.addEventListener("click", function (event) {
  var img = event.target.closest(".direct-msg-photo img");
  if (!img) return;
  var fullUrl = img.getAttribute("data-full");
  if (fullUrl) {
    galleryViewerImg.src = fullUrl;
    galleryViewerSender.textContent = "";
    galleryViewerDate.textContent = "";
    galleryViewer.style.display = "flex";
  }
});


// ═══════════════════════════════════════════════
// PHOTO MESSAGES
// ═══════════════════════════════════════════════

var directPhotoButton = document.getElementById("directPhotoButton");
var directPhotoInput = document.getElementById("directPhotoInput");

directPhotoButton.addEventListener("click", function () {
  showPhotoOptions();
});

function showPhotoOptions() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    openCameraOverlay();
  } else {
    directPhotoInput.click();
  }
}

directPhotoInput.addEventListener("change", async function () {
  var file = directPhotoInput.files[0];
  if (!file) return;
  await uploadAndSendPhoto(file);
  directPhotoInput.value = "";
});

async function compressImage(file, maxDimension) {
  maxDimension = maxDimension || 1200;
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var w = img.width, h = img.height;
      URL.revokeObjectURL(img.src);
      if (w <= maxDimension && h <= maxDimension) {
        resolve(file);
        return;
      }
      var ratio = Math.min(maxDimension / w, maxDimension / h);
      var nw = Math.round(w * ratio), nh = Math.round(h * ratio);
      var canvas = document.createElement("canvas");
      canvas.width = nw;
      canvas.height = nh;
      canvas.getContext("2d").drawImage(img, 0, 0, nw, nh);
      canvas.toBlob(function (blob) { resolve(blob); }, "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function uploadAndSendPhoto(fileOrBlob) {
  if (!currentUser || !currentCouple) return;

  directSendButton.disabled = true;
  directPhotoButton.disabled = true;

  var compressed = await compressImage(fileOrBlob);

  var ext = "jpg";
  if (fileOrBlob.name) {
    var parts = fileOrBlob.name.split(".");
    if (parts.length > 1) ext = parts.pop().toLowerCase();
  }
  var filename = currentUser.id + "_" + Date.now() + "." + ext;
  var path = currentCouple.id + "/" + filename;

  var uploadResult = await supabase.storage
    .from("photos")
    .upload(path, compressed, { contentType: compressed.type || "image/jpeg" });

  if (uploadResult.error) {
    setStatus(appStatusMessage, "Photo upload failed: " + uploadResult.error.message, "error");
    directSendButton.disabled = false;
    directPhotoButton.disabled = false;
    return;
  }

  var urlResult = supabase.storage.from("photos").getPublicUrl(path);
  var publicUrl = urlResult.data.publicUrl;

  var result = await supabase
    .from("messages")
    .insert({
      couple_id: currentCouple.id,
      question_id: "direct",
      sender_id: currentUser.id,
      text: "[photo]",
      image_url: publicUrl
    })
    .select("id, question_id, text, image_url, sender_id, created_at, profiles:sender_id(display_name)")
    .single();

  directSendButton.disabled = false;
  directPhotoButton.disabled = false;

  if (result.error) {
    setStatus(appStatusMessage, getReadableError(result.error), "error");
    return;
  }

  if (result.data) {
    addOrReplaceMessage(result.data);
    renderDirectChat();
    renderGallery();
  }

  recordEngagement();
  scheduleMessagesReload();
}


// ═══════════════════════════════════════════════
// BEREAL CAMERA
// ═══════════════════════════════════════════════

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

async function openCameraOverlay() {
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
      directPhotoInput.click();
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
  await uploadAndSendPhoto(blob);
});

function dataUrlToBlob(dataUrl) {
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

function closeCameraOverlay() {
  stopCamera();
  cameraOverlay.style.display = "none";
  cameraVideo.style.display = "";
  cameraPreview.style.display = "none";
}

cameraCloseBtn.addEventListener("click", closeCameraOverlay);


// ═══════════════════════════════════════════════
// GALLERY TAB
// ═══════════════════════════════════════════════

var galleryGrid = document.getElementById("galleryGrid");
var galleryEmpty = document.getElementById("galleryEmpty");
var galleryAddBtn = document.getElementById("galleryAddBtn");
var galleryViewer = document.getElementById("galleryViewer");
var galleryViewerClose = document.getElementById("galleryViewerClose");
var galleryViewerImg = document.getElementById("galleryViewerImg");
var galleryViewerSender = document.getElementById("galleryViewerSender");
var galleryViewerDate = document.getElementById("galleryViewerDate");

var galleryPhotos = [];

function collectGalleryPhotos() {
  var photos = [];
  var keys = Object.keys(allMessages);
  for (var k = 0; k < keys.length; k++) {
    var msgs = allMessages[keys[k]];
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i].imageUrl) {
        photos.push(msgs[i]);
      }
    }
  }
  photos.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return photos;
}

function renderGallery() {
  galleryPhotos = collectGalleryPhotos();

  if (galleryPhotos.length === 0) {
    galleryGrid.innerHTML = '';
    galleryEmpty.style.display = "";
    galleryGrid.appendChild(galleryEmpty);
    return;
  }

  galleryEmpty.style.display = "none";
  var html = "";
  for (var i = 0; i < galleryPhotos.length; i++) {
    var p = galleryPhotos[i];
    var dateStr = formatGalleryDate(p.createdAt);
    html += '<div class="gallery-item" data-index="' + i + '">';
    html += '<img src="' + escapeAttr(p.imageUrl) + '" alt="Photo" loading="lazy">';
    html += '<span class="gallery-item-date">' + dateStr + '</span>';
    html += '</div>';
  }
  galleryGrid.innerHTML = html;

  var items = galleryGrid.querySelectorAll(".gallery-item");
  items.forEach(function (item) {
    item.addEventListener("click", function () {
      var idx = parseInt(item.getAttribute("data-index"), 10);
      openGalleryViewer(idx);
    });
  });
}

function formatGalleryDate(isoStr) {
  if (!isoStr) return "";
  var d = new Date(isoStr);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getDate();
}

function openGalleryViewer(index) {
  var photo = galleryPhotos[index];
  if (!photo) return;
  galleryViewerImg.src = photo.imageUrl;
  galleryViewerSender.textContent = photo.senderName;
  galleryViewerDate.textContent = new Date(photo.createdAt).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
  galleryViewer.style.display = "flex";
}

galleryViewerClose.addEventListener("click", function () {
  galleryViewer.style.display = "none";
});

galleryAddBtn.addEventListener("click", function () {
  showPhotoOptions();
});


// ═══════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════

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

function renderProfileTab() {
  if (!currentProfile) return;

  var name = currentProfile.display_name || "";
  profileNameInput.value = name;

  if (currentProfile.avatar_url) {
    profileAvatarImg.src = currentProfile.avatar_url;
    profileAvatarImg.style.display = "";
    profileAvatarPlaceholder.style.display = "none";
  } else {
    profileAvatarImg.style.display = "none";
    profileAvatarPlaceholder.style.display = "";
    var initials = name.split(" ").map(function (w) { return w.charAt(0).toUpperCase(); }).join("").slice(0, 2);
    profileAvatarInitials.textContent = initials || "?";
  }

  if (currentCouple && currentCouple.partnerName) {
    profilePartnerName.textContent = currentCouple.partnerName;
  } else {
    profilePartnerName.textContent = "No partner yet";
  }
}

profileAvatarEditBtn.addEventListener("click", function () {
  profileAvatarInput.click();
});

profileAvatarInput.addEventListener("change", async function () {
  var file = profileAvatarInput.files[0];
  if (!file || !currentUser) return;

  setStatus(profileMessage, "Uploading...", "");

  var ext = file.name.split(".").pop() || "jpg";
  var path = currentUser.id + "/avatar." + ext;

  var uploadResult = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadResult.error) {
    setStatus(profileMessage, "Upload failed: " + uploadResult.error.message, "error");
    profileAvatarInput.value = "";
    return;
  }

  var urlResult = supabase.storage.from("avatars").getPublicUrl(path);
  var publicUrl = urlResult.data.publicUrl + "?t=" + Date.now();

  var updateResult = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", currentUser.id);

  if (updateResult.error) {
    setStatus(profileMessage, "Failed to save: " + updateResult.error.message, "error");
    profileAvatarInput.value = "";
    return;
  }

  currentProfile.avatar_url = publicUrl;
  renderProfileTab();
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
  if (!newName || !currentUser) return;

  profileNameSaveBtn.disabled = true;

  var result = await supabase
    .from("profiles")
    .update({ display_name: newName })
    .eq("id", currentUser.id);

  if (result.error) {
    setStatus(profileMessage, "Failed to save name.", "error");
    profileNameSaveBtn.disabled = false;
    return;
  }

  currentProfile.display_name = newName;
  signedInText.textContent = "Signed in as " + newName;
  renderGreeting();
  profileNameInput.setAttribute("readonly", "");
  profileNameEditBtn.style.display = "";
  profileNameSaveBtn.style.display = "none";
  profileNameSaveBtn.disabled = false;
  setStatus(profileMessage, "Name updated!", "success");
});

profileSignOutBtn.addEventListener("click", logout);


// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function init() {
  renderPromptExperience();
  loadCountdown();
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

loginButton.addEventListener("click", login);
signupButton.addEventListener("click", signup);
logoutButton.addEventListener("click", logout);
createCoupleButton.addEventListener("click", createCouple);
joinCoupleButton.addEventListener("click", joinCouple);
sendButton.addEventListener("click", sendMessage);

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

messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible" && currentCouple) {
    loadCouple();
    loadMessages();
  }
});

init();
