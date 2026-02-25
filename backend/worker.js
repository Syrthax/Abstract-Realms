// Abstract Realms – Cloudflare Worker (Production)
// UPI QR-based payment system – no Razorpay

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, admin_key",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ─── Cloudinary upload via REST API ───────────────────────────────────────────
async function uploadToCloudinary(fileBuffer, fileName, folder, env) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sigString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1Hex(sigString);

  const formData = new FormData();
  formData.append("file",      new Blob([fileBuffer]), fileName);
  formData.append("api_key",   apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder",    folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error(`Cloudinary error: ${await res.text()}`);
  return res.json();
}

async function sha1Hex(str) {
  const enc = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Resend email ─────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }, env) {
  if (!env.RESEND_API_KEY || !to) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Abstract Realms <orders@abstractrealms.store>",
      to:   [to],
      subject,
      html,
    }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_LABELS = {
  PAYMENT_PENDING:  "Payment Pending",
  PAYMENT_RECEIVED: "Payment Received",
  IN_PROGRESS:      "In Progress",
  COMPLETED:        "Completed",
};

function statusEmailHtml(order, newStatus, env) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#6366f1">Abstract Realms – Order Update</h2>
      <p>Hi <strong>${order.customer_name}</strong>,</p>
      <p>Your order <strong>#${order.id}</strong> status has been updated to:</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center">
        <span style="font-size:1.4rem;font-weight:700;color:#6366f1">
          ${STATUS_LABELS[newStatus] ?? newStatus}
        </span>
      </div>
      <p style="margin-top:16px">
        Track your order:
        <a href="${env.FRONTEND_URL}/order.html?id=${order.id}">Click here</a>
      </p>
      <p style="color:#6b7280;font-size:0.85rem">Thank you for ordering from Abstract Realms!</p>
    </div>
  `;
}

// ─── Unique ID generator ──────────────────────────────────────────────────────
function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // ── GET /api/products ────────────────────────────────────────────────────
      if (path === "/api/products" && method === "GET") {
        const products = await env.DB.prepare(
          `SELECT p.*, 
            json_group_array(
              json_object(
                'id', pv.id,
                'material', pv.material,
                'shape', pv.shape,
                'price_modifier', pv.price_modifier,
                'stock', pv.stock
              )
            ) as variants
           FROM products p
           LEFT JOIN product_variants pv ON pv.product_id = p.id
           WHERE p.is_active = 1
           GROUP BY p.id
           ORDER BY p.created_at DESC`
        ).all();

        const rows = products.results.map((p) => ({
          ...p,
          variants: JSON.parse(p.variants).filter((v) => v.id !== null),
        }));
        return json(rows);
      }

      // ── POST /api/products ───────────────────────────────────────────────────
      if (path === "/api/products" && method === "POST") {
        const { name, category, base_price, stock } = await request.json();
        if (!name || !category || base_price == null)
          return err("name, category, base_price required");

        const id = uid("prod_");
        await env.DB.prepare(
          `INSERT INTO products (id, name, category, base_price, stock) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(id, name, category, base_price, stock ?? 0)
          .run();

        return json({ id, message: "Product created" }, 201);
      }

      // ── POST /api/upload-image ─────────────────────────────────────────────
      if (path === "/api/upload-image" && method === "POST") {
        const formData = await request.formData();
        const file     = formData.get("image");
        if (!file) return err("No image provided");

        const buffer = await file.arrayBuffer();
        const result = await uploadToCloudinary(buffer, file.name || "upload.jpg", "merch-uploads", env);
        return json({ url: result.secure_url, public_id: result.public_id });
      }

      // ── POST /api/create-order ─────────────────────────────────────────────
      // Creates order with PAYMENT_PENDING; returns order_id + amount for QR
      if (path === "/api/create-order" && method === "POST") {
        const { customer_name, phone, email, product_id, variant_id, quantity, image_url, total_price } =
          await request.json();

        if (!customer_name || !phone || !product_id || !total_price)
          return err("Missing required order fields");

        const orderId = uid("ord_");

        await env.DB.prepare(
          `INSERT INTO orders
            (id, customer_name, phone, email, product_id, variant_id,
             quantity, image_url, total_price, status)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          orderId,
          customer_name,
          phone,
          email       ?? null,
          product_id,
          variant_id  ?? null,
          quantity    ?? 1,
          image_url   ?? null,
          total_price,
          "PAYMENT_PENDING"
        ).run();

        return json({ id: orderId, total_price, status: "PAYMENT_PENDING" }, 201);
      }

      // ── POST /api/upload-payment-screenshot ───────────────────────────────
      // Customer uploads UPI payment screenshot after paying
      if (path === "/api/upload-payment-screenshot" && method === "POST") {
        const formData = await request.formData();
        const file     = formData.get("screenshot");
        const order_id = formData.get("order_id");

        if (!file)     return err("No screenshot provided");
        if (!order_id) return err("order_id required");

        const order = await env.DB.prepare(`SELECT id FROM orders WHERE id = ?`)
          .bind(order_id).first();
        if (!order) return err("Order not found", 404);

        const buffer = await file.arrayBuffer();
        const result = await uploadToCloudinary(
          buffer, file.name || "screenshot.jpg", "payment-screenshots", env
        );

        await env.DB.prepare(
          `UPDATE orders SET payment_screenshot_url = ? WHERE id = ?`
        ).bind(result.secure_url, order_id).run();

        return json({ url: result.secure_url });
      }

      // ── GET /api/orders ────────────────────────────────────────────────────
      if (path === "/api/orders" && method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT o.*, p.name AS product_name, p.category,
                  pv.material, pv.shape
           FROM orders o
           JOIN products p ON p.id = o.product_id
           LEFT JOIN product_variants pv ON pv.id = o.variant_id
           ORDER BY o.created_at DESC`
        ).all();
        return json(results);
      }

      // ── GET /api/order-status?id= ─────────────────────────────────────────
      if (path === "/api/order-status" && method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return err("id required");

        const order = await env.DB.prepare(
          `SELECT o.*, p.name AS product_name, p.category, p.base_price,
                  pv.material, pv.shape, pv.price_modifier
           FROM orders o
           JOIN products p ON p.id = o.product_id
           LEFT JOIN product_variants pv ON pv.id = o.variant_id
           WHERE o.id = ?`
        ).bind(id).first();

        if (!order) return err("Order not found", 404);
        return json(order);
      }

      // ── POST /api/update-order-status ─────────────────────────────────────
      if (path === "/api/update-order-status" && method === "POST") {
        const { id, status, admin_key } = await request.json();

        if (admin_key !== env.ADMIN_SECRET) return err("Unauthorized", 401);

        const validStatuses = ["PAYMENT_PENDING", "PAYMENT_RECEIVED", "IN_PROGRESS", "COMPLETED"];
        if (!validStatuses.includes(status)) return err("Invalid status");

        const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`)
          .bind(id).first();
        if (!order) return err("Order not found", 404);

        await env.DB.prepare(`UPDATE orders SET status = ? WHERE id = ?`)
          .bind(status, id).run();

        if (order.email) {
          await sendEmail({
            to:      order.email,
            subject: `${STATUS_LABELS[status] ?? status} – Abstract Realms`,
            html:    statusEmailHtml(order, status, env),
          }, env);
        }

        return json({ success: true, status });
      }

      return err("Not found", 404);
    } catch (e) {
      console.error(e);
      return err(e.message ?? "Internal server error", 500);
    }
  },
};
