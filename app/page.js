'use client';

const products = [
  { id: 1, name: 'T-Shirt', description: 'Custom printed t-shirt with your artwork', price: '₹499', emoji: '👕' },
  { id: 2, name: 'Mug', description: 'Custom printed ceramic mug', price: '₹299', emoji: '☕' },
  { id: 3, name: 'Poster', description: 'High quality art poster', price: '₹199', emoji: '🖼️' },
  { id: 4, name: 'Phone Case', description: 'Custom phone case with your design', price: '₹399', emoji: '📱' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1>Abstract Realms</h1>
        <p>
          Turn your imagination into reality. Upload your artwork and get it printed on premium merchandise.
          Exclusive for our college event!
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/order/" className="btn btn-primary">
            Create Custom Order
          </a>
          <a href="#products" className="btn btn-secondary">
            View Products
          </a>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', margin: '2rem 0 3rem' }}>
        {[
          { label: 'Products', value: '4+', icon: '📦' },
          { label: 'Materials', value: '3 Types', icon: '✨' },
          { label: 'Quick Delivery', value: '24hrs', icon: '🚀' },
          { label: 'Happy Customers', value: '500+', icon: '😊' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>{stat.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Products */}
      <section id="products">
        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Our Products</h2>
        <div className="grid-3">
          {products.map((product) => (
            <div key={product.id} className="card">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{product.emoji}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{product.name}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {product.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent)' }}>
                  {product.price}
                </span>
                <a href="/order/" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Order Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
