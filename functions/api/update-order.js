// POST /api/update-order
// Admin only — update order status
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
    const { password, order_id, status } = body;

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (!order_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, status' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const validStatuses = ['pending', 'confirmed', 'printing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(order_id).first();
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    await db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, order_id).run();

    return new Response(
      JSON.stringify({ success: true, order_id, status }),
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
