// GET /api/orders
// Admin only — list all orders with product info
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

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin password.' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { results } = await db.prepare(`
      SELECT
        o.id,
        o.customer_name,
        o.phone,
        o.product_id,
        o.variant_id,
        o.quantity,
        o.image_url,
        o.total_price,
        o.status,
        o.created_at,
        p.name as product_name,
        p.category as product_category,
        v.material as variant_material,
        v.shape as variant_shape
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN product_variants v ON o.variant_id = v.id
      ORDER BY o.created_at DESC
    `).all();

    return new Response(
      JSON.stringify({ orders: results, count: results.length }),
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
