// POST /api/create-product
// Admin only — creates a new product
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
    const { password, name, category, base_price, stock } = body;

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (!name || !category || base_price == null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, category, base_price' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const validCategories = ['mug', 'keychain', 'magnet', 'badge'];
    if (!validCategories.includes(category)) {
      return new Response(
        JSON.stringify({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const id = 'prod_' + crypto.randomUUID().slice(0, 8);

    await db.prepare(
      `INSERT INTO products (id, name, category, base_price, stock, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`
    ).bind(id, name, category, parseInt(base_price), parseInt(stock) || 0).run();

    return new Response(
      JSON.stringify({ success: true, id, name, category }),
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
