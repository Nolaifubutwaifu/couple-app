import { app } from "./state.js";
import { hapticLight, showToast, sendLocalNotification, escapeHTML, nativePickPhoto } from "./utils.js";
import { compressImage, dataUrlToBlob } from "./chat.js";

var momentsToday = [];
var momentsTableExists = null;
var selectedMood = null;
var callbacks = {};

var MOOD_EMOJIS = [
  "\u{1F60A}", "\u{1F60D}", "\u{1F970}", "\u{1F634}", "\u{1F624}", "\u{1F622}",
  "\u{1F929}", "\u{1F60C}", "\u{1F971}", "\u{1F602}", "\u{1F914}", "\u{1F60E}",
  "☕", "\u{1F35C}", "\u{1F305}", "\u{1F3C3}", "\u{1F4DA}", "\u{1F3B5}",
  "❤️", "\u{1F525}", "✨", "\u{1F4AA}", "\u{1F64F}", "\u{1F319}"
];

var MOMENT_PROMPTS = [
  "Show your view right now",
  "What are you eating?",
  "Send your current mood",
  "Show the sky",
  "What are you working on?",
  "Take a photo of something near you",
  "What does your desk look like?",
  "Show what you're drinking",
  "What's making you smile?",
  "Your outfit today",
  "Something beautiful you noticed",
  "Your current view from the window",
  "What are you reading or watching?",
  "Show your workspace",
  "Something that made you think of me",
  "Your morning so far in one photo",
  "What's in your hand right now?",
  "Show me your afternoon vibe",
  "Something cozy near you",
  "The weather where you are",
  "A random detail from your day",
  "What are you looking forward to?",
  "Show your evening setup",
  "Something you're grateful for today",
  "Your current mood in one emoji",
  "What song are you listening to?",
  "A color you see right now",
  "Your comfort item today",
  "Something new you tried today",
  "One word for how you feel"
];

// ─── DOM Refs ───

var momentsSetup = document.getElementById("momentsSetup");
var momentsPromptCard = document.getElementById("momentsPromptCard");
var momentsPromptText = document.getElementById("momentsPromptText");
var momentsTimeline = document.getElementById("momentsTimeline");
var momentsTimelineDate = document.getElementById("momentsTimelineDate");
var momentsEmpty = document.getElementById("momentsEmpty");
var momentsRecapCard = document.getElementById("momentsRecapCard");
var momentsRecapTitle = document.getElementById("momentsRecapTitle");
var momentsRecapDate = document.getElementById("momentsRecapDate");
var momentsRecapStats = document.getElementById("momentsRecapStats");
var momentsArchiveTimeline = document.getElementById("momentsArchiveTimeline");
var momentsThisDay = document.getElementById("momentsThisDay");
var momentsThisDayTimeline = document.getElementById("momentsThisDayTimeline");
var momentSheetBackdrop = document.getElementById("momentSheetBackdrop");
var momentPhotoInput = document.getElementById("momentPhotoInput");
var momentTextPanel = document.getElementById("momentTextPanel");
var momentMoodPanel = document.getElementById("momentMoodPanel");
var momentPhotoPanel = document.getElementById("momentPhotoPanel");
var momentPhotoPreview = document.getElementById("momentPhotoPreview");
var momentMoodGrid = document.getElementById("momentMoodGrid");

// ─── Table Check ───

async function checkMomentsTable() {
  if (momentsTableExists !== null) return momentsTableExists;
  try {
    var result = await app.supabase.from("moments").select("id").limit(0);
    momentsTableExists = !result.error;
  } catch (e) {
    momentsTableExists = false;
  }
  return momentsTableExists;
}

// ─── Daily Prompt ───

function getDailyPrompt() {
  var now = new Date();
  var dayIndex = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  var halfDay = now.getHours() < 12 ? 0 : 1;
  return MOMENT_PROMPTS[(dayIndex * 2 + halfDay) % MOMENT_PROMPTS.length];
}

// ─── Format ───

function formatMomentRow(row) {
  var profileData = row.profiles;
  var senderName = profileData && profileData.display_name
    ? profileData.display_name
    : "Unknown";
  return {
    id: row.id,
    senderName: senderName,
    senderId: row.sender_id,
    isMe: app.currentUser && row.sender_id === app.currentUser.id,
    momentType: row.moment_type,
    text: row.text || null,
    imageUrl: row.image_url || null,
    mood: row.mood || null,
    locationLabel: row.location_label || null,
    createdAt: row.created_at
  };
}

