'use client';

import { useState, useEffect, useMemo } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '8788'
  ? ''
  : 'http://localhost:8788';

function formatLabel(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function OrderPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    product_id: '',
    variant_id: '',
    quantity: 1,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Load products on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        // Pre-select product from URL param
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const preselect = params.get('product');
          if (preselect) {
            setForm(prev => ({ ...prev, product_id: preselect }));
          }
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const selectedProduct = products.find(p => p.id === form.product_id);
  const variants = selectedProduct?.variants || [];
  const hasVariants = variants.length > 0;

  // Derive unique materials and shapes for current product
  const materials = useMemo(() => {
    const set = new Set(variants.map(v => v.material).filter(Boolean));
    return [...set];
  }, [variants]);

  const shapes = useMemo(() => {
    const set = new Set(variants.map(v => v.shape).filter(Boolean));
    return [...set];
  }, [variants]);

  // Selected material/shape state (derived from variant or independent)
  const [selMaterial, setSelMaterial] = useState('');
  const [selShape, setSelShape] = useState('');

  // Reset variant selectors when product changes
  useEffect(() => {
    setSelMaterial('');
    setSelShape('');
    setForm(prev => ({ ...prev, variant_id: '' }));
  }, [form.product_id]);

  // Auto-resolve variant from material + shape
  useEffect(() => {
    if (!hasVariants) {
      setForm(prev => ({ ...prev, variant_id: '' }));
      return;
    }
    const match = variants.find(v => {
      const matMatch = materials.length === 0 || v.material === selMaterial;
      const shapeMatch = shapes.length === 0 || v.shape === selShape;
      return matMatch && shapeMatch;
    });
    setForm(prev => ({ ...prev, variant_id: match ? match.id : '' }));
  }, [selMaterial, selShape, hasVariants, variants, materials.length, shapes.length]);

  const selectedVariant = variants.find(v => v.id === form.variant_id);

  const unitPrice = selectedProduct
    ? selectedProduct.base_price + (selectedVariant ? selectedVariant.price_modifier : 0)
    : 0;
  const totalPrice = unitPrice * form.quantity;

  // Stock check
  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : (selectedProduct ? selectedProduct.stock : 0);
  const isOutOfStock = effectiveStock <= 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'quantity' ? Math.max(1, Math.min(10, parseInt(value) || 1)) : value }));
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
    const cloudName = 'demo';
    const uploadPreset = 'unsigned_preset';
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: fd,
      });
      if (!res.ok) return imagePreview || '';
      const data = await res.json();
      return data.secure_url;
    } catch {
      return imagePreview || '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (hasVariants && !form.variant_id) {
      setMessage({ type: 'error', text: 'Please select all variant options.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      let image_url = '';
      if (imageFile) {
        image_url = await uploadToCloudinary(imageFile);
      }

      const res = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name,
          phone: form.phone,
          product_id: form.product_id,
          variant_id: form.variant_id || undefined,
          quantity: form.quantity,
          image_url: image_url || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Order placed! ID: ${data.order_id} — Total: ₹${data.total_price}` });
        setForm({ customer_name: '', phone: '', product_id: '', variant_id: '', quantity: 1 });
        setSelMaterial('');
        setSelShape('');
        setImageFile(null);
        setImagePreview(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to place order.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }

  if (loadingProducts) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Place an Order</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Choose a product, upload your artwork, and we'll print it for you.
      </p>

      {message && (
        <div className={`message message-${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        {/* Name */}
        <div className="form-group">
          <label>Your Name *</label>
          <input
            type="text"
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            placeholder="Full name"
            required
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label>Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            pattern="[0-9]{10}"
            required
          />
        </div>

        {/* Image upload */}
        <div className="form-group">
          <label>Upload Your Artwork</label>
          <div
            className={`upload-area ${imagePreview ? 'has-image' : ''}`}
            onClick={() => document.getElementById('file-input').click()}
          >
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Preview" className="upload-preview" />
                <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}>Image selected</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                <p style={{ color: 'var(--text-secondary)' }}>Click to upload artwork</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PNG, JPG, WEBP up to 5MB</p>
              </div>
            )}
            <input id="file-input" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Product selector */}
        <div className="form-group">
          <label>Product *</label>
          <select name="product_id" value={form.product_id} onChange={handleChange} required>
            <option value="">Select a product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.base_price}
              </option>
            ))}
          </select>
        </div>

        {/* Material selector (only if product has materials) */}
        {hasVariants && materials.length > 0 && (
          <div className="form-group">
            <label>Material *</label>
            <select value={selMaterial} onChange={e => setSelMaterial(e.target.value)} required>
              <option value="">Select material</option>
              {materials.map(m => (
                <option key={m} value={m}>{formatLabel(m)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Shape selector (only if product has shapes) */}
        {hasVariants && shapes.length > 0 && (
          <div className="form-group">
            <label>Shape *</label>
            <select value={selShape} onChange={e => setSelShape(e.target.value)} required>
              <option value="">Select shape</option>
              {shapes.map(s => {
                // Disable shapes with 0 stock for selected material
                const matchingVariant = variants.find(v =>
                  (!selMaterial || v.material === selMaterial) && v.shape === s
                );
                const disabled = matchingVariant ? matchingVariant.stock <= 0 : false;
                return (
                  <option key={s} value={s} disabled={disabled}>
                    {formatLabel(s)}{disabled ? ' (out of stock)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Variant resolved info */}
        {hasVariants && form.variant_id && selectedVariant && (
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(108,99,255,0.08)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Selected: {[selectedVariant.material, selectedVariant.shape].filter(Boolean).map(formatLabel).join(' · ')}
              {selectedVariant.price_modifier > 0 ? ` (+₹${selectedVariant.price_modifier})` : ''}
              {' · '}Stock: {selectedVariant.stock}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity *</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            min="1"
            max={Math.min(10, effectiveStock || 10)}
            required
          />
        </div>

        {/* Price summary */}
        {selectedProduct && (hasVariants ? form.variant_id : true) && (
          <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(108, 99, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>₹{totalPrice}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || isOutOfStock || (hasVariants && !form.variant_id)}
          style={{ width: '100%' }}
        >
          {loading ? <><span className="spinner" /> Placing Order...</> : isOutOfStock ? 'Out of Stock' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
