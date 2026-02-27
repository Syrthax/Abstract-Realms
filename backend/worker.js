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
  REJECTED:         "Rejected",
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

// ─── Invoice PDF generator (pure JS – no Node deps, works in Workers) ────────
function buildInvoicePdf(inv) {
  // Sanitise to printable ASCII so byte-length === string-length (safe xref offsets)
  const san  = (s) => String(s ?? "").replace(/[^ -~]/g, "?");
  const esc  = (s) => san(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const money = (n) => "Rs. " + Number(n ?? 0).toFixed(0);

  // ── Content stream (BT/ET text blocks + horizontal rules) ──────────────────
  const ops = [];
  const T = (text, x, y, size, bold) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`);
  const HL = (y) =>
    ops.push(`q 0.75 0.75 0.75 RG 50 ${y} m 545 ${y} l S Q`);

  // Header
  T("Abstract Realms",      50,  800, 20, true);
  T("shop.sarthakg.tech",   50,  778, 10, false);
  T("INVOICE",             400,  808, 14, true);
  T("Invoice #: " + inv.invoiceNumber, 370, 793, 9, false);
  T("Order ID:  " + inv.orderId,       370, 780, 9, false);
  T("Date:      " + inv.date,          370, 767, 9, false);
  HL(758);

  // Bill To
  T("BILL TO",          50, 742, 9, true);
  T(inv.customerName,  50, 727, 11, false);
  T("Phone: " + inv.phone, 50, 712, 9, false);
  if (inv.email) T("Email: " + inv.email, 50, 697, 9, false);

  const tableTopY = inv.email ? 680 : 695;
  HL(tableTopY);

  // Table header
  const thY = tableTopY - 16;
  T("Product",    50, thY, 9, true);
  T("Type",      270, thY, 9, true);
  T("Base Price",350, thY, 9, true);
  T("Qty",       430, thY, 9, true);
  T("Subtotal",  480, thY, 9, true);
  HL(thY - 9);

  // Table row
  const trY = thY - 23;
  const pname = san(inv.productName).length > 32
    ? san(inv.productName).slice(0, 32) + "..."
    : san(inv.productName);
  T(pname,                            50, trY, 9, false);
  T(inv.orderType,                   270, trY, 9, false);
  T(money(inv.basePrice),            350, trY, 9, false);
  T(String(inv.qty),                 430, trY, 9, false);
  T(money(inv.basePrice * inv.qty),  480, trY, 9, false);

  // Summary
  let sy = trY - 14;
  HL(sy);
  sy -= 5;
  if (inv.custFee > 0) {
    sy -= 16;
    T("Customization Fee:", 350, sy, 9, false);
    T(money(inv.custFee),   490, sy, 9, false);
    sy -= 10;
    HL(sy);
    sy -= 5;
  }
  sy -= 18;
  T("TOTAL:",         370, sy, 12, true);
  T(money(inv.total), 480, sy, 12, true);

  // Footer
  HL(75);
  T("Thank you for your order!  -  Abstract Realms  |  shop.sarthakg.tech", 50, 60, 8, false);

  const cs    = ops.join("\n");
  const csLen = cs.length; // ASCII-only: byte length === string length

  // ── Assemble PDF objects ────────────────────────────────────────────────────
  const chunks  = [];
  const offsets = new Array(7).fill(0); // [0] unused; [1-6] = byte offsets
  let pos = 0;

  const put = (s) => { chunks.push(s); pos += s.length; };
  const obj = (n, body) => {
    offsets[n] = pos;
    put(`${n} 0 obj\n${body}\nendobj\n`);
  };

  put("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
    "   /Contents 4 0 R\n" +
    "   /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>"
  );
  obj(4, `<< /Length ${csLen} >>\nstream\n${cs}\nendstream`);
  obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  obj(6, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const xrefPos = pos;
  put("xref\n");
  put("0 7\n");
  put("0000000000 65535 f \n");
  for (let i = 1; i <= 6; i++) {
    put(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  put("trailer\n<< /Size 7 /Root 1 0 R >>\n");
  put("startxref\n");
  put(`${xrefPos}\n`);
  put("%%EOF\n");

  return new TextEncoder().encode(chunks.join(""));
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
        const {
          name, category, base_price, stock, image_url, is_customizable,
          cover_image_url, gallery_images_json, description, customization_fee,
        } = await request.json();
        if (!name || !category || base_price == null)
          return err("name, category, base_price required");

        const id = uid("prod_");
        await env.DB.prepare(
          `INSERT INTO products
            (id, name, category, base_price, stock, image_url, is_customizable,
             cover_image_url, gallery_images_json, description, customization_fee)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, name, category, base_price, stock ?? 0,
          image_url ?? null, is_customizable ? 1 : 0,
          cover_image_url ?? null,
          gallery_images_json ?? null,
          description ?? null,
          customization_fee ?? 20,
        ).run();

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

      // ── GET /api/product?id= ───────────────────────────────────────────────
      // Product detail page
      if (path === "/api/product" && method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return err("id required");
        const product = await env.DB.prepare(
          `SELECT p.*,
            json_group_array(
              json_object(
                'id', pv.id, 'material', pv.material, 'shape', pv.shape,
                'price_modifier', pv.price_modifier, 'stock', pv.stock
              )
            ) as variants
           FROM products p
           LEFT JOIN product_variants pv ON pv.product_id = p.id
           WHERE p.id = ? AND p.is_active = 1
           GROUP BY p.id`
        ).bind(id).first();
        if (!product) return err("Product not found", 404);
        product.variants = JSON.parse(product.variants).filter(v => v.id !== null);
        return json(product);
      }

      // ── POST /api/create-order ─────────────────────────────────────────────
      // Creates order with PAYMENT_PENDING; returns order_id + amount for QR
      if (path === "/api/create-order" && method === "POST") {
        const {
          customer_name, phone, email, product_id, variant_id,
          quantity, image_url, total_price, is_customized,
        } = await request.json();

        if (!customer_name || !phone || !product_id || !total_price)
          return err("Missing required order fields");

        // ── BUG FIX 1: check stock before creating order ──────────────────
        const productForStock = await env.DB.prepare(
          `SELECT stock FROM products WHERE id = ? AND is_active = 1`
        ).bind(product_id).first();
        if (!productForStock) return err("Product not found", 404);
        if ((productForStock.stock ?? 0) <= 0) return err("Out of stock", 400);

        const orderId = uid("ord_");

        await env.DB.prepare(
          `INSERT INTO orders
            (id, customer_name, phone, email, product_id, variant_id,
             quantity, image_url, total_price, status, is_customized)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          orderId,
          customer_name,
          phone,
          email        ?? null,
          product_id,
          variant_id   ?? null,
          quantity     ?? 1,
          image_url    ?? null,
          total_price,
          "PAYMENT_PENDING",
          is_customized ? 1 : 0,
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
                  p.customization_fee,
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

        const validStatuses = ["PAYMENT_PENDING", "PAYMENT_RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"];
        if (!validStatuses.includes(status)) return err("Invalid status");

        const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`)
          .bind(id).first();
        if (!order) return err("Order not found", 404);

        await env.DB.prepare(`UPDATE orders SET status = ? WHERE id = ?`)
          .bind(status, id).run();

        // ── Feature 6: Reduce stock + generate invoice when payment confirmed ──
        if (status === "PAYMENT_RECEIVED" && order.status === "PAYMENT_PENDING") {
          // Reduce stock
          await env.DB.prepare(
            `UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?`
          ).bind(order.quantity ?? 1, order.product_id).run();

          // Generate unique invoice number INV-YYYY-XXXX
          const year     = new Date().getFullYear();
          const cntRes   = await env.DB.prepare(
            `SELECT COUNT(*) AS cnt FROM orders WHERE invoice_number LIKE ?`
          ).bind(`INV-${year}-%`).first();
          const seq      = String((cntRes?.cnt ?? 0) + 1).padStart(4, "0");
          const invNum   = `INV-${year}-${seq}`;
          await env.DB.prepare(`UPDATE orders SET invoice_number = ? WHERE id = ?`)
            .bind(invNum, id).run();
        }

        if (order.email) {
          await sendEmail({
            to:      order.email,
            subject: `${STATUS_LABELS[status] ?? status} – Abstract Realms`,
            html:    statusEmailHtml(order, status, env),
          }, env);
        }

        return json({ success: true, status });
      }

      // ── GET /api/product-stats ─────────────────────────────────────────────
      if (path === "/api/product-stats" && method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT p.id, p.name, p.image_url, p.cover_image_url, p.stock,
                  p.is_customizable, p.category,
                  COUNT(o.id) AS total_sold
           FROM products p
           LEFT JOIN orders o ON o.product_id = p.id AND o.status != 'REJECTED'
           WHERE p.is_active = 1
           GROUP BY p.id
           ORDER BY p.created_at DESC`
        ).all();
        return json(results);
      }

      // ── GET /api/invoice?id= ───────────────────────────────────────────────
      // Returns a dynamically generated PDF; no PDF stored in DB
      if (path === "/api/invoice" && method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return err("id required");

        const order = await env.DB.prepare(
          `SELECT o.*, p.name AS product_name, p.base_price, p.customization_fee,
                  pv.material, pv.shape
           FROM orders o
           JOIN products p ON p.id = o.product_id
           LEFT JOIN product_variants pv ON pv.id = o.variant_id
           WHERE o.id = ?`
        ).bind(id).first();

        if (!order) return err("Order not found", 404);
        if (!order.invoice_number)
          return err("Invoice not available yet — payment must be confirmed first.", 400);

        const dateStr = new Date(order.created_at).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });

        const pdfBytes = buildInvoicePdf({
          invoiceNumber: order.invoice_number,
          orderId:       order.id,
          date:          dateStr,
          customerName:  order.customer_name,
          phone:         order.phone,
          email:         order.email,
          productName:   order.product_name,
          orderType:     order.is_customized ? "Customized" : "Premade",
          basePrice:     order.base_price,
          custFee:       order.is_customized ? (order.customization_fee ?? 0) : 0,
          qty:           order.quantity ?? 1,
          total:         order.total_price,
        });

        return new Response(pdfBytes, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${order.invoice_number}.pdf"`,
          },
        });
      }

      // ── POST /api/admin-login ──────────────────────────────────────────────
      // Validates admin key; returns ok:true so the frontend can gate the UI
      if (path === "/api/admin-login" && method === "POST") {
        const { admin_key } = await request.json();
        if (!admin_key || admin_key !== env.ADMIN_SECRET)
          return err("Invalid admin key", 401);
        return json({ ok: true });
      }

      // ── POST /api/delete-product ──────────────────────────────────────────
      if (path === "/api/delete-product" && method === "POST") {
        const { id, admin_key } = await request.json();
        if (admin_key !== env.ADMIN_SECRET) return err("Unauthorized", 401);
        if (!id) return err("id required");
        // Soft-delete: set is_active = 0
        await env.DB.prepare(`UPDATE products SET is_active = 0 WHERE id = ?`)
          .bind(id).run();
        return json({ success: true });
      }

      return err("Not found", 404);
    } catch (e) {
      console.error(e);
      return err(e.message ?? "Internal server error", 500);
    }
  },
};
