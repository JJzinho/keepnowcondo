// www/script/supervisor_auth.js

// Importa a instância do Supabase. Isso agora funcionará porque o script é um módulo.
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('supervisor-login-form');
    const errorMessage = document.getElementById('error-message');

    if (!loginForm) {
        console.error("Formulário de login de supervisor não encontrado!");
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const email = document.getElementById('supervisor-email').value.trim();
        const supervisorCode = document.getElementById('condo-code').value.trim();

        if (!email || !supervisorCode) {
            errorMessage.textContent = 'Por favor, preencha todos os campos.';
            return;
        }

        try {
            // A variável 'supabase' agora deve estar definida e funcional.
            if (!supabase) {
                errorMessage.textContent = 'Erro de configuração: cliente Supabase não encontrado.';
                console.error('Objeto Supabase não está disponível.');
                return;
            }

            // *** CORREÇÃO APLICADA AQUI ***
            // 1. Encontrar o condomínio pelo código do supervisor usando a função RPC segura
            // Em vez de uma consulta direta, chamamos a função 'get_condo_by_supervisor_code'
            const { data: condoData, error: condoError } = await supabase
                .rpc('get_condo_by_supervisor_code', { p_supervisor_code: supervisorCode })
                .single();

            if (condoError || !condoData) {
                errorMessage.textContent = 'Código do condomínio inválido ou não encontrado.';
                console.error('Erro ao buscar condomínio:', condoError);
                return;
            }

            const condominioId = condoData.id;

            // 2. Registrar o acesso do supervisor
            const { error: accessError } = await supabase
                .from('supervisor_access')
                .insert({
                    condominio_id: condominioId,
                    supervisor_email: email
                });

            if (accessError) {
                errorMessage.textContent = 'Ocorreu um erro ao registrar seu acesso. Tente novamente.';
                console.error('Erro ao inserir acesso do supervisor:', accessError);
                return;
            }

            // 3. Armazenar informações de acesso na sessão e redirecionar
            sessionStorage.setItem('supervisor_access', 'true');
            sessionStorage.setItem('supervisor_email', email);
            sessionStorage.setItem('condominio_id', condominioId);
            sessionStorage.setItem('condominio_nome', condoData.nome);

            // Redirecionar para a página de checklist
            window.location.href = '../pages/checklist.html';

        } catch (error) {
            errorMessage.textContent = 'Ocorreu um erro inesperado. Tente novamente.';
            console.error('Erro no login do supervisor:', error);
        }
    });
});