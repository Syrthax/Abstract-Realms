// POST /api/create-order
// Cloudflare Pages Function — Workers runtime
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.ABSTRACT_REALMS_DB;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { customer_name, customer_email, product_id, material_id, quantity, image_url } = body;

    // Validate required fields
    if (!customer_name || !customer_email || !product_id || !material_id || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, customer_email, product_id, material_id, quantity' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (quantity < 1 || quantity > 10) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 10' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get product
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(product_id).first();
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get material
    const material = await db.prepare('SELECT * FROM materials WHERE id = ?').bind(material_id).first();
    if (!material) {
      return new Response(
        JSON.stringify({ error: 'Material not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check stock
    const stock = await db.prepare(
      'SELECT * FROM stock WHERE product_id = ? AND material_id = ?'
    ).bind(product_id, material_id).first();

    if (!stock || stock.quantity < quantity) {
      const available = stock ? stock.quantity : 0;
      return new Response(
        JSON.stringify({ error: `Insufficient stock. Available: ${available}, Requested: ${quantity}` }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Calculate total price
    const total_price = parseFloat((product.base_price * material.price_modifier * quantity).toFixed(2));

    // Insert order
    const result = await db.prepare(
      `INSERT INTO orders (customer_name, customer_email, product_id, material_id, quantity, image_url, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(customer_name, customer_email, product_id, material_id, quantity, image_url || null, total_price).run();

    // Reduce stock
    await db.prepare(
      'UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND material_id = ?'
    ).bind(quantity, product_id, material_id).run();

    return new Response(
      JSON.stringify({
        success: true,
        order_id: result.meta?.last_row_id,
        total_price,
        product: product.name,
        material: material.name,
        quantity,
      }),
      { status: 201, headers: corsHeaders }
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
