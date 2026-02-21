'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '8788'
  ? ''
  : 'http://localhost:8788';

const CATEGORY_EMOJI = {
  mug: '☕',
  keychain: '🔑',
  magnet: '🧲',
  badge: '🏷️',
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Abstract Realms</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Custom printed merch — pick a product, upload your art, and collect at the stall.
      </p>

      {products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p style={{ color: 'var(--text-secondary)' }}>No products available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="grid-3">
          {products.map((product) => {
            const hasVariants = product.variants && product.variants.length > 0;
            const totalVariantStock = hasVariants
              ? product.variants.reduce((s, v) => s + v.stock, 0)
              : 0;
            const effectiveStock = hasVariants ? totalVariantStock : product.stock;
            const outOfStock = effectiveStock <= 0;

            return (
              <div
                key={product.id}
                className="card"
                style={{ opacity: outOfStock ? 0.5 : 1 }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                  {CATEGORY_EMOJI[product.category] || '📦'}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {product.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                  {product.category}
                  {hasVariants ? ` · ${product.variants.length} variants` : ''}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent)' }}>
                    ₹{product.base_price}{hasVariants ? '+' : ''}
                  </span>
                  {outOfStock ? (
                    <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.85rem' }}>Out of stock</span>
                  ) : (
                    <a
                      href={`/order/?product=${product.id}`}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      Order
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
