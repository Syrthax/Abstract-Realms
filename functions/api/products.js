// GET /api/products
// Public: returns active products + their variants
// Admin: returns all products when ?password= is provided
export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.ABSTRACT_REALMS_DB;
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'admin123';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const url = new URL(request.url);
    const password = url.searchParams.get('password');
    const isAdmin = password && password === ADMIN_PASSWORD;

    // Fetch products
    const productQuery = isAdmin
      ? 'SELECT * FROM products ORDER BY created_at DESC'
      : 'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC';

    const { results: products } = await db.prepare(productQuery).all();

    // Fetch variants for these products
    const productIds = products.map(p => p.id);
    let variants = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const { results } = await db.prepare(
        `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY material, shape`
      ).bind(...productIds).all();
      variants = results;
    }

    // Attach variants to products
    const productsWithVariants = products.map(p => ({
      ...p,
      variants: variants.filter(v => v.product_id === p.id),
    }));

    return new Response(
      JSON.stringify({ products: productsWithVariants }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
