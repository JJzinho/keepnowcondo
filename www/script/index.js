// Importa a instância do cliente Supabase.
import { supabase } from './supabaseClient.js';

// --- MAPEAMENTO DOS ELEMENTOS DO HTML ---
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const signUpForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const signupErrorP = document.getElementById('signup-error');
const loginErrorP = document.getElementById('login-error');
const loader = document.getElementById('loader'); // Opcional: para feedback visual

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

// --- FUNÇÃO CENTRAL DE VERIFICAÇÃO E REDIRECIONAMENTO ---
// Verifica se o usuário logado já possui um condomínio associado e redireciona.
async function checkCondoStatusAndRedirect() {
    console.log("Verificando status do condomínio do usuário...");
    if (loader) loader.style.display = 'block'; // Mostra o loader durante a verificação

    try {
        // Chama a função RPC 'check_user_has_condo' para verificar a associação.
        const { data, error } = await supabase.rpc('check_user_has_condo');

        if (error) throw error;

        // Redireciona com base na resposta da função RPC.
        if (data === true) {
            // TRUE: Usuário já tem condomínio, vai para a página inicial.
            window.location.replace('./pages/inicio.html');
        } else {
            // FALSE: Usuário novo (ou sem condomínio), precisa cadastrar o primeiro.
            window.location.replace('./pages/cadastro.html');
        }
    } catch (error) {
        console.error('Erro na verificação de status do usuário:', error.message);
        // Em caso de erro (ex: token expirado), desloga o usuário para segurança.
        await supabase.auth.signOut();
        if (loader) loader.style.display = 'none'; // Esconde o loader
    }
}

// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signupErrorP.textContent = '';
        if (loader) loader.style.display = 'block';

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: name } }
        });

        if (loader) loader.style.display = 'none';
        if (error) {
            signupErrorP.textContent = 'Erro ao cadastrar: ' + error.message;
        }
        // O redirecionamento é tratado pelo onAuthStateChange.
    });
}

// --- LÓGICA DE LOGIN (SIGN IN) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginErrorP.textContent = '';
        if (loader) loader.style.display = 'block';

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (loader) loader.style.display = 'none';
        if (error) {
            loginErrorP.textContent = 'E-mail ou senha inválidos.';
        }
        // O redirecionamento é tratado pelo onAuthStateChange.
    });
}

// --- LISTENER DE ESTADO DE AUTENTICAÇÃO ---
// Centraliza a lógica de redirecionamento após um login ou cadastro bem-sucedido.
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        checkCondoStatusAndRedirect();
    }
});

// --- VERIFICAÇÃO AUTOMÁTICA NO CARREGAMENTO DA PÁGINA ---
// Lida com o caso de um usuário já logado acessando a página.
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se o usuário acabou de fazer logout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
        console.log("Logout bem-sucedido. Exibindo formulário de login.");
        window.history.replaceState({}, document.title, window.location.pathname); // Limpa a URL
        return; // Para a execução para não verificar a sessão
    }

    // 2. Se não veio do logout, verifica se há uma sessão ativa
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // 3. Se houver sessão, redireciona o usuário automaticamente
        await checkCondoStatusAndRedirect();
    } else {
        // Nenhuma sessão ativa, a página continua visível para login/cadastro.
        console.log("Nenhuma sessão ativa. Aguardando interação do usuário.");
    }
});