function formatTime(isoStr) {
  var d = new Date(isoStr);
  var h = d.getHours();
  var m = d.getMinutes();
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

function formatDateLabel(isoStr) {
  var d = new Date(isoStr);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getDate();
}

// ─── Data Fetching ───

export async function loadTodayMoments() {
  if (!app.currentCouple) return;
  var exists = await checkMomentsTable();
  if (!exists) {
    if (momentsSetup) momentsSetup.style.display = "";
    return;
  }
  if (momentsSetup) momentsSetup.style.display = "none";

  var todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  var result = await app.supabase
    .from("moments")
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", app.currentCouple.id)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: true });

  if (result.error) return;
  momentsToday = (result.data || []).map(formatMomentRow);
  renderMomentsTimeline();
  renderDailyRecap();
  renderCapturePrompt();
}

async function loadMomentsForDate(dateStr) {
  if (!app.currentCouple || !momentsTableExists) return [];
  var result = await app.supabase
    .from("moments")
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", app.currentCouple.id)
    .gte("created_at", dateStr + "T00:00:00")
    .lte("created_at", dateStr + "T23:59:59.999")
    .order("created_at", { ascending: true });
  if (result.error) return [];
  return (result.data || []).map(formatMomentRow);
}

async function loadMomentsForRange(startDate, endDate) {
  if (!app.currentCouple || !momentsTableExists) return [];
  var result = await app.supabase
    .from("moments")
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", app.currentCouple.id)
    .gte("created_at", startDate + "T00:00:00")
    .lte("created_at", endDate + "T23:59:59.999")
    .order("created_at", { ascending: true });
  if (result.error) return [];
  return (result.data || []).map(formatMomentRow);
}

async function loadThisDayHistory() {
  if (!app.currentCouple || !momentsTableExists) return [];
  var now = new Date();
  var month = now.getMonth();
  var day = now.getDate();
  var todayStr = now.toISOString().split("T")[0];

  var result = await app.supabase
    .from("moments")
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", app.currentCouple.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (result.error) return [];
  return (result.data || [])
    .filter(function (row) {
      var d = new Date(row.created_at);
      return d.getMonth() === month && d.getDate() === day
        && row.created_at.split("T")[0] !== todayStr;
    })
    .map(formatMomentRow);
}

// ─── Rendering ───

function buildTimelineItem(moment) {
  var time = formatTime(moment.createdAt);
  var name = moment.isMe ? "You" : moment.senderName.split(" ")[0];
  var initial = (moment.senderName || "?").charAt(0).toUpperCase();

  var contentHTML = "";
  if (moment.momentType === "photo" && moment.imageUrl) {
    contentHTML = '<img class="moment-timeline-img" src="' + moment.imageUrl + '" alt="" loading="lazy">';
    if (moment.text) contentHTML += '<span class="moment-timeline-caption">' + escapeHTML(moment.text) + '</span>';
  } else if (moment.momentType === "mood" && moment.mood) {
    contentHTML = '<span class="moment-timeline-mood">' + moment.mood + '</span>';
    if (moment.text) contentHTML += '<span class="moment-timeline-caption">' + escapeHTML(moment.text) + '</span>';
  } else {
    contentHTML = '<span class="moment-timeline-text">' + escapeHTML(moment.text || "") + '</span>';
  }

  var locationHTML = moment.locationLabel
    ? '<span class="moment-timeline-location">\u{1F4CD} ' + escapeHTML(moment.locationLabel) + '</span>'
    : "";

  return '<div class="moment-timeline-item' + (moment.isMe ? " moment-mine" : " moment-partner") + '">' +
    '<span class="moment-timeline-time">' + time + '</span>' +
    '<div class="moment-timeline-dot-col">' +
      '<span class="moment-timeline-avatar">' + initial + '</span>' +
    '</div>' +
    '<div class="moment-timeline-content">' +
      '<span class="moment-timeline-name">' + escapeHTML(name) + '</span>' +
      contentHTML +
      locationHTML +
    '</div>' +
  '</div>';
}

function renderMomentsTimeline() {
  var now = new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  momentsTimelineDate.textContent = months[now.getMonth()] + " " + now.getDate();

  if (momentsToday.length === 0) {
    momentsEmpty.style.display = "";
    var existing = momentsTimeline.querySelectorAll(".moment-timeline-item");
    existing.forEach(function (el) { el.remove(); });
    return;
  }

  momentsEmpty.style.display = "none";
  var html = "";
  for (var i = 0; i < momentsToday.length; i++) {
    html += buildTimelineItem(momentsToday[i]);
  }

  var existingItems = momentsTimeline.querySelectorAll(".moment-timeline-item");
  existingItems.forEach(function (el) { el.remove(); });
  momentsTimeline.insertAdjacentHTML("beforeend", html);
}

function renderDailyRecap() {
  if (momentsToday.length === 0) {
    momentsRecapCard.style.display = "none";
    return;
  }
  momentsRecapCard.style.display = "";

  var now = new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  momentsRecapDate.textContent = months[now.getMonth()] + " " + now.getDate();
  momentsRecapTitle.textContent = "Our Day";

  var myCount = 0;
  var partnerCount = 0;
  for (var i = 0; i < momentsToday.length; i++) {
    if (momentsToday[i].isMe) myCount++;
    else partnerCount++;
  }

  var myName = (app.currentProfile && app.currentProfile.display_name || "You").split(" ")[0];
  var partnerName = (app.currentCouple && app.currentCouple.partnerName || "Partner").split(" ")[0];

  var total = myCount + partnerCount;
  var html = '<p class="moments-recap-total">' + total + ' moment' + (total !== 1 ? 's' : '') + ' shared</p>';
  html += '<p class="moments-recap-breakdown">' + myCount + ' from ' + myName;
  if (partnerCount > 0) html += ', ' + partnerCount + ' from ' + partnerName;
  html += '</p>';
  momentsRecapStats.innerHTML = html;
}

function renderCapturePrompt() {
  momentsPromptText.textContent = getDailyPrompt();
  momentsPromptCard.style.display = "";
}

function renderArchiveTimeline(moments) {
  if (!moments || moments.length === 0) {
    momentsArchiveTimeline.innerHTML = '<p class="moments-archive-empty">No moments for this period</p>';
    return;
  }

  var html = "";
  var lastDate = "";
  for (var i = 0; i < moments.length; i++) {
    var dateStr = moments[i].createdAt.split("T")[0];
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      html += '<div class="moments-archive-date-header">' + formatDateLabel(moments[i].createdAt) + '</div>';
    }
    html += buildTimelineItem(moments[i]);
  }
  momentsArchiveTimeline.innerHTML = html;
}

