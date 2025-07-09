// www/script/auth.js

import { showLoading, hideLoading } from './ui.js';
import { supabase } from './supabaseClient.js';

// --- ELEMENTOS DA UI ---
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const signUpForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const signupError = document.getElementById('signup-error');
const loginError = document.getElementById('login-error');

// --- LÓGICA DA UI ---
// Alterna entre os painéis de login e cadastro
if(registerBtn) registerBtn.addEventListener('click', () => container.classList.add("active"));
if(loginBtn) loginBtn.addEventListener('click', () => container.classList.remove("active"));


/**
 * Função final do fluxo: verifica se o usuário tem condomínio
 * e redireciona para a tela correta.
 * Esta função é genérica e pode ser chamada onde o redirecionamento é necessário.
 */
async function checkCondoStatusAndRedirect() {
    console.log("Verificando status do condomínio...");
    try {
        const { data, error } = await supabase.rpc('check_user_has_condo');
        if (error) throw error;

        if (data) {
            window.location.replace('./pages/inicio.html');
        } else {
            window.location.replace('./pages/cadastro.html');
        }
    } catch (error) {
        console.error('Erro na verificação de status:', error.message);
        alert('Ocorreu um erro ao verificar seus dados. Por favor, tente fazer o login novamente.');
        await supabase.auth.signOut();
    } finally {
        hideLoading();
    }
}

// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signupError.textContent = '';
        
        showLoading();

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) {
            signupError.textContent = 'Erro ao cadastrar: ' + error.message;
            console.error(error);
            hideLoading();
        }
        // O redirecionamento (checkCondoStatusAndRedirect) agora é chamado em index.js após o sucesso.
    });
}


// --- LÓGICA DE LOGIN (SIGN IN) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';

        showLoading();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            loginError.textContent = 'E-mail ou senha inválidos.';
            console.error(error);
            hideLoading();
        }
        // O redirecionamento (checkCondoStatusAndRedirect) agora é chamado em index.js após o sucesso.
    });
}

// --- LISTENER GLOBAL DE AUTENTICAÇÃO ---
// Este listener agora só trata o 'SIGNED_OUT' para redirecionar para a página de login.
// O 'SIGNED_IN' não é tratado aqui para evitar duplicação com a lógica de form submit em index.js.
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        // Quando o usuário faz logout (via configurações ou por expiração de sessão),
        // redireciona para a página de login se não for um logout via URL param já tratado.
        hideLoading();
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('logout')) {
            window.location.replace('/www/index.html');
        }
    }
});