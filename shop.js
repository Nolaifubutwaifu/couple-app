import { hapticLight, showToast } from "./utils.js";

var SHOP_ITEMS = [
  { id: "border-gold", category: "borders", icon: "✨", name: "Golden Ring", price: 30, desc: "A shimmering gold border around your avatar", type: "equip" },
  { id: "border-rose", category: "borders", icon: "🌹", name: "Rose Glow", price: 50, desc: "Soft rose glow around your avatar", type: "equip" },
  { id: "border-aurora", category: "borders", icon: "🌈", name: "Aurora Ring", price: 75, desc: "Animated gradient border", type: "equip" },
  { id: "avatar-fox", category: "avatars", icon: "🦊", name: "Fox Avatar", price: 50, desc: "A cute fox default avatar", type: "equip" },
  { id: "avatar-cat", category: "avatars", icon: "🐱", name: "Cat Avatar", price: 50, desc: "A cozy cat default avatar", type: "equip" },
  { id: "avatar-bear", category: "avatars", icon: "🐻", name: "Bear Avatar", price: 50, desc: "A warm bear default avatar", type: "equip" },
  { id: "react-firework", category: "reactions", icon: "💥", name: "Firework React", price: 30, desc: "Send a firework reaction", type: "own" },
  { id: "react-confetti", category: "reactions", icon: "🎉", name: "Confetti React", price: 30, desc: "Send a confetti reaction", type: "own" },
  { id: "extra-fortune", category: "extras", icon: "🥠", name: "Fortune Cookie", price: 15, desc: "Get a sweet couple fortune", type: "use" },
  { id: "extra-dice", category: "extras", icon: "🎲", name: "Love Dice", price: 25, desc: "Roll a fun couple dare", type: "use" }
];

var currentCategory = "all";

function getHearts() {
  return parseInt(localStorage.getItem("couple_streak_hearts") || "0");
}

function spendHearts(amount) {
  var current = getHearts();
  if (current < amount) return false;
  localStorage.setItem("couple_streak_hearts", (current - amount).toString());
  return true;
}

function getPurchased() {
  try {
    return JSON.parse(localStorage.getItem("couple_shop_purchased") || "[]");
  } catch (e) { return []; }
}

function savePurchased(list) {
  localStorage.setItem("couple_shop_purchased", JSON.stringify(list));
}

function isOwned(itemId) {
  return getPurchased().indexOf(itemId) !== -1;
}

function getEquipped() {
  try {
    return JSON.parse(localStorage.getItem("couple_shop_equipped") || "{}");
  } catch (e) { return {}; }
}

function saveEquipped(map) {
  localStorage.setItem("couple_shop_equipped", JSON.stringify(map));
}

function isEquipped(itemId) {
  var eq = getEquipped();
  for (var key in eq) {
    if (eq[key] === itemId) return true;
  }
  return false;
}

function equipItem(item) {
  var eq = getEquipped();
  eq[item.category] = item.id;
  saveEquipped(eq);
  applyEquippedEffects();
}

function unequipCategory(category) {
  var eq = getEquipped();
  delete eq[category];
  saveEquipped(eq);
  applyEquippedEffects();
}

function purchaseItem(item) {
  if (isOwned(item.id)) {
    if (item.type === "equip") {
      if (isEquipped(item.id)) {
        unequipCategory(item.category);
        showToast("Unequipped " + item.name);
      } else {
        equipItem(item);
        showToast("Equipped " + item.name + "!");
      }
      renderShopItems();
      return;
    }
    if (item.type === "use") {
      useItem(item);
      return;
    }
    showToast("You already own this");
    return;
  }

  if (getHearts() < item.price) {
    showToast("Not enough hearts");
    return;
  }

  if (!spendHearts(item.price)) {
    showToast("Not enough hearts");
    return;
  }

  var list = getPurchased();
  list.push(item.id);
  savePurchased(list);

  if (item.type === "equip") {
    equipItem(item);
    showToast("Bought & equipped " + item.name + "!");
  } else {
    showToast("You got " + item.name + "!");
  }

  updateShopBalance();
  renderShopItems();

  var event = new CustomEvent("heartsChanged");
  window.dispatchEvent(event);
}

