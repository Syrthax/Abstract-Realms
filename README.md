# Abstract Realms – Custom Merch Store

Production-ready e-commerce system built on:
- **Frontend**: Vanilla HTML/CSS/JS → Cloudflare Pages
- **Backend**: Cloudflare Workers (`worker.js`)
- **Database**: Cloudflare D1 (`merch-db`)
- **Images**: Cloudinary
- **Payments**: UPI QR Code (no payment gateway required)
- **Email**: Resend

---

## Payment Flow

```
Customer fills form
       ↓
POST /api/create-order → order created with PAYMENT_PENDING
       ↓
Frontend generates UPI deep-link + QR via api.qrserver.com
       ↓
Customer scans QR or clicks "Open UPI App" → pays
       ↓
Customer clicks "I Have Paid" (optionally uploads screenshot)
       ↓
Redirected to order.html?id=ORDER_ID (polls every 10s)
       ↓
Admin marks PAYMENT_RECEIVED → customer sees live update
```

---

## Order Statuses

| Status | Description |
|--------|-------------|
| `PAYMENT_PENDING` | Order created, awaiting payment |
| `PAYMENT_RECEIVED` | Admin confirmed payment |
| `IN_PROGRESS` | Merch being made |
| `COMPLETED` | Ready / delivered |

---

## UPI Config

In `public/script.js` and `public/checkout.html`, update:
```js
const UPI_ID     = "REPLACE_WITH_UPI_ID";
const STORE_NAME = "REPLACE_WITH_STORE_NAME";
```

---

## Folder Structure

```
/
├── worker.js               ← Cloudflare Worker (all API routes)
├── wrangler.toml           ← Worker config
├── schema.sql              ← D1 schema + seed data
└── public/                 ← Static frontend → Cloudflare Pages
    ├── index.html          ← Product listing + add to cart
    ├── cart.html           ← Cart management
    ├── checkout.html       ← UPI QR payment flow
    ├── order.html          ← Live order status (polls every 10s)
    ├── admin-secret.html   ← Admin panel
    ├── styles.css          ← Global dark-mode styles
    └── script.js           ← Shared utilities
```

---

## Step 1 – Set worker environment variables

```bash
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY
wrangler secret put CLOUDINARY_API_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put ADMIN_SECRET      # admin panel password
```

---

## Step 2 – Initialise the D1 database

```bash
wrangler d1 execute merch-db --file=schema.sql
```

---

## Step 3 – Deploy the Worker

```bash
wrangler deploy
```

Note the deployed URL, e.g.:
```
https://merch-worker.YOUR_SUBDOMAIN.workers.dev
```

---

## Step 4 – Update API base URL

In `public/script.js`, line 5:
```js
const API_BASE = "https://merch-worker.YOUR_SUBDOMAIN.workers.dev";
```

---

## Step 5 – Set your UPI ID

In `public/checkout.html` (inside the `<script>` block at the bottom):
```js
const UPI_ID     = "yourname@upi";     // e.g. abstractrealms@okicici
const STORE_NAME = "Abstract Realms";
```

---

## Step 6 – Deploy Frontend to Cloudflare Pages

```bash
wrangler pages deploy public --project-name=abstract-realms
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/products` | List all active products with variants |
| POST | `/api/products` | Create a new product |
| POST | `/api/upload-image` | Upload custom design image to Cloudinary |
| POST | `/api/create-order` | Create order with PAYMENT_PENDING status |
| POST | `/api/upload-payment-screenshot` | Upload UPI payment screenshot |
| GET  | `/api/orders` | List all orders (admin) |
| GET  | `/api/order-status?id=` | Get single order status |
| POST | `/api/update-order-status` | Update status + send email |

---

## Admin Panel

Navigate to: `/admin-secret.html`

Features:
- View all orders with payment screenshot
- One-click quick status buttons (Mark Paid → Start Work → Complete)
- Full status dropdown for manual override
- Download custom design images
- Add new products


Production-ready e-commerce system built on:
- **Frontend**: Vanilla HTML/CSS/JS → Cloudflare Pages
- **Backend**: Cloudflare Workers (`worker.js`)
- **Database**: Cloudflare D1 (`merch-db`)
- **Images**: Cloudinary
- **Payments**: Razorpay
- **Email**: Resend

---

## Folder Structure

```
/
├── worker.js               ← Cloudflare Worker (single file, all API routes)
├── wrangler.toml           ← Worker config (DO NOT EDIT)
├── schema.sql              ← D1 database schema + seed data
└── public/                 ← Static frontend (deploy to Cloudflare Pages)
    ├── index.html          ← Product listing + add to cart
    ├── cart.html           ← Cart management
    ├── checkout.html       ← Razorpay checkout
    ├── order.html          ← Live order status (polls every 10s)
    ├── admin-secret.html   ← Admin panel
    ├── styles.css          ← Global dark-mode styles
    └── script.js           ← Shared utilities (Cart, toast, apiFetch, etc.)
```

---

## Step 1 – Set worker environment variables

```bash
# Required worker secrets – run each command separately:
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY
wrangler secret put CLOUDINARY_API_SECRET
wrangler secret put RAZORPAY_KEY_ID
wrangler secret put RAZORPAY_KEY_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put ADMIN_SECRET      # choose any strong password for admin login
```

---

## Step 2 – Initialise the D1 database

```bash
# Apply schema and seed products
wrangler d1 execute merch-db --file=schema.sql
```

---

## Step 3 – Deploy the Worker

```bash
wrangler deploy
```

Note the deployed URL, e.g.:
```
https://merch-worker.YOUR_SUBDOMAIN.workers.dev
```

---

## Step 4 – Update the API base URL in `public/script.js`

Open `public/script.js` and replace:
```js
const API_BASE = "https://merch-worker.YOUR_SUBDOMAIN.workers.dev";
```
with your actual worker URL.

---

## Step 5 – Deploy Frontend to Cloudflare Pages

```bash
# Option A: CLI
wrangler pages deploy public --project-name=abstract-realms

# Option B: Git integration
# Push to GitHub → connect repo in Cloudflare Pages dashboard
# Set build output directory to: public
```

---

## Admin Panel

Navigate to: `https://YOUR_PAGES_DOMAIN/admin-secret.html`

Enter the `ADMIN_SECRET` value you set in Step 1.

Admin can:
- View all orders with full details
- Filter by status
- Download customer custom images
- Change order status (triggers Resend email if customer provided email)
- Add new products

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/products` | List all active products with variants |
| POST | `/api/products` | Create a new product |
| POST | `/api/upload-image` | Upload custom image to Cloudinary |
| POST | `/api/create-razorpay-order` | Create a Razorpay order |
| POST | `/api/verify-payment` | Verify Razorpay signature |
| POST | `/api/create-order` | Save order to D1 |
| GET  | `/api/orders` | List all orders (admin) |
| GET  | `/api/order-status?id=` | Get single order status |
| POST | `/api/update-order-status` | Update order status + send email |

---

## Order Status Flow

```
PENDING_PAYMENT → PAID → ACCEPTED → IN_PROGRESS → COMPLETED
                                                 → REJECTED
```

The order page (`order.html?id=ORDER_ID`) polls `/api/order-status` every **10 seconds** and updates the UI live.

---

## Local Development

```bash
# Start worker locally (D1 remote mode)
wrangler dev --remote

# Serve frontend (any static server)
npx serve public
```
