import { app } from "./state.js";
import { escapeAttr } from "./utils.js";

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
  var keys = Object.keys(app.allMessages);
  for (var k = 0; k < keys.length; k++) {
    var msgs = app.allMessages[keys[k]];
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

export function renderGallery() {
  if (!galleryGrid) return;
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

export function initGalleryAddButton(showPhotoOptions) {
  if (!galleryAddBtn) return;
  galleryAddBtn.addEventListener("click", function () {
    showPhotoOptions();
  });
}
