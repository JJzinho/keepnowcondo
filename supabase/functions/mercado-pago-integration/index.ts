// supabase/functions/mercado-pago-implementacao/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    // ATENÇÃO: Em produção, use Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') e configure a variável de ambiente.
    // CORREÇÃO: Pegar a variável de ambiente correta.
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'); // <-- Use esta variável de ambiente!
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
      Deno.env.get('SUPABASE_URL') ?? 'https://cshnufsmcyruyesnvoqx.supabase.co', // Use variável de ambiente em produção
      Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaG51ZnNtY3lydXllc252b3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzQ4NDEsImV4cCI6MjA2NTE1MDg0MX0.ZiafyB294G6ajQE0iN2Jevm4SrQuPc_MPhux5XWc650', // Use variável de ambiente em produção
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
      
      case 'create_subscription_plan': // NOVO: Ação para criar plano de pré-aprovação
        // Obtenha o ID do usuário da sessão para o external_reference
        const userId = supabaseClient.auth.getUser()?.data?.user?.id;
        if (!userId) {
            return new Response(JSON.stringify({ error: 'User not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return await createSubscriptionPlan(client, data, userId); // Passe o userId
      
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
 * Create a payment preference (para pagamentos únicos)
 * ... (código existente) ...
 */
async function createPreference(client, data) {
    const preference = await client.preference.create({
      body: {
        items: data.items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.price,
          currency_id: data.currency_id || 'BRL',
        })),
        back_urls: {
          success: data.success_url,
          failure: data.failure_url,
          pending: data.pending_url,
        },
        auto_return: 'approved',
        notification_url: data.webhook_url, // A edge function mercado-pago-integration deve ser a notification_url
        external_reference: data.external_reference,
      }
    });
  
    return new Response(JSON.stringify(preference), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

/**
 * NOVO: Criar um plano de pré-aprovação (assinatura)
 */
async function createSubscriptionPlan(client, data, userId) { // Adicionado userId como parâmetro
  // URL da sua função Edge de webhook para receber as notificações de assinatura
  const WEBHOOK_URL_MERCADO_PAGO = Deno.env.get('SUPABASE_URL') + '/functions/v1/mercado-pago-integration'; // Ex: https://your-project-ref.supabase.co/functions/v1/mercado-pago-integration

  if (!WEBHOOK_URL_MERCADO_PAGO) {
    throw new Error("SUPABASE_URL não configurada ou inválida para a WEBHOOK_URL_MERCADO_PAGO.");
  }

  // Use os dados recebidos do frontend para criar o plano
  const preapprovalPlan = await client.preapprovalPlan.create({
    body: {
      reason: data.reason || "Assinatura KeepNow Condo",
      auto_recurring: {
        frequency: data.frequency || 1,
        frequency_type: data.frequency_type || "months",
        repetitions: data.repetitions || null, // null para ilimitado
        billing_day: data.billing_day || 1, // Dia do mês para cobrança
        billing_day_proportional: data.billing_day_proportional || false,
        free_trial: data.free_trial || undefined, // { frequency: 1, frequency_type: "months" }
        transaction_amount: data.transaction_amount,
        currency_id: data.currency_id || "BRL"
      },
      back_url: data.back_url || "https://www.keepnow.com.br/www/pages/cadastro.html", // URL de retorno após o checkout
      notification_url: WEBHOOK_URL_MERCADO_PAGO, // <-- ESTE É O PONTO CRÍTICO PARA WEBHOOKS DE ASSINATURA
      external_reference: JSON.stringify({ userId: userId }), // IMPORTANTE: para identificar o usuário no webhook
    }
  });

  // O "init_point" é a URL para redirecionar o usuário para o checkout do Mercado Pago
  return new Response(JSON.stringify({ init_point: preapprovalPlan.init_point }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get payment details
 * ... (código existente) ...
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
 * ... (código existente) ...
 */
async function processWebhook(client, supabaseClient, webhookData) {
    // Verify the webhook data
    if (!webhookData.data || !webhookData.type) {
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  
    // Handle payment webhooks
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      const payment = await client.payment.get({ id: paymentId });
      
      // Store payment information in your database
      const { data, error } = await supabaseClient
        .from('payments') // Garanta que você tenha uma tabela 'payments' para pagamentos únicos
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
    // NOVO: Lidar com webhooks de pré-aprovação (assinaturas)
    else if (webhookData.type === 'preapproval') {
      const preapprovalId = webhookData.data.id;
      try {
        const preapproval = await client.preapproval.get({ id: preapprovalId });
  
        let parsedExternalReference = {};
        if (preapproval.external_reference) {
          try {
            parsedExternalReference = JSON.parse(preapproval.external_reference);
          } catch (e) {
            console.warn('Could not parse external_reference as JSON:', preapproval.external_reference);
          }
        }
  
        const { userId } = parsedExternalReference; // Removido condoId, pois não está sendo enviado no external_reference do frontend
  
        const { data, error } = await supabaseClient
          .from('subscriptions') // Sua tabela de assinaturas
          .upsert({
            user_id: userId,
            mercadopago_plan_id: preapproval.preapproval_plan_id,
            mercadopago_subscription_id: preapproval.id,
            status: preapproval.status,
            current_period_end: preapproval.next_payment_date ? new Date(preapproval.next_payment_date).toISOString() : null,
            created_at: preapproval.date_created ? new Date(preapproval.date_created).toISOString() : new Date().toISOString(),
            // Você pode adicionar mais campos aqui, como condominium_id
          }, { onConflict: 'mercadopago_subscription_id' }); // Atualiza se a assinatura já existe
  
        if (error) {
          console.error('Error upserting subscription:', error);
        }
      } catch (e) {
        console.error('Error processing preapproval webhook:', e);
      }
    }
    
    // Always return 200 to acknowledge receipt of the webhook
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }