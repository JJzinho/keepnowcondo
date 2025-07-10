// supabase/functions/mercado-pago-integration/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const WEBHOOK_SECRET = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");

serve(async (req: Request) => {
  try {
    if (!WEBHOOK_SECRET) {
      throw new Error("A variável MERCADO_PAGO_WEBHOOK_SECRET não foi configurada.");
    }

    const signatureHeader = req.headers.get("x-signature");
    if (!signatureHeader) {
      throw new Error("Assinatura (x-signature header) ausente.");
    }

    const requestBodyText = await req.clone().text();
    const body = JSON.parse(requestBodyText);

    const eventId = body?.data?.id;
    if (!eventId) {
      throw new Error("O campo 'data.id' não foi encontrado no corpo da requisição.");
    }

    const signatureParts = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);

    const timestamp = signatureParts['ts'];
    const receivedHash = signatureParts['v1'];

    if (!timestamp || !receivedHash) {
      throw new Error("Formato inválido do cabeçalho de assinatura.");
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Constrói a base da string para verificação
    let manifest = `id:${eventId};ts:${timestamp};`;

    // Pega o request-id, se ele existir
    const requestId = req.headers.get("x-request-id");

    // Adiciona o request-id à string APENAS se ele foi enviado
    if (requestId) {
      manifest = `id:${eventId};request-id:${requestId};ts:${timestamp};`;
    }
    // --- FIM DA CORREÇÃO ---

    const hmac = createHmac("sha256", WEBHOOK_SECRET);
    hmac.update(manifest);
    const expectedHash = hmac.digest("hex");

    if (expectedHash !== receivedHash) {
      console.error("Falha na validação da assinatura! Hash esperado:", expectedHash, "Hash recebido:", receivedHash);
      return new Response("Assinatura inválida.", { status: 401 });
    }

    console.log("✅ Assinatura verificada com sucesso! Processando webhook...");
    console.log(`Evento recebido: ${body.action} para o ID: ${eventId}`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200, // Retorna 200 OK para o Mercado Pago
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`❌ Erro no webhook: ${errorMessage}`);
    return new Response(errorMessage, { status: 400 });
  }
});