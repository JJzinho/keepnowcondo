// Importa a instância do cliente Supabase do seu arquivo de configuração
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
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        container.classList.add("active");
    });
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        container.classList.remove("active");
    });
}

async function checkCondoStatusAndRedirect() {
    console.log("Verificando status do condomínio do usuário...");
    try {
        // Chama a função RPC 'check_user_has_condo'
        const { data, error } = await supabase.rpc('check_user_has_condo');

        if (error) {
            throw error;
        }

        // Redireciona com base na resposta
        if (data) {
            // TRUE: Usuário já tem condomínio, vai para a lista de condomínios.
            window.location.replace('./pages/inicio.html');
        } else {
            // FALSE: Usuário novo, precisa cadastrar o primeiro condomínio.
            window.location.replace('./pages/cadastro.html');
        }
    } catch (error) {
        console.error('Erro na verificação de status do usuário:', error.message);
        alert('Ocorreu um erro ao verificar seus dados. Por favor, tente fazer o login novamente.');
        await supabase.auth.signOut();
    }
}

// --- LÓGICA DE CADASTRO (SIGN UP) ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signupErrorP.textContent = ''; // Limpa mensagens de erro

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // Tenta cadastrar um novo usuário
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name // Salva o nome do usuário nos metadados
                }
            }
        });

        if (error) {
            signupErrorP.textContent = 'Erro ao cadastrar: ' + error.message;
            console.error('Erro de cadastro:', error);
        } else {
            // O listener onAuthStateChange será acionado automaticamente
            alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta e aguarde o redirecionamento.');
        }
    });
}

// --- LÓGICA DE LOGIN (SIGN IN) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginErrorP.textContent = ''; // Limpa mensagens de erro

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // Tenta fazer o login
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

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        checkCondoStatusAndRedirect();
    }
});