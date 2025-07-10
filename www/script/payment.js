// www/script/payment.js

document.addEventListener('DOMContentLoaded', () => {
    const subscribeBtn = document.getElementById('subscribe-btn');
    const loadingIndicator = document.getElementById('loading-indicator');

    subscribeBtn.addEventListener('click', async () => {
        subscribeBtn.disabled = true;
        loadingIndicator.style.display = 'flex'; // Mostra o spinner

        try {
            // Obtém o token de autorização do usuário logado (necessário para RLS no Supabase)
            // Assumimos que o usuário já está logado após o signup
            const { data: { session }, error: sessionError } = await fetchSupabaseSession(); // Função auxiliar para obter a sessão

            if (sessionError || !session) {
                alert('Você precisa estar logado para assinar. Por favor, faça login novamente.');
                window.location.href = 'index.html'; // Redireciona para o login
                return;
            }

            const authToken = session.access_token;

            // Chama sua Edge Function 'mercadoPagoImplementacao' para criar o plano de assinatura
            const response = await fetch('https://cshnufsmcyruyesnvoqx.supabase.co/functions/v1/mercado-pago-implementacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // Envia o token de autenticação
                },
                body: JSON.stringify({
                    action: 'create_subscription_plan',
                    data: {
                        reason: "Assinatura KeepNow Condo",
                        transaction_amount: 29.90, // Valor mensal da assinatura
                        currency_id: "BRL",
                        frequency: 1,
                        frequency_type: "months",
                        repetitions: null, // null para assinatura ilimitada
                        billing_day: 1, // Ex: cobrança no dia 1 de cada mês
                        billing_day_proportional: false,
                        back_url: `${window.location.origin}/www/pages/cadastro.html`, // URL de retorno após o checkout
                        // IMPORTANTE: notification_url deve ser configurada na Edge Function 'mercadoPagoImplementacao.js'
                        // Ela aponta para sua outra Edge Function 'mercado-pago-integration' (webhook handler)
                        // external_reference: JSON.stringify({ userId: session.user.id }) // Opcional, para identificar o usuário no webhook
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Erro ao criar plano de assinatura:', data.error);
                alert('Erro ao iniciar o processo de assinatura: ' + (data.error || 'Erro desconhecido.'));
                subscribeBtn.disabled = false;
                loadingIndicator.style.display = 'none';
                return;
            }

            if (data.init_point) {
                // Redireciona o usuário para o link de checkout do Mercado Pago
                window.location.href = data.init_point;
            } else {
                alert('Não foi possível obter o link de pagamento do Mercado Pago.');
                subscribeBtn.disabled = false;
                loadingIndicator.style.display = 'none';
            }

        } catch (error) {
            console.error('Erro na requisição da assinatura:', error);
            alert('Ocorreu um erro ao tentar conectar com o serviço de pagamento. Tente novamente.');
            subscribeBtn.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    // Função auxiliar para obter a sessão do Supabase (reutilize se já tiver em supabaseClient.js)
    async function fetchSupabaseSession() {
        // Isso assume que `supabase` está acessível ou importável aqui
        // ou que você tem uma forma de buscar a sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();
        return { data: { session }, error };
    }
});