var FORTUNES = [
  "A surprise is coming your way this week.",
  "Your next date night will be one to remember.",
  "Something you said recently made their whole day.",
  "A small gesture tomorrow will mean more than you think.",
  "You two are building something beautiful — keep going.",
  "Tonight is a good night for a long conversation.",
  "The best chapter of your love story hasn't been written yet.",
  "A laugh you share today will become a memory you treasure.",
  "Trust the timing — everything is unfolding as it should.",
  "Someone is thinking about you right now."
];

var DARES = [
  "Give your partner a 10-second hug right now.",
  "Send the sweetest text you can think of.",
  "Plan a surprise for this weekend.",
  "Tell your partner three things you love about them.",
  "Do your partner's least favourite chore today.",
  "Cook or order their favourite meal tonight.",
  "Write a tiny love note and hide it somewhere they'll find.",
  "Take a silly selfie together right now.",
  "Share a song that reminds you of them.",
  "Give an honest, heartfelt compliment."
];

function useItem(item) {
  if (item.id === "extra-fortune") {
    var fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    showToast("🥠 " + fortune);
  } else if (item.id === "extra-dice") {
    var dare = DARES[Math.floor(Math.random() * DARES.length)];
    showToast("🎲 " + dare);
  }
}

export function initShop() {
  var categories = document.getElementById("shopCategories");
  if (!categories) return;

  categories.addEventListener("click", function (e) {
    var btn = e.target.closest(".shop-category-btn");
    if (!btn) return;

    currentCategory = btn.dataset.category;
    categories.querySelectorAll(".shop-category-btn").forEach(function (b) {
      b.classList.remove("shop-category-active");
    });
    btn.classList.add("shop-category-active");
    renderShopItems();
  });

  var grid = document.getElementById("shopGrid");
  if (grid) {
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".shop-item");
      if (!card) return;
      var itemId = card.dataset.itemId;
      var item = SHOP_ITEMS.find(function (i) { return i.id === itemId; });
      if (item) {
        hapticLight();
        purchaseItem(item);
      }
    });
  }

  window.addEventListener("heartsChanged", function () {
    updateShopBalance();
  });

  renderShopItems();
  applyEquippedEffects();
}

function renderShopItems() {
  var grid = document.getElementById("shopGrid");
  if (!grid) return;

  var items = currentCategory === "all"
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(function (i) { return i.category === currentCategory; });

  var html = "";
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var owned = isOwned(item.id);
    var equipped = isEquipped(item.id);
    var canAfford = getHearts() >= item.price;

    var cls = "shop-item";
    if (owned) cls += " shop-item-owned";
    else if (!canAfford) cls += " shop-item-locked";

    html += '<div class="' + cls + '" data-item-id="' + item.id + '">';
    html += '<span class="shop-item-icon">' + item.icon + '</span>';
    html += '<span class="shop-item-name">' + item.name + '</span>';
    html += '<span class="shop-item-desc">' + item.desc + '</span>';

    if (owned && item.type === "equip") {
      html += '<span class="shop-item-action">' + (equipped ? "Equipped ✓" : "Tap to equip") + '</span>';
    } else if (owned && item.type === "use") {
      html += '<span class="shop-item-action">Tap to use</span>';
    } else if (owned) {
      html += '<span class="shop-item-action">Owned ✓</span>';
    } else {
      html += '<span class="shop-item-price">❤️ ' + item.price + '</span>';
    }

    html += '</div>';
  }

  grid.innerHTML = html;
}

export function applyEquippedEffects() {
  var eq = getEquipped();
  var avatars = document.querySelectorAll(".home-greeting-avatar");

  avatars.forEach(function (el) {
    el.classList.remove("avatar-border-gold", "avatar-border-rose", "avatar-border-aurora");
  });

  var profileAvatarWrap = document.querySelector(".profile-avatar-wrap");
  if (profileAvatarWrap) {
    profileAvatarWrap.classList.remove("avatar-border-gold", "avatar-border-rose", "avatar-border-aurora");
  }

  if (eq.borders) {
    var borderClass = "avatar-border-" + eq.borders.replace("border-", "");
    avatars.forEach(function (el) { el.classList.add(borderClass); });
    if (profileAvatarWrap) profileAvatarWrap.classList.add(borderClass);
  }
}

export function updateShopBalance() {
  var el = document.getElementById("shopHeartsBalance");
  if (el) {
    el.textContent = localStorage.getItem("couple_streak_hearts") || "0";
  }
}