// ─── Create Moments ───

function openAddMomentSheet() {
  momentTextPanel.style.display = "none";
  momentMoodPanel.style.display = "none";
  momentPhotoPanel.style.display = "none";
  momentPhotoPreview.style.display = "none";
  selectedMood = null;
  momentSheetBackdrop.classList.add("visible");
}

function closeAddMomentSheet() {
  momentSheetBackdrop.classList.remove("visible");
  momentTextPanel.style.display = "none";
  momentMoodPanel.style.display = "none";
  momentPhotoPanel.style.display = "none";
}

export async function insertMoment(type, text, imageUrl, mood, locationLabel) {
  if (!app.currentUser || !app.currentCouple) return;

  var result = await app.supabase
    .from("moments")
    .insert({
      couple_id: app.currentCouple.id,
      sender_id: app.currentUser.id,
      moment_type: type,
      text: text,
      image_url: imageUrl,
      mood: mood,
      location_label: locationLabel
    })
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .single();

  if (result.error) {
    showToast("Could not save moment. Try again.");
    return;
  }

  if (result.data) {
    momentsToday.push(formatMomentRow(result.data));
    renderMomentsTimeline();
    renderDailyRecap();
  }

  closeAddMomentSheet();
  hapticLight();
  if (callbacks.recordEngagement) callbacks.recordEngagement();
}

async function addPhotoMoment(fileOrBlob, caption, location) {
  if (!app.currentUser || !app.currentCouple) return;
  showToast("Uploading...");

  try {
    var compressed = await compressImage(fileOrBlob);
    var filename = app.currentUser.id + "_" + Date.now() + ".jpg";
    var path = app.currentCouple.id + "/" + filename;

    var uploadResult = await app.supabase.storage
      .from("photos")
      .upload(path, compressed, { contentType: compressed.type || "image/jpeg" });

    if (uploadResult.error) {
      showToast("Photo upload failed");
      return;
    }

    var urlResult = app.supabase.storage.from("photos").getPublicUrl(path);
    var publicUrl = urlResult.data.publicUrl;

    await insertMoment("photo", caption || null, publicUrl, null, location || null);
  } catch (e) {
    showToast("Photo upload failed");
  }
}

