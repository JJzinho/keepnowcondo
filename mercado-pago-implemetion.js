import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import MercadoPagoConfig from 'npm:mercadopago@2.0.6';

// Define the request handler
Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the request body
    const { action, data } = await req.json();

    // Get Mercado Pago access token from environment variable
    const mercadoPagoAccessToken = Deno.env.get('TEST-7010832792903159-070711-fb06e9423ee11fccb91cd939dde3e7e3-2532487401');
    if (!mercadoPagoAccessToken) {
      return new Response(JSON.stringify({ error: 'Mercado Pago access token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Mercado Pago client
    const client = new MercadoPagoConfig({ accessToken: mercadoPagoAccessToken });
    
    // Initialize Supabase client with user's auth token to respect RLS
    const supabaseClient = createClient(
      Deno.env.get('https://cshnufsmcyruyesnvoqx.supabase.co') ?? '',
      Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaG51ZnNtY3lydXllc252b3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzQ4NDEsImV4cCI6MjA2NTE1MDg0MX0.ZiafyB294G6ajQE0iN2Jevm4SrQuPc_MPhux5XWc650') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    );

    // Handle different actions
    switch (action) {
      case 'create_preference':
        return await createPreference(client, data);
      
      case 'get_payment':
        return await getPayment(client, data.paymentId);
      
      case 'process_webhook':
        return await processWebhook(client, supabaseClient, data);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Create a payment preference
 */
async function createPreference(client, data) {
  const preference = await client.preference.create({
    body: {
      items: data.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: data.currency_id || 'ARS', // Default to Argentine Peso
      })),
      back_urls: {
        success: data.success_url,
        failure: data.failure_url,
        pending: data.pending_url,
      },
      auto_return: 'approved',
      notification_url: data.webhook_url,
      external_reference: data.external_reference,
    }
  });

  return new Response(JSON.stringify(preference), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get payment details
 */
async function getPayment(client, paymentId) {
  const payment = await client.payment.get({ id: paymentId });
  
  return new Response(JSON.stringify(payment), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Process webhook notifications from Mercado Pago
 */
async function processWebhook(client, supabaseClient, webhookData) {
  // Verify the webhook data
  if (!webhookData.data || !webhookData.type) {
    return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle different webhook types
  if (webhookData.type === 'payment') {
    const paymentId = webhookData.data.id;
    const payment = await client.payment.get({ id: paymentId });
    
    // Store payment information in your database
    const { data, error } = await supabaseClient
      .from('payments')
      .insert({
        payment_id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        payment_method: payment.payment_method_id,
        payment_type: payment.payment_type_id,
        created_at: new Date().toISOString(),
        raw_data: payment
      });
    
    if (error) {
      console.error('Error storing payment:', error);
      // Still return 200 to Mercado Pago to acknowledge receipt
    }
  }
  
  // Always return 200 to acknowledge receipt of the webhook
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}