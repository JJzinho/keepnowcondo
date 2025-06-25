// script/auth.js

import { supabase } from './supabaseClient.js';

// Elementos da UI
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const signUpForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const signupError = document.getElementById('signup-error');
const loginError = document.getElementById('login-error');

// Lógica para alternar entre os painéis de login e cadastro
registerBtn.addEventListener('click', () => container.classList.add("active"));
loginBtn.addEventListener('click', () => container.classList.remove("active"));


/**
 * Função que chama o banco de dados para verificar se o usuário
 * já tem um condomínio cadastrado e redireciona.
 */
async function checkCondoStatusAndRedirect() {
    // Mostra um loader ou mensagem de "verificando" se desejar
    console.log("Verificando status do condomínio...");
    try {
        const { data, error } = await supabase.rpc('check_user_has_condo');
        if (error) throw error;

        if (data) {
            window.location.replace('./inicio.html'); // Possui condomínio
        } else {
            window.location.replace('./pages/cadastro.html'); // Não possui, vai para cadastro de condomínio
        }
    } catch (error) {
        console.error('Erro na verificação de status:', error.message);
        alert('Ocorreu um erro ao verificar seus dados. Por favor, tente fazer o login novamente.');
        await supabase.auth.signOut();
    }
}

// === LÓGICA DE CADASTRO (SIGN UP) ===
signUpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    signupError.textContent = ''; // Limpa erros antigos

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    // Cadastra o usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            // Adiciona o nome do usuário aos metadados
            data: {
                full_name: name
            }
        }
    });

    if (error) {
        signupError.textContent = 'Erro ao cadastrar: ' + error.message;
        console.error(error);
    } else {
        // Sucesso! Como a confirmação de email está desativada, o usuário já é logado.
        // A lógica de redirecionamento cuidará do resto.
        alert('Cadastro realizado com sucesso! Você será redirecionado para cadastrar seu condomínio.');
        // O onAuthStateChange vai detectar o login e redirecionar
    }
});

// === LÓGICA DE LOGIN (SIGN IN) ===
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = ''; // Limpa erros antigos

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginError.textContent = 'E-mail ou senha inválidos.';
        console.error(error);
    }
    // Se o login for bem-sucedido, o onAuthStateChange abaixo será acionado.
});

// === LISTENER GLOBAL DE AUTENTICAÇÃO ===
// Escuta por eventos de login/logout para decidir o que fazer
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        // Disparado após um login ou cadastro bem-sucedido
        checkCondoStatusAndRedirect();
    }
});