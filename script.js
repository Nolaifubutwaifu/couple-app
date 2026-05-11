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
  diceMoods
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
const sharedSpaceTitle = document.getElementById("sharedSpaceTitle");
const sharedSpaceDescription = document.getElementById("sharedSpaceDescription");
const activeInviteCodeText = document.getElementById("activeInviteCodeText");
const copyInviteButton = document.getElementById("copyInviteButton");
const syncStatusText = document.getElementById("syncStatusText");

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
    const sectionElement = document.createElement("section");
    sectionElement.classList.add("category-section");

    const sectionTitle = document.createElement("h2");
    sectionTitle.textContent = promptCategorySections[i].title;

    const categoryRow = document.createElement("div");
    categoryRow.classList.add("category-row");

    for (let j = 0; j < promptCategorySections[i].categories.length; j++) {
      const category = promptCategorySections[i].categories[j];
      const categoryCard = document.createElement("button");
      categoryCard.type = "button";
      categoryCard.classList.add("category-card");
      categoryCard.classList.add("category-card--" + category.theme);
      categoryCard.dataset.categoryId = category.id;
      categoryCard.setAttribute("aria-pressed", category.id === currentCategoryId ? "true" : "false");

      if (category.id === currentCategoryId) {
        categoryCard.classList.add("active");
      }

      const cardTop = document.createElement("span");
      cardTop.classList.add("category-card-top");

      const badge = document.createElement("span");
      badge.classList.add("category-badge");

      if (category.isNew) {
        badge.textContent = "New";
      }

      const progressRing = document.createElement("span");
      progressRing.classList.add("progress-ring");
      progressRing.style.setProperty("--progress", getCategoryProgress(category.id) + "%");

      cardTop.appendChild(badge);
      cardTop.appendChild(progressRing);

      const icon = document.createElement("span");
      icon.classList.add("category-icon");
      icon.textContent = category.icon;

      const label = document.createElement("span");
      label.classList.add("category-label");
      label.textContent = category.label;

      const title = document.createElement("span");
      title.classList.add("category-title");
      title.textContent = category.title;

      categoryCard.appendChild(cardTop);
      categoryCard.appendChild(icon);
      categoryCard.appendChild(label);
      categoryCard.appendChild(title);
      categoryRow.appendChild(categoryCard);

      categoryCard.addEventListener("click", function () {
        changeCategory(category.id);
      });
    }

    sectionElement.appendChild(sectionTitle);
    sectionElement.appendChild(categoryRow);
    categorySectionsContainer.appendChild(sectionElement);
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
  renderSharedSpacePanel();
  setStatus(appStatusMessage, "", "");
}

function renderSharedSpacePanel() {
  if (!currentCouple) {
    return;
  }

  activeInviteCodeText.textContent = currentCouple.inviteCode;

  if (currentCouple.memberCount >= 2) {
    const partnerName = currentCouple.partnerName || "your partner";

    sharedSpaceTitle.textContent = "Connected with " + partnerName;
    sharedSpaceDescription.textContent = "This space is now private to the two of you.";
    coupleStatusText.textContent = "Connected";
    copyInviteButton.textContent = "Full";
    copyInviteButton.disabled = true;
  } else {
    sharedSpaceTitle.textContent = "Waiting for partner";
    sharedSpaceDescription.textContent = "Share your invite code so your partner can join this private space.";
    coupleStatusText.textContent = "Invite " + currentCouple.inviteCode;
    copyInviteButton.textContent = "Copy";
    copyInviteButton.disabled = false;
  }
}

async function ensureProfile(user) {
  const typedName = displayNameInput.value.trim();
  const metadataName = user.user_metadata && user.user_metadata.display_name;
  const fallbackName = user.email ? user.email.split("@")[0] : "You";
  const profileName = typedName || metadataName || fallbackName;

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, display_name")
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
    .select("id, display_name")
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
    partnerName: coupleRow.partner_name || ""
  };

  showMainExperience();
  await loadMessages();
  await subscribeToMessages();
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
    .select("id, question_id, text, sender_id, created_at, profiles:sender_id(display_name)")
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
    renderPromptExperience();
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

