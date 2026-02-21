// GET /api/orders
// Cloudflare Pages Function — Workers runtime
// Protected by admin password
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
    // Check password from query param
    const url = new URL(request.url);
    const password = url.searchParams.get('password');

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid admin password.' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch all orders with product and material names
    const { results } = await db.prepare(`
      SELECT
        o.id,
        o.customer_name,
        o.customer_email,
        o.product_id,
        o.material_id,
        o.quantity,
        o.image_url,
        o.total_price,
        o.status,
        o.created_at,
        p.name as product_name,
        m.name as material_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN materials m ON o.material_id = m.id
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

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
