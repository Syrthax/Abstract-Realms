'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '8788'
  ? ''
  : 'http://localhost:8788';

function formatLabel(str) {
  if (!str) return '—';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState('orders'); // orders | products | add-product | add-variant
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // --- Auth ---
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) {
        setAuthenticated(true);
        setOrders(data.orders || []);
        await loadProducts();
      } else {
        setError(data.error || 'Auth failed.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch(`${API_BASE}/api/orders?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
    } catch { /* silent */ }
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) setProducts(data.products || []);
    } catch { /* silent */ }
  }

  async function refresh() {
    setLoading(true);
    await Promise.all([loadOrders(), loadProducts()]);
    setLoading(false);
  }

  // --- Order status update ---
  async function updateOrderStatus(order_id, status) {
    try {
      const res = await fetch(`${API_BASE}/api/update-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, order_id, status }),
      });
      if (res.ok) await loadOrders();
    } catch { /* silent */ }
  }

  // --- Product actions ---
  async function toggleProduct(product_id) {
    await fetch(`${API_BASE}/api/update-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, product_id, action: 'toggle_active' }),
    });
    await loadProducts();
  }

  async function updateStock(product_id, value) {
    await fetch(`${API_BASE}/api/update-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, product_id, action: 'update_stock', value }),
    });
    await loadProducts();
  }

  // --- Add product form ---
  const [newProduct, setNewProduct] = useState({ name: '', category: 'mug', base_price: '', stock: '' });

  async function handleAddProduct(e) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`${API_BASE}/api/create-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...newProduct }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Product "${data.name}" created (${data.id})` });
      setNewProduct({ name: '', category: 'mug', base_price: '', stock: '' });
      await loadProducts();
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  }

  // --- Add variant form ---
  const [newVariant, setNewVariant] = useState({ product_id: '', material: '', shape: '', price_modifier: '', stock: '' });

  async function handleAddVariant(e) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`${API_BASE}/api/create-variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...newVariant }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Variant created (${data.id})` });
      setNewVariant({ product_id: '', material: '', shape: '', price_modifier: '', stock: '' });
      await loadProducts();
    } else {
      setMsg({ type: 'error', text: data.error });
    }
  }

  // --- Login screen ---
  if (!authenticated) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Enter admin password to continue.</p>
        {error && <div className="message message-error">{error}</div>}
        <form onSubmit={handleLogin} style={{ maxWidth: '400px' }}>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Logging in...</> : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={refresh} className="btn btn-secondary" disabled={loading} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {loading ? '...' : 'Refresh'}
          </button>
          <button onClick={() => { setAuthenticated(false); setPassword(''); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'orders', label: `Orders (${orders.length})` },
          { key: 'products', label: `Products (${products.length})` },
          { key: 'add-product', label: '+ Product' },
          { key: 'add-variant', label: '+ Variant' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(null); }}
            className={tab === t.key ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className={`message message-${msg.type}`}>{msg.text}</div>}

      {/* ===== ORDERS TAB ===== */}
      {tab === 'orders' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>{orders.length}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>{orders.filter(o => o.status === 'pending').length}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Pending</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{orders.filter(o => o.status === 'completed').length}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Done</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>₹{orders.reduce((s, o) => s + (o.total_price || 0), 0)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Revenue</div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
              <p style={{ color: 'var(--text-secondary)' }}>No orders yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontSize: '0.8rem' }}>{o.id}</td>
                      <td>{o.customer_name}</td>
                      <td>{o.phone}</td>
                      <td>{o.product_name || o.product_id}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {o.variant_material || o.variant_shape
                          ? [o.variant_material, o.variant_shape].filter(Boolean).map(formatLabel).join(' / ')
                          : '—'}
                      </td>
                      <td>{o.quantity}</td>
                      <td style={{ fontWeight: 600 }}>₹{o.total_price}</td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <select
                          value={o.status}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6 }}
                        >
                          {['pending', 'confirmed', 'printing', 'completed', 'cancelled'].map(s => (
                            <option key={s} value={s}>{formatLabel(s)}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== PRODUCTS TAB ===== */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ opacity: p.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{p.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatLabel(p.category)} · ₹{p.base_price} · Stock: {p.stock} · {p.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    defaultValue={p.stock}
                    min="0"
                    style={{ width: 70, padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.85rem' }}
                    onBlur={e => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v !== p.stock) updateStock(p.id, v);
                    }}
                  />
                  <button
                    onClick={() => toggleProduct(p.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    {p.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              {/* Variants */}
              {p.variants && p.variants.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Variants:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {p.variants.map(v => (
                      <span
                        key={v.id}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          background: v.stock > 0 ? 'rgba(108,99,255,0.1)' : 'rgba(239,83,80,0.1)',
                          color: v.stock > 0 ? 'var(--accent)' : 'var(--error)',
                          borderRadius: 6,
                        }}
                      >
                        {[v.material, v.shape].filter(Boolean).map(formatLabel).join(' / ')}
                        {v.price_modifier ? ` +₹${v.price_modifier}` : ''} · Stock: {v.stock}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== ADD PRODUCT TAB ===== */}
      {tab === 'add-product' && (
        <form onSubmit={handleAddProduct} style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label>Product Name *</label>
            <input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}>
              <option value="mug">Mug</option>
              <option value="keychain">Keychain</option>
              <option value="magnet">Fridge Magnet</option>
              <option value="badge">Badge</option>
            </select>
          </div>
          <div className="form-group">
            <label>Base Price (₹) *</label>
            <input type="number" value={newProduct.base_price} onChange={e => setNewProduct(p => ({ ...p, base_price: e.target.value }))} min="0" required />
          </div>
          <div className="form-group">
            <label>Stock</label>
            <input type="number" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} min="0" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Product</button>
        </form>
      )}

      {/* ===== ADD VARIANT TAB ===== */}
      {tab === 'add-variant' && (
        <form onSubmit={handleAddVariant} style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label>Product *</label>
            <select value={newVariant.product_id} onChange={e => setNewVariant(v => ({ ...v, product_id: e.target.value }))} required>
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Material</label>
            <input type="text" value={newVariant.material} onChange={e => setNewVariant(v => ({ ...v, material: e.target.value }))} placeholder="e.g. wood, polyester (leave blank if none)" />
          </div>
          <div className="form-group">
            <label>Shape</label>
            <input type="text" value={newVariant.shape} onChange={e => setNewVariant(v => ({ ...v, shape: e.target.value }))} placeholder="e.g. heart, oval, square (leave blank if none)" />
          </div>
          <div className="form-group">
            <label>Price Modifier (₹)</label>
            <input type="number" value={newVariant.price_modifier} onChange={e => setNewVariant(v => ({ ...v, price_modifier: e.target.value }))} min="0" placeholder="Extra cost on top of base price" />
          </div>
          <div className="form-group">
            <label>Stock</label>
            <input type="number" value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))} min="0" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Variant</button>
        </form>
      )}
    </div>
  );
}
