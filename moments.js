import { app } from "./state.js";
import { hapticLight, showToast, sendLocalNotification, escapeHTML, nativePickPhoto } from "./utils.js";
import { compressImage, dataUrlToBlob } from "./chat.js";

var momentsToday = [];
var momentsTableExists = null;
var selectedMood = null;
var selectedDateStr = new Date().toISOString().split("T")[0];
var callbacks = {};

var MOOD_EMOJIS = [
  "\u{1F60A}", "\u{1F60D}", "\u{1F970}", "\u{1F634}", "\u{1F624}", "\u{1F622}",
  "\u{1F929}", "\u{1F60C}", "\u{1F971}", "\u{1F602}", "\u{1F914}", "\u{1F60E}",
  "☕", "\u{1F35C}", "\u{1F305}", "\u{1F3C3}", "\u{1F4DA}", "\u{1F3B5}",
  "❤️", "\u{1F525}", "✨", "\u{1F4AA}", "\u{1F64F}", "\u{1F319}"
];

var MOMENT_PROMPTS = [
  "Show your view right now",
  "What are you drinking?",
  "Send your current mood",
  "Show the sky",
  "What's on your desk?",
  "What are you listening to?",
  "Share your walk home",
  "Send a tiny goodnight"
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
var momentsDateStripRow = document.getElementById("momentsDateStripRow");

// ─── Date Strip ───

function renderDateStrip() {
  if (!momentsDateStripRow) return;
  var now = new Date();
  var dayOfWeek = now.getDay();
  var monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

  var weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var todayStr = now.toISOString().split("T")[0];
  var html = "";

  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var dateStr = d.toISOString().split("T")[0];
    var isToday = dateStr === todayStr;
    html += '<button type="button" class="moments-date-strip-day' + (isToday ? ' active' : '') + '" data-date="' + dateStr + '">' +
      '<span class="moments-date-strip-weekday">' + weekdays[i] + '</span>' +
      '<span class="moments-date-strip-num">' + d.getDate() + '</span>' +
    '</button>';
  }
  momentsDateStripRow.innerHTML = html;

  momentsDateStripRow.addEventListener("click", function (e) {
    var btn = e.target.closest(".moments-date-strip-day");
    if (!btn) return;
    var dateStr = btn.getAttribute("data-date");
    if (!dateStr) return;
    selectedDateStr = dateStr;
    var all = momentsDateStripRow.querySelectorAll(".moments-date-strip-day");
    all.forEach(function (el) { el.classList.remove("active"); });
    btn.classList.add("active");
    loadMomentsForSelectedDate(dateStr);
  });
}

async function loadMomentsForSelectedDate(dateStr) {
  var data = await loadMomentsForDate(dateStr);
  momentsToday = data;
  renderMomentsTimeline(dateStr);
  renderDailyRecap(dateStr);
}
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
  loadYesterdayArchive();
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
  var todayStr = now.toISOString().split("T")[0];

  var windows = [
    { label: "One week ago", offset: 7 },
    { label: "One month ago", offset: 30 },
    { label: "Three months ago", offset: 91 },
    { label: "Six months ago", offset: 182 },
    { label: "One year ago", offset: 365 }
  ];

  var dateRanges = [];
  for (var i = 0; i < windows.length; i++) {
    var target = new Date(now);
    target.setDate(target.getDate() - windows[i].offset);
    var start = new Date(target);
    start.setDate(start.getDate() - 1);
    var end = new Date(target);
    end.setDate(end.getDate() + 1);
    dateRanges.push({
      label: windows[i].label,
      startStr: start.toISOString().split("T")[0],
      endStr: end.toISOString().split("T")[0] + "T23:59:59"
    });
  }

  var result = await app.supabase
    .from("moments")
    .select("id, couple_id, sender_id, moment_type, text, image_url, mood, location_label, created_at, profiles:sender_id(display_name)")
    .eq("couple_id", app.currentCouple.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (result.error) return [];
  var all = (result.data || []).filter(function (row) {
    return row.created_at.split("T")[0] !== todayStr;
  });

  var groups = [];
  for (var i = 0; i < dateRanges.length; i++) {
    var range = dateRanges[i];
    var matches = all.filter(function (row) {
      return row.created_at >= range.startStr && row.created_at <= range.endStr;
    }).map(formatMomentRow);
    if (matches.length > 0) {
      groups.push({ label: range.label, moments: matches });
    }
  }

  return groups;
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

function renderMomentsTimeline(dateStr) {
  var d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  momentsTimelineDate.textContent = months[d.getMonth()] + " " + d.getDate();

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

function renderDailyRecap(dateStr) {
  momentsRecapCard.style.display = "";

  var d = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  momentsRecapDate.textContent = months[d.getMonth()] + " " + d.getDate();
  momentsRecapTitle.textContent = "Our Day";

  if (momentsToday.length === 0) {
    momentsRecapStats.innerHTML = '<p class="moments-recap-total">Today\'s story is waiting to begin</p>';
    return;
  }

  var myCount = 0;
  var partnerCount = 0;
  for (var i = 0; i < momentsToday.length; i++) {
    if (momentsToday[i].isMe) myCount++;
    else partnerCount++;
  }

  var total = myCount + partnerCount;
  var story = (myCount > 0 && partnerCount > 0)
    ? "You both added to today's story"
    : "You added to today's story";

  var html = '<p class="moments-recap-total">' + story + '</p>';
  html += '<p class="moments-recap-breakdown">' + total + ' moment' + (total !== 1 ? 's' : '') + ' shared</p>';
  momentsRecapStats.innerHTML = html;
}

function renderCapturePrompt() {
  momentsPromptText.textContent = getDailyPrompt();
  momentsPromptCard.style.display = "";
}

async function loadYesterdayArchive() {
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yStr = yesterday.toISOString().split("T")[0];
  var data = await loadMomentsForDate(yStr);
  renderArchiveTimeline(data);
}

function renderArchiveTimeline(moments) {
  if (!moments || moments.length === 0) {
    momentsArchiveTimeline.innerHTML = '<p class="moments-archive-empty">No moments to look back on yet</p>';
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
  if (callbacks.onMomentAdded) callbacks.onMomentAdded();
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
        loadTodayMoments().then(function () {
          if (callbacks.onMomentAdded) callbacks.onMomentAdded();
        });
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

  renderDateStrip();

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

  // Calendar button — scroll to archive and open date picker
  var calToggle = document.getElementById("momentsCalToggle");
  if (calToggle) {
    calToggle.addEventListener("click", function () {
      hapticLight();
      var archive = document.getElementById("momentsArchiveSection");
      if (archive) archive.scrollIntoView({ behavior: "smooth", block: "start" });
      var picker = document.getElementById("momentsArchiveDatePicker");
      if (picker) setTimeout(function () { picker.showPicker(); }, 400);
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

  var emptyAddBtn = document.getElementById("momentsEmptyAdd");
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener("click", function () {
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

      if (filter === "yesterday") {
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

    var thisDayGroups = await loadThisDayHistory();
    if (thisDayGroups.length > 0) {
      momentsThisDay.style.display = "";
      var tdHtml = "";
      for (var g = 0; g < thisDayGroups.length; g++) {
        tdHtml += '<p class="moments-thisday-label">' + escapeHTML(thisDayGroups[g].label) + '</p>';
        for (var j = 0; j < thisDayGroups[g].moments.length; j++) {
          tdHtml += buildTimelineItem(thisDayGroups[g].moments[j]);
        }
      }
      momentsThisDayTimeline.innerHTML = tdHtml;
    }
  }
}
