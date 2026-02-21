// POST /api/create-variant
// Admin only — adds a variant to a product
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.ABSTRACT_REALMS_DB;
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'admin123';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { password, product_id, material, shape, price_modifier, stock } = body;

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: product_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify product exists
    const product = await db.prepare('SELECT id FROM products WHERE id = ?').bind(product_id).first();
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const id = 'var_' + crypto.randomUUID().slice(0, 8);

    await db.prepare(
      `INSERT INTO product_variants (id, product_id, material, shape, price_modifier, stock)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, product_id, material || null, shape || null, parseInt(price_modifier) || 0, parseInt(stock) || 0).run();

    return new Response(
      JSON.stringify({ success: true, id, product_id, material, shape }),
      { status: 201, headers: corsHeaders }
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
