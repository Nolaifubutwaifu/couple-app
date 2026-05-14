import { app } from "./state.js";
import { saveGameState } from "./games.js";
import { fortuneCookies, diceActivities, diceMoods } from "./data.js";

// ─── Visit Countdown ───

const countdownDateInput = document.getElementById("countdownDate");
const countdownSetBtn = document.getElementById("countdownSet");
const countdownClearBtn = document.getElementById("countdownClear");
const countdownTimer = document.getElementById("countdownTimer");
const countdownMessage = document.getElementById("countdownMessage");
const cdDays = document.getElementById("cdDays");
const cdHours = document.getElementById("cdHours");
const cdMinutes = document.getElementById("cdMinutes");
const cdSeconds = document.getElementById("cdSeconds");

var countdownInterval = null;

export function getCountdownInterval() { return countdownInterval; }
export function clearCountdownInterval() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

export function loadCountdown() {
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

export function initCountdownListeners(saveCoupleStats) {
  countdownSetBtn.addEventListener("click", function () {
    const dateVal = countdownDateInput.value;
    if (!dateVal) return;

    localStorage.setItem("couple_countdown_date", dateVal);
    startCountdown(dateVal);
    saveCoupleStats();
  });

  countdownClearBtn.addEventListener("click", function () {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    localStorage.removeItem("couple_countdown_date");
    saveCoupleStats();
    countdownTimer.style.display = "none";
    countdownMessage.textContent = "Set a date to start counting down!";
    countdownMessage.style.display = "block";
    countdownSetBtn.style.display = "block";
    countdownClearBtn.style.display = "none";
    countdownDateInput.value = "";
  });
}


// ─── Love Dice ───

const die1 = document.getElementById("die1");
const die2 = document.getElementById("die2");
const diceResultEl = document.getElementById("diceResult");
const rollDiceBtn = document.getElementById("rollDice");

const diceEmojis = ["🎲", "🎯", "💫", "🌟", "🎪", "🎭"];

export function initDice(recordEngagement) {
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
}


// ─── Hug Button ───

const hugButton = document.getElementById("hugButton");
const hugParticles = document.getElementById("hugParticles");
const hugCountEl = document.getElementById("hugCount");

export var hugCount = parseInt(localStorage.getItem("couple_hug_count") || "0");
hugCountEl.textContent = hugCount;

const hugEmojis = ["❤️", "💕", "💗", "💖", "💘", "💝", "🥰", "😘", "✨", "💫"];

export function setHugCount(val) {
  hugCount = val;
  hugCountEl.textContent = hugCount;
}

export function initHug(recordEngagement, saveCoupleStats) {
  hugButton.addEventListener("click", function () {
    hugCount++;
    hugCountEl.textContent = hugCount;
    localStorage.setItem("couple_hug_count", hugCount.toString());
    recordEngagement();
    saveCoupleStats();

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
}


// ─── Fortune Cookie ───

const fortuneCookie = document.getElementById("fortuneCookie");
const fortuneText = document.getElementById("fortuneText");
const newFortuneBtn = document.getElementById("newFortune");

export function initFortune(recordEngagement) {
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
}


// ─── Streak System ───

const streakBar = document.getElementById("streakBar");
const streakCountEl = document.getElementById("streakCount");
const heartsCountEl = document.getElementById("heartsCount");
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

var statsSaveTimer = null;
var streakTimerInterval = null;

export function getStreakTimerInterval() { return streakTimerInterval; }
export function clearStreakTimerInterval() {
  if (streakTimerInterval) { clearInterval(streakTimerInterval); streakTimerInterval = null; }
}

export async function loadCoupleStats() {
  if (!app.currentCouple || !app.currentUser) return;

  var result = await app.supabase
    .from("game_states")
    .select("state")
    .eq("couple_id", app.currentCouple.id)
    .eq("game_type", "stats")
    .maybeSingle();

  if (result.error || !result.data) return;

  var remote = result.data.state;
  var localStreak = parseInt(localStorage.getItem("couple_streak_count") || "0");
  var localHearts = parseInt(localStorage.getItem("couple_streak_hearts") || "0");
  var localHugs = parseInt(localStorage.getItem("couple_hug_count") || "0");
  var localLastDate = localStorage.getItem("couple_streak_last_date") || "";
  var localMilestones = [];
  try { localMilestones = JSON.parse(localStorage.getItem("couple_streak_milestones_reached") || "[]"); } catch (e) {}

  var remoteStreak = remote.streak_count || 0;
  var remoteHearts = remote.hearts || 0;
  var remoteHugs = remote.hug_count || 0;
  var remoteLastDate = remote.streak_last_date || "";
  var remoteMilestones = remote.milestones_reached || [];

  var mergedStreak = Math.max(localStreak, remoteStreak);
  var mergedHearts = Math.max(localHearts, remoteHearts);
  var mergedHugs = Math.max(localHugs, remoteHugs);
  var mergedLastDate = localLastDate > remoteLastDate ? localLastDate : remoteLastDate;
  var mergedMilestones = Array.from(new Set(localMilestones.concat(remoteMilestones)));

  localStorage.setItem("couple_streak_count", mergedStreak.toString());
  localStorage.setItem("couple_streak_hearts", mergedHearts.toString());
  localStorage.setItem("couple_hug_count", mergedHugs.toString());
  localStorage.setItem("couple_streak_last_date", mergedLastDate);
  localStorage.setItem("couple_streak_milestones_reached", JSON.stringify(mergedMilestones));

  hugCount = mergedHugs;
  hugCountEl.textContent = hugCount;

  if (remote.countdown_date) {
    localStorage.setItem("couple_countdown_date", remote.countdown_date);
  }

  updateStreakUI();
}

export function saveCoupleStats() {
  if (statsSaveTimer) clearTimeout(statsSaveTimer);
  statsSaveTimer = setTimeout(function () {
    statsSaveTimer = null;
    saveCoupleStatsNow();
  }, 500);
}

async function saveCoupleStatsNow() {
  if (!app.currentCouple || !app.currentUser) return;

  var milestones = [];
  try { milestones = JSON.parse(localStorage.getItem("couple_streak_milestones_reached") || "[]"); } catch (e) {}

  var state = {
    streak_count: parseInt(localStorage.getItem("couple_streak_count") || "0"),
    streak_last_date: localStorage.getItem("couple_streak_last_date") || "",
    hearts: parseInt(localStorage.getItem("couple_streak_hearts") || "0"),
    milestones_reached: milestones,
    hug_count: parseInt(localStorage.getItem("couple_hug_count") || "0"),
    countdown_date: localStorage.getItem("couple_countdown_date") || null
  };

  await saveGameState("stats", state);
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function loadStreak() {
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

export function recordEngagement() {
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
  saveCoupleStats();

  if (milestoneHit) {
    showMilestoneCelebration(milestoneHit);
  }
}

export function addBonusHearts(amount) {
  var totalHearts = parseInt(localStorage.getItem("couple_streak_hearts") || "0");
  localStorage.setItem("couple_streak_hearts", (totalHearts + amount).toString());
  updateStreakUI();
  saveCoupleStats();
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
    saveCoupleStats();
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