async function signup() {
  const fields = getAuthFields();

  if (fields.displayName === "" || fields.email === "" || fields.password === "") {
    setStatus(authMessage, "Enter your name, email, and password.", "error");
    return;
  }

  if (fields.password.length < 6) {
    setStatus(authMessage, "Use a password with at least 6 characters.", "error");
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
  if (!currentCouple || copyInviteButton.disabled) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentCouple.inviteCode);
    copyInviteButton.textContent = "Copied";
    setStatus(appStatusMessage, "Invite code copied.", "success");

    window.setTimeout(function () {
      copyInviteButton.textContent = "Copy";
    }, 1800);
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
    .select("id, question_id, text, sender_id, created_at, profiles:sender_id(display_name)")
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
// MEMORY MATCH GAME
// ═══════════════════════════════════════════════

const memoryGrid = document.getElementById("memoryGrid");
const memoryMovesEl = document.getElementById("memoryMoves");
const memoryPairsEl = document.getElementById("memoryPairs");
const memoryRestartBtn = document.getElementById("memoryRestart");

let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = 0;
let memoryMoveCount = 0;
let memoryLocked = false;

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

function initMemoryGame() {
  const pairs = memoryMatchEmojis.concat(memoryMatchEmojis);
  memoryCards = shuffleArray(pairs);
  memoryFlipped = [];
  memoryMatched = 0;
  memoryMoveCount = 0;
  memoryLocked = false;
  memoryMovesEl.textContent = "Moves: 0";
  memoryPairsEl.textContent = "Pairs: 0 / 8";

  memoryGrid.innerHTML = "";

  for (let i = 0; i < memoryCards.length; i++) {
    const card = document.createElement("button");
    card.type = "button";
    card.classList.add("memory-card");
    card.dataset.index = i;

    const back = document.createElement("span");
    back.classList.add("memory-card-back");
    back.textContent = "?";

    const emoji = document.createElement("span");
    emoji.classList.add("memory-card-emoji");
    emoji.textContent = memoryCards[i];

    card.appendChild(back);
    card.appendChild(emoji);

    card.addEventListener("click", function () {
      handleMemoryCardClick(i, card);
    });

    memoryGrid.appendChild(card);
  }
}

function handleMemoryCardClick(index, cardElement) {
  if (memoryLocked) return;
  if (cardElement.classList.contains("flipped")) return;
  if (cardElement.classList.contains("matched")) return;

  cardElement.classList.add("flipped");
  memoryFlipped.push({ index: index, element: cardElement });

  if (memoryFlipped.length === 2) {
    memoryMoveCount++;
    memoryMovesEl.textContent = "Moves: " + memoryMoveCount;

    const first = memoryFlipped[0];
    const second = memoryFlipped[1];

    if (memoryCards[first.index] === memoryCards[second.index]) {
      first.element.classList.add("matched");
      second.element.classList.add("matched");
      memoryMatched++;
      memoryPairsEl.textContent = "Pairs: " + memoryMatched + " / 8";
      memoryFlipped = [];

      if (memoryMatched === 8) {
        memoryMovesEl.textContent = "Done in " + memoryMoveCount + " moves!";
      }
    } else {
      memoryLocked = true;
      window.setTimeout(function () {
        first.element.classList.remove("flipped");
        second.element.classList.remove("flipped");
        memoryFlipped = [];
        memoryLocked = false;
      }, 700);
    }
  }
}

memoryRestartBtn.addEventListener("click", initMemoryGame);


// ═══════════════════════════════════════════════
// TIC TAC TOE
// ═══════════════════════════════════════════════

const tttGrid = document.getElementById("tttGrid");
const tttCells = tttGrid.querySelectorAll(".ttt-cell");
const tttStatusEl = document.getElementById("tttStatus");
const tttRestartBtn = document.getElementById("tttRestart");
const tttScoreXEl = document.getElementById("tttScoreX");
const tttScoreOEl = document.getElementById("tttScoreO");
const tttScoreDEl = document.getElementById("tttScoreD");

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

function initTTT() {
  tttBoard = ["","","","","","","","",""];
  tttCurrentPlayer = TTT_X;
  tttGameOver = false;
  tttStatusEl.textContent = TTT_X + " goes first";

  tttCells.forEach(function (cell) {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("winner");
  });
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

function handleTTTClick(index) {
  if (tttGameOver || tttBoard[index] !== "") return;

  tttBoard[index] = tttCurrentPlayer;
  tttCells[index].textContent = tttCurrentPlayer;

  const result = checkTTTWinner();

  if (result) {
    tttGameOver = true;

    if (result.winner === "draw") {
      tttStatusEl.textContent = "It's a draw!";
      tttScores.d++;
      tttScoreDEl.textContent = tttScores.d;
    } else {
      tttStatusEl.textContent = result.winner + " wins!";
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
    return;
  }

  tttCurrentPlayer = tttCurrentPlayer === TTT_X ? TTT_O : TTT_X;
  tttStatusEl.textContent = tttCurrentPlayer + "'s turn";
}

tttCells.forEach(function (cell) {
  cell.addEventListener("click", function () {
    handleTTTClick(parseInt(cell.dataset.index));
  });
});

tttRestartBtn.addEventListener("click", initTTT);


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
  memory: initMemoryGame,
  tictactoe: initTTT,
  truthdare: function () {},
  quiz: initQuiz
};

gamesGrid.querySelectorAll(".game-launcher").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const gameId = btn.dataset.game;
    gamesGrid.style.display = "none";
    gamePanels[gameId].style.display = "block";
    gameInitFunctions[gameId]();
    recordEngagement();
  });
});

document.querySelectorAll(".game-back-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const gameId = btn.dataset.close;
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

function loadStreak() {
  updateStreakUI();
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
copyInviteButton.addEventListener("click", copyInviteCode);
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
