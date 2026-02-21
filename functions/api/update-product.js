// POST /api/update-product
// Admin only — toggle active, update stock, update price
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
    const { password, product_id, action, value } = body;

    if (!password || password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (!product_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: product_id, action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(product_id).first();
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    switch (action) {
      case 'toggle_active':
        await db.prepare('UPDATE products SET is_active = ? WHERE id = ?')
          .bind(product.is_active ? 0 : 1, product_id).run();
        break;
      case 'update_stock':
        if (value == null || parseInt(value) < 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid stock value' }),
            { status: 400, headers: corsHeaders }
          );
        }
        await db.prepare('UPDATE products SET stock = ? WHERE id = ?')
          .bind(parseInt(value), product_id).run();
        break;
      case 'update_price':
        if (value == null || parseInt(value) < 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid price value' }),
            { status: 400, headers: corsHeaders }
          );
        }
        await db.prepare('UPDATE products SET base_price = ? WHERE id = ?')
          .bind(parseInt(value), product_id).run();
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: toggle_active, update_stock, update_price' }),
          { status: 400, headers: corsHeaders }
        );
    }

    return new Response(
      JSON.stringify({ success: true, product_id, action }),
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
