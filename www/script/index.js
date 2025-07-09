// www/script/index.js

// Importa a instância do cliente Supabase.
import { supabase } from './supabaseClient.js';

// --- MAPEAMENTO DOS ELEMENTOS DO HTML ---
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const signUpForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const signupErrorP = document.getElementById('signup-error');
const loginErrorP = document.getElementById('login-error'); // Corrigido: Removida a chave extra '}'
const loader = document.getElementById('loader'); // Opcional: para feedback visual
const rememberMeCheckbox = document.getElementById('remember-me'); // Adicionado elemento do checkbox

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
    if (loader) loader.style.display = 'block';

    try {
        const { data, error } = await supabase.rpc('check_user_has_condo');

        if (error) throw error;

        if (data === true) {
            window.location.replace('./pages/inicio.html');
        } else {
            window.location.replace('./pages/cadastro.html');
        }
    } catch (error) {
        console.error('Erro na verificação de status do usuário:', error.message);
        await supabase.auth.signOut();
        if (loader) loader.style.display = 'none';
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
        } else {
            // Chama a função de redirecionamento após cadastro bem-sucedido
            checkCondoStatusAndRedirect();
        }
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

        // A preferência "Manter conectado" será salva, mas a auto-entrada na página inicial
        // só ocorrerá após o login, não ao recarregar o navegador.
        if (rememberMeCheckbox) {
            localStorage.setItem('rememberMePreference', rememberMeCheckbox.checked);
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (loader) loader.style.display = 'none';
        if (error) {
            loginErrorP.textContent = 'E-mail ou senha inválidos.';
        } else {
            // Save the email if 'remember me' is checked
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('lastLoggedInEmail', email);
            } else {
                localStorage.removeItem('lastLoggedInEmail'); // Clear if unchecked
            }
            // Chama a função de redirecionamento após login bem-sucedido
            checkCondoStatusAndRedirect();
        }
    });
}

// --- VERIFICAÇÃO NO CARREGAMENTO DA PÁGINA (SEM AUTO-LOGIN) ---
// Mantém a página de login/cadastro visível por padrão, sem auto-redirecionamento.
document.addEventListener('DOMContentLoaded', async () => {
    // Restaura o estado do checkbox "Manter conectado" (apenas para visualização)
    if (rememberMeCheckbox) {
        const rememberedPreference = localStorage.getItem('rememberMePreference');
        if (rememberedPreference === 'false') {
            rememberMeCheckbox.checked = false;
        } else {
            rememberMeCheckbox.checked = true;
        }

        // Pre-fill email if remember me is checked and email is saved
        if (rememberMeCheckbox.checked) {
            const lastEmail = localStorage.getItem('lastLoggedInEmail');
            if (lastEmail) {
                const loginEmailInput = document.getElementById('login-email');
                if (loginEmailInput) {
                    loginEmailInput.value = lastEmail;
                }
            }
        }
    }

    // 1. Verifica se o usuário acabou de fazer logout explicitamente via URL param.
    // Esta parte é mantida para limpar a URL e garantir que o formulário de login seja visível.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
        console.log("Logout bem-sucedido (via URL). Exibindo formulário de login.");
        window.history.replaceState({}, document.title, window.location.pathname); // Limpa a URL
    }

    // Garante que o loader esteja escondido ao carregar a página
    if (loader) loader.style.display = 'none';
    console.log("Sistema sem auto-login na inicialização. Aguardando interação do usuário.");
});