var pendingPhotoBlob = null;

// ─── Realtime ───

async function subscribeToMoments() {
  if (!app.currentCouple) return;

  if (app.momentsChannel) {
    await app.supabase.removeChannel(app.momentsChannel);
  }

  app.momentsChannel = app.supabase
    .channel("couple-moments-" + app.currentCouple.id)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "moments",
        filter: "couple_id=eq." + app.currentCouple.id
      },
      function (payload) {
        if (payload.new && app.currentUser && payload.new.sender_id !== app.currentUser.id) {
          showToast("Your partner shared a moment");
          sendLocalNotification("New Moment", "Your partner just shared a moment");
        }
        loadTodayMoments();
      }
    )
    .subscribe();
}

// ─── Public API ───

export function getMomentsCount() {
  var myCount = 0;
  var partnerCount = 0;
  for (var i = 0; i < momentsToday.length; i++) {
    if (momentsToday[i].isMe) myCount++;
    else partnerCount++;
  }
  return { myCount: myCount, partnerCount: partnerCount };
}

export async function cleanupMomentsChannel() {
  if (app.momentsChannel) {
    await app.supabase.removeChannel(app.momentsChannel);
    app.momentsChannel = null;
  }
}

export async function initMoments(cbs) {
  callbacks = cbs || {};

  // Mood grid
  if (momentMoodGrid) {
    var gridHTML = "";
    for (var i = 0; i < MOOD_EMOJIS.length; i++) {
      gridHTML += '<button type="button" class="moment-mood-btn" data-mood="' + MOOD_EMOJIS[i] + '">' + MOOD_EMOJIS[i] + '</button>';
    }
    momentMoodGrid.innerHTML = gridHTML;

    momentMoodGrid.addEventListener("click", function (e) {
      var btn = e.target.closest(".moment-mood-btn");
      if (!btn) return;
      hapticLight();
      selectedMood = btn.dataset.mood;
      var all = momentMoodGrid.querySelectorAll(".moment-mood-btn");
      all.forEach(function (b) { b.classList.remove("mood-selected"); });
      btn.classList.add("mood-selected");
    });
  }

  // FAB
  var fab = document.getElementById("momentsFab");
  if (fab) {
    fab.addEventListener("click", function () {
      hapticLight();
      openAddMomentSheet();
    });
  }

  // Sheet backdrop close
  if (momentSheetBackdrop) {
    momentSheetBackdrop.addEventListener("click", function (e) {
      if (e.target === momentSheetBackdrop) closeAddMomentSheet();
    });
  }

  // Action buttons
  var addPhotoBtn = document.getElementById("momentAddPhoto");
  if (addPhotoBtn) {
    addPhotoBtn.addEventListener("click", function () {
      hapticLight();
      if (app.isNative) {
        nativePickPhoto().then(function (dataUrl) {
          if (!dataUrl) return;
          dataUrlToBlob(dataUrl).then(function (blob) {
            pendingPhotoBlob = blob;
            momentPhotoPreview.src = dataUrl;
            momentPhotoPreview.style.display = "";
            momentTextPanel.style.display = "none";
            momentMoodPanel.style.display = "none";
            momentPhotoPanel.style.display = "";
          });
        });
      } else {
        momentPhotoInput.click();
      }
    });
  }

  if (momentPhotoInput) {
    momentPhotoInput.addEventListener("change", function () {
      var file = momentPhotoInput.files[0];
      if (!file) return;
      pendingPhotoBlob = file;
      var reader = new FileReader();
      reader.onload = function (e) {
        momentPhotoPreview.src = e.target.result;
        momentPhotoPreview.style.display = "";
        momentTextPanel.style.display = "none";
        momentMoodPanel.style.display = "none";
        momentPhotoPanel.style.display = "";
      };
      reader.readAsDataURL(file);
      momentPhotoInput.value = "";
    });
  }

  var photoSubmit = document.getElementById("momentPhotoSubmit");
  if (photoSubmit) {
    photoSubmit.addEventListener("click", async function () {
      if (!pendingPhotoBlob) return;
      photoSubmit.disabled = true;
      var caption = document.getElementById("momentPhotoText").value.trim();
      var location = document.getElementById("momentPhotoLocation").value.trim();
      await addPhotoMoment(pendingPhotoBlob, caption, location);
      pendingPhotoBlob = null;
      document.getElementById("momentPhotoText").value = "";
      document.getElementById("momentPhotoLocation").value = "";
      momentPhotoPreview.style.display = "none";
      photoSubmit.disabled = false;
    });
  }

  var addTextBtn = document.getElementById("momentAddText");
  if (addTextBtn) {
    addTextBtn.addEventListener("click", function () {
      hapticLight();
      momentPhotoPanel.style.display = "none";
      momentMoodPanel.style.display = "none";
      momentTextPanel.style.display = "";
      document.getElementById("momentTextInput").focus();
    });
  }

  var textSubmit = document.getElementById("momentTextSubmit");
  if (textSubmit) {
    textSubmit.addEventListener("click", async function () {
      var text = document.getElementById("momentTextInput").value.trim();
      if (!text) return;
      textSubmit.disabled = true;
      var location = document.getElementById("momentLocationInput").value.trim();
      await insertMoment("text", text, null, null, location || null);
      document.getElementById("momentTextInput").value = "";
      document.getElementById("momentLocationInput").value = "";
      textSubmit.disabled = false;
    });
  }

  var addMoodBtn = document.getElementById("momentAddMood");
  if (addMoodBtn) {
    addMoodBtn.addEventListener("click", function () {
      hapticLight();
      momentPhotoPanel.style.display = "none";
      momentTextPanel.style.display = "none";
      momentMoodPanel.style.display = "";
      selectedMood = null;
      var all = momentMoodGrid.querySelectorAll(".moment-mood-btn");
      all.forEach(function (b) { b.classList.remove("mood-selected"); });
    });
  }

  var moodSubmit = document.getElementById("momentMoodSubmit");
  if (moodSubmit) {
    moodSubmit.addEventListener("click", async function () {
      if (!selectedMood) { showToast("Pick a mood first"); return; }
      moodSubmit.disabled = true;
      var note = document.getElementById("momentMoodText").value.trim();
      await insertMoment("mood", note || null, null, selectedMood, null);
      document.getElementById("momentMoodText").value = "";
      selectedMood = null;
      moodSubmit.disabled = false;
    });
  }

  // Capture prompt action
  var promptAction = document.getElementById("momentsPromptAction");
  if (promptAction) {
    promptAction.addEventListener("click", function () {
      hapticLight();
      openAddMomentSheet();
    });
  }

  // Archive filters
  var filterBtns = document.querySelectorAll(".moments-filter-btn");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", async function () {
      hapticLight();
      filterBtns.forEach(function (b) { b.classList.remove("moments-filter-active"); });
      btn.classList.add("moments-filter-active");

      var filter = btn.dataset.filter;
      var now = new Date();
      var todayStr = now.toISOString().split("T")[0];

      if (filter === "today") {
        renderArchiveTimeline(momentsToday);
      } else if (filter === "yesterday") {
        var yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        var yStr = yesterday.toISOString().split("T")[0];
        var data = await loadMomentsForDate(yStr);
        renderArchiveTimeline(data);
      } else if (filter === "week") {
        var monday = new Date(now);
        var dayOfWeek = monday.getDay() || 7;
        monday.setDate(monday.getDate() - dayOfWeek + 1);
        var data2 = await loadMomentsForRange(monday.toISOString().split("T")[0], todayStr);
        renderArchiveTimeline(data2);
      } else if (filter === "month") {
        var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        var data3 = await loadMomentsForRange(firstOfMonth.toISOString().split("T")[0], todayStr);
        renderArchiveTimeline(data3);
      }
    });
  });

  // Date picker
  var datePicker = document.getElementById("momentsArchiveDatePicker");
  if (datePicker) {
    datePicker.addEventListener("change", async function () {
      if (!datePicker.value) return;
      filterBtns.forEach(function (b) { b.classList.remove("moments-filter-active"); });
      var data = await loadMomentsForDate(datePicker.value);
      renderArchiveTimeline(data);
    });
  }

  // Initial load
  var exists = await checkMomentsTable();
  if (exists && app.currentCouple) {
    await loadTodayMoments();
    await subscribeToMoments();

    // This Day in Our Relationship
    var thisDayData = await loadThisDayHistory();
    if (thisDayData.length > 0) {
      momentsThisDay.style.display = "";
      var tdHtml = "";
      for (var j = 0; j < thisDayData.length; j++) {
        tdHtml += buildTimelineItem(thisDayData[j]);
      }
      momentsThisDayTimeline.innerHTML = tdHtml;
    }
  }
}
