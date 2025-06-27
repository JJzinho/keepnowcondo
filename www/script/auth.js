// NOVO: Importa o sistema de loading
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
 * e redireciona para a tela correta. Esta função também é responsável
 * por esconder o loading no final de todo o processo.
 */
async function checkCondoStatusAndRedirect() {
    // Não chamamos showLoading() aqui, pois ele já foi iniciado pelo login/cadastro.
    console.log("Verificando status do condomínio...");
    try {
        const { data, error } = await supabase.rpc('check_user_has_condo');
        if (error) throw error;

        // Redireciona com base na resposta
        if (data) {
           window.location.replace('inicio.html');
        } else {
            window.location.replace('./cadastro_condo.html'); // Exemplo de página para cadastrar o condomínio
        }
    } catch (error) {
        console.error('Erro na verificação de status:', error.message);
        alert('Ocorreu um erro ao verificar seus dados. Por favor, tente fazer o login novamente.');
        await supabase.auth.signOut();
    } finally {
        // NOVO: Garante que o loading seja escondido no final de tudo.
        hideLoading();
    }
}


// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signupError.textContent = '';
        
        // NOVO: Mostra o loading no início da operação
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
            // NOVO: Esconde o loading se deu erro, pois o fluxo para aqui.
            hideLoading();
        }
        // Se o cadastro for bem-sucedido, onAuthStateChange será acionado
        // e chamará checkCondoStatusAndRedirect, que vai esconder o loading.
    });
}


// --- LÓGICA DE LOGIN (SIGN IN) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';

        // NOVO: Mostra o loading no início da operação
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
            // NOVO: Esconde o loading se deu erro, pois o fluxo para aqui.
            hideLoading();
        }
        // Se o login for bem-sucedido, onAuthStateChange será acionado
        // e chamará checkCondoStatusAndRedirect, que vai esconder o loading.
    });
}


// --- LISTENER GLOBAL DE AUTENTICAÇÃO ---
// Escuta por eventos de login/logout para decidir o que fazer.
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        // Disparado após um login ou cadastro bem-sucedido.
        // A tela de loading já está ativa, então apenas continuamos o fluxo.
        checkCondoStatusAndRedirect();
    }
});