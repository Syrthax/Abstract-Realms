'use client';

import { useState } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '8788'
  ? ''
  : 'http://localhost:8788';

const products = [
  { id: 1, name: 'T-Shirt', base_price: 499 },
  { id: 2, name: 'Mug', base_price: 299 },
  { id: 3, name: 'Poster', base_price: 199 },
  { id: 4, name: 'Phone Case', base_price: 399 },
];

const materials = [
  { id: 1, name: 'Standard', price_modifier: 1.0 },
  { id: 2, name: 'Premium', price_modifier: 1.5 },
  { id: 3, name: 'Deluxe', price_modifier: 2.0 },
];

export default function OrderPage() {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    product_id: '',
    material_id: '',
    quantity: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedProduct = products.find(p => p.id === Number(form.product_id));
  const selectedMaterial = materials.find(m => m.id === Number(form.material_id));
  const totalPrice = selectedProduct && selectedMaterial
    ? (selectedProduct.base_price * selectedMaterial.price_modifier * form.quantity).toFixed(2)
    : null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  async function uploadToCloudinary(file) {
    // For demo purposes, returns a placeholder URL
    // In production, upload to Cloudinary using unsigned upload preset
    const cloudName = 'demo'; // Replace with env var on frontend
    const uploadPreset = 'unsigned_preset';

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        // Fallback: use data URL as placeholder for local dev
        return imagePreview || 'https://via.placeholder.com/300x300?text=Custom+Art';
      }

      const data = await res.json();
      return data.secure_url;
    } catch {
      // Fallback for local development
      return 'https://via.placeholder.com/300x300?text=Custom+Art';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let image_url = 'https://via.placeholder.com/300x300?text=No+Image';
      if (imageFile) {
        image_url = await uploadToCloudinary(imageFile);
      }

      const res = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          product_id: Number(form.product_id),
          material_id: Number(form.material_id),
          quantity: Number(form.quantity),
          image_url,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Order placed successfully! Order ID: ${data.order_id}. Total: ₹${data.total_price}` });
        setForm({ customer_name: '', customer_email: '', product_id: '', material_id: '', quantity: 1 });
        setImageFile(null);
        setImagePreview(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to place order.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Make sure the backend is running (npm run pages:dev).' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Custom Order</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Upload your artwork and choose your product to create a custom order.
      </p>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label>Your Name *</label>
          <input
            type="text"
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input
            type="email"
            name="customer_email"
            value={form.customer_email}
            onChange={handleChange}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Upload Your Artwork</label>
          <div
            className={`upload-area ${imagePreview ? 'has-image' : ''}`}
            onClick={() => document.getElementById('file-input').click()}
          >
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Preview" className="upload-preview" />
                <p style={{ marginTop: '0.5rem', color: 'var(--success)' }}>Image selected ✓</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                <p style={{ color: 'var(--text-secondary)' }}>Click to upload your artwork</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PNG, JPG, WEBP up to 5MB</p>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Product *</label>
          <select name="product_id" value={form.product_id} onChange={handleChange} required>
            <option value="">Select a product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} — ₹{p.base_price}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Material *</label>
          <select name="material_id" value={form.material_id} onChange={handleChange} required>
            <option value="">Select material</option>
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name} (×{m.price_modifier})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            min="1"
            max="10"
            required
          />
        </div>

        {totalPrice && (
          <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(108, 99, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>₹{totalPrice}</span>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><span className="spinner" /> Placing Order...</> : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
