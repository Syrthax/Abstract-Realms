// POST /api/create-order
// Cloudflare Pages Function — Workers runtime
export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.ABSTRACT_REALMS_DB;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { customer_name, phone, product_id, variant_id, quantity, image_url } = body;

    // Validate required fields
    if (!customer_name || !phone || !product_id || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, phone, product_id, quantity' }),
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
    const product = await db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').bind(product_id).first();
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found or inactive' }),
        { status: 404, headers: corsHeaders }
      );
    }

    let variant = null;
    let unit_price = product.base_price;

    // If variant_id is provided, validate it
    if (variant_id) {
      variant = await db.prepare(
        'SELECT * FROM product_variants WHERE id = ? AND product_id = ?'
      ).bind(variant_id, product_id).first();

      if (!variant) {
        return new Response(
          JSON.stringify({ error: 'Variant not found for this product' }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Check variant stock
      if (variant.stock < quantity) {
        return new Response(
          JSON.stringify({ error: `Insufficient variant stock. Available: ${variant.stock}` }),
          { status: 409, headers: corsHeaders }
        );
      }

      unit_price = product.base_price + variant.price_modifier;
    } else {
      // Check product-level stock
      if (product.stock < quantity) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock. Available: ${product.stock}` }),
          { status: 409, headers: corsHeaders }
        );
      }

      // If the product has variants, require one to be selected
      const { results: variants } = await db.prepare(
        'SELECT id FROM product_variants WHERE product_id = ?'
      ).bind(product_id).all();

      if (variants.length > 0) {
        return new Response(
          JSON.stringify({ error: 'This product requires a variant selection' }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const total_price = unit_price * quantity;
    const order_id = 'ord_' + crypto.randomUUID().slice(0, 8);

    // Insert order
    await db.prepare(
      `INSERT INTO orders (id, customer_name, phone, product_id, variant_id, quantity, image_url, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(order_id, customer_name, phone, product_id, variant_id || null, quantity, image_url || null, total_price).run();

    // Reduce stock
    if (variant_id) {
      await db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?')
        .bind(quantity, variant_id).run();
    } else {
      await db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
        .bind(quantity, product_id).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        total_price,
        product: product.name,
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
