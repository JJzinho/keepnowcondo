// www/script/index.js

// Importa a instância do cliente Supabase do seu arquivo de configuração centralizado.
import { supabase } from './supabaseClient.js';

// --- MAPEAMENTO DOS ELEMENTOS DO HTML ---
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const signUpForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const signupErrorP = document.getElementById('signup-error');
const loginErrorP = document.getElementById('login-error');

// --- LÓGICA DA ANIMAÇÃO DOS PAINÉIS ---
if (registerBtn && container) {
    registerBtn.addEventListener('click', () => {
        container.classList.add("active");
    });
}

if (loginBtn && container) {
    loginBtn.addEventListener('click', () => {
        container.classList.remove("active");
    });
}

// --- FUNÇÃO DE VERIFICAÇÃO E REDIRECIONAMENTO ---
// Verifica se o usuário logado já possui um condomínio associado.
async function checkCondoStatusAndRedirect() {
    console.log("Verificando status do condomínio do usuário...");
    try {
        // Chama a função RPC 'check_user_has_condo' para verificar a associação.
        const { data, error } = await supabase.rpc('check_user_has_condo');

        if (error) {
            // Se houver um erro, o mais provável é que a sessão seja inválida.
            throw error;
        }

        // Redireciona com base na resposta da função RPC.
        if (data === true) {
            // TRUE: Usuário já tem condomínio, vai para a página inicial de condomínios.
            window.location.replace('./pages/inicio.html');
        } else {
            // FALSE: Usuário novo (ou sem condomínio), precisa cadastrar o primeiro.
            window.location.replace('./pages/cadastro.html');
        }
    } catch (error) {
        console.error('Erro na verificação de status do usuário:', error.message);
        // Em caso de erro (ex: token expirado), desloga o usuário para forçar um novo login.
        await supabase.auth.signOut();
    }
}

// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signupErrorP.textContent = ''; // Limpa mensagens de erro anteriores.

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // Tenta cadastrar um novo usuário no Supabase Auth.
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name // Salva o nome do usuário nos metadados.
                }
            }
        });

        if (error) {
            signupErrorP.textContent = 'Erro ao cadastrar: ' + error.message;
            console.error('Erro de cadastro:', error);
        } else if (data.user) {
            // Se o cadastro for bem-sucedido, o listener onAuthStateChange será acionado.
            // Não é necessário redirecionar aqui.
            console.log('Cadastro realizado com sucesso! Aguardando evento de login.');
        }
    });
}

// --- LÓGICA DE LOGIN (SIGN IN) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginErrorP.textContent = ''; // Limpa mensagens de erro anteriores.

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // Tenta fazer o login do usuário.
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            loginErrorP.textContent = 'E-mail ou senha inválidos.';
            console.error('Erro de login:', error);
        }
        // Se o login for bem-sucedido, o onAuthStateChange cuidará do redirecionamento.
    });
}

// --- LISTENER DE ESTADO DE AUTENTICAÇÃO ---
// Este listener centraliza a lógica de redirecionamento após login ou cadastro.
supabase.auth.onAuthStateChange((event, session) => {
    // Se o evento for SIGNED_IN, significa que o usuário acabou de logar ou se cadastrar com sucesso.
    if (event === 'SIGNED_IN' && session) {
        checkCondoStatusAndRedirect();
    }
});
