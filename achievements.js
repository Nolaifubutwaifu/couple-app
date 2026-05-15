import { app } from "./state.js";
import { getLongestStreak } from "./extras.js";
import { getMomentsCount } from "./moments.js";

var ACHIEVEMENTS = [
  { id: "streak7", icon: "🌱", title: "Week of Love", desc: "Maintain a 7-day streak", target: 7, type: "streak" },
  { id: "streak30", icon: "✨", title: "Monthly Magic", desc: "Maintain a 30-day streak", target: 30, type: "streak" },
  { id: "questions100", icon: "💬", title: "Deep Conversations", desc: "Answer 100 questions together", target: 100, type: "questions" },
  { id: "moments50", icon: "📸", title: "Memory Makers", desc: "Share 50 moments", target: 50, type: "moments" },
  { id: "firstDate", icon: "🌙", title: "First Date Night", desc: "Complete your first Date Night", target: 1, type: "dates" },
  { id: "month1", icon: "💕", title: "One Month Together", desc: "Be together in the app for one month", target: 30, type: "days_together" },
  { id: "month6", icon: "💎", title: "Half Year of Love", desc: "Be together in the app for six months", target: 180, type: "days_together" }
];

export function renderAchievements() {
  var list = document.getElementById("achievementsList");
  if (!list) return;

  var longestStreak = getLongestStreak();

  var questionsAnswered = 0;
  if (app.allMessages) {
    var keys = Object.keys(app.allMessages);
    for (var i = 0; i < keys.length; i++) {
      var msgs = app.allMessages[keys[i]];
      if (msgs) {
        for (var j = 0; j < msgs.length; j++) {
          if (msgs[j].sender_id === (app.currentUser && app.currentUser.id)) {
            questionsAnswered++;
            break;
          }
        }
      }
    }
  }

  var mc = getMomentsCount();
  var totalMoments = mc.myCount + mc.partnerCount;

  var daysTogether = 0;
  if (app.currentCouple && app.currentCouple.createdAt) {
    var created = new Date(app.currentCouple.createdAt);
    daysTogether = Math.floor((Date.now() - created.getTime()) / 86400000);
  }

  var datesCompleted = parseInt(localStorage.getItem("couple_dates_completed") || "0");

  var longestEl = document.getElementById("achieveStreakLongest");
  if (longestEl) longestEl.textContent = longestStreak;

  var html = "";
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var a = ACHIEVEMENTS[i];
    var current = 0;

    switch (a.type) {
      case "streak": current = longestStreak; break;
      case "questions": current = questionsAnswered; break;
      case "moments": current = totalMoments; break;
      case "dates": current = datesCompleted; break;
      case "days_together": current = daysTogether; break;
    }

    var pct = Math.min(100, Math.round((current / a.target) * 100));
    var complete = current >= a.target;

    html += '<div class="achievement-card' + (complete ? ' achievement-complete' : '') + '">';
    html += '<span class="achievement-card-icon">' + a.icon + '</span>';
    html += '<div class="achievement-card-body">';
    html += '<div class="achievement-card-title">' + a.title + '</div>';
    html += '<div class="achievement-card-desc">' + a.desc + '</div>';
    html += '<div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="achievement-card-status"><span>' + Math.min(current, a.target) + ' / ' + a.target + '</span><span>' + (complete ? '✓ Complete' : pct + '%') + '</span></div>';
    html += '</div></div>';
  }

  list.innerHTML = html;
}
