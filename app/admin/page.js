'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '8788'
  ? ''
  : 'http://localhost:8788';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } else {
        setError(data.error || 'Authentication failed.');
      }
    } catch {
      setError('Network error. Make sure the backend is running (npm run pages:dev).');
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrders() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Enter the admin password to view orders.
        </p>

        {error && <div className="message message-error">{error}</div>}

        <form onSubmit={handleLogin} style={{ maxWidth: '400px' }}>
          <div className="form-group">
            <label>Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Logging in...</> : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{orders.length} orders total</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={refreshOrders} className="btn btn-secondary" disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button onClick={() => { setAuthenticated(false); setPassword(''); }} className="btn btn-secondary">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent)' }}>{orders.length}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Orders</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--warning)' }}>
            {orders.filter(o => o.status === 'pending').length}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pending</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--success)' }}>
            {orders.filter(o => o.status === 'completed').length}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent)' }}>
            ₹{orders.reduce((sum, o) => sum + (o.total_price || 0), 0).toFixed(0)}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Revenue</div>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3>No orders yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Product</th>
                <th>Material</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.customer_name}</td>
                  <td>{order.customer_email}</td>
                  <td>{order.product_name || `Product #${order.product_id}`}</td>
                  <td>{order.material_name || `Material #${order.material_id}`}</td>
                  <td>{order.quantity}</td>
                  <td style={{ fontWeight: '600' }}>₹{order.total_price}</td>
                  <td>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
