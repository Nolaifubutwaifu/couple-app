import { app } from "./state.js";
import { getLongestStreak, addBonusHearts } from "./extras.js";
import { getMomentsCount } from "./moments.js";
import { showToast } from "./utils.js";

var ACHIEVEMENTS = [
  {
    id: "streak", icon: "🔥", type: "streak",
    tiers: [
      { target: 7, reward: 5, title: "Week of Love", desc: "Maintain a 7-day streak" },
      { target: 30, reward: 15, title: "Monthly Magic", desc: "Maintain a 30-day streak" },
      { target: 100, reward: 50, title: "Unstoppable", desc: "Maintain a 100-day streak" }
    ]
  },
  {
    id: "questions", icon: "💬", type: "questions",
    tiers: [
      { target: 25, reward: 10, title: "Getting to Know You", desc: "Answer 25 questions together" },
      { target: 100, reward: 30, title: "Deep Conversations", desc: "Answer 100 questions together" },
      { target: 500, reward: 100, title: "Endless Curiosity", desc: "Answer 500 questions together" }
    ]
  },
  {
    id: "moments", icon: "📸", type: "moments",
    tiers: [
      { target: 10, reward: 5, title: "First Snapshots", desc: "Share 10 moments" },
      { target: 50, reward: 20, title: "Memory Makers", desc: "Share 50 moments" },
      { target: 200, reward: 75, title: "Living Album", desc: "Share 200 moments" }
    ]
  },
  {
    id: "dates", icon: "🌙", type: "dates",
    tiers: [
      { target: 1, reward: 5, title: "First Date Night", desc: "Complete your first Date Night" },
      { target: 5, reward: 15, title: "Date Regulars", desc: "Complete 5 Date Nights" },
      { target: 20, reward: 50, title: "Date Legends", desc: "Complete 20 Date Nights" }
    ]
  },
  {
    id: "together", icon: "💕", type: "days_together",
    tiers: [
      { target: 30, reward: 10, title: "One Month Together", desc: "Be together for one month" },
      { target: 180, reward: 30, title: "Half Year of Love", desc: "Be together for six months" },
      { target: 365, reward: 75, title: "One Year Strong", desc: "Be together for one year" }
    ]
  }
];

function getClaimedTiers() {
  try {
    return JSON.parse(localStorage.getItem("couple_achievement_claimed") || "{}");
  } catch (e) { return {}; }
}

function claimTier(achievementId, tierIndex) {
  var claimed = getClaimedTiers();
  if (!claimed[achievementId]) claimed[achievementId] = [];
  if (claimed[achievementId].indexOf(tierIndex) === -1) {
    claimed[achievementId].push(tierIndex);
  }
  localStorage.setItem("couple_achievement_claimed", JSON.stringify(claimed));
}

function isTierClaimed(achievementId, tierIndex) {
  var claimed = getClaimedTiers();
  return claimed[achievementId] && claimed[achievementId].indexOf(tierIndex) !== -1;
}

function getCurrentValue(type) {
  switch (type) {
    case "streak": return getLongestStreak();
    case "questions":
      var count = 0;
      if (app.allMessages) {
        var keys = Object.keys(app.allMessages);
        for (var i = 0; i < keys.length; i++) {
          var msgs = app.allMessages[keys[i]];
          if (msgs) {
            for (var j = 0; j < msgs.length; j++) {
              if (msgs[j].sender_id === (app.currentUser && app.currentUser.id)) {
                count++;
                break;
              }
            }
          }
        }
      }
      return count;
    case "moments":
      var mc = getMomentsCount();
      return mc.myCount + mc.partnerCount;
    case "dates":
      return parseInt(localStorage.getItem("couple_dates_completed") || "0");
    case "days_together":
      if (app.currentCouple && app.currentCouple.createdAt) {
        return Math.floor((Date.now() - new Date(app.currentCouple.createdAt).getTime()) / 86400000);
      }
      return 0;
    default: return 0;
  }
}

export function renderAchievements() {
  var list = document.getElementById("achievementsList");
  if (!list) return;

  var longestEl = document.getElementById("achieveStreakLongest");
  if (longestEl) longestEl.textContent = getLongestStreak();

  var html = "";
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var a = ACHIEVEMENTS[i];
    var current = getCurrentValue(a.type);
    var tiers = a.tiers;

    var activeTierIdx = 0;
    for (var t = 0; t < tiers.length; t++) {
      if (current >= tiers[t].target && isTierClaimed(a.id, t) && t + 1 < tiers.length) {
        activeTierIdx = t + 1;
      } else if (current >= tiers[t].target && !isTierClaimed(a.id, t)) {
        activeTierIdx = t;
        break;
      }
    }
    if (activeTierIdx >= tiers.length) activeTierIdx = tiers.length - 1;

    var tier = tiers[activeTierIdx];
    var pct = Math.min(100, Math.round((current / tier.target) * 100));
    var complete = current >= tier.target;
    var claimed = isTierClaimed(a.id, activeTierIdx);

    var tierStars = "";
    for (var s = 0; s < tiers.length; s++) {
      var starComplete = isTierClaimed(a.id, s) || (s === activeTierIdx && complete);
      tierStars += '<span class="achievement-star' + (starComplete ? ' achievement-star-filled' : '') + '">❤️</span>';
    }

    html += '<div class="achievement-card' + (complete && claimed ? ' achievement-complete' : '') + '">';
    html += '<span class="achievement-card-icon">' + a.icon + '</span>';
    html += '<div class="achievement-card-body">';
    html += '<div class="achievement-card-top">';
    html += '<div class="achievement-card-title">' + tier.title + '</div>';
    html += '<div class="achievement-card-stars">' + tierStars + '</div>';
    html += '</div>';
    html += '<div class="achievement-card-desc">' + tier.desc + '</div>';
    html += '<div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="achievement-card-status">';
    html += '<span>' + Math.min(current, tier.target) + ' / ' + tier.target + '</span>';

    if (complete && !claimed) {
      html += '<button type="button" class="achievement-claim-btn" data-achievement="' + a.id + '" data-tier="' + activeTierIdx + '" data-reward="' + tier.reward + '">Claim +' + tier.reward + ' ❤️</button>';
    } else if (claimed && complete) {
      html += '<span>Claimed ✓</span>';
    } else {
      html += '<span>+' + tier.reward + ' ❤️</span>';
    }

    html += '</div>';
    html += '</div></div>';
  }

  list.innerHTML = html;

  list.querySelectorAll(".achievement-claim-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = this.dataset.achievement;
      var tierIdx = parseInt(this.dataset.tier);
      var reward = parseInt(this.dataset.reward);
      claimTier(id, tierIdx);
      addBonusHearts(reward);
      showToast("+" + reward + " hearts earned!");
      renderAchievements();
    });
  });
}
