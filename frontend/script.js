/* ─────────────────────────────────────────────────────────────────────────────
   script.js – Shared utilities for Abstract Realms storefront
   ───────────────────────────────────────────────────────────────────────────── */

// Change this to your deployed worker URL after `wrangler deploy`
const API_BASE = "https://merch-worker.YOUR_SUBDOMAIN.workers.dev";

/* ─── Cart ─────────────────────────────────────────────────────────────────── */
const Cart = (() => {
  const KEY = "ar_cart";

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateBadge();
  }

  function add(item) {
    // item = { product_id, product_name, category, variant_id, variant_label, price, image_url }
    const items = getAll();
    const existing = items.find(
      (i) => i.product_id === item.product_id && i.variant_id === item.variant_id
    );
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      items.push({ ...item, quantity: 1 });
    }
    save(items);
  }

  function remove(index) {
    const items = getAll();
    items.splice(index, 1);
    save(items);
  }

  function updateQty(index, qty) {
    const items = getAll();
    if (qty < 1) { items.splice(index, 1); }
    else { items[index].quantity = qty; }
    save(items);
  }

  function clear() { localStorage.removeItem(KEY); updateBadge(); }

  function total() {
    return getAll().reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  }

  function count() {
    return getAll().reduce((s, i) => s + (i.quantity || 1), 0);
  }

  function updateBadge() {
    document.querySelectorAll(".cart-badge").forEach((el) => {
      const c = count();
      el.textContent = c;
      el.style.display = c > 0 ? "flex" : "none";
    });
  }

  return { getAll, add, remove, updateQty, clear, total, count, updateBadge };
})();

/* ─── Toast notifications ──────────────────────────────────────────────────── */
function toast(msg, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; }, 2800);
  setTimeout(() => t.remove(), 3200);
}

/* ─── Loading overlay ───────────────────────────────────────────────────────── */
function showLoading() {
  let el = document.getElementById("loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-overlay";
    el.className = "loading-overlay";
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
  el.style.display = "flex";
}
function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.style.display = "none";
}

/* ─── API helpers ───────────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

/* ─── Category emoji ────────────────────────────────────────────────────────── */
function categoryEmoji(cat) {
  return { mug: "☕", keychain: "🔑", magnet: "🧲", badge: "📌" }[cat] || "🎁";
}

/* ─── Format currency ───────────────────────────────────────────────────────── */
function formatINR(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

/* ─── Initialise cart badge on every page ──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => Cart.updateBadge());
