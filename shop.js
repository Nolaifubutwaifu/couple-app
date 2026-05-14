var SHOP_ITEMS = [
  { category: "avatars", icon: "🦊", name: "Fox Avatar", price: 50 },
  { category: "avatars", icon: "🐱", name: "Cat Avatar", price: 50 },
  { category: "avatars", icon: "🐻", name: "Bear Avatar", price: 50 },
  { category: "chat-themes", icon: "🌸", name: "Cherry Blossom", price: 100 },
  { category: "chat-themes", icon: "🌊", name: "Ocean Waves", price: 100 },
  { category: "home-themes", icon: "🌅", name: "Sunset Glow", price: 150 },
  { category: "home-themes", icon: "🌌", name: "Starry Night", price: 150 },
  { category: "date-themes", icon: "🕯️", name: "Candlelight", price: 200 },
  { category: "date-themes", icon: "🏖️", name: "Beach Night", price: 200 },
  { category: "question-packs", icon: "🔥", name: "Spicy Questions", price: 75 },
  { category: "question-packs", icon: "💭", name: "Dream Together", price: 75 },
  { category: "reactions", icon: "💥", name: "Firework React", price: 30 },
  { category: "reactions", icon: "🎉", name: "Confetti React", price: 30 },
  { category: "extras", icon: "⏳", name: "Visit Countdown", price: 25 },
  { category: "extras", icon: "🎲", name: "Love Dice", price: 25 },
  { category: "extras", icon: "🥠", name: "Fortune Cookie", price: 15 }
];

var currentCategory = "all";

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

  renderShopItems();
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
    html += '<div class="shop-item shop-item-locked">';
    html += '<span class="shop-item-icon">' + item.icon + '</span>';
    html += '<span class="shop-item-name">' + item.name + '</span>';
    html += '<span class="shop-item-price">❤️ ' + item.price + '</span>';
    html += '<span class="shop-item-badge">Soon</span>';
    html += '</div>';
  }

  grid.innerHTML = html;
}

export function updateShopBalance() {
  var el = document.getElementById("shopHeartsBalance");
  if (el) {
    el.textContent = localStorage.getItem("couple_streak_hearts") || "0";
  }
}
